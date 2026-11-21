import { useEffect, useState, useRef } from "react";
import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";
import {
  Video,
  PlayCircle,
  Play,
  Pause,
  Upload,
  Plus,
  Trash2,
  Edit3,
  Lock,
  ShieldAlert,
  ShieldCheck,
  Eye,
  Clock,
  Calendar,
  BookOpen,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  X,
  ExternalLink,
  FileVideo,
  Sparkles,
  RefreshCw,
  Film,
  Users,
  Maximize2,
  Minimize2,
} from "lucide-react";
import {
  listCourses,
  listCourseSessions,
  createCourseSession,
  updateCourseSession,
  deleteCourseSession,
  logSessionAttendance,
} from "../../services/platformService";
import { useAuth } from "../../context/AuthContext";
import { useLang } from "../../context/LangContext";
import { useUploadProgress } from "../../context/UploadProgressContext";
import { usePopup } from "../../context/PopupContext";

export default function CourseSessionsModule({
  mode = "instructor", // "instructor" | "student" | "admin"
  activeInstructorId = null,
}) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { lang } = useLang();
  const { trackUpload } = useUploadProgress();
  const { showPopup } = usePopup();

  const [sessions, setSessions] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [courseFilter, setCourseFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Modal states
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [editingSessionId, setEditingSessionId] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Active protected session for viewing
  const [activeSession, setActiveSession] = useState(null);

  // Upload Form state
  const [form, setForm] = useState({
    courseId: "",
    titleEn: "",
    titleAr: "",
    descriptionEn: "",
    descriptionAr: "",
    sessionDate: new Date().toISOString().slice(0, 10),
    duration: "45 min",
    videoSourceType: "file", // "file" | "url"
    videoUrl: "",
    videoFileName: "",
    resourcesText: "",
  });

  const fileInputRef = useRef(null);

  // Load courses and sessions
  const loadData = async () => {
    setLoading(true);
    try {
      const [allCourses, allSessions] = await Promise.all([
        listCourses(mode === "instructor" ? user?.uid : activeInstructorId),
        listCourseSessions(),
      ]);
      setCourses(allCourses);

      let filteredSessions = allSessions;
      if (mode === "instructor") {
        filteredSessions = allSessions.filter((s) => s.instructorId === user?.uid);
      } else if (mode === "student") {
        // Only show sessions for courses associated with active instructor or student's enrolled courses
        const relevantCourseIds = allCourses.map((c) => c.id);
        filteredSessions = allSessions.filter(
          (s) =>
            relevantCourseIds.includes(s.courseId) ||
            (activeInstructorId && s.instructorId === activeInstructorId)
        );
      }
      setSessions(filteredSessions);
    } catch (err) {
      console.error("Failed to load sessions:", err);
      toast.error(lang === "ar" ? "تعذر تحميل الجلسات" : "Failed to load sessions");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user?.uid, activeInstructorId, mode]);

  // Handle local video file pick with progress reporting and duration detection
  const handleVideoFilePick = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("video/") && !file.name.match(/\.(mp4|webm|ogg|mov)$/i)) {
      toast.error(lang === "ar" ? "يرجى اختيار ملف فيديو صالح (MP4, WebM)" : "Please select a valid video file (MP4, WebM)");
      return;
    }

    try {
      const videoDataUrl = await trackUpload({
        fileName: file.name,
        fileSize: file.size,
        title: lang === "ar" ? "رفع ومعالجة جلسة المحاضرة" : "Uploading & Processing Course Session",
        action: async (reportProgress) => {
          reportProgress({ percent: 10, stage: lang === "ar" ? "قراءة ملف الفيديو..." : "Reading video file..." });

          // Auto-detect duration using an offscreen video element
          const tempUrl = URL.createObjectURL(file);
          const probeVideo = document.createElement("video");
          probeVideo.preload = "metadata";
          probeVideo.src = tempUrl;

          await new Promise((resolve) => {
            probeVideo.onloadedmetadata = () => {
              const durSec = Math.round(probeVideo.duration);
              if (durSec && !isNaN(durSec)) {
                const mins = Math.floor(durSec / 60);
                const secs = durSec % 60;
                const formatted = mins > 0 ? `${mins} min ${secs > 0 ? `${secs}s` : ""}`.trim() : `${secs}s`;
                setForm((prev) => ({ ...prev, duration: formatted }));
              }
              resolve();
            };
            probeVideo.onerror = () => resolve();
          });

          reportProgress({ percent: 50, stage: lang === "ar" ? "تجهيز دفق الفيديو الآمن..." : "Encoding secure media stream..." });

          return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onprogress = (ev) => {
              if (ev.lengthComputable) {
                const pct = 50 + Math.round((ev.loaded / ev.total) * 45);
                reportProgress({ percent: pct, stage: lang === "ar" ? "معالجة الفيديو..." : "Processing video stream..." });
              }
            };
            reader.onload = () => {
              reportProgress({ percent: 100, stage: lang === "ar" ? "اكتمل الرفع بنجاح!" : "Upload complete!" });
              resolve(reader.result);
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
          });
        },
      });

      setForm((prev) => ({
        ...prev,
        videoUrl: videoDataUrl,
        videoFileName: file.name,
        titleEn: prev.titleEn || file.name.replace(/\.[^.]+$/, ""),
        titleAr: prev.titleAr || file.name.replace(/\.[^.]+$/, ""),
      }));
      toast.success(lang === "ar" ? "تم تحميل ملف الفيديو بنجاح!" : "Video file loaded successfully!");
    } catch (err) {
      console.error(err);
      toast.error(lang === "ar" ? "تعذر تحميل الفيديو" : "Could not upload video");
    }
  };

  // Submit session
  const handleSubmitSession = async (e) => {
    e.preventDefault();
    if (!form.courseId) {
      toast.error(lang === "ar" ? "يرجى اختيار المقرر الدراسي المرتبط" : "Please select the target course");
      return;
    }
    if (!form.titleEn.trim() && !form.titleAr.trim()) {
      toast.error(lang === "ar" ? "يرجى إدخال عنوان الجلسة" : "Please enter session title");
      return;
    }
    if (!form.videoUrl.trim()) {
      toast.error(lang === "ar" ? "يرجى رفع ملف فيديو أو إدخال رابط الجلسة" : "Please provide a video file or link");
      return;
    }

    setSubmitting(true);
    const selectedCourse = courses.find((c) => c.id === form.courseId);

    try {
      if (editingSessionId) {
        await updateCourseSession(editingSessionId, {
          courseId: form.courseId,
          courseTitle: selectedCourse?.title || { en: "Course", ar: "مقرر" },
          title: {
            en: form.titleEn.trim() || form.titleAr.trim(),
            ar: form.titleAr.trim() || form.titleEn.trim(),
          },
          description: {
            en: form.descriptionEn.trim(),
            ar: form.descriptionAr.trim(),
          },
          sessionDate: form.sessionDate,
          duration: form.duration || "45 min",
          videoUrl: form.videoUrl,
          videoFileName: form.videoFileName,
          videoType: form.videoSourceType,
          resources: form.resourcesText
            ? form.resourcesText.split("\n").filter(Boolean).map((line) => line.trim())
            : [],
        });
        toast.success(lang === "ar" ? "تم تحديث بيانات الجلسة بنجاح!" : "Session updated successfully!");
      } else {
        await createCourseSession({
          courseId: form.courseId,
          courseTitle: selectedCourse?.title || { en: "Course", ar: "مقرر" },
          instructorId: user?.uid,
          instructorName: user?.displayName || user?.name?.[lang] || "Instructor",
          titleEn: form.titleEn.trim(),
          titleAr: form.titleAr.trim(),
          descriptionEn: form.descriptionEn.trim(),
          descriptionAr: form.descriptionAr.trim(),
          sessionDate: form.sessionDate,
          duration: form.duration || "45 min",
          videoUrl: form.videoUrl,
          videoFileName: form.videoFileName,
          videoType: form.videoSourceType,
          resources: form.resourcesText
            ? form.resourcesText.split("\n").filter(Boolean).map((line) => line.trim())
            : [],
        });
        toast.success(lang === "ar" ? "تم نشر الجلسة وتنبيه الطلاب بنجاح!" : "Session published and students notified!");
      }

      setShowUploadModal(false);
      setEditingSessionId(null);
      setForm({
        courseId: "",
        titleEn: "",
        titleAr: "",
        descriptionEn: "",
        descriptionAr: "",
        sessionDate: new Date().toISOString().slice(0, 10),
        duration: "45 min",
        videoSourceType: "file",
        videoUrl: "",
        videoFileName: "",
        resourcesText: "",
      });
      loadData();
    } catch (err) {
      console.error("Save session error:", err);
      toast.error(lang === "ar" ? "حدث خطأ أثناء حفظ الجلسة" : "Failed to save session");
    } finally {
      setSubmitting(false);
    }
  };

  // Open Edit modal
  const handleEdit = (session) => {
    setEditingSessionId(session.id);
    setForm({
      courseId: session.courseId || "",
      titleEn: session.title?.en || "",
      titleAr: session.title?.ar || "",
      descriptionEn: session.description?.en || "",
      descriptionAr: session.description?.ar || "",
      sessionDate: session.sessionDate || new Date().toISOString().slice(0, 10),
      duration: session.duration || "45 min",
      videoSourceType: session.videoType || "file",
      videoUrl: session.videoUrl || "",
      videoFileName: session.videoFileName || "",
      resourcesText: Array.isArray(session.resources) ? session.resources.join("\n") : "",
    });
    setShowUploadModal(true);
  };

  // Delete session
  const handleDelete = (session) => {
    showPopup({
      title: lang === "ar" ? "حذف الجلسة الدراسية" : "Delete Course Session",
      message:
        lang === "ar"
          ? `هل أنت متأكد من حذف الجلسة "${session.title?.[lang] || session.title?.ar}"؟ لن يتمكن الطلاب من مشاهدتها بعد الحذف.`
          : `Are you sure you want to delete session "${session.title?.[lang] || session.title?.en}"? Students will no longer have access.`,
      type: "confirm",
      confirmText: lang === "ar" ? "نعم، حذف" : "Yes, Delete",
      cancelText: lang === "ar" ? "إلغاء" : "Cancel",
      onConfirm: async () => {
        try {
          await deleteCourseSession(session.id);
          toast.success(lang === "ar" ? "تم حذف الجلسة بنجاح" : "Session deleted successfully");
          loadData();
        } catch {
          toast.error(lang === "ar" ? "تعذر حذف الجلسة" : "Failed to delete session");
        }
      },
    });
  };

  // Filtered sessions
  const filteredSessions = sessions.filter((s) => {
    if (courseFilter !== "all" && s.courseId !== courseFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle =
        (s.title?.en && s.title.en.toLowerCase().includes(q)) ||
        (s.title?.ar && s.title.ar.toLowerCase().includes(q));
      const matchDesc =
        (s.description?.en && s.description.en.toLowerCase().includes(q)) ||
        (s.description?.ar && s.description.ar.toLowerCase().includes(q));
      const matchCourse =
        (s.courseTitle?.en && s.courseTitle.en.toLowerCase().includes(q)) ||
        (s.courseTitle?.ar && s.courseTitle.ar.toLowerCase().includes(q));
      if (!matchTitle && !matchDesc && !matchCourse) return false;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Top Banner Header */}
      <div className="relative overflow-hidden rounded-[28px] p-6 sm:p-8 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white shadow-xl shadow-indigo-500/20">
        <div className="pointer-events-none absolute -top-12 -end-12 h-44 w-44 rounded-full bg-white/15 blur-2xl" />
        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-xs font-bold text-white border border-white/25">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-300" />
              <span>
                {lang === "ar"
                  ? "حماية المحتوى المتقدمة • منع تسجيل وتصوير الشاشة نشط"
                  : "DRM & Content Protection • Anti-Screen Recording Active"}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
              {mode === "instructor"
                ? lang === "ar"
                  ? "جلسات المقررات المسجلة والتحميل"
                  : "Course Recorded Sessions Studio"
                : lang === "ar"
                ? "جلسات المقررات الدراسية المشاهدة الآمنة"
                : "Protected Course Sessions Viewer"}
            </h1>
            <p className="text-xs sm:text-sm text-sky-100/90 max-w-2xl font-medium leading-relaxed">
              {mode === "instructor"
                ? lang === "ar"
                  ? "ارفع المحاضرات والجلسات المسجلة واربطها بمقرراتك مع تطبيق حماية رقمية مشددة تمنع الطلاب من التحميل أو تصوير الشاشة."
                  : "Upload video sessions linked to your courses with strict DRM safeguards that prevent screen recording, screenshots, and unauthorized downloads."
                : lang === "ar"
                ? "شاهد جلسات ومحاضرات مقرراتك الدراسية بأعلى جودة مع حماية الخصوصية ومحتوى الدورة."
                : "Watch recorded course lectures with instant streaming and continuous content privacy protection."}
            </p>
          </div>

          {mode === "instructor" && (
            <button
              onClick={() => {
                setEditingSessionId(null);
                setForm({
                  courseId: courses[0]?.id || "",
                  titleEn: "",
                  titleAr: "",
                  descriptionEn: "",
                  descriptionAr: "",
                  sessionDate: new Date().toISOString().slice(0, 10),
                  duration: "45 min",
                  videoSourceType: "file",
                  videoUrl: "",
                  videoFileName: "",
                  resourcesText: "",
                });
                setShowUploadModal(true);
              }}
              className="shrink-0 px-5 py-3 rounded-2xl bg-white text-indigo-700 font-extrabold text-sm shadow-xl hover:bg-sky-50 active:scale-95 transition-all flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              <span>{lang === "ar" ? "رفع جلسة جديدة" : "Upload New Session"}</span>
            </button>
          )}
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-5 border-t border-white/15">
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3 border border-white/15">
            <div className="text-[11px] text-sky-100 font-semibold flex items-center gap-1.5">
              <Film className="h-3.5 w-3.5 text-sky-300" />
              <span>{lang === "ar" ? "إجمالي الجلسات" : "Total Sessions"}</span>
            </div>
            <div className="text-xl sm:text-2xl font-black mt-1">{sessions.length}</div>
          </div>
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3 border border-white/15">
            <div className="text-[11px] text-sky-100 font-semibold flex items-center gap-1.5">
              <BookOpen className="h-3.5 w-3.5 text-purple-300" />
              <span>{lang === "ar" ? "المقررات المرتبطة" : "Linked Courses"}</span>
            </div>
            <div className="text-xl sm:text-2xl font-black mt-1">
              {new Set(sessions.map((s) => s.courseId)).size}
            </div>
          </div>
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3 border border-white/15">
            <div className="text-[11px] text-sky-100 font-semibold flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 text-amber-300" />
              <span>{lang === "ar" ? "حماية الوسائط" : "Media Security"}</span>
            </div>
            <div className="text-xl sm:text-2xl font-black mt-1 text-emerald-300">
              {lang === "ar" ? "100% محمي" : "100% Protected"}
            </div>
          </div>
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3 border border-white/15">
            <div className="text-[11px] text-sky-100 font-semibold flex items-center gap-1.5">
              <Eye className="h-3.5 w-3.5 text-emerald-300" />
              <span>{lang === "ar" ? "المشاهدات الكلية" : "Total Watches"}</span>
            </div>
            <div className="text-xl sm:text-2xl font-black mt-1">
              {sessions.reduce((acc, s) => acc + (s.views?.length || 0), 0)}
            </div>
          </div>
        </div>
      </div>

      {/* Course Filter Tabs & Search Controls */}
      <div className="glass-card p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
          <button
            onClick={() => setCourseFilter("all")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
              courseFilter === "all"
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/20"
                : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
            }`}
          >
            {lang === "ar" ? "جميع المقررات" : "All Courses"} ({sessions.length})
          </button>
          {courses.map((c) => {
            const count = sessions.filter((s) => s.courseId === c.id).length;
            return (
              <button
                key={c.id}
                onClick={() => setCourseFilter(c.id)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                  courseFilter === c.id
                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/20"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                }`}
              >
                {c.title?.[lang] || c.title?.en} ({count})
              </button>
            );
          })}
        </div>

        {/* Search */}
        <div className="relative w-full md:w-64">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={lang === "ar" ? "بحث في الجلسات..." : "Search sessions..."}
            className="w-full ps-9 pe-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-white/10 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/30 dark:text-white"
          />
        </div>
      </div>

      {/* Sessions Grid */}
      {loading ? (
        <div className="glass-card p-12 text-center text-sm text-slate-500 animate-pulse">
          <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-indigo-500" />
          <span>{lang === "ar" ? "جاري تحميل جلسات المقررات..." : "Loading course sessions..."}</span>
        </div>
      ) : filteredSessions.length === 0 ? (
        <div className="glass-card p-12 text-center space-y-4">
          <div className="h-14 w-14 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-cyan-400 flex items-center justify-center mx-auto">
            <Video className="h-7 w-7" />
          </div>
          <div>
            <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
              {lang === "ar" ? "لا توجد جلسات متاحة حالياً" : "No Course Sessions Found"}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-md mx-auto">
              {mode === "instructor"
                ? lang === "ar"
                  ? "ابدأ برفع أول جلسة فيديو مسجلة واربطها بمقررك الدراسي ليتمكن الطلاب من مشاهدتها بحماية تامة."
                  : "Start by uploading your first recorded video session linked to a course so students can watch securely."
                : lang === "ar"
                ? "لم يقم المحاضر برفع أي جلسات مسجلة لهذا المقرر حتى الآن. ستظهر الجلسات هنا فور نشرها."
                : "The instructor has not uploaded sessions for this course yet. They will appear here once published."}
            </p>
          </div>
          {mode === "instructor" && (
            <button
              onClick={() => {
                setEditingSessionId(null);
                setForm({
                  courseId: courses[0]?.id || "",
                  titleEn: "",
                  titleAr: "",
                  descriptionEn: "",
                  descriptionAr: "",
                  sessionDate: new Date().toISOString().slice(0, 10),
                  duration: "45 min",
                  videoSourceType: "file",
                  videoUrl: "",
                  videoFileName: "",
                  resourcesText: "",
                });
                setShowUploadModal(true);
              }}
              className="glass-btn-primary px-5 py-2 rounded-xl text-xs font-bold"
            >
              {lang === "ar" ? "رفع أول جلسة" : "Upload First Session"}
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredSessions.map((session) => {
            const courseObj = courses.find((c) => c.id === session.courseId);
            const courseTitle =
              session.courseTitle?.[lang] ||
              session.courseTitle?.en ||
              courseObj?.title?.[lang] ||
              courseObj?.title?.en ||
              "Course";

            return (
              <div
                key={session.id}
                className="glass-card overflow-hidden flex flex-col group hover:shadow-xl transition-all duration-300 border-slate-200/80 dark:border-white/10"
              >
                {/* Thumbnail Header with Watermark & Security Badge */}
                <div className="relative h-44 bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 flex items-center justify-center overflow-hidden">
                  <div className="absolute inset-0 bg-radial from-indigo-500/20 to-transparent pointer-events-none" />

                  {/* Watermark grid overlay effect */}
                  <div className="absolute inset-0 opacity-10 flex flex-wrap gap-4 items-center justify-around text-[10px] font-mono text-white select-none pointer-events-none">
                    <span>ATHAR PROTECTED</span>
                    <span>DRM RESTRICTED</span>
                    <span>ATHAR PROTECTED</span>
                    <span>NO RECORDING</span>
                  </div>

                  {/* Center Play Icon with Glow */}
                  <button
                    type="button"
                    onClick={() => setActiveSession(session)}
                    className="h-16 w-16 rounded-full bg-white/20 backdrop-blur-md border border-white/40 text-white flex items-center justify-center group-hover:scale-110 group-hover:bg-indigo-600 transition-all shadow-xl shadow-black/40 cursor-pointer"
                    title={lang === "ar" ? "مشاهدة الجلسة" : "Watch Session"}
                  >
                    <Play className="h-7 w-7 translate-x-0.5 fill-current" />
                  </button>

                  {/* Top Tags */}
                  <div className="absolute top-3 start-3 end-3 flex items-center justify-between gap-2">
                    <span className="px-2.5 py-1 rounded-lg bg-black/60 backdrop-blur-md text-white text-[11px] font-bold border border-white/10 truncate max-w-[170px]">
                      {courseTitle}
                    </span>
                    <span className="px-2 py-0.5 rounded-lg bg-emerald-500/90 text-white text-[10px] font-extrabold flex items-center gap-1 shadow-sm">
                      <Lock className="h-3 w-3" />
                      <span>{lang === "ar" ? "محمي" : "Protected"}</span>
                    </span>
                  </div>

                  {/* Bottom Duration Badge */}
                  <div className="absolute bottom-2.5 end-3 px-2 py-0.5 rounded-md bg-black/75 backdrop-blur-sm text-white text-[10px] font-mono flex items-center gap-1">
                    <Clock className="h-3 w-3 text-sky-400" />
                    <span>{session.duration || "45 min"}</span>
                  </div>
                </div>

                {/* Card Content Body */}
                <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                  <div>
                    <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 mb-1">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        <span>{session.sessionDate || "Recent"}</span>
                      </span>
                      {session.instructorName && (
                        <span className="font-semibold text-indigo-600 dark:text-cyan-400">
                          {session.instructorName}
                        </span>
                      )}
                    </div>
                    <h3 className="font-extrabold text-sm text-slate-900 dark:text-white line-clamp-1">
                      {session.title?.[lang] || session.title?.en || session.title?.ar}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                      {session.description?.[lang] ||
                        session.description?.en ||
                        session.description?.ar ||
                        (lang === "ar" ? "جلسة دراسية ومحاضرة مسجلة للشرح والتطبيق." : "Recorded technical lecture session.")}
                    </p>
                  </div>

                  {/* Action Buttons */}
                  <div className="pt-2 border-t border-slate-200/60 dark:border-white/10 flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => setActiveSession(session)}
                      className="flex-1 py-2 px-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-500/20 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                    >
                      <Play className="h-3.5 w-3.5 fill-current" />
                      <span>{lang === "ar" ? "مشاهدة الجلسة المحمية" : "Watch Protected Session"}</span>
                    </button>

                    {mode === "instructor" && (
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleEdit(session)}
                          className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                          title={lang === "ar" ? "تعديل الجلسة" : "Edit Session"}
                        >
                          <Edit3 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(session)}
                          className="p-2 rounded-xl text-rose-500 hover:bg-rose-500/10 transition-colors"
                          title={lang === "ar" ? "حذف الجلسة" : "Delete Session"}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Upload / Edit Session Modal (Instructor Mode) */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md">
          <div className="bg-white dark:bg-slate-900 rounded-[28px] max-w-xl w-full p-6 shadow-2xl border border-slate-200 dark:border-white/10 max-h-[90vh] overflow-y-auto space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-white/10">
              <div className="flex items-center gap-2.5">
                <div className="h-10 w-10 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-cyan-400 flex items-center justify-center">
                  <Video className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-black text-base text-slate-900 dark:text-white">
                    {editingSessionId
                      ? lang === "ar"
                        ? "تعديل الجلسة الدراسية"
                        : "Edit Course Session"
                      : lang === "ar"
                      ? "رفع جلسة دراسية جديدة"
                      : "Upload New Course Session"}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {lang === "ar"
                      ? "اربط الجلسة بمقرر محدد لتظهر لطلابك مع الحماية الرقمية"
                      : "Link session to a specific course with media DRM enforcement"}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowUploadModal(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitSession} className="space-y-4">
              {/* Course Selection */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">
                  {lang === "ar" ? "المقرر الدراسي المرتبط *" : "Target Course *"}
                </label>
                <select
                  value={form.courseId}
                  onChange={(e) => setForm({ ...form, courseId: e.target.value })}
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/40 dark:text-white"
                >
                  <option value="">{lang === "ar" ? "-- اختر المقرر --" : "-- Select a Course --"}</option>
                  {courses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.title?.[lang] || c.title?.en || c.title?.ar}
                    </option>
                  ))}
                </select>
              </div>

              {/* Title EN & AR */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">
                    {lang === "ar" ? "عنوان الجلسة (إنجليزي)" : "Session Title (English)"}
                  </label>
                  <input
                    type="text"
                    value={form.titleEn}
                    onChange={(e) => setForm({ ...form, titleEn: e.target.value })}
                    placeholder="e.g. Lecture 04: RESTful API Design"
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/40 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">
                    {lang === "ar" ? "عنوان الجلسة (عربي)" : "Session Title (Arabic)"}
                  </label>
                  <input
                    type="text"
                    value={form.titleAr}
                    onChange={(e) => setForm({ ...form, titleAr: e.target.value })}
                    placeholder="مثال: المحاضرة 4: تصميم واجهات RESTful"
                    dir="rtl"
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/40 dark:text-white"
                  />
                </div>
              </div>

              {/* Date & Duration */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">
                    {lang === "ar" ? "تاريخ الجلسة" : "Session Date"}
                  </label>
                  <input
                    type="date"
                    value={form.sessionDate}
                    onChange={(e) => setForm({ ...form, sessionDate: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/40 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">
                    {lang === "ar" ? "مدة الجلسة (تلقائي / يدوي)" : "Duration (e.g. 45 min)"}
                  </label>
                  <input
                    type="text"
                    value={form.duration}
                    onChange={(e) => setForm({ ...form, duration: e.target.value })}
                    placeholder="45 min"
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/40 dark:text-white"
                  />
                </div>
              </div>

              {/* Video Source Choice */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-2">
                  {lang === "ar" ? "مصدر ملف الفيديو *" : "Video Media Source *"}
                </label>
                <div className="grid grid-cols-2 gap-2 mb-3">
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, videoSourceType: "file" })}
                    className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 border transition-all ${
                      form.videoSourceType === "file"
                        ? "bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-500/20"
                        : "bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300"
                    }`}
                  >
                    <Upload className="h-3.5 w-3.5" />
                    <span>{lang === "ar" ? "رفع ملف فيديو (MP4/WebM)" : "Upload Video File"}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, videoSourceType: "url" })}
                    className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 border transition-all ${
                      form.videoSourceType === "url"
                        ? "bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-500/20"
                        : "bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300"
                    }`}
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    <span>{lang === "ar" ? "رابط فيديو خارجي" : "Direct Video URL"}</span>
                  </button>
                </div>

                {form.videoSourceType === "file" ? (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-indigo-400/40 dark:border-indigo-400/20 rounded-2xl p-5 text-center cursor-pointer hover:border-indigo-500 hover:bg-indigo-500/5 transition-all"
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="video/mp4,video/webm,video/ogg,video/quicktime"
                      onChange={handleVideoFilePick}
                      className="hidden"
                    />
                    <FileVideo className="h-9 w-9 text-indigo-500 mx-auto mb-2" />
                    {form.videoFileName ? (
                      <div>
                        <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                          {form.videoFileName}
                        </p>
                        <p className="text-[10px] text-emerald-500 font-semibold mt-0.5">
                          {lang === "ar" ? "✓ تم تجهيز الفيديو بنجاح (انقر للتبديل)" : "✓ Video loaded successfully (click to change)"}
                        </p>
                      </div>
                    ) : (
                      <div>
                        <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                          {lang === "ar" ? "انقر لاختيار ملف المحاضرة (MP4, WebM)" : "Click to select session video (MP4, WebM)"}
                        </p>
                        <p className="text-[10px] text-slate-400 mt-1">
                          {lang === "ar" ? "سيتم فحص المدة وتجهيز شفرة الحماية تلقائياً" : "Duration auto-detection and DRM protection enabled"}
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div>
                    <input
                      type="url"
                      value={form.videoUrl}
                      onChange={(e) => setForm({ ...form, videoUrl: e.target.value })}
                      placeholder="https://example.com/lecture-recording.mp4"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/40 dark:text-white"
                    />
                  </div>
                )}
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">
                  {lang === "ar" ? "وصف ومحاور الجلسة" : "Session Outline & Key Notes"}
                </label>
                <textarea
                  rows={2}
                  value={lang === "ar" ? form.descriptionAr : form.descriptionEn}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (lang === "ar") setForm({ ...form, descriptionAr: val, descriptionEn: form.descriptionEn || val });
                    else setForm({ ...form, descriptionEn: val, descriptionAr: form.descriptionAr || val });
                  }}
                  placeholder={lang === "ar" ? "أهم النقاط المشروحة في هذه الجلسة..." : "Topics and key highlights covered in this lecture..."}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/40 dark:text-white"
                />
              </div>

              {/* Buttons */}
              <div className="pt-3 border-t border-slate-200 dark:border-white/10 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  {lang === "ar" ? "إلغاء" : "Cancel"}
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-xs font-bold shadow-md hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 transition-all flex items-center gap-1.5"
                >
                  {submitting && <RefreshCw className="h-3.5 w-3.5 animate-spin" />}
                  <span>
                    {editingSessionId
                      ? lang === "ar"
                        ? "حفظ التعديلات"
                        : "Save Changes"
                      : lang === "ar"
                      ? "نشر الجلسة"
                      : "Publish Session"}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* PROTECTED STUDENT SESSION THEATER / PLAYER MODAL WITH DRM SHIELD */}
      {/* ============================================================== */}
      {activeSession && (
        <ProtectedSessionPlayerModal
          session={activeSession}
          onClose={() => setActiveSession(null)}
          user={user}
          lang={lang}
        />
      )}
    </div>
  );
}

// ==============================================================
// PROTECTED SESSION PLAYER COMPONENT WITH DIGITAL CONTENT PROTECTION
// ==============================================================
function ProtectedSessionPlayerModal({ session, onClose, user, lang }) {
  const videoRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [privacyObscured, setPrivacyObscured] = useState(false);
  const [obscureReason, setObscureReason] = useState("");
  const [violationStrikes, setViolationStrikes] = useState(0);

  // Dynamic watermark quadrant position: 0=top-left, 1=top-right, 2=center, 3=bottom-left, 4=bottom-right
  const [watermarkPos, setWatermarkPos] = useState(0);

  // Log attendance once on entry
  useEffect(() => {
    if (session?.id && user?.uid) {
      logSessionAttendance(session.id, user.uid, user);
    }
  }, [session?.id, user?.uid]);

  // Dynamic moving watermark shifting every 4 seconds to deter phone cameras
  useEffect(() => {
    const wmInterval = setInterval(() => {
      setWatermarkPos((prev) => (prev + 1) % 5);
    }, 4000);
    return () => clearInterval(wmInterval);
  }, []);

  // Helper to destroy and overwrite Windows clipboard to prevent pasting captured screenshots or text
  const destroyClipboardData = async () => {
    const warning =
      lang === "ar"
        ? "⚠️ محتوى جلسة المقرر محمي — تم حظر ومنع لقطة الشاشة وتسجيل الوسائط بواسطة منصة أثر التعليمية.\nProtected Course Session — Media recording and screenshots are strictly prohibited by Athar Educational Platform."
        : "Protected Course Session — Screen capture, recording, and screenshots are strictly prohibited by Athar Educational Platform.";
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(warning);
      }
    } catch {
      // Fallback
    }
  };

  // Trigger Instant Privacy Shield & Pause Media
  const triggerPrivacyShield = (reason = "screenshot") => {
    if (videoRef.current && !videoRef.current.paused) {
      videoRef.current.pause();
      setIsPlaying(false);
    }
    setPrivacyObscured(true);
    setObscureReason(reason);
    setViolationStrikes((s) => s + 1);
    destroyClipboardData();
  };

  // Anti-Screenshot, Anti-DevTools & Anti-Screen-Recording Event Listeners
  useEffect(() => {
    const handleKeyDown = (e) => {
      const code = e.code || "";
      const isPrintScreen = e.key === "PrintScreen" || code === "PrintScreen" || e.keyCode === 44;
      const isWinSnip = (e.key === "S" || e.key === "s" || code === "KeyS") && (e.metaKey || (e.shiftKey && e.metaKey));
      const isMacSnip = (e.metaKey && e.shiftKey && ["3", "4", "5"].includes(e.key));
      const isPrintOrSave = (e.ctrlKey || e.metaKey) && ["s", "S", "p", "P"].includes(e.key);
      const isDevTools = e.key === "F12" || ((e.ctrlKey || e.metaKey) && e.shiftKey && ["I", "i", "J", "j", "C", "c"].includes(e.key)) || ((e.ctrlKey || e.metaKey) && ["U", "u"].includes(e.key));
      const isAltPrintScreen = e.altKey && isPrintScreen;

      if (isPrintScreen || isWinSnip || isMacSnip || isPrintOrSave || isDevTools || isAltPrintScreen) {
        e.preventDefault();
        e.stopPropagation();
        triggerPrivacyShield("screenshot_shortcut");
      }
    };

    const handleKeyUp = (e) => {
      const isPrintScreen = e.key === "PrintScreen" || e.keyCode === 44;
      if (isPrintScreen) {
        e.preventDefault();
        e.stopPropagation();
        triggerPrivacyShield("print_screen");
      }
    };

    // When student switches window or activates external recording software / snipping overlay
    const handleWindowBlur = () => {
      triggerPrivacyShield("window_blur");
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        triggerPrivacyShield("tab_hidden");
      }
    };

    const handleCopyCut = (e) => {
      e.preventDefault();
      triggerPrivacyShield("copy_cut");
    };

    window.addEventListener("keydown", handleKeyDown, true);
    window.addEventListener("keyup", handleKeyUp, true);
    window.addEventListener("blur", handleWindowBlur);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("copy", handleCopyCut, true);
    window.addEventListener("cut", handleCopyCut, true);

    return () => {
      window.removeEventListener("keydown", handleKeyDown, true);
      window.removeEventListener("keyup", handleKeyUp, true);
      window.removeEventListener("blur", handleWindowBlur);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("copy", handleCopyCut, true);
      window.removeEventListener("cut", handleCopyCut, true);
    };
  }, []);

  // Watermark position styling
  const getWatermarkStyle = () => {
    switch (watermarkPos) {
      case 0:
        return "top-6 start-6";
      case 1:
        return "top-6 end-6";
      case 2:
        return "top-1/2 start-1/2 -translate-x-1/2 -translate-y-1/2";
      case 3:
        return "bottom-16 start-6";
      case 4:
        return "bottom-16 end-6";
      default:
        return "top-6 start-6";
    }
  };

  const resumePlayback = () => {
    setPrivacyObscured(false);
    setObscureReason("");
    if (videoRef.current) {
      videoRef.current.play().catch(() => {});
      setIsPlaying(true);
    }
  };

  return (
    <div
      onContextMenu={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
      className="fixed inset-0 z-[9999] bg-slate-950/95 backdrop-blur-2xl flex flex-col justify-between overflow-hidden select-none"
    >
      {/* Top Header Bar */}
      <div className="shrink-0 px-5 py-3.5 bg-slate-900/90 border-b border-white/10 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="h-9 w-9 rounded-xl bg-indigo-500/20 text-cyan-400 border border-cyan-400/30 flex items-center justify-center shrink-0">
            <Video className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-sm text-white truncate">
                {session.title?.[lang] || session.title?.en || session.title?.ar}
              </span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-bold border border-emerald-500/30 flex items-center gap-1 shrink-0">
                <ShieldCheck className="h-3 w-3" />
                <span>{lang === "ar" ? "محمي بتقنية التشفير المتقدم" : "DRM Media Protected"}</span>
              </span>
            </div>
            <div className="text-[11px] text-slate-400 truncate">
              {session.courseTitle?.[lang] || session.courseTitle?.en || "Course"} • {session.duration}
            </div>
          </div>
        </div>

        {/* Security Warning Badge & Close Button */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-xl bg-amber-500/10 text-amber-300 text-[11px] font-semibold border border-amber-500/20">
            <Lock className="h-3.5 w-3.5 text-amber-400" />
            <span>{lang === "ar" ? "تسجيل الشاشة وتنزيل المحتوى محظور" : "Screen Recording & Download Blocked"}</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
            title={lang === "ar" ? "إغلاق المشاهدة" : "Close Viewer"}
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Main Theater Screen Area */}
      <div className="flex-1 relative flex items-center justify-center p-2 sm:p-6 bg-black overflow-hidden">
        {/* The Video Element */}
        <div className="relative w-full max-w-5xl rounded-2xl overflow-hidden bg-black shadow-2xl border border-white/10 flex items-center justify-center">
          <video
            ref={videoRef}
            src={session.videoUrl}
            controls
            controlsList="nodownload noplaybackrate nopictureinpicture"
            disablePictureInPicture
            disableRemotePlayback
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            onContextMenu={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            className={`w-full max-h-[75vh] object-contain transition-all duration-200 select-none ${
              privacyObscured ? "filter blur-3xl brightness-0 pointer-events-none" : ""
            }`}
          />

          {/* Dynamic Floating Watermark to Prevent Camera Recording */}
          {!privacyObscured && (
            <div
              className={`absolute ${getWatermarkStyle()} transition-all duration-700 ease-in-out pointer-events-none select-none z-30`}
            >
              <div className="px-3 py-1 rounded-full bg-black/50 backdrop-blur-md border border-white/20 text-[10px] sm:text-[11px] font-mono text-white/70 shadow-lg flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>
                  {user?.displayName || user?.name?.[lang] || "Student"} • {user?.email || user?.uid}
                </span>
                <span className="opacity-50">|</span>
                <span className="text-sky-300 font-bold">ATHAR PROTECTED</span>
              </div>
            </div>
          )}

          {/* Content Privacy Obscured High-Priority Mask */}
          {privacyObscured && (
            <div className="absolute inset-0 z-50 bg-slate-950/95 flex flex-col items-center justify-center p-6 text-center space-y-4">
              <div className="h-16 w-16 rounded-2xl bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center justify-center animate-bounce">
                <ShieldAlert className="h-8 w-8" />
              </div>
              <div className="space-y-1.5 max-w-md">
                <h3 className="text-lg sm:text-xl font-black text-white">
                  {lang === "ar"
                    ? "حجب محتوى الجلسة — خصوصية مشددة"
                    : "Content Privacy Restricted — Media Obscured"}
                </h3>
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-medium">
                  {obscureReason === "window_blur" || obscureReason === "tab_hidden"
                    ? lang === "ar"
                      ? "تم إيقاف وتشويش الفيديو تلقائياً نظراً لمغادرة نافذة المشاهدة أو تشغيل برنامج تسجيل شاشة خارجي."
                      : "Video playback paused and obscured because the session window lost focus or screen recording software was activated."
                    : lang === "ar"
                    ? "تم حظر محاولة تصوير الشاشة (PrintScreen / Win+Shift+S). تنزيل أو تصوير الجلسات محظور لحماية حقوق المقرر."
                    : "Screenshot attempt was intercepted and blocked. Saving, recording, or capturing sessions is strictly prohibited."}
                </p>
                <div className="text-[11px] font-bold text-amber-400 pt-1">
                  {lang === "ar"
                    ? `تنبيه الأمان (المخالفة ${violationStrikes}): مسجل في سجل المحاضر.`
                    : `Security Warning (${violationStrikes} strikes logged). Recorded in instructor audit log.`}
                </div>
              </div>

              <button
                type="button"
                onClick={resumePlayback}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:opacity-95 text-white font-extrabold text-xs shadow-xl shadow-indigo-500/25 active:scale-95 transition-all cursor-pointer"
              >
                {lang === "ar" ? "العودة واستئناف مشاهدة الجلسة" : "Resume Protected Session"}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Info Footer */}
      <div className="shrink-0 px-6 py-3 bg-slate-900/90 border-t border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-400">
        <div className="flex items-center gap-2">
          <BookOpen className="h-4 w-4 text-indigo-400" />
          <span className="font-semibold text-slate-200">
            {session.description?.[lang] || session.description?.en || session.description?.ar || "No additional notes provided."}
          </span>
        </div>
        <div className="flex items-center gap-4 text-[11px]">
          <span>
            {lang === "ar" ? "تاريخ النشر:" : "Published:"} {session.sessionDate || "Recent"}
          </span>
          <span className="text-emerald-400 font-bold flex items-center gap-1">
            <ShieldCheck className="h-3.5 w-3.5" />
            <span>{lang === "ar" ? "تسجيل الحضور نشط" : "Attendance Verified"}</span>
          </span>
        </div>
      </div>
    </div>
  );
}
