"""Energy balance calculator.

Replicates the formulas from the Solar_calculator.xlsx Results sheet
so we can validate our implementation against the spreadsheet output.

Core formula per month:
    solar_production_kwh = irradiation_kwh_m2 * (Wp / 1000) * num_panels * efficiency
    consumption_kwh = daily_wh / 1000 * days
    energy_balance_kwh = solar_production - consumption
    if balance < 0:
        generator_hours = abs(balance) / (source_power_kw)
        fuel_liters = abs(balance) * source_fuel_consumption_l_kwh
        fuel_cost = fuel_liters * source_fuel_price_kr_l

The "source" (diesel or fuel cell) is determined by the recommendation logic:
    - zero_emission_desired = Yes → fuel cell
    - inspections_per_year <= 3 → fuel cell
    - otherwise → diesel

This matches the Excel's IF($B$9="Diesel generator",...) conditional.

TCO includes replacement cost:
    annual_hours = total_deficit_kwh / (source_power_kw)
    replacements = MAX(0, FLOOR(horizon / (lifespan / annual_hours)) - 1)
    tco = purchase + horizon * (operating + maintenance) + replacements * purchase
"""

import math

from app.models.schemas import (
    EnergyBalanceResult,
    HydroConfigData,
    MonthlyEnergyBalance,
    TcoComparison,
)

DAYS_IN_MONTH = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
               "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]


def determine_recommended_source(config: HydroConfigData) -> str:
    """Determine the recommended secondary power source.

    Matches Excel formula: =IF(B21="Yes","Fuel cell (methanol)",
                              IF(B19<=3,"Fuel cell (methanol)","Diesel generator"))
    """
    if config.operations.zero_emission_desired:
        return "fuel_cell"
    if (config.operations.inspections_per_year or 4) <= 3:
        return "fuel_cell"
    return "diesel"


def calculate_energy_balance(config: HydroConfigData) -> EnergyBalanceResult:
    """Calculate monthly energy balance from config data.

    This mirrors the Excel's Results sheet energy balance table.
    The generator/fuel calculations use whichever secondary source
    is recommended (diesel or fuel cell), matching the Excel's
    IF($B$9="Diesel generator",...) conditionals.
    """
    # Total daily consumption from enabled equipment
    daily_wh = sum(
        item.consumption_wh_day for item in config.power_budget if item.enabled
    )
    daily_kwh = daily_wh / 1000

    # Solar parameters
    panel_wp = config.solar.panel_wattage_wp or 0
    panel_count = config.solar.panel_count
    efficiency = config.solar.system_efficiency
    total_wp = panel_wp * panel_count

    # Determine which secondary source to use for energy balance
    source = determine_recommended_source(config)

    if source == "fuel_cell":
        source_power_w = config.fuel_cell.power_w or 82
        source_fuel_consumption = config.fuel_cell.fuel_consumption_l_kwh or 0.9
        source_fuel_price = config.fuel_cell.fuel_price_kr_l or 75
    else:
        source_power_w = config.diesel_generator.power_w or 6500
        source_fuel_consumption = config.diesel_generator.fuel_consumption_l_kwh or 0.5
        source_fuel_price = config.diesel_generator.fuel_price_kr_l or 18.1

    source_power_kw = source_power_w / 1000

    irr_values = config.monthly_irradiation.as_list()

    monthly: list[MonthlyEnergyBalance] = []
    totals = {
        "solar": 0.0,
        "balance": 0.0,
        "gen_hours": 0.0,
        "fuel": 0.0,
        "cost": 0.0,
    }

    for i in range(12):
        days = DAYS_IN_MONTH[i]

        # Solar production (kWh) for this month
        # irradiation is in kWh/m² for the whole month
        # production = irradiation * (Wp/1000) * num_panels * efficiency
        solar_prod_kwh = irr_values[i] * (total_wp / 1000) * efficiency

        # Monthly consumption (kWh)
        consumption_kwh = daily_kwh * days

        # Energy balance
        balance_kwh = solar_prod_kwh - consumption_kwh

        # If deficit, calculate source runtime and fuel
        gen_hours = 0.0
        fuel_liters = 0.0
        fuel_cost_kr = 0.0

        if balance_kwh < 0:
            deficit_kwh = abs(balance_kwh)
            gen_hours = deficit_kwh / source_power_kw
            fuel_liters = deficit_kwh * source_fuel_consumption
            fuel_cost_kr = fuel_liters * source_fuel_price

        monthly.append(MonthlyEnergyBalance(
            month=MONTH_NAMES[i],
            days=days,
            solar_production_kwh=solar_prod_kwh,
            energy_balance_kwh=balance_kwh,
            generator_hours=gen_hours,
            fuel_liters=fuel_liters,
            fuel_cost_kr=fuel_cost_kr,
        ))

        totals["solar"] += solar_prod_kwh
        totals["balance"] += balance_kwh
        totals["gen_hours"] += gen_hours
        totals["fuel"] += fuel_liters
        totals["cost"] += fuel_cost_kr

    return EnergyBalanceResult(
        monthly=monthly,
        total_solar_production_kwh=totals["solar"],
        total_energy_balance_kwh=totals["balance"],
        total_generator_hours=totals["gen_hours"],
        total_fuel_liters=totals["fuel"],
        total_fuel_cost_kr=totals["cost"],
    )


def calculate_tco(config: HydroConfigData, annual_fuel_cost: float) -> TcoComparison:
    """Calculate Total Cost of Ownership comparing fuel cell vs diesel.

    Mirrors the Excel's Results sheet TCO table (rows 41-47).

    Includes replacement cost: if the unit's lifespan in hours is exceeded
    within the assessment horizon, additional purchase costs are added.

    Excel formula for TCO:
        timer = SUMPRODUCT(deficit_months) / (power_W / 1000)  [annual runtime hours]
        TCO = purchase + horizon * (operating + maintenance)
              + MAX(0, FLOOR(horizon / (lifespan / timer), 1) - 1) * purchase
    """
    horizon = config.other_settings.assessment_horizon_years
    fc = config.fuel_cell
    dg = config.diesel_generator

    # Calculate total annual deficit (kWh) from the annual fuel cost
    # by reversing: fuel_cost = deficit * consumption_rate * price
    # For the energy balance, the source used depends on recommendation
    source = determine_recommended_source(config)

    if source == "fuel_cell":
        # Energy balance used FC params, so reverse using FC values
        source_consumption = fc.fuel_consumption_l_kwh or 0.9
        source_price = fc.fuel_price_kr_l or 75
    else:
        source_consumption = dg.fuel_consumption_l_kwh or 0.5
        source_price = dg.fuel_price_kr_l or 18.1

    if source_consumption > 0 and source_price > 0:
        annual_fuel_liters = annual_fuel_cost / source_price
        deficit_kwh = annual_fuel_liters / source_consumption
    else:
        deficit_kwh = 0

    # ── Fuel cell operating cost ─────────────────────────────────────────
    # FC operating = deficit_kwh * fc_consumption * fc_price
    fc_annual_fuel_liters = deficit_kwh * (fc.fuel_consumption_l_kwh or 0.9)
    fc_annual_operating = fc_annual_fuel_liters * (fc.fuel_price_kr_l or 75)
    fc_annual_maintenance = fc.annual_maintenance_kr or 0
    fc_purchase = fc.purchase_cost_kr or 0

    # FC replacement cost
    fc_power_kw = (fc.power_w or 82) / 1000
    fc_annual_hours = deficit_kwh / fc_power_kw if fc_power_kw > 0 else 0
    fc_lifespan = fc.lifespan_hours or 6500
    if fc_annual_hours > 0:
        years_per_unit = fc_lifespan / fc_annual_hours
        fc_replacements = max(0, math.floor(horizon / years_per_unit) - 1)
    else:
        fc_replacements = 0

    # ── Diesel operating cost ────────────────────────────────────────────
    # DG operating = deficit_kwh * dg_consumption * dg_price
    dg_annual_fuel_liters = deficit_kwh * (dg.fuel_consumption_l_kwh or 0.5)
    dg_annual_operating = dg_annual_fuel_liters * (dg.fuel_price_kr_l or 18.1)
    dg_annual_maintenance = dg.annual_maintenance_kr or 0
    dg_purchase = dg.purchase_cost_kr or 0

    # DG replacement cost
    dg_power_kw = (dg.power_w or 6500) / 1000
    dg_annual_hours = deficit_kwh / dg_power_kw if dg_power_kw > 0 else 0
    dg_lifespan = dg.lifespan_hours or 43800
    if dg_annual_hours > 0:
        years_per_unit = dg_lifespan / dg_annual_hours
        dg_replacements = max(0, math.floor(horizon / years_per_unit) - 1)
    else:
        dg_replacements = 0

    # ── Total Cost of Ownership ──────────────────────────────────────────
    fc_tco = (
        fc_purchase
        + horizon * (fc_annual_operating + fc_annual_maintenance)
        + fc_replacements * fc_purchase
    )
    dg_tco = (
        dg_purchase
        + horizon * (dg_annual_operating + dg_annual_maintenance)
        + dg_replacements * dg_purchase
    )

    return TcoComparison(
        fuel_cell_purchase_kr=fc_purchase,
        fuel_cell_operating_kr_yr=fc_annual_operating,
        fuel_cell_maintenance_kr_yr=fc_annual_maintenance,
        fuel_cell_tco_kr=fc_tco,
        diesel_purchase_kr=dg_purchase,
        diesel_operating_kr_yr=dg_annual_operating,
        diesel_maintenance_kr_yr=dg_annual_maintenance,
        diesel_tco_kr=dg_tco,
        assessment_horizon_years=horizon,
        recommended_source="fuel_cell" if fc_tco < dg_tco else "diesel",
    )
