import type { FC } from "react";
import { 
  Activity, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  ShieldCheck, 
  HelpCircle,
  Globe
} from "lucide-react";
import type { Device } from "../../types";
import { isWanDevice } from "../../lib/utils";
import { useI18n } from "../../i18n";

interface FactoryDetailKPIProps {
  devices: Device[];
  siteStatus?: string;
  siteName?: string;
  location?: string;
  subnet?: string;
}

export const FactoryDetailKPI: FC<FactoryDetailKPIProps> = ({
  devices,
  siteStatus = "offline",
  siteName,
  location,
  subnet,
}) => {
  const { t } = useI18n();
  const isAgentOnline = siteStatus === "online";

  // Separate Local LAN devices from WAN test targets
  const lanDevices = devices.filter((d) => !isWanDevice(d));
  const wanDevices = devices.filter((d) => isWanDevice(d));
  const total = lanDevices.length;

  let online = 0;
  let slow = 0;
  let offline = 0;
  let unknown = 0;

  if (!isAgentOnline) {
    // When Agent is offline: all local LAN devices are UNKNOWN (Monitor Down)
    unknown = total;
  } else {
    lanDevices.forEach((d) => {
      if (d.status === "online") online++;
      else if (d.status === "slow") slow++;
      else if (d.status === "offline") offline++;
      else unknown++;
    });
  }

  const onlinePercent = total > 0 ? ((online / total) * 100).toFixed(1) : "0.0";
  const slowPercent = total > 0 ? ((slow / total) * 100).toFixed(1) : "0.0";
  const offlinePercent = total > 0 ? ((offline / total) * 100).toFixed(1) : "0.0";
  const unknownPercent = total > 0 ? ((unknown / total) * 100).toFixed(1) : "0.0";

  // Calculate Average Latency (ms) across active devices
  const activeWithLatency = lanDevices.filter(
    (d) =>
      (d.status === "online" || d.status === "slow") &&
      d.response_time_ms !== undefined &&
      d.response_time_ms !== null
  );

  const avgLatency =
    isAgentOnline && activeWithLatency.length > 0
      ? (activeWithLatency.reduce((sum, d) => sum + (d.response_time_ms || 0), 0) / activeWithLatency.length).toFixed(1)
      : "—";

  // Calculate Network Uptime (%)
  const uptime = !isAgentOnline
    ? t("kpiAgentOffline")
    : total > 0
    ? (((online + slow) / total) * 100).toFixed(1) + "%"
    : "100%";

  return (
    <div className="space-y-3">
      {/* 6 Key Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* 1. Total Monitored LAN IPs */}
        <div className="rounded-xl border border-slate-800/80 bg-[#0B1322] p-3.5 text-card-foreground shadow-sm hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold text-slate-300">{t("kpiLanDevices")}</span>
            <Activity className="h-4 w-4 text-cyan-400" />
          </div>
          <div className="mt-1.5 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-display text-white">{total}</span>
            <span className="text-xs text-muted-foreground">IPs</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1 truncate" title={siteName ? `${siteName} - ${location || ""}` : undefined}>
            {subnet ? `Subnet ${subnet}` : t("kpiLanSub")}
          </p>
        </div>

        {/* 2. Online Status */}
        <div className="rounded-xl border border-slate-800/80 bg-[#0B1322] p-3.5 text-card-foreground shadow-sm hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold text-emerald-400">{t("kpiOnline")}</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="mt-1.5 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-display text-emerald-400">{online}</span>
            <span className="text-xs text-slate-400">({onlinePercent}%)</span>
          </div>
          <div className="w-full bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
            <div
              className="bg-emerald-400 h-full rounded-full transition-all duration-500"
              style={{ width: `${onlinePercent}%` }}
            />
          </div>
        </div>

        {/* 3. Slow Response */}
        <div className="rounded-xl border border-slate-800/80 bg-[#0B1322] p-3.5 text-card-foreground shadow-sm hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold text-amber-400">{t("kpiSlow")}</span>
            <AlertTriangle className="h-4 w-4 text-amber-400" />
          </div>
          <div className="mt-1.5 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-display text-amber-400">{slow}</span>
            <span className="text-xs text-slate-400">({slowPercent}%)</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1 truncate">
            {slow > 0 ? t("kpiLatencyOver100") : t("kpiNoHighLatency")}
          </p>
        </div>

        {/* 4. Offline Devices (Confirmed) */}
        <div className="rounded-xl border border-slate-800/80 bg-[#0B1322] p-3.5 text-card-foreground shadow-sm hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold text-red-400">{t("kpiOffline")}</span>
            <XCircle className="h-4 w-4 text-red-400" />
          </div>
          <div className="mt-1.5 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-display text-red-400">{offline}</span>
            <span className="text-xs text-slate-400">({offlinePercent}%)</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1 truncate">
            {isAgentOnline ? t("cardOfflineConfirmed") : `0 (${t("kpiWaitingAgent")})`}
          </p>
        </div>

        {/* 5. Unknown / Monitor Down */}
        <div className="rounded-xl border border-slate-800/80 bg-[#0B1322] p-3.5 text-card-foreground shadow-sm hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold text-purple-300">{t("kpiUnknown")}</span>
            <HelpCircle className="h-4 w-4 text-purple-400" />
          </div>
          <div className="mt-1.5 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-display text-purple-300">{unknown}</span>
            <span className="text-xs text-slate-400">({unknownPercent}%)</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1 truncate">
            {isAgentOnline ? t("standby") : t("kpiUnknownMonitorDown")}
          </p>
        </div>

        {/* 6. Uptime & Latency */}
        <div className="rounded-xl border border-slate-800/80 bg-[#0B1322] p-3.5 text-card-foreground shadow-sm hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold text-indigo-400">{t("kpiLatencyUptime")}</span>
            <ShieldCheck className="h-4 w-4 text-indigo-400" />
          </div>
          <div className="mt-1.5 flex items-baseline gap-1.5">
            <span className={`text-2xl font-bold font-display ${isAgentOnline ? "text-emerald-400" : "text-slate-400"}`}>
              {uptime}
            </span>
            {avgLatency !== "—" && (
              <span className="text-xs text-cyan-400 font-mono font-medium">({avgLatency}ms)</span>
            )}
          </div>
          <p className="text-[11px] text-slate-400 mt-1 truncate">
            {isAgentOnline ? t("secReady") : t("kpiAgentOffline")}
          </p>
        </div>
      </div>

      {/* WAN Uplink Notice if present */}
      {wanDevices.length > 0 && (
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900/60 border border-slate-800/60 text-xs font-mono text-slate-400">
          <Globe className="h-3.5 w-3.5 text-cyan-400 shrink-0" />
          <span>WAN Internet Targets:</span>
          {wanDevices.map((w) => (
            <span key={w.ip} className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-800 text-slate-200">
              <span className={`h-1.5 w-1.5 rounded-full ${w.status === "online" ? "bg-emerald-400" : "bg-red-500"}`} />
              <span>{w.hostname || w.ip}</span>
              <span className="text-[10px] text-slate-400 font-mono">({w.ip})</span>
            </span>
          ))}
        </div>
      )}
    </div>
  );
};
