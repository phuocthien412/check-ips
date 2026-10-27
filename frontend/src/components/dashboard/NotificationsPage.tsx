import { useState, useEffect, useMemo } from "react";
import type { FC } from "react";
import { 
  Bell, 
  AlertTriangle, 
  AlertCircle, 
  Info, 
  CheckCircle2, 
  Search, 
  Trash2,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import type { Alert, Site } from "../../types";
import { useI18n } from "../../i18n";
import { ConfirmModal } from "../common/ConfirmModal";

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
  const [alertToDelete, setAlertToDelete] = useState<{ id: string; message: string } | null>(null);
  const [showClearAllConfirm, setShowClearAllConfirm] = useState(false);

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

  // Pagination State (Default 10 per page, with 25, 50, All - same as DeviceList)
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);

  // Reset to page 1 on filter or search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [search, levelFilter, siteFilter]);

  const totalItems = filteredAlerts.length;
  const effectivePageSize = pageSize === -1 ? totalItems : pageSize;
  const totalPages = Math.max(1, Math.ceil(totalItems / (pageSize === -1 ? Math.max(1, totalItems) : pageSize)));
  const safeCurrentPage = Math.min(currentPage, totalPages);

  const paginatedAlerts = useMemo(() => {
    if (pageSize === -1) return filteredAlerts;
    const start = (safeCurrentPage - 1) * pageSize;
    return filteredAlerts.slice(start, start + pageSize);
  }, [filteredAlerts, safeCurrentPage, pageSize]);

  const showingStart = totalItems === 0 ? 0 : (safeCurrentPage - 1) * effectivePageSize + 1;
  const showingEnd = pageSize === -1 ? totalItems : Math.min(safeCurrentPage * pageSize, totalItems);

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
            <h1 className="text-base font-bold font-display text-foreground tracking-tight">
              {t("notificationsCenter")}
            </h1>
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
            onClick={() => setShowClearAllConfirm(true)}
            className="px-3 py-1.5 rounded-lg bg-slate-900 border border-border hover:bg-red-500/10 hover:border-red-500/30 text-muted-foreground hover:text-red-400 text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
            title={t("clearAllAlerts")}
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
        {paginatedAlerts.length === 0 ? (
          <div className="bg-card border border-border/80 rounded-2xl p-12 text-center text-muted-foreground">
            <CheckCircle2 className="h-10 w-10 text-online mx-auto mb-3 opacity-70" />
            <h4 className="font-semibold text-foreground text-sm">{t("noAlertsTitle")}</h4>
            <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
              {t("noAlertsDesc")}
            </p>
          </div>
        ) : (
          paginatedAlerts.map((alt, idx) => {
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
                    {new Date(alt.created_at).toLocaleString(language === "en" ? "en-US" : "vi-VN", { timeZone: "Asia/Ho_Chi_Minh" })}
                  </span>
                  {onDeleteAlert && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        const targetId = alt._id || (alt as any).id;
                        if (targetId) setAlertToDelete({ id: targetId, message: alt.message });
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

      {/* Pagination Controls Bar (Reused identical from DeviceList) */}
      {totalItems > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 py-3 px-4 bg-card border border-border/80 rounded-xl text-xs text-muted-foreground shadow-sm">
          {/* Rows per page selector & range counter */}
          <div className="flex items-center gap-3.5 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="text-slate-400 font-sans">{language === "vi" ? "Hiển thị:" : "Show:"}</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="bg-slate-900 border border-slate-800 text-slate-200 text-xs rounded-lg px-2.5 py-1 focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer font-sans"
              >
                <option value={10}>10 / {language === "vi" ? "trang" : "page"}</option>
                <option value={25}>25 / {language === "vi" ? "trang" : "page"}</option>
                <option value={50}>50 / {language === "vi" ? "trang" : "page"}</option>
                <option value={-1}>{language === "vi" ? "Tất cả" : "All"} ({totalItems})</option>
              </select>
            </div>

            <span className="font-mono text-slate-400">
              <strong className="text-foreground">{showingStart}-{showingEnd}</strong> {language === "vi" ? "trong tổng số" : "of"}{" "}
              <strong className="text-foreground">{totalItems}</strong> {language === "vi" ? "thông báo" : "alerts"}
            </span>
          </div>

          {/* Page Navigation Buttons */}
          {pageSize !== -1 && totalPages > 1 && (
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={safeCurrentPage <= 1}
                className="p-1.5 rounded-lg border border-border bg-slate-900 text-slate-300 hover:text-white hover:border-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
                title={language === "vi" ? "Trang trước" : "Previous page"}
              >
                <ChevronLeft className="h-4 w-4" />
              </button>

              <div className="flex items-center gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter((p) => {
                    if (totalPages <= 7) return true;
                    if (p === 1 || p === totalPages) return true;
                    return Math.abs(p - safeCurrentPage) <= 1;
                  })
                  .map((p, idx, arr) => {
                    const prev = arr[idx - 1];
                    const isEllipsis = prev && p - prev > 1;

                    return (
                      <div key={p} className="flex items-center">
                        {isEllipsis && <span className="px-1 text-slate-500 font-mono">...</span>}
                        <button
                          onClick={() => setCurrentPage(p)}
                          className={`h-7 min-w-[28px] px-2 rounded-lg text-xs font-mono font-medium transition-colors cursor-pointer ${
                            p === safeCurrentPage
                              ? "bg-blue-600 text-white font-bold shadow-sm shadow-blue-500/20"
                              : "bg-slate-900 text-slate-400 hover:text-white border border-slate-800"
                          }`}
                        >
                          {p}
                        </button>
                      </div>
                    );
                  })}
              </div>

              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={safeCurrentPage >= totalPages}
                className="p-1.5 rounded-lg border border-border bg-slate-900 text-slate-300 hover:text-white hover:border-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
                title={language === "vi" ? "Trang sau" : "Next page"}
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Confirm Clear All Alerts Modal */}
      <ConfirmModal
        isOpen={showClearAllConfirm}
        onClose={() => setShowClearAllConfirm(false)}
        onConfirm={async () => {
          if (onClearAlerts) {
            await onClearAlerts();
            setShowClearAllConfirm(false);
          }
        }}
        title={t("confirmClearAllAlertsTitle")}
        message={t("confirmClearAllAlertsDesc")}
        confirmText={t("confirmDeleteAction")}
        cancelText={t("cancelAction")}
        variant="danger"
      />

      {/* Confirm Delete Single Alert Modal */}
      <ConfirmModal
        isOpen={!!alertToDelete}
        onClose={() => setAlertToDelete(null)}
        onConfirm={async () => {
          if (onDeleteAlert && alertToDelete) {
            await onDeleteAlert(alertToDelete.id);
            setAlertToDelete(null);
          }
        }}
        title={t("confirmDeleteAlertTitle")}
        message={t("confirmDeleteAlertDesc")}
        itemDetail={alertToDelete?.message}
        confirmText={t("confirmDeleteAction")}
        cancelText={t("cancelAction")}
        variant="danger"
      />
    </div>
  );
};
