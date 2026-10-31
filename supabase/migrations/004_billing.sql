-- Phase 5: customers, sales, invoices, payments and the create_sale function.
-- Run ONCE in the Supabase SQL Editor, after 003_stock_controls.sql.
-- Money is stored as integer paise. Prices are EXCLUDING GST; GST is added on top.

-- ---------------------------------------------------------------
-- 1. Pharmacy settings (one row only)
-- ---------------------------------------------------------------
create table public.pharmacy_settings (
  id                          boolean primary key default true check (id),
  pharmacy_name               text not null default 'Medical Plus Pharmacy',
  address                     text,
  phone                       text,
  gstin                       text,
  invoice_prefix              text not null default 'INV' check (invoice_prefix ~ '^[A-Z0-9]{2,6}$'),
  next_invoice_number         bigint not null default 1 check (next_invoice_number >= 1),
  max_staff_discount_percent  numeric(5,2) not null default 10
                                check (max_staff_discount_percent between 0 and 100),
  updated_at                  timestamptz not null default now()
);

insert into public.pharmacy_settings (id) values (true) on conflict do nothing;

-- ---------------------------------------------------------------
-- 2. Customers (only what a pharmacy counter needs)
-- ---------------------------------------------------------------
create table public.customers (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (char_length(trim(name)) between 1 and 120),
  phone       text unique check (phone is null or phone ~ '^[0-9+ -]{7,15}$'),
  email       text check (email is null or email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  created_by  uuid default auth.uid() references public.profiles(id),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create trigger customers_set_updated_at
  before update on public.customers
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------
-- 3. Sales, items, batch allocations, payments
-- ---------------------------------------------------------------
create table public.sales (
  id                    uuid primary key default gen_random_uuid(),
  invoice_number        text not null unique,
  idempotency_key       uuid not null,
  cashier_id            uuid not null default auth.uid() references public.profiles(id),
  customer_id           uuid references public.customers(id),
  customer_name         text,
  customer_phone        text,
  prescription_checked  boolean not null default false,
  subtotal_paise        integer not null default 0 check (subtotal_paise >= 0),
  discount_paise        integer not null default 0 check (discount_paise >= 0),
  tax_paise             integer not null default 0 check (tax_paise >= 0),
  total_paise           integer not null default 0 check (total_paise >= 0),
  status                text not null default 'completed' check (status in ('completed', 'voided')),
  notes                 text,
  created_at            timestamptz not null default now(),
  unique (cashier_id, idempotency_key)
);

create table public.sale_items (
  id               uuid primary key default gen_random_uuid(),
  sale_id          uuid not null references public.sales(id) on delete restrict,
  position         integer not null default 0,
  medicine_id      uuid not null references public.medicines(id) on delete restrict,
  medicine_name    text not null,
  quantity         integer not null check (quantity > 0),
  subtotal_paise   integer not null default 0 check (subtotal_paise >= 0),
  discount_percent numeric(5,2) not null default 0 check (discount_percent between 0 and 100),
  discount_paise   integer not null default 0 check (discount_paise >= 0),
  gst_percent      numeric(5,2) not null default 0 check (gst_percent between 0 and 100),
  taxable_paise    integer not null default 0 check (taxable_paise >= 0),
  tax_paise        integer not null default 0 check (tax_paise >= 0),
  total_paise      integer not null default 0 check (total_paise >= 0)
);

-- Which batch(es) supplied each item (FEFO may split one item over several batches)
create table public.sale_item_batch_allocations (
  id                uuid primary key default gen_random_uuid(),
  sale_item_id      uuid not null references public.sale_items(id) on delete restrict,
  batch_id          uuid not null references public.stock_batches(id) on delete restrict,
  quantity          integer not null check (quantity > 0),
  unit_price_paise  integer not null check (unit_price_paise >= 0),
  amount_paise      integer not null check (amount_paise >= 0)
);

-- A payment record is a LABEL of how the customer said they paid.
-- Nothing here verifies a UPI or card payment.
create table public.payment_records (
  id            uuid primary key default gen_random_uuid(),
  sale_id       uuid not null references public.sales(id) on delete restrict,
  method        text not null check (method in ('cash', 'upi', 'card', 'other')),
  amount_paise  integer not null check (amount_paise >= 0),
  reference     text check (reference is null or char_length(reference) <= 60),
  status        text not null default 'recorded' check (status in ('recorded')),
  recorded_by   uuid default auth.uid() references public.profiles(id),
  created_at    timestamptz not null default now()
);

create index sales_created_idx        on public.sales (created_at desc);
create index sales_cashier_idx        on public.sales (cashier_id);
create index sales_customer_idx       on public.sales (customer_id);
create index sale_items_sale_idx      on public.sale_items (sale_id);
create index allocations_item_idx     on public.sale_item_batch_allocations (sale_item_id);
create index allocations_batch_idx    on public.sale_item_batch_allocations (batch_id);
create index payments_sale_idx        on public.payment_records (sale_id);

-- ---------------------------------------------------------------
-- 4. Row Level Security
-- Staff see only their own sales. Admins see all. Nobody writes
-- sales data directly; create_sale below is the only way in.
-- ---------------------------------------------------------------
alter table public.pharmacy_settings            enable row level security;
alter table public.customers                    enable row level security;
alter table public.sales                        enable row level security;
alter table public.sale_items                   enable row level security;
alter table public.sale_item_batch_allocations  enable row level security;
alter table public.payment_records              enable row level security;

create policy "settings_select_staff" on public.pharmacy_settings
  for select to authenticated using (public.is_staff());

create policy "customers_select_staff" on public.customers
  for select to authenticated using (public.is_staff());
create policy "customers_insert_staff" on public.customers
  for insert to authenticated with check (public.is_staff());
create policy "customers_update_staff" on public.customers
  for update to authenticated using (public.is_staff()) with check (public.is_staff());

create policy "sales_select_own_or_admin" on public.sales
  for select to authenticated
  using (public.is_staff() and (public.is_admin() or cashier_id = auth.uid()));

-- The sub-selects below are themselves filtered by the sales policy above.
create policy "sale_items_select" on public.sale_items
  for select to authenticated
  using (exists (select 1 from public.sales s where s.id = sale_items.sale_id));

create policy "allocations_select" on public.sale_item_batch_allocations
  for select to authenticated
  using (exists (select 1 from public.sale_items si where si.id = sale_item_batch_allocations.sale_item_id));

create policy "payments_select" on public.payment_records
  for select to authenticated
  using (exists (select 1 from public.sales s where s.id = payment_records.sale_id));

revoke all on public.pharmacy_settings, public.customers, public.sales, public.sale_items,
              public.sale_item_batch_allocations, public.payment_records from anon;
revoke insert, update, delete on public.pharmacy_settings from authenticated;
revoke delete on public.customers from authenticated;
revoke insert, update, delete on public.sales, public.sale_items,
              public.sale_item_batch_allocations, public.payment_records from authenticated;

-- ---------------------------------------------------------------
-- 5. create_sale: the whole sale in ONE transaction
-- If anything fails, nothing is saved: no invoice, no stock change.
-- The browser sends only medicine ids, quantities and discount %.
-- Prices, tax, totals and batches are decided here.
-- ---------------------------------------------------------------
create or replace function public.create_sale(
  p_idempotency_key       uuid,
  p_items                 jsonb,
  p_customer_id           uuid    default null,
  p_payment_method        text    default 'cash',
  p_payment_reference     text    default null,
  p_prescription_checked  boolean default false,
  p_notes                 text    default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid         uuid := auth.uid();
  v_is_admin    boolean;
  st            public.pharmacy_settings%rowtype;
  v_existing    uuid;
  v_sale_id     uuid;
  v_invoice     text;
  v_cust_name   text;
  v_cust_phone  text;
  item          jsonb;
  v_seen        uuid[] := '{}';
  v_pos         integer := 0;
  v_med         public.medicines%rowtype;
  v_med_id      uuid;
  v_qty         integer;
  v_disc        numeric;
  v_need        integer;
  v_item_id     uuid;
  b             record;
  v_take        integer;
  v_unit        integer;
  v_new_bal     integer;
  v_sub         integer;
  v_disc_paise  integer;
  v_taxable     integer;
  v_tax         integer;
  v_line        integer;
  t_sub         bigint := 0;
  t_disc        bigint := 0;
  t_tax         bigint := 0;
  t_total       bigint := 0;
begin
  if v_uid is null or not public.is_staff() then
    raise exception 'Not authorised';
  end if;
  v_is_admin := public.is_admin();

  if p_idempotency_key is null then
    raise exception 'Missing idempotency key';
  end if;
  if p_payment_method is null or p_payment_method not in ('cash', 'upi', 'card', 'other') then
    raise exception 'Invalid payment method';
  end if;
  if jsonb_typeof(p_items) is distinct from 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'The cart is empty';
  end if;
  if jsonb_array_length(p_items) > 100 then
    raise exception 'Too many items in one bill';
  end if;
  if p_payment_reference is not null and char_length(p_payment_reference) > 60 then
    raise exception 'Payment reference is too long';
  end if;

  -- Lock the settings row. This makes sales happen one at a time, which
  -- gives gap-free invoice numbers and removes races on the same stock.
  select * into st from public.pharmacy_settings where id = true for update;

  -- Idempotency: the same key from the same user returns the same sale.
  select id into v_existing from public.sales
    where cashier_id = v_uid and idempotency_key = p_idempotency_key;
  if v_existing is not null then
    return v_existing;
  end if;

  if p_customer_id is not null then
    select name, phone into v_cust_name, v_cust_phone
      from public.customers where id = p_customer_id;
    if not found then
      raise exception 'Customer not found';
    end if;
  end if;

  v_invoice := st.invoice_prefix || '-' || lpad(st.next_invoice_number::text, 7, '0');
  update public.pharmacy_settings set next_invoice_number = next_invoice_number + 1 where id = true;

  insert into public.sales
    (invoice_number, idempotency_key, cashier_id, customer_id, customer_name,
     customer_phone, prescription_checked, notes)
  values
    (v_invoice, p_idempotency_key, v_uid, p_customer_id, v_cust_name,
     v_cust_phone, coalesce(p_prescription_checked, false),
     nullif(trim(coalesce(p_notes, '')), ''))
  returning id into v_sale_id;

  for item in select e from jsonb_array_elements(p_items) as e loop
    begin
      v_med_id := (item->>'medicine_id')::uuid;
      v_qty    := (item->>'quantity')::integer;
      v_disc   := coalesce((item->>'discount_percent')::numeric, 0);
    exception when others then
      raise exception 'Invalid item data in the cart';
    end;

    if v_med_id is null or v_qty is null or v_qty < 1 or v_qty > 10000 then
      raise exception 'Quantity must be a whole number from 1 to 10000';
    end if;
    if v_med_id = any(v_seen) then
      raise exception 'The same medicine appears twice in the cart';
    end if;
    v_seen := v_seen || v_med_id;

    if v_disc < 0 or v_disc > 100 then
      raise exception 'Discount must be between 0 and 100 percent';
    end if;
    if not v_is_admin and v_disc > st.max_staff_discount_percent then
      raise exception 'Discount is above your limit of % percent', st.max_staff_discount_percent;
    end if;

    select * into v_med from public.medicines where id = v_med_id and is_active;
    if not found then
      raise exception 'A medicine in the cart was not found or is inactive';
    end if;
    if v_med.requires_prescription and not coalesce(p_prescription_checked, false) then
      raise exception '% needs a prescription. Confirm that it was checked.', v_med.name;
    end if;

    v_pos := v_pos + 1;
    insert into public.sale_items
      (sale_id, position, medicine_id, medicine_name, quantity, discount_percent, gst_percent)
    values
      (v_sale_id, v_pos, v_med.id, v_med.name, v_qty, v_disc, v_med.gst_percent)
    returning id into v_item_id;

    -- FEFO: take from the earliest-expiring eligible batch first
    v_need := v_qty;
    v_sub  := 0;
    for b in
      select id, quantity_remaining, selling_price_paise
      from public.stock_batches
      where medicine_id = v_med.id
        and status = 'active'
        and quantity_remaining > 0
        and expiry_date >= (timezone('Asia/Kolkata', now()))::date
      order by expiry_date, created_at, id
      for update
    loop
      exit when v_need <= 0;
      v_take := least(b.quantity_remaining, v_need);
      v_unit := coalesce(b.selling_price_paise, v_med.selling_price_paise);

      insert into public.sale_item_batch_allocations
        (sale_item_id, batch_id, quantity, unit_price_paise, amount_paise)
      values
        (v_item_id, b.id, v_take, v_unit, v_take * v_unit);

      v_new_bal := b.quantity_remaining - v_take;
      update public.stock_batches set quantity_remaining = v_new_bal where id = b.id;

      insert into public.inventory_movements
        (medicine_id, batch_id, movement_type, quantity_change, balance_after,
         reason, reference_type, reference_id, created_by)
      values
        (v_med.id, b.id, 'sale', -v_take, v_new_bal,
         'Sale ' || v_invoice, 'sale', v_sale_id, v_uid);

      v_sub  := v_sub + v_take * v_unit;
      v_need := v_need - v_take;
    end loop;

    if v_need > 0 then
      raise exception 'Not enough eligible stock for %: requested %, available %',
        v_med.name, v_qty, v_qty - v_need;
    end if;

    v_disc_paise := round(v_sub * v_disc / 100)::integer;
    v_taxable    := v_sub - v_disc_paise;
    v_tax        := round(v_taxable * v_med.gst_percent / 100)::integer;
    v_line       := v_taxable + v_tax;

    update public.sale_items
      set subtotal_paise = v_sub, discount_paise = v_disc_paise,
          taxable_paise = v_taxable, tax_paise = v_tax, total_paise = v_line
      where id = v_item_id;

    t_sub   := t_sub   + v_sub;
    t_disc  := t_disc  + v_disc_paise;
    t_tax   := t_tax   + v_tax;
    t_total := t_total + v_line;
  end loop;

  if t_total > 2000000000 then
    raise exception 'The bill total is too large';
  end if;

  update public.sales
    set subtotal_paise = t_sub, discount_paise = t_disc,
        tax_paise = t_tax, total_paise = t_total
    where id = v_sale_id;

  insert into public.payment_records (sale_id, method, amount_paise, reference)
  values (v_sale_id, p_payment_method, t_total,
          nullif(trim(coalesce(p_payment_reference, '')), ''));

  insert into public.audit_logs (actor_id, action, entity_type, entity_id, details)
  values (v_uid, 'sale_created', 'sale', v_sale_id,
          jsonb_build_object('invoice', v_invoice, 'total_paise', t_total,
                             'lines', jsonb_array_length(p_items)));

  return v_sale_id;
end;
$$;

revoke all on function public.create_sale(uuid, jsonb, uuid, text, text, boolean, text) from public;
grant execute on function public.create_sale(uuid, jsonb, uuid, text, text, boolean, text) to authenticated;
