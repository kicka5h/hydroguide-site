"""Cross-validation test suite.

Implements the exact Excel cell formulas as an independent "simulator",
then varies inputs across many combinations and verifies our Python
calculator produces identical results.

This catches any drift between our implementation and the spreadsheet logic,
even for input combinations the students never tested.

Excel formula references (from Solar_calculator.xlsx):
    Results!C27 = Input!C66 * (Input!$C$31 * Input!$C$32 / 1000) * Input!$C$33
    Results!D27 = C27 - ('Power Budget'!$E$19 * B27) / 1000
    Results!E27 = IF(D27<0, ABS(D27) / (IF($B$9="Diesel generator", Input!$C$53, Input!$C$45) / 1000), 0)
    Results!F27 = IF(D27<0, ABS(D27) * IF($B$9="Diesel generator", Input!$C$54, Input!$C$46), 0)
    Results!G27 = F27 * IF($B$9="Diesel generator", Input!$C$55, Input!$C$47)
    Results!C44 (FC op) = SUMPRODUCT((D27:D38<0) * ABS(D27:D38) * Input!$C$46 * Input!$C$47)
    Results!D44 (DG op) = SUMPRODUCT((D27:D38<0) * ABS(D27:D38) * Input!$C$54 * Input!$C$55)
    Results!C47 (FC TCO) = purchase + horizon*(op+maint) + MAX(0,FLOOR(horizon/(lifespan/timer))-1)*purchase
    Results!D47 (DG TCO) = purchase + horizon*(op+maint) + MAX(0,FLOOR(horizon/(lifespan/timer))-1)*purchase
"""

import math

import pytest

from app.models.schemas import (
    DieselGeneratorParams,
    FuelCellParams,
    HydroConfigData,
    MonthlyIrradiation,
    OperationsParams,
    OtherSettings,
    PowerBudgetItem,
    SolarParams,
)
from app.services.energy_balance import (
    DAYS_IN_MONTH,
    calculate_energy_balance,
    calculate_tco,
    determine_recommended_source,
)


# ═══════════════════════════════════════════════════════════════════════════════
# EXCEL FORMULA SIMULATOR
# Direct translation of cell formulas — no shared code with energy_balance.py
# ═══════════════════════════════════════════════════════════════════════════════

MONTH_DAYS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]


def excel_determine_source(
    zero_emission: bool, inspections: int
) -> str:
    """Results!B9 = IF(B21="Yes","Fuel cell (methanol)",IF(B19<=3,"Fuel cell","Diesel"))"""
    if zero_emission:
        return "fuel_cell"
    if inspections <= 3:
        return "fuel_cell"
    return "diesel"


def excel_solar_production(
    irradiation_kwh_m2: float,
    panel_wp: float,       # Input!C31
    panel_count: int,      # Input!C32
    efficiency: float,     # Input!C33
) -> float:
    """Results!C27 = Input!C66 * (Input!$C$31 * Input!$C$32 / 1000) * Input!$C$33"""
    return irradiation_kwh_m2 * (panel_wp * panel_count / 1000) * efficiency


def excel_energy_balance(
    solar_production_kwh: float,
    daily_wh_total: float,   # Power Budget!E19
    days: int,               # Results!B27
) -> float:
    """Results!D27 = C27 - ('Power Budget'!$E$19 * B27) / 1000"""
    return solar_production_kwh - (daily_wh_total * days) / 1000


def excel_operating_hours(
    balance_kwh: float,
    source_power_w: float,   # Input!C53 or Input!C45
) -> float:
    """Results!E27 = IF(D27<0, ABS(D27) / (source_power / 1000), 0)"""
    if balance_kwh < 0:
        return abs(balance_kwh) / (source_power_w / 1000)
    return 0.0


def excel_fuel_liters(
    balance_kwh: float,
    source_fuel_consumption: float,  # Input!C54 or Input!C46
) -> float:
    """Results!F27 = IF(D27<0, ABS(D27) * source_fuel_consumption, 0)"""
    if balance_kwh < 0:
        return abs(balance_kwh) * source_fuel_consumption
    return 0.0


def excel_fuel_cost(
    fuel_liters: float,
    source_fuel_price: float,  # Input!C55 or Input!C47
) -> float:
    """Results!G27 = F27 * source_fuel_price"""
    return fuel_liters * source_fuel_price


def excel_tco_operating(
    monthly_balances: list[float],
    fuel_consumption: float,
    fuel_price: float,
) -> float:
    """Results!C44 = SUMPRODUCT((D27:D38<0) * ABS(D27:D38) * consumption * price)"""
    return sum(
        abs(b) * fuel_consumption * fuel_price
        for b in monthly_balances
        if b < 0
    )


def excel_tco(
    purchase: float,
    operating_yr: float,
    maintenance_yr: float,
    horizon: int,
    lifespan_hours: float,
    annual_hours: float,
) -> float:
    """Results!C47 = purchase + horizon*(op+maint) + MAX(0,FLOOR(horizon/(lifespan/timer))-1)*purchase"""
    base = purchase + horizon * (operating_yr + maintenance_yr)
    if annual_hours > 0 and lifespan_hours > 0:
        years_per_unit = lifespan_hours / annual_hours
        replacements = max(0, math.floor(horizon / years_per_unit) - 1)
    else:
        replacements = 0
    return base + replacements * purchase


def simulate_excel(
    panel_wp: float,
    panel_count: int,
    efficiency: float,
    irradiation: list[float],
    daily_wh: float,
    inspections: int,
    zero_emission: bool,
    fc_power_w: float,
    fc_consumption: float,
    fc_price: float,
    fc_purchase: float,
    fc_maintenance: float,
    fc_lifespan: int,
    dg_power_w: float,
    dg_consumption: float,
    dg_price: float,
    dg_purchase: float,
    dg_maintenance: float,
    dg_lifespan: int,
    horizon: int,
) -> dict:
    """Run the complete Excel simulation and return all computed values."""
    source = excel_determine_source(zero_emission, inspections)

    if source == "fuel_cell":
        src_power = fc_power_w
        src_consumption = fc_consumption
        src_price = fc_price
    else:
        src_power = dg_power_w
        src_consumption = dg_consumption
        src_price = dg_price

    monthly_solar = []
    monthly_balance = []
    monthly_hours = []
    monthly_fuel = []
    monthly_cost = []

    for i in range(12):
        solar = excel_solar_production(irradiation[i], panel_wp, panel_count, efficiency)
        balance = excel_energy_balance(solar, daily_wh, MONTH_DAYS[i])
        hours = excel_operating_hours(balance, src_power)
        fuel = excel_fuel_liters(balance, src_consumption)
        cost = excel_fuel_cost(fuel, src_price)

        monthly_solar.append(solar)
        monthly_balance.append(balance)
        monthly_hours.append(hours)
        monthly_fuel.append(fuel)
        monthly_cost.append(cost)

    # TCO operating costs (always computed independently for each source)
    fc_operating = excel_tco_operating(monthly_balance, fc_consumption, fc_price)
    dg_operating = excel_tco_operating(monthly_balance, dg_consumption, dg_price)

    # Total deficit for runtime calculation
    total_deficit = sum(abs(b) for b in monthly_balance if b < 0)

    fc_annual_hours = total_deficit / (fc_power_w / 1000) if fc_power_w > 0 else 0
    dg_annual_hours = total_deficit / (dg_power_w / 1000) if dg_power_w > 0 else 0

    fc_tco = excel_tco(fc_purchase, fc_operating, fc_maintenance, horizon, fc_lifespan, fc_annual_hours)
    dg_tco = excel_tco(dg_purchase, dg_operating, dg_maintenance, horizon, dg_lifespan, dg_annual_hours)

    return {
        "source": source,
        "monthly_solar": monthly_solar,
        "monthly_balance": monthly_balance,
        "monthly_hours": monthly_hours,
        "monthly_fuel": monthly_fuel,
        "monthly_cost": monthly_cost,
        "total_solar": sum(monthly_solar),
        "total_balance": sum(monthly_balance),
        "total_hours": sum(monthly_hours),
        "total_fuel": sum(monthly_fuel),
        "total_cost": sum(monthly_cost),
        "fc_operating_yr": fc_operating,
        "dg_operating_yr": dg_operating,
        "fc_tco": fc_tco,
        "dg_tco": dg_tco,
    }


# ═══════════════════════════════════════════════════════════════════════════════
# HELPER: Build HydroConfigData from raw params
# ═══════════════════════════════════════════════════════════════════════════════


def _build_config(params: dict) -> HydroConfigData:
    """Build a HydroConfigData from a flat params dict."""
    month_keys = ["jan", "feb", "mar", "apr", "may", "jun",
                  "jul", "aug", "sep", "oct", "nov", "dec"]
    irr_dict = {k: v for k, v in zip(month_keys, params["irradiation"])}

    return HydroConfigData(
        operations=OperationsParams(
            inspections_per_year=params["inspections"],
            zero_emission_desired=params["zero_emission"],
        ),
        solar=SolarParams(
            panel_wattage_wp=params["panel_wp"],
            panel_count=params["panel_count"],
            system_efficiency=params["efficiency"],
        ),
        monthly_irradiation=MonthlyIrradiation(**irr_dict),
        power_budget=[
            PowerBudgetItem(
                enabled=True, name="Load",
                power_w=params["daily_wh"] / 24,
                consumption_wh_day=params["daily_wh"],
            ),
        ] if params["daily_wh"] > 0 else [],
        fuel_cell=FuelCellParams(
            purchase_cost_kr=params["fc_purchase"],
            power_w=params["fc_power_w"],
            fuel_consumption_l_kwh=params["fc_consumption"],
            fuel_price_kr_l=params["fc_price"],
            lifespan_hours=params["fc_lifespan"],
            annual_maintenance_kr=params["fc_maintenance"],
        ),
        diesel_generator=DieselGeneratorParams(
            purchase_cost_kr=params["dg_purchase"],
            power_w=params["dg_power_w"],
            fuel_consumption_l_kwh=params["dg_consumption"],
            fuel_price_kr_l=params["dg_price"],
            lifespan_hours=params["dg_lifespan"],
            annual_maintenance_kr=params["dg_maintenance"],
        ),
        other_settings=OtherSettings(
            assessment_horizon_years=params["horizon"],
        ),
    )


# ═══════════════════════════════════════════════════════════════════════════════
# TEST SCENARIOS — each is a complete parameter set
# ═══════════════════════════════════════════════════════════════════════════════

# Norwegian irradiation patterns (kWh/m² monthly totals)
IRR_SOUTHERN_NORWAY = [0.5, 1.5, 15, 45, 65, 70, 68, 55, 30, 5, 0.8, 0.2]
IRR_NORTHERN_NORWAY = [0.0, 0.1, 3, 15, 40, 55, 50, 30, 10, 1, 0.0, 0.0]
IRR_ARCTIC = [0, 0, 0, 5, 25, 40, 35, 15, 3, 0, 0, 0]
IRR_UNIFORM_HIGH = [50] * 12
IRR_UNIFORM_LOW = [2] * 12
IRR_ZERO = [0] * 12

SCENARIOS = {
    # ── Reference config (diesel source) ─────────────────────────────────
    "reference": dict(
        panel_wp=425, panel_count=2, efficiency=0.8,
        irradiation=[0.11, 1.02, 21.44, 61.44, 79.35, 79.30,
                     80.63, 71.42, 37.71, 3.06, 0.26, 0.017],
        daily_wh=660.7, inspections=4, zero_emission=False,
        fc_power_w=82, fc_consumption=0.9, fc_price=75,
        fc_purchase=88000, fc_maintenance=100, fc_lifespan=6500,
        dg_power_w=6500, dg_consumption=0.5, dg_price=18.1,
        dg_purchase=35000, dg_maintenance=25000, dg_lifespan=43800,
        horizon=10,
    ),
    # ── Fuel cell source (zero emission) ─────────────────────────────────
    "fuel_cell_zero_emission": dict(
        panel_wp=425, panel_count=2, efficiency=0.8,
        irradiation=IRR_SOUTHERN_NORWAY,
        daily_wh=660.7, inspections=4, zero_emission=True,
        fc_power_w=82, fc_consumption=0.9, fc_price=75,
        fc_purchase=88000, fc_maintenance=100, fc_lifespan=6500,
        dg_power_w=6500, dg_consumption=0.5, dg_price=18.1,
        dg_purchase=35000, dg_maintenance=25000, dg_lifespan=43800,
        horizon=10,
    ),
    # ── Fuel cell source (few inspections) ───────────────────────────────
    "fuel_cell_few_inspections": dict(
        panel_wp=200, panel_count=1, efficiency=0.75,
        irradiation=IRR_NORTHERN_NORWAY,
        daily_wh=300, inspections=2, zero_emission=False,
        fc_power_w=82, fc_consumption=0.9, fc_price=75,
        fc_purchase=88000, fc_maintenance=100, fc_lifespan=6500,
        dg_power_w=6500, dg_consumption=0.5, dg_price=18.1,
        dg_purchase=35000, dg_maintenance=25000, dg_lifespan=43800,
        horizon=10,
    ),
    # ── Small panel, large load ──────────────────────────────────────────
    "undersized_solar": dict(
        panel_wp=50, panel_count=1, efficiency=0.7,
        irradiation=IRR_ARCTIC,
        daily_wh=800, inspections=4, zero_emission=False,
        fc_power_w=82, fc_consumption=0.9, fc_price=75,
        fc_purchase=88000, fc_maintenance=100, fc_lifespan=6500,
        dg_power_w=6500, dg_consumption=0.5, dg_price=18.1,
        dg_purchase=35000, dg_maintenance=25000, dg_lifespan=43800,
        horizon=10,
    ),
    # ── Oversized solar, tiny load ───────────────────────────────────────
    "oversized_solar": dict(
        panel_wp=500, panel_count=4, efficiency=0.85,
        irradiation=IRR_UNIFORM_HIGH,
        daily_wh=50, inspections=12, zero_emission=False,
        fc_power_w=82, fc_consumption=0.9, fc_price=75,
        fc_purchase=88000, fc_maintenance=100, fc_lifespan=6500,
        dg_power_w=6500, dg_consumption=0.5, dg_price=18.1,
        dg_purchase=35000, dg_maintenance=25000, dg_lifespan=43800,
        horizon=10,
    ),
    # ── No solar panels at all ───────────────────────────────────────────
    "no_solar": dict(
        panel_wp=0, panel_count=1, efficiency=0.8,
        irradiation=IRR_SOUTHERN_NORWAY,
        daily_wh=500, inspections=4, zero_emission=False,
        fc_power_w=82, fc_consumption=0.9, fc_price=75,
        fc_purchase=88000, fc_maintenance=100, fc_lifespan=6500,
        dg_power_w=6500, dg_consumption=0.5, dg_price=18.1,
        dg_purchase=35000, dg_maintenance=25000, dg_lifespan=43800,
        horizon=10,
    ),
    # ── Zero load ────────────────────────────────────────────────────────
    "zero_load": dict(
        panel_wp=200, panel_count=2, efficiency=0.8,
        irradiation=IRR_SOUTHERN_NORWAY,
        daily_wh=0, inspections=4, zero_emission=False,
        fc_power_w=82, fc_consumption=0.9, fc_price=75,
        fc_purchase=88000, fc_maintenance=100, fc_lifespan=6500,
        dg_power_w=6500, dg_consumption=0.5, dg_price=18.1,
        dg_purchase=35000, dg_maintenance=25000, dg_lifespan=43800,
        horizon=10,
    ),
    # ── Long horizon with FC replacement ─────────────────────────────────
    "long_horizon_fc_replacement": dict(
        panel_wp=100, panel_count=1, efficiency=0.8,
        irradiation=IRR_UNIFORM_LOW,
        daily_wh=400, inspections=1, zero_emission=True,
        fc_power_w=82, fc_consumption=0.9, fc_price=75,
        fc_purchase=88000, fc_maintenance=100, fc_lifespan=2000,
        dg_power_w=6500, dg_consumption=0.5, dg_price=18.1,
        dg_purchase=35000, dg_maintenance=25000, dg_lifespan=43800,
        horizon=20,
    ),
    # ── Short lifespan diesel ────────────────────────────────────────────
    "short_lifespan_diesel": dict(
        panel_wp=100, panel_count=1, efficiency=0.8,
        irradiation=IRR_UNIFORM_LOW,
        daily_wh=1000, inspections=6, zero_emission=False,
        fc_power_w=82, fc_consumption=0.9, fc_price=75,
        fc_purchase=88000, fc_maintenance=100, fc_lifespan=6500,
        dg_power_w=2000, dg_consumption=0.6, dg_price=20,
        dg_purchase=15000, dg_maintenance=5000, dg_lifespan=500,
        horizon=15,
    ),
    # ── Expensive fuel cell, cheap diesel ────────────────────────────────
    "expensive_fc": dict(
        panel_wp=300, panel_count=2, efficiency=0.8,
        irradiation=IRR_NORTHERN_NORWAY,
        daily_wh=500, inspections=4, zero_emission=False,
        fc_power_w=50, fc_consumption=1.2, fc_price=100,
        fc_purchase=120000, fc_maintenance=500, fc_lifespan=4000,
        dg_power_w=8000, dg_consumption=0.4, dg_price=15,
        dg_purchase=20000, dg_maintenance=10000, dg_lifespan=50000,
        horizon=10,
    ),
    # ── High efficiency panels ───────────────────────────────────────────
    "high_efficiency": dict(
        panel_wp=400, panel_count=3, efficiency=0.95,
        irradiation=IRR_SOUTHERN_NORWAY,
        daily_wh=200, inspections=4, zero_emission=False,
        fc_power_w=82, fc_consumption=0.9, fc_price=75,
        fc_purchase=88000, fc_maintenance=100, fc_lifespan=6500,
        dg_power_w=6500, dg_consumption=0.5, dg_price=18.1,
        dg_purchase=35000, dg_maintenance=25000, dg_lifespan=43800,
        horizon=10,
    ),
    # ── Low efficiency, many panels ──────────────────────────────────────
    "low_efficiency_many_panels": dict(
        panel_wp=150, panel_count=6, efficiency=0.6,
        irradiation=IRR_NORTHERN_NORWAY,
        daily_wh=750, inspections=3, zero_emission=False,
        fc_power_w=82, fc_consumption=0.9, fc_price=75,
        fc_purchase=88000, fc_maintenance=100, fc_lifespan=6500,
        dg_power_w=6500, dg_consumption=0.5, dg_price=18.1,
        dg_purchase=35000, dg_maintenance=25000, dg_lifespan=43800,
        horizon=10,
    ),
    # ── 1-year horizon ───────────────────────────────────────────────────
    "one_year_horizon": dict(
        panel_wp=425, panel_count=2, efficiency=0.8,
        irradiation=IRR_SOUTHERN_NORWAY,
        daily_wh=660.7, inspections=4, zero_emission=False,
        fc_power_w=82, fc_consumption=0.9, fc_price=75,
        fc_purchase=88000, fc_maintenance=100, fc_lifespan=6500,
        dg_power_w=6500, dg_consumption=0.5, dg_price=18.1,
        dg_purchase=35000, dg_maintenance=25000, dg_lifespan=43800,
        horizon=1,
    ),
    # ── Minimal system ───────────────────────────────────────────────────
    "minimal_system": dict(
        panel_wp=20, panel_count=1, efficiency=0.7,
        irradiation=IRR_ARCTIC,
        daily_wh=24, inspections=1, zero_emission=False,
        fc_power_w=30, fc_consumption=1.0, fc_price=80,
        fc_purchase=50000, fc_maintenance=200, fc_lifespan=3000,
        dg_power_w=1000, dg_consumption=0.8, dg_price=22,
        dg_purchase=8000, dg_maintenance=3000, dg_lifespan=20000,
        horizon=5,
    ),
}


# ═══════════════════════════════════════════════════════════════════════════════
# CROSS-VALIDATION TESTS
# ═══════════════════════════════════════════════════════════════════════════════


class TestCrossValidationMonthly:
    """Compare Python calculator vs Excel simulator, month by month."""

    @pytest.mark.parametrize("scenario_name", list(SCENARIOS.keys()))
    def test_monthly_solar_production(self, scenario_name):
        params = SCENARIOS[scenario_name]
        excel = simulate_excel(**params)
        config = _build_config(params)
        calc = calculate_energy_balance(config)

        for i in range(12):
            assert calc.monthly[i].solar_production_kwh == pytest.approx(
                excel["monthly_solar"][i], abs=1e-10
            ), f"Scenario {scenario_name}, month {i}: solar mismatch"

    @pytest.mark.parametrize("scenario_name", list(SCENARIOS.keys()))
    def test_monthly_energy_balance(self, scenario_name):
        params = SCENARIOS[scenario_name]
        excel = simulate_excel(**params)
        config = _build_config(params)
        calc = calculate_energy_balance(config)

        for i in range(12):
            assert calc.monthly[i].energy_balance_kwh == pytest.approx(
                excel["monthly_balance"][i], abs=1e-10
            ), f"Scenario {scenario_name}, month {i}: balance mismatch"

    @pytest.mark.parametrize("scenario_name", list(SCENARIOS.keys()))
    def test_monthly_generator_hours(self, scenario_name):
        params = SCENARIOS[scenario_name]
        excel = simulate_excel(**params)
        config = _build_config(params)
        calc = calculate_energy_balance(config)

        for i in range(12):
            assert calc.monthly[i].generator_hours == pytest.approx(
                excel["monthly_hours"][i], abs=1e-10
            ), f"Scenario {scenario_name}, month {i}: hours mismatch"

    @pytest.mark.parametrize("scenario_name", list(SCENARIOS.keys()))
    def test_monthly_fuel(self, scenario_name):
        params = SCENARIOS[scenario_name]
        excel = simulate_excel(**params)
        config = _build_config(params)
        calc = calculate_energy_balance(config)

        for i in range(12):
            assert calc.monthly[i].fuel_liters == pytest.approx(
                excel["monthly_fuel"][i], abs=1e-10
            ), f"Scenario {scenario_name}, month {i}: fuel mismatch"

    @pytest.mark.parametrize("scenario_name", list(SCENARIOS.keys()))
    def test_monthly_fuel_cost(self, scenario_name):
        params = SCENARIOS[scenario_name]
        excel = simulate_excel(**params)
        config = _build_config(params)
        calc = calculate_energy_balance(config)

        for i in range(12):
            assert calc.monthly[i].fuel_cost_kr == pytest.approx(
                excel["monthly_cost"][i], abs=1e-8
            ), f"Scenario {scenario_name}, month {i}: cost mismatch"


class TestCrossValidationAnnual:
    """Compare annual totals between Python calculator and Excel simulator."""

    @pytest.mark.parametrize("scenario_name", list(SCENARIOS.keys()))
    def test_annual_totals(self, scenario_name):
        params = SCENARIOS[scenario_name]
        excel = simulate_excel(**params)
        config = _build_config(params)
        calc = calculate_energy_balance(config)

        assert calc.total_solar_production_kwh == pytest.approx(
            excel["total_solar"], abs=1e-10
        ), f"{scenario_name}: annual solar mismatch"
        assert calc.total_energy_balance_kwh == pytest.approx(
            excel["total_balance"], abs=1e-10
        ), f"{scenario_name}: annual balance mismatch"
        assert calc.total_generator_hours == pytest.approx(
            excel["total_hours"], abs=1e-10
        ), f"{scenario_name}: annual hours mismatch"
        assert calc.total_fuel_liters == pytest.approx(
            excel["total_fuel"], abs=1e-10
        ), f"{scenario_name}: annual fuel mismatch"
        assert calc.total_fuel_cost_kr == pytest.approx(
            excel["total_cost"], abs=1e-8
        ), f"{scenario_name}: annual cost mismatch"


class TestCrossValidationTco:
    """Compare TCO calculations between Python calculator and Excel simulator."""

    @pytest.mark.parametrize("scenario_name", list(SCENARIOS.keys()))
    def test_tco(self, scenario_name):
        params = SCENARIOS[scenario_name]
        excel = simulate_excel(**params)
        config = _build_config(params)
        calc_balance = calculate_energy_balance(config)
        calc_tco = calculate_tco(config, calc_balance.total_fuel_cost_kr)

        assert calc_tco.fuel_cell_tco_kr == pytest.approx(
            excel["fc_tco"], abs=1e-4
        ), f"{scenario_name}: FC TCO mismatch"
        assert calc_tco.diesel_tco_kr == pytest.approx(
            excel["dg_tco"], abs=1e-4
        ), f"{scenario_name}: DG TCO mismatch"

    @pytest.mark.parametrize("scenario_name", list(SCENARIOS.keys()))
    def test_tco_operating_costs(self, scenario_name):
        params = SCENARIOS[scenario_name]
        excel = simulate_excel(**params)
        config = _build_config(params)
        calc_balance = calculate_energy_balance(config)
        calc_tco = calculate_tco(config, calc_balance.total_fuel_cost_kr)

        assert calc_tco.fuel_cell_operating_kr_yr == pytest.approx(
            excel["fc_operating_yr"], abs=1e-4
        ), f"{scenario_name}: FC operating cost mismatch"
        assert calc_tco.diesel_operating_kr_yr == pytest.approx(
            excel["dg_operating_yr"], abs=1e-4
        ), f"{scenario_name}: DG operating cost mismatch"


class TestCrossValidationSourceDetermination:
    """Verify source determination matches across all scenarios."""

    @pytest.mark.parametrize("scenario_name", list(SCENARIOS.keys()))
    def test_source_matches(self, scenario_name):
        params = SCENARIOS[scenario_name]
        excel_source = excel_determine_source(
            params["zero_emission"], params["inspections"]
        )
        config = _build_config(params)
        calc_source = determine_recommended_source(config)

        assert calc_source == excel_source, (
            f"{scenario_name}: source mismatch — "
            f"excel={excel_source}, calc={calc_source}"
        )
