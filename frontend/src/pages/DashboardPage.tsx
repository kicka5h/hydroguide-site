import { LayoutDashboard } from "lucide-react";

export function DashboardPage() {
  return (
    <div>
      <div className="flex items-center gap-3 mb-8">
        <LayoutDashboard className="w-7 h-7 text-hydro-600" />
        <h1 className="text-2xl font-bold text-hydro-900">Oversikt</h1>
      </div>

      <div className="glass rounded-2xl p-8 text-center text-hydro-600">
        <p className="text-lg">Dashboard kommer i neste fase.</p>
        <p className="text-sm mt-2 text-hydro-400">
          Metrikk-kort, kart, energidiagram og hurtighandlinger.
        </p>
      </div>
    </div>
  );
}
