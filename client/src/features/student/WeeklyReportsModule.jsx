import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  CalendarCheck,
  Award,
  Sparkles,
  ClipboardCheck,
  ClipboardList,
  CheckCircle2,
  Clock,
  TrendingUp,
  Download,
  AlertCircle,
  FileText,
  ChevronRight,
  BookOpen,
  ArrowUpRight,
  ShieldCheck,
  Loader2,
} from "lucide-react";
import toast from "react-hot-toast";
import { useAuth } from "../../context/AuthContext";
import { useLang } from "../../context/LangContext";
import {
  listResults,
  listAssignments,
  listCourses,
  listUsers,
  checkAndDispatchAutomatedWeeklyReports,
} from "../../services/platformService";
import { generateStudentProgressReportPdf } from "../../utils/progressReportGenerator";

export default function WeeklyReportsModule({ mode = "student", activeInstructorId = null }) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { lang } = useLang();

  const [loading, setLoading] = useState(true);
  const [reports, setReports] = useState([]);
  const [selectedWeekId, setSelectedWeekId] = useState(null);
  const [courses, setCourses] = useState([]);
  const [instructors, setInstructors] = useState([]);

  useEffect(() => {
    let active = true;
    async function loadWeeklyData() {
      if (!user?.uid) return;
      setLoading(true);
      try {
        const [reps, allCourses, allUsers] = await Promise.all([
          checkAndDispatchAutomatedWeeklyReports(user.uid),
          listCourses().catch(() => []),
          listUsers("instructor").catch(() => []),
        ]);

        if (!active) return;
        setReports(reps);
        setCourses(allCourses);
        setInstructors(allUsers);
        if (reps.length > 0) {
          setSelectedWeekId(reps[0].id);
        }
      } catch (err) {
        console.error("Failed to load weekly reports:", err);
        toast.error(lang === "ar" ? "تعذر تحميل التقارير الأسبوعية" : "Failed to load weekly reports");
      } finally {
        if (active) setLoading(false);
      }
    }

    loadWeeklyData();
    return () => {
      active = false;
    };
  }, [user?.uid, lang]);

  const activeReport = useMemo(() => {
    if (!reports.length) return null;
    return reports.find((r) => r.id === selectedWeekId) || reports[0];
  }, [reports, selectedWeekId]);

  const allTimeAverage = useMemo(() => {
    if (!reports.length) return 0;
    const scoredReports = reports.filter((r) => r.quizzesCount > 0 || r.assignmentsCount > 0);
    if (!scoredReports.length) return 0;
    const sum = scoredReports.reduce((acc, r) => acc + (r.overallScore || 0), 0);
    return Math.round(sum / scoredReports.length);
  }, [reports]);

  const handleDownloadPdf = () => {
    if (!activeReport) return;
    try {
      const instructor = instructors.find((i) => i.uid === activeInstructorId) || instructors[0];
      const instructorName =
        instructor?.displayName ||
        (typeof instructor?.name === "object"
          ? instructor?.name?.[lang] || instructor?.name?.en
          : instructor?.name) ||
        "Platform Instructor";

      // Build logs for progress report generator
      const logs = [];
      activeReport.quizzes.forEach((q) => {
        logs.push({
          type: "quiz",
          title: q.quizTitle,
          details: `Score: ${q.score}% (${q.points} pts) — ${q.feedback || "Assessment Complete"}`,
          score: q.score,
          points: q.points,
          maxPoints: 10,
          timestamp: q.createdAt || Date.now(),
        });
      });

      activeReport.assignments.forEach((a) => {
        logs.push({
          type: "assignment",
          title: a.title,
          details: `Marks: ${a.score !== null ? a.score : "Pending"} / ${a.maxMarks} pts — ${
            a.feedback || "Submission on File"
          }`,
          score: a.score !== null ? Math.round((a.score / a.maxMarks) * 100) : 0,
          points: a.score || 0,
          maxPoints: a.maxMarks,
          timestamp: a.submittedAt || Date.now(),
        });
      });

      generateStudentProgressReportPdf({
        student: user,
        instructorName,
        fromDate: activeReport.startDateStr,
        toDate: activeReport.endDateStr,
        logs,
        summary: {
          quizzesTaken: activeReport.quizzesCount,
          quizzesAvgPct: activeReport.quizAvgScore,
          assignmentsSubmitted: activeReport.assignmentsCount,
          totalEarnedPoints: activeReport.totalWeeklyPoints,
        },
        courseBreakdown: {},
      });

      toast.success(
        lang === "ar"
          ? `تم تحميل تقرير الأسبوع ${activeReport.weekNumber} بنجاح!`
          : `Downloaded Week ${activeReport.weekNumber} report PDF!`
      );
    } catch (err) {
      console.error("PDF generation failed:", err);
      toast.error(lang === "ar" ? "تعذر إنشاء ملف PDF" : "Failed to generate report PDF");
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-16 space-y-3">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600 dark:text-cyan-400" />
        <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
          {t("app.loading") || "Loading weekly reports..."}
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* Top Hero Banner */}
      <div className="relative overflow-hidden rounded-[26px] p-6 sm:p-7 glass-panel border-teal-400/25 shadow-xl">
        <div className="pointer-events-none absolute -top-16 -end-16 h-56 w-56 rounded-full bg-teal-400/15 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-16 -start-16 h-56 w-56 rounded-full bg-sky-400/15 blur-3xl" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="max-w-xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-500/15 border border-teal-400/30 text-teal-700 dark:text-teal-300 text-xs font-bold mb-3 shadow-xs">
              <CalendarCheck className="h-3.5 w-3.5 text-teal-500 dark:text-teal-300" />
              <span>{t("weeklyReports.title")}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight leading-snug text-slate-900 dark:text-white">
              {lang === "ar"
                ? `تقارير الأداء الأسبوعية — ${user?.displayName || "الطالب"}`
                : `Weekly Performance Hub — ${user?.displayName || "Student"}`}
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 mt-1.5 leading-relaxed">
              {t("weeklyReports.subtitle")}
            </p>
          </div>

          {/* Quick Metrics Bar */}
          <div className="flex items-center gap-3 sm:gap-4 glass-subtle p-3 sm:p-4 rounded-2xl self-start md:self-auto">
            <div className="text-center px-2 sm:px-3">
              <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">{reports.length}</div>
              <div className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 uppercase font-bold tracking-wider">
                {t("weeklyReports.totalWeeks")}
              </div>
            </div>
            <div className="w-px h-8 bg-slate-200 dark:bg-white/15" />
            <div className="text-center px-2 sm:px-3">
              <div className="text-xl sm:text-2xl font-black text-teal-600 dark:text-teal-300">
                {allTimeAverage > 0 ? `${allTimeAverage}%` : "—"}
              </div>
              <div className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 uppercase font-bold tracking-wider">
                {t("weeklyReports.allTimeAvg")}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Weekly History Tabs (Arranged Weekly) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs sm:text-sm font-extrabold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-teal-600 dark:text-teal-400" />
            <span>{lang === "ar" ? "التسلسل الزمني للأسابيع" : "Weekly Chronology & Cycles"}</span>
          </h2>
          <span className="text-[11px] font-semibold text-slate-500">
            {lang === "ar" ? "دورة كل 7 أيام تلقائياً" : "Every 7-Day Cycle"}
          </span>
        </div>

        {/* Scrollable Horizontal Week Pills */}
        <div className="flex items-center gap-2.5 overflow-x-auto pb-2 scrollbar-thin">
          {reports.map((rep) => {
            const isSelected = rep.id === activeReport?.id;
            return (
              <button
                key={rep.id}
                onClick={() => setSelectedWeekId(rep.id)}
                className={`flex-shrink-0 flex items-center gap-3 px-4 py-3 rounded-2xl border transition-all text-start cursor-pointer shadow-sm ${
                  isSelected
                    ? "bg-teal-500/15 dark:bg-teal-500/15 border-teal-400/70 shadow-teal-500/15 ring-2 ring-teal-400/30"
                    : "glass-card"
                }`}
              >
                <div
                  className={`h-9 w-9 rounded-xl flex items-center justify-center font-black text-xs shrink-0 ${
                    rep.isCurrentWeek
                      ? "bg-gradient-to-br from-sky-500 to-emerald-500 text-white shadow-md shadow-teal-500/30"
                      : "bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-slate-200"
                  }`}
                >
                  {rep.weekNumber}
                </div>
                <div className="min-w-0 pr-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-slate-900 dark:text-white">
                      {t("weeklyReports.week")} {rep.weekNumber}
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400 font-mono mt-0.5">
                    {rep.startDateStr} – {rep.endDateStr}
                  </div>
                </div>

                <div
                  className={`px-2 py-0.5 rounded-lg text-[11px] font-black shrink-0 ${rep.tier.colorClass}`}
                >
                  {rep.overallScore > 0 ? `${rep.overallScore}%` : "—"}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Active Selected Week Detailed Report View */}
      {activeReport ? (
        <div className="space-y-6">
          {/* Main Card Header */}
          <div className="glass-panel rounded-[26px] p-5 sm:p-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-200/70 dark:border-white/10">
              <div className="flex items-center gap-3.5">
                <div className="h-12 w-12 rounded-2xl bg-gradient-to-tr from-sky-500 to-emerald-500 text-white font-black text-base flex items-center justify-center shadow-lg shadow-teal-500/25 shrink-0">
                  W{activeReport.weekNumber}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-black text-slate-900 dark:text-white">
                      {t("weeklyReports.week")} {activeReport.weekNumber}{" "}
                      {lang === "ar" ? "تقرير الأداء" : "Performance Report"}
                    </h3>
                    <span
                      className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                        activeReport.isCurrentWeek
                          ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-400/35"
                          : "bg-slate-100 text-slate-700 dark:bg-white/10 dark:text-slate-300 border-slate-200 dark:border-white/15"
                      }`}
                    >
                      {activeReport.isCurrentWeek
                        ? t("weeklyReports.currentWeek")
                        : t("weeklyReports.completedWeek")}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-mono">
                    📅 {activeReport.startDateStr} → {activeReport.endDateStr}
                  </p>
                </div>
              </div>

              {/* PDF Export Button */}
              <button
                type="button"
                onClick={handleDownloadPdf}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold glass-btn-primary cursor-pointer self-start sm:self-auto"
              >
                <Download className="h-3.5 w-3.5" />
                <span>{t("weeklyReports.downloadPdf")}</span>
              </button>
            </div>

            {/* 4 Stat KPI Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Quizzes Accuracy */}
              <div className="glass-card p-5 flex flex-col justify-between text-start">
                <div>
                  <div className="flex items-center justify-between text-sky-600 dark:text-sky-400 mb-3">
                    <div className="h-11 w-11 rounded-2xl bg-sky-500/15 border border-sky-400/25 text-sky-600 dark:text-sky-300 flex items-center justify-center shrink-0">
                      <ClipboardCheck className="h-5 w-5" />
                    </div>
                    <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-sky-500/15 text-sky-700 dark:text-sky-300 border border-sky-400/25 uppercase tracking-wide">
                      {activeReport.quizzesCount} {lang === "ar" ? "اختبار" : "Quizzes"}
                    </span>
                  </div>
                  <div className="text-3xl sm:text-4xl font-black text-sky-600 dark:text-sky-300 font-mono tracking-tight">
                    {activeReport.quizAvgScore > 0 ? `${activeReport.quizAvgScore}%` : "—"}
                  </div>
                  <div className="text-xs sm:text-[13px] font-bold text-slate-700 dark:text-slate-200 mt-1">
                    {t("weeklyReports.quizzesAccuracy")}
                  </div>
                </div>
                <div className="text-[11px] font-medium text-slate-400 dark:text-slate-500 mt-3 pt-2.5 border-t border-slate-200/60 dark:border-white/10 flex items-center justify-between">
                  <span>{t("weeklyReports.points")}</span>
                  <span className="font-mono font-bold text-slate-700 dark:text-slate-300">
                    {activeReport.quizPoints} / {activeReport.quizMaxPoints || "0"}
                  </span>
                </div>
              </div>

              {/* Assignments Mastery */}
              <div className="glass-card p-5 flex flex-col justify-between text-start">
                <div>
                  <div className="flex items-center justify-between text-teal-600 dark:text-teal-400 mb-3">
                    <div className="h-11 w-11 rounded-2xl bg-teal-500/15 border border-teal-400/25 text-teal-600 dark:text-teal-300 flex items-center justify-center shrink-0">
                      <ClipboardList className="h-5 w-5" />
                    </div>
                    <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-teal-500/15 text-teal-700 dark:text-teal-300 border border-teal-400/25 uppercase tracking-wide">
                      {activeReport.assignmentsCount} {lang === "ar" ? "واجب" : "Tasks"}
                    </span>
                  </div>
                  <div className="text-3xl sm:text-4xl font-black text-teal-600 dark:text-teal-300 font-mono tracking-tight">
                    {activeReport.assignmentAvgScore > 0 ? `${activeReport.assignmentAvgScore}%` : "—"}
                  </div>
                  <div className="text-xs sm:text-[13px] font-bold text-slate-700 dark:text-slate-200 mt-1">
                    {t("weeklyReports.assignmentsMastery")}
                  </div>
                </div>
                <div className="text-[11px] font-medium text-slate-400 dark:text-slate-500 mt-3 pt-2.5 border-t border-slate-200/60 dark:border-white/10 flex items-center justify-between">
                  <span>{t("weeklyReports.points")}</span>
                  <span className="font-mono font-bold text-slate-700 dark:text-slate-300">
                    {activeReport.assignmentPoints} / {activeReport.assignmentMaxMarks || "0"}
                  </span>
                </div>
              </div>

              {/* Total Weekly Points */}
              <div className="glass-card p-5 flex flex-col justify-between text-start">
                <div>
                  <div className="flex items-center justify-between text-cyan-600 dark:text-cyan-400 mb-3">
                    <div className="h-11 w-11 rounded-2xl bg-cyan-500/15 border border-cyan-400/25 text-cyan-600 dark:text-cyan-300 flex items-center justify-center shrink-0">
                      <Award className="h-5 w-5" />
                    </div>
                    <span className="text-[11px] font-black px-2.5 py-0.5 rounded-full bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border border-cyan-400/25 uppercase tracking-wide">
                      PTS
                    </span>
                  </div>
                  <div className="text-3xl sm:text-4xl font-black text-cyan-600 dark:text-cyan-300 font-mono tracking-tight">
                    +{activeReport.totalWeeklyPoints}
                  </div>
                  <div className="text-xs sm:text-[13px] font-bold text-slate-700 dark:text-slate-200 mt-1">
                    {t("weeklyReports.totalPointsEarned")}
                  </div>
                </div>
                <div className="text-[11px] font-medium text-slate-400 dark:text-slate-500 mt-3 pt-2.5 border-t border-slate-200/60 dark:border-white/10 flex items-center justify-between">
                  <span>{lang === "ar" ? "دورة الـ 7 أيام" : "7-Day Cycle"}</span>
                  <span className="font-mono font-bold text-cyan-700 dark:text-cyan-300">
                    +{activeReport.totalWeeklyPoints} pts
                  </span>
                </div>
              </div>

              {/* Overall Grade Tier */}
              <div className="glass-card p-5 flex flex-col justify-between text-start">
                <div>
                  <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400 mb-3">
                    <div className="h-11 w-11 rounded-2xl bg-emerald-500/15 border border-emerald-400/25 text-emerald-600 dark:text-emerald-300 flex items-center justify-center shrink-0">
                      <ShieldCheck className="h-5 w-5" />
                    </div>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border ${activeReport.tier.colorClass}`}
                    >
                      {lang === "ar" ? activeReport.tier.labelAr : activeReport.tier.labelEn}
                    </span>
                  </div>
                  <div className="text-3xl sm:text-4xl font-black text-emerald-600 dark:text-emerald-300 font-mono tracking-tight">
                    {activeReport.overallScore > 0 ? `${activeReport.overallScore}%` : "—"}
                  </div>
                  <div className="text-xs sm:text-[13px] font-bold text-slate-700 dark:text-slate-200 mt-1">
                    {t("weeklyReports.overallScore")} ({activeReport.tier.grade})
                  </div>
                </div>
                <div className="text-[11px] font-medium text-slate-400 dark:text-slate-500 mt-3 pt-2.5 border-t border-slate-200/60 dark:border-white/10 flex items-center justify-between">
                  <span>{lang === "ar" ? "الرتبة المكتسبة" : "Standing Tier"}</span>
                  <span className="font-bold text-slate-700 dark:text-slate-300">
                    Grade {activeReport.tier.grade}
                  </span>
                </div>
              </div>
            </div>

            {/* AI Smart Coaching Box */}
            <div className="relative overflow-hidden p-5 sm:p-6 rounded-[24px] bg-gradient-to-br from-indigo-500/10 via-purple-500/5 to-cyan-500/10 dark:from-indigo-950/40 dark:via-purple-950/30 dark:to-cyan-950/20 border border-indigo-200/90 dark:border-indigo-800/60 shadow-sm">
              <div className="flex items-start gap-3.5">
                <div className="h-11 w-11 rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 text-white flex items-center justify-center shrink-0 shadow-lg shadow-indigo-500/25">
                  <Sparkles className="h-5 w-5 animate-pulse" />
                </div>
                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className="text-xs sm:text-sm font-black text-indigo-950 dark:text-indigo-200 flex items-center gap-2">
                    <span>{t("weeklyReports.aiCoachTitle")}</span>
                    <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-indigo-600 text-white font-bold shadow-xs">
                      Platform AI
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-200 leading-relaxed font-medium text-start">
                    {lang === "ar" ? activeReport.aiFeedbackAr : activeReport.aiFeedbackEn}
                  </p>
                </div>
              </div>
            </div>

            {/* Activities in This 7-Day Window */}
            <div className="space-y-4 pt-2">
              <h4 className="text-xs font-extrabold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                {t("weeklyReports.quizzesBreakdown")} ({activeReport.quizzes.length})
              </h4>

              {activeReport.quizzes.length === 0 ? (
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-white/5 text-xs text-slate-500">
                  {t("weeklyReports.noActivity")}
                </div>
              ) : (
                <div className="space-y-2.5">
                  {activeReport.quizzes.map((q) => (
                    <div
                      key={q.id}
                      className="glass-subtle p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-start"
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        <div className="h-10 w-10 rounded-xl bg-sky-500/15 border border-sky-400/25 text-sky-600 dark:text-sky-300 font-black text-xs flex items-center justify-center shrink-0">
                          {q.score}%
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate">
                            {q.quizTitle}
                          </div>
                          <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                            {new Date(q.createdAt).toLocaleDateString([], {
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
                        <span className="text-xs font-black text-sky-700 dark:text-sky-300 px-3 py-1.5 rounded-xl bg-sky-500/15 border border-sky-400/25">
                          +{q.points} {t("weeklyReports.points")}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <h4 className="text-xs font-extrabold text-slate-800 dark:text-slate-200 uppercase tracking-wider pt-2">
                {t("weeklyReports.assignmentsBreakdown")} ({activeReport.assignments.length})
              </h4>

              {activeReport.assignments.length === 0 ? (
                <div className="glass-subtle p-4 rounded-xl text-xs text-slate-500 dark:text-slate-400">
                  {t("weeklyReports.noActivity")}
                </div>
              ) : (
                <div className="space-y-2.5">
                  {activeReport.assignments.map((a) => (
                    <div
                      key={a.assignmentId}
                      className="glass-subtle p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-start"
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        <div className="h-10 w-10 rounded-xl bg-teal-500/15 border border-teal-400/25 text-teal-600 dark:text-teal-300 font-black text-xs flex items-center justify-center shrink-0">
                          <ClipboardList className="h-5 w-5" />
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate">
                            {a.title}
                          </div>
                          <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                            {new Date(a.submittedAt).toLocaleDateString([], {
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
                        <span className="text-xs font-black text-teal-700 dark:text-teal-300 px-3 py-1.5 rounded-xl bg-teal-500/15 border border-teal-400/25">
                          {a.score !== null ? `${a.score} / ${a.maxMarks}` : "Submitted"} {t("weeklyReports.points")}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Bottom 7-Day Auto Dispatch Explanation Card */}
            <div className="glass-subtle p-4 rounded-2xl flex items-center gap-3 text-xs text-slate-600 dark:text-slate-300">
              <Clock className="h-5 w-5 text-teal-500 dark:text-teal-300 shrink-0" />
              <span>{t("weeklyReports.autoDispatchNote")}</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="glass-panel rounded-3xl p-12 text-center">
          <CalendarCheck className="h-10 w-10 text-slate-400 mx-auto mb-2" />
          <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300">
            {t("weeklyReports.noActivity")}
          </h3>
        </div>
      )}
    </div>
  );
}
