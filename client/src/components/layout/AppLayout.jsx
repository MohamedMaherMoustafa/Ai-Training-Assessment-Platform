import { useEffect, useLayoutEffect, useRef, useState } from "react";
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
  Globe,
  ChevronDown,
  ChevronLeft,
  Settings,
} from "lucide-react";
import { useTheme } from "../../context/ThemeContext";
import { useLang } from "../../context/LangContext";
import { useAuth } from "../../context/AuthContext";
import { isSoundEnabled, setSoundEnabled, playLogoutSound } from "../../utils/soundEffects";
import PlatformChatbotWidget from "../common/PlatformChatbotWidget";
import LanguageDropdown from "../common/LanguageDropdown";
import ProfileSettingsModal from "../common/ProfileSettingsModal";
import { getStoreItemById } from "../../features/store/storeData";
import {
  clearNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  subscribeNotifications,
  subscribeUserDirectChats,
  getStudentCustomizationAndCoins,
} from "../../services/platformService";

export default function AppLayout({ navItems, children }) {
  const { t } = useTranslation();
  const { theme, toggleTheme, logoSrc } = useTheme();
  const { lang, toggleLang } = useLang();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadChatCount, setUnreadChatCount] = useState(0);
  const [soundOn, setSoundOn] = useState(isSoundEnabled());
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const notifBoxRef = useRef(null);

  const [customization, setCustomization] = useState(() => {
    try {
      const local = user?.uid ? localStorage.getItem(`customization_${user.uid}`) : null;
      return local ? JSON.parse(local) : { equipped: {}, availableCoins: 0 };
    } catch {
      return { equipped: {}, availableCoins: 0 };
    }
  });

  useEffect(() => {
    if (!user?.uid || user.role !== "student") return;
    getStudentCustomizationAndCoins(user.uid)
      .then((res) => {
        setCustomization({
          equipped: res.equipped || {},
          availableCoins: res.availableCoins || 0,
        });
      })
      .catch(() => {});

    const handleUpdate = (e) => {
      if (e.detail?.equipped) {
        setCustomization((prev) => ({
          ...prev,
          equipped: e.detail.equipped,
          availableCoins:
            e.detail.availableCoins !== undefined
              ? e.detail.availableCoins
              : prev.availableCoins,
        }));
      }
    };

    window.addEventListener("athar_customization_updated", handleUpdate);
    return () => window.removeEventListener("athar_customization_updated", handleUpdate);
  }, [user?.uid, user?.role]);

  const equippedFrame = getStoreItemById(customization?.equipped?.avatarFrame);
  const equippedTag = getStoreItemById(customization?.equipped?.nameTag);

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

  // Real-time unread Direct Chat counter across all conversations
  useEffect(() => {
    if (!user?.uid) return;
    const unsub = subscribeUserDirectChats(user.uid, (chatList) => {
      const isInstructor = user.role === "instructor";
      const totalUnread = (chatList || []).reduce((sum, item) => {
        const meta = item.metadata || {};
        const unread = isInstructor
          ? Number(meta.unreadByInstructor || 0)
          : Number(meta.unreadByStudent || 0);
        return sum + unread;
      }, 0);
      setUnreadChatCount(totalUnread);
    });
    return () => unsub && unsub();
  }, [user?.uid, user?.role]);

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
      playLogoutSound();
      await logout();
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

  // Fluid active menu indicator tracking with item refs
  const navRef = useRef(null);
  const itemRefs = useRef({});
  const [indicatorStyle, setIndicatorStyle] = useState({ top: 0, height: 42, opacity: 0 });

  useLayoutEffect(() => {
    if (!activeItem || !navRef.current) return;
    const targetEl = itemRefs.current[activeItem.to];
    if (targetEl) {
      const navRect = navRef.current.getBoundingClientRect();
      const targetRect = targetEl.getBoundingClientRect();
      setIndicatorStyle({
        top: targetRect.top - navRect.top + navRef.current.scrollTop,
        height: targetRect.height,
        opacity: 1,
      });
    } else {
      setIndicatorStyle((prev) => ({ ...prev, opacity: 0 }));
    }
  }, [location.pathname, activeItem?.to, sidebarCollapsed]);

  useEffect(() => {
    if (!navRef.current) return;
    const navEl = navRef.current;
    const handleReposition = () => {
      const targetEl = itemRefs.current[activeItem?.to];
      if (targetEl) {
        const navRect = navEl.getBoundingClientRect();
        const targetRect = targetEl.getBoundingClientRect();
        setIndicatorStyle((prev) => ({
          ...prev,
          top: targetRect.top - navRect.top + navEl.scrollTop,
          height: targetRect.height,
          opacity: 1,
        }));
      }
    };
    navEl.addEventListener("scroll", handleReposition, { passive: true });
    window.addEventListener("resize", handleReposition);
    return () => {
      navEl.removeEventListener("scroll", handleReposition);
      window.removeEventListener("resize", handleReposition);
    };
  }, [activeItem?.to]);

  return (
    <div className="relative h-screen w-full overflow-hidden flex items-center justify-center p-4 sm:p-6 md:p-8 lg:p-10 xl:p-12 text-slate-900 dark:text-slate-100">
      {/* Full-bleed Library Backdrop matching Login page */}
      <div
        className="pointer-events-none fixed inset-0 bg-cover bg-center transition-all duration-700 -z-20"
        style={{
          backgroundImage: theme === "dark" ? "url('/login-library-dark-bg.jpg')" : "url('/login-library-bg.jpg')",
        }}
      />
      <div className="pointer-events-none fixed inset-0 bg-slate-950/10 dark:bg-black/15 -z-15" />
      <div className="pointer-events-none fixed inset-0 bg-dot-pattern opacity-15 dark:opacity-10 -z-10" />

      {/* Mobile Sidebar Backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-slate-950/60 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Unified Ultra-Translucent Liquid Glass Container floating over library background */}
      <div className="w-full max-w-[1280px] xl:max-w-[1320px] h-[86vh] max-h-[820px] min-h-[580px] rounded-[32px] sm:rounded-[36px] bg-white/[0.04] dark:bg-black/[0.10] backdrop-blur-2xl shadow-[0_30px_90px_rgba(0,0,0,0.5),inset_0_1px_1.5px_rgba(255,255,255,0.2),inset_0_-1px_1px_rgba(45,212,191,0.05),0_0_35px_rgba(20,184,166,0.05)] border border-white/35 dark:border-white/[0.07] flex overflow-hidden relative">
        {/* Sidebar Dock */}
        <aside
          className={`fixed lg:static inset-y-0 start-0 z-40 h-screen lg:h-full shrink-0 w-[86vw] max-w-[280px] ${
            sidebarCollapsed ? "lg:w-[76px]" : "lg:w-[230px] xl:w-[245px]"
          } bg-black/25 dark:bg-transparent lg:bg-black/15 lg:dark:bg-transparent backdrop-blur-2xl lg:backdrop-blur-md text-slate-100 dark:text-white border-e border-teal-500/25 dark:border-teal-400/35 flex flex-col justify-between overflow-hidden transition-all duration-300 ${
            sidebarOpen
              ? "translate-x-0 bg-[#07131b]/95"
              : "-translate-x-full rtl:translate-x-full lg:translate-x-0 lg:rtl:translate-x-0"
          }`}
        >
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Top Brand Section matching attached reference */}
            <div className="pt-5 pb-3 px-3.5 text-start relative">
              <button
                onClick={() => setSidebarOpen(false)}
                className="lg:hidden absolute top-4 end-4 p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/20 text-slate-700 dark:text-white transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>

              {/* Desktop Sidebar Collapse Toggle */}
              <button
                type="button"
                onClick={() => setSidebarCollapsed((c) => !c)}
                aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
                className="hidden lg:flex absolute top-4 end-2 h-6 w-6 rounded-lg bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/20 text-slate-500 dark:text-slate-300 items-center justify-center transition-colors cursor-pointer text-xs z-30"
              >
                <ChevronLeft className={`h-3.5 w-3.5 transition-transform duration-300 ${sidebarCollapsed ? "rotate-180 rtl:rotate-0" : "rotate-0 rtl:rotate-180"}`} />
              </button>

              {/* Athar Brand Logo: Light & Dark Mode Types */}
              <div className={`transition-all duration-300 flex items-center ${sidebarCollapsed ? "justify-center" : "pe-6"}`}>
                <img
                  src={logoSrc}
                  alt="Athar Educational Platform"
                  className={`object-contain transition-all duration-300 filter drop-shadow-sm select-none ${
                    sidebarCollapsed ? "h-8 w-8 max-w-full" : "h-10 sm:h-11 w-auto max-w-[155px]"
                  }`}
                />
              </div>

              {/* Platform Slogan: smaller & fully visible with high contrast */}
              {!sidebarCollapsed && (
                <div className="text-[8.5px] xs:text-[9px] font-bold text-teal-300 dark:text-teal-200/95 tracking-tight mt-1.5 select-none leading-none whitespace-nowrap overflow-visible drop-shadow-sm">
                  {lang === "ar"
                    ? "• تعلّم • تطوّر • حقّق أهدافك"
                    : "• Learn • Develop • Achieve Your Goals"}
                </div>
              )}
            </div>

            {/* Navigation Links with fluid sliding tab indicator */}
            <nav ref={navRef} className="flex-1 ps-3 pe-0 py-2 space-y-1 overflow-y-auto relative [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {/* Fluid Liquid Sliding Indicator with Connected Fillet Bridge */}
              <div
                className="athar-sliding-indicator pointer-events-none"
                style={{
                  transform: `translateY(${indicatorStyle.top}px)`,
                  height: `${indicatorStyle.height}px`,
                  opacity: indicatorStyle.opacity,
                }}
              />

              {navItems.map((item) => {
                const Icon = item.icon;
                const isChat = item.to.endsWith("/chat") || item.isChat;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.end}
                    ref={(el) => {
                      if (el) itemRefs.current[item.to] = el;
                    }}
                    onClick={() => setSidebarOpen(false)}
                    title={sidebarCollapsed ? item.label : undefined}
                    className={({ isActive }) =>
                      `group relative flex items-center ${sidebarCollapsed ? "justify-center px-2 py-2" : "gap-3 ps-3.5 pe-4 py-2.5"} text-xs transition-all duration-200 z-30 ${
                        isActive
                          ? "rounded-s-2xl rounded-e-none text-white font-black"
                          : `rounded-xl ${sidebarCollapsed ? "mx-1" : "me-3"} text-slate-100 hover:text-white hover:bg-white/[0.12] font-extrabold`
                      }`
                    }
                  >
                    {({ isActive }) => (
                      <div className={`flex items-center ${sidebarCollapsed ? "justify-center" : "gap-2.5"} w-full`}>
                        <span
                          className={`h-7 w-7 rounded-lg flex items-center justify-center shrink-0 transition-all duration-300 transform ${
                            isActive
                              ? "bg-white/20 text-white border border-white/30 shadow-sm scale-105 dark:bg-teal-400/25 dark:text-teal-300 dark:border-teal-400/60 dark:shadow-[0_0_14px_rgba(45,212,191,0.5)]"
                              : "bg-white/[0.08] border border-white/15 text-slate-200 group-hover:bg-white/[0.18] group-hover:text-white group-hover:border-white/30 group-hover:scale-105"
                          }`}
                        >
                          <Icon className="h-4 w-4 shrink-0 stroke-[2.2]" />
                        </span>
                        {!sidebarCollapsed && <span className="truncate tracking-wide font-extrabold text-slate-100 group-hover:text-white drop-shadow-sm">{item.label}</span>}

                        {/* Direct Chat Live Unread Counter Badge */}
                        {isChat && unreadChatCount > 0 && !sidebarCollapsed && (
                          <span className="ms-auto flex items-center gap-1.5 shrink-0">
                            <span className="relative flex h-2 w-2">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500" />
                            </span>
                            <span
                              className={`min-w-[20px] h-5 px-1.5 rounded-full text-[10.5px] font-black flex items-center justify-center shadow-md transition-all ${
                                isActive
                                  ? "bg-white text-teal-700 shadow-white/30"
                                  : "bg-gradient-to-r from-rose-500 to-pink-500 text-white shadow-rose-500/30 animate-pulse"
                              }`}
                            >
                              {unreadChatCount > 99 ? "99+" : unreadChatCount}
                            </span>
                          </span>
                        )}
                      </div>
                    )}
                  </NavLink>
                );
              })}
            </nav>
          </div>

          {/* Bottom User Card with bold high-contrast styling */}
          <div className="p-3">
            <div className={`p-2.5 rounded-2xl bg-white/40 dark:bg-white/[0.06] backdrop-blur-xl border border-white/60 dark:border-white/[0.1] shadow-sm mb-2 transition-all duration-300 ${sidebarCollapsed ? "flex items-center justify-center p-2" : ""}`}>
              <div className="flex items-center justify-between gap-2 w-full">
                {!sidebarCollapsed && (
                  <div
                    onClick={() => setProfileModalOpen(true)}
                    className="min-w-0 cursor-pointer flex-1"
                    title={t("profile.editTooltip") || "Edit Profile & Password"}
                  >
                    <div className="text-sm font-black text-slate-950 dark:text-white truncate hover:text-teal-600 dark:hover:text-teal-400 transition-colors">
                      {displayName || "motaz"}
                    </div>
                    <div className="text-xs font-bold text-slate-800 dark:text-slate-300 capitalize truncate">
                      {t(`roles.${user?.role || "student"}`)}
                    </div>
                    <div className="mt-1 inline-block px-2 py-0.5 rounded-full bg-slate-900/10 dark:bg-white/10 border border-slate-900/20 dark:border-white/20 text-[9.5px] text-slate-900 dark:text-slate-100 font-black max-w-full truncate">
                      {equippedTag?.name?.[lang] || "Prompt Engineer"}
                    </div>
                  </div>
                )}
                <div
                  onClick={() => setProfileModalOpen(true)}
                  className={`h-10 w-10 rounded-xl bg-teal-500/20 dark:bg-teal-950/40 border border-teal-500/50 text-teal-700 dark:text-teal-300 font-black text-xs flex items-center justify-center shrink-0 cursor-pointer hover:scale-105 transition-transform ${sidebarCollapsed ? "mx-auto" : ""}`}
                >
                  {String(displayName || "MO").slice(0, 2).toUpperCase()}
                </div>
              </div>
            </div>

            <button
              onClick={handleLogout}
              title={t("app.logout")}
              className="w-full flex items-center justify-center gap-2 px-3 py-1.5 rounded-xl border border-slate-900/20 dark:border-white/15 bg-white/40 dark:bg-white/[0.06] hover:bg-white/70 dark:hover:bg-white/15 text-xs text-slate-950 dark:text-white font-bold transition-colors cursor-pointer"
            >
              <span className="text-sm font-black">→</span>
              {!sidebarCollapsed && <span className="font-bold">{t("app.logout")}</span>}
            </button>
          </div>
        </aside>

        {/* Main Workspace inside an inner card */}
        <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden rounded-[26px] bg-white/[0.06] dark:bg-white/[0.02] backdrop-blur-2xl border border-white/35 dark:border-white/[0.07] shadow-[inset_0_1px_1px_rgba(255,255,255,0.15),0_12px_40px_rgba(0,0,0,0.2)] my-2.5 me-2.5 relative z-10">
          {/* Top Header Bar */}
          <header className="px-6 py-3.5 flex items-center justify-between gap-4 border-b border-slate-200/80 dark:border-teal-500/10 shrink-0">
            <div className="flex items-center gap-2 min-w-0">
              <button
                onClick={() => setSidebarOpen(true)}
                aria-label="Open menu"
                className="lg:hidden relative h-8 w-8 rounded-full border border-slate-200/90 dark:border-white/15 bg-slate-50/90 dark:bg-white/5 flex items-center justify-center text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors shrink-0 cursor-pointer"
              >
                <Menu className="h-4 w-4" />
              </button>
              <div className="flex items-center gap-1.5 text-xs font-semibold">
                <span className="text-slate-300 dark:text-white/60">Student /</span>
                <span className="text-white dark:text-white/90 font-extrabold drop-shadow-sm">{currentBreadcrumb}</span>
              </div>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              {/* Student Store & Coins Pill */}
              {user?.role === "student" && (
                <NavLink
                  to="/student/store"
                  className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900/5 dark:bg-white/10 border border-slate-300/80 dark:border-white/15 text-slate-900 dark:text-white/90 text-xs font-bold shadow-sm hover:scale-105 transition-all cursor-pointer"
                  title={lang === "ar" ? "رصيد العملات — اضغط لفتح المتجر" : "Coins balance — Click to open Store"}
                >
                  <span className="text-amber-500 text-xs">🟡</span>
                  <span className="font-mono">
                    {(customization?.availableCoins || 702).toLocaleString()}
                  </span>
                  <span>Coins</span>
                </NavLink>
              )}

              {/* Notification Bell */}
              <div className="relative" ref={notifBoxRef}>
                <button
                  onClick={() => setNotifOpen((o) => !o)}
                  aria-label="Notifications"
                  className="h-8 w-8 rounded-xl border border-white/25 dark:border-white/15 bg-white/10 dark:bg-white/5 hover:bg-white/20 dark:hover:bg-white/10 text-slate-200 hover:text-white transition-all relative flex items-center justify-center cursor-pointer shadow-xs active:scale-95"
                >
                  <Bell className="h-4 w-4" />
                  {unreadCount > 0 && (
                    <span className="absolute top-1 end-1 h-2 w-2 rounded-full bg-rose-500 ring-2 ring-black" />
                  )}
                </button>

                {notifOpen && (
                  <div className="fixed sm:absolute inset-x-2.5 sm:inset-x-auto sm:end-0 top-[56px] sm:top-auto sm:mt-2 sm:w-96 max-h-[80vh] bg-white/55 dark:bg-[#07131e]/60 backdrop-blur-2xl backdrop-saturate-150 rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.18)] dark:shadow-[0_25px_70px_rgba(0,0,0,0.7)] border border-white/60 dark:border-white/15 overflow-hidden z-50">
                    <div className="px-4 py-3 border-b border-slate-900/10 dark:border-white/10 bg-white/25 dark:bg-white/[0.03] backdrop-blur-md flex items-center justify-between">
                      <span className="font-extrabold text-xs flex items-center gap-1.5 text-slate-950 dark:text-white">
                        <Bell className="h-3.5 w-3.5 text-teal-600 dark:text-teal-400" />
                        {lang === "ar" ? "الإشعارات" : "Notifications"} ({unreadCount})
                      </span>
                      <div className="flex items-center gap-2 text-[11px]">
                        {unreadCount > 0 && (
                          <button
                            onClick={handleMarkAllRead}
                            className="text-teal-700 dark:text-teal-300 font-bold hover:underline flex items-center gap-1 cursor-pointer"
                          >
                            <CheckCheck className="h-3 w-3" />
                            {lang === "ar" ? "تحديد كمقروء" : "Mark all read"}
                          </button>
                        )}
                        <button
                          onClick={handleClearAll}
                          className="text-slate-600 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 font-semibold flex items-center gap-1 cursor-pointer"
                        >
                          <Trash2 className="h-3 w-3" />
                          {lang === "ar" ? "مسح الكل" : "Clear"}
                        </button>
                      </div>
                    </div>
                    <div className="max-h-72 overflow-y-auto divide-y divide-slate-900/10 dark:divide-white/10 [scrollbar-width:thin]">
                      {notifications.length === 0 ? (
                        <div className="p-6 text-center text-xs text-slate-600 dark:text-slate-400 font-medium">
                          {lang === "ar" ? "لا توجد إشعارات حالياً" : "No notifications yet."}
                        </div>
                      ) : (
                        notifications.map((n) => {
                          const title =
                            lang === "ar"
                              ? n.titleAr || n.titleEn || n.title || "إشعار جديد"
                              : n.titleEn || n.titleAr || n.title || "New Notification";
                          const body =
                            lang === "ar"
                              ? n.bodyAr || n.bodyEn || n.message || n.body || ""
                              : n.bodyEn || n.bodyAr || n.message || n.body || "";

                          return (
                            <div
                              key={n.id}
                              onClick={() => handleNotificationClick(n)}
                              className={`p-3 text-xs cursor-pointer transition-colors flex items-start gap-2.5 ${
                                n.read
                                  ? "bg-transparent text-slate-700 dark:text-slate-400 hover:bg-white/30 dark:hover:bg-white/5"
                                  : "bg-teal-500/10 dark:bg-teal-400/10 text-slate-950 dark:text-slate-100 font-medium hover:bg-teal-500/15 dark:hover:bg-teal-400/15"
                              }`}
                            >
                              <div
                                className={`h-2 w-2 rounded-full mt-1.5 shrink-0 ${
                                  n.read
                                    ? "bg-slate-400 dark:bg-slate-600"
                                    : "bg-teal-500 dark:bg-teal-400 shadow-[0_0_8px_rgba(45,212,191,0.6)]"
                                }`}
                              />
                              <div className="flex-1 min-w-0">
                                <div className="font-extrabold text-xs text-slate-950 dark:text-white leading-snug">
                                  {title}
                                </div>
                                {body && (
                                  <div className="text-[11px] text-slate-700 dark:text-slate-300 font-medium mt-0.5 leading-relaxed break-words">
                                    {body}
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Sound Toggle */}
              <button
                onClick={toggleSound}
                aria-label="Toggle sound"
                className="h-8 w-8 rounded-xl border border-white/25 dark:border-white/15 bg-white/10 dark:bg-white/5 hover:bg-white/20 dark:hover:bg-white/10 text-slate-200 hover:text-white transition-all flex items-center justify-center cursor-pointer shadow-xs active:scale-95"
              >
                {soundOn ? <Volume2 className="h-4 w-4 text-teal-300" /> : <VolumeX className="h-4 w-4 text-slate-400" />}
              </button>

              {/* Language Switcher */}
              <LanguageDropdown />

              {/* Theme Toggle Icon with high-contrast glowing Moon & Sun */}
              <button
                type="button"
                onClick={toggleTheme}
                aria-label="Toggle theme"
                title={theme === "dark" ? t("app.light") : t("app.dark")}
                className="h-8 w-8 rounded-xl border border-white/35 dark:border-white/15 bg-white/15 dark:bg-white/10 hover:bg-white/25 dark:hover:bg-white/20 text-slate-100 hover:text-white backdrop-blur-xl flex items-center justify-center transition-all cursor-pointer shadow-xs hover:scale-105 active:scale-95"
              >
                {theme === "dark" ? (
                  <Sun className="h-4 w-4 text-amber-400 hover:text-amber-300 transition-transform hover:rotate-45 drop-shadow-[0_0_8px_rgba(251,191,36,0.6)]" />
                ) : (
                  <Moon className="h-4 w-4 text-teal-300 hover:text-teal-200 transition-transform hover:-rotate-12 drop-shadow-[0_0_8px_rgba(45,212,191,0.7)]" />
                )}
              </button>

              {/* Header User Avatar Circle */}
              <button
                type="button"
                onClick={() => setProfileModalOpen(true)}
                title={t("profile.editTooltip") || "Profile & Settings"}
                className="h-7 w-7 rounded-full bg-slate-900 text-white dark:bg-white/15 dark:text-white/90 border border-slate-700 dark:border-white/20 font-bold text-[10px] flex items-center justify-center shrink-0 hover:scale-105 transition-transform cursor-pointer"
              >
                {String(displayName || "MO").slice(0, 2).toUpperCase()}
              </button>
            </div>
          </header>

          {/* Main Content Body */}
          <div className="flex-1 flex flex-col px-6 py-4 overflow-y-auto">
            {/* Welcome Hero Banner (Hidden on Choose Instructor screen & Chat) */}
            {location.pathname !== "/student" && !location.pathname.endsWith("/chat") && (
              <div
                className={`mb-4 rounded-2xl sm:rounded-[22px] bg-white/[0.12] dark:bg-white/[0.03] backdrop-blur-2xl border border-white/40 dark:border-white/[0.08] shadow-[inset_0_1px_1px_rgba(255,255,255,0.2),0_8px_24px_rgba(0,0,0,0.06)] dark:shadow-[inset_0_1px_1px_rgba(255,255,255,0.08),0_8px_24px_rgba(0,0,0,0.3)] ${
                  user?.role === "instructor"
                    ? "py-4 sm:py-5 px-5 sm:px-7 min-h-[76px] sm:min-h-[100px]"
                    : "px-5 sm:px-6 py-4 sm:py-5 min-h-[76px] sm:min-h-[100px]"
                } shadow-sm dark:shadow-lg relative overflow-hidden flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4`}
              >
                <div className="pointer-events-none absolute -top-12 -end-10 h-36 w-36 rounded-full bg-teal-400/15 blur-2xl" />
                <div className="relative z-10 flex-1">
                  <h2 className="text-lg sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight leading-snug">
                    {lang === "ar"
                      ? `مرحباً بعودتك، ${displayName || t(`roles.${user?.role || "student"}`)}!`
                      : `Welcome Back, ${displayName || t(`roles.${user?.role || "student"}`)}!`}
                  </h2>
                  {user?.role === "student" && (
                    <p className="text-xs sm:text-sm text-slate-800 dark:text-slate-200 mt-1 font-bold leading-relaxed">
                      {lang === "ar"
                        ? "تابع رحلتك التعليمية وحقق أهدافك الدراسية 🚀"
                        : "Continue your learning journey and achieve your goals 🚀"}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Dynamic Main Workspace Content with smooth fluid page transition */}
            <main className="flex-1 flex flex-col">
              <div key={location.pathname} className="athar-page-transition flex-1 flex flex-col">
                {children}
              </div>
            </main>
          </div>
        </div>
      </div>

      {/* Walking Robot AI Chatbot */}
      <PlatformChatbotWidget />

      {/* Profile & Credentials Settings Modal (Accessible by all roles) */}
      <ProfileSettingsModal
        isOpen={profileModalOpen}
        onClose={() => setProfileModalOpen(false)}
      />
    </div>
  );
}
