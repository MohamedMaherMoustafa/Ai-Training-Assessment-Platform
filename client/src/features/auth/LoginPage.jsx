import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
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
import { usePopup } from "../../context/PopupContext";
import { playLoginSuccessSound } from "../../utils/soundEffects";
import LanguageDropdown from "../../components/common/LanguageDropdown";

export default function LoginPage() {
  const { t, i18n } = useTranslation();
  const { login } = useAuth();
  const { theme, toggleTheme, logoSrc } = useTheme();
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

  return (
    <div className="h-screen max-h-screen overflow-hidden bg-gradient-to-br from-[#eef2fb] via-[#f4f3fe] to-[#ebeffc] dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 flex flex-col justify-between p-2 sm:p-3 md:p-4 select-none transition-colors duration-300">
      {/* Top Floating Pill Navigation Bar (Compact Height) */}
      <header className="shrink-0 max-w-6xl xl:max-w-7xl w-full mx-auto bg-white/95 dark:bg-slate-900/90 backdrop-blur-md rounded-full px-4 sm:px-6 py-2 flex items-center justify-between gap-3 shadow-sm border border-slate-200/80 dark:border-white/10">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="h-8 w-8 sm:h-9 sm:w-9 shrink-0 flex items-center justify-center">
            <img src={logoSrc} alt="Platform Logo" className="w-full h-full object-contain drop-shadow-sm" />
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
          <LanguageDropdown />

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
      <main className="flex-1 min-h-0 max-w-6xl xl:max-w-7xl w-full mx-auto my-1.5 sm:my-2.5 flex items-center justify-center">
        <div className="w-full h-full max-h-[calc(100vh-100px)] rounded-[28px] sm:rounded-[36px] overflow-hidden shadow-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-white/10 grid grid-cols-1 lg:grid-cols-12 transition-all">
          {/* Left Column: Royal Purple Showcase Banner (Centered & Elegantly Restyled) */}
          <section className="hidden lg:flex lg:col-span-5 relative p-6 sm:p-7 xl:p-8 bg-gradient-to-b from-[#181580] via-[#3523b0] to-[#5a189a] text-white flex-col justify-between items-center text-center overflow-hidden">
            {/* Ambient Background Lighting Orbs */}
            <div className="pointer-events-none absolute -top-12 -end-12 h-64 w-64 rounded-full bg-violet-400/25 blur-3xl" />
            <div className="pointer-events-none absolute bottom-0 -start-10 h-64 w-64 rounded-full bg-indigo-500/25 blur-3xl" />

            {/* Top Centered Header & Branding */}
            <div className="relative z-10 flex flex-col items-center text-center w-full">
              {/* Floating Glowing Glass Logo Container */}
              <div className="h-16 w-16 sm:h-18 sm:w-18 rounded-2xl bg-white/15 backdrop-blur-xl border border-white/25 flex items-center justify-center shadow-xl shadow-black/20 p-2.5 mb-2 hover:scale-105 transition-transform">
                <img src={logoSrc} alt="Platform Logo" className="w-full h-full object-contain drop-shadow-md" />
              </div>

              {/* Platform Title */}
              <h2 className="text-xl sm:text-2xl xl:text-3xl font-black text-white tracking-tight leading-tight">
                {t("app.title")}
              </h2>

              {/* Tagline Badge */}
              <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-white/15 backdrop-blur-md border border-white/20 text-xs font-semibold text-indigo-100 mt-2 shadow-xs">
                <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-pulse" />
                <span>{t("auth.learnTagline")}</span>
              </div>

              {/* Hero Description */}
              <p className="text-xs sm:text-[12.5px] text-white/85 mt-2.5 leading-relaxed max-w-sm mx-auto">
                {t("auth.heroDesc")}
              </p>
            </div>

            {/* Centered 2x2 Feature Showcase Grid */}
            <div className="relative z-10 w-full max-w-sm my-auto pt-3 pb-2">
              <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
                {/* 1. PDF Annotations */}
                <div className="flex flex-col items-center text-center p-3 rounded-2xl bg-white/10 backdrop-blur-md border border-white/15 hover:bg-white/15 transition-all shadow-sm">
                  <div className="h-8 w-8 rounded-xl bg-white/20 backdrop-blur-md border border-white/25 flex items-center justify-center text-white mb-1.5 shadow-xs">
                    <Laptop className="h-4 w-4" />
                  </div>
                  <div className="text-xs font-bold text-white leading-tight">{t("auth.featPdf")}</div>
                  <div className="text-[10px] text-indigo-200 mt-0.5 leading-tight">{t("auth.featPdfDesc")}</div>
                </div>

                {/* 2. Quiz & Chatbot */}
                <div className="flex flex-col items-center text-center p-3 rounded-2xl bg-white/10 backdrop-blur-md border border-white/15 hover:bg-white/15 transition-all shadow-sm">
                  <div className="h-8 w-8 rounded-xl bg-white/20 backdrop-blur-md border border-white/25 flex items-center justify-center text-white mb-1.5 shadow-xs">
                    <Bot className="h-4 w-4" />
                  </div>
                  <div className="text-xs font-bold text-white leading-tight">{t("auth.featQuiz")}</div>
                  <div className="text-[10px] text-indigo-200 mt-0.5 leading-tight">{t("auth.featQuizDesc")}</div>
                </div>

                {/* 3. Points & Certificates */}
                <div className="flex flex-col items-center text-center p-3 rounded-2xl bg-white/10 backdrop-blur-md border border-white/15 hover:bg-white/15 transition-all shadow-sm">
                  <div className="h-8 w-8 rounded-xl bg-white/20 backdrop-blur-md border border-white/25 flex items-center justify-center text-white mb-1.5 shadow-xs">
                    <Trophy className="h-4 w-4" />
                  </div>
                  <div className="text-xs font-bold text-white leading-tight">{t("auth.featPoints")}</div>
                  <div className="text-[10px] text-indigo-200 mt-0.5 leading-tight">{t("auth.featPointsDesc")}</div>
                </div>

                {/* 4. Progress Reports */}
                <div className="flex flex-col items-center text-center p-3 rounded-2xl bg-white/10 backdrop-blur-md border border-white/15 hover:bg-white/15 transition-all shadow-sm">
                  <div className="h-8 w-8 rounded-xl bg-white/20 backdrop-blur-md border border-white/25 flex items-center justify-center text-white mb-1.5 shadow-xs">
                    <BarChart3 className="h-4 w-4" />
                  </div>
                  <div className="text-xs font-bold text-white leading-tight">{t("auth.featReports")}</div>
                  <div className="text-[10px] text-indigo-200 mt-0.5 leading-tight">{t("auth.featReportsDesc")}</div>
                </div>
              </div>
            </div>

            {/* Bottom 3D Artwork Composition (Centered) */}
            <div className="relative z-10 w-full flex items-center justify-center mt-1">
              <svg
                viewBox="0 0 320 180"
                className="w-44 sm:w-52 h-auto drop-shadow-2xl select-none pointer-events-none mx-auto"
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
          <section className="col-span-1 lg:col-span-7 p-6 sm:p-9 lg:p-10 xl:p-14 bg-white dark:bg-slate-900 flex flex-col justify-center overflow-y-auto transition-colors">
            <div className="max-w-md xl:max-w-lg mx-auto w-full">
              {/* Header */}
              <div className="text-center mb-4 sm:mb-5">
                <h2 className="text-2xl sm:text-3xl xl:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
                  {t("auth.welcomeBack")}
                </h2>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
                  {t("auth.welcomeDesc")}
                </p>
              </div>

              <form onSubmit={handleSubmit} autoComplete="off" className="space-y-3 sm:space-y-3.5">
                {/* Username or Email */}
                <div>
                  <label className="flex items-center gap-1.5 text-xs sm:text-[13px] font-bold text-slate-800 dark:text-slate-200 mb-1">
                    <User className="h-3.5 w-3.5 text-blue-600 dark:text-cyan-400" />
                    <span>{t("auth.identifier")}</span>
                  </label>
                  <div className="relative flex items-center">
                    <Mail className="h-4 w-4 text-slate-400 absolute start-3.5 pointer-events-none" />
                    <input
                      type="text"
                      name="platform_login_id"
                      autoComplete="off"
                      required
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                      placeholder={t("auth.identifierPlaceholder")}
                      className="w-full ps-10 pe-3.5 py-2.5 sm:py-3 glass-input text-xs sm:text-sm"
                    />
                  </div>
                </div>

                {/* Password */}
                <div>
                  <label className="flex items-center gap-1.5 text-xs sm:text-[13px] font-bold text-slate-800 dark:text-slate-200 mb-1">
                    <Lock className="h-3.5 w-3.5 text-blue-600 dark:text-cyan-400" />
                    <span>{t("auth.password")}</span>
                  </label>
                  <div className="relative flex items-center">
                    <Lock className="h-4 w-4 text-slate-400 absolute start-3.5 pointer-events-none" />
                    <input
                      type={showPass ? "text" : "password"}
                      name="platform_login_pw"
                      autoComplete="new-password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder={t("auth.passwordPlaceholder")}
                      className="w-full ps-10 pe-10 py-2.5 sm:py-3 glass-input text-xs sm:text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPass((p) => !p)}
                      aria-label="Toggle password visibility"
                      className="absolute end-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors p-1"
                    >
                      {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {/* Remember Me & Forgot Password */}
                <div className="flex items-center justify-between text-xs sm:text-[13px]">
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
                  className="w-full mt-2 py-3 sm:py-3.5 px-5 rounded-xl sm:rounded-2xl font-bold text-xs sm:text-sm text-white bg-gradient-to-r from-[#2055d5] via-[#4834d4] to-[#8c25cf] hover:from-[#1b48b5] hover:to-[#7b20b6] shadow-md shadow-indigo-600/30 flex items-center justify-center gap-2 transition-all duration-200 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-60 cursor-pointer"
                >
                  <ArrowRight className="h-4 w-4 rtl:rotate-180" />
                  <span>{submitting ? t("auth.signingIn") : t("auth.signIn")}</span>
                </button>
              </form>

              {/* Divider */}
              <div className="relative my-3 flex items-center justify-center">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-200 dark:border-slate-800" />
                </div>
                <span className="relative bg-white dark:bg-slate-900 px-3 text-[11px] font-semibold text-slate-400 dark:text-slate-500">
                  {t("auth.noAccount")}
                </span>
              </div>

              {/* Register Secondary Button */}
              <Link
                to="/register"
                className="w-full py-2.5 px-4 rounded-xl sm:rounded-2xl border border-indigo-200 dark:border-indigo-900/60 hover:border-indigo-500 dark:hover:border-indigo-400 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/20 font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all shadow-sm group"
              >
                <UserPlus className="h-4 w-4 text-indigo-500 group-hover:scale-110 transition-transform" />
                <span>{t("auth.registerAction")}</span>
              </Link>

              {/* Trust Footer Badge */}
              <div className="mt-3 py-1.5 px-4 rounded-full bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800/80 flex items-center justify-center gap-2 text-[11px] font-medium text-slate-500 dark:text-slate-400 mx-auto w-fit">
                <ShieldCheck className="h-3.5 w-3.5 text-blue-500" />
                <span>{t("auth.trustBadge")}</span>
              </div>
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
