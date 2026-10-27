import { useState } from "react";
import type { FC, SyntheticEvent } from "react";
import { 
  Lock, 
  User, 
  AlertCircle, 
  LogIn, 
  Activity, 
  Globe, 
  Eye, 
  EyeOff
} from "lucide-react";
import type { UserSession } from "../../types";
import { useI18n } from "../../i18n";
import { loginUser } from "../../services/api";

interface LoginPageProps {
  onLoginSuccess: (session: UserSession) => void;
}

export const LoginPage: FC<LoginPageProps> = ({ onLoginSuccess }) => {
  const { language, setLanguage, t } = useI18n();
  const savedUser = localStorage.getItem("sabibeco_remembered_username") || "";
  const [username, setUsername] = useState(savedUser);
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(Boolean(savedUser) || localStorage.getItem("sabibeco_remember_me") === "true");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const performLogin = async (userToAuth: string, passToAuth: string) => {
    setError(null);

    const cleanUser = userToAuth.trim();
    if (!cleanUser || !passToAuth) {
      setError(t("missingCredentials"));
      return;
    }

    setLoading(true);

    try {
      // Authenticate with real backend and MongoDB database
      // The backend sets a secure HttpOnly cookie (persistent for 14 days, or session-only)
      const session = await loginUser({ 
        username: cleanUser, 
        password: passToAuth, 
        remember_me: rememberMe 
      });

      if (rememberMe) {
        // Only remember username in localStorage for convenience (NO tokens / passwords stored!)
        localStorage.setItem("sabibeco_remembered_username", cleanUser);
        localStorage.setItem("sabibeco_remember_me", "true");
      } else {
        // When Remember Me is disabled, clean only auth-related keys, preserving language & theme
        localStorage.removeItem("sabibeco_remembered_username");
        localStorage.removeItem("sabibeco_remember_me");
      }

      onLoginSuccess(session);
    } catch (err: any) {
      const msg = err?.message || "";
      if (msg.includes("Invalid username or password")) {
        setError(t("wrongPassword"));
      } else if (msg.includes("deactivated")) {
        setError(language === "vi" ? "Tài khoản này đã bị vô hiệu hóa." : "This account has been deactivated.");
      } else {
        setError(msg || (language === "vi" ? "Không thể kết nối đến máy chủ đăng nhập." : "Could not connect to authentication server."));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: SyntheticEvent) => {
    e.preventDefault();
    performLogin(username, password);
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
                  autoComplete="username"
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
                  autoComplete="current-password"
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
          </form>
        </div>
      </main>

      {/* 3. Footer */}
      <footer className="relative z-10 w-full max-w-7xl mx-auto px-6 py-6 text-center text-xs text-muted-foreground font-mono">
        <p>{t("companyName")}</p>
      </footer>
    </div>
  );
};
