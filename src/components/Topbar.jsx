import { Menu } from "lucide-react";

export default function Topbar({ onMenuClick }) {
  return (
    <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-slate-200 bg-white px-4">
      <button onClick={onMenuClick} className="rounded p-2 text-slate-600 hover:bg-slate-100 lg:hidden" aria-label="Open menu">
        <Menu className="h-5 w-5" />
      </button>
      <p className="hidden text-sm text-slate-500 lg:block">Pharmacy management</p>

      {/* Placeholder user - replaced by the real logged-in user in Phase 3 */}
      <div className="flex items-center gap-3">
        <div className="text-right">
          <p className="text-sm font-medium text-slate-900">Demo User</p>
          <p className="text-xs text-slate-500">Not signed in (preview)</p>
        </div>
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-100 text-sm font-semibold text-brand-700">
          DU
        </span>
      </div>
    </header>
  );
}
