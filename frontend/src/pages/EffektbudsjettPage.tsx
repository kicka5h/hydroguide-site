import { useState } from "react";
import { Zap, Plus, Trash2 } from "lucide-react";
import { motion } from "framer-motion";
import { useConfigStore } from "@/stores/configStore";
import { cn } from "@/lib/utils";

const fmt = (v: number, d = 2) =>
  new Intl.NumberFormat("nb-NO", { maximumFractionDigits: d, minimumFractionDigits: d }).format(v);

type Unit = "wh" | "ah";

export function EffektbudsjettPage() {
  const items = useConfigStore((s) => s.config.power_budget);
  const addItem = useConfigStore((s) => s.addPowerBudgetItem);
  const removeItem = useConfigStore((s) => s.removePowerBudgetItem);
  const updateItem = useConfigStore((s) => s.updatePowerBudgetItem);

  const [unit, setUnit] = useState<Unit>("wh");
  const [draftWatt, setDraftWatt] = useState<string>("");

  const handleQuickAdd = () => {
    const w = Number(draftWatt);
    if (!Number.isFinite(w) || w <= 0) return;
    addItem();
    // The newest row is appended to the end of the array.
    updateItem(items.length, { power_w: w });
    setDraftWatt("");
  };

  const totalWhDay = items.filter((i) => i.enabled).reduce((s, i) => s + i.consumption_wh_day, 0);
  const totalAhDay = items.filter((i) => i.enabled).reduce((s, i) => s + i.consumption_ah_day, 0);

  const dayLabel = unit === "wh" ? "Wh/dag" : "Ah/dag";
  const weekLabel = unit === "wh" ? "Wh/veke" : "Ah/veke";
  const dayDecimals = unit === "wh" ? 2 : 3;
  const dayValue = (i: { consumption_wh_day: number; consumption_ah_day: number }) =>
    unit === "wh" ? i.consumption_wh_day : i.consumption_ah_day;
  const weekValue = (i: { consumption_wh_week: number; consumption_ah_week: number }) =>
    unit === "wh" ? i.consumption_wh_week : i.consumption_ah_week;
  const totalDay = unit === "wh" ? totalWhDay : totalAhDay;
  const totalWeek = totalDay * 7;

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <Zap className="w-7 h-7 text-hydro-600" />
          <h1 className="text-2xl font-bold text-hydro-900">Effektbudsjett</h1>
        </div>
        <div
          className="inline-flex rounded-xl border border-hydro-200 bg-white/60 p-1 text-sm"
          role="group"
          aria-label="Eining for forbruk"
        >
          {(["wh", "ah"] as const).map((u) => (
            <button
              key={u}
              type="button"
              onClick={() => setUnit(u)}
              className={cn(
                "px-3 py-1 rounded-lg font-medium transition-colors",
                unit === u
                  ? "bg-hydro-500 text-white shadow"
                  : "text-hydro-700 hover:text-hydro-900"
              )}
            >
              {u === "wh" ? "Wh" : "Ah"}
            </button>
          ))}
        </div>
      </div>

      <motion.div
        className="glass rounded-2xl p-6"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
      >
        <div className="mb-5 flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[180px]">
            <label htmlFor="quick-watt" className="block text-sm font-medium text-hydro-700 mb-1">
              Effekt
            </label>
            <div className="relative">
              <input
                id="quick-watt"
                type="number"
                value={draftWatt}
                onChange={(e) => setDraftWatt(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleQuickAdd();
                  }
                }}
                min={0}
                step={0.1}
                placeholder="0"
                className="w-full rounded-xl border border-hydro-200 bg-white/60 px-3 py-2 pr-12 text-sm text-hydro-900 focus:ring-2 focus:ring-hydro-400 focus:outline-none"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-hydro-700">
                W
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={handleQuickAdd}
            disabled={!draftWatt || Number(draftWatt) <= 0}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-hydro-700 text-white text-sm font-medium hover:bg-hydro-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <Plus className="w-4 h-4" />
            Legg til
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-hydro-700 border-b border-hydro-100">
                <th className="py-2 pr-2 w-10">På</th>
                <th className="py-2 pr-2">Utstyr</th>
                <th className="py-2 pr-2 w-24 text-right">Effekt (W)</th>
                <th className="py-2 pr-2 w-24 text-right">Timar/Døgn</th>
                <th className="py-2 pr-2 w-24 text-right">{dayLabel}</th>
                <th className="py-2 pr-2 w-24 text-right">{weekLabel}</th>
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
                  <td className="py-2 pr-2">
                    <input
                      type="number"
                      value={item.hours_per_day ?? 24}
                      onChange={(e) =>
                        updateItem(i, { hours_per_day: e.target.value === "" ? 0 : Number(e.target.value) })
                      }
                      aria-label={`Timar per døgn for ${item.name || `rad ${i + 1}`}`}
                      min={0}
                      max={24}
                      step={0.5}
                      className="w-full text-right bg-transparent border-b border-hydro-100 focus:border-hydro-400 outline-none py-0.5 text-hydro-900"
                    />
                  </td>
                  <td className="py-2 pr-2 text-right text-hydro-700">{fmt(dayValue(item), dayDecimals)}</td>
                  <td className="py-2 pr-2 text-right text-hydro-700">{fmt(weekValue(item), dayDecimals)}</td>
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
                <td colSpan={4} className="py-3 pr-2">
                  Totalt ({items.filter((i) => i.enabled).length} aktive)
                </td>
                <td className="py-3 pr-2 text-right">{fmt(totalDay, dayDecimals)}</td>
                <td className="py-3 pr-2 text-right">{fmt(totalWeek, dayDecimals)}</td>
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
      </motion.div>
    </div>
  );
}
