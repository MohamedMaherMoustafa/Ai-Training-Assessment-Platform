import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";
import {
  GraduationCap,
  Lock,
  User,
  Mail,
  Sun,
  Moon,
  Globe,
  ChevronDown,
  ArrowRight,
  Eye,
  EyeOff,
  Sparkles,
  UserPlus,
  ShieldCheck,
  Laptop,
  Bot,
  Trophy,
  BarChart3,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import { useLang } from "../../context/LangContext";
import { usePopup } from "../../context/PopupContext";
import { playLoginSuccessSound } from "../../utils/soundEffects";

export default function LoginPage() {
  const { t, i18n } = useTranslation();
  const { login } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { toggleLang } = useLang();
  const { showPopup } = usePopup();
  const navigate = useNavigate();

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("platform_remember_user");
    if (saved) {
      setIdentifier(saved);
      setRememberMe(true);
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!identifier.trim() || !password) return;
    setSubmitting(true);
    try {
      const profile = await login(identifier, password);
      playLoginSuccessSound();

      if (rememberMe) {
        localStorage.setItem("platform_remember_user", identifier);
      } else {
        localStorage.removeItem("platform_remember_user");
      }

      setIdentifier("");
      setPassword("");
      setShowPass(false);
      toast.success(
        profile.role === "admin"
          ? "Welcome, System Admin!"
          : `Welcome, ${profile.displayName || profile.email}!`
      );
      if (profile.role === "admin") navigate("/admin");
      else if (profile.role === "instructor") navigate("/instructor");
      else navigate("/student");
    } catch (err) {
      if (err.message === "ACCOUNT_DISABLED") {
        showPopup({ title: t("auth.loginTitle"), message: t("auth.accountDisabled"), type: "error" });
      } else if (err.message === "PENDING_INSTRUCTOR_APPROVAL") {
        showPopup({ title: t("auth.loginTitle"), message: t("auth.pendingApproval"), type: "warning" });
      } else if (err.message === "REQUEST_REJECTED") {
        showPopup({ title: t("auth.loginTitle"), message: t("auth.requestRejected"), type: "error" });
      } else {
        showPopup({ title: t("auth.loginTitle"), message: t("auth.invalidCredentials"), type: "error" });
      }
    } finally {
      setSubmitting(false);
    }
  };

  const fillAdminDemo = () => {
    setIdentifier("admin@123");
    setPassword("admin@123");
  };

  return (
    <div className="h-screen max-h-screen overflow-hidden bg-gradient-to-br from-[#eef2fb] via-[#f4f3fe] to-[#ebeffc] dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 flex flex-col justify-between p-2 sm:p-3 select-none transition-colors duration-300">
      {/* Top Floating Pill Navigation Bar (Compact Height) */}
      <header className="shrink-0 max-w-5xl w-full mx-auto bg-white/95 dark:bg-slate-900/90 backdrop-blur-md rounded-full px-4 sm:px-6 py-2 flex items-center justify-between gap-3 shadow-sm border border-slate-200/80 dark:border-white/10">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="h-8 w-8 sm:h-9 sm:w-9 rounded-xl bg-gradient-to-tr from-[#5719bd] via-[#6a1ecf] to-[#8022d8] text-white flex items-center justify-center shadow-md shadow-purple-500/25 shrink-0">
            <GraduationCap className="h-4 w-4 sm:h-5 sm:w-5" />
          </div>
          <div className="min-w-0">
            <h1 className="font-extrabold text-xs sm:text-sm text-slate-900 dark:text-white truncate">
              {t("app.title")}
            </h1>
            <p className="hidden sm:block text-[10px] text-slate-500 dark:text-slate-400 font-medium truncate">
              {t("app.subtitle")}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={toggleLang}
            aria-label="Toggle language"
            className="flex items-center gap-1 px-3 py-1 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/60 text-xs font-semibold text-slate-700 dark:text-slate-200 shadow-sm transition-all"
          >
            <Globe className="h-3 w-3 text-slate-500 dark:text-slate-400 shrink-0" />
            <span className="hidden sm:inline">{i18n.language === "ar" ? "العربية" : "English"}</span>
            <ChevronDown className="h-3 w-3 text-slate-400 shrink-0" />
          </button>

          <button
            onClick={toggleTheme}
            aria-label="Toggle theme"
            className="flex items-center gap-1 px-3 py-1 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/60 text-xs font-semibold text-slate-700 dark:text-slate-200 shadow-sm transition-all"
          >
            {theme === "dark" ? (
              <>
                <Sun className="h-3 w-3 text-amber-400 shrink-0" />
                <span className="hidden sm:inline">{t("app.light")}</span>
              </>
            ) : (
              <>
                <Moon className="h-3 w-3 text-indigo-600 shrink-0" />
                <span className="hidden sm:inline">{t("app.dark")}</span>
              </>
            )}
          </button>
        </div>
      </header>

      {/* Main Split Showcase Login Card (Locked Inside Screen Height) */}
      <main className="flex-1 min-h-0 max-w-5xl w-full mx-auto my-1.5 sm:my-2 flex items-center justify-center">
        <div className="w-full h-full max-h-[calc(100vh-100px)] rounded-[26px] sm:rounded-[32px] overflow-hidden shadow-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-white/10 grid grid-cols-1 lg:grid-cols-12 transition-all">
          {/* Left Column: Royal Purple Showcase Banner */}
          <section className="hidden lg:flex lg:col-span-5 relative p-6 lg:p-7 bg-gradient-to-b from-[#181580] via-[#3523b0] to-[#5a189a] text-white flex-col justify-between overflow-hidden">
            <div className="pointer-events-none absolute -top-16 -end-16 h-56 w-56 rounded-full bg-violet-400/20 blur-2xl" />
            <div className="pointer-events-none absolute bottom-0 start-0 h-64 w-64 rounded-full bg-indigo-500/20 blur-3xl" />

            <div className="relative z-10">
              <h2 className="text-xl sm:text-2xl font-black leading-tight text-white tracking-tight">
                {t("app.title")}
              </h2>
              <div className="text-xs font-semibold text-indigo-200 mt-1">
                {t("auth.learnTagline")}
              </div>
              <p className="text-[11px] text-white/80 mt-1.5 leading-relaxed max-w-sm">
                {t("auth.heroDesc")}
              </p>

              {/* 4 Feature Pills */}
              <div className="mt-4 space-y-2.5">
                <div className="flex items-center gap-2.5">
                  <div className="h-7 w-7 rounded-full bg-white/15 backdrop-blur-md border border-white/20 flex items-center justify-center shrink-0 text-white shadow-sm">
                    <Laptop className="h-3.5 w-3.5" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white">{t("auth.featPdf")}</div>
                    <div className="text-[10px] text-indigo-200">{t("auth.featPdfDesc")}</div>
                  </div>
                </div>

                <div className="flex items-center gap-2.5">
                  <div className="h-7 w-7 rounded-full bg-white/15 backdrop-blur-md border border-white/20 flex items-center justify-center shrink-0 text-white shadow-sm">
                    <Bot className="h-3.5 w-3.5" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white">{t("auth.featQuiz")}</div>
                    <div className="text-[10px] text-indigo-200">{t("auth.featQuizDesc")}</div>
                  </div>
                </div>

                <div className="flex items-center gap-2.5">
                  <div className="h-7 w-7 rounded-full bg-white/15 backdrop-blur-md border border-white/20 flex items-center justify-center shrink-0 text-white shadow-sm">
                    <Trophy className="h-3.5 w-3.5" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white">{t("auth.featPoints")}</div>
                    <div className="text-[10px] text-indigo-200">{t("auth.featPointsDesc")}</div>
                  </div>
                </div>

                <div className="flex items-center gap-2.5">
                  <div className="h-7 w-7 rounded-full bg-white/15 backdrop-blur-md border border-white/20 flex items-center justify-center shrink-0 text-white shadow-sm">
                    <BarChart3 className="h-3.5 w-3.5" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white">{t("auth.featReports")}</div>
                    <div className="text-[10px] text-indigo-200">{t("auth.featReportsDesc")}</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom 3D Artwork Composition */}
            <div className="relative mt-2 flex justify-end">
              <svg
                viewBox="0 0 320 180"
                className="w-40 sm:w-48 h-auto drop-shadow-xl select-none pointer-events-none"
                fill="none"
              >
                <defs>
                  <linearGradient id="book1Grad" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#2e1065" />
                    <stop offset="100%" stopColor="#4338ca" />
                  </linearGradient>
                  <linearGradient id="book2Grad" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#3b0764" />
                    <stop offset="100%" stopColor="#6366f1" />
                  </linearGradient>
                  <linearGradient id="capGrad" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#0f172a" />
                    <stop offset="100%" stopColor="#1e1b4b" />
                  </linearGradient>
                  <linearGradient id="laptopScreen" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#0b0f19" />
                    <stop offset="100%" stopColor="#1e293b" />
                  </linearGradient>
                  <linearGradient id="goldTassel" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#fde047" />
                    <stop offset="100%" stopColor="#f59e0b" />
                  </linearGradient>
                </defs>
                <ellipse cx="190" cy="165" rx="100" ry="12" fill="#09051d" fillOpacity="0.4" />
                <path d="M 120 150 L 250 135 L 265 145 L 135 160 Z" fill="url(#book1Grad)" />
                <path d="M 120 150 L 135 160 L 135 167 L 120 157 Z" fill="#1e1b4b" />
                <path d="M 135 160 L 265 145 L 265 152 L 135 167 Z" fill="#e2e8f0" />
                <path d="M 130 135 L 255 120 L 268 128 L 143 143 Z" fill="url(#book2Grad)" />
                <path d="M 130 135 L 143 143 L 143 150 L 130 142 Z" fill="#2e1065" />
                <path d="M 143 143 L 268 128 L 268 135 L 143 150 Z" fill="#f8fafc" />
                <ellipse cx="198" cy="98" rx="26" ry="10" fill="#090d16" />
                <polygon points="198,68 250,86 198,104 146,86" fill="url(#capGrad)" stroke="#475569" strokeWidth="1" />
                <circle cx="198" cy="86" r="3.5" fill="url(#goldTassel)" />
                <path d="M 198 86 Q 220 90 230 108 L 232 122" stroke="url(#goldTassel)" strokeWidth="2.5" strokeLinecap="round" />
                <polygon points="230,122 234,122 235,130 229,130" fill="url(#goldTassel)" />
                <g transform="translate(10, 10)">
                  <polygon points="65,160 145,152 175,165 95,173" fill="#334155" />
                  <polygon points="75,160 138,154 163,164 100,170" fill="#1e293b" />
                  <polygon points="80,110 148,102 145,152 77,160" fill="#0f172a" stroke="#475569" strokeWidth="1.5" />
                  <polygon points="83,113 145,106 142,149 80,156" fill="url(#laptopScreen)" />
                  <path d="M 112 123 L 126 128 L 112 133 L 98 128 Z" fill="#38bdf8" opacity="0.9" />
                </g>
              </svg>
            </div>
          </section>

          {/* Right Column: Clean Authentication Form */}
          <section className="col-span-1 lg:col-span-7 p-4 sm:p-7 lg:p-8 bg-white dark:bg-slate-900 flex flex-col justify-center overflow-y-auto transition-colors">
            {/* Header */}
            <div className="text-center mb-3 sm:mb-4">
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                {t("auth.welcomeBack")}
              </h2>
              <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {t("auth.welcomeDesc")}
              </p>
            </div>

            <form onSubmit={handleSubmit} autoComplete="off" className="space-y-2.5 sm:space-y-3">
              {/* Username or Email */}
              <div>
                <label className="flex items-center gap-1.5 text-[11px] font-bold text-slate-800 dark:text-slate-200 mb-1">
                  <User className="h-3 w-3 text-blue-600 dark:text-cyan-400" />
                  <span>{t("auth.identifier")}</span>
                </label>
                <div className="relative flex items-center">
                  <Mail className="h-3.5 w-3.5 text-slate-400 absolute start-3.5 pointer-events-none" />
                  <input
                    type="text"
                    name="platform_login_id"
                    autoComplete="off"
                    required
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder={t("auth.identifierPlaceholder")}
                    className="w-full ps-9 pe-3 py-2 sm:py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/60 text-slate-900 dark:text-white placeholder:text-slate-400 text-xs sm:text-sm focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/15 transition-all shadow-sm"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="flex items-center gap-1.5 text-[11px] font-bold text-slate-800 dark:text-slate-200 mb-1">
                  <Lock className="h-3 w-3 text-blue-600 dark:text-cyan-400" />
                  <span>{t("auth.password")}</span>
                </label>
                <div className="relative flex items-center">
                  <Lock className="h-3.5 w-3.5 text-slate-400 absolute start-3.5 pointer-events-none" />
                  <input
                    type={showPass ? "text" : "password"}
                    name="platform_login_pw"
                    autoComplete="new-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={t("auth.passwordPlaceholder")}
                    className="w-full ps-9 pe-9 py-2 sm:py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/60 text-slate-900 dark:text-white placeholder:text-slate-400 text-xs sm:text-sm focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/15 transition-all shadow-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass((p) => !p)}
                    aria-label="Toggle password visibility"
                    className="absolute end-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors p-1"
                  >
                    {showPass ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </button>
                </div>
              </div>

              {/* Remember Me & Forgot Password */}
              <div className="flex items-center justify-between text-[11px] sm:text-xs">
                <label className="flex items-center gap-1.5 cursor-pointer select-none text-slate-700 dark:text-slate-300 font-semibold">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="h-3.5 w-3.5 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 dark:border-slate-700 dark:bg-slate-800 cursor-pointer"
                  />
                  <span>{t("auth.rememberMe")}</span>
                </label>
                <button
                  type="button"
                  onClick={() =>
                    showPopup({
                      title: t("auth.forgotPassword"),
                      message: t("auth.forgotPasswordHint"),
                      type: "info",
                    })
                  }
                  className="font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
                >
                  {t("auth.forgotPassword")}
                </button>
              </div>

              {/* Gradient Sign In Button */}
              <button
                type="submit"
                disabled={submitting}
                className="w-full mt-2 py-2.5 sm:py-3 px-5 rounded-xl font-bold text-xs sm:text-sm text-white bg-gradient-to-r from-[#2055d5] via-[#4834d4] to-[#8c25cf] hover:from-[#1b48b5] hover:to-[#7b20b6] shadow-md shadow-indigo-600/30 flex items-center justify-center gap-2 transition-all duration-200 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-60 cursor-pointer"
              >
                <ArrowRight className="h-4 w-4 rtl:rotate-180" />
                <span>{submitting ? t("auth.signingIn") : t("auth.signIn")}</span>
              </button>
            </form>

            {/* Divider */}
            <div className="relative my-2.5 flex items-center justify-center">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200 dark:border-slate-800" />
              </div>
              <span className="relative bg-white dark:bg-slate-900 px-2.5 text-[10.5px] font-semibold text-slate-400 dark:text-slate-500">
                {t("auth.noAccount")}
              </span>
            </div>

            {/* Register Secondary Button */}
            <Link
              to="/register"
              className="w-full py-2 px-3.5 rounded-xl border border-indigo-200 dark:border-indigo-900/60 hover:border-indigo-500 dark:hover:border-indigo-400 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/20 font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-sm group"
            >
              <UserPlus className="h-3.5 w-3.5 text-indigo-500 group-hover:scale-110 transition-transform" />
              <span>{t("auth.registerAction")}</span>
            </Link>

            {/* Admin Quick Test Helper */}
            <div className="mt-2.5 flex items-center justify-between px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-400/25 text-amber-800 dark:text-amber-200 text-[10.5px]">
              <div className="flex items-center gap-1.5 truncate">
                <Sparkles className="h-3 w-3 text-amber-500 shrink-0" />
                <span className="truncate">
                  {t("auth.adminHintTitle")}: <b>admin@123</b>
                </span>
              </div>
              <button
                type="button"
                onClick={fillAdminDemo}
                className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500 hover:bg-amber-600 text-white transition-colors shrink-0"
              >
                Fill
              </button>
            </div>

            {/* Trust Footer Badge */}
            <div className="mt-2.5 py-1 px-3 rounded-full bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800/80 flex items-center justify-center gap-1.5 text-[10.5px] font-medium text-slate-500 dark:text-slate-400 mx-auto w-fit">
              <ShieldCheck className="h-3 w-3 text-blue-500" />
              <span>{t("auth.trustBadge")}</span>
            </div>
          </section>
        </div>
      </main>

      <footer className="shrink-0 text-center text-[10.5px] text-slate-400 dark:text-slate-500 py-0.5">
        {t("app.title")} © {new Date().getFullYear()}
      </footer>
    </div>
  );
}
