import type { HydroConfigData, AnalysisRecommendation } from "@/types/config";
import type { EnergyBalanceResult, RecommendedConfig } from "@/types/reference";
import { dailyConsumptionWh, irradiationAsList } from "./calculations";

export function determineCommunication(config: HydroConfigData): string {
  if (config.communication.has_4g_coverage) return "4G modem";
  if (config.communication.has_nbiot_coverage) return "NB-IoT modem";
  if (config.communication.has_line_of_sight) return "Radio link";
  return "Satellite modem";
}

export function determineSecondarySource(config: HydroConfigData): string {
  if (config.operations.zero_emission_desired) return "Fuel cell (methanol)";
  return "Diesel generator";
}

export function deriveRecommendedConfig(config: HydroConfigData): RecommendedConfig {
  const comm = determineCommunication(config);
  const secondary = determineSecondarySource(config);
  const inspections = config.operations.inspections_per_year ?? 4;

  return {
    measurement_method:
      "Electromagnetic, orifice plate or ADP flow meter. " +
      "Pressure cell, bubble tube, float or ultrasound/radar sensor",
    communication: comm,
    logger_recommendation: inspections <= 4 ? "2 loggers + backup logger" : "1 logger + backup",
    energy_monitoring: config.communication.has_4g_coverage ? "Yes" : "No",
    secondary_source: secondary,
    secondary_source_power_w:
      secondary === "Diesel generator"
        ? config.diesel_generator.power_w
        : config.fuel_cell.power_w,
    solar_panel_count: config.solar.panel_count,
    battery_ah: config.operations.battery_bank_ah,
    fuel_consumption_l_yr: null,
    ice_adaptation: config.facility.ice_problems ? "Oppvarma sensor / radar" : "Standard",
    operational_requirements: config.facility.linear_flow ? "Standard" : "Straight run + laminar flow",
  };
}

export function deriveRecommendations(
  config: HydroConfigData,
  energyBalance: EnergyBalanceResult,
): AnalysisRecommendation[] {
  const recs: AnalysisRecommendation[] = [];
  const dWh = dailyConsumptionWh(config);

  // Solar sizing check
  const totalWp = (config.solar.panel_wattage_wp ?? 0) * config.solar.panel_count;
  const efficiency = config.solar.system_efficiency;
  const irrValues = irradiationAsList(config.monthly_irradiation);
  const positiveIrr = irrValues.filter((v) => v > 0);

  if (totalWp > 0 && positiveIrr.length > 0) {
    const worstMonthKwh = Math.min(...positiveIrr);
    const monthlyProductionWh = worstMonthKwh * totalWp * efficiency;
    const dailySolarWh = (monthlyProductionWh / 30) * 1000;

    if (dWh > 0 && dailySolarWh < dWh) {
      recs.push({
        category: "solar",
        severity: "warning",
        title: "Solcellekapasitet utilstrekkelig i verste månad",
        description: `Dagleg forbruk er ${dWh.toFixed(1)} Wh, men solpanela produserer berre ~${dailySolarWh.toFixed(1)} Wh/dag i den svakaste månaden.`,
        suggestion: "Vurder fleire panel eller ei sterkare sekundærkjelde.",
      });
    } else if (dWh > 0) {
      recs.push({
        category: "solar",
        severity: "info",
        title: "Solcelledimensjonering ser tilstrekkeleg ut",
        description: `Solpanela produserer ~${dailySolarWh.toFixed(1)} Wh/dag sjølv i svakaste månad (forbruk: ${dWh.toFixed(1)} Wh/dag).`,
        suggestion: "Ingen endring nødvendig.",
      });
    }
  }

  // Battery autonomy check
  const batteryAh = config.operations.battery_bank_ah;
  const voltage = config.battery.voltage_v;
  const dod = config.battery.max_dod;
  if (batteryAh && voltage && dWh > 0) {
    const usableWh = batteryAh * voltage * dod;
    const autonomyDays = usableWh / dWh;

    if (autonomyDays < 14) {
      recs.push({
        category: "battery",
        severity: "critical",
        title: "Batterikapasitet gir kort autonomi",
        description: `${batteryAh} Ah @ ${voltage}V (${(dod * 100).toFixed(0)}% DoD) = ${autonomyDays.toFixed(1)} dagars autonomi.`,
        suggestion: `Vurder å auke til minst ${((dWh * 14) / (voltage * dod)).toFixed(0)} Ah.`,
      });
    } else {
      recs.push({
        category: "battery",
        severity: "info",
        title: "Batterikapasitet tilfredsstiller autonomikrav",
        description: `Berekna autonomi: ${autonomyDays.toFixed(1)} dagar.`,
        suggestion: "Ingen endring nødvendig.",
      });
    }
  }

  // Communication
  const comm = determineCommunication(config);
  if (comm === "Satellite modem") {
    recs.push({
      category: "communication",
      severity: "warning",
      title: "Satellittkommunikasjon tilrådd",
      description: "Ingen 4G, NB-IoT eller siktlinje tilgjengeleg. Satellitt har høgare driftskostnad og straumforbruk.",
      suggestion: "Verifiser at straumbudsjettet inkluderer satellittmodem.",
    });
  }

  // Facility-specific
  if (config.facility.sediment_or_surge) {
    recs.push({
      category: "measurement",
      severity: "warning",
      title: "Sediment/surge påverkar sensorval",
      description: "Boblerøyr tilrådast over trykkcelle ved sediment/surge-problem.",
      suggestion: "Vel boblerøyr (bubble tube) som vasstandssensor.",
    });
  }

  if (config.facility.ice_problems) {
    recs.push({
      category: "measurement",
      severity: "warning",
      title: "Istilpassing nødvendig",
      description: "Is ved målestaden påverkar måleprofil og sensorval.",
      suggestion: "Vurder oppvarma sensor eller radar/ultralyd.",
    });
  }

  // Fuel cost summary
  if (energyBalance.total_fuel_liters > 0) {
    recs.push({
      category: "risk",
      severity: "info",
      title: "Årlege drivstoffkostnadar",
      description: `Estimert ${energyBalance.total_fuel_liters.toFixed(1)} liter/år (${energyBalance.total_fuel_cost_kr.toFixed(0)} kr/år).`,
      suggestion: "Sjå TCO-samanlikninga for heilskapsvurdering.",
    });
  }

  return recs;
}
