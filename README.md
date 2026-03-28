# HydroGuide

A digital support tool for engineers and consultants working with small-scale hydropower in Norway. Helps with planning and designing minimum water flow (minstevannforing) measurement stations at remote intakes, in accordance with NVE guidelines.

Developed by Nikolas Olsen, Dan Roald Larsen, Jinn-Marie Bakke, and Espen Espenland as their capstone project at Fagskulen Vestland (2026).

Website developed by Ash Karczag. @kicka5h

Test suite for calculations developed with the help of Claude Code.

## What it does

- Guided questionnaire covering location, communication, intake type, flow regulation, and measurement solutions
- Energy system dimensioning: solar panels, battery banks, fuel cells, diesel generators
- Power budget calculator with per-equipment itemization
- Monthly energy balance with backup generator runtime and fuel cost calculations
- Total Cost of Ownership comparison (fuel cell vs diesel)
- Rule-based recommendations matching NVE regulatory requirements
- Excel import for existing Solar_calculator.xlsx spreadsheets
- Save/load configurations per browser session

## Tech stack

| Layer | Technology |
|---|---|
| Backend | Python, FastAPI, SQLAlchemy (async), SQLite |
| Frontend | React, Vite, TypeScript, Tailwind CSS, shadcn/ui *(in progress)* |
| Deployment | Docker with volume-mounted SQLite |

## Project structure

```
hydroguide-site/
├── reference-config.json     # Source of truth — parsed from Excel, editable
├── Solar_calculator.xlsx     # Original student spreadsheet
├── docker-compose.yml
├── backend/
│   ├── app/
│   │   ├── main.py           # FastAPI app entry point
│   │   ├── config.py          # Settings (env vars)
│   │   ├── db.py              # Async SQLAlchemy engine
│   │   ├── routers/           # API endpoints
│   │   ├── models/            # Pydantic schemas + DB models
│   │   ├── services/          # Analysis, energy balance, Excel parser
│   │   └── middleware/        # Auth + session
│   ├── tests/                 # 39 tests
│   ├── Dockerfile
│   └── requirements.txt
└── frontend/                  # (in progress)
```

## Getting started

### Backend

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

The API is available at `http://localhost:8000`. Interactive docs at `/docs`.

### Running tests

```bash
cd backend
source .venv/bin/activate
pytest tests/ -v
```

### Docker

```bash
docker compose up --build
```

SQLite data persists in a Docker volume.

## API endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/v1/health` | - | Health check |
| GET | `/api/v1/config/reference` | - | Full reference data (source of truth) |
| GET | `/api/v1/config/example` | - | Reference config in standard format |
| POST | `/api/v1/configs/import-excel` | - | Upload and parse an Excel file |
| POST | `/api/v1/configs` | session | Save a new configuration |
| GET | `/api/v1/configs` | session | List saved configurations |
| GET | `/api/v1/configs/{id}` | session | Load a specific configuration |
| PUT | `/api/v1/configs/{id}` | session | Update a configuration |
| DELETE | `/api/v1/configs/{id}` | session | Delete a configuration |
| POST | `/api/v1/analyze` | Bearer | Run analysis on a configuration |

## reference-config.json

This file is the source of truth for the website, generated from `Solar_calculator.xlsx`. It contains:

- **config** — all input values (questionnaire answers, technical parameters, power budget)
- **recommended_config** — what the spreadsheet logic recommends
- **energy_balance** — 12-month solar production vs consumption breakdown
- **tco** — fuel cell vs diesel cost comparison over the assessment horizon
- **questionnaire** — 15 questions with field names, display text, and NVE guidance
- **technical_comments** — help text for every technical parameter
- **nve_requirements** — NVE regulatory requirements (measurement frequency, accuracy, etc.)

Students can edit this file directly. To regenerate it from a new Excel file, use the import endpoint.

## Energy balance validation

The energy balance calculator has been validated against the Excel spreadsheet with zero-delta across all 12 months:

```
Total solar production:  296.32 kWh  (delta: 0.000000)
Total fuel consumption:   51.32 l    (delta: 0.000000)
Total fuel cost:         928.82 kr   (delta: 0.000000)
Fuel cell TCO:       158,276.31 kr   (delta: 0.00)
Diesel TCO:          294,288.16 kr   (delta: 0.00)
```
