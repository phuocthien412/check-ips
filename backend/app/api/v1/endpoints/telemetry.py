from typing import Optional
from datetime import datetime, timezone
from pydantic import BaseModel
from fastapi import APIRouter, Header, HTTPException, status
from app.schemas.telemetry import TelemetryPayload, TelemetryIngestResponse
from app.services.telemetry_service import process_telemetry
from app.core.config import settings
from app.core.database import get_database
from app.services.connection_manager import manager

router = APIRouter()

class AgentOfflineRequest(BaseModel):
    site_code: str
    message: Optional[str] = "Agent stopped"

@router.post("/ingest", response_model=TelemetryIngestResponse)
async def ingest_telemetry(
    payload: TelemetryPayload,
    authorization: str = Header(None, description="Bearer <API_SECRET_KEY>")
):
    """
    Ingest endpoint called by Site Agents every 30-60 seconds.
    Authenticates with token and triggers state reconciliation.
    """
    # Simple token validation (Bearer token)
    expected_token = f"Bearer {settings.SECRET_KEY}"
    if authorization and authorization != expected_token and settings.ENVIRONMENT == "production":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or missing Authorization Token"
        )

    response = await process_telemetry(payload)
    return response

@router.post("/offline")
async def agent_offline(payload: AgentOfflineRequest):
    """
    Called by Site Agent on shutdown or Ctrl+C to immediately transition to offline.
    """
    db = get_database()
    now = datetime.now(timezone.utc)
    if db is not None:
        total_devs = await db.devices.count_documents({"site_code": payload.site_code})
        await db.sites.update_one(
            {"site_code": payload.site_code},
            {
                "$set": {
                    "agent_status": "offline",
                    "device_stats": {
                        "total": total_devs,
                        "online": 0,
                        "slow": 0,
                        "offline": total_devs
                    }
                }
            }
        )
        await db.devices.update_many(
            {"site_code": payload.site_code},
            {
                "$set": {
                    "status": "offline",
                    "response_time_ms": None
                }
            }
        )
        await manager.broadcast("AGENT_OFFLINE", {
            "site_code": payload.site_code,
            "status": "offline",
            "timestamp": now.isoformat()
        })
    return {"status": "success", "message": f"Site {payload.site_code} marked offline"}

