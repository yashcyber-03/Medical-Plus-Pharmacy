import { useState } from "react";
import PageHeader from "../components/PageHeader";
import SalesSummaryReport from "../components/reports/SalesSummaryReport";
import BestSellersReport from "../components/reports/BestSellersReport";
import StockValuationReport from "../components/reports/StockValuationReport";
import BatchReport from "../components/reports/BatchReport";
import AdjustmentsReport from "../components/reports/AdjustmentsReport";
import PurchasesReport from "../components/reports/PurchasesReport";
import { todayIso } from "../utils/format";

const TABS = [
  { id: "sales", label: "Sales and profit", usesRange: true },
  { id: "best", label: "Best sellers", usesRange: true },
  { id: "stock", label: "Stock and valuation", usesRange: false },
  { id: "batches", label: "Batches and expiry", usesRange: false },
  { id: "adjustments", label: "Adjustments", usesRange: true },
  { id: "purchases", label: "Purchases", usesRange: true },
];

function monthStartIso() {
  const t = todayIso();
  return `${t.slice(0, 8)}01`;
}

function daysAgoIso(days) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
}

export default function Reports() {
  const [tab, setTab] = useState("sales");
  const [from, setFrom] = useState(monthStartIso());
  const [to, setTo] = useState(todayIso());

  const active = TABS.find((t) => t.id === tab);
  const rangeValid = from && to && from <= to;
  const inputCls = "rounded-md border border-slate-300 bg-white px-3 py-2 text-sm";

  function preset(nextFrom, nextTo) {
    setFrom(nextFrom);
    setTo(nextTo);
  }

  return (
    <>
      <PageHeader title="Reports" subtitle="Sales, stock and purchasing reports. Administrators only." />

      <div role="tablist" aria-label="Reports" className="mb-4 flex flex-wrap gap-1 border-b border-slate-200">
        {TABS.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={`-mb-px border-b-2 px-3 py-2 text-sm font-medium ${
              tab === t.id ? "border-brand-600 text-brand-700" : "border-transparent text-slate-600 hover:text-slate-900"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {active.usesRange ? (
        <div className="mb-4 flex flex-wrap items-end gap-3">
          <label className="text-xs font-medium text-slate-500">From
            <input type="date" value={from} max={to || undefined} onChange={(e) => setFrom(e.target.value)} className={`${inputCls} mt-1 block`} />
          </label>
          <label className="text-xs font-medium text-slate-500">To
            <input type="date" value={to} min={from || undefined} max={todayIso()} onChange={(e) => setTo(e.target.value)} className={`${inputCls} mt-1 block`} />
          </label>
          <div className="flex gap-2">
            <button onClick={() => preset(todayIso(), todayIso())} className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">Today</button>
            <button onClick={() => preset(daysAgoIso(29), todayIso())} className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">Last 30 days</button>
            <button onClick={() => preset(monthStartIso(), todayIso())} className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">This month</button>
          </div>
        </div>
      ) : (
        <p className="mb-4 text-xs text-slate-500">This report shows the position as of now, so the date range does not apply.</p>
      )}

      {active.usesRange && !rangeValid ? (
        <p role="alert" className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">Choose a start date that is on or before the end date.</p>
      ) : (
        <>
          {tab === "sales" && <SalesSummaryReport from={from} to={to} />}
          {tab === "best" && <BestSellersReport from={from} to={to} />}
          {tab === "stock" && <StockValuationReport />}
          {tab === "batches" && <BatchReport />}
          {tab === "adjustments" && <AdjustmentsReport from={from} to={to} />}
          {tab === "purchases" && <PurchasesReport from={from} to={to} />}
        </>
      )}
    </>
  );
}
