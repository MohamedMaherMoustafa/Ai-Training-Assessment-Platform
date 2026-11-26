import { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import {
  Sparkles,
  Tag,
  Crown,
  Palette,
  Award,
  Glasses,
  ShoppingBag,
  Coins,
  ShieldCheck,
  CheckCircle2,
  Brain,
  RotateCcw,
  Zap,
  Info,
  Layers,
  ArrowRight,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useLang } from "../../context/LangContext";
import {
  STORE_CATEGORIES,
  ALL_STORE_ITEMS,
  NAME_TAGS,
  AVATAR_FRAMES,
  CHATBOT_SKINS,
  CHATBOT_HATS,
  CHATBOT_GLASSES,
  CHATBOT_SHOES,
  getStoreItemById,
  getDefaultCustomization,
} from "./storeData";
import {
  getStudentCustomizationAndCoins,
  buyStoreItem,
  equipStoreItem,
  unequipStoreItem,
} from "../../services/platformService";
import RobotMascotSvg from "../../components/common/RobotMascotSvg";

export default function StudentStoreModule() {
  const { user } = useAuth();
  const { lang } = useLang();

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({
    totalAcademicPoints: 0,
    totalEarnedCoins: 0,
    availableCoins: 0,
    spentCoins: 0,
    inventory: ["skin_classic_blue", "hat_none", "glasses_none", "shoes_none"],
    equipped: getDefaultCustomization(),
  });

  const [activeCategory, setActiveCategory] = useState("all");
  const [previewCustomization, setPreviewCustomization] = useState(getDefaultCustomization());
  const [actionLoadingId, setActionLoadingId] = useState(null);

  // Load coins and customization data
  const loadData = async () => {
    if (!user?.uid) return;
    try {
      setLoading(true);
      const res = await getStudentCustomizationAndCoins(user.uid);
      setData(res);
      setPreviewCustomization(res.equipped);
    } catch (err) {
      console.error("Failed to load student store data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    // Listen for customization updates dispatched elsewhere
    const handleCustomizationUpdate = (e) => {
      if (e.detail?.equipped) {
        setData((prev) => ({
          ...prev,
          equipped: e.detail.equipped,
          availableCoins:
            e.detail.availableCoins !== undefined
              ? e.detail.availableCoins
              : prev.availableCoins,
        }));
        setPreviewCustomization(e.detail.equipped);
      }
    };

    window.addEventListener("athar_customization_updated", handleCustomizationUpdate);
    return () => {
      window.removeEventListener("athar_customization_updated", handleCustomizationUpdate);
    };
  }, [user?.uid]);

  // Filter items according to active category
  const filteredItems = useMemo(() => {
    if (activeCategory === "all") return ALL_STORE_ITEMS;
    return ALL_STORE_ITEMS.filter((item) => item.category === activeCategory);
  }, [activeCategory]);

  // Handle purchasing an item
  const handleBuy = async (item) => {
    if (!user?.uid) return;
    if (data.availableCoins < item.price) {
      toast.error(
        lang === "ar"
          ? "رصيدك من العملات غير كافٍ لشراء هذا العنصر!"
          : "Insufficient coins to purchase this item!"
      );
      return;
    }

    try {
      setActionLoadingId(item.id);
      const res = await buyStoreItem(user.uid, item);
      setData((prev) => ({
        ...prev,
        availableCoins: res.availableCoins,
        spentCoins: prev.spentCoins + item.price,
        inventory: res.inventory,
        equipped: res.equipped,
      }));
      setPreviewCustomization(res.equipped);
      toast.success(
        lang === "ar"
          ? `🎉 مبروك! قمت بشراء وتفعيل "${item.name.ar}" بنجاح!`
          : `🎉 Congrats! You bought and equipped "${item.name.en}"!`
      );
    } catch (err) {
      toast.error(err.message || "Purchase failed");
    } finally {
      setActionLoadingId(null);
    }
  };

  // Handle equipping an owned item
  const handleEquip = async (item) => {
    if (!user?.uid) return;
    try {
      setActionLoadingId(item.id);
      const res = await equipStoreItem(user.uid, item.type, item.id);
      setData((prev) => ({
        ...prev,
        equipped: res.equipped,
      }));
      setPreviewCustomization(res.equipped);
      toast.success(
        lang === "ar"
          ? `تم تجهيز "${item.name.ar}" بنجاح!`
          : `Equipped "${item.name.en}" successfully!`
      );
    } catch (err) {
      toast.error(err.message || "Equip failed");
    } finally {
      setActionLoadingId(null);
    }
  };

  // Handle unequipping an item
  const handleUnequip = async (item) => {
    if (!user?.uid) return;
    try {
      setActionLoadingId(item.id);
      const res = await unequipStoreItem(user.uid, item.type);
      setData((prev) => ({
        ...prev,
        equipped: res.equipped,
      }));
      setPreviewCustomization(res.equipped);
      toast.success(
        lang === "ar"
          ? `تم إلغاء تفعيل "${item.name.ar}"`
          : `Unequipped "${item.name.en}"`
      );
    } catch (err) {
      toast.error(err.message || "Unequip failed");
    } finally {
      setActionLoadingId(null);
    }
  };

  // Preview an item on the live mascot
  const handlePreview = (item) => {
    setPreviewCustomization((prev) => ({
      ...prev,
      [item.type]: item.id,
    }));
  };

  // Reset preview to currently equipped wardrobe
  const handleResetPreview = () => {
    setPreviewCustomization(data.equipped);
  };

  const isPreviewModified = useMemo(() => {
    return (
      previewCustomization.botColor !== data.equipped.botColor ||
      previewCustomization.botHat !== data.equipped.botHat ||
      previewCustomization.botGlasses !== data.equipped.botGlasses ||
      previewCustomization.botShoes !== data.equipped.botShoes ||
      previewCustomization.avatarFrame !== data.equipped.avatarFrame ||
      previewCustomization.nameTag !== data.equipped.nameTag
    );
  }, [previewCustomization, data.equipped]);

  // Current equipped objects for preview labels
  const equippedNameTag = getStoreItemById(previewCustomization.nameTag);
  const equippedAvatarFrame = getStoreItemById(previewCustomization.avatarFrame);

  const getCategoryIcon = (id) => {
    switch (id) {
      case "all":
        return Sparkles;
      case "tags":
        return Tag;
      case "frames":
        return Crown;
      case "bot_skins":
        return Palette;
      case "bot_hats":
        return Award;
      case "bot_glasses":
        return Glasses;
      case "bot_shoes":
        return ShoppingBag;
      default:
        return Sparkles;
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Hero Store Banner with Balances & Point Safety Guarantee */}
      <div className="relative overflow-hidden rounded-[26px] p-6 sm:p-7 glass-panel border-teal-400/30 shadow-2xl">
        <div className="pointer-events-none absolute -top-16 -end-16 h-56 w-56 rounded-full bg-amber-400/15 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-16 -start-16 h-56 w-56 rounded-full bg-teal-400/15 blur-3xl" />

        <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-400/35 text-xs font-black text-amber-700 dark:text-amber-300 shadow-sm">
              <Sparkles className="h-4 w-4 text-amber-400" />
              <span>
                {lang === "ar"
                  ? "متجر مكافآت الطلاب والعملات"
                  : "Student Rewards & Customization Store"}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight leading-tight text-slate-900 dark:text-white">
              {lang === "ar"
                ? "حوّل مجهودك إلى عملات ومظاهر حصرية 🪙"
                : "Transform Your Effort Into Exclusive Rewards 🪙"}
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
              {lang === "ar"
                ? "استبدل عملاتك الذهبية بألقاب وشارات مميزة تحت اسمك، وإطارات مشعة لملفك الشخصي، وأزياء وقبعات وألوان كاملة لمساعدك الذكي أثر AI."
                : "Redeem your gold coins for distinguished name tags, glowing avatar frames, and complete color skins, hats, glasses, and shoes for your Athar AI robot assistant."}
            </p>

            {/* Strict Point Protection Shield Badge */}
            <div className="pt-2 flex flex-wrap items-center gap-2">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-2xl bg-emerald-500/15 border border-emerald-400/30 text-[11.5px] font-bold text-emerald-700 dark:text-emerald-300 shadow-sm">
                <ShieldCheck className="h-4 w-4 text-emerald-500 dark:text-emerald-300 shrink-0" />
                <span>
                  {lang === "ar"
                    ? "حماية تامة لنقاطك الأكاديمية: الشراء يخصم من العملات فقط ولا ينقص درجاتك أو نقاطك إطلاقاً!"
                    : "100% Academic Protection: Purchasing only deducts from Coins and never reduces your score, points, or certificate standing!"}
                </span>
              </div>
            </div>
          </div>

          {/* Live Currency Wallets Box */}
          <div className="grid grid-cols-2 gap-3 w-full lg:w-auto shrink-0">
            {/* Coins Balance Box */}
            <div className="rounded-2xl p-4 glass-subtle border-amber-400/30 flex flex-col justify-between">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-bold text-amber-600 dark:text-amber-300">
                  {lang === "ar" ? "رصيد العملات المتاح" : "Available Coins"}
                </span>
                <span className="text-lg">🪙</span>
              </div>
              <div className="mt-2 text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white flex items-baseline gap-1">
                {data.availableCoins.toLocaleString()}
                <span className="text-xs font-semibold text-amber-600 dark:text-amber-300">
                  {lang === "ar" ? "عملة" : "Coins"}
                </span>
              </div>
              <div className="mt-1 text-[10px] text-slate-500 dark:text-slate-400">
                {lang === "ar" ? `مصروف: ${data.spentCoins} عملة` : `Spent: ${data.spentCoins}`}
              </div>
            </div>

            {/* Academic Points Box */}
            <div className="rounded-2xl p-4 glass-subtle border-teal-400/25 flex flex-col justify-between">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-bold text-teal-600 dark:text-teal-300">
                  {lang === "ar" ? "النقاط الأكاديمية" : "Academic Points"}
                </span>
                <span className="text-lg">🏆</span>
              </div>
              <div className="mt-2 text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white flex items-baseline gap-1">
                {data.totalAcademicPoints.toLocaleString()}
                <span className="text-xs font-semibold text-teal-600 dark:text-teal-300">
                  {lang === "ar" ? "نقطة" : "pts"}
                </span>
              </div>
              <div className="mt-1 text-[10px] text-emerald-600 dark:text-emerald-300 font-bold flex items-center gap-1">
                <Zap className="h-3 w-3 text-emerald-500 dark:text-emerald-300" />
                <span>1 {lang === "ar" ? "نقطة" : "pt"} = 10 🪙</span>
              </div>
            </div>

            {/* Quick IQ Puzzles Link to Earn More */}
            <Link
              to="/student/puzzles"
              className="col-span-2 py-2.5 px-3.5 rounded-xl glass-btn-primary text-xs flex items-center justify-center gap-2"
            >
              <Brain className="h-4 w-4 animate-pulse" />
              <span>
                {lang === "ar"
                  ? "حل ألغاز الذكاء واكسب المزيد من العملات 🚀"
                  : "Solve IQ Puzzles & Earn Extra Coins 🚀"}
              </span>
              <ArrowRight className="h-3.5 w-3.5 rtl:rotate-180" />
            </Link>
          </div>
        </div>
      </div>

      {/* Main Grid: Live Robot & Profile Preview (Left/Top) + Store Catalog (Right/Bottom) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Wardrobe & Fitting Room Preview Station (4 Cols on LG) */}
        <div className="lg:col-span-4 space-y-5 lg:sticky lg:top-4">
          <div className="glass-card rounded-[26px] p-5 sm:p-6 border border-slate-200/90 dark:border-white/10 shadow-xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-200/80 dark:border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <Layers className="h-4 w-4 text-indigo-600 dark:text-cyan-400" />
                <h3 className="text-sm font-black text-slate-900 dark:text-white">
                  {lang === "ar" ? "غرفة القياس والتخصيص المباشر" : "Interactive Fitting Room"}
                </h3>
              </div>
              {isPreviewModified && (
                <button
                  type="button"
                  onClick={handleResetPreview}
                  className="flex items-center gap-1 text-[11px] font-bold text-slate-500 hover:text-indigo-600 dark:hover:text-cyan-400 cursor-pointer"
                  title="Revert to equipped"
                >
                  <RotateCcw className="h-3 w-3" />
                  <span>{lang === "ar" ? "استعادة المجهّز" : "Revert"}</span>
                </button>
              )}
            </div>

            {/* Interactive Robot Mascot Stand */}
            <div className="relative rounded-2xl p-6 bg-gradient-to-b from-indigo-500/10 via-slate-500/5 to-purple-500/10 border border-indigo-200/50 dark:border-white/10 flex flex-col items-center justify-center min-h-[220px]">
              <div className="absolute top-3 end-3 px-2 py-0.5 rounded-full bg-slate-900/10 dark:bg-white/10 text-[10px] font-bold text-slate-600 dark:text-slate-300">
                {lang === "ar" ? "مساعدك أثر AI" : "Athar AI Mascot"}
              </div>

              {/* Robot Mascot SVG Preview */}
              <div className="transform scale-110 sm:scale-125 my-4 filter drop-shadow-xl transition-all duration-300">
                <RobotMascotSvg
                  skinId={previewCustomization.botColor}
                  hatId={previewCustomization.botHat}
                  glassesId={previewCustomization.botGlasses}
                  shoesId={previewCustomization.botShoes}
                  width={110}
                  height={116}
                  idPrefix="preview"
                  signText={lang === "ar" ? "أهلاً!" : "ATHAR"}
                  className="w-[100px] h-[106px] overflow-visible"
                />
              </div>

              {/* Bot Customization Summary Pills */}
              <div className="mt-2 flex flex-wrap justify-center gap-1.5 text-[10.5px]">
                <span className="px-2 py-0.5 rounded-lg bg-indigo-500/15 text-indigo-700 dark:text-cyan-300 font-bold border border-indigo-400/20">
                  {getStoreItemById(previewCustomization.botColor)?.name[lang] || "Color"}
                </span>
                {previewCustomization.botHat !== "hat_none" && (
                  <span className="px-2 py-0.5 rounded-lg bg-purple-500/15 text-purple-700 dark:text-purple-300 font-bold border border-purple-400/20">
                    {getStoreItemById(previewCustomization.botHat)?.name[lang]}
                  </span>
                )}
                {previewCustomization.botGlasses !== "glasses_none" && (
                  <span className="px-2 py-0.5 rounded-lg bg-sky-500/15 text-sky-700 dark:text-sky-300 font-bold border border-sky-400/20">
                    {getStoreItemById(previewCustomization.botGlasses)?.name[lang]}
                  </span>
                )}
                {previewCustomization.botShoes !== "shoes_none" && (
                  <span className="px-2 py-0.5 rounded-lg bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-bold border border-emerald-400/20">
                    {getStoreItemById(previewCustomization.botShoes)?.name[lang]}
                  </span>
                )}
              </div>
            </div>

            {/* Profile Avatar & Name Tag Preview */}
            <div className="rounded-2xl p-4 bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-white/10 space-y-3">
              <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 flex items-center justify-between">
                <span>{lang === "ar" ? "معاينة الملف الشخصي والشارة" : "Profile & Name Tag Preview"}</span>
                <span className="text-[10px] font-normal">
                  {equippedAvatarFrame ? equippedAvatarFrame.name[lang] : (lang === "ar" ? "إطار عادي" : "Default Frame")}
                </span>
              </div>

              <div className="flex items-center gap-3.5">
                {/* Avatar with Frame */}
                <div className="relative shrink-0">
                  <div
                    className={`h-12 w-12 rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 text-white font-black text-sm flex items-center justify-center transition-all ${
                      equippedAvatarFrame?.frameClass || ""
                    }`}
                  >
                    {String(user?.displayName || "ST").slice(0, 2).toUpperCase()}
                  </div>
                  {equippedAvatarFrame?.icon && (
                    <span className="absolute -top-1.5 -end-1.5 text-xs drop-shadow">
                      {equippedAvatarFrame.icon}
                    </span>
                  )}
                </div>

                {/* Name & Equipped Name Tag Badge */}
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-black text-slate-900 dark:text-white truncate">
                    {user?.displayName || "Student User"}
                  </div>

                  {equippedNameTag ? (
                    <div
                      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10.5px] font-extrabold border mt-1 shadow-xs ${equippedNameTag.badgeClass}`}
                    >
                      <span>{equippedNameTag.icon}</span>
                      <span>{equippedNameTag.name[lang]}</span>
                    </div>
                  ) : (
                    <div className="text-[10.5px] text-slate-400 mt-0.5">
                      {lang === "ar" ? "لم يتم تجهيز لقب بعد" : "No name tag equipped"}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Help / Tips Box */}
            <div className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed bg-teal-500/10 p-3 rounded-xl border border-teal-400/20 flex items-start gap-2">
              <Info className="h-4 w-4 text-teal-500 shrink-0 mt-0.5" />
              <span>
                {lang === "ar"
                  ? "اضغط على أي عنصر في المتجر لمعاينته وتجربته مباشرة هنا، ثم اضغط 'شراء' لتثبيته في حسابك وفي المساعد الذكي."
                  : "Click 'Try On' on any item to preview it immediately here, then click 'Buy' to permanently unlock and equip it on your mascot!"}
              </span>
            </div>
          </div>
        </div>

        {/* Store Catalog (8 Cols on LG) */}
        <div className="lg:col-span-8 space-y-5">
          {/* Category Filter Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
            {STORE_CATEGORIES.map((cat) => {
              const Icon = getCategoryIcon(cat.id);
              const isActive = activeCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setActiveCategory(cat.id)}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-2xl text-xs font-black shrink-0 transition-all cursor-pointer ${
                    isActive
                      ? "bg-gradient-to-r from-sky-500 via-teal-500 to-emerald-500 text-white shadow-md shadow-teal-500/30 scale-105"
                      : "glass-card text-slate-700 dark:text-slate-300 hover:border-teal-400/50"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span>{cat.label[lang]}</span>
                </button>
              );
            })}
          </div>

          {/* Catalog Items Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {filteredItems.map((item) => {
              const isOwned = data.inventory.includes(item.id) || item.isDefault;
              const isEquipped = data.equipped[item.type] === item.id;
              const isPreviewed = previewCustomization[item.type] === item.id;
              const canAfford = data.availableCoins >= item.price;
              const isActionLoading = actionLoadingId === item.id;

              return (
                <div
                  key={item.id}
                  className={`relative rounded-3xl p-5 glass-card transition-all duration-200 flex flex-col justify-between ${
                    isEquipped
                      ? "border-emerald-400/60 ring-2 ring-emerald-500/20"
                      : isPreviewed
                      ? "border-teal-400/60 ring-2 ring-teal-500/20"
                      : "hover:border-teal-400/40"
                  }`}
                >
                  {/* Top Item Badge Row */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      {/* Item Visual Avatar / Thumbnail */}
                      <div className="h-12 w-12 rounded-2xl bg-slate-100 dark:bg-slate-700/60 border border-slate-200 dark:border-white/10 flex items-center justify-center shrink-0 text-xl shadow-xs overflow-hidden">
                        {item.category === "tags" && <span>{item.icon}</span>}
                        {item.category === "frames" && (
                          <div
                            className={`h-8 w-8 rounded-full bg-gradient-to-tr from-slate-400 to-slate-600 flex items-center justify-center text-[10px] text-white ${item.frameClass}`}
                          >
                            {item.icon}
                          </div>
                        )}
                        {item.category === "bot_skins" && (
                          <div
                            className="h-7 w-7 rounded-full shadow-md border-2 border-white"
                            style={{ backgroundColor: item.previewHex }}
                          />
                        )}
                        {(item.category === "bot_hats" ||
                          item.category === "bot_glasses" ||
                          item.category === "bot_shoes") && (
                          <span>{item.icon}</span>
                        )}
                      </div>

                      <div className="min-w-0">
                        <h4 className="text-sm font-black text-slate-900 dark:text-white truncate">
                          {item.name[lang]}
                        </h4>
                        <div className="text-[10px] font-bold text-slate-400 capitalize">
                          {STORE_CATEGORIES.find((c) => c.id === item.category)?.label[lang]}
                        </div>
                      </div>
                    </div>

                    {/* Status Pill */}
                    {isEquipped ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 border border-emerald-400/30 text-[10.5px] font-black shrink-0">
                        <CheckCircle2 className="h-3 w-3" />
                        {lang === "ar" ? "مجهّز حالياً" : "Equipped"}
                      </span>
                    ) : isOwned ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-indigo-500/15 text-indigo-600 dark:text-indigo-300 border border-indigo-400/30 text-[10.5px] font-black shrink-0">
                        {lang === "ar" ? "مملوك" : "Owned"}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-300 border border-amber-400/30 text-[11px] font-black shrink-0">
                        <span>🪙</span>
                        <span>{item.price === 0 ? (lang === "ar" ? "مجاني" : "Free") : item.price}</span>
                      </span>
                    )}
                  </div>

                  {/* Description */}
                  <p className="text-xs text-slate-600 dark:text-slate-300 mt-3 leading-relaxed">
                    {item.description[lang]}
                  </p>

                  {/* Special Visual Demo for Name Tags & Avatar Frames */}
                  {item.category === "tags" && (
                    <div className="mt-3 py-1.5 px-2 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/60 dark:border-white/5 flex items-center justify-center">
                      <div
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black border ${item.badgeClass}`}
                      >
                        <span>{item.icon}</span>
                        <span>{item.name[lang]}</span>
                      </div>
                    </div>
                  )}

                  {item.category === "frames" && (
                    <div className="mt-3 py-2 px-2 rounded-xl glass-subtle flex items-center justify-center gap-3">
                      <div
                        className={`h-9 w-9 rounded-xl bg-gradient-to-tr from-sky-500 to-emerald-500 text-white font-black text-xs flex items-center justify-center ${item.frameClass}`}
                      >
                        {String(user?.displayName || "ST").slice(0, 2).toUpperCase()}
                      </div>
                      <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                        {lang === "ar" ? "إطار متوهج للملف الشخصي" : "Glow profile frame"}
                      </span>
                    </div>
                  )}

                  {/* Action Buttons Footer */}
                  <div className="mt-4 pt-3 border-t border-slate-200/60 dark:border-white/10 flex items-center gap-2">
                    {/* Try On / Preview button for robot accessories */}
                    {item.category.startsWith("bot_") && (
                      <button
                        type="button"
                        onClick={() => handlePreview(item)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                          isPreviewed
                            ? "bg-teal-500/20 text-teal-700 dark:text-teal-300 border border-teal-400/40"
                            : "glass-btn-secondary"
                        }`}
                      >
                        {isPreviewed
                          ? (lang === "ar" ? "قيد المعاينة" : "Previewing")
                          : (lang === "ar" ? "معاينة" : "Try On")}
                      </button>
                    )}

                    {/* Main Buy / Equip / Unequip Button */}
                    {isEquipped ? (
                      <button
                        type="button"
                        disabled={isActionLoading || item.isDefault}
                        onClick={() => handleUnequip(item)}
                        className="flex-1 py-1.5 px-3 rounded-xl glass-btn-secondary text-xs font-bold disabled:opacity-50 cursor-pointer"
                      >
                        {item.isDefault
                          ? (lang === "ar" ? "الافتراضي" : "Default")
                          : (lang === "ar" ? "إلغاء التجهيز" : "Unequip")}
                      </button>
                    ) : isOwned ? (
                      <button
                        type="button"
                        disabled={isActionLoading}
                        onClick={() => handleEquip(item)}
                        className="flex-1 py-1.5 px-3 rounded-xl glass-btn-primary text-xs font-bold disabled:opacity-50 cursor-pointer"
                      >
                        {isActionLoading
                          ? (lang === "ar" ? "جاري التجهيز..." : "Equipping...")
                          : (lang === "ar" ? "تجهيز وتفعيل" : "Equip Now")}
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled={isActionLoading || !canAfford}
                        onClick={() => handleBuy(item)}
                        className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-black shadow-sm transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                          canAfford
                            ? "bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white shadow-amber-500/20 active:scale-95"
                            : "bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 border border-slate-200 dark:border-slate-700 cursor-not-allowed"
                        }`}
                      >
                        <span>🪙</span>
                        <span>
                          {isActionLoading
                            ? (lang === "ar" ? "جاري الشراء..." : "Purchasing...")
                            : canAfford
                            ? `${lang === "ar" ? "شراء بـ" : "Buy for"} ${item.price}`
                            : (lang === "ar" ? "العملات غير كافية" : "Insufficient Coins")}
                        </span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
