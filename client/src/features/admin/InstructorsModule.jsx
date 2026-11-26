import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";
import { UserPlus, Trash2, Power, Search, BookOpen, Users, Edit3 } from "lucide-react";
import {
  createInstructorAccount,
  deleteUserRecord,
  listCourses,
  listUsers,
  updateUserRecord,
} from "../../services/platformService";
import { useLang } from "../../context/LangContext";
import { validateUsername } from "../../utils/validators";

const INITIAL_FORM = {
  nameEn: "",
  nameAr: "",
  username: "",
  email: "",
  password: "",
  specEn: "",
  specAr: "",
};

export default function InstructorsModule() {
  const { t } = useTranslation();
  const { lang } = useLang();

  const [instructors, setInstructors] = useState([]);
  const [students, setStudents] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingUid, setEditingUid] = useState(null);
  const [form, setForm] = useState(INITIAL_FORM);
  const [saving, setSaving] = useState(false);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [allUsers, allCourses] = await Promise.all([listUsers(), listCourses()]);
      setInstructors(allUsers.filter((u) => u.role === "instructor"));
      setStudents(allUsers.filter((u) => u.role === "student"));
      setCourses(allCourses);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!editingUid) {
      const uCheck = validateUsername(form.username, lang);
      if (!uCheck.isValid) {
        toast.error(uCheck.error);
        return;
      }
    }
    setSaving(true);
    try {
      if (editingUid) {
        await updateUserRecord(editingUid, {
          displayName: form.nameEn || form.nameAr,
          name: { en: form.nameEn, ar: form.nameAr || form.nameEn },
          specialization: {
            en: form.specEn || "Technical Instructor",
            ar: form.specAr || form.specEn || "محاضر تقني",
          },
        });
        toast.success("Instructor updated!");
      } else {
        await createInstructorAccount(form);
        toast.success(t("admin.instructorCreated"));
      }
      setForm(INITIAL_FORM);
      setEditingUid(null);
      setShowForm(false);
      await loadAll();
    } catch (err) {
      console.error(err);
      const code = err?.code || "";
      if (code === "auth/email-already-in-use") {
        toast.error("This email/username is already registered.");
      } else if (code === "auth/weak-password") {
        toast.error("Password must be at least 6 characters.");
      } else {
        toast.error(err.message || "Failed to save instructor");
      }
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (inst) => {
    setEditingUid(inst.uid);
    setForm({
      nameEn: inst.name?.en || inst.displayName || "",
      nameAr: inst.name?.ar || "",
      username: inst.username || "",
      email: inst.email || "",
      password: "",
      specEn: inst.specialization?.en || "",
      specAr: inst.specialization?.ar || "",
    });
    setShowForm(true);
  };

  const toggleActive = async (inst) => {
    await updateUserRecord(inst.uid, { active: inst.active === false });
    toast.success("Updated status");
    await loadAll();
  };

  const handleDelete = async (inst) => {
    await deleteUserRecord(inst.uid, inst.username, inst.email);
    toast.success("Removed instructor record");
    await loadAll();
  };

  const filtered = instructors.filter((i) => {
    const q = search.toLowerCase();
    return (
      (i.name?.en || "").toLowerCase().includes(q) ||
      (i.name?.ar || "").toLowerCase().includes(q) ||
      (i.email || "").toLowerCase().includes(q) ||
      (i.username || "").toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      <div className="glass-panel rounded-[26px] p-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-sky-500 via-teal-500 to-emerald-500 text-white flex items-center justify-center shadow-lg shadow-teal-500/25">
            <UserPlus className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl font-black">{t("admin.manageInstructors")}</h1>
            <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
              Add multiple instructors; students can select one or more instructors during registration.
            </p>
          </div>
        </div>
        <button
          onClick={() => {
            setEditingUid(null);
            setForm(INITIAL_FORM);
            setShowForm((s) => !s);
          }}
          className="glass-btn-primary flex items-center gap-2 px-4 py-2 rounded-xl text-sm"
        >
          <UserPlus className="h-4 w-4" />
          {t("admin.addInstructor")}
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={handleSubmit}
          autoComplete="off"
          className="glass-form-card p-6 sm:p-7 space-y-6"
        >
          <div className="flex items-center gap-3 pb-3 border-b border-slate-200/60 dark:border-white/10">
            <div className="h-10 w-10 rounded-2xl bg-gradient-to-tr from-sky-500 to-emerald-500 text-white flex items-center justify-center shadow-md shadow-teal-500/25">
              {editingUid ? <Edit3 className="h-5 w-5" /> : <UserPlus className="h-5 w-5" />}
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                {editingUid ? t("admin.editInstructor") : t("admin.addInstructor")}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {editingUid
                  ? "Update instructor details and specialization"
                  : "Create instructor credentials & profile for the platform"}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
            <div>
              <label className="glass-form-label">{t("admin.nameEn")}</label>
              <input
                required
                value={form.nameEn}
                onChange={(e) => setForm({ ...form, nameEn: e.target.value })}
                placeholder="Dr. Ahmed Hassan"
                className="w-full px-3.5 py-2.5 glass-input text-sm"
              />
            </div>
            <div>
              <label className="glass-form-label">{t("admin.nameAr")}</label>
              <input
                value={form.nameAr}
                onChange={(e) => setForm({ ...form, nameAr: e.target.value })}
                placeholder="د. أحمد حسن"
                className="w-full px-3.5 py-2.5 glass-input text-sm"
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="glass-form-label mb-0">
                  {t("auth.username")} <span className="text-rose-500">*</span>
                </label>
                {!editingUid && (
                  <span
                    className={`text-[10px] font-mono font-bold px-1.5 py-0.2 rounded ${
                      form.username.length >= 8 &&
                      /[@_]/.test(form.username) &&
                      !/[^a-zA-Z0-9@_]/.test(form.username)
                        ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                        : "bg-slate-200/60 dark:bg-slate-800 text-slate-500"
                    }`}
                  >
                    {form.username.length >= 8 ? `${form.username.length} chars` : `${form.username.length}/8 min`}
                  </span>
                )}
              </div>
              <input
                required
                disabled={Boolean(editingUid)}
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value.replace(/[^a-zA-Z0-9@_]/g, "") })}
                placeholder="e.g. teacher_01 or teacher@1"
                className="w-full px-3.5 py-2.5 glass-input text-sm disabled:opacity-60 font-mono tracking-wide"
              />
              {!editingUid && (
                <p className="text-[11px] text-slate-400 mt-1">
                  {lang === "ar"
                    ? "8 أحرف على الأقل، ويجب أن يحتوي على رمز (@ أو _) فقط دون مسافات."
                    : "Min 8 chars, must include special character (@ or _) only, no spaces."}
                </p>
              )}
            </div>
            <div>
              <label className="glass-form-label">{t("auth.email")}</label>
              <input
                type="text"
                required
                disabled={Boolean(editingUid)}
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="teacher1@academy.com or teacher@123"
                className="w-full px-3.5 py-2.5 glass-input text-sm disabled:opacity-60"
              />
            </div>
            {!editingUid && (
              <div className="md:col-span-2">
                <label className="glass-form-label">{t("auth.password")}</label>
                <input
                  type="password"
                  name="inst_new_password"
                  autoComplete="new-password"
                  required
                  minLength={6}
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  placeholder="Min 6 characters"
                  className="w-full px-3.5 py-2.5 glass-input text-sm"
                />
              </div>
            )}
            <div>
              <label className="glass-form-label">{t("admin.specEn")}</label>
              <input
                value={form.specEn}
                onChange={(e) => setForm({ ...form, specEn: e.target.value })}
                placeholder="AI & Software Engineering"
                className="w-full px-3.5 py-2.5 glass-input text-sm"
              />
            </div>
            <div>
              <label className="glass-form-label">{t("admin.specAr")}</label>
              <input
                value={form.specAr}
                onChange={(e) => setForm({ ...form, specAr: e.target.value })}
                placeholder="الذكاء الاصطناعي وهندسة البرمجيات"
                className="w-full px-3.5 py-2.5 glass-input text-sm"
              />
            </div>
          </div>

          <div className="flex items-center gap-2.5 justify-end pt-2 border-t border-slate-200/60 dark:border-white/10">
            <button
              type="button"
              onClick={() => {
                setShowForm(false);
                setEditingUid(null);
                setForm(INITIAL_FORM);
              }}
              className="glass-btn-secondary px-5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold cursor-pointer"
            >
              {t("app.cancel")}
            </button>
            <button
              type="submit"
              disabled={saving}
              className="glass-btn-primary px-6 py-2.5 rounded-xl text-xs sm:text-sm cursor-pointer disabled:opacity-60"
            >
              {saving ? t("app.loading") : editingUid ? t("app.save") : t("app.create")}
            </button>
          </div>
        </form>
      )}

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="h-4 w-4 text-slate-400 absolute top-3 start-3" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t("app.search")}
          className="w-full ps-9 pe-3 py-2 rounded-xl glass-input text-sm"
        />
      </div>

      {/* Table */}
      <div className="glass-panel rounded-[24px] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-start">
            <thead className="bg-slate-900/5 dark:bg-white/[0.04] border-b border-slate-200/70 dark:border-white/10 text-xs uppercase tracking-wider text-slate-600 dark:text-slate-300">
              <tr>
                <th className="px-4 py-3 text-start">{t("auth.fullName")}</th>
                <th className="px-4 py-3 text-start">{t("auth.username")} / {t("auth.email")}</th>
                <th className="px-4 py-3 text-start">{t("admin.specEn")}</th>
                <th className="px-4 py-3 text-start">{t("nav.students")} / {t("nav.courses")}</th>
                <th className="px-4 py-3 text-start">{t("app.status")}</th>
                <th className="px-4 py-3 text-end">{t("app.actions")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/70 dark:divide-white/10">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-500 dark:text-slate-400">
                    {t("app.loading")}
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-500 dark:text-slate-400">
                    {t("app.noData")}
                  </td>
                </tr>
              ) : (
                filtered.map((inst) => {
                  const linkedStudents = students.filter(
                    (s) => Array.isArray(s.instructorIds) && s.instructorIds.includes(inst.uid)
                  ).length;
                  const ownedCourses = courses.filter((c) => c.instructorId === inst.uid).length;
                  const active = inst.active !== false;
                  return (
                    <tr key={inst.uid} className="hover:bg-teal-500/5 transition-colors">
                      <td className="px-4 py-3 font-semibold text-slate-900 dark:text-white">
                        <div>{inst.name?.[lang] || inst.displayName}</div>
                        <div className="text-xs text-slate-400">
                          {lang === "ar" ? inst.name?.en : inst.name?.ar}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-mono text-xs font-semibold text-teal-700 dark:text-teal-300">{inst.username}</div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">{inst.email}</div>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-600 dark:text-slate-300">
                        {inst.specialization?.[lang] || "—"}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3 text-xs">
                          <span className="inline-flex items-center gap-1 text-slate-700 dark:text-slate-200">
                            <Users className="h-3.5 w-3.5 text-teal-500" />
                            {linkedStudents}
                          </span>
                          <span className="inline-flex items-center gap-1 text-slate-700 dark:text-slate-200">
                            <BookOpen className="h-3.5 w-3.5 text-emerald-500" />
                            {ownedCourses}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                            active
                              ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-400/30"
                              : "bg-slate-500/15 text-slate-600 dark:text-slate-300 border-slate-400/30"
                          }`}
                        >
                          {active ? t("app.active") : t("app.inactive")}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-end">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            onClick={() => startEdit(inst)}
                            title={t("app.edit")}
                            className="p-1.5 rounded-xl border border-slate-200/80 dark:border-white/10 bg-white/50 dark:bg-white/[0.04] hover:border-teal-400/50 hover:bg-teal-500/10 transition-colors cursor-pointer"
                          >
                            <Edit3 className="h-4 w-4 text-sky-500" />
                          </button>
                          <button
                            onClick={() => toggleActive(inst)}
                            title="Toggle active"
                            className="p-1.5 rounded-xl border border-slate-200/80 dark:border-white/10 bg-white/50 dark:bg-white/[0.04] hover:border-amber-400/50 hover:bg-amber-500/10 transition-colors cursor-pointer"
                          >
                            <Power className="h-4 w-4 text-amber-500" />
                          </button>
                          <button
                            onClick={() => handleDelete(inst)}
                            title={t("app.delete")}
                            className="p-1.5 rounded-xl border border-slate-200/80 dark:border-white/10 bg-white/50 dark:bg-white/[0.04] hover:border-rose-400/50 hover:bg-rose-500/10 transition-colors cursor-pointer"
                          >
                            <Trash2 className="h-4 w-4 text-rose-500" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

