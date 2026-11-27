import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Sparkles,
  Zap,
  Swords,
  Trophy,
  ArrowRight,
  ArrowLeft,
  X,
  Flame,
  TrendingUp,
  Target,
  ChevronRight,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useLang } from "../../context/LangContext";
import {
  listResults,
  listAssignments,
  listCourses,
  listUsers,
} from "../../services/platformService";

function getQuizEarnedPoints(r) {
  if (r.points !== undefined && r.points !== null) return Number(r.points) || 0;
  const totalQ = Number(r.total) || 1;
  const pct = Number(r.score) || 0;
  return Math.round((pct / 100) * totalQ);
}

export default function ProactiveMotivationWidget({ activeInstructorId = null }) {
  const { user } = useAuth();
  const { lang } = useLang();
  const navigate = useNavigate();

  const [dismissed, setDismissed] = useState(() => {
    return sessionStorage.getItem("motivation_agent_dismissed") === "true";
  });
  const [rivalData, setRivalData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function computeRivalry() {
      try {
        const [allCourses, allResults, allAssignments, allStudents] = await Promise.all([
          listCourses(),
          listResults(),
          listAssignments(),
          listUsers("student"),
        ]);

        if (!isMounted) return;

        // Filter courses matching active instructor if supplied
        const relevantCourses = activeInstructorId
          ? allCourses.filter((c) => c.instructorId === activeInstructorId)
          : allCourses;

        const courseIds = new Set(relevantCourses.map((c) => c.id));

        // Build total points per student
        const pointsMap = {};
        const nameMap = {};

        allStudents.forEach((st) => {
          pointsMap[st.uid] = 0;
          nameMap[st.uid] = st.displayName || st.username || st.email || "Student";
        });

        // Add quiz points
        allResults
          .filter((r) => !courseIds.size || courseIds.has(r.courseId))
          .forEach((r) => {
            const sid = r.studentId;
            if (sid) {
              pointsMap[sid] = (pointsMap[sid] || 0) + getQuizEarnedPoints(r);
              if (r.studentName && (!nameMap[sid] || nameMap[sid] === "Student")) {
                nameMap[sid] = r.studentName;
              }
            }
          });

        // Add assignment points
        allAssignments
          .filter((a) => !courseIds.size || courseIds.has(a.courseId))
          .forEach((a) => {
            (a.submissions || []).forEach((sub) => {
              const sid = sub.studentId || sub.id;
              if (sid && sub.score !== undefined && sub.score !== null) {
                pointsMap[sid] = (pointsMap[sid] || 0) + (Number(sub.score) || 0);
                if (sub.studentName && (!nameMap[sid] || nameMap[sid] === "Student")) {
                  nameMap[sid] = sub.studentName;
                }
              }
            });
          });

        // Rank sorted students
        const ranked = Object.entries(pointsMap)
          .map(([uid, pts]) => ({
            uid,
            name: nameMap[uid] || uid,
            points: pts,
          }))
          .sort((a, b) => b.points - a.points);

        const currentUid = user?.uid;
        const myIndex = ranked.findIndex((item) => item.uid === currentUid);

        if (myIndex !== -1) {
          const myRank = myIndex + 1;
          const myPoints = ranked[myIndex].points;

          if (myRank === 1) {
            // First place champion!
            const runnerUp = ranked[1];
            setRivalData({
              isFirst: true,
              rank: 1,
              points: myPoints,
              gapToSecond: runnerUp ? myPoints - runnerUp.points : 0,
              runnerUpName: runnerUp ? runnerUp.name : null,
            });
          } else {
            // There is someone above us
            const rival = ranked[myIndex - 1];
            const gap = (rival?.points || 0) - myPoints;
            setRivalData({
              isFirst: false,
              rank: myRank,
              points: myPoints,
              rivalName: rival ? rival.name : (lang === "ar" ? "المنافس المتصدر" : "Top Rival"),
              targetRank: myRank - 1,
              gap: Math.max(1, gap),
            });
          }
        } else {
          // New student, encourage them to start
          const leader = ranked[0];
          setRivalData({
            isFirst: false,
            rank: ranked.length + 1,
            points: 0,
            rivalName: leader ? leader.name : "Champion",
            targetRank: ranked.length,
            gap: leader ? leader.points + 5 : 20,
          });
        }
      } catch (err) {
        console.error("ProactiveMotivationWidget error:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    if (user?.uid) {
      computeRivalry();
    } else {
      setLoading(false);
    }

    return () => {
      isMounted = false;
    };
  }, [user?.uid, activeInstructorId, lang]);

  const handleDismiss = () => {
    setDismissed(true);
    sessionStorage.setItem("motivation_agent_dismissed", "true");
  };

  if (dismissed || loading || !rivalData) {
    return null;
  }

  const rankSuffixEn =
    rivalData.targetRank === 1
      ? "1st"
      : rivalData.targetRank === 2
      ? "2nd"
      : rivalData.targetRank === 3
      ? "3rd"
      : `${rivalData.targetRank}th`;

  const rankSuffixAr =
    rivalData.targetRank === 1
      ? "المركز الأول"
      : rivalData.targetRank === 2
      ? "المركز الثاني"
      : rivalData.targetRank === 3
      ? "المركز الثالث"
      : `المركز ${rivalData.targetRank}`;

  const studentName = user?.displayName?.split(" ")[0] || user?.username || "Motaz";

  return (
    <aside aria-label="Smart AI Motivation Coach" className="relative mb-6 rounded-2xl overflow-hidden glass-panel border-teal-400/30 p-4 sm:p-5 shadow-xl transition-all duration-300">
      {/* Ambient background glow */}
      <div className="absolute -top-12 -right-12 w-44 h-44 bg-gradient-to-br from-teal-500/15 via-sky-500/10 to-transparent rounded-full blur-2xl pointer-events-none" />
      <div className="absolute -bottom-10 -left-10 w-44 h-44 bg-gradient-to-tr from-rose-500/10 via-amber-500/10 to-transparent rounded-full blur-2xl pointer-events-none" />

      <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Left Side: Avatar/Badge & Dynamic Trigger Pitch */}
        <div className="flex items-start gap-3.5">
          <div className="h-11 w-11 rounded-2xl bg-gradient-to-tr from-teal-500 via-sky-500 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-teal-500/25 shrink-0 mt-0.5">
            {rivalData.isFirst ? (
              <Trophy className="h-6 w-6 text-amber-300 animate-bounce" />
            ) : (
              <Zap className="h-6 w-6 text-amber-300 animate-pulse" />
            )}
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-teal-500/15 border border-teal-400/30 text-[11px] font-extrabold text-teal-700 dark:text-teal-300">
                <Sparkles className="h-3 w-3 text-amber-400" />
                {lang === "ar" ? "وكيل التحفيز الذكي (AI Coach)" : "AI Proactive Coach"}
              </span>
              <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300">
                {lang === "ar"
                  ? `مركزك الحالي: #${rivalData.rank}`
                  : `Current Rank: #${rivalData.rank}`}
              </span>
            </div>

            <p className="text-sm font-bold text-slate-800 dark:text-slate-100 leading-snug">
              {rivalData.isFirst ? (
                lang === "ar" ? (
                  <>
                    عاش يا <span className="text-teal-600 dark:text-teal-400 font-black">{studentName}</span>! 🎉 أنت تتصدر المركز الأول في المنصة برصيد <span className="text-amber-500 font-black">{rivalData.points} نقطة</span>! أكمل التحديات اليومية لحماية الصدارة! 👑
                  </>
                ) : (
                  <>
                    Way to go <span className="text-teal-600 dark:text-teal-400 font-black">{studentName}</span>! 🎉 You are leading in 1st place with <span className="text-amber-500 font-black">{rivalData.points} pts</span>! Complete daily duels to defend your crown! 👑
                  </>
                )
              ) : (
                lang === "ar" ? (
                  <>
                    يا <span className="text-teal-600 dark:text-teal-400 font-black">{studentName}</span>! 🚀 يفصلك <span className="text-amber-600 dark:text-amber-400 font-black">{rivalData.gap} نقطة فقط</span> عن تجاوز <span className="text-sky-600 dark:text-sky-400 font-black">{rivalData.rivalName}</span> في لوحة الشرف لتنتزع <span className="text-emerald-600 dark:text-emerald-400 font-black">{rankSuffixAr}</span>!
                  </>
                ) : (
                  <>
                    Hey <span className="text-teal-600 dark:text-teal-400 font-black">{studentName}</span>! 🚀 You are only <span className="text-amber-600 dark:text-amber-400 font-black">{rivalData.gap} points</span> away from passing <span className="text-sky-600 dark:text-sky-400 font-black">{rivalData.rivalName}</span> on the Scoreboard to claim <span className="text-emerald-600 dark:text-emerald-400 font-black">{rankSuffixEn} place</span>!
                  </>
                )
              )}
            </p>
          </div>
        </div>

        {/* Right Side: Quick Action Pills + Dismiss */}
        <div className="flex flex-wrap items-center gap-2 self-end md:self-center shrink-0">
          <button
            type="button"
            onClick={() => navigate("/student/quizzes")}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-teal-500 to-sky-600 text-white text-xs font-bold shadow-md shadow-teal-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
          >
            <Zap className="h-3.5 w-3.5 text-amber-300" />
            <span>{lang === "ar" ? "اختبار سريع (3 دقائق)" : "3-Min Quiz"}</span>
          </button>

          <button
            type="button"
            onClick={() => navigate("/student/duels")}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 via-orange-500 to-rose-600 text-white text-xs font-black shadow-md shadow-amber-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
          >
            <Swords className="h-3.5 w-3.5 text-yellow-200" />
            <span>{lang === "ar" ? "سباق 1v1 المباشر 🏎️" : "Live 1v1 Race 🏎️"}</span>
          </button>

          <button
            type="button"
            onClick={() => navigate("/student/puzzles")}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-rose-500 to-purple-600 text-white text-xs font-bold shadow-md shadow-rose-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
          >
            <Swords className="h-3.5 w-3.5 text-yellow-300" />
            <span>{lang === "ar" ? "معركة روبوت الذكاء" : "AI Boss Duel"}</span>
          </button>

          <button
            type="button"
            onClick={handleDismiss}
            title={lang === "ar" ? "إخفاء التنبيه" : "Dismiss"}
            className="p-1.5 rounded-xl bg-white/85 hover:bg-white text-slate-700 hover:text-rose-600 dark:bg-white/10 dark:hover:bg-white/20 dark:text-slate-200 dark:hover:text-rose-300 border border-slate-300/80 dark:border-white/15 shadow-sm transition-all hover:scale-105 active:scale-95 cursor-pointer"
            aria-label={lang === "ar" ? "إخفاء التنبيه" : "Dismiss"}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
