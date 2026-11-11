import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";
import { CheckCircle2, Circle, Edit3, Power, UserCheck, UserX, Clock } from "lucide-react";
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
    await updateUserRecord(student.uid, { active: student.active === false });
    toast.success("Updated student status");
    await loadAll();
  };

  const getInstructorName = (uid) => {
    const found = instructors.find((i) => i.uid === uid);
    return found ? found.name?.[lang] || found.displayName || found.email : uid;
  };

  return (
    <div className="space-y-6">
      <div className="glass-panel rounded-[26px] p-5 flex items-center gap-3">
        <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-cyan-500 via-teal-500 to-emerald-600 text-white flex items-center justify-center shadow-lg shadow-teal-500/25">
          <UserCheck className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-xl font-black">
            {filterInstructorId ? t("nav.myStudents") : t("admin.manageStudents")}
          </h1>
          <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
            {filterInstructorId
              ? "Accept pending student registration requests before they can sign in, and view your approved students."
              : "View all students and the one or more instructors they chose."}
          </p>
        </div>
      </div>

      {/* Pending Requests Section for Instructors */}
      {filterInstructorId && (
        <div className="glass-card border-amber-400/50 dark:border-amber-500/30 overflow-hidden">
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
                      className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center gap-1.5"
                    >
                      <UserCheck className="h-3.5 w-3.5" />
                      {lang === "ar" ? "قبول" : "Accept"}
                    </button>
                    <button
                      onClick={() => handleReject(req.uid)}
                      className="px-3.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold flex items-center gap-1.5"
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
                  className={`p-2.5 rounded-xl border text-start flex items-center gap-2 text-xs font-semibold ${
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

      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-start">
            <thead className="bg-slate-900/5 dark:bg-white/5 text-xs uppercase text-slate-600 dark:text-slate-300">
              <tr>
                <th className="px-4 py-3 text-start">{t("auth.fullName")}</th>
                <th className="px-4 py-3 text-start">{t("auth.username")} / {t("auth.email")}</th>
                <th className="px-4 py-3 text-start">{t("admin.assignedInstructors")}</th>
                <th className="px-4 py-3 text-start">{t("app.status")}</th>
                {!filterInstructorId && (
                  <th className="px-4 py-3 text-end">{t("app.actions")}</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                    {t("app.loading")}
                  </td>
                </tr>
              ) : students.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                    {t("app.noData")}
                  </td>
                </tr>
              ) : (
                students.map((st) => {
                  const active = st.active !== false;
                  return (
                    <tr key={st.uid} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="px-4 py-3 font-semibold">{st.displayName}</td>
                      <td className="px-4 py-3 text-xs text-slate-500">
                        @{st.username} · {st.email}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1.5">
                          {(st.instructorIds || []).length === 0 ? (
                            <span className="text-xs text-slate-400">—</span>
                          ) : (
                            st.instructorIds.map((id) => (
                              <span
                                key={id}
                                className="px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800"
                              >
                                {getInstructorName(id)}
                              </span>
                            ))
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                            active
                              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
                              : "bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300"
                          }`}
                        >
                          {active ? t("app.active") : t("app.inactive")}
                        </span>
                      </td>
                      {!filterInstructorId && (
                        <td className="px-4 py-3 text-end">
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              onClick={() => startEdit(st)}
                              title={t("admin.assignInstructors")}
                              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
                            >
                              <Edit3 className="h-4 w-4 text-sky-600" />
                            </button>
                            <button
                              onClick={() => toggleActive(st)}
                              title="Toggle active"
                              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
                            >
                              <Power className="h-4 w-4 text-amber-600" />
                            </button>
                          </div>
                        </td>
                      )}
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
