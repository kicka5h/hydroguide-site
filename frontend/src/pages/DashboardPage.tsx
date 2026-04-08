import { useState, useRef, useEffect } from "react";
import { LayoutDashboard, AlertTriangle, RotateCcw, Save, Download, Plus, ChevronDown, Pencil } from "lucide-react";
import { useConfigStore } from "@/stores/configStore";
import { MetricCards } from "@/components/dashboard/MetricCards";
import { EnergyBalanceChart } from "@/components/dashboard/EnergyBalanceChart";
import { LocationMap } from "@/components/dashboard/LocationMap";

function Skeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-hydro-100 rounded-2xl h-32" />
        ))}
      </div>
      <div className="bg-hydro-100 rounded-2xl h-[420px]" />
    </div>
  );
}

function EditableProjectName() {
  const projectName = useConfigStore((s) => s.projectName);
  const setProjectName = useConfigStore((s) => s.setProjectName);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(projectName);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) inputRef.current?.select();
  }, [editing]);

  const commit = () => {
    const trimmed = draft.trim();
    if (trimmed) setProjectName(trimmed);
    else setDraft(projectName);
    setEditing(false);
  };

  if (editing) {
    return (
      <input
        ref={inputRef}
        className="text-2xl font-bold text-hydro-900 bg-transparent border-b-2 border-hydro-400 outline-none px-0 py-0 w-64"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => { if (e.key === "Enter") commit(); if (e.key === "Escape") { setDraft(projectName); setEditing(false); } }}
      />
    );
  }

  return (
    <button
      onClick={() => { setDraft(projectName); setEditing(true); }}
      className="flex items-center gap-2 group"
    >
      <h1 className="text-2xl font-bold text-hydro-900">{projectName}</h1>
      <Pencil className="w-4 h-4 text-hydro-400 opacity-0 group-hover:opacity-100 transition-opacity" />
    </button>
  );
}

function ConfigSelector() {
  const savedConfigs = useConfigStore((s) => s.savedConfigs);
  const activeConfigId = useConfigStore((s) => s.activeConfigId);
  const loadConfig = useConfigStore((s) => s.loadConfig);
  const newConfig = useConfigStore((s) => s.newConfig);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-hydro-700 hover:text-hydro-900 hover:bg-hydro-50 transition-colors border border-hydro-200"
      >
        <ChevronDown className="w-3.5 h-3.5" />
        Konfigurasjonar
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 w-56 bg-white rounded-xl shadow-lg border border-hydro-100 z-50 py-1">
          {savedConfigs.length === 0 && (
            <p className="px-3 py-2 text-xs text-hydro-500">Ingen lagra konfigurasjonar</p>
          )}
          {savedConfigs.map((c) => (
            <button
              key={c.id}
              onClick={() => { loadConfig(c.id); setOpen(false); }}
              className={`w-full text-left px-3 py-2 text-sm hover:bg-hydro-50 transition-colors ${c.id === activeConfigId ? "font-semibold text-hydro-900" : "text-hydro-700"}`}
            >
              {c.name}
            </button>
          ))}
          <div className="border-t border-hydro-100 mt-1 pt-1">
            <button
              onClick={() => { newConfig(); setOpen(false); }}
              className="w-full text-left px-3 py-2 text-sm text-hydro-600 hover:bg-hydro-50 transition-colors flex items-center gap-2"
            >
              <Plus className="w-3.5 h-3.5" />
              Ny konfigurasjon
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export function DashboardPage() {
  const initialized = useConfigStore((s) => s.initialized);
  const loading = useConfigStore((s) => s.loading);
  const error = useConfigStore((s) => s.error);
  const initialize = useConfigStore((s) => s.initialize);
  const resetToReference = useConfigStore((s) => s.resetToReference);
  const getEnergyBalance = useConfigStore((s) => s.getEnergyBalance);
  const location = useConfigStore((s) => s.location);
  const setLocation = useConfigStore((s) => s.setLocation);
  const saveConfig = useConfigStore((s) => s.saveConfig);
  const config = useConfigStore((s) => s.config);
  const projectName = useConfigStore((s) => s.projectName);

  const handleExport = () => {
    const data = {
      projectName,
      config,
      location,
      exportedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${projectName.replace(/\s+/g, "_")}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading || !initialized) return (
    <div>
      <div className="flex items-center gap-3 mb-8">
        <LayoutDashboard className="w-7 h-7 text-hydro-600" />
        <h1 className="text-2xl font-bold text-hydro-900">Oversikt</h1>
      </div>
      <Skeleton />
    </div>
  );

  if (error) return (
    <div>
      <div className="flex items-center gap-3 mb-8">
        <LayoutDashboard className="w-7 h-7 text-hydro-600" />
        <h1 className="text-2xl font-bold text-hydro-900">Oversikt</h1>
      </div>
      <div className="glass rounded-2xl p-8 text-center">
        <AlertTriangle className="w-10 h-10 text-red-400 mx-auto mb-3" />
        <p className="text-hydro-700 font-medium mb-1">Kunne ikkje laste data</p>
        <p className="text-sm text-hydro-700 mb-4">{error}</p>
        <button onClick={initialize} className="px-4 py-2 rounded-xl bg-hydro-700 text-white text-sm font-medium hover:bg-hydro-800 transition-colors">
          Prøv igjen
        </button>
      </div>
    </div>
  );

  const energyBalance = getEnergyBalance();

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <LayoutDashboard className="w-7 h-7 text-hydro-600" />
          <EditableProjectName />
        </div>
        <div className="flex items-center gap-2">
          <ConfigSelector />
          <button
            onClick={saveConfig}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-white bg-hydro-700 hover:bg-hydro-800 transition-colors"
          >
            <Save className="w-3.5 h-3.5" />
            Lagre
          </button>
          <button
            onClick={handleExport}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-hydro-700 hover:text-hydro-900 hover:bg-hydro-50 transition-colors border border-hydro-200"
          >
            <Download className="w-3.5 h-3.5" />
            Eksport
          </button>
          <button
            onClick={resetToReference}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-red-600 hover:text-red-700 hover:bg-red-50 border border-transparent hover:border-red-200 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Nullstill
          </button>
        </div>
      </div>

      <div className="space-y-8">
        <MetricCards energy_balance={energyBalance} />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <EnergyBalanceChart monthly={energyBalance.monthly} />
          <LocationMap location={location} onChange={setLocation} />
        </div>
      </div>
    </div>
  );
}
