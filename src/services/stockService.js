import { supabase } from "./supabaseClient";

export const MOVEMENT_PAGE_SIZE = 20;

export async function fetchMedicineBatches(medicineId) {
  const { data, error } = await supabase
    .from("stock_batches")
    .select(
      "id, medicine_id, batch_number, manufacturing_date, expiry_date, quantity_received, quantity_remaining, purchase_price_paise, status"
    )
    .eq("medicine_id", medicineId)
    .order("expiry_date");
  if (error) throw error;
  return data.map((r) => ({
    id: r.id,
    medicineId: r.medicine_id,
    batchNo: r.batch_number,
    mfg: r.manufacturing_date,
    expiry: r.expiry_date,
    received: r.quantity_received,
    qty: r.quantity_remaining,
    costPaise: r.purchase_price_paise,
    status: r.status,
  }));
}

export async function fetchMovements({ page, type, medicineId }) {
  const from = (page - 1) * MOVEMENT_PAGE_SIZE;
  const to = from + MOVEMENT_PAGE_SIZE - 1;

  let query = supabase
    .from("inventory_movements")
    .select(
      "id, movement_type, quantity_change, balance_after, reason, created_at, medicines(name), stock_batches(batch_number), profiles(full_name, email)",
      { count: "exact" }
    )
    .order("created_at", { ascending: false })
    .range(from, to);

  if (type) query = query.eq("movement_type", type);
  if (medicineId) query = query.eq("medicine_id", medicineId);

  const { data, error, count } = await query;
  if (error) throw error;

  return {
    total: count ?? 0,
    rows: data.map((r) => ({
      id: r.id,
      type: r.movement_type,
      change: r.quantity_change,
      balanceAfter: r.balance_after,
      reason: r.reason ?? "",
      at: r.created_at,
      medicine: r.medicines?.name ?? "—",
      batchNo: r.stock_batches?.batch_number ?? "—",
      by: r.profiles?.full_name || r.profiles?.email || "—",
    })),
  };
}

export async function adjustStock({ batchId, change, reason }) {
  const { error } = await supabase.rpc("adjust_stock", {
    p_batch_id: batchId,
    p_change: change,
    p_reason: reason,
  });
  if (error) throw error;
}

export async function setBatchStatus({ batchId, status, reason }) {
  const { error } = await supabase.rpc("set_batch_status", {
    p_batch_id: batchId,
    p_status: status,
    p_reason: reason,
  });
  if (error) throw error;
}
