import {
  LayoutDashboard,
  Pill,
  ShoppingCart,
  FileText,
  Truck,
  ClipboardList,
  PackageCheck,
  ArrowLeftRight,
  BellRing,
  Users,
  Undo2,
  BarChart3,
  ShieldCheck,
  Settings,
} from "lucide-react";

// "ready: true" means the page is built. Others show a placeholder.
// "phase" tells you when that page will be implemented.
// "adminOnly: true" means only administrators see and can open the page.
export const navItems = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, ready: true },
  { to: "/medicines", label: "Medicines", icon: Pill, ready: true },
  { to: "/billing", label: "Billing (POS)", icon: ShoppingCart, phase: 5 },
  { to: "/invoices", label: "Invoices", icon: FileText, phase: 5 },
  { to: "/suppliers", label: "Suppliers", icon: Truck, phase: 6 },
  { to: "/purchase-orders", label: "Purchase orders", icon: ClipboardList, phase: 6 },
  { to: "/goods-receipt", label: "Goods receipt", icon: PackageCheck, phase: 6 },
  { to: "/inventory-movements", label: "Inventory movements", icon: ArrowLeftRight, phase: 4 },
  { to: "/stock-alerts", label: "Stock alerts", icon: BellRing, phase: 4 },
  { to: "/customers", label: "Customers", icon: Users, phase: 5 },
  { to: "/returns", label: "Sales returns", icon: Undo2, phase: 7 },
  { to: "/reports", label: "Reports", icon: BarChart3, phase: 7 },
  { to: "/staff", label: "Staff & roles", icon: ShieldCheck, phase: 3, adminOnly: true },
  { to: "/settings", label: "Settings", icon: Settings, phase: 3, adminOnly: true },
];
