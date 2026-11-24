import { useEffect, useState, useRef } from "react";
import { createPortal } from "react-dom";
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
  ClipboardCheck,
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

const EMPTY_QUESTION = (type = "mcq") => ({
  id: `q_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
  type: type === "theoretical" ? "theoretical" : "mcq",
  text: "",
  allowMultiple: false,
  options:
    type === "theoretical"
      ? []
      : [
          { id: "a", text: "" },
          { id: "b", text: "" },
          { id: "c", text: "" },
          { id: "d", text: "" },
        ],
  correctOptionId: "a",
  correctOptionIds: ["a"],
  modelAnswer: "",
  rubric: [],
  points: 1,
});

/**
 * Calculates recommended quiz duration based on question count, types, and difficulty
 */
function calcAutoQuizTime(qs = [], diff = "medium") {
  const d = String(diff || "medium").toLowerCase();
  const mcqMins = d === "easy" ? 1.0 : d === "hard" ? 2.5 : 1.5;
  const theoMins = d === "easy" ? 2.5 : d === "hard" ? 5.0 : 3.5;

  let total = 0;
  for (const q of qs) {
    if (q.type === "theoretical") total += theoMins;
    else total += mcqMins;
  }
  const minTime = d === "easy" ? 5 : d === "hard" ? 15 : 10;
  return Math.max(Math.ceil(total), minTime);
}

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
  const [difficulty, setDifficulty] = useState("medium");
  const [includeTheoretical, setIncludeTheoretical] = useState(true);
  const [questions, setQuestions] = useState([EMPTY_QUESTION()]);
  const [draftingAI, setDraftingAI] = useState(null);

  // Student quiz player + timer + instant review
  const [activeQuiz, setActiveQuiz] = useState(null);
  const activeQuizRef = useRef(null);
  const handlePrivacyViolationRef = useRef(null);
  const [terminationModal, setTerminationModal] = useState(null);
  const [answers, setAnswers] = useState({});
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [submittingQuiz, setSubmittingQuiz] = useState(false);
  const [lastReview, setLastReview] = useState(null);
  const [privacyRestricted, setPrivacyRestricted] = useState(false);
  const [privacyCount, setPrivacyCount] = useState(0);

  // Webcam Proctoring State
  const camStreamRef = useRef(null);
  const camVideoRef = useRef(null);
  const camDetectorRef = useRef(null);
  const camDetectionLoopRef = useRef(null);
  const camWarningShownRef = useRef(false);
  const isIntentionalStopRef = useRef(false);
  const [camState, setCamState] = useState("idle"); // "idle"|"requesting"|"active"|"denied"|"lost"
  const [showCamPreview, setShowCamPreview] = useState(false);
  const [showCamGate, setShowCamGate] = useState(false);
  const [pendingQuiz, setPendingQuiz] = useState(null);
  const [camWarningVisible, setCamWarningVisible] = useState(false);
  const camGateVideoRef = useRef(null);

  // Multi-person proctoring state
  const [multiPersonCountdown, setMultiPersonCountdown] = useState(null);
  const [detectedPersons, setDetectedPersons] = useState([]);
  const secondPersonActiveRef = useRef(false);
  const secondPersonStartTimeRef = useRef(null);

  useEffect(() => {
    activeQuizRef.current = activeQuiz;
  }, [activeQuiz]);

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

  // Anti-Screenshot & Cheating Protection (Closes quiz immediately on 2nd violation or instant mobile detection)
  const handlePrivacyViolation = async (reason = "shortcut") => {
    const currentQuiz = activeQuizRef.current || activeQuiz;
    if (!currentQuiz) {
      console.warn("handlePrivacyViolation: no active quiz running");
      return;
    }

    // Immediately apply synchronous privacy blackout to DOM before anything else
    document.body.classList.add("quiz-privacy-obscured");
    destroyClipboard();

    const isInstantTermination =
      reason === "mobile_phone_detected" ||
      reason === "camera_covered_detected" ||
      reason === "camera_lost_second" ||
      reason === "camera_unavailable" ||
      reason === "multiple_persons_detected";

    // 1. If warning overlay is ALREADY displayed, ignore duplicate events (unless instant mobile/camera termination)!
    if (privacyRestrictedRef.current && !isInstantTermination) return;

    const now = Date.now();
    // 2. Ignore stray window blur during a short 1.5s window refocus grace period after clicking Resume
    if (reason === "window_blur" && now < resumeGraceUntilRef.current) return;

    // 3. Debounce cooldown: ignore duplicate triggers fired from the same keypress within 1.2s (unless instant termination)
    if (!isInstantTermination && now - lastViolationTimeRef.current < 1200) return;
    lastViolationTimeRef.current = now;

    // 4. Wipe clipboard to destroy any captured image or text data
    destroyClipboard();

    // 5. Increment atomic strike count (Strict 2-attempt limit, backed by sessionStorage)
    const storageKey = `quiz_strikes_${currentQuiz.id}_${user?.uid || "guest"}`;
    const currentStrikes = Math.max(
      strikeCountRef.current,
      Number(sessionStorage.getItem(storageKey)) || 0
    );
    const nextStrikes = isInstantTermination ? 2 : currentStrikes + 1;
    strikeCountRef.current = nextStrikes;
    setPrivacyCount(nextStrikes);
    try {
      sessionStorage.setItem(storageKey, String(nextStrikes));
    } catch {}

    if (nextStrikes >= 2) {
      // Reached 2 distinct violations or instant termination: IMMEDIATELY close quiz without submitting
      try {
        sessionStorage.removeItem(storageKey);
      } catch {}
      privacyRestrictedRef.current = false;
      document.body.classList.remove("quiz-privacy-obscured");
      const quizToTerminate = currentQuiz;
      activeQuizRef.current = null;
      activeQuizRef.current = null;
      setActiveQuiz(null);
      setAnswers({});
      setPrivacyRestricted(false);
      setPrivacyCount(0);
      strikeCountRef.current = 0;
      stopCamera();

      try {
        await markQuizCheatingTerminated(quizToTerminate.id, user.uid, {
          studentName: user.displayName || user.email,
          quizTitle: quizToTerminate.title,
          courseId: quizToTerminate.courseId,
          instructorId: quizToTerminate.instructorId,
          violationReason: reason,
          cheatingType:
            reason === "multiple_persons_detected"
              ? "second_person_multiple"
              : reason === "mobile_phone_detected"
              ? "mobile_phone"
              : reason === "camera_covered_detected"
              ? "camera_blackout_covered"
              : "privacy_shortcut",
        });
        await loadAll();
      } catch (err) {
        console.error("Failed to mark cheating status:", err);
      }

      let popupTitle =
        lang === "ar" ? "تم إنهاء الاختبار لمحاولة الغش" : "Quiz Terminated (Cheating Violation)";
      let popupMessage =
        lang === "ar"
          ? "تم إغلاق الاختبار فوراً وإلغاء محاولتك دون إرسال الإجابات بسبب تكرار محاولة تصوير الشاشة (مخالفة 2 من 2). لا يمكنك إعادة الاختبار إلا بعد مراجعة وموافقة المحاضر."
          : "Your quiz has been closed immediately and cancelled without submitting because screenshot attempts were detected (Attempt 2 of 2). You cannot re-enter without instructor approval.";

      if (reason === "mobile_phone_detected") {
        popupTitle =
          lang === "ar"
            ? "تم إنهاء الاختبار بسبب الغش (استخدام هاتف محمول)"
            : "Quiz Terminated Due to Cheating (Mobile Phone)";
        popupMessage =
          lang === "ar"
            ? "تم إنهاء الاختبار فوراً وإلغاء محاولتك بالكامل دون احتساب أي درجة بسبب رصد استخدام هاتف محمول أمام الكاميرا أثناء الحل (مخالفة غش صريحة). تم تسجيل محاولتك كحالة غش في سجل الاختبارات، ولا يحق لك استكمال الاختبار أو إعادته إلا بعد موافقة رسمية من المحاضر."
            : "Your quiz has been terminated immediately and cancelled without grading because a mobile phone was detected in front of the camera (strict cheating violation). Your attempt is permanently marked as cheating and cannot be retaken without instructor review and approval.";
      } else if (reason === "camera_covered_detected") {
        popupTitle =
          lang === "ar"
            ? "تم إنهاء الاختبار بسبب الغش (تغطية أو حجب الكاميرا)"
            : "Quiz Terminated Due to Cheating (Camera Obscured/Covered)";
        popupMessage =
          lang === "ar"
            ? "تم إنهاء الاختبار فوراً وإلغاء محاولتك بالكامل دون احتساب أي درجة بسبب تعمد تغطية الكاميرا أو حجبها (رصد شاشة سوداء بالكامل) أثناء الاختبار لمحاولة الغش. تم تسجيل المحاولة كمخالفة غش صريحة، ولا يمكنك إعادة الاختبار إلا بعد موافقة رسمية من المحاضر."
            : "Your quiz has been terminated immediately and cancelled without grading because the camera was covered or obscured (full black screen detected) to cheat. Recorded as a strict cheating violation; retake requires instructor approval.";
      } else if (reason === "camera_lost_second" || reason === "camera_unavailable") {
        popupTitle =
          lang === "ar" ? "تم إنهاء الاختبار لإغلاق الكاميرا" : "Quiz Terminated (Camera Disconnected)";
        popupMessage =
          lang === "ar"
            ? "تم إنهاء الاختبار فوراً بسبب تكرار إغلاق أو فقدان اتصال الكاميرا أثناء الاختبار. لا يمكنك إعادة الاختبار إلا بعد موافقة المحاضر."
            : "Your quiz has been closed immediately because the camera was disconnected or turned off multiple times. You cannot re-enter without instructor approval.";
      } else if (reason === "multiple_persons_detected") {
        popupTitle =
          lang === "ar"
            ? "تم إنهاء الاختبار لرصد شخص إضافي (مخالفة مراقبة الكاميرا)"
            : "Quiz Terminated: Second Person Detected";
        popupMessage =
          lang === "ar"
            ? "تم إنهاء الاختبار فوراً وإلغاء محاولتك بالكامل دون احتساب أي درجة بسبب استمرار تواجد شخص إضافي أمام الكاميرا بعد انقضاء مهلة الـ 5 ثوانٍ المحددة لمغادرته. تم تسجيل المحاولة كمخالفة مراقبة صريحة، ولا يمكنك إعادة الاختبار إلا بعد موافقة رسمية من المحاضر."
            : "Your quiz has been terminated immediately and cancelled without grading because a second person was detected in front of the camera and remained in frame after the 5-second warning countdown expired. Recorded as a strict proctoring violation; retake requires instructor approval.";
      }

      setTerminationModal({
        title: popupTitle,
        message: popupMessage,
        reason,
      });

      showPopup({
        type: "error",
        title: popupTitle,
        message: popupMessage,
        confirmLabel: lang === "ar" ? "أدركت ذلك" : "I Understand",
      });

      toast.error(
        reason === "mobile_phone_detected"
          ? (lang === "ar"
              ? "تم إنهاء الاختبار وإلغاؤه فوراً بسبب الغش (استخدام هاتف محمول)!"
              : "Quiz terminated immediately due to cheating: Mobile phone detected!")
          : reason === "camera_covered_detected"
          ? (lang === "ar"
              ? "تم إنهاء الاختبار وإلغاؤه فوراً بسبب حجب الكاميرا (شاشة سوداء)!"
              : "Quiz terminated immediately due to cheating: Camera covered/obscured!")
          : reason === "multiple_persons_detected"
          ? (lang === "ar"
              ? "تم إنهاء الاختبار فوراً لرصد شخص إضافي أمام الكاميرا لأكثر من 5 ثوانٍ!"
              : "Quiz terminated immediately: Second person remained in camera over 5s!")
          : (lang === "ar"
              ? "تم إغلاق الاختبار وإلغاؤه لمحاولة الغش (2/2)!"
              : "Quiz terminated without submitting due to repeated violation (2/2)!")
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

  handlePrivacyViolationRef.current = handlePrivacyViolation;

  const handleResumeFromWarning = () => {
    privacyRestrictedRef.current = false;
    setPrivacyRestricted(false);
    document.body.classList.remove("quiz-privacy-obscured");
    // Short 1.5s grace for window blur only (allowing window focus to settle without blocking shortcuts)
    resumeGraceUntilRef.current = Date.now() + 1500;
    lastViolationTimeRef.current = 0;
  };

  // ── Webcam Helpers ─────────────────────────────────────────────────────────
  const stopCamera = () => {
    isIntentionalStopRef.current = true;
    if (camDetectionLoopRef.current) {
      clearTimeout(camDetectionLoopRef.current);
      cancelAnimationFrame(camDetectionLoopRef.current);
      camDetectionLoopRef.current = null;
    }
    if (camStreamRef.current) {
      camStreamRef.current.getTracks().forEach((t) => {
        try {
          t.onended = null;
          t.stop();
        } catch {}
      });
      camStreamRef.current = null;
    }
    setCamState("idle");
    setShowCamPreview(false);
    camWarningShownRef.current = false;
    setMultiPersonCountdown(null);
    setDetectedPersons([]);
    secondPersonActiveRef.current = false;
    secondPersonStartTimeRef.current = null;
  };

  const startCamera = async (videoEl) => {
    isIntentionalStopRef.current = false;
    setCamState("requesting");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 1280, min: 640 }, height: { ideal: 720, min: 480 } },
        audio: false,
      });
      camStreamRef.current = stream;
      if (videoEl) {
        videoEl.srcObject = stream;
        await videoEl.play().catch(() => {});
      }
      if (camVideoRef.current) {
        camVideoRef.current.srcObject = stream;
        await camVideoRef.current.play().catch(() => {});
      }
      setCamState("active");
      setShowCamPreview(true);
      return true;
    } catch {
      setCamState("denied");
      return false;
    }
  };

  const loadCocoSsd = async () => {
    if (camDetectorRef.current) return camDetectorRef.current;
    try {
      const cocoSsd = await import("@tensorflow-models/coco-ssd");
      await import("@tensorflow/tfjs");
      camDetectorRef.current = await cocoSsd.load({ base: "lite_mobilenet_v2" });
      return camDetectorRef.current;
    } catch (err) {
      console.warn("Local coco-ssd dynamic import error, checking CDN:", err);
    }
    if (window.cocoSsd) {
      try {
        camDetectorRef.current = await window.cocoSsd.load();
        return camDetectorRef.current;
      } catch (e) {
        console.warn("window.cocoSsd load error:", e);
      }
    }
    return null;
  };

  const startMobileDetection = () => {
    if (camDetectionLoopRef.current) {
      clearTimeout(camDetectionLoopRef.current);
      camDetectionLoopRef.current = null;
    }

    // Offscreen canvas for instant black screen / covered camera luminance & variance analysis
    const offscreenCanvas = document.createElement("canvas");
    offscreenCanvas.width = 32;
    offscreenCanvas.height = 24;
    const offscreenCtx = offscreenCanvas.getContext("2d", { willReadFrequently: true });

    let active = true;
    let blackFrameCount = 0;
    let detector = camDetectorRef.current || null;

    // Load COCO-SSD asynchronously in background without blocking the covered camera loop
    if (!detector) {
      loadCocoSsd()
        .then((d) => {
          detector = d;
        })
        .catch(() => {});
    }

    const runDetection = async () => {
      if (!active || !camStreamRef.current) return;

      const video = camVideoRef.current;
      if (video) {
        if (video.paused) {
          video.play().catch(() => {});
        }

        if (video.readyState >= 2 && video.videoWidth > 0) {
          // 1. Black Screen / Covered Camera Detection (Cheating prevention)
          try {
            if (offscreenCtx) {
              offscreenCtx.drawImage(video, 0, 0, 32, 24);
              const imgData = offscreenCtx.getImageData(0, 0, 32, 24);
              const data = imgData.data;
              const pixels = 32 * 24;
              let totalLuma = 0;
              const lumas = [];

              for (let i = 0; i < data.length; i += 4) {
                const r = data[i];
                const g = data[i + 1];
                const b = data[i + 2];
                const luma = 0.299 * r + 0.587 * g + 0.114 * b;
                totalLuma += luma;
                lumas.push(luma);
              }
              const avgBrightness = totalLuma / pixels;

              let varianceSum = 0;
              for (let i = 0; i < pixels; i++) {
                const diff = lumas[i] - avgBrightness;
                varianceSum += diff * diff;
              }
              const stdDev = Math.sqrt(varianceSum / pixels);

              // Camera is covered or obscured if:
              // - Extremely dark / blacked out (avgBrightness < 35)
              // - Dark uniform surface like finger/hand covering lens (avgBrightness < 60 && stdDev < 15)
              // - Flat textureless solid color like paper/tape over lens (stdDev < 6 && avgBrightness < 160)
              const isCovered =
                avgBrightness < 35 ||
                (avgBrightness < 60 && stdDev < 15) ||
                (stdDev < 6 && avgBrightness < 160);

              if (isCovered) {
                blackFrameCount++;
                if (blackFrameCount >= 3) {
                  // ~0.9 - 1s of covered camera -> Immediate cheating termination!
                  console.warn(
                    `🚨 Camera covered / blackout detected (brightness: ${avgBrightness.toFixed(
                      1
                    )}, stdDev: ${stdDev.toFixed(1)})! Terminating quiz.`
                  );
                  active = false;
                  if (camDetectionLoopRef.current) {
                    clearTimeout(camDetectionLoopRef.current);
                    camDetectionLoopRef.current = null;
                  }
                  if (handlePrivacyViolationRef.current) {
                    handlePrivacyViolationRef.current("camera_covered_detected");
                  } else {
                    handlePrivacyViolation("camera_covered_detected");
                  }
                  return;
                }
              } else {
                blackFrameCount = Math.max(0, blackFrameCount - 1);
              }
            }
          } catch (err) {
            console.warn("Covered camera check error:", err);
          }

          // 2. Mobile Phone Detection via COCO-SSD
          if (detector) {
            try {
              const predictions = await detector.detect(video);
              const hasPhone = predictions.some(
                (p) =>
                  (p.class === "cell phone" || p.class === "remote") &&
                  p.score >= 0.40
              );
              if (hasPhone) {
                console.warn("🚨 Mobile phone detected in camera feed! Terminating quiz immediately.");
                active = false;
                if (camDetectionLoopRef.current) {
                  clearTimeout(camDetectionLoopRef.current);
                  camDetectionLoopRef.current = null;
                }
                if (handlePrivacyViolationRef.current) {
                  handlePrivacyViolationRef.current("mobile_phone_detected");
                } else {
                  handlePrivacyViolation("mobile_phone_detected");
                }
                return;
              }

              // 3. Person Detection & Second Person Highlighting with 5s Countdown
              const personDetections = predictions.filter(
                (p) => p.class === "person" && p.score >= 0.38
              );

              const vidW = video.videoWidth || 640;
              const vidH = video.videoHeight || 480;

              // Sort persons by bounding box area: largest is primary student
              const sortedPersons = [...personDetections].sort((a, b) => {
                const areaA = (a.bbox[2] || 0) * (a.bbox[3] || 0);
                const areaB = (b.bbox[2] || 0) * (b.bbox[3] || 0);
                return areaB - areaA;
              });

              if (sortedPersons.length >= 2) {
                // Another person is in the camera feed!
                const boxes = sortedPersons.map((p, idx) => {
                  const [x, y, w, h] = p.bbox;
                  // Mirror X coordinate because webcam preview is scaleX(-1)
                  const mirroredX = vidW - (x + w);
                  return {
                    id: idx,
                    isPrimary: idx === 0,
                    isSecondPerson: idx >= 1,
                    leftPct: Math.max(0, Math.min(100, (mirroredX / vidW) * 100)),
                    topPct: Math.max(0, Math.min(100, (y / vidH) * 100)),
                    widthPct: Math.max(0, Math.min(100, (w / vidW) * 100)),
                    heightPct: Math.max(0, Math.min(100, (h / vidH) * 100)),
                  };
                });
                setDetectedPersons(boxes);

                if (!secondPersonActiveRef.current) {
                  secondPersonActiveRef.current = true;
                  secondPersonStartTimeRef.current = Date.now();
                  setMultiPersonCountdown(5);
                } else {
                  const elapsed = Math.floor((Date.now() - secondPersonStartTimeRef.current) / 1000);
                  const remaining = Math.max(0, 5 - elapsed);
                  setMultiPersonCountdown(remaining);

                  if (remaining <= 0) {
                    console.warn("🚨 Second person remained in camera frame over 5s! Terminating quiz.");
                    active = false;
                    if (camDetectionLoopRef.current) {
                      clearTimeout(camDetectionLoopRef.current);
                      camDetectionLoopRef.current = null;
                    }
                    setMultiPersonCountdown(null);
                    secondPersonActiveRef.current = false;
                    secondPersonStartTimeRef.current = null;
                    if (handlePrivacyViolationRef.current) {
                      handlePrivacyViolationRef.current("multiple_persons_detected");
                    } else {
                      handlePrivacyViolation("multiple_persons_detected");
                    }
                    return;
                  }
                }
              } else if (sortedPersons.length === 1) {
                // Exactly 1 person detected (the primary student)
                const p = sortedPersons[0];
                const [x, y, w, h] = p.bbox;
                const mirroredX = vidW - (x + w);
                setDetectedPersons([
                  {
                    id: 0,
                    isPrimary: true,
                    isSecondPerson: false,
                    leftPct: Math.max(0, Math.min(100, (mirroredX / vidW) * 100)),
                    topPct: Math.max(0, Math.min(100, (y / vidH) * 100)),
                    widthPct: Math.max(0, Math.min(100, (w / vidW) * 100)),
                    heightPct: Math.max(0, Math.min(100, (h / vidH) * 100)),
                  },
                ]);

                // If second person was previously in frame and now left!
                if (secondPersonActiveRef.current) {
                  secondPersonActiveRef.current = false;
                  secondPersonStartTimeRef.current = null;
                  setMultiPersonCountdown(null);
                  toast.success(
                    lang === "ar"
                      ? "✅ غادر الشخص الإضافي الكاميرا. تم استئناف الاختبار بأمان."
                      : "✅ Second person left the camera. Quiz resuming safely.",
                    { duration: 3500 }
                  );
                }
              } else {
                // 0 persons in frame
                setDetectedPersons([]);
                if (secondPersonActiveRef.current) {
                  secondPersonActiveRef.current = false;
                  secondPersonStartTimeRef.current = null;
                  setMultiPersonCountdown(null);
                }
              }
            } catch {
              // Frame read exception, ignore and continue
            }
          }
        }
      }

      // Check frame ~3 times per second for smooth non-blocking execution
      camDetectionLoopRef.current = setTimeout(runDetection, 300);
    };

    camDetectionLoopRef.current = setTimeout(runDetection, 250);
  };

  const handleCamLost = async () => {
    if (!camWarningShownRef.current) {
      // First camera loss: show warning
      camWarningShownRef.current = true;
      setCamState("lost");
      setCamWarningVisible(true);
      setShowCamPreview(false);
    } else {
      // Second camera loss: terminate quiz
      stopCamera();
      if (handlePrivacyViolationRef.current) {
        handlePrivacyViolationRef.current("camera_lost_second");
      } else {
        handlePrivacyViolation("camera_lost_second");
      }
    }
  };

  const handleCamGateAllow = async () => {
    const ok = await startCamera(camGateVideoRef.current);
    if (ok) {
      setShowCamGate(false);
      const qz = pendingQuiz;
      setPendingQuiz(null);
      // Now actually start the quiz
      await markQuizEntered(qz.id, user.uid, {
        studentName: user.displayName || user.email,
        quizTitle: qz.title,
        courseId: qz.courseId,
        instructorId: qz.instructorId,
      });
      await loadAll();
      try { sessionStorage.removeItem(`quiz_strikes_${qz.id}_${user?.uid || "guest"}`); } catch {}
      strikeCountRef.current = 0;
      privacyRestrictedRef.current = false;
      lastViolationTimeRef.current = 0;
      resumeGraceUntilRef.current = Date.now() + 1500;
      setLastReview(null);
      setPrivacyRestricted(false);
      setPrivacyCount(0);
      activeQuizRef.current = qz;
      setActiveQuiz(qz);
      setAnswers({});
      setSecondsLeft(Math.max((Number(qz.durationMinutes) || 10) * 60, 60));
      window.scrollTo({ top: 0, behavior: "instant" });

      // Ensure stream is bound to live preview once mounted and start mobile detection
      setTimeout(() => {
        if (camVideoRef.current && camStreamRef.current) {
          camVideoRef.current.srcObject = camStreamRef.current;
          camVideoRef.current.play().catch(() => {});
        }
        startMobileDetection();
      }, 400);
    } else {
      toast.error(
        lang === "ar"
          ? "لا يمكن بدء الاختبار: تعذر الوصول إلى الكاميرا. يرجى السماح باستخدام الكاميرا في إعدادات المتصفح."
          : "Cannot start quiz: Camera access denied. Please allow camera access in your browser settings."
      );
    }
  };

  const handleCamGateCancel = () => {
    stopCamera();
    setShowCamGate(false);
    setPendingQuiz(null);
  };

  const handleResumeCamWarning = async () => {
    setCamWarningVisible(false);
    // Try to restart camera
    const ok = await startCamera(camVideoRef.current);
    if (ok) {
      setTimeout(() => {
        if (camVideoRef.current && camStreamRef.current) {
          camVideoRef.current.srcObject = camStreamRef.current;
          camVideoRef.current.play().catch(() => {});
        }
        startMobileDetection();
      }, 500);
    } else {
      // Camera still not available - this counts as second loss
      stopCamera();
      handlePrivacyViolation("camera_unavailable");
    }
  };

  // Automatically start camera preview when gate modal opens
  useEffect(() => {
    if (showCamGate) {
      startCamera(camGateVideoRef.current);
      loadCocoSsd().catch(() => {});
    }
  }, [showCamGate]);

  // Ensure live PiP video element always has the camera stream bound
  useEffect(() => {
    if (activeQuiz && showCamPreview && camStreamRef.current && camVideoRef.current) {
      if (camVideoRef.current.srcObject !== camStreamRef.current) {
        camVideoRef.current.srcObject = camStreamRef.current;
        camVideoRef.current.play().catch(() => {});
      }
    }
  }, [activeQuiz, showCamPreview]);

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

  // Camera track ended monitor
  useEffect(() => {
    if (!camStreamRef.current || camState !== "active") return;
    const track = camStreamRef.current.getVideoTracks()[0];
    if (!track) return;
    const handleTrackEnded = () => {
      if (isIntentionalStopRef.current) return;
      handleCamLost();
    };
    track.addEventListener("ended", handleTrackEnded);
    return () => track.removeEventListener("ended", handleTrackEnded);
  }, [camState]);

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
        { text, lang, courseId, count, includeTheoretical, difficulty },
        { timeout: 120000 }
      );
      if (Array.isArray(res.data?.questions) && res.data.questions.length > 0) {
        const normalized = res.data.questions.map((q) => {
          const isTheo = q.type === "theoretical" || (!q.options && q.modelAnswer);
          return {
            ...q,
            type: isTheo ? "theoretical" : "mcq",
            allowMultiple: Boolean(q.allowMultiple) || getCorrectIds(q).length > 1,
            correctOptionIds: getCorrectIds(q),
            modelAnswer: q.modelAnswer || "",
            rubric: Array.isArray(q.rubric) ? q.rubric : [],
            points: Number(q.points) || 1,
          };
        });
        setQuestions(normalized);

        // Auto-calculate and apply estimated time from difficulty & question types
        const autoTime = res.data.estimatedTimeMinutes || calcAutoQuizTime(normalized, difficulty);
        setDurationMinutes(autoTime);

        const theoCount = normalized.filter((q) => q.type === "theoretical").length;
        const mcqCount = normalized.length - theoCount;

        toast.success(
          lang === "ar"
            ? `قام ذكاء المنصة بتوليد ${normalized.length} أسئلة (${mcqCount} اختياري + ${theoCount} نظري/مقالي). الوقت المقدر تلقائياً: ${autoTime} دقيقة!`
            : `Platform AI drafted ${normalized.length} questions (${mcqCount} MCQ + ${theoCount} Theoretical). Auto estimated time: ${autoTime} min!`
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
    setDifficulty("medium");
    setIncludeTheoretical(true);
    setQuestions([EMPTY_QUESTION()]);
  };

  const startEditQuiz = (qz) => {
    setEditingQuizId(qz.id);
    setCourseId(qz.courseId || "");
    setLessonId(qz.lessonId || "");
    setQuizTitle(qz.title || "");
    setDurationMinutes(qz.durationMinutes || 10);
    setDifficulty(qz.difficulty || "medium");
    setIncludeTheoretical(
      Array.isArray(qz.questions) && qz.questions.some((q) => q.type === "theoretical")
    );
    setQuestions(
      Array.isArray(qz.questions) && qz.questions.length > 0
        ? qz.questions.map((q) => {
            const isTheo = q.type === "theoretical" || (!q.options && q.modelAnswer);
            return {
              ...q,
              type: isTheo ? "theoretical" : "mcq",
              allowMultiple: Boolean(q.allowMultiple) || getCorrectIds(q).length > 1,
              correctOptionIds: getCorrectIds(q),
              modelAnswer: q.modelAnswer || "",
              rubric: Array.isArray(q.rubric) ? q.rubric : [],
              points: Number(q.points) || 1,
            };
          })
        : [EMPTY_QUESTION()]
    );
    setShowBuilder(true);
  };

  const toggleQuestionType = (qIdx) => {
    const next = [...questions];
    const q = next[qIdx];
    const nextType = q.type === "theoretical" ? "mcq" : "theoretical";
    next[qIdx] = {
      ...q,
      type: nextType,
      options:
        nextType === "theoretical"
          ? []
          : Array.isArray(q.options) && q.options.length === 4
          ? q.options
          : [
              { id: "a", text: "" },
              { id: "b", text: "" },
              { id: "c", text: "" },
              { id: "d", text: "" },
            ],
    };
    setQuestions(next);
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
      const isTheo = q.type === "theoretical";
      if (isTheo) {
        return {
          id: q.id,
          type: "theoretical",
          text: q.text,
          modelAnswer: q.modelAnswer || "",
          rubric: Array.isArray(q.rubric) ? q.rubric : [],
          points: Number(q.points) || 1,
          allowMultiple: false,
        };
      }
      const ids = getCorrectIds(q);
      return {
        ...q,
        type: "mcq",
        allowMultiple: Boolean(q.allowMultiple) || ids.length > 1,
        correctOptionIds: ids,
        correctOptionId: ids[0] || "a",
        points: Number(q.points) || 1,
      };
    });

    if (editingQuizId) {
      await updateQuiz(editingQuizId, {
        courseId,
        lessonId,
        title: quizTitle.trim(),
        durationMinutes: Number(durationMinutes) || 10,
        difficulty: difficulty || "medium",
        questions: cleanQuestions,
      });
      toast.success("Quiz updated!");
    } else {
      await createQuiz({
        courseId,
        lessonId,
        title: quizTitle.trim(),
        durationMinutes: Number(durationMinutes) || 10,
        difficulty: difficulty || "medium",
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
    // Show camera gate modal FIRST - quiz cannot start without camera
    setPendingQuiz(qz);
    setShowCamGate(true);
  };

  useEffect(() => {
    if (activeQuiz || privacyRestricted) {
      window.scrollTo({ top: 0, behavior: "instant" });
    }
  }, [activeQuiz, privacyRestricted]);

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

      // 1. Evaluate theoretical questions with AI
      const theoQuestions = qs.filter((q) => q.type === "theoretical");
      let theoEvaluations = {};
      if (theoQuestions.length > 0) {
        try {
          const evalRes = await axios.post(
            "http://localhost:3001/api/quiz/evaluate-answers",
            { lang, answers, questions: qs },
            { timeout: 35000 }
          );
          if (evalRes.data?.evaluations) {
            theoEvaluations = evalRes.data.evaluations;
          }
        } catch (evalErr) {
          console.warn("AI theoretical evaluation fallback:", evalErr);
          for (const tq of theoQuestions) {
            const studentAns = String(answers[tq.id] || "").trim();
            const modelAns = String(tq.modelAnswer || "").trim().toLowerCase();
            const words = studentAns.toLowerCase().split(/\s+/).filter((w) => w.length > 3);
            const matched = words.filter((w) => modelAns.includes(w)).length;
            const isOk = studentAns.length >= 15 && matched >= 2;
            const isPartial = !isOk && studentAns.length >= 10 && matched >= 1;
            theoEvaluations[tq.id] = {
              isCorrect: isOk || isPartial,
              gradeStatus: isOk ? "correct" : isPartial ? "partially_correct" : "incorrect",
              score: isOk ? 1 : isPartial ? 0.5 : 0,
              feedback: isOk
                ? (lang === "ar" ? "إجابة ممتازة ودقيقة تغطي المفاهيم المطلوبة." : "Excellent response covering key concepts.")
                : isPartial
                ? (lang === "ar" ? "إجابة صحيحة جزئياً ولكن تنقصها بعض التفاصيل الدقيقة." : "Partially correct response, some details missing.")
                : (lang === "ar" ? "الإجابة غير دقيقة أو لم تغطِ المعايير المطلوبة." : "Answer is incorrect or missed required criteria."),
            };
          }
        }
      }

      // 2. Score questions & build breakdown
      let correctCount = 0;
      const wrong = [];
      const breakdown = qs.map((q) => {
        if (q.type === "theoretical") {
          const studentAns = String(answers[q.id] || "").trim();
          const evalInfo = theoEvaluations[q.id] || {
            isCorrect: false,
            gradeStatus: "incorrect",
            score: 0,
            feedback: lang === "ar" ? "لم يتم تقديم إجابة." : "No answer provided.",
          };
          const pts = Number(evalInfo.score) || (evalInfo.isCorrect ? 1 : 0);
          correctCount += pts;

          if (!evalInfo.isCorrect || evalInfo.gradeStatus === "incorrect") {
            wrong.push({
              question: q.text,
              correctAnswer: q.modelAnswer || "Model Answer",
              studentAnswer: studentAns || (lang === "ar" ? "لم تتم الإجابة" : "No answer"),
            });
          }

          return {
            id: q.id,
            type: "theoretical",
            question: q.text,
            chosenText: studentAns || (lang === "ar" ? "لم تتم الإجابة" : "No answer"),
            correctText: q.modelAnswer || (lang === "ar" ? "موضحة في معايير الإجابة" : "Refer to model answer"),
            isCorrect: evalInfo.isCorrect,
            gradeStatus: evalInfo.gradeStatus || (evalInfo.isCorrect ? "correct" : "incorrect"),
            score: pts,
            aiFeedback: evalInfo.feedback || "",
          };
        }

        // MCQ grading
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
          type: "mcq",
          question: q.text,
          chosenText,
          correctText,
          isCorrect,
          gradeStatus: isCorrect ? "correct" : "incorrect",
          score: isCorrect ? 1 : 0,
        };
      });

      const totalPossible = qs.length;
      const scorePct = totalPossible > 0 ? Math.round((correctCount / totalPossible) * 100) : 0;

      let aiFeedback =
        wrong.length === 0
          ? lang === "ar"
            ? "أداء ممتاز! أجبت على جميع الأسئلة النظرية والاختيارية بشكل متقن."
            : "Excellent work! You answered all questions and theoretical prompts accurately."
          : lang === "ar"
          ? `راجع النقاط التي تحتاج تحسيناً (${wrong.length} أسئلة) وراجع محتوى الدرس قبل المحاولة التالية.`
          : `Review the ${wrong.length} missed concept(s) in the lesson notes before your next attempt.`;

      try {
        const fbRes = await axios.post(
          "http://localhost:3001/api/feedback",
          { lang, score: correctCount, totalQuestions: totalPossible, wrongAnswers: wrong },
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
        total: totalPossible,
        answers,
        aiFeedback,
      });
      await markQuizSubmitted(activeQuiz.id, user.uid);

      setLastReview({
        title: activeQuiz.title,
        score: scorePct,
        correctCount,
        total: totalPossible,
        aiFeedback,
        breakdown,
      });
      toast.success(
        lang === "ar"
          ? `تم تسليم وتصحيح الاختبار بالذكاء الاصطناعي! النقاط: ${correctCount} / ${totalPossible}`
          : `Quiz submitted and AI-evaluated! Points: ${correctCount} / ${totalPossible} pts`
      );
      activeQuizRef.current = null;
      setActiveQuiz(null);
      setAnswers({});
      setSecondsLeft(0);
      stopCamera();
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
      {/* Camera Gate Modal */}
      {showCamGate && pendingQuiz && createPortal(
        <div style={{ position: "fixed", inset: 0, zIndex: 100000, background: "rgba(2,6,23,0.95)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <div style={{ background: "#0f172a", border: "2px solid #38bdf8", borderRadius: 20, padding: 32, maxWidth: 480, width: "100%", textAlign: "center", color: "#fff", boxShadow: "0 24px 80px rgba(0,0,0,0.8)" }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>📷</div>
            <h2 style={{ fontSize: 22, fontWeight: 900, marginBottom: 8 }}>
              {lang === "ar" ? "الكاميرا مطلوبة لبدء الاختبار" : "Camera Required to Start Quiz"}
            </h2>
            <p style={{ fontSize: 13, color: "#94a3b8", marginBottom: 20, lineHeight: 1.6 }}>
              {lang === "ar"
                ? "لا يمكن بدء الاختبار إلا بعد تفعيل الكاميرا. سيتم مراقبتك طوال فترة الاختبار للتحقق من عدم استخدام أي أجهزة غش. إذا اكتشف النظام هاتفاً محمولاً أو تعمد حجب وتغطية الكاميرا (شاشة سوداء)، سيتم إنهاء الاختبار فوراً كحالة غش."
                : "The quiz cannot start without your camera. You will be monitored throughout the exam. If a mobile phone is detected or the camera is covered/obscured (black screen), the quiz will be immediately terminated for cheating."}
            </p>
            <div style={{ width: "100%", aspectRatio: "16/10", background: "#1e293b", borderRadius: 14, overflow: "hidden", marginBottom: 20, border: "1px solid #334155" }}>
              <video ref={camGateVideoRef} autoPlay muted playsInline style={{ width: "100%", height: "100%", objectFit: "cover", transform: "scaleX(-1)" }} />
            </div>
            <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
              <button
                type="button"
                onClick={handleCamGateCancel}
                style={{ padding: "10px 24px", borderRadius: 12, background: "#1e293b", border: "1px solid #334155", color: "#94a3b8", fontSize: 13, fontWeight: 700, cursor: "pointer" }}
              >
                {lang === "ar" ? "إلغاء" : "Cancel"}
              </button>
              <button
                type="button"
                onClick={handleCamGateAllow}
                style={{ padding: "10px 24px", borderRadius: 12, background: "linear-gradient(135deg, #0ea5e9, #6366f1)", border: "none", color: "#fff", fontSize: 13, fontWeight: 900, cursor: "pointer", boxShadow: "0 4px 20px rgba(99,102,241,0.4)" }}
              >
                {lang === "ar" ? "تفعيل الكاميرا وبدء الاختبار 🎥" : "Enable Camera & Start Quiz 🎥"}
              </button>
            </div>
            {camState === "denied" && (
              <p style={{ marginTop: 12, color: "#f87171", fontSize: 12, fontWeight: 700 }}>
                {lang === "ar" ? "⚠️ تم رفض إذن الكاميرا. يرجى السماح باستخدامها في إعدادات المتصفح." : "⚠️ Camera permission denied. Please allow it in browser settings."}
              </p>
            )}
          </div>
        </div>,
        document.body
      )}

      {/* Quiz Cheating / Security Termination Modal (Unmissable Fullscreen Overlay) */}
      {terminationModal && createPortal(
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 100010,
            background: "rgba(2, 6, 23, 0.95)",
            backdropFilter: "blur(12px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 24,
            textAlign: "center",
            color: "#ffffff",
          }}
        >
          <div
            style={{
              background: "#0f172a",
              border: "2px solid #ef4444",
              borderRadius: 24,
              padding: "36px 28px",
              maxWidth: 480,
              width: "100%",
              boxShadow: "0 25px 80px rgba(239, 68, 68, 0.35)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 16,
            }}
          >
            <div
              style={{
                width: 76,
                height: 76,
                borderRadius: 24,
                background: "rgba(239, 68, 68, 0.15)",
                border: "2px solid #ef4444",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 36,
                boxShadow: "0 0 25px rgba(239, 68, 68, 0.5)",
              }}
            >
              🚫
            </div>

            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "4px 14px",
                borderRadius: 9999,
                background: "rgba(239, 68, 68, 0.2)",
                border: "1px solid rgba(239, 68, 68, 0.6)",
                color: "#fca5a5",
                fontSize: 12,
                fontWeight: 800,
                textTransform: "uppercase",
                letterSpacing: 1,
              }}
            >
              <span>{lang === "ar" ? "مخالفة غش صريحة — تم إنهاء الاختبار" : "Cheating Violation — Quiz Terminated"}</span>
            </div>

            <h2 style={{ fontSize: 22, fontWeight: 900, color: "#ffffff", margin: 0, lineHeight: 1.3 }}>
              {terminationModal.title}
            </h2>

            <p style={{ fontSize: 13.5, color: "#cbd5e1", lineHeight: 1.7, margin: 0 }}>
              {terminationModal.message}
            </p>

            <div
              style={{
                width: "100%",
                padding: 12,
                borderRadius: 14,
                background: "rgba(239, 68, 68, 0.1)",
                border: "1px dashed rgba(239, 68, 68, 0.4)",
                fontSize: 12,
                color: "#fca5a5",
                fontWeight: 600,
              }}
            >
              {lang === "ar"
                ? "⚠️ تم تسجيل المحاولة في لوحة تحكم المحاضر كحالة غش ولن يتم اعتماد أو تصحيح أي إجابات."
                : "⚠️ Attempt logged in instructor dashboard as cheating. Answers will not be counted."}
            </div>

            <button
              type="button"
              onClick={() => setTerminationModal(null)}
              style={{
                marginTop: 8,
                padding: "12px 36px",
                borderRadius: 14,
                background: "linear-gradient(135deg, #ef4444, #b91c1c)",
                border: "none",
                color: "#ffffff",
                fontSize: 14,
                fontWeight: 800,
                cursor: "pointer",
                boxShadow: "0 8px 24px rgba(239, 68, 68, 0.4)",
                transition: "all 0.2s ease",
              }}
            >
              {lang === "ar" ? "أقر بالمخالفة — العودة للاختبارات" : "I Understand — Return to Quizzes"}
            </button>

            <span style={{ fontSize: 11, color: "#64748b" }}>
              Athar Educational Platform · Security & Integrity System
            </span>
          </div>
        </div>,
        document.body
      )}

      {/* Camera Lost Warning Overlay */}
      {activeQuiz && camWarningVisible && createPortal(
        <div style={{ position: "fixed", inset: 0, zIndex: 99998, background: "rgba(2,6,23,0.92)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <div style={{ background: "#0f172a", border: "2px solid #f97316", borderRadius: 20, padding: 32, maxWidth: 400, width: "100%", textAlign: "center", color: "#fff", boxShadow: "0 24px 80px rgba(0,0,0,0.8)" }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>⚠️</div>
            <h2 style={{ fontSize: 20, fontWeight: 900, marginBottom: 8, color: "#fb923c" }}>
              {lang === "ar" ? "تحذير: الكاميرا أُغلقت!" : "Warning: Camera Disconnected!"}
            </h2>
            <p style={{ fontSize: 13, color: "#cbd5e1", marginBottom: 20, lineHeight: 1.6 }}>
              {lang === "ar"
                ? "يجب إبقاء الكاميرا مفتوحة طوال فترة الاختبار. هذا تحذير أول وأخير — أي إغلاق ثانٍ للكاميرا سيؤدي إلى إنهاء الاختبار فوراً."
                : "Your camera must remain active throughout the quiz. This is your FIRST and ONLY warning — a second camera closure will immediately terminate your quiz."}
            </p>
            <button
              type="button"
              onClick={handleResumeCamWarning}
              style={{ padding: "12px 32px", borderRadius: 12, background: "linear-gradient(135deg, #f97316, #ef4444)", border: "none", color: "#fff", fontSize: 14, fontWeight: 900, cursor: "pointer", boxShadow: "0 4px 20px rgba(249,115,22,0.4)" }}
            >
              {lang === "ar" ? "إعادة تفعيل الكاميرا والمتابعة 🎥" : "Re-enable Camera & Continue 🎥"}
            </button>
          </div>
        </div>,
        document.body
      )}

      {/* Floating Camera PiP Preview (Top Center to keep question choices completely unobstructed) */}
      {activeQuiz && showCamPreview && createPortal(
        <div
          style={{
            position: "fixed",
            top: 14,
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 99997,
            width: multiPersonCountdown !== null ? 280 : 220,
            height: multiPersonCountdown !== null ? 195 : 155,
            borderRadius: 16,
            overflow: "hidden",
            border: multiPersonCountdown !== null ? "2.5px solid #ef4444" : "2px solid #38bdf8",
            boxShadow: multiPersonCountdown !== null
              ? "0 8px 30px rgba(239,68,68,0.5), 0 0 20px rgba(239,68,68,0.4)"
              : "0 8px 30px rgba(0,0,0,0.7), 0 0 16px rgba(56,189,248,0.25)",
            background: "#0f172a",
            transition: "all 0.3s ease",
          }}
        >
          <video
            ref={(el) => {
              camVideoRef.current = el;
              if (el && camStreamRef.current && el.srcObject !== camStreamRef.current) {
                el.srcObject = camStreamRef.current;
                el.play().catch(() => {});
              }
            }}
            autoPlay
            muted
            playsInline
            style={{ width: "100%", height: "100%", objectFit: "cover", transform: "scaleX(-1)", display: "block" }}
          />

          {/* Person Detection Overlays: Person 1 (Green) vs Person 2 (Red Highlight) */}
          {detectedPersons.map((p) => (
            <div
              key={p.id}
              style={{
                position: "absolute",
                left: `${p.leftPct}%`,
                top: `${p.topPct}%`,
                width: `${p.widthPct}%`,
                height: `${p.heightPct}%`,
                border: p.isSecondPerson ? "2.5px solid #ef4444" : "1.5px solid #10b981",
                borderRadius: 6,
                backgroundColor: p.isSecondPerson ? "rgba(239, 68, 68, 0.25)" : "rgba(16, 185, 129, 0.12)",
                boxShadow: p.isSecondPerson ? "0 0 14px #ef4444" : "none",
                pointerEvents: "none",
                transition: "all 0.15s ease-out",
              }}
            >
              <span
                style={{
                  position: "absolute",
                  bottom: "100%",
                  left: 0,
                  fontSize: 9,
                  fontWeight: 900,
                  color: "#fff",
                  backgroundColor: p.isSecondPerson ? "#ef4444" : "#10b981",
                  padding: "2px 6px",
                  borderRadius: 5,
                  whiteSpace: "nowrap",
                  letterSpacing: 0.3,
                  boxShadow: "0 2px 4px rgba(0,0,0,0.4)",
                  marginBottom: 2,
                }}
              >
                {p.isSecondPerson
                  ? (lang === "ar" ? "🚨 شخص 2 غير مصرح" : "🚨 Person 2 Unauthorized")
                  : (lang === "ar" ? "👤 طالب معتمد" : "👤 Student Verified")}
              </span>
            </div>
          ))}

          <div
            style={{
              position: "absolute",
              top: 5,
              left: 6,
              fontSize: 9,
              color: multiPersonCountdown !== null ? "#ef4444" : "#34d399",
              fontWeight: 800,
              background: "rgba(15, 23, 42, 0.8)",
              backdropFilter: "blur(4px)",
              padding: "2px 6px",
              borderRadius: 6,
              letterSpacing: 0.5,
              display: "flex",
              alignItems: "center",
              gap: 4,
            }}
          >
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: multiPersonCountdown !== null ? "#ef4444" : "#34d399",
                display: "inline-block",
                boxShadow: multiPersonCountdown !== null ? "0 0 8px #ef4444" : "0 0 6px #34d399",
              }}
            />
            {multiPersonCountdown !== null ? "ALERT" : "LIVE"}
          </div>
        </div>,
        document.body
      )}

      {/* Prominent Warning Banner for 5-Second Countdown */}
      {activeQuiz && multiPersonCountdown !== null && createPortal(
        <div
          style={{
            position: "fixed",
            top: 218,
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 99998,
            width: "92%",
            maxWidth: 520,
            borderRadius: 20,
            background: "linear-gradient(135deg, rgba(225, 29, 72, 0.96), rgba(159, 18, 57, 0.96))",
            color: "#fff",
            padding: "14px 20px",
            boxShadow: "0 14px 45px rgba(225, 29, 72, 0.5), 0 0 0 2px rgba(255, 255, 255, 0.2)",
            backdropFilter: "blur(12px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 16,
            animation: "pulse 1.5s infinite",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: 28 }}>⚠️</span>
            <div>
              <div style={{ fontSize: 13, fontWeight: 900, textTransform: "uppercase", letterSpacing: 0.5, color: "#fecdd3" }}>
                {lang === "ar"
                  ? "تحذير: تم رصد شخص إضافي أمام الكاميرا!"
                  : "Security Alert: Second Person Detected!"}
              </div>
              <div style={{ fontSize: 12, fontWeight: 600, color: "#fff", marginTop: 2 }}>
                {lang === "ar"
                  ? `يجب مغادرة الشخص الإضافي فوراً خلال ${multiPersonCountdown} ثوانٍ وإلا سيتم إنهاء الاختبار!`
                  : `Second person must leave camera frame within ${multiPersonCountdown}s or quiz will be terminated!`}
              </div>
            </div>
          </div>
          <div
            style={{
              height: 48,
              width: 48,
              borderRadius: "50%",
              background: "rgba(255, 255, 255, 0.25)",
              border: "2px solid rgba(255, 255, 255, 0.6)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontFamily: "monospace",
              fontSize: 22,
              fontWeight: 900,
              color: "#fff",
              flexShrink: 0,
              boxShadow: "0 4px 12px rgba(0,0,0,0.25)",
            }}
          >
            {multiPersonCountdown}
          </div>
        </div>,
        document.body
      )}

      {/* 1. Student Active Quiz Player with Timer & Privacy Protection (PROMINENTLY AT THE VERY TOP — ZERO SCROLLING) */}
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
            {/* Full-cover Content Privacy Restricted Overlay (Portal into document.body to ensure true fixed viewport centering with zero gap) */}
            {typeof document !== "undefined" &&
              createPortal(
                <div
                  className={`quiz-privacy-shield-overlay fixed inset-0 z-[99999] overflow-y-auto flex flex-col items-center justify-center p-6 sm:p-10 text-center space-y-4 ${
                    privacyRestricted ? "!flex !opacity-100 !visible" : ""
                  }`}
                  style={{
                    backgroundColor: "#020617",
                    color: "#ffffff",
                    position: "fixed",
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    width: "100vw",
                    height: "100vh",
                    zIndex: 99999,
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
                </div>,
                document.body
              )}

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
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-400/40 text-amber-800 dark:text-amber-200 text-xs font-bold">
                    <Clock className="h-3.5 w-3.5" />
                    {formatTime(secondsLeft)}
                  </span>
                  {canManage && (
                    <button
                      type="button"
                      onClick={() => {
                        activeQuizRef.current = null;
      setActiveQuiz(null);
                        setAnswers({});
                        setPrivacyRestricted(false);
                        document.body.classList.remove("quiz-privacy-obscured");
                        stopCamera();
                      }}
                      className="px-3 py-1 rounded-xl bg-slate-200/80 dark:bg-slate-700/80 hover:bg-slate-300 dark:hover:bg-slate-600 text-xs font-bold text-slate-700 dark:text-slate-200 transition-all cursor-pointer border border-slate-300 dark:border-slate-600"
                    >
                      {lang === "ar" ? "إغلاق المعاينة" : "Exit Preview"}
                    </button>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                {(activeQuiz.questions || []).map((q, idx) => {
                  if (q.type === "theoretical") {
                    const currentAns = typeof answers[q.id] === "string" ? answers[q.id] : "";
                    const wordCount = currentAns.trim() ? currentAns.trim().split(/\s+/).length : 0;
                    return (
                      <div
                        key={q.id}
                        className="p-5 rounded-2xl glass-subtle space-y-3 border border-indigo-400/30 shadow-sm"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="font-bold text-sm text-slate-900 dark:text-white">
                            {idx + 1}. {q.text}
                          </div>
                          <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-400/30 flex items-center gap-1 shrink-0">
                            <Sparkles className="h-3 w-3 text-amber-500" />
                            {lang === "ar" ? "سؤال نظري / مقالي (تصحيح ذكي)" : "Theoretical / Essay (AI Graded)"}
                          </span>
                        </div>
                        <textarea
                          rows={4}
                          value={currentAns}
                          onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })}
                          placeholder={
                            lang === "ar"
                              ? "اكتب إجابتك النظرية والشرح هنا بالتفصيل (سيقوم الذكاء الاصطناعي بمراجعة إجابتك وتقييم صحتها)..."
                              : "Write your theoretical answer and explanation here in detail (AI will analyze and grade it)..."
                          }
                          className="w-full px-3.5 py-2.5 glass-input text-xs sm:text-sm leading-relaxed resize-y font-normal"
                        />
                        <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                          <span>
                            {lang === "ar" ? "عدد الكلمات:" : "Word count:"} {wordCount}
                          </span>
                          <span className="text-indigo-600 dark:text-cyan-400 font-bold">
                            {lang === "ar" ? "درجة السؤال: 1 نقطة" : "Question Mark: 1 pt"}
                          </span>
                        </div>
                      </div>
                    );
                  }

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
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-sm font-semibold shadow-lg flex items-center gap-2 transition-all cursor-pointer"
              >
                <Send className="h-4 w-4" />
                {submittingQuiz ? t("app.loading") : t("quizzes.submitQuiz")}
              </button>
            </div>
          </div>
        </>
      )}

      {/* When NO quiz is active, render regular management & quiz list */}
      {!activeQuiz && (
        <>
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

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4 sm:gap-5">
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
                {lang === "ar" ? "مستوى الصعوبة" : "Difficulty"}
              </label>
              <select
                value={difficulty}
                onChange={(e) => {
                  const newDiff = e.target.value;
                  setDifficulty(newDiff);
                  setDurationMinutes(calcAutoQuizTime(questions, newDiff));
                }}
                className="w-full px-3.5 py-2.5 glass-input text-sm font-semibold"
              >
                <option value="easy">{lang === "ar" ? "سهل (Easy)" : "Easy"}</option>
                <option value="medium">{lang === "ar" ? "متوسط (Medium)" : "Medium"}</option>
                <option value="hard">{lang === "ar" ? "صعب ومتقدم (Hard)" : "Hard"}</option>
              </select>
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
              <div className="flex items-center gap-1.5 mt-1.5">
                <button
                  type="button"
                  onClick={() => setDurationMinutes(calcAutoQuizTime(questions, difficulty))}
                  className="text-[10px] sm:text-[11px] px-2 py-0.5 rounded-lg bg-indigo-500/15 text-indigo-700 dark:text-cyan-300 font-bold hover:bg-indigo-500/25 flex items-center gap-1 transition-all cursor-pointer"
                  title={
                    lang === "ar"
                      ? "تطبيق الوقت المقدر تلقائياً بناءً على مستوى الصعوبة ونوعية الأسئلة"
                      : "Apply auto-calculated time based on difficulty and questions"
                  }
                >
                  <Clock className="h-3 w-3" />
                  <span>
                    {lang === "ar" ? "تطبيق الوقت التلقائي:" : "Auto-Estimate:"} {calcAutoQuizTime(questions, difficulty)} {lang === "ar" ? "د" : "min"}
                  </span>
                </button>
              </div>
            </div>
          </div>

          {/* AI Drafting Toolbar & Question Composition */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-slate-200/40 dark:border-white/5">
            <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
              {/* Draft 10 Questions */}
              <button
                type="button"
                onClick={() => handleDraftWithAI(10)}
                disabled={Boolean(draftingAI)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-500 hover:to-pink-500 text-white text-xs font-bold shadow-lg shadow-purple-500/25 active:scale-95 transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                title={
                  lang === "ar"
                    ? "توليد 10 أسئلة (اختيار من متعدد + نظري) بواسطة ذكاء المنصة"
                    : "Draft 10 questions (MCQ + Theoretical) with Platform AI"
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
                    ? "توليد 15 سؤالاً بواسطة ذكاء المنصة"
                    : "Draft 15 questions with Platform AI"
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
                    ? "توليد 20 سؤالاً بواسطة ذكاء المنصة"
                    : "Draft 20 questions with Platform AI"
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
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-500/10 border border-indigo-400/20 text-xs font-bold text-indigo-700 dark:text-cyan-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeTheoretical}
                  onChange={(e) => setIncludeTheoretical(e.target.checked)}
                  className="rounded text-indigo-600"
                />
                <span>{lang === "ar" ? "تضمين أسئلة نظرية ومقالية" : "Include Theoretical Questions"}</span>
              </label>

              {/* Add MCQ Question */}
              <button
                type="button"
                onClick={() => {
                  const next = [...questions, EMPTY_QUESTION("mcq")];
                  setQuestions(next);
                  setDurationMinutes(calcAutoQuizTime(next, difficulty));
                }}
                className="glass-btn-secondary flex items-center gap-1.5 px-3.5 py-2 rounded-2xl text-xs font-bold cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>{lang === "ar" ? "+ سؤال اختياري" : "+ Add MCQ"}</span>
              </button>

              {/* Add Theoretical Question */}
              <button
                type="button"
                onClick={() => {
                  const next = [...questions, EMPTY_QUESTION("theoretical")];
                  setQuestions(next);
                  setDurationMinutes(calcAutoQuizTime(next, difficulty));
                }}
                className="px-3.5 py-2 rounded-2xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-400/35 text-amber-800 dark:text-amber-200 flex items-center gap-1.5 text-xs font-bold transition-all cursor-pointer"
              >
                <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                <span>{lang === "ar" ? "+ سؤال مقالي ونظري" : "+ Add Theoretical"}</span>
              </button>
            </div>
          </div>

          <div className="space-y-4">
            {questions.map((q, idx) => {
              const isTheo = q.type === "theoretical";
              const correctIds = getCorrectIds(q);
              const isMulti = Boolean(q.allowMultiple) || correctIds.length > 1;

              return (
                <div
                  key={q.id}
                  className={`p-5 rounded-2xl glass-subtle space-y-3.5 border ${
                    isTheo ? "border-amber-400/40 bg-amber-500/[0.03]" : "border-white/80 dark:border-white/10"
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black uppercase tracking-wider text-indigo-700 dark:text-indigo-300">
                        {t("quizzes.questionText")} #{idx + 1}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                          isTheo
                            ? "bg-amber-500/20 text-amber-800 dark:text-amber-200 border border-amber-400/40"
                            : "bg-sky-500/20 text-sky-800 dark:text-sky-200 border border-sky-400/40"
                        }`}
                      >
                        {isTheo
                          ? lang === "ar"
                            ? "سؤال نظري / مقالي (تصحيح AI)"
                            : "Theoretical / Essay (AI Graded)"
                          : lang === "ar"
                          ? "اختيار من متعدد (MCQ)"
                          : "Multiple Choice (MCQ)"}
                      </span>
                    </div>

                    <div className="flex items-center gap-2.5">
                      {/* Convert question type button */}
                      <button
                        type="button"
                        onClick={() => toggleQuestionType(idx)}
                        className="text-[11px] text-indigo-600 dark:text-cyan-400 font-semibold hover:underline cursor-pointer"
                      >
                        {isTheo
                          ? lang === "ar"
                            ? "تحويل لاختيار من متعدد"
                            : "Convert to MCQ"
                          : lang === "ar"
                          ? "تحويل لسؤال نظري/مقالي"
                          : "Convert to Theoretical"}
                      </button>

                      {!isTheo && (
                        <label className="inline-flex items-center gap-1.5 text-xs font-semibold cursor-pointer text-sky-700 dark:text-sky-300">
                          <input
                            type="checkbox"
                            checked={isMulti}
                            onChange={() => toggleQuestionMode(idx)}
                            className="rounded text-indigo-600 focus:ring-indigo-500"
                          />
                          {lang === "ar" ? "أكثر من إجابة صحيحة" : "Multiple Correct Answers"}
                        </label>
                      )}

                      {questions.length > 1 && (
                        <button
                          type="button"
                          onClick={() => {
                            const next = questions.filter((_, i) => i !== idx);
                            setQuestions(next);
                            setDurationMinutes(calcAutoQuizTime(next, difficulty));
                          }}
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
                    placeholder={
                      isTheo
                        ? lang === "ar"
                          ? "أدخل نص السؤال النظري أو المقالي (مثال: اشرح الفرق بين التعلم الموجه وغير الموجه)..."
                          : "Enter theoretical question prompt (e.g. Explain the difference between supervised and unsupervised learning)..."
                        : "Enter MCQ question..."
                    }
                    className="w-full px-3.5 py-2.5 glass-input text-sm font-semibold"
                  />

                  {/* Theoretical fields: Model Answer & Rubric */}
                  {isTheo ? (
                    <div className="space-y-3 pt-1">
                      <div>
                        <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                          {lang === "ar"
                            ? "الإجابة النموذجية المعتمدة (مرجع التصحيح التلقائي بالذكاء الاصطناعي):"
                            : "Model Answer (Reference for AI Grading):"}
                        </label>
                        <textarea
                          rows={3}
                          required
                          value={q.modelAnswer || ""}
                          onChange={(e) => {
                            const next = [...questions];
                            next[idx].modelAnswer = e.target.value;
                            setQuestions(next);
                          }}
                          placeholder={
                            lang === "ar"
                              ? "اكتب هنا الإجابة النموذجية الوافية التي يجب على الطالب تغطية عناصرها..."
                              : "Enter the comprehensive model answer covering the key concepts expected from students..."
                          }
                          className="w-full px-3.5 py-2 glass-input text-xs sm:text-[13px] leading-relaxed resize-y"
                        />
                      </div>

                      <div>
                        <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                          {lang === "ar"
                            ? "الكلمات المفتاحية ومعايير التقييم الأساسية (افصل بينها بفواصل):"
                            : "Key Concepts & Rubric Criteria (comma-separated):"}
                        </label>
                        <input
                          value={Array.isArray(q.rubric) ? q.rubric.join(", ") : q.rubric || ""}
                          onChange={(e) => {
                            const next = [...questions];
                            next[idx].rubric = e.target.value
                              .split(/[,،]+/)
                              .map((s) => s.trim())
                              .filter(Boolean);
                            setQuestions(next);
                          }}
                          placeholder={
                            lang === "ar"
                              ? "مثال: بيانات مصنفة، مخرجات معروفة، تصنيف، تنبؤ"
                              : "e.g. labeled data, known targets, classification, regression"
                          }
                          className="w-full px-3.5 py-2 glass-input text-xs"
                        />
                      </div>
                    </div>
                  ) : (
                    /* MCQ options grid */
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {q.options.map((opt, oIdx) => {
                        const checked = correctIds.includes(opt.id);
                        return (
                          <div
                            key={opt.id}
                            className="flex items-center gap-2 p-1.5 rounded-xl bg-white/40 dark:bg-slate-800/40 border border-slate-200/50 dark:border-white/5"
                          >
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
                  )}
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

            <div className="space-y-2.5">
              {lastReview.breakdown.map((item, idx) => (
                <div
                  key={item.id}
                  className="p-3.5 rounded-2xl glass-subtle text-xs flex flex-col gap-1.5 border border-slate-200/50 dark:border-white/5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2 min-w-0">
                      {item.isCorrect ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                      ) : item.gradeStatus === "partially_correct" ? (
                        <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                      ) : (
                        <XCircle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
                      )}
                      <div className="font-bold text-slate-900 dark:text-white">
                        {idx + 1}. {item.question}
                      </div>
                    </div>
                    {item.type === "theoretical" && (
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${
                          item.gradeStatus === "correct"
                            ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-400/30"
                            : item.gradeStatus === "partially_correct"
                            ? "bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-400/30"
                            : "bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-400/30"
                        }`}
                      >
                        {item.gradeStatus === "correct"
                          ? lang === "ar"
                            ? "إجابة صحيحة (1 نقطة)"
                            : "Correct (1 pt)"
                          : item.gradeStatus === "partially_correct"
                          ? lang === "ar"
                            ? "صحيحة جزئياً (0.5 نقطة)"
                            : "Partially Correct (0.5 pt)"
                          : lang === "ar"
                          ? "إجابة غير صحيحة (0 نقطة)"
                          : "Incorrect (0 pts)"}
                      </span>
                    )}
                  </div>

                  <div className="text-slate-600 dark:text-slate-300 ps-6 space-y-1">
                    <div>
                      {lang === "ar" ? "إجابتك:" : "Your answer:"}{" "}
                      <strong className="text-slate-900 dark:text-white">{item.chosenText}</strong>
                    </div>
                    {item.correctText && (
                      <div className="text-slate-500 text-[11.5px]">
                        {lang === "ar" ? "الإجابة النموذجية:" : "Model Answer:"}{" "}
                        <strong className="text-emerald-700 dark:text-emerald-300">{item.correctText}</strong>
                      </div>
                    )}
                    {item.aiFeedback && (
                      <div className="mt-1 p-2 rounded-xl bg-indigo-500/10 border border-indigo-400/20 text-indigo-900 dark:text-cyan-200 text-[11px] leading-relaxed">
                        <span className="font-bold">
                          {lang === "ar" ? "💡 تصحيح وتقييم الذكاء الاصطناعي:" : "💡 AI Evaluation & Feedback:"}
                        </span>{" "}
                        {item.aiFeedback}
                      </div>
                    )}
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
        </>
      )}
    </div>
  );
}
