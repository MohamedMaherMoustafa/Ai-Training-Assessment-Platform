import { ref, set, get, update, onValue, push, remove } from "firebase/database";
import { rtdb } from "../lib/firebase";
import { getRandomDuelQuestions } from "../features/duel/duelQuestionsData";
import {
  saveStudentIQProgress,
  getStudentIQStats,
  sendDirectChatMessage,
  getDirectChatChannelId,
} from "./platformService";

/**
 * Generate a friendly 6-character room code like "DUEL-4821"
 */
function generateRoomCode() {
  const num = Math.floor(1000 + Math.random() * 9000);
  return `DUEL-${num}`;
}

/**
 * Create a new live 1v1 quiz duel room in Firebase RTDB
 */
export async function createQuizDuel({ hostUser, topic = "General Tech & Logic" }) {
  const roomCode = generateRoomCode();
  const roomRef = ref(rtdb, `liveQuizDuels/${roomCode}`);

  const questions = getRandomDuelQuestions(5);

  const initialRoom = {
    id: roomCode,
    topic,
    createdAt: Date.now(),
    status: "waiting", // 'waiting' | 'countdown' | 'in_progress' | 'finished'
    host: {
      uid: hostUser.uid,
      name: hostUser.displayName || hostUser.username || "Player 1",
      avatar: (hostUser.displayName || "P1").slice(0, 2).toUpperCase(),
      score: 0,
      progress: 0, // 0 to 100%
      currentQuestionIdx: 0,
      answers: {},
      isFinished: false,
    },
    opponent: null,
    questions,
    countdown: 3,
    winnerUid: null,
    winnerName: null,
    rewardCoinsWinner: 50,
    rewardCoinsRunnerUp: 15,
    chatAnnounced: false,
    isBotMatch: false,
  };

  await set(roomRef, initialRoom);
  return roomCode;
}

/**
 * Join an existing duel room using room code
 */
export async function joinQuizDuel({ duelId, opponentUser }) {
  if (!duelId || !opponentUser) throw new Error("Missing duelId or user");
  const cleanCode = duelId.trim().toUpperCase();
  const roomRef = ref(rtdb, `liveQuizDuels/${cleanCode}`);

  const snap = await get(roomRef);
  if (!snap.exists()) {
    throw new Error("الغرفة غير موجودة أو انتهت صلاحيتها / Room not found");
  }

  const roomData = snap.val();
  if (roomData.status !== "waiting") {
    throw new Error("المبارزة بدأت بالفعل أو انتهت / Duel has already started");
  }

  if (roomData.host.uid === opponentUser.uid) {
    // Re-joining own room as host
    return cleanCode;
  }

  // Update room with opponent and switch to countdown status
  await update(roomRef, {
    opponent: {
      uid: opponentUser.uid,
      name: opponentUser.displayName || opponentUser.username || "Player 2",
      avatar: (opponentUser.displayName || "P2").slice(0, 2).toUpperCase(),
      score: 0,
      progress: 0,
      currentQuestionIdx: 0,
      answers: {},
      isFinished: false,
    },
    status: "countdown",
    countdown: 3,
  });

  return cleanCode;
}

/**
 * Create instant duel against Athar AI Bot
 */
export async function createBotDuel({ hostUser }) {
  const roomCode = `BOT-${Math.floor(1000 + Math.random() * 9000)}`;
  const roomRef = ref(rtdb, `liveQuizDuels/${roomCode}`);

  const questions = getRandomDuelQuestions(5);

  const botRoom = {
    id: roomCode,
    topic: "AI Speed Duel",
    createdAt: Date.now(),
    status: "countdown",
    countdown: 3,
    isBotMatch: true,
    host: {
      uid: hostUser.uid,
      name: hostUser.displayName || hostUser.username || "Player 1",
      avatar: (hostUser.displayName || "P1").slice(0, 2).toUpperCase(),
      score: 0,
      progress: 0,
      currentQuestionIdx: 0,
      answers: {},
      isFinished: false,
    },
    opponent: {
      uid: "bot_athar",
      name: "Athar Bot 🤖",
      avatar: "AI",
      score: 0,
      progress: 0,
      currentQuestionIdx: 0,
      answers: {},
      isFinished: false,
    },
    questions,
    winnerUid: null,
    winnerName: null,
    rewardCoinsWinner: 40,
    rewardCoinsRunnerUp: 10,
    chatAnnounced: false,
  };

  await set(roomRef, botRoom);
  return roomCode;
}

/**
 * Realtime listener for a duel room
 */
export function subscribeQuizDuel(duelId, callback) {
  if (!duelId) return () => {};
  const cleanCode = duelId.trim().toUpperCase();
  const roomRef = ref(rtdb, `liveQuizDuels/${cleanCode}`);

  return onValue(roomRef, (snap) => {
    if (!snap.exists()) {
      callback(null);
    } else {
      callback(snap.val());
    }
  });
}

/**
 * Realtime listener for open waiting duels
 */
export function subscribeOpenDuels(callback) {
  const duelsRef = ref(rtdb, "liveQuizDuels");
  return onValue(duelsRef, (snap) => {
    if (!snap.exists()) {
      callback([]);
      return;
    }
    const val = snap.val();
    const waitingList = Object.values(val).filter((d) => d && d.status === "waiting");
    callback(waitingList);
  });
}

/**
 * Submit answer for player (host or opponent)
 */
export async function submitDuelAnswer({
  duelId,
  role, // 'host' | 'opponent'
  questionIndex,
  isCorrect,
  timeTaken, // seconds
}) {
  const cleanCode = duelId.trim().toUpperCase();
  const roomRef = ref(rtdb, `liveQuizDuels/${cleanCode}`);
  const snap = await get(roomRef);
  if (!snap.exists()) return;

  const room = snap.val();
  const player = role === "host" ? room.host : room.opponent;
  if (!player) return;

  const totalQuestions = room.questions?.length || 5;
  const isLastQuestion = questionIndex + 1 >= totalQuestions;

  // Score calculation: +10 pts for correct, +5 bonus if fast (< 6s)
  const speedBonus = isCorrect && timeTaken <= 6 ? 5 : 0;
  const earnedPts = isCorrect ? 10 + speedBonus : 0;
  const newScore = (player.score || 0) + earnedPts;

  // Progress: 20% per question (up to 100%)
  const newProgress = Math.min(100, Math.round(((questionIndex + 1) / totalQuestions) * 100));

  const updates = {
    [`${role}/score`]: newScore,
    [`${role}/progress`]: newProgress,
    [`${role}/currentQuestionIdx`]: questionIndex + 1,
    [`${role}/isFinished`]: isLastQuestion,
    [`${role}/answers/${questionIndex}`]: {
      isCorrect,
      timeTaken,
      earnedPts,
    },
  };

  await update(roomRef, updates);

  // Check if both players have now finished
  const otherRole = role === "host" ? "opponent" : "host";
  const otherPlayer = role === "host" ? room.opponent : room.host;

  if (isLastQuestion && otherPlayer?.isFinished) {
    // Both finished! Determine winner
    let winnerUid = null;
    let winnerName = null;

    if (newScore > (otherPlayer.score || 0)) {
      winnerUid = player.uid;
      winnerName = player.name;
    } else if ((otherPlayer.score || 0) > newScore) {
      winnerUid = otherPlayer.uid;
      winnerName = otherPlayer.name;
    } else {
      // Tie-breaker based on progress / tie
      winnerUid = "tie";
      winnerName = "Tie";
    }

    await update(roomRef, {
      status: "finished",
      winnerUid,
      winnerName,
    });
  }
}

/**
 * Simulate AI Bot Step for Single Player Mode
 */
export async function simulateBotStep({ duelId, currentIdx }) {
  const cleanCode = duelId.trim().toUpperCase();
  const roomRef = ref(rtdb, `liveQuizDuels/${cleanCode}`);
  const snap = await get(roomRef);
  if (!snap.exists()) return;

  const room = snap.val();
  if (room.status !== "in_progress" || !room.isBotMatch) return;

  const totalQuestions = room.questions?.length || 5;
  if (currentIdx >= totalQuestions) return;

  // Bot accuracy: 80% chance correct
  const isCorrect = Math.random() < 0.8;
  const timeTaken = 3 + Math.floor(Math.random() * 5); // 3-7 seconds

  await submitDuelAnswer({
    duelId: cleanCode,
    role: "opponent",
    questionIndex: currentIdx,
    isCorrect,
    timeTaken,
  });
}

/**
 * Award coins to students upon duel completion
 */
export async function awardDuelPrizes({ user, isWinner, rewardCoins }) {
  if (!user?.uid || !rewardCoins) return;
  try {
    const stats = await getStudentIQStats(user.uid);
    const updatedCoins = (stats.coins || 0) + rewardCoins;
    await saveStudentIQProgress(user.uid, {
      ...stats,
      coins: updatedCoins,
    });
  } catch (err) {
    console.error("awardDuelPrizes error:", err);
  }
}

/**
 * Broadcast 1v1 duel victory message to the teacher/group chat
 */
export async function broadcastDuelToChat({
  duelId,
  winnerName,
  loserName,
  winnerScore,
  loserScore,
  instructorId,
  user,
}) {
  if (!instructorId || !user?.uid) return;
  const channelId = getDirectChatChannelId(user.uid, instructorId);
  if (!channelId) return;

  const text = `🏆 نتيجة مبارزة 1v1 الحية:\nفاز البطل [${winnerName}] على منافسه [${loserName}] في سباق الكويز المباشر بنتيجة (${winnerScore} - ${loserScore})! 🚀🎉`;

  try {
    await sendDirectChatMessage({
      channelId,
      senderId: user.uid,
      senderName: user.displayName || user.username || "الطالب",
      senderRole: "student",
      recipientId: instructorId,
      recipientName: "المحاضر",
      text,
    });

    const cleanCode = duelId.trim().toUpperCase();
    await update(ref(rtdb, `liveQuizDuels/${cleanCode}`), {
      chatAnnounced: true,
    });
  } catch (err) {
    console.warn("broadcastDuelToChat note:", err);
  }
}
