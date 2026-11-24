import { Navigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useTranslation } from "react-i18next";

export default function RoleGuard({ allowedRoles, children }) {
  const { user, loading } = useAuth();
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

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
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

