import { Settings, Sun, Battery, Fuel, Truck, Sliders, Calendar } from "lucide-react";
import { motion } from "framer-motion";
import { useConfigStore } from "@/stores/configStore";
import { FormSection, NumberInput } from "@/components/ui/FormField";

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
  const fc = useConfigStore((s) => s.config.fuel_cell);
  const setFuelCell = useConfigStore((s) => s.setFuelCell);
  const dg = useConfigStore((s) => s.config.diesel_generator);
  const setDieselGenerator = useConfigStore((s) => s.setDieselGenerator);
  const other = useConfigStore((s) => s.config.other_settings);
  const setOtherSettings = useConfigStore((s) => s.setOtherSettings);
  const irr = useConfigStore((s) => s.config.monthly_irradiation);
  const setIrr = useConfigStore((s) => s.setMonthlyIrradiation);

  return (
    <div>
      <div className="flex items-center gap-3 mb-8">
        <Settings className="w-7 h-7 text-hydro-600" />
        <h1 className="text-2xl font-bold text-hydro-900">Systemparametere</h1>
      </div>

      <motion.div className="space-y-6" variants={stagger} initial="hidden" animate="show">
        <motion.div variants={fade}>
          <FormSection title="Solcellepanel" icon={<Sun className="w-5 h-5 text-amber-500" />}>
            <div className="grid grid-cols-2 gap-4">
              <NumberInput label="Paneleffekt" value={solar.panel_wattage_wp} onChange={(v) => setSolar({ panel_wattage_wp: v })} unit="Wp" min={0} />
              <NumberInput label="Tal panel" value={solar.panel_count} onChange={(v) => setSolar({ panel_count: v ?? 1 })} min={1} step={1} />
              <NumberInput label="Systemverknadsgrad" value={solar.system_efficiency} onChange={(v) => setSolar({ system_efficiency: v ?? 0.8 })} min={0} max={1} step={0.05} />
              <NumberInput label="Forventa levetid" value={solar.lifespan_years} onChange={(v) => setSolar({ lifespan_years: v ?? 25 })} unit="år" min={1} step={1} />
            </div>
          </FormSection>
        </motion.div>

        <motion.div variants={fade}>
          <FormSection title="Batteribank" icon={<Battery className="w-5 h-5 text-hydro-500" />}>
            <div className="grid grid-cols-3 gap-4">
              <NumberInput label="Nominell spenning" value={battery.voltage_v} onChange={(v) => setBattery({ voltage_v: v ?? 12.8 })} unit="V" min={0} />
              <NumberInput label="Maks utladingsdjupn" value={battery.max_dod} onChange={(v) => setBattery({ max_dod: v ?? 0.8 })} min={0} max={1} step={0.05} />
              <NumberInput label="Sykluslevetid" value={battery.cycle_lifespan} onChange={(v) => setBattery({ cycle_lifespan: v ?? 6000 })} min={0} step={100} />
            </div>
          </FormSection>
        </motion.div>

        <motion.div variants={fade}>
          <FormSection title="Brenselcelle" icon={<Fuel className="w-5 h-5 text-emerald-500" />}>
            <div className="grid grid-cols-2 gap-4">
              <NumberInput label="Innkjøpskostnad" value={fc.purchase_cost_kr} onChange={(v) => setFuelCell({ purchase_cost_kr: v })} unit="kr" min={0} />
              <NumberInput label="Nominell effekt" value={fc.power_w} onChange={(v) => setFuelCell({ power_w: v })} unit="W" min={0} />
              <NumberInput label="Drivstofforbruk" value={fc.fuel_consumption_l_kwh} onChange={(v) => setFuelCell({ fuel_consumption_l_kwh: v })} unit="l/kWh" min={0} step={0.1} />
              <NumberInput label="Drivstoffpris (metanol)" value={fc.fuel_price_kr_l} onChange={(v) => setFuelCell({ fuel_price_kr_l: v })} unit="kr/l" min={0} />
              <NumberInput label="Forventa levetid" value={fc.lifespan_hours} onChange={(v) => setFuelCell({ lifespan_hours: v })} unit="timar" min={0} />
              <NumberInput label="Årlege vedlikehaldskostnadar" value={fc.annual_maintenance_kr} onChange={(v) => setFuelCell({ annual_maintenance_kr: v })} unit="kr/år" min={0} />
            </div>
          </FormSection>
        </motion.div>

        <motion.div variants={fade}>
          <FormSection title="Dieselaggregat" icon={<Truck className="w-5 h-5 text-gray-500" />}>
            <div className="grid grid-cols-2 gap-4">
              <NumberInput label="Innkjøpskostnad" value={dg.purchase_cost_kr} onChange={(v) => setDieselGenerator({ purchase_cost_kr: v })} unit="kr" min={0} />
              <NumberInput label="Nominell effekt" value={dg.power_w} onChange={(v) => setDieselGenerator({ power_w: v })} unit="W" min={0} />
              <NumberInput label="Drivstofforbruk" value={dg.fuel_consumption_l_kwh} onChange={(v) => setDieselGenerator({ fuel_consumption_l_kwh: v })} unit="l/kWh" min={0} step={0.1} />
              <NumberInput label="Drivstoffpris (diesel)" value={dg.fuel_price_kr_l} onChange={(v) => setDieselGenerator({ fuel_price_kr_l: v })} unit="kr/l" min={0} />
              <NumberInput label="Forventa levetid" value={dg.lifespan_hours} onChange={(v) => setDieselGenerator({ lifespan_hours: v })} unit="timar" min={0} />
              <NumberInput label="Årlege vedlikehaldskostnadar" value={dg.annual_maintenance_kr} onChange={(v) => setDieselGenerator({ annual_maintenance_kr: v })} unit="kr/år" min={0} />
            </div>
          </FormSection>
        </motion.div>

        <motion.div variants={fade}>
          <FormSection title="Andre innstillingar" icon={<Sliders className="w-5 h-5 text-hydro-500" />}>
            <div className="grid grid-cols-3 gap-4">
              <NumberInput label="CO₂-faktor metanol" value={other.co2_factor_methanol} onChange={(v) => setOtherSettings({ co2_factor_methanol: v ?? 1.088 })} unit="kg/l" step={0.001} />
              <NumberInput label="CO₂-faktor diesel" value={other.co2_factor_diesel} onChange={(v) => setOtherSettings({ co2_factor_diesel: v ?? 2.68 })} unit="kg/l" step={0.01} />
              <NumberInput label="Vurderingshorisont" value={other.assessment_horizon_years} onChange={(v) => setOtherSettings({ assessment_horizon_years: v ?? 10 })} unit="år" min={1} max={30} step={1} />
            </div>
          </FormSection>
        </motion.div>

        <motion.div variants={fade}>
          <FormSection title="Månadleg solinnstråling" icon={<Calendar className="w-5 h-5 text-amber-500" />}>
            <p className="text-xs text-hydro-700 -mt-2 mb-3">
              Forventa solinnstråling i kWh/m² per månad. Bruk PVGIS for estimat.
            </p>
            <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-3">
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
          </FormSection>
        </motion.div>
      </motion.div>
    </div>
  );
}
