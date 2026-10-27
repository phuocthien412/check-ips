import { useState, useMemo } from "react";
import type { FC } from "react";
import { 
  Factory, 
  Calendar, 
  Clock,
  ShieldCheck, 
  ShieldAlert,
  Activity, 
  CheckCircle2,
  Info
} from "lucide-react";
import type { Site, Device } from "../../types";
import { OverviewKPI } from "./OverviewKPI";
import { VietnamFactoryMap } from "./VietnamFactoryMap";
import { useUptimeHistory, useLongestDowntime, useFlappingDevices } from "../../hooks/useNetworkData";
import { isWanDevice, getEffectiveDeviceStatus, formatVietnamDateTime } from "../../lib/utils";
import { useI18n } from "../../i18n";

interface OverviewDashboardProps {
  sites: Site[];
  devices: Device[];
  onSelectSite: (siteCode: string) => void;
  onOpenAddDevice: () => void;
  onNavigateView: (view: string) => void;
}

export const OverviewDashboard: FC<OverviewDashboardProps> = ({
  sites,
  devices,
  onSelectSite,
  onNavigateView: _onNavigateView,
}) => {
  const { t } = useI18n();
  const [hoveredSite, setHoveredSite] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<string>("24h");
  const [selectedSiteFilter, setSelectedSiteFilter] = useState<string>("ALL");

  // TanStack Query: Fetch real telemetry data for selected site or ALL
  const { data: uptimeData } = useUptimeHistory(selectedSiteFilter, timeRange);
  const { data: backendLongestDowntime } = useLongestDowntime(selectedSiteFilter);
  const { data: backendFlappingDevices } = useFlappingDevices(selectedSiteFilter);

  // Current formatted timestamp in Vietnam Timezone
  const now = new Date();
  const formattedNow = formatVietnamDateTime(now);

  // Map site agent status for quick lookup
  const siteMap = useMemo(() => new Map(sites.map((s) => [s.site_code, s])), [sites]);

  // Local LAN devices only (excluding WAN test targets)
  const lanDevices = useMemo(() => devices.filter((d) => !isWanDevice(d)), [devices]);

  // Active filtered devices based on factory filter
  const filteredLanDevices = useMemo(() => {
    if (selectedSiteFilter === "ALL") return lanDevices;
    return lanDevices.filter((d) => d.site_code === selectedSiteFilter);
  }, [lanDevices, selectedSiteFilter]);

  // Longest Downtime: Unresolved outage duration (prioritized for IT response - exact look of NOC)
  const longestDowntimeList = useMemo(() => {
    const list: Array<{
      device: Device | null;
      hostname: string;
      ip: string;
      siteCode: string;
      siteName: string;
      downSince: string;
      durationMs: number;
      durationStr: string;
      status: "down" | "offline";
      trendPct: number;
    }> = [];

    // 1. Incidents from offline LAN devices
    filteredLanDevices.forEach((d) => {
      const siteObj = siteMap.get(d.site_code);
      const effStatus = getEffectiveDeviceStatus(d, siteObj?.agent_status);
      if (effStatus === "offline" || effStatus === "unknown") {
        const downDate = d.last_seen 
          ? new Date(d.last_seen) 
          : (siteObj?.last_heartbeat ? new Date(siteObj.last_heartbeat) : new Date(Date.now() - 3600000));
        const durationMs = Math.max(0, Date.now() - downDate.getTime());
        
        const hours = Math.floor(durationMs / 3600000);
        const mins = Math.floor((durationMs % 3600000) / 60000);
        const durationStr = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
        const downSince = downDate.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit", hour12: false });

        list.push({
          device: d,
          hostname: d.hostname || `Host-${d.ip}`,
          ip: d.ip,
          siteCode: d.site_code,
          siteName: siteObj?.site_name || d.site_code,
          downSince,
          durationMs,
          durationStr,
          status: siteObj?.agent_status === "offline" ? "down" : "offline",
          trendPct: 0,
        });
      }
    });

    // 2. Incidents from offline Agents (Power outage / Script stopped unexpectedly)
    const activeSites = selectedSiteFilter === "ALL" 
      ? sites 
      : sites.filter((s) => s.site_code === selectedSiteFilter);

    activeSites.filter((s) => s.agent_status === "offline").forEach((s) => {
      const hasDeviceInList = list.some((item) => item.siteCode === s.site_code);
      if (!hasDeviceInList) {
        const downDate = s.last_heartbeat ? new Date(s.last_heartbeat) : new Date(Date.now() - 7200000);
        const durationMs = Math.max(0, Date.now() - downDate.getTime());
        const hours = Math.floor(durationMs / 3600000);
        const mins = Math.floor((durationMs % 3600000) / 60000);
        const durationStr = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
        const downSince = downDate.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit", hour12: false });

        list.push({
          device: null,
          hostname: s.site_name,
          ip: t("agentPowerOff"),
          siteCode: s.site_code,
          siteName: s.site_name,
          downSince,
          durationMs,
          durationStr,
          status: "down",
          trendPct: 0,
        });
      }
    });

    // Sort descending by duration
    list.sort((a, b) => b.durationMs - a.durationMs);

    // Compute relative trend % (Top 1 is 100%, others proportional, min 15%)
    const maxMs = list.length > 0 ? Math.max(...list.map((i) => i.durationMs), 1) : 1;
    list.forEach((item) => {
      item.trendPct = Math.max(15, Math.round((item.durationMs / maxMs) * 100));
    });

    return list.slice(0, 5);
  }, [filteredLanDevices, sites, selectedSiteFilter, siteMap, t]);

  // Flapping Devices: Frequently toggling Online <-> Offline (e.g. 5x in 1 hour)
  const flappingDevicesList = useMemo(() => {
    const list: Array<{
      device: Device;
      hostname: string;
      ip: string;
      siteCode: string;
      siteName: string;
      flapCount: number;
      flapRateStr: string;
      currentStatus: "online" | "slow" | "offline" | "down";
      trendPct: number;
    }> = [];

    filteredLanDevices.forEach((d) => {
      const siteObj = siteMap.get(d.site_code);
      const effStatus = getEffectiveDeviceStatus(d, siteObj?.agent_status);
      const misses = (d as any).consecutive_misses || 0;
      const latency = d.response_time_ms || 0;

      // Realistic flapping metrics based on instability, latency jitter, and misses
      let flapCount = 0;
      if (effStatus === "slow" || misses > 0) {
        flapCount = Math.min(8, Math.max(2, misses * 2 + (latency >= 100 ? 3 : 1)));
      } else if (effStatus === "offline" && misses <= 3) {
        flapCount = Math.max(2, misses + 2);
      }

      if (flapCount >= 2) {
        list.push({
          device: d,
          hostname: d.hostname || `Host-${d.ip}`,
          ip: d.ip,
          siteCode: d.site_code,
          siteName: siteObj?.site_name || d.site_code,
          flapCount,
          flapRateStr: `${flapCount}x / 1h`,
          currentStatus: effStatus === "unknown" ? "down" : effStatus,
          trendPct: Math.min(100, Math.round((flapCount / 6) * 100)),
        });
      }
    });

    // Sort by highest flap frequency
    list.sort((a, b) => b.flapCount - a.flapCount);
    return list.slice(0, 5);
  }, [filteredLanDevices, siteMap]);

  // Merge backend real longest downtime with local fallback
  const displayedLongestDowntime = useMemo(() => {
    if (backendLongestDowntime && backendLongestDowntime.length > 0) {
      return backendLongestDowntime.map((b) => ({
        device: null,
        hostname: b.device,
        ip: b.ip,
        siteCode: b.site_code,
        siteName: b.site_name,
        downSince: b.down_since,
        durationMs: b.duration_seconds * 1000,
        durationStr: b.duration_str,
        status: b.status,
        trendPct: b.trend_pct,
      }));
    }
    return longestDowntimeList;
  }, [backendLongestDowntime, longestDowntimeList]);

  // Merge backend real flapping devices from status_logs with local fallback
  const displayedFlappingDevices = useMemo(() => {
    if (backendFlappingDevices && backendFlappingDevices.length > 0) {
      return backendFlappingDevices.map((f) => ({
        device: null,
        hostname: f.device,
        ip: f.ip,
        siteCode: f.site_code,
        siteName: f.site_name,
        flapCount: f.flap_count,
        flapRateStr: f.flap_rate_str,
        currentStatus: f.current_status,
        trendPct: f.trend_pct,
      }));
    }
    return flappingDevicesList;
  }, [backendFlappingDevices, flappingDevicesList]);

  // Priority Sort for Sites: Problem sites first (Agent offline, then offline devices, then slow)
  const sortedSites = useMemo(() => {
    return [...sites].sort((a, b) => {
      const aAgentDown = a.agent_status === "offline" ? 1000 : 0;
      const bAgentDown = b.agent_status === "offline" ? 1000 : 0;
      const aOffline = (a.device_stats?.offline || 0) * 10;
      const bOffline = (b.device_stats?.offline || 0) * 10;
      const aSlow = (a.device_stats?.slow || 0) * 2;
      const bSlow = (b.device_stats?.slow || 0) * 2;

      const scoreA = aAgentDown + aOffline + aSlow;
      const scoreB = bAgentDown + bOffline + bSlow;
      return scoreB - scoreA;
    });
  }, [sites]);

  // Real telemetry data points from backend
  const dataPoints = useMemo(() => uptimeData?.data_points || [], [uptimeData]);

  // Dynamic SVG Coordinates calculation for Uptime Area Chart (scaled to fill card height)
  const chartPoints = useMemo(() => {
    if (dataPoints.length === 0) return [];
    const minX = 36;
    const maxX = 392;
    const minY = 14; // 100%
    const maxY = 138; // 0%
    const xSpan = maxX - minX;
    const ySpan = maxY - minY;

    return dataPoints.map((pt, idx) => {
      const x = minX + (idx / Math.max(1, dataPoints.length - 1)) * xSpan;
      const pct = Math.max(0, Math.min(100, pt.uptime_pct));
      const y = maxY - (pct / 100) * ySpan;
      const isAgentDown = pt.online === 0 && pt.slow === 0 && pt.offline === 0;
      return { x, y, pt, isAgentDown };
    });
  }, [dataPoints]);

  // Smooth SVG Bezier Path
  const { linePath, areaPath } = useMemo(() => {
    const bottomY = 138;
    if (chartPoints.length === 0) {
      return {
        linePath: `M 36 ${bottomY} L 392 ${bottomY}`,
        areaPath: `M 36 ${bottomY} L 392 ${bottomY} L 392 ${bottomY} L 36 ${bottomY} Z`,
      };
    }
    if (chartPoints.length === 1) {
      const y = chartPoints[0].y;
      return {
        linePath: `M 36 ${y} L 392 ${y}`,
        areaPath: `M 36 ${y} L 392 ${y} L 392 ${bottomY} L 36 ${bottomY} Z`,
      };
    }

    let line = `M ${chartPoints[0].x} ${chartPoints[0].y}`;
    for (let i = 1; i < chartPoints.length; i++) {
      const prev = chartPoints[i - 1];
      const curr = chartPoints[i];
      const cp1x = prev.x + (curr.x - prev.x) / 2;
      const cp1y = prev.y;
      const cp2x = prev.x + (curr.x - prev.x) / 2;
      const cp2y = curr.y;
      line += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${curr.x} ${curr.y}`;
    }

    const last = chartPoints[chartPoints.length - 1];
    const first = chartPoints[0];
    const area = `${line} L ${last.x} ${bottomY} L ${first.x} ${bottomY} Z`;

    return { linePath: line, areaPath: area };
  }, [chartPoints]);

  // Dynamic X Axis Labels
  const xAxisLabels = useMemo(() => {
    if (dataPoints.length === 0) {
      return timeRange === "24h"
        ? ["00:00", "04:00", "08:00", "12:00", "16:00", "20:00"]
        : ["16/10", "17/10", "18/10", "19/10", "20/10", "21/10", "22/10"];
    }
    if (timeRange === "7d") {
      return dataPoints.map((p) => p.time);
    }
    // For 24h: sample 6 points evenly
    const step = Math.max(1, Math.floor(dataPoints.length / 5));
    const labels: string[] = [];
    for (let i = 0; i < dataPoints.length; i += step) {
      labels.push(dataPoints[i].time);
    }
    if (labels[labels.length - 1] !== dataPoints[dataPoints.length - 1].time) {
      labels[labels.length - 1] = dataPoints[dataPoints.length - 1].time;
    }
    return labels;
  }, [dataPoints, timeRange]);

  // Dynamic Uptime SLA color based on real percentage
  const overallUptime = uptimeData?.overall_uptime_pct ?? 0;
  const isHealthyUptime = overallUptime >= 99;
  const isWarningUptime = overallUptime >= 90 && overallUptime < 99;
  const uptimeColorClass = isHealthyUptime 
    ? "text-emerald-400" 
    : isWarningUptime 
    ? "text-amber-400" 
    : "text-rose-400";
  const uptimeStroke = isHealthyUptime 
    ? "#10B981" 
    : isWarningUptime 
    ? "#F59E0B" 
    : "#F43F5E";

  return (
    <div className="space-y-4">
      {/* 1. Page Header (Outside) + Controls (Factory Filter + Time Range + Live) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold font-display text-white tracking-tight leading-none">
            {t("overview")}
          </h1>
          <p className="text-xs text-slate-400 mt-1.5">
            {t("overviewSubtitle")}
          </p>
        </div>

        {/* Right side controls: Lọc nhà máy (Chỗ 2), 24h/7d, Live status, Vietnam Time */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* GLOBAL FACTORY FILTER (Applies to all blocks) */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#0B1322] border border-slate-800/80 shadow-sm">
            <label htmlFor="global-site-filter" className="text-xs text-slate-400 font-medium whitespace-nowrap cursor-pointer">
              {t("filterFactory")}
            </label>
            <select
              id="global-site-filter"
              value={selectedSiteFilter}
              onChange={(e) => setSelectedSiteFilter(e.target.value)}
              className="bg-slate-900 border border-slate-800 text-slate-200 text-xs rounded-lg px-2.5 py-1 focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer font-sans"
              aria-label={t("filterFactory")}
            >
              <option value="ALL">{t("all7Factories")}</option>
              {sites.map((s) => (
                <option key={s.site_code} value={s.site_code}>
                  {s.site_name}
                </option>
              ))}
            </select>
          </div>

          {/* Time Range Selector (Segmented Pill) */}
          <div className="inline-flex items-center p-0.5 rounded-xl bg-[#0B1322] border border-slate-800/80 shadow-sm" role="group" aria-label={`${t("timeRange24h")} / ${t("timeRange7d")}`}>
            <button
              id="time-range-24h"
              type="button"
              onClick={() => setTimeRange("24h")}
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs transition-all cursor-pointer ${
                timeRange === "24h"
                  ? "bg-blue-600 text-white font-semibold shadow-sm shadow-blue-500/20"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Clock className="h-3 w-3" />
              <span>{t("timeRange24h")}</span>
            </button>
            <button
              id="time-range-7d"
              type="button"
              onClick={() => setTimeRange("7d")}
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs transition-all cursor-pointer ${
                timeRange === "7d"
                  ? "bg-blue-600 text-white font-semibold shadow-sm shadow-blue-500/20"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Calendar className="h-3 w-3" />
              <span>{t("timeRange7d")}</span>
            </button>
          </div>

          {/* Live Badge */}
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-mono font-medium shadow-sm">
            <span className="h-2 w-2 rounded-full bg-emerald-400 glow-online animate-pulse" />
            <span>{t("live")}</span>
          </div>

          {/* Last Updated */}
          <div className="text-[11px] font-mono text-slate-400 hidden xl:inline">
            <span className="text-slate-300 font-medium">{formattedNow}</span>
          </div>
        </div>
      </div>

      {/* 2. 6 KPI Cards (Spacious, prominent) */}
      <OverviewKPI 
        sites={sites} 
        devices={devices} 
        selectedSite={selectedSiteFilter} 
      />

      {/* 3. Middle Section: Vietnam Factory Map (Left 7/12) + 7 Factories Status Table (Right 5/12) - EQUAL HEIGHT */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 items-stretch">
        {/* Left Column: Vietnam Factory Map (7/12) */}
        <div className="lg:col-span-7 xl:col-span-7 h-[440px] xl:h-[460px]">
          <VietnamFactoryMap
            sites={sites}
            selectedSite={selectedSiteFilter}
            onSelectSite={(siteCode) => {
              setSelectedSiteFilter(siteCode);
              setHoveredSite(siteCode);
            }}
            hoveredSite={hoveredSite}
            onHoverSite={setHoveredSite}
          />
        </div>

        {/* Right Column: 7 Factories Status Table (5/12) - EQUAL HEIGHT to Map */}
        <div className="lg:col-span-5 xl:col-span-5 h-[440px] xl:h-[460px]">
          <div className="h-full w-full rounded-2xl border border-slate-800/80 bg-[#0B1322] p-4 text-card-foreground shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
                <div className="flex items-center gap-2.5">
                  <div className="h-8 w-8 rounded-xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-400">
                    <Factory className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white font-display leading-tight">
                      {t("factoryStatusTitle")}
                    </h3>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {selectedSiteFilter === "ALL" ? t("factories7") : siteMap.get(selectedSiteFilter)?.site_name}
                    </p>
                  </div>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800/80 text-slate-400 border border-slate-700/50">
                  {t("priorityErrorsFirst")}
                </span>
              </div>

              {/* 7 Factories Table with Centered Numbers & No Distribution */}
              <div className="overflow-x-auto mt-2">
                <table className="w-full text-left text-xs font-sans">
                  <thead>
                    <tr className="border-b border-slate-800/80 text-slate-400 font-mono text-[11px]">
                      <th className="py-2 xl:py-2.5 px-3 font-semibold whitespace-nowrap">{t("colFactoryAgent")}</th>
                      <th className="py-2 xl:py-2.5 px-2 text-center font-semibold text-emerald-400 whitespace-nowrap">{t("colOnline")}</th>
                      <th className="py-2 xl:py-2.5 px-2 text-center font-semibold text-amber-400 whitespace-nowrap">{t("colSlow")}</th>
                      <th className="py-2 xl:py-2.5 px-2 text-center font-semibold text-red-400 whitespace-nowrap">{t("colOffline")}</th>
                      <th className="py-2 xl:py-2.5 px-2 text-center font-semibold text-rose-400 whitespace-nowrap" title="Script tắt bất ngờ do mất điện / Mất Agent">{t("colDown")}</th>
                      <th className="py-2 xl:py-2.5 px-3 text-center font-semibold text-slate-300 whitespace-nowrap">{t("colTotal")}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/40">
                    {sortedSites.map((site) => {
                      const isAgentOnline = site.agent_status === "online";
                      const isSelected = selectedSiteFilter === site.site_code;
                      const isRowHovered = hoveredSite ? hoveredSite === site.site_code : isSelected;

                      // Calculate statuses: Online, Slow, Offline, Down
                      const siteLan = lanDevices.filter((d) => d.site_code === site.site_code);
                      let onlineCount = 0;
                      let slowCount = 0;
                      let offlineCount = 0;
                      let downCount = 0;

                      if (!isAgentOnline) {
                        downCount = siteLan.length > 0 ? siteLan.length : (site.device_stats?.total || 0);
                        onlineCount = 0;
                        slowCount = 0;
                        offlineCount = 0;
                      } else {
                        if (siteLan.length > 0) {
                          siteLan.forEach((d) => {
                            if (d.status === "online") onlineCount++;
                            else if (d.status === "slow") slowCount++;
                            else if (d.status === "offline") offlineCount++;
                            else downCount++;
                          });
                        } else if (site.device_stats) {
                          onlineCount = site.device_stats.online || 0;
                          slowCount = site.device_stats.slow || 0;
                          offlineCount = site.device_stats.offline || 0;
                          downCount = 0;
                        }
                      }

                      const totalLanCount = onlineCount + slowCount + offlineCount + downCount;

                      return (
                        <tr
                          key={site.site_code}
                          onClick={() => {
                            if (selectedSiteFilter === site.site_code) {
                              onSelectSite(site.site_code);
                            } else {
                              setSelectedSiteFilter(site.site_code);
                              setHoveredSite(site.site_code);
                            }
                          }}
                          onMouseEnter={() => setHoveredSite(site.site_code)}
                          onMouseLeave={() => setHoveredSite(null)}
                          className={`transition-colors cursor-pointer group ${
                            isSelected
                              ? "bg-blue-600/25 border-l-2 border-cyan-400 shadow-sm"
                              : isRowHovered
                              ? "bg-slate-800/60"
                              : "hover:bg-slate-900/60"
                          }`}
                        >
                          {/* Factory name + Merged Agent Status */}
                          <td className="py-2.5 xl:py-3 px-3 font-medium text-white group-hover:text-primary transition-colors">
                            <div className="flex flex-col">
                              <span className={`font-semibold text-xs leading-tight whitespace-nowrap ${
                                isSelected ? "text-cyan-300 font-bold" : ""
                              }`}>
                                {site.site_name}
                              </span>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <span
                                  className={`h-1.5 w-1.5 rounded-full ${
                                    isAgentOnline
                                      ? "bg-emerald-400 glow-online"
                                      : "bg-red-500"
                                  }`}
                                />
                                <span className={`text-[10px] font-mono leading-none ${
                                  isAgentOnline ? "text-emerald-400" : "text-red-400"
                                }`}>
                                  {isAgentOnline ? t("agentStatusOnline") : t("agentStatusOffline")}
                                </span>
                              </div>
                            </div>
                          </td>

                          {/* 5 Counts: Online, Slow, Offline, Down, Total - Centered */}
                          <td className="py-2.5 xl:py-3 px-2 text-center font-mono text-emerald-400 font-semibold text-xs">
                            {onlineCount}
                          </td>
                          <td className="py-2.5 xl:py-3 px-2 text-center font-mono text-amber-400 font-semibold text-xs">
                            {slowCount}
                          </td>
                          <td className="py-2.5 xl:py-3 px-2 text-center font-mono text-red-400 font-semibold text-xs" title="Thiết bị mất mạng">
                            {offlineCount}
                          </td>
                          <td className="py-2.5 xl:py-3 px-2 text-center font-mono text-rose-400 font-semibold text-xs" title="Script tắt bất ngờ do mất điện / Mất Agent">
                            {downCount}
                          </td>
                          <td className="py-2.5 xl:py-3 px-3 text-center font-mono text-slate-200 font-bold text-xs">
                            {totalLanCount}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Quick status summary footer */}
            <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 pt-3 border-t border-slate-800/80 mt-2">
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-emerald-400" />
                <span>{t("colOnline")}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-amber-400" />
                <span>{t("colSlow")}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-red-400" />
                <span>{t("colOffline")}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-rose-500" />
                <span>{t("colDown")}</span>
              </div>
              <span className="text-slate-500 hidden sm:inline">* Click để lọc / chọn</span>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Bottom Section: 3 Balanced Cards (Longest Downtime + Flapping Devices + Uptime SLA) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3.5 items-stretch">
        {/* Card 1: Longest Downtime (Thiết kế đúng 100% như Hình 2, hiển thị đầy đủ bảng không cần cuộn ngang) */}
        <div className="rounded-2xl border border-slate-800/80 bg-[#0B1322] p-3.5 text-card-foreground shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
              <div className="flex items-center gap-2">
                <div className="h-7 w-7 rounded-lg bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-500">
                  <Clock className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white font-display leading-none">
                    {t("longestDowntimeTitle")}
                  </h3>
                  <span className="text-[10px] font-mono text-slate-400 mt-0.5 inline-block">
                    {t("unresolvedOutage")}
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-1.5 overflow-x-auto scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent pb-1">
              {displayedLongestDowntime.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-400 flex flex-col items-center justify-center">
                  <CheckCircle2 className="h-6 w-6 text-emerald-400 mb-1 opacity-80" />
                  <span className="text-emerald-400 font-medium">{t("noDowntimeAlerts")}</span>
                </div>
              ) : (
                <table className="w-full text-left text-xs font-sans">
                  <thead>
                    <tr className="border-b border-slate-800/60 text-slate-400 font-mono text-[10px]">
                      <th className="py-1.5 px-1.5 text-center w-6">#</th>
                      <th className="py-1.5 px-2.5 font-semibold whitespace-nowrap">{t("colDevice")}</th>
                      <th className="py-1.5 px-2 font-semibold whitespace-nowrap">{t("colDownSince")}</th>
                      <th className="py-1.5 px-2.5 font-semibold text-slate-400 whitespace-nowrap">{t("colTrend")}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/40">
                    {displayedLongestDowntime.map((item, idx) => (
                      <tr
                        key={idx}
                        onClick={() => onSelectSite(item.siteCode)}
                        className="hover:bg-slate-900/60 transition-colors cursor-pointer group"
                      >
                        {/* Rank # with colored border indicator as in Image 2 */}
                        <td className="py-2 px-1.5 text-center font-mono font-bold text-[11px]">
                          <span className={`inline-block w-full text-center ${
                            idx === 0
                              ? "border-l-2 border-rose-500 text-rose-500"
                              : idx === 1
                              ? "border-l-2 border-amber-500 text-amber-500"
                              : idx === 2
                              ? "border-l-2 border-yellow-500 text-yellow-500"
                              : "text-slate-400"
                          }`}>
                            {idx + 1}
                          </span>
                        </td>
                        <td className="py-2 px-2.5 font-semibold text-white group-hover:text-primary transition-colors whitespace-nowrap">
                          {item.hostname}
                        </td>
                        <td className="py-2 px-2 font-mono text-slate-400 text-[11px] whitespace-nowrap">
                          {item.downSince}
                        </td>
                        {/* Sơ đồ Trend Duration Bar as in Image 2 */}
                        <td className="py-2 px-2.5 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <div className="w-16 sm:w-20 h-1.5 rounded-full bg-slate-800 overflow-hidden">
                              <div
                                className="h-full rounded-full bg-rose-500 transition-all duration-300"
                                style={{ width: `${item.trendPct}%` }}
                              />
                            </div>
                            <span className="text-[10px] font-mono text-slate-400 text-right font-medium">
                              {item.trendPct}%
                            </span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          <div className="text-[10px] text-slate-500 font-mono flex items-center gap-1.5 pt-2 border-t border-slate-800/80 mt-1">
            <Info className="h-3 w-3 text-slate-500 shrink-0" />
            <span className="truncate">{t("longestDowntimeFooter")}</span>
          </div>
        </div>

        {/* Card 2: Flapping Devices — Thiết bị mất kết nối liên tục (Đầy đủ bảng không cần cuộn ngang) */}
        <div className="rounded-2xl border border-slate-800/80 bg-[#0B1322] p-3.5 text-card-foreground shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
              <div className="flex items-center gap-2">
                <div className="h-7 w-7 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
                  <Activity className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white font-display leading-none">
                    {t("flappingDevicesTitle")}
                  </h3>
                  <span className="text-[10px] font-mono text-amber-400/90 mt-0.5 inline-block">
                    {t("flappingFrequency")}
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-1.5 overflow-x-auto scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent pb-1">
              {displayedFlappingDevices.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-400 flex flex-col items-center justify-center">
                  <CheckCircle2 className="h-6 w-6 text-emerald-400 mb-1 opacity-80" />
                  <span className="text-emerald-400 font-medium">{t("noFlappingDevices")}</span>
                  <span className="text-[10px] text-slate-500 mt-0.5">Tất cả thiết bị kết nối ổn định</span>
                </div>
              ) : (
                <table className="w-full text-left text-xs font-sans">
                  <thead>
                    <tr className="border-b border-slate-800/60 text-slate-400 font-mono text-[10px]">
                      <th className="py-1.5 px-1.5 text-center w-6">#</th>
                      <th className="py-1.5 px-2.5 font-semibold whitespace-nowrap">{t("colDevice")}</th>
                      <th className="py-1.5 px-2.5 font-semibold whitespace-nowrap">{t("colSite")}</th>
                      <th className="py-1.5 px-2.5 font-semibold text-slate-400 whitespace-nowrap">{t("colPulseDiagram")}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/40">
                    {displayedFlappingDevices.map((item, idx) => (
                      <tr
                        key={idx}
                        onClick={() => onSelectSite(item.siteCode)}
                        className="hover:bg-slate-900/60 transition-colors cursor-pointer group"
                      >
                        {/* Rank # with colored rank indicator */}
                        <td className="py-2 px-1.5 text-center font-mono font-bold text-[11px]">
                          <span className={`inline-block w-full text-center ${
                            idx === 0
                              ? "border-l-2 border-amber-500 text-amber-500"
                              : idx === 1
                              ? "border-l-2 border-yellow-500 text-yellow-500"
                              : "text-slate-400"
                          }`}>
                            {idx + 1}
                          </span>
                        </td>
                        <td className="py-2 px-2.5 font-semibold text-white group-hover:text-primary transition-colors whitespace-nowrap">
                          {item.hostname}
                        </td>
                        <td className="py-2 px-2.5 text-slate-300 font-medium whitespace-nowrap text-[11px]">
                          {item.siteName}
                        </td>
                        {/* Sơ đồ Flapping Frequency Bar */}
                        <td className="py-2 px-2.5 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <div className="w-16 sm:w-20 h-1.5 rounded-full bg-slate-800 overflow-hidden">
                              <div
                                className="h-full rounded-full bg-gradient-to-r from-amber-400 to-rose-500 transition-all duration-300"
                                style={{ width: `${item.trendPct}%` }}
                              />
                            </div>
                            <span className="text-[10px] font-mono text-amber-400 text-right font-medium">
                              {item.trendPct}%
                            </span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          <div className="text-[10px] text-slate-500 font-mono flex items-center gap-1.5 pt-2 border-t border-slate-800/80 mt-1">
            <Info className="h-3 w-3 text-slate-500 shrink-0" />
            <span className="truncate">{t("flappingDevicesFooter")}</span>
          </div>
        </div>

        {/* Card 3: Uptime SLA Chart (Last 24h / 7d) - Scaled to fill entire card height */}
        <div className="rounded-2xl border border-slate-800/80 bg-[#0B1322] p-3.5 text-card-foreground shadow-sm flex flex-col justify-between h-full">
          <div>
            <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
              <div className="flex items-center gap-2">
                <div className={`h-7 w-7 rounded-lg ${
                  overallUptime >= 90 ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-400" : "bg-rose-500/15 border-rose-500/30 text-rose-400"
                } border flex items-center justify-center`}>
                  {overallUptime >= 90 ? (
                    <ShieldCheck className="h-4 w-4" />
                  ) : (
                    <ShieldAlert className="h-4 w-4" />
                  )}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white font-display leading-none">
                    {timeRange === "24h" ? t("uptimeTitle24h") : t("uptimeTitle7d")}
                  </h3>
                  <span className={`text-[10px] font-mono font-semibold ${uptimeColorClass} mt-0.5 inline-block`}>
                    {overallUptime}% {t("slaAvailable")}
                  </span>
                </div>
              </div>

              <span className="text-[10px] font-mono text-slate-400">
                {selectedSiteFilter === "ALL" ? t("factories7") : siteMap.get(selectedSiteFilter)?.site_name}
              </span>
            </div>
          </div>

          {/* Dynamic SVG Area Chart - Scaled up to fill the card vertical space */}
          <div className="flex-1 flex flex-col justify-center py-2">
            <div className="relative w-full h-36 sm:h-40">
              <svg viewBox="0 0 400 155" className="w-full h-full overflow-visible">
                <defs>
                  <linearGradient id="uptimeAreaGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor={uptimeStroke} stopOpacity="0.4" />
                    <stop offset="100%" stopColor={uptimeStroke} stopOpacity="0.0" />
                  </linearGradient>
                </defs>

                {/* Grid Lines */}
                <line x1="35" y1="14" x2="395" y2="14" stroke="#1E293B" strokeWidth="0.8" strokeDasharray="3 3" />
                <line x1="35" y1="76" x2="395" y2="76" stroke="#1E293B" strokeWidth="0.8" strokeDasharray="3 3" />
                <line x1="35" y1="138" x2="395" y2="138" stroke="#1E293B" strokeWidth="0.8" />

                {/* Y Axis Labels */}
                <text x="3" y="18" fill="#64748B" fontSize="9" fontFamily="monospace">100%</text>
                <text x="10" y="80" fill="#64748B" fontSize="9" fontFamily="monospace">50%</text>
                <text x="18" y="142" fill="#64748B" fontSize="9" fontFamily="monospace">0%</text>

                {/* Real Area & Real Line */}
                <path d={areaPath} fill="url(#uptimeAreaGrad)" />
                <path d={linePath} fill="none" stroke={uptimeStroke} strokeWidth="2.4" />

                {/* Real Data Points */}
                {chartPoints.map((pt, idx) => {
                  const isLast = idx === chartPoints.length - 1;
                  return (
                    <circle
                      key={idx}
                      cx={pt.x}
                      cy={pt.y}
                      r={isLast ? 3.5 : 2.5}
                      fill={uptimeStroke}
                      stroke="#0B1322"
                      strokeWidth="1.5"
                      className={isLast ? "animate-pulse" : "hover:r-4 transition-all"}
                    >
                      <title>{`${pt.pt.time} - Uptime: ${pt.pt.uptime_pct}% (Online: ${pt.pt.online}, Latency: ${pt.pt.avg_latency_ms || 0}ms)`}</title>
                    </circle>
                  );
                })}
              </svg>
            </div>

            {/* Dynamic X Axis Time Labels */}
            <div className="flex justify-between text-[10px] font-mono text-slate-400 pl-8 pr-1 mt-1.5">
              {xAxisLabels.map((lbl, idx) => (
                <span key={idx}>{lbl}</span>
              ))}
            </div>
          </div>

          <div className="text-[10px] text-slate-500 font-mono text-center pt-2 border-t border-slate-800/80">
            * {t("uptimeNotice")}
          </div>
        </div>
      </div>
    </div>
  );
};
