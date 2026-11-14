import { useEffect, useRef, useState } from "react";
import { NavLink, useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";
import {
  Sun,
  Moon,
  LogOut,
  GraduationCap,
  Menu,
  X,
  Bell,
  CheckCheck,
  Trash2,
  Volume2,
  VolumeX,
  Home,
  Globe,
  ChevronDown,
  Settings,
} from "lucide-react";
import { useTheme } from "../../context/ThemeContext";
import { useLang } from "../../context/LangContext";
import { useAuth } from "../../context/AuthContext";
import { isSoundEnabled, setSoundEnabled } from "../../utils/soundEffects";
import PlatformChatbotWidget from "../common/PlatformChatbotWidget";
import {
  clearNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  subscribeNotifications,
} from "../../services/platformService";

export default function AppLayout({ navItems, children }) {
  const { t } = useTranslation();
  const { theme, toggleTheme } = useTheme();
  const { lang, toggleLang } = useLang();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [soundOn, setSoundOn] = useState(isSoundEnabled());
  const notifBoxRef = useRef(null);

  const toggleSound = () => {
    const next = !soundOn;
    setSoundOn(next);
    setSoundEnabled(next);
    toast.success(next ? "Sound effects enabled" : "Sound muted", { duration: 1500 });
  };

  useEffect(() => {
    if (!user?.uid) return;
    const unsub = subscribeNotifications(user.uid, (list) => {
      setNotifications(list);
    });
    return () => unsub && unsub();
  }, [user?.uid]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (notifBoxRef.current && !notifBoxRef.current.contains(e.target)) {
        setNotifOpen(false);
      }
    };
    if (notifOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [notifOpen]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleLogout = async () => {
    try {
      await logout();
      toast.success(t("auth.signedOut") || "Signed out");
      navigate("/login");
    } catch {
      toast.error("Logout failed");
    }
  };

  const handleNotificationClick = async (notif) => {
    if (!notif.read && user?.uid) {
      await markNotificationRead(user.uid, notif.id);
    }
    if (notif.link) {
      setNotifOpen(false);
      navigate(notif.link);
    }
  };

  const handleMarkAllRead = async () => {
    if (user?.uid) {
      const unreadIds = notifications.filter((n) => !n.read).map((n) => n.id);
      await markAllNotificationsRead(user.uid, unreadIds);
    }
  };

  const handleClearAll = async () => {
    if (user?.uid) {
      await clearNotifications(user.uid);
    }
  };

  const displayName =
    user?.name?.[lang] || user?.displayName || user?.username || user?.email;

  // Active breadcrumb detection
  const activeItem = navItems.find((item) =>
    item.end ? location.pathname === item.to : location.pathname.startsWith(item.to)
  );
  const currentBreadcrumb = activeItem?.label || (lang === "ar" ? "لوحة التحكم" : "Dashboard");

  return (
    <div className="relative h-screen overflow-hidden flex lg:p-3 lg:gap-3.5 text-slate-900 dark:text-slate-100">
      {/* Subtle Dot Pattern Overlay */}
      <div className="pointer-events-none fixed inset-0 bg-dot-pattern opacity-40 dark:opacity-20 -z-10" />

      {/* Mobile Sidebar Backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-slate-950/60 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Midnight Navy Sidebar */}
      <aside
        className={`fixed lg:static inset-y-0 start-0 z-40 h-screen lg:h-full shrink-0 w-[86vw] max-w-[310px] lg:w-[280px] xl:w-[290px] bg-[#0c1024] text-white lg:rounded-[28px] border border-[#1b224d]/80 flex flex-col justify-between overflow-hidden shadow-2xl transition-transform duration-300 ${
          sidebarOpen
            ? "translate-x-0"
            : "-translate-x-full rtl:translate-x-full lg:translate-x-0 lg:rtl:translate-x-0"
        }`}
      >
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Top Brand Section */}
          <div className="pt-6 pb-4 px-4 text-center border-b border-white/5 relative">
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden absolute top-4 end-4 p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
            <div className="h-12 w-12 rounded-2xl bg-gradient-to-tr from-[#3b28b6] to-[#6025d8] text-white flex items-center justify-center shadow-lg shadow-indigo-600/35 mx-auto mb-2.5">
              <GraduationCap className="h-6 w-6 text-white" />
            </div>
            <div className="font-extrabold text-sm sm:text-[14px] leading-snug tracking-tight text-white">
              AI Training &<br />Assessment Platform
            </div>
            <div className="text-[10.5px] font-semibold text-indigo-300/90 mt-1">
              Learn • Practice • Get Certified
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="flex-1 px-3 py-3.5 space-y-1 overflow-y-auto">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  onClick={() => setSidebarOpen(false)}
                  className={({ isActive }) =>
                    `group relative flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-[12.5px] transition-all duration-200 ${
                      isActive
                        ? "bg-gradient-to-r from-[#4f3df7] to-[#703bf7] text-white font-bold shadow-lg shadow-indigo-600/30"
                        : "text-slate-300/80 hover:text-white hover:bg-white/5 font-semibold"
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      {isActive && (
                        <span className="absolute -start-2 top-1/2 -translate-y-1/2 w-1 h-6 rounded-full bg-indigo-400" />
                      )}
                      <Icon className={`h-4 w-4 shrink-0 ${isActive ? "text-white" : "text-slate-400 group-hover:text-white"}`} />
                      <span className="truncate">{item.label}</span>
                    </>
                  )}
                </NavLink>
              );
            })}
          </nav>
        </div>

        {/* Bottom User Card */}
        <div className="p-3 border-t border-white/5 bg-[#0a0e20]">
          <div className="bg-[#161c3d] rounded-2xl p-2.5 flex items-center justify-between border border-white/5 mb-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="h-9 w-9 rounded-xl bg-[#14b8a6] text-white font-black text-xs flex items-center justify-center shrink-0 shadow-sm">
                {String(displayName || "U").slice(0, 2).toUpperCase()}
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold text-white truncate">{displayName}</div>
                <div className="text-[10px] text-slate-400 capitalize truncate">
                  {t(`roles.${user?.role || "student"}`)}
                </div>
              </div>
            </div>
            <Settings className="h-4 w-4 text-slate-400 hover:text-white transition-colors cursor-pointer shrink-0" />
          </div>

          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold text-[#e11d48] bg-[#fde2e4] hover:bg-rose-100 dark:bg-rose-950/40 dark:text-rose-400 transition-colors cursor-pointer shadow-sm"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span>{t("app.logout")}</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-screen lg:h-full overflow-y-auto px-2 sm:px-4 lg:px-1">
        {/* Top Header Bar */}
        <header className="min-h-[50px] shrink-0 bg-white/95 dark:bg-slate-900/90 backdrop-blur-md rounded-full mt-2 lg:mt-0 px-3 sm:px-5 py-1.5 flex items-center justify-between gap-2 shadow-sm border border-slate-200/80 dark:border-white/10 sticky top-2 lg:top-0 z-20">
          <div className="flex items-center gap-2 min-w-0">
            <button
              onClick={() => setSidebarOpen(true)}
              aria-label="Open menu"
              className="lg:hidden p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="rounded-full border border-slate-200/80 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-1 flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-100 shadow-sm">
              <GraduationCap className="h-3.5 w-3.5 text-indigo-600 dark:text-cyan-400" />
              <span>{t(`roles.${user?.role || "student"}`)}</span>
              <ChevronDown className="h-3 w-3 text-slate-400" />
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Notification Bell */}
            <div className="relative" ref={notifBoxRef}>
              <button
                onClick={() => setNotifOpen((o) => !o)}
                aria-label="Notifications"
                className="h-8 w-8 sm:h-9 sm:w-9 rounded-full border border-slate-200/80 dark:border-slate-700 bg-white dark:bg-slate-800 flex items-center justify-center text-slate-700 dark:text-slate-200 shadow-sm hover:bg-slate-50 dark:hover:bg-slate-700 transition-all relative"
              >
                <Bell className="h-4 w-4" />
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -end-0.5 min-w-[16px] h-4 px-1 rounded-full bg-rose-500 text-white text-[9px] font-black flex items-center justify-center ring-2 ring-white dark:ring-slate-900 shadow">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
              </button>

              {notifOpen && (
                <div className="fixed sm:absolute inset-x-3 sm:inset-x-auto sm:end-0 top-[70px] sm:top-auto sm:mt-2 sm:w-96 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-white/15 overflow-hidden z-50">
                  <div className="px-4 py-3 border-b border-slate-200/60 dark:border-white/10 flex items-center justify-between">
                    <span className="font-bold text-xs flex items-center gap-1.5">
                      <Bell className="h-3.5 w-3.5 text-indigo-600" />
                      {lang === "ar" ? "الإشعارات" : "Notifications"} ({unreadCount})
                    </span>
                    <div className="flex items-center gap-2 text-[11px]">
                      {unreadCount > 0 && (
                        <button
                          onClick={handleMarkAllRead}
                          className="text-indigo-600 dark:text-cyan-400 font-semibold hover:underline flex items-center gap-1"
                        >
                          <CheckCheck className="h-3 w-3" />
                          {lang === "ar" ? "تحديد كمقروء" : "Mark all read"}
                        </button>
                      )}
                      <button
                        onClick={handleClearAll}
                        className="text-slate-400 hover:text-rose-500 flex items-center gap-1"
                      >
                        <Trash2 className="h-3 w-3" />
                        {lang === "ar" ? "مسح الكل" : "Clear"}
                      </button>
                    </div>
                  </div>
                  <div className="max-h-72 overflow-y-auto divide-y divide-slate-100 dark:divide-white/5">
                    {notifications.length === 0 ? (
                      <div className="p-6 text-center text-xs text-slate-400">
                        {lang === "ar" ? "لا توجد إشعارات حالياً" : "No notifications yet."}
                      </div>
                    ) : (
                      notifications.map((n) => (
                        <div
                          key={n.id}
                          onClick={() => handleNotificationClick(n)}
                          className={`p-3 text-xs cursor-pointer transition-colors flex items-start gap-2.5 ${
                            n.read
                              ? "bg-transparent text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                              : "bg-indigo-50/50 dark:bg-indigo-950/20 text-slate-800 dark:text-slate-100 font-medium hover:bg-indigo-50"
                          }`}
                        >
                          <div className="h-2 w-2 rounded-full mt-1.5 bg-indigo-500 shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="font-bold text-xs">{n.title}</div>
                            <div className="text-[11px] opacity-90 truncate mt-0.5">{n.message}</div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Sound Toggle */}
            <button
              onClick={toggleSound}
              aria-label="Toggle sound"
              className="h-8 w-8 sm:h-9 sm:w-9 rounded-full border border-slate-200/80 dark:border-slate-700 bg-white dark:bg-slate-800 flex items-center justify-center text-slate-700 dark:text-slate-200 shadow-sm hover:bg-slate-50 dark:hover:bg-slate-700 transition-all"
            >
              {soundOn ? <Volume2 className="h-4 w-4 text-emerald-500" /> : <VolumeX className="h-4 w-4 text-slate-400" />}
            </button>

            {/* Language Switcher */}
            <button
              onClick={toggleLang}
              aria-label="Toggle language"
              className="rounded-full border border-slate-200/80 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 sm:px-3.5 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-200 shadow-sm flex items-center gap-1.5 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all"
            >
              <Globe className="h-3.5 w-3.5 text-slate-500" />
              <span>{lang === "ar" ? "العربية" : "English"}</span>
              <ChevronDown className="h-3 w-3 text-slate-400" />
            </button>

            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              aria-label="Toggle theme"
              className="rounded-full border border-slate-200/80 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 sm:px-3.5 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-200 shadow-sm flex items-center gap-1.5 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all"
            >
              {theme === "dark" ? (
                <>
                  <Sun className="h-3.5 w-3.5 text-amber-400" />
                  <span className="hidden sm:inline">{t("app.light")}</span>
                </>
              ) : (
                <>
                  <Moon className="h-3.5 w-3.5 text-indigo-600" />
                  <span className="hidden sm:inline">{t("app.dark")}</span>
                </>
              )}
            </button>
          </div>
        </header>

        {/* Welcome Hero Banner with 3D Books Artwork */}
        <div className="my-3 rounded-[26px] bg-gradient-to-r from-[#edf0fe] via-[#f2f4fe] to-[#e4e9fd] dark:from-slate-900 dark:via-indigo-950/30 dark:to-slate-900 border border-slate-200/80 dark:border-white/10 p-5 sm:p-6 shadow-sm relative overflow-hidden flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="relative z-10">
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              {lang === "ar"
                ? `مرحباً بعودتك، ${displayName || t(`roles.${user?.role || "student"}`)}!`
                : `Welcome Back, ${displayName || t(`roles.${user?.role || "student"}`)}!`}
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 mt-1 font-medium">
              {lang === "ar"
                ? "تابع رحلتك التعليمية وحقق أهدافك الدراسية 🚀"
                : "Continue your learning journey and achieve your goals 🚀"}
            </p>
          </div>
          {/* 3D Illustration of Graduation Cap & Books */}
          <div className="hidden sm:block shrink-0">
            <svg viewBox="0 0 180 110" className="w-32 h-auto drop-shadow-md select-none pointer-events-none" fill="none">
              <defs>
                <linearGradient id="wbBookGrad1" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#1e1b4b" />
                  <stop offset="100%" stopColor="#4338ca" />
                </linearGradient>
                <linearGradient id="wbBookGrad2" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#2e1065" />
                  <stop offset="100%" stopColor="#6366f1" />
                </linearGradient>
                <linearGradient id="wbGold" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#fde047" />
                  <stop offset="100%" stopColor="#f59e0b" />
                </linearGradient>
              </defs>
              <ellipse cx="90" cy="100" rx="65" ry="8" fill="#09051d" fillOpacity="0.15" />
              <path d="M 40 88 L 130 76 L 140 84 L 50 96 Z" fill="url(#wbBookGrad1)" />
              <path d="M 50 96 L 140 84 L 140 90 L 50 102 Z" fill="#e2e8f0" />
              <path d="M 46 76 L 134 64 L 144 72 L 56 84 Z" fill="url(#wbBookGrad2)" />
              <path d="M 56 84 L 144 72 L 144 78 L 56 90 Z" fill="#f8fafc" />
              <ellipse cx="90" cy="54" rx="20" ry="7" fill="#090d16" />
              <polygon points="90,32 132,46 90,60 48,46" fill="#0f172a" stroke="#475569" strokeWidth="0.8" />
              <circle cx="90" cy="46" r="2.5" fill="url(#wbGold)" />
              <path d="M 90 46 Q 106 49 114 62 L 115 72" stroke="url(#wbGold)" strokeWidth="2" strokeLinecap="round" />
              <polygon points="113,72 117,72 118,78 112,78" fill="url(#wbGold)" />
            </svg>
          </div>
        </div>

        {/* Breadcrumb Navigation */}
        <div className="flex items-center gap-2 text-xs font-bold text-indigo-600 dark:text-indigo-400 mb-3 px-1">
          <Home className="h-3.5 w-3.5" />
          <span>›</span>
          <span>{currentBreadcrumb}</span>
        </div>

        {/* Dynamic Main Workspace Content */}
        <main className="flex-1 pb-16">{children}</main>
      </div>

      {/* Walking Robot AI Chatbot (Retained Exactly as Requested) */}
      <PlatformChatbotWidget />
    </div>
  );
}
