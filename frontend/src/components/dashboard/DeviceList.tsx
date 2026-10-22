import { useState } from "react";
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
  PlusCircle
} from "lucide-react";
import type { Device } from "../../types";
import { formatUptime } from "../../lib/utils";
import { useI18n } from "../../i18n";

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
}) => {
  const { t } = useI18n();
  const [copiedIp, setCopiedIp] = useState<string | null>(null);

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

  const renderStatusBadge = (status: string) => {
    switch (status) {
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
            <h2 className="text-base font-bold font-display text-foreground">
              {siteName ? `${t("monitoredIpListSite")} ${siteName}` : t("monitoredIpList")}
            </h2>
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

        {/* Status Filter Buttons with SLOW */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
          {[
            { id: "ALL", label: t("filterAll") },
            { id: "online", label: t("filterOnlineBadge") },
            { id: "slow", label: t("filterSlowBadge") },
            { id: "offline", label: t("filterOfflineBadge") }
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
            {devices.map((device) => {
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
                        <p className="font-semibold text-xs text-foreground truncate">
                          {device.hostname || device.vendor || t("unnamedDevice")}
                        </p>
                        <p className="text-[10px] text-muted-foreground font-mono truncate">
                          {device.site_code}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {renderStatusBadge(device.status)}
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
                      {device.snmp_data?.uptime_seconds && (
                        <span className="text-blue-400">⏱️ {formatUptime(device.snmp_data.uptime_seconds)}</span>
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
                  <th className="py-3 px-4">{t("snmpUptimeHeader")}</th>
                  <th className="py-3 px-4 text-right">{t("actionsHeader")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {devices.map((device) => {
                  const isSlow = device.status === "slow";
                  const isOnline = device.status === "online";
                  return (
                    <tr
                      key={`${device.site_code}-${device.ip}`}
                      onClick={() => onSelectDevice(device)}
                      className="hover:bg-card-subtle transition-colors cursor-pointer group"
                    >
                      <td className="py-3 px-4">
                        {renderStatusBadge(device.status)}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <div className={`p-1 rounded ${isOnline ? "text-online" : isSlow ? "text-amber-400" : "text-destructive"}`}>
                            {getDeviceIcon(device.device_type)}
                          </div>
                          <div>
                            <p className="font-semibold text-foreground group-hover:text-primary transition-colors">
                              {device.hostname || t("notNamed")}
                            </p>
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
                      <td className="py-3 px-4 font-mono text-blue-400">
                        {device.snmp_data?.uptime_seconds ? formatUptime(device.snmp_data.uptime_seconds) : "—"}
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
        </>
      )}
    </div>
  );
};
