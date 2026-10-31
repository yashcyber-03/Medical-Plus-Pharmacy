import { supabase } from "./supabaseClient";

export const RETURN_PAGE_SIZE = 12;

// Find an invoice by number and work out how many units of each batch line can still be returned.
export async function fetchSaleForReturn(invoiceNumber) {
  const number = String(invoiceNumber ?? "").trim().toUpperCase();
  if (!number) return null;

  const { data: sale, error } = await supabase
    .from("sales")
    .select(
      `id, invoice_number, created_at, customer_name, status,
       sale_items(id, position, medicine_name, discount_percent, gst_percent,
         sale_item_batch_allocations(id, quantity, unit_price_paise, stock_batches(batch_number, expiry_date)))`
    )
    .eq("invoice_number", number)
    .maybeSingle();
  if (error) throw error;
  if (!sale) return null;

  const { data: available, error: availError } = await supabase.rpc("get_sale_returnable", { p_sale_id: sale.id });
  if (availError) throw availError;
  const returnable = new Map(available.map((a) => [a.allocation_id, a.returnable]));

  const lines = [];
  for (const item of [...sale.sale_items].sort((a, b) => a.position - b.position)) {
    for (const al of item.sale_item_batch_allocations) {
      lines.push({
        allocationId: al.id,
        medicine: item.medicine_name,
        batchNo: al.stock_batches?.batch_number ?? "—",
        sold: al.quantity,
        returnable: returnable.get(al.id) ?? 0,
        unitPaise: al.unit_price_paise,
        discountPercent: Number(item.discount_percent),
        gstPercent: Number(item.gst_percent),
      });
    }
  }
  return {
    id: sale.id,
    invoice: sale.invoice_number,
    at: sale.created_at,
    customerName: sale.customer_name ?? "",
    status: sale.status,
    lines,
  };
}

export async function requestReturn({ idempotencyKey, saleId, lines, reason }) {
  const { data, error } = await supabase.rpc("request_return", {
    p_idempotency_key: idempotencyKey,
    p_sale_id: saleId,
    p_items: lines.map((l) => ({
      allocation_id: l.allocationId,
      quantity: l.quantity,
      condition: l.condition,
    })),
    p_reason: reason,
  });
  if (error) throw error;
  return data;
}

export async function fetchReturns({ page = 1, approval = "", refund = "" } = {}) {
  const from = (page - 1) * RETURN_PAGE_SIZE;
  let query = supabase
    .from("returns")
    .select(
      "id, return_number, reason, approval_status, refund_status, refund_total_paise, requested_at, sales(invoice_number), requester:profiles!requested_by(full_name, email)",
      { count: "exact" }
    )
    .order("requested_at", { ascending: false })
    .range(from, from + RETURN_PAGE_SIZE - 1);
  if (approval) query = query.eq("approval_status", approval);
  if (refund) query = query.eq("refund_status", refund);
  const { data, error, count } = await query;
  if (error) throw error;
  return {
    total: count ?? 0,
    rows: data.map((r) => ({
      id: r.id,
      number: r.return_number,
      invoice: r.sales?.invoice_number ?? "—",
      reason: r.reason,
      approval: r.approval_status,
      refund: r.refund_status,
      refundPaise: r.refund_total_paise,
      at: r.requested_at,
      by: r.requester?.full_name || r.requester?.email || "—",
    })),
  };
}

export async function fetchReturnDetail(id) {
  const { data, error } = await supabase
    .from("returns")
    .select(
      `id, return_number, reason, approval_status, refund_status, refund_total_paise, requested_at,
       decided_at, decision_note, refunded_at, refund_method, refund_reference,
       sales(invoice_number, customer_name),
       requester:profiles!requested_by(full_name, email),
       decider:profiles!decided_by(full_name, email),
       refunder:profiles!refunded_by(full_name, email),
       return_items(id, quantity, item_condition, restocked, refund_paise, sale_items(medicine_name), stock_batches(batch_number))`
    )
    .eq("id", id)
    .single();
  if (error) throw error;
  const who = (p) => p?.full_name || p?.email || "";
  return {
    id: data.id,
    number: data.return_number,
    reason: data.reason,
    approval: data.approval_status,
    refund: data.refund_status,
    refundPaise: data.refund_total_paise,
    requestedAt: data.requested_at,
    requestedBy: who(data.requester),
    decidedAt: data.decided_at,
    decidedBy: who(data.decider),
    decisionNote: data.decision_note ?? "",
    refundedAt: data.refunded_at,
    refundedBy: who(data.refunder),
    refundMethod: data.refund_method ?? "",
    refundReference: data.refund_reference ?? "",
    invoice: data.sales?.invoice_number ?? "—",
    customerName: data.sales?.customer_name ?? "",
    items: (data.return_items ?? []).map((i) => ({
      id: i.id,
      medicine: i.sale_items?.medicine_name ?? "—",
      batchNo: i.stock_batches?.batch_number ?? "—",
      qty: i.quantity,
      condition: i.item_condition,
      restocked: i.restocked,
      refundPaise: i.refund_paise,
    })),
  };
}

export async function approveReturn(id) {
  const { error } = await supabase.rpc("approve_return", { p_return_id: id });
  if (error) throw error;
}

export async function rejectReturn(id, note) {
  const { error } = await supabase.rpc("reject_return", { p_return_id: id, p_note: note });
  if (error) throw error;
}

export async function recordRefund(id, method, reference) {
  const { error } = await supabase.rpc("record_refund", {
    p_return_id: id,
    p_method: method,
    p_reference: reference || null,
  });
  if (error) throw error;
}
