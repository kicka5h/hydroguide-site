import type { ReactNode } from "react";
import { BarChart3, AlertTriangle, Info, AlertCircle } from "lucide-react";
import { motion } from "framer-motion";
import { useConfigStore } from "@/stores/configStore";
import { deriveRecommendations, deriveRecommendedConfig } from "@/lib/recommendations";
import { cn } from "@/lib/utils";
import type { AnalysisRecommendation, BackupSourceSelection } from "@/types/config";
import { MONTHS } from "@/lib/months";

const fmtKr = (v: number) => new Intl.NumberFormat("nb-NO", { maximumFractionDigits: 0 }).format(v);
const fmtNum = (v: number, d = 1) =>
  new Intl.NumberFormat("nb-NO", { maximumFractionDigits: d, minimumFractionDigits: d }).format(v);

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

function HelpTip({ text }: { text: string }) {
  return (
    <span className="group relative inline-flex">
      <Info className="w-3.5 h-3.5 text-hydro-300 cursor-help" />
      <span className="absolute left-1/2 -translate-x-1/2 bottom-full mb-1 hidden group-hover:block w-64 p-2 rounded-lg bg-hydro-900 text-white text-xs z-50 shadow-lg whitespace-normal">
        {text}
      </span>
    </span>
  );
}

interface DefRow {
  label: string;
  value: ReactNode;
  help?: string;
}

function DefList({ rows }: { rows: DefRow[] }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2 text-sm">
      {rows.map(({ label, value, help }) => (
        <div key={label} className="flex justify-between gap-2 py-1.5 border-b border-hydro-50">
          <span className="text-hydro-700 flex items-center gap-1.5">
            {label}
            {help && <HelpTip text={help} />}
          </span>
          <span className="font-medium text-hydro-900 text-right max-w-[60%]">{value}</span>
        </div>
      ))}
    </div>
  );
}

export function AnalysePage() {
  const config = useConfigStore((s) => s.config);
  const getEnergyBalance = useConfigStore((s) => s.getEnergyBalance);
  const getTco = useConfigStore((s) => s.getTco);
  const getBatteryAutonomyDays = useConfigStore((s) => s.getBatteryAutonomyDays);
  const selectedBackupSource = useConfigStore((s) => s.selectedBackupSource);
  const setSelectedBackupSource = useConfigStore((s) => s.setSelectedBackupSource);

  const eb = getEnergyBalance();
  const tco = getTco();
  const recs = deriveRecommendations(config, eb);
  const recommended = deriveRecommendedConfig(config);
  const autonomyDays = getBatteryAutonomyDays();

  const hasSecondary = config.operations.has_reserve_source !== false;
  const horizon = config.other_settings.assessment_horizon_years;

  // ---- Derived display values for "Systemdesign og reserve" ----
  const slippordning = (() => {
    const ft = config.facility.flow_type;
    if (ft === "fast") return "Fast minstevassføring";
    if (ft === "sesongkrav") return "Sesongkrav";
    if (ft === "tilsigsstyrt") return "Tilsigsstyrt minstevassføring";
    return config.facility.release_method || "—";
  })();

  const flowmaling = (() => {
    if (config.facility.natural_measurement_profile) return "Naturleg måleprofil nedstraums";
    if (config.facility.artificial_measurement_profile) return "Kunstig måleprofil nedstraums";
    return recommended.measurement_method;
  })();

  const kontrollmaling = (() => {
    if (config.facility.flow_collectible_in_container) return "Behaldarmåling";
    if (config.facility.turbulent_for_tracer) return "Sporstoff-fortyningsmåling";
    if (config.facility.uniform_for_area_velocity) return "Areal-hastigheitsmåling";
    return "Stadbestemt vurdering";
  })();

  const andreTilpassingar = (() => {
    const flags: string[] = [];
    if (config.facility.ice_problems) flags.push("Istilpassing");
    if (config.facility.sediment_or_surge) flags.push("Sediment/surge");
    if (config.facility.difficult_access) flags.push("Vanskeleg tilkomst");
    if (config.facility.frequent_adjustment) flags.push("Hyppig justering");
    return flags.length ? flags.join(", ") : "Ingen særskilde";
  })();

  // ---- Per-source runtime / lifetime utilization for Driftstid mot levetid ----
  const deficitKwh = eb.total_secondary_kwh;
  const fcPowerKw = (config.fuel_cell.power_w ?? 0) / 1000;
  const dgPowerKw = (config.diesel_generator.power_w ?? 0) / 1000;
  const fcAnnualHours = fcPowerKw > 0 ? deficitKwh / fcPowerKw : 0;
  const dgAnnualHours = dgPowerKw > 0 ? deficitKwh / dgPowerKw : 0;
  const fcLifespan = config.fuel_cell.lifespan_hours ?? 0;
  const dgLifespan = config.diesel_generator.lifespan_hours ?? 0;
  const fcUtilPct = fcLifespan > 0 ? (fcAnnualHours * horizon) / fcLifespan * 100 : 0;
  const dgUtilPct = dgLifespan > 0 ? (dgAnnualHours * horizon) / dgLifespan * 100 : 0;

  // Per-source liter/year (for both columns of ToC table)
  const fcAnnualLiters = deficitKwh * (config.fuel_cell.fuel_consumption_l_kwh ?? 0);
  const dgAnnualLiters = deficitKwh * (config.diesel_generator.fuel_consumption_l_kwh ?? 0);

  return (
    <div>
      <div className="flex items-center gap-3 mb-8">
        <BarChart3 className="w-7 h-7 text-hydro-600" />
        <h1 className="text-2xl font-bold text-hydro-900">Analyse</h1>
      </div>

      <motion.div className="space-y-6" variants={stagger} initial="hidden" animate="show">
        {/* 1. Systemdesign og reserve */}
        <motion.div variants={fade} className="glass rounded-2xl p-6">
          <h2 className="text-lg font-semibold text-hydro-900 mb-4">Systemdesign og reserve</h2>

          <DefList
            rows={[
              { label: "Slippordning", value: slippordning },
              { label: "Flowmålingsmetode (MVF)", value: flowmaling },
              {
                label: "Kontrollmåling",
                value: kontrollmaling,
                help: "Gjennomføres normalt kvar 3. år, eller ved behov når anna tilseier det",
              },
              { label: "Oppsett logging", value: recommended.logger_recommendation },
              {
                label: "Andre tilpassingar",
                value: andreTilpassingar,
                help: "Dette er anleggsspesifikke tilpassingar",
              },
            ]}
          />

          {hasSecondary ? (
            <>
              <div className="border-t border-hydro-100 my-5" />
              <DefList
                rows={[
                  { label: "Sekundærkilde", value: recommended.secondary_source },
                  {
                    label: "Output effekt",
                    value: recommended.secondary_source_power_w
                      ? `${fmtNum(recommended.secondary_source_power_w, 0)} W`
                      : "—",
                  },
                  {
                    label: "Batteribank",
                    value: config.operations.battery_bank_ah
                      ? `${fmtNum(config.operations.battery_bank_ah, 0)} Ah`
                      : "—",
                  },
                  {
                    label:
                      config.operations.autonomy_input_mode === "manual_ah"
                        ? "Autonomi ut frå valt batteribank"
                        : "Autonomi frå oppgitt batteribank",
                    value: `${fmtNum(autonomyDays, 1)} dagar`,
                  },
                ]}
              />
            </>
          ) : (
            <div className="mt-5 rounded-xl border border-hydro-200 bg-hydro-50 px-4 py-3 text-sm text-hydro-700">
              Systemet er konfigurert utan sekundær energikilde.
            </div>
          )}
        </motion.div>

        {/* 2. Grunngiving og tilleggskrav */}
        <motion.div variants={fade} className="glass rounded-2xl p-6">
          <h2 className="text-lg font-semibold text-hydro-900 mb-3">Grunngiving og tilleggskrav</h2>
          <ul className="list-disc pl-5 space-y-1.5 text-sm text-hydro-700">
            <li>
              Tilrådd kommunikasjon: <span className="font-medium text-hydro-900">{recommended.communication}</span>
            </li>
            <li>
              Istilpassing: <span className="font-medium text-hydro-900">{recommended.ice_adaptation}</span>
            </li>
            <li>
              Driftskrav: <span className="font-medium text-hydro-900">{recommended.operational_requirements}</span>
            </li>
            {config.facility.public_verification && (
              <li>Publikum skal kunna kontrollera minstevassføringa på staden.</li>
            )}
            {config.facility.release_when_not_operating && (
              <li>Tilsiget må sleppast også når kraftverket ikkje er i drift.</li>
            )}
            {config.facility.automatic_data_transmission && (
              <li>Data skal overførast automatisk til kontroll-/alarmsystem.</li>
            )}
          </ul>
        </motion.div>

        {/* 3. Årlege nøkkeltal */}
        <motion.div variants={fade} className="glass rounded-2xl p-6">
          <h2 className="text-lg font-semibold text-hydro-900 mb-4">Årlege nøkkeltal</h2>
          <DefList
            rows={[
              { label: "Solproduksjon gjennom året", value: `${fmtNum(eb.total_solar_production_kwh)} kWh` },
              { label: "Energibalanse/år", value: `${fmtNum(eb.total_energy_balance_kwh)} kWh` },
              { label: "Last/år", value: `${fmtNum(eb.total_load_kwh)} kWh` },
              { label: "Drivstoff/år", value: hasSecondary ? `${fmtNum(eb.total_fuel_liters)} l` : "—" },
              { label: "Driftstid/år", value: hasSecondary ? `${fmtNum(eb.total_generator_hours, 0)} t` : "—" },
              {
                label: "Drivstofforbruk/år",
                value: hasSecondary ? `${fmtNum(eb.total_fuel_liters)} l` : "—",
              },
              {
                label: "Drivstoffkostnader/år",
                value: hasSecondary ? `${fmtKr(eb.total_fuel_cost_kr)} kr` : "—",
              },
            ]}
          />
        </motion.div>

        {/* 4. Monthly breakdown */}
        <motion.div variants={fade} className="glass rounded-2xl p-6">
          <h2 className="text-lg font-semibold text-hydro-900 mb-4">Månadleg fordeling</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-hydro-700 border-b border-hydro-100">
                  <th className="py-2 pr-2">Månad</th>
                  <th className="py-2 pr-2 text-right">Energi solcelleanlegg (kWh)</th>
                  <th className="py-2 pr-2 text-right">Last (kWh)</th>
                  <th className="py-2 pr-2 text-right">Energibalanse (kWh)</th>
                  <th className="py-2 pr-2 text-right">Drivstoffkostnad (kr)</th>
                </tr>
              </thead>
              <tbody>
                {eb.monthly.map((m, i) => (
                  <tr key={MONTHS[i].key} className="border-b border-hydro-50">
                    <td className="py-2 pr-2 text-hydro-900">{MONTHS[i].label}</td>
                    <td className="py-2 pr-2 text-right text-hydro-700">{fmtNum(m.solar_production_kwh)}</td>
                    <td className="py-2 pr-2 text-right text-hydro-700">{fmtNum(m.load_kwh)}</td>
                    <td className={cn("py-2 pr-2 text-right", m.energy_balance_kwh < 0 ? "text-red-600" : "text-hydro-700")}>
                      {fmtNum(m.energy_balance_kwh)}
                    </td>
                    <td className="py-2 pr-2 text-right text-hydro-700">
                      {hasSecondary ? fmtKr(m.fuel_cost_kr) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>

        {/* 5. Driftstid mot levetid (only with secondary) */}
        {hasSecondary && (
          <motion.div variants={fade} className="glass rounded-2xl p-6">
            <h2 className="text-lg font-semibold text-hydro-900 mb-4">
              Sekundær energikilde: Driftstid mot levetid
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-hydro-700 border-b border-hydro-100">
                    <th className="py-2 pr-2"></th>
                    <th className="py-2 pr-2 text-right">Brenselcelle</th>
                    <th className="py-2 pr-2 text-right">Dieselaggregat</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-hydro-50">
                    <td className="py-2 pr-2 text-hydro-700">Total driftstid</td>
                    <td className="py-2 pr-2 text-right text-hydro-900">{fmtNum(fcAnnualHours, 0)} t/år</td>
                    <td className="py-2 pr-2 text-right text-hydro-900">{fmtNum(dgAnnualHours, 0)} t/år</td>
                  </tr>
                  <tr className="border-b border-hydro-50">
                    <td className="py-2 pr-2 text-hydro-700">Utnytta levetid ({horizon} år)</td>
                    <td className="py-2 pr-2 text-right text-hydro-900">{fmtNum(fcUtilPct, 1)} %</td>
                    <td className="py-2 pr-2 text-right text-hydro-900">{fmtNum(dgUtilPct, 1)} %</td>
                  </tr>
                  <tr>
                    <td className="py-2 pr-2 text-hydro-700">Teknisk levetid</td>
                    <td className="py-2 pr-2 text-right text-hydro-900">{fmtNum(fcLifespan, 0)} t</td>
                    <td className="py-2 pr-2 text-right text-hydro-900">{fmtNum(dgLifespan, 0)} t</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </motion.div>
        )}

        {/* 6. ToC-samanlikning (toggle in header) */}
        {hasSecondary && (
          <motion.div variants={fade} className="glass rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
              <h2 className="text-lg font-semibold text-hydro-900">
                ToC-samanlikning for sekundære energikjelder
              </h2>
              <div className="flex gap-2">
                {([
                  { value: "fuel_cell" as BackupSourceSelection, label: "Brenselcelle (metanol)" },
                  { value: "diesel" as BackupSourceSelection, label: "Dieselaggregat" },
                ]).map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setSelectedBackupSource(opt.value)}
                    className={cn(
                      "px-3 py-1.5 rounded-xl text-xs font-medium transition-colors border-2",
                      selectedBackupSource === opt.value
                        ? "border-emerald-400 bg-emerald-50 text-emerald-800"
                        : "border-hydro-200 text-hydro-700 hover:border-hydro-300"
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-hydro-700 border-b border-hydro-100">
                    <th className="py-2 pr-2"></th>
                    <th className="py-2 pr-2 text-right">Brenselcelle</th>
                    <th className="py-2 pr-2 text-right">Dieselaggregat</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-hydro-50">
                    <td className="py-2 pr-2 text-hydro-700">Innkjøp</td>
                    <td className="py-2 pr-2 text-right text-hydro-900">{fmtKr(tco.fuel_cell_purchase_kr)} kr</td>
                    <td className="py-2 pr-2 text-right text-hydro-900">{fmtKr(tco.diesel_purchase_kr)} kr</td>
                  </tr>
                  <tr className="border-b border-hydro-50">
                    <td className="py-2 pr-2 text-hydro-700">Drivstoffkostnad/år</td>
                    <td className="py-2 pr-2 text-right text-hydro-900">{fmtKr(tco.fuel_cell_operating_kr_yr)} kr</td>
                    <td className="py-2 pr-2 text-right text-hydro-900">{fmtKr(tco.diesel_operating_kr_yr)} kr</td>
                  </tr>
                  <tr className="border-b border-hydro-50">
                    <td className="py-2 pr-2 text-hydro-700">Vedlikehald/år</td>
                    <td className="py-2 pr-2 text-right text-hydro-900">{fmtKr(tco.fuel_cell_maintenance_kr_yr)} kr</td>
                    <td className="py-2 pr-2 text-right text-hydro-900">{fmtKr(tco.diesel_maintenance_kr_yr)} kr</td>
                  </tr>
                  <tr className="border-b border-hydro-50">
                    <td className="py-2 pr-2 text-hydro-700">Drivstoff/år</td>
                    <td className="py-2 pr-2 text-right text-hydro-900">{fmtNum(fcAnnualLiters)} l</td>
                    <td className="py-2 pr-2 text-right text-hydro-900">{fmtNum(dgAnnualLiters)} l</td>
                  </tr>
                  <tr>
                    <td className="py-2 pr-2 text-hydro-700">Vurderingshorisont</td>
                    <td className="py-2 pr-2 text-right text-hydro-900" colSpan={2}>
                      {tco.assessment_horizon_years} år
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </motion.div>
        )}

        {/* 7. Tilrådingar (moved to bottom) */}
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
      </motion.div>
    </div>
  );
}
