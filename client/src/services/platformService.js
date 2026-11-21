import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  updateProfile,
  updatePassword,
} from "firebase/auth";
import { ref, get, set, update, remove, push, onValue } from "firebase/database";
import { auth, rtdb, getSecondaryAuth } from "../lib/firebase";
import { validateUsername } from "../utils/validators";

const normalizeKey = (value) => value.trim().toLowerCase().replace(/[^a-z0-9_@-]/g, "_");

const VALID_EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/**
 * Ensures Firebase Auth receives a syntactically valid email even if an Admin
 * enters a shorthand identifier like "teacher@123" or "ahmed1".
 */
function toFirebaseAuthEmail(rawInput) {
  const clean = rawInput.trim().toLowerCase();
  if (VALID_EMAIL_REGEX.test(clean)) {
    return clean;
  }
  const safeLocal = clean.replace(/[^a-z0-9._-]/g, "_") || "user";
  return `${safeLocal}@academy.local.com`;
}

/**
 * Login Gate:
 * 1) Admin login with admin@123 / admin@123
 * 2) Instructor or Student login via email or username + password against Firebase Auth + RTDB
 */
export async function loginWithCredentials(identifier, password) {
  const cleanId = identifier.trim();

  if (cleanId === "admin@123" || cleanId.toLowerCase() === "admin") {
    let adminSnap = null;
    try {
      adminSnap = await get(ref(rtdb, "admins/admin_123"));
    } catch (e) {
      console.warn("Admin fetch note:", e.message);
    }
    const adminData = adminSnap?.exists() ? adminSnap.val() : null;
    const storedPw =
      adminData?.password ||
      (typeof window !== "undefined" ? localStorage.getItem("admin_custom_pw") : null) ||
      "admin@123";

    if (password === storedPw || password === "admin@123") {
      const adminProfile = {
        uid: "admin_123",
        username: "admin@123",
        email: "admin@123",
        displayName: adminData?.displayName || "System Administrator",
        name: adminData?.name || { en: "System Administrator", ar: "مدير النظام" },
        role: "admin",
        active: true,
      };
      try {
        await update(ref(rtdb, "admins/admin_123"), {
          ...adminProfile,
          lastLoginAt: Date.now(),
        });
      } catch (e) {
        console.warn("Admin RTDB sync note:", e.message);
      }
      return adminProfile;
    }
    throw new Error("auth/wrong-password");
  }

  let emailToUse = cleanId.toLowerCase();
  const lookupKey = normalizeKey(cleanId);
  const unameSnap = await get(ref(rtdb, `usernames/${lookupKey}`));
  if (unameSnap.exists()) {
    const entry = unameSnap.val();
    emailToUse = entry.authEmail || entry.email;
  } else if (!VALID_EMAIL_REGEX.test(emailToUse)) {
    emailToUse = toFirebaseAuthEmail(emailToUse);
  }

  const cred = await signInWithEmailAndPassword(auth, emailToUse, password);
  const userSnap = await get(ref(rtdb, `users/${cred.user.uid}`));
  if (!userSnap.exists()) {
    throw new Error("USER_PROFILE_MISSING");
  }
  const profile = userSnap.val();
  if (profile.active === false) {
    await firebaseSignOut(auth);
    throw new Error("ACCOUNT_DISABLED");
  }
  if (profile.role === "student") {
    if (profile.approvalStatus === "pending") {
      await firebaseSignOut(auth);
      throw new Error("PENDING_INSTRUCTOR_APPROVAL");
    }
    if (profile.approvalStatus === "rejected") {
      await firebaseSignOut(auth);
      throw new Error("REQUEST_REJECTED");
    }
  }
  return { uid: cred.user.uid, ...profile };
}

export async function logoutAll() {
  localStorage.removeItem("admin_session");
  if (auth.currentUser) {
    await firebaseSignOut(auth);
  }
}

/**
 * Admin creates an Instructor (Teacher) without signing out the Admin session.
 */
export async function createInstructorAccount({
  nameEn,
  nameAr,
  username,
  email,
  password,
  specEn,
  specAr,
}) {
  const usernameCheck = validateUsername(username, "en");
  if (!usernameCheck.isValid) {
    throw new Error(usernameCheck.error);
  }

  const displayEmail = email.trim().toLowerCase();
  const authEmail = toFirebaseAuthEmail(displayEmail);
  const cleanUsername = normalizeKey(username || displayEmail.split("@")[0]);

  const secondaryAuth = getSecondaryAuth();
  const cred = await createUserWithEmailAndPassword(secondaryAuth, authEmail, password);
  const uid = cred.user.uid;
  await firebaseSignOut(secondaryAuth);

  const instructorDoc = {
    uid,
    role: "instructor",
    username: cleanUsername,
    email: displayEmail,
    authEmail,
    displayName: nameEn || nameAr,
    name: { en: nameEn, ar: nameAr || nameEn },
    specialization: { en: specEn || "Technical Instructor", ar: specAr || specEn || "محاضر تقني" },
    active: true,
    createdAt: Date.now(),
  };

  await set(ref(rtdb, `users/${uid}`), instructorDoc);
  await set(ref(rtdb, `usernames/${cleanUsername}`), { uid, email: displayEmail, authEmail, role: "instructor" });
  await set(ref(rtdb, `usernames/${normalizeKey(displayEmail)}`), { uid, email: displayEmail, authEmail, role: "instructor" });

  await pushNotification("admin_123", {
    titleEn: "New Instructor Added",
    titleAr: "تمت إضافة محاضر جديد",
    bodyEn: `${nameEn} (@${cleanUsername}) is ready to create courses and quizzes.`,
    bodyAr: `المحاضر ${nameAr || nameEn} جاهز الآن لإنشاء المقررات والاختبارات.`,
    type: "success",
    link: "/admin/instructors",
  });

  return instructorDoc;
}

/**
 * Student Registration with single or multi-instructor selection.
 * Account stays pending until at least one selected instructor approves the request.
 */
export async function registerStudentAccount({
  fullName,
  username,
  email,
  password,
  phoneNumber = "",
  instructorIds,
  lang = "en",
  theme = "light",
}) {
  const usernameCheck = validateUsername(username, lang);
  if (!usernameCheck.isValid) {
    throw new Error(usernameCheck.error);
  }

  const displayEmail = email.trim().toLowerCase();
  const authEmail = toFirebaseAuthEmail(displayEmail);
  const cleanUsername = normalizeKey(username || displayEmail.split("@")[0]);
  const cleanPhone = String(phoneNumber || "").replace(/\D/g, "").slice(0, 11);
  const requested = Array.isArray(instructorIds) ? instructorIds : [];
  const instructorRequests = requested.reduce((acc, id) => {
    acc[id] = "pending";
    return acc;
  }, {});

  const cred = await createUserWithEmailAndPassword(auth, authEmail, password);
  const uid = cred.user.uid;

  const studentDoc = {
    uid,
    role: "student",
    username: cleanUsername,
    email: displayEmail,
    authEmail,
    phoneNumber: cleanPhone,
    phone: cleanPhone,
    displayName: fullName,
    name: { en: fullName, ar: fullName },
    instructorIds: [],
    requestedInstructorIds: requested,
    instructorRequests,
    approvalStatus: "pending",
    enrolledCourseIds: [],
    lang,
    theme,
    active: true,
    createdAt: Date.now(),
  };

  await set(ref(rtdb, `users/${uid}`), studentDoc);
  await set(ref(rtdb, `usernames/${cleanUsername}`), { uid, email: displayEmail, authEmail, role: "student" });
  await set(ref(rtdb, `usernames/${normalizeKey(displayEmail)}`), { uid, email: displayEmail, authEmail, role: "student" });
  await firebaseSignOut(auth);

  // Notify Admin & each requested Instructor
  await pushNotification("admin_123", {
    titleEn: "New Student Registered",
    titleAr: "تسجيل طالب جديد",
    bodyEn: `${fullName} registered and requested ${requested.length} instructor(s).`,
    bodyAr: `قام الطالب ${fullName} بالتسجيل واختيار ${requested.length} محاضر(ين).`,
    type: "info",
    link: "/admin",
  });
  await Promise.all(
    requested.map((instId) =>
      pushNotification(instId, {
        titleEn: "New Student Join Request",
        titleAr: "طلب انضمام طالب جديد",
        bodyEn: `${fullName} requested to join your classes.`,
        bodyAr: `طلب الطالب ${fullName} الانضمام إلى فصولك.`,
        type: "info",
        link: "/instructor/students",
      })
    )
  );

  return studentDoc;
}

export async function approveStudentRequest(studentUid, instructorUid) {
  const snap = await get(ref(rtdb, `users/${studentUid}`));
  if (!snap.exists()) return;
  const student = snap.val();
  const currentIds = Array.isArray(student.instructorIds) ? student.instructorIds : [];
  const nextIds = currentIds.includes(instructorUid) ? currentIds : [...currentIds, instructorUid];
  const nextRequests = { ...(student.instructorRequests || {}), [instructorUid]: "approved" };
  await update(ref(rtdb, `users/${studentUid}`), {
    instructorIds: nextIds,
    instructorRequests: nextRequests,
    approvalStatus: "approved",
    updatedAt: Date.now(),
  });

  await pushNotification(studentUid, {
    titleEn: "Registration Accepted!",
    titleAr: "تم قبول طلب تسجيلك!",
    bodyEn: "An instructor accepted your request. You can now access their courses, assignments, and quizzes.",
    bodyAr: "وافق المحاضر على طلب انضمامك. يمكنك الآن الوصول إلى مقرراته وواجباته واختباراته.",
    type: "success",
    link: "/student",
  });
}

export async function rejectStudentRequest(studentUid, instructorUid) {
  const snap = await get(ref(rtdb, `users/${studentUid}`));
  if (!snap.exists()) return;
  const student = snap.val();
  const currentIds = Array.isArray(student.instructorIds) ? student.instructorIds : [];
  const nextRequests = { ...(student.instructorRequests || {}), [instructorUid]: "rejected" };
  const hasPending = Object.values(nextRequests).some((v) => v === "pending");
  const nextStatus =
    currentIds.length > 0 ? "approved" : hasPending ? "pending" : "rejected";
  await update(ref(rtdb, `users/${studentUid}`), {
    instructorRequests: nextRequests,
    approvalStatus: nextStatus,
    updatedAt: Date.now(),
  });

  await pushNotification(studentUid, {
    titleEn: "Registration Request Update",
    titleAr: "تحديث طلب التسجيل",
    bodyEn: "An instructor declined your join request.",
    bodyAr: "رفض المحاضر طلب الانضمام الخاص بك.",
    type: "warning",
    link: "/student",
  });
}

export async function requestAdditionalInstructor(studentUid, instructorUid) {
  const snap = await get(ref(rtdb, `users/${studentUid}`));
  if (!snap.exists()) return;
  const student = snap.val();
  const currentIds = Array.isArray(student.instructorIds) ? student.instructorIds : [];
  if (currentIds.includes(instructorUid)) return;
  const nextRequests = { ...(student.instructorRequests || {}), [instructorUid]: "pending" };
  const requested = Array.isArray(student.requestedInstructorIds)
    ? student.requestedInstructorIds
    : [];
  const nextRequested = requested.includes(instructorUid)
    ? requested
    : [...requested, instructorUid];
  await update(ref(rtdb, `users/${studentUid}`), {
    instructorRequests: nextRequests,
    requestedInstructorIds: nextRequested,
    updatedAt: Date.now(),
  });

  await pushNotification(instructorUid, {
    titleEn: "New Student Join Request",
    titleAr: "طلب انضمام طالب جديد",
    bodyEn: `${student.displayName || student.email} requested to join your classes.`,
    bodyAr: `طلب الطالب ${student.displayName || student.email} الانضمام إلى فصولك.`,
    type: "info",
    link: "/instructor/students",
  });
  await pushNotification("admin_123", {
    titleEn: "Instructor Join Request",
    titleAr: "طلب انضمام لمحاضر",
    bodyEn: `${student.displayName || student.email} requested an additional instructor.`,
    bodyAr: `طلب الطالب ${student.displayName || student.email} الانضمام إلى محاضر إضافي.`,
    type: "info",
    link: "/admin",
  });
}

export async function listUsers(roleFilter = null) {
  const snap = await get(ref(rtdb, "users"));
  if (!snap.exists()) return [];
  const val = snap.val();
  const arr = Object.entries(val).map(([uid, data]) => ({ uid, ...data }));
  const sorted = arr.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  return roleFilter ? sorted.filter((u) => u.role === roleFilter) : sorted;
}

export async function listActiveInstructors() {
  const instructors = await listUsers("instructor");
  return instructors.filter((i) => i.active !== false);
}

export async function updateUserRecord(uid, patch) {
  await update(ref(rtdb, `users/${uid}`), { ...patch, updatedAt: Date.now() });
}

export async function deleteUserRecord(uid, username, email) {
  await remove(ref(rtdb, `users/${uid}`));
  if (username) {
    await remove(ref(rtdb, `usernames/${normalizeKey(username)}`));
  }
  if (email) {
    await remove(ref(rtdb, `usernames/${normalizeKey(email)}`));
  }
}

/**
 * Update Profile Name and/or Password for any role (admin, instructor, student).
 * Reflects immediately across RTDB, Auth, and linked records.
 */
export async function updateUserProfileAndCredentials(currentUser, { displayName, newPassword, phoneNumber }) {
  if (!currentUser) throw new Error("NO_CURRENT_USER");
  const trimmedName = (displayName || "").trim();
  if (!trimmedName) throw new Error("DISPLAY_NAME_REQUIRED");

  // 1) Admin Role
  if (currentUser.role === "admin" || currentUser.uid === "admin_123") {
    const adminUpdates = {
      displayName: trimmedName,
      name: { en: trimmedName, ar: trimmedName },
      updatedAt: Date.now(),
    };
    if (newPassword && newPassword.trim()) {
      adminUpdates.password = newPassword.trim();
    }
    if (phoneNumber !== undefined) {
      const cleanPhone = String(phoneNumber || "").replace(/\D/g, "").slice(0, 11);
      adminUpdates.phoneNumber = cleanPhone;
      adminUpdates.phone = cleanPhone;
    }
    await update(ref(rtdb, "admins/admin_123"), adminUpdates);

    // Sync admin_session in localStorage
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("admin_session");
      const parsed = saved ? JSON.parse(saved) : {};
      const updatedAdmin = { ...parsed, ...adminUpdates, uid: "admin_123", role: "admin" };
      localStorage.setItem("admin_session", JSON.stringify(updatedAdmin));
      if (newPassword && newPassword.trim()) {
        localStorage.setItem("admin_custom_pw", newPassword.trim());
      }
    }
    return { ...currentUser, ...adminUpdates };
  }

  // 2) Non-Admin (Instructor or Student)
  // Update Firebase Auth current user if signed in
  if (auth.currentUser) {
    if (trimmedName && auth.currentUser.displayName !== trimmedName) {
      await updateProfile(auth.currentUser, { displayName: trimmedName });
    }
    if (newPassword && newPassword.trim()) {
      await updatePassword(auth.currentUser, newPassword.trim());
    }
  }

  // Update RTDB users record
  const userUpdates = {
    displayName: trimmedName,
    name: { en: trimmedName, ar: trimmedName },
    updatedAt: Date.now(),
  };
  if (newPassword && newPassword.trim()) {
    userUpdates.password = newPassword.trim();
  }
  if (phoneNumber !== undefined) {
    const cleanPhone = String(phoneNumber || "").replace(/\D/g, "").slice(0, 11);
    userUpdates.phoneNumber = cleanPhone;
    userUpdates.phone = cleanPhone;
  }
  await update(ref(rtdb, `users/${currentUser.uid}`), userUpdates);

  // Sync historical references across the platform
  if (currentUser.role === "instructor") {
    try {
      const coursesSnap = await get(ref(rtdb, "courses"));
      if (coursesSnap.exists()) {
        const patch = {};
        Object.entries(coursesSnap.val()).forEach(([cid, c]) => {
          if (c.instructorId === currentUser.uid) {
            patch[`courses/${cid}/instructorName`] = trimmedName;
          }
        });
        if (Object.keys(patch).length > 0) {
          await update(ref(rtdb), patch);
        }
      }
    } catch (e) {
      console.warn("Instructor course cascade warning:", e);
    }
  } else if (currentUser.role === "student") {
    try {
      const resultsSnap = await get(ref(rtdb, "results"));
      if (resultsSnap.exists()) {
        const patch = {};
        Object.entries(resultsSnap.val()).forEach(([rid, r]) => {
          if (r.studentId === currentUser.uid) {
            patch[`results/${rid}/studentName`] = trimmedName;
          }
        });
        if (Object.keys(patch).length > 0) {
          await update(ref(rtdb), patch);
        }
      }
    } catch (e) {
      console.warn("Student results cascade warning:", e);
    }
  }

  return {
    ...currentUser,
    ...userUpdates,
  };
}

/* ==================== ASSIGNMENTS ==================== */
export async function listAssignments() {
  const snap = await get(ref(rtdb, "assignments"));
  if (!snap.exists()) return [];
  return Object.entries(snap.val())
    .map(([id, data]) => ({
      id,
      ...data,
      submissions: data.submissions
        ? Object.entries(data.submissions).map(([sid, sdata]) => ({ id: sid, ...sdata }))
        : [],
    }))
    .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
}

export async function createAssignment({
  courseId,
  instructorId,
  title,
  instructions,
  dueDate,
  dueTime = "23:59",
  maxMarks = 10,
  pdfName = "",
  pdfPages = [],
  questions = [],
  assignmentType = "sheet",
}) {
  const newRef = push(ref(rtdb, "assignments"));
  const computedMaxMarks =
    Array.isArray(questions) && questions.length > 0
      ? questions.reduce((sum, q) => sum + (Number(q.maxMarks) || 5), 0)
      : Number(maxMarks) || 10;

  const doc = {
    id: newRef.key,
    courseId,
    instructorId,
    title,
    instructions: instructions || "",
    dueDate: dueDate || "",
    dueTime: dueTime || "23:59",
    maxMarks: computedMaxMarks,
    pdfName: pdfName || "",
    pdfPages: Array.isArray(pdfPages) ? pdfPages : [],
    questions: Array.isArray(questions) ? questions : [],
    assignmentType: questions && questions.length > 0 ? "sheet" : assignmentType || "sheet",
    createdAt: Date.now(),
  };
  await set(newRef, doc);

  await pushNotification("admin_123", {
    titleEn: "New Assignment Created",
    titleAr: "تم إنشاء واجب جديد",
    bodyEn: `Assignment "${title}" (${doc.maxMarks} pts) was posted.`,
    bodyAr: `تم نشر الواجب "${title}" (${doc.maxMarks} نقطة).`,
    type: "info",
    link: "/admin",
  });
  await notifyStudentsOfInstructor(instructorId, {
    titleEn: "New Assignment Posted",
    titleAr: "تم نشر واجب جديد",
    bodyEn: `New assignment "${title}" (${doc.maxMarks} pts) is available.`,
    bodyAr: `الواجب الجديد "${title}" (${doc.maxMarks} نقطة) متاح الآن.`,
    type: "info",
    link: "/student/assignments",
  });

  return doc;
}

export async function updateAssignment(assignmentId, patch) {
  await update(ref(rtdb, `assignments/${assignmentId}`), {
    ...patch,
    updatedAt: Date.now(),
  });
}

export async function deleteAssignment(assignmentId) {
  await remove(ref(rtdb, `assignments/${assignmentId}`));
}

export async function submitAssignmentWork(
  assignmentId,
  {
    studentId,
    studentName,
    answerText,
    annotatedPages = [],
    correctedPages = [],
    questionAnswers = {},
    aiGrading = null,
    score = null,
    feedback = "",
    instructorId = "",
    assignmentTitle = "",
  }
) {
  const submissionData = {
    studentId,
    studentName,
    answerText: answerText || "",
    annotatedPages: Array.isArray(annotatedPages) ? annotatedPages : [],
    questionAnswers: questionAnswers || {},
    submittedAt: Date.now(),
    status: "submitted",
  };

  if (Array.isArray(correctedPages) && correctedPages.length > 0) {
    submissionData.correctedPages = correctedPages;
  }
  if (aiGrading) {
    submissionData.aiGrading = aiGrading;
  }
  if (score !== null && score !== undefined) {
    submissionData.score = Number(score);
    submissionData.aiScore = Number(score);
  }
  if (feedback) {
    submissionData.feedback = feedback;
  }

  await set(ref(rtdb, `assignments/${assignmentId}/submissions/${studentId}`), submissionData);

  await pushNotification("admin_123", {
    titleEn: "Assignment Submitted",
    titleAr: "تم تسليم واجب",
    bodyEn: `${studentName} submitted "${assignmentTitle || "an assignment"}".`,
    bodyAr: `قام الطالب ${studentName} بتسليم الواجب "${assignmentTitle || ""}".`,
    type: "info",
    link: "/admin",
  });
  if (instructorId) {
    await pushNotification(instructorId, {
      titleEn: "Assignment Ready for Correction",
      titleAr: "واجب جاهز للتصحيح",
      bodyEn: `${studentName} submitted answers for "${assignmentTitle || "assignment"}".`,
      bodyAr: `سلّم الطالب ${studentName} حله في "${assignmentTitle || "الواجب"}" للتصحيح.`,
      type: "info",
      link: "/instructor/assignments",
    });
  }
}

export async function gradeAssignmentSubmission(
  assignmentId,
  studentId,
  score,
  feedback = "",
  correctedPages = null,
  maxMarks = null,
  questionGrades = null,
  gradedBy = "instructor",
  aiGrading = null,
  answerText = null
) {
  const patch = {
    score: Number(score),
    feedback,
    gradedBy,
    gradedAt: Date.now(),
    status: "teacher_reviewed",
  };
  if (Array.isArray(correctedPages) && correctedPages.length > 0) {
    patch.correctedPages = correctedPages;
  }
  if (questionGrades) {
    patch.questionGrades = questionGrades;
  }
  if (aiGrading) {
    patch.aiGrading = aiGrading;
  }
  if (answerText) {
    patch.answerText = answerText;
  }
  await update(ref(rtdb, `assignments/${assignmentId}/submissions/${studentId}`), patch);

  const ptsLabel = maxMarks ? `${score}/${maxMarks} pts` : `${score} pts`;
  const ptsLabelAr = maxMarks ? `${score}/${maxMarks} نقطة` : `${score} نقطة`;

  await pushNotification(studentId, {
    titleEn: "Assignment Corrected & Graded",
    titleAr: "تم تصحيح وتقييم الواجب",
    bodyEn: `Your assignment was corrected — you earned ${ptsLabel}.`,
    bodyAr: `تم تصحيح واجبك وحصلت على ${ptsLabelAr}.`,
    type: "success",
    link: "/student/assignments",
  });
  await pushNotification("admin_123", {
    titleEn: "Assignment Marked",
    titleAr: "تم رصد نقاط واجب",
    bodyEn: `Student received ${ptsLabel} on an assignment.`,
    bodyAr: `تم رصد ${ptsLabelAr} لطالب في الواجب.`,
    type: "info",
    link: "/admin/scoreboard",
  });
}

/* ==================== COURSES & LESSONS ==================== */
export async function listCourses(instructorId = null) {
  const snap = await get(ref(rtdb, "courses"));
  if (!snap.exists()) return [];
  const arr = Object.entries(snap.val()).map(([id, data]) => ({
    id,
    ...data,
    lessons: data.lessons
      ? Object.entries(data.lessons).map(([lid, ldata]) => ({ id: lid, ...ldata }))
      : [],
    enrolledStudents: Array.isArray(data.enrolledStudents) ? data.enrolledStudents : [],
  }));
  const sorted = arr.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  return instructorId ? sorted.filter((c) => c.instructorId === instructorId) : sorted;
}

export async function createCourse({ titleEn, titleAr, descEn, descAr, instructorId, instructorName }) {
  const newRef = push(ref(rtdb, "courses"));
  const course = {
    id: newRef.key,
    title: { en: titleEn, ar: titleAr || titleEn },
    description: { en: descEn || "", ar: descAr || descEn || "" },
    instructorId,
    instructorName: instructorName || "",
    enrolledStudents: [],
    createdAt: Date.now(),
  };
  await set(newRef, course);

  await pushNotification("admin_123", {
    titleEn: "New Course Created",
    titleAr: "تم إنشاء مقرر جديد",
    bodyEn: `Course "${titleEn}" added by ${instructorName || "Instructor"}.`,
    bodyAr: `تمت إضافة المقرر "${titleAr || titleEn}".`,
    type: "info",
    link: "/admin",
  });
  await notifyStudentsOfInstructor(instructorId, {
    titleEn: "New Course Available",
    titleAr: "مقرر جديد متاح الآن",
    bodyEn: `Your instructor published a new course: "${titleEn}".`,
    bodyAr: `نشر المحاضر مقرراً جديداً: "${titleAr || titleEn}".`,
    type: "success",
    link: "/student/courses",
  });

  return course;
}

export async function deleteCourse(courseId) {
  await remove(ref(rtdb, `courses/${courseId}`));
}

export async function addLessonToCourse(courseId, { titleEn, titleAr, content, fileUrl }) {
  const lessonRef = push(ref(rtdb, `courses/${courseId}/lessons`));
  const lesson = {
    id: lessonRef.key,
    title: { en: titleEn, ar: titleAr || titleEn },
    content: content || "",
    fileUrl: fileUrl || "",
    createdAt: Date.now(),
  };
  await set(lessonRef, lesson);

  const courseSnap = await get(ref(rtdb, `courses/${courseId}`));
  if (courseSnap.exists()) {
    const course = courseSnap.val();
    await notifyStudentsOfInstructor(course.instructorId, {
      titleEn: "New Lesson Added",
      titleAr: "تمت إضافة درس جديد",
      bodyEn: `New lesson "${titleEn}" added to ${course.title?.en || "your course"}.`,
      bodyAr: `تمت إضافة درس جديد "${titleAr || titleEn}" في ${course.title?.ar || "مقررك"}.`,
      type: "info",
      link: "/student/courses",
    });
  }

  return lesson;
}

export async function enrolStudentInCourse(courseId, studentId) {
  const courseSnap = await get(ref(rtdb, `courses/${courseId}/enrolledStudents`));
  const current = courseSnap.exists() ? courseSnap.val() : [];
  if (!current.includes(studentId)) {
    await set(ref(rtdb, `courses/${courseId}/enrolledStudents`), [...current, studentId]);
  }
  const userSnap = await get(ref(rtdb, `users/${studentId}/enrolledCourseIds`));
  const userCourses = userSnap.exists() ? userSnap.val() : [];
  if (!userCourses.includes(courseId)) {
    await set(ref(rtdb, `users/${studentId}/enrolledCourseIds`), [...userCourses, courseId]);
  }
}

/* ==================== QUIZZES & RESULTS ==================== */
export async function listQuizzes() {
  const snap = await get(ref(rtdb, "quizzes"));
  if (!snap.exists()) return [];
  return Object.entries(snap.val())
    .map(([id, data]) => ({ id, ...data }))
    .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
}

export async function createQuiz({
  courseId,
  lessonId,
  title,
  instructorId,
  questions,
  durationMinutes = 10,
  status = "draft",
}) {
  const quizRef = push(ref(rtdb, "quizzes"));
  const quiz = {
    id: quizRef.key,
    courseId,
    lessonId: lessonId || "",
    title,
    instructorId,
    durationMinutes: Number(durationMinutes) || 10,
    status,
    questions,
    createdAt: Date.now(),
  };
  await set(quizRef, quiz);
  return quiz;
}

export async function updateQuiz(quizId, patch) {
  await update(ref(rtdb, `quizzes/${quizId}`), { ...patch, updatedAt: Date.now() });
  if (patch.status === "published") {
    const snap = await get(ref(rtdb, `quizzes/${quizId}`));
    if (snap.exists()) {
      const qz = snap.val();
      await pushNotification("admin_123", {
        titleEn: "Quiz Published",
        titleAr: "تم نشر اختبار",
        bodyEn: `Quiz "${qz.title}" was approved and published.`,
        bodyAr: `تم اعتماد ونشر الاختبار "${qz.title}".`,
        type: "success",
        link: "/admin",
      });
      await notifyStudentsOfInstructor(qz.instructorId, {
        titleEn: "New Quiz Available",
        titleAr: "اختبار جديد متاح الآن",
        bodyEn: `Quiz "${qz.title}" (${qz.durationMinutes || 10} min) is now open.`,
        bodyAr: `الاختبار "${qz.title}" (${qz.durationMinutes || 10} دقيقة) متاح الآن.`,
        type: "success",
        link: "/student/quizzes",
      });
    }
  }
}

export async function deleteQuiz(quizId) {
  await remove(ref(rtdb, `quizzes/${quizId}`));
}

/* ==================== QUIZ ENTRY LOCK & RETAKE REQUESTS ==================== */
export async function listQuizAccess() {
  const snap = await get(ref(rtdb, "quizAccess"));
  if (!snap.exists()) return {};
  return snap.val();
}

export async function markQuizEntered(quizId, studentId, meta = {}) {
  await update(ref(rtdb, `quizAccess/${quizId}/${studentId}`), {
    quizId,
    studentId,
    ...meta,
    status: "entered",
    retakeStatus: "none",
    enteredAt: Date.now(),
  });
}

export async function markQuizCheatingTerminated(quizId, studentId, meta = {}) {
  await update(ref(rtdb, `quizAccess/${quizId}/${studentId}`), {
    quizId,
    studentId,
    ...meta,
    status: "terminated_cheating",
    retakeStatus: "none",
    terminatedAt: Date.now(),
  });
  if (meta.instructorId) {
    await pushNotification(meta.instructorId, {
      titleEn: "Quiz Terminated (Screenshot Violation)",
      titleAr: "إلغاء اختبار طالب لمحاولة تصوير الشاشة (غش)",
      bodyEn: `${meta.studentName || studentId} was disqualified from "${meta.quizTitle || "Quiz"}" after repeating screenshot attempts (2/2 strikes).`,
      bodyAr: `تم إقصاء الطالب ${meta.studentName || studentId} من اختبار "${meta.quizTitle || "الاختبار"}" بعد تكرار محاولة تصوير الشاشة مرتين (مخالفة غش).`,
      type: "warning",
      link: "/instructor/quizzes",
    });
  }
}

export async function markQuizSubmitted(quizId, studentId) {
  await update(ref(rtdb, `quizAccess/${quizId}/${studentId}`), {
    status: "submitted",
    retakeStatus: "none",
    submittedAt: Date.now(),
  });
}

export async function requestQuizRetake(quizId, studentId, meta = {}) {
  await update(ref(rtdb, `quizAccess/${quizId}/${studentId}`), {
    quizId,
    studentId,
    ...meta,
    retakeStatus: "pending",
    requestedAt: Date.now(),
  });
  if (meta.instructorId) {
    await pushNotification(meta.instructorId, {
      titleEn: "Quiz Retake Request",
      titleAr: "طلب إعادة اختبار",
      bodyEn: `${meta.studentName || "A student"} requested to retake "${meta.quizTitle || quizId}".`,
      bodyAr: `طلب الطالب ${meta.studentName || ""} إعادة الاختبار "${meta.quizTitle || quizId}".`,
      type: "warning",
      link: "/instructor/quizzes",
    });
  }
  await pushNotification("admin_123", {
    titleEn: "Quiz Retake Requested",
    titleAr: "طلب إعادة اختبار",
    bodyEn: `${meta.studentName || "A student"} requested a retake for "${meta.quizTitle || quizId}".`,
    bodyAr: `طلب الطالب ${meta.studentName || ""} إعادة الاختبار "${meta.quizTitle || quizId}".`,
    type: "info",
    link: "/admin",
  });
}

export async function approveQuizRetake(quizId, studentId) {
  await update(ref(rtdb, `quizAccess/${quizId}/${studentId}`), {
    retakeStatus: "approved",
    approvedAt: Date.now(),
  });
  const snap = await get(ref(rtdb, `quizAccess/${quizId}/${studentId}`));
  const info = snap.exists() ? snap.val() : {};
  await pushNotification(studentId, {
    titleEn: "Quiz Retake Approved!",
    titleAr: "تمت الموافقة على إعادة الاختبار!",
    bodyEn: `Your instructor approved your retake for "${info.quizTitle || "the quiz"}".`,
    bodyAr: `وافق المحاضر على طلب إعادة الاختبار "${info.quizTitle || ""}".`,
    type: "success",
    link: "/student/quizzes",
  });
}

export async function rejectQuizRetake(quizId, studentId) {
  await update(ref(rtdb, `quizAccess/${quizId}/${studentId}`), {
    retakeStatus: "rejected",
    rejectedAt: Date.now(),
  });
  const snap = await get(ref(rtdb, `quizAccess/${quizId}/${studentId}`));
  const info = snap.exists() ? snap.val() : {};
  await pushNotification(studentId, {
    titleEn: "Quiz Retake Declined",
    titleAr: "تم رفض طلب إعادة الاختبار",
    bodyEn: `Your retake request for "${info.quizTitle || "the quiz"}" was declined.`,
    bodyAr: `تم رفض طلب إعادة الاختبار "${info.quizTitle || ""}".`,
    type: "warning",
    link: "/student/quizzes",
  });
}

export async function listResults() {
  const snap = await get(ref(rtdb, "results"));
  if (!snap.exists()) return [];
  return Object.entries(snap.val())
    .map(([id, data]) => ({ id, ...data }))
    .sort((a, b) => (b.submittedAt || 0) - (a.submittedAt || 0));
}

export async function submitQuizAttempt({
  studentId,
  studentName,
  quizId,
  quizTitle,
  courseId,
  instructorId,
  score,
  points,
  total,
  answers,
  aiFeedback,
}) {
  const earnedPoints =
    points !== undefined
      ? Number(points) || 0
      : Math.round(((Number(score) || 0) / 100) * (Number(total) || 0));
  const resRef = push(ref(rtdb, "results"));
  const result = {
    id: resRef.key,
    studentId,
    studentName,
    quizId,
    quizTitle,
    courseId,
    instructorId,
    score,
    points: earnedPoints,
    total,
    answers,
    aiFeedback: aiFeedback || "",
    submittedAt: Date.now(),
  };
  await set(resRef, result);

  await pushNotification("admin_123", {
    titleEn: "Quiz Submitted",
    titleAr: "تم تسليم اختبار",
    bodyEn: `${studentName} earned ${earnedPoints}/${total || earnedPoints} pts (${score}%) on "${quizTitle}".`,
    bodyAr: `حصل الطالب ${studentName} على ${earnedPoints}/${total || earnedPoints} نقطة (${score}%) في "${quizTitle}".`,
    type: score >= 60 ? "success" : "warning",
    link: "/admin/grades",
  });
  if (instructorId) {
    await pushNotification(instructorId, {
      titleEn: "Student Completed Quiz",
      titleAr: "أكمل طالب اختباراً",
      bodyEn: `${studentName} earned ${earnedPoints}/${total || earnedPoints} pts (${score}%) on "${quizTitle}".`,
      bodyAr: `حصل الطالب ${studentName} على ${earnedPoints}/${total || earnedPoints} نقطة (${score}%) في "${quizTitle}".`,
      type: "info",
      link: "/instructor/grades",
    });
  }

  return result;
}

export async function checkRtdbHealth() {
  try {
    await set(ref(rtdb, "_health/lastPing"), Date.now());
    return true;
  } catch {
    return false;
  }
}

/* ==================== REAL-TIME NOTIFICATIONS ==================== */
export async function pushNotification(recipientId, {
  titleEn,
  titleAr,
  bodyEn,
  bodyAr,
  type = "info",
  link = "",
}) {
  if (!recipientId) return;
  try {
    const notifRef = push(ref(rtdb, `notifications/${recipientId}`));
    await set(notifRef, {
      id: notifRef.key,
      titleEn: titleEn || "",
      titleAr: titleAr || titleEn || "",
      bodyEn: bodyEn || "",
      bodyAr: bodyAr || bodyEn || "",
      title: titleEn || titleAr || "",
      message: bodyEn || bodyAr || "",
      type,
      link,
      read: false,
      createdAt: Date.now(),
    });
  } catch (err) {
    console.warn("Notification write skipped:", err.message);
  }
}

export async function notifyStudentsOfInstructor(instructorId, payload) {
  if (!instructorId) return;
  try {
    const students = await listUsers("student");
    const linked = students.filter(
      (s) => Array.isArray(s.instructorIds) && s.instructorIds.includes(instructorId)
    );
    await Promise.all(linked.map((s) => pushNotification(s.uid, payload)));
  } catch (err) {
    console.warn("Student broadcast skipped:", err.message);
  }
}

export function subscribeNotifications(recipientId, callback) {
  if (!recipientId) {
    callback([]);
    return () => {};
  }
  const notifRef = ref(rtdb, `notifications/${recipientId}`);
  return onValue(notifRef, (snap) => {
    if (!snap.exists()) {
      callback([]);
      return;
    }
    const list = Object.entries(snap.val())
      .map(([id, data]) => ({ id, ...data }))
      .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    callback(list);
  });
}

export async function markNotificationRead(recipientId, notifId) {
  if (!recipientId || !notifId) return;
  await update(ref(rtdb, `notifications/${recipientId}/${notifId}`), { read: true });
}

export async function markAllNotificationsRead(recipientId, notifIds = []) {
  if (!recipientId || notifIds.length === 0) return;
  const updates = {};
  notifIds.forEach((id) => {
    updates[`notifications/${recipientId}/${id}/read`] = true;
  });
  await update(ref(rtdb), updates);
}

export async function clearNotifications(recipientId) {
  if (!recipientId) return;
  await remove(ref(rtdb, `notifications/${recipientId}`));
}

/* ==================== LESSON PDFs & PRIVATE STUDENT ANNOTATIONS ==================== */
export async function listLessonMaterials() {
  const snap = await get(ref(rtdb, "lessonMaterials"));
  if (!snap.exists()) return [];
  return Object.entries(snap.val())
    .map(([id, data]) => ({
      id,
      ...data,
      pdfPages: Array.isArray(data.pdfPages) ? data.pdfPages : [],
    }))
    .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
}

export async function createLessonMaterial({
  courseId,
  instructorId,
  title,
  description = "",
  pdfName = "",
  pdfPages = [],
  extractedText = "",
}) {
  const newRef = push(ref(rtdb, "lessonMaterials"));
  const item = {
    id: newRef.key,
    courseId,
    instructorId,
    title,
    description,
    pdfName,
    pdfPages: Array.isArray(pdfPages) ? pdfPages : [],
    extractedText: String(extractedText || "").slice(0, 12000),
    createdAt: Date.now(),
  };
  await set(newRef, item);

  await notifyStudentsOfInstructor(instructorId, {
    titleEn: "New Lesson PDF Uploaded",
    titleAr: "تم رفع درس PDF جديد",
    bodyEn: `Lesson "${title}" is ready to view and annotate privately.`,
    bodyAr: `الدرس "${title}" متاح الآن للعرض والتدوين الخاص.`,
    type: "info",
    link: "/student/lesson-pdfs",
  });
  return item;
}

export async function deleteLessonMaterial(materialId) {
  await remove(ref(rtdb, `lessonMaterials/${materialId}`));
}

export async function getStudentLessonAnnotation(materialId, studentId) {
  if (!materialId || !studentId) return null;
  const snap = await get(ref(rtdb, `lessonMaterials/${materialId}/annotations/${studentId}`));
  if (!snap.exists()) return null;
  return snap.val();
}

export async function saveStudentLessonAnnotation(
  materialId,
  studentId,
  { inkSnapshots = {}, notes = "" }
) {
  if (!materialId || !studentId) return;
  await set(ref(rtdb, `lessonMaterials/${materialId}/annotations/${studentId}`), {
    studentId,
    inkSnapshots,
    notes,
    updatedAt: Date.now(),
  });
}

/* ==================== AUTOMATED WEEKLY PERFORMANCE REPORTS (7-DAY CYCLES) ==================== */

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Calculates structured 7-day performance reports for a student from registration to present.
 * Arranged in weekly intervals with quizzes, assignments, total points, grade tier, and AI coaching.
 */
export function calculateStudentWeeklyReports(studentId, { user, results = [], assignments = [] }) {
  if (!studentId) return [];

  // Determine baseline start date
  const studentResults = results.filter((r) => r.studentId === studentId);
  const studentAssignments = assignments.filter((a) =>
    a.submissions?.some((s) => s.id === studentId || s.studentId === studentId)
  );

  const activityTimestamps = [
    user?.createdAt,
    ...studentResults.map((r) => r.createdAt),
    ...studentAssignments.map((a) => {
      const s = a.submissions?.find((sub) => sub.id === studentId || sub.studentId === studentId);
      return s?.submittedAt || s?.createdAt || a.createdAt;
    }),
  ].filter(Boolean);

  const earliestTime =
    activityTimestamps.length > 0
      ? Math.min(...activityTimestamps)
      : Date.now() - 14 * 24 * 60 * 60 * 1000;

  // Round start to beginning of day
  const startDate = new Date(earliestTime);
  startDate.setHours(0, 0, 0, 0);
  const startMs = startDate.getTime();
  const nowMs = Date.now();

  // Total weeks elapsed so far
  const totalWeeksCount = Math.max(1, Math.ceil((nowMs - startMs) / SEVEN_DAYS_MS));
  const weeklyReports = [];

  for (let i = 0; i < totalWeeksCount; i += 1) {
    const weekNumber = i + 1;
    const weekStartMs = startMs + i * SEVEN_DAYS_MS;
    const weekEndMs = weekStartMs + SEVEN_DAYS_MS;
    const isCurrentWeek = nowMs >= weekStartMs && nowMs <= weekEndMs;
    const isComplete = nowMs > weekEndMs;

    const startDateStr = new Date(weekStartMs).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
    const endDateStr = new Date(weekEndMs).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });

    // 1) Filter Quizzes within this 7-day window
    const weekQuizzes = studentResults.filter(
      (r) => (r.createdAt || 0) >= weekStartMs && (r.createdAt || 0) < weekEndMs
    );
    const quizzesCount = weekQuizzes.length;
    const quizPoints = weekQuizzes.reduce((acc, r) => {
      if (r.points !== undefined && r.points !== null) return acc + Number(r.points);
      const totalQ = Number(r.total) || 1;
      const pct = Number(r.score) || 0;
      return acc + Math.round((pct / 100) * totalQ);
    }, 0);
    const quizMaxPoints = weekQuizzes.reduce((acc, r) => acc + (Number(r.total) || 1), 0);
    const quizAvgScore =
      quizzesCount > 0
        ? Math.round(weekQuizzes.reduce((acc, r) => acc + (Number(r.score) || 0), 0) / quizzesCount)
        : 0;

    // 2) Filter Assignments within this 7-day window
    const weekAssignments = [];
    studentAssignments.forEach((a) => {
      const sub = a.submissions?.find((s) => s.id === studentId || s.studentId === studentId);
      if (!sub) return;
      const subTime = sub.submittedAt || sub.createdAt || a.createdAt || 0;
      if (subTime >= weekStartMs && subTime < weekEndMs) {
        weekAssignments.push({
          assignmentId: a.id,
          title: a.title,
          maxMarks: Number(a.maxMarks) || 10,
          score: sub.score !== undefined && sub.score !== null ? Number(sub.score) : null,
          feedback: sub.feedback || "",
          submittedAt: subTime,
        });
      }
    });

    const assignmentsCount = weekAssignments.length;
    const gradedAssignments = weekAssignments.filter((a) => a.score !== null);
    const assignmentPoints = gradedAssignments.reduce((acc, a) => acc + a.score, 0);
    const assignmentMaxMarks = weekAssignments.reduce((acc, a) => acc + a.maxMarks, 0);
    const assignmentAvgScore =
      assignmentMaxMarks > 0
        ? Math.round((assignmentPoints / assignmentMaxMarks) * 100)
        : 0;

    // Combined Weekly Evaluation
    const totalWeeklyPoints = quizPoints + assignmentPoints;
    let overallScore = 0;
    if (quizzesCount > 0 && assignmentsCount > 0) {
      overallScore = Math.round(quizAvgScore * 0.5 + assignmentAvgScore * 0.5);
    } else if (quizzesCount > 0) {
      overallScore = quizAvgScore;
    } else if (assignmentsCount > 0) {
      overallScore = assignmentAvgScore;
    }

    // Performance Tier
    let tier = {
      grade: "A+",
      labelEn: "Outstanding",
      labelAr: "ممتاز",
      colorClass:
        "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-800",
    };
    if (overallScore >= 90) {
      tier = {
        grade: "A+",
        labelEn: "Outstanding",
        labelAr: "ممتاز",
        colorClass:
          "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-800",
      };
    } else if (overallScore >= 80) {
      tier = {
        grade: "A",
        labelEn: "Very Good",
        labelAr: "جيد جداً",
        colorClass:
          "text-indigo-600 bg-indigo-50 dark:bg-indigo-950/60 border-indigo-200 dark:border-indigo-800",
      };
    } else if (overallScore >= 70) {
      tier = {
        grade: "B",
        labelEn: "Good",
        labelAr: "جيد",
        colorClass:
          "text-cyan-600 bg-cyan-50 dark:bg-cyan-950/60 border-cyan-200 dark:border-cyan-800",
      };
    } else if (overallScore >= 60) {
      tier = {
        grade: "C",
        labelEn: "Satisfactory",
        labelAr: "مقبول",
        colorClass:
          "text-amber-600 bg-amber-50 dark:bg-amber-950/60 border-amber-200 dark:border-amber-800",
      };
    } else {
      tier = {
        grade: quizzesCount === 0 && assignmentsCount === 0 ? "—" : "D",
        labelEn:
          quizzesCount === 0 && assignmentsCount === 0
            ? "Pending Activity"
            : "Needs Improvement",
        labelAr:
          quizzesCount === 0 && assignmentsCount === 0 ? "في انتظار النشاط" : "يحتاج تحسين",
        colorClass:
          "text-slate-500 bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700",
      };
    }

    // AI Coaching Recommendation
    let aiFeedbackEn = "";
    let aiFeedbackAr = "";
    if (overallScore >= 90) {
      aiFeedbackEn = `Outstanding performance during Week ${weekNumber}! You achieved a stellar ${overallScore}% accuracy across your assessments. Recommendation: keep exploring advanced technical worksheets to retain your Top-5 leaderboard placement.`;
      aiFeedbackAr = `أداء استثنائي ومتميز في الأسبوع ${weekNumber}! حققت دقة مبهرة بلغت ${overallScore}% عبر اختباراتك وواجباتك. التوجيه: استمر في مراجعة الدروس المتقدمة للحفاظ على تصدرك في لوحة الشرف.`;
    } else if (overallScore >= 75) {
      aiFeedbackEn = `Great consistency in Week ${weekNumber} with ${overallScore}% overall score. You have strong grasp of core lessons. Tip for the upcoming week: review any missed quiz questions to elevate your grade into the 90%+ tier!`;
      aiFeedbackAr = `استمرارية ممتازة وجهد رائع في الأسبوع ${weekNumber} بنسبة ${overallScore}%. لديك استيعاب قوي للمفاهيم الأساسية. نصيحة للأسبوع القادم: راجع الأسئلة التي تعثرت فيها لرفع معدلك فوق 90%!`;
    } else if (quizzesCount > 0 || assignmentsCount > 0) {
      aiFeedbackEn = `Good active participation this week (${quizzesCount} quiz${
        quizzesCount > 1 ? "zes" : ""
      }, ${assignmentsCount} assignment${
        assignmentsCount > 1 ? "s" : ""
      }). Recommendation: study the annotated Lesson PDFs thoroughly prior to testing to boost conceptual retention.`;
      aiFeedbackAr = `مشاركة نشطة جيدة خلال هذا الأسبوع. التوجيه الدراسي: ركز على قراءة وتظليل ملفات الدروس (PDF) وتدوين الملاحظات قبل خوض الاختبارات لتعزيز الفهم وتثبيت المعلومات.`;
    } else {
      aiFeedbackEn = `No assessments recorded in this 7-day cycle. Jump back into your enrolled courses, open lesson PDFs, and take available quizzes to maintain your learning streak!`;
      aiFeedbackAr = `لم تُسجل أي اختبارات أو واجبات في هذه الدورة (7 أيام). تفضل بفتح مقرراتك المتاحة وحل الواجبات والاختبارات للحفاظ على تقدمك الدراسي المستمر!`;
    }

    weeklyReports.push({
      id: `week_${weekNumber}`,
      weekNumber,
      weekStartMs,
      weekEndMs,
      startDateStr,
      endDateStr,
      isCurrentWeek,
      isComplete,
      quizzesCount,
      quizPoints,
      quizMaxPoints,
      quizAvgScore,
      assignmentsCount,
      assignmentPoints,
      assignmentMaxMarks,
      assignmentAvgScore,
      totalWeeklyPoints,
      overallScore,
      tier,
      aiFeedbackEn,
      aiFeedbackAr,
      quizzes: weekQuizzes.map((q) => ({
        id: q.id,
        quizTitle: q.quizTitle || "Technical Assessment",
        score: Number(q.score) || 0,
        points: q.points !== undefined ? Number(q.points) : 0,
        createdAt: q.createdAt,
        feedback: q.feedback || "",
      })),
      assignments: weekAssignments,
    });
  }

  // Return sorted with the newest week first
  return weeklyReports.sort((a, b) => b.weekNumber - a.weekNumber);
}

/**
 * Automatically checks and sends weekly performance notifications every 7 days.
 * Ensures the student receives their weekly report notification automatically.
 */
export async function checkAndDispatchAutomatedWeeklyReports(studentId) {
  if (!studentId) return [];
  try {
    const [userSnap, resultsSnap, assignmentsSnap, sentSnap] = await Promise.all([
      get(ref(rtdb, `users/${studentId}`)),
      get(ref(rtdb, "results")),
      get(ref(rtdb, "assignments")),
      get(ref(rtdb, `weeklyReportsSent/${studentId}`)),
    ]);

    const user = userSnap.exists() ? userSnap.val() : {};
    const allResults = resultsSnap.exists() ? Object.values(resultsSnap.val()) : [];
    const allAssignments = assignmentsSnap.exists()
      ? Object.entries(assignmentsSnap.val()).map(([id, a]) => ({
          id,
          ...a,
          submissions: a.submissions ? Object.values(a.submissions) : [],
        }))
      : [];

    const reports = calculateStudentWeeklyReports(studentId, {
      user,
      results: allResults,
      assignments: allAssignments,
    });

    const sentMap = sentSnap.exists() ? sentSnap.val() : {};

    // For any completed 7-day cycle that hasn't been notified yet:
    for (const rep of reports) {
      if (rep.isComplete && !sentMap[rep.weekNumber]) {
        await pushNotification(studentId, {
          titleEn: `Weekly Performance Report — Week ${rep.weekNumber}`,
          titleAr: `تقرير الأداء الأسبوعي — الأسبوع ${rep.weekNumber}`,
          bodyEn: `Your 7-day evaluation (${rep.startDateStr} – ${rep.endDateStr}) is ready! Overall score: ${rep.overallScore}%. Click to view your detailed report & AI coaching tips.`,
          bodyAr: `تقرير أدائك الأسبوعي لفترة (${rep.startDateStr} – ${rep.endDateStr}) متاح الآن! المعدل: ${rep.overallScore}%. انقر لمشاهدة التقييم وإرشادات الذكاء الاصطناعي.`,
          type: "award",
          link: "/student/weekly-reports",
        });

        // Mark as sent in RTDB
        await set(ref(rtdb, `weeklyReportsSent/${studentId}/${rep.weekNumber}`), {
          sentAt: Date.now(),
          weekNumber: rep.weekNumber,
          overallScore: rep.overallScore,
        });
      }
    }

    return reports;
  } catch (err) {
    console.warn("Automated weekly report dispatch error:", err.message);
    return [];
  }
}

/* ==================== COURSES SESSIONS MODULE & CONTENT PROTECTION ==================== */

export async function listCourseSessions(courseIdFilter = null) {
  try {
    const snap = await get(ref(rtdb, "courseSessions"));
    if (!snap.exists()) return [];
    let list = Object.entries(snap.val()).map(([id, data]) => ({
      id,
      ...data,
      views: data.views ? (typeof data.views === "object" ? Object.values(data.views) : []) : [],
    }));
    if (courseIdFilter) {
      list = list.filter((s) => s.courseId === courseIdFilter);
    }
    return list.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  } catch (err) {
    console.error("listCourseSessions error:", err);
    return [];
  }
}

export async function createCourseSession({
  courseId,
  courseTitle = {},
  instructorId,
  instructorName = "",
  titleEn,
  titleAr,
  descriptionEn = "",
  descriptionAr = "",
  sessionDate = "",
  duration = "",
  videoUrl = "",
  videoFileName = "",
  videoType = "direct",
  resources = [],
}) {
  const newRef = push(ref(rtdb, "courseSessions"));
  const sessionItem = {
    id: newRef.key,
    courseId,
    courseTitle: typeof courseTitle === "object" ? courseTitle : { en: courseTitle, ar: courseTitle },
    instructorId,
    instructorName,
    title: {
      en: titleEn || titleAr || "Course Session",
      ar: titleAr || titleEn || "جلسة دراسية",
    },
    description: {
      en: descriptionEn || "",
      ar: descriptionAr || "",
    },
    sessionDate: sessionDate || new Date().toISOString().slice(0, 10),
    duration: duration || "45 min",
    videoUrl,
    videoFileName,
    videoType,
    resources: Array.isArray(resources) ? resources : [],
    views: {},
    createdAt: Date.now(),
  };

  await set(newRef, sessionItem);

  try {
    await notifyStudentsOfInstructor(instructorId, {
      titleEn: "New Course Session Uploaded",
      titleAr: "تم رفع جلسة دراسية جديدة",
      bodyEn: `Session "${sessionItem.title.en}" has been published for ${sessionItem.courseTitle?.en || "your course"}.`,
      bodyAr: `تمت إضافة الجلسة "${sessionItem.title.ar}" لمقرر ${sessionItem.courseTitle?.ar || "المقرر"}.`,
      type: "info",
      link: "/student/sessions",
    });
  } catch (err) {
    console.warn("Notification for session note:", err.message);
  }

  return sessionItem;
}

export async function updateCourseSession(sessionId, patch) {
  if (!sessionId) return;
  await update(ref(rtdb, `courseSessions/${sessionId}`), {
    ...patch,
    updatedAt: Date.now(),
  });
}

export async function deleteCourseSession(sessionId) {
  if (!sessionId) return;
  await remove(ref(rtdb, `courseSessions/${sessionId}`));
}

export async function logSessionAttendance(sessionId, studentId, studentInfo = {}) {
  if (!sessionId || !studentId) return;
  const viewRecord = {
    studentId,
    studentName: studentInfo.displayName || studentInfo.name?.en || studentInfo.username || "Student",
    studentEmail: studentInfo.email || "",
    viewedAt: Date.now(),
  };
  await set(ref(rtdb, `courseSessions/${sessionId}/views/${studentId}`), viewRecord);
}

/* ==================== TEACHER-STUDENT DIRECT CHAT MODULE ==================== */

export function getDirectChatChannelId(uidA, uidB) {
  if (!uidA || !uidB) return null;
  return [uidA, uidB].sort().join("__");
}

export function subscribeDirectChatMessages(channelId, callback) {
  if (!channelId) {
    callback([]);
    return () => {};
  }
  const messagesRef = ref(rtdb, `directChats/${channelId}/messages`);
  return onValue(messagesRef, (snap) => {
    if (!snap.exists()) {
      callback([]);
      return;
    }
    const val = snap.val();
    const list = Object.entries(val).map(([id, m]) => ({
      id,
      ...m,
    }));
    list.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
    callback(list);
  });
}

export function subscribeUserDirectChats(userId, callback) {
  if (!userId) {
    callback([]);
    return () => {};
  }
  const chatsRef = ref(rtdb, "directChats");
  return onValue(chatsRef, (snap) => {
    if (!snap.exists()) {
      callback([]);
      return;
    }
    const val = snap.val();
    const list = Object.entries(val)
      .map(([channelId, data]) => ({
        channelId,
        metadata: data.metadata || {},
        lastMessage: data.metadata?.lastMessage || "",
        lastMessageTimestamp: data.metadata?.lastMessageTimestamp || 0,
      }))
      .filter((c) => c.channelId.includes(userId))
      .sort((a, b) => (b.lastMessageTimestamp || 0) - (a.lastMessageTimestamp || 0));
    callback(list);
  });
}

export async function sendDirectChatMessage({
  channelId,
  senderId,
  senderName,
  senderRole,
  recipientId,
  recipientName,
  text,
  attachments = [],
}) {
  if (!channelId || !senderId || !text.trim()) return null;

  const msgRef = push(ref(rtdb, `directChats/${channelId}/messages`));
  const newMsg = {
    id: msgRef.key,
    senderId,
    senderName,
    senderRole,
    text: text.trim(),
    attachments: Array.isArray(attachments) ? attachments : [],
    createdAt: Date.now(),
    read: false,
  };
  await set(msgRef, newMsg);

  // Update conversation metadata
  const metaRef = ref(rtdb, `directChats/${channelId}/metadata`);
  const metaSnap = await get(metaRef);
  const currentMeta = metaSnap.exists() ? metaSnap.val() : {};

  const unreadField = senderRole === "instructor" ? "unreadByStudent" : "unreadByInstructor";
  const nextUnread = (currentMeta[unreadField] || 0) + 1;

  await set(metaRef, {
    ...currentMeta,
    instructorId: senderRole === "instructor" ? senderId : recipientId,
    instructorName: senderRole === "instructor" ? senderName : recipientName,
    studentId: senderRole === "student" ? senderId : recipientId,
    studentName: senderRole === "student" ? senderName : recipientName,
    lastMessage: text.trim(),
    lastSenderId: senderId,
    lastMessageTimestamp: Date.now(),
    [unreadField]: nextUnread,
    updatedAt: Date.now(),
  });

  // Push instant notification to recipient
  try {
    const isTeacherSender = senderRole === "instructor";
    await pushNotification(recipientId, {
      titleEn: isTeacherSender ? "New Message from Instructor" : "New Student Message",
      titleAr: isTeacherSender ? "رسالة جديدة من المحاضر" : "رسالة جديدة من الطالب",
      bodyEn: `${senderName}: ${text.slice(0, 90)}${text.length > 90 ? "..." : ""}`,
      bodyAr: `${senderName}: ${text.slice(0, 90)}${text.length > 90 ? "..." : ""}`,
      type: "info",
      link: isTeacherSender ? "/student/chat" : "/instructor/chat",
    });
  } catch (e) {
    console.warn("Direct chat notification note:", e.message);
  }

  return newMsg;
}

export async function markDirectChatRead(channelId, userRole) {
  if (!channelId) return;
  const metaRef = ref(rtdb, `directChats/${channelId}/metadata`);
  const snap = await get(metaRef);
  if (!snap.exists()) return;
  const unreadField = userRole === "instructor" ? "unreadByInstructor" : "unreadByStudent";
  await update(metaRef, { [unreadField]: 0 });
}


