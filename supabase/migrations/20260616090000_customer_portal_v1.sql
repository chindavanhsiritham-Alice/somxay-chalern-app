-- Customer Portal V1: self-registration, approval workflow, portal ordering,
-- stock reservation, payment slips. Additive and guarded so it is safe to run
-- against the existing Somxay Coffee database.

----------------------------------------------------------------------
-- 1. customers: self-registration profile + status / tier / credit
----------------------------------------------------------------------
alter table public.customers
  add column if not exists user_id uuid references auth.users(id) on delete set null,
  add column if not exists email text,
  add column if not exists full_name text,
  add column if not exists phone text,
  add column if not exists whatsapp text,
  add column if not exists country text,
  add column if not exists province_city text,
  add column if not exists customer_type text,
  add column if not exists company_name text,
  add column if not exists website text,
  add column if not exists facebook text,
  add column if not exists instagram text,
  add column if not exists expected_monthly_volume text,
  add column if not exists status text not null default 'pending',
  add column if not exists tier text not null default 'retail',
  add column if not exists credit_enabled boolean not null default false,
  add column if not exists payment_term_days integer not null default 0,
  add column if not exists created_at timestamptz not null default now();

create unique index if not exists customers_user_id_idx on public.customers (user_id);

-- A self-registered customer may not have an admin-assigned customer_code yet.
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'customers'
      and column_name = 'customer_code' and is_nullable = 'NO'
  ) then
    execute 'alter table public.customers alter column customer_code drop not null';
  end if;
end $$;

----------------------------------------------------------------------
-- 2. products_catalog: reserved stock
----------------------------------------------------------------------
alter table public.products_catalog
  add column if not exists reserved_kg numeric not null default 0;

----------------------------------------------------------------------
-- 3. orders: payment + fulfilment fields for the portal flow
----------------------------------------------------------------------
alter table public.orders
  add column if not exists payment_slip_url text,
  add column if not exists payment_submitted_at timestamptz,
  add column if not exists payment_deadline timestamptz,
  add column if not exists subtotal_usd numeric,
  add column if not exists subtotal_thb numeric,
  add column if not exists subtotal_lak numeric,
  add column if not exists created_at timestamptz not null default now();

----------------------------------------------------------------------
-- 4. order_items: link to catalog + denormalised pricing snapshot
----------------------------------------------------------------------
alter table public.order_items
  add column if not exists catalog_product_id uuid references public.products_catalog(id),
  add column if not exists product_name text,
  add column if not exists package_kg numeric,
  add column if not exists unit_price_usd numeric,
  add column if not exists unit_price_thb numeric,
  add column if not exists unit_price_lak numeric,
  add column if not exists line_total_usd numeric,
  add column if not exists line_total_thb numeric,
  add column if not exists line_total_lak numeric;

-- Portal items reference the catalog, not the legacy products table.
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'order_items'
      and column_name = 'product_id' and is_nullable = 'NO'
  ) then
    execute 'alter table public.order_items alter column product_id drop not null';
  end if;
end $$;

----------------------------------------------------------------------
-- 5. portal_products view (customer-safe columns only)
--    Internal cost / margin are never exposed here.
----------------------------------------------------------------------
create or replace view public.portal_products as
select
  id,
  name,
  grade,
  variety,
  process,
  crop_year,
  moisture,
  defect,
  packing,
  greatest(coalesce(stock_kg, 0) - coalesce(reserved_kg, 0), 0) as available_kg,
  public_price_usd,
  public_price_thb,
  public_price_lak
from public.products_catalog
where coalesce(archived, false) = false
  and coalesce(available, true) = true;

grant select on public.portal_products to authenticated, anon;

----------------------------------------------------------------------
-- 6. Row level security
----------------------------------------------------------------------
alter table public.customers enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;

-- customers: own row or admin/manager
drop policy if exists "customers_self_read" on public.customers;
create policy "customers_self_read" on public.customers
  for select using (
    user_id = auth.uid()
    or exists (select 1 from public.profiles pr where pr.id = auth.uid() and pr.role in ('admin', 'manager'))
  );

drop policy if exists "customers_self_insert" on public.customers;
create policy "customers_self_insert" on public.customers
  for insert with check (user_id = auth.uid());

drop policy if exists "customers_self_update" on public.customers;
create policy "customers_self_update" on public.customers
  for update using (
    user_id = auth.uid()
    or exists (select 1 from public.profiles pr where pr.id = auth.uid() and pr.role in ('admin', 'manager'))
  );

drop policy if exists "customers_admin_all" on public.customers;
create policy "customers_admin_all" on public.customers
  for all using (
    exists (select 1 from public.profiles pr where pr.id = auth.uid() and pr.role in ('admin', 'manager'))
  ) with check (
    exists (select 1 from public.profiles pr where pr.id = auth.uid() and pr.role in ('admin', 'manager'))
  );

-- orders: own (via customer) or admin
drop policy if exists "orders_self_read" on public.orders;
create policy "orders_self_read" on public.orders
  for select using (
    customer_id in (select id from public.customers where user_id = auth.uid())
    or exists (select 1 from public.profiles pr where pr.id = auth.uid() and pr.role in ('admin', 'manager'))
  );

drop policy if exists "orders_admin_all" on public.orders;
create policy "orders_admin_all" on public.orders
  for all using (
    exists (select 1 from public.profiles pr where pr.id = auth.uid() and pr.role in ('admin', 'manager'))
  ) with check (
    exists (select 1 from public.profiles pr where pr.id = auth.uid() and pr.role in ('admin', 'manager'))
  );

-- order_items: visible if parent order is visible
drop policy if exists "order_items_self_read" on public.order_items;
create policy "order_items_self_read" on public.order_items
  for select using (
    order_id in (
      select o.id from public.orders o
      where o.customer_id in (select id from public.customers where user_id = auth.uid())
    )
    or exists (select 1 from public.profiles pr where pr.id = auth.uid() and pr.role in ('admin', 'manager'))
  );

drop policy if exists "order_items_admin_all" on public.order_items;
create policy "order_items_admin_all" on public.order_items
  for all using (
    exists (select 1 from public.profiles pr where pr.id = auth.uid() and pr.role in ('admin', 'manager'))
  ) with check (
    exists (select 1 from public.profiles pr where pr.id = auth.uid() and pr.role in ('admin', 'manager'))
  );

----------------------------------------------------------------------
-- 7. Order RPCs (atomic stock reservation, security definer)
----------------------------------------------------------------------
create or replace function public.create_customer_order(p_items jsonb)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_customer public.customers%rowtype;
  v_order_id uuid;
  v_item jsonb;
  v_product public.products_catalog%rowtype;
  v_qty numeric;
  v_available numeric;
  v_sum_usd numeric := 0;
  v_sum_thb numeric := 0;
  v_sum_lak numeric := 0;
begin
  select * into v_customer from public.customers where user_id = auth.uid();
  if v_customer.id is null then
    raise exception 'No customer profile found for this account';
  end if;
  if v_customer.status <> 'approved' then
    raise exception 'Your account must be approved before ordering';
  end if;
  if p_items is null or jsonb_array_length(p_items) = 0 then
    raise exception 'Your cart is empty';
  end if;

  insert into public.orders (customer_id, status, order_date, total_usd, payment_deadline, created_at)
  values (v_customer.id, 'pending_payment', current_date, 0, now() + interval '5 days', now())
  returning id into v_order_id;

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_qty := (v_item->>'quantity_kg')::numeric;
    if v_qty is null or v_qty <= 0 then
      raise exception 'Invalid quantity';
    end if;

    select * into v_product from public.products_catalog
      where id = (v_item->>'catalog_product_id')::uuid for update;
    if v_product.id is null then
      raise exception 'Product not found';
    end if;
    if coalesce(v_product.archived, false) then
      raise exception 'Product % is not available', v_product.name;
    end if;

    v_available := coalesce(v_product.stock_kg, 0) - coalesce(v_product.reserved_kg, 0);
    if v_qty > v_available then
      raise exception 'Insufficient stock for %: % kg available', v_product.name, v_available;
    end if;

    update public.products_catalog
      set reserved_kg = coalesce(reserved_kg, 0) + v_qty
      where id = v_product.id;

    insert into public.order_items
      (order_id, catalog_product_id, product_name, quantity_kg, package_kg,
       unit_price_usd, unit_price_thb, unit_price_lak,
       line_total_usd, line_total_thb, line_total_lak)
    values
      (v_order_id, v_product.id, v_product.name, v_qty, v_qty,
       v_product.public_price_usd, v_product.public_price_thb, v_product.public_price_lak,
       v_qty * coalesce(v_product.public_price_usd, 0),
       v_qty * coalesce(v_product.public_price_thb, 0),
       v_qty * coalesce(v_product.public_price_lak, 0));

    v_sum_usd := v_sum_usd + v_qty * coalesce(v_product.public_price_usd, 0);
    v_sum_thb := v_sum_thb + v_qty * coalesce(v_product.public_price_thb, 0);
    v_sum_lak := v_sum_lak + v_qty * coalesce(v_product.public_price_lak, 0);
  end loop;

  update public.orders
    set total_usd = v_sum_usd,
        subtotal_usd = v_sum_usd,
        subtotal_thb = v_sum_thb,
        subtotal_lak = v_sum_lak
    where id = v_order_id;

  return v_order_id;
end;
$$;

create or replace function public.submit_order_payment(p_order_id uuid, p_slip_path text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.orders%rowtype;
begin
  select * into v_order from public.orders where id = p_order_id;
  if v_order.id is null then
    raise exception 'Order not found';
  end if;
  if v_order.customer_id <> (select id from public.customers where user_id = auth.uid()) then
    raise exception 'Not allowed';
  end if;
  if v_order.status <> 'pending_payment' then
    raise exception 'Payment can only be submitted while awaiting payment';
  end if;

  update public.orders
    set payment_slip_url = p_slip_path,
        payment_submitted_at = now(),
        status = 'payment_submitted'
    where id = p_order_id;
end;
$$;

create or replace function public.cancel_customer_order(p_order_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.orders%rowtype;
  v_is_admin boolean;
  v_item public.order_items%rowtype;
begin
  select * into v_order from public.orders where id = p_order_id;
  if v_order.id is null then
    raise exception 'Order not found';
  end if;
  v_is_admin := exists (select 1 from public.profiles where id = auth.uid() and role in ('admin', 'manager'));
  if not v_is_admin and v_order.customer_id <> (select id from public.customers where user_id = auth.uid()) then
    raise exception 'Not allowed';
  end if;
  if v_order.status not in ('pending_payment', 'payment_submitted') then
    raise exception 'This order can no longer be cancelled';
  end if;

  for v_item in select * from public.order_items where order_id = p_order_id and catalog_product_id is not null
  loop
    update public.products_catalog
      set reserved_kg = greatest(coalesce(reserved_kg, 0) - coalesce(v_item.quantity_kg, 0), 0)
      where id = v_item.catalog_product_id;
  end loop;

  update public.orders set status = 'cancelled' where id = p_order_id;
end;
$$;

create or replace function public.review_order_payment(p_order_id uuid, p_approve boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (select 1 from public.profiles where id = auth.uid() and role in ('admin', 'manager')) then
    raise exception 'Admin only';
  end if;

  if p_approve then
    update public.orders set status = 'payment_confirmed'
      where id = p_order_id and status = 'payment_submitted';
  else
    update public.orders
      set status = 'pending_payment', payment_slip_url = null, payment_submitted_at = null
      where id = p_order_id and status = 'payment_submitted';
  end if;
end;
$$;

create or replace function public.set_order_status(p_order_id uuid, p_status text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (select 1 from public.profiles where id = auth.uid() and role in ('admin', 'manager')) then
    raise exception 'Admin only';
  end if;
  if p_status not in ('preparing', 'ready_for_pickup', 'completed') then
    raise exception 'Invalid status %', p_status;
  end if;
  update public.orders set status = p_status where id = p_order_id;
end;
$$;

-- Auto-cancel orders whose 5-day payment window has lapsed; returns the count.
-- Intended for a scheduled job (pg_cron); also called lazily by the admin UI.
create or replace function public.expire_overdue_orders()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.orders%rowtype;
  v_item public.order_items%rowtype;
  v_count integer := 0;
begin
  for v_order in
    select * from public.orders
    where status = 'pending_payment' and payment_deadline is not null and payment_deadline < now()
  loop
    for v_item in select * from public.order_items where order_id = v_order.id and catalog_product_id is not null
    loop
      update public.products_catalog
        set reserved_kg = greatest(coalesce(reserved_kg, 0) - coalesce(v_item.quantity_kg, 0), 0)
        where id = v_item.catalog_product_id;
    end loop;
    update public.orders set status = 'cancelled' where id = v_order.id;
    v_count := v_count + 1;
  end loop;
  return v_count;
end;
$$;

grant execute on function
  public.create_customer_order(jsonb),
  public.submit_order_payment(uuid, text),
  public.cancel_customer_order(uuid),
  public.review_order_payment(uuid, boolean),
  public.set_order_status(uuid, text),
  public.expire_overdue_orders()
to authenticated;

----------------------------------------------------------------------
-- 8. Payment slip storage
----------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('payment_slips', 'payment_slips', false)
on conflict (id) do nothing;

drop policy if exists "payment_slips_insert" on storage.objects;
create policy "payment_slips_insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'payment_slips');

drop policy if exists "payment_slips_select" on storage.objects;
create policy "payment_slips_select" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'payment_slips'
    and (
      owner = auth.uid()
      or exists (select 1 from public.profiles pr where pr.id = auth.uid() and pr.role in ('admin', 'manager'))
    )
  );

-- Allow a customer to overwrite their own slip (upsert) before it is reviewed.
drop policy if exists "payment_slips_update" on storage.objects;
create policy "payment_slips_update" on storage.objects
  for update to authenticated
  using (bucket_id = 'payment_slips' and owner = auth.uid())
  with check (bucket_id = 'payment_slips' and owner = auth.uid());
