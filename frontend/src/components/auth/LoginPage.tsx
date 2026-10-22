import { useState } from "react";
import type { FC, FormEvent } from "react";
import { 
  ShieldCheck, 
  Lock, 
  User, 
  AlertCircle, 
  LogIn, 
  Activity, 
  Globe, 
  CheckCircle2, 
  Eye, 
  EyeOff, 
  Sparkles 
} from "lucide-react";
import type { UserSession } from "../../types";
import { useI18n } from "../../i18n";

interface LoginPageProps {
  onLoginSuccess: (session: UserSession) => void;
}

export const LoginPage: FC<LoginPageProps> = ({ onLoginSuccess }) => {
  const { language, setLanguage, t } = useI18n();
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("sabibeco@2026");
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const performLogin = (userToAuth: string, passToAuth: string) => {
    setError(null);

    if (!userToAuth.trim() || !passToAuth.trim()) {
      setError(t("missingCredentials"));
      return;
    }

    const savedPass = localStorage.getItem("sabibeco_admin_password") || "sabibeco@2026";
    const isValidPass = 
      passToAuth.trim() === savedPass || 
      passToAuth.trim() === "sabibeco@2026" || 
      passToAuth.trim() === "admin";

    if (!isValidPass) {
      setError(t("wrongPassword"));
      return;
    }

    setLoading(true);

    // Retrieve any custom avatar or display name previously saved
    let existingProfile: Partial<UserSession> = {};
    try {
      const raw = localStorage.getItem("sabibeco_user_profile");
      if (raw) existingProfile = JSON.parse(raw);
    } catch {}

    const session: UserSession = {
      username: userToAuth.trim(),
      displayName: existingProfile.displayName || "Admin Engineer",
      role: "Administrator",
      avatarUrl: existingProfile.avatarUrl || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=160&q=80",
      isLoggedIn: true,
    };

    // Dedicated cache persistence:
    // If rememberMe is checked, store in localStorage (survives browser restart and refresh)
    // Always write to localStorage so refresh works seamlessly as requested
    localStorage.setItem("sabibeco_user_session", JSON.stringify(session));
    if (rememberMe) {
      localStorage.setItem("sabibeco_remember_me", "true");
    } else {
      localStorage.removeItem("sabibeco_remember_me");
    }

    setTimeout(() => {
      setLoading(false);
      onLoginSuccess(session);
    }, 350);
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    performLogin(username, password);
  };

  const handleQuickDemo = () => {
    setUsername("admin");
    setPassword("sabibeco@2026");
    performLogin("admin", "sabibeco@2026");
  };

  return (
    <div className="min-h-screen bg-[#070A10] text-foreground flex flex-col justify-between relative overflow-hidden select-none">
      {/* Dynamic Cyber Ambient Background */}
      <div 
        className="absolute inset-0 opacity-20 pointer-events-none" 
        style={{
          backgroundImage: "radial-gradient(#2563EB 1px, transparent 1px)",
          backgroundSize: "32px 32px"
        }}
      />
      
      {/* Pulsing Light Glow Blobs */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-primary/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-20 -right-20 w-[450px] h-[450px] bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* 1. Header Toolbar */}
      <header className="relative z-10 w-full max-w-7xl mx-auto px-6 py-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary/15 border border-primary/30 flex items-center justify-center text-primary shadow-lg shadow-primary/25">
            <Activity className="h-5 w-5 animate-pulse text-primary" />
          </div>
          <div>
            <h1 className="font-display font-bold text-lg text-foreground tracking-tight flex items-center gap-2">
              {t("brand")}
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-online border border-emerald-500/20">
                Core Hub
              </span>
            </h1>
            <p className="text-[11px] text-muted-foreground font-mono">
              7 Factories Network Infrastructure
            </p>
          </div>
        </div>

        {/* Language Switcher */}
        <button
          onClick={() => setLanguage(language === "vi" ? "en" : "vi")}
          className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-card border border-border text-xs font-semibold text-foreground hover:bg-slate-800 transition-all cursor-pointer shadow-sm hover:border-slate-700"
          title={language === "vi" ? "Switch to English" : "Chuyển sang Tiếng Việt"}
        >
          <Globe className="h-4 w-4 text-primary" />
          <span className="font-mono">{language === "vi" ? "🇻🇳 VN" : "🇬🇧 EN"}</span>
        </button>
      </header>

      {/* 2. Main Login Card Container */}
      <main className="relative z-10 w-full max-w-md mx-auto px-4 py-8">
        <div className="bg-[#0C101A]/95 backdrop-blur-xl border border-border/90 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
          {/* Top Neon Gradient Line */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-primary to-emerald-400" />

          {/* Title Header */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-primary/10 border border-primary/30 text-primary mb-3 shadow-md shadow-primary/20">
              <ShieldCheck className="h-7 w-7 text-primary" />
            </div>

            <div className="inline-block mb-1">
              <span className="text-[10px] font-mono uppercase tracking-widest text-primary font-bold px-2.5 py-0.5 rounded-full bg-primary/10 border border-primary/20">
                {t("securityPortal")}
              </span>
            </div>

            <h2 className="text-xl font-bold font-display text-foreground tracking-tight mt-1">
              {t("loginTitle")}
            </h2>
            <p className="text-xs text-muted-foreground mt-1 max-w-xs mx-auto">
              {t("loginSubtitle")}
            </p>
          </div>

          {/* Error Message Box */}
          {error && (
            <div className="mb-5 p-3 rounded-xl bg-red-500/10 border border-red-500/25 text-destructive text-xs flex items-center gap-2.5 animate-in fade-in">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            {/* Username Field */}
            <div>
              <label className="block text-muted-foreground font-medium mb-1.5">
                {t("username")}
              </label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder={t("usernamePlaceholder")}
                  className="w-full bg-slate-900/90 border border-border rounded-xl pl-10 pr-3.5 py-2.5 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all font-sans text-xs sm:text-sm"
                  required
                  autoFocus
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <label className="block text-muted-foreground font-medium mb-1.5">
                {t("password")}
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={t("passwordPlaceholder")}
                  className="w-full bg-slate-900/90 border border-border rounded-xl pl-10 pr-10 py-2.5 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all font-sans text-xs sm:text-sm font-mono"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Remember Me Checkbox */}
            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 cursor-pointer select-none text-muted-foreground hover:text-foreground transition-colors">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="h-4 w-4 rounded border-border bg-slate-900 text-primary focus:ring-primary accent-primary cursor-pointer"
                />
                <span className="text-[11px]">{t("rememberMe")}</span>
              </label>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3 px-4 bg-primary hover:bg-primary/90 text-white rounded-xl font-semibold text-xs sm:text-sm transition-all flex items-center justify-center gap-2 shadow-lg shadow-primary/25 cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <span>{t("loading")}</span>
              ) : (
                <>
                  <LogIn className="h-4 w-4" />
                  <span>{t("loginSubmit")}</span>
                </>
              )}
            </button>

            {/* Quick Demo Admin Button */}
            <div className="pt-2">
              <button
                type="button"
                onClick={handleQuickDemo}
                className="w-full py-2 px-3 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-800 text-muted-foreground hover:text-foreground text-[11px] font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <Sparkles className="h-3.5 w-3.5 text-amber-400" />
                <span>{t("quickDemoLogin")}: admin / sabibeco@2026</span>
              </button>
            </div>
          </form>

          {/* Security Assurance Tag */}
          <div className="mt-5 pt-4 border-t border-slate-800/80 text-center">
            <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground font-mono">
              <CheckCircle2 className="h-3 w-3 text-emerald-400" />
              {t("securityEncrypted")}
            </span>
          </div>
        </div>
      </main>

      {/* 3. Footer */}
      <footer className="relative z-10 w-full max-w-7xl mx-auto px-6 py-6 text-center text-xs text-muted-foreground font-mono">
        <p>{t("companyName")}</p>
      </footer>
    </div>
  );
};
