"""Analysis endpoint with result caching."""

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_db
from app.middleware.auth import require_api_token
from app.models.schemas import AnalyzeRequest, AnalyzeResponse
from app.services.analysis_service import (
    analyze_config,
    compute_config_hash,
    get_cached_analysis,
    save_analysis_result,
)

router = APIRouter(prefix="/api/v1", tags=["analysis"])


@router.post(
    "/analyze",
    response_model=AnalyzeResponse,
    dependencies=[Depends(require_api_token)],
)
async def run_analysis(
    body: AnalyzeRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Analyze a hydropower configuration and return recommendations.

    Requires a Bearer token. Results are cached by config hash —
    identical configurations return the cached result without re-analysis.
    """
    config_hash = compute_config_hash(body.config)

    # Check cache
    cached = await get_cached_analysis(db, config_hash)
    if cached:
        return cached

    # Run analysis
    response = await analyze_config(body.config)

    # Cache the result
    await save_analysis_result(db, None, config_hash, response)

    return response
