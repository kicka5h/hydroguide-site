import {
  ComposedChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ReferenceLine,
  ResponsiveContainer,
} from "recharts";
import type { MonthlyEnergyBalance } from "@/types/reference";

interface Props {
  monthly: MonthlyEnergyBalance[];
}

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass rounded-xl px-4 py-3 shadow-lg text-sm">
      <p className="font-semibold text-hydro-900 mb-1">{label}</p>
      {payload.map((entry) => (
        <p key={entry.name} style={{ color: entry.color }}>
          {entry.name}:{" "}
          <span className="font-medium">
            {entry.value.toFixed(1)} kWh
          </span>
        </p>
      ))}
    </div>
  );
}

export function EnergyBalanceChart({ monthly }: Props) {
  return (
    <div className="glass rounded-2xl p-6">
      <h2 className="text-lg font-semibold text-hydro-900 mb-4">
        Månadleg energibalanse
      </h2>
      <ResponsiveContainer width="100%" height={350}>
        <ComposedChart
          data={monthly}
          margin={{ top: 8, right: 16, left: 0, bottom: 0 }}
        >
          <XAxis
            dataKey="month"
            tick={{ fill: "#0c4a6e", fontSize: 12 }}
            axisLine={{ stroke: "#bae6fd" }}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: "#0c4a6e", fontSize: 12 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v: number) => `${v}`}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            wrapperStyle={{ fontSize: 13, paddingTop: 8 }}
          />
          <ReferenceLine y={0} stroke="#94a3b8" strokeDasharray="4 4" />
          <Bar
            dataKey="solar_production_kwh"
            name="Solproduksjon (kWh)"
            fill="#38bdf8"
            radius={[4, 4, 0, 0]}
          />
          <Bar
            dataKey="energy_balance_kwh"
            name="Energibalanse (kWh)"
            fill="#0369a1"
            radius={[4, 4, 0, 0]}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
