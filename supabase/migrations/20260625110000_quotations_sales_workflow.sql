-- Phase 4: Sales & Quotation Workflow.
-- Adds quotation management, tier pricing, follow-up tasks, and "convert
-- quotation to order" support on top of the existing CRM (customers,
-- customer_timeline) and product catalog (products_catalog). Nothing in
-- any prior migration is altered or removed -- only additive tables/columns.
--
-- products_catalog and orders/order_items predate migration tracking, so
-- their primary-key types are not guaranteed here. The DO block below
-- detects the real type of products_catalog.id and orders.id at migration
-- time (defaulting to uuid, the type used by every other table in this
-- project) so the new foreign keys are created with a matching type
-- instead of assuming and risking a failed migration.

----------------------------------------------------------------------
-- 1. Quotation numbering (QT-000001, QT-000002, ...)
----------------------------------------------------------------------
create sequence if not exists public.quotation_number_seq;

----------------------------------------------------------------------
-- 2. Quotations
----------------------------------------------------------------------
create table if not exists public.quotations (
  id uuid primary key default gen_random_uuid(),
  quotation_number text not null default ('QT-' || lpad(nextval('public.quotation_number_seq')::text, 6, '0')),
  customer_id uuid not null references public.customers(id),
  sales_rep_id uuid references public.profiles(id),
  quotation_date date not null default current_date,
  expiry_date date,
  currency text not null default 'USD',
  status text not null default 'draft',
  approval_status text not null default 'not_required',
  subtotal numeric not null default 0,
  discount_total numeric not null default 0,
  total numeric not null default 0,
  notes text,
  terms text,
  rejected_reason text,
  approved_by uuid references public.profiles(id),
  approved_at timestamptz,
  converted_at timestamptz,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.quotations drop constraint if exists quotations_currency_check;
alter table public.quotations add constraint quotations_currency_check
  check (currency in ('USD', 'THB', 'LAK'));

alter table public.quotations drop constraint if exists quotations_status_check;
alter table public.quotations add constraint quotations_status_check
  check (status in ('draft', 'sent', 'accepted', 'rejected', 'expired', 'converted'));

alter table public.quotations drop constraint if exists quotations_approval_status_check;
alter table public.quotations add constraint quotations_approval_status_check
  check (approval_status in ('not_required', 'pending_approval', 'approved', 'rejected'));

create unique index if not exists quotations_quotation_number_key on public.quotations (quotation_number);
create index if not exists quotations_customer_id_idx on public.quotations (customer_id);
create index if not exists quotations_sales_rep_id_idx on public.quotations (sales_rep_id);
create index if not exists quotations_status_idx on public.quotations (status);
create index if not exists quotations_created_at_idx on public.quotations (created_at desc);

----------------------------------------------------------------------
-- 3. Dynamic-type-safe additions: quotation_items, product_tier_prices,
--    order_items.product_catalog_id, quotations.converted_order_id.
----------------------------------------------------------------------
do $$
declare
  product_id_type text;
  order_id_type text;
begin
  select format_type(a.atttypid, a.atttypmod) into product_id_type
  from pg_attribute a
  join pg_class c on c.oid = a.attrelid
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relname = 'products_catalog' and a.attname = 'id'
    and a.attnum > 0 and not a.attisdropped;

  if product_id_type is null then
    product_id_type := 'uuid';
  end if;

  select format_type(a.atttypid, a.atttypmod) into order_id_type
  from pg_attribute a
  join pg_class c on c.oid = a.attrelid
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relname = 'orders' and a.attname = 'id'
    and a.attnum > 0 and not a.attisdropped;

  if order_id_type is null then
    order_id_type := 'uuid';
  end if;

  execute format(
    'create table if not exists public.quotation_items (
       id uuid primary key default gen_random_uuid(),
       quotation_id uuid not null references public.quotations(id) on delete cascade,
       product_id %1$s references public.products_catalog(id) on delete set null,
       product_name text,
       kg numeric not null default 0,
       unit_price numeric not null default 0,
       tier_price numeric,
       discount_percent numeric not null default 0,
       discount_amount numeric not null default 0,
       requires_approval boolean not null default false,
       total numeric not null default 0,
       sort_order int not null default 0,
       created_at timestamptz not null default now()
     )', product_id_type);

  execute format(
    'create table if not exists public.product_tier_prices (
       id uuid primary key default gen_random_uuid(),
       product_id %1$s not null references public.products_catalog(id) on delete cascade,
       tier text not null,
       price_usd numeric,
       price_thb numeric,
       price_lak numeric,
       created_at timestamptz not null default now(),
       updated_at timestamptz not null default now(),
       unique (product_id, tier)
     )', product_id_type);

  execute format(
    'alter table public.order_items add column if not exists product_catalog_id %1$s references public.products_catalog(id) on delete set null',
    product_id_type
  );

  execute format(
    'alter table public.quotations add column if not exists converted_order_id %1$s references public.orders(id) on delete set null',
    order_id_type
  );
end $$;

create index if not exists quotation_items_quotation_id_idx on public.quotation_items (quotation_id, sort_order);
create index if not exists product_tier_prices_product_id_idx on public.product_tier_prices (product_id);

----------------------------------------------------------------------
-- 4. Order/order_items columns to support "Convert to Order"
----------------------------------------------------------------------
alter table public.orders
  add column if not exists quotation_id uuid references public.quotations(id) on delete set null,
  add column if not exists sales_rep_id uuid references public.profiles(id),
  add column if not exists currency text,
  add column if not exists subtotal numeric,
  add column if not exists notes text;

alter table public.order_items
  add column if not exists unit_price numeric,
  add column if not exists discount_percent numeric not null default 0,
  add column if not exists discount_amount numeric not null default 0,
  add column if not exists line_total numeric;

-- order_items.product_id (if present) targets the legacy (singular) products
-- table, which converted-from-quotation rows cannot populate (they reference
-- products_catalog via product_catalog_id instead). Relax it to nullable so
-- conversion inserts succeed; guarded since the exact legacy column name was
-- never defined in a migration we control.
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'order_items' and column_name = 'product_id'
  ) then
    execute 'alter table public.order_items alter column product_id drop not null';
  end if;
end $$;

create index if not exists orders_quotation_id_idx on public.orders (quotation_id);

----------------------------------------------------------------------
-- 5. Stock reservation on the catalog (simple counter, separate from the
--    lot-based warehouse system used by Farmer Mode / roasting).
----------------------------------------------------------------------
alter table public.products_catalog
  add column if not exists reserved_kg numeric not null default 0;

alter table public.products_catalog
  add column if not exists available_kg numeric generated always as (coalesce(stock_kg, 0) - reserved_kg) stored;

----------------------------------------------------------------------
-- 6. Follow-up tasks
----------------------------------------------------------------------
create table if not exists public.sales_followups (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  sales_rep_id uuid references public.profiles(id),
  due_date date not null,
  task_type text not null,
  note text,
  status text not null default 'open',
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.sales_followups drop constraint if exists sales_followups_task_type_check;
alter table public.sales_followups add constraint sales_followups_task_type_check
  check (task_type in (
    'phone_call', 'whatsapp', 'email', 'meeting', 'visit', 'sample_sent', 'quotation_sent', 'follow_up', 'note'
  ));

alter table public.sales_followups drop constraint if exists sales_followups_status_check;
alter table public.sales_followups add constraint sales_followups_status_check
  check (status in ('open', 'done', 'overdue'));

create index if not exists sales_followups_customer_id_idx on public.sales_followups (customer_id);
create index if not exists sales_followups_sales_rep_id_idx on public.sales_followups (sales_rep_id);
create index if not exists sales_followups_due_date_idx on public.sales_followups (due_date);
create index if not exists sales_followups_status_idx on public.sales_followups (status);

----------------------------------------------------------------------
-- 7. RLS
----------------------------------------------------------------------
alter table public.quotations enable row level security;
alter table public.quotation_items enable row level security;
alter table public.product_tier_prices enable row level security;
alter table public.sales_followups enable row level security;

drop policy if exists "quotations_admin_manager_all" on public.quotations;
create policy "quotations_admin_manager_all" on public.quotations for all
  using (exists (select 1 from public.profiles pr where pr.id = auth.uid() and pr.role in ('admin', 'manager')))
  with check (exists (select 1 from public.profiles pr where pr.id = auth.uid() and pr.role in ('admin', 'manager')));

drop policy if exists "quotations_sales_own" on public.quotations;
create policy "quotations_sales_own" on public.quotations for all
  using (
    exists (select 1 from public.profiles pr where pr.id = auth.uid() and pr.role = 'sales')
    and exists (select 1 from public.customers c where c.id = quotations.customer_id and c.assigned_sales_rep = auth.uid())
  )
  with check (
    exists (select 1 from public.profiles pr where pr.id = auth.uid() and pr.role = 'sales')
    and exists (select 1 from public.customers c where c.id = quotations.customer_id and c.assigned_sales_rep = auth.uid())
  );

drop policy if exists "quotation_items_admin_manager_all" on public.quotation_items;
create policy "quotation_items_admin_manager_all" on public.quotation_items for all
  using (exists (select 1 from public.profiles pr where pr.id = auth.uid() and pr.role in ('admin', 'manager')))
  with check (exists (select 1 from public.profiles pr where pr.id = auth.uid() and pr.role in ('admin', 'manager')));

drop policy if exists "quotation_items_sales_own" on public.quotation_items;
create policy "quotation_items_sales_own" on public.quotation_items for all
  using (
    exists (
      select 1 from public.quotations q
      join public.customers c on c.id = q.customer_id
      where q.id = quotation_items.quotation_id and c.assigned_sales_rep = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.quotations q
      join public.customers c on c.id = q.customer_id
      where q.id = quotation_items.quotation_id and c.assigned_sales_rep = auth.uid()
    )
  );

drop policy if exists "product_tier_prices_staff_read" on public.product_tier_prices;
create policy "product_tier_prices_staff_read" on public.product_tier_prices for select
  using (exists (select 1 from public.profiles pr where pr.id = auth.uid() and pr.role in ('admin', 'manager', 'sales')));

drop policy if exists "product_tier_prices_admin_manager_write" on public.product_tier_prices;
create policy "product_tier_prices_admin_manager_write" on public.product_tier_prices for all
  using (exists (select 1 from public.profiles pr where pr.id = auth.uid() and pr.role in ('admin', 'manager')))
  with check (exists (select 1 from public.profiles pr where pr.id = auth.uid() and pr.role in ('admin', 'manager')));

drop policy if exists "sales_followups_admin_manager_all" on public.sales_followups;
create policy "sales_followups_admin_manager_all" on public.sales_followups for all
  using (exists (select 1 from public.profiles pr where pr.id = auth.uid() and pr.role in ('admin', 'manager')))
  with check (exists (select 1 from public.profiles pr where pr.id = auth.uid() and pr.role in ('admin', 'manager')));

drop policy if exists "sales_followups_sales_own" on public.sales_followups;
create policy "sales_followups_sales_own" on public.sales_followups for all
  using (
    exists (select 1 from public.profiles pr where pr.id = auth.uid() and pr.role = 'sales')
    and (
      sales_rep_id = auth.uid()
      or exists (select 1 from public.customers c where c.id = sales_followups.customer_id and c.assigned_sales_rep = auth.uid())
    )
  )
  with check (
    exists (select 1 from public.profiles pr where pr.id = auth.uid() and pr.role = 'sales')
    and (
      sales_rep_id = auth.uid()
      or exists (select 1 from public.customers c where c.id = sales_followups.customer_id and c.assigned_sales_rep = auth.uid())
    )
  );
