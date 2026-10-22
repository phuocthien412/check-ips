import { useState } from "react";
import type { FC } from "react";
import { 
  LayoutDashboard, 
  Factory, 
  Network, 
  Bell, 
  ChevronDown, 
  ChevronRight, 
  Activity,
  X,
  LogOut
} from "lucide-react";
import type { Site, UserSession } from "../../types";
import { useI18n } from "../../i18n";

interface AppSidebarProps {
  sites: Site[];
  selectedSite: string;
  onSelectSite: (siteCode: string) => void;
  activeView: string;
  onSelectView: (view: string) => void;
  unreadAlertsCount: number;
  isOpen: boolean;
  onClose: () => void;
  isCollapsed: boolean;
  onGoHome: () => void;
  userSession: UserSession | null;
  onLogout: () => void;
}

export const AppSidebar: FC<AppSidebarProps> = ({
  sites,
  selectedSite,
  onSelectSite,
  activeView,
  onSelectView,
  unreadAlertsCount,
  isOpen,
  onClose,
  isCollapsed,
  onGoHome,
  userSession,
  onLogout,
}) => {
  const [isSitesExpanded, setIsSitesExpanded] = useState(true);
  const { t } = useI18n();

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden animate-in fade-in"
          onClick={onClose}
        />
      )}

      {/* Sidebar Container */}
      <aside className={`
        fixed top-0 bottom-0 left-0 z-50 flex flex-col bg-[#0B0F17] border-r border-border transition-all duration-300 ease-in-out
        ${isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
        ${isCollapsed ? "lg:w-20" : "w-64"}
      `}>
        {/* Sidebar Header: Brand Only (Toggle button moved cleanly to top Navbar) */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-border">
          <div 
            onClick={onGoHome}
            className="flex items-center gap-2.5 cursor-pointer select-none group"
            title={t("overview")}
          >
            <div className="h-9 w-9 rounded-lg bg-primary/10 border border-primary/30 flex items-center justify-center text-primary group-hover:scale-105 transition-transform shadow-sm shadow-primary/20 shrink-0">
              <Activity className="h-5 w-5 animate-pulse text-primary" />
            </div>
            {!isCollapsed && (
              <div>
                <span className="font-display font-bold text-base text-foreground tracking-tight">{t("brand")}</span>
              </div>
            )}
          </div>

          {/* Mobile Close Button only */}
          <button
            onClick={onClose}
            className="lg:hidden p-1.5 rounded-lg text-muted-foreground hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Sidebar Navigation Menu */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1.5 text-xs font-medium">
          {/* 1. Tổng Quan (Dashboard) */}
          <button
            onClick={() => {
              onGoHome();
              onClose();
            }}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors cursor-pointer ${
              activeView === "dashboard" && selectedSite === "ALL"
                ? "bg-primary text-white shadow-sm shadow-primary/30"
                : "text-muted-foreground hover:text-foreground hover:bg-slate-900"
            }`}
            title={t("overview")}
          >
            <LayoutDashboard className="h-4 w-4 shrink-0" />
            {!isCollapsed && <span>{t("overview")}</span>}
          </button>

          {/* 2. Sơ đồ Mạng (Network Topology Diagram) */}
          <button
            onClick={() => {
              onSelectView("topology");
              onClose();
            }}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors cursor-pointer ${
              activeView === "topology"
                ? "bg-primary text-white shadow-sm shadow-primary/30"
                : "text-muted-foreground hover:text-foreground hover:bg-slate-900"
            }`}
            title={t("networkTopology")}
          >
            <Network className="h-4 w-4 shrink-0" />
            {!isCollapsed && <span>{t("networkTopology")}</span>}
          </button>

          {/* 3. Collapsible 7 Nhà Máy Submenu */}
          <div className="space-y-1">
            <button
              onClick={() => setIsSitesExpanded(!isSitesExpanded)}
              className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-muted-foreground hover:text-foreground hover:bg-slate-900 transition-colors cursor-pointer"
              title={t("factories7")}
            >
              <div className="flex items-center gap-3">
                <Factory className="h-4 w-4 shrink-0 text-blue-400" />
                {!isCollapsed && <span>{t("factories7")}</span>}
              </div>
              {!isCollapsed && (
                isSitesExpanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />
              )}
            </button>

            {/* Collapsible Children */}
            {isSitesExpanded && !isCollapsed && (
              <div className="pl-6 space-y-1 border-l border-slate-800 ml-5 py-1">
                {sites.map((site) => {
                  const isSelected = selectedSite === site.site_code && activeView === "site_detail";
                  const isOnline = site.agent_status === "online";
                  const isWarning = site.agent_status === "warning";

                  return (
                    <button
                      key={site.site_code}
                      onClick={() => {
                        onSelectSite(site.site_code);
                        onSelectView("site_detail");
                        onClose();
                      }}
                      className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-[11px] transition-colors cursor-pointer ${
                        isSelected 
                          ? "bg-slate-800 text-white font-semibold" 
                          : "text-muted-foreground hover:text-foreground hover:bg-slate-900"
                      }`}
                      title={site.code_nm || site.site_name}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${
                          isOnline ? "bg-online glow-online" : isWarning ? "bg-warning" : "bg-destructive"
                        }`} />
                        <span className="truncate">{site.site_name}</span>
                      </div>
                      <span className="text-[10px] font-mono text-muted-foreground shrink-0">
                        {site.device_stats?.total || 0} IP
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* 4. Thông Báo */}
          <button
            onClick={() => {
              onSelectView("notifications");
              onClose();
            }}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-colors cursor-pointer ${
              activeView === "notifications"
                ? "bg-primary text-white shadow-sm shadow-primary/30"
                : "text-muted-foreground hover:text-foreground hover:bg-slate-900"
            }`}
            title={t("notifications")}
          >
            <div className="flex items-center gap-3">
              <Bell className="h-4 w-4 shrink-0 text-amber-400" />
              {!isCollapsed && <span>{t("notifications")}</span>}
            </div>
            {unreadAlertsCount > 0 && !isCollapsed && (
              <span className="flex h-4 min-w-[16px] px-1 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-white shadow-sm glow-offline font-mono">
                {unreadAlertsCount}
              </span>
            )}
          </button>
        </div>

        {/* Sidebar Footer: Admin Profile Card + Dedicated Thoát / Exit Button */}
        <div className="p-2 border-t border-border bg-[#080B11] flex items-center justify-between gap-1">
          <button
            onClick={() => {
              onSelectView("profile");
              onClose();
            }}
            className={`flex-1 flex items-center gap-2.5 p-1.5 rounded-xl transition-all text-left cursor-pointer group min-w-0 ${
              activeView === "profile"
                ? "bg-primary/20 border border-primary/40 text-white"
                : "hover:bg-slate-900 text-foreground border border-transparent"
            }`}
            title={t("profile")}
          >
            <div className="relative shrink-0">
              <img
                src={userSession?.avatarUrl || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=160&q=80"}
                alt="Admin Avatar"
                className="h-8 w-8 rounded-full object-cover border border-primary/40 group-hover:ring-2 group-hover:ring-primary transition-all"
              />
              <span className="absolute bottom-0 right-0 h-2 w-2 rounded-full bg-online border-2 border-[#0B0F17]" />
            </div>

            {!isCollapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-foreground group-hover:text-primary transition-colors truncate leading-tight">
                  {userSession?.displayName || t("profileDefaultRole")}
                </p>
                <p className="text-[10px] text-muted-foreground truncate leading-tight mt-0.5">
                  {userSession?.role || "Administrator"}
                </p>
              </div>
            )}
          </button>

          {/* Nút Thoát / Logout */}
          <button
            onClick={onLogout}
            className="p-2 rounded-xl text-muted-foreground hover:text-destructive hover:bg-red-500/10 transition-colors cursor-pointer shrink-0"
            title={t("logoutConfirm")}
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </aside>
    </>
  );
};
