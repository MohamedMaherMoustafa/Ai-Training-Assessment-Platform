import { Trophy, Coins, CheckCircle2, ArrowRight, ArrowLeft, RotateCcw, Sparkles } from "lucide-react";
import { useLang } from "../../../context/LangContext";

export default function PuzzleRewardModal({
  puzzle,
  coinsAwarded,
  hasNextLevel,
  onNextLevel,
  onClose,
}) {
  const { lang } = useLang();
  if (!puzzle) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 border border-emerald-300 dark:border-emerald-500/30 rounded-3xl p-6 sm:p-7 shadow-2xl shadow-emerald-500/15 text-slate-900 dark:text-white transition-all text-center">
        {/* Animated Celebration Badge */}
        <div className="relative mx-auto mb-4 h-20 w-20 flex items-center justify-center">
          <div className="absolute inset-0 rounded-full bg-emerald-500/20 dark:bg-emerald-500/30 animate-ping" />
          <div className="h-20 w-20 rounded-3xl bg-gradient-to-tr from-emerald-500 via-teal-500 to-amber-400 flex items-center justify-center text-white shadow-xl shadow-emerald-500/30">
            <Trophy className="h-10 w-10 text-amber-100 animate-bounce" />
          </div>
        </div>

        {/* Celebration Title */}
        <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 mb-1">
          <Sparkles className="h-4 w-4" />
          <span>{lang === "ar" ? "إجابة صحيحة وذكية!" : "Brilliant Logical Deduction!"}</span>
        </div>

        <h3 className="font-black text-xl sm:text-2xl mb-2">
          {lang === "ar"
            ? `أحسنت! أكملت المستوى ${puzzle.levelNumber}`
            : `Level ${puzzle.levelNumber} Mastered!`}
        </h3>

        {/* Coins Reward Pill */}
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-amber-500/15 border border-amber-400/40 text-amber-700 dark:text-amber-300 font-extrabold text-base my-2 shadow-xs animate-pulse">
          <Coins className="h-5 w-5 text-amber-500 fill-amber-500" />
          <span>
            +{coinsAwarded} {lang === "ar" ? "عملة ذهبية إلى محفظتك" : "Coins Added to Wallet"}
          </span>
        </div>

        {/* Step-by-Step Logic Explanation */}
        <div className="text-start mt-4 mb-6 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-white/10">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            <span>{lang === "ar" ? "التفسير والتحليل المنطقي:" : "Logical Breakdown:"}</span>
          </div>
          <p className="text-xs sm:text-[13px] leading-relaxed text-slate-600 dark:text-slate-300">
            {lang === "ar" ? puzzle.explanation.ar : puzzle.explanation.en}
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-white/15 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold transition-colors cursor-pointer"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>{lang === "ar" ? "خريطة المراحل" : "Level Map"}</span>
          </button>

          {hasNextLevel ? (
            <button
              type="button"
              onClick={onNextLevel}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-black shadow-lg shadow-emerald-500/25 transition-all hover:scale-105 cursor-pointer"
            >
              <span>{lang === "ar" ? "المستوى التالي ⚡" : "Next Level ⚡"}</span>
              {lang === "ar" ? <ArrowLeft className="h-4 w-4" /> : <ArrowRight className="h-4 w-4" />}
            </button>
          ) : (
            <button
              type="button"
              onClick={onClose}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-indigo-600 text-white text-xs font-black shadow-lg shadow-indigo-500/25 transition-all cursor-pointer"
            >
              <Trophy className="h-4 w-4" />
              <span>{lang === "ar" ? "أنت عبقري أثر IQ!" : "All Levels Completed!"}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
