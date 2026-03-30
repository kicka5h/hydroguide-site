import { motion } from "framer-motion";
import { Sun, Fuel, Zap, Clock } from "lucide-react";
import type { EnergyBalanceResult } from "@/types/reference";
import { useConfigStore } from "@/stores/configStore";

const fmt = (v: number, decimals = 1) =>
  new Intl.NumberFormat("nb-NO", {
    maximumFractionDigits: decimals,
    minimumFractionDigits: decimals,
  }).format(v);

interface Props {
  energy_balance: EnergyBalanceResult;
}

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07 } },
};

const item = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35 } },
};

export function MetricCards({ energy_balance }: Props) {
  const config = useConfigStore((s) => s.config);
  const selectedBackupSource = useConfigStore((s) => s.selectedBackupSource);
  const getBatteryAutonomyDays = useConfigStore((s) => s.getBatteryAutonomyDays);

  const autonomyDays = getBatteryAutonomyDays();
  const voltage = config.battery.voltage_v || 12.8;
  const dod = config.battery.max_dod || 0.8;
  const dailyWh = config.power_budget.filter((i) => i.enabled).reduce((s, i) => s + i.consumption_wh_day, 0);

  // Calculate required Ah from target autonomy days
  const requiredAh = dailyWh > 0 && config.operations.target_autonomy_days
    ? (config.operations.target_autonomy_days * dailyWh) / (voltage * dod)
    : null;

  // Backup source details
  const backupLabel = selectedBackupSource === "fuel_cell" ? "Brenselcelle" : "Dieselaggregat";
  const backupPowerW = selectedBackupSource === "fuel_cell"
    ? (config.fuel_cell.power_w ?? 0)
    : (config.diesel_generator.power_w ?? 0);

  // Fuel type label for Drivstofforbruk
  const fuelLabel = selectedBackupSource === "fuel_cell" ? "metanol" : "diesel";

  // Autonomy subtext
  let autonomySub: string;
  if (config.operations.autonomy_input_mode === "target_days") {
    autonomySub = requiredAh
      ? `${fmt(config.operations.target_autonomy_days ?? 0, 0)} dagar autonomi, anbefalt ${fmt(requiredAh, 0)} Ah`
      : "Sett mål-autonomi på Parametere-sida";
  } else {
    const ah = config.operations.battery_bank_ah ?? 0;
    autonomySub = ah > 0
      ? `${fmt(ah, 0)} Ah gir ${fmt(autonomyDays, 1)} dagars autonomi`
      : "Sett batterikapasitet på Parametere-sida";
  }

  const cards = [
    {
      label: "Solproduksjon",
      value: `${fmt(energy_balance.total_solar_production_kwh)} kWh`,
      sub: "per år",
      icon: Sun,
      color: "text-hydro-500",
      bg: "bg-hydro-50",
    },
    {
      label: "Drivstofforbruk",
      value: `${fmt(energy_balance.total_fuel_liters)} liter ${fuelLabel}`,
      sub: "per år",
      icon: Fuel,
      color: "text-amber-500",
      bg: "bg-amber-50",
    },
    {
      label: "Reservekjelde",
      value: backupLabel,
      sub: backupPowerW > 0 ? `${fmt(backupPowerW, 0)} W` : "Ikkje konfigurert",
      icon: Zap,
      color: selectedBackupSource === "fuel_cell" ? "text-emerald-500" : "text-gray-500",
      bg: selectedBackupSource === "fuel_cell" ? "bg-emerald-50" : "bg-gray-50",
    },
    {
      label: "Autonomi",
      value: `${fmt(autonomyDays, 1)} dagar`,
      sub: autonomySub,
      icon: Clock,
      color: "text-blue-500",
      bg: "bg-blue-50",
    },
  ];

  return (
    <motion.div
      className="grid grid-cols-2 lg:grid-cols-4 gap-4"
      variants={container}
      initial="hidden"
      animate="show"
    >
      {cards.map((card) => (
        <motion.div
          key={card.label}
          variants={item}
          className="glass rounded-2xl p-5 flex flex-col gap-3"
        >
          <div className="flex items-center gap-2">
            <div className={`${card.bg} ${card.color} p-2 rounded-xl`}>
              <card.icon className="w-5 h-5" />
            </div>
            <span className="text-sm font-medium text-hydro-700">
              {card.label}
            </span>
          </div>
          <p className="text-xl font-bold text-hydro-900">{card.value}</p>
          <p className="text-xs text-hydro-700">{card.sub}</p>
        </motion.div>
      ))}
    </motion.div>
  );
}
