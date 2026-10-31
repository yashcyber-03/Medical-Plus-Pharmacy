-- Phase 6: suppliers, purchase orders and goods receipt.
-- Run ONCE in the Supabase SQL Editor, after 004_billing.sql.
-- Stock increases ONLY when goods are received (receive_goods), never when an order is created.
-- Purchasing data is visible to administrators only.

-- ---------------------------------------------------------------
-- 1. Document counters live next to the other settings
-- ---------------------------------------------------------------
alter table public.pharmacy_settings
  add column next_po_number  bigint not null default 1 check (next_po_number >= 1),
  add column next_grn_number bigint not null default 1 check (next_grn_number >= 1);

-- ---------------------------------------------------------------
-- 2. Suppliers
-- ---------------------------------------------------------------
create table public.suppliers (
  id              uuid primary key default gen_random_uuid(),
  name            text not null check (char_length(trim(name)) between 1 and 150),
  contact_person  text check (contact_person is null or char_length(contact_person) <= 120),
  phone           text check (phone is null or phone ~ '^[0-9+ -]{7,15}$'),
  email           text check (email is null or email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  address         text check (address is null or char_length(address) <= 300),
  gstin           text check (gstin is null or gstin ~ '^[0-9A-Z]{15}$'),
  notes           text check (notes is null or char_length(notes) <= 500),
  is_active       boolean not null default true,
  created_by      uuid default auth.uid() references public.profiles(id),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create unique index suppliers_name_unique on public.suppliers (lower(name));

create trigger suppliers_set_updated_at
  before update on public.suppliers
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------
-- 3. Purchase orders and their items
-- Order totals exclude GST.
-- ---------------------------------------------------------------
create table public.purchase_orders (
  id             uuid primary key default gen_random_uuid(),
  po_number      text not null unique,
  supplier_id    uuid not null references public.suppliers(id) on delete restrict,
  status         text not null default 'draft'
                   check (status in ('draft','ordered','partially_received','received','cancelled')),
  order_date     date,
  expected_date  date,
  notes          text check (notes is null or char_length(notes) <= 500),
  total_paise    integer not null default 0 check (total_paise >= 0),
  created_by     uuid default auth.uid() references public.profiles(id),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create trigger purchase_orders_set_updated_at
  before update on public.purchase_orders
  for each row execute function public.set_updated_at();

create table public.purchase_order_items (
  id                 uuid primary key default gen_random_uuid(),
  purchase_order_id  uuid not null references public.purchase_orders(id) on delete restrict,
  medicine_id        uuid not null references public.medicines(id) on delete restrict,
  quantity_ordered   integer not null check (quantity_ordered > 0),
  quantity_received  integer not null default 0 check (quantity_received >= 0),
  unit_cost_paise    integer not null check (unit_cost_paise >= 0),
  unique (purchase_order_id, medicine_id),
  check (quantity_received <= quantity_ordered)
);

-- ---------------------------------------------------------------
-- 4. Goods receipts (what actually arrived)
-- ---------------------------------------------------------------
create table public.goods_receipts (
  id                    uuid primary key default gen_random_uuid(),
  receipt_number        text not null unique,
  purchase_order_id     uuid not null references public.purchase_orders(id) on delete restrict,
  supplier_id           uuid not null references public.suppliers(id) on delete restrict,
  supplier_invoice_ref  text check (supplier_invoice_ref is null or char_length(supplier_invoice_ref) <= 60),
  notes                 text check (notes is null or char_length(notes) <= 500),
  total_paise           integer not null default 0 check (total_paise >= 0),
  received_by           uuid not null default auth.uid() references public.profiles(id),
  received_at           timestamptz not null default now(),
  idempotency_key       uuid not null,
  unique (received_by, idempotency_key)
);

create table public.goods_receipt_items (
  id                 uuid primary key default gen_random_uuid(),
  goods_receipt_id   uuid not null references public.goods_receipts(id) on delete restrict,
  po_item_id         uuid not null references public.purchase_order_items(id) on delete restrict,
  medicine_id        uuid not null references public.medicines(id) on delete restrict,
  batch_id           uuid not null references public.stock_batches(id) on delete restrict,
  batch_number       text not null,
  quantity           integer not null check (quantity > 0),
  unit_cost_paise    integer not null check (unit_cost_paise >= 0)
);

-- Link stock batches back to where they came from
alter table public.stock_batches
  add column supplier_id       uuid references public.suppliers(id),
  add column goods_receipt_id  uuid references public.goods_receipts(id);

create index po_supplier_idx        on public.purchase_orders (supplier_id);
create index po_status_idx          on public.purchase_orders (status);
create index po_created_idx         on public.purchase_orders (created_at desc);
create index poi_po_idx             on public.purchase_order_items (purchase_order_id);
create index grn_po_idx             on public.goods_receipts (purchase_order_id);
create index grn_received_idx       on public.goods_receipts (received_at desc);
create index gri_receipt_idx        on public.goods_receipt_items (goods_receipt_id);

-- ---------------------------------------------------------------
-- 5. Row Level Security: administrators only
-- Suppliers can be edited directly. Orders and receipts change only
-- through the functions below.
-- ---------------------------------------------------------------
alter table public.suppliers            enable row level security;
alter table public.purchase_orders      enable row level security;
alter table public.purchase_order_items enable row level security;
alter table public.goods_receipts       enable row level security;
alter table public.goods_receipt_items  enable row level security;

create policy "suppliers_select_admin" on public.suppliers
  for select to authenticated using (public.is_admin());
create policy "suppliers_insert_admin" on public.suppliers
  for insert to authenticated with check (public.is_admin());
create policy "suppliers_update_admin" on public.suppliers
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "po_select_admin"  on public.purchase_orders      for select to authenticated using (public.is_admin());
create policy "poi_select_admin" on public.purchase_order_items for select to authenticated using (public.is_admin());
create policy "grn_select_admin" on public.goods_receipts       for select to authenticated using (public.is_admin());
create policy "gri_select_admin" on public.goods_receipt_items  for select to authenticated using (public.is_admin());

revoke all on public.suppliers, public.purchase_orders, public.purchase_order_items,
              public.goods_receipts, public.goods_receipt_items from anon;
revoke delete on public.suppliers from authenticated;
revoke insert, update, delete on public.purchase_orders, public.purchase_order_items,
              public.goods_receipts, public.goods_receipt_items from authenticated;

-- ---------------------------------------------------------------
-- 6. Internal helper: replace the items of a DRAFT order
-- Not callable from the browser.
-- ---------------------------------------------------------------
create or replace function public.po_set_items(p_po_id uuid, p_items jsonb)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  item     jsonb;
  v_med    uuid;
  v_qty    integer;
  v_cost   integer;
  v_seen   uuid[] := '{}';
  v_total  bigint := 0;
begin
  if not exists (select 1 from public.purchase_orders where id = p_po_id and status = 'draft') then
    raise exception 'Only a draft order can have its items changed';
  end if;
  if jsonb_typeof(p_items) is distinct from 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'Add at least one medicine to the order';
  end if;
  if jsonb_array_length(p_items) > 100 then
    raise exception 'Too many items in one order';
  end if;

  delete from public.purchase_order_items where purchase_order_id = p_po_id;

  for item in select e from jsonb_array_elements(p_items) as e loop
    begin
      v_med  := (item->>'medicine_id')::uuid;
      v_qty  := (item->>'quantity')::integer;
      v_cost := (item->>'unit_cost_paise')::integer;
    exception when others then
      raise exception 'Invalid item data in the order';
    end;

    if v_med is null or v_qty is null or v_qty < 1 or v_qty > 100000 then
      raise exception 'Quantity must be a whole number from 1 to 100000';
    end if;
    if v_cost is null or v_cost < 0 then
      raise exception 'Unit cost must be zero or more';
    end if;
    if v_med = any(v_seen) then
      raise exception 'The same medicine appears twice in the order';
    end if;
    v_seen := v_seen || v_med;

    if not exists (select 1 from public.medicines where id = v_med and is_active) then
      raise exception 'A medicine in the order was not found or is inactive';
    end if;

    insert into public.purchase_order_items (purchase_order_id, medicine_id, quantity_ordered, unit_cost_paise)
    values (p_po_id, v_med, v_qty, v_cost);

    v_total := v_total + v_qty::bigint * v_cost;
  end loop;

  if v_total > 2000000000 then
    raise exception 'The order total is too large';
  end if;
  return v_total;
end;
$$;

-- ---------------------------------------------------------------
-- 7. create_purchase_order
-- ---------------------------------------------------------------
create or replace function public.create_purchase_order(
  p_supplier_id    uuid,
  p_items          jsonb,
  p_expected_date  date    default null,
  p_notes          text    default null,
  p_mark_ordered   boolean default false
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid     uuid := auth.uid();
  st        public.pharmacy_settings%rowtype;
  v_po_id   uuid;
  v_number  text;
  v_total   bigint;
  v_today   date := (timezone('Asia/Kolkata', now()))::date;
begin
  if v_uid is null or not public.is_admin() then
    raise exception 'Only an administrator can create purchase orders';
  end if;
  if not exists (select 1 from public.suppliers where id = p_supplier_id and is_active) then
    raise exception 'Supplier not found or inactive';
  end if;
  if p_expected_date is not null and p_expected_date < v_today then
    raise exception 'The expected date cannot be in the past';
  end if;

  select * into st from public.pharmacy_settings where id = true for update;
  v_number := 'PO-' || lpad(st.next_po_number::text, 6, '0');
  update public.pharmacy_settings set next_po_number = next_po_number + 1 where id = true;

  insert into public.purchase_orders (po_number, supplier_id, status, expected_date, notes)
  values (v_number, p_supplier_id, 'draft', p_expected_date, nullif(trim(coalesce(p_notes, '')), ''))
  returning id into v_po_id;

  v_total := public.po_set_items(v_po_id, p_items);

  update public.purchase_orders
    set total_paise = v_total::integer,
        status      = case when coalesce(p_mark_ordered, false) then 'ordered' else 'draft' end,
        order_date  = case when coalesce(p_mark_ordered, false) then v_today else null end
    where id = v_po_id;

  insert into public.audit_logs (actor_id, action, entity_type, entity_id, details)
  values (v_uid, 'purchase_order_created', 'purchase_order', v_po_id,
          jsonb_build_object('po_number', v_number, 'total_paise', v_total,
                             'status', case when coalesce(p_mark_ordered, false) then 'ordered' else 'draft' end));
  return v_po_id;
end;
$$;

-- ---------------------------------------------------------------
-- 8. update_draft_purchase_order
-- ---------------------------------------------------------------
create or replace function public.update_draft_purchase_order(
  p_po_id          uuid,
  p_supplier_id    uuid,
  p_items          jsonb,
  p_expected_date  date    default null,
  p_notes          text    default null,
  p_mark_ordered   boolean default false
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid    uuid := auth.uid();
  po       public.purchase_orders%rowtype;
  v_total  bigint;
  v_today  date := (timezone('Asia/Kolkata', now()))::date;
begin
  if v_uid is null or not public.is_admin() then
    raise exception 'Only an administrator can edit purchase orders';
  end if;

  select * into po from public.purchase_orders where id = p_po_id for update;
  if not found then
    raise exception 'Purchase order not found';
  end if;
  if po.status <> 'draft' then
    raise exception 'Only a draft order can be edited (this one is %)', po.status;
  end if;
  if not exists (select 1 from public.suppliers where id = p_supplier_id and is_active) then
    raise exception 'Supplier not found or inactive';
  end if;
  if p_expected_date is not null and p_expected_date < v_today then
    raise exception 'The expected date cannot be in the past';
  end if;

  v_total := public.po_set_items(p_po_id, p_items);

  update public.purchase_orders
    set supplier_id   = p_supplier_id,
        expected_date = p_expected_date,
        notes         = nullif(trim(coalesce(p_notes, '')), ''),
        total_paise   = v_total::integer,
        status        = case when coalesce(p_mark_ordered, false) then 'ordered' else 'draft' end,
        order_date    = case when coalesce(p_mark_ordered, false) then v_today else null end
    where id = p_po_id;

  insert into public.audit_logs (actor_id, action, entity_type, entity_id, details)
  values (v_uid, 'purchase_order_updated', 'purchase_order', p_po_id,
          jsonb_build_object('po_number', po.po_number, 'total_paise', v_total));
end;
$$;

-- ---------------------------------------------------------------
-- 9. set_purchase_order_status: draft -> ordered, draft/ordered -> cancelled
-- An order with any goods received can never be cancelled.
-- ---------------------------------------------------------------
create or replace function public.set_purchase_order_status(p_po_id uuid, p_status text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid    uuid := auth.uid();
  po       public.purchase_orders%rowtype;
  v_today  date := (timezone('Asia/Kolkata', now()))::date;
begin
  if v_uid is null or not public.is_admin() then
    raise exception 'Only an administrator can change a purchase order';
  end if;
  if p_status not in ('ordered', 'cancelled') then
    raise exception 'Invalid status change';
  end if;

  select * into po from public.purchase_orders where id = p_po_id for update;
  if not found then
    raise exception 'Purchase order not found';
  end if;

  if p_status = 'ordered' then
    if po.status <> 'draft' then
      raise exception 'Only a draft order can be marked as ordered (this one is %)', po.status;
    end if;
    update public.purchase_orders set status = 'ordered', order_date = v_today where id = p_po_id;
  else
    if po.status not in ('draft', 'ordered') then
      raise exception 'A % order cannot be cancelled', po.status;
    end if;
    update public.purchase_orders set status = 'cancelled' where id = p_po_id;
  end if;

  insert into public.audit_logs (actor_id, action, entity_type, entity_id, details)
  values (v_uid, 'purchase_order_status', 'purchase_order', p_po_id,
          jsonb_build_object('po_number', po.po_number, 'from', po.status, 'to', p_status));
end;
$$;

-- ---------------------------------------------------------------
-- 10. receive_goods: the ONLY place purchased stock enters inventory
-- One transaction: receipt, batches, ledger entries and order status
-- succeed together or not at all. A repeated submission (same key)
-- returns the same receipt instead of adding stock twice.
-- ---------------------------------------------------------------
create or replace function public.receive_goods(
  p_idempotency_key  uuid,
  p_po_id            uuid,
  p_items            jsonb,
  p_supplier_invoice text default null,
  p_notes            text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid         uuid := auth.uid();
  st            public.pharmacy_settings%rowtype;
  v_existing    uuid;
  po            public.purchase_orders%rowtype;
  poi           public.purchase_order_items%rowtype;
  v_grn_id      uuid;
  v_number      text;
  v_today       date := (timezone('Asia/Kolkata', now()))::date;
  item          jsonb;
  v_po_item_id  uuid;
  v_qty         integer;
  v_batch_no    text;
  v_mfg         date;
  v_exp         date;
  v_cost        integer;
  v_open        integer;
  v_med_name    text;
  v_batch_id    uuid;
  v_total       bigint := 0;
  v_all_done    boolean;
begin
  if v_uid is null or not public.is_admin() then
    raise exception 'Only an administrator can receive goods';
  end if;
  if p_idempotency_key is null then
    raise exception 'Missing idempotency key';
  end if;
  if jsonb_typeof(p_items) is distinct from 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'Enter the quantity received for at least one item';
  end if;
  if jsonb_array_length(p_items) > 200 then
    raise exception 'Too many lines in one receipt';
  end if;
  if p_supplier_invoice is not null and char_length(p_supplier_invoice) > 60 then
    raise exception 'The supplier invoice reference is too long';
  end if;

  -- One receipt at a time (also gives gap-free receipt numbers)
  select * into st from public.pharmacy_settings where id = true for update;

  select id into v_existing from public.goods_receipts
    where received_by = v_uid and idempotency_key = p_idempotency_key;
  if v_existing is not null then
    return v_existing;
  end if;

  select * into po from public.purchase_orders where id = p_po_id for update;
  if not found then
    raise exception 'Purchase order not found';
  end if;
  if po.status not in ('ordered', 'partially_received') then
    raise exception 'This purchase order is % and cannot receive goods', po.status;
  end if;

  v_number := 'GRN-' || lpad(st.next_grn_number::text, 6, '0');
  update public.pharmacy_settings set next_grn_number = next_grn_number + 1 where id = true;

  insert into public.goods_receipts
    (receipt_number, purchase_order_id, supplier_id, supplier_invoice_ref, notes, idempotency_key)
  values
    (v_number, po.id, po.supplier_id, nullif(trim(coalesce(p_supplier_invoice, '')), ''),
     nullif(trim(coalesce(p_notes, '')), ''), p_idempotency_key)
  returning id into v_grn_id;

  for item in select e from jsonb_array_elements(p_items) as e loop
    begin
      v_po_item_id := (item->>'po_item_id')::uuid;
      v_qty        := (item->>'quantity')::integer;
      v_batch_no   := trim(coalesce(item->>'batch_number', ''));
      v_mfg        := nullif(item->>'manufacturing_date', '')::date;
      v_exp        := (item->>'expiry_date')::date;
      v_cost       := nullif(item->>'unit_cost_paise', '')::integer;
    exception when others then
      raise exception 'Invalid data in the receipt lines';
    end;

    if v_qty is null or v_qty < 1 or v_qty > 100000 then
      raise exception 'Quantity must be a whole number from 1 to 100000';
    end if;
    if v_batch_no = '' or char_length(v_batch_no) > 40 then
      raise exception 'A batch number (up to 40 characters) is required for every line';
    end if;
    if v_exp is null or v_exp <= v_today then
      raise exception 'Batch %: the expiry date must be in the future. Expired stock cannot be received', v_batch_no;
    end if;
    if v_mfg is not null and v_mfg >= v_exp then
      raise exception 'Batch %: the manufacturing date must be before the expiry date', v_batch_no;
    end if;

    select * into poi from public.purchase_order_items
      where id = v_po_item_id and purchase_order_id = po.id for update;
    if not found then
      raise exception 'A receipt line does not belong to this purchase order';
    end if;

    select name into v_med_name from public.medicines where id = poi.medicine_id;
    v_open := poi.quantity_ordered - poi.quantity_received;
    if v_qty > v_open then
      raise exception 'Cannot receive % of %: only % still outstanding', v_qty, v_med_name, v_open;
    end if;

    if v_cost is null then
      v_cost := poi.unit_cost_paise;
    end if;
    if v_cost < 0 then
      raise exception 'Unit cost must be zero or more';
    end if;

    if exists (select 1 from public.stock_batches
               where medicine_id = poi.medicine_id and batch_number = v_batch_no) then
      raise exception 'Batch % already exists for %', v_batch_no, v_med_name;
    end if;

    insert into public.stock_batches
      (medicine_id, batch_number, manufacturing_date, expiry_date,
       quantity_received, quantity_remaining, purchase_price_paise,
       supplier_id, goods_receipt_id)
    values
      (poi.medicine_id, v_batch_no, v_mfg, v_exp, v_qty, v_qty, v_cost, po.supplier_id, v_grn_id)
    returning id into v_batch_id;

    insert into public.inventory_movements
      (medicine_id, batch_id, movement_type, quantity_change, balance_after,
       reason, reference_type, reference_id, created_by)
    values
      (poi.medicine_id, v_batch_id, 'purchase_receipt', v_qty, v_qty,
       'Goods receipt ' || v_number, 'goods_receipt', v_grn_id, v_uid);

    update public.purchase_order_items
      set quantity_received = quantity_received + v_qty
      where id = poi.id;

    insert into public.goods_receipt_items
      (goods_receipt_id, po_item_id, medicine_id, batch_id, batch_number, quantity, unit_cost_paise)
    values
      (v_grn_id, poi.id, poi.medicine_id, v_batch_id, v_batch_no, v_qty, v_cost);

    v_total := v_total + v_qty::bigint * v_cost;
  end loop;

  if v_total > 2000000000 then
    raise exception 'The receipt total is too large';
  end if;
  update public.goods_receipts set total_paise = v_total::integer where id = v_grn_id;

  select bool_and(quantity_received >= quantity_ordered) into v_all_done
    from public.purchase_order_items where purchase_order_id = po.id;
  update public.purchase_orders
    set status = case when v_all_done then 'received' else 'partially_received' end
    where id = po.id;

  insert into public.audit_logs (actor_id, action, entity_type, entity_id, details)
  values (v_uid, 'goods_received', 'goods_receipt', v_grn_id,
          jsonb_build_object('receipt', v_number, 'po_number', po.po_number, 'total_paise', v_total));

  return v_grn_id;
end;
$$;

-- ---------------------------------------------------------------
-- 11. Permissions
-- Supabase gives new functions to anon and authenticated by default,
-- so anon is removed explicitly. The helper is not callable from the
-- browser at all.
-- ---------------------------------------------------------------
revoke all on function public.po_set_items(uuid, jsonb) from public, anon, authenticated;

revoke all on function public.create_purchase_order(uuid, jsonb, date, text, boolean)               from public, anon;
revoke all on function public.update_draft_purchase_order(uuid, uuid, jsonb, date, text, boolean)    from public, anon;
revoke all on function public.set_purchase_order_status(uuid, text)                                  from public, anon;
revoke all on function public.receive_goods(uuid, uuid, jsonb, text, text)                           from public, anon;
grant execute on function public.create_purchase_order(uuid, jsonb, date, text, boolean)             to authenticated;
grant execute on function public.update_draft_purchase_order(uuid, uuid, jsonb, date, text, boolean) to authenticated;
grant execute on function public.set_purchase_order_status(uuid, text)                               to authenticated;
grant execute on function public.receive_goods(uuid, uuid, jsonb, text, text)                        to authenticated;

-- Same hardening for the functions from earlier phases
revoke execute on function public.add_stock_batch(uuid, text, date, date, integer, integer, integer) from anon;
revoke execute on function public.adjust_stock(uuid, integer, text)                                  from anon;
revoke execute on function public.set_batch_status(uuid, text, text)                                 from anon;
revoke execute on function public.create_sale(uuid, jsonb, uuid, text, text, boolean, text)          from anon;
