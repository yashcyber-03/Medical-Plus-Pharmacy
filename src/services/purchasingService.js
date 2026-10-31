import { supabase } from "./supabaseClient";

export const PO_PAGE_SIZE = 12;

// ---------------- Suppliers ----------------
function mapSupplier(r) {
  return {
    id: r.id,
    name: r.name,
    contact: r.contact_person ?? "",
    phone: r.phone ?? "",
    email: r.email ?? "",
    address: r.address ?? "",
    gstin: r.gstin ?? "",
    notes: r.notes ?? "",
    active: r.is_active,
  };
}

export async function fetchSuppliers() {
  const { data, error } = await supabase.from("suppliers").select("*").order("name");
  if (error) throw error;
  return data.map(mapSupplier);
}

function supplierRow(f) {
  return {
    name: f.name.trim(),
    contact_person: f.contact.trim() || null,
    phone: f.phone.trim() || null,
    email: f.email.trim() || null,
    address: f.address.trim() || null,
    gstin: f.gstin.trim().toUpperCase() || null,
    notes: f.notes.trim() || null,
    is_active: f.active,
  };
}

export async function createSupplier(form) {
  const { error } = await supabase.from("suppliers").insert(supplierRow(form));
  if (error) throw error;
}

export async function updateSupplier(id, form) {
  const { data, error } = await supabase
    .from("suppliers")
    .update(supplierRow(form))
    .eq("id", id)
    .select("id")
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("The update was not allowed, or the supplier no longer exists.");
}

// Distinct medicines ever ordered from this supplier
export async function fetchSuppliedProducts(supplierId) {
  const { data, error } = await supabase
    .from("purchase_order_items")
    .select("medicine_id, medicines(name), purchase_orders!inner(supplier_id)")
    .eq("purchase_orders.supplier_id", supplierId);
  if (error) throw error;
  const names = new Map();
  for (const r of data) names.set(r.medicine_id, r.medicines?.name ?? "Unknown medicine");
  return [...names.values()].sort((a, b) => a.localeCompare(b));
}

// ---------------- Purchase orders ----------------
function mapOrderRow(r) {
  return {
    id: r.id,
    number: r.po_number,
    supplier: r.suppliers?.name ?? "—",
    status: r.status,
    orderDate: r.order_date ?? "",
    expectedDate: r.expected_date ?? "",
    totalPaise: r.total_paise,
    createdAt: r.created_at,
    units: (r.purchase_order_items ?? []).reduce((s, i) => s + i.quantity_ordered, 0),
    receivedUnits: (r.purchase_order_items ?? []).reduce((s, i) => s + i.quantity_received, 0),
  };
}

export async function fetchPurchaseOrders({ page = 1, status = "", supplierId = "", statuses = null } = {}) {
  const from = (page - 1) * PO_PAGE_SIZE;
  let query = supabase
    .from("purchase_orders")
    .select(
      "id, po_number, status, order_date, expected_date, total_paise, created_at, suppliers(name), purchase_order_items(quantity_ordered, quantity_received)",
      { count: "exact" }
    )
    .order("created_at", { ascending: false })
    .range(from, from + PO_PAGE_SIZE - 1);
  if (status) query = query.eq("status", status);
  if (statuses) query = query.in("status", statuses);
  if (supplierId) query = query.eq("supplier_id", supplierId);
  const { data, error, count } = await query;
  if (error) throw error;
  return { total: count ?? 0, rows: data.map(mapOrderRow) };
}

export async function fetchPurchaseOrder(id) {
  const { data, error } = await supabase
    .from("purchase_orders")
    .select(
      `id, po_number, supplier_id, status, order_date, expected_date, notes, total_paise, created_at,
       suppliers(name, phone, email),
       purchase_order_items(id, medicine_id, quantity_ordered, quantity_received, unit_cost_paise, medicines(name, unit)),
       goods_receipts(id, receipt_number, received_at, total_paise, supplier_invoice_ref)`
    )
    .eq("id", id)
    .single();
  if (error) throw error;
  return {
    id: data.id,
    number: data.po_number,
    supplierId: data.supplier_id,
    supplier: data.suppliers?.name ?? "—",
    supplierPhone: data.suppliers?.phone ?? "",
    supplierEmail: data.suppliers?.email ?? "",
    status: data.status,
    orderDate: data.order_date ?? "",
    expectedDate: data.expected_date ?? "",
    notes: data.notes ?? "",
    totalPaise: data.total_paise,
    items: (data.purchase_order_items ?? [])
      .map((i) => ({
        id: i.id,
        medicineId: i.medicine_id,
        name: i.medicines?.name ?? "Unknown medicine",
        unit: i.medicines?.unit ?? "",
        ordered: i.quantity_ordered,
        received: i.quantity_received,
        costPaise: i.unit_cost_paise,
      }))
      .sort((a, b) => a.name.localeCompare(b.name)),
    receipts: [...(data.goods_receipts ?? [])]
      .sort((a, b) => b.received_at.localeCompare(a.received_at))
      .map((g) => ({
        id: g.id,
        number: g.receipt_number,
        at: g.received_at,
        totalPaise: g.total_paise,
        invoiceRef: g.supplier_invoice_ref ?? "",
      })),
  };
}

function itemsPayload(items) {
  return items.map((i) => ({
    medicine_id: i.medicineId,
    quantity: i.quantity,
    unit_cost_paise: i.unitCostPaise,
  }));
}

export async function createPurchaseOrder({ supplierId, items, expectedDate, notes, markOrdered }) {
  const { data, error } = await supabase.rpc("create_purchase_order", {
    p_supplier_id: supplierId,
    p_items: itemsPayload(items),
    p_expected_date: expectedDate || null,
    p_notes: notes || null,
    p_mark_ordered: markOrdered,
  });
  if (error) throw error;
  return data;
}

export async function updateDraftPurchaseOrder({ id, supplierId, items, expectedDate, notes, markOrdered }) {
  const { error } = await supabase.rpc("update_draft_purchase_order", {
    p_po_id: id,
    p_supplier_id: supplierId,
    p_items: itemsPayload(items),
    p_expected_date: expectedDate || null,
    p_notes: notes || null,
    p_mark_ordered: markOrdered,
  });
  if (error) throw error;
}

export async function setPurchaseOrderStatus(id, status) {
  const { error } = await supabase.rpc("set_purchase_order_status", { p_po_id: id, p_status: status });
  if (error) throw error;
}

// ---------------- Goods receipts ----------------
export async function receiveGoods({ idempotencyKey, poId, lines, supplierInvoice, notes }) {
  const { data, error } = await supabase.rpc("receive_goods", {
    p_idempotency_key: idempotencyKey,
    p_po_id: poId,
    p_items: lines.map((l) => ({
      po_item_id: l.poItemId,
      quantity: l.quantity,
      batch_number: l.batchNumber,
      manufacturing_date: l.manufacturingDate || null,
      expiry_date: l.expiryDate,
      unit_cost_paise: l.unitCostPaise,
    })),
    p_supplier_invoice: supplierInvoice || null,
    p_notes: notes || null,
  });
  if (error) throw error;
  return data;
}

export async function fetchReceipts({ page = 1 } = {}) {
  const from = (page - 1) * PO_PAGE_SIZE;
  const { data, error, count } = await supabase
    .from("goods_receipts")
    .select(
      "id, receipt_number, received_at, total_paise, supplier_invoice_ref, purchase_orders(po_number), suppliers(name), profiles(full_name, email)",
      { count: "exact" }
    )
    .order("received_at", { ascending: false })
    .range(from, from + PO_PAGE_SIZE - 1);
  if (error) throw error;
  return {
    total: count ?? 0,
    rows: data.map((r) => ({
      id: r.id,
      number: r.receipt_number,
      at: r.received_at,
      totalPaise: r.total_paise,
      invoiceRef: r.supplier_invoice_ref ?? "",
      poNumber: r.purchase_orders?.po_number ?? "—",
      supplier: r.suppliers?.name ?? "—",
      by: r.profiles?.full_name || r.profiles?.email || "—",
    })),
  };
}

export async function fetchReceiptDetail(id) {
  const { data, error } = await supabase
    .from("goods_receipts")
    .select(
      `id, receipt_number, received_at, total_paise, supplier_invoice_ref, notes,
       purchase_orders(po_number), suppliers(name),
       goods_receipt_items(id, batch_number, quantity, unit_cost_paise, medicines(name), stock_batches(expiry_date))`
    )
    .eq("id", id)
    .single();
  if (error) throw error;
  return {
    id: data.id,
    number: data.receipt_number,
    at: data.received_at,
    totalPaise: data.total_paise,
    invoiceRef: data.supplier_invoice_ref ?? "",
    notes: data.notes ?? "",
    poNumber: data.purchase_orders?.po_number ?? "—",
    supplier: data.suppliers?.name ?? "—",
    items: (data.goods_receipt_items ?? []).map((i) => ({
      id: i.id,
      name: i.medicines?.name ?? "Unknown medicine",
      batchNo: i.batch_number,
      qty: i.quantity,
      costPaise: i.unit_cost_paise,
      expiry: i.stock_batches?.expiry_date ?? "",
    })),
  };
}
