import { Routes, Route, Navigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  LayoutDashboard,
  BookOpen,
  Users,
  ClipboardCheck,
  ClipboardList,
  Award,
  Trophy,
  TrendingUp,
  FileText,
  Video,
  MessageSquare,
} from "lucide-react";
import AppLayout from "../../components/layout/AppLayout";
import InstructorAnalyticsDashboard from "./InstructorAnalyticsDashboard";
import StudentProgressTrackerModule from "./StudentProgressTrackerModule";
import CoursesModule from "../courses/CoursesModule";
import LessonLibraryModule from "../lessons/LessonLibraryModule";
import CourseSessionsModule from "../sessions/CourseSessionsModule";
import DirectChatModule from "../chat/DirectChatModule";
import StudentsModule from "../admin/StudentsModule";
import AssignmentsModule from "../assignments/AssignmentsModule";
import QuizzesModule from "../quiz/QuizzesModule";
import GradesModule from "../grades/GradesModule";
import ScoreboardModule from "../scoreboard/ScoreboardModule";
import { useAuth } from "../../context/AuthContext";
import { useLang } from "../../context/LangContext";

export default function InstructorDashboard() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { lang } = useLang();

  const navItems = [
    { to: "/instructor", label: t("nav.overview"), icon: LayoutDashboard, end: true },
    { to: "/instructor/students", label: t("nav.myStudents"), icon: Users },
    { to: "/instructor/courses", label: t("nav.myCourses"), icon: BookOpen },
    {
      to: "/instructor/lesson-pdfs",
      label: lang === "ar" ? "ملفات الدروس PDF" : "Lesson PDFs",
      icon: FileText,
    },
    {
      to: "/instructor/sessions",
      label: lang === "ar" ? "جلسات المقررات" : "Course Sessions",
      icon: Video,
    },
    {
      to: "/instructor/chat",
      label: lang === "ar" ? "المحادثات المباشرة" : "Direct Chat",
      icon: MessageSquare,
    },
    {
      to: "/instructor/assignments",
      label: lang === "ar" ? "الواجبات" : "Assignments",
      icon: ClipboardList,
    },
    { to: "/instructor/quizzes", label: t("nav.quizzes"), icon: ClipboardCheck },
    { to: "/instructor/scoreboard", label: t("nav.scoreboard"), icon: Trophy },
    {
      to: "/instructor/progress-tracker",
      label: lang === "ar" ? "تتبع تقدم الطالب" : "Progress Tracker",
      icon: TrendingUp,
    },
    { to: "/instructor/grades", label: t("nav.grades"), icon: Award },
  ];

  return (
    <AppLayout navItems={navItems}>
      <Routes>
        <Route
          index
          element={
            <InstructorAnalyticsDashboard
              instructorId={user.uid}
              instructorProfile={user}
              showManageLinks
            />
          }
        />
        <Route
          path="students"
          element={<StudentsModule filterInstructorId={user.uid} />}
        />
        <Route path="courses" element={<CoursesModule mode="instructor" />} />
        <Route path="lesson-pdfs" element={<LessonLibraryModule mode="instructor" />} />
        <Route path="sessions" element={<CourseSessionsModule mode="instructor" />} />
        <Route path="chat" element={<DirectChatModule mode="instructor" />} />
        <Route path="assignments" element={<AssignmentsModule mode="instructor" />} />
        <Route path="quizzes" element={<QuizzesModule mode="instructor" />} />
        <Route path="scoreboard" element={<ScoreboardModule mode="instructor" />} />
        <Route path="progress-tracker" element={<StudentProgressTrackerModule />} />
        <Route path="grades" element={<GradesModule mode="instructor" />} />
        <Route path="*" element={<Navigate to="/instructor" replace />} />
      </Routes>
    </AppLayout>
  );
}
