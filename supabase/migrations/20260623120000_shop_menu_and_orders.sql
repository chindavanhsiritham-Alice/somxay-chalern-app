-- Retail coffee-shop storefront (Cotti-style ordering): menu catalog + guest
-- checkout. Fully separate from products_catalog/orders, which are the
-- green-bean B2B export tables — drinks have a different shape (size,
-- temperature, add-ons) and are sold to walk-in customers, not roasters.

----------------------------------------------------------------------
-- 1. Menu: categories and drinks
----------------------------------------------------------------------
create table if not exists public.shop_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  sort_order int not null default 0
);

create table if not exists public.shop_products (
  id uuid primary key default gen_random_uuid(),
  category_id uuid references public.shop_categories(id) on delete set null,
  name text not null,
  description text,
  image_emoji text not null default '☕',
  base_price numeric not null,
  large_upcharge numeric not null default 0,
  hot_available boolean not null default true,
  iced_available boolean not null default true,
  is_available boolean not null default true,
  sort_order int not null default 0
);

create table if not exists public.shop_addons (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  price numeric not null default 0,
  sort_order int not null default 0
);

alter table public.shop_categories enable row level security;
alter table public.shop_products enable row level security;
alter table public.shop_addons enable row level security;

drop policy if exists "shop_categories_read" on public.shop_categories;
create policy "shop_categories_read" on public.shop_categories for select using (true);

drop policy if exists "shop_products_read" on public.shop_products;
create policy "shop_products_read" on public.shop_products for select using (true);

drop policy if exists "shop_addons_read" on public.shop_addons;
create policy "shop_addons_read" on public.shop_addons for select using (true);

drop policy if exists "shop_categories_admin_write" on public.shop_categories;
create policy "shop_categories_admin_write" on public.shop_categories for all
  using (exists (select 1 from public.profiles pr where pr.id = auth.uid() and pr.role in ('admin', 'manager')))
  with check (exists (select 1 from public.profiles pr where pr.id = auth.uid() and pr.role in ('admin', 'manager')));

drop policy if exists "shop_products_admin_write" on public.shop_products;
create policy "shop_products_admin_write" on public.shop_products for all
  using (exists (select 1 from public.profiles pr where pr.id = auth.uid() and pr.role in ('admin', 'manager')))
  with check (exists (select 1 from public.profiles pr where pr.id = auth.uid() and pr.role in ('admin', 'manager')));

drop policy if exists "shop_addons_admin_write" on public.shop_addons;
create policy "shop_addons_admin_write" on public.shop_addons for all
  using (exists (select 1 from public.profiles pr where pr.id = auth.uid() and pr.role in ('admin', 'manager')))
  with check (exists (select 1 from public.profiles pr where pr.id = auth.uid() and pr.role in ('admin', 'manager')));

----------------------------------------------------------------------
-- 2. Guest orders (no payment gateway yet — pickup + pay-at-counter)
----------------------------------------------------------------------
create table if not exists public.shop_orders (
  id uuid primary key default gen_random_uuid(),
  order_code text not null,
  customer_name text not null,
  customer_phone text not null,
  pickup_branch text not null,
  payment_method text not null,
  note text,
  subtotal numeric not null,
  total numeric not null,
  status text not null default 'received',
  created_at timestamptz not null default now()
);

create table if not exists public.shop_order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.shop_orders(id) on delete cascade,
  product_id uuid references public.shop_products(id) on delete set null,
  product_name text not null,
  size text not null,
  temperature text not null,
  sweetness text not null,
  addons jsonb not null default '[]'::jsonb,
  unit_price numeric not null,
  quantity int not null,
  line_total numeric not null
);

alter table public.shop_orders enable row level security;
alter table public.shop_order_items enable row level security;

-- Anyone can place a guest order (no account required to order coffee).
drop policy if exists "shop_orders_insert_guest" on public.shop_orders;
create policy "shop_orders_insert_guest" on public.shop_orders for insert with check (true);

drop policy if exists "shop_order_items_insert_guest" on public.shop_order_items;
create policy "shop_order_items_insert_guest" on public.shop_order_items for insert with check (true);

-- Order confirmation pages are read by guests via the order's random UUID
-- (acts as the access token, same as most guest-checkout flows). Staff list
-- everything through the admin order board.
drop policy if exists "shop_orders_read" on public.shop_orders;
create policy "shop_orders_read" on public.shop_orders for select using (true);

drop policy if exists "shop_order_items_read" on public.shop_order_items;
create policy "shop_order_items_read" on public.shop_order_items for select using (true);

drop policy if exists "shop_orders_admin_update" on public.shop_orders;
create policy "shop_orders_admin_update" on public.shop_orders for update
  using (exists (select 1 from public.profiles pr where pr.id = auth.uid() and pr.role in ('admin', 'manager')))
  with check (exists (select 1 from public.profiles pr where pr.id = auth.uid() and pr.role in ('admin', 'manager')));

----------------------------------------------------------------------
-- 3. Seed menu (idempotent on name)
----------------------------------------------------------------------
insert into public.shop_categories (name, sort_order)
select v.name, v.sort_order
from (values ('กาแฟ', 1), ('นม/ชา', 2), ('เมนูพิเศษ', 3)) as v(name, sort_order)
where not exists (select 1 from public.shop_categories c where c.name = v.name);

insert into public.shop_products
  (category_id, name, description, image_emoji, base_price, large_upcharge, hot_available, iced_available, sort_order)
select
  (select id from public.shop_categories where name = v.category),
  v.name, v.description, v.emoji, v.price, v.upcharge, v.hot, v.iced, v.sort_order
from (
  values
    ('กาแฟ', 'อเมริกาโน่',        'กาแฟดำเข้มข้น สดชื่น',              '☕', 45::numeric, 10::numeric, true,  true,  1),
    ('กาแฟ', 'ลาเต้',              'เอสเปรสโซผสมนมสดเนียนนุ่ม',          '🥛', 55::numeric, 10::numeric, true,  true,  2),
    ('กาแฟ', 'คาปูชิโน่',          'เอสเปรสโซ นมสด และฟองนมหนานุ่ม',     '☕', 55::numeric, 10::numeric, true,  false, 3),
    ('กาแฟ', 'มอคค่า',             'กาแฟผสมช็อกโกแลตหวานละมุน',          '🍫', 60::numeric, 10::numeric, true,  true,  4),
    ('นม/ชา', 'ชาไทย',             'ชาไทยต้นตำรับ หอมเข้มข้น',           '🧉', 50::numeric, 10::numeric, false, true,  1),
    ('นม/ชา', 'ชาเขียวมัทฉะลาเต้',  'มัทฉะญี่ปุ่นผสมนมสด',                '🍵', 60::numeric, 10::numeric, true,  true,  2),
    ('นม/ชา', 'โกโก้',              'โกโก้เข้มข้นรสชอกโกแลต',              '🍫', 55::numeric, 10::numeric, true,  true,  3),
    ('เมนูพิเศษ', 'ลาเต้น้ำตาลทรายแดง', 'ซิกเนเจอร์ลาเต้กับน้ำตาลทรายแดงกรุบ', '🤎', 65::numeric, 10::numeric, false, true,  1),
    ('เมนูพิเศษ', 'ลาเต้มะพร้าว',    'ลาเต้กับนมมะพร้าวหอมมัน',             '🥥', 65::numeric, 10::numeric, false, true,  2),
    ('เมนูพิเศษ', 'สตรอว์เบอร์รี่ลาเต้', 'ลาเต้ผสมซอสสตรอว์เบอร์รี่สดชื่น',    '🍓', 65::numeric, 10::numeric, false, true,  3)
) as v(category, name, description, emoji, price, upcharge, hot, iced, sort_order)
where not exists (select 1 from public.shop_products p where p.name = v.name);

insert into public.shop_addons (name, price, sort_order)
select v.name, v.price, v.sort_order
from (
  values
    ('เพิ่มชอตเอสเปรสโซ', 15::numeric, 1),
    ('ไข่มุก', 10::numeric, 2),
    ('วิปครีม', 10::numeric, 3),
    ('เปลี่ยนเป็นนมโอ๊ต', 15::numeric, 4)
) as v(name, price, sort_order)
where not exists (select 1 from public.shop_addons a where a.name = v.name);
