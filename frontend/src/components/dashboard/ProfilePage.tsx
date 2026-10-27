import { useState, useRef } from "react";
import type { FC, SyntheticEvent, ChangeEvent } from "react";
import { User, CheckCircle2, Lock, Camera, Upload, AlertCircle, Loader2 } from "lucide-react";
import type { UserSession } from "../../types";
import { useI18n } from "../../i18n";
import { changePasswordApi, updateUserProfileApi, uploadAvatarApi, getAvatarUrl } from "../../services/api";
import { ConfirmModal } from "../common/ConfirmModal";

interface ProfilePageProps {
  userSession: UserSession | null;
  onUpdateSession?: (session: UserSession) => void;
}

export const ProfilePage: FC<ProfilePageProps> = ({
  userSession,
  onUpdateSession
}) => {
  const { t } = useI18n();
  const [displayName, setDisplayName] = useState(userSession?.displayName || t("profileDefaultRole"));
  const [avatarPreview, setAvatarPreview] = useState(userSession?.avatarUrl || "");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Loading states
  const [savingProfile, setSavingProfile] = useState(false);
  const [changingPass, setChangingPass] = useState(false);

  // Password change states
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);

  // Profile info messages
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);

  // Confirmation modal state
  const [confirmConfig, setConfirmConfig] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    itemDetail?: string;
    confirmText?: string;
    variant?: "primary" | "warning" | "danger";
    onConfirm: () => Promise<void>;
  }>({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: async () => {},
  });

  // Handle Avatar image upload with Confirmation Popup & Multipart upload to Backend
  const handleImageUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert(t("invalidImage"));
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert("Dung lượng ảnh tối đa là 5MB!");
      return;
    }

    // Prompt confirmation popup before uploading file to backend storage
    setConfirmConfig({
      isOpen: true,
      title: "Xác nhận đổi ảnh đại diện",
      message: "Bạn có chắc chắn muốn tải lên và lưu ảnh đại diện mới vào cơ sở dữ liệu không?",
      itemDetail: `Tập tin: ${file.name} (${(file.size / 1024).toFixed(1)} KB)`,
      confirmText: "Tải lên & Lưu",
      variant: "primary",
      onConfirm: async () => {
        try {
          setSavingProfile(true);
          // Standard Multipart file upload to backend (never saved in frontend public/assets!)
          const newAvatarPath = await uploadAvatarApi(file);
          setAvatarPreview(newAvatarPath);

          if (userSession && onUpdateSession) {
            onUpdateSession({ ...userSession, avatarUrl: newAvatarPath });
          }
          setSavedSuccess(true);
          setTimeout(() => setSavedSuccess(false), 3000);
        } catch (err: any) {
          setProfileError(err?.message || "Failed to upload avatar");
          setTimeout(() => setProfileError(null), 4000);
        } finally {
          setSavingProfile(false);
        }
      }
    });

    // Reset file input so user can choose again if cancelled
    e.target.value = "";
  };

  // Handle Save Profile info with Confirmation Popup
  const handleSaveProfileSubmit = (e: SyntheticEvent) => {
    e.preventDefault();
    setProfileError(null);
    setSavedSuccess(false);

    const cleanName = displayName.trim();
    if (!cleanName) {
      return;
    }

    if (!userSession?.username) {
      setProfileError("User session not found");
      return;
    }

    // Prompt confirmation popup before saving Display Name to MongoDB
    setConfirmConfig({
      isOpen: true,
      title: "Xác nhận cập nhật hồ sơ",
      message: "Bạn có chắc chắn muốn lưu tên hiển thị mới vào cơ sở dữ liệu không?",
      itemDetail: `Tên hiển thị mới: ${cleanName}`,
      confirmText: "Lưu thay đổi",
      variant: "primary",
      onConfirm: async () => {
        try {
          setSavingProfile(true);
          const updated = await updateUserProfileApi(userSession.username, { displayName: cleanName });
          if (onUpdateSession) {
            onUpdateSession(updated);
          }
          setSavedSuccess(true);
          setTimeout(() => setSavedSuccess(false), 3000);
        } catch (err: any) {
          setProfileError(err?.message || "Failed to update profile");
          setTimeout(() => setProfileError(null), 4000);
        } finally {
          setSavingProfile(false);
        }
      }
    });
  };

  // Handle Change Password with Validation & Confirmation Popup
  const handleChangePasswordSubmit = (e: SyntheticEvent) => {
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

    // Prompt confirmation popup before updating password in MongoDB
    setConfirmConfig({
      isOpen: true,
      title: "Xác nhận đổi mật khẩu",
      message: "Bạn có chắc chắn muốn cập nhật mật khẩu đăng nhập mới cho tài khoản này không?",
      itemDetail: `Tài khoản: ${userSession?.username || "admin"}`,
      confirmText: "Đổi mật khẩu",
      variant: "warning",
      onConfirm: async () => {
        try {
          setChangingPass(true);
          if (userSession?.username) {
            await changePasswordApi({
              username: userSession.username,
              current_password: currentPassword,
              new_password: newPassword
            });
          }
          setPasswordSuccess(t("passwordUpdated"));
          setCurrentPassword("");
          setNewPassword("");
          setConfirmPassword("");
          setTimeout(() => setPasswordSuccess(null), 4000);
        } catch (err: any) {
          setPasswordError(err?.message || "Failed to update password");
        } finally {
          setChangingPass(false);
        }
      }
    });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* 1. Profile Header & Avatar Changer */}
      <div className="bg-card border border-border/80 rounded-2xl p-6 relative overflow-hidden shadow-lg">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
          {/* Avatar with Upload button */}
          <div className="relative group">
            <img
              src={getAvatarUrl(avatarPreview)}
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
            <div className="flex flex-wrap items-center gap-2 justify-center sm:justify-start">
              <h1 className="text-xl font-bold font-display text-foreground">{displayName}</h1>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-primary/20 text-primary border border-primary/30 font-mono">
                {userSession?.role || "Administrator"}
              </span>
            </div>
            <p className="text-xs text-muted-foreground font-mono mt-0.5">@{userSession?.username || "admin"}</p>

            <p className="text-xs text-slate-300 mt-2">
              {t("companyName")}
            </p>

            <div className="mt-3">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={savingProfile}
                className="px-3 py-1.5 rounded-lg bg-slate-900 border border-border hover:bg-slate-800 text-xs text-foreground inline-flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
              >
                <Upload className="h-3.5 w-3.5 text-primary" />
                <span>{t("changeAvatarBtn")}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {savedSuccess && (
        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-online text-xs flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{t("profileUpdated")}</span>
        </div>
      )}

      {profileError && (
        <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-destructive text-xs flex items-center gap-2 animate-in fade-in">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{profileError}</span>
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

          <form onSubmit={handleSaveProfileSubmit} className="space-y-3.5 text-xs">
            <div>
              <label className="block text-muted-foreground font-medium mb-1">{t("displayName")}</label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Nhập tên hiển thị"
                className="w-full bg-slate-900 border border-border rounded-xl px-3 py-2 text-foreground focus:ring-1 focus:ring-primary focus:outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-muted-foreground font-medium mb-1">Username / Tài khoản</label>
              <input
                type="text"
                value={userSession?.username || ""}
                disabled
                className="w-full bg-slate-900/60 border border-border rounded-xl px-3 py-2 text-muted-foreground font-mono cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block text-muted-foreground font-medium mb-1">Quyền hạn (Role)</label>
              <input
                type="text"
                value={userSession?.role || "Administrator"}
                disabled
                className="w-full bg-slate-900/60 border border-border rounded-xl px-3 py-2 text-muted-foreground font-mono cursor-not-allowed"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={savingProfile}
                className="w-full py-2.5 px-4 bg-primary hover:bg-primary/90 text-white rounded-xl font-medium transition-colors cursor-pointer shadow-sm shadow-primary/20 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {savingProfile ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Đang lưu vào DB...</span>
                  </>
                ) : (
                  <span>{t("updateProfileBtn")}</span>
                )}
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
            <div className="p-2.5 rounded-lg bg-red-500/10 border border-red-500/20 text-destructive text-xs flex items-center gap-2 animate-in fade-in">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{passwordError}</span>
            </div>
          )}

          {passwordSuccess && (
            <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-online text-xs flex items-center gap-2 animate-in fade-in">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>{passwordSuccess}</span>
            </div>
          )}

          <form onSubmit={handleChangePasswordSubmit} className="space-y-3 text-xs">
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
                disabled={changingPass}
                className="w-full py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-medium transition-colors cursor-pointer border border-slate-700 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {changingPass ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Đang cập nhật...</span>
                  </>
                ) : (
                  <span>{t("updatePasswordBtn")}</span>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Confirmation Modal */}
      <ConfirmModal
        isOpen={confirmConfig.isOpen}
        onClose={() => setConfirmConfig((prev) => ({ ...prev, isOpen: false }))}
        onConfirm={confirmConfig.onConfirm}
        title={confirmConfig.title}
        message={confirmConfig.message}
        itemDetail={confirmConfig.itemDetail}
        confirmText={confirmConfig.confirmText}
        variant={confirmConfig.variant || "primary"}
      />
    </div>
  );
};
