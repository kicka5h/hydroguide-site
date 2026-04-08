import { Settings, Sun, Battery, Zap } from "lucide-react";
import { motion } from "framer-motion";
import { useConfigStore } from "@/stores/configStore";
import { FormSection, NumberInput, BooleanToggle, SelectInput } from "@/components/ui/FormField";
import type { AutonomyInputMode } from "@/types/config";
import { MONTHS } from "@/lib/months";

const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.08 } } };
const fade = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0, transition: { duration: 0.35 } } };

export function SystemPage() {
  const solar = useConfigStore((s) => s.config.solar);
  const setSolar = useConfigStore((s) => s.setSolar);
  const battery = useConfigStore((s) => s.config.battery);
  const setBattery = useConfigStore((s) => s.setBattery);
  const ops = useConfigStore((s) => s.config.operations);
  const setOperations = useConfigStore((s) => s.setOperations);
  const irr = useConfigStore((s) => s.config.monthly_irradiation);
  const setIrr = useConfigStore((s) => s.setMonthlyIrradiation);
  const fuelCell = useConfigStore((s) => s.config.fuel_cell);
  const setFuelCell = useConfigStore((s) => s.setFuelCell);
  const diesel = useConfigStore((s) => s.config.diesel_generator);
  const setDiesel = useConfigStore((s) => s.setDieselGenerator);

  // Treat null (unset) as enabled — matches the calculation gate
  // (`has_reserve_source !== false`) so the visual state and the
  // downstream behaviour stay in sync from the very first click.
  const hasSecondary = ops.has_reserve_source ?? true;

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
        <h1 className="text-2xl font-bold text-hydro-900">Teknisk Parametre</h1>
      </div>

      <motion.div className="space-y-6" variants={stagger} initial="hidden" animate="show">
        {/* Solar Panel System + Solar Radiation */}
        <motion.div variants={fade}>
          <FormSection title="Solcellesystem og solinnstråling" icon={<Sun className="w-5 h-5 text-amber-500" />}>
            <div className="grid grid-cols-1 md:grid-cols-[minmax(0,0.82fr)_minmax(0,1.18fr)] gap-6">
              <div className="space-y-4">
                <NumberInput label="Paneleffekt" value={solar.panel_wattage_wp} onChange={(v) => setSolar({ panel_wattage_wp: v })} unit="Wp" min={0} />
                <NumberInput label="Antall panel" value={solar.panel_count} onChange={(v) => setSolar({ panel_count: v ?? 1 })} unit="stk" min={1} step={1} guidance="Utgangspunkt for panelareal er 1 m²" />
                <NumberInput label="Systemverknadsgrad" value={solar.system_efficiency} onChange={(v) => setSolar({ system_efficiency: v ?? 0.8 })} min={0} max={1} step={0.05} guidance="Total virkningsgrad for solcelleanlegget: kabeltap, varmegang, omformertap osv." />
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
                  { value: "target_days", label: "Antall dagar" },
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
              <NumberInput label="Utladningsdjupna" value={battery.max_dod} onChange={(v) => setBattery({ max_dod: v ?? 0.8 })} min={0} max={1} step={0.05} />
            </div>
          </FormSection>
        </motion.div>

        {/* Reserve Source */}
        <motion.div variants={fade}>
          <FormSection title="Sekundær energikilde" icon={<Zap className="w-5 h-5 text-emerald-500" />}>
            <BooleanToggle
              label="Har systemet sekundær energikilde?"
              value={hasSecondary}
              onChange={(v) => setOperations({ has_reserve_source: v })}
              guidance="Når av: systemet evaluerast som rein solcelleløysing utan brenselcelle eller dieselaggregat."
            />

            {hasSecondary && (
              <div className="mt-5 space-y-5">
                <div>
                  <p className="text-sm font-semibold text-hydro-900 mb-3">Brenselcelle (metanol)</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <NumberInput label="Innkjøp" value={fuelCell.purchase_cost_kr} onChange={(v) => setFuelCell({ purchase_cost_kr: v })} unit="kr" min={0} />
                    <NumberInput label="Effekt" value={fuelCell.power_w} onChange={(v) => setFuelCell({ power_w: v })} unit="W" min={0} />
                    <NumberInput label="Drivstofforbruk" value={fuelCell.fuel_consumption_l_kwh} onChange={(v) => setFuelCell({ fuel_consumption_l_kwh: v })} unit="l/kWh" min={0} step={0.01} />
                    <NumberInput label="Drivstoffpris" value={fuelCell.fuel_price_kr_l} onChange={(v) => setFuelCell({ fuel_price_kr_l: v })} unit="kr/l" min={0} step={0.1} />
                    <NumberInput label="Levetid" value={fuelCell.lifespan_hours} onChange={(v) => setFuelCell({ lifespan_hours: v })} unit="t" min={0} step={100} />
                    <NumberInput label="Vedlikehald/år" value={fuelCell.annual_maintenance_kr} onChange={(v) => setFuelCell({ annual_maintenance_kr: v })} unit="kr" min={0} />
                  </div>
                </div>

                <div className="border-t border-hydro-100" />

                <div>
                  <p className="text-sm font-semibold text-hydro-900 mb-3">Dieselaggregat</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <NumberInput label="Innkjøp" value={diesel.purchase_cost_kr} onChange={(v) => setDiesel({ purchase_cost_kr: v })} unit="kr" min={0} />
                    <NumberInput label="Effekt" value={diesel.power_w} onChange={(v) => setDiesel({ power_w: v })} unit="W" min={0} />
                    <NumberInput label="Drivstofforbruk" value={diesel.fuel_consumption_l_kwh} onChange={(v) => setDiesel({ fuel_consumption_l_kwh: v })} unit="l/kWh" min={0} step={0.01} />
                    <NumberInput label="Drivstoffpris" value={diesel.fuel_price_kr_l} onChange={(v) => setDiesel({ fuel_price_kr_l: v })} unit="kr/l" min={0} step={0.1} />
                    <NumberInput label="Levetid" value={diesel.lifespan_hours} onChange={(v) => setDiesel({ lifespan_hours: v })} unit="t" min={0} step={100} />
                    <NumberInput label="Vedlikehald/år" value={diesel.annual_maintenance_kr} onChange={(v) => setDiesel({ annual_maintenance_kr: v })} unit="kr" min={0} />
                  </div>
                </div>
              </div>
            )}
          </FormSection>
        </motion.div>
      </motion.div>
    </div>
  );
}
