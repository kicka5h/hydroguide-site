"""Tests for energy balance and TCO calculations.

Validates our calculator against the known-good Excel output.
"""

import pytest

from app.services.energy_balance import calculate_energy_balance, calculate_tco
from app.services.excel_parser import parse_excel


class TestEnergyBalance:
    def test_monthly_solar_production_matches_excel(self, excel_bytes):
        config, _, excel_balance, _, _ = parse_excel(excel_bytes)
        calc = calculate_energy_balance(config)

        for i in range(12):
            assert calc.monthly[i].solar_production_kwh == pytest.approx(
                excel_balance.monthly[i].solar_production_kwh, abs=1e-6
            ), f"Month {i} solar mismatch"

    def test_monthly_energy_balance_matches_excel(self, excel_bytes):
        config, _, excel_balance, _, _ = parse_excel(excel_bytes)
        calc = calculate_energy_balance(config)

        for i in range(12):
            assert calc.monthly[i].energy_balance_kwh == pytest.approx(
                excel_balance.monthly[i].energy_balance_kwh, abs=1e-6
            ), f"Month {i} balance mismatch"

    def test_monthly_generator_hours_matches_excel(self, excel_bytes):
        config, _, excel_balance, _, _ = parse_excel(excel_bytes)
        calc = calculate_energy_balance(config)

        for i in range(12):
            assert calc.monthly[i].generator_hours == pytest.approx(
                excel_balance.monthly[i].generator_hours, abs=1e-6
            ), f"Month {i} gen hours mismatch"

    def test_monthly_fuel_matches_excel(self, excel_bytes):
        config, _, excel_balance, _, _ = parse_excel(excel_bytes)
        calc = calculate_energy_balance(config)

        for i in range(12):
            assert calc.monthly[i].fuel_liters == pytest.approx(
                excel_balance.monthly[i].fuel_liters, abs=1e-6
            ), f"Month {i} fuel mismatch"

    def test_annual_totals_match_excel(self, excel_bytes):
        config, _, excel_balance, _, _ = parse_excel(excel_bytes)
        calc = calculate_energy_balance(config)

        assert calc.total_solar_production_kwh == pytest.approx(
            excel_balance.total_solar_production_kwh, abs=1e-4
        )
        assert calc.total_energy_balance_kwh == pytest.approx(
            excel_balance.total_energy_balance_kwh, abs=1e-4
        )
        assert calc.total_generator_hours == pytest.approx(
            excel_balance.total_generator_hours, abs=1e-4
        )
        assert calc.total_fuel_liters == pytest.approx(
            excel_balance.total_fuel_liters, abs=1e-4
        )
        assert calc.total_fuel_cost_kr == pytest.approx(
            excel_balance.total_fuel_cost_kr, abs=1e-4
        )

    def test_surplus_months_have_no_generator(self, excel_bytes):
        config, *_ = parse_excel(excel_bytes)
        calc = calculate_energy_balance(config)

        for m in calc.monthly:
            if m.energy_balance_kwh >= 0:
                assert m.generator_hours == 0
                assert m.fuel_liters == 0
                assert m.fuel_cost_kr == 0

    def test_deficit_months_have_fuel(self, excel_bytes):
        config, *_ = parse_excel(excel_bytes)
        calc = calculate_energy_balance(config)

        for m in calc.monthly:
            if m.energy_balance_kwh < 0:
                assert m.generator_hours > 0
                assert m.fuel_liters > 0
                assert m.fuel_cost_kr > 0


class TestTco:
    def test_tco_matches_excel(self, excel_bytes):
        config, _, excel_balance, excel_tco, _ = parse_excel(excel_bytes)
        calc_balance = calculate_energy_balance(config)
        calc_tco = calculate_tco(config, calc_balance.total_fuel_cost_kr)

        assert calc_tco.fuel_cell_tco_kr == pytest.approx(
            excel_tco.fuel_cell_tco_kr, rel=1e-4
        )
        assert calc_tco.diesel_tco_kr == pytest.approx(
            excel_tco.diesel_tco_kr, rel=1e-4
        )

    def test_tco_recommends_fuel_cell(self, excel_bytes):
        config, *_ = parse_excel(excel_bytes)
        calc_balance = calculate_energy_balance(config)
        calc_tco = calculate_tco(config, calc_balance.total_fuel_cost_kr)
        assert calc_tco.recommended_source == "fuel_cell"

    def test_tco_annual_costs_match(self, excel_bytes):
        config, _, _, excel_tco, _ = parse_excel(excel_bytes)
        calc_balance = calculate_energy_balance(config)
        calc_tco = calculate_tco(config, calc_balance.total_fuel_cost_kr)

        assert calc_tco.fuel_cell_operating_kr_yr == pytest.approx(
            excel_tco.fuel_cell_operating_kr_yr, rel=1e-4
        )
        assert calc_tco.diesel_operating_kr_yr == pytest.approx(
            excel_tco.diesel_operating_kr_yr, rel=1e-4
        )
