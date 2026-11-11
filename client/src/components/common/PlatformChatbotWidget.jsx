import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Bot,
  CheckCircle2,
  Maximize2,
  Minimize2,
  Send,
  Sparkles,
  Trash2,
  X,
  ArrowUpRight,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useLang } from "../../context/LangContext";
import { processChatbotMessage } from "../../utils/platformChatbotEngine";

export default function PlatformChatbotWidget() {
  const { user } = useAuth();
  const { lang } = useLang();
  const navigate = useNavigate();

  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);

  const welcomeText = (() => {
    if (user?.role === "instructor" || user?.role === "admin") {
      return lang === "ar"
        ? "مرحباً! أنا المساعد الذكي للمنصة. يمكنك أن تطلب مني مثلاً:\n• \"اعمل اختبار للطلاب على درس ...\"\n• \"اعرض بيانات ودرجات الطالب ...\"\n• \"ملخص المقررات والاختبارات\""
        : "Hi! I'm the Platform Smart Assistant. Try asking me:\n• \"Make a quiz for students on lesson ...\"\n• \"Tell me about student <name>\"\n• \"Show my courses and assignments summary\"";
    }
    return lang === "ar"
      ? "مرحباً! أنا مساعدك الذكي في المنصة. يمكنني مساعدتك في:\n• تلخيص أي درس أو ملف PDF\n• معرفة درجاتك ونقاطك وواجباتك\n• شرح كيفية استخدام أدوات المنصة"
      : "Hi! I'm your Platform Smart Assistant. I can help you:\n• Summarize any course lesson or Lesson PDF\n• Check your points, quiz scores & due assignments\n• Guide you through Live Annotation & platform tools";
  })();

  const [messages, setMessages] = useState([
    {
      id: "welcome",
      sender: "bot",
      text: welcomeText,
    },
  ]);

  const scrollRef = useRef(null);

  useEffect(() => {
    if (open && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, open, busy]);

  const starterChips =
    user?.role === "instructor" || user?.role === "admin"
      ? [
          {
            label: lang === "ar" ? "إنشاء اختبار على درس" : "Make a quiz on a lesson",
            prompt:
              lang === "ar"
                ? "اعمل اختبار للطلاب على درس"
                : "Make a quiz for students on lesson",
          },
          {
            label: lang === "ar" ? "بيانات المقررات والطلاب" : "Courses & students summary",
            prompt:
              lang === "ar"
                ? "اعرض ملخص المقررات والطلاب والنقاط"
                : "Show summary of all courses, lessons, and student points",
          },
        ]
      : [
          {
            label: lang === "ar" ? "تلخيص درس" : "Summarize a lesson",
            prompt: lang === "ar" ? "لخص لي درس" : "Summarize a lesson",
          },
          {
            label: lang === "ar" ? "نقاطي ودرجاتي" : "My points & marks",
            prompt:
              lang === "ar"
                ? "كم مجموع نقاطي ودرجاتي في الاختبارات والواجبات؟"
                : "Show my quiz points, grades, and assignment marks",
          },
          {
            label: lang === "ar" ? "كيف أستخدم المنصة؟" : "Platform guide",
            prompt:
              lang === "ar"
                ? "كيف أجاوب على الواجب وأدوّن على ملف الدرس؟"
                : "How do I answer assignments and annotate lesson PDFs?",
          },
        ];

  const handleSend = async (customText = null, explicitAction = null) => {
    const textToSend = String(customText !== null ? customText : input).trim();
    if (!textToSend || busy) return;

    const userMsg = {
      id: `u_${Date.now()}`,
      sender: "user",
      text: textToSend,
    };

    const nextHistory = [...messages, userMsg];
    setMessages(nextHistory);
    if (customText === null) setInput("");
    setBusy(true);

    try {
      const result = await processChatbotMessage({
        message: textToSend,
        user,
        lang,
        history: nextHistory,
        explicitAction,
      });

      setMessages((prev) => [
        ...prev,
        {
          id: `b_${Date.now()}`,
          sender: "bot",
          text: result.reply,
          actionCard: result.actionCard || null,
          quickActions: result.quickActions || null,
        },
      ]);
    } catch (err) {
      console.error(err);
      setMessages((prev) => [
        ...prev,
        {
          id: `b_err_${Date.now()}`,
          sender: "bot",
          text:
            lang === "ar"
              ? "حدث خطأ غير متوقع أثناء معالجة طلبك. حاول مرة أخرى."
              : "Something went wrong while processing that request. Please try again.",
        },
      ]);
    } finally {
      setBusy(false);
    }
  };

  const resetChat = () => {
    setMessages([{ id: `welcome_${Date.now()}`, sender: "bot", text: welcomeText }]);
  };

  return (
    <div className="fixed bottom-4 end-5 z-40">
      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="robot-patrol-track group relative flex flex-col items-center focus:outline-none cursor-pointer select-none"
          title={lang === "ar" ? "اضغط لفتح المساعد الذكي" : "Click to open Platform AI Chatbot"}
          aria-label="Open AI Robot Chatbot"
        >
          {/* Floating Speech Hint */}
          <span className="mb-1 px-2.5 py-0.5 rounded-full bg-gradient-to-r from-sky-500 to-indigo-600 text-white text-[10px] font-extrabold shadow-lg border border-white/40 flex items-center gap-1 whitespace-nowrap transition-transform group-hover:scale-110">
            <Sparkles className="h-3 w-3 text-amber-200 animate-pulse" />
            {lang === "ar" ? "اسألني AI" : "AI Bot · Click me"}
          </span>

          {/* Live Walking Robot SVG */}
          <div className="robot-face-flip">
            <div className="robot-bob-anim drop-shadow-[0_8px_14px_rgba(2,132,199,0.35)] group-hover:scale-110 transition-transform">
              <svg
                width="68"
                height="74"
                viewBox="0 0 80 88"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <defs>
                  <linearGradient id="botBodyGrad" x1="18" y1="16" x2="62" y2="66" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#38bdf8" />
                    <stop offset="0.55" stopColor="#2563eb" />
                    <stop offset="1" stopColor="#4f46e5" />
                  </linearGradient>
                  <linearGradient id="botMetalGrad" x1="20" y1="10" x2="60" y2="38" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#f8fafc" />
                    <stop offset="1" stopColor="#cbd5e1" />
                  </linearGradient>
                </defs>

                {/* Antenna */}
                <line x1="40" y1="14" x2="40" y2="6" stroke="#38bdf8" strokeWidth="3" strokeLinecap="round" />
                <circle cx="40" cy="5" r="4" fill="#fbbf24" stroke="#ffffff" strokeWidth="1.5" />

                {/* Left Arm (swinging) */}
                <g className="robot-arm-l">
                  <rect x="12" y="42" width="8" height="19" rx="4" fill="url(#botMetalGrad)" stroke="#0284c7" strokeWidth="1.5" />
                  <circle cx="16" cy="61" r="3.5" fill="#38bdf8" />
                </g>

                {/* Right Arm (swinging) */}
                <g className="robot-arm-r">
                  <rect x="60" y="42" width="8" height="19" rx="4" fill="url(#botMetalGrad)" stroke="#0284c7" strokeWidth="1.5" />
                  <circle cx="64" cy="61" r="3.5" fill="#38bdf8" />
                </g>

                {/* Left Leg (walking) */}
                <g className="robot-leg-l">
                  <rect x="27" y="64" width="9" height="15" rx="4" fill="#334155" />
                  <rect x="25" y="75" width="13" height="6" rx="3" fill="#0284c7" />
                </g>

                {/* Right Leg (walking) */}
                <g className="robot-leg-r">
                  <rect x="44" y="64" width="9" height="15" rx="4" fill="#334155" />
                  <rect x="42" y="75" width="13" height="6" rx="3" fill="#0284c7" />
                </g>

                {/* Robot Torso */}
                <rect x="22" y="40" width="36" height="27" rx="10" fill="url(#botBodyGrad)" stroke="#bae6fd" strokeWidth="2" />
                <rect x="30" y="47" width="20" height="12" rx="4" fill="#0f172a" fillOpacity="0.65" />
                <circle cx="35" cy="53" r="2.2" fill="#34d399" />
                <circle cx="40" cy="53" r="2.2" fill="#38bdf8" />
                <circle cx="45" cy="53" r="2.2" fill="#fbbf24" />

                {/* Robot Head */}
                <rect x="19" y="13" width="42" height="28" rx="11" fill="url(#botMetalGrad)" stroke="#38bdf8" strokeWidth="2.2" />
                {/* Screen Visor */}
                <rect x="24" y="18" width="32" height="17" rx="6" fill="#0f172a" />
                {/* Blinking LED Eyes */}
                <circle cx="33" cy="25" r="3.2" fill="#38bdf8" className="robot-eye-blink" />
                <circle cx="47" cy="25" r="3.2" fill="#38bdf8" className="robot-eye-blink" />
                {/* Happy LED Smile */}
                <path d="M35 30.5C37 32.5 43 32.5 45 30.5" stroke="#34d399" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </div>
          </div>

          {/* Ground Shadow */}
          <div className="w-11 h-2 -mt-1 rounded-full bg-slate-900/25 dark:bg-sky-400/20 blur-[2px]" />
        </button>
      ) : (
        <div
          className={`chatbot-pop-in glass-panel rounded-3xl shadow-2xl border border-white/45 dark:border-white/15 flex flex-col overflow-hidden transition-all duration-200 ${
            expanded
              ? "w-[92vw] sm:w-[560px] h-[80vh]"
              : "w-[92vw] sm:w-[400px] h-[540px]"
          }`}
        >
          {/* Chat Header */}
          <div className="px-4 py-3 bg-gradient-to-r from-sky-600 via-blue-600 to-indigo-600 text-white flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="h-8 w-8 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                <Bot className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-extrabold truncate">
                  {lang === "ar" ? "المساعد الذكي للمنصة" : "Platform Smart Chatbot"}
                </div>
                <div className="text-[10px] text-sky-100 truncate">
                  {lang === "ar"
                    ? "مدعوم ببيانات المنصة الحية"
                    : "Connected to live platform dataset"}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={resetChat}
                className="p-1.5 rounded-lg hover:bg-white/20 transition-colors"
                title={lang === "ar" ? "مسح المحادثة" : "Clear chat"}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setExpanded((e) => !e)}
                className="p-1.5 rounded-lg hover:bg-white/20 transition-colors"
                title={expanded ? "Compact" : "Expand"}
              >
                {expanded ? (
                  <Minimize2 className="h-3.5 w-3.5" />
                ) : (
                  <Maximize2 className="h-3.5 w-3.5" />
                )}
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="p-1.5 rounded-lg hover:bg-white/20 transition-colors"
                aria-label="Close chatbot"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Messages Area */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-3.5 space-y-3">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex flex-col ${
                  m.sender === "user" ? "items-end" : "items-start"
                }`}
              >
                <div
                  className={`max-w-[88%] rounded-2xl px-3.5 py-2.5 text-xs whitespace-pre-line leading-relaxed ${
                    m.sender === "user"
                      ? "bg-gradient-to-r from-sky-600 to-indigo-600 text-white shadow-md"
                      : "glass-subtle text-slate-800 dark:text-slate-100"
                  }`}
                >
                  {m.text}
                </div>

                {/* Action Result Card (e.g. Quiz Created Directly) */}
                {m.actionCard?.type === "quiz_created" && (
                  <div className="mt-2 max-w-[88%] p-3 rounded-2xl bg-emerald-500/15 border border-emerald-400/40 text-xs space-y-1.5">
                    <div className="flex items-center gap-1.5 font-extrabold text-emerald-700 dark:text-emerald-300">
                      <CheckCircle2 className="h-4 w-4" />
                      {lang === "ar" ? "تم نشر الاختبار!" : "Quiz Published!"}
                    </div>
                    <div className="text-[11px] text-slate-700 dark:text-slate-200">
                      <strong>{m.actionCard.title}</strong> · {m.actionCard.courseTitle} ·{" "}
                      {m.actionCard.questionCount} Qs
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setOpen(false);
                        navigate(m.actionCard.link);
                      }}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-600 text-white text-[11px] font-bold hover:bg-emerald-700"
                    >
                      {lang === "ar" ? "فتح الاختبارات" : "Open Quizzes"}
                      <ArrowUpRight className="h-3 w-3" />
                    </button>
                  </div>
                )}

                {/* Interactive Quick-Pick Lesson Chips */}
                {Array.isArray(m.quickActions) && m.quickActions.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5 max-w-[92%]">
                    {m.quickActions.map((qa) => (
                      <button
                        key={`${qa.type}_${qa.lessonId}`}
                        type="button"
                        disabled={busy}
                        onClick={() => handleSend(qa.label, qa)}
                        className="px-2.5 py-1 rounded-xl bg-sky-500/15 hover:bg-sky-500/25 border border-sky-400/35 text-sky-700 dark:text-sky-300 text-[11px] font-bold transition-colors disabled:opacity-50"
                      >
                        {qa.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {busy && (
              <div className="flex items-center gap-2 text-xs text-slate-500 px-2">
                <Sparkles className="h-3.5 w-3.5 text-sky-500 animate-spin" />
                {lang === "ar" ? "جاري التفكير والبحث في المنصة..." : "Thinking across platform data..."}
              </div>
            )}
          </div>

          {/* Starter Quick Prompts */}
          <div className="px-3 py-1.5 border-t border-white/25 dark:border-white/10 flex flex-wrap gap-1.5 bg-white/30 dark:bg-slate-900/35">
            {starterChips.map((chip) => (
              <button
                key={chip.label}
                type="button"
                disabled={busy}
                onClick={() => handleSend(chip.prompt)}
                className="px-2.5 py-1 rounded-full glass-subtle text-[10px] font-bold hover:bg-sky-500/15 text-slate-700 dark:text-slate-200 disabled:opacity-50"
              >
                {chip.label}
              </button>
            ))}
          </div>

          {/* Input Bar */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="p-3 border-t border-white/25 dark:border-white/10 flex items-center gap-2 bg-white/40 dark:bg-slate-900/50"
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={busy}
              placeholder={
                lang === "ar"
                  ? "اسأل عن طالب، درس، أو اطلب إنشاء اختبار..."
                  : "Ask about a student, lesson summary, or create a quiz..."
              }
              className="flex-1 px-3 py-2 rounded-xl glass-input text-xs"
            />
            <button
              type="submit"
              disabled={busy || !input.trim()}
              className="glass-btn-primary p-2.5 rounded-xl disabled:opacity-45"
              aria-label="Send message"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

