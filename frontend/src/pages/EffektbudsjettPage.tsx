import { Zap, Plus, Trash2 } from "lucide-react";
import { motion } from "framer-motion";
import { useConfigStore } from "@/stores/configStore";
import { cn } from "@/lib/utils";

const fmt = (v: number, d = 2) =>
  new Intl.NumberFormat("nb-NO", { maximumFractionDigits: d, minimumFractionDigits: d }).format(v);

export function EffektbudsjettPage() {
  const items = useConfigStore((s) => s.config.power_budget);
  const addItem = useConfigStore((s) => s.addPowerBudgetItem);
  const removeItem = useConfigStore((s) => s.removePowerBudgetItem);
  const updateItem = useConfigStore((s) => s.updatePowerBudgetItem);
  const dailyWh = useConfigStore((s) => s.getDailyWh);

  const totalWhDay = items.filter((i) => i.enabled).reduce((s, i) => s + i.consumption_wh_day, 0);
  const totalAhDay = items.filter((i) => i.enabled).reduce((s, i) => s + i.consumption_ah_day, 0);

  return (
    <div>
      <div className="flex items-center gap-3 mb-8">
        <Zap className="w-7 h-7 text-hydro-600" />
        <h1 className="text-2xl font-bold text-hydro-900">Effektbudsjett</h1>
      </div>

      <motion.div
        className="glass rounded-2xl p-6"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-hydro-700 border-b border-hydro-100">
                <th className="py-2 pr-2 w-10">På</th>
                <th className="py-2 pr-2">Utstyr</th>
                <th className="py-2 pr-2 w-24 text-right">Effekt (W)</th>
                <th className="py-2 pr-2 w-24 text-right">Wh/dag</th>
                <th className="py-2 pr-2 w-24 text-right">Ah/dag</th>
                <th className="py-2 pr-2 w-24 text-right">Wh/veke</th>
                <th className="py-2 pr-2 w-24 text-right">Ah/veke</th>
                <th className="py-2 w-10" />
              </tr>
            </thead>
            <tbody>
              {items.map((item, i) => (
                <tr
                  key={i}
                  className={cn(
                    "border-b border-hydro-50 transition-colors",
                    !item.enabled && "opacity-40"
                  )}
                >
                  <td className="py-2 pr-2">
                    <button
                      type="button"
                      onClick={() => updateItem(i, { enabled: !item.enabled })}
                      aria-label={`${item.enabled ? "Deaktiver" : "Aktiver"} ${item.name || `rad ${i + 1}`}`}
                      className={cn(
                        "w-5 h-5 rounded border-2 transition-colors flex items-center justify-center",
                        item.enabled
                          ? "bg-hydro-500 border-hydro-500 text-white"
                          : "border-hydro-300 bg-white"
                      )}
                    >
                      {item.enabled && <span className="text-xs">✓</span>}
                    </button>
                  </td>
                  <td className="py-2 pr-2">
                    <input
                      type="text"
                      value={item.name}
                      onChange={(e) => updateItem(i, { name: e.target.value })}
                      placeholder="Eining…"
                      aria-label={`Utstyrnamn rad ${i + 1}`}
                      className="w-full bg-transparent border-b border-hydro-100 focus:border-hydro-400 outline-none py-0.5 text-hydro-900"
                    />
                  </td>
                  <td className="py-2 pr-2">
                    <input
                      type="number"
                      value={item.power_w || ""}
                      onChange={(e) =>
                        updateItem(i, { power_w: e.target.value === "" ? 0 : Number(e.target.value) })
                      }
                      aria-label={`Effekt for ${item.name || `rad ${i + 1}`}`}
                      min={0}
                      step={0.1}
                      className="w-full text-right bg-transparent border-b border-hydro-100 focus:border-hydro-400 outline-none py-0.5 text-hydro-900"
                    />
                  </td>
                  <td className="py-2 pr-2 text-right text-hydro-700">{fmt(item.consumption_wh_day)}</td>
                  <td className="py-2 pr-2 text-right text-hydro-700">{fmt(item.consumption_ah_day, 3)}</td>
                  <td className="py-2 pr-2 text-right text-hydro-700">{fmt(item.consumption_wh_week)}</td>
                  <td className="py-2 pr-2 text-right text-hydro-700">{fmt(item.consumption_ah_week, 3)}</td>
                  <td className="py-2">
                    <button
                      type="button"
                      onClick={() => removeItem(i)}
                      aria-label={`Slett ${item.name || `rad ${i + 1}`}`}
                      className="text-red-300 hover:text-red-500 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="font-semibold text-hydro-900 border-t-2 border-hydro-200">
                <td colSpan={3} className="py-3 pr-2">
                  Totalt ({items.filter((i) => i.enabled).length} aktive)
                </td>
                <td className="py-3 pr-2 text-right">{fmt(totalWhDay)}</td>
                <td className="py-3 pr-2 text-right">{fmt(totalAhDay, 3)}</td>
                <td className="py-3 pr-2 text-right">{fmt(totalWhDay * 7)}</td>
                <td className="py-3 pr-2 text-right">{fmt(totalAhDay * 7, 3)}</td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>

        <button
          type="button"
          onClick={addItem}
          className="mt-4 flex items-center gap-2 px-4 py-2 rounded-xl border border-dashed border-hydro-300 text-sm text-hydro-700 hover:bg-hydro-50 hover:border-hydro-400 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Legg til utstyr
        </button>

        <div className="mt-6 flex gap-6 text-sm">
          <div className="glass rounded-xl px-4 py-3">
            <span className="text-hydro-700">Dagleg forbruk:</span>{" "}
            <span className="font-semibold text-hydro-900">{fmt(dailyWh(), 1)} Wh</span>
          </div>
          <div className="glass rounded-xl px-4 py-3">
            <span className="text-hydro-700">Vekentleg forbruk:</span>{" "}
            <span className="font-semibold text-hydro-900">{fmt(dailyWh() * 7, 1)} Wh</span>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
