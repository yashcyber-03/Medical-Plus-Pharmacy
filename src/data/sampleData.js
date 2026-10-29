// SAMPLE DATA ONLY - synthetic records for the Phase 1 UI preview.
// In Phase 3 these are replaced by real Supabase queries.
// Prices are in paise (integer minor units).

function daysFromNow(n) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

export const categories = [
  "Analgesic",
  "Antibiotic",
  "Antacid",
  "Antihistamine",
  "Diabetes",
  "Vitamins",
  "Cough & Cold",
];

export const medicines = [
  { id: "M001", name: "Paracetamol 500", brand: "Calpol", generic: "Paracetamol", category: "Analgesic", form: "Tablet", strength: "500 mg", unit: "strip", purchasePaise: 1800, sellingPaise: 2500, reorder: 50, rx: false, active: true },
  { id: "M002", name: "Amoxicillin 250", brand: "Novamox", generic: "Amoxicillin", category: "Antibiotic", form: "Capsule", strength: "250 mg", unit: "strip", purchasePaise: 5200, sellingPaise: 7000, reorder: 30, rx: true, active: true },
  { id: "M003", name: "Pantoprazole 40", brand: "Pantocid", generic: "Pantoprazole", category: "Antacid", form: "Tablet", strength: "40 mg", unit: "strip", purchasePaise: 6500, sellingPaise: 8900, reorder: 40, rx: false, active: true },
  { id: "M004", name: "Cetirizine 10", brand: "Cetzine", generic: "Cetirizine", category: "Antihistamine", form: "Tablet", strength: "10 mg", unit: "strip", purchasePaise: 1500, sellingPaise: 2200, reorder: 40, rx: false, active: true },
  { id: "M005", name: "Metformin 500", brand: "Glycomet", generic: "Metformin", category: "Diabetes", form: "Tablet", strength: "500 mg", unit: "strip", purchasePaise: 2300, sellingPaise: 3200, reorder: 60, rx: true, active: true },
  { id: "M006", name: "Vitamin C 500", brand: "Celin", generic: "Ascorbic acid", category: "Vitamins", form: "Tablet", strength: "500 mg", unit: "strip", purchasePaise: 2000, sellingPaise: 3000, reorder: 30, rx: false, active: true },
  { id: "M007", name: "Cough Syrup 100ml", brand: "Benadryl", generic: "Diphenhydramine", category: "Cough & Cold", form: "Syrup", strength: "100 ml", unit: "bottle", purchasePaise: 6000, sellingPaise: 8500, reorder: 20, rx: false, active: true },
  { id: "M008", name: "Azithromycin 500", brand: "Azithral", generic: "Azithromycin", category: "Antibiotic", form: "Tablet", strength: "500 mg", unit: "strip", purchasePaise: 9000, sellingPaise: 12000, reorder: 25, rx: true, active: true },
  { id: "M009", name: "Ibuprofen 400", brand: "Brufen", generic: "Ibuprofen", category: "Analgesic", form: "Tablet", strength: "400 mg", unit: "strip", purchasePaise: 2500, sellingPaise: 3500, reorder: 40, rx: false, active: true },
  { id: "M010", name: "Multivitamin Capsules", brand: "Supradyn", generic: "Multivitamin", category: "Vitamins", form: "Capsule", strength: "-", unit: "strip", purchasePaise: 4500, sellingPaise: 6200, reorder: 20, rx: false, active: true },
  { id: "M011", name: "Antacid Gel 170ml", brand: "Digene", generic: "Aluminium hydroxide", category: "Antacid", form: "Syrup", strength: "170 ml", unit: "bottle", purchasePaise: 5500, sellingPaise: 7500, reorder: 15, rx: false, active: true },
  { id: "M012", name: "Old Formula Cough Drops", brand: "Generic", generic: "Menthol", category: "Cough & Cold", form: "Lozenge", strength: "-", unit: "pack", purchasePaise: 800, sellingPaise: 1200, reorder: 20, rx: false, active: false },
];

export const batches = [
  { id: "B001", medicineId: "M001", batchNo: "PCM-2401", expiry: daysFromNow(400), qty: 120 },
  { id: "B002", medicineId: "M001", batchNo: "PCM-2312", expiry: daysFromNow(45), qty: 30 },
  { id: "B003", medicineId: "M002", batchNo: "AMX-2402", expiry: daysFromNow(60), qty: 18 },
  { id: "B004", medicineId: "M003", batchNo: "PAN-2405", expiry: daysFromNow(520), qty: 90 },
  { id: "B005", medicineId: "M004", batchNo: "CTZ-2403", expiry: daysFromNow(300), qty: 25 },
  { id: "B006", medicineId: "M005", batchNo: "MET-2404", expiry: daysFromNow(210), qty: 140 },
  { id: "B007", medicineId: "M006", batchNo: "VTC-2311", expiry: daysFromNow(-20), qty: 35 },
  { id: "B008", medicineId: "M006", batchNo: "VTC-2406", expiry: daysFromNow(380), qty: 12 },
  { id: "B009", medicineId: "M007", batchNo: "CSY-2402", expiry: daysFromNow(75), qty: 40 },
  { id: "B010", medicineId: "M008", batchNo: "AZT-2405", expiry: daysFromNow(330), qty: 0 },
  { id: "B011", medicineId: "M009", batchNo: "IBU-2404", expiry: daysFromNow(250), qty: 70 },
  { id: "B012", medicineId: "M010", batchNo: "MUL-2310", expiry: daysFromNow(-5), qty: 22 },
  { id: "B013", medicineId: "M010", batchNo: "MUL-2407", expiry: daysFromNow(450), qty: 15 },
  { id: "B014", medicineId: "M011", batchNo: "DGN-2406", expiry: daysFromNow(180), qty: 60 },
];

// Sample sales for the last 14 days (paise).
export const dailySales = Array.from({ length: 14 }, (_, i) => {
  const d = new Date();
  d.setDate(d.getDate() - (13 - i));
  const base = [42, 51, 38, 60, 47, 55, 70, 44, 52, 49, 63, 58, 66, 72][i];
  return {
    day: d.toLocaleDateString("en-IN", { day: "2-digit", month: "short" }),
    sales: base * 1000,
  };
});

export const monthlyPurchaseVsSales = [
  { month: "May", purchases: 180000, sales: 240000 },
  { month: "Jun", purchases: 210000, sales: 260000 },
  { month: "Jul", purchases: 190000, sales: 285000 },
  { month: "Aug", purchases: 230000, sales: 300000 },
  { month: "Sep", purchases: 205000, sales: 320000 },
  { month: "Oct", purchases: 240000, sales: 335000 },
];

export const recentTransactions = [
  { invoice: "INV-0001042", customer: "Walk-in customer", items: 3, totalPaise: 18500, method: "Cash", time: "10:42" },
  { invoice: "INV-0001041", customer: "Sample Customer A", items: 1, totalPaise: 7000, method: "UPI", time: "10:15" },
  { invoice: "INV-0001040", customer: "Walk-in customer", items: 5, totalPaise: 42600, method: "Card", time: "09:58" },
  { invoice: "INV-0001039", customer: "Sample Customer B", items: 2, totalPaise: 11400, method: "Cash", time: "09:31" },
];
