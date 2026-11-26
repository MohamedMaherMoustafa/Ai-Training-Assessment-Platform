import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";
import {
  Users,
  BookOpen,
  ClipboardList,
  ClipboardCheck,
  Award,
  TrendingUp,
  BarChart3,
  PieChart as PieIcon,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  Power,
  AlertTriangle,
  MessageCircle,
} from "lucide-react";
import { openWhatsAppSupportChat } from "../../utils/whatsappHelper";
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
  listAssignments,
  listCourses,
  listQuizAccess,
  listQuizzes,
  listResults,
  listUsers,
  updateUserRecord,
} from "../../services/platformService";
import { useLang } from "../../context/LangContext";

const PASS_COLORS = ["#10b981", "#f43f5e"];

export default function InstructorAnalyticsDashboard({
  instructorId,
  instructorProfile = null,
  showManageLinks = true,
  preloaded = null,
}) {
  const { t } = useTranslation();
  const { lang } = useLang();

  const [loading, setLoading] = useState(!preloaded);
  const [state, setState] = useState({
    instructor: instructorProfile,
    students: [],
    courses: [],
    assignments: [],
    quizzes: [],
    results: [],
    quizAccess: {},
  });

  useEffect(() => {
    if (preloaded) {
      setState({
        instructor: instructorProfile || preloaded.instructor,
        students: preloaded.students || [],
        courses: preloaded.courses || [],
        assignments: preloaded.assignments || [],
        quizzes: preloaded.quizzes || [],
        results: preloaded.results || [],
        quizAccess: preloaded.quizAccess || {},
      });
      setLoading(false);
      return;
    }
    if (!instructorId) return;
    setLoading(true);
    Promise.all([
      listUsers("student"),
      listCourses(instructorId),
      listAssignments(),
      listQuizzes(),
      listResults(),
      listQuizAccess(),
    ])
      .then(([allStudents, myCourses, allAssn, allQuizzes, allResults, accessMap]) => {
        const myCourseIds = myCourses.map((c) => c.id);
        setState({
          instructor: instructorProfile,
          students: allStudents,
          courses: myCourses,
          assignments: allAssn.filter(
            (a) => a.instructorId === instructorId || myCourseIds.includes(a.courseId)
          ),
          quizzes: allQuizzes.filter(
            (q) => q.instructorId === instructorId || myCourseIds.includes(q.courseId)
          ),
          results: allResults.filter(
            (r) => r.instructorId === instructorId || myCourseIds.includes(r.courseId)
          ),
          quizAccess: accessMap || {},
        });
      })
      .finally(() => setLoading(false));
  }, [instructorId, preloaded, instructorProfile]);

  const handleToggleStudentActive = async (student) => {
    const nextActive = student.active === false;
    await updateUserRecord(student.uid, { active: nextActive });
    const name = student.displayName || student.name || student.email;
    if (lang === "ar") {
      toast.success(
        nextActive ? `تم تفعيل حساب الطالب (${name}) بنجاح` : `تم تعطيل حساب الطالب (${name})`
      );
    } else {
      toast.success(
        nextActive ? `Activated account for ${name}` : `Deactivated account for ${name}`
      );
    }
    setState((prev) => ({
      ...prev,
      students: prev.students.map((s) =>
        s.uid === student.uid ? { ...s, active: nextActive } : s
      ),
    }));
  };

  const { instructor, students, courses, assignments, quizzes, results, quizAccess } = state;

  const approvedStudents = students.filter(
    (s) => Array.isArray(s.instructorIds) && s.instructorIds.includes(instructorId)
  );
  const pendingStudents = students.filter(
    (s) => s.instructorRequests?.[instructorId] === "pending"
  );

  const totalLessons = courses.reduce(
    (sum, c) => sum + (Array.isArray(c.lessons) ? c.lessons.length : 0),
    0
  );
  const totalEnrolments = courses.reduce(
    (sum, c) => sum + (Array.isArray(c.enrolledStudents) ? c.enrolledStudents.length : 0),
    0
  );

  const allSubmissions = assignments.flatMap((a) => a.submissions || []);
  const gradedSubs = allSubmissions.filter(
    (s) => s.score !== undefined && s.score !== null && !Number.isNaN(Number(s.score))
  );
  const avgAssignmentScore =
    gradedSubs.length > 0
      ? Math.round(gradedSubs.reduce((s, x) => s + Number(x.score), 0) / gradedSubs.length)
      : 0;

  const publishedQuizzes = quizzes.filter((q) => q.status === "published").length;
  const draftQuizzes = quizzes.length - publishedQuizzes;

  const myQuizIds = quizzes.map((q) => q.id);
  let pendingRetakesCount = 0;
  Object.entries(quizAccess || {}).forEach(([qId, map]) => {
    if (!myQuizIds.includes(qId)) return;
    Object.values(map || {}).forEach((info) => {
      if (info?.retakeStatus === "pending") pendingRetakesCount += 1;
    });
  });

  const avgQuizScore =
    results.length > 0
      ? Math.round(results.reduce((s, r) => s + (Number(r.score) || 0), 0) / results.length)
      : 0;
  const passCount = results.filter((r) => (Number(r.score) || 0) >= 60).length;
  const failCount = results.length - passCount;
  const passRate = results.length > 0 ? Math.round((passCount / results.length) * 100) : 0;

  // Per-course deep analytics & progress score
  const courseMetrics = courses.map((course) => {
    const title = course.title?.[lang] || course.title?.en || course.id;
    const lessonsCount = Array.isArray(course.lessons) ? course.lessons.length : 0;
    const enrolledCount = Array.isArray(course.enrolledStudents)
      ? course.enrolledStudents.length
      : 0;
    const cAssn = assignments.filter((a) => a.courseId === course.id);
    const cAssnSubs = cAssn.flatMap((a) => a.submissions || []);
    const cGradedSubs = cAssnSubs.filter(
      (s) => s.score !== undefined && s.score !== null && !Number.isNaN(Number(s.score))
    );
    const assnAvg =
      cGradedSubs.length > 0
        ? Math.round(cGradedSubs.reduce((s, x) => s + Number(x.score), 0) / cGradedSubs.length)
        : 0;

    const cQuizzes = quizzes.filter((q) => q.courseId === course.id);
    const cPublishedQuizzes = cQuizzes.filter((q) => q.status === "published").length;
    const cResults = results.filter((r) => r.courseId === course.id);
    const quizAvg =
      cResults.length > 0
        ? Math.round(cResults.reduce((s, r) => s + (Number(r.score) || 0), 0) / cResults.length)
        : 0;

    // Course readiness & progress indicator (0-100%)
    const hasLesson = lessonsCount > 0 ? 25 : 0;
    const hasPublishedQuiz = cPublishedQuizzes > 0 ? 25 : cQuizzes.length > 0 ? 15 : 0;
    const enrolmentRatio =
      approvedStudents.length > 0
        ? Math.min(25, Math.round((enrolledCount / approvedStudents.length) * 25))
        : enrolledCount > 0
        ? 25
        : 0;
    const assessmentActivity =
      cResults.length + cAssnSubs.length > 0
        ? Math.min(25, Math.round(((cResults.length + cAssnSubs.length) / Math.max(enrolledCount, 1)) * 25))
        : 0;
    const progressPct = Math.min(100, hasLesson + hasPublishedQuiz + enrolmentRatio + assessmentActivity);

    return {
      id: course.id,
      title,
      shortTitle: title.length > 16 ? `${title.slice(0, 15)}…` : title,
      lessonsCount,
      enrolledCount,
      assignmentsCount: cAssn.length,
      submissionsCount: cAssnSubs.length,
      quizzesCount: cQuizzes.length,
      publishedQuizzes: cPublishedQuizzes,
      attemptsCount: cResults.length,
      quizAvg,
      assnAvg,
      progressPct,
    };
  });

  // Grade distribution buckets for this instructor
  const gradeBuckets = [
    { range: "0-49%", count: results.filter((r) => (Number(r.score) || 0) < 50).length },
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
    { range: "90-100%", count: results.filter((r) => (Number(r.score) || 0) >= 90).length },
  ];

  const passPieData = [
    { name: lang === "ar" ? "ناجح (≥60%)" : "Passed (>=60%)", value: passCount },
    { name: lang === "ar" ? "يحتاج مراجعة" : "Needs Review (<60%)", value: failCount },
  ];

  // Student progress tracking rows
  const studentProgressRows = approvedStudents.map((st) => {
    const stEnrolled = courses.filter((c) =>
      Array.isArray(c.enrolledStudents) ? c.enrolledStudents.includes(st.uid) : false
    ).length;
    const stQuizResults = results.filter((r) => r.studentId === st.uid);
    const stQuizAvg =
      stQuizResults.length > 0
        ? Math.round(
            stQuizResults.reduce((s, r) => s + (Number(r.score) || 0), 0) / stQuizResults.length
          )
        : 0;
    const stSubs = allSubmissions.filter((sub) => (sub.studentId || sub.id) === st.uid);
    const stGradedSubs = stSubs.filter(
      (sub) => sub.score !== undefined && sub.score !== null && !Number.isNaN(Number(sub.score))
    );
    const stAssnAvg =
      stGradedSubs.length > 0
        ? Math.round(
            stGradedSubs.reduce((s, x) => s + Number(x.score), 0) / stGradedSubs.length
          )
        : 0;

    const totalMarksCount = stQuizResults.length + stGradedSubs.length;
    const combinedAvg =
      totalMarksCount > 0
        ? Math.round(
            (stQuizResults.reduce((s, r) => s + (Number(r.score) || 0), 0) +
              stGradedSubs.reduce((s, x) => s + Number(x.score), 0)) /
              totalMarksCount
          )
        : null;

    const phoneNumber = st.phoneNumber || st.phone || "";
    const isAssessed = combinedAvg !== null;
    const needsSupport =
      isAssessed &&
      (combinedAvg < 60 ||
        (stQuizResults.length > 0 && stQuizAvg < 60) ||
        (stGradedSubs.length > 0 && stAssnAvg < 60));

    return {
      uid: st.uid,
      name: st.displayName || st.email,
      email: st.email,
      phoneNumber,
      enrolled: stEnrolled,
      quizAttempts: stQuizResults.length,
      quizAvg: stQuizAvg,
      assnSubs: stSubs.length,
      assnAvg: stAssnAvg,
      combinedAvg,
      needsSupport,
      active: st.active !== false,
      rawStudent: st,
    };
  });

  const handleContactWhatsApp = (studentRow) => {
    const phone =
      studentRow.phoneNumber ||
      studentRow.phone ||
      studentRow.rawStudent?.phoneNumber ||
      studentRow.rawStudent?.phone;
    if (!phone) {
      toast.error(
        lang === "ar"
          ? "لم يقم هذا الطالب بتسجيل رقم هاتف بعد."
          : "This student has not registered a phone number yet."
      );
      return;
    }
    const opened = openWhatsAppSupportChat(phone, null, lang);
    if (opened) {
      toast.success(
        lang === "ar"
          ? "تم فتح محادثة واتساب مع تجهيز رسالة الدعم (اضغط إرسال يدوياً داخل واتساب)."
          : "Opened WhatsApp with support message pre-filled. Press Send manually inside WhatsApp."
      );
    }
  };

  if (loading) {
    return (
      <div className="glass-card p-8 text-center text-sm text-slate-500">
        {t("app.loading")}
      </div>
    );
  }

  const instName =
    instructor?.name?.[lang] || instructor?.displayName || instructor?.username || "";
  const instSpec = instructor?.specialization?.[lang] || t("roles.instructor");

  const kpis = [
    {
      label: t("nav.myStudents"),
      value: approvedStudents.length,
      sub:
        pendingStudents.length > 0
          ? `${pendingStudents.length} pending request(s)`
          : "All requests reviewed",
      icon: Users,
      color: "text-indigo-600 bg-indigo-500/15 dark:text-indigo-300",
      to: showManageLinks ? "/instructor/students" : null,
    },
    {
      label: `${t("nav.myCourses")} & ${t("courses.lessons")}`,
      value: `${courses.length} / ${totalLessons}`,
      sub: `${totalEnrolments} total enrolments`,
      icon: BookOpen,
      color: "text-sky-600 bg-sky-500/15 dark:text-sky-300",
      to: showManageLinks ? "/instructor/courses" : null,
    },
    {
      label: lang === "ar" ? "الواجبات والتسليمات" : "Assignments & Marks",
      value: `${assignments.length} / ${allSubmissions.length}`,
      sub: `Graded ${gradedSubs.length} · Avg ${avgAssignmentScore}%`,
      icon: ClipboardList,
      color: "text-emerald-600 bg-emerald-500/15 dark:text-emerald-300",
      to: showManageLinks ? "/instructor/assignments" : null,
    },
    {
      label: t("nav.quizzes"),
      value: `${publishedQuizzes} / ${quizzes.length}`,
      sub:
        pendingRetakesCount > 0
          ? `${pendingRetakesCount} retake request(s)`
          : `${draftQuizzes} draft(s)`,
      icon: ClipboardCheck,
      color: "text-amber-600 bg-amber-500/15 dark:text-amber-300",
      to: showManageLinks ? "/instructor/quizzes" : null,
    },
    {
      label: lang === "ar" ? "متوسط الاختبارات والنجاح" : "Quiz Avg & Pass Rate",
      value: `${avgQuizScore}%`,
      sub: `${results.length} attempts · ${passRate}% pass`,
      icon: Award,
      color: "text-cyan-600 bg-cyan-500/15 border border-cyan-400/25 dark:text-cyan-300",
      to: showManageLinks ? "/instructor/grades" : null,
    },
  ];

  return (
    <div className="space-y-6">
      {showManageLinks && (
        <div className="relative overflow-hidden rounded-[26px] p-6 glass-panel border-teal-400/25 shadow-xl">
          <div className="pointer-events-none absolute -top-12 -end-12 h-44 w-44 rounded-full bg-teal-400/15 blur-2xl" />
          <div className="relative">
            <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-teal-500/15 border border-teal-400/30 text-[11px] font-bold text-teal-700 dark:text-teal-300 mb-2">
              Instructor Workspace
            </span>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white">{instName}</h1>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 mt-1">
              {instSpec} —{" "}
              {lang === "ar"
                ? "لوحة تحليل وإدارة تقدم المقررات والطلاب"
                : "Course Progress & Performance Analysis Dashboard"}
            </p>
          </div>
        </div>
      )}

      {/* 5 KPI Analysis Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {kpis.map((k) => {
          const Icon = k.icon;
          const cardBody = (
            <>
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-300">
                  {k.label}
                </span>
                <div className={`h-9 w-9 rounded-2xl flex items-center justify-center shrink-0 shadow-sm ${k.color}`}>
                  <Icon className="h-4 w-4" />
                </div>
              </div>
              <div className="text-2xl font-black mt-3 text-slate-900 dark:text-white">{k.value}</div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 flex items-center justify-between">
                <span>{k.sub}</span>
                {k.to && <ArrowUpRight className="h-3.5 w-3.5 text-teal-400" />}
              </div>
            </>
          );
          return k.to ? (
            <Link key={k.label} to={k.to} className="glass-card p-4 flex flex-col justify-between">
              {cardBody}
            </Link>
          ) : (
            <div key={k.label} className="glass-card p-4 flex flex-col justify-between">
              {cardBody}
            </div>
          );
        })}
      </div>

      {/* 3 Analytical Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Course Activity Chart */}
        <div className="glass-card p-5">
          <div className="flex items-center gap-2 mb-3">
            <BarChart3 className="h-4 w-4 text-teal-500" />
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">Course Activity &amp; Content</h2>
          </div>
          {courseMetrics.length === 0 ? (
            <div className="h-52 flex items-center justify-center text-xs text-slate-500 dark:text-slate-400">
              No courses yet.
            </div>
          ) : (
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={courseMetrics}>
                  <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.15} />
                  <XAxis dataKey="shortTitle" tick={{ fontSize: 10, fill: "#94a3b8" }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: "#94a3b8" }} />
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: 10 }} />
                  <Bar dataKey="enrolledCount" name="Enrolled" fill="#0ea5e9" radius={[5, 5, 0, 0]} />
                  <Bar dataKey="lessonsCount" name="Lessons" fill="#14b8a6" radius={[5, 5, 0, 0]} />
                  <Bar dataKey="attemptsCount" name="Quiz Attempts" fill="#10b981" radius={[5, 5, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Quiz Avg vs Assignment Avg per Course */}
        <div className="glass-card p-5">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="h-4 w-4 text-sky-500" />
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">Course Marks: Quizzes vs Assignments</h2>
          </div>
          {courseMetrics.length === 0 ? (
            <div className="h-52 flex items-center justify-center text-xs text-slate-500 dark:text-slate-400">
              No course marks yet.
            </div>
          ) : (
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={courseMetrics}>
                  <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.15} />
                  <XAxis dataKey="shortTitle" tick={{ fontSize: 10, fill: "#94a3b8" }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: "#94a3b8" }} />
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: 10 }} />
                  <Bar dataKey="quizAvg" name="Quiz Avg %" fill="#14b8a6" radius={[5, 5, 0, 0]} />
                  <Bar dataKey="assnAvg" name="Assignment Avg %" fill="#f59e0b" radius={[5, 5, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Pass/Fail Donut + Grade Distribution */}
        <div className="glass-card p-5 flex flex-col justify-between">
          <div className="flex items-center gap-2 mb-2">
            <PieIcon className="h-4 w-4 text-emerald-500" />
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">Pass Rate &amp; Grade Bands</h2>
          </div>
          {results.length === 0 ? (
            <div className="h-52 flex items-center justify-center text-xs text-slate-500 dark:text-slate-400">
              No quiz attempts recorded yet.
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2 items-center h-52">
              <div className="h-44">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={passPieData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={28}
                      outerRadius={52}
                      paddingAngle={3}
                    >
                      {passPieData.map((_, i) => (
                        <Cell key={i} fill={PASS_COLORS[i % PASS_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="h-44">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={gradeBuckets}>
                    <XAxis dataKey="range" tick={{ fontSize: 9, fill: "#94a3b8" }} />
                    <YAxis allowDecimals={false} hide />
                    <Tooltip />
                    <Bar dataKey="count" name="Students" fill="#14b8a6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
          <div className="text-[11px] text-slate-500 dark:text-slate-400 border-t border-slate-200/70 dark:border-white/10 pt-2 flex justify-between">
            <span>Passed: {passCount}</span>
            <span>Needs Review: {failCount}</span>
          </div>
        </div>
      </div>

      {/* Course Progress Tracker Cards */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-base font-extrabold flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-sky-600" />
            {lang === "ar"
              ? "تتبع وإدارة تقدم المقررات"
              : "Course Progress Tracking & Management"}
          </h2>
          {showManageLinks && (
            <div className="flex items-center gap-2 text-xs">
              <Link to="/instructor/courses" className="glass-btn-secondary px-3 py-1 rounded-lg font-semibold">
                Manage Courses
              </Link>
              <Link to="/instructor/assignments" className="glass-btn-secondary px-3 py-1 rounded-lg font-semibold">
                Manage Assignments
              </Link>
              <Link to="/instructor/quizzes" className="glass-btn-secondary px-3 py-1 rounded-lg font-semibold">
                Manage Quizzes
              </Link>
            </div>
          )}
        </div>

        {courseMetrics.length === 0 ? (
          <div className="glass-card p-6 text-center text-xs text-slate-500">
            {t("app.noData")}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {courseMetrics.map((cm) => (
              <div key={cm.id} className="glass-card p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="font-bold text-sm truncate">{cm.title}</h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      {cm.lessonsCount} Lessons · {cm.enrolledCount} Enrolled ·{" "}
                      {cm.publishedQuizzes}/{cm.quizzesCount} Pub Quizzes
                    </p>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-xs font-extrabold bg-sky-500/15 text-sky-700 dark:text-sky-300 border border-sky-400/30">
                    {cm.progressPct}%
                  </span>
                </div>

                {/* Progress Bar */}
                <div>
                  <div className="flex justify-between text-[11px] text-slate-500 mb-1">
                    <span>Course Progress &amp; Engagement</span>
                    <span>{cm.progressPct}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-200/70 dark:bg-slate-800 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-sky-500 via-blue-500 to-emerald-500 transition-all duration-500"
                      style={{ width: `${cm.progressPct}%` }}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 pt-1 text-center">
                  <div className="p-2 rounded-xl glass-subtle">
                    <div className="text-[10px] text-slate-500">Quiz Avg</div>
                    <div className="text-xs font-extrabold text-sky-600 dark:text-sky-300">
                      {cm.quizAvg}%
                    </div>
                  </div>
                  <div className="p-2 rounded-xl glass-subtle">
                    <div className="text-[10px] text-slate-500">Assn Avg</div>
                    <div className="text-xs font-extrabold text-amber-600 dark:text-amber-300">
                      {cm.assnAvg}%
                    </div>
                  </div>
                  <div className="p-2 rounded-xl glass-subtle">
                    <div className="text-[10px] text-slate-500">Submissions</div>
                    <div className="text-xs font-extrabold text-emerald-600 dark:text-emerald-300">
                      {cm.attemptsCount + cm.submissionsCount}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Student Progress Tracking Table */}
      <div className="glass-panel rounded-[24px] overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-200/70 dark:border-white/10 flex items-center justify-between flex-wrap gap-2">
          <h2 className="text-sm font-bold flex items-center gap-2 text-slate-900 dark:text-white">
            <Users className="h-4 w-4 text-teal-500" />
            Student Progress &amp; Performance Tracker
          </h2>
          {showManageLinks && (
            <div className="flex items-center gap-3 text-xs font-semibold">
              <Link
                to="/instructor/progress-tracker"
                className="text-teal-600 dark:text-teal-300 hover:underline flex items-center gap-1"
              >
                {lang === "ar" ? "تتبع التقدم والتقارير" : "Progress Tracker & Reports"}
                <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
              <Link to="/instructor/students" className="text-sky-600 dark:text-sky-300 hover:underline">
                Manage Students ({approvedStudents.length})
              </Link>
            </div>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-start">
            <thead className="bg-slate-900/5 dark:bg-white/[0.04] border-b border-slate-200/70 dark:border-white/10 uppercase tracking-wider text-slate-600 dark:text-slate-300">
              <tr>
                <th className="px-4 py-2.5 text-start">Student</th>
                <th className="px-4 py-2.5 text-start">Enrolled Courses</th>
                <th className="px-4 py-2.5 text-start">Quiz Attempts / Avg</th>
                <th className="px-4 py-2.5 text-start">Assignments / Avg</th>
                <th className="px-4 py-2.5 text-start">Overall</th>
                <th className="px-4 py-2.5 text-start">Academic</th>
                <th className="px-4 py-2.5 text-start">{lang === "ar" ? "حالة الحساب" : "Account"}</th>
                {showManageLinks && (
                  <th className="px-4 py-2.5 text-end">{lang === "ar" ? "إجراءات" : "Actions"}</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/70 dark:divide-white/10">
              {studentProgressRows.length === 0 ? (
                <tr>
                  <td colSpan={showManageLinks ? 8 : 7} className="px-4 py-6 text-center text-slate-500 dark:text-slate-400">
                    No approved students linked yet.
                  </td>
                </tr>
              ) : (
                studentProgressRows.map((st) => (
                  <tr key={st.uid} className={`transition-colors ${st.needsSupport ? "bg-rose-500/5 hover:bg-rose-500/10" : "hover:bg-teal-500/5"}`}>
                    <td className="px-4 py-2.5">
                      <div className="font-bold flex items-center gap-1.5">
                        <span>{st.name}</span>
                        {st.needsSupport && (
                          <span className="h-2 w-2 rounded-full bg-rose-500 animate-ping shrink-0" title="Needs Academic Support" />
                        )}
                      </div>
                      <div className="text-[11px] text-slate-400">{st.email}</div>
                      {st.phoneNumber && (
                        <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                          📞 {st.phoneNumber}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-2.5">{st.enrolled}</td>
                    <td className="px-4 py-2.5">
                      {st.quizAttempts} ({st.quizAvg}%)
                    </td>
                    <td className="px-4 py-2.5">
                      {st.assnSubs} ({st.assnAvg}%)
                    </td>
                    <td className="px-4 py-2.5 font-extrabold text-sky-600 dark:text-sky-300">
                      {st.combinedAvg !== null ? `${st.combinedAvg}%` : "—"}
                    </td>
                    <td className="px-4 py-2.5">
                      {st.combinedAvg === null ? (
                        <span className="inline-flex items-center gap-1 text-slate-500 font-semibold">
                          <Clock className="h-3.5 w-3.5" /> Not assessed
                        </span>
                      ) : !st.needsSupport ? (
                        <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-bold">
                          <CheckCircle2 className="h-3.5 w-3.5" /> {lang === "ar" ? "مستواه ممتاز" : "On Track"}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-black bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30 shadow-sm animate-pulse">
                          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                          <span>{lang === "ar" ? "يحتاج إلى دعم" : "Needs Support"}</span>
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2.5">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-bold border ${
                          st.active
                            ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800"
                            : "bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border-rose-200 dark:border-rose-800"
                        }`}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            st.active ? "bg-emerald-500 animate-pulse" : "bg-rose-500"
                          }`}
                        />
                        {st.active ? t("app.active") : (lang === "ar" ? "معطل" : t("app.inactive"))}
                      </span>
                    </td>
                    {showManageLinks && (
                      <td className="px-4 py-2.5 text-end">
                        <div className="inline-flex items-center gap-1.5 justify-end flex-wrap">
                          {st.needsSupport && (
                            <button
                              type="button"
                              onClick={() => handleContactWhatsApp(st)}
                              title={
                                st.phoneNumber
                                  ? lang === "ar"
                                    ? "مراسلة الطالب عبر واتساب لتقديم الدعم الأكاديمي"
                                    : "Contact Student on WhatsApp"
                                  : lang === "ar"
                                    ? "لم يسجل الطالب رقم هاتف بعد"
                                    : "Student has no registered phone number"
                              }
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-bold text-[11px] bg-[#25D366]/15 hover:bg-[#25D366]/25 text-[#128C7E] dark:text-[#25D366] border border-[#25D366]/40 shadow-sm transition-all active:scale-95 cursor-pointer"
                            >
                              <MessageCircle className="h-3.5 w-3.5 shrink-0 text-[#25D366]" />
                              <span>{lang === "ar" ? "تواصل عبر واتساب" : "Contact on WhatsApp"}</span>
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleToggleStudentActive(st.rawStudent || st)}
                            title={
                              st.active
                                ? lang === "ar"
                                  ? "تعطيل حساب الطالب"
                                  : "Deactivate student account"
                                : lang === "ar"
                                  ? "تفعيل حساب الطالب"
                                  : "Activate student account"
                            }
                            className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg font-bold text-[11px] border transition-all active:scale-95 ${
                              st.active
                                ? "border-amber-300/80 bg-amber-50 hover:bg-amber-100 text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300"
                                : "border-emerald-300/80 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
                            }`}
                          >
                            <Power className="h-3 w-3" />
                            <span>
                              {st.active
                                ? lang === "ar"
                                  ? "تعطيل"
                                  : "Deactivate"
                                : lang === "ar"
                                  ? "تفعيل"
                                  : "Activate"}
                            </span>
                          </button>
                          <Link
                            to={`/instructor/progress-tracker?studentId=${st.uid}`}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-teal-500/15 hover:bg-teal-500/25 text-teal-700 dark:text-teal-300 border border-teal-400/25 font-bold"
                          >
                            {lang === "ar" ? "تقرير" : "Track"}
                            <ArrowUpRight className="h-3 w-3" />
                          </Link>
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

