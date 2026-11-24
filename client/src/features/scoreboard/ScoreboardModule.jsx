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
  listUsers,
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
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      listCourses(),
      listActiveInstructors(),
      listResults(),
      listAssignments(),
      listUsers("student"),
    ])
      .then(([crs, insts, res, assign, stList]) => {
        setCourses(crs);
        setInstructors(insts);
        setResults(res);
        setAssignments(assign);
        setStudents(stList || []);
      })
      .finally(() => setLoading(false));
  }, []);

  const visibleCourses = useMemo(() => {
    if (mode === "instructor") {
      return courses.filter((c) => c.instructorId === user?.uid);
    }
    if (mode === "student") {
      return courses.filter((c) => {
        const matchesInst = activeInstructorId ? c.instructorId === activeInstructorId : true;
        const isEnrolled = Array.isArray(c.enrolledStudents) && c.enrolledStudents.includes(user?.uid);
        return matchesInst && isEnrolled;
      });
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

      // Also ensure all enrolled students are registered in the board
      (course.enrolledStudents || []).forEach((sid) => {
        const found = students.find((s) => s.uid === sid);
        ensureStudent(sid, found?.displayName || found?.username || found?.email || sid);
      });

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

      const allRanked = Object.values(studentMap)
        .map((st) => ({
          ...st,
          totalPoints: st.quizPoints + st.assignmentPoints,
        }))
        .sort((a, b) => {
          if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
          if (b.quizPoints !== a.quizPoints) return b.quizPoints - a.quizPoints;
          if (b.quizCount !== a.quizCount) return b.quizCount - a.quizCount;
          return a.studentName.localeCompare(b.studentName);
        });

      const top3 = allRanked.slice(0, 3);
      const restOfStudents = allRanked.slice(3);

      const inst = instructors.find((i) => i.uid === course.instructorId);
      const instructorName =
        inst?.displayName || course.instructorName || inst?.email || "Platform Instructor";

      return {
        course,
        instructorName,
        allRanked,
        top3,
        restOfStudents,
      };
    });
  }, [visibleCourses, results, assignments, instructors, students]);

  const handleDownloadCertificate = (rank, entry, course, instructorName) => {
    if (!canPrintCertificates) return;
    const courseTitle =
      course.title?.en ||
      course.title?.[lang] ||
      (lang === "ar" ? "مقرر أثر التعليمي" : "Athar Educational Course");
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
                ? "لوحة المتصدرين وترتيب الطلاب"
                : "Course Scoreboard & Student Standings"}
            </h1>
            <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
              {canPrintCertificates
                ? lang === "ar"
                  ? "الترتيب حسب مجموع النقاط — منصة تتويج Top 3 مع شهادات PDF، وجدول منظم لباقي طلاب المقرر"
                  : "Ranked by total earned points — Top 3 podium with PDF certificates, and arranged standings table for the rest of students"
                : lang === "ar"
                ? "ترتيب الطلاب وفقاً لمجموع النقاط المكتسبة في الاختبارات والواجبات"
                : "Learners ranked by earned points across quizzes and assignments"}
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
        <div className="glass-card p-10 text-center text-sm text-slate-500 space-y-1">
          <Trophy className="h-8 w-8 mx-auto text-amber-500/60 mb-2" />
          <div className="font-bold">
            {mode === "student"
              ? lang === "ar"
                ? "لا توجد لوحات متصدرين للمقررات المسجل بها حالياً."
                : "No scoreboards available for your enrolled courses."
              : lang === "ar"
              ? "لا توجد مقررات متاحة للعرض حالياً."
              : "No courses available to display yet."}
          </div>
          {mode === "student" && (
            <p className="text-xs text-slate-400">
              {lang === "ar"
                ? "سجّل في مقررات المحاضر أولاً من صفحة المقررات للمنافسة في لوحة المتصدرين."
                : "Enroll in instructor courses from the Courses tab to compete on their leaderboards."}
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-8">
          {courseBoards.map(({ course, instructorName, allRanked, top3, restOfStudents }) => {
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
                    {allRanked.length} {lang === "ar" ? "طلاب في الترتيب" : "Ranked Students"}
                  </span>
                </div>

                {allRanked.length === 0 ? (
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

                    {/* Rest of Students Standings Table (Rank #4 and below) */}
                    {restOfStudents.length > 0 ? (
                      <div className="space-y-3 pt-4 border-t border-white/40 dark:border-white/10">
                        <div className="flex flex-wrap items-center justify-between gap-2 px-1">
                          <div className="flex items-center gap-2">
                            <span className="h-6 px-2 rounded-lg bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 font-extrabold text-xs flex items-center justify-center">
                              #4+
                            </span>
                            <div>
                              <div className="font-extrabold text-sm text-slate-900 dark:text-white">
                                {lang === "ar"
                                  ? "جدول ترتيب باقي الطلاب (المركز الرابع فما فوق)"
                                  : "Rest of Students Standings (Rank #4 & below)"}
                              </div>
                              <div className="text-[10.5px] text-slate-500 dark:text-slate-400">
                                {lang === "ar"
                                  ? `عرض ${restOfStudents.length} طلاب مرتبين حسب مجموع النقاط المكتسبة`
                                  : `Arranged table of ${restOfStudents.length} learners ordered by total earned points`}
                              </div>
                            </div>
                          </div>
                          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-white/70 dark:bg-slate-900/60 border border-slate-200/80 dark:border-white/10 text-slate-700 dark:text-slate-300 shadow-sm">
                            {restOfStudents.length} {lang === "ar" ? "طالب في الجدول" : "Students"}
                          </span>
                        </div>

                        {/* Arranged Table */}
                        <div className="rounded-2xl border border-slate-200/90 dark:border-white/10 overflow-hidden bg-white/70 dark:bg-slate-900/50 shadow-sm">
                          <div className="overflow-x-auto">
                            <table className="w-full text-xs text-start">
                              <thead className="bg-slate-100/90 dark:bg-white/5 uppercase font-bold text-slate-600 dark:text-slate-300 border-b border-slate-200 dark:border-white/10">
                                <tr>
                                  <th className="px-4 py-3 text-start w-16">
                                    {lang === "ar" ? "الترتيب" : "Rank"}
                                  </th>
                                  <th className="px-4 py-3 text-start">
                                    {lang === "ar" ? "الطالب" : "Student"}
                                  </th>
                                  <th className="px-4 py-3 text-center">
                                    {lang === "ar" ? "نقاط الاختبارات" : "Quiz Pts"}
                                  </th>
                                  <th className="px-4 py-3 text-center">
                                    {lang === "ar" ? "نقاط الواجبات" : "Assignment Pts"}
                                  </th>
                                  <th className="px-4 py-3 text-end">
                                    {lang === "ar" ? "مجموع النقاط" : "Total Points"}
                                  </th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                                {restOfStudents.map((entry, idx) => {
                                  const rank = idx + 4;
                                  const isMe = user?.uid && entry.studentId === user.uid;
                                  return (
                                    <tr
                                      key={entry.studentId}
                                      className={`hover:bg-indigo-50/50 dark:hover:bg-white/5 transition-colors ${
                                        isMe ? "bg-sky-50/80 dark:bg-sky-950/30 font-bold" : ""
                                      }`}
                                    >
                                      {/* Rank */}
                                      <td className="px-4 py-3">
                                        <span className="inline-flex items-center justify-center h-7 w-7 rounded-xl bg-slate-200/90 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-extrabold text-xs shadow-sm">
                                          #{rank}
                                        </span>
                                      </td>

                                      {/* Student Identity */}
                                      <td className="px-4 py-3">
                                        <div className="flex items-center gap-2.5 min-w-0">
                                          <div className="h-8 w-8 rounded-full bg-gradient-to-br from-indigo-500 via-purple-500 to-sky-500 text-white font-bold text-[11px] flex items-center justify-center shrink-0 shadow-sm">
                                            {getInitials(entry.studentName)}
                                          </div>
                                          <div className="min-w-0">
                                            <div className="font-bold text-slate-900 dark:text-white truncate flex items-center gap-1.5">
                                              <span>{entry.studentName}</span>
                                              {isMe && (
                                                <span className="px-1.5 py-0.5 rounded-full bg-sky-500/20 text-[9.5px] font-extrabold text-sky-600 dark:text-sky-300">
                                                  {lang === "ar" ? "أنت" : "YOU"}
                                                </span>
                                              )}
                                            </div>
                                          </div>
                                        </div>
                                      </td>

                                      {/* Quiz Points */}
                                      <td className="px-4 py-3 text-center text-slate-700 dark:text-slate-300">
                                        <span className="font-bold">
                                          {entry.quizPoints} {lang === "ar" ? "ن" : "pts"}
                                        </span>
                                        <span className="text-[10px] text-slate-400 ms-1">
                                          ({entry.quizCount} {lang === "ar" ? "اختبار" : "quizzes"})
                                        </span>
                                      </td>

                                      {/* Assignment Points */}
                                      <td className="px-4 py-3 text-center text-slate-700 dark:text-slate-300">
                                        <span className="font-bold">
                                          {entry.assignmentPoints} {lang === "ar" ? "ن" : "pts"}
                                        </span>
                                        <span className="text-[10px] text-slate-400 ms-1">
                                          ({entry.assignmentCount} {lang === "ar" ? "واجب" : "assign"})
                                        </span>
                                      </td>

                                      {/* Total Points */}
                                      <td className="px-4 py-3 text-end">
                                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-950/60 dark:to-purple-950/60 border border-indigo-200/90 dark:border-indigo-800/80 font-extrabold text-xs text-indigo-700 dark:text-indigo-300 shadow-sm">
                                          <Award className="h-3.5 w-3.5 text-indigo-500" />
                                          <span>
                                            {entry.totalPoints} {lang === "ar" ? "نقطة" : "pts"}
                                          </span>
                                        </span>
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="pt-3 border-t border-white/40 dark:border-white/10 text-center text-xs text-slate-400 py-3">
                        {lang === "ar"
                          ? "جميع طلاب هذا المقرر متواجدون في منصة التتويج الثلاثية أعلاه."
                          : "All ranked students for this course are currently on the top 3 podium."}
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
