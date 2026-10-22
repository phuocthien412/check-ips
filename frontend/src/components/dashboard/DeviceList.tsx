import { useState, useMemo, useEffect } from "react";
import type { FC, MouseEvent } from "react";
import { 
  Search, 
  Server, 
  Laptop, 
  Router, 
  Camera, 
  HardDrive, 
  Printer, 
  Radio, 
  ExternalLink, 
  Copy, 
  Check, 
  Trash2,
  PlusCircle,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import type { Device } from "../../types";
import { isWanDevice, getEffectiveDeviceStatus, formatVietnamDateTime, formatRelativeVietnamTime } from "../../lib/utils";
import { useI18n } from "../../i18n";
import { FactoryDetailKPI } from "./FactoryDetailKPI";

interface DeviceListProps {
  devices: Device[];
  onSelectDevice: (device: Device) => void;
  onDeleteDevice: (device: Device) => void;
  onOpenAddDevice: () => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  statusFilter: string;
  onStatusFilterChange: (status: string) => void;
  siteName?: string;
  siteStatus?: string;
  location?: string;
  subnet?: string;
}

export const DeviceList: FC<DeviceListProps> = ({
  devices,
  onSelectDevice,
  onDeleteDevice,
  onOpenAddDevice,
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  siteName,
  siteStatus,
  location,
  subnet,
}) => {
  const { t } = useI18n();
  const [copiedIp, setCopiedIp] = useState<string | null>(null);

  // Pagination State (Default 10 per page, with 25, 50, All)
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);

  // Reset to page 1 on filter or search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter, siteName]);

  const totalItems = devices.length;
  const effectivePageSize = pageSize === -1 ? totalItems : pageSize;
  const totalPages = Math.max(1, Math.ceil(totalItems / (pageSize === -1 ? Math.max(1, totalItems) : pageSize)));
  const safeCurrentPage = Math.min(currentPage, totalPages);

  const paginatedDevices = useMemo(() => {
    if (pageSize === -1) return devices;
    const start = (safeCurrentPage - 1) * pageSize;
    return devices.slice(start, start + pageSize);
  }, [devices, safeCurrentPage, pageSize]);

  const showingStart = totalItems === 0 ? 0 : (safeCurrentPage - 1) * effectivePageSize + 1;
  const showingEnd = pageSize === -1 ? totalItems : Math.min(safeCurrentPage * pageSize, totalItems);

  const copyToClipboard = (e: MouseEvent, text: string) => {
    e.stopPropagation();
    navigator.clipboard.writeText(text);
    setCopiedIp(text);
    setTimeout(() => setCopiedIp(null), 2000);
  };

  const handleDelete = (e: MouseEvent, dev: Device) => {
    e.stopPropagation();
    const confirmMsg = `${t("deleteIpConfirm")}\nIP: ${dev.ip}${dev.hostname ? ` (${dev.hostname})` : ""}`;
    if (window.confirm(confirmMsg)) {
      onDeleteDevice(dev);
    }
  };

  const getDeviceIcon = (type?: string) => {
    switch (type) {
      case "switch":
      case "router":
        return <Router className="h-4 w-4" />;
      case "access_point":
        return <Radio className="h-4 w-4" />;
      case "camera":
        return <Camera className="h-4 w-4" />;
      case "storage":
        return <HardDrive className="h-4 w-4" />;
      case "server":
        return <Server className="h-4 w-4" />;
      case "printer":
        return <Printer className="h-4 w-4" />;
      default:
        return <Laptop className="h-4 w-4" />;
    }
  };

  const renderStatusBadge = (status: string, dev?: Device) => {
    const eff = dev ? getEffectiveDeviceStatus(dev, siteStatus) : (siteStatus === "offline" ? "unknown" : status);
    switch (eff) {
      case "online":
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-mono font-medium bg-emerald-500/10 text-online border border-emerald-500/20">
            <span className="h-1.5 w-1.5 rounded-full bg-online glow-online" />
            {t("online")}
          </span>
        );
      case "slow":
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-mono font-medium bg-amber-500/10 text-amber-400 border border-amber-500/30">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-400 glow-warning animate-pulse" />
            {t("slow")}
          </span>
        );
      case "unknown":
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-mono font-medium bg-purple-500/10 text-purple-300 border border-purple-500/30" title="Monitor Down">
            <span className="h-1.5 w-1.5 rounded-full bg-purple-400" />
            {t("filterUnknown")}
          </span>
        );
      case "offline":
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-mono font-medium bg-red-500/10 text-destructive border border-red-500/20">
            <span className="h-1.5 w-1.5 rounded-full bg-destructive glow-offline animate-pulse" />
            {t("offline")}
          </span>
        );
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Action Bar */}
      <div className="bg-card border border-border/80 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-base font-bold font-display text-foreground">
              {siteName ? `${t("monitoredIpListSite")} ${siteName}` : t("monitoredIpList")}
            </h1>
            {siteStatus && (
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-medium border ${
                siteStatus === "online"
                  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                  : "bg-red-500/10 text-destructive border-red-500/20"
              }`}>
                <span className={`h-1.5 w-1.5 rounded-full ${siteStatus === "online" ? "bg-online glow-online animate-pulse" : "bg-destructive glow-offline"}`} />
                {siteStatus === "online" ? "AGENT ONLINE" : "AGENT OFFLINE"}
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            {t("deviceManagementSubtitle")}
          </p>
        </div>

        <button
          onClick={onOpenAddDevice}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-primary hover:bg-primary/90 text-white text-xs font-semibold shadow-sm shadow-primary/20 transition-all cursor-pointer"
        >
          <PlusCircle className="h-4 w-4" />
          <span>{t("addPingBtn")}</span>
        </button>
      </div>

      {/* Factory KPI Summary: Online, Slow, Offline counts, AVG LATENCY & UPTIME */}
      <FactoryDetailKPI
        devices={devices}
        siteStatus={siteStatus}
        siteName={siteName}
        location={location}
        subnet={subnet}
      />

      {/* Search and Filters Bar */}
      <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center justify-between">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={t("searchPlaceholder")}
            className="w-full bg-card border border-border rounded-lg pl-9 pr-3 py-2 text-xs sm:text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all font-sans"
          />
        </div>

        {/* Status Filter Buttons with SLOW & UNKNOWN */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
          {[
            { id: "ALL", label: t("filterAll") },
            { id: "online", label: t("filterOnlineBadge") },
            { id: "slow", label: t("filterSlowBadge") },
            { id: "offline", label: t("filterOfflineBadge") },
            { id: "unknown", label: t("filterUnknownBadge") }
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => onStatusFilterChange(item.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors whitespace-nowrap ${
                statusFilter === item.id
                  ? "bg-slate-800 text-white border-slate-600 shadow-sm"
                  : "bg-card border-border text-muted-foreground hover:text-foreground hover:bg-card-subtle"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* Device Count Badge */}
      <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
        <span>{t("showingDeviceCount")} <strong className="text-foreground font-mono">{devices.length}</strong> {t("deviceCountUnit")}</span>
        <span className="hidden sm:inline">{t("deviceTableHint")}</span>
      </div>

      {/* Empty State when no devices */}
      {devices.length === 0 ? (
        <div className="bg-card border border-border/80 rounded-2xl p-10 text-center space-y-3">
          <Server className="h-10 w-10 text-muted-foreground mx-auto opacity-50" />
          <h3 className="font-semibold text-foreground text-sm">{t("emptyDeviceListTitle")}</h3>
          <p className="text-xs text-muted-foreground max-w-md mx-auto">
            {t("emptyDeviceListDesc")}
          </p>
          <div className="pt-2">
            <button
              onClick={onOpenAddDevice}
              className="px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg text-xs font-medium inline-flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm shadow-primary/20"
            >
              <PlusCircle className="h-4 w-4" />
              <span>{t("addIpNowBtn")}</span>
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* MOBILE VIEW: Card List */}
          <div className="grid grid-cols-1 gap-2.5 sm:hidden">
            {paginatedDevices.map((device) => {
              const isOnline = device.status === "online";
              const isSlow = device.status === "slow";
              return (
                <div
                  key={`${device.site_code}-${device.ip}`}
                  onClick={() => onSelectDevice(device)}
                  className={`bg-card border rounded-xl p-3.5 space-y-2.5 transition-all cursor-pointer shadow-sm active:scale-[0.99] ${
                    isSlow 
                      ? "border-amber-500/40 hover:border-amber-500" 
                      : isOnline 
                      ? "border-border/80 hover:border-slate-700" 
                      : "border-red-500/40 hover:border-red-500"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className={`p-1.5 rounded-md ${
                        isOnline ? "bg-emerald-500/10 text-online" : isSlow ? "bg-amber-500/10 text-amber-400" : "bg-red-500/10 text-destructive"
                      }`}>
                        {getDeviceIcon(device.device_type)}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <p className="font-semibold text-xs text-foreground truncate">
                            {device.hostname || device.vendor || t("unnamedDevice")}
                          </p>
                          {isWanDevice(device) && (
                            <span className="px-1 py-0.2 rounded text-[9px] font-mono font-bold bg-cyan-500/15 text-cyan-400 border border-cyan-500/25">
                              WAN
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-muted-foreground font-mono truncate">
                          {device.site_code}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {renderStatusBadge(device.status, device)}
                      <button
                        onClick={(e) => handleDelete(e, device)}
                        className="p-1 rounded text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition-colors"
                        title={t("deleteIpTooltip")}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 bg-slate-900/60 rounded-lg p-2 font-mono text-xs border border-slate-800/60">
                    <div>
                      <span className="text-[10px] text-muted-foreground block font-sans">{t("ipAddressHeader")}</span>
                      <div className="flex items-center gap-1">
                        <span className="text-foreground font-medium">{device.ip}</span>
                        <button
                          onClick={(e) => copyToClipboard(e, device.ip)}
                          className="text-muted-foreground hover:text-white"
                          title={t("copyIp")}
                        >
                          {copiedIp === device.ip ? <Check className="h-3 w-3 text-online" /> : <Copy className="h-3 w-3" />}
                        </button>
                      </div>
                    </div>
                    <div>
                      <span className="text-[10px] text-muted-foreground block font-sans">{t("macAddressHeader")}</span>
                      <span className="text-muted-foreground text-[11px] truncate block">{device.mac || "N/A"}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[11px] pt-0.5">
                    <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 text-[10px]">
                      {device.vendor || "Generic"}
                    </span>

                    <div className="flex items-center gap-2 text-muted-foreground font-mono text-[10px]">
                      {device.response_time_ms !== undefined && (
                        <span className={isSlow ? "text-amber-400 font-bold" : "text-emerald-400"}>
                          ⚡ {device.response_time_ms}ms
                        </span>
                      )}
                      {device.last_seen && (
                        <span className="text-slate-400 font-mono text-[10px]">
                          🕒 {formatRelativeVietnamTime(device.last_seen, t)}
                        </span>
                      )}
                      <ExternalLink className="h-3 w-3 text-muted-foreground ml-1" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* DESKTOP VIEW: Data Table */}
          <div className="hidden sm:block overflow-x-auto rounded-xl border border-border/80 bg-card shadow-sm">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900/80 text-muted-foreground uppercase tracking-wider font-mono text-[10px] border-b border-border">
                <tr>
                  <th className="py-3 px-4">{t("statusHeader")}</th>
                  <th className="py-3 px-4">{t("hostnameVendorHeader")}</th>
                  <th className="py-3 px-4">{t("ipAddressHeader")}</th>
                  <th className="py-3 px-4">{t("macAddressHeader")}</th>
                  <th className="py-3 px-4">{t("vendorTypeHeader")}</th>
                  <th className="py-3 px-4">{t("latencyHeader")}</th>
                  <th className="py-3 px-4">{t("lastSeenHeader")}</th>
                  <th className="py-3 px-4 text-right">{t("actionsHeader")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {paginatedDevices.map((device) => {
                  const isSlow = device.status === "slow";
                  const isOnline = device.status === "online";
                  return (
                    <tr
                      key={`${device.site_code}-${device.ip}`}
                      onClick={() => onSelectDevice(device)}
                      className="hover:bg-card-subtle transition-colors cursor-pointer group"
                    >
                      <td className="py-3 px-4">
                        {renderStatusBadge(device.status, device)}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <div className={`p-1 rounded ${isOnline ? "text-online" : isSlow ? "text-amber-400" : "text-destructive"}`}>
                            {getDeviceIcon(device.device_type)}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <p className="font-semibold text-foreground group-hover:text-primary transition-colors">
                                {device.hostname || t("notNamed")}
                              </p>
                              {isWanDevice(device) && (
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-cyan-500/15 text-cyan-400 border border-cyan-500/25">
                                  WAN
                                </span>
                              )}
                            </div>
                            <p className="text-[10px] text-muted-foreground font-mono">{device.site_code}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 font-mono font-medium text-foreground">
                        {device.ip}
                      </td>
                      <td className="py-3 px-4 font-mono text-muted-foreground text-[11px]">
                        {device.mac || "—"}
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 text-[10px]">
                          {device.vendor || "Generic"}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono">
                        {device.response_time_ms !== undefined ? (
                          <span className={isSlow ? "text-amber-400 font-bold px-1.5 py-0.5 rounded bg-amber-500/10" : "text-emerald-400"}>
                            {device.response_time_ms} ms
                          </span>
                        ) : "—"}
                      </td>
                      <td className="py-3 px-4 font-mono text-xs whitespace-nowrap">
                        {device.last_seen ? (
                          <div className="flex flex-col">
                            <span className={isOnline ? "text-emerald-400 font-medium" : isSlow ? "text-amber-400 font-medium" : "text-slate-400"}>
                              {formatRelativeVietnamTime(device.last_seen, t)}
                            </span>
                            <span className="text-[10px] text-slate-500 font-mono">
                              {formatVietnamDateTime(device.last_seen)}
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-500">—</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={(e) => handleDelete(e, device)}
                            className="p-1 rounded hover:bg-red-500/10 text-muted-foreground hover:text-red-400 transition-colors"
                            title={t("deleteIpTooltip")}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                          <ExternalLink className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors inline-block" />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls Bar */}
          {totalItems > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 py-3 px-4 bg-card border border-border/80 rounded-xl text-xs text-muted-foreground shadow-sm">
              {/* Rows per page selector & range counter */}
              <div className="flex items-center gap-3.5 flex-wrap">
                <div className="flex items-center gap-2">
                  <span className="text-slate-400 font-sans">Hiển thị:</span>
                  <select
                    value={pageSize}
                    onChange={(e) => {
                      setPageSize(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                    className="bg-slate-900 border border-slate-800 text-slate-200 text-xs rounded-lg px-2.5 py-1 focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer font-sans"
                  >
                    <option value={10}>10 / trang</option>
                    <option value={25}>25 / trang</option>
                    <option value={50}>50 / trang</option>
                    <option value={-1}>Tất cả ({totalItems})</option>
                  </select>
                </div>

                <span className="font-mono text-slate-400">
                  <strong className="text-foreground">{showingStart}-{showingEnd}</strong> trong tổng số <strong className="text-foreground">{totalItems}</strong> IP
                </span>
              </div>

              {/* Page Navigation Buttons */}
              {pageSize !== -1 && totalPages > 1 && (
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={safeCurrentPage <= 1}
                    className="p-1.5 rounded-lg border border-border bg-slate-900 text-slate-300 hover:text-white hover:border-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
                    title="Trang trước"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>

                  <div className="flex items-center gap-1">
                    {Array.from({ length: totalPages }, (_, i) => i + 1)
                      .filter((p) => {
                        if (totalPages <= 7) return true;
                        if (p === 1 || p === totalPages) return true;
                        return Math.abs(p - safeCurrentPage) <= 1;
                      })
                      .map((p, idx, arr) => {
                        const prev = arr[idx - 1];
                        const isEllipsis = prev && p - prev > 1;

                        return (
                          <div key={p} className="flex items-center">
                            {isEllipsis && <span className="px-1 text-slate-500 font-mono">...</span>}
                            <button
                              onClick={() => setCurrentPage(p)}
                              className={`h-7 min-w-[28px] px-2 rounded-lg text-xs font-mono font-medium transition-colors cursor-pointer ${
                                p === safeCurrentPage
                                  ? "bg-blue-600 text-white font-bold shadow-sm shadow-blue-500/20"
                                  : "bg-slate-900 text-slate-400 hover:text-white border border-slate-800"
                              }`}
                            >
                              {p}
                            </button>
                          </div>
                        );
                      })}
                  </div>

                  <button
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={safeCurrentPage >= totalPages}
                    className="p-1.5 rounded-lg border border-border bg-slate-900 text-slate-300 hover:text-white hover:border-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
                    title="Trang sau"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};
