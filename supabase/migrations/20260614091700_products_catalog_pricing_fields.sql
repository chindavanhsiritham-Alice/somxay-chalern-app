-- Add green-coffee catalog attributes and multi-currency pricing to products_catalog.
-- Prices are stored explicitly per currency (USD / THB / LAK) rather than derived
-- from exchange rates, so each market price can be maintained independently.

alter table public.products_catalog
  add column if not exists variety text,
  add column if not exists process text,
  add column if not exists crop_year text,
  add column if not exists moisture text,
  add column if not exists defect text,
  add column if not exists packing text,
  add column if not exists public_price_thb numeric,
  add column if not exists public_price_lak numeric;

-- Seed the catalog. Idempotent: a product is only inserted when no row with the
-- same name already exists, so re-running the migration is safe.
insert into public.products_catalog
  (name, grade, variety, process, crop_year, public_price_usd, public_price_thb, public_price_lak, available)
select v.name, v.grade, v.variety, v.process, v.crop_year, v.usd, v.thb, v.lak, true
from (
  values
    ('Arabica G1 Catimor Washed 2025-2026',        'G1',  'Catimor',       'Washed',  '2025-2026', 8.0::numeric, 269::numeric, 185000::numeric),
    ('Arabica G1 Catimor Washed 2024-2025',        'G1',  'Catimor',       'Washed',  '2024-2025', 7.5::numeric, 265::numeric, 175000::numeric),
    ('Arabica FAQ Typica Washed 2025-2026',        'FAQ', 'Typica',        'Washed',  '2025-2026', 10.0::numeric, 325::numeric, 224000::numeric),
    ('Arabica FAQ Yellow Catuai Washed 2025-2026', 'FAQ', 'Yellow Catuai', 'Washed',  '2025-2026', 9.0::numeric, 295::numeric, 200000::numeric),
    ('Robusta FAQ Natural 2025-2026',              'FAQ', null,            'Natural', '2025-2026', 4.5::numeric, 147::numeric, 100000::numeric)
) as v(name, grade, variety, process, crop_year, usd, thb, lak)
where not exists (
  select 1 from public.products_catalog p where p.name = v.name
);
