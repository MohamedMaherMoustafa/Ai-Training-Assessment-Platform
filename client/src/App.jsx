import { Component, lazy, Suspense, useEffect, useState } from "react";
import { MemoryRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { ThemeProvider } from "./context/ThemeContext";
import { LangProvider } from "./context/LangContext";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { PopupProvider } from "./context/PopupContext";
import { UploadProgressProvider } from "./context/UploadProgressContext";
import { playClickSound } from "./utils/soundEffects";
import RoleGuard from "./components/common/RoleGuard";
import RobotIntroSplash from "./components/common/RobotIntroSplash";
import PlatformCachePrompt from "./components/common/PlatformCachePrompt";

// High-performance code-split lazy routes
const LoginPage = lazy(() => import("./features/auth/LoginPage"));
const RegisterPage = lazy(() => import("./features/auth/RegisterPage"));
const AdminDashboard = lazy(() => import("./features/admin/AdminDashboard"));
const InstructorDashboard = lazy(() => import("./features/instructor/InstructorDashboard"));
const StudentDashboard = lazy(() => import("./features/student/StudentDashboard"));

function PageLoader() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="h-10 w-10 rounded-full border-3 border-indigo-500/20 border-t-indigo-500 animate-spin" />
    </div>
  );
}

function RootRedirect() {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === "admin") return <Navigate to="/admin" replace />;
  if (user.role === "instructor") return <Navigate to="/instructor" replace />;
  return <Navigate to="/student" replace />;
}

function shouldShowSplash() {
  if (typeof window === "undefined" || !window.sessionStorage) return false;
  try {
    const params = new URLSearchParams(window.location.search);
    if (params.get("splash") === "1" || params.get("intro") === "1") {
      return true;
    }

    const alreadyShown = sessionStorage.getItem("platform_splash_shown");
    if (alreadyShown) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

class AppErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error) {
    return { error };
  }
  componentDidCatch(error) {
    console.error("Application render error:", error);
  }
  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen flex items-center justify-center p-6 bg-slate-950 text-slate-100">
          <div className="max-w-md w-full rounded-3xl border border-rose-500/30 bg-slate-900/90 p-6 space-y-3 text-center shadow-2xl">
            <h2 className="text-lg font-black text-rose-400">Something went wrong</h2>
            <p className="text-xs text-slate-300 break-words">{this.state.error?.message}</p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="px-4 py-2 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 text-xs font-extrabold cursor-pointer"
            >
              Reload Platform
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  const [showIntro, setShowIntro] = useState(() => shouldShowSplash());

  useEffect(() => {
    // Intercept hard refresh shortcuts (Ctrl+F5, Ctrl+Shift+R, Cmd+Shift+R, Shift+F5)
    // so hard reloads will clear the session flag and show the splash screen again
    const handleHardRefreshKeys = (e) => {
      const isCtrlOrCmd = e.ctrlKey || e.metaKey;
      const isF5 = e.key === "F5";
      const isR = e.key === "r" || e.key === "R";
      const isShift = e.shiftKey;

      if ((isCtrlOrCmd && isF5) || (isCtrlOrCmd && isShift && isR) || (isShift && isF5)) {
        try {
          sessionStorage.removeItem("platform_splash_shown");
        } catch {}
      }
      if (e.key === "Shift") {
        window.__shiftHeldForReload = true;
      }
    };

    const handleKeyUp = (e) => {
      if (e.key === "Shift") {
        window.__shiftHeldForReload = false;
      }
    };

    const handleBeforeUnload = () => {
      if (window.__shiftHeldForReload) {
        try {
          sessionStorage.removeItem("platform_splash_shown");
        } catch {}
      }
    };

    window.addEventListener("keydown", handleHardRefreshKeys, { passive: true });
    window.addEventListener("keyup", handleKeyUp, { passive: true });
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("keydown", handleHardRefreshKeys);
      window.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, []);

  const handleCompleteIntro = () => {
    setShowIntro(false);
    try {
      sessionStorage.setItem("platform_splash_shown", "true");
    } catch {}
  };

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
    <AppErrorBoundary>
      <ThemeProvider>
      <LangProvider>
        <AuthProvider>
          <PopupProvider>
            <UploadProgressProvider>
              {showIntro && <RobotIntroSplash onComplete={handleCompleteIntro} />}
              <PlatformCachePrompt />
              <MemoryRouter initialEntries={["/"]}>
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
                <Suspense fallback={<PageLoader />}>
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
                </Suspense>
              </MemoryRouter>
            </UploadProgressProvider>
          </PopupProvider>
        </AuthProvider>
      </LangProvider>
    </ThemeProvider>
    </AppErrorBoundary>
  );
}
