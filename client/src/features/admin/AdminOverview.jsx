import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  Users,
  GraduationCap,
  BookOpen,
  ClipboardCheck,
  Award,
  TrendingUp,
  FileText,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  listUsers,
  listCourses,
  listAssignments,
  listQuizzes,
  listResults,
} from "../../services/platformService";
import ScoreboardModule from "../scoreboard/ScoreboardModule";
import InstructorAnalyticsDashboard from "../instructor/InstructorAnalyticsDashboard";
import { useLang } from "../../context/LangContext";

const PIE_COLORS = ["#10b981", "#f59e0b"];

export default function AdminOverview() {
  const { t } = useTranslation();
  const { lang } = useLang();

  const [loading, setLoading] = useState(true);
  const [selectedInstUid, setSelectedInstUid] = useState("all");
  const [data, setData] = useState({
    instructors: [],
    students: [],
    courses: [],
    assignments: [],
    quizzes: [],
    results: [],
  });

  useEffect(() => {
    Promise.all([
      listUsers(),
      listCourses(),
      listAssignments(),
      listQuizzes(),
      listResults(),
    ])
      .then(([users, courses, assignments, quizzes, results]) => {
        setData({
          instructors: users.filter((u) => u.role === "instructor"),
          students: users.filter((u) => u.role === "student"),
          courses,
          assignments,
          quizzes,
          results,
        });
      })
      .finally(() => setLoading(false));
  }, []);

  const { instructors, students, courses, assignments, quizzes, results } = data;

  const totalAssignmentsAndLessons = assignments.length;
  const totalLessons = courses.reduce(
    (sum, c) => sum + (Array.isArray(c.lessons) ? c.lessons.length : 0),
    0
  );
  const publishedQuizzes = quizzes.filter((q) => q.status === "published").length;
  const draftQuizzes = quizzes.length - publishedQuizzes;
  const avgScore =
    results.length > 0
      ? Math.round(results.reduce((s, r) => s + (Number(r.score) || 0), 0) / results.length)
      : 0;
  const passCount = results.filter((r) => (Number(r.score) || 0) >= 60).length;
  const passRate = results.length > 0 ? Math.round((passCount / results.length) * 100) : 0;

  // Per-instructor full deep-dive breakdown
  const instructorAnalytics = instructors.map((inst) => {
    const instName = inst.name?.[lang] || inst.displayName || inst.username;
    const instStudents = students.filter(
      (s) => Array.isArray(s.instructorIds) && s.instructorIds.includes(inst.uid)
    );
    const pendingStudents = students.filter(
      (s) => s.instructorRequests?.[inst.uid] === "pending"
    );
    const instCourses = courses.filter((c) => c.instructorId === inst.uid);
    const instCourseIds = instCourses.map((c) => c.id);
    const instLessonsCount = instCourses.reduce(
      (sum, c) => sum + (Array.isArray(c.lessons) ? c.lessons.length : 0),
      0
    );
    const instAssignments = assignments.filter(
      (a) => a.instructorId === inst.uid || instCourseIds.includes(a.courseId)
    );
    const instAssignmentSubs = instAssignments.flatMap((a) => a.submissions || []);
    const gradedSubs = instAssignmentSubs.filter(
      (s) => s.score !== undefined && s.score !== null && !Number.isNaN(Number(s.score))
    );
    const avgAssignmentMark =
      gradedSubs.length > 0
        ? Math.round(gradedSubs.reduce((s, x) => s + Number(x.score), 0) / gradedSubs.length)
        : 0;

    const instQuizzes = quizzes.filter(
      (q) => q.instructorId === inst.uid || instCourseIds.includes(q.courseId)
    );
    const instPublishedQuizzes = instQuizzes.filter((q) => q.status === "published").length;
    const instResults = results.filter(
      (r) => r.instructorId === inst.uid || instCourseIds.includes(r.courseId)
    );
    const instAvg =
      instResults.length > 0
        ? Math.round(
            instResults.reduce((s, r) => s + (Number(r.score) || 0), 0) / instResults.length
          )
        : 0;
    const instPassCount = instResults.filter((r) => (Number(r.score) || 0) >= 60).length;
    const instPassRate =
      instResults.length > 0 ? Math.round((instPassCount / instResults.length) * 100) : 0;

    const courseDetails = instCourses.map((course) => {
      const cAssn = instAssignments.filter((a) => a.courseId === course.id);
      const cQuizzes = instQuizzes.filter((q) => q.courseId === course.id);
      const cResults = instResults.filter((r) => r.courseId === course.id);
      const cAvg =
        cResults.length > 0
          ? Math.round(cResults.reduce((s, r) => s + (Number(r.score) || 0), 0) / cResults.length)
          : 0;
      return {
        id: course.id,
        title: course.title?.[lang] || course.title?.en || course.id,
        lessonsCount: Array.isArray(course.lessons) ? course.lessons.length : 0,
        enrolledCount: Array.isArray(course.enrolledStudents) ? course.enrolledStudents.length : 0,
        assignmentsCount: cAssn.length,
        quizzesCount: cQuizzes.length,
        attemptsCount: cResults.length,
        avgGrade: cAvg,
      };
    });

    return {
      uid: inst.uid,
      name: instName,
      email: inst.email,
      username: inst.username,
      spec: inst.specialization?.[lang] || "—",
      active: inst.active !== false,
      studentsCount: instStudents.length,
      pendingStudentsCount: pendingStudents.length,
      instStudents,
      pendingStudents,
      coursesCount: instCourses.length,
      lessonsCount: instLessonsCount,
      assignmentsCount: instAssignments.length,
      submissionsCount: instAssignmentSubs.length,
      avgAssignmentMark,
      quizzesCount: instQuizzes.length,
      publishedQuizzesCount: instPublishedQuizzes,
      attemptsCount: instResults.length,
      avgScore: instAvg,
      passRate: instPassRate,
      instResults,
      instCourses,
      instAssignments,
      instQuizzes,
      courseDetails,
      rawInst: inst,
    };
  });

  // Grade score buckets
  const scoreDistribution = [
    {
      range: "0-49%",
      count: results.filter((r) => (Number(r.score) || 0) < 50).length,
    },
    {
      range: "50-59%",
      count: results.filter((r) => {
        const s = Number(r.score) || 0;
        return s >= 50 && s < 60;
      }).length,
    },
    {
      range: "60-74%",
      count: results.filter((r) => {
        const s = Number(r.score) || 0;
        return s >= 60 && s < 75;
      }).length,
    },
    {
      range: "75-89%",
      count: results.filter((r) => {
        const s = Number(r.score) || 0;
        return s >= 75 && s < 90;
      }).length,
    },
    {
      range: "90-100%",
      count: results.filter((r) => (Number(r.score) || 0) >= 90).length,
    },
  ];

  const quizStatusPie = [
    { name: t("quizzes.published"), value: publishedQuizzes },
    { name: t("quizzes.draft"), value: draftQuizzes },
  ];

  const getInstructorNames = (ids = []) =>
    ids
      .map((id) => {
        const found = instructors.find((i) => i.uid === id);
        return found ? found.name?.[lang] || found.displayName : id;
      })
      .join(", ");

  const kpis = [
    {
      label: t("admin.kpiInstructors"),
      value: instructors.length,
      sub: `${instructors.filter((i) => i.active !== false).length} ${t("app.active")}`,
      icon: Users,
      color: "text-sky-600 bg-sky-500/15 border border-sky-400/25 dark:text-sky-300",
    },
    {
      label: t("admin.kpiStudents"),
      value: students.length,
      sub: `${students.filter((s) => (s.enrolledCourseIds || []).length > 0).length} ${t("courses.enrolled")}`,
      icon: GraduationCap,
      color: "text-teal-600 bg-teal-500/15 border border-teal-400/25 dark:text-teal-300",
    },
    {
      label: `${t("admin.kpiCourses")} & Assignments`,
      value: `${courses.length} / ${totalAssignmentsAndLessons}`,
      sub: `${totalLessons} Lessons · ${totalAssignmentsAndLessons} Assignments`,
      icon: BookOpen,
      color: "text-emerald-600 bg-emerald-500/15 border border-emerald-400/25 dark:text-emerald-300",
    },
    {
      label: t("admin.kpiQuizzes"),
      value: `${publishedQuizzes} / ${quizzes.length}`,
      sub: `${draftQuizzes} ${t("quizzes.draft")}`,
      icon: ClipboardCheck,
      color: "text-amber-600 bg-amber-500/15 border border-amber-400/25 dark:text-amber-300",
    },
    {
      label: `${t("quizzes.score")} (${t("admin.kpiResults")})`,
      value: `${avgScore}%`,
      sub: `${results.length} attempts · ${passRate}% pass`,
      icon: Award,
      color: "text-cyan-600 bg-cyan-500/15 border border-cyan-400/25 dark:text-cyan-300",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Dark-Teal Glass Hero Banner */}
      <div className="relative overflow-hidden rounded-[26px] p-6 glass-panel border-teal-400/25 shadow-xl">
        <div className="pointer-events-none absolute -top-12 -end-12 h-44 w-44 rounded-full bg-teal-400/15 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-14 start-1/3 h-40 w-40 rounded-full bg-sky-400/15 blur-2xl" />
        <div className="relative">
          <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-teal-500/15 border border-teal-400/30 text-[11px] font-bold text-teal-700 dark:text-teal-300 mb-2">
            Platform Control &amp; Analytics
          </span>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white">
            {t("admin.title")}
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 mt-1">
            Full analytics across Instructors, Students, Courses &amp; Assignments, Quizzes, and Grades.
          </p>
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {kpis.map((k) => {
          const Icon = k.icon;
          return (
            <div key={k.label} className="glass-card p-4 flex flex-col justify-between">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-300">
                  {k.label}
                </span>
                <div className={`h-9 w-9 rounded-2xl flex items-center justify-center shrink-0 shadow-sm ${k.color}`}>
                  <Icon className="h-4 w-4" />
                </div>
              </div>
              <div className="text-2xl font-black mt-3 text-slate-900 dark:text-white">
                {loading ? "…" : k.value}
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">{k.sub}</div>
            </div>
          );
        })}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Per-Instructor Activity Bar Chart */}
        <div className="lg:col-span-2 glass-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="h-4 w-4 text-teal-500" />
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Instructor Workload &amp; Activity (Students, Courses, Lessons, Quizzes)
            </h2>
          </div>
          {instructorAnalytics.length === 0 ? (
            <div className="h-60 flex items-center justify-center text-xs text-slate-500 dark:text-slate-400">
              Add instructors to see per-instructor analytics.
            </div>
          ) : (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={instructorAnalytics}>
                  <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.15} />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#94a3b8" }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#94a3b8" }} />
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="studentsCount" name={t("nav.students")} fill="#0ea5e9" radius={[5, 5, 0, 0]} />
                  <Bar dataKey="coursesCount" name={t("admin.kpiCourses")} fill="#14b8a6" radius={[5, 5, 0, 0]} />
                  <Bar dataKey="assignmentsCount" name={t("courses.lessons")} fill="#10b981" radius={[5, 5, 0, 0]} />
                  <Bar dataKey="quizzesCount" name="Quizzes" fill="#f59e0b" radius={[5, 5, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Quiz Status Pie + Score Summary */}
        <div className="glass-card p-5 flex flex-col justify-between">
          <h2 className="text-base font-bold text-slate-900 dark:text-white mb-2">Quiz Status Breakdown</h2>
          {quizzes.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-xs text-slate-500 dark:text-slate-400">
              No quizzes created yet.
            </div>
          ) : (
            <div className="h-52 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={quizStatusPie}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={42}
                    outerRadius={72}
                    paddingAngle={4}
                  >
                    {quizStatusPie.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
          <div className="text-xs text-slate-500 dark:text-slate-400 border-t border-slate-200/70 dark:border-white/10 pt-2.5 flex justify-between">
            <span>Pass Rate (&ge;60%)</span>
            <strong className="text-emerald-600 dark:text-emerald-400">{passRate}%</strong>
          </div>
        </div>
      </div>

      {/* Grade Distribution Chart */}
      <div className="glass-card p-5">
        <div className="flex items-center gap-2 mb-4">
          <Award className="h-4 w-4 text-teal-500" />
          <h2 className="text-base font-bold text-slate-900 dark:text-white">Student Grade Distribution</h2>
        </div>
        <div className="h-52 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={scoreDistribution}>
              <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.15} />
              <XAxis dataKey="range" tick={{ fontSize: 12, fill: "#94a3b8" }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: "#94a3b8" }} />
              <Tooltip />
              <Bar dataKey="count" name="Attempts" fill="#14b8a6" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Full Instructor Analysis Table */}
      <div className="glass-panel rounded-[24px] overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-200/70 dark:border-white/10 flex items-center justify-between">
          <h2 className="text-sm font-bold flex items-center gap-2 text-slate-900 dark:text-white">
            <Users className="h-4 w-4 text-teal-500" />
            Instructors Analysis
          </h2>
          <Link to="/admin/instructors" className="text-xs font-semibold text-teal-600 dark:text-teal-400 hover:underline">
            {t("admin.manageInstructors")}
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-start">
            <thead className="bg-slate-900/5 dark:bg-white/[0.04] border-b border-slate-200/70 dark:border-white/10 uppercase tracking-wider text-slate-600 dark:text-slate-300">
              <tr>
                <th className="px-4 py-2.5 text-start">Instructor</th>
                <th className="px-4 py-2.5 text-start">Specialization</th>
                <th className="px-4 py-2.5 text-start">Students (Pending)</th>
                <th className="px-4 py-2.5 text-start">Courses / Lessons</th>
                <th className="px-4 py-2.5 text-start">Assignments (Avg)</th>
                <th className="px-4 py-2.5 text-start">Quizzes (Pub)</th>
                <th className="px-4 py-2.5 text-start">Attempts / Pass%</th>
                <th className="px-4 py-2.5 text-start">Avg Quiz</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/70 dark:divide-white/10">
              {instructorAnalytics.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-6 text-center text-slate-500 dark:text-slate-400">
                    {t("app.noData")}
                  </td>
                </tr>
              ) : (
                instructorAnalytics.map((row) => (
                  <tr
                    key={row.uid}
                    onClick={() => setSelectedInstUid(row.uid)}
                    className="hover:bg-teal-500/5 cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-2.5 font-semibold text-slate-900 dark:text-white">{row.name}</td>
                    <td className="px-4 py-2.5 text-slate-500 dark:text-slate-400">{row.spec}</td>
                    <td className="px-4 py-2.5 font-bold">
                      {row.studentsCount}{" "}
                      {row.pendingStudentsCount > 0 && (
                        <span className="text-amber-500">({row.pendingStudentsCount} pending)</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5">
                      {row.coursesCount} / {row.lessonsCount}
                    </td>
                    <td className="px-4 py-2.5">
                      {row.assignmentsCount} ({row.avgAssignmentMark}%)
                    </td>
                    <td className="px-4 py-2.5">
                      {row.quizzesCount} ({row.publishedQuizzesCount})
                    </td>
                    <td className="px-4 py-2.5">
                      {row.attemptsCount} / {row.passRate}%
                    </td>
                    <td className="px-4 py-2.5 font-bold text-teal-600 dark:text-teal-400">{row.avgScore}%</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Deep-Dive Full Analysis for Each Instructor */}
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-extrabold flex items-center gap-2 text-slate-900 dark:text-white">
              <Users className="h-5 w-5 text-teal-500" />
              {lang === "ar"
                ? "التحليل التفصيلي الكامل لكل محاضر"
                : "Full Deep-Dive Analysis per Instructor"}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Courses, lessons, students, assignments, quizzes, and grade performance broken down for each instructor.
            </p>
          </div>
          {instructorAnalytics.length > 0 && (
            <select
              value={selectedInstUid}
              onChange={(e) => setSelectedInstUid(e.target.value)}
              className="px-3 py-2 rounded-xl glass-input text-xs font-semibold"
            >
              <option value="all">All Instructors ({instructorAnalytics.length})</option>
              {instructorAnalytics.map((inst) => (
                <option key={inst.uid} value={inst.uid}>
                  {inst.name}
                </option>
              ))}
            </select>
          )}
        </div>

        {(selectedInstUid === "all"
          ? instructorAnalytics
          : instructorAnalytics.filter((i) => i.uid === selectedInstUid)
        ).map((inst) => (
          <div key={inst.uid} className="glass-card p-5 space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/50 dark:border-white/10 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-extrabold">{inst.name}</h3>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      inst.active
                        ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                        : "bg-slate-500/20 text-slate-600 dark:text-slate-300"
                    }`}
                  >
                    {inst.active ? t("app.active") : t("app.inactive")}
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {inst.spec} · @{inst.username} · {inst.email}
                </p>
              </div>
              <div className="flex flex-wrap gap-2 text-xs">
                <span className="px-2.5 py-1 rounded-xl glass-subtle font-bold">
                  Students: {inst.studentsCount}
                </span>
                <span className="px-2.5 py-1 rounded-xl glass-subtle font-bold">
                  Courses: {inst.coursesCount} ({inst.lessonsCount} Lessons)
                </span>
                <span className="px-2.5 py-1 rounded-xl glass-subtle font-bold">
                  Assignments: {inst.assignmentsCount} ({inst.submissionsCount} Subs · Avg {inst.avgAssignmentMark}%)
                </span>
                <span className="px-2.5 py-1 rounded-xl glass-subtle font-bold text-sky-700 dark:text-sky-300">
                  Quiz Avg: {inst.avgScore}% · Pass: {inst.passRate}%
                </span>
              </div>
            </div>

            <InstructorAnalyticsDashboard
              instructorId={inst.uid}
              instructorProfile={inst.rawInst}
              showManageLinks={false}
              preloaded={{
                instructor: inst.rawInst,
                students,
                courses: inst.instCourses,
                assignments: inst.instAssignments,
                quizzes: inst.instQuizzes,
                results: inst.instResults,
              }}
            />
          </div>
        ))}
      </div>

      {/* Students & Recent Grades Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass-panel rounded-[24px] overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-200/70 dark:border-white/10 font-bold text-sm flex items-center gap-2 text-slate-900 dark:text-white">
            <GraduationCap className="h-4 w-4 text-teal-500" />
            Students Enrollment &amp; Instructor Links
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-start">
              <thead className="bg-slate-900/5 dark:bg-white/[0.04] border-b border-slate-200/70 dark:border-white/10 uppercase tracking-wider text-slate-600 dark:text-slate-300">
                <tr>
                  <th className="px-4 py-2.5 text-start">Student</th>
                  <th className="px-4 py-2.5 text-start">Enrolled Courses</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/70 dark:divide-white/10">
                {students.length === 0 ? (
                  <tr>
                    <td colSpan={2} className="px-4 py-6 text-center text-slate-500 dark:text-slate-400">
                      {t("app.noData")}
                    </td>
                  </tr>
                ) : (
                  students.slice(0, 10).map((s) => (
                    <tr key={s.uid} className="hover:bg-teal-500/5 transition-colors">
                      <td className="px-4 py-2.5 font-semibold text-slate-900 dark:text-white">{s.displayName}</td>
                      <td className="px-4 py-2.5">{(s.enrolledCourseIds || []).length}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="glass-panel rounded-[24px] overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-200/70 dark:border-white/10 font-bold text-sm flex items-center justify-between text-slate-900 dark:text-white">
            <span className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-emerald-500" />
              Recent Quiz Grades &amp; Assignments
            </span>
            <Link to="/admin/grades" className="text-xs font-semibold text-teal-600 dark:text-teal-400 hover:underline">
              View All
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-start">
              <thead className="bg-slate-900/5 dark:bg-white/[0.04] border-b border-slate-200/70 dark:border-white/10 uppercase tracking-wider text-slate-600 dark:text-slate-300">
                <tr>
                  <th className="px-4 py-2.5 text-start">Student</th>
                  <th className="px-4 py-2.5 text-start">Quiz</th>
                  <th className="px-4 py-2.5 text-start">Score</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/70 dark:divide-white/10">
                {results.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-4 py-6 text-center text-slate-500 dark:text-slate-400">
                      {t("app.noData")}
                    </td>
                  </tr>
                ) : (
                  results.slice(0, 10).map((r) => {
                    const pts =
                      r.points !== undefined
                        ? Number(r.points) || 0
                        : Math.round(((Number(r.score) || 0) / 100) * (Number(r.total) || 1));
                    const tot = Number(r.total) || pts || 1;
                    return (
                      <tr key={r.id} className="hover:bg-teal-500/5 transition-colors">
                        <td className="px-4 py-2.5 font-semibold text-slate-900 dark:text-white">{r.studentName || r.studentId}</td>
                        <td className="px-4 py-2.5 text-slate-500 dark:text-slate-400">{r.quizTitle || r.quizId}</td>
                        <td className="px-4 py-2.5">
                          <span
                            className={`px-2.5 py-0.5 rounded-full font-bold border ${
                              (Number(r.score) || 0) >= 60
                                ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-400/30"
                                : "bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-400/30"
                            }`}
                          >
                            {pts}/{tot} pts ({r.score}%)
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Top 3 Students Scoreboard per Course */}
      <ScoreboardModule mode="admin" embedded />
    </div>
  );
}
