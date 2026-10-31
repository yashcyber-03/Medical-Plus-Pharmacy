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

// ready: true      -> page is built; otherwise a placeholder is shown
// phase            -> when the page will be built
// adminOnly: true  -> hidden from pharmacists and blocked by ProtectedRoute
//                     (real enforcement comes from database RLS)
export const navItems = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, ready: true },
  { to: "/medicines", label: "Medicines", icon: Pill, ready: true },
  { to: "/billing", label: "Billing (POS)", icon: ShoppingCart, ready: true },
  { to: "/invoices", label: "Invoices", icon: FileText, ready: true },
  { to: "/suppliers", label: "Suppliers", icon: Truck, phase: 6 },
  { to: "/purchase-orders", label: "Purchase orders", icon: ClipboardList, phase: 6 },
  { to: "/goods-receipt", label: "Goods receipt", icon: PackageCheck, phase: 6 },
  { to: "/inventory-movements", label: "Inventory movements", icon: ArrowLeftRight, ready: true },
  { to: "/stock-alerts", label: "Stock alerts", icon: BellRing, ready: true },
  { to: "/customers", label: "Customers", icon: Users, phase: "5 (next part)" },
  { to: "/returns", label: "Sales returns", icon: Undo2, phase: 7 },
  { to: "/reports", label: "Reports", icon: BarChart3, phase: 7, adminOnly: true },
  { to: "/staff", label: "Staff & roles", icon: ShieldCheck, phase: 3, adminOnly: true },
  { to: "/settings", label: "Settings", icon: Settings, phase: 3, adminOnly: true },
];
