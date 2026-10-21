-- DRAFT FOUNDATION. Not applied. Requires a fresh Supabase project and integration tests.
-- No browser writes: all commerce mutations must use verified server endpoints.
begin;
create table public.store_profiles (
  id uuid primary key references auth.users(id),
  display_name text,
  role text not null default 'customer' check (role in ('customer','admin','rider')),
  created_at timestamptz not null default now()
);
create table public.store_settings (
  id boolean primary key default true check (id),
  mode text not null default 'closed' check (mode in ('open','closed','maintenance')),
  customer_message text not null default 'The store is being set up. Please visit again soon.',
  delivery_rules jsonb not null default '{"radius_km":5,"free_km":1,"extra_km_paise":1000,"free_delivery":false}',
  cancellation_policy jsonb not null default '{"version":"v1","free_minutes":10,"fees_enabled":false}',
  updated_at timestamptz not null default now()
);
create table public.store_products (
  id uuid primary key default gen_random_uuid(),
  name text not null check(length(name)>0),
  category text not null,
  description text not null default '',
  image_path text,
  active boolean not null default false,
  created_at timestamptz not null default now()
);
create table public.store_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.store_products(id),
  sku text unique not null,
  attributes jsonb not null default '{}',
  price_paise bigint not null check(price_paise>=0),
  available_stock integer not null default 0 check(available_stock>=0),
  reserved_stock integer not null default 0 check(reserved_stock>=0),
  version bigint not null default 0
);
create table public.store_orders (
  id uuid primary key default gen_random_uuid(),
  order_number bigint generated always as identity unique,
  customer_id uuid not null references public.store_profiles(id),
  rider_id uuid references public.store_profiles(id),
  status text not null default 'awaiting_payment' check(status in ('awaiting_payment','confirmed','preparing','ready','dispatched','delivered','delivery_failed','cancelled')),
  delivery_address jsonb not null,
  policy_snapshot jsonb not null,
  delivery_quote jsonb not null,
  total_paise bigint not null check(total_paise>=0),
  paid_paise bigint not null default 0 check(paid_paise>=0),
  refunded_paise bigint not null default 0 check(refunded_paise>=0),
  refund_pending_paise bigint not null default 0 check(refund_pending_paise>=0),
  cancellation_fee_paise bigint not null default 0 check(cancellation_fee_paise>=0),
  payment_order_id text unique,
  payment_id text unique,
  payment_confirmed_at timestamptz,
  dispatched_at timestamptz,
  created_at timestamptz not null default now(),
  check(refunded_paise+refund_pending_paise+cancellation_fee_paise<=paid_paise)
);
create index store_orders_customer_idx on public.store_orders(customer_id);
create index store_orders_rider_idx on public.store_orders(rider_id);
create table public.store_order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.store_orders(id),
  variant_id uuid not null references public.store_variants(id),
  product_snapshot jsonb not null,
  quantity integer not null check(quantity>0),
  unit_price_paise bigint not null check(unit_price_paise>=0)
);
create table public.store_order_events (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.store_orders(id),
  actor_id uuid references public.store_profiles(id),
  actor_type text not null check(actor_type in ('customer','admin','rider','system')),
  event_type text not null,
  customer_visible boolean not null default false,
  payload jsonb not null default '{}',
  created_at timestamptz not null default now()
);
create table public.store_refunds (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.store_orders(id),
  request_key uuid not null unique,
  provider_refund_id text unique,
  amount_paise bigint not null check(amount_paise>0),
  reason text not null,
  status text not null default 'requested' check(status in ('requested','submitted','processed','failed')),
  created_at timestamptz not null default now()
);
create table public.store_email_outbox (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.store_order_events(id),
  recipient text not null,
  template text not null,
  dedupe_key text not null unique,
  status text not null default 'queued' check(status in ('queued','sending','sent','failed')),
  attempts integer not null default 0,
  next_attempt_at timestamptz not null default now(),
  provider_email_id text,
  created_at timestamptz not null default now()
);
create table public.store_webhook_receipts (
  provider text not null,
  event_id text not null,
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  primary key(provider,event_id)
);
-- Explicit deny-by-default for every client role. No client policy writes money,
-- inventory, roles, settings, events, refunds or notification records.
do $$ declare t text; begin
  foreach t in array array['store_profiles','store_settings','store_products','store_variants','store_orders','store_order_items','store_order_events','store_refunds','store_email_outbox','store_webhook_receipts'] loop
    execute format('alter table public.%I enable row level security',t);
    execute format('revoke all on public.%I from anon, authenticated',t);
    execute format('grant all on public.%I to service_role',t);
  end loop;
end $$;
grant select on public.store_products,public.store_variants to anon,authenticated;
grant select on public.store_profiles,public.store_orders,public.store_order_items,public.store_order_events,public.store_refunds to authenticated;
create policy products_visible on public.store_products for select to anon,authenticated using(active);
create policy variants_visible on public.store_variants for select to anon,authenticated using(exists(select 1 from public.store_products p where p.id=product_id and p.active));
create policy own_profile on public.store_profiles for select to authenticated using(id=(select auth.uid()));
create policy own_orders on public.store_orders for select to authenticated using(customer_id=(select auth.uid()));
create policy own_order_items on public.store_order_items for select to authenticated using(exists(select 1 from public.store_orders o where o.id=order_id and o.customer_id=(select auth.uid())));
create policy own_visible_events on public.store_order_events for select to authenticated using(customer_visible and exists(select 1 from public.store_orders o where o.id=order_id and o.customer_id=(select auth.uid())));
create policy own_refunds on public.store_refunds for select to authenticated using(exists(select 1 from public.store_orders o where o.id=order_id and o.customer_id=(select auth.uid())));
-- Admin and rider interfaces require server endpoints with explicit role checks.
-- Riders must receive only assigned delivery details, never payment records.
insert into public.store_settings(id) values(true);
commit;
