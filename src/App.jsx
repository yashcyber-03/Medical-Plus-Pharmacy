import { Routes, Route } from "react-router-dom";
import AppLayout from "./layouts/AppLayout";
import ProtectedRoute from "./components/ProtectedRoute";
import Login from "./pages/Login";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import Dashboard from "./pages/Dashboard";
import Medicines from "./pages/Medicines";
import StockAlerts from "./pages/StockAlerts";
import InventoryMovements from "./pages/InventoryMovements";
import Billing from "./pages/Billing";
import Invoices from "./pages/Invoices";
import Suppliers from "./pages/Suppliers";
import PurchaseOrders from "./pages/PurchaseOrders";
import GoodsReceipts from "./pages/GoodsReceipts";
import Placeholder from "./pages/Placeholder";
import NotFound from "./pages/NotFound";
import { navItems } from "./config/navigation";

export default function App() {
  return (
    <Routes>
      {/* Public pages */}
      <Route path="/login" element={<Login />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />

      {/* Everything below requires login */}
      <Route
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="medicines" element={<Medicines />} />
        <Route path="stock-alerts" element={<StockAlerts />} />
        <Route path="inventory-movements" element={<InventoryMovements />} />
        <Route path="billing" element={<Billing />} />
        <Route path="invoices" element={<Invoices />} />
        <Route path="suppliers" element={<ProtectedRoute roles={["admin"]}><Suppliers /></ProtectedRoute>} />
        <Route path="purchase-orders" element={<ProtectedRoute roles={["admin"]}><PurchaseOrders /></ProtectedRoute>} />
        <Route path="goods-receipt" element={<ProtectedRoute roles={["admin"]}><GoodsReceipts /></ProtectedRoute>} />

        {navItems
          .filter((item) => !item.ready)
          .map((item) => (
            <Route
              key={item.to}
              path={item.to.slice(1)}
              element={
                <ProtectedRoute roles={item.adminOnly ? ["admin"] : undefined}>
                  <Placeholder title={item.label} phase={item.phase} />
                </ProtectedRoute>
              }
            />
          ))}

        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
