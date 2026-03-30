import { create } from "zustand";
import type {
  HydroConfigData,
  CommunicationParams,
  FacilityParams,
  OperationsParams,
  SolarParams,
  BatteryParams,
  FuelCellParams,
  DieselGeneratorParams,
  OtherSettings,
  MonthlyIrradiation,
  PowerBudgetItem,
  QuestionnaireData,
  BackupSourceSelection,
} from "@/types/config";
import type { EnergyBalanceResult, TcoComparison, RecommendedConfig } from "@/types/reference";
import { calculateEnergyBalance, calculateTco, dailyConsumptionWh } from "@/lib/calculations";
import { deriveRecommendedConfig } from "@/lib/recommendations";

const DEFAULT_CONFIG: HydroConfigData = {
  communication: { has_4g_coverage: null, has_nbiot_coverage: null, has_line_of_sight: null, requires_two_way_control: null },
  facility: { release_method: "", has_fish_passage: null, minimum_flow_ls: null, low_conductivity: null, ice_problems: null, difficult_access: null, linear_flow: null, sediment_or_surge: null, facility_status: "", intake_type: "", flow_type: "", large_flow_difference: null, can_divert_to_frost_free: null, frequent_adjustment: null, natural_measurement_profile: null, artificial_measurement_profile: null, automatic_data_transmission: null, public_verification: null, release_when_not_operating: null, flow_collectible_in_container: null, turbulent_for_tracer: null, uniform_for_area_velocity: null, suitable_for_verification: null },
  operations: { inspections_per_year: null, battery_bank_ah: null, zero_emission_desired: null, autonomy_input_mode: "manual_ah" as const, target_autonomy_days: null, has_reserve_source: null },
  solar: { panel_wattage_wp: null, panel_count: 1, system_efficiency: 0.8, lifespan_years: 25 },
  battery: { voltage_v: 12.8, max_dod: 0.8, cycle_lifespan: 6000 },
  fuel_cell: { purchase_cost_kr: null, power_w: null, fuel_consumption_l_kwh: null, fuel_price_kr_l: null, lifespan_hours: null, annual_maintenance_kr: null },
  diesel_generator: { purchase_cost_kr: null, power_w: null, fuel_consumption_l_kwh: null, fuel_price_kr_l: null, lifespan_hours: null, annual_maintenance_kr: null },
  other_settings: { co2_factor_methanol: 1.088, co2_factor_diesel: 2.68, assessment_horizon_years: 10 },
  monthly_irradiation: { jan: 0, feb: 0, mar: 0, apr: 0, may: 0, jun: 0, jul: 0, aug: 0, sep: 0, oct: 0, nov: 0, dec: 0 },
  power_budget: [],
};

export interface LocationData {
  name: string;
  lat: number | null;
  lng: number | null;
}

export interface SavedConfig {
  id: string;
  name: string;
  config: HydroConfigData;
  location: LocationData;
  selectedBackupSource: BackupSourceSelection;
}

interface ConfigStore {
  config: HydroConfigData;
  referenceConfig: HydroConfigData | null;
  location: LocationData;
  questionnaire: QuestionnaireData | null;
  technicalComments: Record<string, Record<string, string>> | null;
  nveRequirements: Record<string, string> | null;
  initialized: boolean;
  loading: boolean;
  error: string | null;

  projectName: string;
  setProjectName: (name: string) => void;

  selectedBackupSource: BackupSourceSelection;
  setSelectedBackupSource: (source: BackupSourceSelection) => void;

  savedConfigs: SavedConfig[];
  activeConfigId: string | null;
  saveConfig: () => void;
  loadConfig: (id: string) => void;
  newConfig: () => void;

  getBatteryAutonomyDays: () => number;

  initialize: () => Promise<void>;
  resetToReference: () => void;
  setLocation: (loc: LocationData) => void;

  setCommunication: (patch: Partial<CommunicationParams>) => void;
  setFacility: (patch: Partial<FacilityParams>) => void;
  setOperations: (patch: Partial<OperationsParams>) => void;
  setSolar: (patch: Partial<SolarParams>) => void;
  setBattery: (patch: Partial<BatteryParams>) => void;
  setFuelCell: (patch: Partial<FuelCellParams>) => void;
  setDieselGenerator: (patch: Partial<DieselGeneratorParams>) => void;
  setOtherSettings: (patch: Partial<OtherSettings>) => void;
  setMonthlyIrradiation: (patch: Partial<MonthlyIrradiation>) => void;
  addPowerBudgetItem: () => void;
  removePowerBudgetItem: (index: number) => void;
  updatePowerBudgetItem: (index: number, patch: Partial<PowerBudgetItem>) => void;

  getEnergyBalance: () => EnergyBalanceResult;
  getTco: () => TcoComparison;
  getRecommendedConfig: () => RecommendedConfig;
  getDailyWh: () => number;
}

export const useConfigStore = create<ConfigStore>((set, get) => ({
  config: DEFAULT_CONFIG,
  referenceConfig: null,
  location: { name: "", lat: null, lng: null },
  questionnaire: null,
  technicalComments: null,
  nveRequirements: null,
  initialized: false,
  loading: false,
  error: null,

  projectName: "Nytt prosjekt",
  setProjectName: (name) => set({ projectName: name }),

  selectedBackupSource: "fuel_cell",
  setSelectedBackupSource: (source) => set({ selectedBackupSource: source }),

  savedConfigs: [],
  activeConfigId: null,

  saveConfig: () => {
    const s = get();
    const id = s.activeConfigId ?? crypto.randomUUID();
    const entry: SavedConfig = {
      id,
      name: s.projectName,
      config: JSON.parse(JSON.stringify(s.config)),
      location: { ...s.location },
      selectedBackupSource: s.selectedBackupSource,
    };
    set((prev) => {
      const existing = prev.savedConfigs.findIndex((c) => c.id === id);
      const list = [...prev.savedConfigs];
      if (existing >= 0) list[existing] = entry;
      else list.push(entry);
      return { savedConfigs: list, activeConfigId: id };
    });
  },

  loadConfig: (id) => {
    const saved = get().savedConfigs.find((c) => c.id === id);
    if (!saved) return;
    set({
      config: JSON.parse(JSON.stringify(saved.config)),
      location: { ...saved.location },
      projectName: saved.name,
      selectedBackupSource: saved.selectedBackupSource,
      activeConfigId: id,
    });
  },

  newConfig: () => {
    const ref = get().referenceConfig;
    set({
      config: ref ? JSON.parse(JSON.stringify(ref)) : JSON.parse(JSON.stringify(DEFAULT_CONFIG)),
      location: { name: "", lat: null, lng: null },
      projectName: "Nytt prosjekt",
      selectedBackupSource: "fuel_cell",
      activeConfigId: null,
    });
  },

  getBatteryAutonomyDays: () => {
    const { config } = get();
    const dailyWh = dailyConsumptionWh(config);
    if (dailyWh <= 0) return 0;
    const voltage = config.battery.voltage_v || 12.8;
    const dod = config.battery.max_dod || 0.8;

    if (config.operations.autonomy_input_mode === "manual_ah") {
      const ah = config.operations.battery_bank_ah ?? 0;
      const usableWh = ah * voltage * dod;
      return usableWh / dailyWh;
    } else {
      return config.operations.target_autonomy_days ?? 0;
    }
  },

  initialize: async () => {
    if (get().initialized || get().loading) return;
    set({ loading: true, error: null });
    try {
      const res = await fetch("/api/v1/config/reference");
      if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
      const data = await res.json();
      const config = data.config as HydroConfigData;
      set({
        config,
        referenceConfig: config,
        questionnaire: data.questionnaire ?? null,
        technicalComments: data.technical_comments ?? null,
        nveRequirements: data.nve_requirements ?? null,
        initialized: true,
      });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : "Ukjend feil" });
    } finally {
      set({ loading: false });
    }
  },

  resetToReference: () => {
    const ref = get().referenceConfig;
    if (ref) set({ config: JSON.parse(JSON.stringify(ref)), location: { name: "", lat: null, lng: null } });
  },

  setLocation: (loc) => set({ location: loc }),

  setCommunication: (patch) =>
    set((s) => ({ config: { ...s.config, communication: { ...s.config.communication, ...patch } } })),
  setFacility: (patch) =>
    set((s) => ({ config: { ...s.config, facility: { ...s.config.facility, ...patch } } })),
  setOperations: (patch) =>
    set((s) => ({ config: { ...s.config, operations: { ...s.config.operations, ...patch } } })),
  setSolar: (patch) =>
    set((s) => ({ config: { ...s.config, solar: { ...s.config.solar, ...patch } } })),
  setBattery: (patch) =>
    set((s) => ({ config: { ...s.config, battery: { ...s.config.battery, ...patch } } })),
  setFuelCell: (patch) =>
    set((s) => ({ config: { ...s.config, fuel_cell: { ...s.config.fuel_cell, ...patch } } })),
  setDieselGenerator: (patch) =>
    set((s) => ({ config: { ...s.config, diesel_generator: { ...s.config.diesel_generator, ...patch } } })),
  setOtherSettings: (patch) =>
    set((s) => ({ config: { ...s.config, other_settings: { ...s.config.other_settings, ...patch } } })),
  setMonthlyIrradiation: (patch) =>
    set((s) => ({ config: { ...s.config, monthly_irradiation: { ...s.config.monthly_irradiation, ...patch } } })),

  addPowerBudgetItem: () =>
    set((s) => ({
      config: {
        ...s.config,
        power_budget: [
          ...s.config.power_budget,
          { enabled: true, name: "", power_w: 0, consumption_wh_day: 0, consumption_ah_day: 0, consumption_wh_week: 0, consumption_ah_week: 0 },
        ],
      },
    })),

  removePowerBudgetItem: (index) =>
    set((s) => ({
      config: {
        ...s.config,
        power_budget: s.config.power_budget.filter((_, i) => i !== index),
      },
    })),

  updatePowerBudgetItem: (index, patch) =>
    set((s) => {
      const items = [...s.config.power_budget];
      const item = { ...items[index], ...patch };
      // Auto-derive consumption from power_w
      if ("power_w" in patch) {
        const v = s.config.battery.voltage_v || 12.8;
        item.consumption_wh_day = item.power_w * 24;
        item.consumption_ah_day = item.consumption_wh_day / v;
        item.consumption_wh_week = item.consumption_wh_day * 7;
        item.consumption_ah_week = item.consumption_ah_day * 7;
      }
      items[index] = item;
      return { config: { ...s.config, power_budget: items } };
    }),

  getEnergyBalance: () => calculateEnergyBalance(get().config, get().selectedBackupSource),
  getTco: () => {
    const eb = calculateEnergyBalance(get().config, get().selectedBackupSource);
    return calculateTco(get().config, eb.total_fuel_cost_kr);
  },
  getRecommendedConfig: () => deriveRecommendedConfig(get().config),
  getDailyWh: () => dailyConsumptionWh(get().config),
}));
