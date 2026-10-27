import React, { useEffect, useState } from "react";
import { AlertTriangle, Trash2, X, Loader2 } from "lucide-react";
import { useI18n } from "../../i18n";

export interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  message: string;
  itemDetail?: string;
  confirmText?: string;
  cancelText?: string;
  variant?: "danger" | "warning";
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  itemDetail,
  confirmText,
  cancelText,
  variant = "danger",
}) => {
  const { t } = useI18n();
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !submitting) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose, submitting]);

  if (!isOpen) return null;

  const handleConfirm = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (submitting) return;

    try {
      setSubmitting(true);
      await onConfirm();
      onClose();
    } catch (err) {
      console.error("Confirm error:", err);
    } finally {
      setSubmitting(false);
    }
  };

  const isDanger = variant === "danger";

  return (
    <div 
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in"
      onClick={(e) => {
        e.stopPropagation();
        if (!submitting) onClose();
      }}
    >
      <div
        className={`w-full max-w-md bg-slate-950 border ${
          isDanger ? "border-red-500/30 shadow-red-950/40" : "border-amber-500/30 shadow-amber-950/40"
        } rounded-2xl p-5 shadow-2xl relative overflow-hidden animate-in zoom-in-95 duration-150`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Glow accent top line */}
        <div 
          className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${
            isDanger ? "from-red-600 via-rose-500 to-amber-500" : "from-amber-500 via-yellow-400 to-orange-500"
          }`} 
        />

        {/* Header */}
        <div className="flex items-start justify-between gap-3 pb-3">
          <div className="flex items-center gap-3">
            <div 
              className={`p-2.5 rounded-xl ${
                isDanger 
                  ? "bg-red-500/15 border border-red-500/30 text-red-400" 
                  : "bg-amber-500/15 border border-amber-500/30 text-amber-400"
              }`}
            >
              {isDanger ? <Trash2 className="h-5 w-5" /> : <AlertTriangle className="h-5 w-5" />}
            </div>
            <div>
              <h3 className="font-bold text-base text-foreground font-display tracking-tight">
                {title}
              </h3>
            </div>
          </div>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (!submitting) onClose();
            }}
            disabled={submitting}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="py-2 space-y-3">
          <p className="text-xs text-slate-300 leading-relaxed">
            {message}
          </p>

          {itemDetail && (
            <div className="p-2.5 rounded-lg bg-slate-900/90 border border-slate-800 font-mono text-xs text-blue-400 break-all select-all">
              {itemDetail}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            disabled={submitting}
            className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-border text-xs font-medium transition-colors cursor-pointer disabled:opacity-50"
          >
            {cancelText || t("cancelAction", "Hủy bỏ")}
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={submitting}
            className={`px-4 py-2 rounded-xl ${
              isDanger 
                ? "bg-red-600 hover:bg-red-500 shadow-red-600/30" 
                : "bg-amber-600 hover:bg-amber-500 shadow-amber-600/30"
            } text-white font-semibold text-xs transition-colors flex items-center gap-1.5 shadow-lg cursor-pointer disabled:opacity-50`}
          >
            {submitting ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>{t("pinging", "Đang xử lý...")}</span>
              </>
            ) : (
              <>
                <Trash2 className="h-3.5 w-3.5" />
                <span>{confirmText || t("confirmDeleteAction", "Xác nhận xóa")}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
