import type { FC } from "react";
import { LayoutDashboard, Server, Bell, RefreshCw } from "lucide-react";
import { useI18n } from "../../i18n";

interface MobileBottomNavProps {
  currentTab: string;
  onTabChange: (tab: string) => void;
  unreadAlertsCount: number;
  onRefresh: () => void;
  isFetching: boolean;
}

export const MobileBottomNav: FC<MobileBottomNavProps> = ({
  currentTab,
  onTabChange,
  unreadAlertsCount,
  onRefresh,
  isFetching
}) => {
  const { t } = useI18n();

  return (
    <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-card/95 backdrop-blur-md border-t border-border px-6 py-2 flex items-center justify-between">
      <button
        onClick={() => onTabChange("overview")}
        className={`flex flex-col items-center gap-1 text-[10px] font-medium transition-colors ${
          currentTab === "overview" ? "text-primary" : "text-muted-foreground hover:text-foreground"
        }`}
      >
        <LayoutDashboard className="h-5 w-5" />
        <span>{t("overview")}</span>
      </button>

      <button
        onClick={() => onTabChange("devices")}
        className={`flex flex-col items-center gap-1 text-[10px] font-medium transition-colors ${
          currentTab === "devices" ? "text-primary" : "text-muted-foreground hover:text-foreground"
        }`}
      >
        <Server className="h-5 w-5" />
        <span>{t("devices")}</span>
      </button>

      <button
        onClick={() => onTabChange("alerts")}
        className={`relative flex flex-col items-center gap-1 text-[10px] font-medium transition-colors ${
          currentTab === "alerts" ? "text-primary" : "text-muted-foreground hover:text-foreground"
        }`}
      >
        <Bell className="h-5 w-5" />
        <span>{t("notifications")}</span>
        {unreadAlertsCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] px-1 items-center justify-center rounded-full bg-destructive text-[9px] font-bold text-white shadow-sm glow-offline">
            {unreadAlertsCount}
          </span>
        )}
      </button>

      <button
        onClick={onRefresh}
        className="flex flex-col items-center gap-1 text-[10px] font-medium text-muted-foreground hover:text-foreground transition-colors"
      >
        <RefreshCw className={`h-5 w-5 ${isFetching ? "animate-spin text-primary" : ""}`} />
        <span>{t("refresh")}</span>
      </button>
    </nav>
  );
};
