import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";
import {
  BookOpenCheck,
  Eye,
  FileText,
  Lock,
  PenTool,
  Plus,
  Trash2,
  Upload,
} from "lucide-react";
import {
  createLessonMaterial,
  deleteLessonMaterial,
  getStudentLessonAnnotation,
  listCourses,
  listLessonMaterials,
  saveStudentLessonAnnotation,
} from "../../services/platformService";
import { renderPdfFileToPages } from "../../utils/pdfPageRenderer";
import { extractTextFromPdfFile } from "../../utils/pdfExtractor";
import { useAuth } from "../../context/AuthContext";
import { useLang } from "../../context/LangContext";
import { useUploadProgress } from "../../context/UploadProgressContext";
import LiveAnnotationModal from "../assignments/LiveAnnotationModal";

export default function LessonLibraryModule({
  mode = "instructor",
  activeInstructorId = null,
}) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { lang } = useLang();
  const { trackUpload } = useUploadProgress();

  const [materials, setMaterials] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  const [form, setForm] = useState({
    courseId: "",
    title: "",
    description: "",
    pdfName: "",
    pdfPages: [],
    extractedText: "",
  });
  const [parsingPdf, setParsingPdf] = useState(false);

  const [modalState, setModalState] = useState({
    open: false,
    material: null,
    modalMode: "view",
    initialInkSnapshots: null,
    initialNotes: "",
  });

  const refreshData = async () => {
    const [allMaterials, allCourses] = await Promise.all([
      listLessonMaterials(),
      listCourses(),
    ]);
    if (mode === "instructor") {
      const myCourses = allCourses.filter((c) => c.instructorId === user.uid);
      setCourses(myCourses);
      setMaterials(allMaterials.filter((m) => m.instructorId === user.uid));
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
      setMaterials(allMaterials.filter((m) => enrolledIds.includes(m.courseId)));
    } else {
      setCourses(allCourses);
      setMaterials(allMaterials);
    }
  };

  useEffect(() => {
    let active = true;
    Promise.all([listLessonMaterials(), listCourses()])
      .then(([allMaterials, allCourses]) => {
        if (!active) return;
        if (mode === "instructor") {
          const myCourses = allCourses.filter((c) => c.instructorId === user.uid);
          setCourses(myCourses);
          setMaterials(allMaterials.filter((m) => m.instructorId === user.uid));
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
          setMaterials(allMaterials.filter((m) => enrolledIds.includes(m.courseId)));
        } else {
          setCourses(allCourses);
          setMaterials(allMaterials);
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [mode, user?.uid, user?.instructorIds, activeInstructorId]);

  const handlePdfPick = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      toast.error(lang === "ar" ? "يرجى اختيار ملف PDF فقط" : "Please upload a PDF file");
      e.target.value = "";
      return;
    }
    setParsingPdf(true);
    try {
      const [rendered, extractedText] = await trackUpload({
        fileName: file.name,
        fileSize: file.size,
        title: lang === "ar" ? "رفع وتجهيز ملف الدرس (PDF)" : "Uploading Lesson PDF",
        action: async (reportProgress) => {
          reportProgress({
            percent: 5,
            stage: lang === "ar" ? "بدء معالجة ملف الدرس..." : "Reading lesson file...",
          });
          const rend = await renderPdfFileToPages(file, {
            onProgress: ({ percent, stage }) => {
              reportProgress({
                percent: Math.round(5 + (percent * 0.7)),
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
          let txt = "";
          try {
            txt = await extractTextFromPdfFile(file, {
              onProgress: ({ percent }) => {
                reportProgress({
                  percent: Math.round(75 + (percent * 0.25)),
                  stage: lang === "ar" ? "استخراج نصوص المحتوى للذكاء الاصطناعي..." : "Extracting text content for AI...",
                });
              },
            });
          } catch {
            txt = "";
          }
          return [rend, txt];
        },
      });
      setForm((prev) => ({
        ...prev,
        title: prev.title || file.name.replace(/\.pdf$/i, ""),
        pdfName: rendered.pdfName,
        pdfPages: rendered.pages,
        extractedText: extractedText || "",
      }));
      toast.success(
        lang === "ar"
          ? `تم تجهيز ملف الدرس (${rendered.renderedCount} صفحات)`
          : `Lesson PDF ready (${rendered.renderedCount} page${
              rendered.renderedCount > 1 ? "s" : ""
            })`
      );
    } catch (err) {
      console.error(err);
      toast.error(lang === "ar" ? "تعذر قراءة ملف PDF" : "Failed to render PDF pages");
    } finally {
      e.target.value = "";
      setParsingPdf(false);
    }
  };

  const resetForm = () => {
    setForm({
      courseId: "",
      title: "",
      description: "",
      pdfName: "",
      pdfPages: [],
      extractedText: "",
    });
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.courseId || !form.title.trim()) return;
    if (form.pdfPages.length === 0) {
      toast.error(lang === "ar" ? "يرجى رفع ملف PDF للدرس" : "Please upload a Lesson PDF file");
      return;
    }

    await createLessonMaterial({
      ...form,
      instructorId: user.uid,
    });
    toast.success(
      lang === "ar"
        ? "تم رفع ملف الدرس وإتاحته للطلاب!"
        : "Lesson PDF uploaded and published to students!"
    );
    resetForm();
    setShowForm(false);
    await refreshData();
  };

  const handleDelete = async (id) => {
    await deleteLessonMaterial(id);
    toast.success(lang === "ar" ? "تم حذف ملف الدرس" : "Lesson PDF removed");
    await refreshData();
  };

  const handleOpenStudentAnnotator = async (material) => {
    const saved =
      (await getStudentLessonAnnotation(material.id, user.uid)) ||
      material.annotations?.[user.uid] ||
      null;
    setModalState({
      open: true,
      material,
      modalMode: "lesson",
      initialInkSnapshots: saved?.inkSnapshots || null,
      initialNotes: saved?.notes || "",
    });
  };

  return (
    <div className="space-y-6">
      <div className="glass-panel rounded-[26px] p-4 sm:p-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className="h-10 w-10 sm:h-11 sm:w-11 rounded-2xl bg-gradient-to-br from-emerald-500 via-cyan-500 to-blue-600 text-white flex items-center justify-center shadow-lg shadow-cyan-500/25 shrink-0">
            <BookOpenCheck className="h-5 w-5 sm:h-6 sm:w-6" />
          </div>
          <div className="min-w-0">
            <h1 className="text-lg sm:text-xl font-black truncate">
              {lang === "ar" ? "ملفات الدروس والملاحظات الخاصة" : "Lesson PDFs & Private Notebook"}
            </h1>
            <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
              {mode === "instructor"
                ? lang === "ar"
                  ? "ارفع دروسك بصيغة PDF ليتمكن الطلاب من تصفحها وتدوين ملاحظاتهم الخاصة عليها."
                  : "Upload lesson PDFs so students can study and save their own private annotations."
                : lang === "ar"
                ? "افتح ملفات الدروس ودوّن ملاحظاتك وخطوطك الحرة — كل تعديلاتك تُحفظ لك وحدك بشكل خاص."
                : "Open lesson PDFs, highlight & write notes — your annotations are saved privately for you only."}
            </p>
          </div>
        </div>

        {mode === "instructor" && (
          <button
            type="button"
            onClick={() => setShowForm((s) => !s)}
            className="glass-btn-primary flex items-center gap-2 px-4 py-2 rounded-xl text-sm"
          >
            <Plus className="h-4 w-4" />
            {lang === "ar" ? "رفع درس PDF" : "Upload Lesson PDF"}
          </button>
        )}
      </div>

      {/* Instructor Upload Lesson PDF Form */}
      {showForm && mode === "instructor" && (
        <form onSubmit={handleCreate} autoComplete="off" className="glass-form-card p-6 sm:p-7 space-y-6">
          <div className="flex items-center gap-3 pb-3 border-b border-slate-200/60 dark:border-white/10">
            <div className="h-10 w-10 rounded-2xl bg-gradient-to-tr from-emerald-500 to-cyan-600 text-white flex items-center justify-center shadow-md shadow-emerald-500/20">
              <BookOpenCheck className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                {lang === "ar" ? "رفع درس PDF جديد" : "Upload New Lesson PDF"}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {lang === "ar"
                  ? "اختر الدورة وارفع ملف المحاضرة ليتمكن الطلاب من تصفحه وتدوين الملاحظات عليه"
                  : "Select course and upload lecture PDF so students can annotate and study privately"}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
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
                {lang === "ar" ? "عنوان الدرس" : "Lesson Title"}
              </label>
              <input
                required
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder={lang === "ar" ? "مثال: الوحدة الثانية - الشبكات" : "e.g., Lecture 2 — Neural Networks"}
                className="w-full px-3.5 py-2.5 glass-input text-sm"
              />
            </div>
          </div>

          <div className="p-4 rounded-2xl glass-subtle space-y-2.5">
            <label className="glass-form-label !mb-0">
              {lang === "ar" ? "ملف الدرس (PDF)" : "Lesson PDF Document"}
            </label>
            <div className="flex flex-wrap items-center gap-3">
              <label className="glass-btn-secondary px-4 py-2.5 rounded-xl text-xs font-bold cursor-pointer inline-flex items-center gap-2">
                <Upload className="h-4 w-4 text-emerald-600" />
                {parsingPdf
                  ? lang === "ar"
                    ? "جاري التجهيز..."
                    : "Processing PDF..."
                  : lang === "ar"
                  ? "اختر ملف PDF"
                  : "Choose Lesson PDF"}
                <input
                  type="file"
                  accept="application/pdf,.pdf"
                  onChange={handlePdfPick}
                  className="hidden"
                />
              </label>
              {form.pdfName && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 text-xs font-bold border border-emerald-400/30">
                  <FileText className="h-3.5 w-3.5" />
                  {form.pdfName} ({form.pdfPages.length}p)
                </span>
              )}
            </div>
          </div>

          <div>
            <label className="glass-form-label">
              {lang === "ar" ? "وصف مختصر (اختياري)" : "Short Description (Optional)"}
            </label>
            <textarea
              rows={3}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder={lang === "ar" ? "أدخل ملخصاً أو إرشادات للدرس..." : "Enter summary or lecture guidance..."}
              className="w-full px-3.5 py-2.5 glass-input text-sm"
            />
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
              {lang === "ar" ? "نشر الدرس للطلاب" : "Publish Lesson PDF"}
            </button>
          </div>
        </form>
      )}

      {/* Lesson PDF Cards */}
      {loading ? (
        <div className="text-sm text-slate-500 py-8 text-center">{t("app.loading")}</div>
      ) : materials.length === 0 ? (
        <div className="glass-card p-10 text-center text-sm text-slate-500 space-y-1">
          <FileText className="h-8 w-8 mx-auto text-slate-400 mb-2 opacity-60" />
          <div className="font-bold">
            {mode === "student"
              ? lang === "ar"
                ? "لا توجد ملفات دروس في المقررات المسجل بها حالياً."
                : "No lesson PDFs available for your enrolled courses."
              : lang === "ar"
              ? "لم يتم رفع ملفات دروس PDF بعد."
              : "No lesson PDFs uploaded yet."}
          </div>
          {mode === "student" && (
            <p className="text-xs text-slate-400">
              {lang === "ar"
                ? "سجّل في مقررات المحاضر أولاً من صفحة المقررات لعرض ملفات دروسها."
                : "Enroll in instructor courses from the Courses tab to access their PDF lessons."}
            </p>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {materials.map((m) => {
            const c = courses.find((cr) => cr.id === m.courseId);
            const mySaved = m.annotations?.[user?.uid];
            const hasSavedNotes = Boolean(
              mySaved &&
                (mySaved.notes ||
                  (mySaved.inkSnapshots && Object.keys(mySaved.inkSnapshots).length > 0))
            );

            return (
              <div
                key={m.id}
                className="glass-card p-5 space-y-3 flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="h-10 w-10 rounded-xl bg-sky-500/15 text-sky-600 dark:text-sky-300 flex items-center justify-center shrink-0">
                        <FileText className="h-5 w-5" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-bold text-sm truncate">{m.title}</h3>
                        <p className="text-xs text-slate-500 truncate">
                          {c?.title?.[lang] || c?.title?.en || m.courseId} ·{" "}
                          {m.pdfPages.length} {lang === "ar" ? "صفحات" : "pages"}
                        </p>
                      </div>
                    </div>

                    {mode === "student" && hasSavedNotes && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 text-[11px] font-bold shrink-0">
                        <Lock className="h-3 w-3" />
                        {lang === "ar" ? "ملاحظاتك محفوظة" : "Saved Notes"}
                      </span>
                    )}
                  </div>

                  {m.description && (
                    <p className="text-xs text-slate-600 dark:text-slate-300">{m.description}</p>
                  )}
                </div>

                <div className="flex flex-wrap items-center justify-end gap-2 pt-3 border-t border-white/40 dark:border-white/10">
                  {mode === "instructor" ? (
                    <>
                      <button
                        type="button"
                        onClick={() =>
                          setModalState({
                            open: true,
                            material: m,
                            modalMode: "view",
                            initialInkSnapshots: null,
                            initialNotes: "",
                          })
                        }
                        className="glass-btn-secondary px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1"
                      >
                        <Eye className="h-3.5 w-3.5 text-sky-600" />
                        {lang === "ar" ? "معاينة" : "Preview"}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(m.id)}
                        className="glass-btn-secondary p-1.5 rounded-lg text-rose-600"
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </>
                  ) : (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          setModalState({
                            open: true,
                            material: m,
                            modalMode: "view",
                            initialInkSnapshots: mySaved?.inkSnapshots || null,
                            initialNotes: mySaved?.notes || "",
                          })
                        }
                        className="glass-btn-secondary px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5"
                        title={lang === "ar" ? "قراءة ملف الدرس" : "Read PDF Document"}
                      >
                        <Eye className="h-3.5 w-3.5 text-sky-600" />
                        <span>{lang === "ar" ? "قراءة" : "Read"}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleOpenStudentAnnotator(m)}
                        className="glass-btn-primary px-3.5 py-2 rounded-xl text-xs flex items-center gap-1.5"
                      >
                        <PenTool className="h-3.5 w-3.5" />
                        <span>
                          {hasSavedNotes
                            ? lang === "ar"
                              ? "متابعة التدوين"
                              : "Continue Notes"
                            : lang === "ar"
                            ? "تدوين وملاحظات"
                            : "Annotate"}
                        </span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Lesson PDF Reader / Student Private Annotator Modal */}
      {modalState.open && (
        <LiveAnnotationModal
          key={`lesson_${modalState.material?.id || "none"}_${modalState.modalMode}`}
          open={modalState.open}
          onClose={() =>
            setModalState({
              open: false,
              material: null,
              modalMode: "view",
              initialInkSnapshots: null,
              initialNotes: "",
            })
          }
          assignment={{
            id: modalState.material?.id,
            title: modalState.material?.title,
            instructions: modalState.material?.description,
            pdfPages: modalState.material?.pdfPages || [],
          }}
          mode={modalState.modalMode}
          initialInkSnapshots={modalState.initialInkSnapshots}
          initialNotes={modalState.initialNotes}
          lang={lang}
          onSaveLessonNotes={async ({ inkSnapshots, notes }) => {
            const mat = modalState.material;
            if (!mat) return;
            await saveStudentLessonAnnotation(mat.id, user.uid, {
              inkSnapshots,
              notes,
            });
            toast.success(
              lang === "ar"
                ? "تم حفظ ملاحظاتك وخطوطك لك وحدك بنجاح!"
                : "Your private annotations & notes are saved for you only!"
            );
            await refreshData();
          }}
        />
      )}
    </div>
  );
}
