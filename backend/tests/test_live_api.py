"""Live API validation tests.

Compares our calculator output against the existing HydroGuide production API
at https://hydroguide.no/api/v1/recommendations to confirm both implementations
produce consistent results.

IMPORTANT: The production API is connected to a student's personal ChatGPT
subscription. These tests are designed to make the ABSOLUTE MINIMUM number
of API calls needed to validate. Responses are cached to disk so repeat
runs cost nothing.

The production API uses AI to generate NVE-compliant recommendations.
The calculations (energy balance, TCO) are deterministic — we validate
those separately via test_energy_balance.py and test_cross_validation.py.
This test focuses on whether the API's input/output format is compatible
and whether any calculation values it returns match ours.

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
    return {"balance": balance, "tco": tco, "config": reference_config}


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

    # Build the request payload from our reference config.
    # The exact payload format may need adjusting once we see the
    # POST /api/v1/recommendations docs. Start with the full config dump.
    payload = reference_config.model_dump()

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
    CACHE_FILE.write_text(json.dumps(data, indent=2, ensure_ascii=False))
    # Also save the raw request for debugging
    (CACHE_DIR / "reference_request.json").write_text(
        json.dumps(payload, indent=2, ensure_ascii=False)
    )

    return data


# ── Helpers ──────────────────────────────────────────────────────────────────
# These extract values from the live API response.
# Update the key paths when the actual response format is known.
# Fields that don't exist in the response will cause tests to skip,
# not fail — so we can see which fields are available.


def _deep_get(data: dict, *keys, default=None):
    """Safely traverse nested dict keys."""
    for key in keys:
        if not isinstance(data, dict):
            return default
        data = data.get(key, default)
    return data


# ── Tests ────────────────────────────────────────────────────────────────────
# All tests use the single cached response. Zero additional API calls.


@skip_no_api
class TestLiveApiConnection:
    """Basic connectivity and response shape."""

    def test_response_is_dict(self, live_response):
        assert isinstance(live_response, dict), (
            f"Expected dict response, got {type(live_response)}"
        )

    def test_response_not_empty(self, live_response):
        assert len(live_response) > 0, "Response is empty"

    def test_dump_response_keys(self, live_response):
        """Not a real assertion — prints the response structure for debugging."""
        print(f"\nLive API response keys: {list(live_response.keys())}")
        for key, value in live_response.items():
            if isinstance(value, dict):
                print(f"  {key}: dict with keys {list(value.keys())}")
            elif isinstance(value, list):
                print(f"  {key}: list with {len(value)} items")
                if value and isinstance(value[0], dict):
                    print(f"    first item keys: {list(value[0].keys())}")
            else:
                print(f"  {key}: {type(value).__name__} = {str(value)[:80]}")


@skip_no_api
class TestLiveApiEnergyBalance:
    """Compare energy balance values if the API returns them.

    The production API may or may not include raw calculation values
    in its response. These tests skip gracefully if the fields aren't present.
    """

    @pytest.mark.parametrize("month", range(12))
    def test_monthly_solar_production(self, month, our_results, live_response):
        theirs = _deep_get(
            live_response, "energy_balance", "monthly", default=[]
        )
        if not theirs or month >= len(theirs):
            pytest.skip("No monthly energy balance in response")
        their_solar = theirs[month].get("solar_production_kwh")
        if their_solar is None:
            pytest.skip("solar_production_kwh not in monthly data")
        ours = our_results["balance"].monthly[month].solar_production_kwh
        assert ours == pytest.approx(their_solar, rel=1e-3), (
            f"Month {month}: solar — ours={ours}, live={their_solar}"
        )

    @pytest.mark.parametrize("month", range(12))
    def test_monthly_energy_balance(self, month, our_results, live_response):
        theirs = _deep_get(
            live_response, "energy_balance", "monthly", default=[]
        )
        if not theirs or month >= len(theirs):
            pytest.skip("No monthly energy balance in response")
        their_balance = theirs[month].get("energy_balance_kwh")
        if their_balance is None:
            pytest.skip("energy_balance_kwh not in monthly data")
        ours = our_results["balance"].monthly[month].energy_balance_kwh
        assert ours == pytest.approx(their_balance, rel=1e-3), (
            f"Month {month}: balance — ours={ours}, live={their_balance}"
        )

    @pytest.mark.parametrize("month", range(12))
    def test_monthly_fuel(self, month, our_results, live_response):
        theirs = _deep_get(
            live_response, "energy_balance", "monthly", default=[]
        )
        if not theirs or month >= len(theirs):
            pytest.skip("No monthly energy balance in response")
        their_fuel = theirs[month].get("fuel_liters")
        if their_fuel is None:
            pytest.skip("fuel_liters not in monthly data")
        ours = our_results["balance"].monthly[month].fuel_liters
        assert ours == pytest.approx(their_fuel, rel=1e-3), (
            f"Month {month}: fuel — ours={ours}, live={their_fuel}"
        )


@skip_no_api
class TestLiveApiTotals:
    """Compare annual totals if available."""

    def _check(self, our_value, live_response, *keys, label="value"):
        theirs = _deep_get(live_response, *keys)
        if theirs is None:
            pytest.skip(f"{'.'.join(keys)} not in response")
        assert our_value == pytest.approx(theirs, rel=1e-3), (
            f"{label}: ours={our_value}, live={theirs}"
        )

    def test_total_solar(self, our_results, live_response):
        self._check(
            our_results["balance"].total_solar_production_kwh,
            live_response,
            "energy_balance", "total_solar_production_kwh",
            label="total solar",
        )

    def test_total_fuel(self, our_results, live_response):
        self._check(
            our_results["balance"].total_fuel_liters,
            live_response,
            "energy_balance", "total_fuel_liters",
            label="total fuel",
        )

    def test_total_fuel_cost(self, our_results, live_response):
        self._check(
            our_results["balance"].total_fuel_cost_kr,
            live_response,
            "energy_balance", "total_fuel_cost_kr",
            label="total fuel cost",
        )

    def test_fc_tco(self, our_results, live_response):
        self._check(
            our_results["tco"].fuel_cell_tco_kr,
            live_response,
            "tco", "fuel_cell_tco_kr",
            label="FC TCO",
        )

    def test_diesel_tco(self, our_results, live_response):
        self._check(
            our_results["tco"].diesel_tco_kr,
            live_response,
            "tco", "diesel_tco_kr",
            label="Diesel TCO",
        )


@skip_no_api
class TestLiveApiRecommendations:
    """Check that the AI recommendations response contains expected fields.

    We can't assert exact values since the AI generates natural language,
    but we can verify the response structure and that key recommendation
    categories are present.
    """

    def test_has_recommendations(self, live_response):
        recs = _deep_get(live_response, "recommendations")
        if recs is None:
            recs = _deep_get(live_response, "recommendation")
        if recs is None:
            pytest.skip("No recommendations field in response")
        assert recs is not None

    def test_has_communication_recommendation(self, live_response):
        """Should recommend a communication method."""
        recs = _deep_get(live_response, "recommendations", default={})
        if isinstance(recs, dict):
            comm = recs.get("communication") or recs.get("kommunikasjon")
        elif isinstance(recs, list):
            comm = next(
                (r for r in recs if "communi" in str(r).lower() or "kommun" in str(r).lower()),
                None,
            )
        else:
            comm = None
        if comm is None:
            pytest.skip("No communication recommendation found")
        assert comm is not None

    def test_has_measurement_recommendation(self, live_response):
        """Should recommend a measurement method."""
        recs = _deep_get(live_response, "recommendations", default={})
        if isinstance(recs, dict):
            meas = recs.get("measurement") or recs.get("measurement_method") or recs.get("måling")
        elif isinstance(recs, list):
            meas = next(
                (r for r in recs if "measur" in str(r).lower() or "mål" in str(r).lower()),
                None,
            )
        else:
            meas = None
        if meas is None:
            pytest.skip("No measurement recommendation found")
        assert meas is not None
