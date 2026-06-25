-- Warehouse & Inventory Management: extends the existing Somxay One App.
-- Adds physical-stock tracking (cherry -> parchment -> green bean -> roasted
-- bean/packaging) on top of, and separate from, the existing B2B sales
-- catalog (products_catalog) and Farmer Mode / Cherry Receiving tables.
-- Nothing in any prior migration is altered or removed -- only additive
-- tables/columns. All new tables are admin/manager only (internal
-- operations data), matching the role-based access pattern used throughout.

----------------------------------------------------------------------
-- 1. Warehouses
----------------------------------------------------------------------
create table if not exists public.warehouses (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  location text,
  created_at timestamptz not null default now()
);

alter table public.warehouses enable row level security;

drop policy if exists "warehouses_read" on public.warehouses;
create policy "warehouses_read" on public.warehouses for select
  using (exists (select 1 from public.profiles pr where pr.id = auth.uid() and pr.role in ('admin', 'manager')));

drop policy if exists "warehouses_admin_write" on public.warehouses;
create policy "warehouses_admin_write" on public.warehouses for all
  using (exists (select 1 from public.profiles pr where pr.id = auth.uid() and pr.role in ('admin', 'manager')))
  with check (exists (select 1 from public.profiles pr where pr.id = auth.uid() and pr.role in ('admin', 'manager')));

insert into public.warehouses (name, location)
select v.name, v.location
from (values ('Main Warehouse', 'Factory')) as v(name, location)
where not exists (select 1 from public.warehouses w where w.name = v.name);

----------------------------------------------------------------------
-- 2. Cherry receiving gets a warehouse (additive; existing columns and
--    semantics of cherry_receivings are untouched).
----------------------------------------------------------------------
alter table public.cherry_receivings add column if not exists warehouse_id uuid references public.warehouses(id);

----------------------------------------------------------------------
-- 3. Parchment lots (created from cherry processing)
----------------------------------------------------------------------
create table if not exists public.parchment_lots (
  id uuid primary key default gen_random_uuid(),
  lot_code text not null unique,
  source_cherry_kg numeric not null,
  parchment_kg numeric not null,
  remaining_kg numeric not null,
  yield_percent numeric not null,
  process text,
  warehouse_id uuid references public.warehouses(id),
  note text,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

alter table public.parchment_lots enable row level security;

drop policy if exists "parchment_lots_read" on public.parchment_lots;
create policy "parchment_lots_read" on public.parchment_lots for select
  using (exists (select 1 from public.profiles pr where pr.id = auth.uid() and pr.role in ('admin', 'manager')));

drop policy if exists "parchment_lots_admin_write" on public.parchment_lots;
create policy "parchment_lots_admin_write" on public.parchment_lots for all
  using (exists (select 1 from public.profiles pr where pr.id = auth.uid() and pr.role in ('admin', 'manager')))
  with check (exists (select 1 from public.profiles pr where pr.id = auth.uid() and pr.role in ('admin', 'manager')));

----------------------------------------------------------------------
-- 4. Green bean lots (lot-level operational inventory; separate from the
--    customer-facing products_catalog price list)
----------------------------------------------------------------------
create table if not exists public.green_bean_lots (
  id uuid primary key default gen_random_uuid(),
  lot_number text not null unique,
  variety text,
  process text,
  grade text,
  warehouse_id uuid references public.warehouses(id),
  source_parchment_lot_id uuid references public.parchment_lots(id),
  stock_quantity numeric not null default 0,
  reserved_quantity numeric not null default 0,
  available_quantity numeric generated always as (stock_quantity - reserved_quantity) stored,
  unit_cost numeric,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.green_bean_lots enable row level security;

drop policy if exists "green_bean_lots_read" on public.green_bean_lots;
create policy "green_bean_lots_read" on public.green_bean_lots for select
  using (exists (select 1 from public.profiles pr where pr.id = auth.uid() and pr.role in ('admin', 'manager')));

drop policy if exists "green_bean_lots_admin_write" on public.green_bean_lots;
create policy "green_bean_lots_admin_write" on public.green_bean_lots for all
  using (exists (select 1 from public.profiles pr where pr.id = auth.uid() and pr.role in ('admin', 'manager')))
  with check (exists (select 1 from public.profiles pr where pr.id = auth.uid() and pr.role in ('admin', 'manager')));

----------------------------------------------------------------------
-- 5. Roasting batches (production records)
----------------------------------------------------------------------
create table if not exists public.roasting_batches (
  id uuid primary key default gen_random_uuid(),
  batch_code text not null unique,
  green_bean_lot_id uuid references public.green_bean_lots(id),
  green_bean_kg_used numeric not null,
  roasted_kg_output numeric not null,
  roast_level text,
  warehouse_id uuid references public.warehouses(id),
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

alter table public.roasting_batches enable row level security;

drop policy if exists "roasting_batches_read" on public.roasting_batches;
create policy "roasting_batches_read" on public.roasting_batches for select
  using (exists (select 1 from public.profiles pr where pr.id = auth.uid() and pr.role in ('admin', 'manager')));

drop policy if exists "roasting_batches_admin_write" on public.roasting_batches;
create policy "roasting_batches_admin_write" on public.roasting_batches for all
  using (exists (select 1 from public.profiles pr where pr.id = auth.uid() and pr.role in ('admin', 'manager')))
  with check (exists (select 1 from public.profiles pr where pr.id = auth.uid() and pr.role in ('admin', 'manager')));

----------------------------------------------------------------------
-- 6. Finished goods stock (packaged roasted-bean products)
----------------------------------------------------------------------
create table if not exists public.finished_goods_stock (
  id uuid primary key default gen_random_uuid(),
  product_name text not null,
  package_size text,
  warehouse_id uuid references public.warehouses(id),
  roasting_batch_id uuid references public.roasting_batches(id),
  stock_quantity numeric not null default 0,
  unit_cost numeric,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.finished_goods_stock enable row level security;

drop policy if exists "finished_goods_stock_read" on public.finished_goods_stock;
create policy "finished_goods_stock_read" on public.finished_goods_stock for select
  using (exists (select 1 from public.profiles pr where pr.id = auth.uid() and pr.role in ('admin', 'manager')));

drop policy if exists "finished_goods_stock_admin_write" on public.finished_goods_stock;
create policy "finished_goods_stock_admin_write" on public.finished_goods_stock for all
  using (exists (select 1 from public.profiles pr where pr.id = auth.uid() and pr.role in ('admin', 'manager')))
  with check (exists (select 1 from public.profiles pr where pr.id = auth.uid() and pr.role in ('admin', 'manager')));

----------------------------------------------------------------------
-- 7. Packaging materials inventory
----------------------------------------------------------------------
create table if not exists public.packaging_materials (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  unit text not null default 'pcs',
  warehouse_id uuid references public.warehouses(id),
  stock_quantity numeric not null default 0,
  reorder_threshold numeric not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.packaging_materials enable row level security;

drop policy if exists "packaging_materials_read" on public.packaging_materials;
create policy "packaging_materials_read" on public.packaging_materials for select
  using (exists (select 1 from public.profiles pr where pr.id = auth.uid() and pr.role in ('admin', 'manager')));

drop policy if exists "packaging_materials_admin_write" on public.packaging_materials;
create policy "packaging_materials_admin_write" on public.packaging_materials for all
  using (exists (select 1 from public.profiles pr where pr.id = auth.uid() and pr.role in ('admin', 'manager')))
  with check (exists (select 1 from public.profiles pr where pr.id = auth.uid() and pr.role in ('admin', 'manager')));

----------------------------------------------------------------------
-- 8. Unified stock movement ledger (Receive / Transfer / Process /
--    Adjust / Export / Sale) across all material types. quantity_kg is a
--    signed delta: positive increases stock at warehouse_id, negative
--    decreases it. For transfers, a paired pair of rows (out of
--    warehouse_id, in to related_warehouse_id) is written by the app.
----------------------------------------------------------------------
create table if not exists public.inventory_stock_movements (
  id uuid primary key default gen_random_uuid(),
  material_type text not null check (material_type in ('cherry', 'parchment', 'green_bean', 'roasted_bean', 'packaging', 'finished_goods')),
  movement_type text not null check (movement_type in ('receive', 'transfer', 'process', 'adjust', 'export', 'sale')),
  reference_label text,
  reference_id uuid,
  warehouse_id uuid references public.warehouses(id),
  related_warehouse_id uuid references public.warehouses(id),
  quantity_kg numeric not null,
  unit_cost numeric,
  note text,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

alter table public.inventory_stock_movements enable row level security;

drop policy if exists "inventory_stock_movements_read" on public.inventory_stock_movements;
create policy "inventory_stock_movements_read" on public.inventory_stock_movements for select
  using (exists (select 1 from public.profiles pr where pr.id = auth.uid() and pr.role in ('admin', 'manager')));

drop policy if exists "inventory_stock_movements_admin_write" on public.inventory_stock_movements;
create policy "inventory_stock_movements_admin_write" on public.inventory_stock_movements for all
  using (exists (select 1 from public.profiles pr where pr.id = auth.uid() and pr.role in ('admin', 'manager')))
  with check (exists (select 1 from public.profiles pr where pr.id = auth.uid() and pr.role in ('admin', 'manager')));

create index if not exists inventory_stock_movements_material_idx on public.inventory_stock_movements (material_type, created_at desc);
create index if not exists inventory_stock_movements_warehouse_idx on public.inventory_stock_movements (warehouse_id);

----------------------------------------------------------------------
-- 9. Low-stock thresholds (one row per material type, admin-configurable)
----------------------------------------------------------------------
create table if not exists public.inventory_thresholds (
  material_type text primary key check (material_type in ('cherry', 'parchment', 'green_bean', 'roasted_bean', 'packaging', 'finished_goods')),
  threshold_kg numeric not null default 0
);

alter table public.inventory_thresholds enable row level security;

drop policy if exists "inventory_thresholds_read" on public.inventory_thresholds;
create policy "inventory_thresholds_read" on public.inventory_thresholds for select
  using (exists (select 1 from public.profiles pr where pr.id = auth.uid() and pr.role in ('admin', 'manager')));

drop policy if exists "inventory_thresholds_admin_write" on public.inventory_thresholds;
create policy "inventory_thresholds_admin_write" on public.inventory_thresholds for all
  using (exists (select 1 from public.profiles pr where pr.id = auth.uid() and pr.role in ('admin', 'manager')))
  with check (exists (select 1 from public.profiles pr where pr.id = auth.uid() and pr.role in ('admin', 'manager')));

insert into public.inventory_thresholds (material_type, threshold_kg)
select v.material_type, v.threshold_kg
from (
  values
    ('cherry', 500::numeric),
    ('parchment', 300::numeric),
    ('green_bean', 200::numeric),
    ('roasted_bean', 50::numeric),
    ('packaging', 100::numeric),
    ('finished_goods', 50::numeric)
) as v(material_type, threshold_kg)
where not exists (select 1 from public.inventory_thresholds t where t.material_type = v.material_type);
