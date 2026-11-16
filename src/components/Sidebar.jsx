import { NavLink } from "react-router-dom";
import { Cross, X } from "lucide-react";
import { navItems } from "../config/navigation";
import { useAuth } from "../context/AuthContext";

// Dark-green rail. On large screens it can shrink to icons only (labels appear
// as a tooltip on hover). On phones it is a slide-out menu with full labels.
export default function Sidebar({ open, onClose, collapsed }) {
  const { isAdmin } = useAuth();
  const visibleItems = navItems.filter((item) => !item.adminOnly || isAdmin);

  return (
    <>
      {open && <div className="fixed inset-0 z-30 bg-slate-900/40 lg:hidden" onClick={onClose} aria-hidden="true" />}

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col bg-emerald-950 text-emerald-50 transition-all duration-200 motion-reduce:transition-none lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        } ${collapsed ? "lg:w-[76px]" : "lg:w-64"}`}
        aria-label="Main navigation"
      >
        <div className={`flex h-16 items-center justify-between px-4 ${collapsed ? "lg:justify-center lg:px-0" : ""}`}>
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-400 text-emerald-950">
              <Cross className="h-5 w-5" />
            </span>
            <span className={`text-lg font-semibold text-white ${collapsed ? "lg:hidden" : ""}`}>Medical Plus</span>
          </div>
          <button onClick={onClose} className="rounded p-1 text-emerald-100 hover:bg-white/10 lg:hidden" aria-label="Close menu">
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3 pb-4 pt-2">
          {visibleItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === "/"}
              onClick={onClose}
              title={label}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors motion-reduce:transition-none ${
                  collapsed ? "lg:justify-center lg:px-0" : ""
                } ${isActive ? "bg-emerald-400 text-emerald-950" : "text-emerald-100/80 hover:bg-white/10 hover:text-white"}`
              }
            >
              <Icon className="h-5 w-5 shrink-0" aria-hidden="true" />
              <span className={collapsed ? "lg:sr-only" : ""}>{label}</span>
            </NavLink>
          ))}
        </nav>
      </aside>
    </>
  );
}
