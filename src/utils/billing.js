import { daysUntil } from "./format";

// All maths here uses whole numbers (paise, and percentages in hundredths)
// so there is no floating-point drift. The database repeats the same
// calculation; this file only shows an ESTIMATE before the sale is saved.

// "12.5" -> 1250 (hundredths of a percent). "" -> 0. Invalid -> null.
export function pctToHundredths(input) {
  const s = String(input ?? "").trim();
  if (s === "") return 0;
  if (!/^\d{1,3}(\.\d{1,2})?$/.test(s)) return null;
  const [whole, frac = ""] = s.split(".");
  const value = parseInt(whole, 10) * 100 + parseInt(frac.padEnd(2, "0"), 10);
  return value > 10000 ? null : value;
}

// amount x percent, rounded half up, using integers only
export function pctOf(amountPaise, hundredths) {
  return Math.floor((amountPaise * hundredths + 5000) / 10000);
}

// FEFO: choose batches, earliest expiry first. Skips expired, quarantined,
// disposed and empty batches.
export function allocateFefo(batches, medicineId, quantity) {
  const eligible = batches
    .filter(
      (b) =>
        b.medicineId === medicineId &&
        b.status === "active" &&
        b.qty > 0 &&
        daysUntil(b.expiry) >= 0
    )
    .sort(
      (a, b) =>
        a.expiry.localeCompare(b.expiry) ||
        String(a.createdAt).localeCompare(String(b.createdAt)) ||
        String(a.id).localeCompare(String(b.id))
    );

  let need = quantity;
  const allocations = [];
  for (const batch of eligible) {
    if (need <= 0) break;
    const take = Math.min(batch.qty, need);
    allocations.push({ batch, take });
    need -= take;
  }
  return { allocations, shortfall: Math.max(0, need) };
}

// Estimate one cart line the same way the database does.
export function estimateLine({ medicine, batches, quantity, discountHundredths }) {
  const { allocations, shortfall } = allocateFefo(batches, medicine.id, quantity);
  const lines = allocations.map(({ batch, take }) => {
    const unit = batch.sellingPaise ?? medicine.sellingPaise;
    return { batch, take, unit, amount: take * unit };
  });
  const subtotal = lines.reduce((s, l) => s + l.amount, 0);
  const discount = pctOf(subtotal, discountHundredths);
  const taxable = subtotal - discount;
  const tax = pctOf(taxable, Math.round(medicine.gstPercent * 100));
  return { lines, shortfall, subtotal, discount, taxable, tax, total: taxable + tax };
}

export const PAYMENT_METHODS = [
  { value: "cash", label: "Cash" },
  { value: "upi", label: "UPI" },
  { value: "card", label: "Card" },
  { value: "other", label: "Other" },
];

export function paymentLabel(value) {
  return PAYMENT_METHODS.find((m) => m.value === value)?.label ?? value;
}
