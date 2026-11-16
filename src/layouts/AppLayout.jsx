import { useState } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import Topbar from "../components/Topbar";
import ConfigBanner from "../components/ConfigBanner";

export default function AppLayout() {
  const [menuOpen, setMenuOpen] = useState(false);
  // Remember whether the person likes the narrow icon rail
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem("sidebar-collapsed") === "1";
    } catch {
      return false;
    }
  });

  function toggleCollapsed() {
    setCollapsed((c) => {
      const next = !c;
      try {
        localStorage.setItem("sidebar-collapsed", next ? "1" : "0");
      } catch {
        /* storage unavailable: the choice just lasts for this visit */
      }
      return next;
    });
  }

  return (
    <div className="min-h-screen">
      <Sidebar open={menuOpen} onClose={() => setMenuOpen(false)} collapsed={collapsed} />
      <div className={`transition-all duration-200 motion-reduce:transition-none ${collapsed ? "lg:pl-[76px]" : "lg:pl-64"}`}>
        <ConfigBanner />
        <Topbar onMenuClick={() => setMenuOpen(true)} collapsed={collapsed} onToggleCollapse={toggleCollapsed} />
        <main className="mx-auto max-w-7xl p-4 sm:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
