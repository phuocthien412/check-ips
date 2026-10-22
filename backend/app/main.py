import asyncio
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.core.database import connect_to_mongo, close_mongo_connection, get_database
from app.services.watchdog import run_heartbeat_watchdog
from app.api.v1.router import api_router

logger = logging.getLogger("uvicorn.error")

async def reconcile_offline_sites():
    """Ensure devices of offline sites are marked offline upon startup"""
    db = get_database()
    if db is None:
        return
    try:
        sites = await db.sites.find({"agent_status": "offline"}).to_list(100)
        for s in sites:
            code = s["site_code"]
            total = await db.devices.count_documents({"site_code": code})
            await db.sites.update_one(
                {"site_code": code},
                {"$set": {"device_stats": {"total": total, "online": 0, "slow": 0, "offline": total}}}
            )
            await db.devices.update_many(
                {"site_code": code},
                {"$set": {"status": "offline", "response_time_ms": None}}
            )
    except Exception as e:
        logger.warning(f"Offline reconciliation warning: {e}")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Connect to MongoDB and start heartbeat watchdog
    logger.info("Initializing %s...", settings.PROJECT_NAME)
    await connect_to_mongo()
    asyncio.create_task(reconcile_offline_sites())
    watchdog_task = asyncio.create_task(run_heartbeat_watchdog())
    yield
    # Shutdown: Cancel watchdog and close DB
    logger.info("Shutting down %s...", settings.PROJECT_NAME)
    watchdog_task.cancel()
    try:
        await watchdog_task
    except asyncio.CancelledError:
        pass
    await close_mongo_connection()

app = FastAPI(
    title=settings.PROJECT_NAME,
    version="1.0.0",
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    docs_url=f"{settings.API_V1_STR}/docs",
    redoc_url=f"{settings.API_V1_STR}/redoc",
    lifespan=lifespan
)

# Setup CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS if isinstance(settings.CORS_ORIGINS, list) else ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Health checks
@app.get("/health", tags=["Health"])
@app.get(f"{settings.API_V1_STR}/health", tags=["Health"])
async def health_check():
    return {
        "status": "healthy",
        "app": settings.PROJECT_NAME,
        "environment": settings.ENVIRONMENT
    }

# Mount v1 routes
app.include_router(api_router, prefix=settings.API_V1_STR)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
