import { useEffect, useState, useRef, useCallback } from "react";
import { Routes, Route, Navigate, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";
import {
  User,
  BookOpen,
  ClipboardCheck,
  ClipboardList,
  Award,
  Trophy,
  Users,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  RefreshCw,
  FileText,
  CalendarCheck,
  Video,
  MessageSquare,
  Brain,
  ShoppingBag,
  Sparkles,
  Swords,
  ChevronLeft,
  ChevronRight,
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
import StudentStoreModule from "../store/StudentStoreModule";
import LiveQuizDuelModule from "../duel/LiveQuizDuelModule";
import { useAuth } from "../../context/AuthContext";
import { useLang } from "../../context/LangContext";
import { useTheme } from "../../context/ThemeContext";
import { ref, onValue } from "firebase/database";
import { rtdb } from "../../lib/firebase";
import {
  listActiveInstructors,
  listCourses,
  requestAdditionalInstructor,
  checkAndDispatchAutomatedWeeklyReports,
} from "../../services/platformService";

function StudentInstructorSelector({
  instructors,
  courses = [],
  activeInstructorId,
  onSelectInstructor,
}) {
  const { user, refreshProfile } = useAuth();
  const { lang } = useLang();
  const navigate = useNavigate();
  const [requestingId, setRequestingId] = useState(null);
  const scrollContainerRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const approvedIds = user?.instructorIds || [];
  const requestsMap = user?.instructorRequests || {};

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

  // Strictly real instructors loaded from Firebase RTDB (users where role === 'instructor')
  const realInstructors = (instructors || []).filter(Boolean);

  const updateScrollState = useCallback(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    const maxScroll = Math.max(0, scrollWidth - clientWidth);
    const absScroll = Math.abs(scrollLeft);

    setCanScrollLeft(absScroll > 8);
    setCanScrollRight(absScroll < maxScroll - 8);
  }, []);

  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    updateScrollState();
    el.addEventListener("scroll", updateScrollState, { passive: true });
    window.addEventListener("resize", updateScrollState);
    return () => {
      el.removeEventListener("scroll", updateScrollState);
      window.removeEventListener("resize", updateScrollState);
    };
  }, [updateScrollState]);

  const handleScroll = (direction) => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const scrollAmount = 360;
    const isRtl = lang === "ar" || document.documentElement.dir === "rtl";
    // For RTL, positive left moves leftwards in standard CSS scrollBy
    let delta = direction === "left" ? -scrollAmount : scrollAmount;
    if (isRtl) {
      delta = -delta;
    }
    el.scrollBy({ left: delta, behavior: "smooth" });
  };

  // Drag-to-scroll support for mouse users
  const isDraggingRef = useRef(false);
  const startXRef = useRef(0);
  const scrollLeftRef = useRef(0);

  const handleMouseDown = (e) => {
    const el = scrollContainerRef.current;
    if (!el) return;
    // Don't drag if clicking buttons or interactive elements
    if (e.target.closest("button") || e.target.closest("a")) return;
    isDraggingRef.current = true;
    startXRef.current = e.pageX - el.offsetLeft;
    scrollLeftRef.current = el.scrollLeft;
  };

  const handleMouseMove = (e) => {
    if (!isDraggingRef.current) return;
    e.preventDefault();
    const el = scrollContainerRef.current;
    if (!el) return;
    const x = e.pageX - el.offsetLeft;
    const walk = (x - startXRef.current) * 1.5;
    el.scrollLeft = scrollLeftRef.current - walk;
  };

  const handleMouseUpOrLeave = () => {
    isDraggingRef.current = false;
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "ArrowLeft") {
        handleScroll("left");
      } else if (e.key === "ArrowRight") {
        handleScroll("right");
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [lang]);

  // Determine icon based on instructor's real specialization keywords
  const renderInstructorIcon = (inst) => {
    const spec = (
      (typeof inst.specialization === "object" ? inst.specialization?.en : inst.specialization) || ""
    ).toLowerCase();

    if (/ai|artificial|machine|intelligence|neural|vision/i.test(spec)) {
      return (
        <svg viewBox="0 0 24 24" className="w-8 h-8 text-teal-600 dark:text-teal-300 transition-transform duration-300" fill="none" stroke="currentColor" strokeWidth="1.5">
          <rect x="5" y="5" width="14" height="14" rx="3.5" stroke="#2dd4bf" strokeWidth="1.6" />
          <path d="M9 1.5v3.5M15 1.5v3.5M9 19v3.5M15 19v3.5M1.5 9h3.5M1.5 15h3.5M19 9h3.5M19 15h3.5" stroke="#2dd4bf" strokeWidth="1.5" strokeLinecap="round" />
          <circle cx="9" cy="1.5" r="0.8" fill="#5eead4" />
          <circle cx="15" cy="1.5" r="0.8" fill="#5eead4" />
          <circle cx="9" cy="22.5" r="0.8" fill="#5eead4" />
          <circle cx="15" cy="22.5" r="0.8" fill="#5eead4" />
          <text x="12" y="14.2" textAnchor="middle" fill="#2dd4bf" fontSize="7.5" fontWeight="900" fontFamily="sans-serif">AI</text>
          <path d="M16 16.5h2M17 15.5l-1 1 1 1" stroke="#2dd4bf" strokeWidth="0.9" />
        </svg>
      );
    }
    if (/physic|mechanic|circuit|hardware|robot/i.test(spec)) {
      return (
        <svg viewBox="0 0 24 24" className="w-8 h-8 text-cyan-500 dark:text-cyan-400 transition-transform duration-300" fill="none" stroke="currentColor" strokeWidth="1.5">
          <circle cx="12" cy="12" r="2.5" fill="#22d3ee" />
          <ellipse cx="12" cy="12" rx="9.5" ry="3.8" transform="rotate(30 12 12)" stroke="#38bdf8" strokeWidth="1.4" />
          <ellipse cx="12" cy="12" rx="9.5" ry="3.8" transform="rotate(90 12 12)" stroke="#2dd4bf" strokeWidth="1.4" />
          <ellipse cx="12" cy="12" rx="9.5" ry="3.8" transform="rotate(150 12 12)" stroke="#38bdf8" strokeWidth="1.4" />
        </svg>
      );
    }
    if (/program|code|develop|software|architect|system|sql|data/i.test(spec)) {
      return (
        <svg viewBox="0 0 24 24" className="w-8 h-8 text-purple-600 dark:text-purple-400 transition-transform duration-300" fill="none" stroke="currentColor" strokeWidth="1.5">
          <rect x="3" y="3" width="5.5" height="5.5" rx="1.5" stroke="#c084fc" strokeWidth="1.5" />
          <rect x="15.5" y="3" width="5.5" height="5.5" rx="1.5" stroke="#c084fc" strokeWidth="1.5" />
          <rect x="15.5" y="15.5" width="5.5" height="5.5" rx="1.5" stroke="#c084fc" strokeWidth="1.5" />
          <rect x="3" y="15.5" width="5.5" height="5.5" rx="1.5" stroke="#c084fc" strokeWidth="1.5" />
          <path d="M8.5 5.75h7M5.75 8.5v7M18.25 8.5v7M8.5 18.25h7" stroke="#a855f7" strokeWidth="1.2" strokeDasharray="2 2" />
          <circle cx="12" cy="12" r="2.2" fill="#e879f9" />
        </svg>
      );
    }
    return (
      <svg viewBox="0 0 24 24" className="w-8 h-8 text-teal-600 dark:text-teal-300 transition-transform duration-300" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M12 2L2 7l10 5 10-5-10-5z" stroke="#2dd4bf" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M2 17l10 5 10-5" stroke="#2dd4bf" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M2 12l10 5 10-5" stroke="#2dd4bf" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  };

  return (
    <div className="space-y-6">
      {/* Dynamic Header */}
      <div className="flex flex-wrap items-start justify-between gap-4 mt-1 eduera-stagger-1">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            {lang === "ar" ? "اختر المحاضر الخاص بك" : "Choose Your Instructor"}
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1 max-w-xl font-medium leading-relaxed">
            {lang === "ar"
              ? "اختر مساحة عمل المحاضر المتخصص للوصول إلى المقررات والواجبات والاختبارات الآلية وجلسات البث."
              : "Select a specialized instructor workspace to access courses, assignments, automated quizzes, and live classrooms."}
          </p>
        </div>
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-50/90 dark:bg-[#0c1f2b]/35 backdrop-blur-xl border border-emerald-300 dark:border-emerald-500/35 text-xs text-emerald-900 dark:text-slate-300 shadow-sm shrink-0">
          <span className="font-semibold">
            {lang === "ar"
              ? `${realInstructors.length} محاضر${realInstructors.length > 2 && realInstructors.length < 11 ? "ين" : ""} متاح`
              : `${realInstructors.length} Instructor${realInstructors.length === 1 ? "" : "s"} Available`}
          </span>
        </div>
      </div>

      {/* Empty State when no instructors exist in the database */}
      {realInstructors.length === 0 ? (
        <div className="rounded-[24px] bg-white/70 dark:bg-[#05121c]/25 backdrop-blur-2xl border border-slate-200/80 dark:border-white/[0.08] p-12 text-center space-y-4 max-w-md mx-auto shadow-xl">
          <div className="h-16 w-16 mx-auto rounded-2xl bg-teal-500/10 dark:bg-white/[0.06] border border-teal-500/20 flex items-center justify-center text-teal-500 dark:text-teal-400 shadow-sm">
            <Users className="h-8 w-8" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">
            {lang === "ar" ? "لا يوجد محاضرون مسجلون حالياً" : "No Instructors Registered Yet"}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto leading-relaxed">
            {lang === "ar"
              ? "سيظهر المحاضرون المعتمدون هنا تلقائياً بمجرد إضافتهم من قبل إدارة المنصة في قاعدة البيانات."
              : "Certified instructors will automatically appear here once registered by platform administrators in the database."}
          </p>
        </div>
      ) : (
        /* Real Instructors List (Smooth Horizontal Scroll from Left to Right and Vice Versa) */
        <div className="relative group/scroll pt-1">
          {/* Floating Left Arrow (Left to Right / Vice Versa) */}
          {realInstructors.length > 1 && (
            <button
              type="button"
              onClick={() => handleScroll("left")}
              aria-label="Scroll left"
              className="absolute start-0 top-1/2 -translate-y-1/2 -translate-x-3 rtl:translate-x-3 z-20 h-11 w-11 rounded-full bg-white/95 dark:bg-[#0c1824]/90 backdrop-blur-xl border border-slate-300/80 dark:border-white/15 text-slate-700 dark:text-slate-200 hover:text-slate-950 dark:hover:text-white hover:border-teal-400/60 hover:scale-110 flex items-center justify-center shrink-0 cursor-pointer shadow-xl transition-all active:scale-95"
            >
              <ChevronLeft className="h-6 w-6 rtl:rotate-180" />
            </button>
          )}

          {/* Cards Horizontal Scroll Container */}
          <div
            ref={scrollContainerRef}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUpOrLeave}
            onMouseLeave={handleMouseUpOrLeave}
            className={`flex items-stretch gap-5 overflow-x-auto pb-4 pt-1 px-1 scroll-smooth snap-x snap-mandatory hide-scrollbar select-none cursor-grab active:cursor-grabbing ${
              realInstructors.length < 3 ? "sm:justify-center" : ""
            }`}
            style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
          >
            {realInstructors.map((inst) => {
              const isApproved = approvedIds.includes(inst.uid) || activeInstructorId === inst.uid;
              const isPending = !isApproved && requestsMap[inst.uid] === "pending";

              const instName =
                inst.name?.[lang] ||
                (typeof inst.name === "string" ? inst.name : null) ||
                inst.displayName ||
                inst.username ||
                inst.email ||
                "Instructor";

              const instSpecialization =
                inst.specialization?.[lang] ||
                (typeof inst.specialization === "string" ? inst.specialization : null) ||
                (lang === "ar" ? "محاضر معتمد" : "Certified Instructor");

              const instTopics =
                inst.bio?.[lang] ||
                (typeof inst.bio === "string" ? inst.bio : null) ||
                inst.topics ||
                (lang === "ar"
                  ? "المقررات التدريبية، الواجبات التفاعلية، بنك الأسئلة"
                  : "Curriculum modules, interactive assignments, and quizzes");

              const instCourses = (courses || []).filter((c) => c.instructorId === inst.uid);
              const coursesCount = instCourses.length;
              const lessonsCount = instCourses.reduce(
                (acc, c) => acc + (Array.isArray(c.lessons) ? c.lessons.length : 0),
                0
              );

              return (
                <div
                  key={inst.uid}
                  className="w-[290px] sm:w-[320px] md:w-[340px] shrink-0 snap-center eduera-hover-card rounded-[24px] bg-white/75 dark:bg-[#05121c]/25 backdrop-blur-2xl border border-slate-200/80 dark:border-white/[0.08] p-6 flex flex-col justify-between text-center space-y-4 shadow-[0_12px_36px_rgba(0,0,0,0.06),inset_0_1px_1px_rgba(255,255,255,0.8)] dark:shadow-[0_12px_36px_rgba(0,0,0,0.35),inset_0_1px_1px_rgba(255,255,255,0.08)] hover:border-teal-400 dark:hover:border-teal-300 hover:shadow-[0_20px_50px_rgba(45,212,191,0.22),0_0_30px_rgba(45,212,191,0.18)] dark:hover:shadow-[0_20px_50px_rgba(45,212,191,0.3),0_0_35px_rgba(45,212,191,0.22)] hover:-translate-y-2 hover:scale-[1.01] transition-all duration-300 group cursor-pointer"
                >
                  <div className="space-y-3.5">
                    {/* Squircle Icon strictly highlighted on hover */}
                    <div className="mx-auto h-16 w-16 rounded-2xl bg-white/80 dark:bg-white/[0.06] border border-slate-200/90 dark:border-white/10 flex items-center justify-center shadow-sm group-hover:scale-110 group-hover:border-teal-400 group-hover:shadow-[0_0_22px_rgba(45,212,191,0.4)] transition-all duration-300">
                      {renderInstructorIcon(inst)}
                    </div>

                    <div>
                      <h3 className="text-lg font-bold text-slate-900 dark:text-white transition-colors">
                        {instName}
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1">
                        {instSpecialization}
                      </p>
                    </div>

                    {/* Status Badge */}
                    <div className="flex justify-center">
                      <span
                        className={`inline-flex items-center gap-1 px-3 py-0.5 rounded-full text-[10px] font-semibold transition-all ${
                          isApproved
                            ? "bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-500/40 text-emerald-800 dark:text-emerald-300"
                            : isPending
                            ? "bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-500/40 text-amber-800 dark:text-amber-300"
                            : "bg-teal-50 dark:bg-teal-950/30 border border-teal-300 dark:border-teal-500/40 text-teal-800 dark:text-teal-300"
                        }`}
                      >
                        {isApproved
                          ? (lang === "ar" ? "نشط حالياً • مساحتك ✓" : "CURRENTLY ACTIVE • YOUR WORKSPACE ✓")
                          : isPending
                          ? (lang === "ar" ? "بانتظار الموافقة" : "Pending Acceptance")
                          : (lang === "ar" ? "مساحة عمل متاحة" : "Available Workspace")}
                      </span>
                    </div>

                    {/* Stats Row: strictly actual courses & lessons count from database */}
                    <div className="flex items-center justify-center gap-3 text-xs pt-1">
                      <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-100/80 dark:bg-white/[0.05] border border-slate-200/60 dark:border-white/[0.06]">
                        <BookOpen className="h-3.5 w-3.5 text-sky-500 shrink-0" />
                        <span className="font-extrabold text-slate-900 dark:text-white">{coursesCount}</span>
                        <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                          {lang === "ar"
                            ? coursesCount === 1
                              ? "مقرر"
                              : coursesCount === 2
                              ? "مقرران"
                              : coursesCount > 2 && coursesCount < 11
                              ? "مقررات"
                              : "مقرر"
                            : coursesCount === 1
                            ? "Course"
                            : "Courses"}
                        </span>
                      </div>
                      <span className="text-slate-400 dark:text-slate-600 font-bold">·</span>
                      <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-100/80 dark:bg-white/[0.05] border border-slate-200/60 dark:border-white/[0.06]">
                        <FileText className="h-3.5 w-3.5 text-teal-500 shrink-0" />
                        <span className="font-extrabold text-slate-900 dark:text-white">{lessonsCount}</span>
                        <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                          {lang === "ar"
                            ? lessonsCount === 1
                              ? "درس"
                              : lessonsCount === 2
                              ? "درسان"
                              : lessonsCount > 2 && lessonsCount < 11
                              ? "دروس"
                              : "درس"
                            : lessonsCount === 1
                            ? "Lesson"
                            : "Lessons"}
                        </span>
                      </div>
                    </div>

                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed px-1 line-clamp-2">
                      {instTopics}
                    </p>
                  </div>

                  {/* Dynamic Action Button strictly with hover gradient */}
                  {isApproved && (
                    <button
                      type="button"
                      onClick={() => handleOpenInstructor(inst.uid)}
                      className="w-full py-2.5 rounded-xl border border-slate-300 dark:border-white/10 bg-white/80 dark:bg-white/5 text-slate-800 dark:text-slate-300 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all duration-300 group-hover:bg-gradient-to-r group-hover:from-sky-500 group-hover:via-teal-400 group-hover:to-emerald-400 group-hover:text-slate-950 group-hover:font-black group-hover:shadow-[0_0_22px_rgba(45,212,191,0.45)] group-hover:border-transparent cursor-pointer"
                    >
                      <span>{lang === "ar" ? "دخول المساحة" : "Enter Workspace"}</span>
                      <span className="text-sm rtl:rotate-180">→</span>
                    </button>
                  )}

                  {!isApproved && !isPending && (
                    <button
                      type="button"
                      disabled={requestingId === inst.uid}
                      onClick={() => handleRequestInstructor(inst.uid)}
                      className="w-full py-2.5 rounded-xl border border-slate-300 dark:border-white/10 bg-white/80 dark:bg-white/5 text-slate-800 dark:text-slate-300 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all duration-300 group-hover:bg-teal-50 dark:group-hover:bg-teal-950/40 group-hover:border-teal-400 group-hover:text-teal-900 dark:group-hover:text-teal-200 cursor-pointer"
                    >
                      {requestingId === inst.uid
                        ? (lang === "ar" ? "جاري الإرسال..." : "Sending...")
                        : (lang === "ar" ? "طلب الانضمام" : "Request to Enroll")}
                    </button>
                  )}

                  {isPending && (
                    <button
                      type="button"
                      disabled
                      className="w-full py-2.5 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-slate-700/50 text-xs font-semibold text-slate-400 cursor-not-allowed"
                    >
                      {lang === "ar" ? "قيد المراجعة" : "Pending Verification"}
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {/* Floating Right Arrow (Left to Right / Vice Versa) */}
          {realInstructors.length > 1 && (
            <button
              type="button"
              onClick={() => handleScroll("right")}
              aria-label="Scroll right"
              className="absolute end-0 top-1/2 -translate-y-1/2 translate-x-3 rtl:-translate-x-3 z-20 h-11 w-11 rounded-full bg-white/95 dark:bg-[#0c1824]/90 backdrop-blur-xl border border-slate-300/80 dark:border-white/15 text-slate-700 dark:text-slate-200 hover:text-slate-950 dark:hover:text-white hover:border-teal-400/60 hover:scale-110 flex items-center justify-center shrink-0 cursor-pointer shadow-xl transition-all active:scale-95"
            >
              <ChevronRight className="h-6 w-6 rtl:rotate-180" />
            </button>
          )}
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
        <Users className="h-10 w-10 text-teal-500 mx-auto" />
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
      <div className="rounded-[22px] bg-white/[0.12] dark:bg-white/[0.03] backdrop-blur-2xl border border-white/40 dark:border-white/[0.08] px-5 py-3 flex flex-wrap items-center justify-between gap-3 shadow-sm">
        <div className="text-xs sm:text-sm flex items-center gap-2.5">
          <span className="text-slate-900 dark:text-white/90 font-bold">
            {lang === "ar" ? "المحاضر المفتوح حالياً:" : "Active Instructor:"}
          </span>
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900 text-white dark:bg-white/15 dark:text-white/90 border border-slate-900/20 dark:border-white/20 font-black text-xs sm:text-sm">
            <span>{activeInstructor.name?.[lang] || activeInstructor.displayName}</span>
          </span>
        </div>
        <button
          onClick={onSwitch}
          className="glass-btn-secondary px-4 py-2 text-xs font-black flex items-center gap-2 cursor-pointer rounded-xl hover:border-teal-400/60 transition-all"
        >
          <span>{lang === "ar" ? "تبديل المحاضر" : "Switch Instructor"}</span>
          <RefreshCw className="h-3.5 w-3.5 text-teal-500 dark:text-teal-300" />
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
  const [courses, setCourses] = useState([]);
  const [activeInstructorId, setActiveInstructorId] = useState(
    () => localStorage.getItem(storageKey) || ""
  );

  useEffect(() => {
    // Realtime subscription to RTDB courses for dynamic, actual course and lesson counts
    const coursesRef = ref(rtdb, "courses");
    const unsub = onValue(
      coursesRef,
      (snap) => {
        if (!snap.exists()) {
          setCourses([]);
          return;
        }
        const arr = Object.entries(snap.val()).map(([id, data]) => ({
          id,
          ...data,
          lessons: data.lessons
            ? Object.entries(data.lessons).map(([lid, ldata]) => ({ id: lid, ...ldata }))
            : [],
        }));
        setCourses(arr);
      },
      (err) => {
        console.warn("RTDB courses listener note, fallback to listCourses:", err?.message);
        listCourses().then((data) => setCourses(data || [])).catch(() => {});
      }
    );
    return () => unsub();
  }, []);

  useEffect(() => {
    if (user?.isPreview) {
      const previewInst = {
        uid: "preview_instructor",
        displayName: "Dr. Preview Instructor",
        name: { en: "Dr. Preview Instructor", ar: "د. معلم المعاينة" },
        specialization: { en: "Technical Training & AI", ar: "التدريب التقني والذكاء الاصطناعي" },
        active: true,
      };
      setInstructors([previewInst]);
      if (!activeInstructorId || activeInstructorId !== "preview_instructor") {
        setActiveInstructorId("preview_instructor");
        localStorage.setItem(storageKey, "preview_instructor");
      }
      setInstructorsLoading(false);
      return;
    }

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
  }, [user?.uid, user?.isPreview, (user?.instructorIds || []).length]);

  // Automatic 7-day performance check and notification dispatch
  useEffect(() => {
    if (user?.uid && !user?.isPreview) {
      checkAndDispatchAutomatedWeeklyReports(user.uid);
    }
  }, [user?.uid, user?.isPreview]);

  const handleSelectInstructor = (instUid) => {
    setActiveInstructorId(instUid);
    localStorage.setItem(storageKey, instUid);
  };

  const activeInstructor = instructors.find((i) => i.uid === activeInstructorId) || null;

  const navItems = [
    {
      to: "/student",
      label: lang === "ar" ? "اختيار المحاضر" : "Choose Instructor",
      icon: User,
      end: true,
    },
    { to: "/student/courses", label: lang === "ar" ? "المقررات" : "Courses", icon: BookOpen },
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
    { to: "/student/quizzes", label: lang === "ar" ? "الاختبارات" : "Quizzes", icon: ClipboardCheck },
    {
      to: "/student/duels",
      label: lang === "ar" ? "سباق وتحديات 1v1 🏎️⚔️" : "Live 1v1 Duels 🏎️⚔️",
      icon: Swords,
    },
    {
      to: "/student/scoreboard",
      label: lang === "ar" ? "لوحة المتصدرين" : "Top 3 Scoreboard",
      icon: Trophy,
    },
    { to: "/student/grades", label: t("nav.myResults"), icon: Award },
    {
      to: "/student/puzzles",
      label: t("nav.iqPuzzles") || (lang === "ar" ? "ألغاز الذكاء (IQ)" : "IQ Puzzles"),
      icon: Brain,
    },
    {
      to: "/student/store",
      label: t("nav.store") || (lang === "ar" ? "متجر المكافآت والعملات" : "Rewards Store"),
      icon: ShoppingBag,
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
              courses={courses}
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
          path="duels"
          element={wrapFiltered(
            <LiveQuizDuelModule activeInstructorId={activeInstructorId} />
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
          path="store"
          element={<StudentStoreModule />}
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
