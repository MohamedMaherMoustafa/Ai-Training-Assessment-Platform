import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";
import {
  BookOpen,
  Plus,
  Trash2,
  FileText,
  CheckCircle2,
  ExternalLink,
} from "lucide-react";
import {
  addLessonToCourse,
  createCourse,
  deleteCourse,
  enrolStudentInCourse,
  listCourses,
  listUsers,
} from "../../services/platformService";
import { extractTextFromPdfFile } from "../../utils/pdfExtractor";
import { useAuth } from "../../context/AuthContext";
import { useLang } from "../../context/LangContext";

export default function CoursesModule({ mode = "admin", activeInstructorId = null }) {
  const { t } = useTranslation();
  const { user, refreshProfile } = useAuth();
  const { lang } = useLang();

  const [courses, setCourses] = useState([]);
  const [instructors, setInstructors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCourseForm, setShowCourseForm] = useState(false);
  const [lessonCourseId, setLessonCourseId] = useState(null);
  const [readingLesson, setReadingLesson] = useState(null);

  const [courseForm, setCourseForm] = useState({
    titleEn: "",
    titleAr: "",
    descEn: "",
    descAr: "",
    instructorId: "",
  });

  const [lessonForm, setLessonForm] = useState({
    titleEn: "",
    titleAr: "",
    content: "",
    fileUrl: "",
  });
  const [extractingPdf, setExtractingPdf] = useState(false);

  const handleLessonFilePick = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setExtractingPdf(true);
    try {
      const extracted =
        file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")
          ? await extractTextFromPdfFile(file)
          : await file.text();
      setLessonForm((prev) => ({
        ...prev,
        titleEn: prev.titleEn || file.name.replace(/\.[^.]+$/, ""),
        content: extracted.slice(0, 12000),
      }));
      toast.success(`Extracted text from ${file.name}`);
    } catch (err) {
      console.error(err);
      toast.error("Could not extract text from file");
    } finally {
      e.target.value = "";
      setExtractingPdf(false);
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [allCourses, allUsers] = await Promise.all([listCourses(), listUsers("instructor")]);
      setInstructors(allUsers);

      if (mode === "instructor") {
        setCourses(allCourses.filter((c) => c.instructorId === user.uid));
      } else if (mode === "student") {
        const targetInst = activeInstructorId
          ? [activeInstructorId]
          : user.instructorIds || [];
        setCourses(
          targetInst.length > 0
            ? allCourses.filter((c) => targetInst.includes(c.instructorId))
            : []
        );
      } else {
        setCourses(allCourses);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [mode, user?.uid, activeInstructorId]);

  const handleCreateCourse = async (e) => {
    e.preventDefault();
    const instId = mode === "instructor" ? user.uid : courseForm.instructorId;
    if (!instId) {
      toast.error("Please select an instructor");
      return;
    }
    const inst = instructors.find((i) => i.uid === instId);
    const instructorName =
      inst?.name?.[lang] || inst?.displayName || user.displayName || "";

    await createCourse({
      ...courseForm,
      instructorId: instId,
      instructorName,
    });
    toast.success("Course created");
    setCourseForm({ titleEn: "", titleAr: "", descEn: "", descAr: "", instructorId: "" });
    setShowCourseForm(false);
    await loadData();
  };

  const handleAddLesson = async (e) => {
    e.preventDefault();
    if (!lessonCourseId) return;
    await addLessonToCourse(lessonCourseId, lessonForm);
    toast.success("Lesson added");
    setLessonForm({ titleEn: "", titleAr: "", content: "", fileUrl: "" });
    setLessonCourseId(null);
    await loadData();
  };

  const handleDeleteCourse = async (courseId) => {
    await deleteCourse(courseId);
    toast.success("Course deleted");
    await loadData();
  };

  const handleEnrol = async (courseId) => {
    await enrolStudentInCourse(courseId, user.uid);
    await refreshProfile();
    toast.success("Enrolled in course!");
    await loadData();
  };

  const canManage = mode === "admin" || mode === "instructor";

  return (
    <div className="space-y-6">
      <div className="glass-panel rounded-[26px] p-4 sm:p-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className="h-10 w-10 sm:h-11 sm:w-11 rounded-2xl bg-gradient-to-br from-cyan-500 via-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-lg shadow-cyan-500/25 shrink-0">
            <BookOpen className="h-5 w-5 sm:h-6 sm:w-6" />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl font-black">
              {mode === "instructor"
                ? t("nav.myCourses")
                : mode === "student"
                ? t("nav.availableCourses")
                : t("nav.courses")}
            </h1>
            <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
              {mode === "student"
                ? "Courses offered by the instructor(s) you selected."
                : "Manage courses and upload lesson materials."}
            </p>
          </div>
        </div>

        {canManage && (
          <button
            onClick={() => setShowCourseForm((s) => !s)}
            className="glass-btn-primary flex items-center gap-2 px-4 py-2 rounded-xl text-sm"
          >
            <Plus className="h-4 w-4" />
            {t("courses.addCourse")}
          </button>
        )}
      </div>

      {showCourseForm && canManage && (
        <form
          onSubmit={handleCreateCourse}
          autoComplete="off"
          className="glass-card p-5 space-y-4"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold mb-1">{t("courses.titleEn")}</label>
              <input
                required
                value={courseForm.titleEn}
                onChange={(e) => setCourseForm({ ...courseForm, titleEn: e.target.value })}
                className="w-full px-3 py-2 glass-input text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">{t("courses.titleAr")}</label>
              <input
                value={courseForm.titleAr}
                onChange={(e) => setCourseForm({ ...courseForm, titleAr: e.target.value })}
                className="w-full px-3 py-2 glass-input text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">{t("courses.descEn")}</label>
              <textarea
                rows={2}
                value={courseForm.descEn}
                onChange={(e) => setCourseForm({ ...courseForm, descEn: e.target.value })}
                className="w-full px-3 py-2 glass-input text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">{t("courses.descAr")}</label>
              <textarea
                rows={2}
                value={courseForm.descAr}
                onChange={(e) => setCourseForm({ ...courseForm, descAr: e.target.value })}
                className="w-full px-3 py-2 glass-input text-sm"
              />
            </div>
            {mode === "admin" && (
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold mb-1">
                  {t("courses.instructor")}
                </label>
                <select
                  required
                  value={courseForm.instructorId}
                  onChange={(e) =>
                    setCourseForm({ ...courseForm, instructorId: e.target.value })
                  }
                  className="w-full px-3 py-2 glass-input text-sm"
                >
                  <option value="">-- Select Instructor --</option>
                  {instructors.map((inst) => (
                    <option key={inst.uid} value={inst.uid}>
                      {inst.name?.[lang] || inst.displayName} ({inst.email})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                setShowCourseForm(false);
                setCourseForm({ titleEn: "", titleAr: "", descEn: "", descAr: "", instructorId: "" });
              }}
              className="glass-btn-secondary px-4 py-2 rounded-xl text-sm font-semibold"
            >
              {t("app.cancel")}
            </button>
            <button
              type="submit"
              className="glass-btn-primary px-5 py-2 rounded-xl text-sm"
            >
              {t("app.create")}
            </button>
          </div>
        </form>
      )}

      {lessonCourseId && (
        <form
          onSubmit={handleAddLesson}
          autoComplete="off"
          className="glass-card border-sky-400/60 p-5 space-y-4"
        >
          <h3 className="text-sm font-bold">{t("courses.addLesson")}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold mb-1">{t("courses.lessonTitleEn")}</label>
              <input
                required
                value={lessonForm.titleEn}
                onChange={(e) => setLessonForm({ ...lessonForm, titleEn: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">{t("courses.lessonTitleAr")}</label>
              <input
                value={lessonForm.titleAr}
                onChange={(e) => setLessonForm({ ...lessonForm, titleAr: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold mb-1">
                Upload Lesson File (PDF / TXT / MD — auto-extracts text for Platform AI)
              </label>
              <input
                type="file"
                accept=".pdf,.txt,.md"
                onChange={handleLessonFilePick}
                className="w-full px-3 py-2 rounded-xl border border-dashed border-sky-400 dark:border-sky-700 bg-sky-50/40 dark:bg-sky-950/20 text-xs"
              />
              {extractingPdf && (
                <div className="text-xs text-sky-600 mt-1">Extracting lesson text...</div>
              )}
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold mb-1">{t("courses.lessonUrl")}</label>
              <input
                value={lessonForm.fileUrl}
                onChange={(e) => setLessonForm({ ...lessonForm, fileUrl: e.target.value })}
                placeholder="https://..."
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold mb-1">{t("courses.lessonContent")}</label>
              <textarea
                rows={4}
                required
                value={lessonForm.content}
                onChange={(e) => setLessonForm({ ...lessonForm, content: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                setLessonCourseId(null);
                setLessonForm({ titleEn: "", titleAr: "", content: "", fileUrl: "" });
              }}
              className="glass-btn-secondary px-4 py-2 rounded-xl text-sm font-semibold"
            >
              {t("app.cancel")}
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-emerald-600 text-white text-sm font-semibold"
            >
              {t("app.save")}
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="text-sm text-slate-500 py-8 text-center">{t("app.loading")}</div>
      ) : courses.length === 0 ? (
        <div className="glass-card p-8 text-center text-sm text-slate-500">
          {t("app.noData")}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {courses.map((c) => {
            const isEnrolled = c.enrolledStudents.includes(user?.uid);
            return (
              <div
                key={c.id}
                className="glass-card p-5 flex flex-col justify-between space-y-4"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="h-9 w-9 rounded-xl bg-sky-100 dark:bg-sky-900/40 text-sky-600 dark:text-sky-300 flex items-center justify-center shrink-0">
                        <BookOpen className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="font-bold text-base">
                          {c.title?.[lang] || c.title?.en}
                        </h3>
                        <p className="text-xs text-slate-500">
                          {t("courses.instructor")}: {c.instructorName || c.instructorId}
                        </p>
                      </div>
                    </div>
                    {canManage && (
                      <button
                        onClick={() => handleDeleteCourse(c.id)}
                        className="p-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>

                  <p className="text-xs text-slate-600 dark:text-slate-300 mt-3">
                    {c.description?.[lang] || c.description?.en || "—"}
                  </p>

                  {/* Lessons */}
                  <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-800">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold uppercase text-slate-500">
                        {t("courses.lessons")} ({c.lessons.length})
                      </span>
                      {canManage && (
                        <button
                          onClick={() => setLessonCourseId(c.id)}
                          className="text-xs font-semibold text-sky-600 dark:text-sky-400 hover:underline"
                        >
                          + {t("courses.addLesson")}
                        </button>
                      )}
                    </div>
                    <div className="space-y-1.5">
                      {c.lessons.map((l) => (
                        <div
                          key={l.id}
                          onClick={() => setReadingLesson(l)}
                          className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 hover:bg-sky-50 dark:hover:bg-sky-950/30 cursor-pointer text-xs space-y-1 transition-colors"
                        >
                          <div className="flex items-center justify-between font-semibold">
                            <span className="flex items-center gap-1.5">
                              <FileText className="h-3.5 w-3.5 text-emerald-500" />
                              {l.title?.[lang] || l.title?.en}
                            </span>
                            {l.fileUrl && (
                              <a
                                href={l.fileUrl}
                                target="_blank"
                                rel="noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="inline-flex items-center gap-1 text-sky-600 hover:underline"
                              >
                                PDF <ExternalLink className="h-3 w-3" />
                              </a>
                            )}
                          </div>
                          {l.content && (
                            <p className="text-slate-500 dark:text-slate-400 line-clamp-2">
                              {l.content}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
                  <span className="text-slate-500">
                    {t("courses.studentsCount")}: <strong>{c.enrolledStudents.length}</strong>
                  </span>
                  {mode === "student" && (
                    <button
                      onClick={() => handleEnrol(c.id)}
                      disabled={isEnrolled}
                      className={`px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 ${
                        isEnrolled
                          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
                          : "bg-sky-600 hover:bg-sky-700 text-white"
                      }`}
                    >
                      {isEnrolled && <CheckCircle2 className="h-3.5 w-3.5" />}
                      {isEnrolled ? t("courses.enrolled") : t("courses.enrol")}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {readingLesson && (
        <div
          className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
          onClick={() => setReadingLesson(null)}
        >
          <div
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-2xl w-full max-h-[80vh] flex flex-col shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <h3 className="font-bold text-base">
                {readingLesson.title?.[lang] || readingLesson.title?.en}
              </h3>
              <button
                onClick={() => setReadingLesson(null)}
                className="text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-white"
              >
                {t("app.cancel")}
              </button>
            </div>
            <div className="p-5 overflow-y-auto text-sm text-slate-700 dark:text-slate-200 whitespace-pre-wrap leading-relaxed">
              {readingLesson.content || "—"}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

