-- Phase 3: Sales CRM & Customer Management.
-- public.customers already exists (used by orders/order_items/Executive Dashboard) — extend it
-- rather than recreate it, so the existing orders <-> customers relationship keeps working.

----------------------------------------------------------------------
-- 1. Extend customers with CRM profile fields
----------------------------------------------------------------------
alter table public.customers
  add column if not exists shop_name text,
  add column if not exists owner_name text,
  add column if not exists contact_person text,
  add column if not exists phone text,
  add column if not exists whatsapp text,
  add column if not exists email text,
  add column if not exists tax_id text,
  add column if not exists business_registration_number text,
  add column if not exists country text,
  add column if not exists province text,
  add column if not exists district text,
  add column if not exists village text,
  add column if not exists billing_address text,
  add column if not exists shipping_address text,
  add column if not exists google_map_url text,
  add column if not exists category text,
  add column if not exists tags text[] not null default '{}',
  add column if not exists status text not null default 'pending',
  add column if not exists pipeline_stage text not null default 'lead',
  add column if not exists tier text,
  add column if not exists payment_term text,
  add column if not exists assigned_sales_rep uuid references public.profiles(id),
  add column if not exists profile_id uuid references auth.users(id),
  add column if not exists created_by uuid references public.profiles(id),
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

alter table public.customers drop constraint if exists customers_category_check;
alter table public.customers add constraint customers_category_check
  check (category is null or category in (
    'retail', 'cafe', 'restaurant', 'hotel', 'office', 'roaster', 'distributor', 'factory', 'government', 'export'
  ));

alter table public.customers drop constraint if exists customers_status_check;
alter table public.customers add constraint customers_status_check
  check (status in ('pending', 'active', 'suspended', 'blacklisted', 'rejected'));

alter table public.customers drop constraint if exists customers_pipeline_stage_check;
alter table public.customers add constraint customers_pipeline_stage_check
  check (pipeline_stage in ('lead', 'interested', 'sample_sent', 'quotation', 'negotiation', 'won', 'lost'));

create unique index if not exists customers_customer_code_key on public.customers (customer_code) where customer_code is not null;
create unique index if not exists customers_profile_id_key on public.customers (profile_id) where profile_id is not null;

create extension if not exists pg_trgm;
create index if not exists customers_company_name_trgm on public.customers using gin (company_name gin_trgm_ops);
create index if not exists customers_owner_name_trgm on public.customers using gin (owner_name gin_trgm_ops);
create index if not exists customers_phone_trgm on public.customers using gin (phone gin_trgm_ops);
create index if not exists customers_province_idx on public.customers (province);
create index if not exists customers_category_idx on public.customers (category);
create index if not exists customers_status_idx on public.customers (status);
create index if not exists customers_pipeline_stage_idx on public.customers (pipeline_stage);
create index if not exists customers_assigned_sales_rep_idx on public.customers (assigned_sales_rep);
create index if not exists customers_tags_gin on public.customers using gin (tags);

----------------------------------------------------------------------
-- 2. CRM timeline (every interaction logged against a customer)
----------------------------------------------------------------------
create table if not exists public.customer_timeline (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  interaction_type text not null check (interaction_type in (
    'phone_call', 'meeting', 'visit', 'email', 'whatsapp', 'line', 'sample_sent', 'quotation_sent', 'follow_up', 'note'
  )),
  note text,
  occurred_at timestamptz not null default now(),
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create index if not exists customer_timeline_customer_id_idx on public.customer_timeline (customer_id, occurred_at desc);

----------------------------------------------------------------------
-- 3. Customer documents (metadata; files live in Supabase Storage)
----------------------------------------------------------------------
create table if not exists public.customer_documents (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  doc_type text not null check (doc_type in (
    'business_registration', 'tax_certificate', 'passport_id', 'contract', 'import_license'
  )),
  file_path text not null,
  file_name text not null,
  uploaded_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create index if not exists customer_documents_customer_id_idx on public.customer_documents (customer_id);

----------------------------------------------------------------------
-- 4. Guard rail: non-staff updates can never touch privileged fields
----------------------------------------------------------------------
create or replace function public.protect_customer_privileged_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (select 1 from public.profiles pr where pr.id = auth.uid() and pr.role in ('admin', 'manager', 'sales')) then
    new.customer_code := old.customer_code;
    new.status := old.status;
    new.pipeline_stage := old.pipeline_stage;
    new.tier := old.tier;
    new.payment_term := old.payment_term;
    new.assigned_sales_rep := old.assigned_sales_rep;
    new.profile_id := old.profile_id;
  end if;
  return new;
end;
$$;

drop trigger if exists customers_protect_privileged_fields on public.customers;
create trigger customers_protect_privileged_fields
  before update on public.customers
  for each row execute function public.protect_customer_privileged_fields();

----------------------------------------------------------------------
-- 5. RLS
----------------------------------------------------------------------
alter table public.customers enable row level security;
alter table public.customer_timeline enable row level security;
alter table public.customer_documents enable row level security;

drop policy if exists "customers_staff_read" on public.customers;
create policy "customers_staff_read" on public.customers for select
  using (exists (select 1 from public.profiles pr where pr.id = auth.uid() and pr.role in ('admin', 'manager', 'sales')));

drop policy if exists "customers_self_read" on public.customers;
create policy "customers_self_read" on public.customers for select
  using (profile_id = auth.uid());

drop policy if exists "customers_staff_write" on public.customers;
create policy "customers_staff_write" on public.customers for all
  using (exists (select 1 from public.profiles pr where pr.id = auth.uid() and pr.role in ('admin', 'manager', 'sales')))
  with check (exists (select 1 from public.profiles pr where pr.id = auth.uid() and pr.role in ('admin', 'manager', 'sales')));

drop policy if exists "customers_self_insert" on public.customers;
create policy "customers_self_insert" on public.customers for insert
  with check (
    profile_id = auth.uid()
    and status = 'pending'
    and pipeline_stage = 'lead'
    and assigned_sales_rep is null
  );

drop policy if exists "customers_self_update" on public.customers;
create policy "customers_self_update" on public.customers for update
  using (profile_id = auth.uid())
  with check (profile_id = auth.uid());

drop policy if exists "customer_timeline_staff_all" on public.customer_timeline;
create policy "customer_timeline_staff_all" on public.customer_timeline for all
  using (exists (select 1 from public.profiles pr where pr.id = auth.uid() and pr.role in ('admin', 'manager', 'sales')))
  with check (exists (select 1 from public.profiles pr where pr.id = auth.uid() and pr.role in ('admin', 'manager', 'sales')));

drop policy if exists "customer_timeline_self_read" on public.customer_timeline;
create policy "customer_timeline_self_read" on public.customer_timeline for select
  using (exists (select 1 from public.customers c where c.id = customer_timeline.customer_id and c.profile_id = auth.uid()));

drop policy if exists "customer_documents_staff_all" on public.customer_documents;
create policy "customer_documents_staff_all" on public.customer_documents for all
  using (exists (select 1 from public.profiles pr where pr.id = auth.uid() and pr.role in ('admin', 'manager', 'sales')))
  with check (exists (select 1 from public.profiles pr where pr.id = auth.uid() and pr.role in ('admin', 'manager', 'sales')));

drop policy if exists "customer_documents_self_read" on public.customer_documents;
create policy "customer_documents_self_read" on public.customer_documents for select
  using (exists (select 1 from public.customers c where c.id = customer_documents.customer_id and c.profile_id = auth.uid()));

drop policy if exists "customer_documents_self_insert" on public.customer_documents;
create policy "customer_documents_self_insert" on public.customer_documents for insert
  with check (exists (select 1 from public.customers c where c.id = customer_documents.customer_id and c.profile_id = auth.uid()));

----------------------------------------------------------------------
-- 6. Storage bucket for customer documents (private — tax/passport docs)
----------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('customer-documents', 'customer-documents', false)
on conflict (id) do nothing;

drop policy if exists "customer_documents_storage_insert" on storage.objects;
create policy "customer_documents_storage_insert" on storage.objects for insert
  with check (
    bucket_id = 'customer-documents' and (
      exists (select 1 from public.profiles pr where pr.id = auth.uid() and pr.role in ('admin', 'manager', 'sales'))
      or exists (select 1 from public.customers c where c.profile_id = auth.uid() and c.id::text = (storage.foldername(name))[1])
    )
  );

drop policy if exists "customer_documents_storage_read" on storage.objects;
create policy "customer_documents_storage_read" on storage.objects for select
  using (
    bucket_id = 'customer-documents' and (
      exists (select 1 from public.profiles pr where pr.id = auth.uid() and pr.role in ('admin', 'manager', 'sales'))
      or exists (select 1 from public.customers c where c.profile_id = auth.uid() and c.id::text = (storage.foldername(name))[1])
    )
  );

drop policy if exists "customer_documents_storage_delete" on storage.objects;
create policy "customer_documents_storage_delete" on storage.objects for delete
  using (
    bucket_id = 'customer-documents'
    and exists (select 1 from public.profiles pr where pr.id = auth.uid() and pr.role in ('admin', 'manager', 'sales'))
  );
