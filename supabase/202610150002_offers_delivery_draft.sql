-- DRAFT ONLY. Not applied or database-tested. Depends on the foundation migration.
begin;
create table public.store_offers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  scope text not null check(scope in ('product','order')),
  product_id uuid references public.store_products(id),
  enabled boolean not null default false,
  percent numeric(5,2) not null check(percent>=0 and percent<=100),
  minimum_paise bigint not null default 0 check(minimum_paise>=0),
  maximum_saving_paise bigint check(maximum_saving_paise>=0),
  allow_product_stacking boolean not null default false,
  starts_at timestamptz,
  ends_at timestamptz,
  version bigint not null default 1,
  created_at timestamptz not null default now(),
  check((scope='product' and product_id is not null) or (scope='order' and product_id is null)),
  check(ends_at is null or starts_at is null or ends_at>starts_at)
);
alter table public.store_offers enable row level security;
revoke all on public.store_offers from anon,authenticated;
grant all on public.store_offers to service_role;
grant select on public.store_offers to anon,authenticated;
create policy visible_current_offers on public.store_offers for select to anon,authenticated
using(enabled and (starts_at is null or starts_at<=now()) and (ends_at is null or ends_at>now()));
alter table public.store_settings add column store_latitude numeric(9,6) check(store_latitude between -90 and 90);
alter table public.store_settings add column store_longitude numeric(9,6) check(store_longitude between -180 and 180);
alter table public.store_settings add column store_address text;
alter table public.store_settings add column service_city text;
alter table public.store_settings add column allowed_pincodes text[] not null default '{}';
alter table public.store_settings add column delivery_enabled boolean not null default false;
alter table public.store_settings add constraint store_coordinates_pair check((store_latitude is null)=(store_longitude is null));
alter table public.store_orders add column pricing_snapshot jsonb;
alter table public.store_order_items add column discount_paise bigint not null default 0 check(discount_paise>=0);
-- Server-side checkout must choose the intended offer deterministically, enforce
-- schedules, cap totals, allocate discounts to lines and snapshot the resulting
-- prices and geospatial quote in the same atomic transaction as stock reservation.
-- Server validates allowed city geometry/PIN code independently of customer input.
commit;
