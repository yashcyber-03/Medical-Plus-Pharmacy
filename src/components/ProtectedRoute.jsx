import { Navigate, Outlet, useLocation } from "react-router-dom";
import { Loader2, AlertTriangle } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { isSupabaseConfigured } from "../services/supabaseClient";

function FullPageMessage({ children }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
      <div className="max-w-md rounded-lg border border-slate-200 bg-white p-6 text-center">{children}</div>
    </div>
  );
}

// Wraps every page that needs a logged-in staff member.
// NOTE: this only controls what the browser shows. The real protection is
// Row Level Security in the database.
export default function ProtectedRoute() {
  const { session, profile, profileError, loading, signOut } = useAuth();
  const location = useLocation();

  if (!isSupabaseConfigured) {
    return (
      <FullPageMessage>
        <AlertTriangle className="mx-auto h-8 w-8 text-amber-500" />
        <h1 className="mt-3 text-lg font-semibold text-slate-900">Database not connected</h1>
        <p className="mt-2 text-sm text-slate-600">
          Set <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code>, then restart or redeploy.
        </p>
      </FullPageMessage>
    );
  }

  if (loading) {
    return (
      <FullPageMessage>
        <Loader2 className="mx-auto h-6 w-6 animate-spin text-brand-600" />
        <p className="mt-3 text-sm text-slate-600">Loading your account…</p>
      </FullPageMessage>
    );
  }

  if (!session) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (!profile) {
    return (
      <FullPageMessage>
        <AlertTriangle className="mx-auto h-8 w-8 text-amber-500" />
        <h1 className="mt-3 text-lg font-semibold text-slate-900">Can't open your account</h1>
        <p className="mt-2 text-sm text-slate-600">
          {profileError || "Your staff profile could not be loaded."}
        </p>
        <button onClick={signOut} className="mt-4 rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700">
          Sign out
        </button>
      </FullPageMessage>
    );
  }

  return <Outlet />;
}
