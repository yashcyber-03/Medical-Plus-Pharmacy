import { useState } from "react";
import { Link } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { isSupabaseConfigured } from "../services/supabaseClient";
import AuthCard from "../components/AuthCard";

export default function ForgotPassword() {
  const { sendPasswordReset } = useAuth();
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (!isSupabaseConfigured) {
      setError("The database is not configured yet.");
      return;
    }
    if (!email.trim()) {
      setError("Enter your email address.");
      return;
    }
    setBusy(true);
    const { error: err } = await sendPasswordReset(email.trim());
    setBusy(false);
    if (err) setError(err.message);
    else setSent(true);
  }

  return (
    <AuthCard
      title="Reset password"
      subtitle="We'll email you a reset link"
      footer={<Link to="/login" className="font-medium text-brand-700 hover:underline">Back to sign in</Link>}
    >
      {sent ? (
        <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          If an account exists for that email, a reset link has been sent. Check your inbox and spam folder.
        </p>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div>
            <label htmlFor="email" className="text-sm font-medium text-slate-700">Email</label>
            <input id="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
          </div>
          {error && <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
          <button type="submit" disabled={busy} className="flex w-full items-center justify-center gap-2 rounded-md bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60">
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            Send reset link
          </button>
        </form>
      )}
    </AuthCard>
  );
}
