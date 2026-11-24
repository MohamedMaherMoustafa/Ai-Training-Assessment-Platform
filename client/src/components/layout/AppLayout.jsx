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
  Globe,
  ChevronDown,
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

      {/* Light Glassy Sidebar */}
      <aside
        className={`fixed lg:static inset-y-0 start-0 z-40 h-screen lg:h-full shrink-0 w-[86vw] max-w-[310px] lg:w-[280px] xl:w-[290px] bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl text-slate-800 dark:text-white lg:rounded-[28px] border border-slate-200/90 dark:border-white/10 flex flex-col justify-between overflow-hidden shadow-[0_12px_36px_rgba(30,41,59,0.08)] dark:shadow-[0_16px_40px_rgba(0,0,0,0.6)] transition-transform duration-300 ${
          sidebarOpen
            ? "translate-x-0"
            : "-translate-x-full rtl:translate-x-full lg:translate-x-0 lg:rtl:translate-x-0"
        }`}
      >
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Top Brand Section */}
          <div className="pt-6 pb-4 px-4 text-center border-b border-slate-200/90 dark:border-white/10 relative bg-gradient-to-b from-indigo-50/40 via-white to-transparent dark:from-indigo-950/20 dark:via-slate-900/40 dark:to-transparent">
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden absolute top-4 end-4 p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/20 text-slate-700 dark:text-white transition-colors cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>

            {/* Glowing Brand Logo Container */}
            <div className="relative mx-auto mb-2.5 h-20 w-20 sm:h-22 sm:w-22 rounded-2xl bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-indigo-950/50 dark:via-slate-800/80 dark:to-purple-950/40 p-2 border border-indigo-150/80 dark:border-white/10 shadow-[0_4px_16px_rgba(79,70,229,0.12)] flex items-center justify-center transition-transform hover:scale-105 group">
              <img
                src={logoSrc}
                alt="Athar Educational Platform"
                className="w-full h-full object-contain filter drop-shadow-md group-hover:brightness-105 transition-all scale-105"
              />
            </div>

            {/* Platform Title */}
            <div className="font-black text-sm sm:text-[15px] leading-snug tracking-tight text-slate-900 dark:text-white">
              {lang === "ar" ? "منصة أثر التعليمية" : "Athar Educational"}
            </div>
            <div className="text-[11px] font-extrabold text-indigo-600 dark:text-indigo-400 tracking-wider uppercase mt-0.5">
              {lang === "ar" ? "Athar Educational Platform" : "Platform"}
            </div>

            {/* Platform Slogan Badge */}
            <div className="mt-2.5 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-indigo-50/95 to-purple-50/95 dark:from-indigo-950/60 dark:to-purple-950/60 border border-indigo-200/80 dark:border-indigo-800/60 shadow-xs max-w-full">
              <span className="h-1.5 w-1.5 rounded-full bg-indigo-600 dark:bg-cyan-400 animate-pulse shrink-0" />
              <span className="text-[10px] font-bold text-indigo-700 dark:text-indigo-300 truncate">
                {t("auth.learnTagline")}
              </span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="flex-1 px-3 py-3.5 space-y-1 overflow-y-auto">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isChat = item.to.endsWith("/chat") || item.isChat;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  onClick={() => setSidebarOpen(false)}
                  className={({ isActive }) =>
                    `group relative flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-[12.5px] transition-all duration-200 ${
                      isActive
                        ? "bg-gradient-to-r from-[#4f3df7] to-[#703bf7] text-white font-extrabold shadow-md shadow-indigo-600/30"
                        : "text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-white hover:bg-indigo-50/70 dark:hover:bg-white/5 font-bold"
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      {isActive && (
                        <span className="absolute -start-2 top-1/2 -translate-y-1/2 w-1 h-6 rounded-full bg-indigo-500" />
                      )}
                      <Icon
                        className={`h-4 w-4 shrink-0 transition-colors ${
                          isActive
                            ? "text-white"
                            : "text-slate-500 group-hover:text-indigo-600 dark:group-hover:text-white"
                        }`}
                      />
                      <span className="truncate">{item.label}</span>

                      {/* Direct Chat Live Unread Counter Badge */}
                      {isChat && unreadChatCount > 0 && (
                        <span className="ms-auto flex items-center gap-1.5 shrink-0">
                          <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500" />
                          </span>
                          <span
                            className={`min-w-[20px] h-5 px-1.5 rounded-full text-[10.5px] font-black flex items-center justify-center shadow-md transition-all ${
                              isActive
                                ? "bg-white text-indigo-700 shadow-white/30"
                                : "bg-gradient-to-r from-rose-500 to-pink-500 text-white shadow-rose-500/30 animate-pulse"
                            }`}
                            title={
                              lang === "ar"
                                ? `${unreadChatCount} رسائل جديدة غير مقروءة`
                                : `${unreadChatCount} unread direct messages`
                            }
                          >
                            {unreadChatCount > 99 ? "99+" : unreadChatCount}
                          </span>
                        </span>
                      )}
                    </>
                  )}
                </NavLink>
              );
            })}
          </nav>
        </div>

        {/* Bottom User Card */}
        <div className="p-3 border-t border-slate-200/80 dark:border-white/10 bg-slate-50/80 dark:bg-slate-950/50 backdrop-blur-md">
          <div className="bg-white dark:bg-slate-800/90 rounded-2xl p-2.5 flex items-center justify-between border border-slate-200/90 dark:border-white/10 shadow-xs mb-2 group hover:border-indigo-300 dark:hover:border-indigo-700 transition-colors">
            <div
              onClick={() => setProfileModalOpen(true)}
              className="flex items-center gap-2.5 min-w-0 cursor-pointer flex-1"
              title={t("profile.editTooltip") || "Edit Profile & Password"}
            >
              <div
                className={`h-9 w-9 rounded-xl bg-gradient-to-tr from-teal-500 to-emerald-500 text-white font-black text-xs flex items-center justify-center shrink-0 shadow-sm group-hover:scale-105 transition-all ${
                  equippedFrame?.frameClass || ""
                }`}
              >
                {String(displayName || "U").slice(0, 2).toUpperCase()}
              </div>
              <div className="min-w-0">
                <div className="text-xs font-black text-slate-900 dark:text-white truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                  {displayName}
                </div>
                <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 capitalize truncate">
                  {t(`roles.${user?.role || "student"}`)}
                </div>
                {equippedTag && (
                  <div
                    className={`inline-flex items-center gap-1 px-1.5 py-0.2 rounded-full text-[9px] font-black border mt-1 max-w-full truncate shadow-xs ${equippedTag.badgeClass}`}
                  >
                    <span>{equippedTag.icon}</span>
                    <span className="truncate">{equippedTag.name[lang]}</span>
                  </div>
                )}
              </div>
            </div>
            <button
              type="button"
              onClick={() => setProfileModalOpen(true)}
              title={t("profile.editTooltip") || "Edit Profile & Password"}
              aria-label="Edit Profile"
              className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700/60 transition-colors text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 cursor-pointer shrink-0"
            >
              <Settings className="h-4 w-4" />
            </button>
          </div>

          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold text-rose-600 dark:text-rose-400 bg-rose-50/90 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-950/60 border border-rose-200/80 dark:border-rose-900/40 transition-all cursor-pointer shadow-xs active:scale-[0.99]"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span>{t("app.logout")}</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-screen lg:h-full overflow-y-auto px-2 sm:px-4 lg:px-1">
        {/* Top Header Bar */}
        <header className="min-h-[48px] sm:min-h-[52px] shrink-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl rounded-2xl sm:rounded-full mt-1.5 sm:mt-2 lg:mt-0 px-2.5 sm:px-5 py-1.5 flex items-center justify-between gap-1.5 sm:gap-2 shadow-[0_4px_20px_rgba(30,41,59,0.06)] dark:shadow-xl border border-slate-200/90 dark:border-white/10 sticky top-1 sm:top-2 lg:top-0 z-20">
          <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
            <button
              onClick={() => setSidebarOpen(true)}
              aria-label="Open menu"
              className="lg:hidden relative h-8 w-8 sm:h-9 sm:w-9 rounded-full border border-slate-200/90 dark:border-slate-700 bg-slate-50/90 dark:bg-slate-800 flex items-center justify-center text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors shrink-0 cursor-pointer shadow-xs"
            >
              <Menu className="h-4 w-4 sm:h-5 sm:w-5" />
              {unreadChatCount > 0 && (
                <span className="absolute -top-1 -end-1 flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500 ring-2 ring-white dark:ring-slate-900" />
                </span>
              )}
            </button>
            <div className="rounded-full border border-slate-200/90 dark:border-slate-700 bg-slate-50/90 dark:bg-slate-800 px-2 sm:px-3 py-1 flex items-center gap-2 text-xs font-black text-slate-900 dark:text-slate-100 shadow-xs shrink-0 max-w-[150px] sm:max-w-none">
              <img src={logoSrc} alt="Athar Educational Platform" className="h-7 w-7 sm:h-8 sm:w-8 object-contain shrink-0 drop-shadow-sm filter hover:scale-105 transition-transform" />
              <span className="truncate">{t(`roles.${user?.role || "student"}`)}</span>
            </div>
            {/* Breadcrumb for tablet & desktop */}
            <span className="hidden md:inline-block text-slate-300 dark:text-slate-700 font-bold">/</span>
            <span className="hidden md:inline-block text-xs font-bold text-slate-500 dark:text-slate-400 truncate max-w-[180px]">
              {currentBreadcrumb}
            </span>
          </div>

          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            {/* Student Store & Coins Pill */}
            {user?.role === "student" && (
              <NavLink
                to="/student/store"
                className="h-8 sm:h-9 px-2.5 sm:px-3 rounded-full border border-amber-300 dark:border-amber-500/40 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/40 dark:to-orange-950/40 text-amber-700 dark:text-amber-300 flex items-center gap-1.5 text-xs font-black shadow-xs hover:scale-105 transition-all cursor-pointer shrink-0"
                title={lang === "ar" ? "رصيد العملات — اضغط لفتح المتجر" : "Coins balance — Click to open Store"}
              >
                <span>🪙</span>
                <span className="font-mono text-[12px]">
                  {(customization?.availableCoins || 0).toLocaleString()}
                </span>
                <span className="hidden md:inline text-[10px] text-amber-600/80 dark:text-amber-400/80">
                  {lang === "ar" ? "عملة" : "Coins"}
                </span>
              </NavLink>
            )}

            {/* Notification Bell */}
            <div className="relative" ref={notifBoxRef}>
              <button
                onClick={() => setNotifOpen((o) => !o)}
                aria-label="Notifications"
                className="h-8 w-8 sm:h-9 sm:w-9 rounded-full border border-slate-200/90 dark:border-slate-700 bg-slate-50/90 dark:bg-slate-800 flex items-center justify-center text-slate-700 dark:text-slate-200 shadow-xs hover:bg-indigo-50/70 dark:hover:bg-slate-700 hover:border-indigo-300 transition-all relative cursor-pointer"
              >
                <Bell className="h-4 w-4" />
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -end-0.5 min-w-[16px] h-4 px-1 rounded-full bg-rose-500 text-white text-[9px] font-black flex items-center justify-center ring-2 ring-white dark:ring-slate-900 shadow">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
              </button>

              {notifOpen && (
                <div className="fixed sm:absolute inset-x-2.5 sm:inset-x-auto sm:end-0 top-[56px] sm:top-auto sm:mt-2 sm:w-96 max-h-[80vh] bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-white/15 overflow-hidden z-50">
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
                                ? "bg-transparent text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                                : "bg-indigo-50/60 dark:bg-indigo-950/30 text-slate-800 dark:text-slate-100 font-medium hover:bg-indigo-50 dark:hover:bg-indigo-950/50"
                            }`}
                          >
                            <div
                              className={`h-2 w-2 rounded-full mt-1.5 shrink-0 ${
                                n.read ? "bg-slate-300 dark:bg-slate-700" : "bg-indigo-600 dark:bg-cyan-400"
                              }`}
                            />
                            <div className="flex-1 min-w-0">
                              <div className="font-bold text-xs text-slate-900 dark:text-white leading-snug">
                                {title}
                              </div>
                              {body && (
                                <div className="text-[11px] text-slate-600 dark:text-slate-300 mt-0.5 leading-relaxed break-words">
                                  {body}
                                </div>
                              )}
                              {n.createdAt && (
                                <div className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">
                                  {new Date(n.createdAt).toLocaleTimeString([], {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}
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
              className="h-8 w-8 sm:h-9 sm:w-9 rounded-full border border-slate-200/90 dark:border-slate-700 bg-slate-50/90 dark:bg-slate-800 flex items-center justify-center text-slate-700 dark:text-slate-200 shadow-xs hover:bg-indigo-50/70 dark:hover:bg-slate-700 hover:border-indigo-300 transition-all cursor-pointer"
            >
              {soundOn ? <Volume2 className="h-4 w-4 text-emerald-500" /> : <VolumeX className="h-4 w-4 text-slate-400" />}
            </button>

            {/* Language Switcher */}
            <LanguageDropdown />

            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              aria-label="Toggle theme"
              className="h-8 w-8 sm:h-9 sm:w-auto sm:px-3.5 py-1.5 rounded-full border border-slate-200/90 dark:border-slate-700 bg-slate-50/90 dark:bg-slate-800 flex items-center justify-center gap-1.5 text-xs font-black text-slate-800 dark:text-slate-200 shadow-xs hover:bg-indigo-50/70 dark:hover:bg-slate-700 hover:border-indigo-300 transition-all cursor-pointer shrink-0"
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

        {/* Welcome Hero Banner with 3D Books Artwork */}
        <div
          className={`my-2 sm:my-3 rounded-2xl sm:rounded-[26px] bg-gradient-to-r from-[#edf0fe] via-[#f2f4fe] to-[#e4e9fd] dark:from-slate-900 dark:via-indigo-950/30 dark:to-slate-900 border border-slate-200/80 dark:border-white/10 ${
            user?.role === "instructor"
              ? "py-4 sm:py-6 px-4 sm:px-8 min-h-[76px] sm:min-h-[108px]"
              : "p-4 sm:p-6 min-h-[76px] sm:min-h-[108px]"
          } shadow-sm relative overflow-hidden flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4`}
        >
          <div className="relative z-10 flex-1">
            <h2 className="text-lg sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight leading-snug">
              {lang === "ar"
                ? `مرحباً بعودتك، ${displayName || t(`roles.${user?.role || "student"}`)}!`
                : `Welcome Back, ${displayName || t(`roles.${user?.role || "student"}`)}!`}
            </h2>
            {user?.role === "student" && (
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 mt-1 sm:mt-1.5 font-medium leading-relaxed">
                {lang === "ar"
                  ? "تابع رحلتك التعليمية وحقق أهدافك الدراسية 🚀"
                  : "Continue your learning journey and achieve your goals 🚀"}
              </p>
            )}
          </div>
          {/* 3D Illustration of Graduation Cap & Books */}
          <div className="hidden sm:flex shrink-0 items-center justify-end">
            <svg viewBox="15 22 150 90" className="w-28 sm:w-32 h-auto drop-shadow-md select-none pointer-events-none" fill="none">
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

        {/* Dynamic Main Workspace Content */}
        <main className="flex-1 pb-16">{children}</main>
      </div>

      {/* Walking Robot AI Chatbot (Retained Exactly as Requested) */}
      <PlatformChatbotWidget />

      {/* Profile & Credentials Settings Modal (Accessible by all roles) */}
      <ProfileSettingsModal
        isOpen={profileModalOpen}
        onClose={() => setProfileModalOpen(false)}
      />
    </div>
  );
}
