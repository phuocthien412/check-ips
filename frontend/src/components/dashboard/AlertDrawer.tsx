import { useState } from "react";
import type { FC } from "react";
import { X, AlertTriangle, CheckCircle2, Trash2 } from "lucide-react";
import type { Alert } from "../../types";
import { useI18n } from "../../i18n";
import { ConfirmModal } from "../common/ConfirmModal";

interface AlertDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  alerts: Alert[];
  onClearAlerts?: () => void;
  onDeleteAlert?: (alertId: string) => void;
}

export const AlertDrawer: FC<AlertDrawerProps> = ({ 
  isOpen, 
  onClose, 
  alerts, 
  onClearAlerts, 
  onDeleteAlert 
}) => {
  const { language, t } = useI18n();
  const [alertToDelete, setAlertToDelete] = useState<{ id: string; message: string } | null>(null);
  const [showClearAllConfirm, setShowClearAllConfirm] = useState(false);

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm transition-opacity animate-in fade-in">
        <div 
          className="w-full max-w-md bg-card border-l border-border h-full flex flex-col shadow-2xl animate-in slide-in-from-right duration-300"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="p-4 border-b border-border flex items-center justify-between bg-slate-900/60">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              <div>
                <h3 className="font-bold text-sm text-foreground">{t("alertsDrawerTitle")}</h3>
                <p className="text-[10px] text-muted-foreground font-mono">{t("alertsDrawerSubtitle")}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-1.5">
              {alerts.length > 0 && onClearAlerts && (
                <button
                  onClick={() => setShowClearAllConfirm(true)}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-red-500/10 border border-border hover:border-red-500/30 text-muted-foreground hover:text-red-400 text-xs flex items-center gap-1 transition-colors cursor-pointer"
                  title={t("clearAllAlerts")}
                >
                  <Trash2 className="h-3 w-3 text-red-400" />
                  <span className="text-[11px]">{t("clearAllAlerts")}</span>
                </button>
              )}
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {alerts.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground text-xs">
                <CheckCircle2 className="h-8 w-8 text-online mx-auto mb-2 opacity-80" />
                {t("allNormalAlerts")}
              </div>
            ) : (
              alerts.map((alt, idx) => {
                const isCrit = alt.level === "critical";
                const alertIndexStr = `#ALERT-${alt.alert_index || (101 + idx)}`;
                const targetId = alt._id || (alt as any).id;

                return (
                  <div
                    key={targetId || idx}
                    className={`p-3 rounded-xl border space-y-1.5 transition-all ${
                      isCrit 
                        ? "bg-red-500/10 border-red-500/30 text-red-200" 
                        : "bg-amber-500/10 border-amber-500/30 text-amber-200"
                    }`}
                  >
                    <div className="flex items-center justify-between text-[11px]">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-[10px] px-1.5 py-0.2 rounded bg-slate-900/80 text-white border border-slate-700">
                          {alertIndexStr}
                        </span>
                        <span className="font-mono font-bold uppercase tracking-wider">{alt.site_code}</span>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-[10px] opacity-75 font-mono">
                          {new Date(alt.created_at).toLocaleTimeString(language === "en" ? "en-US" : "vi-VN", { timeZone: "Asia/Ho_Chi_Minh" })}
                        </span>
                        {onDeleteAlert && targetId && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              e.preventDefault();
                              setAlertToDelete({ id: targetId, message: alt.message });
                            }}
                            className="p-1 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
                            title={language === "vi" ? "Xóa thông báo này" : "Delete this alert"}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                    <p className="text-xs text-foreground font-medium leading-relaxed">{alt.message}</p>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

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
    </>
  );
};
