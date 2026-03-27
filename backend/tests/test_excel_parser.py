"""Tests for the Excel parser service."""

import pytest

from app.services.excel_parser import parse_excel


class TestExcelParser:
    def test_parse_full_file(self, excel_bytes):
        config, recommended, energy_balance, tco, notes = parse_excel(excel_bytes)
        assert len(notes) == 0, f"Unexpected validation notes: {notes}"

    def test_parses_communication(self, excel_bytes):
        config, *_ = parse_excel(excel_bytes)
        assert config.communication.has_4g_coverage is False
        assert config.communication.has_nbiot_coverage is False
        assert config.communication.has_line_of_sight is False
        assert config.communication.requires_two_way_control is False

    def test_parses_facility(self, excel_bytes):
        config, *_ = parse_excel(excel_bytes)
        assert config.facility.release_method == "Pipe via intake"
        assert config.facility.has_fish_passage is True
        assert config.facility.minimum_flow_ls == 20
        assert config.facility.low_conductivity is False
        assert config.facility.ice_problems is False
        assert config.facility.sediment_or_surge is False

    def test_parses_operations(self, excel_bytes):
        config, *_ = parse_excel(excel_bytes)
        assert config.operations.inspections_per_year == 4
        assert config.operations.battery_bank_ah == 500
        assert config.operations.zero_emission_desired is False

    def test_parses_solar(self, excel_bytes):
        config, *_ = parse_excel(excel_bytes)
        assert config.solar.panel_wattage_wp == 425
        assert config.solar.panel_count == 2
        assert config.solar.system_efficiency == 0.8
        assert config.solar.lifespan_years == 25

    def test_parses_battery(self, excel_bytes):
        config, *_ = parse_excel(excel_bytes)
        assert config.battery.voltage_v == 12.8
        assert config.battery.max_dod == 0.8
        assert config.battery.cycle_lifespan == 6000

    def test_parses_fuel_cell(self, excel_bytes):
        config, *_ = parse_excel(excel_bytes)
        assert config.fuel_cell.purchase_cost_kr == 88000
        assert config.fuel_cell.power_w == 82
        assert config.fuel_cell.fuel_consumption_l_kwh == 0.9
        assert config.fuel_cell.fuel_price_kr_l == 75

    def test_parses_diesel_generator(self, excel_bytes):
        config, *_ = parse_excel(excel_bytes)
        assert config.diesel_generator.purchase_cost_kr == 35000
        assert config.diesel_generator.power_w == 6500
        assert config.diesel_generator.fuel_consumption_l_kwh == 0.5
        assert config.diesel_generator.fuel_price_kr_l == 18.1

    def test_parses_irradiation(self, excel_bytes):
        config, *_ = parse_excel(excel_bytes)
        irr = config.monthly_irradiation
        assert irr.jan == pytest.approx(0.11064530284)
        assert irr.jul == pytest.approx(80.63345578117)
        assert irr.dec == pytest.approx(0.01700974846)

    def test_parses_power_budget(self, excel_bytes):
        config, *_ = parse_excel(excel_bytes)
        assert len(config.power_budget) == 10
        # First item: Victron BMS
        bms = config.power_budget[0]
        assert bms.name == "Victron BMS"
        assert bms.enabled is True
        assert bms.power_w == pytest.approx(0.1)
        assert bms.consumption_wh_day == pytest.approx(2.4)

    def test_total_daily_consumption(self, excel_bytes):
        config, *_ = parse_excel(excel_bytes)
        total = sum(i.consumption_wh_day for i in config.power_budget if i.enabled)
        assert total == pytest.approx(660.7056, rel=1e-4)

    def test_parses_results_sheet(self, excel_bytes):
        _, recommended, energy_balance, tco, _ = parse_excel(excel_bytes)
        assert recommended is not None
        assert recommended.communication == "Satellite modem"
        assert recommended.solar_panel_count == 2
        assert recommended.battery_ah == 500

    def test_parses_energy_balance(self, excel_bytes):
        _, _, energy_balance, _, _ = parse_excel(excel_bytes)
        assert energy_balance is not None
        assert len(energy_balance.monthly) == 12
        assert energy_balance.total_solar_production_kwh == pytest.approx(296.32, rel=1e-3)
        assert energy_balance.total_fuel_liters == pytest.approx(51.32, rel=1e-2)

    def test_parses_tco(self, excel_bytes):
        _, _, _, tco, _ = parse_excel(excel_bytes)
        assert tco is not None
        assert tco.fuel_cell_tco_kr == pytest.approx(158276.31, rel=1e-3)
        assert tco.diesel_tco_kr == pytest.approx(294288.16, rel=1e-3)
        assert tco.recommended_source == "fuel_cell"

    def test_rejects_missing_input_sheet(self):
        # Minimal xlsx with no Input sheet
        import openpyxl
        from io import BytesIO

        wb = openpyxl.Workbook()
        ws = wb.active
        ws.title = "NotInput"
        buf = BytesIO()
        wb.save(buf)

        with pytest.raises(ValueError, match="Input"):
            parse_excel(buf.getvalue())
