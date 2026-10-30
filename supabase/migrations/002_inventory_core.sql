-- Part C: medicine catalogue, stock batches and the inventory ledger.
-- Run ONCE in the Supabase SQL Editor, after 001_profiles_and_roles.sql.
-- Money is stored as integer paise (1 rupee = 100 paise).

create sequence if not exists public.medicine_code_seq;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ---------------------------------------------------------------
-- 1. Categories
-- ---------------------------------------------------------------
create table public.medicine_categories (
  id          uuid primary key default gen_random_uuid(),
  name        text not null unique check (char_length(trim(name)) > 0),
  created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------
-- 2. Medicines (product catalogue; stock lives in stock_batches)
-- ---------------------------------------------------------------
create table public.medicines (
  id                    uuid primary key default gen_random_uuid(),
  code                  text not null unique
                          default ('MED-' || lpad(nextval('public.medicine_code_seq')::text, 4, '0')),
  name                  text not null check (char_length(trim(name)) between 1 and 150),
  brand_name            text,
  generic_name          text,
  category_id           uuid not null references public.medicine_categories(id) on delete restrict,
  manufacturer          text,
  dosage_form           text not null default 'Tablet'
                          check (dosage_form in ('Tablet','Capsule','Syrup','Ointment','Injection','Drops','Lozenge','Other')),
  strength              text,
  unit                  text not null default 'strip'
                          check (unit in ('strip','bottle','tube','vial','box','pack','piece')),
  barcode               text unique,
  description           text,
  purchase_price_paise  integer not null check (purchase_price_paise >= 0),
  selling_price_paise   integer not null check (selling_price_paise >= 0),
  gst_percent           numeric(5,2) not null default 0 check (gst_percent between 0 and 100),
  reorder_level         integer not null default 10 check (reorder_level >= 0),
  requires_prescription boolean not null default false,
  is_active             boolean not null default true,
  created_by            uuid default auth.uid() references public.profiles(id),
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

create trigger medicines_set_updated_at
  before update on public.medicines
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------
-- 3. Stock batches (inventory is tracked per batch)
-- "Expired" is NOT stored: it is worked out from expiry_date,
-- because a batch becomes expired as time passes.
-- ---------------------------------------------------------------
create table public.stock_batches (
  id                    uuid primary key default gen_random_uuid(),
  medicine_id           uuid not null references public.medicines(id) on delete restrict,
  batch_number          text not null check (char_length(trim(batch_number)) > 0),
  manufacturing_date    date,
  expiry_date           date not null,
  quantity_received     integer not null check (quantity_received > 0),
  quantity_remaining    integer not null check (quantity_remaining >= 0),
  purchase_price_paise  integer not null check (purchase_price_paise >= 0),
  selling_price_paise   integer check (selling_price_paise >= 0),
  status                text not null default 'active'
                          check (status in ('active','quarantined','disposed')),
  created_by            uuid default auth.uid() references public.profiles(id),
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  unique (medicine_id, batch_number),
  check (quantity_remaining <= quantity_received),
  check (manufacturing_date is null or manufacturing_date < expiry_date)
);

create trigger stock_batches_set_updated_at
  before update on public.stock_batches
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------
-- 4. Inventory movement ledger (append-only)
-- ---------------------------------------------------------------
create table public.inventory_movements (
  id              uuid primary key default gen_random_uuid(),
  medicine_id     uuid not null references public.medicines(id) on delete restrict,
  batch_id        uuid not null references public.stock_batches(id) on delete restrict,
  movement_type   text not null
                    check (movement_type in ('opening_stock','purchase_receipt','sale','sale_return','adjustment','disposal')),
  quantity_change integer not null check (quantity_change <> 0),
  balance_after   integer not null check (balance_after >= 0),
  reason          text,
  reference_type  text,
  reference_id    uuid,
  created_by      uuid default auth.uid() references public.profiles(id),
  created_at      timestamptz not null default now()
);

create or replace function public.inventory_movements_immutable()
returns trigger
language plpgsql
as $$
begin
  raise exception 'inventory_movements is append-only: rows cannot be changed or deleted';
end;
$$;

create trigger inventory_movements_no_change
  before update or delete on public.inventory_movements
  for each row execute function public.inventory_movements_immutable();

-- Indexes for the common lookups
create index medicines_category_idx   on public.medicines (category_id);
create index medicines_name_idx       on public.medicines (lower(name));
create index batches_medicine_idx     on public.stock_batches (medicine_id);
create index batches_expiry_idx       on public.stock_batches (expiry_date);
create index movements_medicine_idx   on public.inventory_movements (medicine_id, created_at desc);
create index movements_batch_idx      on public.inventory_movements (batch_id);

-- ---------------------------------------------------------------
-- 5. Row Level Security
-- Staff (admin or pharmacist) can read. Only admins change the catalogue.
-- Batches and movements can NOT be written directly from the browser;
-- they change only through trusted functions (see add_stock_batch below).
-- ---------------------------------------------------------------
alter table public.medicine_categories enable row level security;
alter table public.medicines           enable row level security;
alter table public.stock_batches       enable row level security;
alter table public.inventory_movements enable row level security;

create policy "categories_select_staff" on public.medicine_categories
  for select to authenticated using (public.is_staff());
create policy "categories_insert_admin" on public.medicine_categories
  for insert to authenticated with check (public.is_admin());
create policy "categories_update_admin" on public.medicine_categories
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "medicines_select_staff" on public.medicines
  for select to authenticated using (public.is_staff());
create policy "medicines_insert_admin" on public.medicines
  for insert to authenticated with check (public.is_admin());
create policy "medicines_update_admin" on public.medicines
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "batches_select_staff" on public.stock_batches
  for select to authenticated using (public.is_staff());

create policy "movements_select_staff" on public.inventory_movements
  for select to authenticated using (public.is_staff());

-- Defence in depth: remove privileges that no policy should ever allow
revoke all on public.medicine_categories, public.medicines,
              public.stock_batches, public.inventory_movements from anon;
revoke delete on public.medicine_categories, public.medicines from authenticated;
revoke insert, update, delete on public.stock_batches, public.inventory_movements from authenticated;

-- ---------------------------------------------------------------
-- 6. Trusted function: add a stock batch + its ledger entry together
-- ---------------------------------------------------------------
create or replace function public.add_stock_batch(
  p_medicine_id            uuid,
  p_batch_number           text,
  p_manufacturing_date     date,
  p_expiry_date            date,
  p_quantity               integer,
  p_purchase_price_paise   integer,
  p_selling_price_paise    integer default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_batch_id uuid;
  v_today    date := (timezone('Asia/Kolkata', now()))::date;
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception 'Only an administrator can add stock';
  end if;
  if coalesce(trim(p_batch_number), '') = '' then
    raise exception 'Batch number is required';
  end if;
  if p_quantity is null or p_quantity <= 0 then
    raise exception 'Quantity must be greater than zero';
  end if;
  if p_expiry_date is null or p_expiry_date <= v_today then
    raise exception 'Expiry date must be in the future; expired stock cannot be received';
  end if;
  if p_manufacturing_date is not null and p_manufacturing_date >= p_expiry_date then
    raise exception 'Manufacturing date must be before the expiry date';
  end if;
  if p_purchase_price_paise is null or p_purchase_price_paise < 0 then
    raise exception 'Purchase price must be zero or more';
  end if;
  if p_selling_price_paise is not null and p_selling_price_paise < 0 then
    raise exception 'Selling price must be zero or more';
  end if;
  if not exists (select 1 from public.medicines where id = p_medicine_id and is_active) then
    raise exception 'Medicine not found or inactive';
  end if;

  insert into public.stock_batches
    (medicine_id, batch_number, manufacturing_date, expiry_date,
     quantity_received, quantity_remaining, purchase_price_paise, selling_price_paise)
  values
    (p_medicine_id, trim(p_batch_number), p_manufacturing_date, p_expiry_date,
     p_quantity, p_quantity, p_purchase_price_paise, p_selling_price_paise)
  returning id into v_batch_id;

  insert into public.inventory_movements
    (medicine_id, batch_id, movement_type, quantity_change, balance_after,
     reason, reference_type, reference_id, created_by)
  values
    (p_medicine_id, v_batch_id, 'opening_stock', p_quantity, p_quantity,
     'Manual stock entry', 'stock_batch', v_batch_id, auth.uid());

  return v_batch_id;
end;
$$;

revoke all on function public.add_stock_batch(uuid, text, date, date, integer, integer, integer) from public;
grant execute on function public.add_stock_batch(uuid, text, date, date, integer, integer, integer) to authenticated;
