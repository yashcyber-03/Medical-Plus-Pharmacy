import { Navigate, useLocation } from "react-router-dom";
import { Loader2, ShieldAlert } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { isSupabaseConfigured } from "../services/supabaseClient";
import AuthCard from "./AuthCard";

function Spinner() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <Loader2 className="h-6 w-6 animate-spin text-brand-600" aria-label="Loading" />
    </div>
  );
}

// Wrap a page in <ProtectedRoute> to require login.
// Add roles={["admin"]} to also require a specific role.
// NOTE: this only controls what the screen shows. The real security is
// Row Level Security in the database.
export default function ProtectedRoute({ children, roles }) {
  const { session, profile, loading, waitingForProfile, signOut } = useAuth();
  const location = useLocation();

  if (!isSupabaseConfigured) {
    return (
      <AuthCard title="Database not configured" subtitle="Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to .env.local (and to Vercel), then restart the app." />
    );
  }
  if (loading || waitingForProfile) return <Spinner />;
  if (!session) return <Navigate to="/login" replace state={{ from: location }} />;

  if (!profile || !profile.is_active) {
    return (
      <AuthCard
        title="No access"
        subtitle="Your account has no active staff profile. Ask the pharmacy administrator to activate it."
      >
        <button onClick={signOut} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
          Sign out
        </button>
      </AuthCard>
    );
  }

  if (roles && !roles.includes(profile.role)) {
    return (
      <div className="py-20 text-center">
        <ShieldAlert className="mx-auto h-8 w-8 text-slate-400" />
        <h1 className="mt-3 text-xl font-semibold text-slate-900">Not allowed</h1>
        <p className="mt-1 text-sm text-slate-500">Your role doesn't have permission to open this page.</p>
      </div>
    );
  }

  return children;
}
