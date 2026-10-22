import logging
from datetime import datetime, timezone
from typing import List, Dict, Any
from pymongo import UpdateOne
from app.core.database import get_database
from app.schemas.telemetry import TelemetryPayload, TelemetryIngestResponse
from app.services.connection_manager import manager

logger = logging.getLogger("uvicorn.error")

async def process_telemetry(payload: TelemetryPayload) -> TelemetryIngestResponse:
    db = get_database()
    now = datetime.now(timezone.utc)
    site_code = payload.site_code

    if db is None:
        logger.warning("Database not connected, skipping persistent write.")
        return TelemetryIngestResponse(
            site_code=site_code,
            processed_devices=len(payload.devices),
            new_devices_count=0,
            online_count=len([d for d in payload.devices if d.status == "online"]),
            offline_count=len([d for d in payload.devices if d.status == "offline"]),
            message="Database unavailable (dry run)"
        )

    # 1. Fetch current devices in this site to detect new vs existing
    existing_devices_cursor = db.devices.find({"site_code": site_code}, {"ip": 1, "status": 1, "_id": 0})
    existing_ips = {doc["ip"] async for doc in existing_devices_cursor}

    bulk_device_ops = []
    bulk_status_logs = []
    new_devices_count = 0
    online_count = 0
    slow_count = 0
    offline_count = 0
    reported_ips = set()

    for item in payload.devices:
        ip = item.ip
        reported_ips.add(ip)
        
        # Classify status: slow if ping latency >= 100ms (as defined in SABIBECO_10.ps1: $LatencyAlertMs = 100)
        is_responsive = (item.status in ["online", "slow"])
        effective_status = item.status
        if is_responsive:
            if item.response_time_ms is not None and item.response_time_ms >= 100:
                effective_status = "slow"
                slow_count += 1
            else:
                effective_status = "online"
                online_count += 1
        else:
            effective_status = "offline"
            offline_count += 1

        is_new = ip not in existing_ips
        if is_new:
            new_devices_count += 1
            # Create alert for new device
            await db.alerts.insert_one({
                "site_code": site_code,
                "device_ip": ip,
                "level": "info",
                "event_type": "NEW_DEVICE_DETECTED",
                "message": f"Phát hiện thiết bị mới tại {site_code}: IP {ip} ({item.hostname or item.vendor or 'Unknown'})",
                "acknowledged": False,
                "created_at": now,
                "resolved_at": None
            })

        # Upsert device in MongoDB
        update_doc = {
            "$set": {
                "site_code": site_code,
                "ip": ip,
                "status": effective_status,
                "response_time_ms": item.response_time_ms,
                "last_seen": now if is_responsive else None,
                "consecutive_misses": 0 if is_responsive else 1
            },
            "$setOnInsert": {
                "first_discovered": now
            }
        }
        if item.mac:
            update_doc["$set"]["mac"] = item.mac
        if item.hostname:
            update_doc["$set"]["hostname"] = item.hostname
        if item.vendor:
            update_doc["$set"]["vendor"] = item.vendor
        if item.device_type:
            update_doc["$set"]["device_type"] = item.device_type
        if item.snmp_status:
            update_doc["$set"]["snmp_status"] = item.snmp_status
        if item.snmp_data:
            update_doc["$set"]["snmp_data"] = item.snmp_data.model_dump()

        bulk_device_ops.append(
            UpdateOne({"site_code": site_code, "ip": ip}, update_doc, upsert=True)
        )

        # Telemetry log for time-series charts (TTL index auto-cleans in 30 days)
        bulk_status_logs.append({
            "site_code": site_code,
            "device_ip": ip,
            "status": item.status,
            "response_time_ms": item.response_time_ms,
            "timestamp": now
        })

    # Execute bulk operations for devices
    if bulk_device_ops:
        await db.devices.bulk_write(bulk_device_ops, ordered=False)

    # Insert status logs
    if bulk_status_logs:
        await db.status_logs.insert_many(bulk_status_logs, ordered=False)

    # 2. Check for previously known devices not reported in this scan -> increment misses or mark offline
    missing_ips = existing_ips - reported_ips
    if missing_ips:
        # Increase consecutive_misses
        await db.devices.update_many(
            {"site_code": site_code, "ip": {"$in": list(missing_ips)}},
            {"$inc": {"consecutive_misses": 1}}
        )
        # If missed >= 2 times, set offline and create alert
        offline_result = await db.devices.update_many(
            {"site_code": site_code, "ip": {"$in": list(missing_ips)}, "consecutive_misses": {"$gte": 2}, "status": "online"},
            {"$set": {"status": "offline"}}
        )
        if offline_result.modified_count > 0:
            for missing_ip in missing_ips:
                await db.alerts.insert_one({
                    "site_code": site_code,
                    "device_ip": missing_ip,
                    "level": "critical",
                    "event_type": "DEVICE_DOWN",
                    "message": f"Thiết bị {missing_ip} tại {site_code} mất kết nối",
                    "acknowledged": False,
                    "created_at": now,
                    "resolved_at": None
                })

    # 3. Update Site Heartbeat & Stats
    total_devices_in_site = await db.devices.count_documents({"site_code": site_code})
    online_devices_in_site = await db.devices.count_documents({"site_code": site_code, "status": "online"})
    slow_devices_in_site = await db.devices.count_documents({"site_code": site_code, "status": "slow"})
    offline_devices_in_site = total_devices_in_site - online_devices_in_site - slow_devices_in_site

    site_update_fields = {
        "agent_status": "online",
        "last_heartbeat": now,
        "agent_metrics": payload.agent_metrics.model_dump() if payload.agent_metrics else None,
        "device_stats": {
            "total": total_devices_in_site,
            "online": online_devices_in_site,
            "slow": slow_devices_in_site,
            "offline": offline_devices_in_site
        }
    }
    if payload.discovered_subnets:
        site_update_fields["subnet_ranges"] = payload.discovered_subnets
    if payload.code_nm:
        site_update_fields["code_nm"] = payload.code_nm

    await db.sites.update_one(
        {"site_code": site_code},
        {"$set": site_update_fields},
        upsert=True
    )

    # 4. Broadcast real-time update to UI Dashboards
    event_data = {
        "site_code": site_code,
        "timestamp": now.isoformat(),
        "stats": {
            "total": total_devices_in_site,
            "online": online_devices_in_site,
            "slow": slow_devices_in_site,
            "offline": offline_devices_in_site
        },
        "new_devices_count": new_devices_count,
        "processed": len(payload.devices)
    }
    await manager.broadcast("TELEMETRY_UPDATE", event_data)

    return TelemetryIngestResponse(
        site_code=site_code,
        processed_devices=len(payload.devices),
        new_devices_count=new_devices_count,
        online_count=online_devices_in_site,
        offline_count=offline_devices_in_site,
        message="Telemetry processed and state reconciled"
    )
