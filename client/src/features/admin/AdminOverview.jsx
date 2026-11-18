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
      color: "text-sky-600 bg-sky-100 dark:bg-sky-900/50 dark:text-sky-300",
    },
    {
      label: t("admin.kpiStudents"),
      value: students.length,
      sub: `${students.filter((s) => (s.enrolledCourseIds || []).length > 0).length} ${t("courses.enrolled")}`,
      icon: GraduationCap,
      color: "text-indigo-600 bg-indigo-100 dark:bg-indigo-900/50 dark:text-indigo-300",
    },
    {
      label: `${t("admin.kpiCourses")} & Assignments`,
      value: `${courses.length} / ${totalAssignmentsAndLessons}`,
      sub: `${totalLessons} Lessons · ${totalAssignmentsAndLessons} Assignments`,
      icon: BookOpen,
      color: "text-emerald-600 bg-emerald-100 dark:bg-emerald-900/50 dark:text-emerald-300",
    },
    {
      label: t("admin.kpiQuizzes"),
      value: `${publishedQuizzes} / ${quizzes.length}`,
      sub: `${draftQuizzes} ${t("quizzes.draft")}`,
      icon: ClipboardCheck,
      color: "text-amber-600 bg-amber-100 dark:bg-amber-900/50 dark:text-amber-300",
    },
    {
      label: `${t("quizzes.score")} (${t("admin.kpiResults")})`,
      value: `${avgScore}%`,
      sub: `${results.length} attempts · ${passRate}% pass`,
      icon: Award,
      color: "text-rose-600 bg-rose-100 dark:bg-rose-900/50 dark:text-rose-300",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Colorful Hero Banner */}
      <div className="relative overflow-hidden rounded-[28px] p-6 bg-gradient-to-r from-fuchsia-600 via-violet-600 to-indigo-600 text-white shadow-xl shadow-violet-500/20">
        <div className="pointer-events-none absolute -top-12 -end-12 h-44 w-44 rounded-full bg-white/15 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-14 start-1/3 h-40 w-40 rounded-full bg-cyan-400/25 blur-2xl" />
        <div className="relative">
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
            {t("admin.title")}
          </h1>
          <p className="text-xs sm:text-sm text-white/85 mt-1">
            Full analytics across Instructors, Students, Courses &amp; Assignments, Quizzes, and Grades.
          </p>
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {kpis.map((k, idx) => {
          const Icon = k.icon;
          const topStripes = [
            "from-cyan-400 to-blue-500",
            "from-violet-500 to-fuchsia-500",
            "from-emerald-400 to-teal-500",
            "from-amber-400 to-orange-500",
            "from-rose-400 to-pink-500",
          ];
          return (
            <div key={k.label} className="glass-card p-4 pt-5">
              <div className={`absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r ${topStripes[idx % topStripes.length]}`} />
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
                  {k.label}
                </span>
                <div className={`h-9 w-9 rounded-2xl flex items-center justify-center shadow-sm ${k.color}`}>
                  <Icon className="h-4 w-4" />
                </div>
              </div>
              <div className="text-2xl font-black mt-2.5">{loading ? "…" : k.value}</div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{k.sub}</div>
            </div>
          );
        })}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Per-Instructor Activity Bar Chart */}
        <div className="lg:col-span-2 glass-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="h-4 w-4 text-sky-600" />
            <h2 className="text-base font-bold">
              Instructor Workload &amp; Activity (Students, Courses, Lessons, Quizzes)
            </h2>
          </div>
          {instructorAnalytics.length === 0 ? (
            <div className="h-60 flex items-center justify-center text-xs text-slate-500">
              Add instructors to see per-instructor analytics.
            </div>
          ) : (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={instructorAnalytics}>
                  <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2} />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="studentsCount" name={t("nav.students")} fill="#6366f1" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="coursesCount" name={t("admin.kpiCourses")} fill="#0284c7" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="assignmentsCount" name={t("courses.lessons")} fill="#10b981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="quizzesCount" name="Quizzes" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Quiz Status Pie + Score Summary */}
        <div className="glass-card p-5 flex flex-col justify-between">
          <h2 className="text-base font-bold mb-2">Quiz Status Breakdown</h2>
          {quizzes.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-xs text-slate-500">
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
          <div className="text-xs text-slate-500 dark:text-slate-400 border-t border-slate-200 dark:border-slate-800 pt-2.5 flex justify-between">
            <span>Pass Rate (&ge;60%)</span>
            <strong className="text-emerald-600 dark:text-emerald-400">{passRate}%</strong>
          </div>
        </div>
      </div>

      {/* Grade Distribution Chart */}
      <div className="glass-card p-5">
        <div className="flex items-center gap-2 mb-4">
          <Award className="h-4 w-4 text-rose-600" />
          <h2 className="text-base font-bold">Student Grade Distribution</h2>
        </div>
        <div className="h-52 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={scoreDistribution}>
              <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2} />
              <XAxis dataKey="range" tick={{ fontSize: 12 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="count" name="Attempts" fill="#e11d48" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Full Instructor Analysis Table */}
      <div className="glass-card overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <h2 className="text-sm font-bold flex items-center gap-2">
            <Users className="h-4 w-4 text-sky-600" />
            Instructors Analysis
          </h2>
          <Link to="/admin/instructors" className="text-xs font-semibold text-sky-600 hover:underline">
            {t("admin.manageInstructors")}
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-start">
            <thead className="bg-slate-900/5 dark:bg-white/5 uppercase text-slate-600 dark:text-slate-300">
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
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {instructorAnalytics.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-6 text-center text-slate-500">
                    {t("app.noData")}
                  </td>
                </tr>
              ) : (
                instructorAnalytics.map((row) => (
                  <tr
                    key={row.uid}
                    onClick={() => setSelectedInstUid(row.uid)}
                    className="hover:bg-sky-500/10 cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-2.5 font-semibold">{row.name}</td>
                    <td className="px-4 py-2.5 text-slate-500">{row.spec}</td>
                    <td className="px-4 py-2.5 font-bold">
                      {row.studentsCount}{" "}
                      {row.pendingStudentsCount > 0 && (
                        <span className="text-amber-600">({row.pendingStudentsCount} pending)</span>
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
                    <td className="px-4 py-2.5 font-bold text-sky-600">{row.avgScore}%</td>
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
            <h2 className="text-lg font-extrabold flex items-center gap-2">
              <Users className="h-5 w-5 text-sky-600" />
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
        <div className="glass-card overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 font-bold text-sm flex items-center gap-2">
            <GraduationCap className="h-4 w-4 text-indigo-600" />
            Students Enrollment &amp; Instructor Links
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-start">
              <thead className="bg-slate-100 dark:bg-slate-800 uppercase text-slate-600 dark:text-slate-300">
                <tr>
                  <th className="px-4 py-2.5 text-start">Student</th>
                  <th className="px-4 py-2.5 text-start">Enrolled Courses</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {students.length === 0 ? (
                  <tr>
                    <td colSpan={2} className="px-4 py-6 text-center text-slate-500">
                      {t("app.noData")}
                    </td>
                  </tr>
                ) : (
                  students.slice(0, 10).map((s) => (
                    <tr key={s.uid}>
                      <td className="px-4 py-2.5 font-semibold">{s.displayName}</td>
                      <td className="px-4 py-2.5">{(s.enrolledCourseIds || []).length}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="glass-card overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 font-bold text-sm flex items-center justify-between">
            <span className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-emerald-600" />
              Recent Quiz Grades &amp; Assignments
            </span>
            <Link to="/admin/grades" className="text-xs font-semibold text-sky-600 hover:underline">
              View All
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-start">
              <thead className="bg-slate-100 dark:bg-slate-800 uppercase text-slate-600 dark:text-slate-300">
                <tr>
                  <th className="px-4 py-2.5 text-start">Student</th>
                  <th className="px-4 py-2.5 text-start">Quiz</th>
                  <th className="px-4 py-2.5 text-start">Score</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {results.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-4 py-6 text-center text-slate-500">
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
                      <tr key={r.id}>
                        <td className="px-4 py-2.5 font-semibold">{r.studentName || r.studentId}</td>
                        <td className="px-4 py-2.5 text-slate-500">{r.quizTitle || r.quizId}</td>
                        <td className="px-4 py-2.5">
                          <span
                            className={`px-2 py-0.5 rounded-full font-bold ${
                              (Number(r.score) || 0) >= 60
                                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
                                : "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300"
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
