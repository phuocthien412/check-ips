import type { FC } from "react";
import { X, Server, Activity, ArrowDown, ArrowUp } from "lucide-react";
import type { Device } from "../../types";
import { formatBytes, formatUptime } from "../../lib/utils";
import { useI18n } from "../../i18n";

interface DeviceDetailSheetProps {
  device: Device | null;
  onClose: () => void;
}

export const DeviceDetailSheet: FC<DeviceDetailSheetProps> = ({ device, onClose }) => {
  const { language, t } = useI18n();
  if (!device) return null;

  const isOnline = device.status === "online";
  const snmp = device.snmp_data;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm transition-opacity animate-in fade-in">
      <div 
        className="w-full max-w-lg bg-card border-l border-border h-full flex flex-col shadow-2xl overflow-hidden animate-in slide-in-from-right duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 border-b border-border flex items-center justify-between bg-slate-900/60">
          <div className="flex items-center gap-2.5">
            <div className={`p-2 rounded-lg ${isOnline ? "bg-emerald-500/10 text-online" : "bg-red-500/10 text-destructive"}`}>
              <Server className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base text-foreground font-display">
                {device.hostname || device.vendor || t("unnamedDevice")}
              </h3>
              <p className="text-xs text-muted-foreground font-mono">{device.site_code}</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Status Alert Banner */}
          <div className={`p-3 rounded-xl border flex items-center justify-between ${
            isOnline ? "bg-emerald-500/10 border-emerald-500/20 text-online" : "bg-red-500/10 border-red-500/20 text-destructive"
          }`}>
            <div className="flex items-center gap-2">
              <span className={`h-2.5 w-2.5 rounded-full ${isOnline ? "bg-online glow-online" : "bg-destructive glow-offline animate-pulse"}`} />
              <span className="font-semibold text-xs font-mono uppercase">
                {t("status")}: {isOnline ? t("deviceStatusActive") : t("deviceStatusLost")}
              </span>
            </div>
            {isOnline && device.response_time_ms !== undefined && (
              <span className="font-mono text-xs">Ping: {device.response_time_ms} ms</span>
            )}
          </div>

          {/* Core Network Identity Card */}
          <div className="bg-slate-900/80 border border-slate-800/80 rounded-xl p-3.5 space-y-3 font-mono text-xs">
            <h4 className="text-[11px] font-sans font-semibold text-muted-foreground uppercase tracking-wider">
              {t("identityInfo")}
            </h4>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <span className="text-muted-foreground text-[10px] block font-sans">{t("ipAddress")}</span>
                <span className="text-foreground font-bold">{device.ip}</span>
              </div>
              <div>
                <span className="text-muted-foreground text-[10px] block font-sans">{t("macAddress")}</span>
                <span className="text-foreground">{device.mac || t("notAvailable")}</span>
              </div>
              <div>
                <span className="text-muted-foreground text-[10px] block font-sans">{t("vendor")}</span>
                <span className="text-blue-400 font-sans">{device.vendor || "Generic"}</span>
              </div>
              <div>
                <span className="text-muted-foreground text-[10px] block font-sans">{t("deviceType")}</span>
                <span className="text-foreground font-sans capitalize">{device.device_type || "workstation"}</span>
              </div>
              <div>
                <span className="text-muted-foreground text-[10px] block font-sans">{t("firstSeen")}</span>
                <span className="text-muted-foreground text-[11px]">
                  {device.first_discovered ? new Date(device.first_discovered).toLocaleDateString(language === "en" ? "en-US" : "vi-VN") : "—"}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground text-[10px] block font-sans">{t("lastSeen")}</span>
                <span className="text-muted-foreground text-[11px]">
                  {device.last_seen ? new Date(device.last_seen).toLocaleTimeString(language === "en" ? "en-US" : "vi-VN") : "—"}
                </span>
              </div>
            </div>

            {device.custom_notes && (
              <div className="pt-2 border-t border-slate-800">
                <span className="text-muted-foreground text-[10px] block font-sans">{t("customNotesLabel")}</span>
                <p className="text-slate-300 font-sans text-xs mt-0.5">{device.custom_notes}</p>
              </div>
            )}
          </div>

          {/* SNMP Diagnostics Card */}
          <div className="bg-slate-900/80 border border-slate-800/80 rounded-xl p-3.5 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-[11px] font-sans font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <Activity className="h-3.5 w-3.5 text-primary" />
                {t("snmpSpecsTitle")}
              </h4>
              <span className={`text-[10px] font-mono px-2 py-0.5 rounded ${
                device.snmp_status === "enabled" ? "bg-emerald-500/20 text-online" : "bg-slate-800 text-muted-foreground"
              }`}>
                {device.snmp_status === "enabled" ? "SNMP OK" : t("snmpNotSupported")}
              </span>
            </div>

            {device.snmp_status === "enabled" && snmp ? (
              <div className="space-y-3 font-mono text-xs">
                {snmp.sys_name && (
                  <div>
                    <span className="text-muted-foreground text-[10px] block font-sans">System Name</span>
                    <span className="text-foreground font-semibold">{snmp.sys_name}</span>
                  </div>
                )}
                {snmp.sys_descr && (
                  <div>
                    <span className="text-muted-foreground text-[10px] block font-sans">{t("snmpSysDescr")}</span>
                    <p className="text-slate-300 text-[11px] bg-slate-950 p-2 rounded border border-slate-800 break-words font-sans">
                      {snmp.sys_descr}
                    </p>
                  </div>
                )}
                {snmp.uptime_seconds !== undefined && (
                  <div>
                    <span className="text-muted-foreground text-[10px] block font-sans">{t("uptimeLabel")}</span>
                    <span className="text-blue-400 font-bold text-sm">
                      ⏱️ {formatUptime(snmp.uptime_seconds)} ({snmp.uptime_seconds.toLocaleString()} {t("secondsUnit")})
                    </span>
                  </div>
                )}

                {/* Network Interfaces Table */}
                {snmp.interfaces && snmp.interfaces.length > 0 && (
                  <div className="pt-2">
                    <span className="text-muted-foreground text-[10px] block font-sans mb-1.5 font-semibold">
                      {t("interfacesTitle")}
                    </span>
                    <div className="space-y-1.5">
                      {snmp.interfaces.map((iface) => (
                        <div key={iface.index} className="bg-slate-950/70 border border-slate-800 p-2 rounded-lg flex items-center justify-between text-[11px]">
                          <div>
                            <span className="font-semibold text-foreground">{iface.name}</span>
                            <span className="text-[10px] text-online ml-2 font-mono uppercase">● {iface.status}</span>
                          </div>
                          <div className="flex items-center gap-3 text-muted-foreground text-[10px] font-mono">
                            <span className="flex items-center gap-0.5 text-emerald-400">
                              <ArrowDown className="h-3 w-3" /> {formatBytes(iface.in_octets)}
                            </span>
                            <span className="flex items-center gap-0.5 text-blue-400">
                              <ArrowUp className="h-3 w-3" /> {formatBytes(iface.out_octets)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground font-sans italic">
                {t("snmpNoResponse")}
              </p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-border bg-slate-900/60 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-medium transition-colors cursor-pointer"
          >
            {t("closeDetail")}
          </button>
        </div>
      </div>
    </div>
  );
};
