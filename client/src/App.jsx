import { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { ThemeProvider } from "./context/ThemeContext";
import { LangProvider } from "./context/LangContext";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { PopupProvider } from "./context/PopupContext";
import { UploadProgressProvider } from "./context/UploadProgressContext";
import { playClickSound } from "./utils/soundEffects";
import RoleGuard from "./components/common/RoleGuard";
import RobotIntroSplash from "./components/common/RobotIntroSplash";
import LoginPage from "./features/auth/LoginPage";
import RegisterPage from "./features/auth/RegisterPage";
import AdminDashboard from "./features/admin/AdminDashboard";
import InstructorDashboard from "./features/instructor/InstructorDashboard";
import StudentDashboard from "./features/student/StudentDashboard";

function RootRedirect() {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === "admin") return <Navigate to="/admin" replace />;
  if (user.role === "instructor") return <Navigate to="/instructor" replace />;
  return <Navigate to="/student" replace />;
}

export default function App() {
  const [showIntro, setShowIntro] = useState(true);

  useEffect(() => {
    const handleGlobalClick = (e) => {
      const interactive = e.target?.closest?.(
        'button, a, select, input, textarea, [role="button"], label'
      );
      if (!interactive || interactive.disabled) return;
      playClickSound();
    };
    window.addEventListener("pointerdown", handleGlobalClick, { capture: true, passive: true });
    return () => window.removeEventListener("pointerdown", handleGlobalClick, { capture: true });
  }, []);

  return (
    <ThemeProvider>
      <LangProvider>
        <AuthProvider>
          <PopupProvider>
            <UploadProgressProvider>
              {showIntro && <RobotIntroSplash onComplete={() => setShowIntro(false)} />}
              <BrowserRouter>
                <Toaster
                  position="top-center"
                  toastOptions={{
                    duration: 3800,
                    style: {
                      background: "rgba(15, 23, 42, 0.84)",
                      color: "#f8fafc",
                      backdropFilter: "blur(16px)",
                      WebkitBackdropFilter: "blur(16px)",
                      border: "1px solid rgba(255, 255, 255, 0.18)",
                      borderRadius: "16px",
                      padding: "12px 16px",
                      boxShadow: "0 14px 40px rgba(2, 132, 199, 0.25)",
                      fontSize: "13px",
                      fontWeight: 600,
                    },
                  }}
                />
                <Routes>
                  <Route path="/" element={<RootRedirect />} />
                  <Route path="/login" element={<LoginPage />} />
                  <Route path="/register" element={<RegisterPage />} />

                  <Route
                    path="/admin/*"
                    element={
                      <RoleGuard allowedRoles={["admin"]}>
                        <AdminDashboard />
                      </RoleGuard>
                    }
                  />

                  <Route
                    path="/instructor/*"
                    element={
                      <RoleGuard allowedRoles={["instructor"]}>
                        <InstructorDashboard />
                      </RoleGuard>
                    }
                  />

                  <Route
                    path="/student/*"
                    element={
                      <RoleGuard allowedRoles={["student"]}>
                        <StudentDashboard />
                      </RoleGuard>
                    }
                  />

                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </BrowserRouter>
            </UploadProgressProvider>
          </PopupProvider>
        </AuthProvider>
      </LangProvider>
    </ThemeProvider>
  );
}
