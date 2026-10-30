import { useState } from "react";
import { Link, Navigate, useLocation } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { isSupabaseConfigured } from "../services/supabaseClient";
import AuthCard from "../components/AuthCard";

const inputCls =
  "mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-600";

export default function Login() {
  const { session, signIn } = useAuth();
  const location = useLocation();
  const from = location.state?.from?.pathname ?? "/";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  if (session) return <Navigate to={from} replace />;

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (!isSupabaseConfigured) {
      setError("The database is not configured yet. Check your environment variables.");
      return;
    }
    if (!email.trim() || !password) {
      setError("Enter your email and password.");
      return;
    }
    setBusy(true);
    const { error: err } = await signIn(email.trim(), password);
    setBusy(false);
    // Same message for every failure so attackers can't tell which part was wrong
    if (err) setError("Invalid email or password.");
  }

  return (
    <AuthCard
      title="Sign in"
      subtitle="Pharmacy staff only"
      footer={<Link to="/forgot-password" className="font-medium text-brand-700 hover:underline">Forgot password?</Link>}
    >
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <div>
          <label htmlFor="email" className="text-sm font-medium text-slate-700">Email</label>
          <input id="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} />
        </div>
        <div>
          <label htmlFor="password" className="text-sm font-medium text-slate-700">Password</label>
          <input id="password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} className={inputCls} />
        </div>
        {error && <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        <button
          type="submit"
          disabled={busy}
          className="flex w-full items-center justify-center gap-2 rounded-md bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
        >
          {busy && <Loader2 className="h-4 w-4 animate-spin" />}
          {busy ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </AuthCard>
  );
}
