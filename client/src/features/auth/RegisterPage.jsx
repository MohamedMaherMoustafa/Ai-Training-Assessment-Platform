import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";
import {
  CheckCircle2,
  Circle,
  Sun,
  Moon,
  Globe,
  ChevronDown,
  Users,
  ArrowRight,
} from "lucide-react";
import {
  listActiveInstructors,
  registerStudentAccount,
} from "../../services/platformService";
import { useTheme } from "../../context/ThemeContext";
import { useLang } from "../../context/LangContext";
import { usePopup } from "../../context/PopupContext";
import LanguageDropdown from "../../components/common/LanguageDropdown";

export default function RegisterPage() {
  const { t } = useTranslation();
  const { theme, toggleTheme } = useTheme();
  const { lang, toggleLang } = useLang();
  const { showPopup } = usePopup();
  const navigate = useNavigate();

  const [instructors, setInstructors] = useState([]);
  const [loadingInstructors, setLoadingInstructors] = useState(true);

  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [selectedIds, setSelectedIds] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  const resetForm = () => {
    setFullName("");
    setUsername("");
    setEmail("");
    setPassword("");
    setConfirmPassword("");
    setSelectedIds([]);
  };

  useEffect(() => {
    resetForm();
    listActiveInstructors()
      .then((list) => {
        setInstructors(list);
        if (list.length === 0) {
          showPopup({
            title: t("auth.registerTitle"),
            message: t("auth.noInstructorsYet"),
            type: "warning",
          });
        }
      })
      .catch((err) => {
        console.error(err);
        toast.error("Failed to load instructors from Firebase");
      })
      .finally(() => setLoadingInstructors(false));
  }, []);

  const toggleInstructor = (uid) => {
    setSelectedIds((prev) =>
      prev.includes(uid) ? prev.filter((id) => id !== uid) : [...prev, uid]
    );
  };

  const selectAll = () => setSelectedIds(instructors.map((i) => i.uid));
  const clearAll = () => setSelectedIds([]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast.error(t("auth.passwordMismatch"));
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

  return (
    <div className="h-screen max-h-screen overflow-hidden bg-gradient-to-br from-[#eef2fb] via-[#f4f3fe] to-[#ebeffc] dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 flex flex-col justify-between p-2 sm:p-3 select-none transition-colors duration-300">
      {/* Top Floating Pill Navigation Bar */}
      <header className="shrink-0 max-w-4xl w-full mx-auto bg-white/95 dark:bg-slate-900/90 backdrop-blur-md rounded-full px-4 sm:px-6 py-2 flex items-center justify-between gap-3 shadow-sm border border-slate-200/80 dark:border-white/10">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="h-8 w-8 sm:h-9 sm:w-9 rounded-xl overflow-hidden shadow-md shadow-indigo-500/25 shrink-0 bg-white dark:bg-slate-800 p-1 border border-slate-200/80 dark:border-white/10 flex items-center justify-center">
            <img src="/Logo.png" alt="Platform Logo" className="w-full h-full object-contain" />
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

      {/* Main Registration Card (Constant Single-Page Layout) */}
      <main className="flex-1 min-h-0 max-w-2xl w-full mx-auto my-1.5 sm:my-2 flex items-center justify-center">
        <div className="w-full max-h-[calc(100vh-100px)] rounded-[26px] sm:rounded-[32px] overflow-hidden shadow-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-white/10 flex flex-col transition-all">
          {/* Header Banner */}
          <div className="px-5 py-3 sm:py-3.5 bg-gradient-to-r from-[#181580] via-[#3523b0] to-[#5a189a] text-white text-center shrink-0">
            <h2 className="text-lg sm:text-xl font-black">{t("auth.registerTitle")}</h2>
            <p className="text-[11px] sm:text-xs text-indigo-200 mt-0.5">
              {t("auth.registerDesc")}
            </p>
          </div>

          {/* Form */}
          <div className="p-4 sm:p-6 overflow-y-auto flex-1 flex flex-col justify-between">
            <form onSubmit={handleSubmit} autoComplete="off" className="space-y-2.5 sm:space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {t("auth.fullName")}
                  </label>
                  <input
                    type="text"
                    name="reg_full_name"
                    autoComplete="off"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full px-3 py-1.5 sm:py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/60 text-xs sm:text-sm focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/15"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {t("auth.username")}
                  </label>
                  <input
                    type="text"
                    name="reg_username"
                    autoComplete="off"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full px-3 py-1.5 sm:py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/60 text-xs sm:text-sm focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/15"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {t("auth.email")}
                </label>
                <input
                  type="text"
                  name="reg_email"
                  autoComplete="off"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="student@academy.com or student@123"
                  className="w-full px-3 py-1.5 sm:py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/60 text-xs sm:text-sm focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/15"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {t("auth.password")}
                  </label>
                  <input
                    type="password"
                    name="reg_password"
                    autoComplete="new-password"
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-3 py-1.5 sm:py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/60 text-xs sm:text-sm focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/15"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {t("auth.confirmPassword")}
                  </label>
                  <input
                    type="password"
                    name="reg_confirm_password"
                    autoComplete="new-password"
                    required
                    minLength={6}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-3 py-1.5 sm:py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/60 text-xs sm:text-sm focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/15"
                  />
                </div>
              </div>

              {/* Multi-Instructor Selection inside fixed scroll zone */}
              <div className="pt-1">
                <div className="flex items-center justify-between mb-1.5">
                  <label className="flex items-center gap-1.5 text-xs font-bold text-slate-900 dark:text-white">
                    <Users className="h-3.5 w-3.5 text-indigo-600" />
                    <span>{t("auth.chooseInstructors")}</span>
                  </label>
                  {instructors.length > 0 && (
                    <div className="flex items-center gap-2 text-[11px]">
                      <button
                        type="button"
                        onClick={selectAll}
                        className="text-indigo-600 dark:text-indigo-400 font-bold hover:underline"
                      >
                        {t("auth.selectAll")}
                      </button>
                      <span className="text-slate-300 dark:text-slate-700">|</span>
                      <button
                        type="button"
                        onClick={clearAll}
                        className="text-slate-500 hover:underline"
                      >
                        {t("auth.clearAll")}
                      </button>
                    </div>
                  )}
                </div>

                {loadingInstructors ? (
                  <div className="p-2 text-center text-xs text-slate-500">{t("app.loading")}</div>
                ) : instructors.length === 0 ? (
                  <div className="p-2.5 rounded-xl border border-amber-200 bg-amber-50 dark:bg-amber-950/20 text-[11px] text-amber-800 dark:text-amber-200">
                    {t("auth.noInstructorsYet")}
                  </div>
                ) : (
                  <div className="max-h-20 sm:max-h-24 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 gap-1.5 p-1 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40">
                    {instructors.map((inst) => {
                      const selected = selectedIds.includes(inst.uid);
                      return (
                        <div
                          key={inst.uid}
                          onClick={() => toggleInstructor(inst.uid)}
                          className={`p-2 rounded-lg border text-xs cursor-pointer transition-all flex items-center justify-between gap-2 select-none ${
                            selected
                              ? "bg-indigo-500/10 border-indigo-400/80 text-indigo-800 dark:text-indigo-200 font-bold"
                              : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-indigo-300"
                          }`}
                        >
                          <div className="min-w-0">
                            <div className="truncate text-xs font-semibold">
                              {inst.name?.[lang] || inst.displayName || inst.email}
                            </div>
                            <div className="text-[10px] text-slate-500 truncate">
                              {inst.specialization?.[lang] || ""}
                            </div>
                          </div>
                          {selected ? (
                            <CheckCircle2 className="h-4 w-4 text-indigo-600 shrink-0" />
                          ) : (
                            <Circle className="h-4 w-4 text-slate-400 shrink-0" />
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Submit button */}
              <button
                type="submit"
                disabled={submitting}
                className="w-full mt-2 py-2.5 px-4 rounded-xl font-bold text-xs sm:text-sm text-white bg-gradient-to-r from-[#2055d5] via-[#4834d4] to-[#8c25cf] hover:from-[#1b48b5] hover:to-[#7b20b6] shadow-md shadow-indigo-600/30 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-60"
              >
                <span>{submitting ? t("auth.signingIn") : t("auth.registerBtn")}</span>
                <ArrowRight className="h-4 w-4 rtl:rotate-180" />
              </button>
            </form>

            {/* Back to Login link */}
            <div className="pt-2 text-center text-xs text-slate-500 dark:text-slate-400">
              <span>{t("auth.haveAccount")} </span>
              <Link
                to="/login"
                className="font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
              >
                {t("auth.backToLogin")}
              </Link>
            </div>
          </div>
        </div>
      </main>

      <footer className="shrink-0 text-center text-[10.5px] text-slate-400 dark:text-slate-500 py-0.5">
        {t("app.title")} © {new Date().getFullYear()}
      </footer>
    </div>
  );
}
