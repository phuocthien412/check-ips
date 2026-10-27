from typing import Optional
from datetime import datetime, timezone, timedelta
from pydantic import BaseModel
from fastapi import APIRouter, Header, HTTPException, Query, status
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

@router.get("/uptime-history")
async def get_uptime_history(
    site_code: Optional[str] = Query("ALL", description="Site code hoặc ALL"),
    time_range: Optional[str] = Query("24h", alias="range", description="24h hoặc 7d")
):
    """
    Returns real uptime time-series points for the requested time range (24h or 7d)
    aggregated across status_logs and current telemetry state.
    """
    db = get_database()
    now = datetime.now(timezone.utc)

    # Determine interval & slots
    if time_range == "7d":
        num_slots = 7
        slot_delta = timedelta(days=1)
        start_time = now - timedelta(days=7)
    else:  # 24h
        num_slots = 12
        slot_delta = timedelta(hours=2)
        start_time = now - timedelta(hours=24)

    data_points = []

    # Query base device counts for baseline
    site_filter = {} if site_code == "ALL" else {"site_code": site_code}
    total_devices = await db.devices.count_documents(site_filter) if db is not None else 0
    
    # Check if agent for this site is currently online & get actual site stats
    current_agent_online = True
    cached_stats = {"total": 0, "online": 0, "slow": 0, "offline": 0}

    if site_code != "ALL" and db is not None:
        site_doc = await db.sites.find_one({"site_code": site_code})
        if site_doc:
            if site_doc.get("agent_status") == "offline":
                current_agent_online = False
            cached_stats = site_doc.get("device_stats", cached_stats)
    elif site_code == "ALL" and db is not None:
        all_sites = await db.sites.find().to_list(100)
        online_agents = sum(1 for s in all_sites if s.get("agent_status") == "online")
        if online_agents == 0:
            current_agent_online = False
        for s in all_sites:
            s_stats = s.get("device_stats", {})
            cached_stats["total"] += s_stats.get("total", 0)
            cached_stats["online"] += s_stats.get("online", 0)
            cached_stats["slow"] += s_stats.get("slow", 0)
            cached_stats["offline"] += s_stats.get("offline", 0)

    if total_devices == 0:
        total_devices = cached_stats.get("total", 0)

    VN_TZ = timezone(timedelta(hours=7))

    for i in range(num_slots):
        slot_start = start_time + i * slot_delta
        slot_end = slot_start + slot_delta
        slot_end_vn = slot_end.astimezone(VN_TZ)

        if time_range == "7d":
            label = slot_end_vn.strftime("%d/%m")
        else:
            label = slot_end_vn.strftime("%H:%M")

        slot_query = {
            "timestamp": {"$gte": slot_start, "$lt": slot_end}
        }
        if site_code != "ALL":
            slot_query["site_code"] = site_code

        logs_count = await db.status_logs.count_documents(slot_query) if db is not None else 0

        if logs_count > 0:
            pipeline = [
                {"$match": slot_query},
                {
                    "$group": {
                        "_id": None,
                        "online": {"$sum": {"$cond": [{"$eq": ["$status", "online"]}, 1, 0]}},
                        "slow": {"$sum": {"$cond": [{"$eq": ["$status", "slow"]}, 1, 0]}},
                        "offline": {"$sum": {"$cond": [{"$eq": ["$status", "offline"]}, 1, 0]}},
                        "total": {"$sum": 1},
                        "avg_latency": {"$avg": "$response_time_ms"}
                    }
                }
            ]
            agg = await db.status_logs.aggregate(pipeline).to_list(1)
            if agg:
                rec = agg[0]
                tot = rec["total"] or 1
                on = rec["online"]
                sl = rec["slow"]
                off = rec["offline"]
                uptime_val = round(((on + sl) / tot) * 100, 1)
                avg_lat = round(rec["avg_latency"] or 0, 1) if rec["avg_latency"] is not None else None
            else:
                uptime_val = 100.0 if current_agent_online else 0.0
                on, sl, off = (total_devices, 0, 0) if current_agent_online else (0, 0, total_devices)
                avg_lat = 0.0 if current_agent_online else None
        else:
            # Real fallback: when no logs in time window, reflect real Agent & device status
            if not current_agent_online:
                # Agent is Down (power outage or script terminated) -> 0.0% uptime
                uptime_val = 0.0
                on = 0
                sl = 0
                off = total_devices
                avg_lat = None
            else:
                # Agent is Online
                if total_devices > 0:
                    on = cached_stats.get("online", 0)
                    sl = cached_stats.get("slow", 0)
                    off = cached_stats.get("offline", 0)
                    uptime_val = round(((on + sl) / total_devices) * 100, 1)
                else:
                    on = 0
                    sl = 0
                    off = 0
                    uptime_val = 100.0
                avg_lat = None

        data_points.append({
            "time": label,
            "timestamp": slot_end.isoformat(),
            "uptime_pct": uptime_val,
            "online": on,
            "slow": sl,
            "offline": off,
            "avg_latency_ms": avg_lat
        })

    overall_avg = round(sum(d["uptime_pct"] for d in data_points) / len(data_points), 1) if data_points else 0.0

    return {
        "range": time_range,
        "site_code": site_code,
        "overall_uptime_pct": overall_avg,
        "data_points": data_points
    }

WAN_TEST_IPS = {"1.1.1.1", "1.0.0.1", "8.8.8.8", "8.8.4.4", "208.67.222.222", "208.67.220.220"}

@router.get("/longest-downtime")
async def get_longest_downtime(
    site_code: Optional[str] = Query("ALL", description="Site code hoặc ALL"),
    limit: int = Query(5, description="Số lượng sự cố trả về")
):
    """
    Returns devices or site agents with the longest unresolved downtime.
    Helps IT prioritize critical outages. Filters out WAN public DNS probes.
    """
    db = get_database()
    now = datetime.now(timezone.utc)
    if db is None:
        return []

    results = []

    # 1. Check offline devices (Excluding WAN public probes like 1.1.1.1, 8.8.8.8)
    dev_query: dict = {
        "status": "offline",
        "ip": {"$nin": list(WAN_TEST_IPS)}
    }
    if site_code != "ALL":
        dev_query["site_code"] = site_code

    cursor = db.devices.find(dev_query)
    sites_cursor = db.sites.find({}, {"site_code": 1, "site_name": 1, "agent_status": 1, "last_heartbeat": 1})
    sites_map = {s["site_code"]: s async for s in sites_cursor}

    async for dev in cursor:
        site_obj = sites_map.get(dev.get("site_code"), {})
        down_time = dev.get("last_seen") or site_obj.get("last_heartbeat") or (now - timedelta(hours=2))
        if isinstance(down_time, str):
            try:
                down_time = datetime.fromisoformat(down_time.replace("Z", "+00:00"))
            except Exception:
                down_time = now - timedelta(hours=2)
        if down_time.tzinfo is None:
            down_time = down_time.replace(tzinfo=timezone.utc)

        duration_sec = max(0, int((now - down_time).total_seconds()))
        hours = duration_sec // 3600
        mins = (duration_sec % 3600) // 60
        duration_str = f"{hours}h {mins}m" if hours > 0 else f"{mins}m"

        results.append({
            "device": dev.get("hostname") or f"Host-{dev.get('ip')}",
            "ip": dev.get("ip"),
            "site_code": dev.get("site_code"),
            "site_name": site_obj.get("site_name", dev.get("site_code")),
            "down_since": down_time.astimezone(timezone(timedelta(hours=7))).strftime("%H:%M"),
            "duration_seconds": duration_sec,
            "duration_str": duration_str,
            "status": "down" if site_obj.get("agent_status") == "offline" else "offline"
        })

    # 2. If no devices or some sites have agent down, add agent outages
    sites_filter = sites_map.values() if site_code == "ALL" else [sites_map.get(site_code)]
    for s in sites_filter:
        if s and s.get("agent_status") == "offline":
            has_dev = any(r["site_code"] == s["site_code"] for r in results)
            if not has_dev:
                down_time = s.get("last_heartbeat") or (now - timedelta(hours=3))
                if isinstance(down_time, str):
                    try:
                        down_time = datetime.fromisoformat(down_time.replace("Z", "+00:00"))
                    except Exception:
                        down_time = now - timedelta(hours=3)
                if down_time.tzinfo is None:
                    down_time = down_time.replace(tzinfo=timezone.utc)

                duration_sec = max(0, int((now - down_time).total_seconds()))
                hours = duration_sec // 3600
                mins = (duration_sec % 3600) // 60
                duration_str = f"{hours}h {mins}m" if hours > 0 else f"{mins}m"

                results.append({
                    "device": f"Agent {s.get('site_name')}",
                    "ip": "Agent Power Off",
                    "site_code": s.get("site_code"),
                    "site_name": s.get("site_name"),
                    "down_since": down_time.astimezone(timezone(timedelta(hours=7))).strftime("%H:%M"),
                    "duration_seconds": duration_sec,
                    "duration_str": duration_str,
                    "status": "down"
                })

    # Sort descending by duration
    results.sort(key=lambda x: x["duration_seconds"], reverse=True)
    top_results = results[:limit]

    # Calculate trend %
    max_duration = top_results[0]["duration_seconds"] if top_results else 1
    for r in top_results:
        r["trend_pct"] = max(15, round((r["duration_seconds"] / max(max_duration, 1)) * 100))

    return top_results

@router.get("/flapping-devices")
async def get_flapping_devices(
    site_code: Optional[str] = Query("ALL", description="Site code hoặc ALL"),
    limit: int = Query(5, description="Số lượng thiết bị trả về")
):
    """
    Returns devices frequently toggling Online <-> Offline within the last 1-2 hours.
    Useful for identifying unstable network drops, faulty cabling, or interference.
    """
    db = get_database()
    now = datetime.now(timezone.utc)
    if db is None:
        return []

    results = []
    # Check status transitions in status_logs for the last 2 hours
    cutoff = now - timedelta(hours=2)
    query: dict = {"timestamp": {"$gte": cutoff}}
    if site_code != "ALL":
        query["site_code"] = site_code

    pipeline = [
        {"$match": query},
        {"$sort": {"timestamp": 1}},
        {
            "$group": {
                "_id": {"site_code": "$site_code", "device_ip": "$device_ip"},
                "statuses": {"$push": "$status"},
                "count": {"$sum": 1}
            }
        }
    ]

    agg = await db.status_logs.aggregate(pipeline).to_list(100)
    sites_cursor = db.sites.find({}, {"site_code": 1, "site_name": 1})
    sites_map = {s["site_code"]: s.get("site_name", s["site_code"]) async for s in sites_cursor}

    for item in agg:
        statuses = item.get("statuses", [])
        flaps = 0
        for i in range(1, len(statuses)):
            if statuses[i] != statuses[i - 1]:
                flaps += 1

        if flaps >= 2:
            ip = item["_id"]["device_ip"]
            # Exclude WAN public probes (1.1.1.1, 8.8.8.8, etc.) from factory flap list
            if ip in WAN_TEST_IPS:
                continue
            scode = item["_id"]["site_code"]
            dev = await db.devices.find_one({"site_code": scode, "ip": ip}, {"hostname": 1, "status": 1})
            curr_status = dev.get("status", "unknown") if dev else statuses[-1]
            results.append({
                "device": (dev.get("hostname") if dev else None) or f"Host-{ip}",
                "ip": ip,
                "site_code": scode,
                "site_name": sites_map.get(scode, scode),
                "flap_count": flaps,
                "flap_rate_str": f"{flaps}x / 1h",
                "current_status": curr_status,
                "trend_pct": min(100, flaps * 20),
            })

    results.sort(key=lambda x: x["flap_count"], reverse=True)
    return results[:limit]



