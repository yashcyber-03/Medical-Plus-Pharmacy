import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import AuthCard from "../components/AuthCard";
import { useAuth } from "../context/AuthContext";
import { isSupabaseConfigured } from "../services/supabaseClient";

export default function Login() {
  const { session, profile, loading, signIn, profileError } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const redirectTo = location.state?.from?.pathname ?? "/";
  const notice = location.state?.notice;

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Once logged in and the profile is loaded, go to the dashboard
  useEffect(() => {
    if (!loading && session && profile) navigate(redirectTo, { replace: true });
  }, [loading, session, profile, navigate, redirectTo]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (!email.trim() || !password) {
      setError("Enter your email and password.");
      return;
    }
    setSubmitting(true);
    const { error: signInError } = await signIn(email.trim(), password);
    setSubmitting(false);
    if (signInError) setError("Email or password is incorrect.");
  }

  const inputCls = "mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm";

  return (
    <AuthCard title="Sign in" subtitle="Use the account given to you by the pharmacy administrator.">
      {!isSupabaseConfigured && (
        <p className="mb-4 rounded-md bg-amber-50 p-3 text-sm text-amber-900">
          Database not connected. Set the Supabase environment variables first.
        </p>
      )}
      {notice && <p className="mb-4 rounded-md bg-emerald-50 p-3 text-sm text-emerald-800">{notice}</p>}
      {(error || profileError) && (
        <p role="alert" className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700">
          {error || profileError}
        </p>
      )}

      <form onSubmit={handleSubmit} noValidate>
        <label className="block text-sm font-medium text-slate-700">
          Email
          <input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} />
        </label>
        <label className="mt-4 block text-sm font-medium text-slate-700">
          Password
          <input type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} className={inputCls} />
        </label>
        <button
          type="submit"
          disabled={submitting || !isSupabaseConfigured}
          className="mt-5 w-full rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
        >
          {submitting ? "Signing in…" : "Sign in"}
        </button>
      </form>

      <p className="mt-4 text-center text-sm">
        <Link to="/forgot-password" className="text-brand-700 hover:underline">Forgot password?</Link>
      </p>
    </AuthCard>
  );
}
