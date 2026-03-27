"""Config CRUD endpoints + example config + Excel import."""

import json
from datetime import datetime, timezone
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, Request, UploadFile, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_db
from app.models.database import HydroConfig
from app.models.schemas import (
    ConfigCreate,
    ConfigListItem,
    ConfigResponse,
    ConfigUpdate,
    EnergyBalanceResult,
    ExcelImportResponse,
    HydroConfigData,
    RecommendedConfig,
    TcoComparison,
)
from app.services.excel_parser import parse_excel

# Load reference config from the JSON source of truth
_REFERENCE_PATH = Path(__file__).parent.parent.parent.parent / "reference-config.json"

router = APIRouter(prefix="/api/v1", tags=["configs"])


def _get_session_id(request: Request) -> str:
    session_id = getattr(request.state, "session_id", None)
    if not session_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="No active session",
        )
    return session_id


def _db_to_response(config: HydroConfig) -> ConfigResponse:
    return ConfigResponse(
        id=config.id,
        name=config.name,
        data=HydroConfigData.model_validate_json(config.data),
        created_at=config.created_at,
        updated_at=config.updated_at,
    )


# ── CRUD ─────────────────────────────────────────────────────────────────────


@router.post("/configs", response_model=ConfigResponse, status_code=201)
async def create_config(
    body: ConfigCreate,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """Save a new configuration for the current session."""
    session_id = _get_session_id(request)
    config = HydroConfig(
        session_id=session_id,
        name=body.name,
        data=body.data.model_dump_json(),
    )
    db.add(config)
    await db.flush()
    await db.refresh(config)
    return _db_to_response(config)


@router.get("/configs", response_model=list[ConfigListItem])
async def list_configs(
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """List all configurations for the current session."""
    session_id = _get_session_id(request)
    result = await db.execute(
        select(HydroConfig)
        .where(HydroConfig.session_id == session_id)
        .order_by(HydroConfig.updated_at.desc())
    )
    configs = result.scalars().all()
    return [
        ConfigListItem(
            id=c.id,
            name=c.name,
            created_at=c.created_at,
            updated_at=c.updated_at,
        )
        for c in configs
    ]


@router.get("/configs/{config_id}", response_model=ConfigResponse)
async def get_config(
    config_id: str,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """Load a specific configuration."""
    session_id = _get_session_id(request)
    result = await db.execute(
        select(HydroConfig).where(
            HydroConfig.id == config_id,
            HydroConfig.session_id == session_id,
        )
    )
    config = result.scalar_one_or_none()
    if not config:
        raise HTTPException(status_code=404, detail="Configuration not found")
    return _db_to_response(config)


@router.put("/configs/{config_id}", response_model=ConfigResponse)
async def update_config(
    config_id: str,
    body: ConfigUpdate,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """Update an existing configuration."""
    session_id = _get_session_id(request)
    result = await db.execute(
        select(HydroConfig).where(
            HydroConfig.id == config_id,
            HydroConfig.session_id == session_id,
        )
    )
    config = result.scalar_one_or_none()
    if not config:
        raise HTTPException(status_code=404, detail="Configuration not found")

    if body.name is not None:
        config.name = body.name
    if body.data is not None:
        config.data = body.data.model_dump_json()

    await db.flush()
    await db.refresh(config)
    return _db_to_response(config)


@router.delete("/configs/{config_id}", status_code=204)
async def delete_config(
    config_id: str,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """Delete a configuration."""
    session_id = _get_session_id(request)
    result = await db.execute(
        select(HydroConfig).where(
            HydroConfig.id == config_id,
            HydroConfig.session_id == session_id,
        )
    )
    config = result.scalar_one_or_none()
    if not config:
        raise HTTPException(status_code=404, detail="Configuration not found")
    await db.delete(config)


# ── Excel Import ─────────────────────────────────────────────────────────────


@router.post("/configs/import-excel", response_model=ExcelImportResponse)
async def import_excel(file: UploadFile):
    """Import a Solar_calculator.xlsx file and parse it into a configuration.

    Returns the parsed config data along with the Results sheet values
    (energy balance, TCO, recommendations) for validation.
    """
    if not file.filename or not file.filename.endswith((".xlsx", ".xls")):
        raise HTTPException(
            status_code=400,
            detail="File must be an Excel file (.xlsx)",
        )

    contents = await file.read()
    if len(contents) > 10 * 1024 * 1024:  # 10 MB limit
        raise HTTPException(status_code=400, detail="File too large (max 10 MB)")

    try:
        config, recommended, energy_balance, tco, notes = parse_excel(contents)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=400,
            detail=f"Failed to parse Excel file: {e}",
        )

    return ExcelImportResponse(
        config=config,
        energy_balance=energy_balance,
        recommended_config=recommended,
        tco=tco,
        validation_notes=notes,
    )


# ── Reference Config (source of truth) ───────────────────────────────────────


def _load_reference_config() -> dict:
    """Load the reference config JSON generated from the students' Excel."""
    if not _REFERENCE_PATH.exists():
        raise RuntimeError(
            f"Reference config not found at {_REFERENCE_PATH}. "
            "Run the Excel parser to regenerate it."
        )
    return json.loads(_REFERENCE_PATH.read_text(encoding="utf-8"))


@router.get("/config/reference")
async def get_reference_config():
    """Return the full reference data: config, energy balance, TCO, recommendations.

    This is the source of truth, parsed from Solar_calculator.xlsx and stored
    as reference-config.json in the repo root. Students can edit the JSON directly.
    """
    return _load_reference_config()


@router.get("/config/example", response_model=ConfigResponse)
async def get_example_config():
    """Return the reference configuration in the standard config response format."""
    ref = _load_reference_config()
    return ConfigResponse(
        id="example",
        name="Referansekonfigurasjon — Solar Calculator",
        data=HydroConfigData.model_validate(ref["config"]),
        created_at=datetime(2026, 1, 1, tzinfo=timezone.utc),
        updated_at=datetime(2026, 1, 1, tzinfo=timezone.utc),
    )
