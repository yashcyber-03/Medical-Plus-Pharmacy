-- Phase 4: audit log, stock adjustments, quarantine/disposal and FEFO selection.
-- Run ONCE in the Supabase SQL Editor, after 002_inventory_core.sql.

-- ---------------------------------------------------------------
-- 1. Audit log (append-only, admins can read)
-- ---------------------------------------------------------------
create table public.audit_logs (
  id           uuid primary key default gen_random_uuid(),
  actor_id     uuid references public.profiles(id),
  action       text not null,
  entity_type  text not null,
  entity_id    uuid,
  details      jsonb not null default '{}'::jsonb,
  created_at   timestamptz not null default now()
);

create index audit_logs_entity_idx  on public.audit_logs (entity_type, entity_id);
create index audit_logs_created_idx on public.audit_logs (created_at desc);

create or replace function public.audit_logs_immutable()
returns trigger
language plpgsql
as $$
begin
  raise exception 'audit_logs is append-only: rows cannot be changed or deleted';
end;
$$;

create trigger audit_logs_no_change
  before update or delete on public.audit_logs
  for each row execute function public.audit_logs_immutable();

alter table public.audit_logs enable row level security;

create policy "audit_logs_select_admin" on public.audit_logs
  for select to authenticated using (public.is_admin());

revoke all on public.audit_logs from anon;
revoke insert, update, delete on public.audit_logs from authenticated;

-- ---------------------------------------------------------------
-- 2. adjust_stock: correct a batch's quantity, with a reason
-- Negative = remove units (damage, loss, count correction).
-- Positive = add back units, but never above the quantity originally received.
-- ---------------------------------------------------------------
create or replace function public.adjust_stock(
  p_batch_id  uuid,
  p_change    integer,
  p_reason    text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  b      public.stock_batches%rowtype;
  v_new  integer;
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception 'Only an administrator can adjust stock';
  end if;
  if p_change is null or p_change = 0 then
    raise exception 'The adjustment must not be zero';
  end if;
  if char_length(trim(coalesce(p_reason, ''))) < 3 then
    raise exception 'A reason is required';
  end if;

  -- Lock the batch row so two people cannot change it at the same moment
  select * into b from public.stock_batches where id = p_batch_id for update;
  if not found then
    raise exception 'Batch not found';
  end if;
  if b.status = 'disposed' then
    raise exception 'A disposed batch cannot be adjusted';
  end if;

  v_new := b.quantity_remaining + p_change;
  if v_new < 0 then
    raise exception 'This would make stock negative (current stock: %)', b.quantity_remaining;
  end if;
  if v_new > b.quantity_received then
    raise exception 'Stock cannot exceed the quantity originally received (%)', b.quantity_received;
  end if;

  update public.stock_batches set quantity_remaining = v_new where id = p_batch_id;

  insert into public.inventory_movements
    (medicine_id, batch_id, movement_type, quantity_change, balance_after,
     reason, reference_type, reference_id, created_by)
  values
    (b.medicine_id, b.id, 'adjustment', p_change, v_new,
     trim(p_reason), 'stock_batch', b.id, auth.uid());

  insert into public.audit_logs (actor_id, action, entity_type, entity_id, details)
  values (auth.uid(), 'stock_adjustment', 'stock_batch', b.id,
          jsonb_build_object('change', p_change, 'before', b.quantity_remaining,
                             'after', v_new, 'reason', trim(p_reason)));
end;
$$;

-- ---------------------------------------------------------------
-- 3. set_batch_status: quarantine, release, or dispose a batch
-- Disposal is final: remaining units are removed and logged.
-- ---------------------------------------------------------------
create or replace function public.set_batch_status(
  p_batch_id  uuid,
  p_status    text,
  p_reason    text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  b          public.stock_batches%rowtype;
  v_removed  integer := 0;
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception 'Only an administrator can change a batch status';
  end if;
  if p_status not in ('active', 'quarantined', 'disposed') then
    raise exception 'Invalid status';
  end if;
  if char_length(trim(coalesce(p_reason, ''))) < 3 then
    raise exception 'A reason is required';
  end if;

  select * into b from public.stock_batches where id = p_batch_id for update;
  if not found then
    raise exception 'Batch not found';
  end if;
  if b.status = 'disposed' then
    raise exception 'A disposed batch cannot be changed';
  end if;
  if b.status = p_status then
    raise exception 'The batch is already %', p_status;
  end if;

  if p_status = 'disposed' then
    v_removed := b.quantity_remaining;
    if v_removed > 0 then
      insert into public.inventory_movements
        (medicine_id, batch_id, movement_type, quantity_change, balance_after,
         reason, reference_type, reference_id, created_by)
      values
        (b.medicine_id, b.id, 'disposal', -v_removed, 0,
         trim(p_reason), 'stock_batch', b.id, auth.uid());
    end if;
    update public.stock_batches
      set status = 'disposed', quantity_remaining = 0
      where id = p_batch_id;
  else
    update public.stock_batches set status = p_status where id = p_batch_id;
  end if;

  insert into public.audit_logs (actor_id, action, entity_type, entity_id, details)
  values (auth.uid(), 'batch_status_change', 'stock_batch', b.id,
          jsonb_build_object('from', b.status, 'to', p_status,
                             'units_removed', v_removed, 'reason', trim(p_reason)));
end;
$$;

-- ---------------------------------------------------------------
-- 4. fefo_allocation: which batches should a sale take from?
-- FEFO = First Expiry, First Out. Skips expired, quarantined, disposed
-- and empty batches. Read-only: billing (Phase 5) will use it.
-- If SUM(take_qty) is less than the requested quantity, there is not
-- enough eligible stock.
-- ---------------------------------------------------------------
create or replace function public.fefo_allocation(
  p_medicine_id  uuid,
  p_quantity     integer
)
returns table (
  batch_id       uuid,
  batch_number   text,
  expiry_date    date,
  available_qty  integer,
  take_qty       integer
)
language sql
stable
set search_path = public
as $$
  with eligible as (
    select
      b.id          as bid,
      b.batch_number as bno,
      b.expiry_date  as bexp,
      b.created_at   as bcreated,
      b.quantity_remaining as bqty,
      coalesce(
        sum(b.quantity_remaining) over (
          order by b.expiry_date, b.created_at, b.id
          rows between unbounded preceding and 1 preceding
        ), 0
      ) as taken_before
    from public.stock_batches b
    where b.medicine_id = p_medicine_id
      and b.status = 'active'
      and b.quantity_remaining > 0
      and b.expiry_date >= (timezone('Asia/Kolkata', now()))::date
  )
  select bid, bno, bexp, bqty::integer,
         least(bqty, p_quantity - taken_before)::integer
  from eligible
  where taken_before < p_quantity
  order by bexp, bcreated, bid;
$$;

-- ---------------------------------------------------------------
-- 5. Permissions
-- ---------------------------------------------------------------
revoke all on function public.adjust_stock(uuid, integer, text)       from public;
revoke all on function public.set_batch_status(uuid, text, text)      from public;
revoke all on function public.fefo_allocation(uuid, integer)          from public;
grant execute on function public.adjust_stock(uuid, integer, text)    to authenticated;
grant execute on function public.set_batch_status(uuid, text, text)   to authenticated;
grant execute on function public.fefo_allocation(uuid, integer)       to authenticated;
