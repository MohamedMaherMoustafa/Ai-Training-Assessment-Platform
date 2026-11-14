import { useEffect, useRef, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";
import {
  Sun,
  Moon,
  Languages,
  LogOut,
  GraduationCap,
  Menu,
  X,
  ShieldCheck,
  Bell,
  CheckCheck,
  Trash2,
  Volume2,
  VolumeX,
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

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [soundOn, setSoundOn] = useState(() => isSoundEnabled());

  const toggleSound = () => {
    const next = !soundOn;
    setSoundOn(next);
    setSoundEnabled(next);
  };
  const initialLoadRef = useRef(true);
  const seenIdsRef = useRef(new Set());
  const notifBoxRef = useRef(null);

  useEffect(() => {
    if (!user?.uid) return undefined;
    initialLoadRef.current = true;
    seenIdsRef.current = new Set();

    const unsub = subscribeNotifications(user.uid, (list) => {
      if (initialLoadRef.current) {
        list.forEach((n) => seenIdsRef.current.add(n.id));
        initialLoadRef.current = false;
      } else {
        list.forEach((n) => {
          if (!seenIdsRef.current.has(n.id)) {
            seenIdsRef.current.add(n.id);
            if (!n.read) {
              const title = lang === "ar" ? n.titleAr : n.titleEn;
              const body = lang === "ar" ? n.bodyAr : n.bodyEn;
              toast(body ? `${title}: ${body}` : title, { icon: "🔔" });
            }
          }
        });
      }
      setNotifications(list);
    });

    return () => unsub();
  }, [user?.uid, lang]);

  useEffect(() => {
    const handleOutside = (e) => {
      if (notifBoxRef.current && !notifBoxRef.current.contains(e.target)) {
        setNotifOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleNotificationClick = async (n) => {
    if (!n.read && user?.uid) {
      await markNotificationRead(user.uid, n.id);
    }
    setNotifOpen(false);
    if (n.link) {
      navigate(n.link);
    }
  };

  const handleMarkAllRead = async () => {
    const unreadIds = notifications.filter((n) => !n.read).map((n) => n.id);
    if (user?.uid && unreadIds.length > 0) {
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

  const rolePalette = {
    admin: {
      gradient: "from-fuchsia-600 via-violet-600 to-indigo-600",
      activeNav:
        "bg-gradient-to-r from-fuchsia-500 via-violet-600 to-indigo-600 text-white shadow-lg shadow-fuchsia-500/25",
      badge:
        "bg-gradient-to-r from-fuchsia-500/15 to-violet-500/15 border-fuchsia-400/50 text-fuchsia-700 dark:text-fuchsia-300",
    },
    instructor: {
      gradient: "from-cyan-500 via-blue-600 to-violet-600",
      activeNav:
        "bg-gradient-to-r from-cyan-500 via-blue-600 to-violet-600 text-white shadow-lg shadow-cyan-500/25",
      badge:
        "bg-gradient-to-r from-cyan-500/15 to-violet-500/15 border-cyan-400/50 text-cyan-700 dark:text-cyan-300",
    },
    student: {
      gradient: "from-emerald-500 via-teal-500 to-cyan-600",
      activeNav:
        "bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-600 text-white shadow-lg shadow-emerald-500/25",
      badge:
        "bg-gradient-to-r from-emerald-500/15 to-cyan-500/15 border-emerald-400/50 text-emerald-700 dark:text-emerald-300",
    },
  }[user?.role || "student"];

  return (
    <div className="relative h-screen overflow-hidden flex lg:p-3 lg:gap-3.5 text-slate-900 dark:text-slate-100">
      {/* Ambient Floating Aurora Glow Orbs */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden -z-10">
        <div className="absolute -top-24 -start-16 h-72 w-72 rounded-full bg-cyan-400/25 dark:bg-cyan-500/15 blur-3xl" />
        <div className="absolute top-1/3 -end-20 h-80 w-80 rounded-full bg-fuchsia-400/20 dark:bg-violet-600/15 blur-3xl" />
        <div className="absolute -bottom-24 start-1/3 h-72 w-72 rounded-full bg-emerald-400/20 dark:bg-teal-500/10 blur-3xl" />
      </div>

      {/* Mobile Sidebar Backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-slate-950/55 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Floating Docked Liquid-Glass Sidebar */}
      <aside
        className={`fixed lg:static inset-y-0 start-0 z-40 h-screen lg:h-full shrink-0 w-[88vw] max-w-[340px] lg:w-[325px] glass-panel lg:rounded-[30px] flex flex-col overflow-hidden transition-transform duration-300 ${
          sidebarOpen
            ? "translate-x-0"
            : "-translate-x-full rtl:translate-x-full lg:translate-x-0 lg:rtl:translate-x-0"
        }`}
      >
        {/* Role-Colored Gradient Brand Header */}
        <div className={`m-2.5 sm:m-3 p-3.5 rounded-[22px] bg-gradient-to-br ${rolePalette.gradient} text-white shadow-lg flex items-center justify-between gap-2.5`}>
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-10 w-10 rounded-2xl bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center shrink-0 shadow-inner">
              <GraduationCap className="h-5 w-5" />
            </div>
            <div className="leading-tight min-w-0">
              <div className="font-extrabold text-[13px] sm:text-[13.5px] leading-snug break-words">
                {t("app.title")}
              </div>
              <div className="text-[10px] font-bold text-white/90 uppercase tracking-wider mt-0.5">
                {t(`roles.${user?.role || "student"}`)}
              </div>
            </div>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-1.5 rounded-lg bg-white/15 hover:bg-white/25 transition-colors shrink-0"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <nav className="flex-1 px-2.5 sm:px-3 py-2 space-y-1.5 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                onClick={() => setSidebarOpen(false)}
                className={({ isActive }) =>
                  `group flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-[13.5px] font-bold whitespace-nowrap transition-all duration-200 ${
                    isActive
                      ? rolePalette.activeNav
                      : "text-slate-600 dark:text-slate-300 hover:bg-white/70 dark:hover:bg-white/10 hover:translate-x-1 rtl:hover:-translate-x-1 hover:text-violet-700 dark:hover:text-cyan-300"
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <span
                      className={`h-8 w-8 rounded-xl flex items-center justify-center shrink-0 transition-transform duration-200 ${
                        isActive
                          ? "bg-white/25 text-white"
                          : "bg-gradient-to-br from-sky-500/15 to-violet-500/15 text-sky-600 dark:text-cyan-300 group-hover:scale-105"
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="whitespace-nowrap truncate">{item.label}</span>
                  </>
                )}
              </NavLink>
            );
          })}
        </nav>

        <div className="p-2.5 sm:p-3 border-t border-white/40 dark:border-white/10 space-y-2">
          <div className="flex items-center gap-3 px-3.5 py-2.5 rounded-2xl glass-subtle">
            <div
              className={`h-9 w-9 rounded-full bg-gradient-to-br ${rolePalette.gradient} text-white text-xs font-black flex items-center justify-center shrink-0 shadow-sm`}
            >
              {String(displayName || "U").slice(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-bold truncate text-slate-800 dark:text-slate-100">{displayName}</div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                {user?.username || user?.email}
              </div>
            </div>
            <ShieldCheck className="h-4 w-4 text-emerald-500 shrink-0" />
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-2xl text-xs font-bold text-rose-600 dark:text-rose-400 bg-rose-500/10 hover:bg-rose-500 hover:text-white transition-all duration-200"
          >
            <LogOut className="h-4 w-4" />
            {t("app.logout")}
          </button>
        </div>
      </aside>

      {/* Main Content Dock (Independently Scrollable) */}
      <div className="flex-1 flex flex-col min-w-0 h-screen lg:h-full overflow-y-auto px-2 sm:px-4 lg:px-1">
        <header className="min-h-[56px] shrink-0 glass-panel rounded-[20px] sm:rounded-[22px] mt-2 lg:mt-0 px-2.5 sm:px-4 py-1.5 flex items-center justify-between gap-2 sticky top-2 lg:top-0 z-20">
          <div className="flex items-center gap-2 min-w-0">
            <button
              onClick={() => setSidebarOpen(true)}
              aria-label="Open menu"
              className="lg:hidden p-2 rounded-xl hover:bg-white/60 dark:hover:bg-slate-800/70 transition-colors shrink-0"
            >
              <Menu className="h-5 w-5" />
            </button>
            <span className={`text-[11px] sm:text-xs font-extrabold px-2.5 sm:px-3.5 py-1 rounded-full border truncate ${rolePalette.badge}`}>
              {t(`roles.${user?.role || "student"}`)}
            </span>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Notification Bell Icon */}
            <div className="relative" ref={notifBoxRef}>
              <button
                onClick={() => setNotifOpen((o) => !o)}
                aria-label="Notifications"
                className="glass-btn-secondary relative p-2 rounded-xl flex items-center justify-center"
              >
                <Bell className="h-4 w-4 text-sky-600 dark:text-sky-400" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -end-1 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-600 text-white text-[10px] font-extrabold flex items-center justify-center shadow">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
              </button>

              {notifOpen && (
                <div className="fixed sm:absolute inset-x-3 sm:inset-x-auto sm:end-0 top-[70px] sm:top-auto sm:mt-2 sm:w-96 glass-panel rounded-2xl shadow-2xl border border-white/75 dark:border-white/15 overflow-hidden z-50">
                  <div className="px-4 py-3 border-b border-white/40 dark:border-white/10 flex items-center justify-between">
                    <span className="font-bold text-xs flex items-center gap-1.5">
                      <Bell className="h-3.5 w-3.5 text-sky-600" />
                      {lang === "ar" ? "الإشعارات" : "Notifications"} ({unreadCount})
                    </span>
                    <div className="flex items-center gap-2 text-[11px]">
                      {unreadCount > 0 && (
                        <button
                          onClick={handleMarkAllRead}
                          className="text-sky-600 dark:text-sky-400 font-semibold hover:underline flex items-center gap-1"
                        >
                          <CheckCheck className="h-3.5 w-3.5" />
                          {lang === "ar" ? "قراءة الكل" : "Mark read"}
                        </button>
                      )}
                      {notifications.length > 0 && (
                        <button
                          onClick={handleClearAll}
                          className="text-rose-600 dark:text-rose-400 font-semibold hover:underline flex items-center gap-1"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          {lang === "ar" ? "مسح" : "Clear"}
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="max-h-80 overflow-y-auto divide-y divide-white/30 dark:divide-white/10">
                    {notifications.length === 0 ? (
                      <div className="p-6 text-center text-xs text-slate-500">
                        {lang === "ar" ? "لا توجد إشعارات حالياً." : "No notifications yet."}
                      </div>
                    ) : (
                      notifications.map((n) => (
                        <button
                          key={n.id}
                          onClick={() => handleNotificationClick(n)}
                          className={`w-full text-start px-4 py-3 transition-colors hover:bg-white/50 dark:hover:bg-white/5 flex items-start gap-2.5 ${
                            !n.read ? "bg-sky-500/10" : ""
                          }`}
                        >
                          <span
                            className={`mt-1.5 h-2 w-2 rounded-full shrink-0 ${
                              !n.read ? "bg-sky-500" : "bg-transparent"
                            }`}
                          />
                          <div className="min-w-0 flex-1">
                            <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                              {lang === "ar" ? n.titleAr : n.titleEn}
                            </div>
                            <div className="text-[11px] text-slate-600 dark:text-slate-300 mt-0.5 line-clamp-2">
                              {lang === "ar" ? n.bodyAr : n.bodyEn}
                            </div>
                            <div className="text-[10px] text-slate-400 mt-1">
                              {n.createdAt ? new Date(n.createdAt).toLocaleString() : ""}
                            </div>
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={toggleSound}
              title={
                lang === "ar"
                  ? soundOn
                    ? "إيقاف الأصوات"
                    : "تفعيل الأصوات"
                  : soundOn
                  ? "Mute Sounds"
                  : "Enable Sounds"
              }
              className="glass-btn-secondary flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold"
            >
              {soundOn ? (
                <Volume2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              ) : (
                <VolumeX className="h-4 w-4 text-slate-400" />
              )}
            </button>

            <button
              onClick={toggleLang}
              aria-label="Toggle language"
              className="glass-btn-secondary flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-semibold"
            >
              <Languages className="h-4 w-4 text-sky-600 dark:text-sky-400 shrink-0" />
              <span className="hidden sm:inline">{t("app.lang")}</span>
            </button>
            <button
              onClick={toggleTheme}
              aria-label="Toggle theme"
              className="glass-btn-secondary flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-semibold"
            >
              {theme === "dark" ? (
                <>
                  <Sun className="h-4 w-4 text-amber-400 shrink-0" />
                  <span className="hidden sm:inline">{t("app.light")}</span>
                </>
              ) : (
                <>
                  <Moon className="h-4 w-4 text-indigo-600 shrink-0" />
                  <span className="hidden sm:inline">{t("app.dark")}</span>
                </>
              )}
            </button>
          </div>
        </header>

        <main className="flex-1 py-3 px-0.5 sm:p-4 md:p-6 max-w-7xl w-full mx-auto">{children}</main>
      </div>
      <PlatformChatbotWidget />
    </div>
  );
}
