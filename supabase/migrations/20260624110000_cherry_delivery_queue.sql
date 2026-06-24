-- Cherry Delivery Queue System: extends Farmer Mode and Cherry Receiving
-- (20260624090000_farmer_mode.sql) with delivery time slots, queue numbers,
-- and an arrival/queue state machine. Nothing in the prior migrations is
-- altered or removed -- only additive tables/columns/functions.

----------------------------------------------------------------------
-- 1. Delivery time slots (admin-configured, public read so farmers can
--    pick one when booking)
----------------------------------------------------------------------
create table if not exists public.delivery_slots (
  id uuid primary key default gen_random_uuid(),
  start_time time not null,
  end_time time not null,
  capacity_kg numeric not null default 1000,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.delivery_slots enable row level security;

drop policy if exists "delivery_slots_read" on public.delivery_slots;
create policy "delivery_slots_read" on public.delivery_slots for select using (true);

drop policy if exists "delivery_slots_admin_write" on public.delivery_slots;
create policy "delivery_slots_admin_write" on public.delivery_slots for all
  using (exists (select 1 from public.profiles pr where pr.id = auth.uid() and pr.role in ('admin', 'manager')))
  with check (exists (select 1 from public.profiles pr where pr.id = auth.uid() and pr.role in ('admin', 'manager')));

insert into public.delivery_slots (start_time, end_time, capacity_kg)
select v.start_time, v.end_time, 1000
from (
  values
    ('08:00'::time, '09:00'::time),
    ('09:00'::time, '10:00'::time),
    ('10:00'::time, '11:00'::time),
    ('11:00'::time, '12:00'::time),
    ('13:00'::time, '14:00'::time),
    ('14:00'::time, '15:00'::time),
    ('15:00'::time, '16:00'::time),
    ('16:00'::time, '17:00'::time)
) as v(start_time, end_time)
where not exists (
  select 1 from public.delivery_slots s where s.start_time = v.start_time and s.end_time = v.end_time
);

----------------------------------------------------------------------
-- 2. Queue/arrival columns on cherry_bookings (existing columns,
--    including delivery_time and status, are left untouched).
----------------------------------------------------------------------
alter table public.cherry_bookings add column if not exists slot_id uuid references public.delivery_slots(id);
alter table public.cherry_bookings add column if not exists queue_number text;
alter table public.cherry_bookings add column if not exists arrival_status text not null default 'waiting';
alter table public.cherry_bookings add column if not exists arrived_at timestamptz;
alter table public.cherry_bookings add column if not exists weighing_started_at timestamptz;
alter table public.cherry_bookings add column if not exists quality_check_started_at timestamptz;
alter table public.cherry_bookings add column if not exists completed_at timestamptz;

create index if not exists cherry_bookings_slot_id_idx on public.cherry_bookings (slot_id);
create index if not exists cherry_bookings_delivery_date_idx on public.cherry_bookings (delivery_date);

----------------------------------------------------------------------
-- 3. Atomic per-year queue number counter (locked down: RLS enabled,
--    zero policies -- only reachable through the security definer
--    function below).
----------------------------------------------------------------------
create table if not exists public.delivery_queue_counters (
  year int primary key,
  last_number int not null default 0
);

alter table public.delivery_queue_counters enable row level security;

create or replace function public.next_queue_number(p_year int)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_number int;
begin
  insert into public.delivery_queue_counters (year, last_number)
  values (p_year, 1)
  on conflict (year) do update set last_number = public.delivery_queue_counters.last_number + 1
  returning last_number into v_number;

  return v_number;
end;
$$;

grant execute on function public.next_queue_number(int) to authenticated;

----------------------------------------------------------------------
-- 4. Aggregate slot availability for a given date (security definer so
--    any authenticated farmer can see total booked capacity per slot
--    without loosening cherry_bookings_read, which still restricts raw
--    booking rows to their owner / staff).
----------------------------------------------------------------------
create or replace function public.delivery_slot_availability(p_date date)
returns table (
  slot_id uuid,
  start_time time,
  end_time time,
  capacity_kg numeric,
  booked_kg numeric,
  remaining_kg numeric
)
language sql
security definer
set search_path = public
stable
as $$
  select
    s.id as slot_id,
    s.start_time,
    s.end_time,
    s.capacity_kg,
    coalesce(sum(
      case
        when cb.id is null or cb.status = 'cancelled' then 0
        when cb.quantity_unit = 'ton' then cb.estimated_quantity * 1000
        else cb.estimated_quantity
      end
    ), 0) as booked_kg,
    s.capacity_kg - coalesce(sum(
      case
        when cb.id is null or cb.status = 'cancelled' then 0
        when cb.quantity_unit = 'ton' then cb.estimated_quantity * 1000
        else cb.estimated_quantity
      end
    ), 0) as remaining_kg
  from public.delivery_slots s
  left join public.cherry_bookings cb
    on cb.slot_id = s.id and cb.delivery_date = p_date
  where s.active = true
  group by s.id, s.start_time, s.end_time, s.capacity_kg
  order by s.start_time;
$$;

grant execute on function public.delivery_slot_availability(date) to authenticated;
