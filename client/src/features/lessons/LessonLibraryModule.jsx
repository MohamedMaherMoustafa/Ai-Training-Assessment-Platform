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
    } else {
      const targetInst = activeInstructorId
        ? [activeInstructorId]
        : user.instructorIds || [];
      const visibleCourses =
        targetInst.length > 0
          ? allCourses.filter((c) => targetInst.includes(c.instructorId))
          : [];
      const visibleIds = visibleCourses.map((c) => c.id);
      setCourses(visibleCourses);
      setMaterials(allMaterials.filter((m) => visibleIds.includes(m.courseId)));
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
        } else {
          const targetInst = activeInstructorId
            ? [activeInstructorId]
            : user.instructorIds || [];
          const visibleCourses =
            targetInst.length > 0
              ? allCourses.filter((c) => targetInst.includes(c.instructorId))
              : [];
          const visibleIds = visibleCourses.map((c) => c.id);
          setCourses(visibleCourses);
          setMaterials(allMaterials.filter((m) => visibleIds.includes(m.courseId)));
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
          return await Promise.all([
            renderPdfFileToPages(file, { onProgress: reportProgress }),
            extractTextFromPdfFile(file, { onProgress: reportProgress }).catch(() => ""),
          ]);
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
        <form onSubmit={handleCreate} autoComplete="off" className="glass-card p-5 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold mb-1">{t("quizzes.course")}</label>
              <select
                required
                value={form.courseId}
                onChange={(e) => setForm({ ...form, courseId: e.target.value })}
                className="w-full px-3 py-2 rounded-xl glass-input text-sm"
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
              <label className="block text-xs font-semibold mb-1">
                {lang === "ar" ? "عنوان الدرس" : "Lesson Title"}
              </label>
              <input
                required
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder={lang === "ar" ? "مثال: الوحدة الثانية - الشبكات" : "e.g., Lecture 2 — Neural Networks"}
                className="w-full px-3 py-2 rounded-xl glass-input text-sm"
              />
            </div>
          </div>

          <div className="p-3.5 rounded-2xl glass-subtle space-y-2">
            <label className="block text-xs font-bold">
              {lang === "ar" ? "ملف الدرس (PDF)" : "Lesson PDF Document"}
            </label>
            <div className="flex flex-wrap items-center gap-3">
              <label className="glass-btn-secondary px-3.5 py-2 rounded-xl text-xs font-bold cursor-pointer inline-flex items-center gap-2">
                <Upload className="h-4 w-4 text-sky-600" />
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
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 text-xs font-bold">
                  <FileText className="h-3.5 w-3.5" />
                  {form.pdfName} ({form.pdfPages.length}p)
                </span>
              )}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1">
              {lang === "ar" ? "وصف مختصر (اختياري)" : "Short Description (Optional)"}
            </label>
            <textarea
              rows={2}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="w-full px-3 py-2 rounded-xl glass-input text-sm"
            />
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                setShowForm(false);
                resetForm();
              }}
              className="glass-btn-secondary px-4 py-2 rounded-xl text-sm font-semibold"
            >
              {t("app.cancel")}
            </button>
            <button
              type="submit"
              disabled={parsingPdf}
              className="glass-btn-primary px-5 py-2 rounded-xl text-sm disabled:opacity-50"
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
        <div className="glass-card p-8 text-center text-sm text-slate-500">
          {lang === "ar"
            ? "لم يتم رفع ملفات دروس PDF بعد."
            : "No lesson PDFs uploaded yet."}
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
                    <button
                      type="button"
                      onClick={() => handleOpenStudentAnnotator(m)}
                      className="glass-btn-primary px-3.5 py-2 rounded-xl text-xs flex items-center gap-1.5"
                    >
                      <PenTool className="h-3.5 w-3.5" />
                      {hasSavedNotes
                        ? lang === "ar"
                          ? "متابعة التدوين الخاص على الدرس"
                          : "Continue Private Annotation"
                        : lang === "ar"
                        ? "فتح وتدوين ملاحظاتي الخاصة"
                        : "Open & Annotate Privately"}
                    </button>
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
