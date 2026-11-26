import { useEffect, useState, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  Lock,
  User,
  Sun,
  Moon,
  ArrowRight,
  Eye,
  EyeOff,
  Sparkles,
  UserPlus,
  ShieldCheck,
  Volume2,
  VolumeX,
  GraduationCap,
  Briefcase,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import { usePopup } from "../../context/PopupContext";
import { useLang } from "../../context/LangContext";
import { isFirebaseConfigured } from "../../lib/firebase";
import {
  isSoundEnabled,
  playClickSound,
  playLoginSuccessSound,
  setSoundEnabled,
} from "../../utils/soundEffects";
import LanguageDropdown from "../../components/common/LanguageDropdown";
import RobotMascotSvg from "../../components/common/RobotMascotSvg";

export default function LoginPage() {
  const { t } = useTranslation();
  const { lang } = useLang();
  const { user, login, enterPreviewMode } = useAuth();
  const { theme, toggleTheme, logoSrc } = useTheme();
  const { showPopup } = usePopup();
  const navigate = useNavigate();

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [soundOn, setSoundOn] = useState(isSoundEnabled());

  const [isTypingPassword, setIsTypingPassword] = useState(false);
  const [isPasswordFocused, setIsPasswordFocused] = useState(false);
  const [isTransitioningToRegister, setIsTransitioningToRegister] = useState(false);
  const typingTimeoutRef = useRef(null);
  const isDark = theme === "dark";

  const toggleSound = () => {
    const next = !soundOn;
    setSoundEnabled(next);
    setSoundOn(next);
    if (next) playClickSound();
  };

  const handleGoToRegister = (e) => {
    e.preventDefault();
    if (soundOn) playClickSound();
    setIsTransitioningToRegister(true);
    setTimeout(() => {
      navigate("/register", { state: { fromButton: true } });
    }, 180);
  };

  useEffect(() => {
    if (user) {
      if (user.role === "admin") navigate("/admin", { replace: true });
      else if (user.role === "instructor") navigate("/instructor", { replace: true });
      else navigate("/student", { replace: true });
    }
  }, [user, navigate]);

  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    };
  }, []);

  const handlePasswordChange = (e) => {
    const val = e.target.value;
    setPassword(val);

    if (val.length > 0) {
      setIsTypingPassword(true);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      // When user stops typing for 1000ms, release his eyes!
      typingTimeoutRef.current = setTimeout(() => {
        setIsTypingPassword(false);
      }, 1000);
    } else {
      setIsTypingPassword(false);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    }
  };

  const handlePasswordFocus = () => {
    setIsPasswordFocused(true);
    if (password.length > 0) {
      setIsTypingPassword(true);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        setIsTypingPassword(false);
      }, 1000);
    }
  };

  const handlePasswordBlur = () => {
    setIsPasswordFocused(false);
    setIsTypingPassword(false);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
  };

  const isCoveringEyes = showPass || isTypingPassword;

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
      } else if (err.message === "FIREBASE_NOT_CONFIGURED") {
        showPopup({
          title: t("auth.loginTitle"),
          message:
            lang === "ar"
              ? "مفتاح Firebase API غير مضبوط في client/.env (VITE_FIREBASE_API_KEY). يمكنك تسجيل الدخول كمسؤول باستخدام admin@123 أو ضبط المفاتيح أولاً."
              : "Firebase API key is not configured in client/.env (VITE_FIREBASE_API_KEY). You can still sign in as Admin (admin@123) or configure Firebase keys first.",
          type: "warning",
        });
      } else {
        showPopup({ title: t("auth.loginTitle"), message: t("auth.invalidCredentials"), type: "error" });
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className={`relative min-h-screen w-full overflow-hidden flex flex-col justify-between p-3 sm:p-5 select-none transition-colors duration-300 ${
        isDark ? "bg-[#040d14] text-white" : "bg-[#f3f0e8] text-slate-900"
      }`}
    >
      {/* Full-Screen High-Resolution Digital Library Backdrops (2560x1440 YCbCr-Deblocked & Mitchell-Restored) */}
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 overflow-hidden z-0">
        <img
          src="/login-library-bg.jpg?v=clean"
          alt=""
          decoding="async"
          fetchPriority="high"
          className={`absolute inset-0 w-full h-full object-cover object-center scale-[1.03] origin-[50%_30%] transition-opacity duration-700 brightness-[1.03] contrast-[1.02] saturate-[1.02] ${
            isDark ? "opacity-0" : "opacity-100"
          }`}
        />
        <img
          src="/login-library-dark-bg.jpg?v=clean"
          alt=""
          decoding="async"
          fetchPriority="high"
          className={`absolute inset-0 w-full h-full object-cover object-center scale-[1.03] origin-[50%_30%] transition-opacity duration-700 ${
            isDark ? "opacity-100" : "opacity-0"
          }`}
        />
      </div>

      {/* Atmospheric Daylight Rays (Light Mode Only — Dark Mode Displays the Natural Nighttime Photograph) */}
      {!isDark && (
        <svg
          aria-hidden="true"
          viewBox="0 0 1600 900"
          preserveAspectRatio="xMidYMid slice"
          className="pointer-events-none fixed inset-0 w-full h-full scale-[1.03] origin-[50%_30%] z-0"
          style={{ mixBlendMode: "screen" }}
        >
          <defs>
            <filter id="sunbeamDefinedBlur" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="11" />
            </filter>
            <filter id="sunbeamSoftBlur" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="24" />
            </filter>
            <filter id="sunbeamWideBlur" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="42" />
            </filter>

            <radialGradient id="windowGlowHalo" cx="56%" cy="32%" r="54%">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.98" />
              <stop offset="28%" stopColor="#fffef2" stopOpacity="0.72" />
              <stop offset="62%" stopColor="#fef3c7" stopOpacity="0.24" />
              <stop offset="100%" stopColor="#e0f2fe" stopOpacity="0" />
            </radialGradient>

            <linearGradient id="sunShaftGradMain" x1="0.72" y1="0" x2="0.28" y2="1">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.88" />
              <stop offset="22%" stopColor="#fffef5" stopOpacity="0.54" />
              <stop offset="58%" stopColor="#fef9db" stopOpacity="0.22" />
              <stop offset="86%" stopColor="#fde68a" stopOpacity="0.06" />
              <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="sunShaftGradSoft" x1="0.65" y1="0" x2="0.35" y2="1">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.52" />
              <stop offset="38%" stopColor="#f8fafc" stopOpacity="0.22" />
              <stop offset="78%" stopColor="#fef3c7" stopOpacity="0.06" />
              <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
            </linearGradient>

            <radialGradient id="dayFloorPool" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.78" />
              <stop offset="36%" stopColor="#fffef2" stopOpacity="0.42" />
              <stop offset="72%" stopColor="#fef3c7" stopOpacity="0.12" />
              <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
            </radialGradient>
          </defs>

          {/* Subtle Solar Glow At Overhead Skylight & Central Tall Arch Window */}
          <ellipse cx="815" cy="36" rx="190" ry="92" fill="url(#windowGlowHalo)" filter="url(#sunbeamSoftBlur)" opacity="0.48" />
          <ellipse cx="800" cy="310" rx="110" ry="155" fill="url(#windowGlowHalo)" filter="url(#sunbeamSoftBlur)" opacity="0.34" />

          {/* Delicate Diagonal Sunlight Shafts Streaming Through Skylight & Archway */}
          <g filter="url(#sunbeamDefinedBlur)" opacity="0.46">
            <polygon points="815,28 875,36 585,845 455,845" fill="url(#sunShaftGradMain)" />
            <polygon points="755,34 805,40 420,820 295,820" fill="url(#sunShaftGradSoft)" />
            <polygon points="765,240 835,240 945,840 655,840" fill="url(#sunShaftGradSoft)" opacity="0.65" />
          </g>

          {/* Soft Floor Sunlight Catch Along Center Marble Walkway */}
          <ellipse cx="760" cy="730" rx="280" ry="130" fill="url(#dayFloorPool)" filter="url(#sunbeamWideBlur)" opacity="0.32" />
        </svg>
      )}

      {/* Dark Vignette Scrim (Only in Dark Mode for Moody Contrast) */}
      {isDark && (
        <div
          aria-hidden="true"
          className="pointer-events-none fixed inset-0 bg-gradient-to-br from-[#020c14]/30 via-transparent to-[#040f17]/35"
        />
      )}


      {/* Moving Animated Robot Patrolling in the Background */}
      <div
        aria-hidden="true"
        className={`pointer-events-none fixed bottom-5 sm:bottom-8 start-[10%] sm:start-[18%] lg:start-[24%] z-10 login-robot-patrol ${
          isCoveringEyes ? "login-robot-paused" : "login-robot-walking"
        }`}
      >
        <div className="flex flex-col items-center">
          {/* Floating Tagline Pill Moving with the Robot */}
          <div
            className={`mb-2 px-3 py-1 rounded-full backdrop-blur-xl border text-[10px] sm:text-[11px] font-semibold whitespace-nowrap flex items-center gap-1.5 ${
              isDark
                ? "bg-white/[0.14] border-white/25 shadow-[0_8px_24px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.22)] text-teal-50"
                : "bg-white/75 border-white/80 shadow-[0_8px_24px_rgba(15,23,42,0.12),inset_0_1px_0_rgba(255,255,255,0.85)] text-slate-800"
            }`}
          >
            <span>
              {isCoveringEyes
                ? lang === "ar"
                  ? "🙈 أغمض عينيّ لحماية كلمة مرورك!"
                  : "Covering my eyes for privacy!"
                : isPasswordFocused
                ? lang === "ar"
                  ? "👀 مستعد لحماية كلمة مرورك"
                  : "Ready to cover my eyes!"
                : `• ${t("auth.learnTagline")}`}
            </span>
          </div>

          {/* Walking Robot Body with Floor Hologram Ring */}
          <div className="relative flex flex-col items-center">
            <div className="login-robot-facing robot-bob-anim drop-shadow-[0_18px_32px_rgba(20,184,166,0.45)]">
              <RobotMascotSvg
                isCoveringEyes={isCoveringEyes}
                isPeeking={false}
                showSign={false}
                width={215}
                height={230}
                className="w-[144px] h-[154px] sm:w-[186px] sm:h-[200px] lg:w-[215px] lg:h-[230px] overflow-visible"
                idPrefix="login_bg_bot"
              />
            </div>
            {/* Glowing Floor Reflection Ring */}
            <div className={`w-36 sm:w-44 h-5 -mt-3 rounded-full blur-md ${isDark ? "bg-teal-400/35" : "bg-slate-900/20"}`} />
          </div>
        </div>
      </div>

      {/* Top Floating Glass Bar (Matching Screenshot) */}
      <header
        className={`relative z-20 shrink-0 max-w-7xl w-full mx-auto rounded-2xl backdrop-blur-2xl backdrop-saturate-150 px-4 sm:px-5 py-2.5 flex items-center justify-between gap-3 border transition-all ${
          isDark
            ? "bg-[#0b1f2c]/40 border-white/25 text-white shadow-[0_12px_36px_rgba(0,0,0,0.35),inset_0_1px_0_rgba(255,255,255,0.22)]"
            : "border-white/80 text-slate-900 shadow-[0_12px_36px_rgba(15,23,42,0.12),inset_0_1px_0_rgba(255,255,255,0.9)]"
        }`}
        style={
          !isDark
            ? {
                background:
                  "linear-gradient(90deg, rgba(249, 248, 245, 0.92) 0%, rgba(235, 232, 226, 0.80) 60%, rgba(214, 210, 205, 0.72) 100%)",
              }
            : undefined
        }
      >
        <div className="flex items-center gap-3 min-w-0">
          <div
            className={`h-9 w-9 sm:h-10 sm:w-10 rounded-xl p-1 shrink-0 flex items-center justify-center shadow-inner border ${
              isDark ? "bg-white/15 border-white/30" : "bg-white/75 border-slate-900/10"
            }`}
          >
            <img
              src={logoSrc}
              alt="Athar Educational Platform"
              className="w-full h-full object-contain filter drop-shadow-sm"
            />
          </div>
          <div className="min-w-0">
            <h1 className={`font-extrabold text-xs sm:text-sm truncate ${isDark ? "text-white" : "text-slate-900"}`}>
              {t("app.title")}
            </h1>
            <p className={`hidden sm:block text-[10px] font-medium truncate ${isDark ? "text-teal-100/85" : "text-slate-600"}`}>
              • {t("app.subtitle")}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 flex-wrap justify-end">
          <LanguageDropdown
            buttonClassName={
              isDark
                ? "!bg-white/[0.1] hover:!bg-white/[0.18] !border-white/20 !text-slate-100 !h-8"
                : "!bg-white/65 hover:!bg-white/90 !border-slate-900/10 !text-slate-800 !h-8 shadow-xs"
            }
          />

          <button
            type="button"
            onClick={toggleTheme}
            aria-label="Toggle theme"
            className={`h-8 flex items-center gap-1.5 px-3 rounded-full border text-xs font-bold transition-all cursor-pointer ${
              isDark
                ? "border-white/20 bg-white/[0.1] hover:bg-white/[0.18] hover:border-teal-300/60 text-slate-100"
                : "border-slate-900/10 bg-white/65 hover:bg-white/90 text-slate-800 shadow-xs"
            }`}
          >
            {isDark ? (
              <>
                <Moon className="h-3.5 w-3.5 text-teal-300 shrink-0" />
                <span className="hidden sm:inline">{t("app.dark")}</span>
              </>
            ) : (
              <>
                <Sun className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                <span className="hidden sm:inline">{t("app.light")}</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={toggleSound}
            aria-label="Toggle sound"
            className={`h-8 flex items-center gap-1.5 px-3 rounded-full border text-xs font-bold transition-all cursor-pointer ${
              isDark
                ? "border-white/20 bg-white/[0.1] hover:bg-white/[0.18] hover:border-teal-300/60 text-slate-100"
                : "border-slate-900/10 bg-white/65 hover:bg-white/90 text-slate-800 shadow-xs"
            }`}
          >
            {soundOn ? (
              <Volume2 className={`h-3.5 w-3.5 shrink-0 ${isDark ? "text-teal-300" : "text-slate-700"}`} />
            ) : (
              <VolumeX className="h-3.5 w-3.5 text-slate-400 shrink-0" />
            )}
            <span className="hidden sm:inline">{lang === "ar" ? "الصوت" : "Sound"}</span>
          </button>

          <div
            className={`hidden md:flex h-8 items-center gap-1.5 px-3 rounded-full border text-xs font-bold ${
              isDark
                ? "border-white/20 bg-white/[0.1] text-slate-100"
                : "border-slate-900/10 bg-white/65 text-slate-800 shadow-xs"
            }`}
          >
            <Lock className={`h-3 w-3 shrink-0 ${isDark ? "text-teal-300" : "text-slate-700"}`} />
            <span>{lang === "ar" ? "بيئة آمنة" : "Secure Workspace"}</span>
          </div>
        </div>
      </header>

      {/* Main Content Stage Over Futuristic Library Scene */}
      <main className="relative z-20 flex-1 max-w-7xl w-full mx-auto flex flex-col lg:flex-row items-center justify-between gap-6 py-4 sm:py-6 px-1 sm:px-4">
        {/* Left Floating Hero Brand & Mascot Showcase (Matching Official Athar Design) */}
        <div className="hidden lg:flex flex-col items-start justify-center max-w-lg xl:max-w-xl space-y-5 select-none my-auto ps-2 pe-4">
          {/* Top Brand Logo & Platform Title (Matching Image 1) */}
          <div className="space-y-3">
            <div className="flex items-center gap-3.5">
              <div className="h-14 w-14 xl:h-16 xl:w-16 rounded-2xl bg-white/10 dark:bg-white/[0.06] backdrop-blur-md border border-white/25 flex items-center justify-center p-2 shadow-lg">
                <img
                  src={logoSrc}
                  alt="Athar Educational Platform"
                  className="h-full w-full object-contain filter drop-shadow-[0_4px_12px_rgba(45,212,191,0.4)]"
                />
              </div>
              <div className="min-w-0">
                <div className="text-3xl xl:text-4xl font-extrabold tracking-tight text-white drop-shadow-md flex items-center gap-2">
                  <span>{lang === "ar" ? "أثـر" : "Athar"}</span>
                </div>
                <div className="text-xs xl:text-sm font-bold text-teal-300 tracking-wider uppercase drop-shadow-xs">
                  {lang === "ar" ? "منصة أثر التعليمية" : "Educational Platform"}
                </div>
              </div>
            </div>

            {/* Slogan with Glowing Highlight (Matching Image 1) */}
            <div className="pt-1">
              <h1 className="text-2xl xl:text-3xl font-black italic tracking-tight text-white drop-shadow-md">
                <span>{lang === "ar" ? "تعلّم .. تطوّر .. " : "Learn .. Develop .. "}</span>
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-300 via-cyan-400 to-sky-400 drop-shadow-[0_0_18px_rgba(45,212,191,0.6)]">
                  {lang === "ar" ? "حقّق أهدافك" : "Achieve Your Goals"}
                </span>
              </h1>
              <p className="text-xs xl:text-sm font-medium text-slate-200/90 dark:text-slate-300/90 mt-2 max-w-md leading-relaxed drop-shadow-sm">
                {lang === "ar"
                  ? "طريقة أذكى لتعلّم المهارات التقنية، بناء مسارك المهني، وتحقيق طموحاتك مع رفيق الذكاء الاصطناعي."
                  : "A smarter way to learn technical skills, build your career, and achieve more with your AI learning companion."}
              </p>
            </div>
          </div>

          {/* AI Robot Mascot Sitting on Books (Matching Image 2) */}
          <div className="relative group pt-1">
            <div className="absolute -inset-1 rounded-3xl bg-gradient-to-r from-teal-500/30 via-cyan-500/25 to-sky-500/30 blur-xl opacity-75 group-hover:opacity-100 transition-opacity duration-500" />
            <div className="relative rounded-2xl overflow-hidden border border-white/25 dark:border-white/15 bg-white/[0.12] dark:bg-black/[0.35] backdrop-blur-xl shadow-2xl p-3 flex items-center gap-4 max-w-md">
              <div className="relative w-32 h-32 xl:w-36 xl:h-36 shrink-0 rounded-xl overflow-hidden border border-teal-400/40 shadow-inner bg-slate-950/70">
                <img
                  src="/robot-reading-books.jpg"
                  alt="Athar AI Robot Mascot Sitting on Books"
                  className="w-full h-full object-cover object-center transform hover:scale-105 transition-transform duration-500"
                />
              </div>
              <div className="space-y-1.5 pe-2">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-teal-500/20 border border-teal-400/40 text-[10.5px] font-black text-teal-300">
                  <Sparkles className="h-3 w-3 text-teal-300 animate-spin" style={{ animationDuration: "6s" }} />
                  <span>{lang === "ar" ? "رفيق دراسي ذكي" : "Smart AI Tutor"}</span>
                </div>
                <h4 className="text-sm font-bold text-white tracking-wide">
                  {lang === "ar" ? "تعلّم تفاعلي ومتابعة مستمرة" : "Interactive Study & Support"}
                </h4>
                <p className="text-[11px] text-slate-300/85 leading-relaxed">
                  {lang === "ar"
                    ? "يجلس رفيقك الآلي معك خطوة بخطوة لشرح الدروس وحل الاختبارات وتقييم إجاباتك فورياً."
                    : "Your study bot sits with you through lessons, answers questions, and guides your daily progress."}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Floating Frosted Liquid-Glass Login Card */}
        <section
          className={`w-full max-w-[430px] ms-auto me-auto lg:me-4 rounded-[28px] backdrop-blur-2xl backdrop-saturate-150 border p-6 sm:p-8 transition-all ${
            isDark
              ? "border-white/30 shadow-[0_24px_80px_rgba(0,0,0,0.55),inset_0_1px_1px_rgba(255,255,255,0.32),inset_0_-1px_0_rgba(255,255,255,0.08)]"
              : "border-white/75 shadow-[0_24px_80px_rgba(15,23,42,0.18),inset_0_1px_1px_rgba(255,255,255,0.9),inset_0_-1px_0_rgba(255,255,255,0.25)]"
          }`}
          style={{
            background: isDark
              ? "linear-gradient(155deg, rgba(168, 214, 226, 0.22) 0%, rgba(28, 66, 82, 0.30) 48%, rgba(15, 42, 54, 0.38) 100%)"
              : "linear-gradient(180deg, rgba(248, 246, 243, 0.90) 0%, rgba(218, 214, 208, 0.74) 42%, rgba(162, 158, 154, 0.62) 74%, rgba(136, 132, 128, 0.66) 100%)",
          }}
        >
          {/* Card Header */}
          <div className="text-center mb-6">
            <h2
              className={`text-2xl sm:text-3xl font-black tracking-tight flex items-center justify-center gap-2 drop-shadow-sm ${
                isDark ? "text-white" : "text-slate-900"
              }`}
            >
              <Sparkles className={`h-6 w-6 shrink-0 ${isDark ? "text-cyan-300" : "text-slate-800"}`} />
              <span>{t("auth.welcomeBack")}</span>
            </h2>
            <p className={`text-xs sm:text-sm mt-1.5 font-medium ${isDark ? "text-white/80" : "text-slate-700"}`}>
              {lang === "ar" ? t("auth.welcomeDesc") : "Sign in to your learning workspace"}
            </p>
          </div>

          <form onSubmit={handleSubmit} autoComplete="off" className="space-y-4">
            {/* Username or Email */}
            <div>
              <label
                className={`block text-xs sm:text-[13px] font-bold mb-1.5 ${
                  isDark ? "text-white/95" : "text-slate-800"
                }`}
              >
                {t("auth.identifier")}
              </label>
              <div className="relative flex items-center">
                <User
                  className={`h-4 w-4 absolute start-3.5 pointer-events-none ${
                    isDark ? "text-white/75" : "text-slate-600"
                  }`}
                />
                <input
                  type="text"
                  name="platform_login_id"
                  autoComplete="off"
                  required
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="e.g., student@athar.edu"
                  className={`w-full ps-10 pe-3.5 py-3 rounded-xl backdrop-blur-md border text-xs sm:text-sm focus:outline-none focus:ring-2 transition-all ${
                    isDark
                      ? "bg-white/[0.14] hover:bg-white/[0.17] focus:bg-white/[0.20] border-white/25 text-white placeholder-white/55 shadow-[inset_0_1px_0_rgba(255,255,255,0.18)] focus:ring-cyan-300/60 focus:border-white/45"
                      : "bg-[#f4f2ef]/80 hover:bg-[#f7f5f2]/90 focus:bg-white/95 border-white/85 text-slate-900 placeholder-slate-700/80 shadow-[inset_0_1px_0_rgba(255,255,255,0.75)] focus:ring-stone-500/30 focus:border-white"
                  }`}
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label
                className={`block text-xs sm:text-[13px] font-bold mb-1.5 ${
                  isDark ? "text-white/95" : "text-slate-800"
                }`}
              >
                {t("auth.password")}
              </label>
              <div className="relative flex items-center">
                <Lock
                  className={`h-4 w-4 absolute start-3.5 pointer-events-none ${
                    isDark ? "text-white/75" : "text-slate-600"
                  }`}
                />
                <input
                  type={showPass ? "text" : "password"}
                  name="platform_login_pw"
                  autoComplete="new-password"
                  required
                  value={password}
                  onChange={handlePasswordChange}
                  onFocus={handlePasswordFocus}
                  onBlur={handlePasswordBlur}
                  placeholder={t("auth.passwordPlaceholder")}
                  className={`w-full ps-10 pe-10 py-3 rounded-xl backdrop-blur-md border text-xs sm:text-sm focus:outline-none focus:ring-2 transition-all ${
                    isDark
                      ? "bg-white/[0.14] hover:bg-white/[0.17] focus:bg-white/[0.20] border-white/25 text-white placeholder-white/55 shadow-[inset_0_1px_0_rgba(255,255,255,0.18)] focus:ring-cyan-300/60 focus:border-white/45"
                      : "bg-[#f4f2ef]/80 hover:bg-[#f7f5f2]/90 focus:bg-white/95 border-white/85 text-slate-900 placeholder-slate-700/80 shadow-[inset_0_1px_0_rgba(255,255,255,0.75)] focus:ring-stone-500/30 focus:border-white"
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPass((p) => !p)}
                  aria-label="Toggle password visibility"
                  className={`absolute end-3 transition-colors p-1 cursor-pointer ${
                    isDark ? "text-slate-300 hover:text-white" : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Remember Me Switch & Forgot Password */}
            <div className="flex items-center justify-between text-xs pt-0.5">
              <button
                type="button"
                role="switch"
                aria-checked={rememberMe}
                onClick={() => setRememberMe((r) => !r)}
                className={`flex items-center gap-2 cursor-pointer select-none font-semibold ${
                  isDark ? "text-slate-200" : "text-white drop-shadow-xs"
                }`}
              >
                <span
                  className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full border transition-colors ${
                    rememberMe
                      ? isDark
                        ? "bg-teal-400/80 border-teal-300"
                        : "bg-slate-800 border-slate-700"
                      : isDark
                      ? "bg-white/15 border-white/25"
                      : "bg-slate-800/75 border-slate-700/60"
                  }`}
                >
                  <span
                    className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${
                      rememberMe ? "translate-x-4 rtl:-translate-x-4" : "translate-x-0.5 rtl:-translate-x-0.5"
                    }`}
                  />
                </span>
                <span>{t("auth.rememberMe")}</span>
              </button>

              <button
                type="button"
                onClick={() =>
                  showPopup({
                    title: t("auth.forgotPassword"),
                    message: t("auth.forgotPasswordHint"),
                    type: "info",
                  })
                }
                className={`font-bold hover:underline cursor-pointer ${
                  isDark ? "text-cyan-300 hover:text-cyan-200" : "text-white/95 hover:text-white drop-shadow-xs"
                }`}
              >
                {t("auth.forgotPassword")}
              </button>
            </div>

            {/* Sign In Button (Theme-Matched: Cyan-to-Violet in Dark, Frosted White Pearl in Light) */}
            <button
              type="submit"
              disabled={submitting}
              className={`w-full mt-2 py-3.5 px-5 rounded-xl font-black text-sm hover:-translate-y-0.5 active:translate-y-0 transition-all flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer ${
                isDark
                  ? "bg-gradient-to-r from-[#2dd4bf] via-[#38bdf8] to-[#a855f7] hover:brightness-110 text-white shadow-[0_10px_30px_rgba(56,189,248,0.35)]"
                  : "bg-[#f8f7f4]/95 hover:bg-white text-slate-900 border border-white shadow-[0_8px_24px_rgba(0,0,0,0.14)]"
              }`}
            >
              <span>{submitting ? t("auth.signingIn") : t("auth.signIn")}</span>
              <ArrowRight className="h-4 w-4 rtl:rotate-180" />
            </button>
          </form>

          {/* Divider */}
          <div className="relative my-5 flex items-center justify-center">
            <div className={`w-full border-t ${isDark ? "border-white/15" : "border-white/30"}`} />
            <span
              className={`px-3 text-[11px] font-semibold whitespace-nowrap ${
                isDark ? "text-slate-300/85" : "text-white/95 drop-shadow-xs"
              }`}
            >
              {t("auth.noAccount")}
            </span>
            <div className={`w-full border-t ${isDark ? "border-white/15" : "border-white/30"}`} />
          </div>

          {/* Register Secondary Glass Button with Smooth Expand Transition */}
          <button
            type="button"
            onClick={handleGoToRegister}
            className={`w-full py-3 px-4 rounded-xl backdrop-blur-md border font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer group ${
              isDark
                ? "bg-white/[0.12] hover:bg-white/[0.20] border-white/25 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.18)]"
                : "bg-white/25 hover:bg-white/35 border-white/50 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.45)] drop-shadow-xs"
            } ${isTransitioningToRegister ? "scale-105 opacity-60 duration-200" : ""}`}
          >
            <UserPlus
              className={`h-4 w-4 group-hover:scale-110 transition-transform ${
                isDark ? "text-cyan-300" : "text-white"
              }`}
            />
            <span>{t("auth.registerAction")}</span>
          </button>

          {/* Temporary UI Preview Buttons (Shown only while VITE_FIREBASE_API_KEY is unset) */}
          {!isFirebaseConfigured && (
            <div className="mt-3 pt-3 border-t border-white/25 space-y-2">
              <div
                className={`text-center text-[10.5px] font-semibold ${
                  isDark ? "text-teal-200/80" : "text-white/90 drop-shadow-xs"
                }`}
              >
                {lang === "ar"
                  ? "معاينة سريعة للواجهات (بدون VITE_FIREBASE_API_KEY)"
                  : "Temporary UI Preview (Firebase key not set)"}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    enterPreviewMode("student");
                    navigate("/student");
                  }}
                  className={`py-2 px-3 rounded-xl backdrop-blur-md border text-[11px] font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    isDark
                      ? "bg-teal-500/15 hover:bg-teal-500/25 border-teal-300/30 text-teal-100"
                      : "bg-white/25 hover:bg-white/35 border-white/45 text-white drop-shadow-xs"
                  }`}
                >
                  <GraduationCap className="h-3.5 w-3.5 shrink-0" />
                  <span>{lang === "ar" ? "معاينة الطالب" : "Preview Student UI"}</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    enterPreviewMode("instructor");
                    navigate("/instructor");
                  }}
                  className={`py-2 px-3 rounded-xl backdrop-blur-md border text-[11px] font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    isDark
                      ? "bg-sky-500/15 hover:bg-sky-500/25 border-sky-300/30 text-sky-100"
                      : "bg-white/25 hover:bg-white/35 border-white/45 text-white drop-shadow-xs"
                  }`}
                >
                  <Briefcase className="h-3.5 w-3.5 shrink-0" />
                  <span>{lang === "ar" ? "معاينة المحاضر" : "Preview Instructor UI"}</span>
                </button>
              </div>
            </div>
          )}

          {/* Trust Footer Badge */}
          <div
            className={`mt-5 flex items-center justify-center gap-2 text-[11px] font-medium ${
              isDark ? "text-slate-300/80" : "text-white/90 drop-shadow-xs"
            }`}
          >
            <ShieldCheck className={`h-3.5 w-3.5 ${isDark ? "text-teal-300" : "text-white/90"}`} />
            <span>{t("auth.trustBadge")}</span>
          </div>
        </section>
      </main>
    </div>
  );
}
