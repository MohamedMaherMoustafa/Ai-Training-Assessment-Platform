import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";
import {
  AlertTriangle,
  Award,
  Bot,
  CheckCircle2,
  ClipboardList,
  Clock,
  Download,
  Edit3,
  Eye,
  FileText,
  Loader2,
  Lock,
  PenTool,
  Plus,
  Sparkles,
  Trash2,
  Upload,
} from "lucide-react";
import {
  createAssignment,
  deleteAssignment,
  gradeAssignmentSubmission,
  listAssignments,
  listCourses,
  submitAssignmentWork,
  updateAssignment,
} from "../../services/platformService";
import { renderPdfFileToPages } from "../../utils/pdfPageRenderer";
import { downloadWatermarkedAssignmentPdf } from "../../utils/assignmentPdfDownloader";
import { useAuth } from "../../context/AuthContext";
import { useLang } from "../../context/LangContext";
import { usePopup } from "../../context/PopupContext";
import { useUploadProgress } from "../../context/UploadProgressContext";
import LiveAnnotationModal from "./LiveAnnotationModal";
import UploadSolvedAssignmentModal from "./UploadSolvedAssignmentModal";

const MARK_PRESETS = [5, 10, 15, 20, 25, 50];

function getLocalTodayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

function isAssignmentPastDue(assignment, nowMs) {
  if (!assignment?.dueDate) return false;
  const timePart = assignment.dueTime || "23:59";
  const deadline = new Date(`${assignment.dueDate}T${timePart}:59`).getTime();
  if (Number.isNaN(deadline)) return false;
  return nowMs > deadline;
}

export default function AssignmentsModule({
  mode = "instructor",
  activeInstructorId = null,
}) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { lang } = useLang();
  const { showPopup } = usePopup();
  const { trackUpload } = useUploadProgress();

  const [assignments, setAssignments] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const [todayDateStr] = useState(getLocalTodayStr);
  const [nowMs, setNowMs] = useState(() => Date.now());

  const [form, setForm] = useState({
    courseId: "",
    title: "",
    instructions: "",
    dueDate: "",
    dueTime: "23:59",
    maxMarks: 10,
    pdfName: "",
    pdfPages: [],
    extractedText: "",
  });
  const [parsingPdf, setParsingPdf] = useState(false);
  const [gradeInputs, setGradeInputs] = useState({});

  // Modal state for Live Annotation (student answer / instructor correct / student view)
  const [modalState, setModalState] = useState({
    open: false,
    assignment: null,
    submission: null,
    modalMode: "student",
  });
  const [uploadModalAssignment, setUploadModalAssignment] = useState(null);
  const [downloadingId, setDownloadingId] = useState(null);

  const handleDownloadAssignment = async (assignment) => {
    if (downloadingId) return;
    setDownloadingId(assignment.id);
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
      setDownloadingId(null);
    }
  };

  const refreshData = async () => {
    const [allAssn, allCourses] = await Promise.all([listAssignments(), listCourses()]);
    if (mode === "instructor") {
      const myCourses = allCourses.filter((c) => c.instructorId === user.uid);
      setCourses(myCourses);
      setAssignments(allAssn.filter((a) => a.instructorId === user.uid));
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
      setAssignments(allAssn.filter((a) => enrolledIds.includes(a.courseId)));
    } else {
      setCourses(allCourses);
      setAssignments(allAssn);
    }
  };

  useEffect(() => {
    let active = true;
    Promise.all([listAssignments(), listCourses()])
      .then(([allAssn, allCourses]) => {
        if (!active) return;
        if (mode === "instructor") {
          const myCourses = allCourses.filter((c) => c.instructorId === user.uid);
          setCourses(myCourses);
          setAssignments(allAssn.filter((a) => a.instructorId === user.uid));
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
          setAssignments(allAssn.filter((a) => enrolledIds.includes(a.courseId)));
        } else {
          setCourses(allCourses);
          setAssignments(allAssn);
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [mode, user?.uid, user?.instructorIds, activeInstructorId]);

  // Keep current time fresh every 30s so due-date lock activates promptly in student view
  useEffect(() => {
    const timer = setInterval(() => setNowMs(Date.now()), 30000);
    return () => clearInterval(timer);
  }, []);

  const handlePdfUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      toast.error(lang === "ar" ? "يرجى اختيار ملف PDF فقط" : "Please upload a PDF file");
      e.target.value = "";
      return;
    }
    setParsingPdf(true);
    try {
      const rendered = await trackUpload({
        fileName: file.name,
        fileSize: file.size,
        title: lang === "ar" ? "رفع وتجهيز ملف الواجب (PDF)" : "Uploading Assignment PDF",
        action: async (reportProgress) => {
          return await renderPdfFileToPages(file, {
            onProgress: ({ percent, stage }) => {
              reportProgress({
                percent,
                stage: lang === "ar"
                  ? stage
                      .replace("Rendering & preparing page", "تجهيز الصفحة")
                      .replace("Completed page", "اكتملت الصفحة")
                      .replace("of", "من")
                      .replace("Opening PDF document...", "فتح ملف PDF...")
                      .replace("Reading file from disk...", "قراءة الملف من القرص...")
                      .replace("Finalizing pages...", "اللمسات الأخيرة للصفحات...")
                      .replace("All", "جميع")
                      .replace("pages rendered successfully!", "صفحات تم تجهيزها بنجاح!")
                  : stage,
              });
            },
          });
        },
      });
      setForm((prev) => ({
        ...prev,
        title: prev.title || file.name.replace(/\.pdf$/i, ""),
        pdfName: rendered.pdfName,
        pdfPages: rendered.pages,
        extractedText: rendered.extractedText || "",
      }));
      toast.success(
        lang === "ar"
          ? `تم تجهيز ملف PDF (${rendered.renderedCount} صفحات) وجاهز للتصحيح الذكي!`
          : `PDF uploaded & prepared (${rendered.renderedCount} pages) — Ready for AI Auto-Grading!`
      );
    } catch (err) {
      console.error(err);
      toast.error(
        lang === "ar" ? "تعذر قراءة ملف PDF" : "Failed to render PDF pages"
      );
    } finally {
      e.target.value = "";
      setParsingPdf(false);
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setForm({
      courseId: "",
      title: "",
      instructions: "",
      dueDate: "",
      dueTime: "23:59",
      maxMarks: 10,
      pdfName: "",
      pdfPages: [],
      extractedText: "",
    });
  };

  const startEditAssignment = (a) => {
    setEditingId(a.id);
    setForm({
      courseId: a.courseId || "",
      title: a.title || "",
      instructions: a.instructions || "",
      dueDate: a.dueDate || "",
      dueTime: a.dueTime || "23:59",
      maxMarks: Number(a.maxMarks) || 10,
      pdfName: a.pdfName || "",
      pdfPages: Array.isArray(a.pdfPages) ? a.pdfPages : [],
      extractedText: a.extractedText || "",
    });
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDeleteAssignment = (a) => {
    showPopup({
      type: "warning",
      title: lang === "ar" ? "حذف الواجب" : "Delete Assignment",
      message:
        lang === "ar"
          ? `هل أنت متأكد من حذف الواجب "${a.title}"؟ سيتم حذف تسليمات هذا الواجب أيضاً.`
          : `Are you sure you want to delete "${a.title}"? All submissions on this assignment will also be removed.`,
      confirmLabel: lang === "ar" ? "تأكيد الحذف" : "Delete Assignment",
      onConfirm: async () => {
        await deleteAssignment(a.id);
        if (editingId === a.id) {
          resetForm();
          setShowForm(false);
        }
        toast.success(lang === "ar" ? "تم حذف الواجب" : "Assignment deleted");
        await refreshData();
      },
    });
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.courseId || !form.title.trim()) return;

    if (form.pdfPages.length === 0 && !form.instructions.trim()) {
      toast.error(
        lang === "ar"
          ? "يرجى رفع ملف PDF للواجب أو كتابة التعليمات"
          : "Please upload an assignment PDF or enter instructions"
      );
      return;
    }
    if (form.dueDate && form.dueDate < todayDateStr) {
      toast.error(
        lang === "ar"
          ? "لا يمكن اختيار تاريخ تسليم قبل اليوم"
          : "Due date cannot be before today"
      );
      return;
    }

    if (editingId) {
      await updateAssignment(editingId, {
        courseId: form.courseId,
        title: form.title.trim(),
        instructions: form.instructions,
        dueDate: form.dueDate,
        dueTime: form.dueTime || "23:59",
        maxMarks: Number(form.maxMarks) || 10,
        pdfName: form.pdfName || "",
        pdfPages: Array.isArray(form.pdfPages) ? form.pdfPages : [],
        extractedText: form.extractedText || "",
      });
      toast.success(
        lang === "ar" ? "تم تحديث الواجب بنجاح!" : "Assignment updated!"
      );
    } else {
      await createAssignment({
        courseId: form.courseId,
        title: form.title.trim(),
        instructions: form.instructions || "",
        dueDate: form.dueDate,
        dueTime: form.dueTime || "23:59",
        maxMarks: Number(form.maxMarks) || 10,
        pdfName: form.pdfName || "",
        pdfPages: Array.isArray(form.pdfPages) ? form.pdfPages : [],
        extractedText: form.extractedText || "",
        instructorId: user.uid,
      });
      toast.success(
        lang === "ar"
          ? "تم رفع ونشر واجب PDF للطلاب بنجاح (مدعوم بالتصحيح الذكي الآلي)!"
          : "PDF Assignment uploaded & published to students (AI Auto-Grading enabled)!"
      );
    }

    resetForm();
    setShowForm(false);
    await refreshData();
  };

  const handleSaveGrade = async (assignment, studentId, currentScore) => {
    const maxM = Number(assignment.maxMarks) || 10;
    const key = `${assignment.id}_${studentId}`;
    const score = gradeInputs[key] !== undefined ? gradeInputs[key] : currentScore;
    if (score === "" || score === undefined || Number.isNaN(Number(score))) {
      toast.error(
        lang === "ar" ? `أدخل نقاطاً صحيحة (0–${maxM})` : `Enter valid points (0–${maxM})`
      );
      return;
    }
    const numScore = Number(score);
    if (numScore < 0 || numScore > maxM) {
      toast.error(
        lang === "ar"
          ? `النقاط يجب أن تكون بين 0 و ${maxM}`
          : `Points must be between 0 and ${maxM}`
      );
      return;
    }
    await gradeAssignmentSubmission(assignment.id, studentId, numScore, "", null, maxM);
    toast.success(lang === "ar" ? "تم حفظ الدرجة!" : "Assignment marks saved!");
    await refreshData();
  };

  return (
    <div className="space-y-6">
      <div className="glass-panel rounded-[26px] p-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-violet-500 via-purple-600 to-fuchsia-600 text-white flex items-center justify-center shadow-lg shadow-purple-500/25">
            <ClipboardList className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl font-black">
              {lang === "ar" ? "الواجبات والتكليفات" : "Assignments"}
            </h1>
            <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
              {mode === "instructor"
                ? lang === "ar"
                  ? "ارفع ملف الواجب PDF؛ يجيب الطلاب داخل الـ PDF نفسه وتصلك أوراقهم مصححة آلياً بالذكاء الاصطناعي مع إمكانية التعديل اليدوي للدرجات."
                  : "Upload assignment PDF; students answer inside the PDF and submissions arrive to you AI auto-corrected with full manual grade editing."
                : lang === "ar"
                ? "افتح ورقة الواجب PDF وأجب بالكتابة الحرة والقلم والنص مباشرة داخل الملف؛ يتم تصحيحها آلياً بالذكاء الاصطناعي فور التسليم."
                : "Open the assignment PDF and answer directly inside the document using pen and text tools; auto-corrected by AI on submit."}
            </p>
          </div>
        </div>
        {mode === "instructor" && (
          <button
            onClick={() => {
              if (showForm && editingId) {
                resetForm();
              } else {
                setShowForm((s) => !s);
              }
            }}
            className="glass-btn-primary flex items-center gap-2 px-4 py-2 rounded-xl text-sm"
          >
            <Plus className="h-4 w-4" />
            {lang === "ar" ? "رفع واجب PDF جديد" : "Upload PDF Assignment"}
          </button>
        )}
      </div>

      {/* Instructor Create / Edit PDF Assignment Form */}
      {showForm && mode === "instructor" && (
        <form onSubmit={handleCreate} autoComplete="off" className="glass-form-card p-6 sm:p-7 space-y-6">
          <div className="flex items-center gap-3 pb-3 border-b border-slate-200/60 dark:border-white/10">
            <div className="h-10 w-10 rounded-2xl bg-gradient-to-tr from-sky-500 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-sky-500/20">
              {editingId ? <Edit3 className="h-5 w-5" /> : <ClipboardList className="h-5 w-5" />}
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                {editingId
                  ? lang === "ar"
                    ? "تعديل واجب PDF"
                    : "Edit PDF Assignment"
                  : lang === "ar"
                  ? "رفع واجب PDF جديد (بتصحيح ذكي آلي)"
                  : "Upload New PDF Assignment (AI Auto-Grading Enabled)"}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {lang === "ar"
                  ? "حدد المقرر والدرجة وتاريخ الإغلاق وارفع ملف الواجب PDF"
                  : "Specify course, total points, deadline and upload assignment PDF sheet"}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
            <div>
              <label className="glass-form-label">{t("quizzes.course")}</label>
              <select
                required
                value={form.courseId}
                onChange={(e) => setForm({ ...form, courseId: e.target.value })}
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
              <label className="glass-form-label">
                {lang === "ar" ? "عنوان الواجب" : "Assignment Title"}
              </label>
              <input
                required
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder={lang === "ar" ? "مثال: ورقة عمل 1" : "e.g., Worksheet 1"}
                className="w-full px-3.5 py-2.5 glass-input text-sm"
              />
            </div>

            <div>
              <label className="glass-form-label">
                {lang === "ar" ? "تاريخ الإغلاق (Due Date)" : "Due Date (Lock After)"}
              </label>
              <input
                type="date"
                min={todayDateStr}
                value={form.dueDate}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val && val < todayDateStr) {
                    toast.error(
                      lang === "ar"
                        ? "لا يمكن اختيار يوم سابق لليوم"
                        : "Cannot select a date before today"
                    );
                    setForm({ ...form, dueDate: todayDateStr });
                    return;
                  }
                  setForm({ ...form, dueDate: val });
                }}
                className="w-full px-3.5 py-2.5 glass-input text-sm"
              />
            </div>

            <div>
              <label className="glass-form-label">
                {lang === "ar" ? "وقت الإغلاق" : "Due Time"}
              </label>
              <input
                type="time"
                value={form.dueTime}
                disabled={!form.dueDate}
                onChange={(e) => setForm({ ...form, dueTime: e.target.value })}
                className="w-full px-3.5 py-2.5 glass-input text-sm disabled:opacity-50"
              />
            </div>
          </div>

          {/* Marks Selection + PDF Upload */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
            <div className="p-4 rounded-2xl glass-subtle space-y-2.5">
              <label className="glass-form-label !mb-0">
                {lang === "ar" ? "الدرجة الكاملة للواجب (النقاط)" : "Assignment Total Marks (Points)"}
              </label>
              <div className="flex flex-wrap items-center gap-2">
                {MARK_PRESETS.map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setForm({ ...form, maxMarks: m })}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      Number(form.maxMarks) === m
                        ? "bg-gradient-to-r from-sky-500 to-indigo-600 text-white shadow-md shadow-sky-500/20 scale-105"
                        : "glass-card text-slate-700 dark:text-slate-200 hover:border-sky-400"
                    }`}
                  >
                    {m} pts
                  </button>
                ))}
                <input
                  type="number"
                  min={1}
                  value={form.maxMarks}
                  onChange={(e) => setForm({ ...form, maxMarks: e.target.value })}
                  className="w-20 px-3 py-1.5 rounded-xl glass-input text-xs font-bold text-center"
                />
              </div>
            </div>

            <div className="p-4 rounded-2xl glass-subtle space-y-2.5">
              <label className="glass-form-label !mb-0">
                {lang === "ar" ? "رفع ملف الواجب (PDF)" : "Upload Assignment PDF"}
              </label>
              <div className="flex flex-wrap items-center gap-3">
                <label className="glass-btn-secondary px-4 py-2.5 rounded-xl text-xs font-bold cursor-pointer inline-flex items-center gap-2">
                  <Upload className="h-4 w-4 text-sky-600" />
                  {parsingPdf
                    ? lang === "ar"
                      ? "جاري المعالجة واستخراج النصوص..."
                      : "Processing PDF & extracting text..."
                    : lang === "ar"
                    ? "اختر ملف PDF"
                    : "Choose PDF File"}
                  <input
                    type="file"
                    accept="application/pdf,.pdf"
                    onChange={handlePdfUpload}
                    className="hidden"
                  />
                </label>

                {form.pdfName ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 text-xs font-bold border border-emerald-400/30">
                    <FileText className="h-3.5 w-3.5" />
                    {form.pdfName} ({form.pdfPages.length}p)
                  </span>
                ) : (
                  <span className="text-xs text-slate-500">
                    {lang === "ar"
                      ? "سيظهر للطلاب للإجابة داخله مباشرة"
                      : "Students will open and answer directly inside this PDF"}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div>
            <label className="glass-form-label">
              {lang === "ar" ? "تعليمات إضافية / إجابة نموذجية لمساعدة الذكاء الاصطناعي (اختياري)" : "Instructions / Model Rubric for AI Grading (Optional)"}
            </label>
            <textarea
              rows={2}
              value={form.instructions}
              onChange={(e) => setForm({ ...form, instructions: e.target.value })}
              placeholder={
                lang === "ar"
                  ? "اكتب أي إرشادات للطلاب أو معايير إجابة نموذجية لمساعدة المصحح الآلي..."
                  : "Optional guidance or model answer criteria to guide the AI auto-grader..."
              }
              className="w-full px-3.5 py-2.5 glass-input text-sm"
            />
          </div>

          <div className="p-3 rounded-xl bg-indigo-500/10 border border-indigo-400/25 flex items-center gap-2 text-xs text-indigo-700 dark:text-indigo-300">
            <Bot className="h-4 w-4 shrink-0 text-indigo-500" />
            <span>
              {lang === "ar"
                ? "🤖 مدعوم بالتصحيح الذكي الآلي: يفتح الطالب ورقة الـ PDF ويجيب داخلها مباشرة بالقلم أو النص، وتصلك الورقة مصححة آلياً مع إمكانية تعديل الدرجات يدوياً."
                : "🤖 AI Auto-Grading: Students answer directly inside the PDF; submissions arrive to you pre-corrected with full manual grade editing."}
            </span>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-200/60 dark:border-white/10">
            <button
              type="button"
              onClick={() => {
                setShowForm(false);
                resetForm();
              }}
              className="glass-btn-secondary px-5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold cursor-pointer"
            >
              {t("app.cancel")}
            </button>
            <button
              type="submit"
              disabled={parsingPdf}
              className="glass-btn-primary px-6 py-2.5 rounded-xl text-xs sm:text-sm cursor-pointer disabled:opacity-50"
            >
              {editingId
                ? lang === "ar"
                  ? "حفظ التعديلات"
                  : "Save Changes"
                : lang === "ar"
                ? "نشر الواجب للطلاب"
                : "Upload & Publish Assignment"}
            </button>
          </div>
        </form>
      )}

      {/* Assignments Grid */}
      {loading ? (
        <div className="text-sm text-slate-500 py-8 text-center">{t("app.loading")}</div>
      ) : assignments.length === 0 ? (
        <div className="glass-card p-10 text-center text-sm text-slate-500 space-y-1">
          <ClipboardList className="h-8 w-8 mx-auto text-slate-400 mb-2 opacity-60" />
          <div className="font-bold">
            {mode === "student"
              ? lang === "ar"
                ? "لا توجد واجبات للمقررات المسجل بها حالياً."
                : "No assignments posted for your enrolled courses."
              : t("app.noData")}
          </div>
          {mode === "student" && (
            <p className="text-xs text-slate-400">
              {lang === "ar"
                ? "سجّل في مقررات المحاضر أولاً من صفحة المقررات لمتابعة واجباتها."
                : "Enroll in instructor courses from the Courses tab to receive their assignments."}
            </p>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {assignments.map((a) => {
            const c = courses.find((cr) => cr.id === a.courseId);
            const mySub = a.submissions?.find(
              (s) => s.studentId === user?.uid || s.id === user?.uid
            );
            const maxMarks = Number(a.maxMarks) || 10;
            const pastDue = isAssignmentPastDue(a, nowMs);
            const hasPdf = Array.isArray(a.pdfPages) && a.pdfPages.length > 0;

            return (
              <div key={a.id} className="glass-card p-5 space-y-3 flex flex-col justify-between">
                <div className="space-y-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="h-9 w-9 rounded-xl bg-indigo-500/15 text-indigo-600 dark:text-indigo-300 flex items-center justify-center shrink-0">
                        <FileText className="h-5 w-5" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-bold text-sm truncate">{a.title}</h3>
                        <p className="text-xs text-slate-500 truncate">
                          {c?.title?.[lang] || c?.title?.en || a.courseId}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="px-2.5 py-0.5 rounded-full bg-sky-500/15 text-sky-700 dark:text-sky-300 text-xs font-extrabold">
                        {maxMarks} {lang === "ar" ? "نقطة" : "pts"}
                      </span>
                      {mode === "instructor" && (
                        <>
                          {hasPdf && (
                            <button
                              type="button"
                              onClick={() =>
                                setModalState({
                                  open: true,
                                  assignment: a,
                                  submission: null,
                                  modalMode: "view",
                                })
                              }
                              title={lang === "ar" ? "معاينة ورقة العمل PDF" : "Preview Worksheet PDF"}
                              className="glass-btn-secondary p-1.5 rounded-lg text-indigo-600"
                            >
                              <Eye className="h-3.5 w-3.5" />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => startEditAssignment(a)}
                            title={lang === "ar" ? "تعديل الواجب" : "Edit assignment"}
                            className="glass-btn-secondary p-1.5 rounded-lg text-sky-600"
                          >
                            <Edit3 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteAssignment(a)}
                            title={lang === "ar" ? "حذف الواجب" : "Delete assignment"}
                            className="glass-btn-secondary p-1.5 rounded-lg text-rose-600"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Badges row: Due Date + PDF Attachment */}
                  <div className="flex flex-wrap items-center gap-2 text-[11px]">
                    {a.dueDate && (
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-semibold ${
                          pastDue
                            ? "bg-rose-500/15 text-rose-700 dark:text-rose-300"
                            : "bg-amber-500/15 text-amber-700 dark:text-amber-300"
                        }`}
                      >
                        <Clock className="h-3 w-3" />
                        {lang === "ar" ? "الموعد:" : "Due:"} {a.dueDate}
                        {a.dueTime ? ` ${a.dueTime}` : ""}
                        {pastDue ? (lang === "ar" ? " (مغلق)" : " (Closed)") : ""}
                      </span>
                    )}

                    {hasPdf && (
                      <div className="inline-flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() =>
                            setModalState({
                              open: true,
                              assignment: a,
                              submission: mySub || null,
                              modalMode: "view",
                            })
                          }
                          className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-500/25 transition-colors font-semibold"
                          title={lang === "ar" ? "معاينة الملف" : "Preview PDF"}
                        >
                          <FileText className="h-3 w-3" />
                          {a.pdfName || "Worksheet.pdf"} · {a.pdfPages.length}p
                          <Eye className="h-2.5 w-2.5 ms-0.5 opacity-70" />
                        </button>

                        <button
                          type="button"
                          disabled={downloadingId === a.id}
                          onClick={() => handleDownloadAssignment(a)}
                          className="p-1 rounded-full bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-500/25 transition-colors disabled:opacity-50"
                          title={
                            lang === "ar"
                              ? "تحميل ورقة الواجب كملف PDF بعلامة المنصة المائية"
                              : "Download watermarked worksheet PDF"
                          }
                        >
                          {downloadingId === a.id ? (
                            <Loader2 className="h-3 w-3 animate-spin text-indigo-600" />
                          ) : (
                            <Download className="h-3 w-3" />
                          )}
                        </button>
                      </div>
                    )}
                  </div>

                  {a.instructions && (
                    <p className="text-xs text-slate-600 dark:text-slate-300">{a.instructions}</p>
                  )}
                </div>

                {mode === "instructor" ? (
                  <div className="pt-3 border-t border-white/50 dark:border-white/10 text-xs space-y-2.5">
                    <div className="font-semibold flex items-center justify-between">
                      <span>
                        {lang === "ar" ? "تسليمات الطلاب" : "Submissions"} (
                        {a.submissions?.length || 0})
                      </span>
                    </div>
                    {!a.submissions || a.submissions.length === 0 ? (
                      <div className="text-slate-400 text-[11px]">
                        {lang === "ar" ? "لم يسلم أي طالب بعد." : "No submissions yet."}
                      </div>
                    ) : (
                      a.submissions.map((sub) => {
                        const stuId = sub.studentId || sub.id;
                        const key = `${a.id}_${stuId}`;
                        const val =
                          gradeInputs[key] !== undefined
                            ? gradeInputs[key]
                            : sub.score ?? "";
                        const hasAnnotated =
                          Array.isArray(sub.annotatedPages) && sub.annotatedPages.length > 0;

                        return (
                          <div key={stuId} className="p-3 rounded-xl glass-subtle space-y-2">
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-bold">{sub.studentName}</span>
                              <div className="flex items-center gap-1.5">
                                {sub.status === "teacher_reviewed" ? (
                                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 text-[11px] font-bold">
                                    {lang === "ar" ? "✅ معتمد من المعلم" : "✅ Reviewed"}
                                  </span>
                                ) : sub.status === "ai_graded" || sub.aiGrading ? (
                                  <span className="px-2 py-0.5 rounded-full bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 text-[11px] font-bold flex items-center gap-1">
                                    <Bot className="h-3 w-3" />
                                    {lang === "ar" ? "🤖 مصحح آلياً بـ AI" : "🤖 AI Graded"}
                                  </span>
                                ) : null}

                                {sub.score !== undefined ? (
                                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-bold">
                                    {sub.score} / {maxMarks} {lang === "ar" ? "نقطة" : "pts"}
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-300 font-bold">
                                    {lang === "ar" ? "بانتظار التصحيح" : "Needs Correction"}
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* AI Diagnostic Summary & What went wrong preview */}
                            {sub.aiGrading && (
                              <div className="p-2.5 rounded-xl bg-indigo-500/10 border border-indigo-400/20 text-xs space-y-1.5">
                                <div className="flex items-center gap-1.5 font-bold text-indigo-700 dark:text-indigo-300">
                                  <Bot className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
                                  <span>{lang === "ar" ? "ملخص التشخيص الذكي:" : "AI Diagnostic Summary:"}</span>
                                </div>
                                {sub.aiGrading.summary && (
                                  <p className="text-slate-700 dark:text-slate-300 text-[11px] leading-relaxed">
                                    {sub.aiGrading.summary}
                                  </p>
                                )}
                                {Array.isArray(sub.aiGrading.whatWentWrong) && sub.aiGrading.whatWentWrong.length > 0 && (
                                  <div className="p-2 rounded-lg bg-rose-500/15 border border-rose-500/25 text-[11px] text-rose-800 dark:text-rose-200 space-y-1">
                                    <div className="font-extrabold flex items-center gap-1">
                                      <AlertTriangle className="h-3 w-3 text-rose-600 shrink-0" />
                                      <span>
                                        {lang === "ar" ? "ما أخطأ فيه الطالب / النقاط المخصومة:" : "What the student got wrong / deductions:"}
                                      </span>
                                    </div>
                                    <ul className="list-disc list-inside space-y-0.5 ps-1">
                                      {sub.aiGrading.whatWentWrong.map((item, idx) => (
                                        <li key={idx}>{item}</li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Submission actions */}
                            <div className="flex flex-wrap items-center gap-2 pt-1">
                              {(hasAnnotated || sub.correctedPages?.length > 0) && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    setModalState({
                                      open: true,
                                      assignment: a,
                                      submission: sub,
                                      modalMode: "correct",
                                    })
                                  }
                                  className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-indigo-600 via-purple-600 to-sky-600 hover:opacity-95 text-white font-extrabold flex items-center gap-1.5 text-xs shadow-md shadow-indigo-500/20 active:scale-95 cursor-pointer"
                                >
                                  <Bot className="h-3.5 w-3.5 text-sky-200" />
                                  <PenTool className="h-3.5 w-3.5" />
                                  {sub.status === "ai_graded" || sub.aiGrading
                                    ? lang === "ar"
                                      ? "مراجعة وتعديل التصحيح الذكي"
                                      : "Review & Edit AI Correction"
                                    : lang === "ar"
                                    ? "مراجعة وتصحيح الحل"
                                    : "Review & Correct PDF"}
                                </button>
                              )}

                              <div className="flex items-center gap-1.5 ms-auto">
                                <input
                                  type="number"
                                  min={0}
                                  max={maxMarks}
                                  step={0.5}
                                  value={val}
                                  onChange={(e) =>
                                    setGradeInputs({ ...gradeInputs, [key]: e.target.value })
                                  }
                                  placeholder={`0-${maxMarks} pts`}
                                  className="w-24 px-2 py-1 rounded-lg glass-input text-xs font-semibold"
                                />
                                <button
                                  type="button"
                                  onClick={() => handleSaveGrade(a, stuId, sub.score)}
                                  className="px-3 py-1 rounded-lg bg-sky-600 hover:bg-sky-700 text-white font-semibold cursor-pointer"
                                >
                                  {lang === "ar" ? "حفظ" : "Save"}
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                ) : (
                  /* Student View Actions */
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-white/50 dark:border-white/10">
                    {mySub ? (
                      <>
                        <div className="flex items-center gap-2">
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600">
                            <CheckCircle2 className="h-4 w-4" />
                            {lang === "ar" ? "تم التسليم" : "Submitted"}
                          </span>

                          {mySub.status === "teacher_reviewed" ? (
                            <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 text-[11px] font-bold">
                              {lang === "ar" ? "معتمد من المعلم" : "Reviewed"}
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-300 text-[11px] font-bold">
                              {lang === "ar" ? "قيد مراجعة المعلم" : "Pending Review"}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2 ms-auto">
                          {mySub.status === "teacher_reviewed" && mySub.score !== undefined && (
                            <span className="inline-flex items-center gap-1 text-xs font-extrabold text-sky-600 dark:text-sky-300">
                              <Award className="h-3.5 w-3.5" />
                              {mySub.score} / {maxMarks} {lang === "ar" ? "نقطة" : "pts"}
                            </span>
                          )}

                          {(hasPdf || mySub.annotatedPages?.length > 0 || mySub.correctedPages?.length > 0) && (
                            <button
                              type="button"
                              onClick={() =>
                                setModalState({
                                  open: true,
                                  assignment: a,
                                  submission: mySub,
                                  modalMode: "view",
                                })
                              }
                              className="glass-btn-secondary px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1"
                            >
                              <Eye className="h-3.5 w-3.5 text-sky-600" />
                              {mySub.status === "teacher_reviewed" && mySub.correctedPages?.length > 0
                                ? lang === "ar"
                                  ? "عرض ورقة الواجب المصححة"
                                  : "View Corrected PDF"
                                : lang === "ar"
                                ? "عرض إجابتي"
                                : "View My Submission"}
                            </button>
                          )}
                        </div>
                      </>
                    ) : pastDue ? (
                      <div className="w-full flex flex-wrap items-center justify-between gap-2 px-3 py-2 rounded-xl bg-rose-500/10 border border-rose-400/30 text-rose-700 dark:text-rose-300 text-xs font-bold">
                        <span className="inline-flex items-center gap-1.5">
                          <Lock className="h-3.5 w-3.5 shrink-0" />
                          {lang === "ar"
                            ? "غير متاح للإجابة — انتهى تاريخ التسليم"
                            : "Unavailable — Due date has passed"}
                        </span>
                        {hasPdf && (
                          <button
                            type="button"
                            onClick={() =>
                              setModalState({
                                open: true,
                                assignment: a,
                                submission: null,
                                modalMode: "view",
                              })
                            }
                            className="glass-btn-secondary px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 shrink-0"
                          >
                            <Eye className="h-3.5 w-3.5 text-sky-600" />
                            {lang === "ar" ? "معاينة الملف" : "View Worksheet"}
                          </button>
                        )}
                      </div>
                    ) : (
                      <div className="flex flex-wrap items-center gap-2 ms-auto">
                        <button
                          type="button"
                          disabled={downloadingId === a.id}
                          onClick={() => handleDownloadAssignment(a)}
                          className="glass-btn-secondary px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs active:scale-95 cursor-pointer text-slate-700 dark:text-slate-200 hover:text-indigo-600 dark:hover:text-cyan-300 disabled:opacity-50"
                          title={
                            lang === "ar"
                              ? "تحميل ورقة الواجب كملف PDF بعلامة المنصة المائية للحل أوفلاين أو طباعته"
                              : "Download watermarked assignment PDF to solve offline or print"
                          }
                        >
                          {downloadingId === a.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin text-indigo-500" />
                          ) : (
                            <Download className="h-3.5 w-3.5 text-indigo-500 dark:text-cyan-400" />
                          )}
                          <span>{lang === "ar" ? "تحميل للحل (Download)" : "Download to Solve"}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            setModalState({
                              open: true,
                              assignment: a,
                              submission: null,
                              modalMode: "student",
                            })
                          }
                          className="glass-btn-secondary px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs active:scale-95 cursor-pointer border border-indigo-400/30 text-indigo-700 dark:text-cyan-300 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/40"
                          title={
                            lang === "ar"
                              ? "حل وتأشير تفاعلي بالقلم والأدوات على ورقة الواجب (Live Annotation)"
                              : "Solve with digital pen & annotation tools on worksheet"
                          }
                        >
                          <PenTool className="h-3.5 w-3.5 text-indigo-500 dark:text-cyan-400" />
                          <span>{lang === "ar" ? "حل بالتأشير (Annotation)" : "Solve via Annotation"}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setUploadModalAssignment(a)}
                          className="glass-btn-primary px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md shadow-indigo-500/20 active:scale-95 cursor-pointer bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
                          title={
                            lang === "ar"
                              ? "رفع الحل كملف PDF محلول أو صورة ورقة الإجابة لتصحيحها ذكياً"
                              : "Upload completed PDF or image solution for AI grading"
                          }
                        >
                          <Upload className="h-3.5 w-3.5 text-white" />
                          <Sparkles className="h-3.5 w-3.5 text-amber-300" />
                          <span>{lang === "ar" ? "رفع الحل (Upload Solved)" : "Upload Solved File"}</span>
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Live Annotation / Teacher Correction Modal (PDF) */}
      {modalState.open && (
        <LiveAnnotationModal
          key={`${modalState.assignment?.id || "none"}_${modalState.submission?.id || "none"}_${modalState.modalMode}`}
          open={modalState.open}
          onClose={() =>
            setModalState({ open: false, assignment: null, submission: null, modalMode: "student" })
          }
          assignment={modalState.assignment}
          submission={modalState.submission}
          mode={modalState.modalMode}
          lang={lang}
          onSubmitStudent={async ({
            answerText,
            annotatedPages,
            correctedPages,
            score,
            feedback,
            aiGrading,
          }) => {
            const a = modalState.assignment;
            if (!a) return;
            await submitAssignmentWork(a.id, {
              studentId: user.uid,
              studentName: user.displayName || user.email,
              answerText,
              annotatedPages,
              correctedPages,
              score,
              feedback,
              aiGrading,
              instructorId: a.instructorId,
              assignmentTitle: a.title,
            });
            toast.success(
              lang === "ar"
                ? "تم تسليم ورقة الواجب بنجاح! إجابتك بانتظار مراجعة وتصحيح المعلم."
                : "Assignment worksheet submitted successfully! Pending instructor review."
            );
            await refreshData();
          }}
          onSaveCorrection={async ({ score, feedback, correctedPages, aiGrading, answerText }) => {
            const a = modalState.assignment;
            const sub = modalState.submission;
            if (!a || !sub) return;
            const stuId = sub.studentId || sub.id;
            await gradeAssignmentSubmission(
              a.id,
              stuId,
              score,
              feedback,
              correctedPages,
              Number(a.maxMarks) || 10,
              null,
              "instructor",
              aiGrading,
              answerText
            );
            toast.success(
              lang === "ar"
                ? "تم حفظ التصحيح والدرجة وإخطار الطالب!"
                : "Correction & marks saved and sent to student!"
            );
            await refreshData();
          }}
        />
      )}

      {/* Upload Solved Assignment Modal */}
      {uploadModalAssignment && (
        <UploadSolvedAssignmentModal
          open={Boolean(uploadModalAssignment)}
          onClose={() => setUploadModalAssignment(null)}
          assignment={uploadModalAssignment}
          onSuccess={refreshData}
        />
      )}
    </div>
  );
}
