from typing import List, Optional, Dict, Any
from datetime import datetime
from pydantic import BaseModel, Field

class NetworkInterface(BaseModel):
    index: int
    name: str
    status: str = "up"
    in_octets: Optional[int] = 0
    out_octets: Optional[int] = 0

class SnmpData(BaseModel):
    sys_name: Optional[str] = None
    sys_descr: Optional[str] = None
    uptime_seconds: Optional[int] = None
    interfaces: Optional[List[NetworkInterface]] = []

class DeviceTelemetryItem(BaseModel):
    ip: str
    mac: Optional[str] = None
    hostname: Optional[str] = None
    vendor: Optional[str] = None
    status: str = "online" # online, offline
    response_time_ms: Optional[float] = None
    device_type: Optional[str] = "unknown" # switch, router, server, ap, workstation, printer, unknown
    snmp_status: Optional[str] = "disabled" # enabled, disabled, timeout
    snmp_data: Optional[SnmpData] = None

class AgentMetrics(BaseModel):
    cpu_usage: Optional[float] = None
    memory_mb: Optional[float] = None
    scan_duration_ms: Optional[float] = None

class TelemetryPayload(BaseModel):
    site_code: str = Field(..., description="Mã định danh duy nhất của site (VD: NM_BINH_DUONG)")
    agent_version: str = "1.0.0"
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    discovered_subnets: Optional[List[str]] = []
    agent_metrics: Optional[AgentMetrics] = None
    devices: List[DeviceTelemetryItem] = []

class TelemetryIngestResponse(BaseModel):
    status: str = "success"
    site_code: str
    processed_devices: int
    new_devices_count: int
    online_count: int
    offline_count: int
    message: str = "Telemetry ingested successfully"
