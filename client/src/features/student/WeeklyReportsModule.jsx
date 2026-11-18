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
      <div className="relative overflow-hidden rounded-[28px] p-6 sm:p-7 bg-gradient-to-r from-indigo-600 via-indigo-700 to-purple-700 text-white shadow-xl shadow-indigo-600/20">
        <div className="pointer-events-none absolute -top-16 -end-16 h-56 w-56 rounded-full bg-white/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-16 -start-16 h-56 w-56 rounded-full bg-cyan-400/20 blur-3xl" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="max-w-xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md border border-white/20 text-xs font-bold mb-3 shadow-xs">
              <CalendarCheck className="h-3.5 w-3.5 text-cyan-300" />
              <span>{t("weeklyReports.title")}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight leading-snug">
              {lang === "ar"
                ? `تقارير الأداء الأسبوعية — ${user?.displayName || "الطالب"}`
                : `Weekly Performance Hub — ${user?.displayName || "Student"}`}
            </h1>
            <p className="text-xs sm:text-sm text-indigo-100/90 mt-1.5 leading-relaxed">
              {t("weeklyReports.subtitle")}
            </p>
          </div>

          {/* Quick Metrics Bar */}
          <div className="flex items-center gap-3 sm:gap-4 bg-white/10 backdrop-blur-md p-3 sm:p-4 rounded-2xl border border-white/15 self-start md:self-auto">
            <div className="text-center px-2 sm:px-3">
              <div className="text-xl sm:text-2xl font-black text-white">{reports.length}</div>
              <div className="text-[10px] sm:text-xs text-indigo-200 uppercase font-bold tracking-wider">
                {t("weeklyReports.totalWeeks")}
              </div>
            </div>
            <div className="w-px h-8 bg-white/20" />
            <div className="text-center px-2 sm:px-3">
              <div className="text-xl sm:text-2xl font-black text-cyan-300">
                {allTimeAverage > 0 ? `${allTimeAverage}%` : "—"}
              </div>
              <div className="text-[10px] sm:text-xs text-indigo-200 uppercase font-bold tracking-wider">
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
            <TrendingUp className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
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
                    ? "bg-white dark:bg-slate-800 border-indigo-600 dark:border-indigo-400 shadow-indigo-500/15 ring-2 ring-indigo-500/30"
                    : "bg-white/80 dark:bg-slate-900/80 border-slate-200/80 dark:border-white/10 hover:border-indigo-300 dark:hover:border-slate-700"
                }`}
              >
                <div
                  className={`h-9 w-9 rounded-xl flex items-center justify-center font-black text-xs shrink-0 ${
                    rep.isCurrentWeek
                      ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                  }`}
                >
                  {rep.weekNumber}
                </div>
                <div className="min-w-0 pr-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-slate-900 dark:text-white">
                      {t("weeklyReports.week")} {rep.weekNumber}
                    </span>
                    {rep.isCurrentWeek && (
                      <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" title="Active Week" />
                    )}
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
          <div className="rounded-[26px] bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-white/10 shadow-sm p-5 sm:p-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-100 dark:border-white/5">
              <div className="flex items-center gap-3.5">
                <div className="h-12 w-12 rounded-2xl bg-gradient-to-tr from-indigo-500 to-purple-600 text-white font-black text-base flex items-center justify-center shadow-lg shadow-indigo-500/25 shrink-0">
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
                          ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200"
                          : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200"
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
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 shadow-md shadow-indigo-500/20 transition-all cursor-pointer self-start sm:self-auto"
              >
                <Download className="h-3.5 w-3.5" />
                <span>{t("weeklyReports.downloadPdf")}</span>
              </button>
            </div>

            {/* 4 Stat KPI Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
              {/* Quizzes Accuracy */}
              <div className="p-4 sm:p-5 rounded-[22px] bg-gradient-to-br from-white/95 to-slate-50/80 dark:from-slate-800/80 dark:to-slate-900/90 border border-slate-200/90 dark:border-white/10 shadow-sm flex flex-col justify-between hover:shadow-md hover:-translate-y-0.5 transition-all text-start">
                <div>
                  <div className="flex items-center justify-between text-indigo-600 dark:text-indigo-400 mb-2.5">
                    <div className="h-10 w-10 sm:h-11 sm:w-11 rounded-2xl bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 shadow-xs">
                      <ClipboardCheck className="h-5 w-5" />
                    </div>
                    <span className="text-[10px] sm:text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-750 text-slate-500 dark:text-slate-400 border border-slate-200/60 dark:border-white/5 uppercase tracking-wide">
                      {activeReport.quizzesCount} {lang === "ar" ? "اختبار" : "Quizzes"}
                    </span>
                  </div>
                  <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white font-mono tracking-tight">
                    {activeReport.quizAvgScore > 0 ? `${activeReport.quizAvgScore}%` : "—"}
                  </div>
                  <div className="text-xs sm:text-[13px] font-bold text-slate-700 dark:text-slate-200 mt-1">
                    {t("weeklyReports.quizzesAccuracy")}
                  </div>
                </div>
                <div className="text-[11px] font-medium text-slate-400 dark:text-slate-500 mt-2 pt-2 border-t border-slate-100 dark:border-white/5">
                  {activeReport.quizPoints} / {activeReport.quizMaxPoints || "0"}{" "}
                  {t("weeklyReports.points")}
                </div>
              </div>

              {/* Assignments Mastery */}
              <div className="p-4 sm:p-5 rounded-[22px] bg-gradient-to-br from-white/95 to-slate-50/80 dark:from-slate-800/80 dark:to-slate-900/90 border border-slate-200/90 dark:border-white/10 shadow-sm flex flex-col justify-between hover:shadow-md hover:-translate-y-0.5 transition-all text-start">
                <div>
                  <div className="flex items-center justify-between text-purple-600 dark:text-purple-400 mb-2.5">
                    <div className="h-10 w-10 sm:h-11 sm:w-11 rounded-2xl bg-purple-500/15 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0 shadow-xs">
                      <ClipboardList className="h-5 w-5" />
                    </div>
                    <span className="text-[10px] sm:text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-750 text-slate-500 dark:text-slate-400 border border-slate-200/60 dark:border-white/5 uppercase tracking-wide">
                      {activeReport.assignmentsCount} {lang === "ar" ? "واجب" : "Tasks"}
                    </span>
                  </div>
                  <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white font-mono tracking-tight">
                    {activeReport.assignmentAvgScore > 0 ? `${activeReport.assignmentAvgScore}%` : "—"}
                  </div>
                  <div className="text-xs sm:text-[13px] font-bold text-slate-700 dark:text-slate-200 mt-1">
                    {t("weeklyReports.assignmentsMastery")}
                  </div>
                </div>
                <div className="text-[11px] font-medium text-slate-400 dark:text-slate-500 mt-2 pt-2 border-t border-slate-100 dark:border-white/5">
                  {activeReport.assignmentPoints} / {activeReport.assignmentMaxMarks || "0"}{" "}
                  {t("weeklyReports.points")}
                </div>
              </div>

              {/* Total Weekly Points */}
              <div className="p-4 sm:p-5 rounded-[22px] bg-gradient-to-br from-white/95 to-slate-50/80 dark:from-slate-800/80 dark:to-slate-900/90 border border-slate-200/90 dark:border-white/10 shadow-sm flex flex-col justify-between hover:shadow-md hover:-translate-y-0.5 transition-all text-start">
                <div>
                  <div className="flex items-center justify-between text-cyan-600 dark:text-cyan-400 mb-2.5">
                    <div className="h-10 w-10 sm:h-11 sm:w-11 rounded-2xl bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 flex items-center justify-center shrink-0 shadow-xs">
                      <Award className="h-5 w-5" />
                    </div>
                    <span className="text-[10px] sm:text-[11px] font-black px-2 py-0.5 rounded-full bg-cyan-50 dark:bg-cyan-950/50 text-cyan-700 dark:text-cyan-300 border border-cyan-200/60 uppercase">
                      PTS
                    </span>
                  </div>
                  <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white font-mono tracking-tight text-cyan-600 dark:text-cyan-400">
                    +{activeReport.totalWeeklyPoints}
                  </div>
                  <div className="text-xs sm:text-[13px] font-bold text-slate-700 dark:text-slate-200 mt-1">
                    {t("weeklyReports.totalPointsEarned")}
                  </div>
                </div>
                <div className="text-[11px] font-medium text-slate-400 dark:text-slate-500 mt-2 pt-2 border-t border-slate-100 dark:border-white/5">
                  {lang === "ar" ? "مجموع نقاط الدورة" : "Cycle points total"}
                </div>
              </div>

              {/* Overall Grade Tier */}
              <div className="p-4 sm:p-5 rounded-[22px] bg-gradient-to-br from-white/95 to-slate-50/80 dark:from-slate-800/80 dark:to-slate-900/90 border border-slate-200/90 dark:border-white/10 shadow-sm flex flex-col justify-between hover:shadow-md hover:-translate-y-0.5 transition-all text-start">
                <div>
                  <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400 mb-2.5">
                    <div className="h-10 w-10 sm:h-11 sm:w-11 rounded-2xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 shadow-xs">
                      <ShieldCheck className="h-5 w-5" />
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${activeReport.tier.colorClass}`}
                    >
                      {lang === "ar" ? activeReport.tier.labelAr : activeReport.tier.labelEn}
                    </span>
                  </div>
                  <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white font-mono tracking-tight">
                    {activeReport.overallScore > 0 ? `${activeReport.overallScore}%` : "—"}
                  </div>
                  <div className="text-xs sm:text-[13px] font-bold text-slate-700 dark:text-slate-200 mt-1">
                    {t("weeklyReports.overallScore")} ({activeReport.tier.grade})
                  </div>
                </div>
                <div className="text-[11px] font-medium text-slate-400 dark:text-slate-500 mt-2 pt-2 border-t border-slate-100 dark:border-white/5">
                  {lang === "ar" ? "التقييم الشامل" : "Weighted 7-day score"}
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
                      className="p-4 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200/80 dark:border-white/10 shadow-xs hover:shadow-sm transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-start"
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        <div className="h-10 w-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-cyan-400 font-black text-xs flex items-center justify-center shrink-0 border border-indigo-200/60 dark:border-indigo-800/60 shadow-xs">
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
                        <span className="text-xs font-black text-indigo-700 dark:text-indigo-300 px-3 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200/80 dark:border-indigo-800/60 shadow-xs">
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
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-white/5 text-xs text-slate-500">
                  {t("weeklyReports.noActivity")}
                </div>
              ) : (
                <div className="space-y-2.5">
                  {activeReport.assignments.map((a) => (
                    <div
                      key={a.assignmentId}
                      className="p-4 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200/80 dark:border-white/10 shadow-xs hover:shadow-sm transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-start"
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        <div className="h-10 w-10 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-300 font-black text-xs flex items-center justify-center shrink-0 border border-purple-200/60 dark:border-purple-800/60 shadow-xs">
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
                        <span className="text-xs font-black text-purple-700 dark:text-purple-300 px-3 py-1.5 rounded-xl bg-purple-50 dark:bg-purple-950/60 border border-purple-200/80 dark:border-purple-800/60 shadow-xs">
                          {a.score !== null ? `${a.score} / ${a.maxMarks}` : "Submitted"} {t("weeklyReports.points")}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Bottom 7-Day Auto Dispatch Explanation Card */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-white/10 flex items-center gap-3 text-xs text-slate-600 dark:text-slate-300">
              <Clock className="h-5 w-5 text-indigo-600 dark:text-cyan-400 shrink-0" />
              <span>{t("weeklyReports.autoDispatchNote")}</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-3xl p-12 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10">
          <CalendarCheck className="h-10 w-10 text-slate-400 mx-auto mb-2" />
          <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300">
            {t("weeklyReports.noActivity")}
          </h3>
        </div>
      )}
    </div>
  );
}
