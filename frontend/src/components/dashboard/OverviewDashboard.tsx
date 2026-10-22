import { useState } from "react";
import type { FC } from "react";
import { 
  Building2, 
  Plus, 
  Network, 
  Server, 
  Table as TableIcon, 
  LayoutGrid, 
  ArrowRight
} from "lucide-react";
import type { Site, Device } from "../../types";
import { OverviewKPI } from "./OverviewKPI";
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
  onOpenAddDevice,
  onNavigateView
}) => {
  const { t } = useI18n();
  const [activeTab, setActiveTabState] = useState<"list" | "topology">(() => {
    try {
      const saved = localStorage.getItem("sabibeco_overview_tab");
      if (saved === "list" || saved === "topology") return saved;
    } catch {}
    return "list";
  });

  const [listViewType, setListViewTypeState] = useState<"table" | "cards">(() => {
    try {
      const saved = localStorage.getItem("sabibeco_overview_view_type");
      if (saved === "table" || saved === "cards") return saved;
    } catch {}
    return "table";
  });

  const setActiveTab = (tab: "list" | "topology") => {
    setActiveTabState(tab);
    try { localStorage.setItem("sabibeco_overview_tab", tab); } catch {}
  };

  const setListViewType = (type: "table" | "cards") => {
    setListViewTypeState(type);
    try { localStorage.setItem("sabibeco_overview_view_type", type); } catch {}
  };

  const [hoveredSite, setHoveredSite] = useState<string | null>(null);

  // Divide 7 sites into Left & Right wings around Central Hub for desktop topology
  const leftSites = sites.slice(0, 3);
  const rightSites = sites.slice(3, 7);

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case "online":
        return {
          label: t("online"),
          badgeClass: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
          dot: "bg-emerald-400"
        };
      case "warning":
        return {
          label: t("warning"),
          badgeClass: "bg-amber-500/10 text-amber-400 border-amber-500/20",
          dot: "bg-amber-400"
        };
      default:
        return {
          label: t("standby"),
          badgeClass: "bg-secondary text-muted-foreground border-border",
          dot: "bg-slate-500"
        };
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Shadcn-Style Clean Minimalist KPI Cards */}
      <OverviewKPI
        sites={sites}
        devices={devices}
        selectedSite="ALL"
      />

      {/* 2. Shadcn Clean Tabs & Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
        {/* Shadcn Tabs List */}
        <div className="inline-flex h-9 items-center justify-center rounded-lg bg-muted p-1 text-muted-foreground">
          <button
            onClick={() => setActiveTab("list")}
            className={`inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1 text-sm font-medium transition-all cursor-pointer ${
              activeTab === "list"
                ? "bg-background text-foreground shadow-sm"
                : "hover:text-foreground"
            }`}
          >
            <Building2 className="h-4 w-4 mr-1.5" />
            {t("allFactories")}
          </button>
          <button
            onClick={() => setActiveTab("topology")}
            className={`inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1 text-sm font-medium transition-all cursor-pointer ${
              activeTab === "topology"
                ? "bg-background text-foreground shadow-sm"
                : "hover:text-foreground"
            }`}
          >
            <Network className="h-4 w-4 mr-1.5" />
            {t("networkTopology")}
          </button>
        </div>

        {/* Right Controls: Sub-view Toggle & Add Ping Button */}
        <div className="flex items-center gap-2.5 justify-end">
          {activeTab === "list" && (
            <div className="inline-flex h-8 items-center rounded-md border border-border bg-card p-0.5 text-muted-foreground">
              <button
                onClick={() => setListViewType("table")}
                title="Table view"
                className={`p-1.5 rounded text-xs transition-colors cursor-pointer ${
                  listViewType === "table" ? "bg-muted text-foreground" : "hover:text-foreground"
                }`}
              >
                <TableIcon className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => setListViewType("cards")}
                title="Cards view"
                className={`p-1.5 rounded text-xs transition-colors cursor-pointer ${
                  listViewType === "cards" ? "bg-muted text-foreground" : "hover:text-foreground"
                }`}
              >
                <LayoutGrid className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          <button
            onClick={onOpenAddDevice}
            className="inline-flex items-center justify-center gap-1.5 h-9 px-3.5 rounded-md bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-medium shadow transition-colors cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>{t("addPingBtn")}</span>
          </button>
        </div>
      </div>

      {/* 3. TAB 1: SHADCN CLEAN FACTORY LIST (TABLE OR COMPACT CARDS) */}
      {activeTab === "list" && (
        <div>
          {listViewType === "table" ? (
            /* Shadcn Clean Data Table */
            <div className="rounded-xl border border-border/80 bg-card overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-muted/40 text-muted-foreground text-xs uppercase font-medium border-b border-border">
                    <tr>
                      <th scope="col" className="px-5 py-3.5">Factory / Facility</th>
                      <th scope="col" className="px-5 py-3.5">CodeNM</th>
                      <th scope="col" className="px-5 py-3.5">Subnet Range</th>
                      <th scope="col" className="px-5 py-3.5">Status</th>
                      <th scope="col" className="px-5 py-3.5 text-center">Active IPs</th>
                      <th scope="col" className="px-5 py-3.5 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {sites.map((site) => {
                      const badge = getStatusBadge(site.agent_status);
                      const stats = site.device_stats || { total: 0, online: 0, slow: 0, offline: 0 };
                      const hasSubnet = site.subnet_ranges && site.subnet_ranges.length > 0;
                      const displaySubnet = hasSubnet ? site.subnet_ranges.join(", ") : "Dynamic (Auto-discovered)";

                      return (
                        <tr 
                          key={site.site_code}
                          onClick={() => {
                            onSelectSite(site.site_code);
                            onNavigateView("site_detail");
                          }}
                          className="hover:bg-muted/30 transition-colors cursor-pointer group"
                        >
                          <td className="px-5 py-3.5 font-medium text-foreground">
                            <div className="flex items-center gap-2.5">
                              <div className="h-8 w-8 rounded-lg bg-secondary text-foreground flex items-center justify-center shrink-0">
                                <Building2 className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                              </div>
                              <div>
                                <span className="font-semibold text-foreground group-hover:text-primary transition-colors">
                                  {site.site_name}
                                </span>
                                <p className="text-xs text-muted-foreground">{site.location}</p>
                              </div>
                            </div>
                          </td>

                          <td className="px-5 py-3.5">
                            <span className="font-mono text-xs px-2 py-0.5 rounded bg-secondary text-muted-foreground border border-border/80">
                              {site.code_nm || site.site_code}
                            </span>
                          </td>

                          <td className="px-5 py-3.5">
                            <span className={`text-xs font-mono ${hasSubnet ? "text-primary font-medium" : "text-muted-foreground"}`}>
                              {displaySubnet}
                            </span>
                          </td>

                          <td className="px-5 py-3.5">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${badge.badgeClass}`}>
                              <span className={`h-1.5 w-1.5 rounded-full ${badge.dot}`} />
                              {badge.label}
                            </span>
                          </td>

                          <td className="px-5 py-3.5 text-center">
                            <span className="font-mono text-xs font-semibold text-foreground">
                              {stats.online}
                            </span>
                            <span className="text-xs text-muted-foreground font-mono"> / {stats.total}</span>
                          </td>

                          <td className="px-5 py-3.5 text-right">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onSelectSite(site.site_code);
                                onNavigateView("site_detail");
                              }}
                              className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground group-hover:text-primary transition-colors"
                            >
                              <span>{t("manageIp")}</span>
                              <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            /* Shadcn Clean Minimalist Cards View (Compact, Zero Clutter) */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {sites.map((site) => {
                const badge = getStatusBadge(site.agent_status);
                const stats = site.device_stats || { total: 0, online: 0, slow: 0, offline: 0 };
                const hasSubnet = site.subnet_ranges && site.subnet_ranges.length > 0;
                const displaySubnet = hasSubnet ? site.subnet_ranges.join(", ") : "Dynamic Local Network";

                return (
                  <div
                    key={site.site_code}
                    onClick={() => {
                      onSelectSite(site.site_code);
                      onNavigateView("site_detail");
                    }}
                    className="rounded-xl border border-border/70 bg-card p-4 hover:border-border transition-all cursor-pointer shadow-sm hover:shadow group space-y-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h4 className="font-semibold text-sm text-foreground group-hover:text-primary transition-colors truncate">
                          {site.site_name}
                        </h4>
                        <p className="text-xs text-muted-foreground truncate">{site.location}</p>
                      </div>
                      <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium border shrink-0 ${badge.badgeClass}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${badge.dot}`} />
                        {badge.label}
                      </span>
                    </div>

                    <div className="text-xs text-muted-foreground font-mono flex items-center justify-between border-t border-border/50 pt-2.5">
                      <span className="truncate max-w-[170px] text-foreground/80">{displaySubnet}</span>
                      <span className="font-semibold text-foreground shrink-0">{stats.online} / {stats.total} IP</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 4. TAB 2: NETWORK TOPOLOGY DIAGRAM */}
      {activeTab === "topology" && (
        <section aria-label="Network Topology Diagram" className="rounded-xl border border-border/80 bg-card p-6 shadow-sm">
          {/* Header */}
          <div className="flex flex-wrap items-center justify-between gap-3 pb-5 border-b border-border/70 mb-6">
            <div>
              <h3 className="text-base font-semibold text-foreground tracking-tight">
                {t("topologyTitle")}
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                {t("topologySubtitle")}
              </p>
            </div>
            <div className="flex items-center gap-3 text-xs font-mono text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-emerald-500" /> {t("online")}
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-amber-500" /> {t("slow")}
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-destructive" /> {t("offline")}
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-slate-500" /> {t("standby")}
              </span>
            </div>
          </div>

          {/* Topology Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
            {/* Left 3 sites */}
            <div className="lg:col-span-4 space-y-3">
              {leftSites.map((site) => {
                const badge = getStatusBadge(site.agent_status);
                const stats = site.device_stats || { total: 0, online: 0, slow: 0, offline: 0 };
                const isHovered = hoveredSite === site.site_code;

                return (
                  <div
                    key={site.site_code}
                    onMouseEnter={() => setHoveredSite(site.site_code)}
                    onMouseLeave={() => setHoveredSite(null)}
                    onClick={() => {
                      onSelectSite(site.site_code);
                      onNavigateView("site_detail");
                    }}
                    className={`p-3.5 rounded-lg border transition-all cursor-pointer bg-muted/20 ${
                      isHovered ? "border-primary shadow-sm" : "border-border/60 hover:border-border"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="font-medium text-xs text-foreground truncate">{site.site_name}</h4>
                      <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium border ${badge.badgeClass}`}>
                        {badge.label}
                      </span>
                    </div>
                    <div className="mt-2 text-xs font-mono text-muted-foreground flex items-center justify-between">
                      <span>{site.location}</span>
                      <span className="text-foreground font-semibold">{stats.online} / {stats.total} IP</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Central Core */}
            <div className="lg:col-span-4 flex flex-col items-center justify-center py-4">
              <div className="w-full max-w-xs rounded-xl border border-border bg-card p-5 text-center shadow-md space-y-3">
                <div className="h-12 w-12 mx-auto rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                  <Server className="h-6 w-6" />
                </div>
                <div>
                  <h4 className="font-semibold text-sm text-foreground">SABIBECO Central Core</h4>
                  <p className="text-xs font-mono text-muted-foreground">Data Center • 10.10.0.1</p>
                </div>
                <div className="pt-2 border-t border-border text-xs text-muted-foreground flex justify-around font-mono">
                  <span>7 IPsec Tunnels</span>
                  <span className="text-emerald-400 font-semibold">&lt; 1ms</span>
                </div>
              </div>
            </div>

            {/* Right 4 sites */}
            <div className="lg:col-span-4 space-y-3">
              {rightSites.map((site) => {
                const badge = getStatusBadge(site.agent_status);
                const stats = site.device_stats || { total: 0, online: 0, slow: 0, offline: 0 };
                const isHovered = hoveredSite === site.site_code;

                return (
                  <div
                    key={site.site_code}
                    onMouseEnter={() => setHoveredSite(site.site_code)}
                    onMouseLeave={() => setHoveredSite(null)}
                    onClick={() => {
                      onSelectSite(site.site_code);
                      onNavigateView("site_detail");
                    }}
                    className={`p-3.5 rounded-lg border transition-all cursor-pointer bg-muted/20 ${
                      isHovered ? "border-primary shadow-sm" : "border-border/60 hover:border-border"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="font-medium text-xs text-foreground truncate">{site.site_name}</h4>
                      <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium border ${badge.badgeClass}`}>
                        {badge.label}
                      </span>
                    </div>
                    <div className="mt-2 text-xs font-mono text-muted-foreground flex items-center justify-between">
                      <span>{site.location}</span>
                      <span className="text-foreground font-semibold">{stats.online} / {stats.total} IP</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}
    </div>
  );
};
