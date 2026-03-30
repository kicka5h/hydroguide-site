export interface CommunicationParams {
  has_4g_coverage: boolean | null;
  has_nbiot_coverage: boolean | null;
  has_line_of_sight: boolean | null;
  requires_two_way_control: boolean | null;
}

export interface FacilityParams {
  release_method: string;
  has_fish_passage: boolean | null;
  minimum_flow_ls: number | null;
  low_conductivity: boolean | null;
  ice_problems: boolean | null;
  difficult_access: boolean | null;
  linear_flow: boolean | null;
  sediment_or_surge: boolean | null;
}

export interface OperationsParams {
  inspections_per_year: number | null;
  battery_bank_ah: number | null;
  zero_emission_desired: boolean | null;
}

export interface SolarParams {
  panel_wattage_wp: number | null;
  panel_count: number;
  system_efficiency: number;
  lifespan_years: number;
}

export interface BatteryParams {
  voltage_v: number;
  max_dod: number;
  cycle_lifespan: number;
}

export interface FuelCellParams {
  purchase_cost_kr: number | null;
  power_w: number | null;
  fuel_consumption_l_kwh: number | null;
  fuel_price_kr_l: number | null;
  lifespan_hours: number | null;
  annual_maintenance_kr: number | null;
}

export interface DieselGeneratorParams {
  purchase_cost_kr: number | null;
  power_w: number | null;
  fuel_consumption_l_kwh: number | null;
  fuel_price_kr_l: number | null;
  lifespan_hours: number | null;
  annual_maintenance_kr: number | null;
}

export interface OtherSettings {
  co2_factor_methanol: number;
  co2_factor_diesel: number;
  assessment_horizon_years: number;
}

export interface MonthlyIrradiation {
  jan: number;
  feb: number;
  mar: number;
  apr: number;
  may: number;
  jun: number;
  jul: number;
  aug: number;
  sep: number;
  oct: number;
  nov: number;
  dec: number;
}

export interface PowerBudgetItem {
  enabled: boolean;
  name: string;
  power_w: number;
  consumption_wh_day: number;
  consumption_ah_day: number;
  consumption_wh_week: number;
  consumption_ah_week: number;
}

export interface HydroConfigData {
  communication: CommunicationParams;
  facility: FacilityParams;
  operations: OperationsParams;
  solar: SolarParams;
  battery: BatteryParams;
  fuel_cell: FuelCellParams;
  diesel_generator: DieselGeneratorParams;
  other_settings: OtherSettings;
  monthly_irradiation: MonthlyIrradiation;
  power_budget: PowerBudgetItem[];
}

export interface QuestionnaireItem {
  field: string;
  question: string;
  guidance: string;
}

export interface QuestionnaireData {
  communication: QuestionnaireItem[];
  facility: QuestionnaireItem[];
  operations: QuestionnaireItem[];
}

export interface AnalysisRecommendation {
  category: string;
  severity: "info" | "warning" | "critical";
  title: string;
  description: string;
  suggestion: string;
}
