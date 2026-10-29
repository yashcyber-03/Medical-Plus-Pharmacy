import { Routes, Route } from "react-router-dom";
import AppLayout from "./layouts/AppLayout";
import Dashboard from "./pages/Dashboard";
import Medicines from "./pages/Medicines";
import Placeholder from "./pages/Placeholder";
import NotFound from "./pages/NotFound";
import { navItems } from "./config/navigation";

export default function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<Dashboard />} />
        <Route path="medicines" element={<Medicines />} />

        {/* Pages that are not built yet show a placeholder */}
        {navItems
          .filter((item) => !item.ready)
          .map((item) => (
            <Route
              key={item.to}
              path={item.to.slice(1)}
              element={<Placeholder title={item.label} phase={item.phase} />}
            />
          ))}

        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
