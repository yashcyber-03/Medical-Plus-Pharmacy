import { supabase } from "./supabaseClient";

const num = (v) => Number(v ?? 0);

// "2026-10-01" .. "2026-10-31" -> timestamps covering both whole days (browser local time)
function rangeToTimestamps(from, to) {
  const start = new Date(`${from}T00:00:00`);
  const end = new Date(`${to}T00:00:00`);
  end.setDate(end.getDate() + 1);
  return { start: start.toISOString(), end: end.toISOString() };
}

export async function fetchSalesSummary(from, to) {
  const { data, error } = await supabase.rpc("report_sales_summary", { p_from: from, p_to: to });
  if (error) throw error;
  const r = Array.isArray(data) ? data[0] : data;
  return {
    invoices: num(r?.invoices),
    grossPaise: num(r?.gross_paise),
    discountPaise: num(r?.discount_paise),
    gstPaise: num(r?.gst_paise),
    returnsNetPaise: num(r?.returns_net_paise),
    returnsTaxPaise: num(r?.returns_tax_paise),
    returnsRefundPaise: num(r?.returns_refund_paise),
    cogsPaise: num(r?.cogs_paise),
    purchasesPaise: num(r?.purchases_paise),
  };
}

export async function fetchBestSellers(from, to, limit = 10) {
  const { data, error } = await supabase.rpc("report_best_sellers", { p_from: from, p_to: to, p_limit: limit });
  if (error) throw error;
  return data.map((r) => ({
    medicineId: r.medicine_id,
    name: r.medicine_name,
    sold: num(r.units_sold),
    returned: num(r.units_returned),
    netRevenuePaise: num(r.net_revenue_paise),
  }));
}

export async function fetchValuation() {
  const { data, error } = await supabase.rpc("report_inventory_valuation");
  if (error) throw error;
  return data.map((r) => ({
    medicineId: r.medicine_id,
    name: r.medicine_name,
    sellableUnits: num(r.sellable_units),
    sellableValuePaise: num(r.sellable_value_paise),
    expiredUnits: num(r.expired_units),
    expiredValuePaise: num(r.expired_value_paise),
    quarantinedUnits: num(r.quarantined_units),
    quarantinedValuePaise: num(r.quarantined_value_paise),
  }));
}

export async function fetchMonthlyTrend(months = 6) {
  const { data, error } = await supabase.rpc("report_monthly_trend", { p_months: months });
  if (error) throw error;
  return data.map((r) => ({
    month: new Date(`${r.month_start}T00:00:00`).toLocaleDateString("en-IN", { month: "short" }),
    sales: num(r.sales_paise),
    purchases: num(r.purchases_paise),
  }));
}

// Every batch with its medicine and supplier (administrators only; RLS enforces it)
export async function fetchAllBatches() {
  const { data, error } = await supabase
    .from("stock_batches")
    .select(
      "id, batch_number, expiry_date, quantity_received, quantity_remaining, purchase_price_paise, status, medicines(name, unit), suppliers(name)"
    )
    .order("expiry_date")
    .limit(2000);
  if (error) throw error;
  return data.map((r) => ({
    id: r.id,
    medicine: r.medicines?.name ?? "Unknown medicine",
    unit: r.medicines?.unit ?? "",
    supplier: r.suppliers?.name ?? "",
    batchNo: r.batch_number,
    expiry: r.expiry_date,
    received: r.quantity_received,
    qty: r.quantity_remaining,
    costPaise: r.purchase_price_paise,
    status: r.status,
  }));
}

export async function fetchAdjustments(from, to) {
  const { start, end } = rangeToTimestamps(from, to);
  const { data, error } = await supabase
    .from("inventory_movements")
    .select(
      "id, movement_type, quantity_change, balance_after, reason, created_at, medicines(name), stock_batches(batch_number), profiles(full_name, email)"
    )
    .in("movement_type", ["adjustment", "disposal"])
    .gte("created_at", start)
    .lt("created_at", end)
    .order("created_at", { ascending: false })
    .limit(500);
  if (error) throw error;
  return data.map((r) => ({
    id: r.id,
    type: r.movement_type,
    change: r.quantity_change,
    balanceAfter: r.balance_after,
    reason: r.reason ?? "",
    at: r.created_at,
    medicine: r.medicines?.name ?? "—",
    batchNo: r.stock_batches?.batch_number ?? "—",
    by: r.profiles?.full_name || r.profiles?.email || "—",
  }));
}

export async function fetchReceiptsInRange(from, to) {
  const { start, end } = rangeToTimestamps(from, to);
  const { data, error } = await supabase
    .from("goods_receipts")
    .select("id, receipt_number, received_at, total_paise, supplier_invoice_ref, purchase_orders(po_number), suppliers(name)")
    .gte("received_at", start)
    .lt("received_at", end)
    .order("received_at", { ascending: false })
    .limit(500);
  if (error) throw error;
  return data.map((r) => ({
    id: r.id,
    number: r.receipt_number,
    at: r.received_at,
    totalPaise: r.total_paise,
    invoiceRef: r.supplier_invoice_ref ?? "",
    poNumber: r.purchase_orders?.po_number ?? "—",
    supplier: r.suppliers?.name ?? "—",
  }));
}
