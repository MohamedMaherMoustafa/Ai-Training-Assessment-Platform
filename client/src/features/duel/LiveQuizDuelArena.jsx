import { useState, useEffect, useRef, useMemo } from "react";
import {
  Swords,
  Trophy,
  Zap,
  Flag,
  Share2,
  Copy,
  Check,
  RotateCcw,
  Clock,
  ArrowRight,
  ArrowLeft,
  Users,
  Bot,
  Crown,
  Sparkles,
  MessageCircle,
  Play,
  Flame,
  X,
} from "lucide-react";
import toast from "react-hot-toast";
import {
  subscribeQuizDuel,
  submitDuelAnswer,
  simulateBotStep,
  awardDuelPrizes,
  broadcastDuelToChat,
  createBotDuel,
} from "../../services/liveQuizDuelService";
import {
  playRaceCountdownSound,
  playNitroBoostSound,
  playPlayerHurtSound,
  playBossDefeatSound,
  playCoinSound,
  playClickSound,
} from "../../utils/soundEffects";

export default function LiveQuizDuelArena({
  duelId,
  user,
  lang,
  activeInstructorId,
  onExit = () => {},
}) {
  const [duelData, setDuelData] = useState(null);
  const [copiedCode, setCopiedCode] = useState(false);
  const [selectedOption, setSelectedOption] = useState(null);
  const [answeredCurrent, setAnsweredCurrent] = useState(false);
  const [questionTimeLeft, setQuestionTimeLeft] = useState(15);
  const [countdown, setCountdown] = useState(3);
  const [prizesClaimed, setPrizesClaimed] = useState(false);
  const [chatShared, setChatShared] = useState(false);

  const timerRef = useRef(null);
  const questionStartTimeRef = useRef(Date.now());
  const countdownIntervalRef = useRef(null);

  // Subscribe to realtime room updates
  useEffect(() => {
    if (!duelId) return;
    const unsub = subscribeQuizDuel(duelId, (data) => {
      setDuelData(data);
    });
    return () => unsub();
  }, [duelId]);

  // Determine player role in this duel
  const role = useMemo(() => {
    if (!duelData || !user?.uid) return "host";
    return duelData.opponent?.uid === user.uid ? "opponent" : "host";
  }, [duelData, user?.uid]);

  const otherRole = role === "host" ? "opponent" : "host";
  const myPlayer = duelData?.[role];
  const otherPlayer = duelData?.[otherRole];

  // Synchronized countdown when room enters 'countdown' status
  useEffect(() => {
    if (duelData?.status === "countdown") {
      let count = 3;
      setCountdown(3);
      playRaceCountdownSound(false);

      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = setInterval(() => {
        count -= 1;
        if (count > 0) {
          setCountdown(count);
          playRaceCountdownSound(false);
        } else if (count === 0) {
          setCountdown(0);
          playRaceCountdownSound(true);
        } else {
          clearInterval(countdownIntervalRef.current);
          // Set status to in_progress if we are host
          if (role === "host") {
            import("firebase/database").then(({ ref, update }) => {
              import("../../lib/firebase").then(({ rtdb }) => {
                update(ref(rtdb, `liveQuizDuels/${duelId}`), {
                  status: "in_progress",
                });
              });
            });
          }
        }
      }, 1000);

      return () => {
        if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
      };
    }
  }, [duelData?.status, role, duelId]);

  // Per-question timer during in_progress
  const currentIdx = myPlayer?.currentQuestionIdx || 0;
  const currentQuestion = duelData?.questions?.[currentIdx];

  useEffect(() => {
    if (duelData?.status !== "in_progress" || myPlayer?.isFinished) return;

    setQuestionTimeLeft(15);
    setAnsweredCurrent(false);
    setSelectedOption(null);
    questionStartTimeRef.current = Date.now();

    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setQuestionTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          handleTimeOut();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [duelData?.status, currentIdx, myPlayer?.isFinished]);

  // Bot simulation step if playing against AI
  useEffect(() => {
    if (
      duelData?.status === "in_progress" &&
      duelData?.isBotMatch &&
      otherPlayer &&
      !otherPlayer.isFinished &&
      role === "host"
    ) {
      const botIdx = otherPlayer.currentQuestionIdx || 0;
      const botDelay = 3000 + Math.random() * 3500; // 3-6.5 seconds per bot answer
      const t = setTimeout(() => {
        simulateBotStep({ duelId, currentIdx: botIdx });
      }, botDelay);
      return () => clearTimeout(t);
    }
  }, [duelData?.status, duelData?.isBotMatch, otherPlayer?.currentQuestionIdx, role, duelId]);

  // Timeout handler: answer missed (incorrect)
  const handleTimeOut = () => {
    if (answeredCurrent || myPlayer?.isFinished) return;
    setAnsweredCurrent(true);
    playPlayerHurtSound();
    submitDuelAnswer({
      duelId,
      role,
      questionIndex: currentIdx,
      isCorrect: false,
      timeTaken: 15,
    });
  };

  // Option selection
  const handleSelectOption = (opt) => {
    if (answeredCurrent || myPlayer?.isFinished) return;
    setSelectedOption(opt.id);
    setAnsweredCurrent(true);
    if (timerRef.current) clearInterval(timerRef.current);

    const timeTaken = Math.min(
      15,
      Math.max(1, Math.round((Date.now() - questionStartTimeRef.current) / 1000))
    );

    if (opt.isCorrect) {
      playNitroBoostSound();
    } else {
      playPlayerHurtSound();
    }

    submitDuelAnswer({
      duelId,
      role,
      questionIndex: currentIdx,
      isCorrect: opt.isCorrect,
      timeTaken,
    });
  };

  // Award prizes and chat announcement upon duel completion
  useEffect(() => {
    if (duelData?.status === "finished" && !prizesClaimed && user?.uid) {
      setPrizesClaimed(true);
      playBossDefeatSound();

      const isWinner = duelData.winnerUid === user.uid;
      const reward = isWinner
        ? duelData.rewardCoinsWinner || 50
        : duelData.rewardCoinsRunnerUp || 15;

      awardDuelPrizes({ user, isWinner, rewardCoins: reward });
      playCoinSound();

      // Broadcast victory in class chat
      if (
        activeInstructorId &&
        !duelData.chatAnnounced &&
        duelData.winnerUid &&
        duelData.winnerUid !== "tie"
      ) {
        const winner = duelData.winnerUid === duelData.host.uid ? duelData.host : duelData.opponent;
        const loser = duelData.winnerUid === duelData.host.uid ? duelData.opponent : duelData.host;
        broadcastDuelToChat({
          duelId,
          winnerName: winner?.name || "Player",
          loserName: loser?.name || "Opponent",
          winnerScore: winner?.score || 0,
          loserScore: loser?.score || 0,
          instructorId: activeInstructorId,
          user,
        });
        setChatShared(true);
      }
    }
  }, [duelData?.status, prizesClaimed, user, activeInstructorId, duelId]);

  const copyRoomCode = () => {
    navigator.clipboard.writeText(duelId);
    setCopiedCode(true);
    playClickSound();
    toast.success(lang === "ar" ? "تم نسخ كود الغرفة!" : "Room code copied!");
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const shareToWhatsApp = () => {
    const text =
      lang === "ar"
        ? `⚔️ هيا نتبارز! لقد أنشأت غرفة تحدي كويز 1v1 مباشرة على منصة أثر.\nكود الغرفة: ${duelId}\nانضم لي الآن وأرني سرعتك! 🚀`
        : `⚔️ Let's duel! I created a live 1v1 quiz race on Athar.\nRoom Code: ${duelId}\nJoin me now! 🚀`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
  };

  // ================= 1. WAITING ROOM VIEW =================
  if (duelData?.status === "waiting") {
    return (
      <div className="max-w-2xl mx-auto p-4 sm:p-6 space-y-6 animate-fadeIn">
        <div className="relative rounded-3xl glass-panel border-teal-400/40 p-6 sm:p-8 text-center space-y-6 shadow-2xl overflow-hidden">
          {/* Ambient glow */}
          <div className="absolute -top-16 -right-16 w-48 h-48 bg-teal-500/20 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-16 -left-16 w-48 h-48 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />

          {/* Swords Header */}
          <div className="h-16 w-16 mx-auto rounded-3xl bg-gradient-to-tr from-rose-500 to-amber-500 flex items-center justify-center text-white shadow-xl shadow-rose-500/30 animate-pulse">
            <Swords className="h-8 w-8" />
          </div>

          <div className="space-y-2">
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
              {lang === "ar" ? "غرفة انتظار المبارزة 1v1 ⚔️" : "Live 1v1 Duel Lobby ⚔️"}
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 max-w-md mx-auto">
              {lang === "ar"
                ? "شارك كود الغرفة مع زميلك للانضمام فوراً إلى سباق الكويز المباشر!"
                : "Share this room code with your classmate to launch the live quiz race!"}
            </p>
          </div>

          {/* Large Room Code Box */}
          <div className="p-4 rounded-2xl bg-slate-900/10 dark:bg-black/30 border-2 border-dashed border-teal-400/50 flex flex-col sm:flex-row items-center justify-between gap-3 max-w-md mx-auto">
            <div className="text-start">
              <span className="text-[10.5px] uppercase font-black tracking-wider text-teal-600 dark:text-teal-400 block">
                {lang === "ar" ? "كود الغرفة المباشر" : "Room Passcode"}
              </span>
              <span className="text-2xl sm:text-3xl font-mono font-black text-slate-900 dark:text-white tracking-widest">
                {duelId}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={copyRoomCode}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-teal-500 text-white text-xs font-bold shadow-md hover:bg-teal-600 active:scale-95 transition-all cursor-pointer"
              >
                {copiedCode ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                <span>{copiedCode ? (lang === "ar" ? "تم النسخ" : "Copied") : (lang === "ar" ? "نسخ" : "Copy")}</span>
              </button>

              <button
                type="button"
                onClick={shareToWhatsApp}
                title="Share to WhatsApp"
                className="p-2 rounded-xl bg-emerald-500 text-white hover:bg-emerald-600 active:scale-95 transition-all cursor-pointer shadow-md"
              >
                <MessageCircle className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Radar Scanning Status */}
          <div className="flex flex-col items-center gap-2 pt-2">
            <div className="relative flex items-center justify-center h-10 w-10">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-60" />
              <span className="relative inline-flex rounded-full h-4 w-4 bg-teal-500 shadow-md shadow-teal-500/50" />
            </div>
            <span className="text-xs font-extrabold text-slate-600 dark:text-slate-300 animate-pulse">
              {lang === "ar" ? "في انتظار انضمام الخصم للغرفة..." : "Waiting for opponent to enter..."}
            </span>
          </div>

          {/* Quick AI Bot Switch Option */}
          <div className="pt-4 border-t border-slate-200/60 dark:border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3">
            <span className="text-xs text-slate-500 dark:text-slate-400">
              {lang === "ar" ? "زميلك غير متاح الآن؟" : "Friend not online right now?"}
            </span>

            <button
              type="button"
              onClick={async () => {
                const botRoom = await createBotDuel({ hostUser: user });
                // Window update/reload into bot duel
                window.location.hash = "";
                window.location.search = `?room=${botRoom}`;
              }}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-xs font-bold shadow-md hover:scale-105 active:scale-95 transition-all cursor-pointer"
            >
              <Bot className="h-4 w-4 text-amber-300" />
              <span>{lang === "ar" ? "العب ضد روبوت أثر الذكي 🤖" : "Play vs Athar AI Bot 🤖"}</span>
            </button>
          </div>

          <button
            type="button"
            onClick={onExit}
            className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer pt-2"
          >
            {lang === "ar" ? "إلغاء والعودة" : "Cancel & Go Back"}
          </button>
        </div>
      </div>
    );
  }

  // ================= 2. COUNTDOWN OVERLAY =================
  if (duelData?.status === "countdown") {
    return (
      <div className="min-h-[460px] flex flex-col items-center justify-center p-6 text-center animate-fadeIn select-none">
        <div className="relative mb-6">
          <div className="h-28 w-28 sm:h-36 sm:w-36 rounded-full bg-gradient-to-tr from-teal-500 via-sky-500 to-indigo-600 flex items-center justify-center text-white shadow-2xl shadow-teal-500/40 animate-pulse border-4 border-white/20">
            <span className="text-5xl sm:text-6xl font-black font-mono">
              {countdown > 0 ? countdown : "GO! 🏁"}
            </span>
          </div>
        </div>

        <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white mb-2">
          {lang === "ar" ? "استعد للسباق والمبارزة! 🏎️" : "Get Ready to Race! 🏎️"}
        </h2>
        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 font-bold">
          {lang === "ar"
            ? `${duelData.host.name} ⚔️ ${duelData.opponent?.name || "الخصم"}`
            : `${duelData.host.name} ⚔️ ${duelData.opponent?.name || "Opponent"}`}
        </p>
      </div>
    );
  }

  // ================= 3. ACTIVE LIVE RACE ARENA =================
  const hostProgress = duelData?.host?.progress || 0;
  const oppProgress = duelData?.opponent?.progress || 0;
  const isFinished = duelData?.status === "finished";

  return (
    <div className="max-w-4xl mx-auto p-3 sm:p-6 space-y-6 animate-fadeIn pb-12 select-none">
      {/* Top Header Card */}
      <div className="flex items-center justify-between gap-3 p-4 rounded-2xl glass-panel border-teal-400/30 shadow-md">
        <div className="flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-rose-500 to-amber-500 flex items-center justify-center text-white shadow-sm">
            <Swords className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[10.5px] uppercase font-bold text-teal-600 dark:text-teal-400 block">
              {lang === "ar" ? "مبارزة 1v1 مباشرة" : "Live 1v1 Duel Race"}
            </span>
            <span className="text-xs font-black text-slate-800 dark:text-slate-100">
              {duelData?.topic || "General Tech & Logic"}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3 py-1 rounded-full bg-slate-900/10 dark:bg-white/10 text-xs font-mono font-bold text-slate-700 dark:text-slate-200">
            {duelId}
          </span>
          <button
            type="button"
            onClick={onExit}
            className="p-1.5 rounded-xl glass-subtle text-slate-400 hover:text-rose-500 transition-colors cursor-pointer"
            title={lang === "ar" ? "خروج" : "Exit"}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* DUAL RACE TRACKS (المساران المتوازيان للسباق الحي) */}
      <div className="p-4 sm:p-6 rounded-3xl glass-panel border-teal-400/35 shadow-xl space-y-5">
        <div className="flex items-center justify-between text-xs font-extrabold text-slate-500 dark:text-slate-400">
          <span className="flex items-center gap-1.5">
            <Flag className="h-4 w-4 text-teal-500" />
            {lang === "ar" ? "خط البداية" : "Start"}
          </span>
          <span className="flex items-center gap-1.5 text-amber-500 dark:text-amber-400">
            <Trophy className="h-4 w-4" />
            {lang === "ar" ? "خط النهاية 100%" : "Finish Line 100%"}
          </span>
        </div>

        {/* Track 1: Player A (Host) */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs font-black">
            <span className="flex items-center gap-2 text-teal-600 dark:text-teal-300">
              <span className="h-6 w-6 rounded-lg bg-teal-500/20 border border-teal-400/40 flex items-center justify-center text-[10.5px]">
                {duelData?.host?.avatar}
              </span>
              <span>{duelData?.host?.name} {role === "host" && (lang === "ar" ? "(أنت)" : "(You)")}</span>
            </span>
            <span className="text-amber-500 font-mono text-sm">{duelData?.host?.score || 0} pts</span>
          </div>

          <div className="relative h-12 rounded-2xl bg-slate-950/40 dark:bg-black/50 border border-slate-700/50 dark:border-white/10 overflow-hidden flex items-center px-2">
            {/* Dashed Road Center Line */}
            <div className="absolute inset-x-0 h-0.5 border-b border-dashed border-slate-500/30" />
            {/* Finish Line Checkered Banner */}
            <div className="absolute end-0 top-0 bottom-0 w-4 bg-[repeating-linear-gradient(45deg,#000,#000_4px,#fff_4px,#fff_8px)] opacity-50" />

            {/* Racing Cyber Pod */}
            <div
              className="absolute top-1/2 -translate-y-1/2 transition-all duration-700 ease-out flex items-center"
              style={{
                left: `${Math.min(90, Math.max(2, hostProgress))}%`,
              }}
            >
              <div className="relative flex items-center">
                {/* Nitro Flame Trail */}
                {hostProgress > 0 && (
                  <span className="absolute -start-4 text-xs animate-pulse">🔥</span>
                )}
                <div className="h-8 w-8 rounded-xl bg-gradient-to-tr from-teal-400 to-sky-500 flex items-center justify-center text-white text-xs font-black shadow-lg shadow-teal-500/50 border border-white/40">
                  🏎️
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Track 2: Player B (Opponent) */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs font-black">
            <span className="flex items-center gap-2 text-indigo-600 dark:text-indigo-300">
              <span className="h-6 w-6 rounded-lg bg-indigo-500/20 border border-indigo-400/40 flex items-center justify-center text-[10.5px]">
                {duelData?.opponent?.avatar || "OP"}
              </span>
              <span>{duelData?.opponent?.name || "Opponent"} {role === "opponent" && (lang === "ar" ? "(أنت)" : "(You)")}</span>
            </span>
            <span className="text-amber-500 font-mono text-sm">{duelData?.opponent?.score || 0} pts</span>
          </div>

          <div className="relative h-12 rounded-2xl bg-slate-950/40 dark:bg-black/50 border border-slate-700/50 dark:border-white/10 overflow-hidden flex items-center px-2">
            <div className="absolute inset-x-0 h-0.5 border-b border-dashed border-slate-500/30" />
            <div className="absolute end-0 top-0 bottom-0 w-4 bg-[repeating-linear-gradient(45deg,#000,#000_4px,#fff_4px,#fff_8px)] opacity-50" />

            <div
              className="absolute top-1/2 -translate-y-1/2 transition-all duration-700 ease-out flex items-center"
              style={{
                left: `${Math.min(90, Math.max(2, oppProgress))}%`,
              }}
            >
              <div className="relative flex items-center">
                {oppProgress > 0 && (
                  <span className="absolute -start-4 text-xs animate-pulse">🔥</span>
                )}
                <div className="h-8 w-8 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center text-white text-xs font-black shadow-lg shadow-indigo-500/50 border border-white/40">
                  🚀
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* QUESTION INTERFACE (Or waiting for other player if I finished) */}
      {!isFinished && (
        <div className="rounded-3xl glass-panel border-teal-400/30 p-5 sm:p-7 shadow-xl space-y-5">
          {myPlayer?.isFinished ? (
            /* Finished my questions, waiting for opponent */
            <div className="text-center py-8 space-y-4">
              <div className="h-14 w-14 mx-auto rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-2xl animate-bounce">
                🏁
              </div>
              <h3 className="text-xl font-black text-slate-900 dark:text-white">
                {lang === "ar" ? "أنهيت جميع أسئلتك بنجاح! 🚀" : "You have crossed the finish line! 🚀"}
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 animate-pulse">
                {lang === "ar"
                  ? "في انتظار وصول منافسك إلى خط النهاية لإعلان الفائز..."
                  : "Waiting for opponent to finish to announce the champion..."}
              </p>
            </div>
          ) : currentQuestion ? (
            /* Active Question Card */
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-3 pb-3 border-b border-slate-200/60 dark:border-white/10">
                <span className="text-xs font-black text-teal-600 dark:text-teal-400">
                  {lang === "ar"
                    ? `السؤال ${currentIdx + 1} من ${duelData.questions.length}`
                    : `Question ${currentIdx + 1} of ${duelData.questions.length}`}
                </span>

                {/* Circular Speed Timer */}
                <div
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black font-mono ${
                    questionTimeLeft <= 4
                      ? "bg-rose-500/20 text-rose-500 animate-ping"
                      : "bg-teal-500/15 text-teal-700 dark:text-teal-300"
                  }`}
                >
                  <Clock className="h-3.5 w-3.5" />
                  <span>{questionTimeLeft}s</span>
                </div>
              </div>

              {/* Question Text */}
              <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white leading-relaxed">
                {lang === "ar" ? currentQuestion.text.ar : currentQuestion.text.en}
              </h3>

              {/* 4 Options Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                {currentQuestion.options.map((opt) => {
                  const isSelected = selectedOption === opt.id;
                  let btnColor = "glass-subtle hover:border-teal-400 hover:scale-[1.01]";

                  if (answeredCurrent && isSelected) {
                    btnColor = opt.isCorrect
                      ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/30 border-emerald-400"
                      : "bg-rose-500 text-white shadow-lg shadow-rose-500/30 border-rose-400";
                  }

                  return (
                    <button
                      key={opt.id}
                      type="button"
                      disabled={answeredCurrent}
                      onClick={() => handleSelectOption(opt)}
                      className={`p-3.5 sm:p-4 rounded-2xl border text-start text-xs sm:text-sm font-extrabold transition-all cursor-pointer flex items-center justify-between gap-3 ${btnColor}`}
                    >
                      <span>{opt.text}</span>
                      {answeredCurrent && isSelected && (
                        <span>{opt.isCorrect ? "⚡ +10" : "❌"}</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}
        </div>
      )}

      {/* ================= 4. VICTORY & PODIUM MODAL ================= */}
      {isFinished && (
        <div className="p-6 sm:p-8 rounded-3xl glass-panel border-teal-400/40 text-center space-y-6 shadow-2xl animate-fadeIn">
          {duelData.winnerUid === user.uid ? (
            <>
              <div className="h-20 w-20 mx-auto rounded-3xl bg-gradient-to-tr from-amber-400 via-yellow-400 to-amber-600 flex items-center justify-center text-white shadow-2xl shadow-amber-500/40 animate-bounce">
                <Crown className="h-10 w-10 fill-current text-white" />
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
                {lang === "ar" ? "🎉 مبروووك! أنت الفائز بالسباق! 🏆" : "🎉 Victory! You Won the Race! 🏆"}
              </h2>
              <p className="text-sm font-bold text-amber-500 dark:text-amber-400">
                {lang === "ar"
                  ? `أحرزت ${myPlayer?.score || 0} نقطة وحصلت على +${duelData.rewardCoinsWinner || 50} عملة للمتجر!`
                  : `You scored ${myPlayer?.score || 0} pts and claimed +${duelData.rewardCoinsWinner || 50} Store Coins!`}
              </p>
            </>
          ) : (
            <>
              <div className="h-16 w-16 mx-auto rounded-2xl bg-gradient-to-tr from-slate-400 to-indigo-500 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
                <Trophy className="h-8 w-8" />
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                {lang === "ar" ? "سباق رائع وتنافس قوي! 👏" : "Great Race & Tough Duel! 👏"}
              </h2>
              <p className="text-xs sm:text-sm font-bold text-slate-600 dark:text-slate-300">
                {lang === "ar"
                  ? `الفائز: ${duelData.winnerName} (${otherPlayer?.score || 0} نقطة) · نقاطك: ${myPlayer?.score || 0} نقطة (+${duelData.rewardCoinsRunnerUp || 15} عملة)`
                  : `Winner: ${duelData.winnerName} (${otherPlayer?.score || 0} pts) · Your score: ${myPlayer?.score || 0} pts (+${duelData.rewardCoinsRunnerUp || 15} coins)`}
              </p>
            </>
          )}

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={onExit}
              className="px-6 py-2.5 rounded-2xl glass-btn-primary text-xs sm:text-sm font-black cursor-pointer shadow-md hover:scale-105 active:scale-95 transition-all"
            >
              {lang === "ar" ? "خروج إلى لوحة التحكم" : "Exit to Dashboard"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
