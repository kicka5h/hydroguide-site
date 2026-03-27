from fastapi import APIRouter

router = APIRouter(tags=["health"])


@router.get("/api/v1/health")
async def health_check():
    return {"status": "ok", "service": "hydroguide-api", "version": "0.1.0"}
