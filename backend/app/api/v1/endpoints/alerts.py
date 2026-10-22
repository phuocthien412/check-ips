from typing import List, Optional
from fastapi import APIRouter, Query, HTTPException
from bson import ObjectId
from app.core.database import get_database
from app.schemas.alert import AlertResponse

router = APIRouter()

@router.get("/", response_model=List[AlertResponse])
async def list_alerts(
    site_code: Optional[str] = Query(None),
    acknowledged: Optional[bool] = Query(None),
    limit: int = Query(50, ge=1, le=200)
):
    db = get_database()
    if db is None:
        return []

    filter_query = {}
    if site_code and site_code != "ALL":
        filter_query["site_code"] = site_code
    if acknowledged is not None:
        filter_query["acknowledged"] = acknowledged

    cursor = db.alerts.find(filter_query).sort("created_at", -1).limit(limit)
    alerts = []
    async for doc in cursor:
        doc["_id"] = str(doc["_id"])
        alerts.append(AlertResponse(**doc))
    return alerts

@router.delete("/")
async def clear_alerts(site_code: Optional[str] = Query(None)):
    """Xóa toàn bộ thông báo cảnh báo (Clear all alerts), có thể lọc theo site_code"""
    db = get_database()
    if db is None:
        raise HTTPException(status_code=503, detail="Database not connected")

    filter_query = {}
    if site_code and site_code != "ALL":
        filter_query["site_code"] = site_code

    result = await db.alerts.delete_many(filter_query)
    return {"status": "success", "deleted_count": result.deleted_count}

@router.delete("/{alert_id}")
async def delete_single_alert(alert_id: str):
    """Xóa một cảnh báo đơn lẻ bằng ID"""
    db = get_database()
    if db is None:
        raise HTTPException(status_code=503, detail="Database not connected")

    try:
        oid = ObjectId(alert_id)
        result = await db.alerts.delete_one({"_id": oid})
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Alert not found")
        return {"status": "success", "alert_id": alert_id}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/{alert_id}/acknowledge")
async def acknowledge_alert(alert_id: str):
    db = get_database()
    if db is None:
        raise HTTPException(status_code=503, detail="Database not connected")

    try:
        oid = ObjectId(alert_id)
        result = await db.alerts.update_one({"_id": oid}, {"$set": {"acknowledged": True}})
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Alert not found")
        return {"status": "success", "alert_id": alert_id, "acknowledged": True}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
