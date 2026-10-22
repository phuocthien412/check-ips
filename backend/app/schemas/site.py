from typing import List, Optional, Dict
from datetime import datetime
from pydantic import BaseModel, Field

class DeviceStats(BaseModel):
    total: int = 0
    online: int = 0
    slow: int = 0
    offline: int = 0

class SiteBase(BaseModel):
    site_code: str
    code_nm: Optional[str] = None
    site_name: str
    location: str
    subnet_ranges: List[str] = []

class SiteResponse(SiteBase):
    id: Optional[str] = Field(None, alias="_id")
    agent_status: str = "offline" # online, warning, offline
    last_heartbeat: Optional[datetime] = None
    device_stats: DeviceStats = DeviceStats()
    created_at: Optional[datetime] = None

    class Config:
        populate_by_name = True

class SiteUpdate(BaseModel):
    site_name: Optional[str] = None
    location: Optional[str] = None
    subnet_ranges: Optional[List[str]] = None
