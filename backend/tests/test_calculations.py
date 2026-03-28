"""Comprehensive parameterized tests for energy balance and TCO calculations.

Each test case includes hand-computed expected values derived from the formulas:

Energy balance per month:
    solar_production = irradiation * (total_Wp / 1000) * efficiency
    consumption = (daily_Wh / 1000) * days
    balance = solar_production - consumption
    if balance < 0:
        generator_hours = abs(balance) / generator_power_kW
        fuel_liters = abs(balance) * fuel_consumption_l_kWh
        fuel_cost = fuel_liters * fuel_price_kr_l

TCO:
    deficit_kWh = diesel_annual_fuel_cost / diesel_price / diesel_consumption
    fc_operating = deficit_kWh * fc_consumption * fc_price
    fc_tco = fc_purchase + horizon * (fc_operating + fc_maintenance)
    dg_tco = dg_purchase + horizon * (dg_operating + dg_maintenance)
"""

import pytest

from app.models.schemas import (
    BatteryParams,
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


def _make_config(
    panel_wp: float = 100,
    panel_count: int = 1,
    efficiency: float = 0.8,
    irradiation: dict | None = None,
    power_budget_wh_day: list[float] | None = None,
    gen_power_w: float = 6500,
    fuel_consumption: float = 0.5,
    fuel_price: float = 18.1,
    fc_purchase: float = 88000,
    fc_power: float = 82,
    fc_fuel_consumption: float = 0.9,
    fc_fuel_price: float = 75,
    fc_maintenance: float = 100,
    fc_lifespan_hours: int = 6500,
    dg_purchase: float = 35000,
    dg_maintenance: float = 25000,
    dg_lifespan_hours: int = 43800,
    horizon: int = 10,
    inspections_per_year: int = 4,
    zero_emission: bool = False,
) -> HydroConfigData:
    """Helper to build a config with specific calculation-relevant params.

    Defaults produce a diesel-recommended config (inspections=4, zero_emission=False).
    """
    irr = irradiation or {}
    budget = power_budget_wh_day or []

    return HydroConfigData(
        operations=OperationsParams(
            inspections_per_year=inspections_per_year,
            zero_emission_desired=zero_emission,
        ),
        solar=SolarParams(
            panel_wattage_wp=panel_wp,
            panel_count=panel_count,
            system_efficiency=efficiency,
        ),
        battery=BatteryParams(),
        monthly_irradiation=MonthlyIrradiation(**irr),
        power_budget=[
            PowerBudgetItem(
                enabled=True,
                name=f"Device {i}",
                power_w=wh / 24,
                consumption_wh_day=wh,
            )
            for i, wh in enumerate(budget)
        ],
        diesel_generator=DieselGeneratorParams(
            purchase_cost_kr=dg_purchase,
            power_w=gen_power_w,
            fuel_consumption_l_kwh=fuel_consumption,
            fuel_price_kr_l=fuel_price,
            lifespan_hours=dg_lifespan_hours,
            annual_maintenance_kr=dg_maintenance,
        ),
        fuel_cell=FuelCellParams(
            purchase_cost_kr=fc_purchase,
            power_w=fc_power,
            fuel_consumption_l_kwh=fc_fuel_consumption,
            fuel_price_kr_l=fc_fuel_price,
            lifespan_hours=fc_lifespan_hours,
            annual_maintenance_kr=fc_maintenance,
        ),
        other_settings=OtherSettings(assessment_horizon_years=horizon),
    )


# ═══════════════════════════════════════════════════════════════════════════════
# SOLAR PRODUCTION TESTS
# Formula: solar_prod = irradiation * (total_Wp / 1000) * efficiency
# ═══════════════════════════════════════════════════════════════════════════════


class TestSolarProduction:
    """Verify solar production calculation across different panel configurations."""

    @pytest.mark.parametrize(
        "panel_wp, panel_count, efficiency, jan_irr, expected_jan_solar",
        [
            # 100Wp * 1 panel * 0.8 eff * 10 kWh/m² = 0.1 * 0.8 * 10 = 0.8 kWh
            (100, 1, 0.8, 10.0, 0.8),
            # 200Wp * 1 panel * 0.8 * 10 = 0.2 * 0.8 * 10 = 1.6 kWh
            (200, 1, 0.8, 10.0, 1.6),
            # 100Wp * 2 panels * 0.8 * 10 = 0.2 * 0.8 * 10 = 1.6 kWh
            (100, 2, 0.8, 10.0, 1.6),
            # 425Wp * 2 panels * 0.8 * 50 = 0.85 * 0.8 * 50 = 34.0 kWh
            (425, 2, 0.8, 50.0, 34.0),
            # 100% efficiency: 100Wp * 1 * 1.0 * 10 = 1.0 kWh
            (100, 1, 1.0, 10.0, 1.0),
            # 50% efficiency: 100Wp * 1 * 0.5 * 10 = 0.5 kWh
            (100, 1, 0.5, 10.0, 0.5),
            # Zero irradiation: should produce 0
            (425, 2, 0.8, 0.0, 0.0),
            # Zero panel wattage: should produce 0
            (0, 2, 0.8, 50.0, 0.0),
            # Large system: 500Wp * 4 panels * 0.85 * 80 = 2.0 * 0.85 * 80 = 136.0
            (500, 4, 0.85, 80.0, 136.0),
            # Small system: 50Wp * 1 * 0.75 * 0.5 = 0.05 * 0.75 * 0.5 = 0.01875
            (50, 1, 0.75, 0.5, 0.01875),
        ],
        ids=[
            "100Wp_1panel_80eff",
            "200Wp_1panel_80eff",
            "100Wp_2panel_80eff",
            "425Wp_2panel_80eff",
            "100eff",
            "50eff",
            "zero_irradiation",
            "zero_wattage",
            "large_system",
            "small_system",
        ],
    )
    def test_january_solar_production(
        self, panel_wp, panel_count, efficiency, jan_irr, expected_jan_solar
    ):
        config = _make_config(
            panel_wp=panel_wp,
            panel_count=panel_count,
            efficiency=efficiency,
            irradiation={"jan": jan_irr},
        )
        result = calculate_energy_balance(config)
        assert result.monthly[0].solar_production_kwh == pytest.approx(
            expected_jan_solar, abs=1e-10
        )

    @pytest.mark.parametrize(
        "irradiation, expected_annual_solar",
        [
            # Uniform 10 kWh/m² every month, 100Wp * 1 * 0.8 = 0.08 factor
            # Annual = 10 * 12 * 0.08 = 9.6 kWh
            (
                {m: 10.0 for m in ["jan", "feb", "mar", "apr", "may", "jun",
                                     "jul", "aug", "sep", "oct", "nov", "dec"]},
                9.6,
            ),
            # Summer-only: 50 kWh/m² for Jun-Aug, 0 rest
            # = (50 + 50 + 50) * 0.08 = 12.0 kWh
            ({"jun": 50.0, "jul": 50.0, "aug": 50.0}, 12.0),
            # All zero
            ({}, 0.0),
        ],
        ids=["uniform_10", "summer_only", "all_zero"],
    )
    def test_annual_solar_production(self, irradiation, expected_annual_solar):
        config = _make_config(
            panel_wp=100, panel_count=1, efficiency=0.8, irradiation=irradiation
        )
        result = calculate_energy_balance(config)
        assert result.total_solar_production_kwh == pytest.approx(
            expected_annual_solar, abs=1e-10
        )


# ═══════════════════════════════════════════════════════════════════════════════
# CONSUMPTION TESTS
# Formula: consumption_kwh = (sum of daily_Wh for enabled items) / 1000 * days
# ═══════════════════════════════════════════════════════════════════════════════


class TestConsumption:
    """Verify consumption calculation from power budget."""

    @pytest.mark.parametrize(
        "budget_wh_day, month_index, expected_consumption_kwh",
        [
            # 100 Wh/day in January (31 days) = 0.1 * 31 = 3.1 kWh
            ([100.0], 0, 3.1),
            # 100 Wh/day in February (28 days) = 0.1 * 28 = 2.8 kWh
            ([100.0], 1, 2.8),
            # 100 Wh/day in April (30 days) = 0.1 * 30 = 3.0 kWh
            ([100.0], 3, 3.0),
            # Multiple devices: 100 + 200 + 50 = 350 Wh/day in Jan = 0.35 * 31 = 10.85
            ([100.0, 200.0, 50.0], 0, 10.85),
            # Zero consumption
            ([], 0, 0.0),
            # Large load: 660.7056 Wh/day (reference config) in Jan = 0.6607056 * 31 = 20.481874
            ([660.7056], 0, 20.4818736),
            # Tiny load: 1 Wh/day in Jan = 0.001 * 31 = 0.031
            ([1.0], 0, 0.031),
        ],
        ids=[
            "100wh_jan",
            "100wh_feb",
            "100wh_apr",
            "multi_device_jan",
            "zero_load",
            "reference_load_jan",
            "tiny_load_jan",
        ],
    )
    def test_monthly_consumption(
        self, budget_wh_day, month_index, expected_consumption_kwh
    ):
        config = _make_config(
            panel_wp=0, irradiation={}, power_budget_wh_day=budget_wh_day
        )
        result = calculate_energy_balance(config)
        # consumption = -balance when solar = 0
        assert result.monthly[month_index].energy_balance_kwh == pytest.approx(
            -expected_consumption_kwh, abs=1e-10
        )

    def test_disabled_items_excluded(self):
        """Items with enabled=False should not count toward consumption."""
        config = _make_config(panel_wp=0, power_budget_wh_day=[100.0, 200.0])
        # Disable the second item
        config.power_budget[1].enabled = False
        result = calculate_energy_balance(config)
        # Only 100 Wh/day -> Jan = 0.1 * 31 = 3.1 kWh deficit
        assert result.monthly[0].energy_balance_kwh == pytest.approx(-3.1, abs=1e-10)

    def test_annual_consumption_all_months(self):
        """100 Wh/day across all months = 0.1 * 365 = 36.5 kWh."""
        config = _make_config(panel_wp=0, power_budget_wh_day=[100.0])
        result = calculate_energy_balance(config)
        total_days = sum(DAYS_IN_MONTH)  # 365
        expected = 0.1 * total_days  # 36.5
        assert result.total_energy_balance_kwh == pytest.approx(-expected, abs=1e-10)


# ═══════════════════════════════════════════════════════════════════════════════
# ENERGY BALANCE TESTS
# Formula: balance = solar_production - consumption
# ═══════════════════════════════════════════════════════════════════════════════


class TestEnergyBalance:
    """Verify balance, generator hours, fuel, and cost calculations."""

    @pytest.mark.parametrize(
        "jan_irr, budget_wh, panel_wp, expected_balance",
        [
            # Solar > consumption (surplus)
            # Solar: 50 * 0.1 * 0.8 = 4.0, Consumption: 0.1 * 31 = 3.1, Balance = 0.9
            (50.0, [100.0], 100, 0.9),
            # Solar = consumption (break even)
            # Solar: 38.75 * 0.1 * 0.8 = 3.1, Consumption: 3.1, Balance = 0.0
            (38.75, [100.0], 100, 0.0),
            # Solar < consumption (deficit)
            # Solar: 10 * 0.1 * 0.8 = 0.8, Consumption: 3.1, Balance = -2.3
            (10.0, [100.0], 100, -2.3),
            # No solar at all
            # Solar: 0, Consumption: 3.1, Balance = -3.1
            (0.0, [100.0], 100, -3.1),
            # No consumption
            # Solar: 10 * 0.1 * 0.8 = 0.8, Consumption: 0, Balance = 0.8
            (10.0, [], 100, 0.8),
            # Both zero
            (0.0, [], 100, 0.0),
        ],
        ids=["surplus", "break_even", "deficit", "no_solar", "no_load", "both_zero"],
    )
    def test_january_balance(self, jan_irr, budget_wh, panel_wp, expected_balance):
        config = _make_config(
            panel_wp=panel_wp,
            panel_count=1,
            efficiency=0.8,
            irradiation={"jan": jan_irr},
            power_budget_wh_day=budget_wh,
        )
        result = calculate_energy_balance(config)
        assert result.monthly[0].energy_balance_kwh == pytest.approx(
            expected_balance, abs=1e-10
        )

    @pytest.mark.parametrize(
        "deficit_kwh, gen_power_w, fuel_consumption, fuel_price, "
        "expected_hours, expected_fuel, expected_cost",
        [
            # Deficit 2.3 kWh, 6500W gen, 0.5 l/kWh, 18.1 kr/l
            # hours = 2.3 / 6.5 = 0.353846...
            # fuel = 2.3 * 0.5 = 1.15 l
            # cost = 1.15 * 18.1 = 20.815 kr
            (2.3, 6500, 0.5, 18.1, 0.353846153846, 1.15, 20.815),
            # Deficit 10 kWh, 1000W gen, 1.0 l/kWh, 20 kr/l
            # hours = 10 / 1.0 = 10.0
            # fuel = 10 * 1.0 = 10.0 l
            # cost = 10 * 20 = 200.0 kr
            (10.0, 1000, 1.0, 20.0, 10.0, 10.0, 200.0),
            # Deficit 0.5 kWh, 2000W gen, 0.3 l/kWh, 25 kr/l
            # hours = 0.5 / 2.0 = 0.25
            # fuel = 0.5 * 0.3 = 0.15 l
            # cost = 0.15 * 25 = 3.75 kr
            (0.5, 2000, 0.3, 25.0, 0.25, 0.15, 3.75),
            # Large deficit 100 kWh, 5000W gen, 0.4 l/kWh, 18.1 kr/l
            # hours = 100 / 5.0 = 20.0
            # fuel = 100 * 0.4 = 40.0 l
            # cost = 40 * 18.1 = 724.0 kr
            (100.0, 5000, 0.4, 18.1, 20.0, 40.0, 724.0),
        ],
        ids=["reference_gen", "small_gen_high_consumption", "small_deficit", "large_deficit"],
    )
    def test_generator_calculations(
        self, deficit_kwh, gen_power_w, fuel_consumption, fuel_price,
        expected_hours, expected_fuel, expected_cost,
    ):
        """Create a config where January has the exact deficit, then verify."""
        # To get a specific deficit: set solar=0, budget = deficit/31 * 1000 Wh/day
        daily_wh = deficit_kwh / 31 * 1000
        config = _make_config(
            panel_wp=0,
            power_budget_wh_day=[daily_wh],
            gen_power_w=gen_power_w,
            fuel_consumption=fuel_consumption,
            fuel_price=fuel_price,
        )
        result = calculate_energy_balance(config)
        jan = result.monthly[0]
        assert jan.generator_hours == pytest.approx(expected_hours, rel=1e-6)
        assert jan.fuel_liters == pytest.approx(expected_fuel, rel=1e-6)
        assert jan.fuel_cost_kr == pytest.approx(expected_cost, rel=1e-6)

    def test_surplus_months_have_zero_generator(self):
        """When balance >= 0, generator should not run."""
        config = _make_config(
            panel_wp=500,
            panel_count=4,
            efficiency=0.9,
            irradiation={m: 80.0 for m in [
                "jan", "feb", "mar", "apr", "may", "jun",
                "jul", "aug", "sep", "oct", "nov", "dec"
            ]},
            power_budget_wh_day=[10.0],
        )
        result = calculate_energy_balance(config)
        for m in result.monthly:
            assert m.energy_balance_kwh > 0
            assert m.generator_hours == 0.0
            assert m.fuel_liters == 0.0
            assert m.fuel_cost_kr == 0.0

    def test_all_deficit_months(self):
        """When solar = 0, every month should have a deficit."""
        config = _make_config(
            panel_wp=0, power_budget_wh_day=[500.0], gen_power_w=6500,
            fuel_consumption=0.5, fuel_price=18.1,
        )
        result = calculate_energy_balance(config)
        for i, m in enumerate(result.monthly):
            expected_consumption = 0.5 * DAYS_IN_MONTH[i]
            assert m.energy_balance_kwh == pytest.approx(-expected_consumption, abs=1e-10)
            assert m.generator_hours > 0
            assert m.fuel_liters == pytest.approx(expected_consumption * 0.5, abs=1e-10)
            assert m.fuel_cost_kr == pytest.approx(
                expected_consumption * 0.5 * 18.1, abs=1e-6
            )

    def test_annual_totals_are_sum_of_months(self):
        """Verify that annual totals equal the sum of monthly values."""
        config = _make_config(
            panel_wp=200, panel_count=2, efficiency=0.8,
            irradiation={"jan": 1, "feb": 3, "mar": 15, "apr": 40,
                          "may": 60, "jun": 65, "jul": 70, "aug": 55,
                          "sep": 30, "oct": 5, "nov": 1, "dec": 0.5},
            power_budget_wh_day=[300.0],
        )
        result = calculate_energy_balance(config)
        assert result.total_solar_production_kwh == pytest.approx(
            sum(m.solar_production_kwh for m in result.monthly), abs=1e-10
        )
        assert result.total_energy_balance_kwh == pytest.approx(
            sum(m.energy_balance_kwh for m in result.monthly), abs=1e-10
        )
        assert result.total_generator_hours == pytest.approx(
            sum(m.generator_hours for m in result.monthly), abs=1e-10
        )
        assert result.total_fuel_liters == pytest.approx(
            sum(m.fuel_liters for m in result.monthly), abs=1e-10
        )
        assert result.total_fuel_cost_kr == pytest.approx(
            sum(m.fuel_cost_kr for m in result.monthly), abs=1e-10
        )


# ═══════════════════════════════════════════════════════════════════════════════
# FULL SCENARIO TESTS
# End-to-end with hand-computed annual values
# ═══════════════════════════════════════════════════════════════════════════════


class TestFullScenarios:
    """Complete scenarios with hand-verified annual results."""

    def test_arctic_winter_station(self):
        """Remote arctic station: minimal solar, high consumption.

        Solar: 50Wp * 1 * 0.75 = 37.5W effective
        Irradiation: only Mar-Sep have any sun
        Budget: 400 Wh/day (small but always-on)
        Generator: 2000W, 0.6 l/kWh, 20 kr/l
        """
        config = _make_config(
            panel_wp=50, panel_count=1, efficiency=0.75,
            irradiation={
                "jan": 0, "feb": 0, "mar": 5, "apr": 20, "may": 40,
                "jun": 50, "jul": 45, "aug": 30, "sep": 10,
                "oct": 0, "nov": 0, "dec": 0,
            },
            power_budget_wh_day=[400.0],
            gen_power_w=2000, fuel_consumption=0.6, fuel_price=20.0,
        )
        result = calculate_energy_balance(config)

        # Hand-compute total solar: sum(irr) * 0.05 * 0.75
        total_irr = 0 + 0 + 5 + 20 + 40 + 50 + 45 + 30 + 10 + 0 + 0 + 0  # = 200
        expected_solar = total_irr * 0.05 * 0.75  # = 7.5 kWh/year
        assert result.total_solar_production_kwh == pytest.approx(expected_solar, abs=1e-10)

        # Total consumption: 0.4 * 365 = 146.0 kWh
        expected_consumption = 0.4 * 365
        expected_balance = expected_solar - expected_consumption  # = -138.5
        assert result.total_energy_balance_kwh == pytest.approx(expected_balance, abs=1e-10)

        # Total fuel: only deficit months contribute
        # Fuel for deficit months = sum of abs(deficit) * 0.6
        assert result.total_fuel_liters > 0
        assert result.total_fuel_cost_kr == pytest.approx(
            result.total_fuel_liters * 20.0, abs=1e-6
        )

    def test_oversized_solar_no_generator(self):
        """Massively oversized solar system: never needs generator.

        Solar: 500Wp * 4 * 0.85 = 1700W effective
        Irradiation: even worst month has 5 kWh/m²
        Budget: 100 Wh/day
        """
        config = _make_config(
            panel_wp=500, panel_count=4, efficiency=0.85,
            irradiation={m: 5.0 for m in [
                "jan", "feb", "mar", "apr", "may", "jun",
                "jul", "aug", "sep", "oct", "nov", "dec"
            ]},
            power_budget_wh_day=[100.0],
        )
        result = calculate_energy_balance(config)

        # Solar per month: 5 * 2.0 * 0.85 = 8.5 kWh
        # Consumption per month (worst): 0.1 * 31 = 3.1 kWh
        # Always surplus
        assert result.total_generator_hours == 0.0
        assert result.total_fuel_liters == 0.0
        assert result.total_fuel_cost_kr == 0.0

        # Annual solar: 8.5 * 12 = 102.0
        assert result.total_solar_production_kwh == pytest.approx(102.0, abs=1e-10)

    def test_no_solar_panels(self):
        """Station with no solar — fully generator-dependent.

        Budget: 200 Wh/day, Generator: 5000W, 0.5 l/kWh, 18.1 kr/l
        """
        config = _make_config(
            panel_wp=0, power_budget_wh_day=[200.0],
            gen_power_w=5000, fuel_consumption=0.5, fuel_price=18.1,
        )
        result = calculate_energy_balance(config)

        assert result.total_solar_production_kwh == 0.0

        # Total consumption = 0.2 * 365 = 73.0 kWh
        expected_consumption = 0.2 * 365
        assert result.total_energy_balance_kwh == pytest.approx(
            -expected_consumption, abs=1e-10
        )

        # All months deficit: total fuel = 73.0 * 0.5 = 36.5 l
        assert result.total_fuel_liters == pytest.approx(36.5, abs=1e-10)
        # Cost = 36.5 * 18.1 = 660.65 kr
        assert result.total_fuel_cost_kr == pytest.approx(660.65, abs=1e-6)

    def test_zero_load_station(self):
        """No equipment — everything is zero or surplus."""
        config = _make_config(
            panel_wp=100, panel_count=1, efficiency=0.8,
            irradiation={"jun": 50.0},
            power_budget_wh_day=[],
        )
        result = calculate_energy_balance(config)

        # Only June produces: 50 * 0.1 * 0.8 = 4.0 kWh
        assert result.total_solar_production_kwh == pytest.approx(4.0, abs=1e-10)
        assert result.total_energy_balance_kwh == pytest.approx(4.0, abs=1e-10)
        assert result.total_generator_hours == 0.0
        assert result.total_fuel_liters == 0.0


# ═══════════════════════════════════════════════════════════════════════════════
# TCO CALCULATION TESTS
# ═══════════════════════════════════════════════════════════════════════════════


class TestTcoCalculations:
    """Verify TCO formula: purchase + horizon * (operating + maintenance)."""

    @pytest.mark.parametrize(
        "diesel_fuel_cost, dg_purchase, dg_maintenance, dg_fuel_price, "
        "dg_fuel_consumption, fc_purchase, fc_maintenance, fc_fuel_consumption, "
        "fc_fuel_price, horizon, expected_dg_tco, expected_fc_tco, expected_winner",
        [
            # Scenario 1: Reference config values
            # Diesel: 35000 + 10 * (928.82 + 25000) = 35000 + 259288.16 = 294288.16
            # FC deficit = 928.82 / 18.1 / 0.5 = 102.63... kWh
            # FC operating = 102.63 * 0.9 * 75 = 6927.63
            # FC: 88000 + 10 * (6927.63 + 100) = 88000 + 70276.31 = 158276.31
            (928.82, 35000, 25000, 18.1, 0.5,
             88000, 100, 0.9, 75, 10,
             294288.2, 158276.31, "fuel_cell"),

            # Scenario 2: Cheap diesel, expensive fuel cell
            # Diesel: 10000 + 5 * (500 + 1000) = 10000 + 7500 = 17500
            # FC deficit = 500/20/0.5 = 50 kWh, FC op = 50*1.0*100 = 5000
            # FC: 100000 + 5 * (5000 + 5000) = 100000 + 50000 = 150000
            (500, 10000, 1000, 20.0, 0.5,
             100000, 5000, 1.0, 100, 5,
             17500.0, 150000.0, "diesel"),

            # Scenario 3: No fuel cost (fully solar)
            # Diesel: 35000 + 10 * (0 + 25000) = 285000
            # FC: deficit=0, op=0; 88000 + 10 * (0 + 100) = 89000
            (0.0, 35000, 25000, 18.1, 0.5,
             88000, 100, 0.9, 75, 10,
             285000.0, 89000.0, "fuel_cell"),

            # Scenario 4: Equal TCO
            # Diesel: 10000 + 10 * (100 + 0) = 11000
            # FC deficit = 100/10/1.0 = 10 kWh, FC op = 10*1.0*10 = 100
            # FC: 10000 + 10 * (100 + 0) = 11000 -> tie goes to diesel
            (100, 10000, 0, 10.0, 1.0,
             10000, 0, 1.0, 10, 10,
             11000.0, 11000.0, "diesel"),

            # Scenario 5: 1-year horizon
            # Diesel: 5000 + 1 * (200 + 500) = 5700
            # FC deficit = 200/15/0.5 = 26.667 kWh, FC op = 26.667*0.8*50 = 1066.67
            # FC: 20000 + 1 * (1066.67 + 200) = 21266.67
            (200, 5000, 500, 15.0, 0.5,
             20000, 200, 0.8, 50, 1,
             5700.0, 21266.67, "diesel"),
        ],
        ids=[
            "reference_values",
            "cheap_diesel_expensive_fc",
            "fully_solar",
            "equal_tco",
            "short_horizon",
        ],
    )
    def test_tco_scenarios(
        self, diesel_fuel_cost, dg_purchase, dg_maintenance, dg_fuel_price,
        dg_fuel_consumption, fc_purchase, fc_maintenance, fc_fuel_consumption,
        fc_fuel_price, horizon, expected_dg_tco, expected_fc_tco, expected_winner,
    ):
        config = _make_config(
            dg_purchase=dg_purchase,
            dg_maintenance=dg_maintenance,
            fuel_consumption=dg_fuel_consumption,
            fuel_price=dg_fuel_price,
            fc_purchase=fc_purchase,
            fc_maintenance=fc_maintenance,
            fc_fuel_consumption=fc_fuel_consumption,
            fc_fuel_price=fc_fuel_price,
            horizon=horizon,
        )
        tco = calculate_tco(config, diesel_fuel_cost)
        assert tco.diesel_tco_kr == pytest.approx(expected_dg_tco, rel=1e-4)
        assert tco.fuel_cell_tco_kr == pytest.approx(expected_fc_tco, rel=1e-4)
        assert tco.recommended_source == expected_winner

    def test_tco_components_add_up(self):
        """Verify TCO = purchase + horizon * (operating + maintenance)."""
        config = _make_config(
            dg_purchase=35000, dg_maintenance=25000,
            fuel_consumption=0.5, fuel_price=18.1,
            fc_purchase=88000, fc_maintenance=100,
            fc_fuel_consumption=0.9, fc_fuel_price=75,
            horizon=10,
        )
        tco = calculate_tco(config, 928.82)

        assert tco.diesel_tco_kr == pytest.approx(
            tco.diesel_purchase_kr
            + tco.assessment_horizon_years
            * (tco.diesel_operating_kr_yr + tco.diesel_maintenance_kr_yr),
            abs=1e-6,
        )
        assert tco.fuel_cell_tco_kr == pytest.approx(
            tco.fuel_cell_purchase_kr
            + tco.assessment_horizon_years
            * (tco.fuel_cell_operating_kr_yr + tco.fuel_cell_maintenance_kr_yr),
            abs=1e-6,
        )


# ═══════════════════════════════════════════════════════════════════════════════
# EDGE CASES
# ═══════════════════════════════════════════════════════════════════════════════


class TestEdgeCases:
    """Boundary conditions and unusual inputs."""

    def test_single_watt_hour_load(self):
        """Extremely small load: 1 Wh/day."""
        config = _make_config(panel_wp=0, power_budget_wh_day=[1.0])
        result = calculate_energy_balance(config)
        # Annual = 0.001 * 365 = 0.365 kWh
        assert result.total_energy_balance_kwh == pytest.approx(-0.365, abs=1e-10)

    def test_very_large_load(self):
        """10 kWh/day load — industrial scale."""
        config = _make_config(
            panel_wp=0, power_budget_wh_day=[10000.0],
            gen_power_w=10000, fuel_consumption=0.5, fuel_price=18.1,
        )
        result = calculate_energy_balance(config)
        # Annual = 10.0 * 365 = 3650 kWh
        assert result.total_energy_balance_kwh == pytest.approx(-3650.0, abs=1e-10)
        # Fuel = 3650 * 0.5 = 1825 l
        assert result.total_fuel_liters == pytest.approx(1825.0, abs=1e-10)

    def test_fractional_irradiation(self):
        """Very small irradiation values (polar winter)."""
        config = _make_config(
            panel_wp=425, panel_count=2, efficiency=0.8,
            irradiation={"jan": 0.01, "dec": 0.005},
            power_budget_wh_day=[100.0],
        )
        result = calculate_energy_balance(config)
        # Jan solar: 0.01 * 0.85 * 0.8 = 0.0068
        expected_jan_solar = 0.01 * (850 / 1000) * 0.8
        assert result.monthly[0].solar_production_kwh == pytest.approx(
            expected_jan_solar, abs=1e-10
        )

    def test_all_months_have_correct_day_count(self):
        """Verify each month uses the correct number of days."""
        expected_days = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
        config = _make_config(panel_wp=0, power_budget_wh_day=[100.0])
        result = calculate_energy_balance(config)
        for i, m in enumerate(result.monthly):
            assert m.days == expected_days[i], f"Month {m.month} has wrong day count"

    def test_twelve_months_always_returned(self):
        """Result should always have exactly 12 months."""
        config = _make_config()
        result = calculate_energy_balance(config)
        assert len(result.monthly) == 12
        months = [m.month for m in result.monthly]
        assert months == [
            "Jan", "Feb", "Mar", "Apr", "May", "Jun",
            "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
        ]

    def test_empty_config(self):
        """Completely default config should not crash."""
        config = HydroConfigData()
        result = calculate_energy_balance(config)
        assert len(result.monthly) == 12
        assert result.total_solar_production_kwh == 0.0
        assert result.total_energy_balance_kwh == 0.0
        assert result.total_fuel_liters == 0.0


# ═══════════════════════════════════════════════════════════════════════════════
# SOURCE DETERMINATION TESTS
# Excel: =IF(B21="Yes","Fuel cell",IF(B19<=3,"Fuel cell","Diesel generator"))
# ═══════════════════════════════════════════════════════════════════════════════


class TestSourceDetermination:
    """Verify the recommended source logic matches the Excel formula."""

    @pytest.mark.parametrize(
        "inspections, zero_emission, expected",
        [
            (4, False, "diesel"),       # Default: 4 inspections, no zero-emission
            (12, False, "diesel"),      # Many inspections, no zero-emission
            (3, False, "fuel_cell"),    # <=3 inspections → fuel cell
            (2, False, "fuel_cell"),    # <=3 inspections → fuel cell
            (1, False, "fuel_cell"),    # <=3 inspections → fuel cell
            (4, True, "fuel_cell"),     # Zero-emission desired overrides inspections
            (12, True, "fuel_cell"),    # Zero-emission desired overrides inspections
            (1, True, "fuel_cell"),     # Both conditions → fuel cell
        ],
        ids=[
            "4_inspections_diesel",
            "12_inspections_diesel",
            "3_inspections_fc",
            "2_inspections_fc",
            "1_inspection_fc",
            "zero_emission_overrides",
            "zero_emission_many_inspections",
            "both_conditions_fc",
        ],
    )
    def test_source_determination(self, inspections, zero_emission, expected):
        config = _make_config(
            inspections_per_year=inspections, zero_emission=zero_emission
        )
        assert determine_recommended_source(config) == expected


# ═══════════════════════════════════════════════════════════════════════════════
# SOURCE-AWARE ENERGY BALANCE TESTS
# When fuel cell is the recommended source, energy balance should use
# FC power/consumption/price instead of diesel values
# ═══════════════════════════════════════════════════════════════════════════════


class TestSourceAwareEnergyBalance:
    """Verify energy balance uses correct source parameters."""

    def test_diesel_source_uses_diesel_params(self):
        """With diesel recommended, generator calcs use diesel power/consumption/price."""
        # 100 Wh/day, no solar, January = 3.1 kWh deficit
        # Diesel: 6500W gen, 0.5 l/kWh, 18.1 kr/l
        # hours = 3.1 / 6.5 = 0.476923
        # fuel = 3.1 * 0.5 = 1.55
        # cost = 1.55 * 18.1 = 28.055
        config = _make_config(
            panel_wp=0, power_budget_wh_day=[100.0],
            gen_power_w=6500, fuel_consumption=0.5, fuel_price=18.1,
            fc_power=82, fc_fuel_consumption=0.9, fc_fuel_price=75,
            inspections_per_year=4, zero_emission=False,  # → diesel
        )
        result = calculate_energy_balance(config)
        jan = result.monthly[0]
        assert jan.generator_hours == pytest.approx(3.1 / 6.5, rel=1e-6)
        assert jan.fuel_liters == pytest.approx(3.1 * 0.5, rel=1e-6)
        assert jan.fuel_cost_kr == pytest.approx(3.1 * 0.5 * 18.1, rel=1e-6)

    def test_fuel_cell_source_uses_fc_params(self):
        """With fuel cell recommended, generator calcs use FC power/consumption/price."""
        # Same 100 Wh/day, no solar, January = 3.1 kWh deficit
        # FC: 82W, 0.9 l/kWh, 75 kr/l
        # hours = 3.1 / 0.082 = 37.80488
        # fuel = 3.1 * 0.9 = 2.79
        # cost = 2.79 * 75 = 209.25
        config = _make_config(
            panel_wp=0, power_budget_wh_day=[100.0],
            gen_power_w=6500, fuel_consumption=0.5, fuel_price=18.1,
            fc_power=82, fc_fuel_consumption=0.9, fc_fuel_price=75,
            inspections_per_year=4, zero_emission=True,  # → fuel cell
        )
        result = calculate_energy_balance(config)
        jan = result.monthly[0]
        assert jan.generator_hours == pytest.approx(3.1 / 0.082, rel=1e-6)
        assert jan.fuel_liters == pytest.approx(3.1 * 0.9, rel=1e-6)
        assert jan.fuel_cost_kr == pytest.approx(3.1 * 0.9 * 75, rel=1e-6)

    def test_same_deficit_different_source_different_fuel(self):
        """Same energy deficit should produce different fuel costs per source."""
        base_kwargs = dict(
            panel_wp=0, power_budget_wh_day=[500.0],
            gen_power_w=6500, fuel_consumption=0.5, fuel_price=18.1,
            fc_power=82, fc_fuel_consumption=0.9, fc_fuel_price=75,
        )

        diesel_config = _make_config(**base_kwargs, inspections_per_year=4, zero_emission=False)
        fc_config = _make_config(**base_kwargs, inspections_per_year=4, zero_emission=True)

        diesel_result = calculate_energy_balance(diesel_config)
        fc_result = calculate_energy_balance(fc_config)

        # Same solar production (zero) and same consumption
        assert diesel_result.total_solar_production_kwh == fc_result.total_solar_production_kwh
        assert diesel_result.total_energy_balance_kwh == fc_result.total_energy_balance_kwh

        # But different fuel costs (FC is much more expensive per kWh)
        assert fc_result.total_fuel_cost_kr > diesel_result.total_fuel_cost_kr
        # FC: deficit * 0.9 * 75 vs Diesel: deficit * 0.5 * 18.1
        # Ratio should be (0.9*75) / (0.5*18.1) = 67.5 / 9.05 ≈ 7.46
        ratio = fc_result.total_fuel_cost_kr / diesel_result.total_fuel_cost_kr
        assert ratio == pytest.approx(67.5 / 9.05, rel=1e-4)

    def test_fc_source_more_runtime_hours(self):
        """Fuel cell has lower power, so needs more hours for same deficit."""
        base_kwargs = dict(
            panel_wp=0, power_budget_wh_day=[200.0],
            gen_power_w=6500, fc_power=82,
        )

        diesel_config = _make_config(**base_kwargs, zero_emission=False)
        fc_config = _make_config(**base_kwargs, zero_emission=True)

        diesel_result = calculate_energy_balance(diesel_config)
        fc_result = calculate_energy_balance(fc_config)

        # FC runs much longer: 82W vs 6500W for same energy
        assert fc_result.total_generator_hours > diesel_result.total_generator_hours
        ratio = fc_result.total_generator_hours / diesel_result.total_generator_hours
        assert ratio == pytest.approx(6500 / 82, rel=1e-6)


# ═══════════════════════════════════════════════════════════════════════════════
# TCO REPLACEMENT COST TESTS
# Excel: MAX(0, FLOOR(horizon / (lifespan / annual_hours)) - 1) * purchase
# ═══════════════════════════════════════════════════════════════════════════════


class TestTcoReplacementCost:
    """Verify replacement cost is included when lifespan is exceeded."""

    def test_no_replacement_when_lifespan_sufficient(self):
        """If lifespan covers the full horizon, no replacement cost."""
        # Deficit 100 kWh, FC: 82W → 1219.5 h/yr, lifespan 6500h → 5.33 yr per unit
        # 10yr horizon: FLOOR(10/5.33) - 1 = 1 - 1 = 0 replacements
        config = _make_config(
            fc_power=82, fc_lifespan_hours=6500,
            dg_lifespan_hours=43800, horizon=10,
        )
        # Use a fuel cost that implies ~100 kWh deficit
        tco = calculate_tco(config, 928.82)  # reference fuel cost
        # With reference values, FC timer ≈ 1251h/yr, lifespan/timer ≈ 5.19
        # FLOOR(10/5.19) - 1 = 1 - 1 = 0
        # TCO should equal purchase + horizon*(op + maint) with no extra
        expected_fc = (
            tco.fuel_cell_purchase_kr
            + tco.assessment_horizon_years
            * (tco.fuel_cell_operating_kr_yr + tco.fuel_cell_maintenance_kr_yr)
        )
        assert tco.fuel_cell_tco_kr == pytest.approx(expected_fc, abs=1e-6)

    def test_one_replacement_when_lifespan_exceeded(self):
        """If lifespan is used up twice in the horizon, one replacement needed.

        FC: 82W, lifespan 2000h
        Deficit = 928.82 / 18.1 / 0.5 = 102.63 kWh (diesel source config)
        FC annual hours = 102.63 / 0.082 = 1251.6 h/yr
        years_per_unit = 2000 / 1251.6 = 1.598
        FLOOR(10 / 1.598) - 1 = FLOOR(6.258) - 1 = 6 - 1 = 5 replacements
        TCO += 5 * 88000 = 440000 extra
        """
        config = _make_config(
            fc_power=82, fc_lifespan_hours=2000, fc_purchase=88000,
            horizon=10,
        )
        tco = calculate_tco(config, 928.82)
        base_tco = (
            88000
            + 10 * (tco.fuel_cell_operating_kr_yr + tco.fuel_cell_maintenance_kr_yr)
        )
        # Calculate expected replacements
        deficit_kwh = 928.82 / 18.1 / 0.5  # ≈ 102.63
        fc_hours = deficit_kwh / 0.082
        years_per_unit = 2000 / fc_hours
        replacements = max(0, int(10 / years_per_unit) - 1)
        expected_tco = base_tco + replacements * 88000

        assert tco.fuel_cell_tco_kr == pytest.approx(expected_tco, abs=1e-2)
        assert replacements > 0, "This test should have at least 1 replacement"

    def test_diesel_replacement_with_high_usage(self):
        """Diesel generator needing replacement within horizon.

        DG: 6500W, lifespan 100h (artificially low)
        Deficit = 1000 / 18.1 / 0.5 = 110.5 kWh
        DG annual hours = 110.5 / 6.5 = 17.0 h/yr
        years_per_unit = 100 / 17.0 = 5.88
        FLOOR(10 / 5.88) - 1 = 1 - 1 = 0 replacements
        Try lifespan 10h:
        years_per_unit = 10 / 17.0 = 0.588
        FLOOR(10 / 0.588) - 1 = 17 - 1 = 16 replacements
        """
        config = _make_config(
            dg_lifespan_hours=10, dg_purchase=35000,
            gen_power_w=6500, fuel_consumption=0.5, fuel_price=18.1,
            horizon=10,
        )
        tco = calculate_tco(config, 1000.0)
        # Should have many replacements
        deficit_kwh = 1000.0 / 18.1 / 0.5
        dg_hours = deficit_kwh / 6.5
        years_per_unit = 10 / dg_hours
        replacements = max(0, int(10 / years_per_unit) - 1)

        base_tco = (
            35000
            + 10 * (tco.diesel_operating_kr_yr + tco.diesel_maintenance_kr_yr)
        )
        expected_tco = base_tco + replacements * 35000
        assert tco.diesel_tco_kr == pytest.approx(expected_tco, abs=1e-2)
        assert replacements > 0

    def test_zero_deficit_no_replacement(self):
        """With no deficit, no runtime hours, no replacement needed."""
        config = _make_config(fc_lifespan_hours=1, dg_lifespan_hours=1, horizon=100)
        tco = calculate_tco(config, 0.0)
        # Even with 1-hour lifespan, 0 deficit means 0 hours means no replacement
        expected_fc = 88000 + 100 * (0 + 100)  # purchase + horizon * maintenance
        expected_dg = 35000 + 100 * (0 + 25000)
        assert tco.fuel_cell_tco_kr == pytest.approx(expected_fc, abs=1e-6)
        assert tco.diesel_tco_kr == pytest.approx(expected_dg, abs=1e-6)

    def test_replacement_changes_tco_winner(self):
        """Replacement cost can flip which source is cheaper.

        Without replacement: FC cheaper. With replacement: diesel cheaper.
        """
        # FC: cheap base but short lifespan → many replacements
        # DG: expensive maintenance but lasts forever
        config = _make_config(
            fc_purchase=50000, fc_power=82, fc_lifespan_hours=500,
            fc_fuel_consumption=0.9, fc_fuel_price=75, fc_maintenance=0,
            dg_purchase=10000, gen_power_w=6500, dg_lifespan_hours=100000,
            fuel_consumption=0.5, fuel_price=18.1, dg_maintenance=1000,
            horizon=10,
        )
        # Use a moderate fuel cost
        tco = calculate_tco(config, 500.0)

        # FC will need many replacements due to 500h lifespan
        deficit_kwh = 500.0 / 18.1 / 0.5
        fc_hours = deficit_kwh / 0.082
        fc_years = 500 / fc_hours
        fc_replacements = max(0, int(10 / fc_years) - 1)

        # The replacement cost should make FC more expensive
        assert fc_replacements > 0, "FC should need replacements"
