import { Lightbulb, X, Sparkles } from "lucide-react";
import { useLang } from "../../../context/LangContext";

export default function PuzzleHintModal({ puzzle, hintsUsedCount, onClose }) {
  const { lang } = useLang();
  if (!puzzle || !puzzle.hints) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-500/30 rounded-3xl p-6 shadow-2xl shadow-amber-500/10 text-slate-900 dark:text-white transition-all">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 end-4 p-1.5 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="h-12 w-12 rounded-2xl bg-gradient-to-tr from-amber-400 to-amber-600 flex items-center justify-center text-white shadow-lg shadow-amber-500/30 shrink-0">
            <Lightbulb className="h-6 w-6 animate-pulse" />
          </div>
          <div>
            <h3 className="font-black text-lg leading-tight">
              {lang === "ar" ? "تلميحات وإرشادات الحل المنطقي" : "Logical Hints & Guiding Clues"}
            </h3>
            <p className="text-xs text-amber-600 dark:text-amber-400 font-semibold mt-0.5 flex items-center gap-1">
              <Sparkles className="h-3.5 w-3.5" />
              <span>
                {lang === "ar"
                  ? `المستوى ${puzzle.levelNumber}: ${puzzle.title.ar}`
                  : `Level ${puzzle.levelNumber}: ${puzzle.title.en}`}
              </span>
            </p>
          </div>
        </div>

        {/* Description */}
        <p className="text-xs text-slate-600 dark:text-slate-400 mb-4 leading-relaxed">
          {lang === "ar"
            ? "استخدم هذه التلميحات لتوجيه طريقة تفكيرك نحو النمط المنطقي الصحيح دون إفساد متعة التفكير والاستكشاف بنفسك."
            : "Use these progressive hints to guide your logical reasoning without spoiling the fun of solving the puzzle on your own."}
        </p>

        {/* Hints Container */}
        <div className="space-y-3 mb-5">
          {puzzle.hints.map((h, idx) => (
            <div
              key={idx}
              className="p-3.5 rounded-2xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40 text-xs sm:text-[13px] leading-relaxed text-amber-900 dark:text-amber-200 font-medium"
            >
              {lang === "ar" ? h.ar : h.en}
            </div>
          ))}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white text-xs font-bold shadow-md shadow-amber-500/20 transition-all cursor-pointer"
          >
            {lang === "ar" ? "فهمت التلميح، سأحاول الآن!" : "Got it, let me solve it!"}
          </button>
        </div>
      </div>
    </div>
  );
}
