import { motion } from "framer-motion";
import { Sun, Fuel, Battery, Truck, CheckCircle } from "lucide-react";
import type { EnergyBalanceResult, TcoComparison } from "@/types/reference";

const fmt = (v: number, decimals = 1) =>
  new Intl.NumberFormat("nb-NO", {
    maximumFractionDigits: decimals,
    minimumFractionDigits: decimals,
  }).format(v);

const fmtKr = (v: number) =>
  new Intl.NumberFormat("nb-NO", {
    maximumFractionDigits: 0,
  }).format(v);

interface Props {
  energy_balance: EnergyBalanceResult;
  tco: TcoComparison;
}

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07 } },
};

const item = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35 } },
};

export function MetricCards({ energy_balance, tco }: Props) {
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
      value: `${fmt(energy_balance.total_fuel_liters)} liter`,
      sub: "per år",
      icon: Fuel,
      color: "text-amber-500",
      bg: "bg-amber-50",
    },
    {
      label: "Brenselcelle TCO",
      value: `${fmtKr(tco.fuel_cell_tco_kr)} kr`,
      sub: `${tco.assessment_horizon_years} års horisont`,
      icon: Battery,
      color: "text-hydro-600",
      bg: "bg-hydro-50",
    },
    {
      label: "Diesel TCO",
      value: `${fmtKr(tco.diesel_tco_kr)} kr`,
      sub: `${tco.assessment_horizon_years} års horisont`,
      icon: Truck,
      color: "text-gray-500",
      bg: "bg-gray-50",
    },
    {
      label: "Anbefalt kjelde",
      value: tco.recommended_source === "fuel_cell" ? "Brenselcelle" : "Diesel",
      sub:
        tco.recommended_source === "fuel_cell"
          ? `${fmtKr(tco.diesel_tco_kr - tco.fuel_cell_tco_kr)} kr billegare`
          : `${fmtKr(tco.fuel_cell_tco_kr - tco.diesel_tco_kr)} kr billegare`,
      icon: CheckCircle,
      color:
        tco.recommended_source === "fuel_cell"
          ? "text-emerald-500"
          : "text-red-500",
      bg:
        tco.recommended_source === "fuel_cell"
          ? "bg-emerald-50"
          : "bg-red-50",
    },
  ];

  return (
    <motion.div
      className="grid grid-cols-2 lg:grid-cols-5 gap-4"
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
