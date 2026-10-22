import asyncio
import logging
from datetime import datetime, timezone, timedelta
from app.core.config import settings
from app.core.database import get_database
from app.services.connection_manager import manager

logger = logging.getLogger("uvicorn.error")

async def run_heartbeat_watchdog():
    """Runs continuously in the background to detect disconnected site agents"""
    logger.info("Heartbeat watchdog task started.")
    while True:
        try:
            await asyncio.sleep(settings.WATCHDOG_INTERVAL_SECONDS)
            db = get_database()
            if db is None:
                continue

            now = datetime.now(timezone.utc)
            timeout_threshold = now - timedelta(seconds=settings.AGENT_TIMEOUT_SECONDS)

            # Find sites that were online but haven't sent heartbeat within timeout threshold
            stale_sites = db.sites.find({
                "agent_status": "online",
                "last_heartbeat": {"$lt": timeout_threshold}
            })

            async for site in stale_sites:
                site_code = site["site_code"]
                logger.warning(f"Watchdog: Site Agent {site_code} timed out! Marking offline.")
                
                # Count total devices for this site
                total_devs = await db.devices.count_documents({"site_code": site_code})

                # Update site status and reset device_stats so online is 0
                await db.sites.update_one(
                    {"site_code": site_code},
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

                # Mark all devices of this site as offline
                await db.devices.update_many(
                    {"site_code": site_code},
                    {
                        "$set": {
                            "status": "offline",
                            "response_time_ms": None
                        }
                    }
                )

                # Insert alert
                await db.alerts.insert_one({
                    "site_code": site_code,
                    "level": "critical",
                    "event_type": "AGENT_DISCONNECTED",
                    "message": f"Site Agent tại {site.get('site_name', site_code)} không phản hồi quá {settings.AGENT_TIMEOUT_SECONDS}s!",
                    "acknowledged": False,
                    "created_at": now,
                    "resolved_at": None
                })

                # Broadcast to UI
                await manager.broadcast("AGENT_OFFLINE", {
                    "site_code": site_code,
                    "site_name": site.get("site_name", site_code),
                    "last_heartbeat": site.get("last_heartbeat")
                })
        except asyncio.CancelledError:
            logger.info("Heartbeat watchdog task stopped.")
            break
        except Exception as e:
            logger.error(f"Error in watchdog loop: {e}")
