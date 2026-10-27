import type { FC } from "react";
import { Bell, PanelLeftClose, PanelLeftOpen, Globe } from "lucide-react";
import type { Site } from "../../types";
import { useI18n } from "../../i18n";

interface NavbarProps {
  sites?: Site[];
  selectedSite?: string;
  onSelectSite?: (siteCode: string) => void;
  unreadAlertsCount: number;
  onOpenAlerts: () => void;
  onToggleSidebar: () => void;
  isSidebarCollapsed: boolean;
  onToggleCollapse: () => void;
}

export const Navbar: FC<NavbarProps> = ({
  unreadAlertsCount,
  onOpenAlerts,
  onToggleSidebar,
  isSidebarCollapsed,
  onToggleCollapse,
}) => {
  const { language, setLanguage, t } = useI18n();

  return (
    <header className="sticky top-0 z-30 w-full border-b border-border/80 bg-background/95 backdrop-blur-md px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
      {/* Left: Sidebar Toggle Button (Desktop & Mobile) */}
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
