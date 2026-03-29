"""Live API validation tests.

Compares our calculator output against the existing HydroGuide production API
at https://hydroguide.no/api/v1/recommendations to confirm both implementations
produce consistent results.

The production API uses a different payload schema (camelCase, Norwegian month
names) and returns two energy-balance scenarios (fuel cell + diesel). Our
calculator produces one scenario based on the recommended source. These tests
compare the matching scenario.

Setup:
    1. Set environment variables:
         HYDROGUIDE_API_URL=https://hydroguide.no/api/v1/recommendations
         HYDROGUIDE_API_KEY=<the bearer token>
    2. Run: pytest tests/test_live_api.py -v

    Without the env vars, all tests are automatically skipped.

API call budget: 1 call total (the reference config).
Delete tests/.api_cache/ to force a fresh call.
"""

import json
import os
from pathlib import Path

import httpx
import pytest

from app.services.energy_balance import (
    calculate_energy_balance,
    calculate_tco,
    determine_recommended_source,
)
from app.services.excel_parser import parse_excel

# ── Configuration ────────────────────────────────────────────────────────────

API_URL = os.getenv("HYDROGUIDE_API_URL", "")
API_KEY = os.getenv("HYDROGUIDE_API_KEY", "")

CACHE_DIR = Path(__file__).parent / ".api_cache"
CACHE_FILE = CACHE_DIR / "calculations_response.json"

skip_no_api = pytest.mark.skipif(
    not API_URL or not API_KEY,
    reason="HYDROGUIDE_API_URL and HYDROGUIDE_API_KEY not set",
)


# ── Payload Mapping ─────────────────────────────────────────────────────────
# The production API expects a different schema than our internal model.
# This function translates HydroConfigData → production API payload.

MONTH_MAP_NO = ["jan", "feb", "mar", "apr", "mai", "jun",
                "jul", "aug", "sep", "okt", "nov", "des"]


def config_to_production_payload(config):
    """Convert our HydroConfigData to the production API's payload format."""
    irr = config.monthly_irradiation.as_list()

    equipment_rows = []
    for item in config.power_budget:
        if item.power_w and item.power_w > 0:
            hours = item.consumption_wh_day / item.power_w if item.power_w else 0
        else:
            hours = 0
        equipment_rows.append({
            "active": item.enabled,
            "name": item.name,
            "powerW": item.power_w,
            "runtimeHoursPerDay": round(hours, 2),
        })

    source = determine_recommended_source(config)

    return {
        "mode": "calculations",
        "systemParameters": {
            "4gCoverage": config.communication.has_4g_coverage or False,
            "nbIotCoverage": config.communication.has_nbiot_coverage or False,
            "lineOfSightUnder15km": config.communication.has_line_of_sight or False,
            "inspectionsPerYear": config.operations.inspections_per_year or 4,
            "hasBackupSource": True,
            "batteryMode": "ah",
            "batteryValue": config.operations.battery_bank_ah or 500,
        },
        "solar": {
            "panelPowerWp": config.solar.panel_wattage_wp or 0,
            "panelCount": config.solar.panel_count,
            "systemEfficiency": config.solar.system_efficiency,
        },
        "battery": {
            "nominalVoltage": config.battery.voltage_v,
            "maxDepthOfDischarge": config.battery.max_dod,
        },
        "monthlySolarRadiation": {
            MONTH_MAP_NO[i]: irr[i] for i in range(12)
        },
        "equipmentRows": equipment_rows,
        "fuelCell": {
            "purchaseCost": config.fuel_cell.purchase_cost_kr or 0,
            "powerW": config.fuel_cell.power_w or 0,
            "fuelConsumptionPerKWh": config.fuel_cell.fuel_consumption_l_kwh or 0,
            "fuelPrice": config.fuel_cell.fuel_price_kr_l or 0,
            "lifetime": config.fuel_cell.lifespan_hours or 0,
            "annualMaintenance": config.fuel_cell.annual_maintenance_kr or 0,
        },
        "diesel": {
            "purchaseCost": config.diesel_generator.purchase_cost_kr or 0,
            "powerW": config.diesel_generator.power_w or 0,
            "fuelConsumptionPerKWh": config.diesel_generator.fuel_consumption_l_kwh or 0,
            "fuelPrice": config.diesel_generator.fuel_price_kr_l or 0,
            "lifetime": config.diesel_generator.lifespan_hours or 0,
            "annualMaintenance": config.diesel_generator.annual_maintenance_kr or 0,
        },
        "other": {
            "co2Methanol": config.other_settings.co2_factor_methanol,
            "co2Diesel": config.other_settings.co2_factor_diesel,
            "evaluationHorizonYears": config.other_settings.assessment_horizon_years,
        },
    }, source


# ── Fixtures ─────────────────────────────────────────────────────────────────


@pytest.fixture(scope="module")
def reference_config():
    """Load the reference config from the Excel file."""
    excel_path = Path(__file__).parent.parent.parent / "Solar_calculator.xlsx"
    if not excel_path.exists():
        pytest.skip("Solar_calculator.xlsx not found")
    with open(excel_path, "rb") as f:
        config, *_ = parse_excel(f.read())
    return config


@pytest.fixture(scope="module")
def our_results(reference_config):
    """Run our calculator on the reference config."""
    balance = calculate_energy_balance(reference_config)
    tco = calculate_tco(reference_config, balance.total_fuel_cost_kr)
    source = determine_recommended_source(reference_config)
    return {"balance": balance, "tco": tco, "config": reference_config, "source": source}


@pytest.fixture(scope="module")
def live_response(reference_config):
    """Fetch the live API response, cached to disk.

    This makes exactly ONE API call ever. Subsequent runs use the cache.
    Delete .api_cache/ to force a fresh call.
    """
    if not API_URL or not API_KEY:
        pytest.skip("API credentials not configured")

    if CACHE_FILE.exists():
        return json.loads(CACHE_FILE.read_text())

    payload, _source = config_to_production_payload(reference_config)

    response = httpx.post(
        API_URL,
        json=payload,
        headers={"Authorization": f"Bearer {API_KEY}"},
        timeout=60.0,
    )
    response.raise_for_status()
    data = response.json()

    CACHE_DIR.mkdir(exist_ok=True)
    CACHE_FILE.write_text(json.dumps(data, indent=2, ensure_ascii=False))
    (CACHE_DIR / "calculations_request.json").write_text(
        json.dumps(payload, indent=2, ensure_ascii=False)
    )

    return data


@pytest.fixture(scope="module")
def live_calc(live_response):
    """Extract the calculations object from the live response."""
    return live_response["calculations"]


@pytest.fixture(scope="module")
def live_diesel_scenario(live_calc):
    """The diesel scenario from the live API (matches our reference config)."""
    return live_calc["scenarios"]["diesel"]


@pytest.fixture(scope="module")
def live_fuelcell_scenario(live_calc):
    """The fuel cell scenario from the live API."""
    return live_calc["scenarios"]["fuelCell"]


# ── Helpers ──────────────────────────────────────────────────────────────────

LIVE_MONTH_KEYS = ["jan", "feb", "mar", "apr", "mai", "jun",
                   "jul", "aug", "sep", "okt", "nov", "des"]


def _get_live_month(scenario, month_idx):
    """Get a monthly entry from the live scenario by index."""
    monthly = scenario["monthlyEnergyBalance"]
    if month_idx >= len(monthly):
        pytest.skip(f"Month {month_idx} not in live response")
    return monthly[month_idx]


# ── Tests ────────────────────────────────────────────────────────────────────


@skip_no_api
class TestLiveApiConnection:
    """Basic connectivity and response shape."""

    def test_response_has_calculations(self, live_response):
        assert "calculations" in live_response

    def test_has_scenarios(self, live_calc):
        assert "fuelCell" in live_calc["scenarios"]
        assert "diesel" in live_calc["scenarios"]

    def test_has_monthly_data(self, live_calc):
        monthly = live_calc["monthlyEnergyBalance"]
        assert len(monthly) == 12

    def test_has_equipment_rows(self, live_calc):
        rows = live_calc["equipmentBudgetRows"]
        assert len(rows) == 10

    def test_dump_response_structure(self, live_calc):
        """Diagnostic: print key response values for debugging."""
        totals = live_calc["annualTotals"]
        print(f"\nLive API annual totals:")
        for k, v in totals.items():
            print(f"  {k}: {v}")
        cc = live_calc["costComparison"]
        for item in cc["items"]:
            print(f"  {item['source']}: TOC={item['toc']}")


@skip_no_api
class TestLiveApiSolarProduction:
    """Solar production should match exactly (same formula, no rounding)."""

    @pytest.mark.parametrize("month", range(12))
    def test_monthly_solar(self, month, our_results, live_calc):
        live_month = live_calc["monthlyEnergyBalance"][month]
        ours = our_results["balance"].monthly[month].solar_production_kwh
        theirs = live_month["solarProductionKWh"]
        assert ours == pytest.approx(theirs, rel=1e-6), (
            f"Month {month}: solar — ours={ours}, live={theirs}"
        )

    def test_annual_solar(self, our_results, live_calc):
        ours = our_results["balance"].total_solar_production_kwh
        theirs = live_calc["annualTotals"]["annualSolarProductionKWh"]
        assert ours == pytest.approx(theirs, rel=1e-3)


@skip_no_api
class TestLiveApiEnergyBalance:
    """Compare energy balance using the diesel scenario.

    The production API rounds equipment powerW to 2 decimal places before
    computing daily Wh, so totalWhPerDay differs slightly (660.71 vs ~660.91).
    This propagates to energy balance and fuel calculations. We use rel=5e-3
    (0.5%) tolerance to account for this.
    """

    @pytest.mark.parametrize("month", range(12))
    def test_monthly_energy_balance(self, month, our_results, live_diesel_scenario):
        live_month = _get_live_month(live_diesel_scenario, month)
        ours = our_results["balance"].monthly[month].energy_balance_kwh
        theirs = live_month["energyBalanceKWh"]
        assert ours == pytest.approx(theirs, abs=0.1), (
            f"Month {month}: balance — ours={ours}, live={theirs}"
        )

    @pytest.mark.parametrize("month", range(12))
    def test_monthly_fuel(self, month, our_results, live_diesel_scenario):
        live_month = _get_live_month(live_diesel_scenario, month)
        ours = our_results["balance"].monthly[month].fuel_liters
        theirs = live_month["fuelLiters"]
        if ours == 0 and theirs == 0:
            return
        assert ours == pytest.approx(theirs, rel=5e-3), (
            f"Month {month}: fuel — ours={ours}, live={theirs}"
        )

    @pytest.mark.parametrize("month", range(12))
    def test_monthly_fuel_cost(self, month, our_results, live_diesel_scenario):
        live_month = _get_live_month(live_diesel_scenario, month)
        ours = our_results["balance"].monthly[month].fuel_cost_kr
        theirs = live_month["fuelCost"]
        if ours == 0 and theirs == 0:
            return
        assert ours == pytest.approx(theirs, rel=5e-3), (
            f"Month {month}: cost — ours={ours}, live={theirs}"
        )


@skip_no_api
class TestLiveApiTotals:
    """Compare annual totals from the diesel scenario."""

    def test_total_solar(self, our_results, live_diesel_scenario):
        ours = our_results["balance"].total_solar_production_kwh
        theirs = live_diesel_scenario["annualTotals"]["annualSolarProductionKWh"]
        assert ours == pytest.approx(theirs, rel=1e-3)

    def test_total_fuel(self, our_results, live_diesel_scenario):
        ours = our_results["balance"].total_fuel_liters
        theirs = live_diesel_scenario["annualTotals"]["annualFuelConsumption"]
        assert ours == pytest.approx(theirs, rel=5e-3)

    def test_total_fuel_cost(self, our_results, live_diesel_scenario):
        ours = our_results["balance"].total_fuel_cost_kr
        theirs = live_diesel_scenario["annualTotals"]["annualFuelCost"]
        assert ours == pytest.approx(theirs, rel=5e-3)

    def test_total_generator_hours(self, our_results, live_diesel_scenario):
        ours = our_results["balance"].total_generator_hours
        theirs = live_diesel_scenario["annualTotals"]["annualSecondaryRuntimeHours"]
        assert ours == pytest.approx(theirs, rel=5e-3)


@skip_no_api
class TestLiveApiTco:
    """Compare TCO values."""

    def test_fuel_cell_tco(self, our_results, live_calc):
        ours = our_results["tco"].fuel_cell_tco_kr
        fc_item = live_calc["scenarios"]["fuelCell"]["costItem"]
        assert ours == pytest.approx(fc_item["toc"], rel=5e-3), (
            f"FC TCO: ours={ours}, live={fc_item['toc']}"
        )

    def test_diesel_tco(self, our_results, live_calc):
        ours = our_results["tco"].diesel_tco_kr
        dg_item = live_calc["scenarios"]["diesel"]["costItem"]
        assert ours == pytest.approx(dg_item["toc"], rel=5e-3), (
            f"Diesel TCO: ours={ours}, live={dg_item['toc']}"
        )

    def test_fuel_cell_cheaper(self, live_calc):
        """Our reference config should recommend fuel cell (lower TCO)."""
        fc_toc = live_calc["scenarios"]["fuelCell"]["costItem"]["toc"]
        dg_toc = live_calc["scenarios"]["diesel"]["costItem"]["toc"]
        assert fc_toc < dg_toc

    def test_recommended_source_matches(self, our_results, live_calc):
        fc_toc = live_calc["scenarios"]["fuelCell"]["costItem"]["toc"]
        dg_toc = live_calc["scenarios"]["diesel"]["costItem"]["toc"]
        live_cheaper = "fuel_cell" if fc_toc < dg_toc else "diesel"
        assert our_results["tco"].recommended_source == live_cheaper


@skip_no_api
class TestLiveApiEquipmentBudget:
    """Verify equipment budget rows are processed correctly."""

    def test_equipment_count(self, live_calc):
        assert len(live_calc["equipmentBudgetRows"]) == 10

    def test_total_wh_per_day(self, live_calc):
        """The production API rounds powerW to 2dp, causing slight difference."""
        theirs = live_calc["totals"]["totalWhPerDay"]
        # Our exact value is ~660.91, theirs is 660.71 due to rounding
        assert theirs == pytest.approx(660.71, abs=1.0)

    def test_equipment_names(self, live_calc):
        names = [r["name"] for r in live_calc["equipmentBudgetRows"]]
        assert "Victron BMS" in names
        assert "Siemens FMS5020" in names
        assert "Datalogger" in names


@skip_no_api
class TestLiveApiFuelCellScenario:
    """Verify the fuel cell scenario uses fuel cell parameters."""

    def test_fc_source_power(self, live_fuelcell_scenario):
        assert live_fuelcell_scenario["secondarySourcePowerW"] == 82

    def test_diesel_source_power(self, live_diesel_scenario):
        assert live_diesel_scenario["secondarySourcePowerW"] == 6500

    def test_fc_annual_fuel_higher(self, live_fuelcell_scenario, live_diesel_scenario):
        """Fuel cell uses more liters (methanol) but is cheaper overall (via TCO)."""
        fc_fuel = live_fuelcell_scenario["annualTotals"]["annualFuelConsumption"]
        dg_fuel = live_diesel_scenario["annualTotals"]["annualFuelConsumption"]
        assert fc_fuel > dg_fuel


@skip_no_api
class TestLiveApiUsage:
    """Verify usage/rate-limit info is present."""

    def test_has_usage(self, live_response):
        assert "usage" in live_response
        assert "requests_remaining" in live_response["usage"]
