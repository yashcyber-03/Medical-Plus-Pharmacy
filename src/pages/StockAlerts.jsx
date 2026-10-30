import { useMemo, useState } from "react";
import { Loader2, PackagePlus, Settings2 } from "lucide-react";
import PageHeader from "../components/PageHeader";
import StatusBadge from "../components/StatusBadge";
import Modal from "../components/Modal";
import AddBatchForm from "../components/AddBatchForm";
import BatchStatusForm from "../components/BatchStatusForm";
import { useInventoryData } from "../hooks/useInventoryData";
import { useAuth } from "../context/AuthContext";
import { getBatchStatus, getEligibleStock, getStockStatus } from "../utils/inventory";
import { formatDate, daysUntil } from "../utils/format";

function Section({ title, count, hint, children }) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white">
      <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
          {hint && <p className="text-xs text-slate-500">{hint}</p>}
        </div>
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">{count}</span>
      </div>
      {count === 0 ? <p className="p-4 text-sm text-slate-500">Nothing here. All good.</p> : <ul className="divide-y divide-slate-100">{children}</ul>}
    </section>
  );
}

export default function StockAlerts() {
  const { isAdmin } = useAuth();
  const { medicines, batches, loading, error, reload } = useInventoryData();
  const [modal, setModal] = useState(null); // { type: "batch" | "stock", ... }
  const [notice, setNotice] = useState("");

  const nameOf = (id) => medicines.find((m) => m.id === id)?.name ?? "Unknown medicine";

  const groups = useMemo(() => {
    const low = medicines
      .filter((m) => m.active)
      .map((m) => ({ m, stock: getEligibleStock(batches, m.id) }))
      .filter(({ m, stock }) => getStockStatus(stock, m.reorder) !== "healthy")
      .sort((a, b) => a.stock - b.stock);
    const withStatus = batches.map((b) => ({ ...b, st: getBatchStatus(b) }));
    return {
      low,
      expired: withStatus.filter((b) => b.st === "expired"),
      near: withStatus.filter((b) => b.st === "near-expiry").sort((a, b) => a.expiry.localeCompare(b.expiry)),
      quarantined: withStatus.filter((b) => b.st === "quarantined"),
    };
  }, [medicines, batches]);

  function handleSaved(message) {
    setModal(null);
    setNotice(message);
    reload();
  }

  const BatchRow = ({ b }) => {
    const days = daysUntil(b.expiry);
    return (
      <li className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
        <div>
          <p className="font-medium text-slate-900">{nameOf(b.medicineId)}</p>
          <p className="text-xs text-slate-500">
            Batch {b.batchNo} · {b.qty} units · expires {formatDate(b.expiry)}
            {b.st === "near-expiry" && ` (${days} day${days === 1 ? "" : "s"} left)`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge status={b.st} />
          {isAdmin && (
            <button
              onClick={() => { setNotice(""); setModal({ type: "batch", batch: b }); }}
              className="inline-flex items-center gap-1 rounded border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
            >
              <Settings2 className="h-3 w-3" /> Manage
            </button>
          )}
        </div>
      </li>
    );
  };

  return (
    <>
      <PageHeader title="Stock alerts" subtitle="Expired, near-expiry, quarantined and low-stock items" />

      {notice && <p role="status" className="mb-4 rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{notice}</p>}
      {error && (
        <div role="alert" className="mb-4 flex items-center justify-between gap-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          <span>{error}</span>
          <button onClick={reload} className="rounded border border-red-300 px-2 py-1 font-medium hover:bg-red-100">Retry</button>
        </div>
      )}
      {loading && (
        <p className="mb-4 flex items-center gap-2 text-sm text-slate-500"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</p>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <Section title="Expired batches" count={groups.expired.length} hint="Not sold. Quarantine or dispose.">
          {groups.expired.map((b) => <BatchRow key={b.id} b={b} />)}
        </Section>

        <Section title="Near expiry" count={groups.near.length} hint="Within 90 days. Sold first (FEFO).">
          {groups.near.map((b) => <BatchRow key={b.id} b={b} />)}
        </Section>

        <Section title="Quarantined" count={groups.quarantined.length} hint="Held back from sale.">
          {groups.quarantined.map((b) => <BatchRow key={b.id} b={b} />)}
        </Section>

        <Section title="Low stock" count={groups.low.length} hint="Eligible stock at or below the reorder level.">
          {groups.low.map(({ m, stock }) => (
            <li key={m.id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
              <div>
                <p className="font-medium text-slate-900">{m.name}</p>
                <p className="text-xs text-slate-500">{stock} eligible · reorder level {m.reorder}</p>
              </div>
              <div className="flex items-center gap-2">
                <StatusBadge status={stock <= 0 ? "out-of-stock" : "low-stock"} />
                {isAdmin && (
                  <button
                    onClick={() => { setNotice(""); setModal({ type: "stock", medicine: m }); }}
                    className="inline-flex items-center gap-1 rounded border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                  >
                    <PackagePlus className="h-3 w-3" /> Add stock
                  </button>
                )}
              </div>
            </li>
          ))}
        </Section>
      </div>

      {modal?.type === "batch" && (
        <Modal title="Manage batch" onClose={() => setModal(null)}>
          <BatchStatusForm
            batch={modal.batch}
            medicineName={nameOf(modal.batch.medicineId)}
            onDone={handleSaved}
            onCancel={() => setModal(null)}
          />
        </Modal>
      )}
      {modal?.type === "stock" && (
        <Modal title="Add stock batch" onClose={() => setModal(null)}>
          <AddBatchForm medicine={modal.medicine} onSaved={handleSaved} onCancel={() => setModal(null)} />
        </Modal>
      )}
    </>
  );
}
