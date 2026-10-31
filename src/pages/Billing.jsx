import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Loader2, Minus, Plus, Printer, Search, ShoppingCart, Trash2 } from "lucide-react";
import PageHeader from "../components/PageHeader";
import Modal from "../components/Modal";
import CustomerPicker from "../components/CustomerPicker";
import Receipt from "../components/Receipt";
import { useInventoryData } from "../hooks/useInventoryData";
import { useAuth } from "../context/AuthContext";
import { createSale, fetchSaleDetail, fetchSettings } from "../services/salesService";
import { friendlyError } from "../services/errors";
import { getEligibleStock } from "../utils/inventory";
import { estimateLine, pctToHundredths, PAYMENT_METHODS } from "../utils/billing";
import { formatMoney } from "../utils/format";

const inputCls = "rounded-md border border-slate-300 bg-white px-3 py-2 text-sm";

export default function Billing() {
  const { isAdmin } = useAuth();
  const { medicines, batches, loading, error, reload } = useInventoryData();

  const [settings, setSettings] = useState(null);
  const [query, setQuery] = useState("");
  const [cart, setCart] = useState([]); // { medicineId, qty: "1", disc: "" }
  const [customer, setCustomer] = useState(null);
  const [method, setMethod] = useState("cash");
  const [reference, setReference] = useState("");
  const [rxChecked, setRxChecked] = useState(false);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState("");
  const [notice, setNotice] = useState("");
  const [receipt, setReceipt] = useState(null);

  // One key per cart. If the same cart is submitted twice (double click,
  // lost connection) the database returns the same invoice, not a second one.
  const keyRef = useRef(null);
  useEffect(() => {
    keyRef.current = null;
  }, [cart, customer, method, reference, rxChecked]);

  useEffect(() => {
    fetchSettings().then(setSettings).catch(() => setSettings(null));
  }, []);

  const medById = useMemo(() => new Map(medicines.map((m) => [m.id, m])), [medicines]);
  const stockById = useMemo(
    () => new Map(medicines.map((m) => [m.id, getEligibleStock(batches, m.id)])),
    [medicines, batches]
  );

  const maxDiscount = isAdmin ? 100 : settings?.maxStaffDiscount ?? 10;
  const maxDiscountHundredths = Math.round(maxDiscount * 100);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = medicines.filter((m) => m.active);
    if (!q) return list.slice(0, 8);
    return list
      .filter((m) => [m.name, m.brand, m.generic, m.code, m.barcode].some((v) => (v ?? "").toLowerCase().includes(q)))
      .slice(0, 8);
  }, [medicines, query]);

  // Work out each cart line (estimate only; the database recalculates)
  const lines = useMemo(
    () =>
      cart.map((item) => {
        const med = medById.get(item.medicineId);
        const qtyOk = /^\d{1,5}$/.test(item.qty) && parseInt(item.qty, 10) >= 1;
        const qty = qtyOk ? parseInt(item.qty, 10) : 0;
        const dh = pctToHundredths(item.disc);
        let lineError = "";
        let est = null;

        if (!med) lineError = "This medicine is no longer available.";
        else if (!qtyOk) lineError = "Enter a quantity of 1 or more.";
        else if (dh === null) lineError = "Enter a valid discount, e.g. 5 or 2.5.";
        else if (dh > maxDiscountHundredths) lineError = `Discount is above the ${maxDiscount}% limit.`;
        else {
          est = estimateLine({ medicine: med, batches, quantity: qty, discountHundredths: dh });
          if (est.shortfall > 0) lineError = `Only ${qty - est.shortfall} available.`;
        }
        return { item, med, qty, lineError, est };
      }),
    [cart, medById, batches, maxDiscount, maxDiscountHundredths]
  );

  const hasError = lines.some((l) => l.lineError);
  const rxNeeded = lines.some((l) => l.med?.rx);
  const totals = lines.reduce(
    (t, l) => (l.est ? { sub: t.sub + l.est.subtotal, disc: t.disc + l.est.discount, tax: t.tax + l.est.tax, total: t.total + l.est.total } : t),
    { sub: 0, disc: 0, tax: 0, total: 0 }
  );

  function addToCart(med) {
    setNotice("");
    setFormError("");
    setCart((c) => {
      const existing = c.find((i) => i.medicineId === med.id);
      if (existing) {
        const next = (parseInt(existing.qty, 10) || 0) + 1;
        return c.map((i) => (i.medicineId === med.id ? { ...i, qty: String(next) } : i));
      }
      return [...c, { medicineId: med.id, qty: "1", disc: "" }];
    });
  }

  function updateItem(medicineId, patch) {
    setCart((c) => c.map((i) => (i.medicineId === medicineId ? { ...i, ...patch } : i)));
  }
  function bump(medicineId, delta) {
    setCart((c) =>
      c.map((i) => {
        if (i.medicineId !== medicineId) return i;
        const next = Math.max(1, (parseInt(i.qty, 10) || 0) + delta);
        return { ...i, qty: String(next) };
      })
    );
  }
  function removeItem(medicineId) {
    setCart((c) => c.filter((i) => i.medicineId !== medicineId));
  }
  function resetSale() {
    setCart([]);
    setCustomer(null);
    setMethod("cash");
    setReference("");
    setRxChecked(false);
    setQuery("");
    setFormError("");
  }

  function onSearchKeyDown(e) {
    if (e.key === "Enter" && results.length === 1 && (stockById.get(results[0].id) ?? 0) > 0) {
      addToCart(results[0]);
      setQuery("");
    }
  }

  async function handleComplete() {
    setFormError("");
    setNotice("");
    if (cart.length === 0) return;
    if (hasError) return setFormError("Fix the items marked in red first.");
    if (rxNeeded && !rxChecked) return setFormError("Confirm that the prescription was checked.");

    if (!keyRef.current) keyRef.current = crypto.randomUUID();
    setBusy(true);
    let saleId;
    try {
      saleId = await createSale({
        idempotencyKey: keyRef.current,
        items: lines.map((l) => ({
          medicineId: l.item.medicineId,
          quantity: l.qty,
          discountPercent: (pctToHundredths(l.item.disc) ?? 0) / 100,
        })),
        customerId: customer?.id ?? null,
        paymentMethod: method,
        paymentReference: reference.trim(),
        prescriptionChecked: rxChecked,
      });
    } catch (err) {
      setFormError(friendlyError(err));
      reload(); // stock may have changed while this cart was open
      setBusy(false);
      return;
    }

    // The sale is saved. Clear the cart, then load the receipt.
    resetSale();
    reload();
    try {
      setReceipt(await fetchSaleDetail(saleId));
    } catch {
      setNotice("The sale was saved, but the receipt could not be loaded. Find it under Invoices.");
    }
    setBusy(false);
  }

  return (
    <>
      <PageHeader title="Billing" subtitle="Search medicines, build the bill and complete the sale" />

      {notice && <p role="status" className="mb-4 rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{notice}</p>}
      {error && (
        <div role="alert" className="mb-4 flex items-center justify-between gap-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          <span>{error}</span>
          <button onClick={reload} className="rounded border border-red-300 px-2 py-1 font-medium hover:bg-red-100">Retry</button>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-5">
        {/* Search and results */}
        <section className="lg:col-span-3">
          <div className="relative mb-3">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={onSearchKeyDown}
              placeholder="Search by name, brand, generic, code or barcode"
              aria-label="Search medicines"
              className={`${inputCls} w-full pl-9`}
              autoFocus
            />
          </div>

          <div className="rounded-lg border border-slate-200 bg-white">
            {loading && medicines.length === 0 ? (
              <p className="flex items-center gap-2 p-4 text-sm text-slate-500"><Loader2 className="h-4 w-4 animate-spin" /> Loading medicines…</p>
            ) : results.length === 0 ? (
              <p className="p-4 text-sm text-slate-500">No active medicines match “{query}”.</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {results.map((m) => {
                  const stock = stockById.get(m.id) ?? 0;
                  return (
                    <li key={m.id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                      <div>
                        <p className="font-medium text-slate-900">
                          {m.name}
                          {m.rx && <span className="ml-2 rounded bg-sky-100 px-1.5 py-0.5 text-xs font-medium text-sky-800">Rx</span>}
                        </p>
                        <p className="text-xs text-slate-500">
                          {[m.brand, m.form, m.strength !== "-" ? m.strength : ""].filter(Boolean).join(" · ")}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <p className="font-medium text-slate-900">{formatMoney(m.sellingPaise)}</p>
                          <p className={`text-xs ${stock <= 0 ? "text-red-600" : "text-slate-500"}`}>
                            {stock <= 0 ? "No eligible stock" : `${stock} in stock`}
                          </p>
                        </div>
                        <button
                          onClick={() => addToCart(m)}
                          disabled={stock <= 0}
                          aria-label={`Add ${m.name} to the bill`}
                          className="rounded-md bg-brand-600 p-2 text-white hover:bg-brand-700 disabled:opacity-30"
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
          <p className="mt-2 text-xs text-slate-500">Prices exclude GST. Expired and quarantined batches are never sold.</p>
        </section>

        {/* Cart */}
        <section className="space-y-4 lg:col-span-2">
          <div className="rounded-lg border border-slate-200 bg-white">
            <h2 className="flex items-center gap-2 border-b border-slate-200 px-4 py-3 text-sm font-semibold text-slate-900">
              <ShoppingCart className="h-4 w-4" /> Current bill
            </h2>
            {lines.length === 0 ? (
              <p className="p-4 text-sm text-slate-500">The bill is empty. Add a medicine from the list.</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {lines.map(({ item, med, lineError, est }) => (
                  <li key={item.medicineId} className="space-y-2 px-4 py-3 text-sm">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-medium text-slate-900">{med?.name ?? "Unavailable medicine"}</p>
                        {est && est.lines.length > 0 && (
                          <p className="text-xs text-slate-500">
                            From {est.lines.map((l) => `${l.batch.batchNo} ×${l.take}`).join(", ")}
                          </p>
                        )}
                      </div>
                      <button onClick={() => removeItem(item.medicineId)} className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-red-600" aria-label={`Remove ${med?.name ?? "item"}`}>
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="flex items-center">
                        <button onClick={() => bump(item.medicineId, -1)} className="rounded-l-md border border-slate-300 p-1.5 hover:bg-slate-50" aria-label="Decrease quantity"><Minus className="h-3 w-3" /></button>
                        <input
                          value={item.qty}
                          onChange={(e) => updateItem(item.medicineId, { qty: e.target.value })}
                          inputMode="numeric"
                          aria-label="Quantity"
                          className="w-14 border-y border-slate-300 py-1 text-center text-sm"
                        />
                        <button onClick={() => bump(item.medicineId, 1)} className="rounded-r-md border border-slate-300 p-1.5 hover:bg-slate-50" aria-label="Increase quantity"><Plus className="h-3 w-3" /></button>
                      </div>
                      <label className="flex items-center gap-1 text-xs text-slate-500">
                        Disc %
                        <input
                          value={item.disc}
                          onChange={(e) => updateItem(item.medicineId, { disc: e.target.value })}
                          inputMode="decimal"
                          placeholder="0"
                          aria-label="Discount percent"
                          className="w-16 rounded-md border border-slate-300 px-2 py-1 text-sm text-slate-900"
                        />
                      </label>
                      <p className="ml-auto font-medium text-slate-900">{est ? formatMoney(est.total) : "—"}</p>
                    </div>
                    {lineError && <p role="alert" className="text-xs text-red-600">{lineError}</p>}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="space-y-3 rounded-lg border border-slate-200 bg-white p-4">
            <div>
              <p className="mb-1 text-xs font-medium text-slate-500">Customer</p>
              <CustomerPicker value={customer} onChange={setCustomer} />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label htmlFor="pay-method" className="text-xs font-medium text-slate-500">Payment method</label>
                <select id="pay-method" value={method} onChange={(e) => setMethod(e.target.value)} className={`${inputCls} mt-1 w-full`}>
                  {PAYMENT_METHODS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
                </select>
              </div>
              <div>
                <label htmlFor="pay-ref" className="text-xs font-medium text-slate-500">Reference (optional)</label>
                <input id="pay-ref" value={reference} maxLength={60} onChange={(e) => setReference(e.target.value)} className={`${inputCls} mt-1 w-full`} />
              </div>
            </div>
            {(method === "upi" || method === "card") && (
              <p className="rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800">
                This only records how the customer says they paid. The system does not verify UPI or card payments.
              </p>
            )}

            {rxNeeded && (
              <label className="flex items-start gap-2 rounded-md bg-sky-50 p-3 text-sm text-sky-900">
                <input type="checkbox" checked={rxChecked} onChange={(e) => setRxChecked(e.target.checked)} className="mt-0.5" />
                A medicine on this bill needs a prescription. I have checked it.
              </label>
            )}

            <dl className="space-y-1 border-t border-slate-200 pt-3 text-sm">
              <div className="flex justify-between"><dt className="text-slate-500">Subtotal</dt><dd>{formatMoney(totals.sub)}</dd></div>
              <div className="flex justify-between"><dt className="text-slate-500">Discount</dt><dd>−{formatMoney(totals.disc)}</dd></div>
              <div className="flex justify-between"><dt className="text-slate-500">GST</dt><dd>{formatMoney(totals.tax)}</dd></div>
              <div className="flex justify-between border-t border-slate-200 pt-2 text-base font-semibold text-slate-900"><dt>Total</dt><dd>{formatMoney(totals.total)}</dd></div>
            </dl>
            <p className="text-xs text-slate-500">Estimate. The database recalculates everything when the sale is completed.</p>

            {formError && <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{formError}</p>}

            <div className="flex gap-2">
              <button
                onClick={handleComplete}
                disabled={busy || cart.length === 0}
                className="flex flex-1 items-center justify-center gap-2 rounded-md bg-brand-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
              >
                {busy && <Loader2 className="h-4 w-4 animate-spin" />}
                {busy ? "Saving…" : "Complete sale"}
              </button>
              <button
                onClick={resetSale}
                disabled={busy || cart.length === 0}
                className="rounded-md border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                Cancel bill
              </button>
            </div>
          </div>

          <p className="text-xs text-slate-500">
            Past bills are under <Link to="/invoices" className="font-medium text-brand-700 hover:underline">Invoices</Link>.
          </p>
        </section>
      </div>

      {receipt && (
        <Modal title={`Invoice ${receipt.invoice}`} onClose={() => setReceipt(null)}>
          <Receipt sale={receipt} settings={settings} />
          <div className="mt-4 flex justify-end gap-2">
            <button onClick={() => window.print()} className="inline-flex items-center gap-2 rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
              <Printer className="h-4 w-4" /> Print
            </button>
            <button onClick={() => setReceipt(null)} className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700">
              New sale
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
