import type { FC } from "react";
import { Building2, Radio, Activity, AlertCircle } from "lucide-react";
import type { Site, Device } from "../../types";
import { useI18n } from "../../i18n";

interface OverviewKPIProps {
  sites: Site[];
  devices: Device[];
  selectedSite: string;
}

export const OverviewKPI: FC<OverviewKPIProps> = ({ sites, devices, selectedSite }) => {
  const { t } = useI18n();
  const currentSite = selectedSite !== "ALL" ? sites.find(s => s.site_code === selectedSite) : null;

  const totalAgents = selectedSite === "ALL" ? sites.length : 1;
  const activeAgents = selectedSite === "ALL" 
    ? sites.filter(s => s.agent_status === "online").length
    : (currentSite?.agent_status === "online" ? 1 : 0);

  const totalDevices = devices.length;
  const onlineDevices = devices.filter(d => d.status === "online").length;
  const slowDevices = devices.filter(d => d.status === "slow").length;
  const offlineDevices = devices.filter(d => d.status === "offline").length;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* 1. Total Factories */}
      <div className="rounded-xl border border-border/60 bg-card p-5 text-card-foreground shadow-sm hover:border-border transition-colors">
        <div className="flex items-center justify-between space-y-0">
          <span className="text-sm font-medium text-muted-foreground">
            {t("allFactories")}
          </span>
          <Building2 className="h-4 w-4 text-muted-foreground" />
        </div>
        <div className="mt-2.5">
          <div className="text-2xl font-bold tracking-tight text-foreground font-display">
            {sites.length} <span className="text-sm font-normal text-muted-foreground">Sites</span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            7 facilities nationwide
          </p>
        </div>
      </div>

      {/* 2. Active Site Agents */}
      <div className="rounded-xl border border-border/60 bg-card p-5 text-card-foreground shadow-sm hover:border-border transition-colors">
        <div className="flex items-center justify-between space-y-0">
          <span className="text-sm font-medium text-muted-foreground">
            {t("siteAgentsActive")}
          </span>
          <Radio className="h-4 w-4 text-muted-foreground" />
        </div>
        <div className="mt-2.5">
          <div className="text-2xl font-bold tracking-tight text-foreground font-display flex items-baseline gap-2">
            <span>{activeAgents}</span>
            <span className="text-sm font-normal text-muted-foreground">/ {totalAgents}</span>
            <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${activeAgents > 0 ? "bg-emerald-500/10 text-emerald-400" : "bg-secondary text-muted-foreground"}`}>
              {activeAgents > 0 ? "Online" : "Standby"}
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Real-time telemetry heartbeat
          </p>
        </div>
      </div>

      {/* 3. Online Devices */}
      <div className="rounded-xl border border-border/60 bg-card p-5 text-card-foreground shadow-sm hover:border-border transition-colors">
        <div className="flex items-center justify-between space-y-0">
          <span className="text-sm font-medium text-muted-foreground">
            {t("devicesOnline")}
          </span>
          <Activity className="h-4 w-4 text-muted-foreground" />
        </div>
        <div className="mt-2.5">
          <div className="text-2xl font-bold tracking-tight text-foreground font-display flex items-baseline gap-2">
            <span className={onlineDevices > 0 ? "text-emerald-400" : ""}>{onlineDevices}</span>
            <span className="text-sm font-normal text-muted-foreground">/ {totalDevices} total</span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {slowDevices > 0 ? `${slowDevices} high latency (≥100ms)` : "Normal response times"}
          </p>
        </div>
      </div>

      {/* 4. Connection Lost / Alerts */}
      <div className="rounded-xl border border-border/60 bg-card p-5 text-card-foreground shadow-sm hover:border-border transition-colors">
        <div className="flex items-center justify-between space-y-0">
          <span className="text-sm font-medium text-muted-foreground">
            {t("connectionLost")}
          </span>
          <AlertCircle className={`h-4 w-4 ${offlineDevices > 0 ? "text-destructive" : "text-muted-foreground"}`} />
        </div>
        <div className="mt-2.5">
          <div className="text-2xl font-bold tracking-tight text-foreground font-display flex items-baseline gap-2">
            <span className={offlineDevices > 0 ? "text-destructive font-mono" : ""}>{offlineDevices}</span>
            <span className="text-sm font-normal text-muted-foreground">Offline</span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {offlineDevices > 0 ? "Requires IT check" : "Zero packet loss detected"}
          </p>
        </div>
      </div>
    </div>
  );
};
