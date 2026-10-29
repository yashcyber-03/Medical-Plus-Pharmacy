import { useState } from "react";
import { Link } from "react-router-dom";
import AuthCard from "../components/AuthCard";
import { useAuth } from "../context/AuthContext";

export default function ForgotPassword() {
  const { sendPasswordReset } = useAuth();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (!email.trim()) {
      setError("Enter your email address.");
      return;
    }
    setSubmitting(true);
    const { error: resetError } = await sendPasswordReset(email.trim());
    setSubmitting(false);
    if (resetError) setError("Could not send the reset email. Try again in a minute.");
    else setSent(true);
  }

  return (
    <AuthCard title="Reset password" subtitle="We'll email you a link to choose a new password.">
      {sent ? (
        <p className="rounded-md bg-emerald-50 p-3 text-sm text-emerald-800">
          If that email belongs to an account, a reset link is on its way. Check your inbox and spam folder.
        </p>
      ) : (
        <form onSubmit={handleSubmit} noValidate>
          {error && <p role="alert" className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</p>}
          <label className="block text-sm font-medium text-slate-700">
            Email
            <input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
          </label>
          <button type="submit" disabled={submitting} className="mt-5 w-full rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50">
            {submitting ? "Sending…" : "Send reset link"}
          </button>
        </form>
      )}
      <p className="mt-4 text-center text-sm">
        <Link to="/login" className="text-brand-700 hover:underline">Back to sign in</Link>
      </p>
    </AuthCard>
  );
}
