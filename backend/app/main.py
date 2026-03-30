from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from app.config import settings
from app.db import async_session_factory, engine
from app.middleware.session import SessionMiddleware
from app.models.database import Base
from app.routers import analyze, config_router, health

STATIC_DIR = Path(__file__).parent.parent / "static"


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Ensure the data directory exists for SQLite
    db_path = settings.database_path
    Path(db_path).parent.mkdir(parents=True, exist_ok=True)

    # Create all tables
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    # Store session factory on app state so middleware can access it
    app.state.async_session_factory = async_session_factory

    yield

    # Cleanup
    await engine.dispose()


app = FastAPI(
    title="HydroGuide API",
    description="API for hydropower station dimensioning and analysis",
    version="0.1.0",
    lifespan=lifespan,
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Anonymous session tracking
app.add_middleware(SessionMiddleware)

# Routers
app.include_router(health.router)
app.include_router(config_router.router)
app.include_router(analyze.router)

# Serve built frontend (only if static dir exists, i.e. Docker build)
if STATIC_DIR.is_dir():
    app.mount("/assets", StaticFiles(directory=STATIC_DIR / "assets"), name="assets")

    @app.get("/")
    @app.get("/{path:path}")
    async def serve_spa(request: Request, path: str = ""):
        """Serve static files or fall back to index.html for SPA routing."""
        file_path = STATIC_DIR / path
        if file_path.is_file():
            return FileResponse(file_path)
        return FileResponse(STATIC_DIR / "index.html")
