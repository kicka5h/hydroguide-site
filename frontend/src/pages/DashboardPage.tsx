import { LayoutDashboard, AlertTriangle, RotateCcw } from "lucide-react";
import { useConfigStore } from "@/stores/configStore";
import { MetricCards } from "@/components/dashboard/MetricCards";
import { EnergyBalanceChart } from "@/components/dashboard/EnergyBalanceChart";
import { LocationMap } from "@/components/dashboard/LocationMap";

function Skeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="bg-hydro-100 rounded-2xl h-32" />
        ))}
      </div>
      <div className="bg-hydro-100 rounded-2xl h-[420px]" />
    </div>
  );
}

export function DashboardPage() {
  const initialized = useConfigStore((s) => s.initialized);
  const loading = useConfigStore((s) => s.loading);
  const error = useConfigStore((s) => s.error);
  const initialize = useConfigStore((s) => s.initialize);
  const resetToReference = useConfigStore((s) => s.resetToReference);
  const getEnergyBalance = useConfigStore((s) => s.getEnergyBalance);
  const getTco = useConfigStore((s) => s.getTco);
  const location = useConfigStore((s) => s.location);
  const setLocation = useConfigStore((s) => s.setLocation);

  if (loading || !initialized) return (
    <div>
      <div className="flex items-center gap-3 mb-8">
        <LayoutDashboard className="w-7 h-7 text-hydro-600" />
        <h1 className="text-2xl font-bold text-hydro-900">Oversikt</h1>
      </div>
      <Skeleton />
    </div>
  );

  if (error) return (
    <div>
      <div className="flex items-center gap-3 mb-8">
        <LayoutDashboard className="w-7 h-7 text-hydro-600" />
        <h1 className="text-2xl font-bold text-hydro-900">Oversikt</h1>
      </div>
      <div className="glass rounded-2xl p-8 text-center">
        <AlertTriangle className="w-10 h-10 text-red-400 mx-auto mb-3" />
        <p className="text-hydro-700 font-medium mb-1">Kunne ikkje laste data</p>
        <p className="text-sm text-hydro-700 mb-4">{error}</p>
        <button onClick={initialize} className="px-4 py-2 rounded-xl bg-hydro-700 text-white text-sm font-medium hover:bg-hydro-800 transition-colors">
          Prøv igjen
        </button>
      </div>
    </div>
  );

  const energyBalance = getEnergyBalance();
  const tco = getTco();

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <LayoutDashboard className="w-7 h-7 text-hydro-600" />
          <h1 className="text-2xl font-bold text-hydro-900">Oversikt</h1>
        </div>
        <button
          onClick={resetToReference}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-hydro-700 hover:text-hydro-900 hover:bg-hydro-50 transition-colors"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Nullstill
        </button>
      </div>

      <div className="space-y-8">
        <MetricCards energy_balance={energyBalance} tco={tco} />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <EnergyBalanceChart monthly={energyBalance.monthly} />
          <LocationMap location={location} onChange={setLocation} />
        </div>
      </div>
    </div>
  );
}
