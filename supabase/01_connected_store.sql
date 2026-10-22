-- Connected store v1. Run in a fresh STAGING Supabase project's SQL editor.
-- Separate rm_* objects: does not apply or depend on the old draft store_* migrations.
-- NOT executed against PostgreSQL in the authoring environment. Run staging acceptance tests.
begin;
create table if not exists public.rm_store (
 id boolean primary key default true check(id),
 version bigint not null default 0,
 state jsonb not null default '{"products":[],"categories":[],"storeMode":"closed","message":"Store setup in progress","branding":{"name":"My local store"},"billOffer":{"enabled":false},"policy":{"version":"v1","freeMinutes":10,"demoFeesEnabled":false,"afterDispatchFee":0,"maxFee":0},"radius":5,"freeKm":1,"rate":10,"free":true,"deliveryEnabled":false,"storePin":null,"allowedPincodes":[],"slides":[],"videos":[],"serviceNotice":{"enabled":false}}',
 updated_at timestamptz not null default now()
);
insert into public.rm_store(id) values(true) on conflict(id) do nothing;
create table if not exists public.rm_roles (
 user_id uuid primary key references auth.users(id) on delete cascade,
 role text not null check(role in ('admin','rider')), display_name text not null,
 enabled boolean not null default true
);
create table if not exists public.rm_orders (
 id uuid primary key, customer_id uuid not null references auth.users(id),
 request_key uuid not null, version bigint not null default 0,
 payload jsonb not null,
 created_at timestamptz not null default now(),
 unique(customer_id,request_key)
);
create index if not exists rm_orders_customer on public.rm_orders(customer_id);
create unique index if not exists rm_orders_provider on public.rm_orders((payload->>'paymentOrderId')) where payload->>'paymentOrderId' is not null;
create table if not exists public.rm_outbox (
 id uuid primary key, order_id uuid not null references public.rm_orders(id),
 recipient text not null, subject text not null, body text not null,
 state text not null default 'queued' check(state in ('queued','sending','sent','review')),
 attempts integer not null default 0, available_at timestamptz not null default now(),
 first_attempt_at timestamptz, provider_id text, last_error text,
 created_at timestamptz not null default now(), sent_at timestamptz
);
create table if not exists public.rm_rate_limits (
 bucket text primary key, window_start timestamptz not null default now(), uses integer not null
);
-- All commerce data remains behind authenticated Edge endpoints. Never grant browser writes.
do $$ declare t text; begin
 foreach t in array array['rm_store','rm_roles','rm_orders','rm_outbox','rm_rate_limits'] loop
 execute format('alter table public.%I enable row level security',t);
 execute format('revoke all on public.%I from anon,authenticated',t);
 execute format('grant all on public.%I to service_role',t);
 end loop;
end $$;
-- One short store-row lock serializes writes for this small single-store system.
-- Version checks prevent lost stock updates and stale admin saves.
create or replace function public.rm_commit(p_version bigint,p_state jsonb,p_order jsonb default null,p_order_version bigint default null,p_mail jsonb default '[]') returns jsonb
language plpgsql security definer set search_path=public,pg_temp as $$
declare v bigint; ov bigint; m jsonb; oid uuid;
begin
 select version into v from public.rm_store where id=true for update;
 if v is distinct from p_version then raise exception 'VERSION_CONFLICT' using errcode='40001'; end if;
 if p_order is not null then
  oid:=(p_order->>'id')::uuid;
  select version into ov from public.rm_orders where id=oid for update;
  if found then
   if ov is distinct from p_order_version then raise exception 'VERSION_CONFLICT' using errcode='40001'; end if;
   update public.rm_orders set payload=p_order,version=version+1 where id=oid;
  else
   if p_order_version is not null then raise exception 'ORDER_NOT_FOUND'; end if;
   insert into public.rm_orders(id,customer_id,request_key,payload) values(oid,(p_order->>'customerId')::uuid,(p_order->>'requestKey')::uuid,p_order);
  end if;
 end if;
 update public.rm_store set state=coalesce(p_state,state),version=version+1,updated_at=now() where id=true;
 for m in select value from jsonb_array_elements(p_mail) loop
  insert into public.rm_outbox(id,order_id,recipient,subject,body)
  values((m->>'id')::uuid,oid,m->>'recipient',m->>'subject',m->>'body') on conflict(id) do nothing;
 end loop;
 return jsonb_build_object('version',v+1);
end $$;
create or replace function public.rm_throttle(p_bucket text,p_limit integer,p_seconds integer) returns boolean
language plpgsql security definer set search_path=public,pg_temp as $$
declare r public.rm_rate_limits;
begin
 insert into public.rm_rate_limits(bucket,uses) values(p_bucket,0) on conflict do nothing;
 select * into r from public.rm_rate_limits where bucket=p_bucket for update;
 if r.window_start < now()-make_interval(secs=>p_seconds) then
  update public.rm_rate_limits set uses=1,window_start=now() where bucket=p_bucket; return true;
 end if;
 if r.uses>=p_limit then return false; end if;
 update public.rm_rate_limits set uses=uses+1 where bucket=p_bucket; return true;
end $$;
-- Conservative caps leave some of the Resend free allowance for authentication emails.
-- Counts attempts (including uncertain ones), not assumed successful deliveries.
create or replace function public.rm_claim_email() returns jsonb
language plpgsql security definer set search_path=public,pg_temp as $$
declare r public.rm_outbox; ok boolean;
begin
 perform pg_advisory_xact_lock(7564813);
 update public.rm_outbox set state='review',last_error='Idempotency retry window exceeded; inspect provider before resend'
 where state in ('sending','queued') and first_attempt_at<now()-interval '23 hours';
 select * into r from public.rm_outbox where (state='queued' or state='sending') and available_at<=now()
 order by created_at limit 1 for update skip locked;
 if not found then return null; end if;
 select public.rm_throttle('email-month-'||to_char(now() at time zone 'UTC','YYYY-MM'),2000,2764800) into ok;
 if not ok then return null; end if;
 select public.rm_throttle('email-day-'||to_char(now() at time zone 'UTC','YYYY-MM-DD'),80,86400) into ok;
 if not ok then return null; end if;
 update public.rm_outbox set state='sending',attempts=attempts+1,first_attempt_at=coalesce(first_attempt_at,now()),available_at=now()+interval '5 minutes' where id=r.id returning * into r;
 return to_jsonb(r);
end $$;
revoke all on function public.rm_commit(bigint,jsonb,jsonb,bigint,jsonb) from public,anon,authenticated;
revoke all on function public.rm_throttle(text,integer,integer) from public,anon,authenticated;
revoke all on function public.rm_claim_email() from public,anon,authenticated;
grant execute on function public.rm_commit(bigint,jsonb,jsonb,bigint,jsonb),public.rm_throttle(text,integer,integer),public.rm_claim_email() to service_role;
-- Optional product imagery. Public read is intentional; uploads only for enabled admins.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('product-images','product-images',true,2097152,array['image/jpeg','image/png','image/webp'])
on conflict(id) do nothing;
create or replace function public.rm_is_admin() returns boolean language sql stable security definer set search_path=public,pg_temp as $$
 select exists(select 1 from public.rm_roles where user_id=auth.uid() and enabled and role='admin');
$$;
revoke all on function public.rm_is_admin() from public,anon;
grant execute on function public.rm_is_admin() to authenticated;
drop policy if exists rm_product_upload on storage.objects;
create policy rm_product_upload on storage.objects for insert to authenticated with check(bucket_id='product-images' and public.rm_is_admin());
drop policy if exists rm_product_update on storage.objects;
create policy rm_product_update on storage.objects for update to authenticated using(bucket_id='product-images' and public.rm_is_admin()) with check(bucket_id='product-images' and public.rm_is_admin());
drop policy if exists rm_product_delete on storage.objects;
create policy rm_product_delete on storage.objects for delete to authenticated using(bucket_id='product-images' and public.rm_is_admin());
-- Paid ebooks must NEVER be public. No customer SELECT policy: Edge signs after purchase check.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('ebooks','ebooks',false,20971520,array['application/pdf','application/epub+zip'])
on conflict(id) do nothing;
drop policy if exists rm_ebook_upload on storage.objects;
create policy rm_ebook_upload on storage.objects for insert to authenticated with check(bucket_id='ebooks' and public.rm_is_admin());
-- No overwrite/delete policy for ebook files: old purchases retain their immutable asset version.
commit;
