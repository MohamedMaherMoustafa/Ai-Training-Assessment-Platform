import { useState, useRef } from "react";
import toast from "react-hot-toast";
import {
  AlertCircle,
  CheckCircle2,
  Download,
  FileText,
  Image as ImageIcon,
  Loader2,
  Sparkles,
  Upload,
  X,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useLang } from "../../context/LangContext";
import { useUploadProgress } from "../../context/UploadProgressContext";
import { renderPdfFileToPages } from "../../utils/pdfPageRenderer";
import { gradePdfAssignmentWithAI } from "../../utils/aiGrader";
import { submitAssignmentWork } from "../../services/platformService";
import { downloadWatermarkedAssignmentPdf } from "../../utils/assignmentPdfDownloader";

export default function UploadSolvedAssignmentModal({
  open,
  onClose,
  assignment,
  onSuccess,
}) {
  const { user } = useAuth();
  const { lang } = useLang();
  const { trackUpload } = useUploadProgress();

  const [selectedFile, setSelectedFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);
  const [answerNotes, setAnswerNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const fileInputRef = useRef(null);

  const handleDownloadPdf = async () => {
    if (downloading || !assignment) return;
    setDownloading(true);
    const toastId = toast.loading(
      lang === "ar"
        ? "جاري تجهيز وتحميل ورقة الواجب بالعلامة المائية للمنصة..."
        : "Preparing watermarked assignment PDF with platform watermark..."
    );
    try {
      const studentName = user?.displayName || user?.username || user?.email || "";
      await downloadWatermarkedAssignmentPdf(assignment, {
        studentName,
        lang,
      });
      toast.success(
        lang === "ar"
          ? "تم تحميل ورقة الواجب بالعلامة المائية بنجاح!"
          : "Watermarked assignment PDF downloaded successfully!",
        { id: toastId }
      );
    } catch (err) {
      console.error(err);
      toast.error(
        lang === "ar" ? "حدث خطأ أثناء تحميل الملف" : "Failed to download assignment PDF",
        { id: toastId }
      );
    } finally {
      setDownloading(false);
    }
  };

  if (!open || !assignment) return null;

  const maxMarks = Number(assignment.maxMarks) || 10;

  const handleFileChange = (file) => {
    if (!file) return;

    const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
    const isImage = file.type.startsWith("image/");

    if (!isPdf && !isImage) {
      toast.error(
        lang === "ar"
          ? "يرجى اختيار ملف PDF أو صورة (PNG, JPG)"
          : "Please upload a PDF document or image file (PNG, JPG)"
      );
      return;
    }

    if (file.size > 35 * 1024 * 1024) {
      toast.error(
        lang === "ar"
          ? "حجم الملف كبير جداً (الحد الأقصى 35 ميجابايت)"
          : "File is too large (max 35MB)"
      );
      return;
    }

    setSelectedFile(file);

    if (isImage) {
      const reader = new FileReader();
      reader.onload = (e) => setFilePreview(e.target.result);
      reader.readAsDataURL(file);
    } else {
      setFilePreview(null);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedFile && !answerNotes.trim()) {
      toast.error(
        lang === "ar"
          ? "يرجى اختيار ملف الحل (PDF أو صورة) أو كتابة إجاباتك"
          : "Please select your solved file (PDF or image) or enter answers"
      );
      return;
    }

    setIsSubmitting(true);

    try {
      await trackUpload({
        fileName: selectedFile?.name || `${assignment.title}_Solution.pdf`,
        fileSize: selectedFile?.size || 150000,
        title:
          lang === "ar"
            ? "رفع وتصحيح ورقة الواجب المحلولة"
            : "Uploading & AI Grading Solved Assignment",
        action: async (reportProgress) => {
          reportProgress({
            percent: 20,
            stage:
              lang === "ar"
                ? "قراءة وتجهيز ملف الحل المرفوع..."
                : "Reading & preparing uploaded solved file...",
          });

          let solvedPages = [];
          let extractedDocText = "";

          if (selectedFile) {
            const isPdf =
              selectedFile.type === "application/pdf" ||
              selectedFile.name.toLowerCase().endsWith(".pdf");

            if (isPdf) {
              reportProgress({
                percent: 45,
                stage:
                  lang === "ar"
                    ? "تجهيز صفحات ملف PDF المحلول..."
                    : "Rendering solved PDF worksheet pages...",
              });
              const rendered = await renderPdfFileToPages(selectedFile);
              solvedPages = rendered.pages || [];
              extractedDocText = rendered.extractedText || "";
            } else {
              // Image solution
              reportProgress({
                percent: 45,
                stage:
                  lang === "ar"
                    ? "تجهيز صورة ورقة الإجابة..."
                    : "Processing answer sheet image...",
              });
              const base64 = await new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result);
                reader.onerror = reject;
                reader.readAsDataURL(selectedFile);
              });
              solvedPages = [base64];
            }
          }

          // Combine extracted text with student's typed answer notes
          const combinedAnswerText = [
            extractedDocText.trim(),
            answerNotes.trim(),
            selectedFile ? `[Uploaded Solved File: ${selectedFile.name}]` : "",
          ]
            .filter(Boolean)
            .join("\n\n");

          reportProgress({
            percent: 70,
            stage:
              lang === "ar"
                ? "وكيل الذكاء الاصطناعي يقوم بالتصحيح والتقييم..."
                : "Athar AI Grading Agent is analyzing & grading answers...",
          });

          let aiResult = null;
          try {
            aiResult = await gradePdfAssignmentWithAI({
              assignmentTitle: assignment.title || "",
              pdfText: assignment.extractedText || "",
              instructions: assignment.instructions || "",
              studentAnswerText: combinedAnswerText,
              studentPages: solvedPages,
              maxMarks,
              lang,
            });
          } catch (aiErr) {
            console.warn("AI grading error during solved upload:", aiErr);
          }

          reportProgress({
            percent: 90,
            stage:
              lang === "ar"
                ? "حفظ التسليم وإشعار المعلم..."
                : "Saving submission & notifying instructor...",
          });

          await submitAssignmentWork(assignment.id, {
            studentId: user.uid,
            studentName: user.displayName || user.username || user.email,
            answerText: combinedAnswerText || "Uploaded Solved File Submission",
            annotatedPages: solvedPages.length > 0 ? solvedPages : assignment.pdfPages || [],
            correctedPages: solvedPages.length > 0 ? solvedPages : assignment.pdfPages || [],
            score: aiResult?.score !== undefined ? aiResult.score : null,
            feedback: aiResult?.feedback || "",
            aiGrading: aiResult,
            instructorId: assignment.instructorId,
            assignmentTitle: assignment.title,
            submissionMethod: "file_upload",
          });

          reportProgress({
            percent: 100,
            stage:
              lang === "ar"
                ? "اكتمل الرفع والتصحيح بنجاح!"
                : "Submission & AI grading complete!",
          });
        },
      });

      toast.success(
        lang === "ar"
          ? "تم رفع وتصحيح الواجب بنجاح! تم تسجيل الإجابة وإخطار المعلم."
          : "Solved assignment uploaded & AI graded! Sent to instructor."
      );

      if (onSuccess) await onSuccess();
      onClose();
    } catch (err) {
      console.error(err);
      toast.error(
        lang === "ar"
          ? "حدث خطأ أثناء رفع ورقة الواجب"
          : "Failed to upload solved assignment"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-fade-in">
      <div
        className="glass-card w-full max-w-xl max-h-[92vh] flex flex-col rounded-[26px] overflow-hidden shadow-2xl border border-white/20 dark:border-white/10"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-sky-500 via-teal-500 to-emerald-500 text-white flex items-center justify-between gap-3 shadow-md shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-10 w-10 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center shrink-0 border border-white/25">
              <Upload className="h-5 w-5 text-white" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-base truncate">
                  {lang === "ar" ? "رفع حل الواجب" : "Upload Solved Assignment"}
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-white/20 text-[11px] font-black shrink-0">
                  {maxMarks} {lang === "ar" ? "نقطة" : "pts"}
                </span>
              </div>
              <p className="text-xs text-sky-100/90 truncate font-medium">
                {assignment.title}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="p-1.5 rounded-xl hover:bg-white/20 transition-colors cursor-pointer text-white disabled:opacity-50"
            aria-label="Close modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4">
          {/* Assignment instructions banner */}
          {assignment.instructions && (
            <div className="p-3.5 rounded-2xl bg-teal-500/10 border border-teal-400/25 text-xs text-slate-700 dark:text-slate-200 space-y-1">
              <div className="font-bold flex items-center gap-1.5 text-teal-700 dark:text-teal-300">
                <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                <span>{lang === "ar" ? "تعليمات المعلم:" : "Instructor Instructions:"}</span>
              </div>
              <p className="leading-relaxed whitespace-pre-line">{assignment.instructions}</p>
            </div>
          )}

          {/* AI Auto-Grading Feature Badge */}
          <div className="p-3 rounded-2xl bg-teal-500/10 border border-teal-400/25 text-xs flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-xl bg-teal-500/20 text-teal-600 dark:text-teal-300 flex items-center justify-center shrink-0">
              <Sparkles className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <div className="font-extrabold text-[12px] text-teal-800 dark:text-teal-200">
                {lang === "ar"
                  ? "التصحيح الذكي الآلي مفعل (AI Auto-Grading)"
                  : "AI Auto-Grading Enabled"}
              </div>
              <div className="text-[11px] text-slate-600 dark:text-slate-300">
                {lang === "ar"
                  ? "سيقوم الذكاء الاصطناعي بمطابقة حلك مع نموذج الإجابة، ورصد الدرجات والتقييم فوراً."
                  : "Your solution is automatically evaluated against model rubrics for instant scoring & diagnostics."}
              </div>
            </div>
          </div>

          {/* Step 1: Download Original Worksheet with Platform Watermark Banner */}
          <div className="p-3.5 rounded-2xl bg-sky-500/10 border border-sky-400/30 text-xs flex flex-wrap items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="h-8 w-8 rounded-xl bg-sky-500/20 text-sky-600 dark:text-cyan-300 flex items-center justify-center shrink-0">
                <Download className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <div className="font-extrabold text-[12px] text-sky-900 dark:text-cyan-200">
                  {lang === "ar"
                    ? "هل تحتاج لتحميل ورقة الواجب للحل أولاً؟"
                    : "Need the worksheet PDF to solve first?"}
                </div>
                <div className="text-[11px] text-slate-600 dark:text-slate-300">
                  {lang === "ar"
                    ? "حمّل الملف الآن بالعلامة المائية المعتمدة للمنصة، وحلّه على جهازك أو اطبعه ثم ارفع الحل هنا."
                    : "Download with the official platform watermark, solve offline or print, then upload below."}
                </div>
              </div>
            </div>

            <button
              type="button"
              disabled={downloading}
              onClick={handleDownloadPdf}
              className="px-3.5 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-sky-300/80 dark:border-sky-700/60 text-sky-700 dark:text-cyan-300 font-bold hover:bg-sky-50 dark:hover:bg-slate-700/70 transition-all text-xs flex items-center gap-1.5 shadow-xs cursor-pointer shrink-0 disabled:opacity-50"
            >
              {downloading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin text-sky-500" />
              ) : (
                <Download className="h-3.5 w-3.5 text-sky-500" />
              )}
              <span>{lang === "ar" ? "تحميل ورقة الواجب PDF" : "Download Worksheet PDF"}</span>
            </button>
          </div>

          {/* Dropzone File Upload Area */}
          <div>
            <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1.5">
              {lang === "ar"
                ? "ملف الحل (PDF محلول أو صور أوراق الإجابة) *"
                : "Solved File (Completed PDF or Answer Sheet Photos) *"}
            </label>

            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`p-6 border-2 border-dashed rounded-2xl text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-2 ${
                isDragging
                  ? "border-teal-400 bg-teal-500/15"
                  : selectedFile
                  ? "border-emerald-500/60 bg-emerald-500/5 dark:bg-emerald-950/20"
                  : "border-slate-300 dark:border-white/15 hover:border-teal-400 hover:bg-teal-500/5"
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,image/png,image/jpeg,image/jpg"
                className="hidden"
                onChange={(e) => handleFileChange(e.target.files?.[0])}
              />

              {selectedFile ? (
                <div className="flex flex-col items-center gap-1.5">
                  <div className="h-11 w-11 rounded-2xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shadow-inner">
                    <CheckCircle2 className="h-6 w-6" />
                  </div>
                  <div className="font-bold text-sm text-slate-900 dark:text-white truncate max-w-sm">
                    {selectedFile.name}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB ·{" "}
                    {selectedFile.type === "application/pdf" ? "PDF Document" : "Image Photo"}
                  </div>
                  {filePreview && (
                    <img
                      src={filePreview}
                      alt="Solution Preview"
                      className="mt-2 max-h-36 rounded-xl border border-slate-200 dark:border-white/15 object-contain shadow-sm"
                    />
                  )}
                  <span className="text-[11px] text-teal-600 dark:text-teal-300 font-semibold underline mt-1">
                    {lang === "ar" ? "اضغط لتغيير الملف" : "Click to choose a different file"}
                  </span>
                </div>
              ) : (
                <>
                  <div className="h-12 w-12 rounded-2xl bg-teal-500/15 text-teal-600 dark:text-teal-300 flex items-center justify-center">
                    <Upload className="h-6 w-6" />
                  </div>
                  <div className="font-bold text-sm text-slate-800 dark:text-slate-100">
                    {lang === "ar"
                      ? "اسحب ملف الحل وأفلته هنا أو اضغط للاختيار"
                      : "Drag & drop your solved file here or browse"}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2">
                    <span className="inline-flex items-center gap-1">
                      <FileText className="h-3.5 w-3.5 text-rose-500" /> PDF
                    </span>
                    <span>•</span>
                    <span className="inline-flex items-center gap-1">
                      <ImageIcon className="h-3.5 w-3.5 text-sky-500" /> PNG, JPG
                    </span>
                    <span>•</span>
                    <span>Max 35 MB</span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Optional Typed Answers / Explanations Textarea */}
          <div>
            <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1.5">
              {lang === "ar"
                ? "إجابات وحلول مكتوبة أو ملاحظات إضافية (اختياري)"
                : "Written Answers, Calculations, or Accompanying Notes (Optional)"}
            </label>
            <textarea
              rows={4}
              value={answerNotes}
              onChange={(e) => setAnswerNotes(e.target.value)}
              placeholder={
                lang === "ar"
                  ? "مثال: حل المسألة 1: ... ، حل السؤال 2: ... (يمكنك كتابة إجاباتك هنا لتدعيم التصحيح الذكي)"
                  : "e.g., Q1 Answer: ..., Q2 Calculation: ... (Write extra workings or answers here to reinforce AI grading)"
              }
              className="w-full px-3.5 py-2.5 glass-input text-xs sm:text-sm leading-relaxed"
            />
          </div>

          {/* Modal Actions Footer */}
          <div className="pt-3 border-t border-slate-200/60 dark:border-white/10 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors disabled:opacity-50"
            >
              {lang === "ar" ? "إلغاء" : "Cancel"}
            </button>

            <button
              type="submit"
              disabled={isSubmitting || (!selectedFile && !answerNotes.trim())}
              className="glass-btn-primary px-5 py-2.5 rounded-xl text-xs flex items-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>{lang === "ar" ? "جاري الرفع والتصحيح..." : "Submitting & Grading..."}</span>
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4" />
                  <Sparkles className="h-3.5 w-3.5 text-amber-300" />
                  <span>
                    {lang === "ar"
                      ? "تسليم الواجب والتصحيح الذكي"
                      : "Submit & AI Auto-Grade"}
                  </span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
