import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Text, func
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


class Base(DeclarativeBase):
    pass


class UserSession(Base):
    """Anonymous browser session, identified by a cookie UUID."""

    __tablename__ = "sessions"

    id: Mapped[str] = mapped_column(
        primary_key=True, default=lambda: str(uuid.uuid4())
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    last_seen_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    configs: Mapped[list["HydroConfig"]] = relationship(
        back_populates="session", cascade="all, delete-orphan"
    )


class HydroConfig(Base):
    """A saved hydropower station configuration."""

    __tablename__ = "configs"

    id: Mapped[str] = mapped_column(
        primary_key=True, default=lambda: str(uuid.uuid4())
    )
    session_id: Mapped[str] = mapped_column(ForeignKey("sessions.id"), index=True)
    name: Mapped[str] = mapped_column(default="Untitled Configuration")
    data: Mapped[str] = mapped_column(Text, default="{}")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    session: Mapped["UserSession"] = relationship(back_populates="configs")
    analysis_results: Mapped[list["AnalysisResult"]] = relationship(
        back_populates="config", cascade="all, delete-orphan"
    )


class AnalysisResult(Base):
    """Cached AI analysis result for a specific configuration."""

    __tablename__ = "analysis_results"

    id: Mapped[str] = mapped_column(
        primary_key=True, default=lambda: str(uuid.uuid4())
    )
    config_id: Mapped[str] = mapped_column(ForeignKey("configs.id"), index=True)
    config_hash: Mapped[str] = mapped_column(
        index=True, doc="Hash of the config data to detect changes"
    )
    result: Mapped[str] = mapped_column(Text, default="{}")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    config: Mapped["HydroConfig"] = relationship(back_populates="analysis_results")
