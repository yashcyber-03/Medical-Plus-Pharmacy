import { formatDate, formatMoney } from "../utils/format";
import { paymentLabel } from "../utils/billing";

function formatDateTime(iso) {
  return new Date(iso).toLocaleString("en-IN", {
    day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

// A printable invoice. Everything shown here was saved by the database.
export default function Receipt({ sale, settings }) {
  const s = settings ?? { name: "Medical Plus Pharmacy", address: "", phone: "", gstin: "" };
  const method = sale.payment?.method;

  return (
    <div className="print-area mx-auto max-w-md bg-white p-4 text-sm text-slate-900">
      <div className="text-center">
        <h2 className="text-lg font-semibold">{s.name}</h2>
        {s.address && <p className="text-xs text-slate-600">{s.address}</p>}
        {s.phone && <p className="text-xs text-slate-600">Phone: {s.phone}</p>}
        {s.gstin && <p className="text-xs text-slate-600">GSTIN: {s.gstin}</p>}
      </div>

      <div className="my-3 border-y border-dashed border-slate-300 py-2 text-xs">
        <div className="flex justify-between"><span>Invoice</span><strong>{sale.invoice}</strong></div>
        <div className="flex justify-between"><span>Date</span><span>{formatDateTime(sale.at)}</span></div>
        <div className="flex justify-between"><span>Cashier</span><span>{sale.cashier}</span></div>
        <div className="flex justify-between">
          <span>Customer</span>
          <span>{sale.customerName || "Walk-in customer"}{sale.customerPhone && ` · ${sale.customerPhone}`}</span>
        </div>
      </div>

      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-slate-300 text-left">
            <th className="pb-1 font-medium">Item</th>
            <th className="pb-1 text-right font-medium">Qty</th>
            <th className="pb-1 text-right font-medium">Amount</th>
          </tr>
        </thead>
        <tbody>
          {sale.items.map((i) => (
            <tr key={i.id} className="align-top">
              <td className="py-1.5 pr-2">
                <p className="font-medium">{i.name}</p>
                {i.allocations.map((a, idx) => (
                  <p key={idx} className="text-[11px] text-slate-500">
                    Batch {a.batchNo}{a.expiry && ` (exp ${formatDate(a.expiry)})`}: {a.qty} × {formatMoney(a.unitPaise)}
                  </p>
                ))}
                {i.discountPaise > 0 && (
                  <p className="text-[11px] text-slate-500">Discount {i.discountPercent}%: −{formatMoney(i.discountPaise)}</p>
                )}
                <p className="text-[11px] text-slate-500">GST {i.gstPercent}%: {formatMoney(i.taxPaise)}</p>
              </td>
              <td className="py-1.5 text-right">{i.qty}</td>
              <td className="py-1.5 text-right">{formatMoney(i.totalPaise)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="mt-2 space-y-0.5 border-t border-dashed border-slate-300 pt-2 text-xs">
        <div className="flex justify-between"><span>Subtotal</span><span>{formatMoney(sale.subtotalPaise)}</span></div>
        {sale.discountPaise > 0 && (
          <div className="flex justify-between"><span>Discount</span><span>−{formatMoney(sale.discountPaise)}</span></div>
        )}
        <div className="flex justify-between"><span>GST</span><span>{formatMoney(sale.taxPaise)}</span></div>
        <div className="flex justify-between border-t border-slate-300 pt-1 text-sm font-semibold">
          <span>Total</span><span>{formatMoney(sale.totalPaise)}</span>
        </div>
      </div>

      {sale.payment && (
        <p className="mt-3 text-xs">
          Payment recorded as <strong>{paymentLabel(method)}</strong>
          {sale.payment.reference && ` (ref: ${sale.payment.reference})`}.
          {(method === "upi" || method === "card") && " This is a record only; the payment was not verified by this system."}
        </p>
      )}
      {sale.prescriptionChecked && <p className="mt-1 text-xs">Prescription checked by staff.</p>}
      <p className="mt-3 text-center text-[11px] text-slate-500">Prices exclude GST; GST is added per item. Thank you.</p>
    </div>
  );
}
