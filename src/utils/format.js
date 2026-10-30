// Money is stored as integer paise (1 rupee = 100 paise) to avoid
// floating-point errors in financial calculations.
export function formatMoney(paise) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(paise / 100);
}

export function formatDate(isoDate) {
  return new Date(isoDate + "T00:00:00").toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function daysUntil(isoDate) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(isoDate + "T00:00:00");
  return Math.round((target - today) / 86400000);
}

// "12.50" -> 1250 (integer maths only, no floating point).
// Returns null when the text is not a valid rupee amount.
export function rupeesToPaise(input) {
  const s = String(input ?? "").trim();
  if (!/^\d{1,7}(\.\d{1,2})?$/.test(s)) return null;
  const [whole, frac = ""] = s.split(".");
  return parseInt(whole, 10) * 100 + parseInt(frac.padEnd(2, "0"), 10);
}

// 1250 -> "12.50" (for filling form fields)
export function paiseToRupees(paise) {
  const p = Math.round(paise);
  return `${Math.floor(p / 100)}.${String(p % 100).padStart(2, "0")}`;
}

// Today's date as YYYY-MM-DD in the browser's local time
export function todayIso() {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
}
