import { useState } from "react";
import type { FC } from "react";
import { Bell, AlertTriangle, AlertCircle, Info, CheckCircle2, Search, Trash2 } from "lucide-react";
import type { Alert, Site } from "../../types";
import { useI18n } from "../../i18n";

interface NotificationsPageProps {
  alerts: Alert[];
  sites: Site[];
  onClearAlerts?: () => void;
  onDeleteAlert?: (alertId: string) => void;
}

export const NotificationsPage: FC<NotificationsPageProps> = ({
  alerts,
  sites,
  onClearAlerts,
  onDeleteAlert,
}) => {
  const { language, t } = useI18n();
  const [search, setSearch] = useState("");
  const [levelFilter, setLevelFilter] = useState("ALL");
  const [siteFilter, setSiteFilter] = useState("ALL");

  const filteredAlerts = alerts.filter(alt => {
    if (levelFilter !== "ALL" && alt.level !== levelFilter) return false;
    if (siteFilter !== "ALL" && alt.site_code !== siteFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        alt.message.toLowerCase().includes(q) ||
        alt.site_code.toLowerCase().includes(q) ||
        (alt.device_ip && alt.device_ip.includes(q))
      );
    }
    return true;
  });

  const getSiteName = (code: string) => {
    const s = sites.find(x => x.site_code === code);
    return s ? s.site_name : code;
  };

  return (
    <div className="space-y-4">
      {/* Page Header */}
      <div className="bg-card border border-border/80 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center">
              <Bell className="h-4 w-4" />
            </div>
            <h2 className="text-base font-bold font-display text-foreground tracking-tight">
              {t("notificationsCenter")}
            </h2>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30">
              {t("autoIndex")} ({alerts.length})
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {t("notificationsSubtitle")}
          </p>
        </div>

        {alerts.length > 0 && onClearAlerts && (
          <button
            onClick={() => {
              const confirmMsg = language === "vi" 
                ? "Bạn có chắc chắn muốn xóa toàn bộ thông báo cảnh báo?" 
                : "Are you sure you want to clear all alerts?";
              if (window.confirm(confirmMsg)) {
                onClearAlerts();
              }
            }}
            className="px-3 py-1.5 rounded-lg bg-slate-900 border border-border hover:bg-slate-800 text-muted-foreground hover:text-foreground text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Trash2 className="h-3.5 w-3.5 text-red-400" />
            <span>{t("clearAllAlerts")}</span>
          </button>
        )}
      </div>

      {/* Filter and Search Toolbar */}
      <div className="bg-card border border-border/80 rounded-xl p-3 flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("searchAlertPlaceholder")}
            className="w-full bg-slate-900 border border-border rounded-lg pl-9 pr-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>

        {/* Level Filters */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          {[
            { id: "ALL", label: t("filterSeverityAll") },
            { id: "critical", label: t("filterCritical") },
            { id: "warning", label: t("filterWarning") },
            { id: "info", label: t("filterInfo") },
          ].map(lvl => (
            <button
              key={lvl.id}
              onClick={() => setLevelFilter(lvl.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border whitespace-nowrap transition-colors cursor-pointer ${
                levelFilter === lvl.id
                  ? "bg-slate-800 text-white border-slate-600"
                  : "bg-card border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              {lvl.label}
            </button>
          ))}
        </div>

        {/* Site Filter dropdown */}
        <select
          value={siteFilter}
          onChange={(e) => setSiteFilter(e.target.value)}
          className="bg-slate-900 border border-border rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
        >
          <option value="ALL">{t("allFactories")}</option>
          {sites.map(s => (
            <option key={s.site_code} value={s.site_code}>{s.site_name}</option>
          ))}
        </select>
      </div>

      {/* Notifications List */}
      <div className="space-y-2.5">
        {filteredAlerts.length === 0 ? (
          <div className="bg-card border border-border/80 rounded-2xl p-12 text-center text-muted-foreground">
            <CheckCircle2 className="h-10 w-10 text-online mx-auto mb-3 opacity-70" />
            <h4 className="font-semibold text-foreground text-sm">{t("noAlertsTitle")}</h4>
            <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
              {t("noAlertsDesc")}
            </p>
          </div>
        ) : (
          filteredAlerts.map((alt, idx) => {
            const isCrit = alt.level === "critical";
            const isWarn = alt.level === "warning";
            const alertIndexStr = `#ALERT-${alt.alert_index || (101 + idx)}`;

            return (
              <div
                key={alt._id || idx}
                className={`bg-card border rounded-xl p-4 flex flex-col sm:flex-row items-start justify-between gap-3 transition-all hover:border-slate-700 shadow-sm ${
                  isCrit 
                    ? "border-red-500/40 bg-red-500/5" 
                    : isWarn 
                    ? "border-amber-500/40 bg-amber-500/5" 
                    : "border-border/80"
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-lg shrink-0 mt-0.5 ${
                    isCrit 
                      ? "bg-red-500/10 text-destructive" 
                      : isWarn 
                      ? "bg-amber-500/10 text-amber-400" 
                      : "bg-blue-500/10 text-primary"
                  }`}>
                    {isCrit ? <AlertCircle className="h-4 w-4" /> : isWarn ? <AlertTriangle className="h-4 w-4" /> : <Info className="h-4 w-4" />}
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-slate-900 text-white border border-slate-700">
                        {alertIndexStr}
                      </span>
                      <span className="font-bold text-xs text-foreground">
                        {getSiteName(alt.site_code)}
                      </span>
                      {alt.device_ip && (
                        <span className="font-mono text-[11px] text-blue-400 bg-slate-900 px-1.5 py-0.2 rounded">
                          {alt.device_ip}
                        </span>
                      )}
                      <span className={`text-[9px] font-mono uppercase px-1.5 py-0.2 rounded ${
                        isCrit ? "bg-red-500/20 text-red-300" : isWarn ? "bg-amber-500/20 text-amber-300" : "bg-blue-500/20 text-blue-300"
                      }`}>
                        {alt.event_type}
                      </span>
                    </div>

                    <p className="text-xs text-slate-200 leading-relaxed font-sans pt-0.5">
                      {alt.message}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                  <span className="font-mono text-[11px] text-muted-foreground">
                    {new Date(alt.created_at).toLocaleString(language === "en" ? "en-US" : "vi-VN")}
                  </span>
                  {onDeleteAlert && (
                    <button
                      onClick={() => {
                        if (alt._id) onDeleteAlert(alt._id);
                      }}
                      className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
                      title={language === "vi" ? "Xóa thông báo này" : "Delete this alert"}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
