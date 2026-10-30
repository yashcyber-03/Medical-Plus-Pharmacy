import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import AuthCard from "../components/AuthCard";

const inputCls = "mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm";

export default function ResetPassword() {
  const { session, loading, updatePassword } = useAuth();
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  if (loading) return null;

  // The emailed link signs the user in temporarily. No session = bad/expired link.
  if (!session) {
    return (
      <AuthCard
        title="Link expired"
        subtitle="This reset link is invalid or has expired."
        footer={<Link to="/forgot-password" className="font-medium text-brand-700 hover:underline">Request a new link</Link>}
      />
    );
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (password.length < 8) return setError("Use at least 8 characters.");
    if (password !== confirm) return setError("The two passwords don't match.");
    setBusy(true);
    const { error: err } = await updatePassword(password);
    setBusy(false);
    if (err) return setError(err.message);
    navigate("/", { replace: true });
  }

  return (
    <AuthCard title="Choose a new password">
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <div>
          <label htmlFor="pw" className="text-sm font-medium text-slate-700">New password</label>
          <input id="pw" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} className={inputCls} />
        </div>
        <div>
          <label htmlFor="pw2" className="text-sm font-medium text-slate-700">Confirm password</label>
          <input id="pw2" type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} className={inputCls} />
        </div>
        {error && <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        <button type="submit" disabled={busy} className="flex w-full items-center justify-center gap-2 rounded-md bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60">
          {busy && <Loader2 className="h-4 w-4 animate-spin" />}
          Save password
        </button>
      </form>
    </AuthCard>
  );
}
