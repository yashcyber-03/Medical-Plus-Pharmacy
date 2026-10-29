import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import AuthCard from "../components/AuthCard";
import { useAuth } from "../context/AuthContext";

export default function ResetPassword() {
  const { session, loading, updatePassword, signOut } = useAuth();
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (password.length < 8) {
      setError("Use at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("The two passwords don't match.");
      return;
    }
    setSubmitting(true);
    const { error: updateError } = await updatePassword(password);
    setSubmitting(false);
    if (updateError) {
      setError("Could not change the password. Request a new reset link and try again.");
      return;
    }
    await signOut();
    navigate("/login", { replace: true, state: { notice: "Password changed. Sign in with your new password." } });
  }

  const inputCls = "mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm";

  if (loading) return <AuthCard title="Choose a new password"><p className="text-sm text-slate-600">Checking your link…</p></AuthCard>;

  if (!session) {
    return (
      <AuthCard title="Link not valid">
        <p className="text-sm text-slate-600">
          Open this page from the link in your reset email. The link may have expired.
        </p>
        <p className="mt-4 text-center text-sm">
          <Link to="/forgot-password" className="text-brand-700 hover:underline">Request a new link</Link>
        </p>
      </AuthCard>
    );
  }

  return (
    <AuthCard title="Choose a new password">
      {error && <p role="alert" className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      <form onSubmit={handleSubmit} noValidate>
        <label className="block text-sm font-medium text-slate-700">
          New password
          <input type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} className={inputCls} />
        </label>
        <label className="mt-4 block text-sm font-medium text-slate-700">
          Confirm new password
          <input type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} className={inputCls} />
        </label>
        <button type="submit" disabled={submitting} className="mt-5 w-full rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50">
          {submitting ? "Saving…" : "Save new password"}
        </button>
      </form>
    </AuthCard>
  );
}
