import type { FC } from "react";
import { X, AlertTriangle, CheckCircle2 } from "lucide-react";
import type { Alert } from "../../types";
import { useI18n } from "../../i18n";

interface AlertDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  alerts: Alert[];
}

export const AlertDrawer: FC<AlertDrawerProps> = ({ isOpen, onClose, alerts }) => {
  const { language, t } = useI18n();
  if (!isOpen) return null;

  return (
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
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
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

              return (
                <div
                  key={alt._id || idx}
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
                    <span className="text-[10px] opacity-75 font-mono">
                      {new Date(alt.created_at).toLocaleTimeString(language === "en" ? "en-US" : "vi-VN", { timeZone: "Asia/Ho_Chi_Minh" })}
                    </span>
                  </div>
                  <p className="text-xs text-foreground font-medium leading-relaxed">{alt.message}</p>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
