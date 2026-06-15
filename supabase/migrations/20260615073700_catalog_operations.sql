-- Make Product & Inventory usable for real Somxay Coffee operations:
-- archive flag, admin-only cost/margin fields, a clean seed of the real
-- catalog, and an editable USD-based exchange-rate table.

----------------------------------------------------------------------
-- 1. products_catalog: archive flag + admin-only internal fields
----------------------------------------------------------------------
alter table public.products_catalog
  add column if not exists archived boolean not null default false,
  add column if not exists internal_cost_usd numeric,
  add column if not exists internal_cost_thb numeric,
  add column if not exists internal_cost_lak numeric,
  add column if not exists margin_usd numeric,
  add column if not exists margin_percent numeric;

----------------------------------------------------------------------
-- 2. Remove legacy placeholder products
----------------------------------------------------------------------
delete from public.products_catalog
where name in (
  'Catimor 16+ 80%',
  'Catimor 16+ 90%',
  'Robusta FAQ',
  'Typical Wash',
  'Yellow Natural'
);

----------------------------------------------------------------------
-- 3. Seed the real catalog (idempotent on identifying attributes)
----------------------------------------------------------------------
insert into public.products_catalog
  (name, grade, variety, process, crop_year, moisture, defect, packing,
   stock_kg, public_price_usd, public_price_thb, public_price_lak, available)
select v.name, v.grade, v.variety, v.process, v.crop_year,
       '10.5-12.5%', '5%', 'PP Bag',
       0, v.usd, v.thb, v.lak, true
from (
  values
    ('Arabica', 'G1',  'Catimor',       'Washed',  '2025-2026', 8.0::numeric,  269::numeric, 185000::numeric),
    ('Arabica', 'G1',  'Catimor',       'Washed',  '2024-2025', 7.5::numeric,  265::numeric, 175000::numeric),
    ('Arabica', 'FAQ', 'Typica',        'Washed',  '2025-2026', 10.0::numeric, 325::numeric, 224000::numeric),
    ('Arabica', 'FAQ', 'Yellow Catuai', 'Washed',  '2025-2026', 9.0::numeric,  295::numeric, 200000::numeric),
    ('Robusta', 'FAQ', 'Robusta',       'Natural', '2025-2026', 4.5::numeric,  147::numeric, 100000::numeric)
) as v(name, grade, variety, process, crop_year, usd, thb, lak)
where not exists (
  select 1 from public.products_catalog p
  where p.name = v.name
    and p.grade is not distinct from v.grade
    and p.variety is not distinct from v.variety
    and p.process is not distinct from v.process
    and p.crop_year is not distinct from v.crop_year
);

----------------------------------------------------------------------
-- 4. Admin/manager write access to the catalog
----------------------------------------------------------------------
drop policy if exists "products_catalog_admin_write" on public.products_catalog;
create policy "products_catalog_admin_write" on public.products_catalog
  for all
  using (
    exists (
      select 1 from public.profiles pr
      where pr.id = auth.uid() and pr.role in ('admin', 'manager')
    )
  )
  with check (
    exists (
      select 1 from public.profiles pr
      where pr.id = auth.uid() and pr.role in ('admin', 'manager')
    )
  );

----------------------------------------------------------------------
-- 5. Editable USD-based exchange rates
----------------------------------------------------------------------
create table if not exists public.exchange_rates (
  id uuid primary key default gen_random_uuid()
);

alter table public.exchange_rates
  add column if not exists pair text,
  add column if not exists rate numeric,
  add column if not exists updated_at timestamptz default now();

create unique index if not exists exchange_rates_pair_idx on public.exchange_rates (pair);

insert into public.exchange_rates (pair, rate)
values ('USD_THB', 33.60), ('USD_LAK', 23100)
on conflict (pair) do nothing;

alter table public.exchange_rates enable row level security;

drop policy if exists "exchange_rates_read" on public.exchange_rates;
create policy "exchange_rates_read" on public.exchange_rates
  for select
  using (auth.role() = 'authenticated');

drop policy if exists "exchange_rates_admin_write" on public.exchange_rates;
create policy "exchange_rates_admin_write" on public.exchange_rates
  for all
  using (
    exists (
      select 1 from public.profiles pr
      where pr.id = auth.uid() and pr.role in ('admin', 'manager')
    )
  )
  with check (
    exists (
      select 1 from public.profiles pr
      where pr.id = auth.uid() and pr.role in ('admin', 'manager')
    )
  );
