-- Phase 2: customer codes, credit limits, sales-rep assignment, and search
-- optimization for large customer bases. Additive and idempotent.

----------------------------------------------------------------------
-- 1. Auto-generated customer code (CUS-000001) on approval/activation
----------------------------------------------------------------------
create sequence if not exists public.customer_code_seq start 1;

create or replace function public.assign_customer_code()
returns trigger
language plpgsql
as $$
begin
  if (new.status in ('approved', 'active'))
     and (new.customer_code is null or new.customer_code = '') then
    new.customer_code := 'CUS-' || lpad(nextval('public.customer_code_seq')::text, 6, '0');
  end if;
  return new;
end;
$$;

drop trigger if exists trg_assign_customer_code on public.customers;
create trigger trg_assign_customer_code
  before insert or update on public.customers
  for each row execute function public.assign_customer_code();

----------------------------------------------------------------------
-- 2. Credit limit
----------------------------------------------------------------------
alter table public.customers
  add column if not exists credit_limit_usd numeric not null default 0;

-- Outstanding = unpaid orders (pending_payment + payment_submitted).
-- security_invoker so the caller's RLS scopes which customers/orders are visible.
create or replace view public.customer_balances
with (security_invoker = true) as
select
  c.id as customer_id,
  coalesce(c.credit_limit_usd, 0) as credit_limit_usd,
  coalesce((
    select sum(o.total_usd) from public.orders o
    where o.customer_id = c.id and o.status in ('pending_payment', 'payment_submitted')
  ), 0) as outstanding_usd,
  coalesce(c.credit_limit_usd, 0) - coalesce((
    select sum(o.total_usd) from public.orders o
    where o.customer_id = c.id and o.status in ('pending_payment', 'payment_submitted')
  ), 0) as available_usd
from public.customers c;

grant select on public.customer_balances to authenticated;

----------------------------------------------------------------------
-- 3. Sales representatives
----------------------------------------------------------------------
-- (sales_rep_stats view defined after the table below.)
create table if not exists public.sales_reps (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  email text,
  phone text,
  user_id uuid references auth.users(id) on delete set null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create unique index if not exists sales_reps_user_id_idx on public.sales_reps (user_id);

alter table public.customers
  add column if not exists sales_rep_id uuid references public.sales_reps(id) on delete set null;

alter table public.sales_reps enable row level security;

drop policy if exists "sales_reps_admin_all" on public.sales_reps;
create policy "sales_reps_admin_all" on public.sales_reps
  for all
  using (exists (select 1 from public.profiles pr where pr.id = auth.uid() and pr.role in ('admin', 'manager')))
  with check (exists (select 1 from public.profiles pr where pr.id = auth.uid() and pr.role in ('admin', 'manager')));

drop policy if exists "sales_reps_self_read" on public.sales_reps;
create policy "sales_reps_self_read" on public.sales_reps
  for select using (user_id = auth.uid());

-- A sales rep can read the customers (and their orders) assigned to them.
drop policy if exists "customers_sales_read" on public.customers;
create policy "customers_sales_read" on public.customers
  for select using (
    sales_rep_id in (select id from public.sales_reps where user_id = auth.uid())
  );

drop policy if exists "orders_sales_read" on public.orders;
create policy "orders_sales_read" on public.orders
  for select using (
    customer_id in (
      select c.id from public.customers c
      where c.sales_rep_id in (select id from public.sales_reps where user_id = auth.uid())
    )
  );

-- Per-rep rollups for the sales dashboard.
create or replace view public.sales_rep_stats
with (security_invoker = true) as
select
  r.id as sales_rep_id,
  count(distinct c.id) as customer_count,
  coalesce(sum(o.total_usd) filter (where o.status = 'completed'), 0) as total_sales_usd,
  coalesce(sum(o.total_usd) filter (where o.status in ('pending_payment', 'payment_submitted')), 0) as outstanding_usd
from public.sales_reps r
left join public.customers c on c.sales_rep_id = r.id
left join public.orders o on o.customer_id = c.id
group by r.id;

grant select on public.sales_rep_stats to authenticated;

----------------------------------------------------------------------
-- 4. Search optimisation for 1,000+ customers
----------------------------------------------------------------------
create extension if not exists pg_trgm;

create index if not exists customers_status_idx on public.customers (status);
create index if not exists customers_tier_idx on public.customers (tier);
create index if not exists customers_sales_rep_idx on public.customers (sales_rep_id);
create index if not exists customers_created_at_idx on public.customers (created_at desc);
create index if not exists customers_name_trgm on public.customers using gin (lower(full_name) gin_trgm_ops);
create index if not exists customers_company_trgm on public.customers using gin (lower(company_name) gin_trgm_ops);
create index if not exists customers_email_trgm on public.customers using gin (lower(email) gin_trgm_ops);
create index if not exists customers_code_trgm on public.customers using gin (lower(customer_code) gin_trgm_ops);
create index if not exists orders_customer_status_idx on public.orders (customer_id, status);

----------------------------------------------------------------------
-- 5. Order creation: enforce credit limit (tier pricing preserved)
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
  v_usd numeric;
  v_thb numeric;
  v_lak numeric;
  v_sum_usd numeric := 0;
  v_sum_thb numeric := 0;
  v_sum_lak numeric := 0;
  v_outstanding numeric;
begin
  select * into v_customer from public.customers where user_id = auth.uid();
  if v_customer.id is null then
    raise exception 'No customer profile found for this account';
  end if;
  if v_customer.status not in ('approved', 'active') then
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

    v_usd := case v_customer.tier
      when 'wholesale' then coalesce(v_product.price_wholesale_usd, v_product.public_price_usd)
      when 'distributor' then coalesce(v_product.price_distributor_usd, v_product.public_price_usd)
      when 'vip' then coalesce(v_product.price_vip_usd, v_product.public_price_usd)
      else v_product.public_price_usd
    end;
    v_thb := case v_customer.tier
      when 'wholesale' then coalesce(v_product.price_wholesale_thb, v_product.public_price_thb)
      when 'distributor' then coalesce(v_product.price_distributor_thb, v_product.public_price_thb)
      when 'vip' then coalesce(v_product.price_vip_thb, v_product.public_price_thb)
      else v_product.public_price_thb
    end;
    v_lak := case v_customer.tier
      when 'wholesale' then coalesce(v_product.price_wholesale_lak, v_product.public_price_lak)
      when 'distributor' then coalesce(v_product.price_distributor_lak, v_product.public_price_lak)
      when 'vip' then coalesce(v_product.price_vip_lak, v_product.public_price_lak)
      else v_product.public_price_lak
    end;

    update public.products_catalog
      set reserved_kg = coalesce(reserved_kg, 0) + v_qty
      where id = v_product.id;

    insert into public.order_items
      (order_id, catalog_product_id, product_name, quantity_kg, package_kg,
       unit_price_usd, unit_price_thb, unit_price_lak,
       line_total_usd, line_total_thb, line_total_lak)
    values
      (v_order_id, v_product.id, v_product.name, v_qty, v_qty,
       v_usd, v_thb, v_lak,
       v_qty * coalesce(v_usd, 0), v_qty * coalesce(v_thb, 0), v_qty * coalesce(v_lak, 0));

    v_sum_usd := v_sum_usd + v_qty * coalesce(v_usd, 0);
    v_sum_thb := v_sum_thb + v_qty * coalesce(v_thb, 0);
    v_sum_lak := v_sum_lak + v_qty * coalesce(v_lak, 0);
  end loop;

  -- Credit-limit enforcement (only when a positive limit is configured).
  if coalesce(v_customer.credit_limit_usd, 0) > 0 then
    select coalesce(sum(o.total_usd), 0) into v_outstanding
    from public.orders o
    where o.customer_id = v_customer.id
      and o.status in ('pending_payment', 'payment_submitted')
      and o.id <> v_order_id;
    if v_outstanding + v_sum_usd > v_customer.credit_limit_usd then
      raise exception 'Credit limit exceeded: outstanding $% + order $% exceeds limit $%',
        v_outstanding, v_sum_usd, v_customer.credit_limit_usd;
    end if;
  end if;

  update public.orders
    set total_usd = v_sum_usd,
        subtotal_usd = v_sum_usd,
        subtotal_thb = v_sum_thb,
        subtotal_lak = v_sum_lak
    where id = v_order_id;

  return v_order_id;
end;
$$;

grant execute on function public.create_customer_order(jsonb) to authenticated;
