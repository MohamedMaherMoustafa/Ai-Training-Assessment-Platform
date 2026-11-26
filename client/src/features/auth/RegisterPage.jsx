import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";
import {
  CheckCircle2,
  Circle,
  Sun,
  Moon,
  Lock,
  Volume2,
  VolumeX,
  UserPlus,
  ShieldCheck,
  GraduationCap,
  Eye,
  EyeOff,
} from "lucide-react";
import {
  listActiveInstructors,
  registerStudentAccount,
} from "../../services/platformService";
import { useTheme } from "../../context/ThemeContext";
import { useLang } from "../../context/LangContext";
import { usePopup } from "../../context/PopupContext";
import { validateUsername } from "../../utils/validators";
import {
  isSoundEnabled,
  playClickSound,
  setSoundEnabled,
} from "../../utils/soundEffects";
import LanguageDropdown from "../../components/common/LanguageDropdown";
import RobotMascotSvg from "../../components/common/RobotMascotSvg";
import { ref, onValue } from "firebase/database";
import { rtdb } from "../../lib/firebase";

export default function RegisterPage() {
  const { t } = useTranslation();
  const { theme, toggleTheme, logoSrc } = useTheme();
  const { lang } = useLang();
  const { showPopup } = usePopup();
  const navigate = useNavigate();

  const isDark = theme === "dark";

  const [instructors, setInstructors] = useState([]);
  const [loadingInstructors, setLoadingInstructors] = useState(true);

  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [soundOn, setSoundOn] = useState(isSoundEnabled());

  const toggleSound = () => {
    const next = !soundOn;
    setSoundEnabled(next);
    setSoundOn(next);
    if (next) playClickSound();
  };

  const resetForm = () => {
    setFullName("");
    setUsername("");
    setEmail("");
    setPhoneNumber("");
    setPassword("");
    setConfirmPassword("");
    setSelectedIds([]);
  };

  const handlePhoneChange = (e) => {
    const digitsOnly = e.target.value.replace(/\D/g, "").slice(0, 11);
    setPhoneNumber(digitsOnly);
  };

  const handlePhoneKeyDown = (e) => {
    if (
      ["Backspace", "Delete", "Tab", "ArrowLeft", "ArrowRight", "Home", "End", "Enter"].includes(e.key) ||
      ((e.ctrlKey || e.metaKey) && ["a", "c", "v", "x"].includes(e.key.toLowerCase()))
    ) {
      return;
    }
    if (!/^\d$/.test(e.key)) {
      e.preventDefault();
    }
  };

  const handlePhonePaste = (e) => {
    e.preventDefault();
    const text = (e.clipboardData || window.clipboardData)?.getData("text") || "";
    const digitsOnly = text.replace(/\D/g, "").slice(0, 11);
    setPhoneNumber(digitsOnly);
  };

  // Real-time listener for active instructors strictly from database
  useEffect(() => {
    resetForm();
    if (!rtdb) {
      listActiveInstructors()
        .then((list) => {
          setInstructors(list);
          setLoadingInstructors(false);
        })
        .catch((err) => {
          console.error(err);
          setLoadingInstructors(false);
        });
      return;
    }

    const usersRef = ref(rtdb, "users");
    const unsubscribe = onValue(
      usersRef,
      (snapshot) => {
        if (!snapshot.exists()) {
          setInstructors([]);
          setLoadingInstructors(false);
          return;
        }
        const data = snapshot.val();
        const activeList = Object.entries(data)
          .filter(([, u]) => u && u.role === "instructor" && u.active !== false)
          .map(([uid, u]) => ({ uid, ...u }));
        setInstructors(activeList);
        setLoadingInstructors(false);
      },
      (error) => {
        console.error("Firebase RTDB listener error:", error);
        listActiveInstructors()
          .then(setInstructors)
          .catch(console.error)
          .finally(() => setLoadingInstructors(false));
      }
    );
    return () => unsubscribe();
  }, []);

  const toggleInstructor = (uid) => {
    if (soundOn) playClickSound();
    setSelectedIds((prev) =>
      prev.includes(uid) ? prev.filter((id) => id !== uid) : [...prev, uid]
    );
  };

  const selectAll = () => {
    if (soundOn) playClickSound();
    setSelectedIds(instructors.map((i) => i.uid));
  };

  const clearAll = () => {
    if (soundOn) playClickSound();
    setSelectedIds([]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (soundOn) playClickSound();

    if (password !== confirmPassword) {
      toast.error(t("auth.passwordMismatch"));
      return;
    }
    const uCheck = validateUsername(username, lang);
    if (!uCheck.isValid) {
      toast.error(uCheck.error);
      return;
    }
    if (!phoneNumber || phoneNumber.trim().length !== 11) {
      toast.error(t("auth.phoneValidation"));
      return;
    }
    if (instructors.length > 0 && selectedIds.length === 0) {
      toast.error(t("auth.selectAtLeastOneInstructor"));
      return;
    }

    setSubmitting(true);
    try {
      await registerStudentAccount({
        fullName: fullName.trim(),
        username: username.trim(),
        email: email.trim(),
        phoneNumber: phoneNumber.trim(),
        password,
        instructorIds: selectedIds,
        lang,
        theme,
      });
      resetForm();
      showPopup({
        title: t("auth.registerTitle"),
        message: t("auth.registerSuccessPending"),
        type: "success",
        confirmLabel: t("auth.backToLogin"),
        onConfirm: () => navigate("/login"),
      });
    } catch (err) {
      console.error(err);
      const code = err?.code || "";
      if (code === "auth/email-already-in-use") {
        showPopup({
          title: t("auth.registerTitle"),
          message:
            lang === "ar"
              ? "هذا البريد الإلكتروني مسجّل بالفعل. يرجى تسجيل الدخول أو انتظار موافقة المحاضر."
              : "This email is already registered. Please sign in or wait for instructor approval.",
          type: "error",
        });
      } else if (code === "auth/weak-password") {
        showPopup({
          title: t("auth.registerTitle"),
          message:
            lang === "ar"
              ? "كلمة المرور يجب أن تكون 6 أحرف على الأقل."
              : "Password must be at least 6 characters.",
          type: "warning",
        });
      } else if (err?.message === "FIREBASE_NOT_CONFIGURED") {
        showPopup({
          title: t("auth.registerTitle"),
          message:
            lang === "ar"
              ? "مفتاح Firebase API غير مضبوط في client/.env (VITE_FIREBASE_API_KEY). يرجى إعداده لتسجيل حسابات جديدة."
              : "Firebase API key is not configured in client/.env (VITE_FIREBASE_API_KEY). Please configure it to register new accounts.",
          type: "warning",
        });
      } else {
        showPopup({
          title: t("auth.registerTitle"),
          message: err.message || "Registration failed",
          type: "error",
        });
      }
    } finally {
      setSubmitting(false);
    }
  };

  const isUsernameValid =
    username.length >= 8 && /[@_]/.test(username) && !/[^a-zA-Z0-9@_]/.test(username);

  return (
    <div className="relative min-h-screen w-full overflow-x-hidden flex flex-col justify-between p-3 sm:p-5 md:p-6 text-slate-900 dark:text-slate-100 select-none transition-colors duration-300">
      {/* Full-bleed Library Backdrop matching Login page */}
      <div
        className="pointer-events-none fixed inset-0 bg-cover bg-center transition-all duration-700 -z-20"
        style={{
          backgroundImage: isDark ? "url('/login-library-dark-bg.jpg')" : "url('/login-library-bg.jpg')",
        }}
      />
      <div className="pointer-events-none fixed inset-0 bg-slate-950/15 dark:bg-black/20 -z-15" />
      <div className="pointer-events-none fixed inset-0 bg-dot-pattern opacity-15 dark:opacity-10 -z-10" />

      {/* Subtle Drifting Glowing Particles */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden -z-5">
        <span className="login-sparkle absolute start-[18%] top-[28%] h-2 w-2 rounded-full bg-teal-300/70 blur-[1px]" />
        <span className="login-sparkle absolute start-[42%] top-[22%] h-1.5 w-1.5 rounded-full bg-amber-300/75 blur-[1px]" style={{ animationDelay: "1.1s" }} />
        <span className="login-sparkle absolute start-[26%] bottom-[26%] h-2 w-2 rounded-full bg-cyan-300/70 blur-[1px]" style={{ animationDelay: "2.2s" }} />
        <span className="login-sparkle absolute start-[52%] bottom-[20%] h-1.5 w-1.5 rounded-full bg-emerald-300/75 blur-[1px]" style={{ animationDelay: "0.7s" }} />
      </div>

      {/* Moving Animated Robot Patrolling in the Background */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed bottom-4 sm:bottom-6 start-[8%] sm:start-[14%] lg:start-[18%] -z-5 login-robot-patrol login-robot-walking"
      >
        <div className="flex flex-col items-center">
          <div className="login-robot-facing robot-bob-anim drop-shadow-[0_18px_32px_rgba(20,184,166,0.45)]">
            <RobotMascotSvg
              isCoveringEyes={false}
              isPeeking={false}
              showSign={false}
              width={180}
              height={195}
              className="w-[110px] h-[120px] sm:w-[145px] sm:h-[155px] lg:w-[180px] lg:h-[195px] overflow-visible"
              idPrefix="register_bg_bot"
            />
          </div>
          <div className={`w-32 sm:w-40 h-4 -mt-2 rounded-full blur-md ${isDark ? "bg-teal-400/30" : "bg-slate-900/15"}`} />
        </div>
      </div>

      {/* Top Floating Pill Navigation Bar (Exact Match with Login & Mockup) */}
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

      {/* Main Registration Card - Centered Frosted Liquid-Glass with Expand Animation */}
      <main className="relative z-10 flex-1 my-4 sm:my-6 flex items-center justify-center w-full">
        <div
          className={`modal-expand-entrance w-full max-w-4xl xl:max-w-5xl rounded-[32px] sm:rounded-[36px] overflow-hidden p-6 sm:p-8 lg:p-10 transition-all border ${
            isDark
              ? "bg-[#07131e]/65 backdrop-blur-2xl backdrop-saturate-150 border-white/15 shadow-[0_30px_90px_rgba(0,0,0,0.7),inset_0_1px_1.5px_rgba(255,255,255,0.25)] text-white"
              : "bg-white/65 backdrop-blur-2xl backdrop-saturate-150 border-white/65 shadow-[0_30px_90px_rgba(15,23,42,0.15),inset_0_1px_1.5px_rgba(255,255,255,0.95)] text-slate-900"
          }`}
        >
          {/* Centered Heading & Subtitle */}
          <div className="text-center mb-6 sm:mb-8">
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight drop-shadow-sm">
              {t("auth.registerTitle")}
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 mt-1.5 font-medium max-w-xl mx-auto">
              {t("auth.registerDesc")}
            </p>
          </div>

          {/* Registration Form */}
          <form onSubmit={handleSubmit} autoComplete="off" className="space-y-4 sm:space-y-5">
            {/* Row 1: Full Name (left) | Username (right) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
              <div>
                <label className="block text-xs sm:text-[13px] font-bold text-slate-800 dark:text-slate-200 mb-1.5">
                  {t("auth.fullName")}
                </label>
                <input
                  type="text"
                  name="reg_full_name"
                  autoComplete="off"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder={lang === "ar" ? "الاسم الكامل" : "Full Name"}
                  className={`w-full px-4 py-3 rounded-2xl text-xs sm:text-sm transition-all shadow-inner focus:outline-none focus:ring-4 focus:ring-teal-500/20 ${
                    isDark
                      ? "bg-black/35 border border-white/10 text-white placeholder:text-slate-500 focus:bg-black/55 focus:border-teal-400/80"
                      : "bg-white/50 border border-slate-900/10 text-slate-950 placeholder:text-slate-400 focus:bg-white/85 focus:border-teal-500/80"
                  }`}
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs sm:text-[13px] font-bold text-slate-800 dark:text-slate-200">
                    {t("auth.username")} <span className="text-rose-500">*</span>
                  </label>
                  <span
                    className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full transition-colors ${
                      isUsernameValid
                        ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
                        : "bg-slate-200/70 dark:bg-slate-800 text-slate-500"
                    }`}
                  >
                    {isUsernameValid ? "✓ Valid" : `${username.length}/8 min (@ or _)`}
                  </span>
                </div>
                <input
                  type="text"
                  name="reg_username"
                  autoComplete="off"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value.replace(/[^a-zA-Z0-9@_]/g, ""))}
                  placeholder={t("auth.usernamePlaceholder") || "e.g. Username"}
                  className={`w-full px-4 py-3 rounded-2xl text-xs sm:text-sm font-mono tracking-wide transition-all shadow-inner focus:outline-none focus:ring-4 focus:ring-teal-500/20 ${
                    isDark
                      ? "bg-black/35 border border-white/10 text-white placeholder:text-slate-500 focus:bg-black/55 focus:border-teal-400/80"
                      : "bg-white/50 border border-slate-900/10 text-slate-950 placeholder:text-slate-400 focus:bg-white/85 focus:border-teal-500/80"
                  }`}
                />
              </div>
            </div>

            {/* Row 2: Email Address (left) | Phone Number (right) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
              <div>
                <label className="block text-xs sm:text-[13px] font-bold text-slate-800 dark:text-slate-200 mb-1.5">
                  {t("auth.email")} <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  name="reg_email"
                  autoComplete="off"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="student@academy.com or student@123"
                  className={`w-full px-4 py-3 rounded-2xl text-xs sm:text-sm transition-all shadow-inner focus:outline-none focus:ring-4 focus:ring-teal-500/20 ${
                    isDark
                      ? "bg-black/35 border border-white/10 text-white placeholder:text-slate-500 focus:bg-black/55 focus:border-teal-400/80"
                      : "bg-white/50 border border-slate-900/10 text-slate-950 placeholder:text-slate-400 focus:bg-white/85 focus:border-teal-500/80"
                  }`}
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs sm:text-[13px] font-bold text-slate-800 dark:text-slate-200">
                    {t("auth.phoneNumber")} <span className="text-rose-500">*</span>
                  </label>
                  <span
                    className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full transition-colors ${
                      phoneNumber.length === 11
                        ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
                        : "bg-slate-200/70 dark:bg-slate-800 text-slate-500"
                    }`}
                  >
                    {phoneNumber.length}/11
                  </span>
                </div>
                <input
                  type="tel"
                  name="reg_phone"
                  autoComplete="tel"
                  required
                  inputMode="numeric"
                  maxLength={11}
                  value={phoneNumber}
                  onChange={handlePhoneChange}
                  onKeyDown={handlePhoneKeyDown}
                  onPaste={handlePhonePaste}
                  placeholder={t("auth.phonePlaceholder") || "e.g. 01012345678"}
                  className={`w-full px-4 py-3 rounded-2xl text-xs sm:text-sm font-mono tracking-wider transition-all shadow-inner focus:outline-none focus:ring-4 focus:ring-teal-500/20 ${
                    isDark
                      ? "bg-black/35 border border-white/10 text-white placeholder:text-slate-500 focus:bg-black/55 focus:border-teal-400/80"
                      : "bg-white/50 border border-slate-900/10 text-slate-950 placeholder:text-slate-400 focus:bg-white/85 focus:border-teal-500/80"
                  }`}
                />
              </div>
            </div>

            {/* Row 3: Password (left) | Confirm Password (right) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
              <div>
                <label className="block text-xs sm:text-[13px] font-bold text-slate-800 dark:text-slate-200 mb-1.5">
                  {t("auth.password")} <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showPass ? "text" : "password"}
                    name="reg_password"
                    autoComplete="new-password"
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className={`w-full px-4 py-3 pe-11 rounded-2xl text-xs sm:text-sm transition-all shadow-inner focus:outline-none focus:ring-4 focus:ring-teal-500/20 ${
                      isDark
                        ? "bg-black/35 border border-white/10 text-white placeholder:text-slate-500 focus:bg-black/55 focus:border-teal-400/80"
                        : "bg-white/50 border border-slate-900/10 text-slate-950 placeholder:text-slate-400 focus:bg-white/85 focus:border-teal-500/80"
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass((s) => !s)}
                    className="absolute top-1/2 -translate-y-1/2 end-3 p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                  >
                    {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs sm:text-[13px] font-bold text-slate-800 dark:text-slate-200 mb-1.5">
                  {t("auth.confirmPassword")} <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPass ? "text" : "password"}
                    name="reg_confirm_password"
                    autoComplete="new-password"
                    required
                    minLength={6}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className={`w-full px-4 py-3 pe-11 rounded-2xl text-xs sm:text-sm transition-all shadow-inner focus:outline-none focus:ring-4 focus:ring-teal-500/20 ${
                      isDark
                        ? "bg-black/35 border border-white/10 text-white placeholder:text-slate-500 focus:bg-black/55 focus:border-teal-400/80"
                        : "bg-white/50 border border-slate-900/10 text-slate-950 placeholder:text-slate-400 focus:bg-white/85 focus:border-teal-500/80"
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPass((s) => !s)}
                    className="absolute top-1/2 -translate-y-1/2 end-3 p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                  >
                    {showConfirmPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            </div>

            {/* Choose Your Instructor(s) Section */}
            <div className="pt-2">
              <div className="flex items-center justify-between mb-2">
                <label className="flex items-center gap-2 text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white">
                  <GraduationCap className="h-4 w-4 text-teal-500 dark:text-teal-400" />
                  <span>{t("auth.chooseInstructors")}</span>
                </label>
                {instructors.length > 0 && (
                  <div className="flex items-center gap-2 text-xs">
                    <button
                      type="button"
                      onClick={selectAll}
                      className="text-teal-600 dark:text-teal-400 font-bold hover:underline cursor-pointer"
                    >
                      {t("auth.selectAll")}
                    </button>
                    <span className="text-slate-300 dark:text-slate-700">|</span>
                    <button
                      type="button"
                      onClick={clearAll}
                      className="text-slate-500 dark:text-slate-400 font-semibold hover:underline cursor-pointer"
                    >
                      {t("auth.clearAll")}
                    </button>
                  </div>
                )}
              </div>

              {loadingInstructors ? (
                <div className="p-4 text-center text-xs text-slate-500 dark:text-slate-400 font-medium">
                  {t("app.loading")}
                </div>
              ) : instructors.length === 0 ? (
                <div className="p-4 rounded-2xl border border-white/20 dark:border-white/10 bg-white/40 dark:bg-white/[0.03] backdrop-blur-md text-xs text-slate-600 dark:text-slate-300 text-center font-medium">
                  {t("auth.noInstructorsYet")}
                </div>
              ) : (
                <div className="max-h-36 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 p-2 rounded-2xl border border-slate-900/10 dark:border-white/10 bg-white/30 dark:bg-black/20 backdrop-blur-md [scrollbar-width:thin]">
                  {instructors.map((inst) => {
                    const selected = selectedIds.includes(inst.uid);
                    return (
                      <div
                        key={inst.uid}
                        onClick={() => toggleInstructor(inst.uid)}
                        className={`p-2.5 rounded-xl border text-xs cursor-pointer transition-all flex items-center justify-between gap-2.5 select-none ${
                          selected
                            ? "bg-teal-500/15 dark:bg-teal-400/15 border-teal-500 dark:border-teal-400 text-teal-950 dark:text-teal-100 font-bold shadow-[0_0_14px_rgba(45,212,191,0.3)] scale-[1.01]"
                            : "bg-white/50 dark:bg-white/[0.04] border-slate-900/10 dark:border-white/10 hover:border-teal-400/50 hover:bg-white/70 dark:hover:bg-white/[0.08]"
                        }`}
                      >
                        <div className="min-w-0">
                          <div className="truncate text-xs font-bold text-slate-950 dark:text-white">
                            {inst.name?.[lang] || inst.displayName || inst.email}
                          </div>
                          <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                            {inst.specialization?.[lang] || ""}
                          </div>
                        </div>
                        {selected ? (
                          <CheckCircle2 className="h-4 w-4 text-teal-500 dark:text-teal-400 shrink-0" />
                        ) : (
                          <Circle className="h-4 w-4 text-slate-400 dark:text-slate-600 shrink-0" />
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Bottom Actions Row: Submit Button at Bottom-Right matching Mockup */}
            <div className="pt-3 flex flex-col sm:flex-row items-center justify-end gap-4">
              <button
                type="submit"
                disabled={submitting}
                className={`w-full sm:w-auto px-7 py-3.5 rounded-2xl font-black text-xs sm:text-sm flex items-center justify-center gap-2.5 cursor-pointer transition-all duration-200 disabled:opacity-60 shadow-lg hover:scale-[1.02] active:scale-100 ${
                  isDark
                    ? "bg-white/[0.12] hover:bg-white/[0.22] text-white border border-white/25 shadow-[0_8px_24px_rgba(0,0,0,0.3),inset_0_1px_1px_rgba(255,255,255,0.2)] hover:border-teal-400/60"
                    : "bg-slate-900/90 hover:bg-slate-950 text-white border border-slate-900 shadow-[0_8px_24px_rgba(15,23,42,0.25)]"
                }`}
              >
                <UserPlus className={`h-4 w-4 ${isDark ? "text-cyan-300" : "text-white"}`} />
                <span>{submitting ? t("auth.signingIn") : t("auth.registerAction")}</span>
              </button>
            </div>
          </form>

          {/* Secure Badge & Back to Login */}
          <div className="mt-6 pt-4 border-t border-slate-900/10 dark:border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400">
            <div className="flex items-center gap-1.5 font-medium">
              <ShieldCheck className={`h-4 w-4 ${isDark ? "text-teal-400" : "text-teal-600"}`} />
              <span>{t("auth.trustBadge")}</span>
            </div>

            <div>
              <span>{t("auth.haveAccount")} </span>
              <Link
                to="/login"
                className="font-bold text-teal-600 dark:text-teal-400 hover:underline ms-1"
              >
                {t("auth.backToLogin")}
              </Link>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 shrink-0 text-center text-[11px] text-slate-500 dark:text-slate-400 py-1 font-medium">
        {t("app.title")} © {new Date().getFullYear()}
      </footer>
    </div>
  );
}
