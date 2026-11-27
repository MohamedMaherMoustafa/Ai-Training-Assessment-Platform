import { useState, useEffect, useMemo } from "react";
import toast from "react-hot-toast";
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
  Swords,
} from "lucide-react";
import AIBossBattleArena from "./components/AIBossBattleArena";
import ProactiveMotivationWidget from "../student/ProactiveMotivationWidget";
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
  resetStudentIQProgress,
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

  const [activeTab, setActiveTab] = useState("levels"); // 'levels' | 'daily' | 'profile' | 'battle'
  const [activePuzzle, setActivePuzzle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetting, setResetting] = useState(false);

  // Load student IQ progress from RTDB and localStorage & sync to main account
  useEffect(() => {
    let mounted = true;
    if (user?.uid) {
      getStudentIQStats(user.uid).then(async (res) => {
        if (mounted && res) {
          const loadedStats = {
            coins: Math.max(0, Number(res.coins) || 0),
            solvedLevels: Array.isArray(res.solvedLevels) ? res.solvedLevels : [],
            unlockedLevel: Math.max(1, Number(res.unlockedLevel) || 1),
            hintsUsed: Number(res.hintsUsed) || 0,
            dailyStreak: Number(res.dailyStreak) || 0,
            lastPlayedDate: res.lastPlayedDate || null,
          };
          setStats(loadedStats);
          setLoading(false);

          // Force instant sync with platform customization & navbar coins!
          try {
            await saveStudentIQProgress(user.uid, loadedStats);
          } catch {}
        }
      });
    } else {
      setLoading(false);
    }
    return () => {
      mounted = false;
    };
  }, [user?.uid]);

  const handleConfirmReset = async () => {
    if (!user?.uid || resetting) return;
    setResetting(true);
    playClickSound();
    try {
      const resetStats = await resetStudentIQProgress(user.uid);
      if (resetStats) {
        setStats(resetStats);
      }
      setActivePuzzle(null);
      setShowResetModal(false);
      toast.success(
        lang === "ar"
          ? "تمت إعادة ضبط المستويات والبدء من المستوى الأول بنجاح! 🚀"
          : "Levels reset successfully! Starting from Level 1 🚀"
      );
    } catch (err) {
      console.error("Failed to reset levels:", err);
      toast.error(lang === "ar" ? "تعذر إعادة ضبط المستويات" : "Failed to reset levels");
    } finally {
      setResetting(false);
    }
  };

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

  const isLevelUnlocked = (puzzleItem) => {
    if (!puzzleItem) return false;
    if (puzzleItem.levelNumber === 1) return true;
    const prevPuzzle = PUZZLE_LEVELS[puzzleItem.levelNumber - 2];
    if (!prevPuzzle) return false;
    return stats.solvedLevels.includes(prevPuzzle.id);
  };

  const handleLevelSelect = (puzzle) => {
    if (!isLevelUnlocked(puzzle)) return;
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

      let sequentialUnlocked = 1;
      for (let i = 0; i < PUZZLE_LEVELS.length; i++) {
        if (newSolved.includes(PUZZLE_LEVELS[i].id)) {
          sequentialUnlocked = i + 2;
        } else {
          break;
        }
      }
      sequentialUnlocked = Math.min(sequentialUnlocked, PUZZLE_LEVELS.length);

      const todayStr = new Date().toISOString().slice(0, 10);
      let newStreak = prev.dailyStreak || 1;
      if (prev.lastPlayedDate !== todayStr) {
        newStreak += 1;
      }

      const updated = {
        ...prev,
        coins: newCoins,
        solvedLevels: newSolved,
        unlockedLevel: sequentialUnlocked,
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
    if (!stats.solvedLevels.includes(activePuzzle.id)) return;
    const nextIdx = PUZZLE_LEVELS.findIndex((p) => p.id === activePuzzle.id) + 1;
    if (nextIdx < PUZZLE_LEVELS.length) {
      const nextPuzzle = PUZZLE_LEVELS[nextIdx];
      if (isLevelUnlocked(nextPuzzle)) {
        setActivePuzzle(nextPuzzle);
      }
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
      {/* Proactive Motivation Coach Widget */}
      <ProactiveMotivationWidget />

      {/* Top Hero Banner */}
      <div className="relative overflow-hidden rounded-[26px] glass-panel border-teal-400/35 p-6 sm:p-7 shadow-2xl">
        {/* Glowing Ambient Background Elements */}
        <div className="absolute -top-24 -end-24 w-72 h-72 rounded-full bg-teal-500/15 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -start-24 w-72 h-72 rounded-full bg-sky-500/10 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-500/15 border border-teal-400/30 text-teal-700 dark:text-teal-300 text-xs font-bold">
              <Sparkles className="h-3.5 w-3.5 text-amber-400" />
              <span>{lang === "ar" ? "ألعاب وألغاز تنمية الذكاء" : "Cognitive IQ & Brain Training"}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white">
              {lang === "ar"
                ? "مختبر ألغاز الذكاء والقدرات المعرفية 🧠"
                : "IQ Puzzles & Cognitive Brain Hub 🧠"}
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              {lang === "ar"
                ? "تدرّج عبر 50 مستوى فريد من ألغاز الذكاء الرياضي والمكاني والمنطقي، واجمع العملات الذهبية وطور رتبتك المعرفية من مفكر مبتدئ إلى أستاذ الذكاء الأكبر!"
                : "Progress through 50 unique cognitive puzzle levels, earn coins based on difficulty, and elevate your mental rank from Novice Thinker to IQ Grandmaster!"}
            </p>
          </div>

          {/* Wallet & Rank Stat Cluster */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Coins Wallet Card */}
            <div className="px-4 py-3 rounded-2xl glass-subtle flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-amber-400 to-amber-600 flex items-center justify-center text-white shadow-md shadow-amber-500/30">
                <Coins className="h-5 w-5 fill-current" />
              </div>
              <div>
                <span className="text-[10.5px] uppercase font-bold tracking-wider text-amber-600 dark:text-amber-300">
                  {lang === "ar" ? "رصيد العملات" : "IQ Coins"}
                </span>
                <div className="text-xl font-black text-slate-900 dark:text-white">
                  {stats.coins.toLocaleString()}
                </div>
              </div>
            </div>

            {/* IQ Rank Pill Card */}
            <div className="px-4 py-3 rounded-2xl glass-subtle flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-sky-500 to-emerald-500 flex items-center justify-center text-xl shadow-md shadow-teal-500/30">
                {currentRank.badge}
              </div>
              <div>
                <span className="text-[10.5px] uppercase font-bold tracking-wider text-teal-600 dark:text-teal-300">
                  {lang === "ar" ? "الرتبة المعرفية" : "IQ Rank"}
                </span>
                <div className="text-sm font-extrabold text-slate-900 dark:text-white">
                  {lang === "ar" ? currentRank.title.ar : currentRank.title.en}
                </div>
              </div>
            </div>

            {/* Daily Streak Card */}
            <div className="px-4 py-3 rounded-2xl glass-subtle flex items-center gap-2.5">
              <Flame className="h-6 w-6 text-orange-400 fill-orange-400 animate-pulse" />
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider text-orange-500 dark:text-orange-300">
                  {lang === "ar" ? "الحماس" : "Streak"}
                </span>
                <div className="text-sm font-extrabold text-slate-900 dark:text-white">
                  {stats.dailyStreak} {lang === "ar" ? "أيام" : "Days"}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Level Progression Progress Bar */}
        <div className="mt-6 pt-4 border-t border-slate-200/70 dark:border-white/10">
          <div className="flex items-center justify-between text-xs font-semibold mb-2">
            <span className="text-slate-600 dark:text-slate-300">
              {lang === "ar"
                ? `المراحل المكتملة: ${stats.solvedLevels.length} من أصل ${PUZZLE_LEVELS.length}`
                : `Progress: ${stats.solvedLevels.length} of ${PUZZLE_LEVELS.length} Levels Mastered`}
            </span>
            {nextRank && (
              <span className="text-teal-600 dark:text-teal-300">
                {lang === "ar"
                  ? `الرتبة التالية: ${nextRank.title.ar} (${stats.coins}/${nextRank.minCoins} عملة)`
                  : `Next Rank: ${nextRank.title.en} (${stats.coins}/${nextRank.minCoins} coins)`}
              </span>
            )}
          </div>
          <div className="w-full h-2.5 rounded-full bg-slate-200/80 dark:bg-white/10 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-sky-400 via-teal-400 to-emerald-400 transition-all duration-500"
              style={{
                width: `${Math.round(
                  (stats.solvedLevels.length / PUZZLE_LEVELS.length) * 100
                )}%`,
              }}
            />
          </div>
        </div>
      </div>

      {/* Navigation Tab Selector & Reset Action */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-1">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab("levels")}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              activeTab === "levels"
                ? "glass-btn-primary"
                : "glass-btn-secondary"
            }`}
          >
            <Compass className="h-4 w-4" />
            <span>{lang === "ar" ? "خريطة المراحل (50 مستوى)" : "Levels Roadmap (50 Puzzles)"}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("daily")}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              activeTab === "daily"
                ? "glass-btn-primary"
                : "glass-btn-secondary"
            }`}
          >
            <CalendarCheck className="h-4 w-4 text-amber-400" />
            <span>{lang === "ar" ? "التحدي اليومي المكافأ" : "Daily Brain Teaser"}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("profile")}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              activeTab === "profile"
                ? "glass-btn-primary"
                : "glass-btn-secondary"
            }`}
          >
            <Award className="h-4 w-4" />
            <span>{lang === "ar" ? "المهارات والأوسمة" : "IQ Skills & Badges"}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("battle")}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              activeTab === "battle"
                ? "glass-btn-primary ring-2 ring-rose-500/50"
                : "glass-btn-secondary"
            }`}
          >
            <Swords className="h-4 w-4 text-rose-500 animate-pulse" />
            <span>{lang === "ar" ? "معارك الروبوتات ⚔️" : "AI Boss Battles ⚔️"}</span>
          </button>
        </div>

        {/* Reset Levels & Start from 1 Button */}
        <button
          type="button"
          onClick={() => setShowResetModal(true)}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-full border border-rose-400/50 dark:border-rose-500/30 bg-rose-50/90 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 text-xs font-bold hover:bg-rose-100 dark:hover:bg-rose-900/50 hover:border-rose-500 transition-all hover:scale-105 active:scale-95 shadow-sm cursor-pointer"
          title={lang === "ar" ? "إعادة ضبط مستويات الألغاز والبدء من المستوى الأول مجدداً" : "Reset puzzle levels and start from Level 1 again"}
        >
          <RotateCcw className="h-3.5 w-3.5 text-rose-500" />
          <span>{lang === "ar" ? "إعادة ضبط المستويات (البدء من 1) 🔄" : "Reset Levels (Start from 1) 🔄"}</span>
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
              const isUnlocked = isLevelUnlocked(p);
              const isSolved = stats.solvedLevels.includes(p.id);

              return (
                <div
                  key={p.id}
                  className={`relative p-5 rounded-[22px] border transition-all flex flex-col justify-between ${
                    !isUnlocked
                      ? "bg-slate-100/70 dark:bg-white/[0.03] border-slate-200 dark:border-white/5 opacity-65"
                      : isSolved
                      ? "glass-card border-emerald-400/35 dark:border-teal-400/30"
                      : "glass-card border-teal-400/50 dark:border-teal-400/45"
                  }`}
                >
                  {/* Card Header */}
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <div className="flex items-center gap-2">
                        <span className="h-7 px-2.5 rounded-lg bg-teal-500/15 text-teal-600 dark:text-teal-300 font-black text-xs flex items-center justify-center border border-teal-400/20">
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
                        <span className="flex items-center gap-1 text-[11px] font-bold text-teal-600 dark:text-teal-300 bg-teal-500/15 border border-teal-400/25 px-2.5 py-0.5 rounded-full">
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
                  <div className="pt-3.5 border-t border-slate-200/60 dark:border-white/10 flex items-center justify-between gap-3">
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
                          ? "bg-slate-200 dark:bg-white/10 text-slate-400 cursor-not-allowed"
                          : isSolved
                          ? "bg-teal-500/20 hover:bg-teal-500/30 border border-teal-400/40 text-teal-700 dark:text-teal-200"
                          : "glass-btn-primary"
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
        <div className="glass-panel p-6 sm:p-8 rounded-3xl space-y-6 max-w-3xl mx-auto">
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
              className="glass-btn-primary flex items-center gap-2 px-6 py-3 rounded-2xl text-xs sm:text-sm cursor-pointer"
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
          <div className="glass-panel p-6 sm:p-8 rounded-3xl">
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
                        ? "bg-emerald-500/15 border-emerald-400/35 text-emerald-800 dark:text-emerald-200"
                        : "glass-subtle text-slate-600 dark:text-slate-400"
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

      {/* TAB 4: AI Boss Battles Arena */}
      {activeTab === "battle" && (
        <AIBossBattleArena
          user={user}
          lang={lang}
          onBattleVictory={(rewardCoins, rewardXp, bossId) => {
            playCoinSound();
            setStats((prev) => {
              const updatedCoins = (prev.coins || 0) + (rewardCoins || 0);
              const updated = {
                ...prev,
                coins: updatedCoins,
              };
              if (user?.uid) {
                saveStudentIQProgress(user.uid, updated);
              }
              return updated;
            });
          }}
          onBackToMap={() => setActiveTab("levels")}
        />
      )}

      {/* Reset Confirmation Modal */}
      {showResetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-md rounded-3xl glass-panel border-rose-500/40 p-6 shadow-2xl space-y-4 animate-scaleUp">
            <div className="flex items-center gap-3 text-rose-600 dark:text-rose-400">
              <div className="h-12 w-12 rounded-2xl bg-rose-500/15 border border-rose-400/30 flex items-center justify-center text-xl">
                ⚠️
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white">
                  {lang === "ar" ? "إعادة ضبط المستويات والبدء من 1؟" : "Reset Levels & Start from 1?"}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {lang === "ar" ? "بدء رحلة الألغاز من جديد" : "Start your puzzle journey fresh"}
                </p>
              </div>
            </div>

            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
              {lang === "ar"
                ? "سيتم قفل جميع المستويات المحلولة السابقة والبدء مجدداً من المستوى الأول (Level 1)، لتتمكن من حلها وجمع عملات المستويات كاملة لحسابك من جديد!"
                : "All previous solved levels will be locked so you can start fresh from Level 1, solve all 50 brain teasers, and earn their coins to your account from the beginning!"}
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-200/60 dark:border-white/10">
              <button
                type="button"
                onClick={() => setShowResetModal(false)}
                className="px-4 py-2 rounded-xl glass-subtle text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/10 transition-all cursor-pointer"
              >
                {lang === "ar" ? "إلغاء والاحتفاظ بتقدمي" : "Cancel & Keep Progress"}
              </button>

              <button
                type="button"
                disabled={resetting}
                onClick={handleConfirmReset}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white text-xs font-extrabold shadow-md shadow-rose-600/25 transition-all hover:scale-105 active:scale-95 cursor-pointer disabled:opacity-50"
              >
                <RotateCcw className={`h-3.5 w-3.5 ${resetting ? "animate-spin" : ""}`} />
                <span>{lang === "ar" ? "نعم، ابدأ من المستوى 1 🚀" : "Yes, Reset to Level 1 🚀"}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
