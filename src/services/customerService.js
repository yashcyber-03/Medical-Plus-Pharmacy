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
