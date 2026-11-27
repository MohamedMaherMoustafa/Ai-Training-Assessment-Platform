import { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Sparkles,
  Zap,
  Volume2,
  VolumeX,
  RefreshCw,
  ShoppingBag,
  Brain,
  MessageSquare,
  X,
  Minimize2,
  Moon,
  ChevronRight,
  ChevronLeft,
} from "lucide-react";
import RobotMascotSvg from "./RobotMascotSvg";
import { useAuth } from "../../context/AuthContext";
import { useLang } from "../../context/LangContext";
import {
  getStudentCustomizationAndCoins,
  getStudentIQStats,
  listResults,
} from "../../services/platformService";
import { playCompanionChirpSound, playClickSound } from "../../utils/soundEffects";

// Rich educational study wisdom & psychological memory tips
const STUDY_TIPS = [
  {
    category: { ar: "تقنية بومودورو ⏱️", en: "Pomodoro Focus ⏱️" },
    text: {
      ar: "ذاكر لمدة 25 دقيقة بتركيز تام ثم خذ 5 دقائق استراحة، هذا يحافظ على يقظة دماغك بنسبة 40% إضافية!",
      en: "Study for 25 minutes with full focus then take a 5-minute break. This boosts neural retention by 40%!",
    },
  },
  {
    category: { ar: "تثبيت الذاكرة 🧠", en: "Active Recall 🧠" },
    text: {
      ar: "بعد قراءة أي فقرة في درسك، أغمض عينيك واشرحها لنفسك بصوت مسموع؛ الاسترجاع النشط يرسخ المعلومة في الذاكرة طويلة المدى.",
      en: "After reading a concept, close your eyes and explain it aloud. Active recall cements info into long-term memory.",
    },
  },
  {
    category: { ar: "الرموز والملاحظات ✍️", en: "Handwritten Notes ✍️" },
    text: {
      ar: "استخدم أداة القلم والتمييز داخل ملفات الـ PDF؛ التدوين التفاعلي يحفز المراكز الحركية والبصرية في الدماغ.",
      en: "Use the pen and highlighter tools on your Lesson PDFs; interactive annotation stimulates visual and motor memory.",
    },
  },
  {
    category: { ar: "عقلية المبرمج 💻", en: "Debugging Mindset 💻" },
    text: {
      ar: "الخطأ البرمجي ليس فشلاً بل لغز ينتظر حلك! قسّم المشكلة المعقدة إلى 3 أجزاء صغيرة وسيسهل حلها فوراً.",
      en: "A bug is not a failure—it is a puzzle waiting to be solved! Break complex problems into 3 tiny steps.",
    },
  },
  {
    category: { ar: "النوم والترسيخ 🌙", en: "Sleep & Synapses 🌙" },
    text: {
      ar: "مراجعة 10 دقائق قبل النوم تجعل عقلك يعيد ترتيب المعلومات وتثبيتها أثناء مرحلة النوم العميق تلقائياً.",
      en: "A 10-minute review before sleep prompts your brain to organize and consolidate neural links during deep sleep.",
    },
  },
  {
    category: { ar: "تقنية فاينمان 🗣️", en: "Feynman Technique 🗣️" },
    text: {
      ar: "أفضل طريقة للتأكد من فهمك لدرس معقد هي محاولة شرحه بكلمات بسيطة جداً كأنك تعلم طفلاً صغيراً.",
      en: "The best test of true understanding is explaining a complex concept in plain, simple terms to a beginner.",
    },
  },
  {
    category: { ar: "التكرار المتباعد 📅", en: "Spaced Repetition 📅" },
    text: {
      ar: "مراجعة المعلومة بعد يوم، ثم 3 أيام، ثم أسبوع تنقلها من الذاكرة اللحظية إلى الذاكرة الدائمة مدى الحياة.",
      en: "Reviewing material after 1 day, 3 days, and 1 week locks it from short-term to permanent lifetime recall.",
    },
  },
];

export default function AtharVirtualCompanion({ onOpenChatbot = () => {} }) {
  const { user } = useAuth();
  const { lang } = useLang();
  const navigate = useNavigate();

  const [minimized, setMinimized] = useState(() => {
    return sessionStorage.getItem("companion_minimized") === "true";
  });
  const [bubbleOpen, setBubbleOpen] = useState(false);
  const [tipIndex, setTipIndex] = useState(0);
  const [speaking, setSpeaking] = useState(false);

  // Companion visual customization from Student Store
  const [customization, setCustomization] = useState({
    skinId: "skin_classic_blue",
    hatId: "hat_none",
    glassesId: "glasses_none",
    shoesId: "shoes_none",
  });

  // Companion mood and energy
  const [companionMood, setCompanionMood] = useState("energized"); // 'sleeping' | 'celebrating' | 'energized'
  const [daysInactive, setDaysInactive] = useState(0);
  const [hasSolvedRecently, setHasSolvedRecently] = useState(false);

  // Load customization & listen for realtime updates
  useEffect(() => {
    let isMounted = true;
    if (user?.uid) {
      getStudentCustomizationAndCoins(user.uid)
        .then((res) => {
          if (!isMounted) return;
          if (res?.equipped) {
            setCustomization({
              skinId: res.equipped.botColor || "skin_classic_blue",
              hatId: res.equipped.botHat || "hat_none",
              glassesId: res.equipped.botGlasses || "glasses_none",
              shoesId: res.equipped.botShoes || "shoes_none",
            });
          }
        })
        .catch(() => {});
    }

    const handleCustomizationUpdate = (e) => {
      if (e.detail?.equipped) {
        setCustomization({
          skinId: e.detail.equipped.botColor || "skin_classic_blue",
          hatId: e.detail.equipped.botHat || "hat_none",
          glassesId: e.detail.equipped.botGlasses || "glasses_none",
          shoesId: e.detail.equipped.botShoes || "shoes_none",
        });
      }
    };

    window.addEventListener("athar_customization_updated", handleCustomizationUpdate);
    return () => {
      isMounted = false;
      window.removeEventListener("athar_customization_updated", handleCustomizationUpdate);
    };
  }, [user?.uid]);

  // Activity & Mood calculation
  useEffect(() => {
    let isMounted = true;

    async function evaluateActivity() {
      if (!user?.uid) return;
      try {
        const [iqStats, studentResults] = await Promise.all([
          getStudentIQStats(user.uid),
          listResults(),
        ]);

        if (!isMounted) return;

        const myResults = (studentResults || []).filter((r) => r.studentId === user.uid);
        const lastPlayedStr = iqStats?.lastPlayedDate;

        const now = new Date();
        const todayStr = now.toISOString().slice(0, 10);

        let latestActivityDate = null;
        if (lastPlayedStr) {
          latestActivityDate = new Date(lastPlayedStr);
        }
        if (myResults.length > 0) {
          const sorted = [...myResults].sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
          const latestResDate = new Date(sorted[0].timestamp || sorted[0].date || 0);
          if (!latestActivityDate || latestResDate > latestActivityDate) {
            latestActivityDate = latestResDate;
          }
        }

        let diffDays = 0;
        if (latestActivityDate && !isNaN(latestActivityDate.getTime())) {
          const diffMs = now.getTime() - latestActivityDate.getTime();
          diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        } else {
          diffDays = 3; // New student or inactive
        }

        setDaysInactive(diffDays);

        // Check if student completed an assignment or puzzle today
        const solvedToday = lastPlayedStr === todayStr || diffDays === 0;
        setHasSolvedRecently(solvedToday);

        if (diffDays >= 2) {
          // 2 or more days of absence -> Sleep Mode 💤
          setCompanionMood("sleeping");
        } else if (solvedToday) {
          // Solved lessons/puzzles today -> Celebrating Hero Mode 🎓
          setCompanionMood("celebrating");
        } else {
          // Normal active mode
          setCompanionMood("energized");
        }
      } catch (err) {
        console.error("AtharVirtualCompanion evaluation error:", err);
      }
    }

    evaluateActivity();
    return () => {
      isMounted = false;
    };
  }, [user?.uid]);

  // Text-To-Speech function
  const toggleTTS = (text) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;

    if (speaking) {
      window.speechSynthesis.cancel();
      setSpeaking(false);
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang === "ar" ? "ar-SA" : "en-US";
    utterance.rate = 1.0;
    utterance.pitch = 1.15; // Slightly cheerful, robotic pitch
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);
    setSpeaking(true);
    window.speechSynthesis.speak(utterance);
  };

  const handleMascotClick = () => {
    playCompanionChirpSound();
    if (!bubbleOpen) {
      setBubbleOpen(true);
    } else {
      setTipIndex((prev) => (prev + 1) % STUDY_TIPS.length);
    }
  };

  const handleNextTip = () => {
    playClickSound();
    setTipIndex((prev) => (prev + 1) % STUDY_TIPS.length);
  };

  const currentTip = STUDY_TIPS[tipIndex];
  const studentFirstName = user?.displayName?.split(" ")[0] || user?.username || "صديقي";

  // Effective Hat: In celebration mode, default to graduation cap if student didn't equip another hat
  const effectiveHatId =
    companionMood === "celebrating" && (!customization.hatId || customization.hatId === "hat_none")
      ? "hat_grad_cap"
      : customization.hatId || "hat_none";

  // Sign text on mascot
  const signText = useMemo(() => {
    if (companionMood === "sleeping") {
      return "ZZZ...";
    }
    if (companionMood === "celebrating") {
      return lang === "ar" ? "بطل 🎓" : "HERO 🎓";
    }
    return lang === "ar" ? "أثر 🤖" : "ATHAR 🤖";
  }, [companionMood, lang]);

  if (minimized) {
    return (
      <div className="select-none pb-1">
        <button
          type="button"
          onClick={() => {
            setMinimized(false);
            sessionStorage.removeItem("companion_minimized");
            playCompanionChirpSound();
          }}
          className="group flex items-center gap-2 px-3 py-1.5 rounded-full glass-panel border-teal-400/40 shadow-xl hover:scale-105 active:scale-95 transition-all cursor-pointer"
          title={lang === "ar" ? "إظهار رفيق أثر الذكي 🤖" : "Show Athar Virtual Companion 🤖"}
        >
          <span className="text-base animate-bounce">🤖</span>
          <span className="text-xs font-bold text-slate-800 dark:text-slate-100">
            {lang === "ar" ? "رفيق أثر" : "Athar Pet"}
          </span>
          {companionMood === "sleeping" && (
            <span className="text-xs text-amber-500 animate-pulse font-mono">💤</span>
          )}
          {companionMood === "celebrating" && (
            <span className="text-xs text-emerald-400 animate-bounce">🎓</span>
          )}
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center select-none pointer-events-auto">
      {/* Interactive Speech / Pet Bubble */}
      {bubbleOpen && (
        <div className="mb-2 w-[88vw] max-w-[320px] sm:max-w-[350px] rounded-3xl glass-panel border-teal-400/40 p-4 shadow-2xl relative animate-fadeIn transition-all">
          {/* Header Bar */}
          <div className="flex items-center justify-between pb-2 border-b border-slate-200/60 dark:border-white/10 mb-2.5">
            <div className="flex items-center gap-1.5 text-xs font-black text-teal-700 dark:text-teal-300">
              <Sparkles className="h-3.5 w-3.5 text-amber-400" />
              <span>{lang === "ar" ? "رفيق أثر الافتراضي 🤖" : "Athar Cyber Companion 🤖"}</span>
            </div>

            <div className="flex items-center gap-1">
              {/* TTS Listen Button */}
              <button
                type="button"
                onClick={() => {
                  const speechText = `${lang === "ar" ? currentTip.category.ar : currentTip.category.en}. ${
                    lang === "ar" ? currentTip.text.ar : currentTip.text.en
                  }`;
                  toggleTTS(speechText);
                }}
                className={`p-1 rounded-lg transition-colors cursor-pointer ${
                  speaking
                    ? "bg-teal-500 text-white animate-pulse"
                    : "text-slate-500 dark:text-slate-400 hover:text-teal-500"
                }`}
                title={lang === "ar" ? "استمع صوتياً" : "Listen via voice"}
              >
                {speaking ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
              </button>

              {/* Minimize */}
              <button
                type="button"
                onClick={() => {
                  setMinimized(true);
                  setBubbleOpen(false);
                  sessionStorage.setItem("companion_minimized", "true");
                }}
                className="p-1 rounded-lg text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors cursor-pointer"
                title={lang === "ar" ? "تصغير" : "Minimize"}
              >
                <Minimize2 className="h-3.5 w-3.5" />
              </button>

              {/* Close Bubble */}
              <button
                type="button"
                onClick={() => setBubbleOpen(false)}
                className="p-1 rounded-lg text-slate-500 dark:text-slate-400 hover:text-rose-500 transition-colors cursor-pointer"
                title={lang === "ar" ? "إغلاق" : "Close"}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* Special State Notice: Sleeping Mode Alert */}
          {companionMood === "sleeping" && (
            <div className="mb-2.5 p-2.5 rounded-2xl bg-amber-500/15 border border-amber-400/40 text-amber-900 dark:text-amber-200 text-xs space-y-1.5">
              <div className="flex items-center gap-1.5 font-bold">
                <Moon className="h-3.5 w-3.5 text-amber-400 animate-pulse" />
                <span>
                  {lang === "ar"
                    ? `أنا أشعر بالملل ونائم 💤.. مرّ ${daysInactive} أيام!`
                    : `I'm bored and sleeping 💤.. It's been ${daysInactive} days!`}
                </span>
              </div>
              <p className="text-[11px] leading-relaxed opacity-90">
                {lang === "ar"
                  ? "حل لغزاً سريعاً في مختبر الذكاء لتوقظني وتستعيد طاقتي وحماسي! ⚡"
                  : "Solve a quick brain teaser to wake me up and restore my energy! ⚡"}
              </p>
              <button
                type="button"
                onClick={() => {
                  setBubbleOpen(false);
                  navigate("/student/puzzles");
                }}
                className="w-full py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-extrabold text-[11px] shadow-md shadow-amber-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
              >
                {lang === "ar" ? "⚡ أيقظ الروبوت (حل لغز الآن)" : "⚡ Wake Me Up (Play Puzzle)"}
              </button>
            </div>
          )}

          {/* Special State Notice: Celebrating Hero Mode */}
          {companionMood === "celebrating" && (
            <div className="mb-2.5 p-2 rounded-2xl bg-emerald-500/15 border border-emerald-400/40 text-emerald-900 dark:text-emerald-200 text-xs flex items-center gap-2">
              <span className="text-base animate-bounce">🎓</span>
              <span className="font-extrabold text-[11px]">
                {lang === "ar"
                  ? `عاش يا ${studentFirstName}! مستوانا المعرفي يرتفع اليوم!`
                  : `Way to go ${studentFirstName}! We are leveling up today!`}
              </span>
            </div>
          )}

          {/* Dynamic Content: Study Tip */}
          <div className="space-y-1.5 min-h-[68px]">
            <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-teal-500/15 text-[10px] font-extrabold text-teal-700 dark:text-teal-300">
              <Brain className="h-2.5 w-2.5 text-teal-500" />
              <span>{lang === "ar" ? currentTip.category.ar : currentTip.category.en}</span>
            </div>
            <p className="text-xs font-bold text-slate-800 dark:text-slate-100 leading-relaxed">
              {lang === "ar" ? currentTip.text.ar : currentTip.text.en}
            </p>
          </div>

          {/* Action Dock Buttons */}
          <div className="mt-3 pt-2.5 border-t border-slate-200/60 dark:border-white/10 flex flex-wrap items-center justify-between gap-1.5">
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handleNextTip}
                className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-teal-500 text-white text-[10.5px] font-bold shadow-sm hover:bg-teal-600 transition-all cursor-pointer"
              >
                <RefreshCw className="h-3 w-3" />
                <span>{lang === "ar" ? "نصيحة أخرى" : "Next Tip"}</span>
              </button>
            </div>

            <div className="flex items-center gap-1">
              {/* Store outfit shortcut */}
              <button
                type="button"
                onClick={() => {
                  setBubbleOpen(false);
                  navigate("/student/store");
                }}
                title={lang === "ar" ? "تغيير ملابسي في المتجر" : "Change outfit in store"}
                className="p-1.5 rounded-xl glass-subtle hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 transition-all cursor-pointer"
              >
                <ShoppingBag className="h-3.5 w-3.5" />
              </button>

              {/* Open full Athar AI Chat */}
              <button
                type="button"
                onClick={() => {
                  setBubbleOpen(false);
                  onOpenChatbot();
                }}
                title={lang === "ar" ? "تحدث مع المساعد الذكي أثر AI" : "Chat with Athar AI"}
                className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-gradient-to-r from-teal-500 to-sky-600 text-white text-[10.5px] font-extrabold shadow-sm hover:scale-105 active:scale-95 transition-all cursor-pointer"
              >
                <MessageSquare className="h-3 w-3" />
                <span>{lang === "ar" ? "شات AI" : "AI Chat"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Robot Mascot Living Avatar Trigger */}
      <button
        type="button"
        onClick={handleMascotClick}
        className="group relative flex flex-col items-center pb-0 focus:outline-none cursor-pointer select-none transition-transform hover:scale-105 active:scale-95"
        title={
          lang === "ar"
            ? "انقر على رفيق أثر لسماع نصيحة أو التفاعل معه!"
            : "Click Athar Companion for tips and interaction!"
        }
        aria-label="Athar Virtual Companion"
      >
        {/* Floating Sleeping 'Zzz' or Energy Sparkle indicator */}
        {companionMood === "sleeping" && (
          <div className="absolute -top-3 -end-1 flex items-center gap-0.5 text-amber-400 font-mono text-xs font-black animate-bounce pointer-events-none drop-shadow-[0_2px_8px_rgba(251,191,36,0.8)]">
            <span>Z</span>
            <span className="text-[10px]">z</span>
            <span className="text-[8px]">z</span>
          </div>
        )}

        {companionMood === "celebrating" && (
          <div className="absolute -top-3 -end-1 text-sm animate-bounce pointer-events-none drop-shadow-[0_2px_8px_rgba(45,212,191,0.8)]">
            ⭐
          </div>
        )}

        <div
          className={`drop-shadow-[0_8px_18px_rgba(20,184,166,0.38)] -mb-2 transition-all duration-300 ${
            companionMood === "sleeping"
              ? "opacity-90 grayscale-[25%] animate-pulse"
              : companionMood === "celebrating"
              ? "animate-bounce"
              : ""
          }`}
        >
          <RobotMascotSvg
            skinId={customization.skinId}
            hatId={effectiveHatId}
            glassesId={customization.glassesId}
            shoesId={customization.shoesId}
            width={82}
            height={88}
            className="w-[74px] h-[80px] sm:w-[82px] sm:h-[88px] overflow-visible"
            signText={signText}
            isWaving={companionMood === "celebrating"}
            idPrefix="companion"
          />
        </div>

        {/* Name / Mood Badge Pill */}
        <div className="inline-flex items-center justify-center gap-1.5 px-3 py-0.5 rounded-full bg-white/90 dark:bg-[#0c1a26]/90 backdrop-blur-xl border border-slate-200/80 dark:border-teal-500/35 shadow-[0_8px_22px_rgba(0,0,0,0.35)] text-[10.5px] font-bold text-slate-900 dark:text-white">
          <span>{lang === "ar" ? "رفيق أثر" : "Athar Pet"}</span>
          {companionMood === "sleeping" && <span className="text-amber-500 text-[10px]">💤</span>}
          {companionMood === "celebrating" && <span className="text-emerald-400 text-[10px]">🎓</span>}
        </div>
      </button>
    </div>
  );
}
