-- Phase 4 follow-up: fixes for the Quotation module found in live testing.
-- Adds per-line tax and quotation-level freight/insurance/tax so the
-- summary section can show subtotal / discount / tax / freight /
-- insurance / grand total, and adds search indexes so customers can be
-- found by shop name, email, or WhatsApp number (not just company name,
-- owner name, and phone).

alter table public.quotation_items
  add column if not exists tax_percent numeric not null default 0,
  add column if not exists tax_amount numeric not null default 0;

alter table public.quotations
  add column if not exists freight numeric not null default 0,
  add column if not exists insurance numeric not null default 0,
  add column if not exists tax_total numeric not null default 0;

create extension if not exists pg_trgm;

create index if not exists customers_shop_name_trgm on public.customers using gin (shop_name gin_trgm_ops);
create index if not exists customers_email_trgm on public.customers using gin (email gin_trgm_ops);
create index if not exists customers_whatsapp_trgm on public.customers using gin (whatsapp gin_trgm_ops);
