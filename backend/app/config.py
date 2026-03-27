from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # Database
    database_url: str = "sqlite+aiosqlite:///./data/hydroguide.db"

    # CORS
    cors_origins: str = "http://localhost:5173,http://localhost:3000"

    # Session
    session_cookie_name: str = "hydroguide_session"
    session_max_age_days: int = 365

    # API auth
    api_bearer_token: str = "changeme-generate-a-real-token"

    # AI service
    ai_api_key: str = ""
    ai_model: str = ""

    # Server
    host: str = "0.0.0.0"
    port: int = 8000
    debug: bool = True

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    @property
    def database_path(self) -> Path:
        """Extract the file path from the SQLite URL."""
        path_str = self.database_url.replace("sqlite+aiosqlite:///", "")
        return Path(path_str)


settings = Settings()
