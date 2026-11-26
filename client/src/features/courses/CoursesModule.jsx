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
  Lock,
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
import { useUploadProgress } from "../../context/UploadProgressContext";

export default function CoursesModule({ mode = "admin", activeInstructorId = null }) {
  const { t } = useTranslation();
  const { user, refreshProfile } = useAuth();
  const { lang } = useLang();
  const { trackUpload } = useUploadProgress();

  const [courses, setCourses] = useState([]);
  const [instructors, setInstructors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCourseForm, setShowCourseForm] = useState(false);
  const [lessonCourseId, setLessonCourseId] = useState(null);
  const [studentCourseFilter, setStudentCourseFilter] = useState("all"); // "all" | "enrolled"
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
      const extracted = await trackUpload({
        fileName: file.name,
        fileSize: file.size,
        title: lang === "ar" ? "رفع واستخراج محتوى الدرس" : "Uploading & Reading Lesson Content",
        action: async (reportProgress) => {
          reportProgress({ percent: 15, stage: lang === "ar" ? "قراءة ملف الدرس..." : "Reading lesson file..." });
          let res;
          if (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) {
            res = await extractTextFromPdfFile(file, { onProgress: reportProgress });
          } else {
            res = await file.text();
            reportProgress({ percent: 90, stage: lang === "ar" ? "معالجة النص..." : "Processing text..." });
          }
          return res;
        },
      });
      setLessonForm((prev) => ({
        ...prev,
        titleEn: prev.titleEn || file.name.replace(/\.[^.]+$/, ""),
        content: extracted.slice(0, 12000),
      }));
      toast.success(lang === "ar" ? `تم استخراج النص من ${file.name}` : `Extracted text from ${file.name}`);
    } catch (err) {
      console.error(err);
      toast.error(lang === "ar" ? "تعذر قراءة أو استخراج النص من الملف" : "Could not extract text from file");
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
          <div className="h-10 w-10 sm:h-11 sm:w-11 rounded-2xl bg-gradient-to-br from-sky-500 via-teal-500 to-emerald-500 text-white flex items-center justify-center shadow-lg shadow-teal-500/25 shrink-0">
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
          className="glass-form-card p-6 sm:p-7 space-y-6"
        >
          <div className="flex items-center gap-3 pb-3 border-b border-slate-200/60 dark:border-white/10">
            <div className="h-10 w-10 rounded-2xl bg-gradient-to-tr from-sky-500 to-emerald-500 text-white flex items-center justify-center shadow-md shadow-teal-500/25">
              <BookOpen className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                {t("courses.addCourse")}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {lang === "ar"
                  ? "أدخل تفاصيل الدورة التدريبية والمعلومات الخاصة بها"
                  : "Enter course details, descriptions and assigned instructor"}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
            <div>
              <label className="glass-form-label">{t("courses.titleEn")}</label>
              <input
                required
                value={courseForm.titleEn}
                onChange={(e) => setCourseForm({ ...courseForm, titleEn: e.target.value })}
                placeholder="e.g. Full Stack Web Development"
                className="w-full px-3.5 py-2.5 glass-input text-sm"
              />
            </div>
            <div>
              <label className="glass-form-label">{t("courses.titleAr")}</label>
              <input
                value={courseForm.titleAr}
                onChange={(e) => setCourseForm({ ...courseForm, titleAr: e.target.value })}
                placeholder="مثال: تطوير الويب المتكامل"
                className="w-full px-3.5 py-2.5 glass-input text-sm"
              />
            </div>
            <div>
              <label className="glass-form-label">{t("courses.descEn")}</label>
              <textarea
                rows={3}
                value={courseForm.descEn}
                onChange={(e) => setCourseForm({ ...courseForm, descEn: e.target.value })}
                placeholder="Course curriculum overview in English..."
                className="w-full px-3.5 py-2.5 glass-input text-sm"
              />
            </div>
            <div>
              <label className="glass-form-label">{t("courses.descAr")}</label>
              <textarea
                rows={3}
                value={courseForm.descAr}
                onChange={(e) => setCourseForm({ ...courseForm, descAr: e.target.value })}
                placeholder="نبذة عن المنهج والمحتوى بالعربية..."
                className="w-full px-3.5 py-2.5 glass-input text-sm"
              />
            </div>
            {mode === "admin" && (
              <div className="md:col-span-2">
                <label className="glass-form-label">
                  {t("courses.instructor")}
                </label>
                <select
                  required
                  value={courseForm.instructorId}
                  onChange={(e) =>
                    setCourseForm({ ...courseForm, instructorId: e.target.value })
                  }
                  className="w-full px-3.5 py-2.5 glass-input text-sm"
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
          <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-200/60 dark:border-white/10">
            <button
              type="button"
              onClick={() => {
                setShowCourseForm(false);
                setCourseForm({ titleEn: "", titleAr: "", descEn: "", descAr: "", instructorId: "" });
              }}
              className="glass-btn-secondary px-5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold cursor-pointer"
            >
              {t("app.cancel")}
            </button>
            <button
              type="submit"
              className="glass-btn-primary px-6 py-2.5 rounded-xl text-xs sm:text-sm cursor-pointer"
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
          className="glass-form-card p-6 sm:p-7 space-y-6"
        >
          <div className="flex items-center gap-3 pb-3 border-b border-slate-200/60 dark:border-white/10">
            <div className="h-10 w-10 rounded-2xl bg-gradient-to-tr from-sky-500 to-emerald-500 text-white flex items-center justify-center shadow-md shadow-teal-500/25">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {t("courses.addLesson")}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {lang === "ar"
                  ? "أضف درساً جديداً للمنهج وارفع ملخصاً أو ملف PDF"
                  : "Add a new lesson to this course and upload lecture materials"}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
            <div>
              <label className="glass-form-label">{t("courses.lessonTitleEn")}</label>
              <input
                required
                value={lessonForm.titleEn}
                onChange={(e) => setLessonForm({ ...lessonForm, titleEn: e.target.value })}
                placeholder="e.g. Introduction to React Components"
                className="w-full px-3.5 py-2.5 glass-input text-sm"
              />
            </div>
            <div>
              <label className="glass-form-label">{t("courses.lessonTitleAr")}</label>
              <input
                value={lessonForm.titleAr}
                onChange={(e) => setLessonForm({ ...lessonForm, titleAr: e.target.value })}
                placeholder="مثال: مقدمة إلى مكونات React"
                className="w-full px-3.5 py-2.5 glass-input text-sm"
              />
            </div>
            <div className="md:col-span-2">
              <label className="glass-form-label">
                Upload Lesson File (PDF / TXT / MD — auto-extracts text for Platform AI)
              </label>
              <div className="p-4 rounded-2xl glass-subtle border border-dashed border-teal-400/50">
                <input
                  type="file"
                  accept=".pdf,.txt,.md"
                  onChange={handleLessonFilePick}
                  className="w-full text-xs text-slate-600 dark:text-slate-300 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-gradient-to-r file:from-sky-500 file:to-emerald-500 file:text-white hover:file:opacity-90 cursor-pointer"
                />
                {extractingPdf && (
                  <div className="text-xs text-teal-600 dark:text-teal-400 font-semibold mt-2 animate-pulse">
                    Extracting lesson text for AI features...
                  </div>
                )}
              </div>
            </div>
            <div className="md:col-span-2">
              <label className="glass-form-label">{t("courses.lessonUrl")}</label>
              <input
                value={lessonForm.fileUrl}
                onChange={(e) => setLessonForm({ ...lessonForm, fileUrl: e.target.value })}
                placeholder="https://..."
                className="w-full px-3.5 py-2.5 glass-input text-sm"
              />
            </div>
            <div className="md:col-span-2">
              <label className="glass-form-label">{t("courses.lessonContent")}</label>
              <textarea
                rows={4}
                required
                value={lessonForm.content}
                onChange={(e) => setLessonForm({ ...lessonForm, content: e.target.value })}
                placeholder="Lesson study notes or transcription..."
                className="w-full px-3.5 py-2.5 glass-input text-sm"
              />
            </div>
          </div>
          <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-200/60 dark:border-white/10">
            <button
              type="button"
              onClick={() => {
                setLessonCourseId(null);
                setLessonForm({ titleEn: "", titleAr: "", content: "", fileUrl: "" });
              }}
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

      {loading ? (
        <div className="text-sm text-slate-500 py-8 text-center">{t("app.loading")}</div>
      ) : courses.length === 0 ? (
        <div className="glass-panel rounded-[26px] p-8 text-center text-sm text-slate-500">
          {t("app.noData")}
        </div>
      ) : (
        <div className="glass-panel rounded-[26px] p-5 sm:p-6 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 pb-4 border-b border-slate-200/70 dark:border-white/10">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-sky-500 to-teal-500 text-white flex items-center justify-center shadow-md shadow-teal-500/25 shrink-0">
                <BookOpen className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white tracking-tight">
                  {t("courses.title") || "Courses"}
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {lang === "ar"
                    ? "المقررات المقدمة من المحاضر (المحاضرين) الذين اخترتهم."
                    : "Courses offered by the instructor(s) you selected."}
                </p>
              </div>
            </div>

            {mode === "student" && (
              <div className="flex items-center gap-4 border-b border-slate-200/60 dark:border-white/10 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setStudentCourseFilter("all")}
                  className={`pb-2 border-b-2 transition-all cursor-pointer ${
                    studentCourseFilter === "all"
                      ? "border-teal-400 text-teal-600 dark:text-white"
                      : "border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
                  }`}
                >
                  {lang === "ar" ? "جميع المقررات" : "All Courses"} ({courses.length})
                </button>
                <button
                  type="button"
                  onClick={() => setStudentCourseFilter("enrolled")}
                  className={`pb-2 border-b-2 transition-all cursor-pointer ${
                    studentCourseFilter === "enrolled"
                      ? "border-teal-400 text-teal-600 dark:text-white"
                      : "border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
                  }`}
                >
                  {lang === "ar" ? "مقرراتي المسجلة" : "My Enrolled Courses"} (
                  {courses.filter((c) => c.enrolledStudents.includes(user?.uid)).length})
                </button>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {courses
              .filter((c) =>
                mode === "student" && studentCourseFilter === "enrolled"
                  ? c.enrolledStudents.includes(user?.uid)
                  : true
              )
              .map((c) => {
                const isEnrolled = c.enrolledStudents.includes(user?.uid);
                return (
                  <div
                    key={c.id}
                    className="glass-card p-5 flex flex-col justify-between space-y-4"
                  >
                    <div className="space-y-3.5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="h-11 w-11 rounded-2xl bg-teal-500/15 text-teal-600 dark:text-teal-300 font-mono font-bold text-sm flex items-center justify-center shrink-0 border border-teal-400/25 shadow-sm">
                            {"</>"}
                          </div>
                          <div className="min-w-0">
                            <h3 className="font-extrabold text-base text-slate-900 dark:text-white leading-snug">
                              {c.title?.[lang] || c.title?.en}
                            </h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-1 truncate">
                              <span>{t("courses.instructor")}:</span>
                              <strong className="text-slate-700 dark:text-slate-200">
                                {c.instructorName || c.instructorId}
                              </strong>
                            </p>
                          </div>
                        </div>
                        {canManage && (
                          <button
                            onClick={() => handleDeleteCourse(c.id)}
                            className="p-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 transition-colors shrink-0"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>

                      {/* Metadata Pill Badges matching PM.jpeg */}
                      <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-bold">
                        <span className="px-2.5 py-0.5 rounded-full bg-teal-500/10 border border-teal-400/30 text-teal-700 dark:text-teal-300">
                          {lang === "ar" ? "مسار متقدم" : "Advanced Track"}
                        </span>
                        <span className="px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-white/[0.06] border border-slate-200/80 dark:border-white/10 text-slate-600 dark:text-slate-300">
                          {c.lessons.length} {c.lessons.length === 1 ? (lang === "ar" ? "درس" : "Lesson") : (lang === "ar" ? "دروس" : "Lessons")}
                        </span>
                        <span className="px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-white/[0.06] border border-slate-200/80 dark:border-white/10 text-slate-600 dark:text-slate-300">
                          {c.enrolledStudents.length} {lang === "ar" ? "مسجّل" : "Enrolled"}
                        </span>
                        {isEnrolled && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-400/30 text-emerald-700 dark:text-emerald-300">
                            <CheckCircle2 className="h-3 w-3" />
                            <span>{lang === "ar" ? "مسجّل" : "Enrolled"}</span>
                          </span>
                        )}
                      </div>

                      {c.description && (
                        <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed line-clamp-2">
                          {c.description?.[lang] || c.description?.en}
                        </p>
                      )}

                      {/* Course Readiness / Enrollment Progress Bar (matching PM.jpeg) */}
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-[11px] font-bold">
                          <span className="text-teal-600 dark:text-teal-300">
                            {isEnrolled
                              ? lang === "ar"
                                ? `${Math.min(100, Math.max(40, c.lessons.length * 35))}% مكتمل`
                                : `${Math.min(100, Math.max(40, c.lessons.length * 35))}% Complete`
                              : lang === "ar"
                              ? "متاح للتسجيل"
                              : "Available to Enroll"}
                          </span>
                          <span className="text-slate-400 font-mono">
                            {c.lessons.length} {lang === "ar" ? "دروس" : "Lessons"}
                          </span>
                        </div>
                        <div className="w-full h-1.5 rounded-full bg-slate-200/80 dark:bg-white/10 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-sky-400 via-teal-400 to-emerald-400 transition-all duration-500"
                            style={{
                              width: `${
                                isEnrolled
                                  ? Math.min(100, Math.max(40, c.lessons.length * 35))
                                  : 18
                              }%`,
                            }}
                          />
                        </div>
                      </div>

                      {/* Lessons List */}
                      <div className="pt-2 border-t border-slate-200/60 dark:border-white/10 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                            <BookOpen className="h-3.5 w-3.5 text-teal-500" />
                            <span>
                              {t("courses.lessons")} ({c.lessons.length})
                            </span>
                          </span>
                          {canManage && (
                            <button
                              onClick={() => setLessonCourseId(c.id)}
                              className="text-xs font-bold text-teal-600 dark:text-teal-300 hover:underline"
                            >
                              + {t("courses.addLesson")}
                            </button>
                          )}
                        </div>

                        <div className="space-y-2">
                          {c.lessons.map((l) => (
                            <div
                              key={l.id}
                              onClick={() => {
                                if (mode === "student" && !isEnrolled) {
                                  toast.error(
                                    lang === "ar"
                                      ? "يجب التسجيل في المقرر أولاً للوصول إلى محتوى الدرس"
                                      : "Please enroll in this course first to access its lessons"
                                  );
                                  return;
                                }
                                setReadingLesson(l);
                              }}
                              className={`p-3 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                                mode === "student" && !isEnrolled
                                  ? "bg-slate-100/60 dark:bg-white/[0.03] border-dashed border-slate-300 dark:border-white/10 opacity-75 cursor-not-allowed"
                                  : isEnrolled
                                  ? "glass-subtle cursor-pointer"
                                  : "glass-subtle cursor-pointer"
                              }`}
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                {mode === "student" && !isEnrolled ? (
                                  <Lock className="h-4 w-4 text-amber-500 shrink-0" />
                                ) : (
                                  <FileText className="h-4 w-4 text-teal-500 shrink-0" />
                                )}
                                <div className="min-w-0">
                                  <div className="font-bold text-xs text-slate-900 dark:text-white truncate">
                                    {l.title?.[lang] || l.title?.en}
                                  </div>
                                  {mode === "student" && !isEnrolled ? (
                                    <p className="text-[11px] text-amber-600 dark:text-amber-400 font-semibold mt-0.5">
                                      {lang === "ar"
                                        ? "مغلق — يتطلب التسجيل في المقرر"
                                        : "Locked — Requires course enrollment"}
                                    </p>
                                  ) : (
                                    l.content && (
                                      <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5">
                                        {l.content}
                                      </p>
                                    )
                                  )}
                                </div>
                              </div>

                              <div className="flex items-center gap-2 shrink-0">
                                {l.fileUrl && (isEnrolled || mode !== "student") && (
                                  <a
                                    href={l.fileUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    onClick={(e) => e.stopPropagation()}
                                    className="px-2.5 py-1 rounded-lg bg-white/80 dark:bg-white/[0.08] border border-slate-200 dark:border-white/15 inline-flex items-center gap-1 text-[11px] text-slate-700 dark:text-slate-200 hover:border-teal-400 font-bold"
                                  >
                                    <span>{lang === "ar" ? "فتح PDF" : "Open PDF"}</span>
                                    <ExternalLink className="h-3 w-3" />
                                  </a>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Course Action Footer */}
                    {mode === "student" && (
                      <div className="pt-2">
                        {!isEnrolled ? (
                          <button
                            type="button"
                            onClick={() => handleEnrol(c.id)}
                            className="w-full glass-btn-primary py-2.5 px-4 text-xs font-extrabold flex items-center justify-center gap-1.5 cursor-pointer"
                          >
                            <span>{t("courses.enrol")}</span>
                            <span>→</span>
                          </button>
                        ) : (
                          c.lessons[0] && (
                            <button
                              type="button"
                              onClick={() => setReadingLesson(c.lessons[0])}
                              className="w-full glass-btn-primary py-2.5 px-4 text-xs font-extrabold flex items-center justify-center gap-1.5 cursor-pointer"
                            >
                              <span>{lang === "ar" ? "دخول المقرر" : "Enter Course"}</span>
                              <span className="rtl:rotate-180">→</span>
                            </button>
                          )
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
          </div>
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

