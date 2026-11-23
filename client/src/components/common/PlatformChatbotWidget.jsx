import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import toast from "react-hot-toast";
import {
  Bot,
  BookOpen,
  CheckCircle2,
  Flame,
  HelpCircle,
  Maximize2,
  Minimize2,
  Send,
  Sparkles,
  Trophy,
  Trash2,
  X,
  ArrowUpRight,
  Paperclip,
  Image as ImageIcon,
  FileText,
  Copy,
  Check,
  Languages,
  Loader2,
  Mic,
  Volume2,
  VolumeX,
  Square,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useLang } from "../../context/LangContext";
import { useTheme } from "../../context/ThemeContext";
import { processChatbotMessage } from "../../utils/platformChatbotEngine";

// Lightweight beautiful markdown formatter for AI responses
function FormattedBotText({ text, lang = "en" }) {
  const [copiedCodeIdx, setCopiedCodeIdx] = useState(null);

  if (!text) return null;

  const lines = String(text).split("\n");
  const renderedElements = [];
  let currentList = [];
  let inCodeBlock = false;
  let codeBuffer = [];
  let codeLanguage = "";
  let blockIdx = 0;

  const flushList = () => {
    if (currentList.length > 0) {
      renderedElements.push(
        <ul key={`ul_${blockIdx++}`} className="space-y-1.5 my-2 ps-1">
          {currentList.map((item, idx) => (
            <li key={`li_${idx}`} className="flex items-start gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-indigo-500 dark:bg-cyan-400 mt-2 shrink-0" />
              <div className="flex-1 leading-relaxed">
                {parseInlineFormatting(item)}
              </div>
            </li>
          ))}
        </ul>
      );
      currentList = [];
    }
  };

  const copyCode = (code, idx) => {
    navigator.clipboard.writeText(code);
    setCopiedCodeIdx(idx);
    toast.success(lang === "ar" ? "تم نسخ الكود!" : "Code copied!");
    setTimeout(() => setCopiedCodeIdx(null), 2000);
  };

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const trimmed = rawLine.trim();

    // Code block start / end
    if (trimmed.startsWith("```")) {
      if (inCodeBlock) {
        // End code block
        const fullCode = codeBuffer.join("\n");
        const thisIdx = blockIdx++;
        renderedElements.push(
          <div
            key={`code_${thisIdx}`}
            className="my-2.5 rounded-xl overflow-hidden border border-slate-700/60 bg-slate-950 text-slate-100 shadow-md text-xs font-mono"
          >
            <div className="px-3 py-1.5 bg-slate-900 border-b border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
              <span>{codeLanguage || "code"}</span>
              <button
                type="button"
                onClick={() => copyCode(fullCode, thisIdx)}
                className="flex items-center gap-1 hover:text-white transition-colors"
              >
                {copiedCodeIdx === thisIdx ? (
                  <>
                    <Check className="h-3 w-3 text-emerald-400" />
                    <span className="text-emerald-400">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-3 w-3" />
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>
            <pre className="p-3 overflow-x-auto leading-relaxed text-[12px]">
              <code>{fullCode}</code>
            </pre>
          </div>
        );
        codeBuffer = [];
        inCodeBlock = false;
        codeLanguage = "";
      } else {
        // Start code block
        flushList();
        inCodeBlock = true;
        codeLanguage = trimmed.slice(3).trim();
      }
      continue;
    }

    if (inCodeBlock) {
      codeBuffer.push(rawLine);
      continue;
    }

    // Bullet line
    if (trimmed.startsWith("•") || trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
      const content = trimmed.replace(/^[•\-\*]\s*/, "");
      currentList.push(content);
      continue;
    }

    // Numbered list
    if (/^\d+[\.\)]\s/.test(trimmed)) {
      flushList();
      const match = trimmed.match(/^(\d+)[\.\)]\s+(.*)/);
      if (match) {
        renderedElements.push(
          <div key={`num_${blockIdx++}`} className="flex items-start gap-2 my-1.5 ps-1">
            <span className="h-5 w-5 rounded-full bg-indigo-500/15 text-indigo-700 dark:text-cyan-300 font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">
              {match[1]}
            </span>
            <div className="flex-1 leading-relaxed">
              {parseInlineFormatting(match[2])}
            </div>
          </div>
        );
        continue;
      }
    }

    flushList();

    // Headings
    if (trimmed.startsWith("### ")) {
      renderedElements.push(
        <h5
          key={`h5_${blockIdx++}`}
          className="font-extrabold text-[13.5px] sm:text-sm text-slate-900 dark:text-white mt-3 mb-1"
        >
          {parseInlineFormatting(trimmed.slice(4))}
        </h5>
      );
      continue;
    }
    if (trimmed.startsWith("## ")) {
      renderedElements.push(
        <h4
          key={`h4_${blockIdx++}`}
          className="font-black text-sm sm:text-base text-slate-900 dark:text-white mt-3.5 mb-1.5 pb-1 border-b border-slate-200/60 dark:border-white/10"
        >
          {parseInlineFormatting(trimmed.slice(3))}
        </h4>
      );
      continue;
    }
    if (trimmed.startsWith("# ")) {
      renderedElements.push(
        <h3
          key={`h3_${blockIdx++}`}
          className="font-black text-base sm:text-lg text-slate-900 dark:text-white mt-4 mb-2"
        >
          {parseInlineFormatting(trimmed.slice(2))}
        </h3>
      );
      continue;
    }

    // Empty lines
    if (!trimmed) {
      renderedElements.push(<div key={`sp_${blockIdx++}`} className="h-2" />);
      continue;
    }

    // Regular paragraph
    renderedElements.push(
      <p key={`p_${blockIdx++}`} className="leading-relaxed my-1">
        {parseInlineFormatting(rawLine)}
      </p>
    );
  }

  flushList();
  return <div className="space-y-0.5">{renderedElements}</div>;
}

// Inline parser for bold, italic, and inline code spans
function parseInlineFormatting(str) {
  if (!str) return null;
  const parts = [];
  const regex = /(\*\*[^*]+\*\*|`[^`]+`|\*[^*]+\*)/g;
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(str)) !== null) {
    if (match.index > lastIndex) {
      parts.push(str.substring(lastIndex, match.index));
    }
    const token = match[0];
    if (token.startsWith("**") && token.endsWith("**")) {
      parts.push(
        <strong
          key={`b_${match.index}`}
          className="font-bold text-slate-900 dark:text-white"
        >
          {token.slice(2, -2)}
        </strong>
      );
    } else if (token.startsWith("`") && token.endsWith("`")) {
      parts.push(
        <code
          key={`c_${match.index}`}
          className="px-1.5 py-0.5 rounded-md bg-indigo-500/10 text-indigo-700 dark:text-cyan-300 font-mono text-[11px]"
        >
          {token.slice(1, -1)}
        </code>
      );
    } else if (token.startsWith("*") && token.endsWith("*")) {
      parts.push(
        <em key={`i_${match.index}`} className="italic text-slate-700 dark:text-slate-300">
          {token.slice(1, -1)}
        </em>
      );
    }
    lastIndex = regex.lastIndex;
  }

  if (lastIndex < str.length) {
    parts.push(str.substring(lastIndex));
  }
  return parts.length > 0 ? parts : str;
}

export default function PlatformChatbotWidget() {
  const { user } = useAuth();
  const { lang } = useLang();
  const { logoSrc } = useTheme();
  const navigate = useNavigate();

  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);

  const [attachments, setAttachments] = useState([]);
  const [copiedMsgId, setCopiedMsgId] = useState(null);
  const [translatingMsgId, setTranslatingMsgId] = useState(null);
  const [recording, setRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const [speakingMsgId, setSpeakingMsgId] = useState(null);

  const fileInputRef = useRef(null);
  const scrollRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const recordTimerRef = useRef(null);
  const mediaStreamRef = useRef(null);

  const welcomeText = (() => {
    if (user?.role === "instructor" || user?.role === "admin") {
      return lang === "ar"
        ? "مرحباً! أنا أثر AI (Athar AI) — المساعد الذكي للمنصة.\n\nيمكنك الآن:\n• إرسال **صور ومخططات** أو **ملفات PDF** لتحليلها وشرحها فورا.\n• طلب إنشاء اختبار: *«اعمل اختبار للطلاب على درس ...»*\n• الاستفسار عن درجات ونقاط أي طالب أو ملخص المقررات.\n• طرح أي سؤال تعليمي أو أكاديمي عام."
        : "Hi! I am Athar AI, your Educational Assistant.\n\nYou can now:\n• Attach **photos & diagrams** or **PDF documents** for instant multimodal analysis.\n• Author quizzes instantly: *\"Make a quiz for students on lesson ...\"*\n• Look up student points, scoreboard rankings, and course analytics.\n• Ask any educational, scientific, or programming questions.";
    }
    return lang === "ar"
      ? "مرحباً! أنا أثر AI (Athar AI) — مساعدك التعليمي الذكي.\n\nكيف يمكنني مساعدتك اليوم؟\n• أرسل **صورة مسألة أو مخطط** أو **ملف PDF** وسأقوم بتحليله وشرحه لك خطوة بخطوة.\n• تلخيص أي درس أو مقرر دراسي.\n• مراجعة مجموع نقاطك ودرجاتك في الاختبارات والواجبات.\n• الإجابة على أي استفسار دراسي أو تقني."
      : "Hi! I am Athar AI, your Learning Assistant.\n\nHow can I help you today?\n• Upload **photos/diagrams** or **PDF lesson files** for step-by-step analysis.\n• Summarize any course lesson or technical document.\n• Check your earned points, scoreboard ranking, and grades.\n• Ask any study, science, or programming question.";
  })();

  const [messages, setMessages] = useState([
    {
      id: "welcome",
      sender: "bot",
      text: welcomeText,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    },
  ]);

  useEffect(() => {
    if (open && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, open, busy]);

  // Cleanup speech & recording on unmount or dialog close
  useEffect(() => {
    return () => {
      if (typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
      if (recordTimerRef.current) clearInterval(recordTimerRef.current);
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  useEffect(() => {
    if (!open) {
      if (typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
      setSpeakingMsgId(null);
    }
  }, [open]);

  // Voice Recording Handlers
  const startRecording = async () => {
    if (recording || busy) return;
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      toast.error(
        lang === "ar"
          ? "المتصفح لا يدعم تسجيل الصوت أو يحتاج صلاحية الميكروفون."
          : "Voice recording is not supported in this browser."
      );
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      audioChunksRef.current = [];

      const options = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? { mimeType: "audio/webm;codecs=opus" }
        : MediaRecorder.isTypeSupported("audio/webm")
        ? { mimeType: "audio/webm" }
        : MediaRecorder.isTypeSupported("audio/mp4")
        ? { mimeType: "audio/mp4" }
        : {};

      const recorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      recorder.onstop = () => {
        const mimeType = recorder.mimeType || "audio/webm";
        const blob = new Blob(audioChunksRef.current, { type: mimeType });
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64 = reader.result;
          setAttachments((prev) => [
            ...prev,
            {
              id: `voice_${Date.now()}`,
              name: lang === "ar" ? "تسجيل صوتي" : "Voice Note",
              mimeType: mimeType,
              kind: "audio",
              data: base64,
              sizeKb: Math.max(1, Math.round(blob.size / 1024)),
              durationSec: recordSeconds,
            },
          ]);
        };
        reader.readAsDataURL(blob);

        if (mediaStreamRef.current) {
          mediaStreamRef.current.getTracks().forEach((t) => t.stop());
          mediaStreamRef.current = null;
        }
      };

      recorder.start(250);
      setRecording(true);
      setRecordSeconds(0);
      if (recordTimerRef.current) clearInterval(recordTimerRef.current);
      recordTimerRef.current = setInterval(() => {
        setRecordSeconds((s) => s + 1);
      }, 1000);
    } catch (err) {
      console.error("Recording error:", err);
      toast.error(
        lang === "ar"
          ? "تعذر الوصول إلى الميكروفون. يرجى السماح بصلاحية الصوت."
          : "Could not access microphone. Please allow audio permission."
      );
    }
  };

  const stopRecording = () => {
    if (!recording) return;
    if (recordTimerRef.current) clearInterval(recordTimerRef.current);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    setRecording(false);
  };

  const cancelRecording = () => {
    if (recordTimerRef.current) clearInterval(recordTimerRef.current);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.ondataavailable = null;
      mediaRecorderRef.current.onstop = null;
      mediaRecorderRef.current.stop();
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      mediaStreamRef.current = null;
    }
    audioChunksRef.current = [];
    setRecording(false);
    setRecordSeconds(0);
  };

  // Text-To-Speech (TTS) Voice Read Aloud
  const toggleSpeech = (msgId, rawText) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      toast.error(
        lang === "ar"
          ? "المتصفح لا يدعم ميزة نطق الردود الصوتية."
          : "Text-to-speech is not supported in this browser."
      );
      return;
    }

    if (speakingMsgId === msgId) {
      window.speechSynthesis.cancel();
      setSpeakingMsgId(null);
      return;
    }

    window.speechSynthesis.cancel();

    // Clean markdown syntax for smooth natural speech reading
    const cleanText = String(rawText || "")
      .replace(/```[\s\S]*?```/g, " كود برمجي ")
      .replace(/`([^`]+)`/g, "$1")
      .replace(/#{1,6}\s+/g, "")
      .replace(/\*\*([^*]+)\*\*/g, "$1")
      .replace(/\*([^*]+)\*/g, "$1")
      .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
      .replace(/https?:\/\/\S+/g, "")
      .replace(/[•\-\*]\s+/g, "")
      .replace(/\n+/g, " ")
      .trim();

    if (!cleanText) return;

    const utterance = new SpeechSynthesisUtterance(cleanText);
    const isArabic = /[\u0600-\u06FF]/.test(cleanText);
    utterance.lang = isArabic ? "ar-SA" : "en-US";
    utterance.rate = 1.0;
    utterance.pitch = 1.0;

    const voices = window.speechSynthesis.getVoices?.() || [];
    if (isArabic) {
      const arVoice = voices.find((v) => v.lang.startsWith("ar"));
      if (arVoice) utterance.voice = arVoice;
    } else {
      const enVoice = voices.find(
        (v) => v.lang.startsWith("en") && (v.name.includes("Google") || v.name.includes("Natural"))
      ) || voices.find((v) => v.lang.startsWith("en"));
      if (enVoice) utterance.voice = enVoice;
    }

    utterance.onend = () => setSpeakingMsgId(null);
    utterance.onerror = () => setSpeakingMsgId(null);

    setSpeakingMsgId(msgId);
    window.speechSynthesis.speak(utterance);
  };

  // File Upload Handlers (Photos & PDFs & Audio)
  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    files.forEach((file) => {
      if (file.size > 25 * 1024 * 1024) {
        toast.error(lang === "ar" ? "حجم الملف كبير جداً (الحد 25 ميجابايت)" : "File is too large (max 25MB)");
        return;
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        const base64 = event.target.result;
        const isImage = file.type.startsWith("image/");
        const isPdf = file.type === "application/pdf";
        const isAudio = file.type.startsWith("audio/");

        setAttachments((prev) => [
          ...prev,
          {
            id: `att_${Date.now()}_${Math.random()}`,
            name: file.name,
            mimeType: file.type || (isPdf ? "application/pdf" : isAudio ? "audio/webm" : "image/jpeg"),
            kind: isImage ? "image" : isPdf ? "pdf" : isAudio ? "audio" : "file",
            data: base64,
            sizeKb: Math.round(file.size / 1024),
          },
        ]);
      };
      reader.readAsDataURL(file);
    });

    e.target.value = "";
  };

  const removeAttachment = (id) => {
    setAttachments((prev) => prev.filter((a) => a.id !== id));
  };

  const starterChips =
    user?.role === "instructor" || user?.role === "admin"
      ? [
          {
            label: lang === "ar" ? "إنشاء اختبار على درس" : "Make a quiz on a lesson",
            prompt:
              lang === "ar"
                ? "اعمل اختبار للطلاب على درس"
                : "Make a quiz for students on lesson",
            action: { type: "request_create_quiz" },
          },
          {
            label: lang === "ar" ? "تلخيص درس" : "Summarize a lesson",
            prompt: lang === "ar" ? "لخص لي درس" : "Summarize a lesson",
            action: { type: "request_summarize_lessons" },
          },
          {
            label: lang === "ar" ? "بيانات المقررات والطلاب" : "Courses & students summary",
            prompt:
              lang === "ar"
                ? "اعرض ملخص المقررات والطلاب والنقاط"
                : "Show summary of all courses, lessons, and student points",
          },
          {
            label: lang === "ar" ? "تحليل ملف درس أو مسألة" : "Analyze a lesson / diagram",
            prompt:
              lang === "ar"
                ? "كيف يمكنك تحليل صورة مسألة أو ملف PDF تعليمي؟"
                : "How do you analyze a diagram or educational PDF document?",
          },
        ]
      : [
          {
            label: lang === "ar" ? "تلخيص درس" : "Summarize a lesson",
            prompt: lang === "ar" ? "لخص لي درس" : "Summarize a lesson",
            action: { type: "request_summarize_lessons" },
          },
          {
            label: lang === "ar" ? "نقاطي ودرجاتي" : "My points & marks",
            prompt:
              lang === "ar"
                ? "كم مجموع نقاطي ودرجاتي في الاختبارات والواجبات؟"
                : "Show my quiz points, grades, and assignment marks",
          },
          {
            label: lang === "ar" ? "حل مسألة من صورة" : "Solve from photo",
            prompt:
              lang === "ar"
                ? "أريد إرسال صورة مسألة لشرحها خطوة بخطوة"
                : "I want to attach a photo of a problem for step-by-step explanation",
          },
        ];

  const handleSend = async (customText = null, explicitAction = null) => {
    const textToSend = String(customText !== null ? customText : input).trim();
    const currentAttachments = [...attachments];

    if ((!textToSend && currentAttachments.length === 0) || busy) return;

    const userMsg = {
      id: `u_${Date.now()}`,
      sender: "user",
      text: textToSend,
      attachments: currentAttachments,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    const nextHistory = [...messages, userMsg];
    setMessages(nextHistory);
    if (customText === null) setInput("");
    setAttachments([]);
    setBusy(true);

    try {
      const result = await processChatbotMessage({
        message: textToSend,
        attachments: currentAttachments,
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
          provider: "ai",
          model: lang === "ar" ? "أثر AI" : "Athar AI",
          actionCard: result.actionCard || null,
          quickActions: result.quickActions || null,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
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
              ? "حدث خطأ أثناء معالجة طلبك عبر الذكاء الاصطناعي. يرجى المحاولة مرة أخرى."
              : "Something went wrong while processing your request. Please try again.",
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
    } finally {
      setBusy(false);
    }
  };

  const copyMessage = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedMsgId(id);
    toast.success(lang === "ar" ? "تم نسخ الرد!" : "Reply copied!");
    setTimeout(() => setCopiedMsgId(null), 2000);
  };

  const handleTranslateMessage = async (msgId) => {
    const targetMsg = messages.find((m) => m.id === msgId);
    if (!targetMsg) return;

    // Toggle if translation is already cached
    if (targetMsg.translatedText) {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === msgId ? { ...m, showTranslation: !m.showTranslation } : m
        )
      );
      return;
    }

    setTranslatingMsgId(msgId);
    try {
      let arabicText = "";
      // 1. Try Platform AI proxy translate endpoint
      try {
        const res = await axios.post(
          "http://localhost:3001/api/chat/translate",
          {
            text: targetMsg.text,
            from: "en",
            to: "ar",
          },
          { timeout: 15000 }
        );
        if (res.data?.translatedText) {
          arabicText = res.data.translatedText;
        }
      } catch {
        // 2. Direct browser fallback via MyMemory
        const lines = String(targetMsg.text || "").split("\n");
        const translatedLines = [];
        for (const line of lines) {
          if (!line.trim()) {
            translatedLines.push("");
            continue;
          }
          if (line.trim().startsWith("```")) {
            translatedLines.push(line);
            continue;
          }
          try {
            const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(
              line.trim()
            )}&langpair=en|ar`;
            const mRes = await axios.get(url, { timeout: 8000 });
            const translated = mRes.data?.responseData?.translatedText;
            translatedLines.push(translated && translated.trim() ? translated.trim() : line);
          } catch {
            translatedLines.push(line);
          }
        }
        arabicText = translatedLines.join("\n");
      }

      if (arabicText && arabicText.trim()) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === msgId
              ? { ...m, translatedText: arabicText.trim(), showTranslation: true }
              : m
          )
        );
        toast.success(
          lang === "ar" ? "تمت ترجمة الرد إلى العربية!" : "Translated reply to Arabic!"
        );
      } else {
        toast.error(
          lang === "ar" ? "تعذر ترجمة الرد حالياً." : "Failed to translate reply."
        );
      }
    } catch (err) {
      console.error("Translation error:", err);
      toast.error(
        lang === "ar" ? "تعذر ترجمة الرد حالياً." : "Failed to translate reply."
      );
    } finally {
      setTranslatingMsgId(null);
    }
  };

  const resetChat = () => {
    setMessages([
      {
        id: `welcome_${Date.now()}`,
        sender: "bot",
        text: welcomeText,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      },
    ]);
  };

  return (
    <div
      className={`fixed z-40 transition-all duration-200 ${
        open ? "bottom-1 sm:bottom-2 end-2 sm:end-4" : "bottom-0 end-2 sm:end-4"
      }`}
    >
      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="group relative flex flex-col items-center pb-0 focus:outline-none cursor-pointer select-none transition-transform hover:scale-105 active:scale-95"
          title={lang === "ar" ? "اضغط للتحدث مع المساعد الذكي أثر AI" : "Click to open Athar AI Assistant"}
          aria-label="Open AI Robot Chatbot"
        >
          {/* Robot Mascot Launcher */}
          <div className="flex flex-col items-center relative">
            <div className="drop-shadow-[0_6px_16px_rgba(2,132,199,0.38)]">
              <svg
                width="76"
                height="82"
                viewBox="0 0 118 104"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="w-[66px] h-[72px] sm:w-[74px] sm:h-[80px] overflow-visible"
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
                  <linearGradient id="botSignGrad" x1="62" y1="2" x2="114" y2="25" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#38bdf8" />
                    <stop offset="0.5" stopColor="#2563eb" />
                    <stop offset="1" stopColor="#4f46e5" />
                  </linearGradient>
                  <filter id="signDropShadow" x="-10%" y="-10%" width="130%" height="130%">
                    <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#0284c7" floodOpacity="0.35" />
                  </filter>
                </defs>

                {/* Antenna */}
                <line x1="44" y1="17" x2="44" y2="8" stroke="#38bdf8" strokeWidth="3" strokeLinecap="round" />
                <circle cx="44" cy="7" r="4.5" fill="#fbbf24" stroke="#ffffff" strokeWidth="1.5" />
                <circle cx="44" cy="7" r="7.5" stroke="#fbbf24" strokeWidth="1" strokeDasharray="2 2" className="opacity-80" />

                {/* Left Arm: Static Resting */}
                <g className="robot-arm-l">
                  <rect x="16" y="45" width="8" height="19" rx="4" fill="url(#botMetalGrad)" stroke="#0284c7" strokeWidth="1.5" />
                  <circle cx="20" cy="64" r="3.5" fill="#38bdf8" />
                </g>

                {/* Right Arm & Big Sign: Raised Static Handheld Sign */}
                <g className="robot-arm-wave">
                  {/* Upper Arm */}
                  <rect x="58" y="27" width="9" height="21" rx="4.5" fill="url(#botMetalGrad)" stroke="#0284c7" strokeWidth="1.5" transform="rotate(-36 60 44)" />
                  {/* Robot Hand holding sign pole */}
                  <circle cx="75" cy="27" r="5" fill="#38bdf8" stroke="#ffffff" strokeWidth="1.2" />
                  <path d="M72 26 L69 22 M75 25 L75 20 M78 26 L81 23" stroke="#38bdf8" strokeWidth="1.5" strokeLinecap="round" />

                  {/* Sign Pole */}
                  <line x1="75" y1="32" x2="82" y2="4" stroke="#0284c7" strokeWidth="2.5" strokeLinecap="round" />
                  <circle cx="82" cy="4" r="2.5" fill="#fbbf24" stroke="#ffffff" strokeWidth="1" />

                  {/* Handheld Sign Board */}
                  <g filter="url(#signDropShadow)">
                    <rect x="62" y="2" width="52" height="23" rx="6.5" fill="url(#botSignGrad)" stroke="#ffffff" strokeWidth="1.6" />
                    {/* Active Indicator LED */}
                    <circle cx="69" cy="8" r="2" fill="#34d399" />
                    {/* Sign Text: centered inside sign box */}
                    <text
                      x="91"
                      y="14.5"
                      fill="#ffffff"
                      fontSize="10.5"
                      fontWeight="900"
                      textAnchor="middle"
                      dominantBaseline="central"
                      className="robot-sign-text"
                      fontFamily="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
                      letterSpacing="0.6"
                    >
                      {lang === "ar" ? "مساعدة!" : "HELP!"}
                    </text>
                  </g>
                </g>

                {/* Legs: Static */}
                <g className="robot-leg-l">
                  <rect x="30" y="67" width="9" height="15" rx="4" fill="#334155" />
                  <rect x="28" y="78" width="13" height="6" rx="3" fill="#0284c7" />
                </g>
                <g className="robot-leg-r">
                  <rect x="47" y="67" width="9" height="15" rx="4" fill="#334155" />
                  <rect x="45" y="78" width="13" height="6" rx="3" fill="#0284c7" />
                </g>

                {/* Robot Torso */}
                <rect x="25" y="43" width="36" height="27" rx="10" fill="url(#botBodyGrad)" stroke="#bae6fd" strokeWidth="2" />
                <rect x="33" y="50" width="20" height="12" rx="4" fill="#0f172a" fillOpacity="0.65" />
                <circle cx="38" cy="56" r="2.2" fill="#34d399" />
                <circle cx="43" cy="56" r="2.2" fill="#38bdf8" />
                <circle cx="48" cy="56" r="2.2" fill="#fbbf24" />

                {/* Robot Head: Static */}
                <rect x="22" y="16" width="42" height="28" rx="11" fill="url(#botMetalGrad)" stroke="#38bdf8" strokeWidth="2.2" />
                <rect x="27" y="21" width="32" height="17" rx="6" fill="#0f172a" />
                <circle cx="36" cy="28" r="3.2" fill="#38bdf8" />
                <circle cx="50" cy="28" r="3.2" fill="#38bdf8" />
                <path d="M38 33.5C40 35.5 46 35.5 48 33.5" stroke="#34d399" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </div>
            <div className="w-13 sm:w-14 h-2.5 -mt-0.5 rounded-full bg-slate-900/30 dark:bg-sky-400/25 blur-[2.5px]" />
          </div>
        </button>
      ) : (
        <div
          className={`chatbot-pop-in bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl rounded-[28px] shadow-2xl border border-slate-200/80 dark:border-white/10 flex flex-col overflow-hidden transition-all duration-200 ${
            expanded
              ? "w-[94vw] sm:w-[620px] h-[86vh]"
              : "w-[94vw] sm:w-[440px] h-[580px]"
          }`}
        >
          {/* Header */}
          <div className="px-4 py-3 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white flex items-center justify-between gap-2 shadow-sm">
            <div className="flex items-center gap-3 min-w-0">
              <div className="h-12 w-12 sm:h-13 sm:w-13 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center shrink-0 border border-white/25 p-1 shadow-md">
                <img src={logoSrc} alt="Athar AI Logo" className="h-full w-full object-contain filter drop-shadow-md scale-110" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm sm:text-base font-black truncate tracking-wide">
                    {lang === "ar" ? "أثر AI" : "Athar AI"}
                  </span>
                  <span className="h-2 w-2 rounded-full bg-emerald-400 ring-4 ring-emerald-400/20 shrink-0" />
                </div>
                <div className="text-[10px] sm:text-[11px] text-sky-100/90 font-medium truncate">
                  {lang === "ar"
                    ? "تحليل صور • مستندات PDF • بيانات حية"
                    : "Multimodal: Photos · PDFs · Live Grounding"}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={resetChat}
                className="p-1.5 rounded-xl hover:bg-white/20 transition-colors"
                title={lang === "ar" ? "مسح المحادثة" : "Clear chat"}
              >
                <Trash2 className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setExpanded((e) => !e)}
                className="p-1.5 rounded-xl hover:bg-white/20 transition-colors"
                title={expanded ? "Compact" : "Expand"}
              >
                {expanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="p-1.5 rounded-xl hover:bg-white/20 transition-colors"
                aria-label="Close chatbot"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Messages Container */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-3.5 sm:p-4 space-y-4">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex flex-col ${
                  m.sender === "user" ? "items-end" : "items-start"
                }`}
              >
                {/* Bubble Container */}
                <div
                  className={`max-w-[88%] sm:max-w-[85%] rounded-[22px] px-4 py-3 shadow-sm transition-all ${
                    m.sender === "user"
                      ? "rounded-tr-none rtl:rounded-tr-[22px] rtl:rounded-tl-none bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white shadow-indigo-500/20"
                      : "rounded-tl-none rtl:rounded-tl-[22px] rtl:rounded-tr-none bg-slate-50 dark:bg-slate-800/80 text-slate-800 dark:text-slate-100 border border-slate-200/80 dark:border-white/10"
                  }`}
                >
                  {/* Attached media display in user bubble */}
                  {Array.isArray(m.attachments) && m.attachments.length > 0 && (
                    <div className="mb-2.5 space-y-2">
                      {m.attachments.map((att) => (
                        <div key={att.id || att.name}>
                          {att.kind === "image" && (
                            <img
                              src={att.data}
                              alt={att.name}
                              className="max-h-48 rounded-xl border border-white/30 object-cover shadow-sm"
                            />
                          )}
                          {att.kind === "pdf" && (
                            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/20 backdrop-blur-sm border border-white/25 text-xs font-semibold">
                              <FileText className="h-4 w-4 text-amber-200 shrink-0" />
                              <span className="truncate">{att.name}</span>
                              <span className="text-[10px] opacity-80 shrink-0">({att.sizeKb} KB)</span>
                            </div>
                          )}
                          {att.kind === "audio" && (
                            <div className="flex flex-col gap-1.5 p-2 rounded-xl bg-white/20 backdrop-blur-sm border border-white/25">
                              <div className="flex items-center gap-1.5 text-xs font-semibold">
                                <Volume2 className="h-4 w-4 text-emerald-300 shrink-0" />
                                <span className="truncate">
                                  {att.kind === "audio" ? (lang === "ar" ? "تسجيل صوتي" : "Voice Note") : att.name}
                                </span>
                                {att.durationSec ? (
                                  <span className="text-[10px] opacity-80 shrink-0">
                                    ({Math.floor(att.durationSec / 60)}:{(att.durationSec % 60).toString().padStart(2, "0")})
                                  </span>
                                ) : null}
                              </div>
                              <audio controls src={att.data} className="w-full max-w-[240px] h-8 rounded-lg" />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Message Text with Structured Typography */}
                  <div
                    className="text-[13px] sm:text-[13.5px]"
                    dir={m.showTranslation ? "rtl" : undefined}
                  >
                    {m.showTranslation && m.translatedText && (
                      <div className="mb-2 flex items-center justify-between text-[10.5px] text-indigo-600 dark:text-cyan-400 font-bold bg-indigo-500/10 dark:bg-cyan-500/10 px-2.5 py-1 rounded-lg border border-indigo-400/20">
                        <span className="flex items-center gap-1.5">
                          <Languages className="h-3 w-3" />
                          <span>{lang === "ar" ? "مترجم إلى العربية" : "Translated to Arabic"}</span>
                        </span>
                        <button
                          type="button"
                          onClick={() => handleTranslateMessage(m.id)}
                          className="hover:underline text-[10px] text-slate-500 dark:text-slate-400 font-semibold cursor-pointer"
                        >
                          {lang === "ar" ? "عرض الأصل" : "Show original"}
                        </button>
                      </div>
                    )}
                    {m.sender === "user" ? (
                      <p className="whitespace-pre-line leading-relaxed font-medium">{m.text}</p>
                    ) : (
                      <FormattedBotText
                        text={m.showTranslation && m.translatedText ? m.translatedText : m.text}
                        lang={m.showTranslation ? "ar" : lang}
                      />
                    )}
                  </div>

                  {/* Bot Bubble Bottom Info (Model tag + Translate + Copy + Time) */}
                  {m.sender === "bot" && (
                    <div className="mt-2.5 pt-2 border-t border-slate-200/60 dark:border-white/10 flex items-center justify-between text-[10px] text-slate-400 dark:text-slate-500">
                      <span className="flex items-center gap-1 font-semibold text-indigo-600 dark:text-cyan-400">
                        <Sparkles className="h-3 w-3" />
                        {m.model || (lang === "ar" ? "أثر AI" : "Athar AI")}
                      </span>
                      <div className="flex items-center gap-2">
                        {/* Voice Read Aloud Button */}
                        <button
                          type="button"
                          onClick={() =>
                            toggleSpeech(
                              m.id,
                              m.showTranslation && m.translatedText ? m.translatedText : m.text
                            )
                          }
                          className={`hover:text-slate-700 dark:hover:text-slate-200 flex items-center gap-1 cursor-pointer transition-colors ${
                            speakingMsgId === m.id
                              ? "text-indigo-600 dark:text-cyan-400 font-bold animate-pulse"
                              : ""
                          }`}
                          title={
                            speakingMsgId === m.id
                              ? lang === "ar"
                                ? "إيقاف الصوت"
                                : "Stop voice"
                              : lang === "ar"
                              ? "قراءة صوتية"
                              : "Read aloud"
                          }
                        >
                          {speakingMsgId === m.id ? (
                            <VolumeX className="h-3 w-3 text-rose-500" />
                          ) : (
                            <Volume2 className="h-3 w-3" />
                          )}
                          <span className="text-[9.5px]">
                            {speakingMsgId === m.id
                              ? lang === "ar"
                                ? "إيقاف"
                                : "Stop"
                              : lang === "ar"
                              ? "صوت"
                              : "Voice"}
                          </span>
                        </button>

                        {/* Translate to Arabic Button (Beside Copy Button) */}
                        <button
                          type="button"
                          onClick={() => handleTranslateMessage(m.id)}
                          disabled={translatingMsgId === m.id}
                          className={`flex items-center gap-1 px-1.5 py-0.5 rounded transition-all cursor-pointer ${
                            m.showTranslation
                              ? "bg-indigo-500/15 text-indigo-600 dark:text-cyan-400 font-bold"
                              : "hover:text-slate-700 dark:hover:text-slate-200"
                          }`}
                          title={
                            m.showTranslation
                              ? lang === "ar"
                                ? "عرض النص الأصلي"
                                : "Show original English"
                              : lang === "ar"
                              ? "ترجمة الرد إلى العربية"
                              : "Translate reply to Arabic"
                          }
                        >
                          {translatingMsgId === m.id ? (
                            <Loader2 className="h-3 w-3 animate-spin text-indigo-500" />
                          ) : (
                            <Languages className="h-3 w-3" />
                          )}
                          <span className="text-[9.5px]">
                            {m.showTranslation
                              ? lang === "ar"
                                ? "الأصل"
                                : "Original"
                              : lang === "ar"
                              ? "ترجمة"
                              : "Translate to Arabic"}
                          </span>
                        </button>

                        {/* Copy Button */}
                        <button
                          type="button"
                          onClick={() =>
                            copyMessage(
                              m.showTranslation && m.translatedText ? m.translatedText : m.text,
                              m.id
                            )
                          }
                          className="hover:text-slate-700 dark:hover:text-slate-200 flex items-center gap-0.5 cursor-pointer"
                          title={lang === "ar" ? "نسخ الرد" : "Copy reply"}
                        >
                          {copiedMsgId === m.id ? (
                            <Check className="h-3 w-3 text-emerald-500" />
                          ) : (
                            <Copy className="h-3 w-3" />
                          )}
                        </button>
                        <span>{m.timestamp}</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Direct Action Card (e.g. Quiz Created) */}
                {m.actionCard?.type === "quiz_created" && (
                  <div className="mt-2 max-w-[85%] p-3.5 rounded-2xl bg-emerald-500/15 border border-emerald-400/40 text-xs space-y-1.5">
                    <div className="flex items-center gap-1.5 font-extrabold text-emerald-700 dark:text-emerald-300">
                      <CheckCircle2 className="h-4 w-4" />
                      {lang === "ar" ? "تم نشر الاختبار للطلاب بنجاح!" : "Quiz Published Successfully!"}
                    </div>
                    <div className="text-[11px] text-slate-700 dark:text-slate-200">
                      <strong>{m.actionCard.title}</strong> · {m.actionCard.courseTitle} · {m.actionCard.questionCount} Questions
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setOpen(false);
                        navigate(m.actionCard.link);
                      }}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold shadow-sm"
                    >
                      {lang === "ar" ? "فتح الاختبارات" : "Open Quizzes"}
                      <ArrowUpRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}

                {/* Quick-Action Lesson Chips */}
                {Array.isArray(m.quickActions) && m.quickActions.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5 max-w-[90%]">
                    {m.quickActions.map((qa) => (
                      <button
                        key={`${qa.type}_${qa.lessonId}`}
                        type="button"
                        disabled={busy}
                        onClick={() => handleSend(qa.label, qa)}
                        className="px-3 py-1 rounded-xl bg-indigo-500/15 hover:bg-indigo-500/25 border border-indigo-400/35 text-indigo-700 dark:text-cyan-300 text-[11px] font-bold transition-all disabled:opacity-50"
                      >
                        {qa.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {busy && (
              <div className="flex items-center gap-2.5 text-xs font-semibold text-indigo-600 dark:text-cyan-400 px-3 py-2 rounded-2xl bg-indigo-500/10 border border-indigo-400/20 w-fit">
                <Sparkles className="h-4 w-4 animate-spin text-indigo-500 dark:text-cyan-400" />
                <span>
                  {lang === "ar"
                    ? "أثر AI يحلل البيانات ويصيغ الإجابة بدقة..."
                    : "Athar AI is analyzing input & preparing your response..."}
                </span>
              </div>
            )}
          </div>

          {/* Quick Prompts Carousel */}
          <div className="px-3 py-2 border-t border-slate-200/60 dark:border-white/10 flex flex-wrap gap-1.5 bg-slate-50/60 dark:bg-slate-900/40">
            {starterChips.map((chip) => (
              <button
                key={chip.label}
                type="button"
                disabled={busy}
                onClick={() => handleSend(chip.prompt, chip.action || null)}
                className="px-2.5 py-1 rounded-full bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-white/10 text-[10.5px] font-bold hover:border-indigo-500 text-slate-700 dark:text-slate-200 shadow-sm transition-all disabled:opacity-50"
              >
                {chip.label}
              </button>
            ))}
          </div>

          {/* Attachment Preview Strip */}
          {attachments.length > 0 && (
            <div className="px-3 py-2 border-t border-slate-200/60 dark:border-white/10 bg-indigo-50/50 dark:bg-indigo-950/20 flex flex-wrap gap-2 items-center">
              {attachments.map((att) => (
                <div
                  key={att.id}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-white dark:bg-slate-800 border border-indigo-200 dark:border-indigo-800/50 text-xs shadow-sm"
                >
                  {att.kind === "image" && <ImageIcon className="h-3.5 w-3.5 text-sky-500" />}
                  {att.kind === "pdf" && <FileText className="h-3.5 w-3.5 text-rose-500" />}
                  {att.kind === "audio" && <Mic className="h-3.5 w-3.5 text-emerald-500 animate-pulse" />}
                  <span className="font-semibold text-slate-800 dark:text-slate-200 max-w-[120px] truncate text-[11px]">
                    {att.kind === "audio" ? (lang === "ar" ? "تسجيل صوتي" : "Voice Note") : att.name}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeAttachment(att.id)}
                    className="text-slate-400 hover:text-rose-500 p-0.5"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Active Voice Recording Live Bar */}
          {recording && (
            <div className="px-3.5 py-2.5 bg-rose-50 dark:bg-rose-950/40 border-t border-rose-200 dark:border-rose-900/40 flex items-center justify-between gap-3 animate-pulse">
              <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400 text-xs font-bold min-w-0">
                <span className="h-2.5 w-2.5 rounded-full bg-rose-500 animate-ping shrink-0" />
                <Mic className="h-4 w-4 shrink-0" />
                <span className="truncate">
                  {lang === "ar" ? "جاري تسجيل صوتك..." : "Recording voice query..."}
                </span>
                <span className="font-mono bg-rose-200/60 dark:bg-rose-900/60 px-2 py-0.5 rounded text-[11px] text-rose-800 dark:text-rose-200 shrink-0">
                  {Math.floor(recordSeconds / 60)}:{(recordSeconds % 60).toString().padStart(2, "0")}
                </span>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={cancelRecording}
                  className="px-2.5 py-1 rounded-xl bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[11px] font-semibold transition-colors cursor-pointer"
                >
                  {lang === "ar" ? "إلغاء" : "Cancel"}
                </button>
                <button
                  type="button"
                  onClick={stopRecording}
                  className="flex items-center gap-1 px-3 py-1 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-[11px] font-bold shadow-sm transition-colors cursor-pointer"
                >
                  <Square className="h-3 w-3 fill-current" />
                  <span>{lang === "ar" ? "إيقاف واعتماد" : "Done"}</span>
                </button>
              </div>
            </div>
          )}

          {/* Input & Action Dock */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="p-3 border-t border-slate-200/80 dark:border-white/10 flex items-center gap-2 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl"
          >
            {/* Hidden File Input */}
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*,application/pdf,audio/*"
              className="hidden"
              onChange={handleFileSelect}
            />

            {/* Attach Photo / PDF / Audio button */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={busy}
              title={lang === "ar" ? "إرفاق صورة أو PDF أو ملف صوتي" : "Attach Photo, PDF, or Audio"}
              className="p-2.5 rounded-2xl border border-slate-200 dark:border-white/10 hover:border-indigo-500 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/30 text-slate-600 dark:text-slate-300 transition-colors shrink-0 disabled:opacity-50 cursor-pointer"
            >
              <Paperclip className="h-4 w-4" />
            </button>

            {/* Record Voice Button */}
            <button
              type="button"
              onClick={recording ? stopRecording : startRecording}
              disabled={busy}
              title={
                recording
                  ? lang === "ar"
                    ? "إيقاف التسجيل"
                    : "Stop recording"
                  : lang === "ar"
                  ? "تسجيل استفسار صوتي"
                  : "Record voice query"
              }
              className={`p-2.5 rounded-2xl border transition-all shrink-0 cursor-pointer ${
                recording
                  ? "border-rose-500 bg-rose-500 text-white shadow-md shadow-rose-500/30 animate-pulse"
                  : "border-slate-200 dark:border-white/10 hover:border-emerald-500 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/30 text-slate-600 dark:text-slate-300"
              }`}
            >
              <Mic className="h-4 w-4" />
            </button>

            {/* Text Input */}
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={busy}
              placeholder={
                lang === "ar"
                  ? "اسأل المساعد الذكي، اطلب تلخيصاً، أو أرفق صورة/PDF..."
                  : "Ask AI anything, request summaries, or attach photos/PDFs..."
              }
              className="flex-1 px-3.5 py-2.5 rounded-2xl glass-input text-xs sm:text-[13px]"
            />

            {/* Send Button */}
            <button
              type="submit"
              disabled={busy || (!input.trim() && attachments.length === 0)}
              className="p-2.5 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-md shadow-indigo-600/30 transition-all disabled:opacity-40 shrink-0 cursor-pointer"
              aria-label="Send message"
            >
              <Send className="h-4 w-4 rtl:rotate-180" />
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
