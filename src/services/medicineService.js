import { supabase } from "./supabaseClient";

// ---- Database row  ->  the shape the screens use ----
function mapMedicine(r) {
  return {
    id: r.id,
    code: r.code,
    name: r.name,
    brand: r.brand_name ?? "",
    generic: r.generic_name ?? "",
    categoryId: r.category_id,
    category: r.medicine_categories?.name ?? "Uncategorised",
    manufacturer: r.manufacturer ?? "",
    form: r.dosage_form,
    strength: r.strength || "-",
    unit: r.unit,
    barcode: r.barcode ?? "",
    description: r.description ?? "",
    purchasePaise: r.purchase_price_paise,
    sellingPaise: r.selling_price_paise,
    gstPercent: Number(r.gst_percent),
    reorder: r.reorder_level,
    rx: r.requires_prescription,
    active: r.is_active,
  };
}

function mapBatch(r) {
  return {
    id: r.id,
    medicineId: r.medicine_id,
    batchNo: r.batch_number,
    expiry: r.expiry_date,
    qty: r.quantity_remaining,
    received: r.quantity_received,
    status: r.status,
    sellingPaise: r.selling_price_paise ?? null,
    createdAt: r.created_at,
  };
}

// ---- Reads ----
export async function fetchCategories() {
  const { data, error } = await supabase
    .from("medicine_categories")
    .select("id, name")
    .order("name");
  if (error) throw error;
  return data;
}

export async function fetchMedicines() {
  const { data, error } = await supabase
    .from("medicines")
    .select("*, medicine_categories(name)")
    .order("name");
  if (error) throw error;
  return data.map(mapMedicine);
}

// Only batches that still have units. Expired ones are included on purpose,
// so the dashboard can show them for quarantine or disposal.
export async function fetchBatches() {
  const { data, error } = await supabase
    .from("stock_batches")
    .select("id, medicine_id, batch_number, expiry_date, quantity_received, quantity_remaining, status, selling_price_paise, created_at")
    .gt("quantity_remaining", 0)
    .order("expiry_date");
  if (error) throw error;
  return data.map(mapBatch);
}

// ---- Writes (the database re-checks everything: RLS + constraints) ----
function toRow(f) {
  return {
    name: f.name.trim(),
    brand_name: f.brand.trim() || null,
    generic_name: f.generic.trim() || null,
    category_id: f.categoryId,
    manufacturer: f.manufacturer.trim() || null,
    dosage_form: f.form,
    strength: f.strength.trim() || null,
    unit: f.unit,
    barcode: f.barcode.trim() || null,
    description: f.description.trim() || null,
    purchase_price_paise: f.purchasePaise,
    selling_price_paise: f.sellingPaise,
    gst_percent: f.gstPercent,
    reorder_level: f.reorder,
    requires_prescription: f.rx,
    is_active: f.active,
  };
}

export async function createMedicine(form) {
  const { error } = await supabase.from("medicines").insert(toRow(form));
  if (error) throw error;
}

export async function updateMedicine(id, form) {
  const { data, error } = await supabase
    .from("medicines")
    .update(toRow(form))
    .eq("id", id)
    .select("id")
    .maybeSingle();
  if (error) throw error;
  // Row Level Security can silently block an update. Treat "0 rows" as a failure.
  if (!data) throw new Error("The update was not allowed, or the medicine no longer exists.");
}

export async function addStockBatch(p) {
  const { error } = await supabase.rpc("add_stock_batch", {
    p_medicine_id: p.medicineId,
    p_batch_number: p.batchNumber,
    p_manufacturing_date: p.manufacturingDate || null,
    p_expiry_date: p.expiryDate,
    p_quantity: p.quantity,
    p_purchase_price_paise: p.purchasePaise,
    p_selling_price_paise: p.sellingPaise,
  });
  if (error) throw error;
}
