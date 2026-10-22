from typing import Optional, List, Any
from datetime import datetime
from pydantic import BaseModel, Field
from app.schemas.telemetry import SnmpData

class DeviceCreate(BaseModel):
    site_code: str
    ip: str
    hostname: Optional[str] = None
    mac: Optional[str] = None
    vendor: Optional[str] = None
    device_type: Optional[str] = "workstation"
    custom_notes: Optional[str] = None

class DeviceResponse(BaseModel):
    id: Optional[str] = Field(None, alias="_id")
    site_code: str
    ip: str
    mac: Optional[str] = None
    hostname: Optional[str] = None
    vendor: Optional[str] = None
    device_type: Optional[str] = "unknown"
    status: str = "online" # online, slow, offline
    response_time_ms: Optional[float] = None
    snmp_status: Optional[str] = "disabled"
    snmp_data: Optional[SnmpData] = None
    first_discovered: Optional[datetime] = None
    last_seen: Optional[datetime] = None
    custom_notes: Optional[str] = None

    class Config:
        populate_by_name = True

class DeviceFilterParams(BaseModel):
    site_code: Optional[str] = None
    status: Optional[str] = None # online, slow, offline
    device_type: Optional[str] = None
    search: Optional[str] = None
    page: int = 1
    page_size: int = 50
