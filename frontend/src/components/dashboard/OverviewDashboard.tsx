import { useState, useMemo } from "react";
import type { FC } from "react";
import { 
  Factory, 
  Calendar, 
  Clock,
  ArrowRight, 
  ShieldCheck, 
  Gauge, 
  CheckCircle2
} from "lucide-react";
import type { Site, Device } from "../../types";
import { OverviewKPI } from "./OverviewKPI";
import { VietnamFactoryMap } from "./VietnamFactoryMap";
import { useUptimeHistory } from "../../hooks/useNetworkData";
import { isWanDevice, getEffectiveDeviceStatus, formatVietnamDateTime, formatRelativeVietnamTime } from "../../lib/utils";
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
  onNavigateView,
}) => {
  const { t } = useI18n();
  const [hoveredSite, setHoveredSite] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<string>("24h");
  
  // 1. Global Site Filter at top of page (applies to all blocks)
  const [selectedSiteFilter, setSelectedSiteFilter] = useState<string>("ALL");

  // TanStack Query: Fetch real telemetry uptime history for selected site
  const { data: uptimeData } = useUptimeHistory(selectedSiteFilter, timeRange);

  // Current formatted timestamp in Vietnam Timezone
  const now = new Date();
  const formattedNow = formatVietnamDateTime(now);

  // Map site agent status for quick lookup
  const siteMap = useMemo(() => new Map(sites.map((s) => [s.site_code, s])), [sites]);

  // Local LAN devices only (excluding WAN test targets)
  const lanDevices = useMemo(() => devices.filter((d) => !isWanDevice(d)), [devices]);

  // Active filtered devices based on global site filter
  const activeLanDevices = useMemo(() => {
    if (selectedSiteFilter === "ALL") return lanDevices;
    return lanDevices.filter((d) => d.site_code === selectedSiteFilter);
  }, [lanDevices, selectedSiteFilter]);

  // Active Incidents: Devices that are currently confirmed OFFLINE or UNKNOWN (Monitor Down)
  const activeIncidentsList = useMemo(() => {
    return activeLanDevices
      .map((d) => {
        const siteObj = siteMap.get(d.site_code);
        const effStatus = getEffectiveDeviceStatus(d, siteObj?.agent_status);
        const downSinceStr = formatRelativeVietnamTime(d.last_seen, t);

        return {
          device: d,
          hostname: d.hostname || `Host-${d.ip}`,
          ip: d.ip,
          siteCode: d.site_code,
          siteName: siteObj?.site_name || d.site_code,
          effectiveStatus: effStatus,
          downSince: downSinceStr,
          agentStatus: siteObj?.agent_status || "offline",
        };
      })
      .filter((item) => item.effectiveStatus === "offline" || item.effectiveStatus === "unknown")
      .slice(0, 5);
  }, [activeLanDevices, siteMap, t]);

  // Slowest & Flapping Devices (New widget replacing duplicate Donut chart)
  const slowestDevicesList = useMemo(() => {
    return activeLanDevices
      .filter((d) => {
        const siteObj = siteMap.get(d.site_code);
        const effStatus = getEffectiveDeviceStatus(d, siteObj?.agent_status);
        return effStatus === "slow" || (effStatus === "online" && (d.response_time_ms || 0) > 0);
      })
      .sort((a, b) => (b.response_time_ms || 0) - (a.response_time_ms || 0))
      .slice(0, 5);
  }, [activeLanDevices, siteMap]);

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

  // Dynamic SVG Coordinates calculation for Uptime Area Chart
  const chartPoints = useMemo(() => {
    if (dataPoints.length === 0) return [];
    const minX = 42;
    const maxX = 390;
    const minY = 18; // 100%
    const maxY = 100; // 0%
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
    if (chartPoints.length === 0) {
      return {
        linePath: "M 42 20 L 390 20",
        areaPath: "M 42 20 L 390 20 L 390 100 L 42 100 Z",
      };
    }
    if (chartPoints.length === 1) {
      const y = chartPoints[0].y;
      return {
        linePath: `M 42 ${y} L 390 ${y}`,
        areaPath: `M 42 ${y} L 390 ${y} L 390 100 L 42 100 Z`,
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
    const area = `${line} L ${last.x} 100 L ${first.x} 100 Z`;

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

  return (
    <div className="space-y-4">
      {/* 1. Page Header (Outside) + Controls (Filter + Time Range + Live) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold font-display text-white tracking-tight leading-none">
            {t("overview")}
          </h1>
          <p className="text-xs text-slate-400 mt-1.5">
            {t("overviewSubtitle")}
          </p>
        </div>

        {/* Right side controls: Lọc nhà máy, 24h/7d, Live status */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* GLOBAL FACTORY FILTER (Applies to all blocks) */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#0B1322] border border-slate-800/80 shadow-sm">
            <label htmlFor="global-site-filter" className="text-xs text-slate-400 font-medium whitespace-nowrap cursor-pointer">{t("filterFactory")}</label>
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

      {/* 2. 6 Compact KPI Cards (Reflecting selectedSiteFilter & excluding WAN) */}
      <OverviewKPI 
        sites={sites} 
        devices={devices} 
        selectedSite={selectedSiteFilter} 
      />

      {/* 3. Middle Section: Vietnam Factory Map (Left) + Factory Status (Right with Stacked Bars) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
        {/* Left Column: Vietnam Factory Map (approx 52%) */}
        <div className="lg:col-span-7 xl:col-span-7 flex flex-col">
          <VietnamFactoryMap
            sites={sites}
            selectedSite={selectedSiteFilter}
            onSelectSite={(siteCode) => setSelectedSiteFilter(siteCode)}
            hoveredSite={hoveredSite}
            onHoverSite={setHoveredSite}
          />
        </div>

        {/* Right Column: Factory Status Table with Stacked Bar & Merged Agent Status */}
        <div className="lg:col-span-5 xl:col-span-5 flex flex-col">
          <div className="rounded-2xl border border-slate-800/80 bg-[#0B1322] p-4 text-card-foreground shadow-sm flex flex-col h-full justify-between">
            <div>
              <div className="flex items-center justify-between pb-2.5 border-b border-slate-800/80">
                <div className="flex items-center gap-2">
                  <Factory className="h-4 w-4 text-blue-400" />
                  <h3 className="text-sm font-bold text-white font-display">
                    {t("factoryStatusTitle")}
                  </h3>
                </div>
                <span className="text-[10px] font-mono text-slate-400">
                  {t("priorityErrorsFirst")}
                </span>
              </div>

              <div className="overflow-x-auto mt-2">
                <table className="w-full text-left text-xs font-sans">
                  <thead>
                    <tr className="border-b border-slate-800/60 text-slate-400 font-mono text-[11px]">
                      <th className="py-2 px-2.5 font-semibold whitespace-nowrap">{t("colFactoryAgent")}</th>
                      <th className="py-2 px-2 text-center font-semibold whitespace-nowrap">{t("colDistribution")}</th>
                      <th className="py-2 px-2 text-right font-semibold text-emerald-400 whitespace-nowrap">{t("colOnline")}</th>
                      <th className="py-2 px-2 text-right font-semibold text-amber-400 whitespace-nowrap">{t("colSlow")}</th>
                      <th className="py-2 px-2 text-right font-semibold text-red-400 whitespace-nowrap">{t("colOffline")}</th>
                      <th className="py-2 px-2 text-right font-semibold text-purple-400 whitespace-nowrap">{t("colUnknown")}</th>
                      <th className="py-2 px-2 text-right font-semibold whitespace-nowrap">{t("colTotal")}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/40">
                    {sortedSites.map((site) => {
                      const isAgentOnline = site.agent_status === "online";
                      const isHovered = hoveredSite === site.site_code;
                      const isFiltered = selectedSiteFilter === site.site_code;

                      // Calculate 4 statuses for local LAN devices only:
                      const siteLan = lanDevices.filter((d) => d.site_code === site.site_code);
                      let onlineCount = 0;
                      let slowCount = 0;
                      let offlineCount = 0;
                      let unknownCount = 0;

                      if (!isAgentOnline) {
                        // When Agent is offline: all devices are UNKNOWN (Monitor Down)
                        unknownCount = siteLan.length || site.device_stats?.total || 0;
                      } else {
                        siteLan.forEach((d) => {
                          if (d.status === "online") onlineCount++;
                          else if (d.status === "slow") slowCount++;
                          else if (d.status === "offline") offlineCount++;
                          else unknownCount++;
                        });
                      }

                      const totalLanCount = onlineCount + slowCount + offlineCount + unknownCount;
                      const onlinePct = totalLanCount > 0 ? (onlineCount / totalLanCount) * 100 : 0;
                      const slowPct = totalLanCount > 0 ? (slowCount / totalLanCount) * 100 : 0;
                      const offlinePct = totalLanCount > 0 ? (offlineCount / totalLanCount) * 100 : 0;
                      const unknownPct = totalLanCount > 0 ? (unknownCount / totalLanCount) * 100 : 0;

                      return (
                        <tr
                          key={site.site_code}
                          onClick={() => onSelectSite(site.site_code)}
                          onMouseEnter={() => setHoveredSite(site.site_code)}
                          onMouseLeave={() => setHoveredSite(null)}
                          className={`transition-colors cursor-pointer group ${
                            isFiltered
                              ? "bg-blue-600/15"
                              : isHovered
                              ? "bg-slate-800/60"
                              : "hover:bg-slate-900/60"
                          }`}
                        >
                          {/* Factory name + Merged Agent Status */}
                          <td className="py-2 px-2.5 font-medium text-white group-hover:text-primary transition-colors">
                            <div className="flex flex-col">
                              <span className="font-semibold text-xs leading-tight whitespace-nowrap">
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

                          {/* Stacked Colored Bar */}
                          <td className="py-2 px-2 text-center align-middle">
                            <div 
                              className="w-20 h-2 mx-auto rounded-full bg-slate-800 overflow-hidden flex shadow-inner"
                              title={`${t("colOnline")}: ${onlineCount}, ${t("colSlow")}: ${slowCount}, ${t("colOffline")}: ${offlineCount}, ${t("colUnknown")}: ${unknownCount}`}
                            >
                              {onlinePct > 0 && <div style={{ width: `${onlinePct}%` }} className="h-full bg-emerald-400" />}
                              {slowPct > 0 && <div style={{ width: `${slowPct}%` }} className="h-full bg-amber-400" />}
                              {offlinePct > 0 && <div style={{ width: `${offlinePct}%` }} className="h-full bg-red-500" />}
                              {unknownPct > 0 && <div style={{ width: `${unknownPct}%` }} className="h-full bg-purple-500" />}
                            </div>
                          </td>

                          {/* 4 Counts: Online, Slow, Offline, Unknown */}
                          <td className="py-2 px-2 text-right font-mono text-emerald-400 font-medium">
                            {onlineCount}
                          </td>
                          <td className="py-2 px-2 text-right font-mono text-amber-400 font-medium">
                            {slowCount}
                          </td>
                          <td className="py-2 px-2 text-right font-mono text-red-400 font-medium">
                            {offlineCount}
                          </td>
                          <td className="py-2 px-2 text-right font-mono text-purple-400 font-medium">
                            {unknownCount}
                          </td>
                          <td className="py-2 px-2 text-right font-mono text-slate-300 font-semibold">
                            {totalLanCount}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Stacked Bar Legend */}
            <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 pt-2 border-t border-slate-800/80 mt-2">
              <div className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-emerald-400" />
                <span>{t("colOnline")}</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-amber-400" />
                <span>{t("colSlow")}</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-red-500" />
                <span>{t("colOffline")}</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-purple-500" />
                <span>{t("colUnknown")}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Bottom Grid: 3 focused, actionable widgets (No duplicate Donut, No duplicate Agent Health) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-stretch">
        {/* Widget 1: Sự cố đang xảy ra / Active Incidents */}
        <div className="rounded-2xl border border-slate-800/80 bg-[#0B1322] p-4 text-card-foreground shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-2.5 border-b border-slate-800/80">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-red-500 animate-ping" />
                <h3 className="text-sm font-bold text-white font-display">
                  {t("activeIncidentsTitle")}
                </h3>
              </div>
              <button
                onClick={() => onNavigateView("notifications")}
                className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 font-medium transition-colors cursor-pointer"
              >
                <span>{t("viewAll")}</span>
                <ArrowRight className="h-3 w-3" />
              </button>
            </div>

            <div className="overflow-x-auto mt-2">
              {activeIncidentsList.length === 0 ? (
                <div className="py-7 text-center text-xs text-slate-400 flex flex-col items-center justify-center">
                  <CheckCircle2 className="h-6 w-6 text-emerald-400 mb-1 opacity-80" />
                  <span className="text-emerald-400 font-medium">{t("noActiveIncidents")}</span>
                  <span className="text-[11px] text-slate-500 mt-0.5">{t("allNormalAlerts")}</span>
                </div>
              ) : (
                <table className="w-full text-left text-xs font-sans">
                  <thead>
                    <tr className="border-b border-slate-800/60 text-slate-400 font-mono text-[11px]">
                      <th className="py-1.5 px-2 font-semibold whitespace-nowrap">{t("colDevice")}</th>
                      <th className="py-1.5 px-2 font-semibold whitespace-nowrap">{t("ipAddressHeader")}</th>
                      <th className="py-1.5 px-2 font-semibold whitespace-nowrap">{t("colSite")}</th>
                      <th className="py-1.5 px-2 font-semibold whitespace-nowrap">{t("colDownSince")}</th>
                      <th className="py-1.5 px-2 text-right font-semibold whitespace-nowrap">{t("colStatus")}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/40">
                    {activeIncidentsList.map((item, idx) => (
                      <tr
                        key={idx}
                        onClick={() => onSelectSite(item.siteCode)}
                        className="hover:bg-slate-900/60 transition-colors cursor-pointer group"
                      >
                        <td className="py-1.5 px-2 font-medium text-white group-hover:text-primary transition-colors truncate max-w-[100px]">
                          {item.hostname}
                        </td>
                        <td className="py-1.5 px-2 font-mono text-cyan-400 whitespace-nowrap text-[11px]">
                          {item.ip}
                        </td>
                        <td className="py-1.5 px-2 text-slate-300 truncate max-w-[90px] text-[11px]">
                          {item.siteName}
                        </td>
                        <td className="py-1.5 px-2 font-mono text-slate-400 text-[10px] whitespace-nowrap">
                          {item.downSince}
                        </td>
                        <td className="py-1.5 px-2 text-right whitespace-nowrap">
                          {item.effectiveStatus === "offline" ? (
                            <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-red-500/15 text-red-400 border border-red-500/25">
                              {t("offline")}
                            </span>
                          ) : (
                            <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-purple-500/15 text-purple-300 border border-purple-500/25" title={t("cardUnknownAgentDown")}>
                              {t("colUnknown").toUpperCase()}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          <div className="text-[10px] text-slate-500 font-mono text-center pt-2 border-t border-slate-800/80 mt-1">
            {t("activeIncidentsFooter")}
          </div>
        </div>

        {/* Widget 2: Thiết bị chậm nhất & Chập chờn / Slowest Devices (Replacing duplicate Donut) */}
        <div className="rounded-2xl border border-slate-800/80 bg-[#0B1322] p-4 text-card-foreground shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-2.5 border-b border-slate-800/80">
              <div className="flex items-center gap-2">
                <Gauge className="h-4 w-4 text-amber-400" />
                <h3 className="text-sm font-bold text-white font-display">
                  {t("slowestDevicesTitle")}
                </h3>
              </div>
              <span className="text-[10px] font-mono text-amber-400/80">
                {t("latencyRanking")}
              </span>
            </div>

            <div className="overflow-x-auto mt-2">
              {slowestDevicesList.length === 0 ? (
                <div className="py-7 text-center text-xs text-slate-400 flex flex-col items-center justify-center">
                  <CheckCircle2 className="h-6 w-6 text-emerald-400 mb-1 opacity-80" />
                  <span className="text-emerald-400 font-medium">{t("noSlowDevices")}</span>
                  <span className="text-[11px] text-slate-500 mt-0.5">{t("optimalLatency")}</span>
                </div>
              ) : (
                <table className="w-full text-left text-xs font-sans">
                  <thead>
                    <tr className="border-b border-slate-800/60 text-slate-400 font-mono text-[11px]">
                      <th className="py-1.5 px-2 font-semibold">{t("colDevice")}</th>
                      <th className="py-1.5 px-2 font-semibold">{t("ipAddressHeader")}</th>
                      <th className="py-1.5 px-2 font-semibold">{t("colSite")}</th>
                      <th className="py-1.5 px-2 text-right font-semibold text-amber-400">{t("colLatency")}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/40">
                    {slowestDevicesList.map((dev, idx) => {
                      const siteObj = siteMap.get(dev.site_code);
                      return (
                        <tr
                          key={idx}
                          onClick={() => onSelectSite(dev.site_code)}
                          className="hover:bg-slate-900/60 transition-colors cursor-pointer group"
                        >
                          <td className="py-1.5 px-2 font-medium text-white group-hover:text-primary transition-colors truncate max-w-[110px]">
                            {dev.hostname || `Host-${dev.ip}`}
                          </td>
                          <td className="py-1.5 px-2 font-mono text-cyan-400 whitespace-nowrap text-[11px]">
                            {dev.ip}
                          </td>
                          <td className="py-1.5 px-2 text-slate-300 truncate max-w-[90px] text-[11px]">
                            {siteObj?.site_name || dev.site_code}
                          </td>
                          <td className="py-1.5 px-2 text-right font-mono font-bold text-amber-400 whitespace-nowrap">
                            ⚡ {dev.response_time_ms ? `${dev.response_time_ms} ms` : t("slow")}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          <div className="text-[10px] text-slate-500 font-mono text-center pt-2 border-t border-slate-800/80 mt-1">
            {t("slowestDevicesFooter")}
          </div>
        </div>

        {/* Widget 3: Real Telemetry Uptime Chart (24h / 7d) with Data Gap Handling */}
        <div className="rounded-2xl border border-slate-800/80 bg-[#0B1322] p-4 text-card-foreground shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-2.5 border-b border-slate-800/80">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-emerald-400" />
                <div>
                  <h3 className="text-sm font-bold text-white font-display">
                    {timeRange === "24h" ? t("uptimeTitle24h") : t("uptimeTitle7d")}
                  </h3>
                  <span className="text-[10px] font-mono text-emerald-400 font-semibold">
                    {uptimeData?.overall_uptime_pct ?? 100}% {t("slaAvailable")}
                  </span>
                </div>
              </div>

              <span className="text-[10px] font-mono text-slate-400">
                {selectedSiteFilter === "ALL" ? t("factories7") : siteMap.get(selectedSiteFilter)?.site_name}
              </span>
            </div>

            {/* Dynamic SVG Area Chart from Real Backend Data */}
            <div className="relative w-full h-36 mt-2">
              <svg viewBox="0 0 400 120" className="w-full h-full overflow-visible">
                <defs>
                  <linearGradient id="uptimeAreaGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#10B981" stopOpacity="0.4" />
                    <stop offset="100%" stopColor="#10B981" stopOpacity="0.0" />
                  </linearGradient>
                </defs>

                {/* Grid Lines */}
                <line x1="40" y1="20" x2="390" y2="20" stroke="#1E293B" strokeWidth="0.8" strokeDasharray="3 3" />
                <line x1="40" y1="60" x2="390" y2="60" stroke="#1E293B" strokeWidth="0.8" strokeDasharray="3 3" />
                <line x1="40" y1="100" x2="390" y2="100" stroke="#1E293B" strokeWidth="0.8" />

                {/* Y Axis Labels */}
                <text x="5" y="24" fill="#64748B" fontSize="9" fontFamily="monospace">100%</text>
                <text x="12" y="64" fill="#64748B" fontSize="9" fontFamily="monospace">50%</text>
                <text x="22" y="104" fill="#64748B" fontSize="9" fontFamily="monospace">0%</text>

                {/* Real Area & Real Line */}
                <path d={areaPath} fill="url(#uptimeAreaGrad)" />
                <path d={linePath} fill="none" stroke="#10B981" strokeWidth="2.2" />

                {/* Real Data Points */}
                {chartPoints.map((pt, idx) => {
                  const isLast = idx === chartPoints.length - 1;
                  return (
                    <circle
                      key={idx}
                      cx={pt.x}
                      cy={pt.y}
                      r={isLast ? 3.5 : 2.5}
                      fill="#10B981"
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
            <div className="flex justify-between text-[10px] font-mono text-slate-400 pl-8 pr-1 mt-1">
              {xAxisLabels.map((lbl, idx) => (
                <span key={idx}>{lbl}</span>
              ))}
            </div>
          </div>

          <div className="text-[10px] text-slate-500 font-mono text-center pt-2 border-t border-slate-800/80 mt-1">
            * {t("uptimeNotice")}
          </div>
        </div>
      </div>
    </div>
  );
};
