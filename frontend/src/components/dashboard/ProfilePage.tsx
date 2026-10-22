import { useState, useRef } from "react";
import type { FC, FormEvent, ChangeEvent } from "react";
import { User, Factory, LogOut, CheckCircle2, Lock, Camera, Upload, AlertCircle } from "lucide-react";
import type { UserSession, Site } from "../../types";
import { useI18n } from "../../i18n";

interface ProfilePageProps {
  userSession: UserSession | null;
  sites: Site[];
  onLogout: () => void;
  onUpdateDisplayName?: (name: string) => void;
  onUpdateAvatar?: (avatarUrl: string) => void;
}

export const ProfilePage: FC<ProfilePageProps> = ({
  userSession,
  sites,
  onLogout,
  onUpdateDisplayName,
  onUpdateAvatar
}) => {
  const { t } = useI18n();
  const [displayName, setDisplayName] = useState(userSession?.displayName || t("profileDefaultRole"));
  const [avatarPreview, setAvatarPreview] = useState(
    userSession?.avatarUrl || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=160&q=80"
  );
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Password change states
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);

  // Profile info message
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Handle Avatar image upload
  const handleImageUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert(t("invalidImage"));
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const base64Url = reader.result as string;
      setAvatarPreview(base64Url);
      if (onUpdateAvatar) {
        onUpdateAvatar(base64Url);
      }
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    };
    reader.readAsDataURL(file);
  };

  const handleSaveProfile = (e: FormEvent) => {
    e.preventDefault();
    if (onUpdateDisplayName) {
      onUpdateDisplayName(displayName);
    }
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  const handleChangePassword = (e: FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(null);

    if (!currentPassword) {
      setPasswordError(t("currentPasswordRequired"));
      return;
    }
    if (newPassword.length < 6) {
      setPasswordError(t("passwordMinLength"));
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError(t("passwordMismatch"));
      return;
    }

    // Save updated password in localStorage
    localStorage.setItem("sabibeco_admin_password", newPassword);
    setPasswordSuccess(t("passwordUpdated"));
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setTimeout(() => setPasswordSuccess(null), 4000);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* 1. Profile Header & Avatar Changer */}
      <div className="bg-card border border-border/80 rounded-2xl p-6 relative overflow-hidden shadow-lg">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
          {/* Avatar with Upload button */}
          <div className="relative group">
            <img
              src={avatarPreview}
              alt="Avatar"
              className="h-24 w-24 rounded-2xl object-cover border-2 border-primary/50 shadow-md group-hover:opacity-90 transition-opacity"
            />
            <span className="absolute -bottom-1 -right-1 h-4 w-4 rounded-full bg-online border-2 border-background" />

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="absolute inset-0 bg-black/50 rounded-2xl opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-white text-[10px] font-medium transition-opacity cursor-pointer gap-1"
              title={t("changeAvatarHover")}
            >
              <Camera className="h-5 w-5" />
              <span>{t("changeAvatarHover")}</span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleImageUpload}
            />
          </div>

          <div className="text-center sm:text-left flex-1">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h1 className="text-xl font-bold font-display text-foreground">{displayName}</h1>
                <p className="text-xs text-muted-foreground font-mono">admin@sabibeco.com.vn</p>
              </div>

              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-primary/20 text-primary border border-primary/30 font-mono inline-block">
                {userSession?.role || "Administrator"}
              </span>
            </div>

            <p className="text-xs text-slate-300 mt-2">
              {t("companyName")}
            </p>

            <div className="mt-3">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-3 py-1.5 rounded-lg bg-slate-900 border border-border hover:bg-slate-800 text-xs text-foreground inline-flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Upload className="h-3.5 w-3.5 text-primary" />
                <span>{t("changeAvatarBtn")}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {savedSuccess && (
        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-online text-xs flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{t("profileUpdated")}</span>
        </div>
      )}

      {/* 2. Profile Details & Password Change */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Box A: Edit Display Name & Account Info */}
        <div className="bg-card border border-border/80 rounded-2xl p-5 space-y-4 shadow-sm">
          <div className="flex items-center gap-2 border-b border-border pb-3">
            <User className="h-4 w-4 text-primary" />
            <h3 className="font-bold text-sm text-foreground">{t("accountInfo")}</h3>
          </div>

          <form onSubmit={handleSaveProfile} className="space-y-3.5 text-xs">
            <div>
              <label className="block text-muted-foreground font-medium mb-1">{t("displayName")}</label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full bg-slate-900 border border-border rounded-xl px-3 py-2 text-foreground focus:ring-1 focus:ring-primary focus:outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-muted-foreground font-medium mb-1">{t("workEmail")}</label>
              <input
                type="email"
                value="admin@sabibeco.com.vn"
                disabled
                className="w-full bg-slate-900/60 border border-border rounded-xl px-3 py-2 text-muted-foreground font-mono cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block text-muted-foreground font-medium mb-1">{t("siteAgentToken")}</label>
              <input
                type="password"
                value="sabibeco-secret-token-2026"
                disabled
                className="w-full bg-slate-900/60 border border-border rounded-xl px-3 py-2 text-muted-foreground font-mono cursor-not-allowed"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                className="w-full py-2.5 px-4 bg-primary hover:bg-primary/90 text-white rounded-xl font-medium transition-colors cursor-pointer shadow-sm shadow-primary/20"
              >
                {t("updateProfileBtn")}
              </button>
            </div>
          </form>
        </div>

        {/* Box B: ĐỔI MẬT KHẨU (Change Password) */}
        <div className="bg-card border border-border/80 rounded-2xl p-5 space-y-4 shadow-sm">
          <div className="flex items-center gap-2 border-b border-border pb-3">
            <Lock className="h-4 w-4 text-amber-400" />
            <h3 className="font-bold text-sm text-foreground">{t("changePasswordTitle")}</h3>
          </div>

          {passwordError && (
            <div className="p-2.5 rounded-lg bg-red-500/10 border border-red-500/20 text-destructive text-xs flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{passwordError}</span>
            </div>
          )}

          {passwordSuccess && (
            <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-online text-xs flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>{passwordSuccess}</span>
            </div>
          )}

          <form onSubmit={handleChangePassword} className="space-y-3 text-xs">
            <div>
              <label className="block text-muted-foreground font-medium mb-1">{t("currentPassword")}</label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder={t("currentPasswordPlaceholder")}
                className="w-full bg-slate-900 border border-border rounded-xl px-3 py-2 text-foreground focus:ring-1 focus:ring-primary focus:outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-muted-foreground font-medium mb-1">{t("newPassword")}</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder={t("newPasswordPlaceholder")}
                className="w-full bg-slate-900 border border-border rounded-xl px-3 py-2 text-foreground focus:ring-1 focus:ring-primary focus:outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-muted-foreground font-medium mb-1">{t("confirmPassword")}</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder={t("confirmPasswordPlaceholder")}
                className="w-full bg-slate-900 border border-border rounded-xl px-3 py-2 text-foreground focus:ring-1 focus:ring-primary focus:outline-none"
                required
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                className="w-full py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-medium transition-colors cursor-pointer border border-slate-700"
              >
                {t("updatePasswordBtn")}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* 3. Scope of 7 Factories & Logout */}
      <div className="bg-card border border-border/80 rounded-2xl p-5 space-y-3">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div className="flex items-center gap-2">
            <Factory className="h-4 w-4 text-blue-400" />
            <h3 className="font-bold text-sm text-foreground">{t("managedSitesScope")}</h3>
          </div>
          <button
            onClick={onLogout}
            className="px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-destructive border border-red-500/30 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span>{t("logout")}</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5 pt-1">
          {sites.map(s => (
            <div key={s.site_code} className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800 text-xs">
              <div className="flex items-center gap-1.5 font-semibold text-foreground">
                <span className={`h-1.5 w-1.5 rounded-full ${s.agent_status === "online" ? "bg-online" : "bg-destructive"}`} />
                <span className="truncate">{s.site_name}</span>
              </div>
              <p className="text-[10px] font-mono text-muted-foreground mt-1 truncate">{s.site_code}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
