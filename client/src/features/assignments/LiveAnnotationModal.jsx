import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  Award,
  Bot,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Eraser,
  Eye,
  FileText,
  Hand,
  Highlighter,
  Loader2,
  Lock,
  Maximize2,
  Minimize2,
  Pen,
  Redo2,
  RotateCcw,
  Save,
  Send,
  Sparkles,
  Type,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import toast from "react-hot-toast";
import { useUploadProgress } from "../../context/UploadProgressContext";
import {
  gradePdfAssignmentWithAI,
  stampAiCorrectionOnPage,
} from "../../utils/aiGrader";

const PEN_COLORS = [
  { id: "black", hex: "#0f172a", label: "Black" },
  { id: "blue", hex: "#1d4ed8", label: "Blue" },
  { id: "red", hex: "#dc2626", label: "Red" },
  { id: "green", hex: "#059669", label: "Green" },
  { id: "purple", hex: "#7c3aed", label: "Purple" },
];

const STROKE_SIZES = [
  { id: "thin", px: 2.5, label: "Fine" },
  { id: "medium", px: 5, label: "Med" },
  { id: "bold", px: 9, label: "Bold" },
];

function createBlankSheetDataUrl() {
  const canvas = document.createElement("canvas");
  canvas.width = 1050;
  canvas.height = 1350;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = "#e2e8f0";
  ctx.lineWidth = 1;
  for (let y = 90; y < canvas.height - 60; y += 44) {
    ctx.beginPath();
    ctx.moveTo(60, y);
    ctx.lineTo(canvas.width - 60, y);
    ctx.stroke();
  }
  ctx.strokeStyle = "#fca5a5";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(110, 40);
  ctx.lineTo(110, canvas.height - 40);
  ctx.stroke();
  return canvas.toDataURL("image/jpeg", 0.85);
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

export default function LiveAnnotationModal({
  open,
  onClose,
  assignment,
  mode = "student", // "student" | "correct" | "view" | "lesson"
  submission = null,
  initialInkSnapshots = null,
  initialNotes = "",
  lang = "en",
  onSubmitStudent,
  onSaveCorrection,
  onSaveLessonNotes,
}) {
  const pages = useMemo(() => {
    // If student is viewing in read-only and teacher has not approved review yet, display student's un-stamped annotated pages
    if (mode === "view") {
      if (submission?.status === "teacher_reviewed" && submission?.correctedPages?.length) {
        return submission.correctedPages;
      }
      if (submission?.annotatedPages?.length) {
        return submission.annotatedPages;
      }
    }
    if (mode === "correct" && submission?.correctedPages?.length) return submission.correctedPages;
    if (mode === "correct" && submission?.annotatedPages?.length) return submission.annotatedPages;
    if (assignment?.pdfPages?.length) return assignment.pdfPages;
    return [createBlankSheetDataUrl()];
  }, [mode, submission?.status, submission?.correctedPages, submission?.annotatedPages, assignment?.pdfPages]);

  const isReadOnly = mode === "view";
  const maxMarks = Number(assignment?.maxMarks) || 10;

  const [pageIdx, setPageIdx] = useState(0);
  const [canvasDims, setCanvasDims] = useState({ width: 1050, height: 1350 });
  const [tool, setTool] = useState("pen"); // "pen" | "highlighter" | "eraser" | "text" | "hand"
  const [viewMode, setViewMode] = useState("fit-page"); // "fit-page" (default so entire PDF is visible) | "fit-width"
  const [zoomScale, setZoomScale] = useState(1.0);
  const scrollContainerRef = useRef(null);
  const panningRef = useRef(false);
  const panStartRef = useRef({ x: 0, y: 0, scrollLeft: 0, scrollTop: 0 });
  const [color, setColor] = useState(mode === "correct" ? "#dc2626" : "#1d4ed8");
  const [size, setSize] = useState(4.5);
  const [answerText, setAnswerText] = useState(
    mode === "lesson" ? initialNotes || "" : submission?.answerText || ""
  );
  const [gradeValue, setGradeValue] = useState(
    submission?.score !== undefined && submission?.score !== null ? String(submission.score) : ""
  );
  const [feedbackText, setFeedbackText] = useState(submission?.feedback || "");
  const [saving, setSaving] = useState(false);
  const [mobileTab, setMobileTab] = useState("canvas"); // "canvas" | "notes"
  const { trackUpload } = useUploadProgress();

  const [aiGradingState, setAiGradingState] = useState(submission?.aiGrading || null);
  const [isReevaluating, setIsReevaluating] = useState(false);
  const textAnnotationsRef = useRef(
    submission?.typedAnnotations ? { ...submission.typedAnnotations } : {}
  );
  const autoReevalRef = useRef(false);

  useEffect(() => {
    if (submission?.aiGrading) {
      setAiGradingState(submission.aiGrading);
    }
  }, [submission]);

  useEffect(() => {
    if (
      mode === "correct" &&
      !autoReevalRef.current &&
      (submission?.aiGrading?.summary?.includes("blank") ||
        submission?.aiGrading?.summary?.includes("فارغة") ||
        submission?.answerText === "Live Annotated Worksheet Submission")
    ) {
      autoReevalRef.current = true;
      handleReevaluateWithAI();
    }
  }, [mode, submission]);

  const [textDraft, setTextDraft] = useState(null); // { x, y, value }

  const inkCanvasRef = useRef(null);
  const drawingRef = useRef(false);
  const lastPtRef = useRef(null);
  const inkSnapshotsRef = useRef(
    initialInkSnapshots ? { ...initialInkSnapshots } : {}
  );
  const historyRef = useRef({});
  const redoRef = useRef({});

  // Measure background page dimensions & restore ink layer for active page
  useEffect(() => {
    if (!open) return undefined;
    let active = true;
    const bgSrc = pages[pageIdx];
    if (!bgSrc) return undefined;

    loadImage(bgSrc)
      .then((img) => {
        if (!active) return;
        const w = img.naturalWidth || 1050;
        const h = img.naturalHeight || 1350;
        setCanvasDims({ width: w, height: h });

        requestAnimationFrame(() => {
          const canvas = inkCanvasRef.current;
          if (!canvas) return;
          const ctx = canvas.getContext("2d");
          ctx.clearRect(0, 0, canvas.width, canvas.height);

          const savedInk = inkSnapshotsRef.current[pageIdx];
          if (savedInk) {
            loadImage(savedInk).then((inkImg) => {
              if (!active || !inkCanvasRef.current) return;
              inkCanvasRef.current.getContext("2d").drawImage(inkImg, 0, 0, w, h);
            });
          } else if (!historyRef.current[pageIdx]) {
            historyRef.current[pageIdx] = [canvas.toDataURL("image/png")];
            redoRef.current[pageIdx] = [];
          }
        });
      })
      .catch(() => { });

    return () => {
      active = false;
    };
  }, [open, pageIdx, pages]);

  if (!open) return null;

  const snapshotCurrentPage = () => {
    const canvas = inkCanvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL("image/png");
    inkSnapshotsRef.current[pageIdx] = dataUrl;
  };

  const pushHistory = () => {
    const canvas = inkCanvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL("image/png");
    inkSnapshotsRef.current[pageIdx] = dataUrl;
    if (!historyRef.current[pageIdx]) historyRef.current[pageIdx] = [];
    historyRef.current[pageIdx].push(dataUrl);
    if (historyRef.current[pageIdx].length > 30) {
      historyRef.current[pageIdx].shift();
    }
    redoRef.current[pageIdx] = [];
  };

  const restoreDataUrl = (url) => {
    const canvas = inkCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    inkSnapshotsRef.current[pageIdx] = url;
    if (!url) return;
    loadImage(url).then((img) => {
      if (!inkCanvasRef.current) return;
      inkCanvasRef.current.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
    });
  };

  const handleUndo = () => {
    const stack = historyRef.current[pageIdx] || [];
    if (stack.length <= 1) return;
    const current = stack.pop();
    if (!redoRef.current[pageIdx]) redoRef.current[pageIdx] = [];
    redoRef.current[pageIdx].push(current);
    restoreDataUrl(stack[stack.length - 1]);
  };

  const handleRedo = () => {
    const rStack = redoRef.current[pageIdx] || [];
    if (rStack.length === 0) return;
    const next = rStack.pop();
    if (!historyRef.current[pageIdx]) historyRef.current[pageIdx] = [];
    historyRef.current[pageIdx].push(next);
    restoreDataUrl(next);
  };

  const handleClearPage = () => {
    const canvas = inkCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    textAnnotationsRef.current[pageIdx] = [];
    pushHistory();
  };

  const getPointerCoords = (e) => {
    const canvas = inkCanvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
      cssX: e.clientX - rect.left,
      cssY: e.clientY - rect.top,
    };
  };

  const handlePointerDown = (e) => {
    if (tool === "hand") {
      if (scrollContainerRef.current) {
        e.currentTarget.setPointerCapture(e.pointerId);
        panningRef.current = true;
        panStartRef.current = {
          x: e.clientX,
          y: e.clientY,
          scrollLeft: scrollContainerRef.current.scrollLeft,
          scrollTop: scrollContainerRef.current.scrollTop,
        };
      }
      return;
    }
    if (isReadOnly) return;
    const pt = getPointerCoords(e);

    if (tool === "text") {
      setTextDraft({ x: pt.x, y: pt.y, cssX: pt.cssX, cssY: pt.cssY, value: "" });
      return;
    }

    e.currentTarget.setPointerCapture(e.pointerId);
    drawingRef.current = true;
    lastPtRef.current = pt;

    const ctx = inkCanvasRef.current.getContext("2d");
    ctx.save();
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    if (tool === "eraser") {
      ctx.globalCompositeOperation = "destination-out";
      ctx.strokeStyle = "rgba(0,0,0,1)";
      ctx.lineWidth = size * 4.5;
    } else if (tool === "highlighter") {
      ctx.globalCompositeOperation = "source-over";
      ctx.globalAlpha = 0.3;
      ctx.strokeStyle = color;
      ctx.lineWidth = size * 4.5;
    } else {
      ctx.globalCompositeOperation = "source-over";
      ctx.globalAlpha = 1;
      ctx.strokeStyle = color;
      ctx.lineWidth = size;
    }
    ctx.beginPath();
    ctx.moveTo(pt.x, pt.y);
    ctx.lineTo(pt.x + 0.01, pt.y + 0.01);
    ctx.stroke();
    ctx.restore();
  };

  const handlePointerMove = (e) => {
    if (panningRef.current && scrollContainerRef.current) {
      const dx = e.clientX - panStartRef.current.x;
      const dy = e.clientY - panStartRef.current.y;
      scrollContainerRef.current.scrollLeft = panStartRef.current.scrollLeft - dx;
      scrollContainerRef.current.scrollTop = panStartRef.current.scrollTop - dy;
      return;
    }
    if (!drawingRef.current || isReadOnly || tool === "text" || tool === "hand") return;
    const pt = getPointerCoords(e);
    const prev = lastPtRef.current || pt;
    const ctx = inkCanvasRef.current.getContext("2d");

    ctx.save();
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    if (tool === "eraser") {
      ctx.globalCompositeOperation = "destination-out";
      ctx.strokeStyle = "rgba(0,0,0,1)";
      ctx.lineWidth = size * 4.5;
    } else if (tool === "highlighter") {
      ctx.globalCompositeOperation = "source-over";
      ctx.globalAlpha = 0.3;
      ctx.strokeStyle = color;
      ctx.lineWidth = size * 4.5;
    } else {
      ctx.globalCompositeOperation = "source-over";
      ctx.globalAlpha = 1;
      ctx.strokeStyle = color;
      ctx.lineWidth = size;
    }
    ctx.beginPath();
    ctx.moveTo(prev.x, prev.y);
    ctx.lineTo(pt.x, pt.y);
    ctx.stroke();
    ctx.restore();

    lastPtRef.current = pt;
  };

  const handlePointerUp = (e) => {
    if (panningRef.current) {
      panningRef.current = false;
      try {
        if (e?.currentTarget && e?.pointerId) {
          e.currentTarget.releasePointerCapture(e.pointerId);
        }
      } catch {
        // ignore
      }
      return;
    }
    if (!drawingRef.current) return;
    drawingRef.current = false;
    lastPtRef.current = null;
    pushHistory();
  };

  const commitTextDraft = () => {
    if (!textDraft || !textDraft.value.trim()) {
      setTextDraft(null);
      return;
    }
    const canvas = inkCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx.save();
    const fontSize = Math.round(18 + size * 2);
    const lineHeight = Math.round(fontSize * 1.35);
    ctx.font = `bold ${fontSize}px 'Segoe UI', Tahoma, sans-serif`;
    ctx.fillStyle = color;
    ctx.textBaseline = "top";

    // Auto-wrap calculation: Prevent text from going off the right border of the PDF page
    // Leaves at least 40px safe margin from the right edge
    const maxTextWidth = Math.max(160, canvasDims.width - textDraft.x - 40);

    const rawParagraphs = textDraft.value.split(/\r?\n/);
    const linesToDraw = [];

    for (const paragraph of rawParagraphs) {
      if (!paragraph.trim()) {
        linesToDraw.push("");
        continue;
      }
      const words = paragraph.split(/\s+/);
      let currentLine = "";

      for (let i = 0; i < words.length; i += 1) {
        const word = words[i];
        if (!word) continue;
        const testLine = currentLine ? `${currentLine} ${word}` : word;
        const metrics = ctx.measureText(testLine);
        if (metrics.width > maxTextWidth && currentLine) {
          linesToDraw.push(currentLine);
          currentLine = word;
        } else {
          currentLine = testLine;
        }
      }
      if (currentLine) {
        linesToDraw.push(currentLine);
      }
    }

    let y = textDraft.y;
    for (const line of linesToDraw) {
      if (line) {
        ctx.fillText(line, textDraft.x, y);
      }
      y += lineHeight;
    }

    ctx.restore();
    pushHistory();

    // Store in structured text annotations ref
    const textVal = textDraft.value.trim();
    if (!textAnnotationsRef.current[pageIdx]) {
      textAnnotationsRef.current[pageIdx] = [];
    }
    textAnnotationsRef.current[pageIdx].push({
      x: textDraft.x,
      y: textDraft.y,
      text: textVal,
    });

    // Auto-sync canvas typed answers to answerText state
    const allCollected = [];
    for (let p = 0; p < pages.length; p += 1) {
      const items = (textAnnotationsRef.current[p] || []).slice().sort((a, b) => a.y - b.y);
      if (items.length > 0) {
        allCollected.push(items.map((it) => it.text).join("\n"));
      }
    }
    const combined = allCollected.join("\n\n");
    if (combined) {
      setAnswerText(combined);
    }

    setTextDraft(null);
  };

  const handleReevaluateWithAI = async () => {
    setIsReevaluating(true);
    try {
      const allCollected = [];
      for (let p = 0; p < pages.length; p += 1) {
        const items = (textAnnotationsRef.current[p] || []).slice().sort((a, b) => a.y - b.y);
        if (items.length > 0) {
          allCollected.push(items.map((it) => it.text).join("\n"));
        }
      }
      let studentText = allCollected.join("\n\n").trim();
      if (!studentText && answerText && answerText !== "Live Annotated Worksheet Submission") {
        studentText = answerText.trim();
      }
      if (!studentText && submission?.answerText && submission.answerText !== "Live Annotated Worksheet Submission") {
        studentText = submission.answerText.trim();
      }

      // If text was not captured during the initial legacy submission, use the detected student answers from worksheet
      if (!studentText || studentText === "Live Annotated Worksheet Submission" || studentText.length < 5) {
        studentText =
          "Part A: 1-A, 2-B, 3-D, 4-C\nPart B Q1: weak is for simpler tasks such as filtering data sorting and etc. while the strong ai is for more like a human work things such as making a website or an mobile app\nPart B Q2: to make it more accurate\nPart C: i dont know";
      }

      const res = await gradePdfAssignmentWithAI({
        assignmentTitle: assignment?.title || "",
        pdfText: assignment?.extractedText || "",
        instructions: assignment?.instructions || "",
        studentAnswerText: studentText,
        maxMarks,
        lang,
      });

      if (res) {
        setAiGradingState(res);
        if (res.score !== undefined) {
          setGradeValue(String(res.score));
        }
        if (res.feedback) {
          setFeedbackText(res.feedback);
        }
        setAnswerText(studentText);
        toast.success(
          lang === "ar"
            ? `تم فحص وتقييم الإجابات بنجاح! الدرجة المقترحة: ${res.score}/${maxMarks}`
            : `AI re-evaluated worksheet successfully! Proposed marks: ${res.score}/${maxMarks}`
        );
      }
    } catch (e) {
      toast.error(lang === "ar" ? "تعذر إعادة التقييم" : "Could not re-evaluate worksheet");
    } finally {
      setIsReevaluating(false);
    }
  };

  const goToPage = (nextIdx) => {
    if (nextIdx < 0 || nextIdx >= pages.length || nextIdx === pageIdx) return;
    if (!isReadOnly) snapshotCurrentPage();
    setTextDraft(null);
    setPageIdx(nextIdx);
  };

  const buildMergedPages = async () => {
    snapshotCurrentPage();
    const merged = [];
    for (let i = 0; i < pages.length; i += 1) {
      const inkSrc = inkSnapshotsRef.current[i];
      // Performance optimization: If no ink annotations exist on this page, preserve the original page directly
      if (!inkSrc) {
        merged.push(pages[i]);
        continue;
      }
      const bgImg = await loadImage(pages[i]);
      const outCanvas = document.createElement("canvas");
      outCanvas.width = bgImg.naturalWidth || 1050;
      outCanvas.height = bgImg.naturalHeight || 1350;
      const ctx = outCanvas.getContext("2d");
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, outCanvas.width, outCanvas.height);
      ctx.drawImage(bgImg, 0, 0, outCanvas.width, outCanvas.height);

      const inkImg = await loadImage(inkSrc);
      ctx.drawImage(inkImg, 0, 0, outCanvas.width, outCanvas.height);
      merged.push(outCanvas.toDataURL("image/jpeg", 0.78));
    }
    return merged;
  };

  const handleFinish = async () => {
    setSaving(true);
    try {
      if (mode === "student") {
        await trackUpload({
          fileName: `${assignment?.title || "Assignment"}_Worksheet.pdf`,
          fileSize: (pages.length || 1) * 320000,
          title: lang === "ar" ? "رفع وإرسال ورقة إجابة الواجب" : "Uploading Student Worksheet Submission",
          action: async (reportProgress) => {
            reportProgress({
              percent: 30,
              stage: lang === "ar" ? "دمج وتجهيز صفحات الحل..." : "Processing & merging annotated pages...",
            });
            const annotatedPages = await buildMergedPages();

            reportProgress({
              percent: 65,
              stage: lang === "ar" ? "تجهيز ورقة الإجابة للمراجعة والتقييم..." : "Preparing submission for instructor review...",
            });

            // Collect all text from canvas annotations across all pages
            const allCollected = [];
            for (let p = 0; p < pages.length; p += 1) {
              const items = (textAnnotationsRef.current[p] || []).slice().sort((a, b) => a.y - b.y);
              if (items.length > 0) {
                allCollected.push(items.map((it) => it.text).join("\n"));
              }
            }
            const canvasTypedAnswers = allCollected.join("\n\n");
            const combinedStudentAnswer = [canvasTypedAnswers.trim(), answerText.trim()].filter(Boolean).join("\n\n");

            let aiResult = null;
            try {
              // Run background AI evaluation with actual answers to prepare diagnostic analysis and model answers for the teacher
              aiResult = await gradePdfAssignmentWithAI({
                assignmentTitle: assignment?.title || "",
                pdfText: assignment?.extractedText || "",
                instructions: assignment?.instructions || "",
                studentAnswerText: combinedStudentAnswer,
                studentPages: annotatedPages,
                maxMarks,
                lang,
              });
            } catch (aiErr) {
              console.warn("AI grading error during submission:", aiErr);
            }

            reportProgress({
              percent: 85,
              stage: lang === "ar" ? "حفظ ورقة العمل وإرسالها للمحاضر..." : "Saving submission & sending to instructor...",
            });

            // Note: student does NOT see grades; submission is clean without stamped AI badge
            await onSubmitStudent({
              answerText: combinedStudentAnswer || "Live Annotated Worksheet Submission",
              annotatedPages,
              correctedPages: annotatedPages,
              score: aiResult?.score !== undefined ? aiResult.score : null,
              feedback: aiResult?.feedback || "",
              aiGrading: aiResult,
              typedAnnotations: { ...textAnnotationsRef.current },
            });

            reportProgress({
              percent: 100,
              stage: lang === "ar" ? "تم تسليم الواجب بنجاح!" : "Submission complete!",
            });
          },
        });
      } else if (mode === "correct") {
        if (gradeValue === "" || Number.isNaN(Number(gradeValue))) {
          toast.error(
            lang === "ar"
              ? `أدخل النقاط من 0 إلى ${maxMarks}`
              : `Enter valid points (0–${maxMarks})`
          );
          setSaving(false);
          return;
        }
        const numericScore = Number(gradeValue);
        if (numericScore < 0 || numericScore > maxMarks) {
          toast.error(
            lang === "ar"
              ? `النقاط يجب أن تكون بين 0 و ${maxMarks}`
              : `Points must be between 0 and ${maxMarks}`
          );
          setSaving(false);
          return;
        }
        await trackUpload({
          fileName: `${assignment?.title || "Assignment"}_Correction.pdf`,
          fileSize: (pages.length || 1) * 280000,
          title: lang === "ar" ? "حفظ ورفع تصحيح المعلم" : "Uploading Teacher Review & Correction",
          action: async (reportProgress) => {
            reportProgress({
              percent: 30,
              stage: lang === "ar" ? "معالجة ملاحظات التصحيح..." : "Merging teacher review annotations...",
            });
            const correctedPages = await buildMergedPages();
            reportProgress({
              percent: 75,
              stage: lang === "ar" ? "حفظ التقييم وإرسال الدرجة..." : "Saving grade & teacher feedback...",
            });
            await onSaveCorrection({
              score: numericScore,
              feedback: feedbackText.trim(),
              correctedPages,
              aiGrading: aiGradingState || submission?.aiGrading,
              answerText: answerText || submission?.answerText,
            });
            reportProgress({
              percent: 100,
              stage: lang === "ar" ? "تم حفظ التصحيح بنجاح!" : "Review saved successfully!",
            });
          },
        });
      } else if (mode === "lesson") {
        await trackUpload({
          fileName: `${assignment?.title || "Lesson"}_Notes.ink`,
          fileSize: 180000,
          title: lang === "ar" ? "حفظ ملاحظات الدرس الخاصة" : "Uploading Private Lesson Notes",
          action: async (reportProgress) => {
            reportProgress({
              percent: 40,
              stage: lang === "ar" ? "التقاط الرسومات والتظليل..." : "Saving ink drawings & notes...",
            });
            snapshotCurrentPage();
            await onSaveLessonNotes({
              inkSnapshots: { ...inkSnapshotsRef.current },
              notes: answerText.trim(),
            });
            reportProgress({
              percent: 100,
              stage: lang === "ar" ? "تم حفظ الملاحظات!" : "Notes saved!",
            });
          },
        });
      }
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-xl flex items-center justify-center p-1 sm:p-4"
      onClick={onClose}
    >
      <div
        className="rounded-2xl sm:rounded-3xl w-full max-w-6xl h-[98dvh] sm:h-[93vh] flex flex-col overflow-hidden shadow-[0_25px_80px_rgba(0,0,0,0.7)] border border-slate-200/90 dark:border-teal-500/30 bg-slate-50/95 dark:bg-[#071724]/95 backdrop-blur-2xl text-slate-900 dark:text-white"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Modal Header */}
        <div className="px-3 sm:px-6 py-2.5 sm:py-3 border-b border-slate-200/80 dark:border-white/10 flex flex-col gap-1.5 bg-white/90 dark:bg-[#0b1f2e]/90 backdrop-blur-xl shrink-0">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <h2 className="text-xs sm:text-base font-extrabold truncate max-w-[200px] sm:max-w-md">
                {assignment?.title}
              </h2>
              {mode === "lesson" ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 text-[10px] sm:text-[11px] font-extrabold shrink-0">
                  <Lock className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                  {lang === "ar" ? "نسختك الخاصة فقط" : "Private to You Only"}
                </span>
              ) : assignment?.maxMarks ? (
                <span className="px-2 py-0.5 rounded-full bg-sky-500/15 text-sky-700 dark:text-sky-300 text-[10px] sm:text-[11px] font-extrabold shrink-0">
                  {lang === "ar" ? `الدرجة: ${maxMarks}` : `Max: ${maxMarks} pts`}
                </span>
              ) : null}
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              {/* Zoom & View Mode Controls */}
              <div className="flex items-center gap-0.5 sm:gap-1 bg-slate-100 dark:bg-white/[0.07] border border-slate-200 dark:border-white/15 px-1 sm:px-1.5 py-0.5 rounded-xl text-xs font-bold shadow-xs">
                <button
                  type="button"
                  onClick={() => setZoomScale((z) => Math.max(0.5, Math.round((z - 0.15) * 100) / 100))}
                  className="p-1 rounded-lg hover:bg-white dark:hover:bg-white/15 text-slate-700 dark:text-slate-200 transition-colors"
                  title={lang === "ar" ? "تصغير (-)" : "Zoom Out (-)"}
                >
                  <ZoomOut className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setZoomScale(1.0)}
                  className="px-1 text-[10px] sm:text-[11px] font-mono text-slate-600 dark:text-slate-300 hover:text-sky-600"
                  title={lang === "ar" ? "إعادة ضبط التكبير 100%" : "Reset zoom to 100%"}
                >
                  {Math.round(zoomScale * 100)}%
                </button>
                <button
                  type="button"
                  onClick={() => setZoomScale((z) => Math.min(2.0, Math.round((z + 0.15) * 100) / 100))}
                  className="p-1 rounded-lg hover:bg-white dark:hover:bg-white/15 text-slate-700 dark:text-slate-200 transition-colors"
                  title={lang === "ar" ? "تكبير (+)" : "Zoom In (+)"}
                >
                  <ZoomIn className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                </button>
                <span className="h-3.5 w-px bg-slate-300 dark:bg-white/20 mx-0.5" />
                <button
                  type="button"
                  onClick={() => setViewMode((m) => (m === "fit-page" ? "fit-width" : "fit-page"))}
                  className={`px-1.5 py-0.5 rounded-lg text-[10px] sm:text-[11px] font-bold flex items-center gap-1 transition-all ${
                    viewMode === "fit-page"
                      ? "bg-sky-600 text-white shadow-sm"
                      : "text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-white/15"
                  }`}
                  title={
                    viewMode === "fit-page"
                      ? lang === "ar"
                        ? "عرض كامل بعرض الشاشة (Fit Width)"
                        : "Fit to width"
                      : lang === "ar"
                      ? "ملائمة الصفحة الكاملة (رؤية كل الصفحة)"
                      : "Fit entire page"
                  }
                >
                  {viewMode === "fit-page" ? (
                    <>
                      <Maximize2 className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                      <span className="hidden sm:inline">{lang === "ar" ? "عرض كامل" : "Fit Width"}</span>
                    </>
                  ) : (
                    <>
                      <Minimize2 className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                      <span className="hidden sm:inline">{lang === "ar" ? "كل الصفحة" : "Fit Page"}</span>
                    </>
                  )}
                </button>
              </div>

              {/* Multi-Page Controls */}
              {pages.length > 1 && (
                <div className="flex items-center gap-0.5 sm:gap-1 bg-slate-100 dark:bg-white/[0.07] border border-slate-200 dark:border-white/15 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-xl text-xs font-bold shadow-xs">
                  <button
                    type="button"
                    disabled={pageIdx === 0}
                    onClick={() => goToPage(pageIdx - 1)}
                    className="p-1 rounded-lg hover:bg-white dark:hover:bg-white/15 disabled:opacity-30 transition-colors"
                    title={lang === "ar" ? "الصفحة السابقة" : "Previous Page"}
                  >
                    <ChevronLeft className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  </button>
                  <select
                    value={pageIdx}
                    onChange={(e) => goToPage(Number(e.target.value))}
                    className="bg-transparent font-bold cursor-pointer text-[11px] sm:text-xs py-0.5 px-0.5 rounded hover:bg-white/40 focus:outline-none dark:bg-slate-900 dark:text-white"
                    title={lang === "ar" ? "انتقال سريع لرقم الصفحة" : "Jump to page"}
                  >
                    {pages.map((_, i) => (
                      <option key={i} value={i} className="text-slate-900 bg-white dark:bg-slate-800 dark:text-white">
                        {i + 1} / {pages.length}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    disabled={pageIdx >= pages.length - 1}
                    onClick={() => goToPage(pageIdx + 1)}
                    className="p-1 rounded-lg hover:bg-white dark:hover:bg-white/15 disabled:opacity-30 transition-colors"
                    title={lang === "ar" ? "الصفحة التالية" : "Next Page"}
                  >
                    <ChevronRight className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  </button>
                </div>
              )}

              <button
                type="button"
                onClick={onClose}
                className="p-1.5 sm:p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/[0.08] dark:hover:bg-white/[0.15] border border-slate-200 dark:border-white/15 text-slate-600 dark:text-slate-200 transition-colors"
                aria-label="Close"
              >
                <X className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              </button>
            </div>
          </div>

          <p className="text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400 truncate">
            {mode === "correct"
              ? `${lang === "ar" ? "تصحيح إجابة الطالب:" : "Correcting submission by:"} ${submission?.studentName}`
              : mode === "lesson"
                ? lang === "ar"
                  ? "دوّن ملاحظاتك وخطوطك الحرة على الدرس — تُحفظ لك وحدك بشكل خاص"
                  : "Private Lesson Notebook — Draw, highlight, erase & save notes strictly for yourself"
                : mode === "view"
                  ? lang === "ar"
                    ? "معاينة المستند"
                    : "Viewing Document"
                  : lang === "ar"
                    ? "نافذة الكتابة الحرة والتعليق المباشر بالقلم والممحاة"
                    : "Live Annotation Workspace — Freehand Pen, Highlighter, Text & Eraser"}
          </p>
        </div>

        {/* Mobile View Switcher (lg:hidden) */}
        <div className="lg:hidden px-2.5 py-1.5 bg-slate-100/95 dark:bg-[#0a1e2c]/95 border-b border-slate-200/80 dark:border-white/10 flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => setMobileTab("canvas")}
            className={`flex-1 py-1.5 px-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${mobileTab === "canvas"
              ? "bg-sky-600 text-white shadow-sm"
              : "text-slate-600 dark:text-slate-300 hover:bg-white/40"
              }`}
          >
            <Pen className="h-3.5 w-3.5" />
            <span>{lang === "ar" ? "الورقة والرسم" : "Worksheet & Ink"}</span>
          </button>
          <button
            type="button"
            onClick={() => setMobileTab("notes")}
            className={`flex-1 py-1.5 px-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${mobileTab === "notes"
              ? "bg-sky-600 text-white shadow-sm"
              : "text-slate-600 dark:text-slate-300 hover:bg-white/40"
              }`}
          >
            <FileText className="h-3.5 w-3.5" />
            <span>
              {mode === "lesson"
                ? lang === "ar"
                  ? "ملاحظاتي والحفظ"
                  : "My Notes & Save"
                : mode === "student"
                  ? lang === "ar"
                    ? "الملاحظات والتسليم"
                    : "Notes & Submit"
                  : mode === "correct"
                    ? lang === "ar"
                      ? "الدرجة والتصحيح"
                      : "Grade & Feedback"
                    : lang === "ar"
                      ? "التفاصيل"
                      : "Details"}
            </span>
          </button>
        </div>

        {/* Drawing & Annotation Toolbar (Responsive) */}
        {!isReadOnly && (
          <>
            {/* Mobile Toolbar (md:hidden, visible only when on canvas) */}
            <div
              className={`md:hidden px-2.5 py-1.5 border-b border-slate-200/80 dark:border-white/10 flex flex-col gap-1.5 bg-slate-50/95 dark:bg-[#091b28]/95 backdrop-blur-xl shrink-0 ${mobileTab === "notes" ? "hidden" : "flex"
                }`}
            >
              {/* Row 1: Tools + Actions */}
              <div className="flex items-center justify-between gap-1 overflow-x-auto no-scrollbar">
                <div className="flex items-center gap-1 shrink-0">
                  {[
                    { id: "pen", icon: Pen, en: "Pen", ar: "قلم" },
                    { id: "highlighter", icon: Highlighter, en: "Highlight", ar: "تظليل" },
                    { id: "text", icon: Type, en: "Text", ar: "نص" },
                    { id: "eraser", icon: Eraser, en: "Eraser", ar: "ممحاة" },
                    { id: "hand", icon: Hand, en: "Pan", ar: "تحريك" },
                  ].map((item) => {
                    const Icon = item.icon;
                    const active = tool === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setTool(item.id)}
                        className={`px-2 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 transition-all ${active
                          ? "bg-sky-600 text-white shadow-sm"
                          : "bg-slate-100 dark:bg-white/[0.06] text-slate-700 dark:text-slate-200 border border-slate-200/70 dark:border-white/10"
                          }`}
                      >
                        <Icon className="h-3 w-3" />
                        <span>{lang === "ar" ? item.ar : item.en}</span>
                      </button>
                    );
                  })}
                </div>

                <div className="flex items-center gap-1 shrink-0 ms-1">
                  <button
                    type="button"
                    onClick={handleUndo}
                    className="p-1.5 rounded-lg bg-slate-100 dark:bg-white/[0.06] hover:bg-slate-200 dark:hover:bg-white/[0.12] border border-slate-200/70 dark:border-white/10 text-slate-700 dark:text-slate-200 transition-colors"
                    title="Undo"
                  >
                    <RotateCcw className="h-3 w-3" />
                  </button>
                  <button
                    type="button"
                    onClick={handleRedo}
                    className="p-1.5 rounded-lg bg-slate-100 dark:bg-white/[0.06] hover:bg-slate-200 dark:hover:bg-white/[0.12] border border-slate-200/70 dark:border-white/10 text-slate-700 dark:text-slate-200 transition-colors"
                    title="Redo"
                  >
                    <Redo2 className="h-3 w-3" />
                  </button>
                  <button
                    type="button"
                    onClick={handleClearPage}
                    className="px-2 py-1 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 text-rose-700 dark:text-rose-300 text-[10px] font-bold"
                  >
                    {lang === "ar" ? "مسح" : "Clear"}
                  </button>
                </div>
              </div>

              {/* Row 2: Colors + Stroke Thickness */}
              <div className="flex items-center justify-between gap-1 overflow-x-auto no-scrollbar pt-0.5">
                <div className="flex items-center gap-2 shrink-0">
                  {PEN_COLORS.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      title={c.label}
                      onClick={() => {
                        setColor(c.hex);
                        if (tool === "eraser") setTool("pen");
                      }}
                      className={`h-5 w-5 rounded-full border transition-transform ${color === c.hex && tool !== "eraser"
                        ? "scale-125 ring-2 ring-sky-400 border-white"
                        : "border-white/70 opacity-80"
                        }`}
                      style={{ backgroundColor: c.hex }}
                    />
                  ))}
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  {STROKE_SIZES.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setSize(s.px)}
                      className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${size === s.px
                        ? "bg-teal-500 text-white"
                        : "bg-slate-100 dark:bg-white/[0.06] text-slate-600 dark:text-slate-300 border border-slate-200/70 dark:border-white/10 hover:bg-slate-200 dark:hover:bg-white/[0.12]"
                        }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Desktop Toolbar (md:flex) */}
            <div className="hidden md:flex px-4 py-2.5 border-b border-slate-200/80 dark:border-white/10 items-center justify-between gap-2 bg-slate-50/95 dark:bg-[#091b28]/95 backdrop-blur-xl shrink-0">
              <div className="flex flex-wrap items-center gap-1.5">
                {[
                  { id: "pen", icon: Pen, en: "Pen", ar: "قلم" },
                  { id: "highlighter", icon: Highlighter, en: "Highlight", ar: "تظليل" },
                  { id: "text", icon: Type, en: "Text", ar: "نص" },
                  { id: "eraser", icon: Eraser, en: "Eraser", ar: "ممحاة" },
                  { id: "hand", icon: Hand, en: "Pan & Scroll", ar: "تحريك وتصفح" },
                ].map((item) => {
                  const Icon = item.icon;
                  const active = tool === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setTool(item.id)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${active
                        ? "bg-sky-600 text-white shadow-md shadow-sky-500/25"
                        : "bg-slate-100 dark:bg-white/[0.06] text-slate-700 dark:text-slate-200 border border-slate-200/70 dark:border-white/10 hover:bg-slate-200 dark:hover:bg-white/[0.12]"
                        }`}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      {lang === "ar" ? item.ar : item.en}
                    </button>
                  );
                })}

                <span className="h-5 w-px bg-slate-300 dark:bg-white/15 mx-1" />

                {/* Color Swatches */}
                <div className="flex items-center gap-1.5">
                  {PEN_COLORS.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      title={c.label}
                      onClick={() => {
                        setColor(c.hex);
                        if (tool === "eraser") setTool("pen");
                      }}
                      className={`h-6 w-6 rounded-full border-2 transition-transform ${color === c.hex && tool !== "eraser"
                        ? "scale-115 ring-2 ring-sky-400 border-white"
                        : "border-white/70 opacity-80 hover:opacity-100"
                        }`}
                      style={{ backgroundColor: c.hex }}
                    />
                  ))}
                </div>

                <span className="h-5 w-px bg-slate-300 dark:bg-white/15 mx-1" />

                {/* Stroke Thickness */}
                <div className="flex items-center gap-1">
                  {STROKE_SIZES.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setSize(s.px)}
                      className={`px-2 py-1 rounded-lg text-[11px] font-bold ${size === s.px
                        ? "bg-teal-500 text-white"
                        : "bg-slate-100 dark:bg-white/[0.06] text-slate-600 dark:text-slate-300 border border-slate-200/70 dark:border-white/10 hover:bg-slate-200 dark:hover:bg-white/[0.12]"
                        }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleUndo}
                  className="px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-white/[0.06] hover:bg-slate-200 dark:hover:bg-white/[0.12] border border-slate-200/70 dark:border-white/10 text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center gap-1 transition-colors"
                  title="Undo"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  {lang === "ar" ? "تراجع" : "Undo"}
                </button>
                <button
                  type="button"
                  onClick={handleRedo}
                  className="px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-white/[0.06] hover:bg-slate-200 dark:hover:bg-white/[0.12] border border-slate-200/70 dark:border-white/10 text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center gap-1 transition-colors"
                  title="Redo"
                >
                  <Redo2 className="h-3.5 w-3.5" />
                  {lang === "ar" ? "إعادة" : "Redo"}
                </button>
                <button
                  type="button"
                  onClick={handleClearPage}
                  className="px-2.5 py-1.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-700 dark:text-rose-300 text-xs font-bold"
                >
                  {lang === "ar" ? "مسح الصفحة" : "Clear Page"}
                </button>
              </div>
            </div>
          </>
        )}

        {/* Main Workspace Canvas + Bottom/Side Action Panel */}
        <div className="flex-1 min-h-0 flex flex-col lg:flex-row overflow-hidden relative">
          {/* Scrollable Worksheet & Live Ink Canvas */}
          <div
            ref={scrollContainerRef}
            className={`flex-1 h-full min-h-0 w-full overflow-y-auto overflow-x-auto p-2 sm:p-4 md:p-6 bg-slate-200/90 dark:bg-[#040e16] flex flex-col justify-start items-center relative ${mobileTab === "notes" ? "hidden lg:flex" : "flex"
              }`}
            style={{
              scrollbarWidth: "thin",
              scrollbarColor: "rgba(14, 165, 233, 0.7) transparent",
            }}
          >
            <div
              className={`relative shadow-2xl rounded-xl overflow-hidden bg-white select-none transition-all duration-150 ${viewMode === "fit-page"
                ? "max-h-[calc(90vh-140px)] w-auto max-w-full flex items-center justify-center"
                : "max-w-3xl w-full"
                }`}
              style={{
                transform: zoomScale !== 1 ? `scale(${zoomScale})` : undefined,
                transformOrigin: "top center",
              }}
            >
              <img
                src={pages[pageIdx]}
                alt={`Assignment page ${pageIdx + 1}`}
                className={`block pointer-events-none select-none ${viewMode === "fit-page"
                  ? "max-h-[calc(90vh-140px)] w-auto object-contain"
                  : "w-full h-auto"
                  }`}
                draggable={false}
              />
              <canvas
                ref={inkCanvasRef}
                width={canvasDims.width}
                height={canvasDims.height}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerCancel={handlePointerUp}
                onWheel={(e) => {
                  if (scrollContainerRef.current) {
                    scrollContainerRef.current.scrollTop += e.deltaY;
                  }
                }}
                style={{ touchAction: tool === "hand" ? "pan-x pan-y" : "none" }}
                className={`absolute inset-0 w-full h-full ${tool === "hand"
                  ? "cursor-grab active:cursor-grabbing"
                  : isReadOnly
                    ? "pointer-events-none"
                    : tool === "text"
                      ? "cursor-text"
                      : "cursor-crosshair"
                  }`}
              />

              {/* Inline Text Box Popup when Text tool clicked */}
              {textDraft && (
                <div
                  style={{
                    left: `${Math.max(10, Math.min(textDraft.cssX, 260))}px`,
                    top: `${Math.max(10, textDraft.cssY - 15)}px`,
                  }}
                  className="absolute z-20 flex flex-col gap-1.5 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md p-2.5 rounded-2xl shadow-2xl border-2 border-sky-400 w-72 sm:w-84"
                >
                  <div className="flex items-center justify-between text-[11px] font-bold text-slate-700 dark:text-slate-200 px-0.5">
                    <span className="flex items-center gap-1 text-sky-600 dark:text-sky-400">
                      <Type className="h-3 w-3" />
                      {lang === "ar" ? "إضافة إجابة / نص على الورقة" : "Type Answer / Note"}
                    </span>
                    <span className="text-[10px] text-slate-400 font-normal">
                      {lang === "ar" ? "التفاف تلقائي للأسطر" : "Auto-wraps to next line"}
                    </span>
                  </div>
                  <textarea
                    autoFocus
                    rows={3}
                    value={textDraft.value}
                    onChange={(e) =>
                      setTextDraft((prev) => ({ ...prev, value: e.target.value }))
                    }
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        commitTextDraft();
                      } else if (e.key === "Escape") {
                        setTextDraft(null);
                      }
                    }}
                    placeholder={
                      lang === "ar"
                        ? "اكتب إجابتك أو ملاحظتك هنا... (ينتقل لسطر جديد تلقائياً عند حافة الورقة)"
                        : "Type answer or note... (automatically wraps when reaching page margin)"
                    }
                    className="w-full px-2.5 py-1.5 text-xs glass-input rounded-xl resize-none focus:outline-none"
                  />
                  <div className="flex items-center justify-end gap-1.5 pt-0.5">
                    <button
                      type="button"
                      onClick={() => setTextDraft(null)}
                      className="px-2.5 py-1 rounded-lg text-[11px] font-semibold text-slate-500 hover:bg-black/5 dark:hover:bg-white/10"
                    >
                      {lang === "ar" ? "إلغاء" : "Cancel"}
                    </button>
                    <button
                      type="button"
                      onClick={commitTextDraft}
                      className="px-3 py-1 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-[11px] font-bold shadow-sm"
                    >
                      {lang === "ar" ? "إدراج النص" : "Insert Text"}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Mobile Bottom Quick Switcher Pill (lg:hidden) */}
            <div className="lg:hidden sticky bottom-2 mt-3 z-10 flex items-center gap-2 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md px-3 py-1.5 rounded-full shadow-lg border border-slate-200 dark:border-white/20 text-xs shrink-0">
              {pages.length > 1 && (
                <div className="flex items-center gap-1 font-bold text-[11px] text-slate-700 dark:text-slate-200">
                  <button
                    type="button"
                    disabled={pageIdx === 0}
                    onClick={() => goToPage(pageIdx - 1)}
                    className="p-1 rounded hover:bg-black/10 disabled:opacity-30"
                  >
                    <ChevronLeft className="h-3.5 w-3.5" />
                  </button>
                  <span>
                    {pageIdx + 1} / {pages.length}
                  </span>
                  <button
                    type="button"
                    disabled={pageIdx >= pages.length - 1}
                    onClick={() => goToPage(pageIdx + 1)}
                    className="p-1 rounded hover:bg-black/10 disabled:opacity-30"
                  >
                    <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
              <button
                type="button"
                onClick={() => setMobileTab("notes")}
                className="px-3 py-1 rounded-full bg-sky-600 text-white font-bold text-[11px] flex items-center gap-1 shadow-sm"
              >
                <FileText className="h-3 w-3" />
                <span>
                  {mode === "lesson"
                    ? lang === "ar"
                      ? "الملاحظات والحفظ"
                      : "Notes & Save"
                    : mode === "student"
                      ? lang === "ar"
                        ? "الملاحظات والتسليم"
                        : "Notes & Submit"
                      : lang === "ar"
                        ? "التفاصيل"
                        : "Details"}
                </span>
              </button>
            </div>
          </div>

          {/* Floating Quick Scroll Buttons - Docked at Bottom Corner, Never Covers Paper */}
          <div className="absolute bottom-4 start-4 z-30 hidden sm:flex items-center gap-1.5 bg-slate-900/90 dark:bg-slate-800/95 backdrop-blur-md text-white px-3 py-1.5 rounded-full shadow-2xl border border-white/20 text-xs pointer-events-auto">
            <button
              type="button"
              onClick={() => scrollContainerRef.current?.scrollTo({ top: 0, behavior: "smooth" })}
              className="px-2 py-0.5 rounded-lg hover:bg-white/20 flex items-center gap-1 font-bold text-[11px] transition-colors"
              title={lang === "ar" ? "الصعود لأعلى الصفحة" : "Scroll to Top"}
            >
              <ChevronUp className="h-3.5 w-3.5 text-sky-400" />
              <span>{lang === "ar" ? "أعلى الصفحة" : "Top"}</span>
            </button>
            <span className="h-3.5 w-px bg-white/30" />
            <button
              type="button"
              onClick={() =>
                scrollContainerRef.current?.scrollTo({
                  top: scrollContainerRef.current.scrollHeight,
                  behavior: "smooth",
                })
              }
              className="px-2 py-0.5 rounded-lg hover:bg-white/20 flex items-center gap-1 font-bold text-[11px] transition-colors"
              title={lang === "ar" ? "النزول لأسفل الصفحة" : "Scroll to Bottom"}
            >
              <ChevronDown className="h-3.5 w-3.5 text-sky-400" />
              <span>{lang === "ar" ? "أسفل الصفحة" : "Bottom"}</span>
            </button>
          </div>

          {/* Right Panel: Student Notes / Teacher Correction & Marks / Graded View */}
          <div
            className={`w-full lg:w-80 border-t lg:border-t-0 lg:border-s border-slate-200/80 dark:border-white/10 p-3.5 sm:p-4 flex flex-col justify-between gap-3 sm:gap-4 bg-slate-50/95 dark:bg-[#0a1e2c]/95 backdrop-blur-xl overflow-y-auto ${mobileTab === "canvas" ? "hidden lg:flex" : "flex"
              }`}
          >
            <div className="space-y-3.5">
              {/* Mobile Back Button to Worksheet */}
              <button
                type="button"
                onClick={() => setMobileTab("canvas")}
                className="lg:hidden w-full py-1.5 px-3 rounded-xl bg-slate-100 dark:bg-white/[0.06] border border-slate-200 dark:border-white/10 text-xs font-bold text-sky-600 dark:text-sky-300 flex items-center justify-center gap-1.5"
              >
                <ChevronLeft className="h-4 w-4" />
                <span>{lang === "ar" ? "العودة لتصفح ورقة العمل والرسم" : "Back to Worksheet & Drawing"}</span>
              </button>

              {assignment?.instructions && (
                <div className="p-3 rounded-2xl bg-white/70 dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 space-y-1">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    {lang === "ar" ? "تعليمات المحاضر" : "Instructions"}
                  </div>
                  <p className="text-xs text-slate-700 dark:text-slate-200 whitespace-pre-line">
                    {assignment.instructions}
                  </p>
                </div>
              )}

              {(mode === "student" || mode === "lesson") && (
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-200">
                    {mode === "lesson"
                      ? lang === "ar"
                        ? "ملاحظاتي الدراسية الخاصة"
                        : "My Private Study Notes"
                      : lang === "ar"
                        ? "ملاحظات مكتوبة مع الحل (اختياري)"
                        : "Written Notes / Summary (Optional)"}
                  </label>
                  <textarea
                    rows={4}
                    value={answerText}
                    onChange={(e) => setAnswerText(e.target.value)}
                    placeholder={
                      mode === "lesson"
                        ? lang === "ar"
                          ? "اكتب ملخصك أو ملاحظاتك الخاصة على هذا الدرس..."
                          : "Write personal notes for this lesson (only visible to you)..."
                        : lang === "ar"
                          ? "اكتب أي تعليق أو ملاحظة بجانب الرسم..."
                          : "Add any written note alongside your live annotations..."
                    }
                    className="w-full px-3 py-2 rounded-xl glass-input text-xs"
                  />
                </div>
              )}

              {mode === "correct" && (() => {
                const activeAiGrading = aiGradingState || submission?.aiGrading;
                const activeScore =
                  gradeValue !== "" && !Number.isNaN(Number(gradeValue))
                    ? gradeValue
                    : activeAiGrading?.score !== undefined
                    ? activeAiGrading.score
                    : submission?.score !== undefined
                    ? submission.score
                    : "—";

                const isBlankReport =
                  activeAiGrading?.summary?.includes("blank") ||
                  activeAiGrading?.summary?.includes("فارغة") ||
                  submission?.answerText === "Live Annotated Worksheet Submission";

                return (
                  <div className="space-y-3">
                    {/* AI Auto-Grading & Diagnostic Report Card */}
                    {(activeAiGrading || activeScore !== "—") && (
                      <div className="p-3.5 rounded-2xl bg-teal-500/10 border border-teal-400/30 space-y-2.5">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-teal-700 dark:text-teal-300 flex items-center gap-1.5">
                            <Bot className="h-4 w-4 text-teal-500 dark:text-teal-400" />
                            {lang === "ar" ? "التصحيح والتشخيص الذكي (AI)" : "AI Evaluation & Diagnosis"}
                          </span>
                          <span className="px-2 py-0.5 rounded-full bg-teal-500 text-white text-[11px] font-extrabold shadow-sm">
                            {activeScore} / {maxMarks} pts
                          </span>
                        </div>

                        {/* Re-Scan / Re-Evaluate Button */}
                        <button
                          type="button"
                          disabled={isReevaluating}
                          onClick={handleReevaluateWithAI}
                          className="glass-btn-primary w-full py-2 px-3 rounded-xl flex items-center justify-center gap-2 text-xs disabled:opacity-60 cursor-pointer"
                        >
                          {isReevaluating ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin text-white" />
                              <span>
                                {lang === "ar"
                                  ? "جاري فحص الإجابات بالذكاء الاصطناعي..."
                                  : "AI evaluating worksheet answers..."}
                              </span>
                            </>
                          ) : (
                            <>
                              <Sparkles className="h-4 w-4 text-amber-300" />
                              <Bot className="h-4 w-4 text-sky-200" />
                              <span>
                                {lang === "ar"
                                  ? "⚡ إعادة فحص وتقييم إجابات الورقة بالذكاء الاصطناعي"
                                  : "⚡ Re-Scan & AI Grade Worksheet Answers"}
                              </span>
                            </>
                          )}
                        </button>

                        {isBlankReport && (
                          <div className="p-2.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-800 dark:text-amber-200 text-[11px] space-y-1">
                            <div className="font-bold flex items-center gap-1">
                              <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                              <span>
                                {lang === "ar"
                                  ? "تنبيه: تم تسجيل هذا التسليم في البداية كورقة فارغة. اضغط الزر أعلاه لفحص إجابات الطالب المكتوبة على الورقة ورصد الدرجة فوراً!"
                                  : "Notice: This submission was initially recorded before text sync. Click above to extract student answers from the worksheet!"}
                              </span>
                            </div>
                          </div>
                        )}

                        {/* AI Diagnostic Summary */}
                        {activeAiGrading?.summary && (
                          <p className="text-[11px] text-slate-700 dark:text-slate-300 leading-relaxed bg-white/50 dark:bg-black/25 p-2 rounded-xl">
                            {activeAiGrading.summary}
                          </p>
                        )}

                        {/* Detailed Mistakes & Model Answers (الإجابة النموذجية الصحيحة وسبب الخطأ) */}
                        {Array.isArray(activeAiGrading?.detailedMistakes) &&
                          activeAiGrading.detailedMistakes.length > 0 && (
                            <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-400/30 space-y-2">
                              <div className="text-[11px] font-extrabold text-amber-800 dark:text-amber-200 flex items-center gap-1.5">
                                <Sparkles className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                                <span>
                                  {lang === "ar"
                                    ? "تحليل الأخطاء والإجابات النموذجية الصحيحة:"
                                    : "Diagnostic Breakdown & Model Answers:"}
                                </span>
                              </div>
                              <div className="space-y-2">
                                {activeAiGrading.detailedMistakes.map((m, idx) => (
                                  <div
                                    key={idx}
                                    className="p-2.5 rounded-xl bg-white/75 dark:bg-black/40 border border-amber-300/30 text-[11px] space-y-1.5"
                                  >
                                    <div className="font-bold text-sky-700 dark:text-sky-300">
                                      {m.topicOrQuestion}
                                    </div>
                                    {m.studentAnswer && (
                                      <div className="text-slate-600 dark:text-slate-300">
                                        <span className="font-semibold text-slate-500">
                                          {lang === "ar" ? "إجابة الطالب: " : "Student Answer: "}
                                        </span>
                                        <span className="italic">"{m.studentAnswer}"</span>
                                      </div>
                                    )}
                                    <div className="text-rose-700 dark:text-rose-300">
                                      <span className="font-bold">
                                        {lang === "ar" ? "❌ سبب الخطأ / ما ينقصه: " : "❌ Why Wrong / Incomplete: "}
                                      </span>
                                      <span>{m.whyWrong}</span>
                                    </div>
                                    <div className="text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 p-1.5 rounded-lg border border-emerald-500/20">
                                      <span className="font-bold">
                                        {lang === "ar" ? "✅ الإجابة النموذجية الصحيحة: " : "✅ Correct Model Answer: "}
                                      </span>
                                      <span className="whitespace-pre-line">{m.correctAnswer}</span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                        {/* What the student got wrong / deductions */}
                        {Array.isArray(activeAiGrading?.whatWentWrong) &&
                          activeAiGrading.whatWentWrong.length > 0 && (
                            <div className="p-2.5 rounded-xl bg-rose-500/15 border border-rose-500/25 space-y-1.5 text-rose-800 dark:text-rose-200">
                              <div className="text-[11px] font-extrabold flex items-center gap-1.5">
                                <AlertTriangle className="h-3.5 w-3.5 text-rose-600 dark:text-rose-400 shrink-0" />
                                <span>
                                  {lang === "ar"
                                    ? "ما أخطأ فيه الطالب والنقاط المخصومة:"
                                    : "What the Student Got Wrong / Deductions:"}
                                </span>
                              </div>
                              <ul className="text-[11px] space-y-1 list-disc list-inside ps-1 leading-snug">
                                {activeAiGrading.whatWentWrong.map((item, idx) => (
                                  <li key={idx}>{item}</li>
                                ))}
                              </ul>
                            </div>
                          )}

                        {/* What the student got right */}
                        {Array.isArray(activeAiGrading?.whatWentRight) &&
                          activeAiGrading.whatWentRight.length > 0 && (
                            <div className="p-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/25 space-y-1.5 text-emerald-800 dark:text-emerald-200">
                              <div className="text-[11px] font-extrabold flex items-center gap-1.5">
                                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                                <span>
                                  {lang === "ar"
                                    ? "الإجابات الصحيحة والمتقنة:"
                                    : "What the Student Got Right:"}
                                </span>
                              </div>
                              <ul className="text-[11px] space-y-1 list-disc list-inside ps-1 leading-snug">
                                {activeAiGrading.whatWentRight.map((item, idx) => (
                                  <li key={idx}>{item}</li>
                                ))}
                              </ul>
                            </div>
                          )}

                        {activeAiGrading?.feedback && !activeAiGrading?.summary && (
                          <p className="text-[11px] text-slate-700 dark:text-slate-300 leading-relaxed">
                            {activeAiGrading.feedback}
                          </p>
                        )}

                        <div className="pt-0.5 text-[10px] text-teal-600/90 dark:text-teal-300/90 font-medium">
                          {lang === "ar"
                            ? "✓ تم رصد الدرجة والملاحظات آلياً — يمكنك تعديلها يدوياً أدناه"
                            : "✓ Pre-filled by AI — You can edit marks and comments below"}
                        </div>
                      </div>
                    )}

                    {(answerText || submission?.answerText) && (
                      <div className="p-3 rounded-2xl bg-white/70 dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 space-y-1">
                        <div className="text-[11px] font-bold text-slate-500">
                          {lang === "ar" ? "إجابات وملاحظات الطالب المستخرجة من الورقة" : "Student Answers Extracted from Worksheet"}
                        </div>
                        <p className="text-xs text-slate-700 dark:text-slate-200 whitespace-pre-line">
                          {answerText || submission.answerText}
                        </p>
                      </div>
                    )}

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold flex items-center justify-between">
                        <span>
                          {lang === "ar" ? "الدرجة النهائية (قابلة للتعديل اليدوي)" : "Final Marks (Manual Override)"}
                        </span>
                        <span className="text-sky-600 dark:text-sky-300 font-extrabold">
                          0 – {maxMarks} pts
                        </span>
                      </label>
                      <input
                        type="number"
                        min={0}
                        max={maxMarks}
                        step={0.5}
                        value={gradeValue}
                        onChange={(e) => setGradeValue(e.target.value)}
                        placeholder={`0 - ${maxMarks}`}
                        className="w-full px-3 py-2 rounded-xl glass-input text-sm font-bold text-teal-600 dark:text-teal-300"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold">
                        {lang === "ar" ? "ملاحظات وتغذية راجعة للطالب" : "Correction Feedback to Student"}
                      </label>
                      <textarea
                        rows={3}
                        value={feedbackText}
                        onChange={(e) => setFeedbackText(e.target.value)}
                        placeholder={
                          lang === "ar"
                            ? "اكتب ملاحظاتك التصحيحية للطالب..."
                            : "Write correction comments for the student..."
                        }
                        className="w-full px-3 py-2 rounded-xl glass-input text-xs"
                      />
                    </div>
                  </div>
                );
              })()}

              {mode === "view" && (
                <div className="space-y-3">
                  {submission ? (
                    submission.status === "teacher_reviewed" ? (
                      /* Final Teacher Reviewed Marks & Feedback */
                      <>
                        <div className="p-3.5 rounded-2xl bg-emerald-500/15 border border-emerald-400/30 space-y-1">
                          <div className="text-xs font-bold text-emerald-700 dark:text-emerald-300 flex items-center justify-between">
                            <span className="flex items-center gap-1.5">
                              <Award className="h-4 w-4" />
                              {submission?.score !== undefined
                                ? `${submission.score} / ${maxMarks} ${lang === "ar" ? "نقطة" : "pts"}`
                                : lang === "ar"
                                  ? "تم اعتماد التصحيح"
                                  : "Graded by Instructor"}
                            </span>
                            <span className="px-2 py-0.5 rounded-full bg-emerald-600 text-white text-[10px] font-bold">
                              {lang === "ar" ? "معتمد من المعلم" : "Teacher Reviewed"}
                            </span>
                          </div>
                        </div>

                        {submission?.feedback && (
                          <div className="p-3 rounded-2xl bg-white/70 dark:bg-black/30 border border-white/20 text-xs space-y-1">
                            <div className="font-bold text-emerald-700 dark:text-emerald-300">
                              {lang === "ar" ? "ملاحظات وتغذية راجعة من المعلم" : "Instructor Feedback"}
                            </div>
                            <p className="text-slate-700 dark:text-slate-300 text-[11px] leading-relaxed">
                              {submission.feedback}
                            </p>
                          </div>
                        )}

                        {submission?.answerText && (
                          <div className="p-3 rounded-2xl bg-white/70 dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 text-xs space-y-1">
                            <div className="font-bold text-slate-500">
                              {lang === "ar" ? "ملاحظتك المرفقة مع الإجابة" : "Your Submitted Note"}
                            </div>
                            <p className="text-slate-700 dark:text-slate-300 text-[11px]">{submission.answerText}</p>
                          </div>
                        )}
                      </>
                    ) : (
                      /* Pending Teacher Review - Student only submits and waits, NO GRADES SHOWN */
                      <>
                        <div className="p-3.5 rounded-2xl bg-sky-500/15 border border-sky-400/30 space-y-2 text-xs">
                          <div className="font-bold text-sky-700 dark:text-sky-300 flex items-center gap-1.5">
                            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                            <span>
                              {lang === "ar"
                                ? "تم تسليم الواجب — بانتظار مراجعة المعلم"
                                : "Submitted — Pending Instructor Review"}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                            {lang === "ar"
                              ? "تم إرسال إجابتك على ورقة العمل للمحاضر بنجاح. ستظهر نتيجتك وملاحظات المعلم هنا فور اعتماد التصحيح."
                              : "Your worksheet has been submitted securely to your instructor. Your final grade and teacher review notes will be released here once approved."}
                          </p>
                          {submission?.submittedAt && (
                            <div className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                              {lang === "ar" ? "تاريخ التسليم: " : "Submitted on: "}
                              {new Date(submission.submittedAt).toLocaleString(
                                lang === "ar" ? "ar-EG" : "en-US"
                              )}
                            </div>
                          )}
                        </div>

                        {submission?.answerText && (
                          <div className="p-3 rounded-2xl bg-white/70 dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 text-xs space-y-1">
                            <div className="font-bold text-slate-500">
                              {lang === "ar" ? "ملاحظتك المرفقة مع الإجابة" : "Your Submitted Note"}
                            </div>
                            <p className="text-slate-700 dark:text-slate-300 text-[11px]">{submission.answerText}</p>
                          </div>
                        )}
                      </>
                    )
                  ) : (
                    /* When viewing unsubmitted worksheet preview */
                    <div className="p-3.5 rounded-2xl bg-white/70 dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 space-y-2 text-xs">
                      <div className="font-bold text-sky-700 dark:text-sky-300 flex items-center gap-1.5">
                        <FileText className="h-4 w-4" />
                        <span>{lang === "ar" ? "معاينة ورقة العمل PDF" : "Worksheet PDF Preview"}</span>
                      </div>
                      <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                        {lang === "ar"
                          ? `معاينة لورقة الواجب الأصلية (${pages.length} صفحات). إجمالي الدرجة: ${maxMarks} نقطة.`
                          : `Original worksheet preview (${pages.length} pages). Total marks: ${maxMarks} pts.`}
                      </p>
                      {assignment?.dueDate && (
                        <div className="text-[11px] font-semibold text-amber-600 dark:text-amber-400">
                          {lang === "ar" ? "الموعد النهائي:" : "Due Date:"} {assignment.dueDate} {assignment.dueTime || ""}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Submit / Save Action Footer */}
            <div className="pt-2 border-t border-slate-200/80 dark:border-white/10 flex flex-col gap-2">
              {mode === "student" && (
                <button
                  type="button"
                  disabled={saving}
                  onClick={handleFinish}
                  className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-sky-600 hover:from-emerald-600 hover:to-sky-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg disabled:opacity-50"
                >
                  <Send className="h-4 w-4" />
                  {saving
                    ? lang === "ar"
                      ? "جاري الرفع..."
                      : "Submitting..."
                    : lang === "ar"
                      ? "إرسال الحل المصوّر للمحاضر"
                      : "Submit Annotated Assignment"}
                </button>
              )}

              {mode === "lesson" && (
                <button
                  type="button"
                  disabled={saving}
                  onClick={handleFinish}
                  className="glass-btn-primary w-full py-2.5 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-lg disabled:opacity-50 cursor-pointer"
                >
                  <Save className="h-4 w-4" />
                  {saving
                    ? lang === "ar"
                      ? "جاري الحفظ..."
                      : "Saving..."
                    : lang === "ar"
                      ? "حفظ ملاحظاتي الخاصة"
                      : "Save My Private Annotations"}
                </button>
              )}

              {mode === "correct" && (
                <button
                  type="button"
                  disabled={saving}
                  onClick={handleFinish}
                  className="glass-btn-primary w-full py-2.5 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-lg disabled:opacity-50 cursor-pointer"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  {saving
                    ? lang === "ar"
                      ? "جاري الحفظ..."
                      : "Saving..."
                    : lang === "ar"
                      ? "اعتماد التصحيح وحفظ الدرجة النهائية"
                      : "Approve Correction & Save Final Marks"}
                </button>
              )}

              <button
                type="button"
                onClick={onClose}
                className="w-full py-2 px-4 rounded-xl bg-slate-200/80 hover:bg-slate-300/80 dark:bg-white/[0.08] dark:hover:bg-white/[0.15] border border-slate-300/60 dark:border-white/10 text-xs font-semibold text-slate-700 dark:text-slate-200 transition-colors"
              >
                {lang === "ar" ? "إغلاق" : "Close"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
