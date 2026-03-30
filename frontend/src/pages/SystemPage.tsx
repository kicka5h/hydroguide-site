import { Settings, Sun, Battery, Zap, Calendar } from "lucide-react";
import { motion } from "framer-motion";
import { useConfigStore } from "@/stores/configStore";
import { FormSection, NumberInput, BooleanToggle, SelectInput } from "@/components/ui/FormField";
import type { AutonomyInputMode } from "@/types/config";

const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.08 } } };
const fade = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0, transition: { duration: 0.35 } } };

const MONTHS: { key: string; label: string }[] = [
  { key: "jan", label: "Jan" }, { key: "feb", label: "Feb" }, { key: "mar", label: "Mar" },
  { key: "apr", label: "Apr" }, { key: "may", label: "Mai" }, { key: "jun", label: "Jun" },
  { key: "jul", label: "Jul" }, { key: "aug", label: "Aug" }, { key: "sep", label: "Sep" },
  { key: "oct", label: "Okt" }, { key: "nov", label: "Nov" }, { key: "dec", label: "Des" },
];

export function SystemPage() {
  const solar = useConfigStore((s) => s.config.solar);
  const setSolar = useConfigStore((s) => s.setSolar);
  const battery = useConfigStore((s) => s.config.battery);
  const setBattery = useConfigStore((s) => s.setBattery);
  const ops = useConfigStore((s) => s.config.operations);
  const setOperations = useConfigStore((s) => s.setOperations);
  const irr = useConfigStore((s) => s.config.monthly_irradiation);
  const setIrr = useConfigStore((s) => s.setMonthlyIrradiation);

  const autonomyUnit = ops.autonomy_input_mode === "target_days" ? "dagar" : "Ah";
  const autonomyValue = ops.autonomy_input_mode === "target_days"
    ? ops.target_autonomy_days
    : ops.battery_bank_ah;
  const handleAutonomyChange = (v: number | null) => {
    if (ops.autonomy_input_mode === "target_days") {
      setOperations({ target_autonomy_days: v });
    } else {
      setOperations({ battery_bank_ah: v });
    }
  };

  return (
    <div>
      <div className="flex items-center gap-3 mb-8">
        <Settings className="w-7 h-7 text-hydro-600" />
        <h1 className="text-2xl font-bold text-hydro-900">Tekniske parametere</h1>
      </div>

      <motion.div className="space-y-6" variants={stagger} initial="hidden" animate="show">
        {/* Solar Panel System + Solar Radiation */}
        <motion.div variants={fade}>
          <FormSection title="Solcellesystem og solinnstråling" icon={<Sun className="w-5 h-5 text-amber-500" />}>
            <div className="grid grid-cols-1 md:grid-cols-[minmax(0,0.82fr)_minmax(0,1.18fr)] gap-6">
              <div className="space-y-4">
                <NumberInput label="Paneleffekt" value={solar.panel_wattage_wp} onChange={(v) => setSolar({ panel_wattage_wp: v })} unit="Wp" min={0} />
                <NumberInput label="Tal panel" value={solar.panel_count} onChange={(v) => setSolar({ panel_count: v ?? 1 })} unit="stk" min={1} step={1} />
                <NumberInput label="Systemverknadsgrad" value={solar.system_efficiency} onChange={(v) => setSolar({ system_efficiency: v ?? 0.8 })} min={0} max={1} step={0.05} guidance="Samla verknadsgrad for panel, regulator, kabel og lading. Oppgje som verdi frå 0 til 1." />
              </div>
              <div>
                <p className="text-sm font-medium text-hydro-700 mb-3">Månadleg solinnstråling</p>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                  {MONTHS.map((m) => (
                    <NumberInput
                      key={m.key}
                      label={m.label}
                      value={(irr as unknown as Record<string, number>)[m.key]}
                      onChange={(v) => setIrr({ [m.key]: v ?? 0 })}
                      unit="kWh/m²"
                      min={0}
                      step={0.1}
                    />
                  ))}
                </div>
              </div>
            </div>
          </FormSection>
        </motion.div>

        {/* Battery Bank */}
        <motion.div variants={fade}>
          <FormSection title="Batteribank" icon={<Battery className="w-5 h-5 text-hydro-500" />}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <SelectInput
                label="Autonomi oppgjeve som"
                value={ops.autonomy_input_mode}
                onChange={(v) => setOperations({ autonomy_input_mode: (v || "manual_ah") as AutonomyInputMode })}
                options={[
                  { value: "target_days", label: "Tal dagar" },
                  { value: "manual_ah", label: "Batteribankstorleik (Ah)" },
                ]}
              />
              <NumberInput label="Nominell spenning" value={battery.voltage_v} onChange={(v) => setBattery({ voltage_v: v ?? 12.8 })} unit="V" min={0} />
              <NumberInput
                label="Ønskt autonomi"
                value={autonomyValue}
                onChange={handleAutonomyChange}
                unit={autonomyUnit}
                min={0}
                step={ops.autonomy_input_mode === "target_days" ? 1 : undefined}
                guidance="Vel først om autonomi er oppgjeve i Ah eller dagar."
              />
              <NumberInput label="Maks utladingsdjupn (DoD)" value={battery.max_dod} onChange={(v) => setBattery({ max_dod: v ?? 0.8 })} min={0} max={1} step={0.05} />
            </div>
          </FormSection>
        </motion.div>

        {/* Reserve Source */}
        <motion.div variants={fade}>
          <FormSection title="Reservekjelde" icon={<Zap className="w-5 h-5 text-emerald-500" />}>
            <BooleanToggle
              label="Har systemet ei reservekjelde?"
              value={ops.has_reserve_source}
              onChange={(v) => setOperations({ has_reserve_source: v })}
              guidance="Oppgje om systemet skal evaluerast med ei reservekjelde."
            />
          </FormSection>
        </motion.div>
      </motion.div>
    </div>
  );
}
