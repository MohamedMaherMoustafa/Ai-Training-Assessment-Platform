import { useState, useEffect } from "react";
import {
  Brain,
  Coins,
  Lightbulb,
  CheckCircle2,
  XCircle,
  HelpCircle,
  ArrowRight,
  ArrowLeft,
  RotateCcw,
  Sparkles,
  Zap,
} from "lucide-react";
import { useLang } from "../../../context/LangContext";
import PuzzleHintModal from "./PuzzleHintModal";
import PuzzleRewardModal from "./PuzzleRewardModal";
import { playClickSound, playCoinSound } from "../../../utils/soundEffects";

const DIFFICULTY_CONFIG = {
  easy: {
    label: { en: "Easy", ar: "سهل" },
    color: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30",
  },
  easy_medium: {
    label: { en: "Easy-Medium", ar: "سهل - متوسط" },
    color: "bg-teal-500/15 text-teal-700 dark:text-teal-400 border-teal-500/30",
  },
  medium: {
    label: { en: "Medium", ar: "متوسط" },
    color: "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30",
  },
  medium_hard: {
    label: { en: "Medium-Hard", ar: "متوسط - متقدم" },
    color: "bg-orange-500/15 text-orange-700 dark:text-orange-400 border-orange-500/30",
  },
  hard: {
    label: { en: "Hard", ar: "صعب" },
    color: "bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/30",
  },
  expert: {
    label: { en: "Expert", ar: "خبير / عبقري" },
    color: "bg-purple-500/15 text-purple-700 dark:text-purple-400 border-purple-500/30",
  },
  grandmaster: {
    label: { en: "Grandmaster", ar: "أستاذ الذكاء" },
    color: "bg-indigo-500/15 text-indigo-700 dark:text-indigo-400 border-indigo-500/30",
  },
  mastermind: {
    label: { en: "Mastermind", ar: "خبير النخبة" },
    color: "bg-fuchsia-500/15 text-fuchsia-700 dark:text-fuchsia-400 border-fuchsia-500/30",
  },
};

export default function PuzzleGameBoard({
  puzzle,
  isSolved,
  hasNextLevel,
  onNextLevel,
  onSolveComplete,
  onBackToMap,
}) {
  const { lang } = useLang();
  const [selectedOptionId, setSelectedOptionId] = useState(null);
  const [showHintModal, setShowHintModal] = useState(false);
  const [showRewardModal, setShowRewardModal] = useState(false);
  const [hintsUsedCount, setHintsUsedCount] = useState(0);
  const [answerState, setAnswerState] = useState(null); // 'idle' | 'wrong' | 'correct'
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    setSelectedOptionId(null);
    setAnswerState(null);
    setHasSubmitted(false);
    setErrorMessage("");
    setShowRewardModal(false);
    setShowHintModal(false);
  }, [puzzle?.id]);

  if (!puzzle) return null;

  const diffBadge =
    DIFFICULTY_CONFIG[puzzle.difficulty] || DIFFICULTY_CONFIG.medium;

  const handleSelectOption = (optId) => {
    if (hasSubmitted || answerState === "correct") return;
    playClickSound();
    setSelectedOptionId(optId);
    setAnswerState(null);
    setErrorMessage("");
  };

  const handleRetry = () => {
    playClickSound();
    setSelectedOptionId(null);
    setAnswerState(null);
    setHasSubmitted(false);
    setErrorMessage("");
  };

  const handleOpenHint = () => {
    playClickSound();
    setHintsUsedCount((c) => c + 1);
    setShowHintModal(true);
  };

  const handleSubmit = () => {
    if (hasSubmitted) return;

    if (!selectedOptionId) {
      setErrorMessage(
        lang === "ar"
          ? "يرجى اختيار إجابة أولاً قبل التأكيد."
          : "Please select an answer option first."
      );
      setAnswerState("wrong");
      return;
    }

    setHasSubmitted(true);

    if (selectedOptionId === puzzle.correctOptionId) {
      setAnswerState("correct");
      playCoinSound();
      setShowRewardModal(true);
      onSolveComplete(puzzle, puzzle.coins, hintsUsedCount);
    } else {
      setAnswerState("wrong");
      setErrorMessage(
        lang === "ar"
          ? "إجابة غير صحيحة! الاختيار من محاولة واحدة فقط في كل مستوى. لا يمكنك الانتقال للمستوى التالي دون تجاوزه. اضغط إعادة المحاولة للمحاولة مجدداً."
          : "Incorrect answer! You only have one attempt per level and cannot pass to the next level without solving this one. Click Retry to try again."
      );
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6 animate-fadeIn pb-12">
      {/* Top Header Card */}
      <div className="glass-panel p-5 sm:p-6 rounded-3xl shadow-lg">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onBackToMap}
              className="p-2.5 rounded-2xl glass-subtle hover:bg-teal-500/10 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
              title={lang === "ar" ? "العودة لخريطة المستويات" : "Back to Level Map"}
            >
              {lang === "ar" ? <ArrowRight className="h-4 w-4" /> : <ArrowLeft className="h-4 w-4" />}
            </button>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full bg-teal-500/15 border border-teal-400/25 text-teal-600 dark:text-teal-300 font-black text-xs">
                  {lang === "ar" ? `المستوى ${puzzle.levelNumber}` : `Level ${puzzle.levelNumber}`}
                </span>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${diffBadge.color}`}
                >
                  {lang === "ar" ? diffBadge.label.ar : diffBadge.label.en}
                </span>
                {isSolved && (
                  <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <span>{lang === "ar" ? "تم الحل مسبقاً" : "Solved"}</span>
                  </span>
                )}
              </div>
              <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white mt-1">
                {lang === "ar" ? puzzle.title.ar : puzzle.title.en}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Coins Bounty Badge */}
            <div className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-2xl bg-amber-500/15 border border-amber-400/30 text-amber-700 dark:text-amber-300 font-extrabold text-sm shadow-xs">
              <Coins className="h-4 w-4 text-amber-500 fill-amber-500" />
              <span>+{puzzle.coins} {lang === "ar" ? "عملة" : "Coins"}</span>
            </div>

            {/* Hint Button */}
            <button
              type="button"
              onClick={handleOpenHint}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-900/50 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/40 text-xs font-bold transition-all cursor-pointer"
            >
              <Lightbulb className="h-4 w-4" />
              <span>{lang === "ar" ? "تلميح" : "Hint"}</span>
            </button>
          </div>
        </div>

        {/* Cognitive Skill Pill */}
        <div className="mt-4 pt-4 border-t border-slate-200/70 dark:border-white/10 flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
          <Brain className="h-3.5 w-3.5 text-teal-500" />
          <span className="font-semibold">{lang === "ar" ? "المهارة الذهنية:" : "Cognitive Skill:"}</span>
          <span className="font-medium text-slate-700 dark:text-slate-300">
            {lang === "ar" ? puzzle.iqSkill.ar : puzzle.iqSkill.en}
          </span>
        </div>
      </div>

      {/* Main Puzzle Interaction Card */}
      <div className="glass-panel p-6 sm:p-8 rounded-3xl space-y-6">
        {/* Question Statement */}
        <div>
          <h3 className="text-base sm:text-lg font-bold text-slate-800 dark:text-slate-100 leading-relaxed whitespace-pre-line">
            {lang === "ar" ? puzzle.question.ar : puzzle.question.en}
          </h3>
        </div>

        {/* Visual Puzzle Area */}
        <div className="p-6 sm:p-8 rounded-3xl glass-subtle flex flex-col items-center justify-center min-h-[180px]">
          {/* 1. Number Sequence Visual */}
          {puzzle.type === "number_sequence" && (
            <div className="flex flex-wrap items-center justify-center gap-2.5 sm:gap-3.5">
              {puzzle.sequenceDisplay.map((item, idx) => (
                <div
                  key={idx}
                  className={`h-14 sm:h-16 px-4 min-w-[56px] sm:min-w-[64px] rounded-2xl flex items-center justify-center font-mono font-black text-lg sm:text-xl shadow-sm transition-transform hover:scale-105 ${item === "?"
                      ? "bg-gradient-to-tr from-sky-500 to-emerald-500 text-white animate-pulse"
                      : "glass-card text-slate-900 dark:text-white"
                    }`}
                >
                  {item}
                </div>
              ))}
            </div>
          )}

          {/* 2. Visual Matrix Pattern */}
          {puzzle.type === "matrix_pattern" && puzzle.visualData && (
            <div className="grid grid-cols-3 gap-3 p-3 glass-card rounded-3xl shadow-inner">
              {puzzle.visualData.rows.map((row, rIdx) =>
                row.map((cell, cIdx) => (
                  <div
                    key={`${rIdx}_${cIdx}`}
                    className={`h-20 w-20 sm:h-24 sm:w-24 rounded-2xl flex flex-col items-center justify-center font-bold text-xs p-1 transition-all ${cell.shape === "unknown"
                        ? "bg-teal-500/15 border-2 border-dashed border-teal-400 text-teal-500 text-2xl animate-pulse"
                        : "bg-slate-100 dark:bg-white/[0.06] text-slate-800 dark:text-slate-200"
                      }`}
                  >
                    {cell.shape !== "unknown" ? (
                      <>
                        <span
                          className="text-2xl sm:text-3xl font-black transform transition-transform"
                          style={{ display: "inline-block", transform: `rotate(${cell.rot}deg)` }}
                        >
                          ▲
                        </span>
                        <div className="flex gap-1 mt-1">
                          {Array.from({ length: cell.dots }).map((_, i) => (
                            <span key={i} className="h-1.5 w-1.5 rounded-full bg-teal-400" />
                          ))}
                        </div>
                      </>
                    ) : (
                      "?"
                    )}
                  </div>
                ))
              )}
            </div>
          )}

          {/* 3. Cryptic Cipher Card */}
          {puzzle.type === "cryptic_cipher" && puzzle.visualData && (
            <div className="flex flex-wrap items-center justify-center gap-3">
              {puzzle.visualData.letters.map((item, idx) => (
                <div
                  key={idx}
                  className="flex flex-col items-center p-3 rounded-2xl glass-card shadow-sm min-w-[56px]"
                >
                  <span className="font-mono text-xl font-black text-teal-600 dark:text-teal-300">
                    {item.char}
                  </span>
                  <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 mt-1">
                    #{item.val}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* 4. Truth Teller Mystery Vaults */}
          {puzzle.type === "truth_teller" && puzzle.visualData && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full">
              {puzzle.visualData.vaults.map((v) => (
                <div
                  key={v.id}
                  className="p-4 rounded-2xl glass-card shadow-sm flex flex-col items-center text-center gap-2"
                >
                  <span className="text-2xl">🔒</span>
                  <span className="font-extrabold text-xs text-teal-600 dark:text-teal-300">
                    {lang === "ar" ? `الخزينة #${v.id}` : `Vault #${v.id}`}
                  </span>
                  <p className="text-xs text-slate-600 dark:text-slate-300 italic font-medium">
                    "{v.text}"
                  </p>
                </div>
              ))}
            </div>
          )}

          {/* 5. Balance Scale Equations */}
          {puzzle.type === "balance_scale" && puzzle.visualData && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full">
              {puzzle.visualData.scales.map((s, idx) => (
                <div
                  key={idx}
                  className="p-3.5 rounded-2xl glass-card shadow-sm flex flex-col items-center text-center gap-1.5"
                >
                  <span className="text-[11px] font-bold text-slate-400">
                    {lang === "ar" ? `الميزان ${idx + 1}` : `Scale ${idx + 1}`}
                  </span>
                  <div className="flex items-center gap-2 text-base font-black">
                    <span>{s.left}</span>
                    <span className="text-teal-500 font-bold">=</span>
                    <span>{s.right}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* 6. Circuit Logic Flow */}
          {puzzle.type === "circuit_flow" && (
            <div className="flex flex-wrap items-center justify-center gap-3 text-xs font-mono font-bold">
              <span className="px-3 py-1.5 rounded-xl bg-sky-500/15 text-sky-600 dark:text-sky-300 border border-sky-400/25">
                A = 1
              </span>
              <span className="text-slate-400">→</span>
              <span className="px-3 py-1.5 rounded-xl bg-teal-500/15 text-teal-600 dark:text-teal-300 border border-teal-400/25">
                Gate 1 [AND]
              </span>
              <span className="text-slate-400">→</span>
              <span className="px-3 py-1.5 rounded-xl bg-cyan-500/15 text-cyan-600 dark:text-cyan-300 border border-cyan-400/25">
                Gate 3 [XOR]
              </span>
              <span className="text-slate-400">→</span>
              <span className="px-3 py-1.5 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-400/20">
                Output Z = ?
              </span>
            </div>
          )}

          {/* 7. Gear Mechanics Diagram */}
          {puzzle.type === "gear_mechanics" && puzzle.visualData && (
            <div className="flex flex-wrap items-center justify-center gap-3">
              {puzzle.visualData.gears.map((g) => (
                <div
                  key={g.name}
                  className="flex flex-col items-center p-3 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 shadow-sm"
                >
                  <span className="text-2xl animate-spin" style={{ animationDuration: "6s" }}>
                    ⚙️
                  </span>
                  <span className="font-extrabold text-xs mt-1">
                    Gear {g.name} ({g.teeth}T)
                  </span>
                  <span className="text-[10px] text-slate-500">{g.dir || "?"}</span>
                </div>
              ))}
            </div>
          )}

          {/* 8. Lateral River / Bridge Diagram */}
          {puzzle.type === "lateral_river" && puzzle.visualData && (
            <div className="flex flex-wrap items-center justify-center gap-2.5 text-xs font-bold">
              <span className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10">
                👤 A: 1 min
              </span>
              <span className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10">
                👤 B: 2 min
              </span>
              <span className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10">
                👤 C: 5 min
              </span>
              <span className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10">
                👤 D: 10 min
              </span>
              <span className="px-3 py-1.5 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-400/30">
                🔥 Torch: 17 min max
              </span>
            </div>
          )}

          {/* 9. Cube Folding Net */}
          {puzzle.type === "cube_folding" && puzzle.visualData && (
            <div className="grid grid-cols-3 gap-1.5 font-bold text-base">
              {puzzle.visualData.layout.map((row, rIdx) =>
                row.map((cell, cIdx) => (
                  <div
                    key={`${rIdx}_${cIdx}`}
                    className={`h-11 w-11 rounded-xl flex items-center justify-center ${cell
                        ? "bg-white dark:bg-slate-800 border border-slate-300 dark:border-white/20 text-slate-900 dark:text-white shadow-xs"
                        : "opacity-0 pointer-events-none"
                      }`}
                  >
                    {cell}
                  </div>
                ))
              )}
            </div>
          )}

          {/* 10. Einstein Matrix Clues */}
          {puzzle.type === "einstein_matrix" && puzzle.visualData && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs w-full">
              {puzzle.visualData.clues.map((c, i) => (
                <div
                  key={i}
                  className="p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 flex items-center gap-1.5"
                >
                  <span className="text-indigo-500 font-bold">•</span>
                  <span>{c}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Answer Options Grid */}
        <div className="space-y-3">
          <div className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center justify-between">
            <span>{lang === "ar" ? "اختر الإجابة الصحيحة:" : "Select your answer:"}</span>
            <span className="text-[11px] text-amber-600 dark:text-amber-400 font-bold bg-amber-500/10 px-2 py-0.5 rounded-full">
              {lang === "ar" ? "⚠️ محاولة واحدة فقط لكل مستوى" : "⚠️ Single attempt per level"}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {puzzle.options.map((opt) => {
              const isSelected = selectedOptionId === opt.id;
              const isWrong = hasSubmitted && answerState === "wrong" && isSelected;
              const isCorrect = hasSubmitted && answerState === "correct" && isSelected;

              return (
                <button
                  key={opt.id}
                  type="button"
                  disabled={hasSubmitted}
                  onClick={() => handleSelectOption(opt.id)}
                  className={`p-4 rounded-2xl border text-start transition-all flex items-center justify-between gap-3 ${hasSubmitted ? "cursor-not-allowed" : "cursor-pointer"
                    } ${isWrong
                      ? "border-rose-500 bg-rose-50 dark:bg-rose-950/40 text-rose-900 dark:text-rose-200 shadow-md shadow-rose-500/10 font-bold"
                      : isCorrect
                        ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 shadow-md shadow-emerald-500/10 font-bold"
                        : isSelected
                          ? "border-teal-400 bg-teal-500/15 text-teal-900 dark:text-teal-200 shadow-md shadow-teal-500/10 font-bold scale-[1.01]"
                          : "border-slate-200 dark:border-white/10 glass-card hover:border-teal-400/40 text-slate-800 dark:text-slate-200"
                    }`}
                >
                  <span className="text-xs sm:text-[13px] font-semibold leading-relaxed">
                    {lang === "ar" ? opt.label.ar : opt.label.en}
                  </span>
                  <div
                    className={`h-5 w-5 rounded-full border-2 flex items-center justify-center shrink-0 ${isWrong
                        ? "border-rose-600 bg-rose-600 text-white"
                        : isCorrect
                          ? "border-emerald-600 bg-emerald-600 text-white"
                          : isSelected
                            ? "border-teal-500 bg-teal-500 text-white"
                            : "border-slate-300 dark:border-slate-600"
                      }`}
                  >
                    {isWrong ? (
                      <span className="text-xs font-bold leading-none">✕</span>
                    ) : isCorrect ? (
                      <span className="text-xs font-bold leading-none">✓</span>
                    ) : isSelected ? (
                      <span className="h-2 w-2 rounded-full bg-white" />
                    ) : null}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Error Feedback Banner */}
        {answerState === "wrong" && errorMessage && (
          <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-900/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-bold text-rose-700 dark:text-rose-300 animate-shake">
            <div className="flex items-center gap-2.5">
              <XCircle className="h-5 w-5 shrink-0 text-rose-500" />
              <span className="leading-relaxed">{errorMessage}</span>
            </div>
            {hasSubmitted && (
              <button
                type="button"
                onClick={handleRetry}
                className="self-end sm:self-auto shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-sm transition-all cursor-pointer"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>{lang === "ar" ? "إعادة محاولة اللغز 🔄" : "Retry Level 🔄"}</span>
              </button>
            )}
          </div>
        )}

        {/* Submit & Control Action Bar */}
        <div className="pt-4 border-t border-slate-200/80 dark:border-white/10 flex items-center justify-between gap-3">
          <button
            type="button"
            disabled={hasSubmitted}
            onClick={() => {
              if (hasSubmitted) return;
              setSelectedOptionId(null);
              setAnswerState(null);
              setErrorMessage("");
            }}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition-colors ${hasSubmitted
                ? "text-slate-400 dark:text-slate-600 cursor-not-allowed"
                : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              }`}
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>{lang === "ar" ? "مسح الاختيار" : "Reset"}</span>
          </button>

          {hasSubmitted && answerState === "wrong" ? (
            <button
              type="button"
              onClick={handleRetry}
              className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-gradient-to-r from-rose-600 via-rose-500 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white text-xs sm:text-sm font-extrabold shadow-lg shadow-rose-500/25 transition-all hover:scale-105 active:scale-95 cursor-pointer"
            >
              <RotateCcw className="h-4 w-4" />
              <span>{lang === "ar" ? "إعادة محاولة المستوى 🔄" : "Retry Level 🔄"}</span>
            </button>
          ) : (
            <button
              type="button"
              disabled={hasSubmitted || !selectedOptionId}
              onClick={handleSubmit}
              className={`flex items-center gap-2 px-6 py-3 rounded-2xl text-white text-xs sm:text-sm font-extrabold transition-all shadow-lg ${hasSubmitted || !selectedOptionId
                  ? "bg-slate-300 dark:bg-slate-700 cursor-not-allowed text-slate-500 dark:text-slate-400 shadow-none"
                  : "glass-btn-primary hover:scale-105 active:scale-95 cursor-pointer"
                }`}
            >
              <Sparkles className="h-4 w-4" />
              <span>{lang === "ar" ? "تأكيد الإجابة (محاولة واحدة) 🚀" : "Submit Answer (1 Chance) 🚀"}</span>
            </button>
          )}
        </div>
      </div>

      {/* Progressive Hint Modal */}
      {showHintModal && (
        <PuzzleHintModal
          puzzle={puzzle}
          hintsUsedCount={hintsUsedCount}
          onClose={() => setShowHintModal(false)}
        />
      )}

      {/* Celebratory Reward Modal */}
      {showRewardModal && (
        <PuzzleRewardModal
          puzzle={puzzle}
          coinsAwarded={puzzle.coins}
          hasNextLevel={hasNextLevel}
          onNextLevel={() => {
            setShowRewardModal(false);
            onNextLevel();
          }}
          onClose={() => setShowRewardModal(false)}
        />
      )}
    </div>
  );
}
