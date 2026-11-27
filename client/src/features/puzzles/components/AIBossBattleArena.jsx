import { useState, useEffect, useRef } from "react";
import {
  Swords,
  Shield,
  Zap,
  RotateCcw,
  Trophy,
  Flame,
  Clock,
  Sparkles,
  Bot,
  ArrowLeft,
  ArrowRight,
  Heart,
  Skull,
  Coins,
  CheckCircle2,
  XCircle,
  HelpCircle,
} from "lucide-react";
import {
  playBattleAttackSound,
  playCriticalHitSound,
  playPlayerHurtSound,
  playBossDefeatSound,
  playClickSound,
  playCoinSound,
} from "../../../utils/soundEffects";

// Three Distinct Tiered AI Bosses
export const AI_BOSSES = [
  {
    id: "glitch_bot",
    tier: 1,
    name: { en: "Glitch Bot 🤖", ar: "روبوت العطل البرمجي 🤖" },
    title: { en: "Bug Generator & Logic Trainee", ar: "مولد الأخطاء ومتدرب المنطق" },
    maxHp: 100,
    timeLimit: 18,
    attackPower: 25,
    rewardCoins: 35,
    rewardXp: 25,
    avatarBg: "from-amber-500/20 via-orange-500/20 to-red-500/20 border-amber-500/40",
    glowColor: "rgba(245, 158, 11, 0.4)",
    themeGradient: "from-amber-400 to-orange-500",
    description: {
      en: "An uncalibrated prototype robot that throws logic puzzles and syntax riddles!",
      ar: "نموذج أولي غير معاير يهاجم بألغاز المنطق والمفارقات البرمجية السريعة!",
    },
  },
  {
    id: "cyber_sage",
    tier: 2,
    name: { en: "Cyber Sage 🔮", ar: "حكيم السايبر 🔮" },
    title: { en: "Algorithmic Guardian", ar: "حارس الخوارزميات والأنماط" },
    maxHp: 150,
    timeLimit: 14,
    attackPower: 30,
    rewardCoins: 75,
    rewardXp: 50,
    avatarBg: "from-indigo-500/20 via-purple-500/20 to-pink-500/20 border-indigo-500/40",
    glowColor: "rgba(99, 102, 241, 0.4)",
    themeGradient: "from-indigo-400 to-purple-500",
    description: {
      en: "A deep-thinking algorithmic model specializing in data patterns and math deduction.",
      ar: "نموذج ذكاء اصطناعي متعمق متخصص في استنتاج الأنماط الرياضية وحل المشكلات المعقدة.",
    },
  },
  {
    id: "quantum_overlord",
    tier: 3,
    name: { en: "Quantum Overlord 👑", ar: "إمبراطور الكوانتم 👑" },
    title: { en: "Neural Grandmaster Boss", ar: "الزعيم الخارق للشبكات العصبية" },
    maxHp: 200,
    timeLimit: 10,
    attackPower: 40,
    rewardCoins: 150,
    rewardXp: 100,
    avatarBg: "from-rose-500/20 via-purple-500/20 to-cyan-500/20 border-rose-500/40",
    glowColor: "rgba(244, 63, 94, 0.5)",
    themeGradient: "from-rose-500 via-purple-500 to-cyan-400",
    description: {
      en: "The ultimate platform AI titan! Unforgiving time limit, lightning-fast calculations.",
      ar: "الزعيم الأكبر للمنصة! وقت استجابة خاطف وألغاز فائقة الدقة تختبر قمة تركيزك الذهني.",
    },
  },
];

// Rich Multi-Disciplinary Battle Question Bank
const BATTLE_QUESTIONS = [
  {
    id: "bq_1",
    tier: 1,
    category: { en: "Math Logic", ar: "المنطق الرياضي" },
    prompt: {
      en: "What number logically completes the sequence: 3, 7, 15, 31, __?",
      ar: "ما الرقم الذي يكمل المتتالية المنطقية: 3، 7، 15، 31، __؟",
    },
    options: [
      { id: "a", text: "63", isCorrect: true },
      { id: "b", text: "62", isCorrect: false },
      { id: "c", text: "47", isCorrect: false },
      { id: "d", text: "64", isCorrect: false },
    ],
    hint: {
      en: "Each term is multiplied by 2 and then add 1: (31 * 2) + 1 = 63.",
      ar: "كل حد يضرب في 2 ويضاف إليه 1: (31 * 2) + 1 = 63.",
    },
  },
  {
    id: "bq_2",
    tier: 1,
    category: { en: "Binary & Tech", ar: "الأنظمة الثنائية" },
    prompt: {
      en: "What is the decimal equivalent of binary '1011'?",
      ar: "ما هو المكافئ العشري للرقم الثنائي '1011'؟",
    },
    options: [
      { id: "a", text: "11", isCorrect: true },
      { id: "b", text: "13", isCorrect: false },
      { id: "c", text: "9", isCorrect: false },
      { id: "d", text: "15", isCorrect: false },
    ],
    hint: {
      en: "8 + 0 + 2 + 1 = 11.",
      ar: "8 + 0 + 2 + 1 = 11.",
    },
  },
  {
    id: "bq_3",
    tier: 1,
    category: { en: "Deductive Reasoning", ar: "الاستنتاج المنطقي" },
    prompt: {
      en: "If all Zips are Zaps, and some Zaps are Zops, are all Zips definitely Zops?",
      ar: "إذا كانت كل 'أ' تنتمي إلى 'ب'، وبعض 'ب' ينتمي إلى 'ج'، فهل بالضرورة كل 'أ' ينتمي إلى 'ج'؟",
    },
    options: [
      { id: "a", text: { en: "No, not necessarily", ar: "لا، ليس بالضرورة" }, isCorrect: true },
      { id: "b", text: { en: "Yes, definitely", ar: "نعم، بالتأكيد" }, isCorrect: false },
      { id: "c", text: { en: "Only if Zips are empty", ar: "فقط إذا كانت المجموعة فارغة" }, isCorrect: false },
      { id: "d", text: { en: "Impossible to know", ar: "مستحيل المعرفة" }, isCorrect: false },
    ],
    hint: {
      en: "The subset intersection does not guarantee overlap with Zips.",
      ar: "تقاطع المجموعات الجزئية لا يضمن شمول المجموعة الأولى.",
    },
  },
  {
    id: "bq_4",
    tier: 2,
    category: { en: "Algorithms & Big-O", ar: "الخوارزميات والكفاءة" },
    prompt: {
      en: "What is the average time complexity of searching a sorted array of N elements using Binary Search?",
      ar: "ما هو التعقيد الزمني المتوسط للبحث في مصفوفة مرتبة باستخدام البحث الثنائي (Binary Search)؟",
    },
    options: [
      { id: "a", text: "O(log N)", isCorrect: true },
      { id: "b", text: "O(N)", isCorrect: false },
      { id: "c", text: "O(1)", isCorrect: false },
      { id: "d", text: "O(N log N)", isCorrect: false },
    ],
    hint: {
      en: "The search space is halved in each step: log2(N).",
      ar: "يتم تقليص نطاق البحث إلى النصف في كل خطوة: log2(N).",
    },
  },
  {
    id: "bq_5",
    tier: 2,
    category: { en: "Pattern Logic", ar: "استنتاج الأنماط" },
    prompt: {
      en: "If CLOCK is coded as 3-12-15-3-11, how is SMART coded?",
      ar: "إذا تم تشفير كلمة CLOCK بالأرقام 3-12-15-3-11، فكيف تشفر SMART؟",
    },
    options: [
      { id: "a", text: "19-13-1-18-20", isCorrect: true },
      { id: "b", text: "19-12-1-17-20", isCorrect: false },
      { id: "c", text: "18-13-1-18-19", isCorrect: false },
      { id: "d", text: "20-14-2-19-21", isCorrect: false },
    ],
    hint: {
      en: "S=19, M=13, A=1, R=18, T=20 based on alphabet indices.",
      ar: "ترتيب الحروف في الأبجدية الإنجليزية: S=19, M=13, A=1, R=18, T=20.",
    },
  },
  {
    id: "bq_6",
    tier: 2,
    category: { en: "Boolean Logic", ar: "الجبر البوليني" },
    prompt: {
      en: "In Boolean algebra, what is NOT (A AND B) equivalent to?",
      ar: "في الجبر المنطقي البوليني (De Morgan's Laws)، ما المكافئ لـ NOT (A AND B)؟",
    },
    options: [
      { id: "a", text: "(NOT A) OR (NOT B)", isCorrect: true },
      { id: "b", text: "(NOT A) AND (NOT B)", isCorrect: false },
      { id: "c", text: "A OR B", isCorrect: false },
      { id: "d", text: "NOT A", isCorrect: false },
    ],
    hint: {
      en: "De Morgan's law: negation flips AND to OR.",
      ar: "قانون دي مورغان: نفي العطف يتحول إلى فصل منفيين.",
    },
  },
  {
    id: "bq_7",
    tier: 3,
    category: { en: "Quantum & AI", ar: "الذكاء الاصطناعي والكوانتم" },
    prompt: {
      en: "What activation function maps real values strictly into the probability range (0, 1)?",
      ar: "أي من دوال التنشيط التالية تقوم بتحويل القيم المدخلة بدقة إلى نطاق الاحتمالات بين (0 و 1)؟",
    },
    options: [
      { id: "a", text: "Sigmoid", isCorrect: true },
      { id: "b", text: "ReLU", isCorrect: false },
      { id: "c", text: "Tanh", isCorrect: false },
      { id: "d", text: "Leaky ReLU", isCorrect: false },
    ],
    hint: {
      en: "Sigmoid formula: 1 / (1 + e^-z).",
      ar: "دالة السيجمويد: 1 / (1 + e^-z).",
    },
  },
  {
    id: "bq_8",
    tier: 3,
    category: { en: "Advanced Math", ar: "الرياضيات المتقدمة" },
    prompt: {
      en: "A server cluster has 6 nodes. How many unique direct connections are needed for a full mesh topology?",
      ar: "مجموعة خوادم تتكون من 6 أجهزة، كم عدد الوصلات المباشرة المطلوبة لتوصيل شبكة كاملة (Full Mesh)؟",
    },
    options: [
      { id: "a", text: "15", isCorrect: true },
      { id: "b", text: "30", isCorrect: false },
      { id: "c", text: "12", isCorrect: false },
      { id: "d", text: "36", isCorrect: false },
    ],
    hint: {
      en: "Formula is N * (N - 1) / 2 = 6 * 5 / 2 = 15.",
      ar: "القانون: N * (N - 1) / 2 = 6 * 5 / 2 = 15 وصلة.",
    },
  },
];

export default function AIBossBattleArena({
  user,
  lang,
  onBattleVictory,
  onBackToMap,
}) {
  const [selectedBoss, setSelectedBoss] = useState(null);
  const [inBattle, setInBattle] = useState(false);

  // Battle State
  const [playerHp, setPlayerHp] = useState(100);
  const [bossHp, setBossHp] = useState(100);
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(15);
  const [combo, setCombo] = useState(0);
  const [battleLog, setBattleLog] = useState([]);
  const [floatText, setFloatText] = useState(null);
  const [battleOutcome, setBattleOutcome] = useState(null); // 'victory' | 'defeat'
  const [selectedOptionId, setSelectedOptionId] = useState(null);
  const [isProcessingTurn, setIsProcessingTurn] = useState(false);

  const timerRef = useRef(null);

  // Filter questions for active boss tier
  const questionsForBoss = selectedBoss
    ? BATTLE_QUESTIONS.filter((q) => q.tier <= selectedBoss.tier)
    : [];

  const currentQuestion = questionsForBoss[currentQIndex % questionsForBoss.length];

  // Start selected battle
  const startBattle = (boss) => {
    setSelectedBoss(boss);
    setPlayerHp(100);
    setBossHp(boss.maxHp);
    setCurrentQIndex(0);
    setTimeLeft(boss.timeLimit);
    setCombo(0);
    setBattleLog([
      lang === "ar"
        ? `بدأت المواجهة ضد ${boss.name.ar}! استعد للقتال!`
        : `Encounter initiated against ${boss.name.en}! Prepare for combat!`,
    ]);
    setBattleOutcome(null);
    setInBattle(true);
    setIsProcessingTurn(false);
    setSelectedOptionId(null);
    playClickSound();
  };

  // Timer loop during battle
  useEffect(() => {
    if (!inBattle || battleOutcome || isProcessingTurn) return;

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          handleTimeOut();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timerRef.current);
  }, [inBattle, battleOutcome, isProcessingTurn, currentQIndex]);

  // Handle timeout (Boss hits player)
  const handleTimeOut = () => {
    if (isProcessingTurn || battleOutcome) return;
    setIsProcessingTurn(true);
    playPlayerHurtSound();

    const damage = selectedBoss.attackPower;
    triggerFloatingText(`⏰ TIMEOUT! -${damage} HP`, "text-rose-400");

    setPlayerHp((prev) => {
      const nextHp = Math.max(0, prev - damage);
      if (nextHp <= 0) {
        setBattleOutcome("defeat");
      }
      return nextHp;
    });

    setCombo(0);
    setBattleLog((prev) => [
      lang === "ar"
        ? `نفد الوقت! شن ${selectedBoss.name.ar} هجوماً مضاداً ألحق بك ${damage} نقطة ضرر!`
        : `Time ran out! ${selectedBoss.name.en} executed an attack dealing ${damage} damage!`,
      ...prev.slice(0, 4),
    ]);

    setTimeout(() => {
      advanceTurn();
    }, 1200);
  };

  // Handle player answer choice
  const handleAnswerSelect = (option) => {
    if (isProcessingTurn || battleOutcome) return;
    setIsProcessingTurn(true);
    setSelectedOptionId(option.id);

    const isCorrect = option.isCorrect;
    const isCritical = isCorrect && timeLeft >= selectedBoss.timeLimit - 4; // answered in first 4s

    if (isCorrect) {
      const baseDamage = isCritical ? 45 : 25;
      const comboBonus = combo * 5;
      const totalDamage = baseDamage + comboBonus;

      if (isCritical) {
        playCriticalHitSound();
        triggerFloatingText(`⚡ CRITICAL HIT! -${totalDamage} HP`, "text-amber-300");
      } else {
        playBattleAttackSound();
        triggerFloatingText(`💥 STRIKE! -${totalDamage} HP`, "text-teal-300");
      }

      setBossHp((prev) => {
        const nextHp = Math.max(0, prev - totalDamage);
        if (nextHp <= 0) {
          playBossDefeatSound();
          playCoinSound();
          setBattleOutcome("victory");
          if (onBattleVictory) {
            onBattleVictory(selectedBoss.rewardCoins, selectedBoss.rewardXp, selectedBoss.id);
          }
        }
        return nextHp;
      });

      setCombo((c) => c + 1);
      setBattleLog((prev) => [
        lang === "ar"
          ? `إجابة صحيحة ${isCritical ? "⚡ خارقة!" : "متقنة!"} ألحقت بالزعيم ${totalDamage} نقطة ضرر!`
          : `Accurate answer ${isCritical ? "⚡ CRITICAL!" : "hit!"} Dealt ${totalDamage} damage to the Boss!`,
        ...prev.slice(0, 4),
      ]);
    } else {
      playPlayerHurtSound();
      const bossDamage = selectedBoss.attackPower;
      triggerFloatingText(`❌ MISSED! -${bossDamage} HP`, "text-rose-400");

      setPlayerHp((prev) => {
        const nextHp = Math.max(0, prev - bossDamage);
        if (nextHp <= 0) {
          setBattleOutcome("defeat");
        }
        return nextHp;
      });

      setCombo(0);
      setBattleLog((prev) => [
        lang === "ar"
          ? `إجابة غير دقيقة! تصدى ${selectedBoss.name.ar} وضربك بـ ${bossDamage} نقطة ضرر!`
          : `Incorrect choice! ${selectedBoss.name.en} countered dealing ${bossDamage} damage!`,
        ...prev.slice(0, 4),
      ]);
    }

    setTimeout(() => {
      advanceTurn();
    }, 1200);
  };

  const advanceTurn = () => {
    setSelectedOptionId(null);
    setIsProcessingTurn(false);
    setTimeLeft(selectedBoss.timeLimit);
    setCurrentQIndex((prev) => prev + 1);
  };

  const triggerFloatingText = (text, colorClass) => {
    setFloatText({ text, colorClass });
    setTimeout(() => setFloatText(null), 1200);
  };

  // -------------------------------------------------------------
  // VIEW 1: Boss Selection Arena Lobby
  // -------------------------------------------------------------
  if (!inBattle) {
    return (
      <div className="space-y-6 animate-fadeIn">
        {/* Arena Header */}
        <div className="relative overflow-hidden rounded-[26px] p-6 sm:p-7 glass-panel border-rose-500/30 shadow-2xl bg-gradient-to-r from-rose-950/20 via-purple-950/20 to-slate-950/40">
          <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1.5 max-w-xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/15 border border-rose-400/30 text-rose-300 text-xs font-bold">
                <Swords className="h-3.5 w-3.5 text-rose-400" />
                <span>{lang === "ar" ? "حلبة مواجهة زعماء الذكاء الاصطناعي" : "AI Boss Battle Arena"}</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                {lang === "ar"
                  ? "تحدَّ روبوتات المنصة في مبارزات حية واكسب العملات والرتب!"
                  : "Challenge Platform AI Bots in Real-Time Timed Duels!"}
              </h2>
              <p className="text-xs sm:text-sm text-slate-300/85 leading-relaxed">
                {lang === "ar"
                  ? "أجب بسرعة وبدقة لتوجيه ضربات قاضية للزعيم قبل نفاد طاقتك. كل انتصار يمنحك عملات متجر أثر ونقاط تصنيف ترفع ترتيبك في الـ Scoreboard!"
                  : "Answer rapidly and accurately to deal critical strikes before your HP runs out. Victories award Athar coins and high leaderboard rank XP!"}
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={onBackToMap}
                className="glass-btn-secondary px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2"
              >
                {lang === "ar" ? <ArrowRight className="h-4 w-4" /> : <ArrowLeft className="h-4 w-4" />}
                <span>{lang === "ar" ? "العودة لخريطة الألغاز" : "Back to Puzzle Map"}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Boss Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {AI_BOSSES.map((boss) => (
            <div
              key={boss.id}
              className={`relative rounded-[24px] overflow-hidden border p-5 flex flex-col justify-between transition-all duration-300 hover:-translate-y-1 group bg-slate-900/40 backdrop-blur-xl shadow-xl ${
                boss.tier === 1
                  ? "border-amber-500/40 hover:border-amber-400"
                  : boss.tier === 2
                  ? "border-indigo-500/40 hover:border-indigo-400"
                  : "border-rose-500/50 hover:border-rose-400"
              }`}
            >
              <div className="space-y-4">
                {/* Boss Badge & Tier */}
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black bg-white/10 border border-white/20 text-slate-200">
                    Tier {boss.tier}
                  </span>
                  <div className="flex items-center gap-1.5 text-xs font-bold text-amber-300">
                    <Coins className="h-4 w-4 fill-amber-400" />
                    <span>+{boss.rewardCoins} Coins</span>
                  </div>
                </div>

                {/* Boss Visual Avatar Circle */}
                <div className="flex flex-col items-center justify-center pt-2">
                  <div
                    className={`h-24 w-24 rounded-full flex items-center justify-center text-4xl shadow-2xl border-2 transition-transform duration-500 group-hover:scale-110 bg-gradient-to-tr ${boss.avatarBg}`}
                    style={{ boxShadow: `0 0 35px ${boss.glowColor}` }}
                  >
                    <Bot className="h-12 w-12 text-white drop-shadow-md" />
                  </div>
                  <h3 className="text-base font-black text-white mt-3 text-center">
                    {lang === "ar" ? boss.name.ar : boss.name.en}
                  </h3>
                  <span className="text-[11px] font-bold text-slate-400 text-center">
                    {lang === "ar" ? boss.title.ar : boss.title.en}
                  </span>
                </div>

                <p className="text-xs text-slate-300/80 leading-relaxed text-center px-1 min-h-[48px]">
                  {lang === "ar" ? boss.description.ar : boss.description.en}
                </p>

                {/* Boss Combat Stats */}
                <div className="grid grid-cols-3 gap-2 py-2 px-3 rounded-xl bg-white/[0.04] border border-white/10 text-center text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 block font-semibold">Max HP</span>
                    <span className="font-extrabold text-emerald-400">{boss.maxHp}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block font-semibold">Timer</span>
                    <span className="font-extrabold text-amber-300">{boss.timeLimit}s</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block font-semibold">Rank XP</span>
                    <span className="font-extrabold text-sky-400">+{boss.rewardXp}</span>
                  </div>
                </div>
              </div>

              {/* Start Duel Button */}
              <button
                type="button"
                onClick={() => startBattle(boss)}
                className={`mt-4 w-full py-2.5 px-4 rounded-xl font-black text-xs text-white flex items-center justify-center gap-2 shadow-lg transition-all active:scale-95 cursor-pointer bg-gradient-to-r ${boss.themeGradient}`}
              >
                <Swords className="h-4 w-4" />
                <span>{lang === "ar" ? "بدء المبارزة الآن" : "Enter Boss Duel"}</span>
              </button>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // VIEW 2: Active Combat Arena Stage
  // -------------------------------------------------------------
  return (
    <div className="space-y-5 animate-fadeIn max-w-4xl mx-auto">
      {/* Top Arena Control Bar */}
      <div className="flex items-center justify-between gap-3 p-3.5 rounded-2xl glass-panel border-white/20">
        <button
          type="button"
          onClick={() => setInBattle(false)}
          className="glass-btn-secondary px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5"
        >
          {lang === "ar" ? <ArrowRight className="h-3.5 w-3.5" /> : <ArrowLeft className="h-3.5 w-3.5" />}
          <span>{lang === "ar" ? "انسحاب" : "Forfeit Duel"}</span>
        </button>

        <div className="flex items-center gap-2">
          <span className="px-3 py-1 rounded-full text-xs font-black bg-rose-500/20 text-rose-300 border border-rose-500/30">
            {lang === "ar" ? `مواجهة: ${selectedBoss.name.ar}` : `Dueling: ${selectedBoss.name.en}`}
          </span>
          {combo > 1 && (
            <span className="px-2.5 py-1 rounded-full text-xs font-black bg-amber-500 text-slate-950 animate-bounce">
              🔥 {combo}x COMBO!
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5 text-xs font-bold text-amber-300">
          <Coins className="h-4 w-4 fill-amber-400" />
          <span>{selectedBoss.rewardCoins} Coins at Stake</span>
        </div>
      </div>

      {/* Duel Health & Avatar Stage */}
      <div className="relative rounded-[28px] overflow-hidden border border-white/15 bg-slate-950/70 backdrop-blur-2xl p-5 sm:p-6 shadow-2xl">
        {/* Floating Combat Text Notice */}
        {floatText && (
          <div
            className={`absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-30 font-black text-2xl sm:text-3xl px-4 py-2 rounded-2xl bg-black/80 border border-white/20 shadow-2xl animate-bounce ${floatText.colorClass}`}
          >
            {floatText.text}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 items-center gap-6">
          {/* PLAYER HUD */}
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-2xl bg-gradient-to-tr from-sky-400 to-teal-500 flex items-center justify-center text-white font-black text-lg shadow-md">
                {user?.displayName ? user.displayName.slice(0, 2).toUpperCase() : "ME"}
              </div>
              <div className="min-w-0">
                <span className="text-xs font-extrabold text-white truncate block">
                  {user?.displayName || "Champion"}
                </span>
                <span className="text-[10.5px] text-teal-300 font-bold flex items-center gap-1">
                  <Shield className="h-3 w-3" /> Player Combatant
                </span>
              </div>
            </div>

            {/* Player HP Bar */}
            <div>
              <div className="flex justify-between text-xs font-bold mb-1">
                <span className="text-slate-400 flex items-center gap-1">
                  <Heart className="h-3.5 w-3.5 text-rose-400 fill-rose-400" /> HP
                </span>
                <span className={playerHp < 35 ? "text-rose-400 animate-pulse font-black" : "text-emerald-400 font-black"}>
                  {playerHp} / 100
                </span>
              </div>
              <div className="h-3 rounded-full bg-slate-800 overflow-hidden border border-white/10">
                <div
                  className={`h-full transition-all duration-300 rounded-full ${
                    playerHp < 35
                      ? "bg-rose-500 animate-pulse"
                      : "bg-gradient-to-r from-emerald-500 to-teal-400"
                  }`}
                  style={{ width: `${playerHp}%` }}
                />
              </div>
            </div>
          </div>

          {/* CENTER TIMER & VS */}
          <div className="flex flex-col items-center justify-center space-y-1">
            <div className="relative h-18 w-18 flex items-center justify-center">
              <svg className="h-full w-full transform -rotate-90" viewBox="0 0 36 36">
                <path
                  className="text-slate-800"
                  strokeWidth="3.5"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                <path
                  className={timeLeft <= 4 ? "text-rose-500" : timeLeft <= 8 ? "text-amber-400" : "text-teal-400"}
                  strokeDasharray={`${(timeLeft / selectedBoss.timeLimit) * 100}, 100`}
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
              </svg>
              <div className="absolute flex flex-col items-center justify-center">
                <span className={`text-xl font-black ${timeLeft <= 4 ? "text-rose-400 animate-ping" : "text-white"}`}>
                  {timeLeft}
                </span>
              </div>
            </div>
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
              {lang === "ar" ? "ثوانٍ متبقية" : "Seconds Left"}
            </span>
          </div>

          {/* BOSS HUD */}
          <div className="space-y-2 text-end">
            <div className="flex items-center gap-3 justify-end">
              <div className="min-w-0">
                <span className="text-xs font-extrabold text-white truncate block">
                  {lang === "ar" ? selectedBoss.name.ar : selectedBoss.name.en}
                </span>
                <span className="text-[10.5px] text-amber-300 font-bold flex items-center gap-1 justify-end">
                  <Bot className="h-3 w-3" /> AI Boss
                </span>
              </div>
              <div
                className={`h-12 w-12 rounded-2xl flex items-center justify-center text-white font-black text-xl shadow-md bg-gradient-to-tr ${selectedBoss.avatarBg}`}
              >
                <Bot className="h-6 w-6" />
              </div>
            </div>

            {/* Boss HP Bar */}
            <div>
              <div className="flex justify-between text-xs font-bold mb-1">
                <span className="text-rose-400 font-black">
                  {bossHp} / {selectedBoss.maxHp}
                </span>
                <span className="text-slate-400 flex items-center gap-1">
                  HP <Skull className="h-3.5 w-3.5 text-rose-500 fill-rose-500" />
                </span>
              </div>
              <div className="h-3 rounded-full bg-slate-800 overflow-hidden border border-white/10">
                <div
                  className="h-full bg-gradient-to-r from-red-600 via-rose-500 to-amber-500 rounded-full transition-all duration-300"
                  style={{ width: `${(bossHp / selectedBoss.maxHp) * 100}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Question Stage */}
        {!battleOutcome && currentQuestion && (
          <div className="mt-6 pt-5 border-t border-white/10 space-y-4">
            <div className="flex items-center justify-between text-xs">
              <span className="px-2.5 py-0.5 rounded-full bg-sky-500/20 text-sky-300 font-bold border border-sky-500/30">
                {lang === "ar" ? currentQuestion.category.ar : currentQuestion.category.en}
              </span>
              <span className="text-slate-400 font-medium text-[11px]">
                {lang === "ar" ? "أجب بأسرع ما يمكن لتنفيذ ضربة خارقة!" : "Answer quickly to trigger a Critical Hit!"}
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-white/[0.04] border border-white/10 text-white font-bold text-sm sm:text-base leading-relaxed text-center">
              {lang === "ar" ? currentQuestion.prompt.ar : currentQuestion.prompt.en}
            </div>

            {/* 4 Interactive Answer Choices */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {currentQuestion.options.map((opt) => {
                const isSelected = selectedOptionId === opt.id;
                let btnStyle = "bg-white/[0.06] hover:bg-white/[0.12] border-white/15 text-white";

                if (isSelected) {
                  btnStyle = opt.isCorrect
                    ? "bg-emerald-500/30 border-emerald-400 text-emerald-200"
                    : "bg-rose-500/30 border-rose-400 text-rose-200";
                }

                const optLabel = typeof opt.text === "object"
                  ? (lang === "ar" ? opt.text.ar : opt.text.en)
                  : opt.text;

                return (
                  <button
                    key={opt.id}
                    type="button"
                    disabled={isProcessingTurn}
                    onClick={() => handleAnswerSelect(opt)}
                    className={`p-3.5 rounded-xl border text-xs sm:text-sm font-bold flex items-center justify-between transition-all active:scale-98 cursor-pointer disabled:opacity-75 ${btnStyle}`}
                  >
                    <span>{optLabel}</span>
                    {isSelected && (
                      opt.isCorrect ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                      ) : (
                        <XCircle className="h-4 w-4 text-rose-400" />
                      )
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Live Combat Feed / Log */}
        <div className="mt-5 pt-3 border-t border-white/10 text-[11px] font-mono text-slate-400 space-y-1">
          {battleLog.map((log, idx) => (
            <div key={idx} className="truncate">
              ⚡ {log}
            </div>
          ))}
        </div>
      </div>

      {/* BATTLE OUTCOME MODAL (VICTORY / DEFEAT) */}
      {battleOutcome && (
        <div className="p-6 rounded-[28px] glass-panel border border-white/20 shadow-2xl text-center space-y-4 animate-fadeIn">
          {battleOutcome === "victory" ? (
            <>
              <div className="h-20 w-20 mx-auto rounded-full bg-gradient-to-tr from-amber-400 to-yellow-500 flex items-center justify-center text-white shadow-2xl shadow-amber-500/40 animate-bounce">
                <Trophy className="h-10 w-10 fill-current" />
              </div>
              <h3 className="text-2xl font-black text-white">
                {lang === "ar" ? "🏆 انتصار ساحق على الزعيم!" : "🏆 Epic Boss Defeated!"}
              </h3>
              <p className="text-xs sm:text-sm text-slate-300 max-w-md mx-auto leading-relaxed">
                {lang === "ar"
                  ? `أثبتّ براعتك الذهنية وتغلبت على ${selectedBoss.name.ar}! تمت إضافة العملات ونقاط الترتيب إلى محفظتك بنجاح!`
                  : `You outsmarted ${selectedBoss.name.en}! Rewards have been accredited to your wallet & IQ rank!`}
              </p>
              <div className="inline-flex items-center gap-4 p-3 rounded-2xl bg-amber-500/15 border border-amber-400/30 text-amber-300 font-extrabold text-sm">
                <div className="flex items-center gap-1.5">
                  <Coins className="h-4 w-4 fill-amber-400" />
                  <span>+{selectedBoss.rewardCoins} Coins</span>
                </div>
                <span>•</span>
                <div className="flex items-center gap-1.5 text-sky-300">
                  <Sparkles className="h-4 w-4" />
                  <span>+{selectedBoss.rewardXp} Rank XP</span>
                </div>
              </div>
              <div className="flex items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setInBattle(false)}
                  className="glass-btn-primary px-6 py-2.5 rounded-xl font-bold text-xs"
                >
                  {lang === "ar" ? "العودة لحلبة الزعماء" : "Back to Boss Lobby"}
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="h-20 w-20 mx-auto rounded-full bg-gradient-to-tr from-rose-500 to-red-600 flex items-center justify-center text-white shadow-2xl shadow-rose-500/40">
                <Skull className="h-10 w-10" />
              </div>
              <h3 className="text-2xl font-black text-rose-400">
                {lang === "ar" ? "تغلّب الزعيم في هذه الجولة!" : "Defeated in Combat!"}
              </h3>
              <p className="text-xs sm:text-sm text-slate-300 max-w-md mx-auto leading-relaxed">
                {lang === "ar"
                  ? `كانت المعركة قوية! أعد شحن تركيزك الذهني وتدرّب على الأنماط السريعة لتثأر في الجولة القادمة.`
                  : `${selectedBoss.name.en} proved challenging! Recalibrate your speed and logic strategy for a rematch!`}
              </p>
              <div className="flex items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => startBattle(selectedBoss)}
                  className="glass-btn-primary px-6 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2"
                >
                  <RotateCcw className="h-4 w-4" />
                  <span>{lang === "ar" ? "إعادة المبارزة فوراً" : "Rematch Now"}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setInBattle(false)}
                  className="glass-btn-secondary px-5 py-2.5 rounded-xl font-bold text-xs"
                >
                  {lang === "ar" ? "تغيير الزعيم" : "Change Boss"}
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
