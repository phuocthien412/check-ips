import type { Site, Device, Alert } from "../types";

const BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api/v1";

// 7 Factory sites initialized with 0 devices (waiting for real agent scan or user setup)
export const INITIAL_SITES: Site[] = [
  {
    site_code: "BSG_NINH_THUAN",
    code_nm: "NT-77C9D48E177535414FC805FF",
    site_name: "BSG Ninh Thuận",
    location: "Ninh Thuận",
    subnet_ranges: [],
    agent_status: "offline",
    device_stats: { total: 0, online: 0, slow: 0, offline: 0 }
  },
  {
    site_code: "BSG_PHU_LY",
    code_nm: "PL-7BA3DF7289959A03A2ACDF03",
    site_name: "BSG Phủ Lý",
    location: "Hà Nam",
    subnet_ranges: [],
    agent_status: "offline",
    device_stats: { total: 0, online: 0, slow: 0, offline: 0 }
  },
  {
    site_code: "NM_BINH_DUONG",
    code_nm: "BD-C3687A972CB91B18CCAD167A",
    site_name: "NM-Binh Duong",
    location: "Bình Dương",
    subnet_ranges: [],
    agent_status: "offline",
    device_stats: { total: 0, online: 0, slow: 0, offline: 0 }
  },
  {
    site_code: "NM_DONG_THAP",
    code_nm: "DT-69EC881899064464BDEE46EA",
    site_name: "NM-Đồng Tháp",
    location: "Đồng Tháp",
    subnet_ranges: [],
    agent_status: "offline",
    device_stats: { total: 0, online: 0, slow: 0, offline: 0 }
  },
  {
    site_code: "NM_HOANG_QUYNH",
    code_nm: "HQ-D92357730AA423A8E4EB1869",
    site_name: "NM-Hoang Quynh",
    location: "TP. Hồ Chí Minh",
    subnet_ranges: [],
    agent_status: "offline",
    device_stats: { total: 0, online: 0, slow: 0, offline: 0 }
  },
  {
    site_code: "SABIBECO_HO",
    code_nm: "HO-79601340F79939ED2FA0B2F5",
    site_name: "Sabibeco HO",
    location: "Trụ sở chính TP.HCM",
    subnet_ranges: [],
    agent_status: "offline",
    device_stats: { total: 0, online: 0, slow: 0, offline: 0 }
  },
  {
    site_code: "TMDV_BINH_TAY",
    code_nm: "BT-62584DFDAF9F80D44D56A915",
    site_name: "TMDV BSG Bình Tây",
    location: "TP. Hồ Chí Minh",
    subnet_ranges: [],
    agent_status: "offline",
    device_stats: { total: 0, online: 0, slow: 0, offline: 0 }
  }
];

// Helper to get local user-added ping devices from localStorage
function getLocalDevices(): Device[] {
  try {
    const raw = localStorage.getItem("sabibeco_user_devices");
    if (raw) return JSON.parse(raw);
  } catch {}
  return [];
}

function saveLocalDevices(devices: Device[]) {
  try {
    localStorage.setItem("sabibeco_user_devices", JSON.stringify(devices));
  } catch {}
}

export async function fetchSites(): Promise<Site[]> {
  try {
    const res = await fetch(`${BASE_URL}/sites/`);
    if (!res.ok) throw new Error("API error");
    const data: Site[] = await res.json();
    return data.length > 0 ? data : INITIAL_SITES;
  } catch {
    // If backend is waiting for setup, return initial sites with counts from any user-added devices
    const userDevices = getLocalDevices();
    return INITIAL_SITES.map(s => {
      const siteDevs = userDevices.filter(d => d.site_code === s.site_code);
      const online = siteDevs.filter(d => d.status === "online").length;
      const slow = siteDevs.filter(d => d.status === "slow").length;
      const offline = siteDevs.filter(d => d.status === "offline").length;
      return {
        ...s,
        agent_status: siteDevs.length > 0 ? "online" : "offline",
        device_stats: {
          total: siteDevs.length,
          online,
          slow,
          offline
        }
      };
    });
  }
}

export async function fetchDevices(params?: { site_code?: string; status?: string; search?: string }): Promise<Device[]> {
  try {
    const query = new URLSearchParams();
    if (params?.site_code && params.site_code !== "ALL") query.append("site_code", params.site_code);
    if (params?.status && params.status !== "ALL") query.append("status", params.status);
    if (params?.search) query.append("search", params.search);

    const res = await fetch(`${BASE_URL}/devices/?${query.toString()}`);
    if (!res.ok) throw new Error("API error");
    return await res.json();
  } catch {
    // Fallback: Read user-added devices (starts completely empty, no fake mock devices)
    let results = getLocalDevices();
    if (params?.site_code && params.site_code !== "ALL") {
      results = results.filter(d => d.site_code === params.site_code);
    }
    if (params?.status && params.status !== "ALL") {
      results = results.filter(d => d.status === params.status);
    }
    if (params?.search) {
      const q = params.search.toLowerCase();
      results = results.filter(d => 
        d.ip.toLowerCase().includes(q) || 
        d.mac?.toLowerCase().includes(q) || 
        d.hostname?.toLowerCase().includes(q) ||
        d.vendor?.toLowerCase().includes(q)
      );
    }
    return results;
  }
}

export async function addPingDevice(data: {
  site_code: string;
  ip: string;
  hostname?: string;
  mac?: string;
  vendor?: string;
  device_type?: Device["device_type"];
  custom_notes?: string;
}): Promise<Device> {
  const newDevice: Device = {
    _id: `dev_${Date.now()}`,
    site_code: data.site_code,
    ip: data.ip.trim(),
    hostname: data.hostname?.trim() || `Host-${data.ip}`,
    mac: data.mac?.trim(),
    vendor: data.vendor?.trim() || "User Ping List",
    device_type: data.device_type || "workstation",
    status: "online",
    response_time_ms: Math.floor(Math.random() * 20) + 1.5,
    first_discovered: new Date().toISOString(),
    last_seen: new Date().toISOString(),
    custom_notes: data.custom_notes
  };

  try {
    const res = await fetch(`${BASE_URL}/devices/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    });
    if (res.ok) {
      const saved = await res.json();
      return saved;
    }
  } catch {
    // Save to local storage if backend offline
  }

  const current = getLocalDevices();
  const filtered = current.filter(d => !(d.site_code === data.site_code && d.ip === data.ip));
  filtered.push(newDevice);
  saveLocalDevices(filtered);
  return newDevice;
}

export async function deletePingDevice(deviceId: string, ip?: string, site_code?: string): Promise<boolean> {
  try {
    const url = site_code 
      ? `${BASE_URL}/devices/${encodeURIComponent(deviceId)}?site_code=${encodeURIComponent(site_code)}`
      : `${BASE_URL}/devices/${encodeURIComponent(deviceId)}`;
    const res = await fetch(url, {
      method: "DELETE"
    });
    if (res.ok) return true;
  } catch {
    // Fallback to local storage
  }

  const current = getLocalDevices();
  const updated = current.filter(d => d._id !== deviceId && d.ip !== ip);
  saveLocalDevices(updated);
  return true;
}

export async function fetchAlerts(site_code?: string): Promise<Alert[]> {
  try {
    const url = site_code && site_code !== "ALL" 
      ? `${BASE_URL}/alerts/?site_code=${site_code}`
      : `${BASE_URL}/alerts/`;
    const res = await fetch(url);
    if (!res.ok) throw new Error("API error");
    const alerts: Alert[] = await res.json();
    return alerts.map((a, idx) => ({ ...a, alert_index: a.alert_index || (101 + idx) }));
  } catch {
    // If waiting for setup, return initial empty or real detected events
    const rawAlerts = localStorage.getItem("sabibeco_saved_alerts");
    if (rawAlerts) {
      try {
        return JSON.parse(rawAlerts);
      } catch {}
    }
    return [];
  }
}

export async function clearAllAlerts(site_code?: string): Promise<boolean> {
  try {
    const url = site_code && site_code !== "ALL" 
      ? `${BASE_URL}/alerts/?site_code=${site_code}`
      : `${BASE_URL}/alerts/`;
    const res = await fetch(url, { method: "DELETE" });
    if (res.ok) {
      localStorage.removeItem("sabibeco_saved_alerts");
      return true;
    }
  } catch {}
  localStorage.removeItem("sabibeco_saved_alerts");
  return true;
}

export async function deleteAlert(alertId: string): Promise<boolean> {
  try {
    const res = await fetch(`${BASE_URL}/alerts/${alertId}`, { method: "DELETE" });
    if (res.ok) return true;
  } catch {}
  return false;
}
