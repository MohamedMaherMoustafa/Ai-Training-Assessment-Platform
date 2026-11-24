import { useEffect, useState } from "react";
import { Routes, Route, Navigate, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";
import {
  LayoutDashboard,
  BookOpen,
  ClipboardCheck,
  ClipboardList,
  Award,
  Trophy,
  Users,
  CheckCircle2,
  ArrowRight,
  RefreshCw,
  FileText,
  CalendarCheck,
  Video,
  MessageSquare,
  Brain,
} from "lucide-react";
import AppLayout from "../../components/layout/AppLayout";
import CoursesModule from "../courses/CoursesModule";
import LessonLibraryModule from "../lessons/LessonLibraryModule";
import CourseSessionsModule from "../sessions/CourseSessionsModule";
import DirectChatModule from "../chat/DirectChatModule";
import AssignmentsModule from "../assignments/AssignmentsModule";
import QuizzesModule from "../quiz/QuizzesModule";
import GradesModule from "../grades/GradesModule";
import ScoreboardModule from "../scoreboard/ScoreboardModule";
import WeeklyReportsModule from "./WeeklyReportsModule";
import IQPuzzlesModule from "../puzzles/IQPuzzlesModule";
import { useAuth } from "../../context/AuthContext";
import { useLang } from "../../context/LangContext";
import { useTheme } from "../../context/ThemeContext";
import {
  listActiveInstructors,
  requestAdditionalInstructor,
  checkAndDispatchAutomatedWeeklyReports,
} from "../../services/platformService";

function StudentInstructorSelector({
  instructors,
  activeInstructorId,
  onSelectInstructor,
}) {
  const { user, refreshProfile } = useAuth();
  const { lang } = useLang();
  const { t } = useTranslation();
  const { logoSrc } = useTheme();
  const navigate = useNavigate();
  const [requestingId, setRequestingId] = useState(null);

  const approvedIds = user?.instructorIds || [];
  const requestsMap = user?.instructorRequests || {};

  const approvedInstructors = instructors.filter((i) => approvedIds.includes(i.uid));
  const otherInstructors = instructors.filter((i) => !approvedIds.includes(i.uid));

  const handleOpenInstructor = (instUid) => {
    onSelectInstructor(instUid);
    navigate("/student/courses");
  };

  const handleRequestInstructor = async (instUid) => {
    setRequestingId(instUid);
    try {
      await requestAdditionalInstructor(user.uid, instUid);
      await refreshProfile();
      toast.success(
        lang === "ar"
          ? "تم إرسال طلب الانضمام للمحاضر!"
          : "Request sent! Waiting for instructor acceptance."
      );
    } finally {
      setRequestingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-[28px] p-6 bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-600 text-white shadow-xl shadow-teal-500/20">
        <div className="pointer-events-none absolute -top-12 -end-12 h-44 w-44 rounded-full bg-white/15 blur-2xl" />
        <div className="relative flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
              {lang === "ar"
                ? `مرحباً ${user?.displayName} — اختر المحاضر لفتح مساحته`
                : `Welcome, ${user?.displayName} — Choose an Instructor`}
            </h1>
            <p className="text-xs sm:text-sm text-white/90 mt-1">
              {lang === "ar"
                ? "اختر المحاضر الذي تريد فتح مقرراته وواجباته واختباراته ولوحة متصدريه."
                : "Select which instructor workspace you want to open. All courses, lesson PDFs, assignments, quizzes, grades, and top-3 scoreboards will filter to that instructor."}
            </p>
          </div>
          <div className="flex h-16 w-16 sm:h-20 sm:w-20 rounded-2xl bg-white/20 backdrop-blur-md p-1.5 border border-white/30 shrink-0 items-center justify-center shadow-xl hover:scale-105 transition-transform">
            <img src={logoSrc} alt="Athar Educational Platform" className="w-full h-full object-contain filter drop-shadow-md scale-105" />
          </div>
        </div>
      </div>

      {/* Featured IQ Brain Hub Card */}
      <div className="relative overflow-hidden rounded-3xl p-5 bg-gradient-to-r from-indigo-900 via-slate-900 to-purple-950 border border-indigo-500/30 text-white shadow-xl flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="h-14 w-14 rounded-2xl bg-gradient-to-tr from-amber-400 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/30 shrink-0">
            <Brain className="h-7 w-7 animate-pulse text-amber-200" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10.5px] uppercase font-black px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-400/30">
                {lang === "ar" ? "جديد في المنصة ⚡" : "New Feature ⚡"}
              </span>
            </div>
            <h3 className="text-base sm:text-lg font-black mt-1">
              {lang === "ar" ? "ألغاز الذكاء وتنمية التفكير (IQ Hub)" : "Cognitive IQ Puzzles & Brain Hub"}
            </h3>
            <p className="text-xs text-slate-300 max-w-xl mt-0.5">
              {lang === "ar"
                ? "50 مستوى متدرج بأنماط ألغاز ذكاء مختلفة، تلميحات توجيهية، وعملات ذهبية تكسبها مع كل لغز تحله!"
                : "50 progressive levels with unique puzzle types, hints, and coins awarded based on difficulty!"}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => navigate("/student/puzzles")}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 via-indigo-600 to-purple-600 hover:from-amber-600 hover:to-indigo-700 text-white text-xs font-black shadow-lg shadow-indigo-600/30 transition-all hover:scale-105 cursor-pointer"
        >
          <span>{lang === "ar" ? "خوض ألغاز الذكاء 🚀" : "Play IQ Puzzles 🚀"}</span>
          {lang === "ar" ? <ArrowLeft className="h-3.5 w-3.5" /> : <ArrowRight className="h-3.5 w-3.5" />}
        </button>
      </div>

      {/* Approved Instructors to Open */}
      <div className="glass-card p-5 space-y-4">
        <div className="flex items-center gap-2 font-bold text-sm">
          <Users className="h-4 w-4 text-teal-600" />
          {lang === "ar" ? "المحاضرون المعتمدون لديك" : "Your Approved Instructors"}
        </div>

        {approvedInstructors.length === 0 ? (
          <div className="p-4 rounded-2xl glass-subtle text-xs text-slate-500">
            {lang === "ar"
              ? "لا يوجد محاضرون معتمدون بعد."
              : "No approved instructors linked yet."}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {approvedInstructors.map((inst, idx) => {
              const isCurrent = activeInstructorId === inst.uid;
              const badgeGrads = [
                "from-cyan-500 to-blue-600",
                "from-violet-500 to-fuchsia-600",
                "from-emerald-500 to-teal-600",
              ];
              const instTitle = inst.name?.[lang] || inst.displayName || "IN";
              return (
                <button
                  key={inst.uid}
                  type="button"
                  onClick={() => handleOpenInstructor(inst.uid)}
                  className={`relative overflow-hidden p-5 rounded-[26px] border text-start transition-all duration-300 flex flex-col justify-between gap-4 hover:-translate-y-1 ${
                    isCurrent
                      ? "bg-gradient-to-br from-emerald-500/15 via-cyan-500/10 to-violet-500/15 border-teal-500 ring-2 ring-teal-400/45 shadow-xl shadow-teal-500/15"
                      : "glass-subtle hover:shadow-lg"
                  }`}
                >
                  <div className={`absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r ${badgeGrads[idx % badgeGrads.length]}`} />
                  <div className="flex items-start justify-between gap-2 pt-1">
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`h-11 w-11 rounded-2xl bg-gradient-to-br ${badgeGrads[idx % badgeGrads.length]} text-white font-black text-sm flex items-center justify-center shadow-md shrink-0`}
                      >
                        {String(instTitle).slice(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="text-base font-extrabold truncate">{instTitle}</div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                          {inst.specialization?.[lang] || ""}
                        </div>
                      </div>
                    </div>
                    <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
                  </div>
                  <div className="flex items-center justify-between text-xs font-extrabold text-teal-600 dark:text-cyan-300 pt-2 border-t border-white/40 dark:border-white/10">
                    <span>
                      {isCurrent
                        ? lang === "ar"
                          ? "مفتوح حالياً — متابعة"
                          : "Currently Active — Open"
                        : lang === "ar"
                        ? "فتح مساحة المحاضر"
                        : "Open Instructor Content"}
                    </span>
                    <ArrowRight className="h-4 w-4 rtl:rotate-180" />
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Request Additional Instructors */}
      {otherInstructors.length > 0 && (
        <div className="glass-card p-5 space-y-4">
          <div className="font-bold text-sm">
            {lang === "ar" ? "محاضرون آخرون (طلب انضمام)" : "Other Platform Instructors"}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {otherInstructors.map((inst) => {
              const reqStatus = requestsMap[inst.uid];
              const isPending = reqStatus === "pending";
              return (
                <div
                  key={inst.uid}
                  className="p-3.5 rounded-xl glass-subtle flex flex-col justify-between gap-2.5"
                >
                  <div className="min-w-0">
                    <div className="text-sm font-semibold truncate">
                      {inst.name?.[lang] || inst.displayName}
                    </div>
                    <div className="text-xs text-slate-500 truncate">
                      {inst.specialization?.[lang] || ""}
                    </div>
                  </div>
                  <div className="flex justify-end">
                    {isPending ? (
                      <span className="text-[11px] font-bold text-amber-600 dark:text-amber-300">
                        {lang === "ar" ? "بانتظار الموافقة" : "Pending Acceptance"}
                      </span>
                    ) : (
                      <button
                        type="button"
                        disabled={requestingId === inst.uid}
                        onClick={() => handleRequestInstructor(inst.uid)}
                        className="glass-btn-primary px-3 py-1 rounded-lg text-[11px]"
                      >
                        {lang === "ar" ? "طلب انضمام" : "Request Join"}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function RequireInstructorSelected({
  activeInstructor,
  instructorsLoading,
  onSwitch,
  children,
}) {
  const { lang } = useLang();
  const navigate = useNavigate();

  if (instructorsLoading) return null;

  if (!activeInstructor) {
    return (
      <div className="glass-card p-8 text-center space-y-4 max-w-lg mx-auto my-8">
        <Users className="h-10 w-10 text-sky-600 mx-auto" />
        <h2 className="text-lg font-extrabold">
          {lang === "ar" ? "اختر المحاضر أولاً" : "Choose an Instructor First"}
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          {lang === "ar"
            ? "يرجى اختيار المحاضر من الصفحة الرئيسية لتصفية جميع المحتويات الخاصة به."
            : "Please select which instructor you want to open on your first page so all content filters to that instructor."}
        </p>
        <button
          onClick={() => navigate("/student")}
          className="glass-btn-primary px-5 py-2 rounded-xl text-sm"
        >
          {lang === "ar" ? "الذهاب لاختيار المحاضر" : "Choose Instructor"}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-[22px] bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-white/10 px-5 py-3 flex flex-wrap items-center justify-between gap-3 shadow-sm">
        <div className="text-xs flex items-center gap-2">
          <span className="text-slate-500 dark:text-slate-400">
            {lang === "ar" ? "المحاضر المفتوح حالياً:" : "Active Instructor:"}
          </span>
          <strong className="text-indigo-600 dark:text-indigo-400 font-extrabold text-sm">
            {activeInstructor.name?.[lang] || activeInstructor.displayName}
          </strong>
        </div>
        <button
          onClick={onSwitch}
          className="rounded-2xl border border-slate-200 dark:border-slate-700 px-3.5 py-1.5 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:border-indigo-500 bg-slate-50/50 dark:bg-slate-800/80 shadow-sm flex items-center gap-1.5 transition-all"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          <span>{lang === "ar" ? "تبديل المحاضر" : "Switch Instructor"}</span>
        </button>
      </div>
      {children}
    </div>
  );
}

export default function StudentDashboard() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { lang } = useLang();
  const navigate = useNavigate();

  const storageKey = `student_active_instructor_${user?.uid}`;
  const [instructors, setInstructors] = useState([]);
  const [instructorsLoading, setInstructorsLoading] = useState(true);
  const [activeInstructorId, setActiveInstructorId] = useState(
    () => localStorage.getItem(storageKey) || ""
  );

  useEffect(() => {
    listActiveInstructors()
      .then((list) => {
        setInstructors(list);
        const approvedIds = user?.instructorIds || [];
        if (activeInstructorId && !approvedIds.includes(activeInstructorId)) {
          setActiveInstructorId("");
          localStorage.removeItem(storageKey);
        }
      })
      .finally(() => setInstructorsLoading(false));
  }, [user?.uid, (user?.instructorIds || []).length]);

  // Automatic 7-day performance check and notification dispatch
  useEffect(() => {
    if (user?.uid) {
      checkAndDispatchAutomatedWeeklyReports(user.uid);
    }
  }, [user?.uid]);

  const handleSelectInstructor = (instUid) => {
    setActiveInstructorId(instUid);
    localStorage.setItem(storageKey, instUid);
  };

  const activeInstructor = instructors.find((i) => i.uid === activeInstructorId) || null;

  const navItems = [
    {
      to: "/student",
      label: lang === "ar" ? "اختيار المحاضر" : "Choose Instructor",
      icon: LayoutDashboard,
      end: true,
    },
    { to: "/student/courses", label: t("nav.availableCourses"), icon: BookOpen },
    {
      to: "/student/lesson-pdfs",
      label: lang === "ar" ? "ملفات الدروس PDF" : "Lesson PDFs",
      icon: FileText,
    },
    {
      to: "/student/sessions",
      label: lang === "ar" ? "جلسات المقررات" : "Course Sessions",
      icon: Video,
    },
    {
      to: "/student/chat",
      label: lang === "ar" ? "محادثة المحاضر" : "Teacher Chat",
      icon: MessageSquare,
    },
    {
      to: "/student/assignments",
      label: lang === "ar" ? "الواجبات" : "Assignments",
      icon: ClipboardList,
    },
    { to: "/student/quizzes", label: t("nav.myQuizzes"), icon: ClipboardCheck },
    { to: "/student/scoreboard", label: t("nav.scoreboard"), icon: Trophy },
    { to: "/student/grades", label: t("nav.myResults"), icon: Award },
    {
      to: "/student/puzzles",
      label: t("nav.iqPuzzles") || (lang === "ar" ? "ألغاز الذكاء (IQ)" : "IQ Puzzles"),
      icon: Brain,
    },
    {
      to: "/student/weekly-reports",
      label: t("nav.weeklyReports") || (lang === "ar" ? "التقارير الأسبوعية" : "Weekly Reports"),
      icon: CalendarCheck,
    },
  ];

  const wrapFiltered = (node) => (
    <RequireInstructorSelected
      activeInstructor={activeInstructor}
      instructorsLoading={instructorsLoading}
      onSwitch={() => navigate("/student")}
    >
      {node}
    </RequireInstructorSelected>
  );

  return (
    <AppLayout navItems={navItems}>
      <Routes>
        <Route
          index
          element={
            <StudentInstructorSelector
              instructors={instructors}
              activeInstructorId={activeInstructorId}
              onSelectInstructor={handleSelectInstructor}
            />
          }
        />
        <Route
          path="courses"
          element={wrapFiltered(
            <CoursesModule mode="student" activeInstructorId={activeInstructorId} />
          )}
        />
        <Route
          path="lesson-pdfs"
          element={wrapFiltered(
            <LessonLibraryModule mode="student" activeInstructorId={activeInstructorId} />
          )}
        />
        <Route
          path="sessions"
          element={wrapFiltered(
            <CourseSessionsModule mode="student" activeInstructorId={activeInstructorId} />
          )}
        />
        <Route
          path="chat"
          element={wrapFiltered(
            <DirectChatModule mode="student" activeInstructorId={activeInstructorId} />
          )}
        />
        <Route
          path="assignments"
          element={wrapFiltered(
            <AssignmentsModule mode="student" activeInstructorId={activeInstructorId} />
          )}
        />
        <Route
          path="quizzes"
          element={wrapFiltered(
            <QuizzesModule mode="student" activeInstructorId={activeInstructorId} />
          )}
        />
        <Route
          path="scoreboard"
          element={wrapFiltered(
            <ScoreboardModule mode="student" activeInstructorId={activeInstructorId} />
          )}
        />
        <Route
          path="grades"
          element={wrapFiltered(
            <GradesModule mode="student" activeInstructorId={activeInstructorId} />
          )}
        />
        <Route
          path="puzzles"
          element={<IQPuzzlesModule />}
        />
        <Route
          path="weekly-reports"
          element={wrapFiltered(
            <WeeklyReportsModule mode="student" activeInstructorId={activeInstructorId} />
          )}
        />
        <Route path="*" element={<Navigate to="/student" replace />} />
      </Routes>
    </AppLayout>
  );
}
