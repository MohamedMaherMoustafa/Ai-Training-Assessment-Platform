import {
  CloudUpload,
  FileText,
  Clock,
  Zap,
  CheckCircle2,
  AlertCircle,
  X,
  FileUp,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { useLang } from "../../context/LangContext";

export function formatBytes(bytes, decimals = 1) {
  if (!bytes || bytes <= 0) return "0 B";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i] || "MB"}`;
}

export function formatEta(seconds, lang = "en") {
  if (seconds === null || seconds === undefined || !isFinite(seconds)) {
    return lang === "ar" ? "جارٍ الحساب..." : "Calculating...";
  }
  if (seconds <= 0.8) {
    return lang === "ar" ? "أقل من ثانية متبقية" : "Less than a second";
  }
  if (seconds < 60) {
    const s = Math.ceil(seconds);
    return lang === "ar" ? `~${s} ثوانٍ متبقية` : `~${s}s remaining`;
  }
  const m = Math.floor(seconds / 60);
  const s = Math.ceil(seconds % 60);
  if (lang === "ar") {
    return `~${m} دقيقة و ${s} ثانية`;
  }
  return `~${m}m ${s}s remaining`;
}

export default function UploadProgressModal({
  isOpen,
  title,
  fileName,
  fileSize,
  loadedBytes,
  totalBytes,
  percent = 0,
  speed = 0,
  etaSeconds = null,
  stage = "",
  status = "uploading", // "uploading" | "success" | "error"
  error = null,
  onCancel = null,
}) {
  const { t } = useTranslation();
  const { lang } = useLang();

  if (!isOpen) return null;

  const isSuccess = status === "success";
  const isError = status === "error";

  const displayTitle = title || t("upload.title") || "Uploading File";
  const displayStage =
    stage || (isSuccess ? t("upload.complete") : isError ? t("upload.failed") : t("upload.preparing"));

  const progressPercent = Math.min(100, Math.max(0, Math.round(percent)));

  return (
    <div
      className="fixed inset-0 z-[120] bg-slate-950/65 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn"
      role="dialog"
      aria-modal="true"
    >
      <div className="glass-panel relative w-full max-w-md border-teal-400/25 rounded-3xl shadow-2xl p-6 sm:p-7 overflow-hidden text-slate-800 dark:text-slate-100 animate-scaleUp">
        {/* Ambient background glow orbs */}
        <div className="absolute -top-24 -left-24 w-52 h-52 bg-sky-500/20 dark:bg-sky-500/25 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-52 h-52 bg-teal-500/20 dark:bg-teal-500/25 rounded-full blur-3xl pointer-events-none" />

        {/* Cancel button if error or user allows cancel */}
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            aria-label="Cancel"
            className="absolute top-4 right-4 rtl:right-auto rtl:left-4 p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        )}

        {/* Header with animated upload icon */}
        <div className="flex items-center gap-3.5 mb-5">
          <div className="relative shrink-0">
            <div
              className={`h-12 w-12 rounded-2xl flex items-center justify-center text-white shadow-lg transition-colors ${
                isSuccess
                  ? "bg-gradient-to-tr from-emerald-500 to-teal-400 shadow-emerald-500/30"
                  : isError
                  ? "bg-gradient-to-tr from-rose-500 to-red-600 shadow-rose-500/30"
                  : "bg-gradient-to-tr from-sky-500 via-teal-500 to-emerald-500 shadow-teal-500/30"
              }`}
            >
              {isSuccess ? (
                <CheckCircle2 className="h-6 w-6 animate-bounce" />
              ) : isError ? (
                <AlertCircle className="h-6 w-6" />
              ) : (
                <CloudUpload className="h-6 w-6 animate-pulse" />
              )}
            </div>
            {!isSuccess && !isError && (
              <span className="absolute -inset-1 rounded-2xl border-2 border-teal-400/40 pulse-ring-anim pointer-events-none" />
            )}
          </div>

          <div className="min-w-0 flex-1">
            <h3 className="text-base font-bold text-slate-900 dark:text-white truncate">
              {displayTitle}
            </h3>
            <p className="text-xs text-teal-600 dark:text-teal-300 font-medium truncate mt-0.5">
              {displayStage}
            </p>
          </div>
        </div>

        {/* File information pill */}
        {fileName && (
          <div className="flex items-center justify-between gap-2 p-2.5 rounded-2xl glass-subtle mb-4 text-xs">
            <div className="flex items-center gap-2 min-w-0">
              <FileText className="h-4 w-4 text-teal-500 shrink-0" />
              <span className="font-semibold text-slate-800 dark:text-slate-200 truncate" title={fileName}>
                {fileName}
              </span>
            </div>
            <span className="font-mono text-[11px] text-slate-500 dark:text-slate-400 shrink-0 glass-subtle px-2 py-0.5 rounded-lg">
              {formatBytes(totalBytes || fileSize)}
            </span>
          </div>
        )}

        {/* Percentage and bytes indicator */}
        <div className="flex items-baseline justify-between mb-2">
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-slate-900 dark:text-white">
              {progressPercent}%
            </span>
            <span className="text-xs text-slate-400 dark:text-slate-500">
              {isSuccess ? t("upload.complete") : t("app.loading") || "in progress"}
            </span>
          </div>
          <span className="text-xs font-mono text-slate-500 dark:text-slate-400">
            {formatBytes(loadedBytes)} / {formatBytes(totalBytes || fileSize)}
          </span>
        </div>

        {/* Smooth Glassy Progress Bar */}
        <div className="relative w-full h-3 rounded-full bg-slate-200/70 dark:bg-white/10 border border-slate-200/70 dark:border-white/10 overflow-hidden mb-4 shadow-inner">
          <div
            className={`h-full rounded-full transition-all duration-300 ease-out relative overflow-hidden ${
              isSuccess
                ? "bg-gradient-to-r from-emerald-500 to-teal-400 shadow-md shadow-emerald-500/50"
                : isError
                ? "bg-gradient-to-r from-rose-500 to-red-500"
                : "bg-gradient-to-r from-sky-500 via-teal-500 to-emerald-500 shadow-md shadow-teal-500/40"
            }`}
            style={{ width: `${Math.max(4, progressPercent)}%` }}
          >
            {/* Shimmer shine effect */}
            {!isSuccess && !isError && (
              <span className="absolute inset-0 w-1/2 bg-gradient-to-r from-transparent via-white/40 to-transparent upload-shimmer-anim" />
            )}
          </div>
        </div>

        {/* Real-time Speed & Estimated Time (ETA) Grid */}
        <div className="grid grid-cols-2 gap-2.5 mb-2">
          {/* Speed Card */}
          <div className="p-3 rounded-2xl glass-subtle flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-xl bg-sky-500/15 text-sky-600 dark:text-sky-300 flex items-center justify-center shrink-0">
              <Zap className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <div className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-wider font-bold">
                {t("upload.speed") || "Speed"}
              </div>
              <div className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate font-mono">
                {speed > 0 ? `${formatBytes(speed)}/s` : "—"}
              </div>
            </div>
          </div>

          {/* Calculated Estimated Time Card */}
          <div className="p-3 rounded-2xl glass-subtle flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-xl bg-teal-500/15 text-teal-600 dark:text-teal-300 flex items-center justify-center shrink-0">
              <Clock className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <div className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-wider font-bold">
                {t("upload.eta") || "Estimated Time"}
              </div>
              <div
                className="text-xs font-bold text-teal-600 dark:text-teal-300 truncate font-mono"
                title={formatEta(etaSeconds, lang)}
              >
                {formatEta(etaSeconds, lang)}
              </div>
            </div>
          </div>
        </div>

        {/* Error message if failed */}
        {isError && error && (
          <div className="mt-3 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900/40 text-rose-700 dark:text-rose-300 text-xs flex items-center justify-between">
            <span className="truncate">{error}</span>
            {onCancel && (
              <button
                type="button"
                onClick={onCancel}
                className="ml-2 font-bold underline shrink-0 cursor-pointer"
              >
                {t("app.close") || "Close"}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
