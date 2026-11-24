import { useState, useEffect, useMemo } from "react";
import {
  Brain,
  Coins,
  Trophy,
  Flame,
  Sparkles,
  Lock,
  Unlock,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  RotateCcw,
  Zap,
  Award,
  CalendarCheck,
  Compass,
  Play,
  Lightbulb,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useLang } from "../../context/LangContext";
import {
  PUZZLE_LEVELS,
  getDailyChallengePuzzle,
  getRankByCoins,
  IQ_RANKS,
} from "./puzzleLevelsData";
import PuzzleGameBoard from "./components/PuzzleGameBoard";
import {
  getStudentIQStats,
  saveStudentIQProgress,
} from "../../services/platformService";
import { playClickSound, playCoinSound } from "../../utils/soundEffects";

export default function IQPuzzlesModule() {
  const { user } = useAuth();
  const { lang } = useLang();

  const [stats, setStats] = useState({
    coins: 0,
    solvedLevels: [],
    unlockedLevel: 1,
    hintsUsed: 0,
    dailyStreak: 0,
    lastPlayedDate: null,
  });

  const [activeTab, setActiveTab] = useState("levels"); // 'levels' | 'daily' | 'profile'
  const [activePuzzle, setActivePuzzle] = useState(null);
  const [loading, setLoading] = useState(true);

  // Load student IQ progress from RTDB and localStorage
  useEffect(() => {
    let mounted = true;
    if (user?.uid) {
      getStudentIQStats(user.uid).then((res) => {
        if (mounted && res) {
          setStats((prev) => ({
            ...prev,
            ...res,
            solvedLevels: Array.isArray(res.solvedLevels) ? res.solvedLevels : [],
            unlockedLevel: Math.max(1, Number(res.unlockedLevel) || 1),
            coins: Math.max(0, Number(res.coins) || 0),
          }));
          setLoading(false);
        }
      });
    } else {
      setLoading(false);
    }
    return () => {
      mounted = false;
    };
  }, [user?.uid]);

  const currentRank = useMemo(() => getRankByCoins(stats.coins), [stats.coins]);

  const nextRank = useMemo(() => {
    const idx = IQ_RANKS.findIndex((r) => r.minCoins === currentRank.minCoins);
    return idx < IQ_RANKS.length - 1 ? IQ_RANKS[idx + 1] : null;
  }, [currentRank]);

  const rankProgress = useMemo(() => {
    if (!nextRank) return 100;
    const span = nextRank.minCoins - currentRank.minCoins;
    const progressInRank = stats.coins - currentRank.minCoins;
    return Math.min(100, Math.max(5, Math.round((progressInRank / span) * 100)));
  }, [currentRank, nextRank, stats.coins]);

  const handleLevelSelect = (puzzle) => {
    playClickSound();
    setActivePuzzle(puzzle);
  };

  const handleSolveComplete = (solvedPuzzle, coinsAwarded, hintsUsedInLevel) => {
    setStats((prev) => {
      const alreadySolved = prev.solvedLevels.includes(solvedPuzzle.id);
      const newSolved = alreadySolved
        ? prev.solvedLevels
        : [...prev.solvedLevels, solvedPuzzle.id];

      const newCoins = alreadySolved ? prev.coins : prev.coins + coinsAwarded;
      const nextUnlocked = Math.max(
        prev.unlockedLevel,
        solvedPuzzle.levelNumber + 1
      );

      const todayStr = new Date().toISOString().slice(0, 10);
      let newStreak = prev.dailyStreak || 1;
      if (prev.lastPlayedDate !== todayStr) {
        newStreak += 1;
      }

      const updated = {
        ...prev,
        coins: newCoins,
        solvedLevels: newSolved,
        unlockedLevel: nextUnlocked,
        hintsUsed: (prev.hintsUsed || 0) + hintsUsedInLevel,
        dailyStreak: newStreak,
        lastPlayedDate: todayStr,
      };

      if (user?.uid) {
        saveStudentIQProgress(user.uid, updated);
      }
      return updated;
    });
  };

  const handleNextLevel = () => {
    if (!activePuzzle) return;
    const nextIdx = PUZZLE_LEVELS.findIndex((p) => p.id === activePuzzle.id) + 1;
    if (nextIdx < PUZZLE_LEVELS.length) {
      setActivePuzzle(PUZZLE_LEVELS[nextIdx]);
    } else {
      setActivePuzzle(null);
    }
  };

  // If a puzzle is currently being played, show the Game Board view
  if (activePuzzle) {
    const isSolved = stats.solvedLevels.includes(activePuzzle.id);
    const hasNext =
      PUZZLE_LEVELS.findIndex((p) => p.id === activePuzzle.id) <
      PUZZLE_LEVELS.length - 1;

    return (
      <div className="p-4 sm:p-6 lg:p-8">
        <PuzzleGameBoard
          puzzle={activePuzzle}
          isSolved={isSolved}
          hasNextLevel={hasNext}
          onNextLevel={handleNextLevel}
          onSolveComplete={handleSolveComplete}
          onBackToMap={() => setActivePuzzle(null)}
        />
      </div>
    );
  }

  const dailyChallenge = getDailyChallengePuzzle();

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6 sm:space-y-8 animate-fadeIn pb-16">
      {/* Top Hero Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-950 via-slate-900 to-indigo-900 border border-indigo-500/20 p-6 sm:p-8 shadow-2xl text-white">
        {/* Glowing Ambient Background Elements */}
        <div className="absolute -top-24 -end-24 w-72 h-72 rounded-full bg-indigo-500/15 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -start-24 w-72 h-72 rounded-full bg-amber-500/10 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 text-xs font-bold">
              <Sparkles className="h-3.5 w-3.5 text-amber-300 animate-spin" />
              <span>{lang === "ar" ? "ألعاب وألغاز تنمية الذكاء" : "Cognitive IQ & Brain Training"}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight">
              {lang === "ar"
                ? "مختبر ألغاز الذكاء والقدرات المعرفية 🧠"
                : "IQ Puzzles & Cognitive Brain Hub 🧠"}
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              {lang === "ar"
                ? "تدرّج عبر 10 مستويات فريدة من ألغاز الذكاء الرياضي والمكاني والمنطقي، واجمع العملات الذهبية وطور رتبتك المعرفية من مفكر مبتدئ إلى أستاذ الذكاء الأكبر!"
                : "Progress through 10 unique cognitive puzzle levels, earn coins based on difficulty, and elevate your mental rank from Novice Thinker to IQ Grandmaster!"}
            </p>
          </div>

          {/* Wallet & Rank Stat Cluster */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Coins Wallet Card */}
            <div className="px-5 py-3.5 rounded-2xl bg-white/10 backdrop-blur-md border border-white/15 flex items-center gap-3 shadow-lg">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-amber-400 to-amber-600 flex items-center justify-center text-white shadow-md shadow-amber-500/30">
                <Coins className="h-5 w-5 fill-current" />
              </div>
              <div>
                <span className="text-[11px] uppercase font-bold tracking-wider text-amber-200">
                  {lang === "ar" ? "رصيد العملات" : "IQ Coins"}
                </span>
                <div className="text-xl sm:text-2xl font-black text-amber-300">
                  {stats.coins.toLocaleString()}
                </div>
              </div>
            </div>

            {/* IQ Rank Pill Card */}
            <div className="px-5 py-3.5 rounded-2xl bg-white/10 backdrop-blur-md border border-white/15 flex items-center gap-3 shadow-lg">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center text-xl shadow-md shadow-indigo-500/30">
                {currentRank.badge}
              </div>
              <div>
                <span className="text-[11px] uppercase font-bold tracking-wider text-indigo-200">
                  {lang === "ar" ? "الرتبة المعرفية" : "IQ Rank"}
                </span>
                <div className="text-sm sm:text-base font-extrabold text-white">
                  {lang === "ar" ? currentRank.title.ar : currentRank.title.en}
                </div>
              </div>
            </div>

            {/* Daily Streak Card */}
            <div className="px-4 py-3.5 rounded-2xl bg-white/10 backdrop-blur-md border border-white/15 flex items-center gap-2.5 shadow-lg">
              <Flame className="h-6 w-6 text-orange-400 fill-orange-400 animate-pulse" />
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider text-orange-200">
                  {lang === "ar" ? "الحماس" : "Streak"}
                </span>
                <div className="text-sm font-extrabold text-white">
                  {stats.dailyStreak} {lang === "ar" ? "أيام" : "Days"}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Level Progression Progress Bar */}
        <div className="mt-6 pt-5 border-t border-white/10">
          <div className="flex items-center justify-between text-xs font-semibold mb-2">
            <span className="text-slate-300">
              {lang === "ar"
                ? `المراحل المكتملة: ${stats.solvedLevels.length} من أصل ${PUZZLE_LEVELS.length}`
                : `Progress: ${stats.solvedLevels.length} of ${PUZZLE_LEVELS.length} Levels Mastered`}
            </span>
            {nextRank && (
              <span className="text-indigo-300">
                {lang === "ar"
                  ? `الرتبة التالية: ${nextRank.title.ar} (${stats.coins}/${nextRank.minCoins} عملة)`
                  : `Next Rank: ${nextRank.title.en} (${stats.coins}/${nextRank.minCoins} coins)`}
              </span>
            )}
          </div>
          <div className="w-full h-2.5 rounded-full bg-white/10 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-amber-400 via-indigo-400 to-emerald-400 transition-all duration-500"
              style={{
                width: `${Math.round(
                  (stats.solvedLevels.length / PUZZLE_LEVELS.length) * 100
                )}%`,
              }}
            />
          </div>
        </div>
      </div>

      {/* Navigation Tab Selector */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-white/10 pb-3">
        <button
          type="button"
          onClick={() => setActiveTab("levels")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
            activeTab === "levels"
              ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/25"
              : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
          }`}
        >
          <Compass className="h-4 w-4" />
          <span>{lang === "ar" ? "خريطة المراحل (10 مستويات)" : "Levels Roadmap (10 Puzzles)"}</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("daily")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
            activeTab === "daily"
              ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/25"
              : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
          }`}
        >
          <CalendarCheck className="h-4 w-4 text-amber-400" />
          <span>{lang === "ar" ? "التحدي اليومي المكافأ" : "Daily Brain Teaser"}</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("profile")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
            activeTab === "profile"
              ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/25"
              : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
          }`}
        >
          <Award className="h-4 w-4" />
          <span>{lang === "ar" ? "المهارات والأوسمة" : "IQ Skills & Badges"}</span>
        </button>
      </div>

      {/* TAB 1: Levels Roadmap */}
      {activeTab === "levels" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500 dark:text-slate-400">
            <span>
              {lang === "ar"
                ? "اختر أي مستوى متاح للبدء في حله. كلما زادت الصعوبة زادت العملات المكتسبة!"
                : "Select an available level to solve. Higher difficulty levels award greater coins!"}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
            {PUZZLE_LEVELS.map((p) => {
              const isUnlocked = p.levelNumber <= stats.unlockedLevel;
              const isSolved = stats.solvedLevels.includes(p.id);

              return (
                <div
                  key={p.id}
                  className={`relative p-5 sm:p-6 rounded-3xl border transition-all flex flex-col justify-between ${
                    !isUnlocked
                      ? "bg-slate-100/70 dark:bg-slate-900/40 border-slate-200 dark:border-white/5 opacity-70"
                      : isSolved
                      ? "bg-white dark:bg-slate-900 border-emerald-300 dark:border-emerald-500/30 shadow-md shadow-emerald-500/5 hover:border-emerald-500"
                      : "bg-white dark:bg-slate-900 border-indigo-200 dark:border-indigo-900/50 shadow-md shadow-indigo-500/5 hover:border-indigo-500 hover:scale-[1.02]"
                  }`}
                >
                  {/* Card Header */}
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <div className="flex items-center gap-2">
                        <span className="h-8 w-8 rounded-xl bg-indigo-500/15 text-indigo-600 dark:text-cyan-400 font-black text-xs flex items-center justify-center">
                          #{p.levelNumber}
                        </span>
                        <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                          {lang === "ar" ? p.category.ar : p.category.en}
                        </span>
                      </div>

                      {/* Solved or Locked Badge */}
                      {isSolved ? (
                        <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          <span>{lang === "ar" ? "مكتمل" : "Solved"}</span>
                        </span>
                      ) : !isUnlocked ? (
                        <span className="flex items-center gap-1 text-[11px] font-bold text-slate-400 bg-slate-200 dark:bg-slate-800 px-2 py-0.5 rounded-full">
                          <Lock className="h-3 w-3" />
                          <span>{lang === "ar" ? "مقفل" : "Locked"}</span>
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-[11px] font-bold text-indigo-600 dark:text-cyan-400 bg-indigo-500/10 px-2.5 py-0.5 rounded-full">
                          <Unlock className="h-3 w-3" />
                          <span>{lang === "ar" ? "متاح" : "Ready"}</span>
                        </span>
                      )}
                    </div>

                    <h3 className="font-extrabold text-base text-slate-900 dark:text-white mb-1.5">
                      {lang === "ar" ? p.title.ar : p.title.en}
                    </h3>

                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-4 line-clamp-2">
                      {lang === "ar" ? p.iqSkill.ar : p.iqSkill.en}
                    </p>
                  </div>

                  {/* Card Bottom: Bounty & Action */}
                  <div className="pt-4 border-t border-slate-100 dark:border-white/5 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-1.5 text-xs font-extrabold text-amber-600 dark:text-amber-300">
                      <Coins className="h-4 w-4 fill-amber-500 text-amber-500" />
                      <span>+{p.coins} {lang === "ar" ? "عملة" : "Coins"}</span>
                    </div>

                    <button
                      type="button"
                      disabled={!isUnlocked}
                      onClick={() => handleLevelSelect(p)}
                      className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        !isUnlocked
                          ? "bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed"
                          : isSolved
                          ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100"
                          : "bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/20"
                      }`}
                    >
                      <Play className="h-3.5 w-3.5 fill-current" />
                      <span>
                        {isSolved
                          ? lang === "ar"
                            ? "إعادة اللعب"
                            : "Replay"
                          : lang === "ar"
                          ? "خوض التحدي"
                          : "Solve Puzzle"}
                      </span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 2: Daily Challenge */}
      {activeTab === "daily" && (
        <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-white/10 shadow-xl shadow-indigo-500/5 space-y-6 max-w-3xl mx-auto">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-extrabold text-amber-600 dark:text-amber-400">
              <CalendarCheck className="h-4 w-4" />
              <span>{lang === "ar" ? "تحدي الذكاء لليوم" : "Today's Brain Teaser"}</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-400/30">
              <Coins className="h-4 w-4 fill-amber-500 text-amber-500" />
              <span>+{dailyChallenge.coins} {lang === "ar" ? "عملة مكافأة" : "Bonus Coins"}</span>
            </div>
          </div>

          <div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mb-2">
              {lang === "ar" ? dailyChallenge.title.ar : dailyChallenge.title.en}
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300">
              {lang === "ar"
                ? "يتم تجديد هذا التحدي كل 24 ساعة، ويمنحك مكافأة عملات إضافية ويرفع سلسلة حماسك اليومية!"
                : "This cognitive challenge refreshes every 24 hours, granting bonus coins and boosting your daily streak!"}
            </p>
          </div>

          <div className="flex items-center justify-end pt-4">
            <button
              type="button"
              onClick={() => handleLevelSelect(dailyChallenge)}
              className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-indigo-600 hover:from-amber-600 hover:to-indigo-700 text-white font-extrabold text-xs sm:text-sm shadow-lg shadow-indigo-500/25 transition-all cursor-pointer"
            >
              <Zap className="h-4 w-4" />
              <span>{lang === "ar" ? "بدء تحدي اليوم الآن ⚡" : "Start Today's Teaser ⚡"}</span>
            </button>
          </div>
        </div>
      )}

      {/* TAB 3: Cognitive Profile & Badges */}
      {activeTab === "profile" && (
        <div className="space-y-6">
          <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-white/10 shadow-xl shadow-indigo-500/5">
            <h3 className="text-lg font-black text-slate-900 dark:text-white mb-4">
              {lang === "ar" ? "المهارات الإدراكية المدربة" : "Trained Cognitive Aptitudes"}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {PUZZLE_LEVELS.map((p) => {
                const isMastered = stats.solvedLevels.includes(p.id);
                return (
                  <div
                    key={p.id}
                    className={`p-3.5 rounded-2xl border text-xs flex items-center justify-between gap-3 ${
                      isMastered
                        ? "bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-800/40 text-emerald-900 dark:text-emerald-200"
                        : "bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-white/5 text-slate-600 dark:text-slate-400"
                    }`}
                  >
                    <div>
                      <span className="font-extrabold text-xs block">
                        Level {p.levelNumber}: {lang === "ar" ? p.category.ar : p.category.en}
                      </span>
                      <span className="text-[11px] opacity-80">
                        {lang === "ar" ? p.iqSkill.ar : p.iqSkill.en}
                      </span>
                    </div>
                    {isMastered ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                    ) : (
                      <Lock className="h-4 w-4 text-slate-400 shrink-0" />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
