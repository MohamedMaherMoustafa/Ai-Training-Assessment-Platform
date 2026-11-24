import { Navigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useTranslation } from "react-i18next";

export default function RoleGuard({ allowedRoles, children }) {
  const { user, setUser, loading } = useAuth();
  const { t } = useTranslation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="flex items-center gap-3 text-slate-600 dark:text-slate-300 font-medium">
          <span className="h-5 w-5 rounded-full border-2 border-sky-600 border-t-transparent animate-spin" />
          {t("app.loading")}
        </div>
      </div>
    );
  }

  // If user is guest/exploring without login, adapt role to requested view
  if (user?.isGuest && allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    const targetRole = allowedRoles[0];
    setUser((prev) => ({
      ...prev,
      role: targetRole,
      displayName:
        targetRole === "admin"
          ? "Admin"
          : targetRole === "instructor"
          ? "Instructor"
          : "Student",
      name:
        targetRole === "admin"
          ? { en: "Admin", ar: "مدير النظام" }
          : targetRole === "instructor"
          ? { en: "Instructor", ar: "معلم" }
          : { en: "Student", ar: "طالب" },
    }));
  } else if (!user) {
    return children;
  } else if (!user.isGuest && allowedRoles && !allowedRoles.includes(user.role)) {
    const target =
      user.role === "admin"
        ? "/admin"
        : user.role === "instructor"
        ? "/instructor"
        : "/student";
    return <Navigate to={target} replace />;
  }

  return children;
}

