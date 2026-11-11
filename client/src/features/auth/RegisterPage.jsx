import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";
import {
  GraduationCap,
  UserPlus,
  CheckCircle2,
  Circle,
  Sun,
  Moon,
  Languages,
  Users,
} from "lucide-react";
import {
  listActiveInstructors,
  registerStudentAccount,
} from "../../services/platformService";
import { useTheme } from "../../context/ThemeContext";
import { useLang } from "../../context/LangContext";
import { usePopup } from "../../context/PopupContext";

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
    <div className="min-h-screen p-3 sm:p-4">
      <div className="max-w-5xl mx-auto glass-panel rounded-[22px] px-3 sm:px-5 py-2.5 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="h-9 w-9 sm:h-10 sm:w-10 rounded-xl bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-600 text-white flex items-center justify-center shadow-lg shadow-teal-500/30 shrink-0">
            <GraduationCap className="h-5 w-5 sm:h-6 sm:w-6" />
          </div>
          <div className="min-w-0">
            <h1 className="font-extrabold text-xs sm:text-base truncate">{t("app.title")}</h1>
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

      <div className="max-w-2xl mx-auto my-6 glass-panel rounded-[34px] overflow-hidden">
        <div className="p-6 bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-600 text-white text-center relative overflow-hidden">
          <div className="pointer-events-none absolute -top-10 -end-10 h-32 w-32 rounded-full bg-white/15 blur-xl" />
          <h2 className="text-2xl font-black relative">{t("auth.registerTitle")}</h2>
          <p className="text-xs sm:text-sm text-white/90 mt-1 relative">
            {t("auth.registerDesc")}
          </p>
        </div>

        <div className="p-6 md:p-8">

        <form onSubmit={handleSubmit} autoComplete="off" className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold mb-1">{t("auth.fullName")}</label>
              <input
                type="text"
                name="reg_full_name"
                autoComplete="off"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full px-3 py-2 rounded-xl glass-input text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">{t("auth.username")}</label>
              <input
                type="text"
                name="reg_username"
                autoComplete="off"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-3 py-2 rounded-xl glass-input text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1">{t("auth.email")}</label>
            <input
              type="text"
              name="reg_email"
              autoComplete="off"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="student@academy.com or student@123"
              className="w-full px-3 py-2 rounded-xl glass-input text-sm"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold mb-1">{t("auth.password")}</label>
              <input
                type="password"
                name="reg_password"
                autoComplete="new-password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 rounded-xl glass-input text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">{t("auth.confirmPassword")}</label>
              <input
                type="password"
                name="reg_confirm_password"
                autoComplete="new-password"
                required
                minLength={6}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-3 py-2 rounded-xl glass-input text-sm"
              />
            </div>
          </div>

          {/* Multi-Instructor Selection */}
          <div className="pt-2">
            <div className="flex items-center justify-between mb-2">
              <div>
                <label className="flex items-center gap-1.5 text-sm font-bold text-slate-900 dark:text-white">
                  <Users className="h-4 w-4 text-sky-600" />
                  {t("auth.chooseInstructors")}
                </label>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {t("auth.chooseInstructorsHint")}
                </p>
              </div>
              {instructors.length > 0 && (
                <div className="flex items-center gap-2 text-xs">
                  <button
                    type="button"
                    onClick={selectAll}
                    className="text-sky-600 dark:text-sky-400 font-semibold hover:underline"
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
              <div className="text-xs text-slate-500 py-4 text-center">{t("app.loading")}</div>
            ) : instructors.length === 0 ? (
              <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-xs text-amber-800 dark:text-amber-200">
                {t("auth.noInstructorsYet")}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-56 overflow-y-auto p-1">
                {instructors.map((inst) => {
                  const selected = selectedIds.includes(inst.uid);
                  const instName = inst.name?.[lang] || inst.displayName || inst.email;
                  const spec = inst.specialization?.[lang] || "";
                  return (
                    <button
                      key={inst.uid}
                      type="button"
                      onClick={() => toggleInstructor(inst.uid)}
                      className={`text-start p-3 rounded-2xl border transition-all flex items-start gap-2.5 ${
                        selected
                          ? "bg-gradient-to-br from-emerald-500/15 to-cyan-500/15 border-teal-500 ring-2 ring-teal-400/40 shadow-sm"
                          : "glass-subtle hover:border-teal-400"
                      }`}
                    >
                      {selected ? (
                        <CheckCircle2 className="h-4 w-4 text-teal-600 shrink-0 mt-0.5" />
                      ) : (
                        <Circle className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
                      )}
                      <div className="min-w-0">
                        <div className="text-sm font-bold truncate">{instName}</div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 truncate">
                          {spec}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 px-4 glass-btn-primary text-sm flex items-center justify-center gap-2 disabled:opacity-60"
          >
            <UserPlus className="h-4 w-4" />
            {submitting ? t("app.loading") : t("auth.registerBtn")}
          </button>
        </form>

          <div className="mt-6 pt-5 border-t border-white/40 dark:border-white/10 text-center text-sm">
            <span className="text-slate-500 dark:text-slate-400">{t("auth.haveAccount")} </span>
            <Link to="/login" className="font-bold text-teal-600 dark:text-cyan-300 hover:underline">
              {t("auth.backToLogin")}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

