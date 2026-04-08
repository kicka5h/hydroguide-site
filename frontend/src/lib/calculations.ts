import type { HydroConfigData } from "@/types/config";
import type { EnergyBalanceResult, MonthlyEnergyBalance, TcoComparison } from "@/types/reference";

const DAYS_IN_MONTH = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "Mai", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Des"];

export function irradiationAsList(irr: HydroConfigData["monthly_irradiation"]): number[] {
  return [irr.jan, irr.feb, irr.mar, irr.apr, irr.may, irr.jun,
          irr.jul, irr.aug, irr.sep, irr.oct, irr.nov, irr.dec];
}

export function determineRecommendedSource(config: HydroConfigData): "fuel_cell" | "diesel" {
  if (config.operations.zero_emission_desired) return "fuel_cell";
  if ((config.operations.inspections_per_year ?? 4) <= 3) return "fuel_cell";
  return "diesel";
}

export function dailyConsumptionWh(config: HydroConfigData): number {
  return config.power_budget
    .filter((item) => item.enabled)
    .reduce((sum, item) => sum + item.consumption_wh_day, 0);
}

export function calculateEnergyBalance(config: HydroConfigData, sourceOverride?: "fuel_cell" | "diesel"): EnergyBalanceResult {
  const dailyWh = dailyConsumptionWh(config);
  const dailyKwh = dailyWh / 1000;

  const panelWp = config.solar.panel_wattage_wp ?? 0;
  const totalWp = panelWp * config.solar.panel_count;
  const efficiency = config.solar.system_efficiency;

  const source = sourceOverride ?? determineRecommendedSource(config);
  // When the user disables a secondary source, treat the system as solar-only:
  // monthly deficit is still reported via energy_balance_kwh, but no generator
  // runtime / fuel is consumed. has_reserve_source === null is treated as
  // "unset" and falls back to enabled (the historical default).
  const hasSecondary = config.operations.has_reserve_source !== false;

  let sourcePowerW: number, sourceFuelConsumption: number, sourceFuelPrice: number;

  if (source === "fuel_cell") {
    sourcePowerW = config.fuel_cell.power_w ?? 82;
    sourceFuelConsumption = config.fuel_cell.fuel_consumption_l_kwh ?? 0.9;
    sourceFuelPrice = config.fuel_cell.fuel_price_kr_l ?? 75;
  } else {
    sourcePowerW = config.diesel_generator.power_w ?? 6500;
    sourceFuelConsumption = config.diesel_generator.fuel_consumption_l_kwh ?? 0.5;
    sourceFuelPrice = config.diesel_generator.fuel_price_kr_l ?? 18.1;
  }

  const sourcePowerKw = sourcePowerW / 1000;
  const irrValues = irradiationAsList(config.monthly_irradiation);

  const monthly: MonthlyEnergyBalance[] = [];
  let totalSolar = 0, totalLoad = 0, totalSecondary = 0, totalBalance = 0;
  let totalGenHours = 0, totalFuel = 0, totalCost = 0;

  for (let i = 0; i < 12; i++) {
    const days = DAYS_IN_MONTH[i];
    const solarProdKwh = irrValues[i] * (totalWp / 1000) * efficiency;
    const consumptionKwh = dailyKwh * days;
    const balanceKwh = solarProdKwh - consumptionKwh;

    let genHours = 0, fuelLiters = 0, fuelCostKr = 0, secondaryKwh = 0;
    if (balanceKwh < 0 && hasSecondary) {
      const deficit = Math.abs(balanceKwh);
      secondaryKwh = deficit;
      genHours = deficit / sourcePowerKw;
      fuelLiters = deficit * sourceFuelConsumption;
      fuelCostKr = fuelLiters * sourceFuelPrice;
    }

    monthly.push({
      month: MONTH_NAMES[i],
      days,
      load_kwh: consumptionKwh,
      solar_production_kwh: solarProdKwh,
      energy_balance_kwh: balanceKwh,
      generator_hours: genHours,
      fuel_liters: fuelLiters,
      fuel_cost_kr: fuelCostKr,
    });

    totalSolar += solarProdKwh;
    totalLoad += consumptionKwh;
    totalSecondary += secondaryKwh;
    totalBalance += balanceKwh;
    totalGenHours += genHours;
    totalFuel += fuelLiters;
    totalCost += fuelCostKr;
  }

  return {
    monthly,
    total_solar_production_kwh: totalSolar,
    total_load_kwh: totalLoad,
    total_secondary_kwh: totalSecondary,
    total_energy_balance_kwh: totalBalance,
    total_generator_hours: totalGenHours,
    total_fuel_liters: totalFuel,
    total_fuel_cost_kr: totalCost,
  };
}

export function calculateTco(config: HydroConfigData, deficitKwh: number): TcoComparison {
  const horizon = config.other_settings.assessment_horizon_years;
  const fc = config.fuel_cell;
  const dg = config.diesel_generator;

  // Fuel cell
  const fcConsumption = fc.fuel_consumption_l_kwh ?? 0.9;
  const fcPrice = fc.fuel_price_kr_l ?? 75;
  const fcAnnualOperating = deficitKwh * fcConsumption * fcPrice;
  const fcMaintenance = fc.annual_maintenance_kr ?? 0;
  const fcPurchase = fc.purchase_cost_kr ?? 0;
  const fcPowerKw = (fc.power_w ?? 82) / 1000;
  const fcAnnualHours = fcPowerKw > 0 ? deficitKwh / fcPowerKw : 0;
  const fcLifespan = fc.lifespan_hours ?? 6500;
  const fcReplacements = fcAnnualHours > 0
    ? Math.max(0, Math.floor(horizon / (fcLifespan / fcAnnualHours)) - 1) : 0;

  // Diesel
  const dgConsumption = dg.fuel_consumption_l_kwh ?? 0.5;
  const dgPrice = dg.fuel_price_kr_l ?? 18.1;
  const dgAnnualOperating = deficitKwh * dgConsumption * dgPrice;
  const dgMaintenance = dg.annual_maintenance_kr ?? 0;
  const dgPurchase = dg.purchase_cost_kr ?? 0;
  const dgPowerKw = (dg.power_w ?? 6500) / 1000;
  const dgAnnualHours = dgPowerKw > 0 ? deficitKwh / dgPowerKw : 0;
  const dgLifespan = dg.lifespan_hours ?? 43800;
  const dgReplacements = dgAnnualHours > 0
    ? Math.max(0, Math.floor(horizon / (dgLifespan / dgAnnualHours)) - 1) : 0;

  const fcTco = fcPurchase + horizon * (fcAnnualOperating + fcMaintenance) + fcReplacements * fcPurchase;
  const dgTco = dgPurchase + horizon * (dgAnnualOperating + dgMaintenance) + dgReplacements * dgPurchase;

  return {
    fuel_cell_purchase_kr: fcPurchase,
    fuel_cell_operating_kr_yr: fcAnnualOperating,
    fuel_cell_maintenance_kr_yr: fcMaintenance,
    fuel_cell_tco_kr: fcTco,
    diesel_purchase_kr: dgPurchase,
    diesel_operating_kr_yr: dgAnnualOperating,
    diesel_maintenance_kr_yr: dgMaintenance,
    diesel_tco_kr: dgTco,
    assessment_horizon_years: horizon,
    recommended_source: fcTco < dgTco ? "fuel_cell" : "diesel",
  };
}
