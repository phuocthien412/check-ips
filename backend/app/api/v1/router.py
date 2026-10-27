from fastapi import APIRouter
from app.api.v1.endpoints import telemetry, sites, devices, alerts, stream, auth

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["Authentication"])
api_router.include_router(telemetry.router, prefix="/telemetry", tags=["Telemetry"])
api_router.include_router(sites.router, prefix="/sites", tags=["Sites"])
api_router.include_router(devices.router, prefix="/devices", tags=["Devices"])
api_router.include_router(alerts.router, prefix="/alerts", tags=["Alerts"])
api_router.include_router(stream.router, prefix="/stream", tags=["Real-time Stream"])
