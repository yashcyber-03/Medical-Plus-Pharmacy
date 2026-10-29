import { Routes, Route } from "react-router-dom";
import AppLayout from "./layouts/AppLayout";
import ProtectedRoute from "./components/ProtectedRoute";
import RequireRole from "./components/RequireRole";
import Dashboard from "./pages/Dashboard";
import Medicines from "./pages/Medicines";
import Placeholder from "./pages/Placeholder";
import NotFound from "./pages/NotFound";
import Login from "./pages/Login";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import { navItems } from "./config/navigation";

export default function App() {
  return (
    <Routes>
      {/* Public pages */}
      <Route path="/login" element={<Login />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />

      {/* Everything below needs a signed-in, active staff member */}
      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="medicines" element={<Medicines />} />

          {navItems
            .filter((item) => !item.ready)
            .map((item) => {
              const page = <Placeholder title={item.label} phase={item.phase} />;
              return (
                <Route
                  key={item.to}
                  path={item.to.slice(1)}
                  element={item.adminOnly ? <RequireRole role="admin">{page}</RequireRole> : page}
                />
              );
            })}

          <Route path="*" element={<NotFound />} />
        </Route>
      </Route>
    </Routes>
  );
}
