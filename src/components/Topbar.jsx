import { Menu, LogOut } from "lucide-react";
import { useAuth } from "../context/AuthContext";

export default function Topbar({ onMenuClick }) {
  const { profile, session, signOut } = useAuth();
  const name = profile?.full_name || profile?.email || session?.user?.email || "User";
  const initials = name
    .split(/[\s@.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join("");
  const roleLabel = profile?.role === "admin" ? "Administrator" : "Pharmacist";

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-slate-200 bg-white px-4">
      <button onClick={onMenuClick} className="rounded p-2 text-slate-600 hover:bg-slate-100 lg:hidden" aria-label="Open menu">
        <Menu className="h-5 w-5" />
      </button>
      <p className="hidden text-sm text-slate-500 lg:block">Pharmacy management</p>

      <div className="flex items-center gap-3">
        <div className="text-right">
          <p className="max-w-[160px] truncate text-sm font-medium text-slate-900">{name}</p>
          <p className="text-xs text-slate-500">{roleLabel}</p>
        </div>
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-100 text-sm font-semibold text-brand-700">
          {initials || "U"}
        </span>
        <button onClick={signOut} className="rounded-md border border-slate-300 p-2 text-slate-600 hover:bg-slate-50" aria-label="Sign out" title="Sign out">
          <LogOut className="h-4 w-4" />
        </button>
      </div>
    </header>
  );
}
