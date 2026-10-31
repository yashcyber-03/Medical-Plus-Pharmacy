// Turn database errors into messages a pharmacy user can understand.
export function friendlyError(err) {
  if (!err) return "Something went wrong.";
  const msg = err.message ?? String(err);

  if (err.code === "23505") {
    if (msg.includes("barcode")) return "Another medicine already uses this barcode.";
    if (msg.includes("customers")) return "A customer with this phone number already exists.";
    if (msg.includes("stock_batches")) return "This batch number already exists for this medicine.";
    return "This record already exists.";
  }
  if (err.code === "23514") return "One of the values is outside the allowed range.";
  if (err.code === "42501" || /row-level security/i.test(msg)) {
    return "You don't have permission to do this.";
  }
  if (/failed to fetch|networkerror/i.test(msg)) {
    return "Could not reach the server. Check your internet connection.";
  }
  return msg;
}
