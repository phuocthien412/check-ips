from typing import Optional
from datetime import datetime
from pydantic import BaseModel, Field

class AlertResponse(BaseModel):
    id: Optional[str] = Field(None, alias="_id")
    site_code: str
    device_ip: Optional[str] = None
    level: str = "warning" # info, warning, critical
    event_type: str # DEVICE_DOWN, NEW_DEVICE_DETECTED, AGENT_DISCONNECTED, HIGH_LATENCY
    message: str
    acknowledged: bool = False
    created_at: datetime
    resolved_at: Optional[datetime] = None

    class Config:
        populate_by_name = True
