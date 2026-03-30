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
} from "@/types/config";
import type { EnergyBalanceResult, TcoComparison, RecommendedConfig } from "@/types/reference";
import { calculateEnergyBalance, calculateTco, dailyConsumptionWh } from "@/lib/calculations";
import { deriveRecommendedConfig } from "@/lib/recommendations";

const DEFAULT_CONFIG: HydroConfigData = {
  communication: { has_4g_coverage: null, has_nbiot_coverage: null, has_line_of_sight: null, requires_two_way_control: null },
  facility: { release_method: "", has_fish_passage: null, minimum_flow_ls: null, low_conductivity: null, ice_problems: null, difficult_access: null, linear_flow: null, sediment_or_surge: null },
  operations: { inspections_per_year: null, battery_bank_ah: null, zero_emission_desired: null },
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

  getEnergyBalance: () => calculateEnergyBalance(get().config),
  getTco: () => {
    const eb = calculateEnergyBalance(get().config);
    return calculateTco(get().config, eb.total_fuel_cost_kr);
  },
  getRecommendedConfig: () => deriveRecommendedConfig(get().config),
  getDailyWh: () => dailyConsumptionWh(get().config),
}));
