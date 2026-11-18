import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Activity,
  Award,
  CalendarRange,
  CheckCircle2,
  ClipboardCheck,
  ClipboardList,
  Download,
  FileText,
  KeyRound,
  Sparkles,
  TrendingUp,
  User,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import toast from "react-hot-toast";
import { useAuth } from "../../context/AuthContext";
import { useLang } from "../../context/LangContext";
import {
  listAssignments,
  listCourses,
  listQuizAccess,
  listQuizzes,
  listResults,
  listUsers,
} from "../../services/platformService";
import { generateStudentProgressReportPdf } from "../../utils/progressReportGenerator";

function formatDateInput(dateObj) {
  const y = dateObj.getFullYear();
  const m = String(dateObj.getMonth() + 1).padStart(2, "0");
  const d = String(dateObj.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function getQuizEarnedPoints(r) {
  if (r.points !== undefined && r.points !== null) return Number(r.points) || 0;
  const totalQ = Number(r.total) || 1;
  const pct = Number(r.score) || 0;
  return Math.round((pct / 100) * totalQ);
}

export default function StudentProgressTrackerModule() {
  const { user } = useAuth();
  const { lang } = useLang();
  const [searchParams] = useSearchParams();
  const queryStudentId = searchParams.get("studentId") || "";

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({
    students: [],
    courses: [],
    assignments: [],
    quizzes: [],
    results: [],
    quizAccess: {},
  });

  const [selectedStudentId, setSelectedStudentId] = useState(queryStudentId);
  const [fromDate, setFromDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return formatDateInput(d);
  });
  const [toDate, setToDate] = useState(() => formatDateInput(new Date()));
  const [typeFilter, setTypeFilter] = useState("all");

  useEffect(() => {
    if (!user?.uid) return;
    Promise.all([
      listUsers("student"),
      listCourses(user.uid),
      listAssignments(),
      listQuizzes(),
      listResults(),
      listQuizAccess(),
    ])
      .then(([allStudents, myCourses, allAssn, allQuizzes, allResults, accessMap]) => {
        const myCourseIds = myCourses.map((c) => c.id);
        const myAssn = allAssn.filter(
          (a) => a.instructorId === user.uid || myCourseIds.includes(a.courseId)
        );
        const myQuizzes = allQuizzes.filter(
          (q) => q.instructorId === user.uid || myCourseIds.includes(q.courseId)
        );
        const myResults = allResults.filter(
          (r) => r.instructorId === user.uid || myCourseIds.includes(r.courseId)
        );

        const activeStudentIds = new Set();
        allStudents.forEach((s) => {
          if (Array.isArray(s.instructorIds) && s.instructorIds.includes(user.uid)) {
            activeStudentIds.add(s.uid);
          }
        });
        myCourses.forEach((c) => (c.enrolledStudents || []).forEach((sid) => activeStudentIds.add(sid)));
        myResults.forEach((r) => activeStudentIds.add(r.studentId));
        myAssn.forEach((a) =>
          (a.submissions || []).forEach((sub) => activeStudentIds.add(sub.studentId || sub.id))
        );

        const eligibleStudents = allStudents
          .filter((s) => activeStudentIds.has(s.uid))
          .sort((a, b) =>
            (a.displayName || a.email || "").localeCompare(b.displayName || b.email || "")
          );

        setData({
          students: eligibleStudents,
          courses: myCourses,
          assignments: myAssn,
          quizzes: myQuizzes,
          results: myResults,
          quizAccess: accessMap || {},
        });
        if (eligibleStudents.length > 0) {
          setSelectedStudentId((prev) =>
            prev && eligibleStudents.some((s) => s.uid === prev) ? prev : eligibleStudents[0].uid
          );
        }
      })
      .finally(() => setLoading(false));
  }, [user?.uid]);

  const applyPreset = (preset) => {
    const now = new Date();
    if (preset === "7d") {
      const start = new Date();
      start.setDate(now.getDate() - 7);
      setFromDate(formatDateInput(start));
      setToDate(formatDateInput(now));
    } else if (preset === "30d") {
      const start = new Date();
      start.setDate(now.getDate() - 30);
      setFromDate(formatDateInput(start));
      setToDate(formatDateInput(now));
    } else if (preset === "month") {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      setFromDate(formatDateInput(start));
      setToDate(formatDateInput(now));
    } else {
      setFromDate("");
      setToDate("");
    }
  };

  const selectedStudent = useMemo(
    () => data.students.find((s) => s.uid === selectedStudentId) || null,
    [data.students, selectedStudentId]
  );

  const { allLogs, filteredLogs, summary, courseBreakdown, chartData } = useMemo(() => {
    if (!selectedStudentId) {
      return {
        allLogs: [],
        filteredLogs: [],
        summary: {
          totalPoints: 0,
          quizPoints: 0,
          assignmentPoints: 0,
          quizCount: 0,
          assignmentCount: 0,
          gradedAssignments: 0,
          avgQuizPct: 0,
          passRate: 0,
        },
        courseBreakdown: [],
        chartData: [],
      };
    }

    const fromMs = fromDate ? new Date(`${fromDate}T00:00:00`).getTime() : null;
    const toMs = toDate ? new Date(`${toDate}T23:59:59.999`).getTime() : null;
    const inInterval = (ts) => {
      if (!ts) return true;
      if (fromMs !== null && ts < fromMs) return false;
      if (toMs !== null && ts > toMs) return false;
      return true;
    };

    const getCourseTitle = (cid) => {
      const c = data.courses.find((cr) => cr.id === cid);
      return c?.title?.[lang] || c?.title?.en || cid || "Course";
    };

    const collected = [];

    // 1. Quiz Attempts & Earned Points
    data.results
      .filter((r) => r.studentId === selectedStudentId && inInterval(r.submittedAt))
      .forEach((r) => {
        const pts = getQuizEarnedPoints(r);
        const tot = Number(r.total) || pts || 1;
        const pct = Number(r.score) || 0;
        const pass = pct >= 60;
        collected.push({
          id: `quiz_${r.id}`,
          category: "quiz",
          typeLabel: "Quiz Grade",
          typeLabelAr: "درجة اختبار",
          timestamp: r.submittedAt || 0,
          courseId: r.courseId || "",
          courseTitle: getCourseTitle(r.courseId),
          title: r.quizTitle || r.quizId,
          statusBadge: pass ? "PASS" : "REVIEW",
          pointsEarned: pts,
          pointsDisplay: `+${pts}/${tot} pts`,
          pct,
          details: r.aiFeedback
            ? `Score: ${pts}/${tot} pts (${pct}%). AI Feedback: ${r.aiFeedback}`
            : `Score: ${pts}/${tot} pts (${pct}%).`,
        });
      });

    // 2. Assignment Submissions & Marks
    data.assignments.forEach((a) => {
      const sub = (a.submissions || []).find(
        (s) => (s.studentId || s.id) === selectedStudentId
      );
      if (!sub) return;
      const activityTs = sub.gradedAt || sub.submittedAt || 0;
      if (!inInterval(activityTs) && !inInterval(sub.submittedAt)) return;

      const isGraded =
        sub.score !== undefined && sub.score !== null && sub.score !== "";
      const pts = isGraded ? Number(sub.score) || 0 : 0;
      const submittedStr = sub.submittedAt
        ? new Date(sub.submittedAt).toLocaleString()
        : "";
      const gradedStr = sub.gradedAt
        ? new Date(sub.gradedAt).toLocaleString()
        : "";

      const detailParts = [];
      if (submittedStr) detailParts.push(`Submitted: ${submittedStr}`);
      if (gradedStr) detailParts.push(`Graded: ${gradedStr}`);
      if (sub.answerText) detailParts.push(`Work: ${sub.answerText}`);
      if (sub.feedback) detailParts.push(`Instructor Note: ${sub.feedback}`);

      collected.push({
        id: `assign_${a.id}_${selectedStudentId}`,
        category: "assignment",
        typeLabel: "Assignment",
        typeLabelAr: "واجب",
        timestamp: activityTs,
        courseId: a.courseId || "",
        courseTitle: getCourseTitle(a.courseId),
        title: a.title || "Assignment",
        statusBadge: isGraded ? "GRADED" : "SUBMITTED",
        pointsEarned: pts,
        pointsDisplay: isGraded ? `+${pts} pts` : "Pending",
        isGraded,
        details: detailParts.join(" · "),
      });
    });

    // 3. Quiz Access & Retake Requests
    const myQuizMap = {};
    data.quizzes.forEach((q) => {
      myQuizMap[q.id] = q;
    });

    Object.entries(data.quizAccess || {}).forEach(([quizId, stuMap]) => {
      const access = stuMap?.[selectedStudentId];
      const qz = myQuizMap[quizId];
      if (!access || (!qz && access.instructorId !== user?.uid)) return;

      const cId = qz?.courseId || access.courseId || "";
      const qTitle = qz?.title || access.quizTitle || quizId;

      if (access.enteredAt && inInterval(access.enteredAt)) {
        collected.push({
          id: `access_enter_${quizId}_${access.enteredAt}`,
          category: "access",
          typeLabel: "Quiz Entry",
          typeLabelAr: "دخول اختبار",
          timestamp: access.enteredAt,
          courseId: cId,
          courseTitle: getCourseTitle(cId),
          title: qTitle,
          statusBadge: "ENTERED",
          pointsEarned: 0,
          pointsDisplay: "",
          details: "Student opened and started quiz session.",
        });
      }

      if (access.requestedAt && inInterval(access.requestedAt)) {
        const rs = String(access.retakeStatus || "pending").toUpperCase();
        collected.push({
          id: `access_retake_${quizId}_${access.requestedAt}`,
          category: "access",
          typeLabel: "Retake Log",
          typeLabelAr: "طلب إعادة",
          timestamp: access.approvedAt || access.rejectedAt || access.requestedAt,
          courseId: cId,
          courseTitle: getCourseTitle(cId),
          title: qTitle,
          statusBadge: rs,
          pointsEarned: 0,
          pointsDisplay: "",
          details: `Retake request status: ${rs}.`,
        });
      }
    });

    collected.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

    const visLogs =
      typeFilter === "all"
        ? collected
        : collected.filter((item) => item.category === typeFilter);

    // Compute interval summary from collected quiz & assignment records
    const quizLogs = collected.filter((l) => l.category === "quiz");
    const assnLogs = collected.filter((l) => l.category === "assignment");
    const gradedAssnLogs = assnLogs.filter((l) => l.isGraded);

    const quizPoints = quizLogs.reduce((s, l) => s + l.pointsEarned, 0);
    const assignmentPoints = gradedAssnLogs.reduce((s, l) => s + l.pointsEarned, 0);
    const totalPoints = quizPoints + assignmentPoints;
    const avgQuizPct =
      quizLogs.length > 0
        ? Math.round(quizLogs.reduce((s, l) => s + (l.pct || 0), 0) / quizLogs.length)
        : 0;
    const passCount = quizLogs.filter((l) => l.pct >= 60).length;
    const passRate =
      quizLogs.length > 0 ? Math.round((passCount / quizLogs.length) * 100) : 0;

    // Breakdown by course
    const courseMap = {};
    collected
      .filter((l) => l.category === "quiz" || l.category === "assignment")
      .forEach((l) => {
        const key = l.courseId || "other";
        if (!courseMap[key]) {
          courseMap[key] = {
            courseId: key,
            courseTitle: l.courseTitle,
            quizCount: 0,
            quizPoints: 0,
            assignmentCount: 0,
            assignmentPoints: 0,
            totalPoints: 0,
          };
        }
        if (l.category === "quiz") {
          courseMap[key].quizCount += 1;
          courseMap[key].quizPoints += l.pointsEarned;
        } else if (l.category === "assignment") {
          courseMap[key].assignmentCount += 1;
          if (l.isGraded) courseMap[key].assignmentPoints += l.pointsEarned;
        }
        courseMap[key].totalPoints =
          courseMap[key].quizPoints + courseMap[key].assignmentPoints;
      });

    const chartPoints = [...collected]
      .filter((l) => l.category === "quiz" || (l.category === "assignment" && l.isGraded))
      .sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0))
      .map((l) => ({
        label:
          l.title.length > 14 ? `${l.title.slice(0, 13)}…` : l.title,
        points: l.pointsEarned,
        date: l.timestamp ? new Date(l.timestamp).toLocaleDateString() : "",
      }));

    return {
      allLogs: collected,
      filteredLogs: visLogs,
      summary: {
        totalPoints,
        quizPoints,
        assignmentPoints,
        quizCount: quizLogs.length,
        assignmentCount: assnLogs.length,
        gradedAssignments: gradedAssnLogs.length,
        avgQuizPct,
        passRate,
      },
      courseBreakdown: Object.values(courseMap),
      chartData: chartPoints,
    };
  }, [
    selectedStudentId,
    fromDate,
    toDate,
    typeFilter,
    data,
    lang,
    user?.uid,
  ]);

  const handleExtractPdf = () => {
    if (!selectedStudent) return;
    generateStudentProgressReportPdf({
      student: selectedStudent,
      instructorName: user?.displayName || user?.email || "Course Instructor",
      fromDate,
      toDate,
      logs: filteredLogs,
      summary,
      courseBreakdown,
    });
    toast.success(
      lang === "ar"
        ? `تم استخراج تقرير PDF للطالب ${selectedStudent.displayName || selectedStudent.email}`
        : `Extracted PDF Progress Report for ${selectedStudent.displayName || selectedStudent.email}`
    );
  };

  const handleExportCsv = () => {
    if (!selectedStudent) return;
    const header = "Date,Type,Course,Activity,Status,Points,Details\n";
    const rows = filteredLogs
      .map((l) => {
        const dt = l.timestamp ? new Date(l.timestamp).toISOString() : "";
        const esc = (v) => `"${String(v || "").replace(/"/g, '""')}"`;
        return [
          esc(dt),
          esc(l.typeLabel),
          esc(l.courseTitle),
          esc(l.title),
          esc(l.statusBadge),
          esc(l.pointsDisplay || "0"),
          esc(l.details),
        ].join(",");
      })
      .join("\n");
    const blob = new Blob([header + rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `student_progress_${fromDate || "all"}_to_${toDate || "now"}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="glass-panel rounded-[26px] p-4 sm:p-5 flex flex-wrap items-center justify-between gap-3.5">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className="h-10 w-10 sm:h-11 sm:w-11 rounded-2xl bg-gradient-to-br from-cyan-500 via-violet-600 to-fuchsia-600 text-white flex items-center justify-center shadow-lg shadow-violet-500/25 shrink-0">
            <TrendingUp className="h-5 w-5 sm:h-6 sm:w-6" />
          </div>
          <div className="min-w-0">
            <h1 className="text-lg sm:text-xl font-black truncate">
              {lang === "ar"
                ? "متتبع تقدم الطالب والتقارير"
                : "Student Progress Tracker & Report Extractor"}
            </h1>
            <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
              {lang === "ar"
                ? "اختر الطالب والفترة الزمنية لاستعراض جميع الدرجات والواجبات والأنشطة واستخراج تقرير PDF احترافي"
                : "Select a student and date interval to review all recorded grades, marks, assignments, and export a branded PDF report."}
            </p>
          </div>
        </div>

        {selectedStudent && (
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleExportCsv}
              className="glass-btn-secondary flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold"
            >
              <Download className="h-4 w-4 text-sky-600" />
              {lang === "ar" ? "تصدير CSV" : "Export CSV"}
            </button>
            <button
              type="button"
              onClick={handleExtractPdf}
              className="glass-btn-primary flex items-center gap-2 px-4 py-2 rounded-xl text-xs"
            >
              <FileText className="h-4 w-4" />
              {lang === "ar" ? "استخراج تقرير PDF" : "Extract Branded PDF Report"}
            </button>
          </div>
        )}
      </div>

      {/* Filters Card: Student Selector + Interval Picker */}
      <div className="glass-card p-5 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
          {/* Student Picker */}
          <div className="md:col-span-5 space-y-1.5">
            <label className="text-xs font-bold text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
              <User className="h-3.5 w-3.5 text-sky-600" />
              {lang === "ar" ? "اختر الطالب" : "Select Student"}
            </label>
            <select
              value={selectedStudentId}
              onChange={(e) => setSelectedStudentId(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl glass-input text-sm font-semibold"
            >
              {data.students.length === 0 ? (
                <option value="">
                  {lang === "ar" ? "لا يوجد طلاب مسجلون بعد" : "No students found yet"}
                </option>
              ) : (
                data.students.map((st) => (
                  <option key={st.uid} value={st.uid}>
                    {st.displayName || st.email} ({st.email})
                  </option>
                ))
              )}
            </select>
          </div>

          {/* From Date */}
          <div className="md:col-span-3 space-y-1.5">
            <label className="text-xs font-bold text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
              <CalendarRange className="h-3.5 w-3.5 text-indigo-500" />
              {lang === "ar" ? "من تاريخ" : "From Date"}
            </label>
            <input
              type="date"
              value={fromDate}
              max={toDate || undefined}
              onChange={(e) => {
                const nextFrom = e.target.value;
                setFromDate(nextFrom);
                if (nextFrom && toDate && nextFrom > toDate) {
                  setToDate(nextFrom);
                }
              }}
              className="w-full px-3 py-2 rounded-xl glass-input text-sm"
            />
          </div>

          {/* To Date */}
          <div className="md:col-span-3 space-y-1.5">
            <label className="text-xs font-bold text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
              <CalendarRange className="h-3.5 w-3.5 text-indigo-500" />
              {lang === "ar" ? "إلى تاريخ" : "To Date"}
            </label>
            <input
              type="date"
              value={toDate}
              min={fromDate || undefined}
              onChange={(e) => {
                const nextTo = e.target.value;
                if (fromDate && nextTo && nextTo < fromDate) {
                  toast.error(
                    lang === "ar"
                      ? "لا يمكن اختيار تاريخ قبل تاريخ البداية"
                      : "End date cannot be earlier than From Date"
                  );
                  setToDate(fromDate);
                  return;
                }
                setToDate(nextTo);
              }}
              className="w-full px-3 py-2 rounded-xl glass-input text-sm"
            />
          </div>

          {/* Clear / All Time button */}
          <div className="md:col-span-1">
            <button
              type="button"
              onClick={() => applyPreset("all")}
              className="w-full glass-btn-secondary py-2.5 px-2 rounded-xl text-xs font-bold"
              title="Show all recorded history"
            >
              {lang === "ar" ? "الكل" : "All"}
            </button>
          </div>
        </div>

        {/* Quick Interval Presets + Activity Category Filter */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-white/40 dark:border-white/10">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-bold text-slate-500 me-1">
              {lang === "ar" ? "فترات سريعة:" : "Quick Interval:"}
            </span>
            {[
              { id: "7d", en: "Last 7 Days", ar: "آخر 7 أيام" },
              { id: "30d", en: "Last 30 Days", ar: "آخر 30 يوم" },
              { id: "month", en: "This Month", ar: "هذا الشهر" },
              { id: "all", en: "All Time", ar: "كل الأوقات" },
            ].map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => applyPreset(p.id)}
                className="px-2.5 py-1 rounded-lg glass-subtle hover:bg-sky-500/15 text-[11px] font-semibold transition-colors"
              >
                {lang === "ar" ? p.ar : p.en}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {[
              { id: "all", en: `All (${allLogs.length})`, ar: `الكل (${allLogs.length})` },
              { id: "quiz", en: "Quiz Marks", ar: "درجات الاختبارات" },
              { id: "assignment", en: "Assignments", ar: "الواجبات" },
              { id: "access", en: "Access / Retakes", ar: "الدخول والإعادة" },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setTypeFilter(tab.id)}
                className={`px-3 py-1 rounded-full text-[11px] font-bold transition-all ${
                  typeFilter === tab.id
                    ? "bg-sky-600 text-white shadow-sm"
                    : "glass-subtle text-slate-600 dark:text-slate-300"
                }`}
              >
                {lang === "ar" ? tab.ar : tab.en}
              </button>
            ))}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="glass-card p-10 text-center text-sm text-slate-500">
          {lang === "ar" ? "جاري تحميل بيانات التقدم..." : "Loading student activity logs..."}
        </div>
      ) : !selectedStudent ? (
        <div className="glass-card p-10 text-center text-sm text-slate-500">
          {lang === "ar"
            ? "لا يوجد طلاب متاحون حالياً ضمن مقرراتك."
            : "No students linked to your courses yet."}
        </div>
      ) : (
        <>
          {/* 4 Interval KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="glass-card p-5 rounded-[22px] flex items-center gap-4 hover:-translate-y-0.5 transition-all text-start">
              <div className="h-12 w-12 rounded-2xl bg-amber-500/15 text-amber-600 dark:text-amber-300 flex items-center justify-center shrink-0 shadow-xs">
                <Award className="h-6 w-6" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold text-slate-500 dark:text-slate-400">
                  {lang === "ar" ? "إجمالي النقاط المكتسبة" : "Total Points Earned"}
                </div>
                <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight mt-0.5">
                  {summary.totalPoints}{" "}
                  <span className="text-xs font-bold text-amber-600 dark:text-amber-400">
                    {lang === "ar" ? "نقطة" : "pts"}
                  </span>
                </div>
              </div>
            </div>

            <div className="glass-card p-5 rounded-[22px] flex items-center gap-4 hover:-translate-y-0.5 transition-all text-start">
              <div className="h-12 w-12 rounded-2xl bg-sky-500/15 text-sky-600 dark:text-sky-300 flex items-center justify-center shrink-0 shadow-xs">
                <ClipboardCheck className="h-6 w-6" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold text-slate-500 dark:text-slate-400">
                  {lang === "ar" ? "نقاط الاختبارات" : "Quiz Points"}
                </div>
                <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight mt-0.5">
                  {summary.quizPoints}{" "}
                  <span className="text-xs font-semibold text-slate-500">
                    pts ({summary.quizCount} {lang === "ar" ? "اختبار" : "quizzes"})
                  </span>
                </div>
              </div>
            </div>

            <div className="glass-card p-5 rounded-[22px] flex items-center gap-4 hover:-translate-y-0.5 transition-all text-start">
              <div className="h-12 w-12 rounded-2xl bg-indigo-500/15 text-indigo-600 dark:text-indigo-300 flex items-center justify-center shrink-0 shadow-xs">
                <ClipboardList className="h-6 w-6" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold text-slate-500 dark:text-slate-400">
                  {lang === "ar" ? "نقاط الواجبات" : "Assignment Points"}
                </div>
                <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight mt-0.5">
                  {summary.assignmentPoints}{" "}
                  <span className="text-xs font-semibold text-slate-500">
                    pts ({summary.gradedAssignments}/{summary.assignmentCount})
                  </span>
                </div>
              </div>
            </div>

            <div className="glass-card p-5 rounded-[22px] flex items-center gap-4 hover:-translate-y-0.5 transition-all text-start">
              <div className="h-12 w-12 rounded-2xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 flex items-center justify-center shrink-0 shadow-xs">
                <Activity className="h-6 w-6" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold text-slate-500 dark:text-slate-400">
                  {lang === "ar" ? "الأنشطة المسجلة" : "Recorded Logs"}
                </div>
                <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight mt-0.5">
                  {filteredLogs.length}{" "}
                  <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                    ({summary.passRate}% pass)
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Points Earned Timeline Chart + Course Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            <div className="lg:col-span-7 glass-card p-5 space-y-3">
              <h2 className="text-sm font-extrabold flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-sky-600" />
                {lang === "ar"
                  ? "توزيع النقاط المكتسبة خلال الفترة"
                  : "Points Earned Across Interval"}
              </h2>
              {chartData.length === 0 ? (
                <div className="h-52 flex items-center justify-center text-xs text-slate-500">
                  {lang === "ar"
                    ? "لا توجد نقاط مسجلة في هذه الفترة."
                    : "No graded activities in the selected interval."}
                </div>
              ) : (
                <div className="h-56 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 8, right: 12, left: -12, bottom: 4 }}>
                      <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.25} />
                      <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                      <Tooltip
                        formatter={(value) => [`${value} pts`, "Points"]}
                        contentStyle={{
                          borderRadius: "12px",
                          fontSize: "12px",
                        }}
                      />
                      <Bar dataKey="points" fill="#0284c7" radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            <div className="lg:col-span-5 glass-card p-5 space-y-3">
              <h2 className="text-sm font-extrabold flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-indigo-500" />
                {lang === "ar" ? "ملخص النقاط حسب المقرر" : "Course Points Breakdown"}
              </h2>
              {courseBreakdown.length === 0 ? (
                <div className="h-52 flex items-center justify-center text-xs text-slate-500">
                  {lang === "ar"
                    ? "لا توجد أنشطة مقررات في هذه الفترة."
                    : "No course assessments recorded in this interval."}
                </div>
              ) : (
                <div className="space-y-2.5 max-h-56 overflow-y-auto pe-1">
                  {courseBreakdown.map((cb) => (
                    <div
                      key={cb.courseId}
                      className="glass-subtle rounded-2xl p-3 flex items-center justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <div className="font-bold text-xs truncate text-slate-900 dark:text-white">
                          {cb.courseTitle}
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          {lang === "ar" ? "اختبارات" : "Quizzes"}: {cb.quizPoints} pts ({cb.quizCount}) ·{" "}
                          {lang === "ar" ? "واجبات" : "Assign"}: {cb.assignmentPoints} pts (
                          {cb.assignmentCount})
                        </div>
                      </div>
                      <span className="px-2.5 py-1 rounded-full bg-sky-500/15 text-sky-700 dark:text-sky-300 text-xs font-extrabold shrink-0">
                        {cb.totalPoints} pts
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Recorded Activity Logs Feed */}
          <div className="glass-card p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-sm font-extrabold flex items-center gap-2">
                <Activity className="h-4 w-4 text-emerald-500" />
                {lang === "ar"
                  ? "السجل التفصيلي للأنشطة والدرجات"
                  : "Detailed Activity, Grades & Marks Log"}
              </h2>
              <span className="text-xs text-slate-500">
                {fromDate || toDate
                  ? `${fromDate || "Start"} -> ${toDate || "Present"}`
                  : lang === "ar"
                  ? "كل السجلات"
                  : "All Recorded History"}
              </span>
            </div>

            {filteredLogs.length === 0 ? (
              <div className="py-10 text-center text-xs text-slate-500">
                {lang === "ar"
                  ? "لا توجد أنشطة مسجلة لهذا الطالب في الفترة المحددة."
                  : "No recorded activities found for this student in the selected interval."}
              </div>
            ) : (
              <div className="space-y-2.5">
                {filteredLogs.map((log) => (
                  <div
                    key={log.id}
                    className="glass-subtle rounded-2xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <div
                        className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 ${
                          log.category === "quiz"
                            ? "bg-sky-500/15 text-sky-600 dark:text-sky-300"
                            : log.category === "assignment"
                            ? "bg-indigo-500/15 text-indigo-600 dark:text-indigo-300"
                            : "bg-amber-500/15 text-amber-600 dark:text-amber-300"
                        }`}
                      >
                        {log.category === "quiz" ? (
                          <ClipboardCheck className="h-4 w-4" />
                        ) : log.category === "assignment" ? (
                          <ClipboardList className="h-4 w-4" />
                        ) : (
                          <KeyRound className="h-4 w-4" />
                        )}
                      </div>
                      <div className="min-w-0 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-bold text-sm text-slate-900 dark:text-white">
                            {log.title}
                          </span>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/60 dark:bg-white/10 text-slate-600 dark:text-slate-300">
                            {lang === "ar" ? log.typeLabelAr : log.typeLabel}
                          </span>
                          <span className="text-[11px] text-slate-500">{log.courseTitle}</span>
                        </div>
                        {log.details && (
                          <p className="text-xs text-slate-600 dark:text-slate-300 flex items-start gap-1.5">
                            {log.category === "quiz" && (
                              <Sparkles className="h-3.5 w-3.5 text-sky-500 shrink-0 mt-0.5" />
                            )}
                            <span>{log.details}</span>
                          </p>
                        )}
                        <div className="text-[11px] text-slate-400">
                          {log.timestamp ? new Date(log.timestamp).toLocaleString() : ""}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                      <span
                        className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${
                          ["PASS", "GRADED", "APPROVED", "SUBMITTED"].includes(log.statusBadge)
                            ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                            : ["REVIEW", "REJECTED", "PENDING"].includes(log.statusBadge)
                            ? "bg-amber-500/15 text-amber-700 dark:text-amber-300"
                            : "bg-slate-500/15 text-slate-600 dark:text-slate-300"
                        }`}
                      >
                        {log.statusBadge}
                      </span>
                      {log.pointsDisplay && (
                        <span className="px-3 py-1 rounded-full bg-sky-500/15 border border-sky-400/30 text-sky-700 dark:text-sky-300 text-xs font-extrabold">
                          {log.pointsDisplay}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

