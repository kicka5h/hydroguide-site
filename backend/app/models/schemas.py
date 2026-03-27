"""Pydantic schemas for API request/response models.

Field names and structure match the Solar_calculator.xlsx spreadsheet
so that imported configs map 1:1 to the schema.
"""

from datetime import datetime

from pydantic import BaseModel, Field


# ── 1. Local Conditions – Communication (Input rows 4–8) ────────────────────

class CommunicationParams(BaseModel):
    has_4g_coverage: bool | None = Field(None, description="4G coverage at location?")
    has_nbiot_coverage: bool | None = Field(None, description="NB-IoT coverage at location?")
    has_line_of_sight: bool | None = Field(
        None, description="Line of sight < 15 km to base station?"
    )
    requires_two_way_control: bool | None = Field(
        None, description="Two-way control required (remote-controlled valve)?"
    )


# ── 2. Facility Type & Release Method (Input rows 9–17) ─────────────────────

class FacilityParams(BaseModel):
    release_method: str = Field(
        "", description="Release method/arrangement (e.g. 'Pipe via intake')"
    )
    has_fish_passage: bool | None = Field(None, description="Fish passage at intake?")
    minimum_flow_ls: float | None = Field(
        None, ge=0, description="Required minimum flow (l/s)"
    )
    low_conductivity: bool | None = Field(
        None, description="Low conductivity in water?"
    )
    ice_problems: bool | None = Field(
        None, description="Ice problems at measurement site?"
    )
    difficult_access: bool | None = Field(
        None, description="Difficult access to intake?"
    )
    linear_flow: bool | None = Field(
        None, description="Linear flow at intended measurement site?"
    )
    sediment_or_surge: bool | None = Field(
        None, description="Sediment or surge problem?"
    )


# ── 3. Operations – Inspections & Autonomy (Input rows 18–21) ───────────────

class OperationsParams(BaseModel):
    inspections_per_year: int | None = Field(
        None, ge=1, description="Number of inspections/visits per year"
    )
    battery_bank_ah: float | None = Field(
        None, ge=0, description="Battery bank size (Ah)"
    )
    zero_emission_desired: bool | None = Field(
        None, description="Desired zero-emission (methanol)?"
    )


# ── Technical Parameters – Solar (Input rows 29–34) ─────────────────────────

class SolarParams(BaseModel):
    panel_wattage_wp: float | None = Field(None, ge=0, description="PV panel power (Wp)")
    panel_count: int = Field(1, ge=1, description="Number of panels")
    system_efficiency: float = Field(
        0.8, ge=0, le=1, description="System efficiency as factor (0–1)"
    )
    lifespan_years: int = Field(25, ge=1, description="Expected lifespan in years")


# ── Technical Parameters – Battery Bank (Input rows 36–40) ──────────────────

class BatteryParams(BaseModel):
    voltage_v: float = Field(12.8, ge=0, description="Nominal voltage (V)")
    max_dod: float = Field(
        0.8, ge=0, le=1, description="Max depth of discharge as factor (0–1)"
    )
    cycle_lifespan: int = Field(6000, ge=0, description="Cycle lifespan")


# ── Technical Parameters – Fuel Cell (Input rows 42–49) ─────────────────────

class FuelCellParams(BaseModel):
    purchase_cost_kr: float | None = Field(None, ge=0, description="Purchase cost (kr)")
    power_w: float | None = Field(None, ge=0, description="Nominal power (W)")
    fuel_consumption_l_kwh: float | None = Field(
        None, ge=0, description="Fuel consumption (l/kWh)"
    )
    fuel_price_kr_l: float | None = Field(
        None, ge=0, description="Fuel price methanol (kr/l)"
    )
    lifespan_hours: int | None = Field(
        None, ge=0, description="Expected lifespan (hours)"
    )
    annual_maintenance_kr: float | None = Field(
        None, ge=0, description="Annual maintenance cost (kr)"
    )


# ── Technical Parameters – Diesel Generator (Input rows 50–57) ──────────────

class DieselGeneratorParams(BaseModel):
    purchase_cost_kr: float | None = Field(None, ge=0, description="Purchase cost (kr)")
    power_w: float | None = Field(None, ge=0, description="Nominal power (W)")
    fuel_consumption_l_kwh: float | None = Field(
        None, ge=0, description="Fuel consumption (l/kWh)"
    )
    fuel_price_kr_l: float | None = Field(
        None, ge=0, description="Fuel price diesel (kr/l)"
    )
    lifespan_hours: int | None = Field(
        None, ge=0, description="Expected lifespan (hours)"
    )
    annual_maintenance_kr: float | None = Field(
        None, ge=0, description="Annual maintenance cost (kr/yr)"
    )


# ── Other Settings (Input rows 58–62) ───────────────────────────────────────

class OtherSettings(BaseModel):
    co2_factor_methanol: float = Field(
        1.088, description="CO₂ factor methanol (kg CO₂/l)"
    )
    co2_factor_diesel: float = Field(
        2.68, description="CO₂ factor diesel (kg CO₂/l)"
    )
    assessment_horizon_years: int = Field(
        10, ge=1, description="Assessment horizon (years) for TCO comparison"
    )


# ── Monthly Solar Irradiation (Input rows 64–77) ────────────────────────────

class MonthlyIrradiation(BaseModel):
    """Monthly solar irradiation values in kWh/m²."""
    jan: float = 0
    feb: float = 0
    mar: float = 0
    apr: float = 0
    may: float = 0
    jun: float = 0
    jul: float = 0
    aug: float = 0
    sep: float = 0
    oct: float = 0
    nov: float = 0
    dec: float = 0

    def as_list(self) -> list[float]:
        """Return monthly values as a 12-element list (Jan–Dec)."""
        return [
            self.jan, self.feb, self.mar, self.apr, self.may, self.jun,
            self.jul, self.aug, self.sep, self.oct, self.nov, self.dec,
        ]


# ── Power Budget (Power Budget sheet) ───────────────────────────────────────

class PowerBudgetItem(BaseModel):
    enabled: bool = Field(True, description="ON/OFF toggle")
    name: str = Field("", description="Equipment/unit name")
    power_w: float = Field(0, ge=0, description="Power draw (W)")
    consumption_wh_day: float = Field(0, ge=0, description="Daily consumption (Wh/day)")
    consumption_ah_day: float = Field(0, ge=0, description="Daily current (Ah/day)")
    consumption_wh_week: float = Field(0, ge=0, description="Weekly consumption (Wh/week)")
    consumption_ah_week: float = Field(0, ge=0, description="Weekly current (Ah/week)")


# ── Full Configuration ───────────────────────────────────────────────────────

class HydroConfigData(BaseModel):
    """The complete hydropower station configuration.

    Mirrors the Solar_calculator.xlsx Input + Power Budget sheets.
    """
    # Questionnaire (Input sheet sections 1–3)
    communication: CommunicationParams = Field(default_factory=lambda: CommunicationParams())  # type: ignore[arg-type]
    facility: FacilityParams = Field(default_factory=lambda: FacilityParams())  # type: ignore[arg-type]
    operations: OperationsParams = Field(default_factory=lambda: OperationsParams())  # type: ignore[arg-type]

    # Technical parameters (Input sheet rows 27+)
    solar: SolarParams = Field(default_factory=lambda: SolarParams())  # type: ignore[arg-type]
    battery: BatteryParams = Field(default_factory=lambda: BatteryParams())  # type: ignore[arg-type]
    fuel_cell: FuelCellParams = Field(default_factory=lambda: FuelCellParams())  # type: ignore[arg-type]
    diesel_generator: DieselGeneratorParams = Field(
        default_factory=lambda: DieselGeneratorParams()  # type: ignore[call-arg]
    )
    other_settings: OtherSettings = Field(default_factory=lambda: OtherSettings())  # type: ignore[arg-type]
    monthly_irradiation: MonthlyIrradiation = Field(  # type: ignore[arg-type]
        default_factory=lambda: MonthlyIrradiation()
    )

    # Power budget (Power Budget sheet)
    power_budget: list[PowerBudgetItem] = Field(default_factory=list)


# ── Energy Balance Result (Results sheet rows 25–39) ────────────────────────

class MonthlyEnergyBalance(BaseModel):
    month: str
    days: int
    solar_production_kwh: float
    energy_balance_kwh: float
    generator_hours: float = 0
    fuel_liters: float = 0
    fuel_cost_kr: float = 0


class EnergyBalanceResult(BaseModel):
    monthly: list[MonthlyEnergyBalance]
    total_solar_production_kwh: float
    total_energy_balance_kwh: float
    total_generator_hours: float
    total_fuel_liters: float
    total_fuel_cost_kr: float


# ── TCO Result (Results sheet rows 41–47) ───────────────────────────────────

class TcoComparison(BaseModel):
    fuel_cell_purchase_kr: float = 0
    fuel_cell_operating_kr_yr: float = 0
    fuel_cell_maintenance_kr_yr: float = 0
    fuel_cell_tco_kr: float = 0
    diesel_purchase_kr: float = 0
    diesel_operating_kr_yr: float = 0
    diesel_maintenance_kr_yr: float = 0
    diesel_tco_kr: float = 0
    assessment_horizon_years: int = 10
    recommended_source: str = ""  # "fuel_cell" or "diesel"


# ── Recommended Configuration (Results sheet rows 3–15) ─────────────────────

class RecommendedConfig(BaseModel):
    measurement_method: str = ""
    communication: str = ""
    logger_recommendation: str = ""
    energy_monitoring: str = ""
    secondary_source: str = ""
    secondary_source_power_w: float | None = None
    solar_panel_count: int | None = None
    battery_ah: float | None = None
    fuel_consumption_l_yr: float | None = None
    ice_adaptation: str = ""
    operational_requirements: str = ""


# ── API Request / Response Models ────────────────────────────────────────────

class ConfigCreate(BaseModel):
    name: str = "Untitled Configuration"
    data: HydroConfigData = Field(default_factory=HydroConfigData)


class ConfigUpdate(BaseModel):
    name: str | None = None
    data: HydroConfigData | None = None


class ConfigResponse(BaseModel):
    id: str
    name: str
    data: HydroConfigData
    created_at: datetime
    updated_at: datetime


class ConfigListItem(BaseModel):
    id: str
    name: str
    created_at: datetime
    updated_at: datetime


class AnalyzeRequest(BaseModel):
    config: HydroConfigData


class AnalysisRecommendation(BaseModel):
    category: str  # "solar", "battery", "communication", "measurement", "risk"
    severity: str  # "info", "warning", "critical"
    title: str
    description: str
    suggestion: str


class AnalyzeResponse(BaseModel):
    summary: str
    recommendations: list[AnalysisRecommendation]
    recommended_config: RecommendedConfig | None = None
    energy_balance: EnergyBalanceResult | None = None
    tco: TcoComparison | None = None
    daily_energy_wh: float | None = None
    cached: bool = False


class ExcelImportResponse(BaseModel):
    """Response from importing an Excel file."""
    config: HydroConfigData
    energy_balance: EnergyBalanceResult | None = None
    recommended_config: RecommendedConfig | None = None
    tco: TcoComparison | None = None
    validation_notes: list[str] = Field(default_factory=list)


class HealthResponse(BaseModel):
    status: str
    service: str
    version: str
