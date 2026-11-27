import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Swords,
  Users,
  Bot,
  Zap,
  Plus,
  Play,
  RotateCcw,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  KeyRound,
  Shield,
  Trophy,
} from "lucide-react";
import toast from "react-hot-toast";
import { useAuth } from "../../context/AuthContext";
import { useLang } from "../../context/LangContext";
import {
  createQuizDuel,
  createBotDuel,
  joinQuizDuel,
  subscribeOpenDuels,
} from "../../services/liveQuizDuelService";
import LiveQuizDuelArena from "./LiveQuizDuelArena";
import { playClickSound } from "../../utils/soundEffects";

export default function LiveQuizDuelModule({ activeInstructorId = null }) {
  const { user } = useAuth();
  const { lang } = useLang();
  const [searchParams, setSearchParams] = useSearchParams();

  const [activeDuelId, setActiveDuelId] = useState(() => searchParams.get("room") || null);
  const [joinCodeInput, setJoinCodeInput] = useState("");
  const [openDuels, setOpenDuels] = useState([]);
  const [busy, setBusy] = useState(false);

  // Subscribe to public open waiting duels
  useEffect(() => {
    const unsub = subscribeOpenDuels((list) => {
      setOpenDuels(list);
    });
    return () => unsub();
  }, []);

  // Sync with searchParams
  useEffect(() => {
    const roomParam = searchParams.get("room");
    if (roomParam && roomParam !== activeDuelId) {
      setActiveDuelId(roomParam);
    }
  }, [searchParams, activeDuelId]);

  const handleCreateDuel = async () => {
    if (!user) return;
    setBusy(true);
    playClickSound();
    try {
      const roomCode = await createQuizDuel({ hostUser: user });
      setActiveDuelId(roomCode);
      setSearchParams({ room: roomCode });
      toast.success(lang === "ar" ? `تم إنشاء الغرفة: ${roomCode}` : `Duel Room created: ${roomCode}`);
    } catch (err) {
      toast.error(err.message || "Failed to create duel");
    } finally {
      setBusy(false);
    }
  };

  const handleCreateBotDuel = async () => {
    if (!user) return;
    setBusy(true);
    playClickSound();
    try {
      const roomCode = await createBotDuel({ hostUser: user });
      setActiveDuelId(roomCode);
      setSearchParams({ room: roomCode });
    } catch (err) {
      toast.error(err.message || "Failed to start bot duel");
    } finally {
      setBusy(false);
    }
  };

  const handleJoinWithCode = async (codeToJoin = null) => {
    const code = (codeToJoin || joinCodeInput).trim().toUpperCase();
    if (!code) {
      toast.error(lang === "ar" ? "يرجى كتابة كود الغرفة" : "Please enter room code");
      return;
    }
    setBusy(true);
    playClickSound();
    try {
      await joinQuizDuel({ duelId: code, opponentUser: user });
      setActiveDuelId(code);
      setSearchParams({ room: code });
      toast.success(lang === "ar" ? "تم الانضمام للمبارزة!" : "Joined duel room!");
    } catch (err) {
      toast.error(err.message || "Failed to join duel");
    } finally {
      setBusy(false);
    }
  };

  const handleExitArena = () => {
    setActiveDuelId(null);
    setSearchParams({});
  };

  if (activeDuelId) {
    return (
      <LiveQuizDuelArena
        duelId={activeDuelId}
        user={user}
        lang={lang}
        activeInstructorId={activeInstructorId}
        onExit={handleExitArena}
      />
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6 sm:space-y-8 animate-fadeIn pb-16 select-none">
      {/* Hero Banner */}
      <div className="relative overflow-hidden rounded-[26px] glass-panel border-teal-400/35 p-6 sm:p-7 shadow-2xl">
        <div className="absolute -top-24 -end-24 w-72 h-72 rounded-full bg-rose-500/15 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -start-24 w-72 h-72 rounded-full bg-teal-500/15 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/15 border border-rose-400/30 text-rose-600 dark:text-rose-400 text-xs font-bold">
              <Swords className="h-3.5 w-3.5" />
              <span>{lang === "ar" ? "المبارزات المباشرة 1v1" : "Live Peer-to-Peer 1v1 Duels"}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white">
              {lang === "ar" ? "سباق الكويزات المباشر 1v1 🏎️⚔️" : "Live 1v1 Quiz Race Arena 🏎️⚔️"}
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
              {lang === "ar"
                ? "تحدَّ زملاءك في سباق كويز مباشر في الوقت الفعلي! كل إجابة سريعة وصحيحة تدفع سيارتك للأمام نحو خط النهاية للفوز بالعملات الذهبية والشهرة في شات الدفعة!"
                : "Challenge classmates in real-time quiz races! Fast and accurate answers propel your racing car to the finish line to earn Store Coins and class leaderboard glory!"}
            </p>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              disabled={busy}
              onClick={handleCreateDuel}
              className="glass-btn-primary flex items-center gap-2 px-5 py-3 rounded-2xl text-xs sm:text-sm font-black shadow-lg shadow-teal-500/25 hover:scale-105 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
            >
              <Plus className="h-4 w-4" />
              <span>{lang === "ar" ? "إنشاء تحدي جديد ⚔️" : "Create New Duel ⚔️"}</span>
            </button>

            <button
              type="button"
              disabled={busy}
              onClick={handleCreateBotDuel}
              className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-xs sm:text-sm font-black shadow-lg shadow-indigo-500/25 hover:scale-105 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
            >
              <Bot className="h-4 w-4 text-amber-300" />
              <span>{lang === "ar" ? "العب ضد روبوت أثر 🤖" : "Play vs AI Bot 🤖"}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Join Room Code Input Card */}
      <div className="rounded-3xl glass-panel border-teal-400/30 p-5 sm:p-6 shadow-xl">
        <h3 className="text-sm font-black text-slate-900 dark:text-white mb-3 flex items-center gap-2">
          <KeyRound className="h-4 w-4 text-teal-500" />
          <span>{lang === "ar" ? "لديك كود غرفة من صديقك؟" : "Have a Room Passcode from a Classmate?"}</span>
        </h3>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleJoinWithCode();
          }}
          className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 max-w-lg"
        >
          <input
            type="text"
            value={joinCodeInput}
            onChange={(e) => setJoinCodeInput(e.target.value.toUpperCase())}
            placeholder={lang === "ar" ? "مثال: DUEL-4829" : "e.g. DUEL-4829"}
            className="flex-1 px-4 py-2.5 rounded-2xl glass-input text-sm font-mono font-black uppercase tracking-wider"
          />

          <button
            type="submit"
            disabled={busy || !joinCodeInput.trim()}
            className="px-6 py-2.5 rounded-2xl bg-gradient-to-r from-teal-500 to-sky-600 text-white font-black text-xs sm:text-sm shadow-md hover:scale-102 active:scale-98 transition-all disabled:opacity-40 cursor-pointer"
          >
            {lang === "ar" ? "انضمام للسباق 🏁" : "Join Race 🏁"}
          </button>
        </form>
      </div>

      {/* Open Waiting Duels Waiting for Opponents */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
            <Users className="h-5 w-5 text-teal-500" />
            <span>{lang === "ar" ? "غرف التحدي المفتوحة حالياً" : "Live Waiting Rooms Ready to Duel"}</span>
          </h3>

          <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
            {openDuels.length} {lang === "ar" ? "غرفة بانتظار خصم" : "Rooms Waiting"}
          </span>
        </div>

        {openDuels.length === 0 ? (
          <div className="p-8 rounded-3xl glass-subtle text-center space-y-2 border border-dashed border-slate-300 dark:border-white/10">
            <Swords className="h-8 w-8 mx-auto text-slate-400" />
            <p className="text-xs sm:text-sm font-bold text-slate-600 dark:text-slate-400">
              {lang === "ar"
                ? "لا توجد غرف مفتوحة حالياً، أنشئ أول تحدي أو العب ضد الروبوت!"
                : "No open waiting rooms right now. Create the first duel or play vs AI Bot!"}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {openDuels.map((duel) => {
              const isMyRoom = duel.host?.uid === user?.uid;
              return (
                <div
                  key={duel.id}
                  className="p-4 sm:p-5 rounded-2xl glass-panel border-teal-400/30 shadow-md flex items-center justify-between gap-3 hover:border-teal-400/60 transition-all"
                >
                  <div className="space-y-1 min-w-0">
                    <span className="text-[10px] uppercase font-mono font-bold text-teal-600 dark:text-teal-400 block">
                      {duel.id}
                    </span>
                    <div className="font-black text-xs sm:text-sm text-slate-900 dark:text-white truncate">
                      {duel.host?.name || "Player"}
                    </div>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 block">
                      5 {lang === "ar" ? "أسئلة سريعة" : "Questions Race"} · +50 {lang === "ar" ? "عملة" : "Coins"}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleJoinWithCode(duel.id)}
                    className="px-4 py-2 rounded-xl glass-btn-primary text-xs font-black shadow-sm shrink-0 cursor-pointer"
                  >
                    {isMyRoom
                      ? lang === "ar" ? "غرفتك (دخول)" : "Your Room"
                      : lang === "ar" ? "تحدَّ الآن ⚔️" : "Duel ⚔️"}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
