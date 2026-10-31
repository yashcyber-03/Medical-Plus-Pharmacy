import { useEffect, useState } from "react";
import { Loader2, UserPlus, X } from "lucide-react";
import { createCustomer, searchCustomers } from "../services/customerService";
import { friendlyError } from "../services/errors";

const inputCls = "w-full rounded-md border border-slate-300 px-3 py-2 text-sm";

// Pick an existing customer, add a new one, or leave empty for a walk-in sale.
export default function CustomerPicker({ value, onChange }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ name: "", phone: "", email: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      setSearching(false);
      return;
    }
    let cancelled = false;
    setSearching(true);
    const timer = setTimeout(async () => {
      try {
        const found = await searchCustomers(query);
        if (!cancelled) setResults(found);
      } catch {
        if (!cancelled) setResults([]);
      } finally {
        if (!cancelled) setSearching(false);
      }
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query]);

  function choose(customer) {
    onChange(customer);
    setQuery("");
    setResults([]);
    setAdding(false);
  }

  async function handleAdd(e) {
    e.preventDefault();
    setError("");
    if (!form.name.trim()) return setError("Enter the customer's name.");
    if (form.phone.trim() && !/^[0-9+ -]{7,15}$/.test(form.phone.trim())) {
      return setError("Phone must be 7 to 15 digits (you may use + - and spaces).");
    }
    if (form.email.trim() && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.email.trim())) {
      return setError("Enter a valid email address, or leave it empty.");
    }
    setBusy(true);
    try {
      const created = await createCustomer(form);
      setForm({ name: "", phone: "", email: "" });
      choose(created);
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setBusy(false);
    }
  }

  if (value) {
    return (
      <div className="flex items-center justify-between rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
        <div>
          <p className="font-medium text-slate-900">{value.name}</p>
          {value.phone && <p className="text-xs text-slate-500">{value.phone}</p>}
        </div>
        <button onClick={() => onChange(null)} className="rounded p-1 text-slate-500 hover:bg-slate-200" aria-label="Remove customer">
          <X className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="relative">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Walk-in customer. Search by name or phone"
          aria-label="Search customers"
          className={inputCls}
        />
        {searching && <Loader2 className="absolute right-3 top-2.5 h-4 w-4 animate-spin text-slate-400" />}
      </div>

      {results.length > 0 && (
        <ul className="divide-y divide-slate-100 rounded-md border border-slate-200 bg-white text-sm">
          {results.map((c) => (
            <li key={c.id}>
              <button onClick={() => choose(c)} className="w-full px-3 py-2 text-left hover:bg-slate-50">
                <span className="font-medium text-slate-900">{c.name}</span>
                {c.phone && <span className="ml-2 text-xs text-slate-500">{c.phone}</span>}
              </button>
            </li>
          ))}
        </ul>
      )}

      {!adding ? (
        <button onClick={() => setAdding(true)} className="inline-flex items-center gap-1 text-xs font-medium text-brand-700 hover:underline">
          <UserPlus className="h-3 w-3" /> Add a new customer
        </button>
      ) : (
        <form onSubmit={handleAdd} noValidate className="space-y-2 rounded-md border border-slate-200 p-3">
          <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Name *" aria-label="Customer name" className={inputCls} />
          <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="Phone (optional)" aria-label="Customer phone" className={inputCls} />
          <input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="Email (optional)" aria-label="Customer email" className={inputCls} />
          {error && <p role="alert" className="text-xs text-red-600">{error}</p>}
          <div className="flex gap-2">
            <button type="submit" disabled={busy} className="flex items-center gap-1 rounded-md bg-brand-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-700 disabled:opacity-60">
              {busy && <Loader2 className="h-3 w-3 animate-spin" />} Save customer
            </button>
            <button type="button" onClick={() => { setAdding(false); setError(""); }} className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50">
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
