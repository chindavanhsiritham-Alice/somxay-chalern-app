-- Customer Portal V1 business rules: tier-based pricing, richer payment terms,
-- expanded status workflow, and optional customer documents.
-- Additive and idempotent; apply after 20260616090000_customer_portal_v1.sql.

----------------------------------------------------------------------
-- 1. Tier-based product pricing
--    Retail uses the existing public_price_* columns as the base.
--    Other tiers fall back to the base price when left null.
----------------------------------------------------------------------
alter table public.products_catalog
  add column if not exists price_wholesale_usd numeric,
  add column if not exists price_wholesale_thb numeric,
  add column if not exists price_wholesale_lak numeric,
  add column if not exists price_distributor_usd numeric,
  add column if not exists price_distributor_thb numeric,
  add column if not exists price_distributor_lak numeric,
  add column if not exists price_vip_usd numeric,
  add column if not exists price_vip_thb numeric,
  add column if not exists price_vip_lak numeric;

----------------------------------------------------------------------
-- 2. Payment terms on the customer (prepaid | credit_3 | credit_5)
--    Default prepaid; admin-assigned only (enforced in the app + RLS).
----------------------------------------------------------------------
alter table public.customers
  add column if not exists payment_terms text not null default 'prepaid';

----------------------------------------------------------------------
-- 3. Tier-aware portal_products view
--    Resolves the caller's tier (auth.uid()) and exposes a single,
--    correct price set — never other tiers' prices or internal cost.
----------------------------------------------------------------------
create or replace view public.portal_products as
with me as (
  select coalesce(
    (select tier from public.customers where user_id = auth.uid() limit 1),
    'retail'
  ) as tier
)
select
  p.id,
  p.name,
  p.grade,
  p.variety,
  p.process,
  p.crop_year,
  p.moisture,
  p.defect,
  p.packing,
  greatest(coalesce(p.stock_kg, 0) - coalesce(p.reserved_kg, 0), 0) as available_kg,
  me.tier as tier,
  case me.tier
    when 'wholesale' then coalesce(p.price_wholesale_usd, p.public_price_usd)
    when 'distributor' then coalesce(p.price_distributor_usd, p.public_price_usd)
    when 'vip' then coalesce(p.price_vip_usd, p.public_price_usd)
    else p.public_price_usd
  end as public_price_usd,
  case me.tier
    when 'wholesale' then coalesce(p.price_wholesale_thb, p.public_price_thb)
    when 'distributor' then coalesce(p.price_distributor_thb, p.public_price_thb)
    when 'vip' then coalesce(p.price_vip_thb, p.public_price_thb)
    else p.public_price_thb
  end as public_price_thb,
  case me.tier
    when 'wholesale' then coalesce(p.price_wholesale_lak, p.public_price_lak)
    when 'distributor' then coalesce(p.price_distributor_lak, p.public_price_lak)
    when 'vip' then coalesce(p.price_vip_lak, p.public_price_lak)
    else p.public_price_lak
  end as public_price_lak
from public.products_catalog p, me
where coalesce(p.archived, false) = false
  and coalesce(p.available, true) = true;

grant select on public.portal_products to authenticated, anon;

----------------------------------------------------------------------
-- 4. Tier-aware order creation (authoritative server-side pricing)
--    Approved OR active customers may order.
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

    -- Authoritative tier price (fall back to base/retail price).
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

----------------------------------------------------------------------
-- 5. Customer documents (optional uploads)
----------------------------------------------------------------------
create table if not exists public.customer_documents (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references public.customers(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  doc_type text not null,
  file_path text not null,
  uploaded_at timestamptz not null default now()
);

create unique index if not exists customer_documents_unique
  on public.customer_documents (customer_id, doc_type);

alter table public.customer_documents enable row level security;

drop policy if exists "customer_documents_owner" on public.customer_documents;
create policy "customer_documents_owner" on public.customer_documents
  for all
  using (
    user_id = auth.uid()
    or exists (select 1 from public.profiles pr where pr.id = auth.uid() and pr.role in ('admin', 'manager'))
  )
  with check (
    user_id = auth.uid()
    or exists (select 1 from public.profiles pr where pr.id = auth.uid() and pr.role in ('admin', 'manager'))
  );

insert into storage.buckets (id, name, public)
values ('customer_documents', 'customer_documents', false)
on conflict (id) do nothing;

drop policy if exists "customer_documents_insert" on storage.objects;
create policy "customer_documents_insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'customer_documents');

drop policy if exists "customer_documents_update" on storage.objects;
create policy "customer_documents_update" on storage.objects
  for update to authenticated
  using (bucket_id = 'customer_documents' and owner = auth.uid())
  with check (bucket_id = 'customer_documents' and owner = auth.uid());

drop policy if exists "customer_documents_select" on storage.objects;
create policy "customer_documents_select" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'customer_documents'
    and (
      owner = auth.uid()
      or exists (select 1 from public.profiles pr where pr.id = auth.uid() and pr.role in ('admin', 'manager'))
    )
  );
