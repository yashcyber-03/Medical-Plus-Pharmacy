import { supabase } from "./supabaseClient";

function mapCustomer(r) {
  return { id: r.id, name: r.name, phone: r.phone ?? "", email: r.email ?? "" };
}

// Remove characters that have a special meaning in the search filter
function cleanTerm(text) {
  return String(text ?? "").replace(/[%,()*\\]/g, " ").trim().slice(0, 40);
}

export async function searchCustomers(text) {
  const term = cleanTerm(text);
  if (term.length < 2) return [];
  const { data, error } = await supabase
    .from("customers")
    .select("id, name, phone, email")
    .or(`name.ilike.%${term}%,phone.ilike.%${term}%`)
    .order("name")
    .limit(8);
  if (error) throw error;
  return data.map(mapCustomer);
}

export async function createCustomer({ name, phone, email }) {
  const { data, error } = await supabase
    .from("customers")
    .insert({
      name: name.trim(),
      phone: phone.trim() || null,
      email: email.trim() || null,
    })
    .select("id, name, phone, email")
    .single();
  if (error) throw error;
  return mapCustomer(data);
}

export const CUSTOMER_PAGE_SIZE = 15;

export async function fetchCustomers({ page = 1, search = "" } = {}) {
  const from = (page - 1) * CUSTOMER_PAGE_SIZE;
  let query = supabase
    .from("customers")
    .select("id, name, phone, email", { count: "exact" })
    .order("name")
    .range(from, from + CUSTOMER_PAGE_SIZE - 1);
  const term = cleanTerm(search);
  if (term) query = query.or(`name.ilike.%${term}%,phone.ilike.%${term}%`);
  const { data, error, count } = await query;
  if (error) throw error;
  return { total: count ?? 0, rows: data.map(mapCustomer) };
}

export async function updateCustomer(id, { name, phone, email }) {
  const { data, error } = await supabase
    .from("customers")
    .update({ name: name.trim(), phone: phone.trim() || null, email: email.trim() || null })
    .eq("id", id)
    .select("id")
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("The update was not allowed, or the customer no longer exists.");
}

// Staff only see their own sales; administrators see all of them.
export async function fetchCustomerSales(customerId) {
  const { data, error } = await supabase
    .from("sales")
    .select("id, invoice_number, created_at, total_paise")
    .eq("customer_id", customerId)
    .order("created_at", { ascending: false })
    .limit(20);
  if (error) throw error;
  return data.map((r) => ({ id: r.id, invoice: r.invoice_number, at: r.created_at, totalPaise: r.total_paise }));
}
