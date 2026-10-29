import { Construction } from "lucide-react";
import PageHeader from "../components/PageHeader";

export default function Placeholder({ title, phase }) {
  return (
    <>
      <PageHeader title={title} />
      <div className="rounded-lg border border-dashed border-slate-300 bg-white p-10 text-center">
        <Construction className="mx-auto h-8 w-8 text-slate-400" />
        <p className="mt-3 font-medium text-slate-900">Not built yet</p>
        <p className="mt-1 text-sm text-slate-500">
          This module is planned for Phase {phase}. It needs the database, so there is nothing to show here yet.
        </p>
      </div>
    </>
  );
}
