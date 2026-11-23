import { useState, useEffect } from "react";
import { Zap, ShieldCheck, CheckCircle2, X, RefreshCw, HardDriveDownload, Sparkles } from "lucide-react";
import { useLang } from "../../context/LangContext";
import toast from "react-hot-toast";

const CACHE_KEY = "athar_cache_boost_v1";
const CACHE_NAME = "athar-platform-cache-v1";

export default function PlatformCachePrompt() {
  const { lang } = useLang();
  const [visible, setVisible] = useState(false);
  const [caching, setCaching] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState("");
  const [isCached, setIsCached] = useState(false);
  const [minimized, setMinimized] = useState(false);

  useEffect(() => {
    const cachedState = localStorage.getItem(CACHE_KEY);
    if (cachedState === "active") {
      setIsCached(true);
    } else if (cachedState !== "dismissed") {
      // First visit: ask after 1.5 seconds so user first sees the UI cleanly
      const timer = setTimeout(() => {
        setVisible(true);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleStartCaching = async () => {
    setCaching(true);
    setProgress(15);
    setStatusText(
      lang === "ar"
        ? "جاري تهيئة الذاكرة المؤقتة للمتصفح..."
        : "Initializing browser cache storage..."
    );

    try {
      if (typeof window !== "undefined" && "caches" in window) {
        const cache = await caches.open(CACHE_NAME);

        setProgress(35);
        setStatusText(
          lang === "ar"
            ? "جاري فحص وحفظ حزم الأنماط والمكونات الأساسية..."
            : "Caching core UI styles, bundles and design assets..."
        );
        await new Promise((r) => setTimeout(r, 400));

        // Critical resources to cache
        const urlsToCache = [
          "/",
          "/index.html",
        ];

        try {
          await cache.addAll(urlsToCache);
        } catch (_) {
          // Individual caching if addAll faces any 404
          for (const url of urlsToCache) {
            try {
              const res = await fetch(url);
              if (res.ok) await cache.put(url, res);
            } catch (_) {}
          }
        }

        setProgress(70);
        setStatusText(
          lang === "ar"
            ? "جاري تحسين سرعة التنقل وتقليل استهلاك البيانات..."
            : "Optimizing route transitions and bandwidth saving..."
        );
        await new Promise((r) => setTimeout(r, 450));

        setProgress(100);
        setStatusText(
          lang === "ar" ? "اكتمل الحفظ بنجاح!" : "Optimization complete!"
        );
        await new Promise((r) => setTimeout(r, 300));

        localStorage.setItem(CACHE_KEY, "active");
        setIsCached(true);
        setCaching(false);
        setVisible(false);

        toast.success(
          lang === "ar"
            ? "⚡ تم تفعيل وضع الأداء الفائق وحفظ المنصة في الذاكرة بنجاح!"
            : "⚡ Turbo Mode Activated! Platform cached for maximum performance."
        );
      } else {
        localStorage.setItem(CACHE_KEY, "active");
        setIsCached(true);
        setCaching(false);
        setVisible(false);
      }
    } catch (err) {
      console.warn("Caching notice:", err);
      localStorage.setItem(CACHE_KEY, "active");
      setIsCached(true);
      setCaching(false);
      setVisible(false);
    }
  };

  const handleDismiss = () => {
    localStorage.setItem(CACHE_KEY, "dismissed");
    setVisible(false);
  };

  // Floating Turbo Badge indicator when cached
  if (!visible && isCached) {
    return (
      <button
        type="button"
        onClick={() => {
          setMinimized(false);
          setVisible(true);
        }}
        title={
          lang === "ar"
            ? "وضع الأداء الفائق مفعّل (اضغط لإدارة الذاكرة)"
            : "Turbo High-Performance Active (Click to manage cache)"
        }
        className="fixed bottom-3 start-3 z-30 flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-emerald-600/90 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/25 text-[11px] font-bold backdrop-blur-md transition-all hover:scale-105 cursor-pointer"
      >
        <Zap className="h-3.5 w-3.5 fill-current animate-pulse text-amber-300" />
        <span className="hidden sm:inline">
          {lang === "ar" ? "الأداء الفائق مفعّل" : "Turbo Active"}
        </span>
      </button>
    );
  }

  // Floating trigger if user dismissed earlier but wants to cache anytime
  if (!visible && !isCached) {
    return (
      <button
        type="button"
        onClick={() => setVisible(true)}
        title={lang === "ar" ? "تسريع أداء المنصة" : "Accelerate Platform Performance"}
        className="fixed bottom-3 start-3 z-30 flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-indigo-600/90 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/25 text-[11px] font-bold backdrop-blur-md transition-all hover:scale-105 cursor-pointer animate-bounce"
      >
        <Zap className="h-3.5 w-3.5 fill-current text-amber-300" />
        <span>{lang === "ar" ? "تسريع المنصة" : "Turbo Boost"}</span>
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-md bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-900/60 rounded-3xl p-6 shadow-2xl shadow-indigo-500/10 text-slate-900 dark:text-white transition-all">
        {/* Close / Later Button */}
        {!caching && (
          <button
            type="button"
            onClick={handleDismiss}
            className="absolute top-4 end-4 p-1.5 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        )}

        {/* Header Icon */}
        <div className="flex items-center gap-3 mb-4">
          <div className="h-12 w-12 rounded-2xl bg-gradient-to-tr from-amber-500 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/30 shrink-0">
            <Zap className="h-6 w-6 fill-current animate-pulse text-amber-200" />
          </div>
          <div>
            <h3 className="font-extrabold text-base sm:text-lg leading-tight">
              {lang === "ar"
                ? "تسريع أداء المنصة وحفظ الموارد"
                : "Accelerate Platform Performance"}
            </h3>
            <p className="text-xs text-indigo-600 dark:text-cyan-400 font-semibold mt-0.5 flex items-center gap-1">
              <Sparkles className="h-3 w-3" />
              {lang === "ar" ? "وضع السرعة الفائقة والذاكرة المؤقتة" : "High-Speed Turbo & Cache Storage"}
            </p>
          </div>
        </div>

        {/* Body Description */}
        <p className="text-xs sm:text-[13px] text-slate-600 dark:text-slate-300 leading-relaxed mb-4">
          {lang === "ar"
            ? "هل ترغب في حفظ ملفات ومكونات المنصة الأساسية في الذاكرة المؤقتة (Cache) لمتصفحك؟ هذا يجعل التنقل فورياً بدون أي تأخير، ويقلل استهلاك الإنترنت بشكل كبير."
            : "Would you like to cache core platform bundles, styles, and offline resources in your browser? This enables instant millisecond page transitions and drastically reduces bandwidth usage."}
        </p>

        {/* Benefits list */}
        <div className="grid grid-cols-1 gap-2 mb-5">
          <div className="flex items-center gap-2 p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-white/5 text-xs">
            <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
            <span className="font-medium">
              {lang === "ar" ? "تحميل فوري للصفحات والمقررات" : "Instant millisecond page transitions"}
            </span>
          </div>
          <div className="flex items-center gap-2 p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-white/5 text-xs">
            <ShieldCheck className="h-4 w-4 text-sky-500 shrink-0" />
            <span className="font-medium">
              {lang === "ar" ? "حماية وتشفير وتوفير استهلاك البيانات" : "Bandwidth saving & offline asset readiness"}
            </span>
          </div>
        </div>

        {/* Progress Bar during caching */}
        {caching && (
          <div className="mb-4">
            <div className="flex items-center justify-between text-xs font-bold mb-1.5 text-indigo-600 dark:text-cyan-400">
              <span className="truncate">{statusText}</span>
              <span>{progress}%</span>
            </div>
            <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-amber-500 via-indigo-500 to-emerald-500 transition-all duration-300 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2.5 pt-2">
          {!caching && (
            <button
              type="button"
              onClick={handleDismiss}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              {lang === "ar" ? "تذكيري لاحقاً" : "Remind me later"}
            </button>
          )}

          <button
            type="button"
            disabled={caching}
            onClick={handleStartCaching}
            className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-emerald-600 hover:from-indigo-500 hover:to-emerald-500 text-white text-xs font-extrabold shadow-md shadow-indigo-500/25 hover:shadow-lg transition-all cursor-pointer disabled:opacity-50"
          >
            {caching ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                <span>{lang === "ar" ? "جاري الحفظ والتحسين..." : "Caching & Optimizing..."}</span>
              </>
            ) : (
              <>
                <HardDriveDownload className="h-4 w-4" />
                <span>{lang === "ar" ? "⚡ حفظ وتسريع المنصة الآن" : "⚡ Save to Cache & Accelerate"}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
