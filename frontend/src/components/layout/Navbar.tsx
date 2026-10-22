import type { FC } from "react";
import { Bell, ChevronDown, PanelLeftClose, PanelLeftOpen, Globe } from "lucide-react";
import type { Site } from "../../types";
import { useI18n } from "../../i18n";

interface NavbarProps {
  sites: Site[];
  selectedSite: string;
  onSelectSite: (siteCode: string) => void;
  unreadAlertsCount: number;
  onOpenAlerts: () => void;
  onToggleSidebar: () => void;
  isSidebarCollapsed: boolean;
  onToggleCollapse: () => void;
}

export const Navbar: FC<NavbarProps> = ({
  sites,
  selectedSite,
  onSelectSite,
  unreadAlertsCount,
  onOpenAlerts,
  onToggleSidebar,
  isSidebarCollapsed,
  onToggleCollapse,
}) => {
  const { language, setLanguage, t } = useI18n();

  return (
    <header className="sticky top-0 z-30 w-full border-b border-border/80 bg-background/95 backdrop-blur-md px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
      {/* Left: Sidebar Toggle Button (Desktop & Mobile) + Site Selector */}
      <div className="flex items-center gap-3">
        {/* Toggle Button for Desktop */}
        <button
          onClick={onToggleCollapse}
          className="hidden lg:flex p-2 rounded-xl bg-card border border-border text-muted-foreground hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          title={isSidebarCollapsed ? t("toggleSidebar") : t("toggleSidebar")}
        >
          {isSidebarCollapsed ? (
            <PanelLeftOpen className="h-5 w-5 text-primary" />
          ) : (
            <PanelLeftClose className="h-5 w-5 text-muted-foreground" />
          )}
        </button>

        {/* Toggle Button for Mobile */}
        <button
          onClick={onToggleSidebar}
          className="lg:hidden p-2 rounded-xl bg-card border border-border text-muted-foreground hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          title={t("toggleSidebar")}
        >
          <PanelLeftOpen className="h-5 w-5 text-primary" />
        </button>

        {/* Site Selector Dropdown */}
        <div className="relative min-w-[220px] sm:min-w-[280px]">
          <select
            value={selectedSite}
            onChange={(e) => onSelectSite(e.target.value)}
            className="w-full appearance-none bg-card border border-border rounded-xl pl-3 pr-8 py-2 text-xs sm:text-sm font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all cursor-pointer font-sans"
          >
            <option value="ALL">🏢 {t("allSites")}</option>
            {sites.map((s) => (
              <option key={s.site_code} value={s.site_code}>
                {s.agent_status === "online" ? "🟢" : s.agent_status === "warning" ? "🟡" : "🔴"} {s.site_name}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        </div>
      </div>

      {/* Right Side: Language Switcher (VN / EN) + Notification Bell */}
      <div className="flex items-center gap-2.5">
        {/* Language Switcher VN / EN */}
        <button
          id="language-switcher-btn"
          onClick={() => setLanguage(language === "vi" ? "en" : "vi")}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-card border border-border text-xs font-semibold text-foreground hover:bg-slate-800 transition-all cursor-pointer shadow-sm"
          title={language === "vi" ? "Switch to English" : "Chuyển sang Tiếng Việt"}
        >
          <Globe className="h-3.5 w-3.5 text-primary" />
          <span className="font-mono">{language === "vi" ? "🇻🇳 VN" : "🇬🇧 EN"}</span>
        </button>

        {/* Notification Bell */}
        <button
          onClick={onOpenAlerts}
          className="relative p-2 rounded-xl bg-card border border-border text-muted-foreground hover:text-foreground hover:bg-slate-800 transition-colors cursor-pointer"
          title={t("notifications")}
        >
          <Bell className="h-4 w-4" />
          {unreadAlertsCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] px-1 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-white shadow-sm glow-offline font-mono">
              {unreadAlertsCount}
            </span>
          )}
        </button>
      </div>
    </header>
  );
};
