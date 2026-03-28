# Test Suite — Calculation Verification

This test suite proves that the HydroGuide web application produces identical results to the students' `Solar_calculator.xlsx` spreadsheet.

## Approach

We validate at three levels:

### 1. Direct Excel comparison (`test_energy_balance.py`, `test_excel_parser.py`)

Parse the actual `Solar_calculator.xlsx` file, run our calculator with the same inputs, and compare every output value against the Excel's pre-computed results.

```
Month |  Excel Solar |   Calc Solar |    Delta
  Jan |     0.075239 |     0.075239 | 0.000000
  Feb |     0.694154 |     0.694154 | 0.000000
  Mar |    14.581835 |    14.581835 | 0.000000
  ...
  Dec |     0.011567 |     0.011567 | 0.000000
```

Zero delta across all 12 months for solar production, energy balance, generator hours, fuel consumption, fuel cost, and TCO.

### 2. Parameterized formula verification (`test_calculations.py`)

68 tests with hand-computed expected values covering:

- **Solar production** (13 tests) — varies panel wattage, count, efficiency, irradiation. Each expected value is computed by hand from the formula: `irradiation * (Wp / 1000) * panels * efficiency`
- **Consumption** (9 tests) — varies daily load and month length. Verifies disabled equipment is excluded.
- **Energy balance** (11 tests) — surplus, deficit, break-even, and generator fuel/hours/cost with four different generator configurations
- **Full scenarios** (4 tests) — arctic winter station, oversized solar, no panels, zero load
- **TCO** (6 tests) — five economic scenarios plus component verification
- **Source determination** (8 tests) — diesel vs fuel cell recommendation logic
- **Source-aware balance** (4 tests) — verifies the correct source parameters are used
- **Replacement cost** (5 tests) — lifespan exceeded within horizon triggers extra purchase costs
- **Edge cases** (6 tests) — 1 Wh load, 10 kWh load, fractional irradiation, empty config

### 3. Cross-validation against independent Excel simulator (`test_cross_validation.py`)

An independent reimplementation of the exact Excel cell formulas (translated directly from the `.xlsx` formula strings, sharing no code with the calculator) is tested against our calculator across 14 diverse scenarios.

Each scenario varies:
- Panel configuration (0–2000 Wp, 1–6 panels, 60–95% efficiency)
- Load (0–1000 Wh/day)
- Irradiation patterns (arctic, northern Norway, southern Norway, uniform, zero)
- Source type (diesel and fuel cell scenarios)
- Generator specs (power, consumption rate, fuel price, lifespan)
- TCO horizon (1–20 years)

Per scenario, 9 checks are run (5 monthly × 12 months + annual totals + TCO + operating costs + source determination), for a total of 126 cross-validation assertions.

## Excel formulas referenced

These are the actual formulas from `Solar_calculator.xlsx`, verified by loading the file with `openpyxl` in formula mode:

```
Solar production (per month):
  Results!C27 = Input!C66 * (Input!$C$31 * Input!$C$32 / 1000) * Input!$C$33

Energy balance (per month):
  Results!D27 = C27 - ('Power Budget'!$E$19 * B27) / 1000

Operating hours (per month):
  Results!E27 = IF(D27<0,
    ABS(D27) / (IF($B$9="Diesel generator", Input!$C$53, Input!$C$45) / 1000),
    0)

Fuel consumption (per month):
  Results!F27 = IF(D27<0,
    ABS(D27) * IF($B$9="Diesel generator", Input!$C$54, Input!$C$46),
    0)

Fuel cost (per month):
  Results!G27 = F27 * IF($B$9="Diesel generator", Input!$C$55, Input!$C$47)

TCO operating cost (annual):
  FC:  Results!C44 = SUMPRODUCT((D27:D38<0) * ABS(D27:D38) * Input!$C$46 * Input!$C$47)
  DG:  Results!D44 = SUMPRODUCT((D27:D38<0) * ABS(D27:D38) * Input!$C$54 * Input!$C$55)

TCO total:
  Results!C47 = purchase + horizon * (operating + maintenance)
                + MAX(0, FLOOR(horizon / (lifespan / annual_hours)) - 1) * purchase
```

Where:
- `Input!C31` = panel Wp, `C32` = panel count, `C33` = system efficiency
- `Input!C45` = fuel cell power (W), `C46` = FC fuel consumption (l/kWh), `C47` = FC fuel price (kr/l)
- `Input!C53` = diesel power (W), `C54` = DG fuel consumption (l/kWh), `C55` = DG fuel price (kr/l)
- `Results!$B$9` = recommended source ("Diesel generator" or "Fuel cell (methanol)")
- `Power Budget!$E$19` = total daily consumption (Wh/day)

## Source determination logic

The Excel determines which secondary power source to use:

```
Results!B9 = IF(Input!B21="Yes", "Fuel cell (methanol)",
             IF(Input!B19<=3, "Fuel cell (methanol)",
             "Diesel generator"))
```

- If the user wants zero-emission (methanol) → fuel cell
- If inspections per year ≤ 3 → fuel cell
- Otherwise → diesel generator

This determines which power/consumption/price values are used in the energy balance calculations.

## Running the tests

```bash
cd backend
source .venv/bin/activate
pytest tests/ -v
```

Current results: **233 tests, all passing in under 0.5 seconds.**

## Adding new cross-validation scenarios

To add a new scenario, add an entry to the `SCENARIOS` dict in `test_cross_validation.py`:

```python
SCENARIOS = {
    ...
    "my_new_scenario": dict(
        panel_wp=300, panel_count=2, efficiency=0.8,
        irradiation=[...],  # 12 monthly values
        daily_wh=400, inspections=4, zero_emission=False,
        fc_power_w=82, fc_consumption=0.9, fc_price=75,
        fc_purchase=88000, fc_maintenance=100, fc_lifespan=6500,
        dg_power_w=6500, dg_consumption=0.5, dg_price=18.1,
        dg_purchase=35000, dg_maintenance=25000, dg_lifespan=43800,
        horizon=10,
    ),
}
```

It will automatically be tested against all 9 cross-validation checks (monthly solar, balance, hours, fuel, cost + annual totals + TCO + operating costs + source determination).
