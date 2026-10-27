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
import { getAvatarUrl } from "../../services/api";

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
          className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm lg:hidden animate-in fade-in"
          onClick={onClose}
        />
      )}

      {/* Sidebar Container */}
      <aside className={`
        fixed top-0 bottom-0 left-0 z-50 flex flex-col bg-[#070D18]/95 backdrop-blur-xl border-r border-slate-800/80 transition-all duration-300 ease-in-out
        ${isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
        ${isCollapsed ? "lg:w-20" : "w-64"}
      `}>
        {/* Sidebar Header: Brand */}
        <div className="h-16 flex items-center justify-between px-3.5 border-b border-slate-800/80">
          <div 
            onClick={onGoHome}
            className={`flex items-center gap-3 cursor-pointer select-none group ${isCollapsed ? "mx-auto justify-center" : ""}`}
            title={t("overview")}
          >
            <div className="h-10 w-10 rounded-xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-400 group-hover:scale-105 group-hover:border-blue-400 group-hover:shadow-[0_0_12px_rgba(56,189,248,0.35)] transition-all shrink-0">
              <Activity className="h-5 w-5 animate-pulse text-cyan-400" />
            </div>
            {!isCollapsed && (
              <div className="min-w-0">
                <span className="font-display font-bold text-base text-white tracking-tight leading-none block">
                  {t("brand")}
                </span>
                <span className="text-[10px] text-slate-400 font-mono tracking-wider uppercase block mt-1">
                  NOC Center
                </span>
              </div>
            )}
          </div>

          {/* Mobile Close Button only */}
          <button
            onClick={onClose}
            className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Sidebar Navigation Menu */}
        <div className={`flex-1 overflow-y-auto py-4 space-y-1.5 text-xs font-medium no-scrollbar ${isCollapsed ? "px-2" : "px-3"}`}>
          {/* 1. Tổng Quan (Dashboard) */}
          <button
            onClick={() => {
              onGoHome();
              onClose();
            }}
            className={`relative group flex items-center transition-all duration-200 cursor-pointer ${
              isCollapsed 
                ? "h-11 w-11 mx-auto justify-center rounded-xl"
                : "w-full gap-3 px-3 py-2.5 rounded-xl text-left"
            } ${
              activeView === "dashboard" && selectedSite === "ALL"
                ? "bg-blue-600/20 text-white border border-blue-500/30 shadow-[0_0_14px_rgba(59,130,246,0.25)] font-semibold"
                : "text-slate-400 hover:text-white hover:bg-slate-800/50 border border-transparent"
            }`}
            title={t("overview")}
          >
            {/* Active glowing indicator bar */}
            {activeView === "dashboard" && selectedSite === "ALL" && (
              <span className={`absolute bg-blue-400 rounded-r shadow-[0_0_8px_#38bdf8] ${
                isCollapsed ? "-left-2 top-2.5 bottom-2.5 w-1" : "left-0 top-2 bottom-2 w-1"
              }`} />
            )}
            <LayoutDashboard className={`h-4 w-4 shrink-0 transition-colors ${
              activeView === "dashboard" && selectedSite === "ALL" ? "text-cyan-400" : "text-slate-400 group-hover:text-slate-200"
            }`} />
            {!isCollapsed && <span className="truncate">{t("overview")}</span>}
          </button>

          {/* 2. Sơ đồ Mạng (Network Topology Diagram) */}
          <button
            onClick={() => {
              onSelectView("topology");
              onClose();
            }}
            className={`relative group flex items-center transition-all duration-200 cursor-pointer ${
              isCollapsed 
                ? "h-11 w-11 mx-auto justify-center rounded-xl"
                : "w-full gap-3 px-3 py-2.5 rounded-xl text-left"
            } ${
              activeView === "topology"
                ? "bg-blue-600/20 text-white border border-blue-500/30 shadow-[0_0_14px_rgba(59,130,246,0.25)] font-semibold"
                : "text-slate-400 hover:text-white hover:bg-slate-800/50 border border-transparent"
            }`}
            title={t("networkTopology")}
          >
            {activeView === "topology" && (
              <span className={`absolute bg-blue-400 rounded-r shadow-[0_0_8px_#38bdf8] ${
                isCollapsed ? "-left-2 top-2.5 bottom-2.5 w-1" : "left-0 top-2 bottom-2 w-1"
              }`} />
            )}
            <Network className={`h-4 w-4 shrink-0 transition-colors ${
              activeView === "topology" ? "text-cyan-400" : "text-slate-400 group-hover:text-slate-200"
            }`} />
            {!isCollapsed && <span className="truncate">{t("networkTopology")}</span>}
          </button>

          {/* 3. Collapsible 7 Nhà Máy Submenu */}
          <div className="space-y-1">
            <button
              onClick={() => {
                if (isCollapsed) {
                  onGoHome();
                } else {
                  setIsSitesExpanded(!isSitesExpanded);
                }
              }}
              className={`relative group flex items-center transition-all duration-200 cursor-pointer ${
                isCollapsed 
                  ? "h-11 w-11 mx-auto justify-center rounded-xl" 
                  : "w-full justify-between px-3 py-2.5 rounded-xl text-left"
              } ${
                activeView === "site_detail"
                  ? "bg-blue-600/20 text-white border border-blue-500/30 shadow-[0_0_14px_rgba(59,130,246,0.25)] font-semibold"
                  : "text-slate-400 hover:text-white hover:bg-slate-800/50 border border-transparent"
              }`}
              title={t("factories7")}
            >
              {activeView === "site_detail" && (
                <span className={`absolute bg-blue-400 rounded-r shadow-[0_0_8px_#38bdf8] ${
                  isCollapsed ? "-left-2 top-2.5 bottom-2.5 w-1" : "left-0 top-2 bottom-2 w-1"
                }`} />
              )}
              <div className="flex items-center gap-3 min-w-0">
                <Factory className={`h-4 w-4 shrink-0 transition-colors ${
                  activeView === "site_detail" ? "text-cyan-400" : "text-blue-400 group-hover:text-blue-300"
                }`} />
                {!isCollapsed && <span className="truncate">{t("factories7")}</span>}
              </div>
              {!isCollapsed && (
                isSitesExpanded ? <ChevronDown className="h-3.5 w-3.5 text-slate-500" /> : <ChevronRight className="h-3.5 w-3.5 text-slate-500" />
              )}
            </button>

            {/* Collapsible Children in Expanded Mode */}
            {isSitesExpanded && !isCollapsed && (
              <div className="pl-4 pr-1 space-y-1 border-l border-slate-800/80 ml-5 py-1">
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
                      className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-[11px] transition-all cursor-pointer ${
                        isSelected 
                          ? "bg-blue-500/15 text-white font-semibold border border-blue-500/30 shadow-sm" 
                          : "text-slate-400 hover:text-white hover:bg-slate-800/40 border border-transparent"
                      }`}
                      title={site.site_name}
                    >
                      <div className="flex items-center gap-2 truncate min-w-0">
                        <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${
                          isOnline ? "bg-emerald-400 glow-online" : isWarning ? "bg-amber-400" : "bg-red-400"
                        }`} />
                        <span className="truncate">{site.site_name}</span>
                      </div>
                      <span className="text-[10px] font-mono text-slate-400 shrink-0 ml-1.5 px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800">
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
            className={`relative group flex items-center transition-all duration-200 cursor-pointer ${
              isCollapsed 
                ? "h-11 w-11 mx-auto justify-center rounded-xl"
                : "w-full justify-between px-3 py-2.5 rounded-xl text-left"
            } ${
              activeView === "notifications"
                ? "bg-blue-600/20 text-white border border-blue-500/30 shadow-[0_0_14px_rgba(59,130,246,0.25)] font-semibold"
                : "text-slate-400 hover:text-white hover:bg-slate-800/50 border border-transparent"
            }`}
            title={t("notifications")}
          >
            {activeView === "notifications" && (
              <span className={`absolute bg-blue-400 rounded-r shadow-[0_0_8px_#38bdf8] ${
                isCollapsed ? "-left-2 top-2.5 bottom-2.5 w-1" : "left-0 top-2 bottom-2 w-1"
              }`} />
            )}
            <div className="flex items-center gap-3">
              <div className="relative">
                <Bell className={`h-4 w-4 shrink-0 transition-colors ${
                  activeView === "notifications" ? "text-amber-400" : "text-amber-400/80 group-hover:text-amber-300"
                }`} />
                {unreadAlertsCount > 0 && isCollapsed && (
                  <span className="absolute -top-1.5 -right-1.5 flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500 ring-2 ring-[#070D18]" />
                  </span>
                )}
              </div>
              {!isCollapsed && <span className="truncate">{t("notifications")}</span>}
            </div>
            {unreadAlertsCount > 0 && !isCollapsed && (
              <span className="flex h-4 min-w-[18px] px-1 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white shadow-sm glow-offline font-mono">
                {unreadAlertsCount}
              </span>
            )}
          </button>
        </div>

        {/* Sidebar Footer: Admin Profile Card + Dedicated Thoát / Exit Button */}
        <div className={`p-2 border-t border-slate-800/80 bg-[#060A13] flex items-center ${isCollapsed ? "flex-col gap-2" : "justify-between gap-1.5"}`}>
          <button
            onClick={() => {
              onSelectView("profile");
              onClose();
            }}
            className={`flex items-center rounded-xl transition-all text-left cursor-pointer group ${
              isCollapsed ? "p-1.5 justify-center" : "flex-1 gap-2.5 p-1.5 min-w-0"
            } ${
              activeView === "profile"
                ? "bg-blue-500/20 border border-blue-500/40 text-white"
                : "hover:bg-slate-900/80 text-slate-200 border border-transparent"
            }`}
            title={t("profile")}
          >
            <div className="relative shrink-0">
              <img
                src={getAvatarUrl(userSession?.avatarUrl)}
                alt="Admin Avatar"
                className="h-8 w-8 rounded-full object-cover border border-blue-400/40 group-hover:ring-2 group-hover:ring-blue-400 transition-all"
              />
              <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-emerald-400 border-2 border-[#060A13]" />
            </div>

            {!isCollapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-white group-hover:text-cyan-300 transition-colors truncate leading-tight">
                  {userSession?.displayName || t("profileDefaultRole")}
                </p>
                <p className="text-[10px] text-slate-400 truncate leading-tight mt-0.5">
                  {userSession?.role || "Administrator"}
                </p>
              </div>
            )}
          </button>

          {/* Nút Thoát / Logout */}
          <button
            onClick={onLogout}
            className={`rounded-xl text-slate-400 hover:text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 transition-all cursor-pointer ${
              isCollapsed ? "p-2" : "p-2 shrink-0"
            }`}
            title={t("logoutConfirm")}
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </aside>
    </>
  );
};
