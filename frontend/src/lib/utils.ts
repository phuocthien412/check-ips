import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatBytes(bytes?: number, decimals = 1) {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

export function formatUptime(seconds?: number) {
  if (!seconds || seconds <= 0) return "N/A";
  const days = Math.floor(seconds / (3600 * 24));
  const hours = Math.floor((seconds % (3600 * 24)) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

/**
 * Check if an IP/device represents an external Internet WAN ping test (1.1.1.1, 8.8.8.8, etc.)
 */
export function isWanDevice(device: { ip: string; hostname?: string }): boolean {
  const ip = (device.ip || "").trim();
  const host = (device.hostname || "").toLowerCase();
  if (["1.1.1.1", "1.0.0.1", "8.8.8.8", "8.8.4.4", "9.9.9.9", "208.67.222.222"].includes(ip)) {
    return true;
  }
  if (host.includes("one.one.one.one") || host.includes("dns.google") || host.includes("cloudflare")) {
    return true;
  }
  // Private local IP ranges:
  if (ip.startsWith("192.168.") || ip.startsWith("10.") || ip.startsWith("127.")) {
    return false;
  }
  const match172 = ip.match(/^172\.(\d+)\./);
  if (match172) {
    const second = parseInt(match172[1], 10);
    if (second >= 16 && second <= 31) return false;
  }
  // If public IP, consider WAN
  return ip.length > 0;
}

/**
 * Compute effective status of a device based on Site Agent health:
 * - If Site Agent is OFFLINE: status is 'unknown' (Chưa xác định / Monitor Down)
 * - If Site Agent is ONLINE: status is 'online', 'slow', or 'offline' (Confirmed down)
 */
export function getEffectiveDeviceStatus(
  device: { status: string },
  agentStatus?: string
): 'online' | 'slow' | 'offline' | 'unknown' {
  if (agentStatus === 'offline') {
    return 'unknown';
  }
  if (device.status === 'slow') return 'slow';
  if (device.status === 'offline') return 'offline';
  if (device.status === 'online') return 'online';
  return 'unknown';
}

/**
 * Safely parse ISO date strings from MongoDB. If UTC datetime string lacks 'Z' or offset, append 'Z'.
 */
export function parseUtcDate(dateStr?: string | Date | null): Date | null {
  if (!dateStr) return null;
  if (dateStr instanceof Date) return isNaN(dateStr.getTime()) ? null : dateStr;
  let s = String(dateStr).trim();
  if (!s) return null;
  // If string contains ISO format without trailing Z or +/- offset, treat as UTC
  if (!s.endsWith("Z") && !s.includes("+") && !/[-+]\d{2}(:\d{2})?$/.test(s)) {
    s += "Z";
  }
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

/**
 * Format timestamp strictly in Vietnam Timezone (Asia/Ho_Chi_Minh - UTC+7)
 */
export function formatVietnamDateTime(dateStr?: string | Date | null): string {
  const d = parseUtcDate(dateStr);
  if (!d) return "—";
  try {
    return new Intl.DateTimeFormat("vi-VN", {
      timeZone: "Asia/Ho_Chi_Minh",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    }).format(d);
  } catch {
    return "—";
  }
}

export function formatVietnamTime(dateStr?: string | Date | null): string {
  const d = parseUtcDate(dateStr);
  if (!d) return "—";
  try {
    return new Intl.DateTimeFormat("vi-VN", {
      timeZone: "Asia/Ho_Chi_Minh",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    }).format(d);
  } catch {
    return "—";
  }
}

export function formatRelativeVietnamTime(
  dateStr?: string | Date | null,
  t?: (k: any) => string
): string {
  const d = parseUtcDate(dateStr);
  if (!d) return "—";
  try {
    const diffMs = Math.max(0, Date.now() - d.getTime());
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);

    const justNowText = t ? t("justNow") : "Vừa xong";
    const agoText = t ? t("ago") : "trước";

    if (diffMin < 1) return justNowText;
    if (diffMin < 60) return `${diffMin}m ${agoText}`;
    if (diffHour < 24) return `${diffHour}h ${diffMin % 60}m ${agoText}`;

    return new Intl.DateTimeFormat("vi-VN", {
      timeZone: "Asia/Ho_Chi_Minh",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(d);
  } catch {
    return "—";
  }
}

