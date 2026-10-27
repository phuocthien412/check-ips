from typing import List, Optional
from datetime import datetime, timezone
from fastapi import APIRouter, Query, HTTPException, status
from bson import ObjectId
from app.core.database import get_database
from app.schemas.device import DeviceResponse, DeviceCreate
from app.services.connection_manager import manager

router = APIRouter()

@router.get("/", response_model=List[DeviceResponse])
async def list_devices(
    site_code: Optional[str] = Query(None, description="Lọc theo Site Code (VD: NM_BINH_DUONG)"),
    status: Optional[str] = Query(None, description="online, slow, hoặc offline"),
    device_type: Optional[str] = Query(None, description="switch, router, ap, server..."),
    search: Optional[str] = Query(None, description="Tìm theo IP, MAC, hoặc Hostname"),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500)
):
    """List devices across sites with flexible filters and pagination"""
    db = get_database()
    if db is None:
        return []

    filter_query = {}
    if site_code and site_code != "ALL":
        filter_query["site_code"] = site_code
    if status and status != "ALL":
        filter_query["status"] = status
    if device_type and device_type != "ALL":
        filter_query["device_type"] = device_type

    if search:
        search_regex = {"$regex": search, "$options": "i"}
        filter_query["$or"] = [
            {"ip": search_regex},
            {"mac": search_regex},
            {"hostname": search_regex},
            {"vendor": search_regex}
        ]

    cursor = db.devices.find(filter_query).sort([("status", 1), ("ip", 1)]).skip(skip).limit(limit)
    devices = []
    async for doc in cursor:
        if not doc:
            continue
        doc["_id"] = str(doc["_id"])
        for dt_field in ["first_discovered", "last_seen"]:
            if doc.get(dt_field) and isinstance(doc[dt_field], datetime) and doc[dt_field].tzinfo is None:
                doc[dt_field] = doc[dt_field].replace(tzinfo=timezone.utc)
        devices.append(DeviceResponse.model_validate(doc))
    return devices

@router.post("/", response_model=DeviceResponse, status_code=status.HTTP_201_CREATED)
async def add_device(data: DeviceCreate):
    """Thêm một IP thiết bị mới cần giám sát ping (Add Ping)"""
    db = get_database()
    if db is None:
        raise HTTPException(status_code=503, detail="Database not connected")

    now = datetime.now(timezone.utc)
    device_doc = {
        "site_code": data.site_code,
        "ip": data.ip.strip(),
        "hostname": data.hostname.strip() if data.hostname else None,
        "mac": data.mac.strip() if data.mac else None,
        "vendor": data.vendor.strip() if data.vendor else "Custom Ping",
        "device_type": data.device_type or "workstation",
        "status": "online",
        "response_time_ms": 1.0,
        "snmp_status": "disabled",
        "first_discovered": now,
        "last_seen": now,
        "custom_notes": data.custom_notes
    }

    # Upsert by site_code and ip
    await db.devices.update_one(
        {"site_code": data.site_code, "ip": data.ip.strip()},
        {"$set": device_doc},
        upsert=True
    )

    created = await db.devices.find_one({"site_code": data.site_code, "ip": data.ip.strip()})
    if created is None:
        raise HTTPException(status_code=500, detail="Failed to retrieve created device")
    created["_id"] = str(created["_id"])
    for dt_field in ["first_discovered", "last_seen"]:
        if created.get(dt_field) and isinstance(created[dt_field], datetime) and created[dt_field].tzinfo is None:
            created[dt_field] = created[dt_field].replace(tzinfo=timezone.utc)

    # Update site stats
    total = await db.devices.count_documents({"site_code": data.site_code})
    online = await db.devices.count_documents({"site_code": data.site_code, "status": "online"})
    slow = await db.devices.count_documents({"site_code": data.site_code, "status": "slow"})
    offline = total - online - slow
    await db.sites.update_one(
        {"site_code": data.site_code},
        {"$set": {"device_stats": {"total": total, "online": online, "slow": slow, "offline": offline}}}
    )

    await manager.broadcast("DEVICE_ADDED", {"site_code": data.site_code, "ip": data.ip})
    return DeviceResponse.model_validate(created)

@router.delete("/{device_id}")
async def delete_device(device_id: str, site_code: Optional[str] = Query(None)):
    """Xóa một thiết bị khỏi hệ thống giám sát (Delete Ping)"""
    db = get_database()
    if db is None:
        raise HTTPException(status_code=503, detail="Database not connected")

    target = None
    if ObjectId.is_valid(device_id):
        target = await db.devices.find_one({"_id": ObjectId(device_id)})

    if not target and site_code and site_code != "ALL":
        target = await db.devices.find_one({"ip": device_id, "site_code": site_code})

    if not target:
        target = await db.devices.find_one({"ip": device_id})

    if not target:
        target = await db.devices.find_one({"_id": device_id})

    if not target:
        return {"status": "success", "message": f"Device {device_id} already deleted"}

    target_site = target.get("site_code")
    await db.devices.delete_one({"_id": target["_id"]})

    # Recalculate site stats
    if target_site:
        total = await db.devices.count_documents({"site_code": target_site})
        online = await db.devices.count_documents({"site_code": target_site, "status": "online"})
        slow = await db.devices.count_documents({"site_code": target_site, "status": "slow"})
        offline = total - online - slow
        await db.sites.update_one(
            {"site_code": target_site},
            {"$set": {"device_stats": {"total": total, "online": online, "slow": slow, "offline": offline}}}
        )

    await manager.broadcast("DEVICE_DELETED", {"device_id": str(target["_id"]), "ip": target.get("ip"), "site_code": target_site})
    return {"status": "success", "message": f"Device {device_id} deleted successfully"}

@router.get("/{device_id}", response_model=DeviceResponse)
async def get_device(device_id: str):
    db = get_database()
    if db is None:
        raise HTTPException(status_code=503, detail="Database not connected")

    try:
        oid = ObjectId(device_id)
        doc = await db.devices.find_one({"_id": oid})
    except Exception:
        doc = await db.devices.find_one({"ip": device_id})

    if doc is None:
        raise HTTPException(status_code=404, detail="Device not found")
    doc["_id"] = str(doc["_id"])
    for dt_field in ["first_discovered", "last_seen"]:
        if doc.get(dt_field) and isinstance(doc[dt_field], datetime) and doc[dt_field].tzinfo is None:
            doc[dt_field] = doc[dt_field].replace(tzinfo=timezone.utc)
    return DeviceResponse.model_validate(doc)
