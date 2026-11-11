import { useEffect, useMemo, useState } from "react";
import { Award, BarChart3, BookOpen, Printer, Star, Trophy, UserCheck } from "lucide-react";
import toast from "react-hot-toast";
import { useAuth } from "../../context/AuthContext";
import { useLang } from "../../context/LangContext";
import {
  listActiveInstructors,
  listAssignments,
  listCourses,
  listResults,
} from "../../services/platformService";
import { generateTop3CertificatePdf } from "../../utils/certificateGenerator";

const MEDAL_CONFIG = {
  1: {
    num: "1",
    suffix: "st",
    pillarGradient:
      "bg-gradient-to-b from-amber-300/55 via-yellow-400/35 to-amber-500/30 dark:from-amber-400/35 dark:via-yellow-500/20 dark:to-amber-600/20 border-amber-300/80 dark:border-amber-400/50 shadow-amber-500/20",
    avatarGradient: "from-pink-500 via-rose-500 to-amber-500",
    ribbonBg: "bg-gradient-to-b from-amber-300 to-amber-500 border-amber-200 text-amber-950",
    starColor: "text-amber-600 dark:text-amber-300 fill-amber-500 dark:fill-amber-300",
    dividerColor: "via-amber-500/50",
    btnClass:
      "bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 shadow-lg shadow-amber-500/25",
    certLabelEn: "Gold Certificate PDF",
    certLabelAr: "شهادة ذهبية PDF",
    heightClass: "md:min-h-[270px]",
    orderClass: "order-1 md:order-2",
  },
  2: {
    num: "2",
    suffix: "nd",
    pillarGradient:
      "bg-gradient-to-b from-slate-200/70 via-indigo-200/40 to-slate-300/45 dark:from-slate-500/35 dark:via-indigo-500/20 dark:to-slate-600/25 border-slate-300/80 dark:border-indigo-300/40 shadow-indigo-500/15",
    avatarGradient: "from-violet-600 via-purple-600 to-indigo-600",
    ribbonBg: "bg-gradient-to-b from-slate-200 to-slate-400 border-white/80 text-slate-800",
    starColor: "text-indigo-500 dark:text-indigo-300 fill-indigo-400 dark:fill-indigo-300",
    dividerColor: "via-slate-400/50",
    btnClass:
      "bg-gradient-to-r from-indigo-500 to-slate-600 hover:from-indigo-600 hover:to-slate-700 text-white shadow-lg shadow-indigo-500/25",
    certLabelEn: "Silver Certificate PDF",
    certLabelAr: "شهادة فضية PDF",
    heightClass: "md:min-h-[234px]",
    orderClass: "order-2 md:order-1",
  },
  3: {
    num: "3",
    suffix: "rd",
    pillarGradient:
      "bg-gradient-to-b from-orange-300/55 via-amber-400/35 to-orange-500/30 dark:from-orange-500/35 dark:via-amber-600/20 dark:to-rose-500/20 border-orange-300/75 dark:border-orange-400/45 shadow-orange-500/20",
    avatarGradient: "from-emerald-600 via-teal-600 to-cyan-600",
    ribbonBg: "bg-gradient-to-b from-orange-300 to-orange-600 border-orange-200 text-white",
    starColor: "text-orange-600 dark:text-orange-300 fill-orange-500 dark:fill-orange-300",
    dividerColor: "via-orange-500/50",
    btnClass:
      "bg-gradient-to-r from-teal-600 to-orange-600 hover:from-teal-700 hover:to-orange-700 text-white shadow-lg shadow-teal-500/25",
    certLabelEn: "Bronze Certificate PDF",
    certLabelAr: "شهادة برونزية PDF",
    heightClass: "md:min-h-[208px]",
    orderClass: "order-3 md:order-3",
  },
};

function getInitials(name) {
  const parts = String(name || "ST")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) return "ST";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

function getQuizEarnedPoints(r) {
  if (r.points !== undefined && r.points !== null) return Number(r.points) || 0;
  const totalQ = Number(r.total) || 1;
  const pct = Number(r.score) || 0;
  return Math.round((pct / 100) * totalQ);
}

export default function ScoreboardModule({ mode = "admin", activeInstructorId = null }) {
  const { user } = useAuth();
  const { lang } = useLang();
  const canPrintCertificates = mode === "instructor" || mode === "admin";

  const [courses, setCourses] = useState([]);
  const [instructors, setInstructors] = useState([]);
  const [results, setResults] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([listCourses(), listActiveInstructors(), listResults(), listAssignments()])
      .then(([crs, insts, res, assign]) => {
        setCourses(crs);
        setInstructors(insts);
        setResults(res);
        setAssignments(assign);
      })
      .finally(() => setLoading(false));
  }, []);

  const visibleCourses = useMemo(() => {
    if (mode === "instructor") {
      return courses.filter((c) => c.instructorId === user?.uid);
    }
    if (mode === "student" && activeInstructorId) {
      return courses.filter((c) => c.instructorId === activeInstructorId);
    }
    return courses;
  }, [courses, mode, user?.uid, activeInstructorId]);

  const courseBoards = useMemo(() => {
    return visibleCourses.map((course) => {
      const studentMap = {};

      const ensureStudent = (sid, sname) => {
        if (!studentMap[sid]) {
          studentMap[sid] = {
            studentId: sid,
            studentName: sname || sid,
            quizPoints: 0,
            quizCount: 0,
            assignmentPoints: 0,
            assignmentCount: 0,
          };
        } else if (sname && studentMap[sid].studentName === sid) {
          studentMap[sid].studentName = sname;
        }
        return studentMap[sid];
      };

      // Quiz results contribute integer earned points (1, 2, 3, 4, 5, 6...)
      results
        .filter((r) => r.courseId === course.id)
        .forEach((r) => {
          const entry = ensureStudent(r.studentId, r.studentName);
          entry.quizPoints += getQuizEarnedPoints(r);
          entry.quizCount += 1;
        });

      // Graded assignment submissions contribute points
      assignments
        .filter((a) => a.courseId === course.id)
        .forEach((a) => {
          (a.submissions || []).forEach((sub) => {
            if (sub.score !== undefined && sub.score !== null && sub.score !== "") {
              const sid = sub.studentId || sub.id;
              const entry = ensureStudent(sid, sub.studentName);
              entry.assignmentPoints += Number(sub.score) || 0;
              entry.assignmentCount += 1;
            }
          });
        });

      const ranked = Object.values(studentMap)
        .map((st) => ({
          ...st,
          totalPoints: st.quizPoints + st.assignmentPoints,
        }))
        .sort((a, b) => {
          if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
          if (b.quizPoints !== a.quizPoints) return b.quizPoints - a.quizPoints;
          if (b.quizCount !== a.quizCount) return b.quizCount - a.quizCount;
          return a.studentName.localeCompare(b.studentName);
        })
        .slice(0, 5);

      const inst = instructors.find((i) => i.uid === course.instructorId);
      const instructorName =
        inst?.displayName || course.instructorName || inst?.email || "Platform Instructor";

      return {
        course,
        instructorName,
        top5: ranked,
      };
    });
  }, [visibleCourses, results, assignments, instructors]);

  const handleDownloadCertificate = (rank, entry, course, instructorName) => {
    if (!canPrintCertificates) return;
    const courseTitle = course.title?.en || course.title?.[lang] || "AI Training Course";
    generateTop3CertificatePdf({
      rank,
      studentName: entry.studentName,
      courseTitle,
      instructorName,
      totalPoints: entry.totalPoints,
      quizPoints: entry.quizPoints,
      assignmentPoints: entry.assignmentPoints,
    });
    toast.success(
      lang === "ar"
        ? `تم تنزيل الشهادة للمركز #${rank} (${entry.studentName})`
        : `Downloaded Rank #${rank} certificate for ${entry.studentName}`
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="glass-panel rounded-[26px] p-4 sm:p-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className="h-10 w-10 sm:h-11 sm:w-11 rounded-2xl bg-gradient-to-br from-amber-500 via-orange-500 to-rose-500 text-white flex items-center justify-center shadow-lg shadow-amber-500/25 shrink-0">
            <BarChart3 className="h-5 w-5 sm:h-6 sm:w-6" />
          </div>
          <div className="min-w-0">
            <h1 className="text-lg sm:text-xl font-black truncate">
              {lang === "ar"
                ? "لوحة المتصدرين (أفضل 5 طلاب)"
                : "Course Score Board — Top 5"}
            </h1>
            <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
              {canPrintCertificates
                ? lang === "ar"
                  ? "الترتيب حسب مجموع النقاط (1، 2، 3...) في الاختبارات والواجبات — طباعة شهادات PDF للمراكز الثلاثة الأولى فقط"
                  : "Ranked by total earned points (1, 2, 3...) across quizzes & assignments — Print PDF Certificates exclusively for Top 3"
                : lang === "ar"
                ? "الترتيب حسب مجموع النقاط (1، 2، 3...) في الاختبارات والواجبات"
                : "Ranked by total earned points (1, 2, 3...) across quizzes & assignments"}
            </p>
          </div>
        </div>
        {canPrintCertificates && (
          <div className="flex items-center gap-2 text-xs font-bold">
            <span className="px-3 py-1.5 rounded-full bg-amber-500/15 border border-amber-400/40 text-amber-700 dark:text-amber-300 flex items-center gap-1.5">
              <Trophy className="h-3.5 w-3.5" />
              {lang === "ar" ? "شهادات Top 3" : "Top 3 Certificates"}
            </span>
          </div>
        )}
      </div>

      {loading ? (
        <div className="glass-card p-10 text-center text-sm text-slate-500">
          {lang === "ar" ? "جاري تحميل لوحة المتصدرين..." : "Loading scoreboard..."}
        </div>
      ) : courseBoards.length === 0 ? (
        <div className="glass-card p-10 text-center text-sm text-slate-500">
          {lang === "ar"
            ? "لا توجد مقررات متاحة للعرض حالياً."
            : "No courses available to display yet."}
        </div>
      ) : (
        <div className="space-y-8">
          {courseBoards.map(({ course, instructorName, top5 }) => {
            const top3 = top5.slice(0, 3);
            const rest = top5.slice(3, 5);
            const podiumOrder = [
              { rank: 2, entry: top3[1] || null },
              { rank: 1, entry: top3[0] || null },
              { rank: 3, entry: top3[2] || null },
            ];

            return (
              <section key={course.id} className="glass-card p-5 sm:p-7 space-y-6">
                {/* Course Banner */}
                <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-white/40 dark:border-white/10">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-sky-500/15 text-sky-600 dark:text-sky-300 flex items-center justify-center border border-sky-400/30">
                      <BookOpen className="h-5 w-5" />
                    </div>
                    <div>
                      <h2 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white">
                        {course.title?.[lang] || course.title?.en || course.id}
                      </h2>
                      <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                        <UserCheck className="h-3.5 w-3.5 text-indigo-500" />
                        <span>{instructorName}</span>
                      </div>
                    </div>
                  </div>
                  <span className="px-3 py-1 rounded-full glass-subtle text-xs font-bold text-sky-700 dark:text-sky-300">
                    {top5.length} / 5 {lang === "ar" ? "طلاب مصنفون" : "Ranked Learners"}
                  </span>
                </div>

                {top5.length === 0 ? (
                  <div className="py-10 text-center text-xs text-slate-500">
                    {lang === "ar"
                      ? "لم يُسجل أي طالب نقاطاً في هذا المقرر بعد."
                      : "No student points recorded in this course yet."}
                  </div>
                ) : (
                  <>
                    {/* Stepped 3-Pillar Liquid-Glass Podium (2nd Left, 1st Center, 3rd Right) */}
                    <div className="grid grid-cols-1 md:grid-cols-3 items-end gap-5 pt-12 pb-2">
                      {podiumOrder.map(({ rank, entry }) => {
                        const cfg = MEDAL_CONFIG[rank];
                        const isMe = entry && user?.uid && entry.studentId === user.uid;

                        return (
                          <div
                            key={rank}
                            className={`relative rounded-3xl border backdrop-blur-2xl pt-12 pb-5 px-4 text-center flex flex-col justify-between transition-all duration-300 hover:-translate-y-1.5 shadow-xl ${cfg.pillarGradient} ${cfg.heightClass} ${cfg.orderClass} ${
                              !entry ? "opacity-55" : ""
                            } ${isMe ? "ring-2 ring-sky-400 ring-offset-2 ring-offset-transparent" : ""}`}
                          >
                            {/* Top Floating Star Ribbon + Overlapping Circular Avatar */}
                            <div className="absolute -top-9 left-1/2 -translate-x-1/2 flex flex-col items-center">
                              <div
                                className={`h-7 w-7 rounded-full border-2 shadow-md flex items-center justify-center -mb-2 z-10 ${cfg.ribbonBg}`}
                              >
                                <Star className="h-3.5 w-3.5 fill-current" />
                              </div>
                              <div
                                className={`h-14 w-14 rounded-full bg-gradient-to-br ${cfg.avatarGradient} text-white font-extrabold text-lg flex items-center justify-center shadow-lg ring-4 ring-white/75 dark:ring-slate-900/75`}
                              >
                                {entry ? getInitials(entry.studentName) : "—"}
                              </div>
                            </div>

                            {/* Rank Ordinal & Student Identity */}
                            <div className="space-y-1.5 mt-1">
                              <div className="text-3xl font-black tracking-tight text-slate-900 dark:text-white leading-none">
                                {cfg.num}
                                <sup className="text-sm font-bold ms-0.5">{cfg.suffix}</sup>
                              </div>

                              {entry ? (
                                <>
                                  <div className="font-bold text-sm text-slate-900 dark:text-white truncate px-1">
                                    {entry.studentName}
                                    {isMe && (
                                      <span className="ms-1.5 px-1.5 py-0.5 rounded-full bg-sky-500/25 text-[10px] font-extrabold text-sky-700 dark:text-sky-200">
                                        {lang === "ar" ? "أنت" : "YOU"}
                                      </span>
                                    )}
                                  </div>
                                  <div className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-white/60 dark:bg-slate-900/50 border border-white/60 dark:border-white/15 text-xs font-extrabold text-slate-900 dark:text-white shadow-sm">
                                    <Award className="h-3.5 w-3.5 text-sky-600 dark:text-sky-300" />
                                    {entry.totalPoints} {lang === "ar" ? "نقطة" : "pts"}
                                  </div>
                                  <div className="text-[11px] font-medium text-slate-700 dark:text-slate-200/80">
                                    {lang === "ar" ? "اختبارات" : "Quiz"}: {entry.quizPoints}{" "}
                                    {lang === "ar" ? "ن" : "pts"} ·{" "}
                                    {lang === "ar" ? "واجبات" : "Assign"}: {entry.assignmentPoints}{" "}
                                    {lang === "ar" ? "ن" : "pts"}
                                  </div>
                                </>
                              ) : (
                                <div className="text-xs text-slate-500 dark:text-slate-400 py-3">
                                  {lang === "ar" ? "بانتظار طالب" : "Open podium slot"}
                                </div>
                              )}
                            </div>

                            {/* Star Divider + Top-3 Only PDF Certificate Button */}
                            <div className="mt-4 space-y-3">
                              <div className="flex items-center justify-center gap-2">
                                <span
                                  className={`h-px w-8 bg-gradient-to-r from-transparent ${cfg.dividerColor} to-transparent`}
                                />
                                <Star className={`h-4 w-4 ${cfg.starColor}`} />
                                <span
                                  className={`h-px w-8 bg-gradient-to-r from-transparent ${cfg.dividerColor} to-transparent`}
                                />
                              </div>

                              {entry && canPrintCertificates && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleDownloadCertificate(rank, entry, course, instructorName)
                                  }
                                  className={`w-full py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-transform active:scale-95 ${cfg.btnClass}`}
                                >
                                  <Printer className="h-3.5 w-3.5" />
                                  {lang === "ar" ? cfg.certLabelAr : cfg.certLabelEn}
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* #4 and #5 Runner-Up Rows (NO Certificate PDF Button — Top 3 Only) */}
                    {rest.length > 0 && (
                      <div className="space-y-2 pt-2 border-t border-white/40 dark:border-white/10">
                        <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 px-1">
                          {lang === "ar" ? "المراكز #4 و #5" : "Top 5 Runners-Up (#4 & #5)"}
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {rest.map((entry, idx) => {
                            const rank = idx + 4;
                            const isMe = user?.uid && entry.studentId === user.uid;
                            return (
                              <div
                                key={entry.studentId}
                                className={`glass-subtle rounded-2xl px-4 py-3 flex items-center justify-between gap-3 ${
                                  isMe ? "ring-1 ring-sky-400" : ""
                                }`}
                              >
                                <div className="flex items-center gap-3 min-w-0">
                                  <span className="h-8 w-8 rounded-xl bg-slate-500/15 dark:bg-white/10 text-xs font-extrabold flex items-center justify-center text-slate-700 dark:text-slate-200 shrink-0">
                                    #{rank}
                                  </span>
                                  <div className="h-9 w-9 rounded-full bg-gradient-to-br from-sky-500 to-indigo-500 text-white font-bold text-xs flex items-center justify-center shrink-0">
                                    {getInitials(entry.studentName)}
                                  </div>
                                  <div className="min-w-0">
                                    <div className="font-bold text-sm truncate text-slate-900 dark:text-white">
                                      {entry.studentName}
                                      {isMe && (
                                        <span className="ms-1.5 px-1.5 py-0.5 rounded-full bg-sky-500/20 text-[10px] font-bold text-sky-600 dark:text-sky-300">
                                          {lang === "ar" ? "أنت" : "YOU"}
                                        </span>
                                      )}
                                    </div>
                                    <div className="text-[11px] text-slate-500 dark:text-slate-400">
                                      {lang === "ar" ? "اختبارات" : "Quiz"}: {entry.quizPoints}{" "}
                                      {lang === "ar" ? "ن" : "pts"} ·{" "}
                                      {lang === "ar" ? "واجبات" : "Assign"}:{" "}
                                      {entry.assignmentPoints} {lang === "ar" ? "ن" : "pts"}
                                    </div>
                                  </div>
                                </div>
                                <span className="px-3 py-1 rounded-full bg-sky-500/15 border border-sky-400/30 text-sky-700 dark:text-sky-300 text-xs font-extrabold shrink-0">
                                  {entry.totalPoints} {lang === "ar" ? "نقطة" : "pts"}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
