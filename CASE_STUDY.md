# Case Study: Rebuilding HydroGuide

## Client

Four engineering students at Fagskulen Vestland — Nikolas Olsen, Dan Roald Larsen, Jinn-Marie Bakke, and Espen Espenland — completing their 2026 capstone project.

This case study was prepared by Ash Karczag. @kicka5h

## The Problem

Norway's small-scale hydropower sector requires engineers to design and document minimum water flow measurement stations at remote intakes. The regulatory requirements from NVE (Norwegian Water Resources and Energy Directorate) are extensive, and mistakes in station dimensioning — particularly energy system sizing for solar, battery, and backup power — are the most common cause of operational downtime and data loss.

The students built a working prototype as an Excel spreadsheet (`Solar_calculator.xlsx`) that solves the core engineering problem: given a set of site conditions, equipment choices, and solar irradiation data, calculate whether the energy system is adequately sized and what backup power is needed.

The spreadsheet works, but it's not shareable, not interactive, and doesn't present the students' engineering work in a way that demonstrates its value.

## The Brief

Rebuild the spreadsheet as a professional web application that:

- Showcases the students' engineering work
- Is responsive across desktop and mobile
- Provides a clean, professional interface themed around hydroelectric power
- Preserves the exact calculation accuracy of the original spreadsheet
- Supports session-based persistence so users can save and return to configurations
- Runs in Docker for easy deployment

## Approach

### Starting from the spreadsheet

Rather than treating the Excel file as a rough spec, I treated it as the authoritative source. The spreadsheet contains three sheets with precise, interdependent calculations:

- **Input** — 15 questionnaire fields with NVE guidance text, plus technical parameters for solar panels, batteries, fuel cells, and diesel generators
- **Power Budget** — 10 equipment items with power draw and daily/weekly consumption
- **Results** — 12-month energy balance, backup generator sizing, fuel costs, and a Total Cost of Ownership comparison

A parser was built that extracts every value, every guidance comment, and every calculation result from the Excel file, and was validated using pytest.

### Zero-delta validation

The energy balance calculator was validated against the spreadsheet output to six decimal places across all 12 months:

| Metric | Spreadsheet | Calculated | Delta |
| ------ | ----------- | ---------- | ----- |
| Annual solar production | 296.3219 kWh | 296.3219 kWh | 0.000000 |
| Annual fuel consumption | 51.3158 l | 51.3158 l | 0.000000 |
| Annual fuel cost | 928.8157 kr | 928.8157 kr | 0.000000 |
| Fuel cell TCO (10yr) | 158,276.31 kr | 158,276.31 kr | 0.00 |
| Diesel TCO (10yr) | 294,288.16 kr | 294,288.16 kr | 0.00 |

This means users can trust that the web tool produces identical results to the spreadsheet the students validated their engineering against.

### Reference config as source of truth

The parsed Excel output is stored as `reference-config.json` in the repository root. This single file contains all input values, calculated results, questionnaire text, NVE guidance, technical parameter comments, and regulatory requirements.

The students can edit this JSON directly to update guidance text, adjust default values, or correct recommendations — without touching any code. The backend reads from this file at runtime.

### Architecture decisions

**Rule-based analysis, not AI.** The original site description mentioned "AI-powered analysis," but the spreadsheet logic is entirely deterministic. Decision trees and threshold checks produce the recommendations. We implemented the same logic faithfully rather than introducing an AI dependency that would add cost, latency, and unpredictability to a tool where engineers need to trust the output.

**Calculations validated, not approximated.** Every formula was reverse-engineered from the spreadsheet and verified to produce identical output. The energy balance formula per month:

```
solar_production = irradiation_kwh_m2 * (panel_Wp / 1000) * num_panels * efficiency
consumption = daily_Wh / 1000 * days_in_month
balance = solar_production - consumption
if balance < 0: fuel = abs(balance) * fuel_consumption_rate_l_kwh
```

**SQLite in Docker.** No external database service needed. The SQLite file is volume-mounted for persistence. For a tool with this usage pattern (consultants running individual project calculations), SQLite handles the concurrency requirements comfortably.

**Anonymous sessions.** No login required. A cookie-based UUID session is created on first visit, and configurations are tied to that session. This removes friction — an engineer can start using the tool immediately without creating an account.

## What was built

### Backend (Python + FastAPI)

- **Excel parser** — Reads all three sheets of Solar_calculator.xlsx, extracts every value including guidance text and comments
- **Energy balance calculator** — Monthly solar production vs consumption, diesel backup runtime, fuel costs
- **TCO calculator** — Fuel cell vs diesel comparison over configurable assessment horizon
- **Analysis service** — Rule-based recommendations for communication method, logger redundancy, measurement approach, secondary power source
- **Config CRUD API** — Save, load, list, update, delete configurations per session
- **Session middleware** — Anonymous cookie-based sessions with SQLAlchemy persistence
- **Bearer auth** — JWT and simple token authentication for the public API
- **39 tests** covering the parser, calculator, and all API endpoints

### Data layer

- **reference-config.json** — 431 lines, 7 sections, the complete source of truth
- **Pydantic schemas** — Type-safe models matching every field in the Excel spreadsheet
- **SQLite storage** — Sessions, configurations, and cached analysis results

## Technical details

| Component | Choice | Reasoning |
| --------- | ------ | --------- |
| API framework | FastAPI | Async, auto-generated docs, Pydantic integration |
| ORM | SQLAlchemy (async) | Industry standard, async SQLite via aiosqlite |
| Database | SQLite | Zero-config, Docker volume-mounted, sufficient for usage pattern |
| Auth | PyJWT | Standard JWT validation for public API access |
| Excel parsing | openpyxl | Reads .xlsx natively, handles formulas and data types |
| Testing | pytest + pytest-asyncio | Async test support, in-memory SQLite for fast tests |
| Type checking | pyright | Catches issues before runtime |

## Status

Backend complete. Frontend in progress — React + Vite + TypeScript with Tailwind CSS, Framer Motion animations, shadcn/ui components, and a hydroelectric visual theme.

---

*Website developed by Ash Karczag ([@kicka5h](https://github.com/kicka5h))*
