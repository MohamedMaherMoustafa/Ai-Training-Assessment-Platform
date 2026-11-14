import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";
import {
  CheckCircle2,
  Circle,
  Edit3,
  Power,
  UserCheck,
  UserX,
  Clock,
  Search,
  Users,
  ShieldCheck,
  ShieldAlert,
} from "lucide-react";
import {
  approveStudentRequest,
  listUsers,
  rejectStudentRequest,
  updateUserRecord,
} from "../../services/platformService";
import { useLang } from "../../context/LangContext";

export default function StudentsModule({ filterInstructorId = null }) {
  const { t } = useTranslation();
  const { lang } = useLang();

  const [students, setStudents] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [instructors, setInstructors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingStudent, setEditingStudent] = useState(null);
  const [selectedInstructorIds, setSelectedInstructorIds] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all"); // 'all' | 'active' | 'inactive'

  const loadAll = async () => {
    setLoading(true);
    try {
      const users = await listUsers();
      const instList = users.filter((u) => u.role === "instructor");
      const allStudents = users.filter((u) => u.role === "student");

      if (filterInstructorId) {
        setPendingRequests(
          allStudents.filter(
            (s) => s.instructorRequests?.[filterInstructorId] === "pending"
          )
        );
        setStudents(
          allStudents.filter(
            (s) => Array.isArray(s.instructorIds) && s.instructorIds.includes(filterInstructorId)
          )
        );
      } else {
        setPendingRequests([]);
        setStudents(allStudents);
      }
      setInstructors(instList);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, [filterInstructorId]);

  const handleApprove = async (studentUid) => {
    await approveStudentRequest(studentUid, filterInstructorId);
    toast.success(lang === "ar" ? "تم قبول الطالب بنجاح!" : "Student request accepted!");
    await loadAll();
  };

  const handleReject = async (studentUid) => {
    await rejectStudentRequest(studentUid, filterInstructorId);
    toast.success(lang === "ar" ? "تم رفض الطلب" : "Student request declined");
    await loadAll();
  };

  const startEdit = (student) => {
    setEditingStudent(student);
    setSelectedInstructorIds(student.instructorIds || []);
  };

  const toggleInst = (uid) => {
    setSelectedInstructorIds((prev) =>
      prev.includes(uid) ? prev.filter((id) => id !== uid) : [...prev, uid]
    );
  };

  const saveInstructors = async () => {
    if (!editingStudent) return;
    await updateUserRecord(editingStudent.uid, { instructorIds: selectedInstructorIds });
    toast.success("Updated student instructors");
    setEditingStudent(null);
    await loadAll();
  };

  const toggleActive = async (student) => {
    const nextActive = student.active === false;
    await updateUserRecord(student.uid, { active: nextActive });
    const studentName = student.displayName || student.username || student.email;
    if (lang === "ar") {
      toast.success(
        nextActive
          ? `تم تفعيل حساب الطالب (${studentName}) بنجاح`
          : `تم تعطيل حساب الطالب (${studentName})`
      );
    } else {
      toast.success(
        nextActive
          ? `Activated account for ${studentName}`
          : `Deactivated account for ${studentName}`
      );
    }
    await loadAll();
  };

  const filteredStudents = useMemo(() => {
    return students.filter((st) => {
      const active = st.active !== false;
      if (statusFilter === "active" && !active) return false;
      if (statusFilter === "inactive" && active) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = (st.displayName || "").toLowerCase().includes(q);
        const matchEmail = (st.email || "").toLowerCase().includes(q);
        const matchUser = (st.username || "").toLowerCase().includes(q);
        return matchName || matchEmail || matchUser;
      }
      return true;
    });
  }, [students, statusFilter, searchQuery]);

  const activeCount = useMemo(() => students.filter((s) => s.active !== false).length, [students]);
  const inactiveCount = useMemo(() => students.filter((s) => s.active === false).length, [students]);

  const getInstructorName = (uid) => {
    const found = instructors.find((i) => i.uid === uid);
    return found ? found.name?.[lang] || found.displayName || found.email : uid;
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="glass-panel rounded-[26px] p-5 flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-cyan-500 via-teal-500 to-emerald-600 text-white flex items-center justify-center shadow-lg shadow-teal-500/25">
            <UserCheck className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl font-black">
              {filterInstructorId ? t("nav.myStudents") : t("admin.manageStudents")}
            </h1>
            <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
              {filterInstructorId
                ? lang === "ar"
                  ? "إدارة تفعيل وتعطيل حسابات طلابك وقبول طلبات التسجيل الجديدة."
                  : "Manage active/inactive account status for your students and approve pending requests."
                : t("admin.manageStudentsSubtitle")}
            </p>
          </div>
        </div>

        {/* Quick Stats Pill Counters for Instructor */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-white/80 dark:bg-slate-900/80 border border-slate-200/80 dark:border-white/10 shadow-sm text-xs font-bold text-slate-700 dark:text-slate-200">
            <Users className="h-3.5 w-3.5 text-indigo-500" />
            <span>
              {lang === "ar" ? "الإجمالي:" : "Total:"} {students.length}
            </span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-emerald-50/90 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs font-bold text-emerald-700 dark:text-emerald-300 shadow-sm">
            <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
            <span>
              {lang === "ar" ? "نشط:" : "Active:"} {activeCount}
            </span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-rose-50/90 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs font-bold text-rose-700 dark:text-rose-300 shadow-sm">
            <span className="h-2 w-2 rounded-full bg-rose-500"></span>
            <span>
              {lang === "ar" ? "معطل:" : "Inactive:"} {inactiveCount}
            </span>
          </div>
        </div>
      </div>

      {/* Pending Requests Section for Instructors */}
      {filterInstructorId && (
        <div className="glass-card border-amber-400/50 dark:border-amber-500/30 overflow-hidden shadow-sm">
          <div className="px-5 py-3.5 bg-amber-500/15 border-b border-amber-400/30 flex items-center justify-between">
            <div className="flex items-center gap-2 font-bold text-sm text-amber-900 dark:text-amber-200">
              <Clock className="h-4 w-4" />
              {lang === "ar"
                ? `طلبات التسجيل المعلقة (${pendingRequests.length})`
                : `Pending Student Requests (${pendingRequests.length})`}
            </div>
          </div>
          {pendingRequests.length === 0 ? (
            <div className="p-5 text-xs text-slate-500 text-center">
              {lang === "ar"
                ? "لا توجد طلبات معلقة حالياً."
                : "No pending registration requests right now."}
            </div>
          ) : (
            <div className="divide-y divide-slate-200 dark:divide-slate-800">
              {pendingRequests.map((req) => (
                <div
                  key={req.uid}
                  className="px-5 py-3.5 flex flex-wrap items-center justify-between gap-3"
                >
                  <div>
                    <div className="font-bold text-sm">{req.displayName}</div>
                    <div className="text-xs text-slate-500">
                      @{req.username} · {req.email}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleApprove(req.uid)}
                      className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-all"
                    >
                      <UserCheck className="h-3.5 w-3.5" />
                      {lang === "ar" ? "قبول" : "Accept"}
                    </button>
                    <button
                      onClick={() => handleReject(req.uid)}
                      className="px-3.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-all"
                    >
                      <UserX className="h-3.5 w-3.5" />
                      {lang === "ar" ? "رفض" : "Decline"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {editingStudent && (
        <div className="bg-white dark:bg-slate-900 border border-sky-300 dark:border-sky-800 rounded-2xl p-5 shadow-sm space-y-3">
          <div className="font-bold text-sm">
            {t("admin.assignInstructors")}: {editingStudent.displayName}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
            {instructors.map((inst) => {
              const selected = selectedInstructorIds.includes(inst.uid);
              return (
                <button
                  key={inst.uid}
                  type="button"
                  onClick={() => toggleInst(inst.uid)}
                  className={`p-2.5 rounded-xl border text-start flex items-center gap-2 text-xs font-semibold transition-all ${
                    selected
                      ? "bg-sky-50 dark:bg-sky-950/50 border-sky-500 text-sky-700 dark:text-sky-300"
                      : "bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                  }`}
                >
                  {selected ? (
                    <CheckCircle2 className="h-4 w-4 text-sky-600 shrink-0" />
                  ) : (
                    <Circle className="h-4 w-4 text-slate-400 shrink-0" />
                  )}
                  <span className="truncate">{inst.name?.[lang] || inst.displayName}</span>
                </button>
              );
            })}
          </div>
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setEditingStudent(null)}
              className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-semibold"
            >
              {t("app.cancel")}
            </button>
            <button
              onClick={saveInstructors}
              className="px-4 py-1.5 rounded-lg bg-sky-600 text-white text-xs font-semibold"
            >
              {t("app.save")}
            </button>
          </div>
        </div>
      )}

      {/* Main Students List with Search & Status Filter */}
      <div className="glass-card overflow-hidden shadow-sm">
        {/* Search & Filter Toolbar */}
        <div className="p-4 border-b border-slate-200/80 dark:border-white/10 flex flex-wrap items-center justify-between gap-3 bg-slate-50/50 dark:bg-white/[0.02]">
          {/* Search Box */}
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={
                lang === "ar"
                  ? "البحث بالاسم أو اسم المستخدم أو البريد..."
                  : "Search students by name, username, or email..."
              }
              className="w-full ps-9 pe-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 select-none">
            <button
              type="button"
              onClick={() => setStatusFilter("all")}
              className={`px-3 py-1 rounded-xl text-xs font-bold transition-all ${
                statusFilter === "all"
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100"
              }`}
            >
              {lang === "ar" ? "الكل" : "All"} ({students.length})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("active")}
              className={`px-3 py-1 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                statusFilter === "active"
                  ? "bg-emerald-600 text-white shadow-sm"
                  : "bg-white dark:bg-slate-800 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-50"
              }`}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-current"></span>
              {lang === "ar" ? "نشط" : "Active"} ({activeCount})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("inactive")}
              className={`px-3 py-1 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                statusFilter === "inactive"
                  ? "bg-rose-600 text-white shadow-sm"
                  : "bg-white dark:bg-slate-800 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800 hover:bg-rose-50"
              }`}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-current"></span>
              {lang === "ar" ? "معطل" : "Inactive"} ({inactiveCount})
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-start">
            <thead className="bg-slate-900/5 dark:bg-white/5 text-xs uppercase text-slate-600 dark:text-slate-300">
              <tr>
                <th className="px-4 py-3 text-start">{t("auth.fullName")}</th>
                <th className="px-4 py-3 text-start">{t("auth.username")} / {t("auth.email")}</th>
                <th className="px-4 py-3 text-start">{t("app.status")}</th>
                <th className="px-4 py-3 text-end">{t("app.actions")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-slate-500">
                    {t("app.loading")}
                  </td>
                </tr>
              ) : filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-slate-500">
                    {searchQuery.trim() || statusFilter !== "all"
                      ? lang === "ar"
                        ? "لا توجد نتائج مطابقة لفلتر البحث."
                        : "No students matching your search criteria."
                      : t("app.noData")}
                  </td>
                </tr>
              ) : (
                filteredStudents.map((st) => {
                  const active = st.active !== false;
                  return (
                    <tr key={st.uid} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="px-4 py-3 font-semibold text-slate-900 dark:text-white">
                        {st.displayName}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500 dark:text-slate-400">
                        @{st.username} · {st.email}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border transition-colors ${
                            active
                              ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800"
                              : "bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border-rose-200 dark:border-rose-800"
                          }`}
                        >
                          <span
                            className={`h-2 w-2 rounded-full ${
                              active ? "bg-emerald-500 animate-pulse" : "bg-rose-500"
                            }`}
                          />
                          {active ? t("app.active") : (lang === "ar" ? "معطل" : t("app.inactive"))}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-end">
                        <div className="inline-flex items-center gap-1.5">
                          {!filterInstructorId && (
                            <button
                              onClick={() => startEdit(st)}
                              title={t("admin.assignInstructors")}
                              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-sky-600 transition-colors"
                            >
                              <Edit3 className="h-4 w-4" />
                            </button>
                          )}
                          <button
                            onClick={() => toggleActive(st)}
                            title={
                              active
                                ? lang === "ar"
                                  ? "تعطيل حساب الطالب"
                                  : "Deactivate student account"
                                : lang === "ar"
                                  ? "تفعيل حساب الطالب"
                                  : "Activate student account"
                            }
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all inline-flex items-center gap-1.5 shadow-sm active:scale-95 ${
                              active
                                ? "border-amber-300/80 bg-amber-50 hover:bg-amber-100 text-amber-800 dark:border-amber-700/60 dark:bg-amber-950/40 dark:text-amber-300"
                                : "border-emerald-300/80 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 dark:border-emerald-700/60 dark:bg-emerald-950/40 dark:text-emerald-300"
                            }`}
                          >
                            <Power className="h-3.5 w-3.5" />
                            <span>
                              {active
                                ? lang === "ar"
                                  ? "تعطيل"
                                  : "Deactivate"
                                : lang === "ar"
                                  ? "تفعيل"
                                  : "Activate"}
                            </span>
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
