import { useEffect, useMemo, useRef, useState } from "react";
import {
  Award,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Eraser,
  Highlighter,
  Lock,
  Pen,
  Redo2,
  RotateCcw,
  Save,
  Send,
  Type,
  X,
} from "lucide-react";
import toast from "react-hot-toast";
import { useUploadProgress } from "../../context/UploadProgressContext";

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
    if (mode === "view" && submission?.correctedPages?.length) return submission.correctedPages;
    if (mode === "view" && submission?.annotatedPages?.length) return submission.annotatedPages;
    if (mode === "correct" && submission?.annotatedPages?.length) return submission.annotatedPages;
    if (assignment?.pdfPages?.length) return assignment.pdfPages;
    return [createBlankSheetDataUrl()];
  }, [mode, submission?.correctedPages, submission?.annotatedPages, assignment?.pdfPages]);

  const isReadOnly = mode === "view";
  const maxMarks = Number(assignment?.maxMarks) || 10;

  const [pageIdx, setPageIdx] = useState(0);
  const [canvasDims, setCanvasDims] = useState({ width: 1050, height: 1350 });
  const [tool, setTool] = useState("pen"); // "pen" | "highlighter" | "eraser" | "text"
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
  const { trackUpload } = useUploadProgress();

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
      .catch(() => {});

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
    if (!drawingRef.current || isReadOnly || tool === "text") return;
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

  const handlePointerUp = () => {
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
    const ctx = inkCanvasRef.current.getContext("2d");
    ctx.save();
    ctx.font = `bold ${Math.round(18 + size * 2)}px 'Segoe UI', Tahoma, sans-serif`;
    ctx.fillStyle = color;
    ctx.textBaseline = "top";
    ctx.fillText(textDraft.value.trim(), textDraft.x, textDraft.y);
    ctx.restore();
    pushHistory();
    setTextDraft(null);
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
          title: lang === "ar" ? "رفع تسليم الواجب المحلول" : "Uploading Annotated Submission",
          action: async (reportProgress) => {
            reportProgress({
              percent: 25,
              stage: lang === "ar" ? "دمج وتجهيز صفحات الحل..." : "Processing & merging annotated pages...",
            });
            const annotatedPages = await buildMergedPages();
            reportProgress({
              percent: 70,
              stage: lang === "ar" ? "رفع الإجابات والرسومات إلى المنصة..." : "Uploading drawings & answers to server...",
            });
            await onSubmitStudent({
              answerText: answerText.trim() || "Live Annotated Worksheet Submission",
              annotatedPages,
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
      className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-2 sm:p-4"
      onClick={onClose}
    >
      <div
        className="glass-panel rounded-3xl w-full max-w-6xl h-[93vh] flex flex-col overflow-hidden shadow-2xl border border-white/25"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Modal Header */}
        <div className="px-4 sm:px-6 py-3 border-b border-white/30 dark:border-white/10 flex flex-wrap items-center justify-between gap-3 bg-white/40 dark:bg-slate-900/50">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-sm sm:text-base font-extrabold truncate">
                {assignment?.title}
              </h2>
              {mode === "lesson" ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 text-[11px] font-extrabold shrink-0">
                  <Lock className="h-3 w-3" />
                  {lang === "ar" ? "نسختك الخاصة فقط" : "Private to You Only"}
                </span>
              ) : assignment?.maxMarks ? (
                <span className="px-2.5 py-0.5 rounded-full bg-sky-500/15 text-sky-700 dark:text-sky-300 text-[11px] font-extrabold shrink-0">
                  {lang === "ar" ? `الدرجة الكاملة: ${maxMarks}` : `Max: ${maxMarks} pts`}
                </span>
              ) : null}
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
              {mode === "correct"
                ? `${lang === "ar" ? "تصحيح إجابة الطالب:" : "Correcting submission by:"} ${submission?.studentName}`
                : mode === "lesson"
                ? lang === "ar"
                  ? "دوّن ملاحظاتك وخطوطك الحرة على الدرس — تُحفظ لك وحدك بشكل خاص"
                  : "Private Lesson Notebook — Draw, highlight, erase & save notes strictly for yourself"
                : mode === "view"
                ? lang === "ar"
                  ? "معاينة المحتوى"
                  : "Viewing Document"
                : lang === "ar"
                ? "نافذة الكتابة الحرة والتعليق المباشر بالقلم والممحاة"
                : "Live Annotation Workspace — Freehand Pen, Highlighter, Text & Eraser"}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* Multi-Page Controls */}
            {pages.length > 1 && (
              <div className="flex items-center gap-1 glass-subtle px-2 py-1 rounded-xl text-xs font-bold">
                <button
                  type="button"
                  disabled={pageIdx === 0}
                  onClick={() => goToPage(pageIdx - 1)}
                  className="p-1 rounded-lg hover:bg-white/50 disabled:opacity-35 transition-colors"
                  title={lang === "ar" ? "الصفحة السابقة" : "Previous Page"}
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <div className="flex items-center gap-1 px-1">
                  <select
                    value={pageIdx}
                    onChange={(e) => goToPage(Number(e.target.value))}
                    className="bg-transparent font-bold cursor-pointer text-xs py-0.5 px-1 rounded hover:bg-white/40 focus:outline-none dark:bg-slate-900 dark:text-white"
                    title={lang === "ar" ? "انتقال سريع لرقم الصفحة" : "Jump to page"}
                  >
                    {pages.map((_, i) => (
                      <option key={i} value={i} className="text-slate-900 bg-white dark:bg-slate-800 dark:text-white">
                        {lang === "ar" ? `صفحة ${i + 1} / ${pages.length}` : `Page ${i + 1} of ${pages.length}`}
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  type="button"
                  disabled={pageIdx >= pages.length - 1}
                  onClick={() => goToPage(pageIdx + 1)}
                  className="p-1 rounded-lg hover:bg-white/50 disabled:opacity-35 transition-colors"
                  title={lang === "ar" ? "الصفحة التالية" : "Next Page"}
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            )}

            <button
              type="button"
              onClick={onClose}
              className="glass-btn-secondary p-2 rounded-xl text-slate-600 dark:text-slate-200"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Drawing & Annotation Toolbar */}
        {!isReadOnly && (
          <div className="px-4 py-2.5 border-b border-white/25 dark:border-white/10 flex flex-wrap items-center justify-between gap-2 bg-slate-900/5 dark:bg-white/5">
            <div className="flex flex-wrap items-center gap-1.5">
              {[
                { id: "pen", icon: Pen, en: "Pen", ar: "قلم" },
                { id: "highlighter", icon: Highlighter, en: "Highlight", ar: "تظليل" },
                { id: "text", icon: Type, en: "Text", ar: "نص" },
                { id: "eraser", icon: Eraser, en: "Eraser", ar: "ممحاة" },
              ].map((item) => {
                const Icon = item.icon;
                const active = tool === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setTool(item.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                      active
                        ? "bg-sky-600 text-white shadow-md shadow-sky-500/25"
                        : "glass-subtle text-slate-700 dark:text-slate-200 hover:bg-white/60"
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
                    className={`h-6 w-6 rounded-full border-2 transition-transform ${
                      color === c.hex && tool !== "eraser"
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
                    className={`px-2 py-1 rounded-lg text-[11px] font-bold ${
                      size === s.px
                        ? "bg-indigo-600 text-white"
                        : "glass-subtle text-slate-600 dark:text-slate-300"
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
                className="glass-btn-secondary px-2.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1"
                title="Undo"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                {lang === "ar" ? "تراجع" : "Undo"}
              </button>
              <button
                type="button"
                onClick={handleRedo}
                className="glass-btn-secondary px-2.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1"
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
        )}

        {/* Main Workspace Canvas + Bottom/Side Action Panel */}
        <div className="flex-1 min-h-0 flex flex-col lg:flex-row overflow-hidden">
          {/* Scrollable Worksheet & Live Ink Canvas */}
          <div className="flex-1 overflow-auto p-4 sm:p-6 bg-slate-200/70 dark:bg-slate-950/60 flex justify-center items-start">
            <div className="relative shadow-2xl rounded-xl overflow-hidden bg-white max-w-3xl w-full select-none">
              <img
                src={pages[pageIdx]}
                alt={`Assignment page ${pageIdx + 1}`}
                className="w-full h-auto block pointer-events-none select-none"
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
                style={{ touchAction: "none" }}
                className={`absolute inset-0 w-full h-full ${
                  isReadOnly
                    ? "pointer-events-none"
                    : tool === "text"
                    ? "cursor-text"
                    : "cursor-crosshair"
                }`}
              />

              {/* Inline Text Box Popup when Text tool clicked */}
              {textDraft && (
                <div
                  style={{ left: `${textDraft.cssX}px`, top: `${textDraft.cssY}px` }}
                  className="absolute z-20 flex items-center gap-1 bg-white/95 dark:bg-slate-900/95 p-1.5 rounded-xl shadow-xl border border-sky-400"
                >
                  <input
                    autoFocus
                    value={textDraft.value}
                    onChange={(e) =>
                      setTextDraft((prev) => ({ ...prev, value: e.target.value }))
                    }
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        commitTextDraft();
                      } else if (e.key === "Escape") {
                        setTextDraft(null);
                      }
                    }}
                    placeholder={lang === "ar" ? "اكتب هنا..." : "Type note..."}
                    className="px-2.5 py-1 text-xs glass-input w-40"
                  />
                  <button
                    type="button"
                    onClick={commitTextDraft}
                    className="px-2 py-1 rounded-lg bg-sky-600 text-white text-[11px] font-bold"
                  >
                    OK
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Right Panel: Student Notes / Teacher Correction & Marks / Graded View */}
          <div className="w-full lg:w-80 border-t lg:border-t-0 lg:border-s border-white/25 dark:border-white/10 p-4 flex flex-col justify-between gap-4 bg-white/45 dark:bg-slate-900/55 overflow-y-auto">
            <div className="space-y-4">
              {assignment?.instructions && (
                <div className="p-3 rounded-2xl glass-subtle space-y-1">
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
                    rows={5}
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

              {mode === "lesson" && (
                <button
                  type="button"
                  disabled={saving}
                  onClick={handleFinish}
                  className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-600 hover:to-indigo-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg disabled:opacity-50"
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
                <div className="space-y-3">
                  {submission?.answerText && (
                    <div className="p-3 rounded-2xl glass-subtle space-y-1">
                      <div className="text-[11px] font-bold text-slate-500">
                        {lang === "ar" ? "ملاحظة الطالب" : "Student Note"}
                      </div>
                      <p className="text-xs text-slate-700 dark:text-slate-200">
                        {submission.answerText}
                      </p>
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold flex items-center justify-between">
                      <span>{lang === "ar" ? "الدرجة / النقاط" : "Awarded Points"}</span>
                      <span className="text-sky-600 dark:text-sky-300">
                        0 – {maxMarks} pts
                      </span>
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={maxMarks}
                      value={gradeValue}
                      onChange={(e) => setGradeValue(e.target.value)}
                      placeholder={`0 - ${maxMarks}`}
                      className="w-full px-3 py-2 rounded-xl glass-input text-sm font-bold"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold">
                      {lang === "ar" ? "ملاحظات التصحيح للطالب" : "Correction Feedback"}
                    </label>
                    <textarea
                      rows={4}
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
              )}

              {mode === "view" && (
                <div className="space-y-3">
                  <div className="p-3.5 rounded-2xl bg-sky-500/15 border border-sky-400/30 space-y-1">
                    <div className="text-xs font-bold text-sky-700 dark:text-sky-300 flex items-center gap-1.5">
                      <Award className="h-4 w-4" />
                      {submission?.score !== undefined
                        ? `${submission.score} / ${maxMarks} ${lang === "ar" ? "نقطة" : "pts"}`
                        : lang === "ar"
                        ? "بانتظار تصحيح المحاضر"
                        : "Pending Instructor Correction"}
                    </div>
                  </div>
                  {submission?.answerText && (
                    <div className="p-3 rounded-2xl glass-subtle text-xs space-y-1">
                      <div className="font-bold text-slate-500">
                        {lang === "ar" ? "إجابتك المكتوبة" : "Your Note"}
                      </div>
                      <p>{submission.answerText}</p>
                    </div>
                  )}
                  {submission?.feedback && (
                    <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-400/30 text-xs space-y-1">
                      <div className="font-bold text-emerald-700 dark:text-emerald-300">
                        {lang === "ar" ? "تعليق المحاضر" : "Instructor Feedback"}
                      </div>
                      <p>{submission.feedback}</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Submit / Save Action Footer */}
            <div className="pt-2 border-t border-white/30 dark:border-white/10 flex flex-col gap-2">
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
                  className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-600 hover:to-indigo-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg disabled:opacity-50"
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
                  className="w-full py-2.5 px-4 rounded-xl glass-btn-primary text-xs font-bold flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  {saving
                    ? lang === "ar"
                      ? "جاري الحفظ..."
                      : "Saving..."
                    : lang === "ar"
                    ? "حفظ التصحيح والدرجة"
                    : "Save Correction & Points"}
                </button>
              )}

              <button
                type="button"
                onClick={onClose}
                className="w-full py-2 px-4 rounded-xl glass-btn-secondary text-xs font-semibold"
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
