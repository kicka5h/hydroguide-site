"""Live API validation tests.

Compares our calculator output against the existing HydroGuide production API
to confirm both implementations produce the same results.

IMPORTANT: The production API is connected to a student's personal ChatGPT
subscription. These tests are designed to make the ABSOLUTE MINIMUM number
of API calls needed to validate accuracy. Responses are cached to disk so
repeat runs cost nothing.

Setup:
    1. Student creates an API endpoint that accepts a config and returns
       energy balance + TCO + recommendations
    2. Set environment variables:
         HYDROGUIDE_API_URL=https://hydroguide.no/api/v1/calculate
         HYDROGUIDE_API_KEY=<the bearer token>
    3. Run: pytest tests/test_live_api.py -v

    Without the env vars, all tests are automatically skipped.

API call budget: 1 call total (the reference config).
"""

import json
import os
from pathlib import Path

import httpx
import pytest

from app.services.energy_balance import calculate_energy_balance, calculate_tco
from app.services.excel_parser import parse_excel

# ── Configuration ────────────────────────────────────────────────────────────

API_URL = os.getenv("HYDROGUIDE_API_URL", "")
API_KEY = os.getenv("HYDROGUIDE_API_KEY", "")

CACHE_DIR = Path(__file__).parent / ".api_cache"
CACHE_FILE = CACHE_DIR / "reference_response.json"

skip_no_api = pytest.mark.skipif(
    not API_URL or not API_KEY,
    reason="HYDROGUIDE_API_URL and HYDROGUIDE_API_KEY not set",
)


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
    return {"balance": balance, "tco": tco}


@pytest.fixture(scope="module")
def live_response(reference_config):
    """Fetch the live API response, cached to disk.

    This makes exactly ONE API call ever. Subsequent runs use the cache.
    Delete .api_cache/ to force a fresh call.
    """
    if not API_URL or not API_KEY:
        pytest.skip("API credentials not configured")

    # Return cached response if available
    if CACHE_FILE.exists():
        return json.loads(CACHE_FILE.read_text())

    # Make the single API call
    payload = {
        "config": reference_config.model_dump(),
    }

    response = httpx.post(
        API_URL,
        json=payload,
        headers={"Authorization": f"Bearer {API_KEY}"},
        timeout=60.0,
    )
    response.raise_for_status()
    data = response.json()

    # Cache to disk
    CACHE_DIR.mkdir(exist_ok=True)
    CACHE_FILE.write_text(json.dumps(data, indent=2))

    return data


# ── Helper ───────────────────────────────────────────────────────────────────

# Map the live API response fields to our field names.
# Update this mapping when the student provides the actual response format.
#
# Expected live API response structure (adjust as needed):
# {
#   "energy_balance": {
#     "monthly": [
#       {"month": "Jan", "solar_production_kwh": ..., "energy_balance_kwh": ...,
#        "generator_hours": ..., "fuel_liters": ..., "fuel_cost_kr": ...},
#       ...
#     ],
#     "total_solar_production_kwh": ...,
#     "total_fuel_liters": ...,
#     "total_fuel_cost_kr": ...,
#   },
#   "tco": {
#     "fuel_cell_tco_kr": ...,
#     "diesel_tco_kr": ...,
#   }
# }

def _get_live_monthly(live_response, month_index, field):
    """Extract a monthly value from the live API response.

    Adjust this function when the actual API response format is known.
    """
    monthly = live_response.get("energy_balance", {}).get("monthly", [])
    if month_index >= len(monthly):
        pytest.skip(f"Live API response missing month {month_index}")
    return monthly[month_index].get(field)


def _get_live_total(live_response, field):
    """Extract an annual total from the live API response."""
    return live_response.get("energy_balance", {}).get(field)


def _get_live_tco(live_response, field):
    """Extract a TCO value from the live API response."""
    return live_response.get("tco", {}).get(field)


# ── Tests ────────────────────────────────────────────────────────────────────
# All tests use the single cached response. Zero additional API calls.


@skip_no_api
class TestLiveApiMonthly:
    """Compare our monthly calculations against the live API."""

    @pytest.mark.parametrize("month", range(12))
    def test_monthly_solar_production(self, month, our_results, live_response):
        ours = our_results["balance"].monthly[month].solar_production_kwh
        theirs = _get_live_monthly(live_response, month, "solar_production_kwh")
        if theirs is None:
            pytest.skip("Field not in live response")
        assert ours == pytest.approx(theirs, rel=1e-3), (
            f"Month {month}: solar production — ours={ours}, live={theirs}"
        )

    @pytest.mark.parametrize("month", range(12))
    def test_monthly_energy_balance(self, month, our_results, live_response):
        ours = our_results["balance"].monthly[month].energy_balance_kwh
        theirs = _get_live_monthly(live_response, month, "energy_balance_kwh")
        if theirs is None:
            pytest.skip("Field not in live response")
        assert ours == pytest.approx(theirs, rel=1e-3), (
            f"Month {month}: energy balance — ours={ours}, live={theirs}"
        )

    @pytest.mark.parametrize("month", range(12))
    def test_monthly_fuel(self, month, our_results, live_response):
        ours = our_results["balance"].monthly[month].fuel_liters
        theirs = _get_live_monthly(live_response, month, "fuel_liters")
        if theirs is None:
            pytest.skip("Field not in live response")
        assert ours == pytest.approx(theirs, rel=1e-3), (
            f"Month {month}: fuel — ours={ours}, live={theirs}"
        )


@skip_no_api
class TestLiveApiAnnual:
    """Compare our annual totals against the live API."""

    def test_total_solar_production(self, our_results, live_response):
        ours = our_results["balance"].total_solar_production_kwh
        theirs = _get_live_total(live_response, "total_solar_production_kwh")
        if theirs is None:
            pytest.skip("Field not in live response")
        assert ours == pytest.approx(theirs, rel=1e-3)

    def test_total_fuel(self, our_results, live_response):
        ours = our_results["balance"].total_fuel_liters
        theirs = _get_live_total(live_response, "total_fuel_liters")
        if theirs is None:
            pytest.skip("Field not in live response")
        assert ours == pytest.approx(theirs, rel=1e-3)

    def test_total_fuel_cost(self, our_results, live_response):
        ours = our_results["balance"].total_fuel_cost_kr
        theirs = _get_live_total(live_response, "total_fuel_cost_kr")
        if theirs is None:
            pytest.skip("Field not in live response")
        assert ours == pytest.approx(theirs, rel=1e-3)


@skip_no_api
class TestLiveApiTco:
    """Compare our TCO calculations against the live API."""

    def test_fuel_cell_tco(self, our_results, live_response):
        ours = our_results["tco"].fuel_cell_tco_kr
        theirs = _get_live_tco(live_response, "fuel_cell_tco_kr")
        if theirs is None:
            pytest.skip("Field not in live response")
        assert ours == pytest.approx(theirs, rel=1e-3)

    def test_diesel_tco(self, our_results, live_response):
        ours = our_results["tco"].diesel_tco_kr
        theirs = _get_live_tco(live_response, "diesel_tco_kr")
        if theirs is None:
            pytest.skip("Field not in live response")
        assert ours == pytest.approx(theirs, rel=1e-3)
