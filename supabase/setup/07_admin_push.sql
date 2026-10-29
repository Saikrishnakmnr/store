-- Staging candidate only. DO NOT run against production without integration verification.
begin;
create table if not exists public.rm_push_subscriptions (
 id bigint generated always as identity primary key,
 admin_id uuid not null references auth.users(id) on delete cascade,
 endpoint text not null unique,
 subscription jsonb not null,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create index if not exists rm_push_subscriptions_admin_idx on public.rm_push_subscriptions(admin_id);
create table if not exists public.rm_admin_alerts (
 id bigint generated always as identity primary key,
 admin_id uuid not null references auth.users(id) on delete cascade,
 order_id uuid not null references public.rm_orders(id) on delete cascade,
 status text not null default 'queued' check (status in ('queued','sending','sent','retry','failed')),
 attempts int not null default 0,
 next_attempt_at timestamptz not null default now(),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 unique(admin_id,order_id)
);
create index if not exists rm_admin_alerts_pending on public.rm_admin_alerts(status,next_attempt_at);
do $$ declare t text; begin foreach t in array array['rm_push_subscriptions','rm_admin_alerts'] loop
 execute format('alter table public.%I enable row level security',t);
 execute format('revoke all on public.%I from anon,authenticated',t);
 execute format('grant all on public.%I to service_role',t);
end loop; end $$;
create or replace function public.rm_queue_paid_order_alert() returns trigger
language plpgsql security definer set search_path=public,pg_temp as $$
begin
 if new.payload->>'status' = 'Preparing'
   and coalesce(old.payload->>'status','') <> 'Preparing'
   and new.payload->>'paymentState' = 'captured'
   and nullif(new.payload->>'paymentId','') is not null then
  insert into public.rm_admin_alerts(admin_id,order_id)
  select user_id,new.id from public.rm_roles where role='admin' and enabled
  on conflict(admin_id,order_id) do nothing;
 end if;
 return new;
end $$;
drop trigger if exists rm_on_paid_order_alert on public.rm_orders;
create trigger rm_on_paid_order_alert after update of payload on public.rm_orders
for each row execute function public.rm_queue_paid_order_alert();
revoke all on function public.rm_queue_paid_order_alert() from public,anon,authenticated;
commit;
