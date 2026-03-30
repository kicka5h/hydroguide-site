import { BarChart3, AlertTriangle, Info, AlertCircle, CheckCircle } from "lucide-react";
import { motion } from "framer-motion";
import { useConfigStore } from "@/stores/configStore";
import { deriveRecommendations, deriveRecommendedConfig } from "@/lib/recommendations";
import { EnergyBalanceChart } from "@/components/dashboard/EnergyBalanceChart";
import { cn } from "@/lib/utils";
import type { AnalysisRecommendation } from "@/types/config";
import type { BackupSourceSelection } from "@/types/config";

const fmtKr = (v: number) => new Intl.NumberFormat("nb-NO", { maximumFractionDigits: 0 }).format(v);

const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.07 } } };
const fade = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0, transition: { duration: 0.35 } } };

const SEVERITY_STYLES: Record<string, { border: string; icon: typeof Info; color: string }> = {
  info: { border: "border-l-hydro-400", icon: Info, color: "text-hydro-500" },
  warning: { border: "border-l-amber-400", icon: AlertTriangle, color: "text-amber-400" },
  critical: { border: "border-l-red-400", icon: AlertCircle, color: "text-red-400" },
};

function RecommendationCard({ rec }: { rec: AnalysisRecommendation }) {
  const style = SEVERITY_STYLES[rec.severity] ?? SEVERITY_STYLES.info;
  const Icon = style.icon;
  return (
    <div className={cn("glass rounded-xl p-4 border-l-4", style.border)}>
      <div className="flex items-start gap-3">
        <Icon className={cn("w-5 h-5 mt-0.5 shrink-0", style.color)} />
        <div>
          <p className="font-semibold text-hydro-900 text-sm">{rec.title}</p>
          <p className="text-xs text-hydro-700 mt-1">{rec.description}</p>
          <p className="text-xs text-hydro-700 mt-2 font-medium">{rec.suggestion}</p>
        </div>
      </div>
    </div>
  );
}

export function AnalysePage() {
  const config = useConfigStore((s) => s.config);
  const getEnergyBalance = useConfigStore((s) => s.getEnergyBalance);
  const getTco = useConfigStore((s) => s.getTco);
  const selectedBackupSource = useConfigStore((s) => s.selectedBackupSource);
  const setSelectedBackupSource = useConfigStore((s) => s.setSelectedBackupSource);

  const eb = getEnergyBalance();
  const tco = getTco();
  const recs = deriveRecommendations(config, eb);
  const recommended = deriveRecommendedConfig(config);

  const dailyWh = config.power_budget.filter((i) => i.enabled).reduce((s, i) => s + i.consumption_wh_day, 0);

  return (
    <div>
      <div className="flex items-center gap-3 mb-8">
        <BarChart3 className="w-7 h-7 text-hydro-600" />
        <h1 className="text-2xl font-bold text-hydro-900">Analyse</h1>
      </div>

      <motion.div className="space-y-6" variants={stagger} initial="hidden" animate="show">
        {/* Summary */}
        <motion.div variants={fade} className="glass rounded-2xl p-6">
          <p className="text-sm text-hydro-700">
            Analysen dekker <strong>{config.power_budget.length}</strong> einingar med totalt dagleg
            forbruk på <strong>{dailyWh.toFixed(1)} Wh/dag</strong>.
            Tilrådd kommunikasjon: <strong>{recommended.communication}</strong>.
            Sekundærkjelde: <strong>{recommended.secondary_source}</strong>.
            <strong> {recs.length}</strong> tilrådingar generert.
          </p>
        </motion.div>

        {/* Recommendations */}
        <motion.div variants={fade}>
          <h2 className="text-lg font-semibold text-hydro-900 mb-3">Tilrådingar</h2>
          <div className="space-y-3">
            {recs.length === 0 && (
              <div className="glass rounded-xl p-4 text-center text-hydro-700 text-sm">
                Ingen tilrådingar — fyll ut parametere for å starte analysen.
              </div>
            )}
            {recs.map((rec, i) => (
              <RecommendationCard key={i} rec={rec} />
            ))}
          </div>
        </motion.div>

        {/* Recommended Config */}
        <motion.div variants={fade} className="glass rounded-2xl p-6">
          <h2 className="text-lg font-semibold text-hydro-900 mb-4">Tilrådd konfigurasjon</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2 text-sm">
            {[
              ["Målemetode", recommended.measurement_method],
              ["Kommunikasjon", recommended.communication],
              ["Logger", recommended.logger_recommendation],
              ["Energiovervaking", recommended.energy_monitoring],
              ["Sekundærkjelde", recommended.secondary_source],
              ["Sekundærkjelde effekt", recommended.secondary_source_power_w ? `${recommended.secondary_source_power_w} W` : "—"],
              ["Solpanel", recommended.solar_panel_count ? `${recommended.solar_panel_count} stk` : "—"],
              ["Batterikapasitet", recommended.battery_ah ? `${recommended.battery_ah} Ah` : "—"],
              ["Istilpassing", recommended.ice_adaptation],
              ["Driftskrav", recommended.operational_requirements],
            ].map(([label, value]) => (
              <div key={label} className="flex justify-between py-1.5 border-b border-hydro-50">
                <span className="text-hydro-700">{label}</span>
                <span className="font-medium text-hydro-900 text-right max-w-[60%]">{value}</span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Backup Source Selection */}
        <motion.div variants={fade} className="glass rounded-2xl p-6">
          <h2 className="text-lg font-semibold text-hydro-900 mb-3">Vel reservekjelde</h2>
          <p className="text-xs text-hydro-700 mb-3">Valet påverkar drivstofforbruk og kostnadskorta på Oversikt-sida.</p>
          <div className="flex gap-3">
            {([
              { value: "fuel_cell" as BackupSourceSelection, label: "Brenselcelle (metanol)" },
              { value: "diesel" as BackupSourceSelection, label: "Dieselaggregat" },
            ]).map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setSelectedBackupSource(opt.value)}
                className={cn(
                  "px-4 py-2 rounded-xl text-sm font-medium transition-colors border-2",
                  selectedBackupSource === opt.value
                    ? "border-emerald-400 bg-emerald-50 text-emerald-800"
                    : "border-hydro-200 text-hydro-700 hover:border-hydro-300"
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </motion.div>

        {/* TCO Comparison */}
        <motion.div variants={fade} className="glass rounded-2xl p-6">
          <h2 className="text-lg font-semibold text-hydro-900 mb-4">TCO-samanlikning</h2>
          <div className="grid grid-cols-2 gap-6">
            <div className={cn("rounded-xl p-4 border-2", tco.recommended_source === "fuel_cell" ? "border-emerald-300 bg-emerald-50/50" : "border-hydro-100")}>
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle className={cn("w-5 h-5", tco.recommended_source === "fuel_cell" ? "text-emerald-500" : "text-hydro-300")} />
                <span className="font-semibold text-hydro-900">Brenselcelle</span>
              </div>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between"><span className="text-hydro-700">Innkjøp</span><span className="font-medium">{fmtKr(tco.fuel_cell_purchase_kr)} kr</span></div>
                <div className="flex justify-between"><span className="text-hydro-700">Drift/år</span><span className="font-medium">{fmtKr(tco.fuel_cell_operating_kr_yr)} kr</span></div>
                <div className="flex justify-between"><span className="text-hydro-700">Vedlikehald/år</span><span className="font-medium">{fmtKr(tco.fuel_cell_maintenance_kr_yr)} kr</span></div>
                <div className="flex justify-between border-t border-hydro-100 pt-1 mt-1"><span className="font-semibold text-hydro-900">Totalt ({tco.assessment_horizon_years} år)</span><span className="font-bold text-hydro-900">{fmtKr(tco.fuel_cell_tco_kr)} kr</span></div>
              </div>
            </div>
            <div className={cn("rounded-xl p-4 border-2", tco.recommended_source === "diesel" ? "border-emerald-300 bg-emerald-50/50" : "border-hydro-100")}>
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle className={cn("w-5 h-5", tco.recommended_source === "diesel" ? "text-emerald-500" : "text-hydro-300")} />
                <span className="font-semibold text-hydro-900">Dieselaggregat</span>
              </div>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between"><span className="text-hydro-700">Innkjøp</span><span className="font-medium">{fmtKr(tco.diesel_purchase_kr)} kr</span></div>
                <div className="flex justify-between"><span className="text-hydro-700">Drift/år</span><span className="font-medium">{fmtKr(tco.diesel_operating_kr_yr)} kr</span></div>
                <div className="flex justify-between"><span className="text-hydro-700">Vedlikehald/år</span><span className="font-medium">{fmtKr(tco.diesel_maintenance_kr_yr)} kr</span></div>
                <div className="flex justify-between border-t border-hydro-100 pt-1 mt-1"><span className="font-semibold text-hydro-900">Totalt ({tco.assessment_horizon_years} år)</span><span className="font-bold text-hydro-900">{fmtKr(tco.diesel_tco_kr)} kr</span></div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Energy Balance Chart */}
        <motion.div variants={fade}>
          <EnergyBalanceChart monthly={eb.monthly} />
        </motion.div>
      </motion.div>
    </div>
  );
}
