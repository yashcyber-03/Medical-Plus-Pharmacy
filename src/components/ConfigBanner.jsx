import { AlertTriangle } from "lucide-react";
import { isSupabaseConfigured } from "../services/supabaseClient";

export default function ConfigBanner() {
  if (isSupabaseConfigured) return null;
  return (
    <div className="flex items-start gap-3 border-b border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
      <p>
        <strong>Database not connected.</strong> Set{" "}
        <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code>{" "}
        to enable real data. Pages below show clearly labelled sample data
        only.
      </p>
    </div>
  );
}
