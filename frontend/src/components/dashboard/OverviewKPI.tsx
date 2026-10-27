import type { FC } from "react";
import { Building2, Monitor, RadioOff } from "lucide-react";
import type { Site, Device } from "../../types";
import { isWanDevice, getEffectiveDeviceStatus } from "../../lib/utils";
import { useI18n } from "../../i18n";

interface OverviewKPIProps {
  sites: Site[];
  devices: Device[];
  selectedSite: string;
}

export const OverviewKPI: FC<OverviewKPIProps> = ({ sites, devices, selectedSite }) => {
  const { t } = useI18n();

  // Filter by site if selected
  const activeSites = selectedSite === "ALL" 
    ? sites 
    : sites.filter((s) => s.site_code === selectedSite);

  // Filter devices belonging to active sites, and SEPARATE WAN from LAN
  const siteDevices = devices.filter((d) => 
    selectedSite === "ALL" ? true : d.site_code === selectedSite
  );

  const lanDevices = siteDevices.filter((d) => !isWanDevice(d));

  // Map site agent status for quick lookup
  const siteAgentMap = new Map(sites.map((s) => [s.site_code, s.agent_status]));

  // 4 statuses calculation for LAN devices:
  let onlineDevices = 0;
  let slowDevices = 0;
  let offlineDevices = 0;
  let unknownDevices = 0;

  lanDevices.forEach((dev) => {
    const agentStatus = siteAgentMap.get(dev.site_code);
    const eff = getEffectiveDeviceStatus(dev, agentStatus);
    if (eff === "online") onlineDevices++;
    else if (eff === "slow") slowDevices++;
    else if (eff === "offline") offlineDevices++;
    else unknownDevices++;
  });

  const totalLan = lanDevices.length;
  const onlinePercent = totalLan > 0 ? ((onlineDevices / totalLan) * 100).toFixed(1) : "0.0";
  const slowPercent = totalLan > 0 ? ((slowDevices / totalLan) * 100).toFixed(1) : "0.0";
  const offlinePercent = totalLan > 0 ? ((offlineDevices / totalLan) * 100).toFixed(1) : "0.0";
  const unknownPercent = totalLan > 0 ? ((unknownDevices / totalLan) * 100).toFixed(1) : "0.0";

  const totalSites = activeSites.length;

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3.5">
      {/* 1. Factories / Site Name */}
      <div className="rounded-2xl border border-slate-800/80 bg-[#0B1322] p-3.5 text-card-foreground shadow-sm hover:border-slate-700 transition-all">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-400 shrink-0">
            <Building2 className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <div className="text-2xl font-bold tracking-tight text-white font-display leading-none">
              {totalSites}
            </div>
            <div className="text-xs font-semibold text-slate-300 mt-1 truncate">
              {selectedSite === "ALL" ? t("cardFactories") : activeSites[0]?.site_name || selectedSite}
            </div>
          </div>
        </div>
      </div>

      {/* 2. Total Devices */}
      <div className="rounded-2xl border border-slate-800/80 bg-[#0B1322] p-3.5 text-card-foreground shadow-sm hover:border-slate-700 transition-all">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-cyan-600/15 border border-cyan-600/30 flex items-center justify-center text-cyan-400 shrink-0">
            <Monitor className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <div className="text-2xl font-bold tracking-tight text-white font-display leading-none">
              {totalLan}
            </div>
            <div className="text-xs font-semibold text-slate-300 mt-1 truncate">
              {t("cardTotalDevices")}
            </div>
          </div>
        </div>
      </div>

      {/* 3. Online Devices */}
      <div className="rounded-2xl border border-slate-800/80 bg-[#0B1322] p-3.5 text-card-foreground shadow-sm hover:border-slate-700 transition-all">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
            <span className="h-3.5 w-3.5 rounded-full bg-emerald-400 glow-online" />
          </div>
          <div className="min-w-0">
            <div className="text-2xl font-bold tracking-tight text-emerald-400 font-display leading-none">
              {onlineDevices}
            </div>
            <div className="text-xs font-semibold text-emerald-400 mt-1">{t("cardOnline")}</div>
            <div className="text-[11px] text-slate-400 truncate mt-0.5">{onlinePercent}%</div>
          </div>
        </div>
      </div>

      {/* 4. Slow Devices */}
      <div className="rounded-2xl border border-slate-800/80 bg-[#0B1322] p-3.5 text-card-foreground shadow-sm hover:border-slate-700 transition-all">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
            <span className="h-3.5 w-3.5 rounded-full bg-amber-400 glow-warning animate-pulse" />
          </div>
          <div className="min-w-0">
            <div className="text-2xl font-bold tracking-tight text-amber-400 font-display leading-none">
              {slowDevices}
            </div>
            <div className="text-xs font-semibold text-amber-400 mt-1">{t("cardSlow")}</div>
            <div className="text-[11px] text-slate-400 truncate mt-0.5">{slowPercent}%</div>
          </div>
        </div>
      </div>

      {/* 5. Confirmed Offline Devices */}
      <div className="rounded-2xl border border-slate-800/80 bg-[#0B1322] p-3.5 text-card-foreground shadow-sm hover:border-slate-700 transition-all">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-red-500/15 border border-red-500/30 flex items-center justify-center text-red-400 shrink-0">
            <span className="h-3.5 w-3.5 rounded-full bg-red-500 glow-offline" />
          </div>
          <div className="min-w-0">
            <div className="text-2xl font-bold tracking-tight text-red-400 font-display leading-none">
              {offlineDevices}
            </div>
            <div className="text-xs font-semibold text-red-400 mt-1">{t("cardOffline")}</div>
            <div className="text-[11px] text-slate-400 truncate mt-0.5" title="Chỉ tính khi Agent Online mà thiết bị không phản hồi">
              {offlinePercent}% ({t("cardOfflineConfirmed")})
            </div>
          </div>
        </div>
      </div>

      {/* 6. Down (Agent Down / Monitor Down) */}
      <div className="rounded-2xl border border-slate-800/80 bg-[#0B1322] p-3.5 text-card-foreground shadow-sm hover:border-slate-700 transition-all">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400 shrink-0">
            <RadioOff className="h-5 w-5 text-rose-400" />
          </div>
          <div className="min-w-0">
            <div className="text-2xl font-bold tracking-tight text-rose-400 font-display leading-none">
              {unknownDevices}
            </div>
            <div className="text-xs font-semibold text-rose-400 mt-1">{t("cardUnknown")}</div>
            <div className="text-[11px] text-rose-300/80 truncate mt-0.5" title="Mất tín hiệu Agent - Monitor Down">
              {unknownPercent}% ({t("cardUnknownAgentDown")})
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
