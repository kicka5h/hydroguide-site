export interface MonthlyEnergyBalance {
  month: string;
  days: number;
  load_kwh: number;
  solar_production_kwh: number;
  energy_balance_kwh: number;
  generator_hours: number;
  fuel_liters: number;
  fuel_cost_kr: number;
}

export interface EnergyBalanceResult {
  monthly: MonthlyEnergyBalance[];
  total_solar_production_kwh: number;
  total_load_kwh: number;
  total_secondary_kwh: number;
  total_energy_balance_kwh: number;
  total_generator_hours: number;
  total_fuel_liters: number;
  total_fuel_cost_kr: number;
}

export interface TcoComparison {
  fuel_cell_purchase_kr: number;
  fuel_cell_operating_kr_yr: number;
  fuel_cell_maintenance_kr_yr: number;
  fuel_cell_tco_kr: number;
  diesel_purchase_kr: number;
  diesel_operating_kr_yr: number;
  diesel_maintenance_kr_yr: number;
  diesel_tco_kr: number;
  assessment_horizon_years: number;
  recommended_source: string;
}

export interface RecommendedConfig {
  measurement_method: string;
  communication: string;
  logger_recommendation: string;
  energy_monitoring: string;
  secondary_source: string;
  secondary_source_power_w: number | null;
  solar_panel_count: number | null;
  battery_ah: number | null;
  fuel_consumption_l_yr: number | null;
  ice_adaptation: string;
  operational_requirements: string;
}

export interface ReferenceData {
  config: unknown;
  energy_balance: EnergyBalanceResult;
  tco: TcoComparison;
  recommended_config: RecommendedConfig;
  questionnaire: unknown;
  technical_comments: unknown;
  nve_requirements: unknown;
}
