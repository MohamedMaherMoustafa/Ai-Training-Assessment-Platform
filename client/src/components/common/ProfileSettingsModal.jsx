import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";
import {
  X,
  User,
  Lock,
  Eye,
  EyeOff,
  Check,
  ShieldCheck,
  KeyRound,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useLang } from "../../context/LangContext";
import { updateUserProfileAndCredentials } from "../../services/platformService";
import { playSuccessSound } from "../../utils/soundEffects";

export default function ProfileSettingsModal({ isOpen, onClose }) {
  const { t } = useTranslation();
  const { lang } = useLang();
  const { user, setUser, refreshProfile } = useAuth();

  const currentDisplayName =
    user?.displayName ||
    (typeof user?.name === "object" ? user?.name?.[lang] || user?.name?.en : user?.name) ||
    user?.email ||
    "";

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (isOpen) {
      setFullName(currentDisplayName);
      setPhone(user?.phoneNumber || user?.phone || "");
      setNewPassword("");
      setConfirmPassword("");
      setShowNewPassword(false);
      setShowConfirmPassword(false);
      setErrorMsg("");
      setSaving(false);
    }
  }, [isOpen, currentDisplayName, user?.phoneNumber, user?.phone]);

  // Handle ESC key to close
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && isOpen && !saving) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, saving, onClose]);

  if (!isOpen) return null;

  const handleSave = async (e) => {
    e?.preventDefault?.();
    setErrorMsg("");

    const trimmedName = fullName.trim();
    if (!trimmedName) {
      setErrorMsg(t("profile.nameRequired") || "Full Name is required");
      return;
    }

    const trimmedPhone = phone.trim();
    if (trimmedPhone && trimmedPhone.length !== 11) {
      setErrorMsg(t("auth.phoneValidation") || "Phone number must be exactly 11 digits");
      return;
    }

    const trimmedPassword = newPassword.trim();
    const trimmedConfirm = confirmPassword.trim();

    if (trimmedPassword || trimmedConfirm) {
      if (trimmedPassword.length < 6) {
        setErrorMsg(t("profile.passwordTooShort") || "Password must be at least 6 characters");
        return;
      }
      if (trimmedPassword !== trimmedConfirm) {
        setErrorMsg(t("profile.passwordMismatch") || "Passwords do not match");
        return;
      }
    }

    try {
      setSaving(true);
      const updatedUser = await updateUserProfileAndCredentials(user, {
        displayName: trimmedName,
        phoneNumber: trimmedPhone,
        newPassword: trimmedPassword || undefined,
      });

      if (updatedUser) {
        setUser(updatedUser);
      }
      await refreshProfile();

      playSuccessSound();
      toast.success(t("profile.saveSuccess") || "Profile updated successfully!");
      onClose();
    } catch (err) {
      console.error("Profile update error:", err);
      let message = err.message || t("profile.saveError") || "Failed to update profile";
      if (err.code === "auth/requires-recent-login") {
        message = "For security, please sign out and sign in again before changing your password.";
      } else if (err.code === "auth/weak-password") {
        message = t("profile.passwordTooShort") || "Password should be at least 6 characters";
      }
      setErrorMsg(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const roleName = t(`roles.${user?.role || "student"}`);
  const userIdentifier = user?.email || user?.username || "user";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-md animate-fadeIn">
      <div
        className="glass-form-card relative w-full max-w-md bg-white/90 dark:bg-slate-900/90 border border-white/80 dark:border-white/10 rounded-3xl shadow-2xl overflow-hidden animate-scaleUp text-slate-800 dark:text-slate-100"
        role="dialog"
        aria-modal="true"
        aria-labelledby="profile-modal-title"
      >
        {/* Top Header Banner */}
        <div className="relative px-6 pt-6 pb-4 border-b border-slate-100 dark:border-white/10 bg-gradient-to-br from-indigo-50/70 via-white to-purple-50/50 dark:from-indigo-950/30 dark:via-slate-900 dark:to-purple-950/20">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            aria-label="Close"
            className="absolute top-5 right-5 rtl:right-auto rtl:left-5 p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors disabled:opacity-50 cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>

          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 text-white font-black text-sm flex items-center justify-center shadow-md shadow-indigo-500/20 shrink-0">
              {String(trimmedInitial(currentDisplayName)).slice(0, 2).toUpperCase() || <ShieldCheck className="h-5 w-5" />}
            </div>
            <div className="min-w-0 pr-6 rtl:pr-0 rtl:pl-6">
              <h3 id="profile-modal-title" className="text-base font-bold text-slate-900 dark:text-white truncate">
                {t("profile.editModalTitle")}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                {t("profile.editModalSubtitle")}
              </p>
            </div>
          </div>

          {/* User metadata badge */}
          <div className="mt-3 flex items-center gap-2 text-xs">
            <span className="px-2.5 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-semibold border border-indigo-200/60 dark:border-indigo-800/60 capitalize">
              {roleName}
            </span>
            <span className="text-slate-400 dark:text-slate-500">•</span>
            <span className="text-slate-500 dark:text-slate-400 truncate max-w-[200px]" title={userIdentifier}>
              {userIdentifier}
            </span>
          </div>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSave} className="p-6 space-y-4">
          {errorMsg && (
            <div className="flex items-start gap-2 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/40 text-rose-700 dark:text-rose-300 text-xs">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Full Name */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              {t("profile.fullName")} <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 rtl:left-auto rtl:right-0 pl-3.5 rtl:pl-0 rtl:pr-3.5 flex items-center pointer-events-none text-slate-400">
                <User className="h-4 w-4" />
              </div>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder={t("profile.fullNamePlaceholder")}
                className="w-full pl-10 pr-3.5 rtl:pl-3.5 rtl:pr-10 py-2.5 text-xs sm:text-sm glass-input"
              />
            </div>
          </div>

          {/* Phone Number */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                {t("auth.phoneNumber") || "Phone Number"}
              </label>
              <span
                className={`text-[10px] font-mono font-bold px-1.5 py-0.2 rounded ${
                  phone.length === 11
                    ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                    : "bg-slate-200/60 dark:bg-slate-800 text-slate-500"
                }`}
              >
                {phone.length}/11
              </span>
            </div>
            <input
              type="tel"
              inputMode="numeric"
              maxLength={11}
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 11))}
              placeholder={t("auth.phonePlaceholder") || "01xxxxxxxxx (11 digits)"}
              className="w-full px-3.5 py-2.5 text-xs sm:text-sm glass-input font-mono tracking-wider"
            />
          </div>

          {/* New Password */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                {t("profile.newPassword")}
              </label>
              <span className="text-[10px] text-slate-400 dark:text-slate-500">
                ({t("app.edit") || "Optional"})
              </span>
            </div>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 rtl:left-auto rtl:right-0 pl-3.5 rtl:pl-0 rtl:pr-3.5 flex items-center pointer-events-none text-slate-400">
                <Lock className="h-4 w-4" />
              </div>
              <input
                type={showNewPassword ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder={t("profile.newPasswordPlaceholder")}
                autoComplete="new-password"
                className="w-full pl-10 pr-10 rtl:pl-10 rtl:pr-10 py-2.5 text-xs sm:text-sm glass-input"
              />
              <button
                type="button"
                onClick={() => setShowNewPassword((prev) => !prev)}
                className="absolute inset-y-0 right-0 rtl:right-auto rtl:left-0 pr-3.5 rtl:pr-0 rtl:pl-3.5 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                tabIndex={-1}
              >
                {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* Confirm New Password */}
          {newPassword.length > 0 && (
            <div className="animate-fadeIn">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                {t("profile.confirmPassword")}
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 rtl:left-auto rtl:right-0 pl-3.5 rtl:pl-0 rtl:pr-3.5 flex items-center pointer-events-none text-slate-400">
                  <KeyRound className="h-4 w-4" />
                </div>
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder={t("profile.confirmPasswordPlaceholder")}
                  autoComplete="new-password"
                  className="w-full pl-10 pr-10 rtl:pl-10 rtl:pr-10 py-2.5 text-xs sm:text-sm glass-input"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((prev) => !prev)}
                  className="absolute inset-y-0 right-0 rtl:right-auto rtl:left-0 pr-3.5 rtl:pr-0 rtl:pl-3.5 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                  tabIndex={-1}
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">
                {t("profile.passwordHint")}
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="pt-2 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors disabled:opacity-50 cursor-pointer"
            >
              {t("app.cancel")}
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 shadow-md shadow-indigo-500/25 active:scale-95 transition-all disabled:opacity-60 cursor-pointer"
            >
              {saving ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>{t("profile.saving")}</span>
                </>
              ) : (
                <>
                  <Check className="h-3.5 w-3.5" />
                  <span>{t("app.save")}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function trimmedInitial(val) {
  if (!val) return "U";
  return String(val).trim();
}
