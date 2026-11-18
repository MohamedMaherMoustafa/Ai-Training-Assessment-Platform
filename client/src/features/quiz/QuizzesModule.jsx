import { useEffect, useState, useRef } from "react";
import { useTranslation } from "react-i18next";
import axios from "axios";
import toast from "react-hot-toast";
import {
  Sparkles,
  CheckCircle2,
  Plus,
  Trash2,
  Play,
  Send,
  Edit3,
  Clock,
  XCircle,
  Lock,
  RotateCcw,
  UserCheck,
  UserX,
  ShieldAlert,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import {
  approveQuizRetake,
  createQuiz,
  deleteQuiz,
  listCourses,
  listQuizAccess,
  listQuizzes,
  markQuizEntered,
  markQuizSubmitted,
  markQuizCheatingTerminated,
  rejectQuizRetake,
  requestQuizRetake,
  submitQuizAttempt,
  updateQuiz,
} from "../../services/platformService";
import { useAuth } from "../../context/AuthContext";
import { useLang } from "../../context/LangContext";
import { usePopup } from "../../context/PopupContext";

const EMPTY_QUESTION = () => ({
  id: `q_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
  text: "",
  allowMultiple: false,
  options: [
    { id: "a", text: "" },
    { id: "b", text: "" },
    { id: "c", text: "" },
    { id: "d", text: "" },
  ],
  correctOptionId: "a",
  correctOptionIds: ["a"],
});

function getCorrectIds(q) {
  if (Array.isArray(q.correctOptionIds) && q.correctOptionIds.length > 0) {
    return q.correctOptionIds;
  }
  return q.correctOptionId ? [q.correctOptionId] : ["a"];
}

export default function QuizzesModule({ mode = "admin", activeInstructorId = null }) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { lang } = useLang();
  const { showPopup } = usePopup();

  const lastViolationTimeRef = useRef(0);
  const strikeCountRef = useRef(0);
  const privacyRestrictedRef = useRef(false);
  const resumeGraceUntilRef = useRef(0);

  const [quizzes, setQuizzes] = useState([]);
  const [courses, setCourses] = useState([]);
  const [quizAccess, setQuizAccess] = useState({});
  const [loading, setLoading] = useState(true);
  const [showBuilder, setShowBuilder] = useState(false);
  const [editingQuizId, setEditingQuizId] = useState(null);

  const [courseId, setCourseId] = useState("");
  const [lessonId, setLessonId] = useState("");
  const [quizTitle, setQuizTitle] = useState("");
  const [durationMinutes, setDurationMinutes] = useState(10);
  const [questions, setQuestions] = useState([EMPTY_QUESTION()]);
  const [draftingAI, setDraftingAI] = useState(null);

  // Student quiz player + timer + instant review
  const [activeQuiz, setActiveQuiz] = useState(null);
  const [answers, setAnswers] = useState({});
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [submittingQuiz, setSubmittingQuiz] = useState(false);
  const [lastReview, setLastReview] = useState(null);
  const [privacyRestricted, setPrivacyRestricted] = useState(false);
  const [privacyCount, setPrivacyCount] = useState(0);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [allQuizzes, allCourses, accessMap] = await Promise.all([
        listQuizzes(),
        listCourses(),
        listQuizAccess(),
      ]);
      setQuizAccess(accessMap || {});

      if (mode === "instructor") {
        const myCourses = allCourses.filter((c) => c.instructorId === user.uid);
        const myCourseIds = myCourses.map((c) => c.id);
        setCourses(myCourses);
        setQuizzes(allQuizzes.filter((q) => myCourseIds.includes(q.courseId)));
      } else if (mode === "student") {
        const targetInst = activeInstructorId
          ? [activeInstructorId]
          : user?.instructorIds || [];
        const enrolledCourses = allCourses.filter((c) => {
          const matchesInst = targetInst.length === 0 || targetInst.includes(c.instructorId);
          const isEnrolled = Array.isArray(c.enrolledStudents) && c.enrolledStudents.includes(user?.uid);
          return matchesInst && isEnrolled;
        });
        const enrolledIds = enrolledCourses.map((c) => c.id);
        setCourses(enrolledCourses);
        setQuizzes(
          allQuizzes.filter((q) => q.status === "published" && enrolledIds.includes(q.courseId))
        );
      } else {
        setCourses(allCourses);
        setQuizzes(allQuizzes);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, [mode, user?.uid, activeInstructorId]);

  // Countdown timer when student takes a quiz
  useEffect(() => {
    if (!activeQuiz || secondsLeft <= 0) return undefined;
    const timer = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleStudentSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [activeQuiz, secondsLeft]);

  // Helper to destroy and overwrite Windows clipboard to prevent pasting captured screenshots or text
  const destroyClipboard = () => {
    const notice =
      "⚠️ محتوى الاختبار محمي — تم حجب لقطة الشاشة ومنعها بواسطة منصة أثر التعليمية\nAssessment Content Protected — Screenshots are strictly blocked by Athar Educational Platform.";
    try {
      if (navigator.clipboard?.writeText) {
        navigator.clipboard.writeText(notice).catch(() => {});
      }
    } catch {}
    try {
      const dummy = document.createElement("textarea");
      dummy.value = notice;
      dummy.style.position = "fixed";
      dummy.style.opacity = "0";
      dummy.style.left = "-9999px";
      document.body.appendChild(dummy);
      dummy.focus();
      dummy.select();
      document.execCommand("copy");
      document.body.removeChild(dummy);
    } catch {}
  };

  // Anti-Screenshot & Cheating Protection (Closes quiz immediately on 2nd violation without submitting)
  const handlePrivacyViolation = async (reason = "shortcut") => {
    if (!activeQuiz) return;

    // Immediately apply synchronous privacy blackout to DOM before anything else
    document.body.classList.add("quiz-privacy-obscured");
    destroyClipboard();

    // 1. If warning overlay is ALREADY displayed, ignore all subsequent events!
    if (privacyRestrictedRef.current) return;

    const now = Date.now();
    // 2. Ignore any strike triggers during the resume grace period (12s cooldown after clicking Resume)
    // This completely prevents Windows notification toasts / closing Snipping Tool from locking the quiz!
    if (now < resumeGraceUntilRef.current) return;

    // 3. Debounce cooldown: ignore duplicate triggers fired within 8 seconds
    if (now - lastViolationTimeRef.current < 8000) return;
    lastViolationTimeRef.current = now;

    // 4. Wipe clipboard to destroy any captured image or text data
    destroyClipboard();

    // 5. Increment atomic strike count (Strict 2-attempt limit)
    const nextStrikes = strikeCountRef.current + 1;
    strikeCountRef.current = nextStrikes;
    setPrivacyCount(nextStrikes);

    if (nextStrikes >= 2) {
      // Reached 2 distinct violations: IMMEDIATELY close quiz without submitting
      privacyRestrictedRef.current = false;
      document.body.classList.remove("quiz-privacy-obscured");
      const quizToTerminate = activeQuiz;
      setActiveQuiz(null);
      setAnswers({});
      setPrivacyRestricted(false);
      setPrivacyCount(0);
      strikeCountRef.current = 0;

      try {
        await markQuizCheatingTerminated(quizToTerminate.id, user.uid, {
          studentName: user.displayName || user.email,
          quizTitle: quizToTerminate.title,
          courseId: quizToTerminate.courseId,
          instructorId: quizToTerminate.instructorId,
        });
        await loadAll();
      } catch (err) {
        console.error("Failed to mark cheating status:", err);
      }

      showPopup({
        type: "error",
        title: lang === "ar" ? "تم إنهاء الاختبار لمحاولة الغش" : "Quiz Terminated (Cheating Violation)",
        message:
          lang === "ar"
            ? "تم إغلاق الاختبار فوراً وإلغاء محاولتك دون إرسال الإجابات بسبب تكرار محاولة تصوير الشاشة (مخالفة 2 من 2). لا يمكنك إعادة الاختبار إلا بعد مراجعة وموافقة المحاضر."
            : "Your quiz has been closed immediately and cancelled without submitting because screenshot attempts were detected (Attempt 2 of 2). You cannot re-enter without instructor approval.",
        confirmLabel: lang === "ar" ? "أدركت ذلك" : "I Understand",
      });

      toast.error(
        lang === "ar"
          ? "تم إغلاق الاختبار وإلغاؤه لمحاولة تصوير الشاشة (2/2)!"
          : "Quiz terminated without submitting due to repeated screenshot attempts (2/2)!"
      );
    } else {
      // Strike 1: Show blackout privacy screen & warning (Attempt 1 of 2)
      privacyRestrictedRef.current = true;
      setPrivacyRestricted(true);
      toast.error(
        lang === "ar"
          ? `تحذير (المحاولة ${nextStrikes}/2): محاولة تصوير الشاشة محظورة! تم حجب المحتوى لحماية خصوصية الاختبار.`
          : `Warning (Attempt ${nextStrikes}/2): Taking screenshots is prohibited! Content has been privacy-shielded.`
      );
    }
  };

  const handleResumeFromWarning = () => {
    privacyRestrictedRef.current = false;
    setPrivacyRestricted(false);
    document.body.classList.remove("quiz-privacy-obscured");
    // Generous 12-second grace period: prevents Snipping Tool notifications or closing toasts from locking the quiz!
    resumeGraceUntilRef.current = Date.now() + 12000;
    lastViolationTimeRef.current = Date.now();
  };

  // Anti-Screenshot & Content Privacy Restriction listeners while a quiz is active
  useEffect(() => {
    if (!activeQuiz) {
      document.body.classList.remove("quiz-privacy-obscured");
      return undefined;
    }

    const handleKeyCapture = (e) => {
      const k = (e.key || "").toLowerCase();
      const code = e.code || "";
      const isPrintScreen = e.key === "PrintScreen" || code === "PrintScreen" || e.keyCode === 44;
      const isWinSnip = (e.metaKey || e.ctrlKey) && e.shiftKey && k === "s";
      const isMacSnip = e.metaKey && e.shiftKey && ["3", "4", "5"].includes(k);
      const isPrintOrSave = (e.ctrlKey || e.metaKey) && (k === "p" || k === "s");
      const isDevTools =
        e.key === "F12" || ((e.ctrlKey || e.metaKey) && e.shiftKey && k === "i");
      const isMetaKey = e.key === "Meta" || e.keyCode === 91 || e.keyCode === 92;
      const isAltKey = e.key === "Alt" || e.keyCode === 18;

      // INSTANT PREEMPTIVE SYNCHRONOUS SHIELD:
      // When Win key, PrintScreen, or capture combination is touched, hide questions in 0ms!
      if (isPrintScreen || isWinSnip || isMacSnip || isPrintOrSave || isDevTools || isMetaKey || (isAltKey && isPrintScreen)) {
        document.body.classList.add("quiz-privacy-obscured");
        destroyClipboard();
      }

      if (isPrintScreen || isWinSnip || isMacSnip || isPrintOrSave || isDevTools) {
        e.preventDefault();
        e.stopPropagation();
        handlePrivacyViolation("key_shortcut");
      }
    };

    const handleKeyUpCapture = (e) => {
      const code = e.code || "";
      const isPrintScreen = e.key === "PrintScreen" || code === "PrintScreen" || e.keyCode === 44;
      if (isPrintScreen) {
        // When PrintScreen is released (the primary event Chrome reliably fires on Windows for PrtScn):
        document.body.classList.add("quiz-privacy-obscured");
        destroyClipboard();
        handlePrivacyViolation("print_screen");
      }
    };

    const handleVisibility = () => {
      if (document.hidden) {
        document.body.classList.add("quiz-privacy-obscured");
        destroyClipboard();
        handlePrivacyViolation("visibility_hidden");
      }
    };

    const handleWindowBlur = () => {
      // Synchronously mask quiz before OS snip overlay can grab canvas
      document.body.classList.add("quiz-privacy-obscured");
      destroyClipboard();
      handlePrivacyViolation("window_blur");
    };

    const handleCopyAttempt = (e) => {
      e.preventDefault();
      destroyClipboard();
      handlePrivacyViolation("clipboard_copy");
    };

    window.addEventListener("keydown", handleKeyCapture, true);
    window.addEventListener("keyup", handleKeyUpCapture, true);
    window.addEventListener("blur", handleWindowBlur);
    window.addEventListener("copy", handleCopyAttempt, true);
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      document.body.classList.remove("quiz-privacy-obscured");
      window.removeEventListener("keydown", handleKeyCapture, true);
      window.removeEventListener("keyup", handleKeyUpCapture, true);
      window.removeEventListener("blur", handleWindowBlur);
      window.removeEventListener("copy", handleCopyAttempt, true);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [activeQuiz]);

  const selectedCourse = courses.find((c) => c.id === courseId);

  const handleDraftWithAI = async (count = 10) => {
    const lesson = selectedCourse?.lessons?.find((l) => l.id === lessonId);
    const text = lesson?.content || selectedCourse?.description?.[lang] || "";
    if (!text || text.trim().length < 20) {
      toast.error(
        lang === "ar"
          ? "اختر درساً يحتوي على محتوى أولاً ليتمكن ذكاء المنصة من توليد الأسئلة منه."
          : "Select a lesson with content first so Platform AI has text to draft from."
      );
      return;
    }
    setDraftingAI(count);
    try {
      const res = await axios.post(
        "http://localhost:3001/api/quiz/generate",
        { text, lang, courseId, count },
        { timeout: 120000 }
      );
      if (Array.isArray(res.data?.questions) && res.data.questions.length > 0) {
        setQuestions(
          res.data.questions.map((q) => ({
            ...q,
            allowMultiple: Boolean(q.allowMultiple) || getCorrectIds(q).length > 1,
            correctOptionIds: getCorrectIds(q),
          }))
        );
        toast.success(
          lang === "ar"
            ? `قام ذكاء المنصة بتوليد ${res.data.questions.length} سؤال اختيار من متعدد!`
            : `Platform AI drafted ${res.data.questions.length} MCQs!`
        );
      }
    } catch {
      toast.error(
        lang === "ar"
          ? "خدمة ذكاء المنصة غير متصلة حالياً — يمكنك إضافة الأسئلة يدوياً."
          : "Platform AI service is offline right now — you can still add questions manually."
      );
    } finally {
      setDraftingAI(null);
    }
  };

  const resetBuilder = () => {
    setShowBuilder(false);
    setEditingQuizId(null);
    setCourseId("");
    setLessonId("");
    setQuizTitle("");
    setDurationMinutes(10);
    setQuestions([EMPTY_QUESTION()]);
  };

  const startEditQuiz = (qz) => {
    setEditingQuizId(qz.id);
    setCourseId(qz.courseId || "");
    setLessonId(qz.lessonId || "");
    setQuizTitle(qz.title || "");
    setDurationMinutes(qz.durationMinutes || 10);
    setQuestions(
      Array.isArray(qz.questions) && qz.questions.length > 0
        ? qz.questions.map((q) => ({
            ...q,
            allowMultiple: Boolean(q.allowMultiple) || getCorrectIds(q).length > 1,
            correctOptionIds: getCorrectIds(q),
          }))
        : [EMPTY_QUESTION()]
    );
    setShowBuilder(true);
  };

  const toggleQuestionMode = (qIdx) => {
    const next = [...questions];
    const q = next[qIdx];
    const nextAllow = !q.allowMultiple;
    const currentIds = getCorrectIds(q);
    next[qIdx] = {
      ...q,
      allowMultiple: nextAllow,
      correctOptionIds: nextAllow ? currentIds : [currentIds[0] || "a"],
      correctOptionId: currentIds[0] || "a",
    };
    setQuestions(next);
  };

  const toggleCorrectOption = (qIdx, optId) => {
    const next = [...questions];
    const q = next[qIdx];
    if (q.allowMultiple) {
      const current = getCorrectIds(q);
      let updated = current.includes(optId)
        ? current.filter((id) => id !== optId)
        : [...current, optId];
      if (updated.length === 0) updated = [optId];
      next[qIdx] = {
        ...q,
        correctOptionIds: updated,
        correctOptionId: updated[0],
      };
    } else {
      next[qIdx] = {
        ...q,
        correctOptionId: optId,
        correctOptionIds: [optId],
      };
    }
    setQuestions(next);
  };

  const handleSaveQuiz = async (e) => {
    e.preventDefault();
    if (!courseId || !quizTitle.trim()) return;

    const cleanQuestions = questions.map((q) => {
      const ids = getCorrectIds(q);
      return {
        ...q,
        allowMultiple: Boolean(q.allowMultiple) || ids.length > 1,
        correctOptionIds: ids,
        correctOptionId: ids[0] || "a",
      };
    });

    if (editingQuizId) {
      await updateQuiz(editingQuizId, {
        courseId,
        lessonId,
        title: quizTitle.trim(),
        durationMinutes: Number(durationMinutes) || 10,
        questions: cleanQuestions,
      });
      toast.success("Quiz updated!");
    } else {
      await createQuiz({
        courseId,
        lessonId,
        title: quizTitle.trim(),
        durationMinutes: Number(durationMinutes) || 10,
        instructorId: selectedCourse?.instructorId || user.uid,
        questions: cleanQuestions,
        status: "draft",
      });
      toast.success("Quiz draft saved!");
    }
    resetBuilder();
    await loadAll();
  };

  const handlePublish = async (quizId) => {
    await updateQuiz(quizId, { status: "published" });
    toast.success("Quiz approved & published!");
    await loadAll();
  };

  const handleDelete = async (quizId) => {
    await deleteQuiz(quizId);
    toast.success("Quiz deleted");
    await loadAll();
  };

  const startQuizAttempt = async (qz) => {
    const access = quizAccess[qz.id]?.[user.uid];
    if (access && access.retakeStatus !== "approved") {
      if (access.status === "terminated_cheating") {
        toast.error(
          lang === "ar"
            ? "تم إلغاء هذا الاختبار مسبقاً لمحاولة الغش (تصوير الشاشة). أرسل طلب إعادة اختبار للمحاضر أولاً."
            : "This quiz was terminated for screenshot cheating. Send a retake request to your instructor first."
        );
      } else {
        toast.error(
          lang === "ar"
            ? "لقد دخلت هذا الاختبار مسبقاً. اطلب إعادة المحاولة من المحاضر."
            : "You already entered this quiz. Send a retake request to your instructor first."
        );
      }
      return;
    }

    await markQuizEntered(qz.id, user.uid, {
      studentName: user.displayName || user.email,
      quizTitle: qz.title,
      courseId: qz.courseId,
      instructorId: qz.instructorId,
    });
    await loadAll();

    strikeCountRef.current = 0;
    privacyRestrictedRef.current = false;
    lastViolationTimeRef.current = 0;
    resumeGraceUntilRef.current = Date.now() + 1500;
    setLastReview(null);
    setPrivacyRestricted(false);
    setPrivacyCount(0);
    setActiveQuiz(qz);
    setAnswers({});
    setSecondsLeft(Math.max((Number(qz.durationMinutes) || 10) * 60, 60));
  };

  const handleRequestRetake = async (qz) => {
    await requestQuizRetake(qz.id, user.uid, {
      studentName: user.displayName || user.email,
      quizTitle: qz.title,
      courseId: qz.courseId,
      instructorId: qz.instructorId,
    });
    toast.success(
      lang === "ar"
        ? "تم إرسال طلب إعادة الاختبار للمحاضر!"
        : "Retake request sent to instructor!"
    );
    await loadAll();
  };

  const handleApproveRetake = async (quizId, studentId) => {
    await approveQuizRetake(quizId, studentId);
    toast.success(lang === "ar" ? "تم قبول طلب إعادة الاختبار!" : "Retake request approved!");
    await loadAll();
  };

  const handleRejectRetake = async (quizId, studentId) => {
    await rejectQuizRetake(quizId, studentId);
    toast.success(lang === "ar" ? "تم رفض طلب إعادة الاختبار" : "Retake request declined");
    await loadAll();
  };

  const toggleStudentAnswer = (q, optId) => {
    const multi = Boolean(q.allowMultiple) || getCorrectIds(q).length > 1;
    if (multi) {
      const current = Array.isArray(answers[q.id]) ? answers[q.id] : [];
      const updated = current.includes(optId)
        ? current.filter((id) => id !== optId)
        : [...current, optId];
      setAnswers({ ...answers, [q.id]: updated });
    } else {
      setAnswers({ ...answers, [q.id]: [optId] });
    }
  };

  const handleStudentSubmit = async () => {
    if (!activeQuiz || submittingQuiz) return;
    setSubmittingQuiz(true);
    try {
      const qs = activeQuiz.questions || [];
      let correctCount = 0;
      const wrong = [];
      const breakdown = qs.map((q) => {
        const expected = [...getCorrectIds(q)].sort();
        const rawChosen = answers[q.id];
        const chosen = (
          Array.isArray(rawChosen) ? rawChosen : rawChosen ? [rawChosen] : []
        ).sort();
        const isCorrect =
          expected.length === chosen.length &&
          expected.every((val, idx) => val === chosen[idx]);

        const chosenText =
          chosen.length > 0
            ? chosen
                .map((id) => q.options?.find((o) => o.id === id)?.text || id)
                .join(", ")
            : "No answer";
        const correctText = expected
          .map((id) => q.options?.find((o) => o.id === id)?.text || id)
          .join(", ");

        if (isCorrect) {
          correctCount += 1;
        } else {
          wrong.push({ question: q.text, correctAnswer: correctText, studentAnswer: chosenText });
        }
        return {
          id: q.id,
          question: q.text,
          chosenText,
          correctText,
          isCorrect,
        };
      });
      const scorePct = qs.length > 0 ? Math.round((correctCount / qs.length) * 100) : 0;

      let aiFeedback =
        wrong.length === 0
          ? lang === "ar"
            ? "أداء ممتاز! أجبت على جميع الأسئلة بشكل صحيح."
            : "Excellent work! You answered all questions correctly."
          : lang === "ar"
          ? `راجِع النقاط التي أخطأت فيها (${wrong.length} أسئلة) وراجع محتوى الدرس قبل المحاولة التالية.`
          : `Review the ${wrong.length} missed concept(s) in the lesson notes before your next attempt.`;

      try {
        const fbRes = await axios.post(
          "http://localhost:3001/api/feedback",
          { lang, score: correctCount, totalQuestions: qs.length, wrongAnswers: wrong },
          { timeout: 15000 }
        );
        if (fbRes.data?.feedback) aiFeedback = fbRes.data.feedback;
      } catch {
        // fallback preserved
      }

      await submitQuizAttempt({
        studentId: user.uid,
        studentName: user.displayName || user.email,
        quizId: activeQuiz.id,
        quizTitle: activeQuiz.title,
        courseId: activeQuiz.courseId,
        instructorId: activeQuiz.instructorId,
        score: scorePct,
        points: correctCount,
        total: qs.length,
        answers,
        aiFeedback,
      });
      await markQuizSubmitted(activeQuiz.id, user.uid);

      setLastReview({
        title: activeQuiz.title,
        score: scorePct,
        correctCount,
        total: qs.length,
        aiFeedback,
        breakdown,
      });
      toast.success(
        lang === "ar"
          ? `تم تسليم الاختبار! النقاط: ${correctCount} / ${qs.length}`
          : `Quiz submitted! Points: ${correctCount} / ${qs.length} pts`
      );
      setActiveQuiz(null);
      setAnswers({});
      setSecondsLeft(0);
      await loadAll();
    } finally {
      setSubmittingQuiz(false);
    }
  };

  const canManage = mode === "admin" || mode === "instructor";

  // Collect pending retake requests for instructor/admin
  const pendingRetakes = [];
  if (canManage) {
    const visibleQuizIds = quizzes.map((q) => q.id);
    Object.entries(quizAccess).forEach(([qId, studentsMap]) => {
      if (!visibleQuizIds.includes(qId)) return;
      Object.entries(studentsMap || {}).forEach(([sId, info]) => {
        if (info?.retakeStatus === "pending") {
          pendingRetakes.push({ quizId: qId, studentId: sId, ...info });
        }
      });
    });
  }

  const formatTime = (sec) => {
    const m = String(Math.floor(sec / 60)).padStart(2, "0");
    const s = String(sec % 60).padStart(2, "0");
    return `${m}:${s}`;
  };

  return (
    <div className="space-y-6">
      <div className="glass-panel rounded-[26px] p-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-amber-500 via-orange-500 to-rose-500 text-white flex items-center justify-center shadow-lg shadow-orange-500/25">
            <Sparkles className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl font-black">
              {mode === "student" ? t("nav.myQuizzes") : t("nav.quizzes")}
            </h1>
            <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
              {mode === "student"
                ? "Published quizzes from your selected instructors (single entry unless retake approved)."
                : "Draft quizzes with Platform AI or manually, set timer in minutes & single/multiple answers, then approve & publish."}
            </p>
          </div>
        </div>

        {canManage && (
          <button
            onClick={() => (showBuilder ? resetBuilder() : setShowBuilder(true))}
            className="glass-btn-primary flex items-center gap-2 px-4 py-2 rounded-xl text-sm"
          >
            <Plus className="h-4 w-4" />
            {t("quizzes.createQuiz")}
          </button>
        )}
      </div>

      {/* Instructor Pending Retake Requests */}
      {canManage && pendingRetakes.length > 0 && (
        <div className="glass-card border-amber-400/50 dark:border-amber-500/30 overflow-hidden">
          <div className="px-5 py-3 bg-amber-500/15 border-b border-amber-400/30 font-bold text-sm text-amber-900 dark:text-amber-200 flex items-center gap-2">
            <RotateCcw className="h-4 w-4" />
            {lang === "ar"
              ? `طلبات إعادة الاختبار المعلقة (${pendingRetakes.length})`
              : `Quiz Retake Requests (${pendingRetakes.length})`}
          </div>
          <div className="divide-y divide-white/40 dark:divide-white/10">
            {pendingRetakes.map((req) => (
              <div
                key={`${req.quizId}_${req.studentId}`}
                className="px-5 py-3 flex flex-wrap items-center justify-between gap-3 text-xs"
              >
                <div>
                  <div className="font-bold text-sm">{req.studentName || req.studentId}</div>
                  <div className="text-slate-500">Quiz: {req.quizTitle || req.quizId}</div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleApproveRetake(req.quizId, req.studentId)}
                    className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold flex items-center gap-1"
                  >
                    <UserCheck className="h-3.5 w-3.5" />
                    {lang === "ar" ? "قبول" : "Accept"}
                  </button>
                  <button
                    onClick={() => handleRejectRetake(req.quizId, req.studentId)}
                    className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-semibold flex items-center gap-1"
                  >
                    <UserX className="h-3.5 w-3.5" />
                    {lang === "ar" ? "رفض" : "Decline"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quiz Builder */}
      {showBuilder && canManage && (
        <form onSubmit={handleSaveQuiz} autoComplete="off" className="glass-form-card p-6 sm:p-7 space-y-6">
          <div className="flex items-center gap-3 pb-3 border-b border-slate-200/60 dark:border-white/10">
            <div className="h-10 w-10 rounded-2xl bg-gradient-to-tr from-violet-600 to-fuchsia-600 text-white flex items-center justify-center shadow-md shadow-violet-500/20">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                {editingQuizId
                  ? lang === "ar"
                    ? "تعديل الاختبار"
                    : "Edit Quiz"
                  : lang === "ar"
                  ? "إنشاء اختبار تفاعلي جديد"
                  : "Create New Interactive Quiz"}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {lang === "ar"
                  ? "قم بصياغة الأسئلة يدوياً أو بواسطة الذكاء الاصطناعي وحدد مدة المؤقت"
                  : "Draft MCQ questions with Platform AI or manually, set timer and correct answers"}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 sm:gap-5">
            <div>
              <label className="glass-form-label">{t("quizzes.course")}</label>
              <select
                required
                value={courseId}
                onChange={(e) => {
                  setCourseId(e.target.value);
                  setLessonId("");
                }}
                className="w-full px-3.5 py-2.5 glass-input text-sm"
              >
                <option value="">-- Select Course --</option>
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title?.[lang] || c.title?.en}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="glass-form-label">{t("quizzes.lesson")}</label>
              <select
                value={lessonId}
                onChange={(e) => setLessonId(e.target.value)}
                className="w-full px-3.5 py-2.5 glass-input text-sm"
              >
                <option value="">-- Optional Lesson --</option>
                {(selectedCourse?.lessons || []).map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.title?.[lang] || l.title?.en}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="glass-form-label">{t("quizzes.quizTitle")}</label>
              <input
                required
                value={quizTitle}
                onChange={(e) => setQuizTitle(e.target.value)}
                placeholder="e.g. Midterm Assessment"
                className="w-full px-3.5 py-2.5 glass-input text-sm"
              />
            </div>
            <div>
              <label className="glass-form-label">
                {lang === "ar" ? "الوقت (بالدقائق)" : "Timer (Minutes)"}
              </label>
              <input
                type="number"
                min={1}
                max={180}
                required
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(e.target.value)}
                className="w-full px-3.5 py-2.5 glass-input text-sm font-bold"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 pt-1">
            {/* Draft 10 Questions */}
            <button
              type="button"
              onClick={() => handleDraftWithAI(10)}
              disabled={Boolean(draftingAI)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-500 hover:to-pink-500 text-white text-xs font-bold shadow-lg shadow-purple-500/25 active:scale-95 transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
              title={
                lang === "ar"
                  ? "توليد 10 أسئلة اختيار من متعدد بواسطة ذكاء المنصة"
                  : "Draft 10 MCQs with Platform AI"
              }
            >
              {draftingAI === 10 ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              {draftingAI === 10 ? (
                <span>{lang === "ar" ? "جارٍ التوليد (10)..." : "Drafting 10..."}</span>
              ) : (
                <span>{t("quizzes.draft10WithAI") || "Draft 10 Questions with AI"}</span>
              )}
            </button>

            {/* Draft 15 Questions */}
            <button
              type="button"
              onClick={() => handleDraftWithAI(15)}
              disabled={Boolean(draftingAI)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-violet-600 via-fuchsia-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white text-xs font-bold shadow-lg shadow-violet-500/25 active:scale-95 transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
              title={
                lang === "ar"
                  ? "توليد 15 سؤالاً اختيار من متعدد بواسطة ذكاء المنصة"
                  : "Draft 15 MCQs with Platform AI"
              }
            >
              {draftingAI === 15 ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              {draftingAI === 15 ? (
                <span>{lang === "ar" ? "جارٍ التوليد (15)..." : "Drafting 15..."}</span>
              ) : (
                <span>{t("quizzes.draft15WithAI") || "Draft 15 Questions with AI"}</span>
              )}
            </button>

            {/* Draft 20 Questions */}
            <button
              type="button"
              onClick={() => handleDraftWithAI(20)}
              disabled={Boolean(draftingAI)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-purple-600 via-pink-600 to-rose-600 hover:from-purple-500 hover:to-rose-500 text-white text-xs font-bold shadow-lg shadow-pink-500/25 active:scale-95 transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
              title={
                lang === "ar"
                  ? "توليد 20 سؤالاً اختيار من متعدد بواسطة ذكاء المنصة"
                  : "Draft 20 MCQs with Platform AI"
              }
            >
              {draftingAI === 20 ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              {draftingAI === 20 ? (
                <span>{lang === "ar" ? "جارٍ التوليد (20)..." : "Drafting 20..."}</span>
              ) : (
                <span>{t("quizzes.draft20WithAI") || "Draft 20 Questions with AI"}</span>
              )}
            </button>

            {/* Manual Add Question */}
            <button
              type="button"
              onClick={() => setQuestions((prev) => [...prev, EMPTY_QUESTION()])}
              className="glass-btn-secondary flex items-center gap-1.5 px-4 py-2.5 rounded-2xl text-xs font-bold cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />
              {t("quizzes.addQuestion")}
            </button>
          </div>

          <div className="space-y-4">
            {questions.map((q, idx) => {
              const correctIds = getCorrectIds(q);
              const isMulti = Boolean(q.allowMultiple) || correctIds.length > 1;
              return (
                <div
                  key={q.id}
                  className="p-5 rounded-2xl glass-subtle space-y-3.5 border border-white/80 dark:border-white/10"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs font-black uppercase tracking-wider text-indigo-700 dark:text-indigo-300">
                      {t("quizzes.questionText")} #{idx + 1}
                    </span>
                    <div className="flex items-center gap-3">
                      <label className="inline-flex items-center gap-1.5 text-xs font-semibold cursor-pointer text-sky-700 dark:text-sky-300">
                        <input
                          type="checkbox"
                          checked={isMulti}
                          onChange={() => toggleQuestionMode(idx)}
                          className="rounded text-indigo-600 focus:ring-indigo-500"
                        />
                        {lang === "ar" ? "أكثر من إجابة صحيحة" : "Multiple Correct Answers"}
                      </label>
                      {questions.length > 1 && (
                        <button
                          type="button"
                          onClick={() => setQuestions((prev) => prev.filter((_, i) => i !== idx))}
                          className="text-xs text-rose-600 dark:text-rose-400 font-semibold hover:underline cursor-pointer"
                        >
                          {t("app.delete")}
                        </button>
                      )}
                    </div>
                  </div>
                  <input
                    required
                    value={q.text}
                    onChange={(e) => {
                      const next = [...questions];
                      next[idx].text = e.target.value;
                      setQuestions(next);
                    }}
                    placeholder="Enter MCQ question..."
                    className="w-full px-3.5 py-2.5 glass-input text-sm"
                  />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {q.options.map((opt, oIdx) => {
                      const checked = correctIds.includes(opt.id);
                      return (
                        <div key={opt.id} className="flex items-center gap-2 p-1.5 rounded-xl bg-white/40 dark:bg-slate-800/40 border border-slate-200/50 dark:border-white/5">
                          <input
                            type={isMulti ? "checkbox" : "radio"}
                            name={`correct_${q.id}`}
                            checked={checked}
                            onChange={() => toggleCorrectOption(idx, opt.id)}
                            className="ms-2 cursor-pointer"
                          />
                          <input
                            required
                            value={opt.text}
                            onChange={(e) => {
                              const next = [...questions];
                              next[idx].options[oIdx].text = e.target.value;
                              setQuestions(next);
                            }}
                            placeholder={`${t("quizzes.option")} ${opt.id.toUpperCase()}`}
                            className="flex-1 px-3 py-1.5 glass-input text-xs"
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-200/60 dark:border-white/10">
            <button
              type="button"
              onClick={resetBuilder}
              className="glass-btn-secondary px-5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold cursor-pointer"
            >
              {t("app.cancel")}
            </button>
            <button
              type="submit"
              className="glass-btn-primary px-6 py-2.5 rounded-xl text-xs sm:text-sm cursor-pointer"
            >
              {t("app.save")}
            </button>
          </div>
        </form>
      )}

      {/* Student Active Quiz Player with Timer & Privacy Protection */}
      {activeQuiz && (
        <>
          <div className="quiz-print-notice">
            {lang === "ar"
              ? "المحتوى محمي — قيود الخصوصية تمنع التصوير أو الطباعة"
              : "Content Privacy Restricted — Screenshots & Printing Are Disabled"}
          </div>

          <div
            onContextMenu={(e) => {
              e.preventDefault();
              handlePrivacyViolation();
            }}
            onCopy={(e) => {
              e.preventDefault();
              handlePrivacyViolation();
            }}
            onCut={(e) => e.preventDefault()}
            className="quiz-privacy-protected relative glass-card border-sky-400/70 p-6 space-y-5 select-none"
          >
            {/* Full-cover Content Privacy Restricted Overlay (High contrast solid dark surface, visible & legible in both light and dark modes) */}
            <div
              className={`quiz-privacy-shield-overlay absolute inset-0 z-50 rounded-2xl flex flex-col items-center justify-center p-6 sm:p-10 text-center space-y-4 ${
                privacyRestricted ? "!flex !opacity-100 !visible" : ""
              }`}
              style={{
                backgroundColor: "#020617",
                color: "#ffffff",
                boxShadow: "inset 0 0 100px rgba(0,0,0,0.85)",
              }}
            >
              <div className="h-16 w-16 sm:h-20 sm:w-20 rounded-3xl bg-rose-500/20 border-2 border-rose-500/60 text-rose-400 flex items-center justify-center shadow-2xl shadow-rose-950/80">
                <ShieldAlert className="h-9 w-9 sm:h-10 sm:w-10 animate-pulse text-rose-400" />
              </div>
              <div className="space-y-3 max-w-xl">
                <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-rose-500/25 border border-rose-400/50 text-rose-300 text-xs font-black tracking-wider uppercase">
                  <Lock className="h-3.5 w-3.5 text-rose-300" />
                  <span>{lang === "ar" ? "حجب محتوى الاختبار — خصوصية مشددة" : "Content Privacy Blocked"}</span>
                </div>
                <h3 className="text-xl sm:text-2xl md:text-3xl font-black tracking-tight text-white drop-shadow-md">
                  {lang === "ar"
                    ? "تم حجب أسئلة الاختبار بواسطة منصة أثر التعليمية"
                    : "Quiz Content Privacy Protected by Athar Educational Platform"}
                </h3>
                <p className="text-xs sm:text-sm text-slate-200 leading-relaxed font-semibold">
                  {lang === "ar"
                    ? "محاولات تصوير الشاشة (Win+Shift+S / PrintScreen) أو مغادرة نافذة الاختبار محظورة تماماً لمنع تسريب الأسئلة أو الغش. تم حجب وتعتيم المحتوى بالكامل."
                    : "Screen capture attempts (Win+Shift+S / PrintScreen) and leaving the test window are strictly prohibited. The assessment content was instantly masked and obscured."}
                </p>

                <div className="p-4 rounded-2xl bg-slate-900/95 border-2 border-rose-500/40 text-white text-xs sm:text-sm font-bold space-y-2 mt-2 shadow-xl text-center">
                  <div className="text-amber-300 font-black text-sm sm:text-base flex items-center justify-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-amber-300 shrink-0" />
                    <span>
                      {lang === "ar"
                        ? `سجل مخالفات الخصوصية: (المحاولة ${privacyCount || 1} من 2)`
                        : `Privacy Warning: Attempt (${privacyCount || 1} of 2)`}
                    </span>
                  </div>
                  <div className="text-[12px] sm:text-xs text-slate-200 font-normal leading-relaxed text-center">
                    {lang === "ar"
                      ? "تنبيه أمان: لديك محاولة تحذيرية واحدة فقط! أي محاولة تصوير أخرى (المحاولة 2 من 2) ستؤدي فوراً إلى إنهاء الاختبار وإلغائه دون تسليم الإجابات كحالة غش!"
                      : "Security Alert: You are allowed only 1 warning! Any second capture attempt (Attempt 2 of 2) will immediately terminate and cancel your test without submission as a cheating violation!"}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={handleResumeFromWarning}
                className="mt-3 px-8 py-3.5 rounded-2xl bg-gradient-to-r from-sky-500 via-indigo-600 to-violet-600 hover:from-sky-400 hover:via-indigo-500 hover:to-violet-500 text-white text-xs sm:text-sm font-black shadow-xl shadow-indigo-600/40 hover:scale-105 active:scale-95 transition-all cursor-pointer border border-white/20"
              >
                {lang === "ar" ? "أدركت ذلك — العودة ومتابعة الاختبار" : "I Understand — Resume Quiz"}
              </button>

              <div className="text-[11px] text-slate-400 font-mono tracking-wide">
                Athar Educational Platform · Anti-Cheat & Screen Protection Active
              </div>
            </div>

            <div className={`quiz-questions-wrapper relative ${privacyRestricted ? "opacity-0 pointer-events-none select-none filter blur-3xl space-y-5" : "space-y-5 transition-all"}`}>
              {/* Security Watermark across the active test canvas */}
              <div className="absolute inset-0 pointer-events-none select-none overflow-hidden opacity-[0.035] dark:opacity-[0.05] flex flex-wrap gap-12 items-center justify-around z-0 rotate-[-12deg]">
                {Array.from({ length: 8 }).map((_, i) => (
                  <span key={i} className="text-xs sm:text-sm font-black tracking-widest uppercase">
                    منصة أثر التعليمية · Athar Platform · {user?.displayName || user?.email || "Student"}
                  </span>
                ))}
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="text-lg font-extrabold">{activeQuiz.title}</h2>
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-600 dark:text-rose-300">
                    <Lock className="h-3 w-3" />
                    {lang === "ar"
                      ? "وضع الخصوصية مفعل — التصوير والنسخ معطلان"
                      : "Privacy Protected — Screenshots, Print & Copy Disabled"}
                  </span>
                </div>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-400/40 text-amber-800 dark:text-amber-200 text-xs font-bold">
                  <Clock className="h-3.5 w-3.5" />
                  {formatTime(secondsLeft)}
                </span>
              </div>

              <div className="space-y-4">
                {(activeQuiz.questions || []).map((q, idx) => {
                  const isMulti = Boolean(q.allowMultiple) || getCorrectIds(q).length > 1;
                  const selectedArr = Array.isArray(answers[q.id])
                    ? answers[q.id]
                    : answers[q.id]
                    ? [answers[q.id]]
                    : [];
                  return (
                    <div key={q.id} className="p-4 rounded-xl glass-subtle space-y-2">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="font-semibold text-sm">
                          {idx + 1}. {q.text}
                        </div>
                        {isMulti && (
                          <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border border-indigo-400/30">
                            {lang === "ar" ? "اختر كل ما ينطبق" : "Select all that apply"}
                          </span>
                        )}
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {(q.options || []).map((opt) => {
                          const active = selectedArr.includes(opt.id);
                          return (
                            <label
                              key={opt.id}
                              className={`flex items-center gap-2 p-2.5 rounded-lg border cursor-pointer text-xs transition-all ${
                                active
                                  ? "bg-sky-500/20 border-sky-500 font-semibold"
                                  : "glass-subtle"
                              }`}
                            >
                              <input
                                type={isMulti ? "checkbox" : "radio"}
                                name={`ans_${q.id}`}
                                checked={active}
                                onChange={() => toggleStudentAnswer(q, opt.id)}
                              />
                              <span>{opt.text}</span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>

              <button
                onClick={handleStudentSubmit}
                disabled={submittingQuiz}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-sm font-semibold shadow-lg flex items-center gap-2 transition-all"
              >
                <Send className="h-4 w-4" />
                {submittingQuiz ? t("app.loading") : t("quizzes.submitQuiz")}
              </button>
            </div>
          </div>
        </>
      )}

      {/* Post-submission Per-Question Breakdown + AI Feedback Popup Modal */}
      {lastReview && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/55 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setLastReview(null)}
        >
          <div
            className="glass-panel border-emerald-400/60 rounded-3xl max-w-2xl w-full max-h-[85vh] overflow-y-auto p-6 space-y-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-extrabold">{lastReview.title}</h2>
                <p className="text-xs font-bold text-sky-600 dark:text-sky-300 mt-0.5">
                  {lang === "ar" ? "النقاط المكتسبة:" : "Points Earned:"}{" "}
                  {lastReview.correctCount} / {lastReview.total}{" "}
                  {lang === "ar" ? "نقطة" : "pts"}{" "}
                  <span className="font-normal text-slate-500">({lastReview.score}%)</span>
                </p>
              </div>
              <button
                onClick={() => setLastReview(null)}
                className="glass-btn-secondary px-3 py-1 rounded-lg text-xs font-semibold"
              >
                Close
              </button>
            </div>

            <div className="p-3.5 rounded-xl bg-sky-500/10 border border-sky-400/30 text-xs text-sky-900 dark:text-sky-200 flex items-start gap-2">
              <Sparkles className="h-4 w-4 text-sky-600 shrink-0 mt-0.5" />
              <div>
                <div className="font-bold mb-0.5">{t("quizzes.aiFeedback")}</div>
                <div className="whitespace-pre-line">{lastReview.aiFeedback}</div>
              </div>
            </div>

            <div className="space-y-2">
              {lastReview.breakdown.map((item, idx) => (
                <div
                  key={item.id}
                  className="p-3 rounded-xl glass-subtle text-xs flex items-start gap-2.5"
                >
                  {item.isCorrect ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                  ) : (
                    <XCircle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
                  )}
                  <div>
                    <div className="font-semibold">
                      {idx + 1}. {item.question}
                    </div>
                    <div className="text-slate-500 mt-0.5">
                      Your answer: <strong>{item.chosenText}</strong> · Correct:{" "}
                      <strong>{item.correctText}</strong>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Quizzes List */}
      {loading ? (
        <div className="text-sm text-slate-500 py-8 text-center">{t("app.loading")}</div>
      ) : quizzes.length === 0 ? (
        <div className="glass-card p-10 text-center text-sm text-slate-500 space-y-1">
          <ClipboardCheck className="h-8 w-8 mx-auto text-slate-400 mb-2 opacity-60" />
          <div className="font-bold">
            {mode === "student"
              ? lang === "ar"
                ? "لا توجد اختبارات منشورة للمقررات المسجل بها حالياً."
                : "No published quizzes available for your enrolled courses."
              : t("app.noData")}
          </div>
          {mode === "student" && (
            <p className="text-xs text-slate-400">
              {lang === "ar"
                ? "سجّل في مقررات المحاضر أولاً من صفحة المقررات لخوض اختباراتها."
                : "Enroll in instructor courses from the Courses tab to take their quizzes."}
            </p>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {quizzes.map((qz) => {
            const c = courses.find((cr) => cr.id === qz.courseId);
            const access = quizAccess[qz.id]?.[user?.uid];
            return (
              <div
                key={qz.id}
                className="glass-card p-5 flex flex-col justify-between gap-4"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-bold text-base">{qz.title}</h3>
                      <p className="text-xs text-slate-500">
                        {c?.title?.[lang] || c?.title?.en || qz.courseId} ·{" "}
                        {(qz.questions || []).length} Qs · {qz.durationMinutes || 10} min
                      </p>
                    </div>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                        qz.status === "published"
                          ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-400/30"
                          : "bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-400/30"
                      }`}
                    >
                      {qz.status === "published" ? t("quizzes.published") : t("quizzes.draft")}
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-end gap-2">
                  {canManage && (
                    <button
                      onClick={() => startEditQuiz(qz)}
                      title={t("app.edit")}
                      className="glass-btn-secondary p-1.5 rounded-lg text-sky-600"
                    >
                      <Edit3 className="h-4 w-4" />
                    </button>
                  )}
                  {canManage && qz.status !== "published" && (
                    <button
                      onClick={() => handlePublish(qz.id)}
                      className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center gap-1"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      {t("quizzes.approvePublish")}
                    </button>
                  )}
                  {canManage && (
                    <button
                      onClick={() => handleDelete(qz.id)}
                      className="glass-btn-secondary p-1.5 rounded-lg text-rose-600"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                  {mode === "student" && (() => {
                    const enrolled = c?.enrolledStudents?.includes(user?.uid);
                    if (!enrolled) {
                      return (
                        <span className="text-xs font-semibold text-amber-600 dark:text-amber-400">
                          {lang === "ar" ? "سجّل في المقرر أولاً لبدء الاختبار" : "Enrol in course first"}
                        </span>
                      );
                    }
                    if (!access || access.retakeStatus === "approved") {
                      return (
                        <button
                          onClick={() => startQuizAttempt(qz)}
                          className="glass-btn-primary px-3.5 py-1.5 rounded-lg text-xs flex items-center gap-1.5"
                        >
                          <Play className="h-3.5 w-3.5" />
                          {t("quizzes.takeQuiz")}
                        </button>
                      );
                    }
                    if (access.retakeStatus === "pending") {
                      return (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-400/30 text-amber-700 dark:text-amber-300 text-xs font-semibold">
                          <Clock className="h-3.5 w-3.5" />
                          {lang === "ar" ? "طلب الإعادة قيد المراجعة" : "Retake Pending Approval"}
                        </span>
                      );
                    }
                    if (access.status === "terminated_cheating") {
                      return (
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/15 border border-rose-400/30 text-rose-700 dark:text-rose-300 text-xs font-semibold">
                            <ShieldAlert className="h-3.5 w-3.5" />
                            {lang === "ar" ? "أُلغي لمحاولة تصوير الشاشة (غش)" : "Terminated (Screenshot Cheating)"}
                          </span>
                          <button
                            onClick={() => handleRequestRetake(qz)}
                            className="glass-btn-secondary px-3 py-1.5 rounded-lg text-xs font-semibold text-amber-700 dark:text-amber-300 flex items-center gap-1.5 cursor-pointer"
                          >
                            <Lock className="h-3.5 w-3.5" />
                            {lang === "ar" ? "طلب إعادة الاختبار" : "Request Retake"}
                          </button>
                        </div>
                      );
                    }
                    return (
                      <button
                        onClick={() => handleRequestRetake(qz)}
                        className="glass-btn-secondary px-3 py-1.5 rounded-lg text-xs font-semibold text-amber-700 dark:text-amber-300 flex items-center gap-1.5"
                      >
                        <Lock className="h-3.5 w-3.5" />
                        {lang === "ar" ? "طلب إعادة الاختبار من المحاضر" : "Request Retake"}
                      </button>
                    );
                  })()}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
