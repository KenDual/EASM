from fastapi import APIRouter
from datetime import datetime, timezone
from app.services.asset_service import AssetService

router = APIRouter(tags=["health"])

# get start time
_start_time = datetime.now(timezone.utc)

def make_router(service: AssetService) -> APIRouter:
    @router.get("/health")
    def health_check():
        now = datetime.now(timezone.utc)
        uptime = int((now - _start_time).total_seconds())
        return {
            "status": "ok",
            "storage": {
                "type": "in-memory",
                "asset_count": service.storage_count(),
            },
            "uptime_seconds": uptime,
            "timestamp": now.isoformat(),
        }

    return router
