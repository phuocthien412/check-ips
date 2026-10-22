import { useState } from "react";
import type { FC, FormEvent } from "react";
import { PlusCircle, X, Wifi } from "lucide-react";
import type { Site, Device } from "../../types";
import { useI18n } from "../../i18n";

interface AddDeviceModalProps {
  isOpen: boolean;
  onClose: () => void;
  sites: Site[];
  selectedSite: string;
  onAddDevice: (data: {
    site_code: string;
    ip: string;
    hostname?: string;
    mac?: string;
    vendor?: string;
    device_type?: Device["device_type"];
    custom_notes?: string;
  }) => Promise<void>;
}

export const AddDeviceModal: FC<AddDeviceModalProps> = ({
  isOpen,
  onClose,
  sites,
  selectedSite,
  onAddDevice,
}) => {
  const { t } = useI18n();
  const [siteCode, setSiteCode] = useState(
    selectedSite !== "ALL" ? selectedSite : sites[0]?.site_code || "NM_BINH_DUONG"
  );
  const [ip, setIp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    // Support single IP or multiple IPs separated by comma or spaces
    const rawIps = ip.split(/[\s,]+/).map(s => s.trim()).filter(Boolean);
    const ipRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;

    if (rawIps.length === 0) {
      setError(t("enterAtLeastOneIp"));
      return;
    }

    for (const singleIp of rawIps) {
      if (!ipRegex.test(singleIp)) {
        setError(`${singleIp}: ${t("invalidIpAddress")}`);
        return;
      }
    }

    setLoading(true);
    try {
      for (const singleIp of rawIps) {
        await onAddDevice({
          site_code: siteCode,
          ip: singleIp,
          hostname: `Device-${singleIp}`,
          device_type: "workstation",
        });
      }
      setIp("");
      onClose();
    } catch (err: any) {
      setError(err?.message || t("addIpError"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in">
      <div 
        className="w-full max-w-md bg-card border border-border rounded-2xl p-6 shadow-2xl relative overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-3.5 border-b border-border">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <PlusCircle className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-foreground font-display">{t("addDeviceTitle")}</h3>
              <p className="text-xs text-muted-foreground">{t("addDeviceSubtitle")}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {error && (
          <div className="mt-3.5 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-destructive text-xs">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4 text-xs">
          {/* Site selection */}
          <div>
            <label className="block text-muted-foreground font-medium mb-1.5">{t("selectSite")}</label>
            <select
              value={siteCode}
              onChange={(e) => setSiteCode(e.target.value)}
              className="w-full bg-slate-900 border border-border rounded-xl px-3 py-2.5 text-foreground focus:ring-1 focus:ring-primary focus:outline-none cursor-pointer"
              required
            >
              {sites.map((s) => (
                <option key={s.site_code} value={s.site_code}>
                  {s.site_name}
                </option>
              ))}
            </select>
          </div>

          {/* Simple IP Address input */}
          <div>
            <label className="block text-muted-foreground font-medium mb-1.5">
              {t("ipAddressLabel")}
            </label>
            <div className="relative">
              <Wifi className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <textarea
                value={ip}
                onChange={(e) => setIp(e.target.value)}
                placeholder={t("ipAddressPlaceholder")}
                rows={3}
                autoFocus
                className="w-full bg-slate-900 border border-border rounded-xl pl-9 pr-3 py-2.5 text-foreground font-mono focus:ring-1 focus:ring-primary focus:outline-none resize-none leading-relaxed"
                required
              />
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              {t("ipAddressHint")}
            </p>
          </div>

          <div className="pt-2 flex justify-end gap-2 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl transition-colors cursor-pointer"
            >
              {t("cancel")}
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 bg-primary hover:bg-primary/90 text-white font-medium rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm shadow-primary/20"
            >
              <PlusCircle className="h-4 w-4" />
              <span>{loading ? t("adding") : t("submitAddPing")}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
