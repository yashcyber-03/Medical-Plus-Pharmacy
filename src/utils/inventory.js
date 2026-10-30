import { daysUntil } from "./format";

// Warning period for near-expiry. Later this will come from pharmacy_settings.
export const NEAR_EXPIRY_DAYS = 90;

// A batch is quarantined/disposed (set by staff) or, by date,
// "expired", "near-expiry" or "healthy".
export function getBatchStatus(batch, warnDays = NEAR_EXPIRY_DAYS) {
  if (batch.status === "quarantined") return "quarantined";
  if (batch.status === "disposed") return "disposed";
  const days = daysUntil(batch.expiry);
  if (days < 0) return "expired";
  if (days <= warnDays) return "near-expiry";
  return "healthy";
}

// Only sellable batches count as eligible stock:
// not expired, not quarantined, not disposed.
export function getEligibleStock(batches, medicineId) {
  return batches
    .filter((b) => {
      if (b.medicineId !== medicineId) return false;
      const s = getBatchStatus(b);
      return s === "healthy" || s === "near-expiry";
    })
    .reduce((sum, b) => sum + b.qty, 0);
}

// Medicine-level stock status from eligible stock vs reorder threshold.
export function getStockStatus(eligibleQty, reorderLevel) {
  if (eligibleQty <= 0) return "out-of-stock";
  if (eligibleQty <= reorderLevel) return "low-stock";
  return "healthy";
}
