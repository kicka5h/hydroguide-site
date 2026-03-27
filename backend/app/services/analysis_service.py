"""Rule-based analysis service for hydropower configurations.

Derives recommendations from input parameters using deterministic logic
matching the Solar_calculator.xlsx Results sheet.
"""

import hashlib

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.database import AnalysisResult
from app.models.schemas import (
    AnalysisRecommendation,
    AnalyzeResponse,
    HydroConfigData,
    RecommendedConfig,
)


def compute_config_hash(config: HydroConfigData) -> str:
    """Deterministic hash of a config for cache lookups."""
    data = config.model_dump_json(exclude_none=True)
    return hashlib.sha256(data.encode()).hexdigest()[:16]


async def get_cached_analysis(
    db: AsyncSession, config_hash: str
) -> AnalyzeResponse | None:
    """Return a cached analysis result if one exists for this config hash."""
    result = await db.execute(
        select(AnalysisResult)
        .where(AnalysisResult.config_hash == config_hash)
        .order_by(AnalysisResult.created_at.desc())
        .limit(1)
    )
    cached = result.scalar_one_or_none()
    if cached:
        response = AnalyzeResponse.model_validate_json(cached.result)
        response.cached = True
        return response
    return None


async def save_analysis_result(
    db: AsyncSession,
    config_id: str | None,
    config_hash: str,
    response: AnalyzeResponse,
) -> None:
    """Cache an analysis result."""
    record = AnalysisResult(
        config_id=config_id or "anonymous",
        config_hash=config_hash,
        result=response.model_dump_json(),
    )
    db.add(record)


def _determine_communication(config: HydroConfigData) -> str:
    """Determine recommended communication based on questionnaire answers."""
    comm = config.communication
    if comm.has_4g_coverage:
        return "4G modem"
    if comm.has_nbiot_coverage:
        return "NB-IoT modem"
    if comm.has_line_of_sight:
        return "Radio link"
    return "Satellite modem"


def _determine_secondary_source(config: HydroConfigData) -> str:
    """Determine recommended backup power source."""
    if config.operations.zero_emission_desired:
        return "Fuel cell (methanol)"
    return "Diesel generator"


async def analyze_config(config: HydroConfigData) -> AnalyzeResponse:
    """
    Analyze a hydropower configuration and return recommendations.

    TODO: Replace rule-based stub with actual AI service call.
    """
    recommendations = []

    # Calculate total daily energy from power budget
    daily_wh = sum(
        item.consumption_wh_day for item in config.power_budget if item.enabled
    )

    # ── Determine recommended config ─────────────────────────────────────
    comm_recommendation = _determine_communication(config)
    secondary_source = _determine_secondary_source(config)
    inspections = config.operations.inspections_per_year or 4

    recommended = RecommendedConfig(
        measurement_method=(
            "Electromagnetic, orifice plate or ADP flow meter. "
            "Pressure cell, bubble tube, float or ultrasound/radar sensor"
        ),
        communication=comm_recommendation,
        logger_recommendation=(
            "2 loggers + backup logger" if inspections <= 4
            else "1 logger + backup"
        ),
        energy_monitoring="Yes" if config.communication.has_4g_coverage else "No",
        secondary_source=secondary_source,
        secondary_source_power_w=(
            config.diesel_generator.power_w
            if secondary_source == "Diesel generator"
            else config.fuel_cell.power_w
        ),
        solar_panel_count=config.solar.panel_count,
        battery_ah=config.operations.battery_bank_ah,
    )

    # ── Solar sizing check ───────────────────────────────────────────────
    irr_values = config.monthly_irradiation.as_list()
    total_wp = (config.solar.panel_wattage_wp or 0) * config.solar.panel_count
    efficiency = config.solar.system_efficiency

    if total_wp > 0 and any(v > 0 for v in irr_values):
        worst_month_kwh = min(v for v in irr_values if v > 0) if any(
            v > 0 for v in irr_values
        ) else 0
        # Solar production for worst month (kWh) converted to Wh/day
        # irradiation is monthly kWh/m² total; production = irr * Wp * eff / 1000
        # daily = monthly_production * 1000 / days_in_month (use 30 as approx)
        monthly_production_wh = worst_month_kwh * total_wp * efficiency
        daily_solar_wh = monthly_production_wh / 30 * 1000  # kWh->Wh

        if daily_wh > 0 and daily_solar_wh < daily_wh:
            recommendations.append(AnalysisRecommendation(
                category="solar",
                severity="warning",
                title="Solcellekapasitet utilstrekkelig i verste måned",
                description=(
                    f"Daglig forbruk er {daily_wh:.1f} Wh, men solpanelene "
                    f"produserer kun ~{daily_solar_wh:.1f} Wh/dag i den svakeste måneden."
                ),
                suggestion="Vurder flere paneler eller en sterkere sekundærkilde.",
            ))
        elif daily_wh > 0:
            recommendations.append(AnalysisRecommendation(
                category="solar",
                severity="info",
                title="Solcelledimensjonering ser tilstrekkelig ut",
                description=(
                    f"Solpanelene produserer ~{daily_solar_wh:.1f} Wh/dag "
                    f"selv i svakeste måned (forbruk: {daily_wh:.1f} Wh/dag)."
                ),
                suggestion="Ingen endring nødvendig.",
            ))

    # ── Battery check ────────────────────────────────────────────────────
    battery_ah = config.operations.battery_bank_ah
    voltage = config.battery.voltage_v
    dod = config.battery.max_dod
    if battery_ah and voltage and daily_wh > 0:
        usable_wh = battery_ah * voltage * dod
        autonomy_days = usable_wh / (daily_wh / 1000 * 1000)  # keep in Wh

        if autonomy_days < 14:
            recommendations.append(AnalysisRecommendation(
                category="battery",
                severity="critical",
                title="Batterikapasitet gir kort autonomi",
                description=(
                    f"{battery_ah} Ah @ {voltage}V ({dod*100:.0f}% DoD) = "
                    f"{autonomy_days:.1f} dagers autonomi."
                ),
                suggestion=f"Vurder å øke til minst {daily_wh * 14 / (voltage * dod):.0f} Ah.",
            ))
        else:
            recommendations.append(AnalysisRecommendation(
                category="battery",
                severity="info",
                title="Batterikapasitet tilfredsstiller autonomikrav",
                description=f"Beregnet autonomi: {autonomy_days:.1f} dager.",
                suggestion="Ingen endring nødvendig.",
            ))

    # ── Communication ────────────────────────────────────────────────────
    if comm_recommendation == "Satellite modem":
        recommendations.append(AnalysisRecommendation(
            category="communication",
            severity="warning",
            title="Satellittkommunikasjon anbefalt",
            description=(
                "Ingen 4G, NB-IoT eller siktlinje tilgjengelig. "
                "Satellitt har høyere driftskostnad og strømforbruk."
            ),
            suggestion="Verifiser at strømbudsjettet inkluderer satellittmodem.",
        ))

    # ── Facility-specific ────────────────────────────────────────────────
    if config.facility.sediment_or_surge:
        recommendations.append(AnalysisRecommendation(
            category="measurement",
            severity="warning",
            title="Sediment/surge påvirker sensorvalg",
            description="Boblerør anbefales over trykkcelle ved sediment/surge-problemer.",
            suggestion="Velg boblerør (bubble tube) som vannstandssensor.",
        ))

    if config.facility.ice_problems:
        recommendations.append(AnalysisRecommendation(
            category="measurement",
            severity="warning",
            title="Istilpasning nødvendig",
            description="Is ved målestedet påvirker måleprofil og sensorvalg.",
            suggestion="Vurder oppvarmet sensor eller radar/ultralyd.",
        ))

    summary = (
        f"Analysen dekker {len(config.power_budget)} enheter med "
        f"totalt daglig forbruk på {daily_wh:.1f} Wh/dag. "
        f"Anbefalt kommunikasjon: {comm_recommendation}. "
        f"Sekundærkilde: {secondary_source}. "
        f"{len(recommendations)} anbefalinger generert."
    )

    return AnalyzeResponse(
        summary=summary,
        recommendations=recommendations,
        recommended_config=recommended,
        daily_energy_wh=daily_wh,
        cached=False,
    )
