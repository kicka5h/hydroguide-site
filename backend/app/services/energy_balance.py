"""Energy balance calculator.

Replicates the formulas from the Solar_calculator.xlsx Results sheet
so we can validate our implementation against the spreadsheet output.

Core formula per month:
    solar_production_kwh = irradiation_kwh_m2 * (Wp / 1000) * num_panels * efficiency
    consumption_kwh = daily_wh / 1000 * days
    energy_balance_kwh = solar_production - consumption
    if balance < 0:
        generator_hours = abs(balance) / (generator_power_kw)
        fuel_liters = generator_hours * fuel_consumption_l_kwh * generator_power_kw
            (simplified: fuel = abs(balance) * fuel_consumption_l_kwh)
        fuel_cost = fuel_liters * fuel_price_kr_l
"""

from app.models.schemas import (
    EnergyBalanceResult,
    HydroConfigData,
    MonthlyEnergyBalance,
    TcoComparison,
)

DAYS_IN_MONTH = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
               "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]


def calculate_energy_balance(config: HydroConfigData) -> EnergyBalanceResult:
    """Calculate monthly energy balance from config data.

    This mirrors the Excel's Results sheet energy balance table.
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

    # Generator parameters (diesel by default)
    gen_power_w = config.diesel_generator.power_w or 6500
    gen_power_kw = gen_power_w / 1000
    fuel_consumption = config.diesel_generator.fuel_consumption_l_kwh or 0.5
    fuel_price = config.diesel_generator.fuel_price_kr_l or 18.1

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

        # If deficit, calculate generator runtime and fuel
        gen_hours = 0.0
        fuel_liters = 0.0
        fuel_cost_kr = 0.0

        if balance_kwh < 0:
            deficit_kwh = abs(balance_kwh)
            gen_hours = deficit_kwh / gen_power_kw
            fuel_liters = deficit_kwh * fuel_consumption
            fuel_cost_kr = fuel_liters * fuel_price

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


def calculate_tco(config: HydroConfigData, diesel_annual_fuel_cost: float) -> TcoComparison:
    """Calculate Total Cost of Ownership comparing fuel cell vs diesel.

    Mirrors the Excel's Results sheet TCO table (rows 41-47).
    """
    horizon = config.other_settings.assessment_horizon_years
    fc = config.fuel_cell
    dg = config.diesel_generator

    # Fuel cell annual operating cost:
    # Uses same deficit hours but with fuel cell params
    # For simplicity, calculate from diesel fuel cost ratio
    # FC operating cost = deficit_kwh * fc_fuel_consumption * fc_fuel_price
    # We derive deficit_kwh from diesel: diesel_fuel / diesel_consumption_rate
    if dg.fuel_consumption_l_kwh and dg.fuel_consumption_l_kwh > 0:
        total_deficit_kwh = (
            diesel_annual_fuel_cost / (dg.fuel_price_kr_l or 18.1)
        ) / dg.fuel_consumption_l_kwh * dg.fuel_consumption_l_kwh
        # Actually: diesel_annual_fuel_liters = diesel_annual_fuel_cost / diesel_price
        # deficit_kwh = diesel_annual_fuel_liters / diesel_consumption_l_kwh
        diesel_annual_liters = diesel_annual_fuel_cost / (dg.fuel_price_kr_l or 18.1)
        deficit_kwh = diesel_annual_liters / (dg.fuel_consumption_l_kwh or 0.5)
    else:
        deficit_kwh = 0

    fc_annual_fuel_liters = deficit_kwh * (fc.fuel_consumption_l_kwh or 0.9)
    fc_annual_operating = fc_annual_fuel_liters * (fc.fuel_price_kr_l or 75)
    fc_annual_maintenance = fc.annual_maintenance_kr or 0
    fc_purchase = fc.purchase_cost_kr or 0

    dg_annual_operating = diesel_annual_fuel_cost
    dg_annual_maintenance = dg.annual_maintenance_kr or 0
    dg_purchase = dg.purchase_cost_kr or 0

    fc_tco = fc_purchase + horizon * (fc_annual_operating + fc_annual_maintenance)
    dg_tco = dg_purchase + horizon * (dg_annual_operating + dg_annual_maintenance)

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
