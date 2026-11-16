import { LogOut, Menu, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { useAuth } from "../context/AuthContext";

export default function Topbar({ onMenuClick, collapsed, onToggleCollapse }) {
  const { profile, session, signOut } = useAuth();
  const name = profile?.full_name || profile?.email || session?.user?.email || "User";
  const initials = name
    .split(/[\s@.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join("");
  const roleLabel = profile?.role === "admin" ? "Administrator" : "Pharmacist";
  const CollapseIcon = collapsed ? PanelLeftOpen : PanelLeftClose;

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-white/60 bg-white/70 px-4 backdrop-blur">
      <div className="flex items-center gap-2">
        <button onClick={onMenuClick} className="rounded p-2 text-slate-600 hover:bg-slate-100 lg:hidden" aria-label="Open menu">
          <Menu className="h-5 w-5" />
        </button>
        <button
          onClick={onToggleCollapse}
          className="hidden rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900 lg:block"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <CollapseIcon className="h-5 w-5" />
        </button>
        <p className="hidden text-sm text-slate-500 sm:block">Pharmacy management</p>
      </div>

      <div className="flex items-center gap-3">
        <div className="text-right">
          <p className="max-w-[160px] truncate text-sm font-medium text-slate-900">{name}</p>
          <p className="text-xs text-slate-500">{roleLabel}</p>
        </div>
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-100 text-sm font-semibold text-emerald-800">
          {initials || "U"}
        </span>
        <button onClick={signOut} className="rounded-lg border border-slate-300 bg-white/80 p-2 text-slate-600 hover:bg-white" aria-label="Sign out" title="Sign out">
          <LogOut className="h-4 w-4" />
        </button>
      </div>
    </header>
  );
}
