import { Routes, Route, Navigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { LayoutDashboard, Users, Award, Trophy, Video } from "lucide-react";
import AppLayout from "../../components/layout/AppLayout";
import AdminOverview from "./AdminOverview";
import InstructorsModule from "./InstructorsModule";
import GradesModule from "../grades/GradesModule";
import ScoreboardModule from "../scoreboard/ScoreboardModule";
import CourseSessionsModule from "../sessions/CourseSessionsModule";

export default function AdminDashboard() {
  const { t } = useTranslation();

  const navItems = [
    { to: "/admin", label: t("nav.overview"), icon: LayoutDashboard, end: true },
    { to: "/admin/instructors", label: t("nav.instructors"), icon: Users },
    { to: "/admin/sessions", label: t("nav.sessions"), icon: Video },
    { to: "/admin/scoreboard", label: t("nav.scoreboard"), icon: Trophy },
    { to: "/admin/grades", label: t("nav.grades"), icon: Award },
  ];

  return (
    <AppLayout navItems={navItems}>
      <Routes>
        <Route index element={<AdminOverview />} />
        <Route path="instructors" element={<InstructorsModule />} />
        <Route path="sessions" element={<CourseSessionsModule mode="admin" />} />
        <Route path="scoreboard" element={<ScoreboardModule mode="admin" />} />
        <Route path="grades" element={<GradesModule mode="admin" />} />
        <Route path="*" element={<Navigate to="/admin" replace />} />
      </Routes>
    </AppLayout>
  );
}
