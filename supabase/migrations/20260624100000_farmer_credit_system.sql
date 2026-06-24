-- Farmer Credit System: extends Farmer Mode (20260624090000_farmer_mode.sql)
-- with per-category debt balances and a full transaction ledger. Nothing in
-- the prior migration is altered or removed — only additive columns/tables.

----------------------------------------------------------------------
-- 1. Category balances on farmer_debts (existing single `balance` column
--    is left untouched and kept mirroring fertilizer_balance for backward
--    compatibility with the existing farmer dashboard card).
----------------------------------------------------------------------
alter table public.farmer_debts add column if not exists fertilizer_balance numeric not null default 0;
alter table public.farmer_debts add column if not exists pesticide_balance numeric not null default 0;
alter table public.farmer_debts add column if not exists cash_advance_balance numeric not null default 0;
alter table public.farmer_debts add column if not exists other_balance numeric not null default 0;

update public.farmer_debts
set fertilizer_balance = balance
where fertilizer_balance = 0 and balance <> 0;

----------------------------------------------------------------------
-- 2. Extra deduction columns on farmer_payments (existing
--    fertilizer_deduction column/semantics untouched).
----------------------------------------------------------------------
alter table public.farmer_payments add column if not exists pesticide_deduction numeric not null default 0;
alter table public.farmer_payments add column if not exists cash_advance_deduction numeric not null default 0;

----------------------------------------------------------------------
-- 3. Farmer debt transaction ledger
----------------------------------------------------------------------
create table if not exists public.farmer_debt_ledger (
  id uuid primary key default gen_random_uuid(),
  farmer_id uuid not null references public.farmers(id) on delete cascade,
  transaction_type text not null,
  debit numeric not null default 0,
  credit numeric not null default 0,
  balance_after numeric not null default 0,
  note text,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

alter table public.farmer_debt_ledger enable row level security;

drop policy if exists "farmer_debt_ledger_read" on public.farmer_debt_ledger;
create policy "farmer_debt_ledger_read" on public.farmer_debt_ledger for select
  using (
    exists (select 1 from public.farmers f where f.id = farmer_debt_ledger.farmer_id and f.profile_id = auth.uid())
    or exists (select 1 from public.profiles pr where pr.id = auth.uid() and pr.role in ('admin', 'manager'))
  );

drop policy if exists "farmer_debt_ledger_admin_write" on public.farmer_debt_ledger;
create policy "farmer_debt_ledger_admin_write" on public.farmer_debt_ledger for all
  using (exists (select 1 from public.profiles pr where pr.id = auth.uid() and pr.role in ('admin', 'manager')))
  with check (exists (select 1 from public.profiles pr where pr.id = auth.uid() and pr.role in ('admin', 'manager')));

create index if not exists farmer_debt_ledger_farmer_id_idx on public.farmer_debt_ledger (farmer_id, created_at desc);
