import { daysUntil } from "./format";

// Warning period for near-expiry. Later this will come from pharmacy_settings.
export const NEAR_EXPIRY_DAYS = 90;

// A batch is "expired", "near-expiry" or "healthy" based on its expiry date.
export function getBatchStatus(batch, warnDays = NEAR_EXPIRY_DAYS) {
  const days = daysUntil(batch.expiry);
  if (days < 0) return "expired";
  if (days <= warnDays) return "near-expiry";
  return "healthy";
}

// Only non-expired batches count as sellable ("eligible") stock.
export function getEligibleStock(batches, medicineId) {
  return batches
    .filter((b) => b.medicineId === medicineId && getBatchStatus(b) !== "expired")
    .reduce((sum, b) => sum + b.qty, 0);
}

// Medicine-level stock status from eligible stock vs reorder threshold.
export function getStockStatus(eligibleQty, reorderLevel) {
  if (eligibleQty <= 0) return "out-of-stock";
  if (eligibleQty <= reorderLevel) return "low-stock";
  return "healthy";
}
