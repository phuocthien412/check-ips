export interface DeviceStats {
  total: number;
  online: number;
  slow: number;
  offline: number;
  unknown?: number;
}

export interface Site {
  _id?: string;
  site_code: string;
  code_nm?: string;
  site_name: string;
  location: string;
  subnet_ranges: string[];
  agent_status: 'online' | 'warning' | 'offline';
  last_heartbeat?: string;
  device_stats: DeviceStats;
  created_at?: string;
}

export interface NetworkInterface {
  index: number;
  name: string;
  status: string;
  in_octets?: number;
  out_octets?: number;
}

export interface SnmpData {
  sys_name?: string;
  sys_descr?: string;
  uptime_seconds?: number;
  interfaces?: NetworkInterface[];
}

export interface Device {
  _id?: string;
  site_code: string;
  ip: string;
  mac?: string;
  hostname?: string;
  vendor?: string;
  device_type?: 'switch' | 'router' | 'access_point' | 'camera' | 'storage' | 'server' | 'printer' | 'workstation' | 'unknown';
  status: 'online' | 'slow' | 'offline' | 'unknown';
  is_wan?: boolean;
  response_time_ms?: number;
  snmp_status?: 'enabled' | 'disabled' | 'timeout';
  snmp_data?: SnmpData;
  first_discovered?: string;
  last_seen?: string;
  custom_notes?: string;
}

export interface Alert {
  _id?: string;
  alert_index: number;
  site_code: string;
  device_ip?: string;
  level: 'info' | 'warning' | 'critical';
  event_type: string;
  message: string;
  acknowledged: boolean;
  created_at: string;
}

export interface UserSession {
  username: string;
  role: string;
  displayName: string;
  avatarUrl?: string;
  isLoggedIn: boolean;
}
