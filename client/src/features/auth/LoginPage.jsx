import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";
import {
  GraduationCap,
  Lock,
  User,
  Sun,
  Moon,
  Languages,
  ShieldAlert,
  ArrowRight,
  Eye,
  EyeOff,
  Sparkles,
  CheckCircle2,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import { useLang } from "../../context/LangContext";
import { usePopup } from "../../context/PopupContext";
import { playLoginSuccessSound } from "../../utils/soundEffects";

export default function LoginPage() {
  const { t } = useTranslation();
  const { login } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { toggleLang } = useLang();
  const { showPopup } = usePopup();
  const navigate = useNavigate();

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setIdentifier("");
    setPassword("");
    setShowPass(false);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!identifier.trim() || !password) return;
    setSubmitting(true);
    try {
      const profile = await login(identifier, password);
      playLoginSuccessSound();
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
    <div className="min-h-screen flex flex-col justify-between p-3 sm:p-4">
      {/* Top Bar */}
      <div className="max-w-5xl w-full mx-auto glass-panel rounded-[22px] px-3 sm:px-5 py-2.5 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="h-9 w-9 sm:h-10 sm:w-10 rounded-xl bg-gradient-to-br from-cyan-500 via-violet-600 to-fuchsia-600 text-white flex items-center justify-center shadow-lg shadow-violet-500/30 shrink-0">
            <GraduationCap className="h-5 w-5 sm:h-6 sm:w-6" />
          </div>
          <div className="min-w-0">
            <h1 className="font-extrabold text-xs sm:text-base text-slate-900 dark:text-white truncate">
              {t("app.title")}
            </h1>
            <p className="hidden sm:block text-xs text-slate-500 dark:text-slate-400 truncate">
              {t("app.subtitle")}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <button
            onClick={toggleLang}
            aria-label="Toggle language"
            className="glass-btn-secondary flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-semibold"
          >
            <Languages className="h-4 w-4 text-sky-600 dark:text-sky-400 shrink-0" />
            <span className="hidden sm:inline">{t("app.lang")}</span>
          </button>
          <button
            onClick={toggleTheme}
            aria-label="Toggle theme"
            className="glass-btn-secondary flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-semibold"
          >
            {theme === "dark" ? (
              <>
                <Sun className="h-4 w-4 text-amber-400 shrink-0" />
                <span className="hidden sm:inline">{t("app.light")}</span>
              </>
            ) : (
              <>
                <Moon className="h-4 w-4 text-indigo-600 shrink-0" />
                <span className="hidden sm:inline">{t("app.dark")}</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Asymmetric Split Showcase Login Card */}
      <div className="max-w-5xl w-full mx-auto my-4">
        <div className="glass-panel rounded-[34px] overflow-hidden grid grid-cols-1 lg:grid-cols-12 shadow-2xl">
          {/* Colorful Aurora Left Hero Showcase */}
          <div className="lg:col-span-5 relative p-7 sm:p-9 bg-gradient-to-br from-cyan-500 via-violet-600 to-fuchsia-600 text-white flex flex-col justify-between overflow-hidden">
            <div className="pointer-events-none absolute -top-12 -end-12 h-44 w-44 rounded-full bg-white/15 blur-xl" />
            <div className="pointer-events-none absolute -bottom-16 -start-10 h-48 w-48 rounded-full bg-amber-300/25 blur-2xl" />

            <div className="relative space-y-4">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-[11px] font-bold border border-white/30">
                <Sparkles className="h-3.5 w-3.5 text-amber-200" />
                Smart AI Learning Workspace
              </span>
              <h2 className="text-2xl sm:text-3xl font-black leading-tight">
                {t("app.title")}
              </h2>
              <p className="text-xs sm:text-sm text-white/85 leading-relaxed">
                {t("app.subtitle")}
              </p>
            </div>

            <div className="relative mt-6 space-y-2.5">
              {[
                "Live PDF Annotation & Freehand Pen",
                "AI Quiz Builder & Walking Robot Chatbot",
                "Points Scoreboard & Top-3 Certificates",
                "Student Progress Reports & Privacy Shield",
              ].map((feat) => (
                <div
                  key={feat}
                  className="flex items-center gap-2 px-3 py-2 rounded-2xl bg-white/15 backdrop-blur-md border border-white/20 text-xs font-semibold"
                >
                  <CheckCircle2 className="h-4 w-4 text-emerald-200 shrink-0" />
                  <span>{feat}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Right Form Side */}
          <div className="lg:col-span-7 p-6 sm:p-9">
            <div className="mb-6">
              <h2 className="text-2xl font-black bg-gradient-to-r from-cyan-600 via-violet-600 to-fuchsia-600 dark:from-cyan-300 dark:via-violet-300 dark:to-fuchsia-300 bg-clip-text text-transparent">
                {t("auth.loginTitle")}
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                {t("auth.loginDesc")}
              </p>
            </div>

            <form onSubmit={handleSubmit} autoComplete="off" className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  {t("auth.identifier")}
                </label>
                <div className="relative">
                  <User className="h-4 w-4 text-cyan-600 dark:text-cyan-400 absolute top-3 start-3.5" />
                  <input
                    type="text"
                    name="platform_login_id"
                    autoComplete="off"
                    required
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder={t("auth.identifierPlaceholder")}
                    className="w-full ps-10 pe-3 py-2.5 glass-input text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  {t("auth.password")}
                </label>
                <div className="relative">
                  <Lock className="h-4 w-4 text-violet-600 dark:text-violet-400 absolute top-3 start-3.5" />
                  <input
                    type={showPass ? "text" : "password"}
                    name="platform_login_pw"
                    autoComplete="new-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={t("auth.passwordPlaceholder")}
                    className="w-full ps-10 pe-10 py-2.5 glass-input text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass((p) => !p)}
                    className="absolute top-2.5 end-3.5 text-slate-400 hover:text-violet-600 dark:hover:text-cyan-300 transition-colors"
                  >
                    {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3 px-4 glass-btn-primary text-sm flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {submitting ? t("auth.signingIn") : t("auth.signIn")}
                <ArrowRight className="h-4 w-4 rtl:rotate-180" />
              </button>
            </form>

            {/* Admin Quick Gate Info */}
            <div className="mt-5 p-3.5 rounded-2xl bg-gradient-to-r from-amber-500/15 via-orange-500/10 to-rose-500/10 backdrop-blur-md border border-amber-400/45 transition-colors">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-2">
                  <ShieldAlert className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
                  <div className="text-xs text-amber-900 dark:text-amber-200">
                    <div className="font-bold">{t("auth.adminHintTitle")}</div>
                    <div className="opacity-90 mt-0.5">{t("auth.adminHintDesc")}</div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={fillAdminDemo}
                  className="shrink-0 px-3 py-1 rounded-xl text-[11px] font-bold bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:from-amber-600 hover:to-orange-600 shadow-sm hover:-translate-y-0.5 transition-all"
                >
                  Fill
                </button>
              </div>
            </div>

            {/* Student Registration Link */}
            <div className="mt-6 pt-5 border-t border-white/50 dark:border-white/10 text-center text-sm">
              <span className="text-slate-500 dark:text-slate-400">{t("auth.noAccount")} </span>
              <Link
                to="/register"
                className="font-extrabold text-violet-600 dark:text-cyan-300 hover:underline"
              >
                {t("auth.registerLink")}
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="h-4" />
    </div>
  );
}

