-- Farmer Mode: cherry-bean procurement from farmers, separate from both the
-- green-bean B2B export tables (products_catalog/orders) and the retail
-- coffee-shop tables (shop_*). A farmer is a profile with role='farmer';
-- the farmers row stores their procurement-specific details and links back
-- to profiles via profile_id so RLS can resolve "my own records" from
-- auth.uid().

----------------------------------------------------------------------
-- 1. Farmers
----------------------------------------------------------------------
create table if not exists public.farmers (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null unique references public.profiles(id) on delete cascade,
  full_name text not null,
  phone text,
  village text,
  created_at timestamptz not null default now()
);

alter table public.farmers enable row level security;

drop policy if exists "farmers_read" on public.farmers;
create policy "farmers_read" on public.farmers for select
  using (
    profile_id = auth.uid()
    or exists (select 1 from public.profiles pr where pr.id = auth.uid() and pr.role in ('admin', 'manager'))
  );

drop policy if exists "farmers_self_insert" on public.farmers;
create policy "farmers_self_insert" on public.farmers for insert
  with check (profile_id = auth.uid());

drop policy if exists "farmers_update" on public.farmers;
create policy "farmers_update" on public.farmers for update
  using (
    profile_id = auth.uid()
    or exists (select 1 from public.profiles pr where pr.id = auth.uid() and pr.role in ('admin', 'manager'))
  )
  with check (
    profile_id = auth.uid()
    or exists (select 1 from public.profiles pr where pr.id = auth.uid() and pr.role in ('admin', 'manager'))
  );

----------------------------------------------------------------------
-- 2. Today's cherry buying price, keyed by coffee type (mirrors
--    exchange_rates: upsert-by-key, public read, admin/manager write)
----------------------------------------------------------------------
create table if not exists public.cherry_prices (
  id uuid primary key default gen_random_uuid(),
  coffee_type text not null unique,
  price_per_kg numeric not null,
  updated_at timestamptz not null default now()
);

alter table public.cherry_prices enable row level security;

drop policy if exists "cherry_prices_read" on public.cherry_prices;
create policy "cherry_prices_read" on public.cherry_prices for select using (true);

drop policy if exists "cherry_prices_admin_write" on public.cherry_prices;
create policy "cherry_prices_admin_write" on public.cherry_prices for all
  using (exists (select 1 from public.profiles pr where pr.id = auth.uid() and pr.role in ('admin', 'manager')))
  with check (exists (select 1 from public.profiles pr where pr.id = auth.uid() and pr.role in ('admin', 'manager')));

insert into public.cherry_prices (coffee_type, price_per_kg)
select v.coffee_type, v.price
from (values ('Arabica Cherry', 25::numeric), ('Robusta Cherry', 18::numeric)) as v(coffee_type, price)
where not exists (select 1 from public.cherry_prices c where c.coffee_type = v.coffee_type);

----------------------------------------------------------------------
-- 3. Cherry sell bookings (farmer-created)
----------------------------------------------------------------------
create table if not exists public.cherry_bookings (
  id uuid primary key default gen_random_uuid(),
  booking_code text not null,
  farmer_id uuid not null references public.farmers(id) on delete cascade,
  coffee_type text not null,
  estimated_quantity numeric not null,
  quantity_unit text not null default 'kg',
  delivery_date date not null,
  delivery_time time not null,
  delivery_point text not null,
  photo_url text,
  price_at_booking numeric not null,
  status text not null default 'pending',
  created_at timestamptz not null default now()
);

alter table public.cherry_bookings enable row level security;

drop policy if exists "cherry_bookings_read" on public.cherry_bookings;
create policy "cherry_bookings_read" on public.cherry_bookings for select
  using (
    exists (select 1 from public.farmers f where f.id = cherry_bookings.farmer_id and f.profile_id = auth.uid())
    or exists (select 1 from public.profiles pr where pr.id = auth.uid() and pr.role in ('admin', 'manager'))
  );

drop policy if exists "cherry_bookings_farmer_insert" on public.cherry_bookings;
create policy "cherry_bookings_farmer_insert" on public.cherry_bookings for insert
  with check (exists (select 1 from public.farmers f where f.id = cherry_bookings.farmer_id and f.profile_id = auth.uid()));

drop policy if exists "cherry_bookings_admin_update" on public.cherry_bookings;
create policy "cherry_bookings_admin_update" on public.cherry_bookings for update
  using (exists (select 1 from public.profiles pr where pr.id = auth.uid() and pr.role in ('admin', 'manager')))
  with check (exists (select 1 from public.profiles pr where pr.id = auth.uid() and pr.role in ('admin', 'manager')));

----------------------------------------------------------------------
-- 4. Factory receiving record (admin-recorded, one per booking)
----------------------------------------------------------------------
create table if not exists public.cherry_receivings (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null unique references public.cherry_bookings(id) on delete cascade,
  truck_plate text,
  gross_weight numeric,
  tare_weight numeric,
  net_weight numeric,
  quality_grade text,
  defect_percent numeric,
  deduction_percent numeric,
  accepted_weight numeric,
  recorded_by uuid references public.profiles(id),
  received_at timestamptz not null default now()
);

alter table public.cherry_receivings enable row level security;

drop policy if exists "cherry_receivings_read" on public.cherry_receivings;
create policy "cherry_receivings_read" on public.cherry_receivings for select
  using (
    exists (
      select 1 from public.cherry_bookings cb
      join public.farmers f on f.id = cb.farmer_id
      where cb.id = cherry_receivings.booking_id and f.profile_id = auth.uid()
    )
    or exists (select 1 from public.profiles pr where pr.id = auth.uid() and pr.role in ('admin', 'manager'))
  );

drop policy if exists "cherry_receivings_admin_write" on public.cherry_receivings;
create policy "cherry_receivings_admin_write" on public.cherry_receivings for all
  using (exists (select 1 from public.profiles pr where pr.id = auth.uid() and pr.role in ('admin', 'manager')))
  with check (exists (select 1 from public.profiles pr where pr.id = auth.uid() and pr.role in ('admin', 'manager')));

----------------------------------------------------------------------
-- 5. Farmer payments
----------------------------------------------------------------------
create table if not exists public.farmer_payments (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid references public.cherry_bookings(id) on delete set null,
  farmer_id uuid not null references public.farmers(id) on delete cascade,
  accepted_weight numeric not null,
  price_per_kg numeric not null,
  gross_amount numeric not null,
  fertilizer_deduction numeric not null default 0,
  net_payable numeric not null,
  payment_method text,
  payment_slip_url text,
  status text not null default 'pending',
  paid_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.farmer_payments enable row level security;

drop policy if exists "farmer_payments_read" on public.farmer_payments;
create policy "farmer_payments_read" on public.farmer_payments for select
  using (
    exists (select 1 from public.farmers f where f.id = farmer_payments.farmer_id and f.profile_id = auth.uid())
    or exists (select 1 from public.profiles pr where pr.id = auth.uid() and pr.role in ('admin', 'manager'))
  );

drop policy if exists "farmer_payments_admin_write" on public.farmer_payments;
create policy "farmer_payments_admin_write" on public.farmer_payments for all
  using (exists (select 1 from public.profiles pr where pr.id = auth.uid() and pr.role in ('admin', 'manager')))
  with check (exists (select 1 from public.profiles pr where pr.id = auth.uid() and pr.role in ('admin', 'manager')));

----------------------------------------------------------------------
-- 6. Farmer fertilizer debt balance (one row per farmer, admin-managed)
----------------------------------------------------------------------
create table if not exists public.farmer_debts (
  farmer_id uuid primary key references public.farmers(id) on delete cascade,
  balance numeric not null default 0,
  updated_at timestamptz not null default now()
);

alter table public.farmer_debts enable row level security;

drop policy if exists "farmer_debts_read" on public.farmer_debts;
create policy "farmer_debts_read" on public.farmer_debts for select
  using (
    exists (select 1 from public.farmers f where f.id = farmer_debts.farmer_id and f.profile_id = auth.uid())
    or exists (select 1 from public.profiles pr where pr.id = auth.uid() and pr.role in ('admin', 'manager'))
  );

drop policy if exists "farmer_debts_admin_write" on public.farmer_debts;
create policy "farmer_debts_admin_write" on public.farmer_debts for all
  using (exists (select 1 from public.profiles pr where pr.id = auth.uid() and pr.role in ('admin', 'manager')))
  with check (exists (select 1 from public.profiles pr where pr.id = auth.uid() and pr.role in ('admin', 'manager')));

----------------------------------------------------------------------
-- 7. Storage buckets for cherry photos and payment slips
----------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('cherry-photos', 'cherry-photos', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('payment-slips', 'payment-slips', true)
on conflict (id) do nothing;

drop policy if exists "cherry_photos_insert" on storage.objects;
create policy "cherry_photos_insert" on storage.objects for insert
  with check (bucket_id = 'cherry-photos' and auth.role() = 'authenticated');

drop policy if exists "cherry_photos_read" on storage.objects;
create policy "cherry_photos_read" on storage.objects for select
  using (bucket_id = 'cherry-photos');

drop policy if exists "payment_slips_insert" on storage.objects;
create policy "payment_slips_insert" on storage.objects for insert
  with check (bucket_id = 'payment-slips' and auth.role() = 'authenticated');

drop policy if exists "payment_slips_read" on storage.objects;
create policy "payment_slips_read" on storage.objects for select
  using (bucket_id = 'payment-slips');
