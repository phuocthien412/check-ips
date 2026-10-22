import type { FC } from "react";
import { Factory } from "lucide-react";
import type { Site } from "../../types";
import { useI18n } from "../../i18n";

interface SiteTabsProps {
  sites: Site[];
  selectedSite: string;
  onSelectSite: (siteCode: string) => void;
}

export const SiteTabs: FC<SiteTabsProps> = ({ sites, selectedSite, onSelectSite }) => {
  const { t } = useI18n();

  return (
    <div className="w-full overflow-x-auto no-scrollbar py-2 -mx-4 px-4 sm:mx-0 sm:px-0">
      <div className="flex items-center gap-2 min-w-max">
        <button
          onClick={() => onSelectSite("ALL")}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all cursor-pointer ${
            selectedSite === "ALL"
              ? "bg-primary text-white border-primary shadow-sm shadow-primary/30"
              : "bg-card border-border text-muted-foreground hover:text-foreground hover:bg-card-subtle"
          }`}
        >
          <Factory className="h-3.5 w-3.5" />
          <span>{t("allSites")}</span>
          <span className="text-[10px] px-1.5 py-0.2 rounded bg-black/30 font-mono">
            {sites.length}
          </span>
        </button>

        {sites.map((site) => {
          const isSelected = selectedSite === site.site_code;
          const isOnline = site.agent_status === "online";
          const isWarning = site.agent_status === "warning";

          return (
            <button
              key={site.site_code}
              onClick={() => onSelectSite(site.site_code)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all cursor-pointer ${
                isSelected
                  ? "bg-primary text-white border-primary shadow-sm shadow-primary/30"
                  : "bg-card border-border text-muted-foreground hover:text-foreground hover:bg-card-subtle"
              }`}
            >
              <span
                className={`h-2 w-2 rounded-full ${
                  isOnline
                    ? "bg-online glow-online"
                    : isWarning
                    ? "bg-warning glow-warning"
                    : "bg-destructive glow-offline animate-pulse"
                }`}
              />
              <span>{site.site_name}</span>
              <span
                className={`text-[10px] font-mono px-1 py-0.2 rounded ${
                  isSelected ? "bg-black/30 text-white" : "bg-muted text-muted-foreground"
                }`}
              >
                {site.device_stats.online}/{site.device_stats.total}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
