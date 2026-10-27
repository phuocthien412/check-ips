from datetime import datetime, timezone
from typing import List
from fastapi import APIRouter, HTTPException, status
from app.core.database import get_database, INITIAL_SITES
from app.schemas.site import SiteResponse, SiteUpdate

router = APIRouter()

@router.get("/", response_model=List[SiteResponse])
async def list_sites():
    """List all 7 sites and their operational status & device counts"""
    db = get_database()
    if db is None:
        # Fallback to initial static seed if DB offline
        return [
            SiteResponse(
                site_code=s["site_code"],
                site_name=s["site_name"],
                location=s["location"],
                subnet_ranges=s["subnet_ranges"],
                agent_status=s["agent_status"],
                last_heartbeat=s["last_heartbeat"],
                device_stats=s["device_stats"],
                created_at=s["created_at"]
            )
            for s in INITIAL_SITES
        ]

    sites_cursor = db.sites.find({})
    results = []
    async for doc in sites_cursor:
        doc["_id"] = str(doc["_id"])
        for dt_field in ["last_heartbeat", "created_at"]:
            if doc.get(dt_field) and isinstance(doc[dt_field], datetime) and doc[dt_field].tzinfo is None:
                doc[dt_field] = doc[dt_field].replace(tzinfo=timezone.utc)
        results.append(SiteResponse.model_validate(doc))
    return results

@router.get("/{site_code}", response_model=SiteResponse)
async def get_site(site_code: str):
    db = get_database()
    if db is None:
        raise HTTPException(status_code=503, detail="Database not connected")

    doc = await db.sites.find_one({"site_code": site_code})
    if doc is None:
        raise HTTPException(status_code=404, detail="Site not found")
    doc["_id"] = str(doc["_id"])
    for dt_field in ["last_heartbeat", "created_at"]:
        if doc.get(dt_field) and isinstance(doc[dt_field], datetime) and doc[dt_field].tzinfo is None:
            doc[dt_field] = doc[dt_field].replace(tzinfo=timezone.utc)
    return SiteResponse.model_validate(doc)
