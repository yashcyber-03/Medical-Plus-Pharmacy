import { supabase } from "./supabaseClient";

export const SALES_PAGE_SIZE = 15;

const DETAIL_SELECT = `
  id, invoice_number, created_at, customer_name, customer_phone, prescription_checked,
  subtotal_paise, discount_paise, tax_paise, total_paise, notes, status,
  profiles(full_name, email),
  sale_items(
    id, position, medicine_name, quantity, subtotal_paise, discount_percent, discount_paise,
    gst_percent, taxable_paise, tax_paise, total_paise,
    sale_item_batch_allocations(quantity, unit_price_paise, amount_paise, stock_batches(batch_number, expiry_date))
  ),
  payment_records(method, reference, amount_paise)
`;

function mapSale(r) {
  return {
    id: r.id,
    invoice: r.invoice_number,
    at: r.created_at,
    customerName: r.customer_name ?? "",
    customerPhone: r.customer_phone ?? "",
    cashier: r.profiles?.full_name || r.profiles?.email || "—",
    prescriptionChecked: r.prescription_checked,
    subtotalPaise: r.subtotal_paise,
    discountPaise: r.discount_paise,
    taxPaise: r.tax_paise,
    totalPaise: r.total_paise,
    notes: r.notes ?? "",
    status: r.status,
    items: [...(r.sale_items ?? [])]
      .sort((a, b) => a.position - b.position)
      .map((i) => ({
        id: i.id,
        name: i.medicine_name,
        qty: i.quantity,
        subtotalPaise: i.subtotal_paise,
        discountPercent: Number(i.discount_percent),
        discountPaise: i.discount_paise,
        gstPercent: Number(i.gst_percent),
        taxPaise: i.tax_paise,
        totalPaise: i.total_paise,
        allocations: (i.sale_item_batch_allocations ?? []).map((a) => ({
          batchNo: a.stock_batches?.batch_number ?? "—",
          expiry: a.stock_batches?.expiry_date ?? "",
          qty: a.quantity,
          unitPaise: a.unit_price_paise,
          amountPaise: a.amount_paise,
        })),
      })),
    payment: r.payment_records?.[0]
      ? {
          method: r.payment_records[0].method,
          reference: r.payment_records[0].reference ?? "",
          amountPaise: r.payment_records[0].amount_paise,
        }
      : null,
  };
}

export async function fetchSettings() {
  const { data, error } = await supabase
    .from("pharmacy_settings")
    .select("pharmacy_name, address, phone, gstin, invoice_prefix, max_staff_discount_percent")
    .maybeSingle();
  if (error) throw error;
  return {
    name: data?.pharmacy_name ?? "Medical Plus Pharmacy",
    address: data?.address ?? "",
    phone: data?.phone ?? "",
    gstin: data?.gstin ?? "",
    maxStaffDiscount: Number(data?.max_staff_discount_percent ?? 10),
  };
}

// The database works out prices, tax, batches and totals.
// We send only medicine ids, quantities and discount percentages.
export async function createSale({ idempotencyKey, items, customerId, paymentMethod, paymentReference, prescriptionChecked, notes }) {
  const { data, error } = await supabase.rpc("create_sale", {
    p_idempotency_key: idempotencyKey,
    p_items: items.map((i) => ({
      medicine_id: i.medicineId,
      quantity: i.quantity,
      discount_percent: i.discountPercent,
    })),
    p_customer_id: customerId ?? null,
    p_payment_method: paymentMethod,
    p_payment_reference: paymentReference || null,
    p_prescription_checked: prescriptionChecked,
    p_notes: notes || null,
  });
  if (error) throw error;
  return data; // the new sale id
}

export async function fetchSaleDetail(id) {
  const { data, error } = await supabase.from("sales").select(DETAIL_SELECT).eq("id", id).single();
  if (error) throw error;
  return mapSale(data);
}

function cleanTerm(text) {
  return String(text ?? "").replace(/[%,()*\\]/g, " ").trim().slice(0, 40);
}

// dateIso is "YYYY-MM-DD" in the browser's local time (or empty for all days)
export async function fetchSales({ page, search, dateIso }) {
  const from = (page - 1) * SALES_PAGE_SIZE;
  const to = from + SALES_PAGE_SIZE - 1;

  let query = supabase
    .from("sales")
    .select(
      "id, invoice_number, created_at, customer_name, total_paise, profiles(full_name, email), payment_records(method), sale_items(quantity)",
      { count: "exact" }
    )
    .order("created_at", { ascending: false })
    .range(from, to);

  const term = cleanTerm(search);
  if (term) query = query.or(`invoice_number.ilike.%${term}%,customer_name.ilike.%${term}%`);

  if (dateIso) {
    const start = new Date(`${dateIso}T00:00:00`);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    query = query.gte("created_at", start.toISOString()).lt("created_at", end.toISOString());
  }

  const { data, error, count } = await query;
  if (error) throw error;

  return {
    total: count ?? 0,
    rows: data.map((r) => ({
      id: r.id,
      invoice: r.invoice_number,
      at: r.created_at,
      customerName: r.customer_name || "Walk-in customer",
      totalPaise: r.total_paise,
      cashier: r.profiles?.full_name || r.profiles?.email || "—",
      method: r.payment_records?.[0]?.method ?? "",
      units: (r.sale_items ?? []).reduce((s, i) => s + i.quantity, 0),
    })),
  };
}

// Last N days of sales for the dashboard (staff see only their own)
export async function fetchRecentSales(days = 14) {
  const since = new Date();
  since.setHours(0, 0, 0, 0);
  since.setDate(since.getDate() - (days - 1));

  const { data, error } = await supabase
    .from("sales")
    .select("id, invoice_number, created_at, customer_name, total_paise, payment_records(method), sale_items(quantity)")
    .gte("created_at", since.toISOString())
    .order("created_at", { ascending: false })
    .limit(1000);
  if (error) throw error;

  return data.map((r) => ({
    id: r.id,
    invoice: r.invoice_number,
    at: r.created_at,
    customer: r.customer_name || "Walk-in customer",
    totalPaise: r.total_paise,
    method: r.payment_records?.[0]?.method ?? "",
    items: (r.sale_items ?? []).reduce((s, i) => s + i.quantity, 0),
  }));
}
