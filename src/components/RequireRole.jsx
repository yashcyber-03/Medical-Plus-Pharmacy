import { ShieldAlert } from "lucide-react";
import { useAuth } from "../context/AuthContext";

// Shows a page only to users with the given role.
// Hiding a page is for usability only; the database still enforces access.
export default function RequireRole({ role, children }) {
  const { profile } = useAuth();
  if (profile?.role !== role) {
    return (
      <div className="py-20 text-center">
        <ShieldAlert className="mx-auto h-8 w-8 text-slate-400" />
        <h1 className="mt-3 text-xl font-semibold text-slate-900">No access</h1>
        <p className="mt-1 text-sm text-slate-500">This page is for administrators only.</p>
      </div>
    );
  }
  return children;
}
