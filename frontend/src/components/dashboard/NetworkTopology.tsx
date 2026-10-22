import { useState } from "react";
import type { FC } from "react";
import { 
  Cloud, 
  Server, 
  Router, 
  Radio, 
  Camera, 
  HardDrive, 
  Laptop
} from "lucide-react";
import type { Site, Device } from "../../types";
import { useI18n } from "../../i18n";

interface NetworkTopologyProps {
  sites: Site[];
  devices: Device[];
  selectedSite: string;
  onSelectSite: (siteCode: string) => void;
  onSelectDevice: (device: Device) => void;
}

export const NetworkTopology: FC<NetworkTopologyProps> = ({
  sites,
  devices,
  selectedSite,
  onSelectSite,
  onSelectDevice,
}) => {
  const { t } = useI18n();
  const [activeSiteForDiagram, setActiveSiteForDiagram] = useState<string>(
    selectedSite !== "ALL" ? selectedSite : "NM_BINH_DUONG"
  );

  const currentSite = sites.find(s => s.site_code === activeSiteForDiagram) || sites[0];
  const siteDevices = devices.filter(d => d.site_code === activeSiteForDiagram);
  const edgeDevices = siteDevices.filter(d => d.device_type !== "router" && d.device_type !== "switch");

  const getNodeColor = (status: string) => {
    switch (status) {
      case "online":
        return "border-emerald-500/40 bg-emerald-500/10 text-emerald-400";
      case "slow":
        return "border-amber-500/50 bg-amber-500/10 text-amber-400";
      case "offline":
        return "border-red-500/40 bg-red-500/10 text-red-400";
      default:
        return "border-slate-700 bg-slate-900 text-slate-400";
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
      default:
        return <Laptop className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-4">
      {/* Topology Header & Dedicated Site Switcher Row */}
      <div className="bg-card border border-border/80 rounded-2xl p-4 sm:p-5 space-y-4 shadow-sm">
        {/* Row 1: Header Title & Description */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-bold font-display text-foreground tracking-tight">
                {t("networkTopology")}
              </h2>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-primary/20 text-primary border border-primary/30">
                Interactive
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              {t("topologySubtitle")}
            </p>
          </div>
        </div>

        {/* Row 2: Dedicated Full-Width Factory Selector Row */}
        <div className="pt-3 border-t border-border/70">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-foreground uppercase tracking-wide font-display">
              {t("siteListSeparateRow")} (7 Sites):
            </span>
            <span className="text-[11px] text-muted-foreground">
              {t("viewing")}: <strong className="text-primary">{currentSite?.site_name}</strong>
            </span>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
            {sites.map(s => {
              const isSelected = activeSiteForDiagram === s.site_code;
              const isOnline = s.agent_status === "online";
              const isWarning = s.agent_status === "warning";

              return (
                <button
                  key={s.site_code}
                  onClick={() => {
                    setActiveSiteForDiagram(s.site_code);
                    onSelectSite(s.site_code);
                  }}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-medium border whitespace-nowrap transition-all cursor-pointer ${
                    isSelected
                      ? "bg-primary text-white border-primary shadow-md shadow-primary/25 scale-[1.02]"
                      : "bg-slate-900 border-border text-muted-foreground hover:text-white hover:bg-slate-800"
                  }`}
                >
                  <span className={`h-2 w-2 rounded-full ${
                    isOnline ? "bg-online glow-online" : isWarning ? "bg-amber-400" : "bg-slate-500"
                  }`} />
                  <span>{s.site_name}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Sơ đồ trực quan dạng Layered Flow */}
      <div className="bg-card border border-border/80 rounded-2xl p-6 relative overflow-hidden shadow-lg min-h-[460px]">
        {/* Layer 1: Central Server (Data Center) */}
        <div className="flex flex-col items-center">
          <div className="bg-slate-900/90 border-2 border-primary/50 rounded-2xl p-4 flex items-center gap-3 shadow-xl shadow-primary/10 max-w-md w-full">
            <div className="h-12 w-12 rounded-xl bg-primary/20 border border-primary/40 flex items-center justify-center text-primary">
              <Cloud className="h-7 w-7 animate-pulse text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between">
                <span className="font-bold text-sm text-foreground">{t("centralHub")}</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-online border border-emerald-500/30">
                  {t("online")}
                </span>
              </div>
              <p className="text-xs text-muted-foreground font-mono">{t("coreHubIp")}</p>
              <p className="text-[10px] text-blue-400">{t("tunnelsIpsecActive")}</p>
            </div>
          </div>

          {/* Trunk Line connector */}
          <div className="h-8 w-0.5 bg-gradient-to-b from-primary to-slate-600 my-1 relative">
            <div className="absolute top-1/2 -left-1 h-2 w-2 rounded-full bg-primary animate-ping" />
          </div>
        </div>

        {/* Layer 2: Selected Site Gateway / Core Switch */}
        <div className="flex flex-col items-center mb-6">
          <div className="bg-slate-900/80 border border-blue-500/40 rounded-xl p-3.5 max-w-lg w-full flex items-center justify-between shadow-md">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center">
                <Router className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-xs sm:text-sm text-foreground">{currentSite?.site_name}</span>
                  <span className="text-[10px] font-mono text-muted-foreground px-1.5 py-0.2 rounded bg-slate-800">
                    {currentSite?.code_nm || currentSite?.site_code}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground font-mono">
                  {t("subnetPrefix")} {currentSite?.subnet_ranges.join(", ")}
                </p>
              </div>
            </div>

            <div className="text-right">
              <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-semibold ${
                currentSite?.agent_status === "online" ? "bg-emerald-500/20 text-online" : "bg-red-500/20 text-destructive"
              }`}>
                {currentSite?.agent_status === "online" ? t("agentOnline") : t("agentOffline")}
              </span>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                {siteDevices.length} {t("totalDevicesCount")}
              </p>
            </div>
          </div>

          {/* Connector branching down */}
          <div className="h-6 w-0.5 bg-slate-700 my-1" />
        </div>

        {/* Layer 3: End Devices Grid (Access Points, Cameras, Storage, Servers) */}
        <div>
          <div className="flex items-center justify-between mb-3 text-xs text-muted-foreground px-1">
            <span className="font-semibold uppercase tracking-wider text-[11px] text-slate-300">
              {t("edgeDevicesTitle")}
            </span>
            <div className="flex items-center gap-3 text-[10px] font-mono">
              <span className="flex items-center gap-1 text-online">
                <span className="h-2 w-2 rounded-full bg-online" /> {t("online")}
              </span>
              <span className="flex items-center gap-1 text-amber-400">
                <span className="h-2 w-2 rounded-full bg-amber-400" /> {t("slow")}
              </span>
              <span className="flex items-center gap-1 text-destructive">
                <span className="h-2 w-2 rounded-full bg-destructive" /> {t("offline")}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {edgeDevices.length === 0 ? (
              <div className="col-span-full text-center py-8 text-muted-foreground text-xs bg-slate-900/40 rounded-xl border border-dashed border-slate-800">
                {t("scanningDevices")}
              </div>
            ) : (
              edgeDevices.map((device) => {
                const isOnline = device.status === "online";
                const isSlow = device.status === "slow";

                return (
                  <div
                    key={`${device.site_code}-${device.ip}`}
                    onClick={() => onSelectDevice(device)}
                    className={`border rounded-xl p-3 cursor-pointer transition-all hover:scale-[1.02] shadow-sm ${getNodeColor(device.status)}`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="p-1 rounded bg-slate-900/80">
                          {getDeviceIcon(device.device_type)}
                        </div>
                        <span className="text-[10px] font-mono uppercase font-semibold">
                          {device.device_type || "device"}
                        </span>
                      </div>
                      <span className={`h-2 w-2 rounded-full ${
                        isOnline ? "bg-online glow-online" : isSlow ? "bg-warning glow-warning animate-pulse" : "bg-destructive glow-offline"
                      }`} />
                    </div>

                    <p className="font-bold text-xs text-foreground truncate">
                      {device.hostname || device.vendor || t("unnamedDevice")}
                    </p>

                    <div className="mt-2 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] font-mono">
                      <span className="text-foreground">{device.ip}</span>
                      <span className={isSlow ? "text-amber-400 font-bold" : "text-muted-foreground"}>
                        {device.response_time_ms ? `${device.response_time_ms}ms` : "—"}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
