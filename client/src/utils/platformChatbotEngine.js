import {
  createQuiz,
  listActiveInstructors,
  listAssignments,
  listCourses,
  listLessonMaterials,
  listQuizAccess,
  listQuizzes,
  listResults,
  listUsers,
} from "../services/platformService";
import { processChatbotMessageWithDataset } from "./chatbotCore";

export async function loadScopedPlatformDataset(user) {
  const [
    allCourses,
    allMaterials,
    allQuizzes,
    allAssignments,
    allResults,
    allStudents,
    allInstructors,
    quizAccess,
  ] = await Promise.all([
    listCourses(),
    listLessonMaterials(),
    listQuizzes(),
    listAssignments(),
    listResults(),
    listUsers("student"),
    listActiveInstructors(),
    listQuizAccess(),
  ]);

  const role = user?.role || "student";
  let courses = allCourses;
  let materials = allMaterials;
  let quizzes = allQuizzes;
  let assignments = allAssignments;
  let results = allResults;
  let students = allStudents;

  if (role === "instructor") {
    courses = allCourses.filter((c) => c.instructorId === user.uid);
    const cIds = courses.map((c) => c.id);
    materials = allMaterials.filter((m) => m.instructorId === user.uid || cIds.includes(m.courseId));
    quizzes = allQuizzes.filter((q) => q.instructorId === user.uid || cIds.includes(q.courseId));
    assignments = allAssignments.filter((a) => a.instructorId === user.uid || cIds.includes(a.courseId));
    results = allResults.filter((r) => r.instructorId === user.uid || cIds.includes(r.courseId));
    students = allStudents.filter(
      (s) =>
        (Array.isArray(s.instructorIds) && s.instructorIds.includes(user.uid)) ||
        courses.some((c) => c.enrolledStudents?.includes(s.uid))
    );
  } else if (role === "student") {
    const activeInstId =
      typeof localStorage !== "undefined"
        ? localStorage.getItem(`student_active_instructor_${user.uid}`) || ""
        : "";
    const approvedInsts = user.instructorIds || [];
    const targetInsts =
      activeInstId && approvedInsts.includes(activeInstId) ? [activeInstId] : approvedInsts;

    courses = allCourses.filter((c) => targetInsts.includes(c.instructorId));
    const cIds = courses.map((c) => c.id);
    materials = allMaterials.filter((m) => cIds.includes(m.courseId));
    quizzes = allQuizzes.filter((q) => q.status === "published" && cIds.includes(q.courseId));
    assignments = allAssignments.filter((a) => cIds.includes(a.courseId));
    results = allResults.filter((r) => r.studentId === user.uid && cIds.includes(r.courseId));
    students = allStudents.filter((s) => s.uid === user.uid);
  }

  const lessons = [];
  courses.forEach((c) => {
    const cTitle = c.title?.en || c.title?.ar || c.id;
    (c.lessons || []).forEach((l) => {
      const lTitle = l.title?.en || l.title?.ar || l.id;
      lessons.push({
        id: l.id,
        kind: "course_lesson",
        title: lTitle,
        titleAr: l.title?.ar || lTitle,
        courseId: c.id,
        courseTitle: cTitle,
        instructorId: c.instructorId,
        text: l.content || c.description?.en || "",
      });
    });
  });

  materials.forEach((m) => {
    const c = courses.find((cr) => cr.id === m.courseId);
    const cTitle = c?.title?.en || c?.title?.ar || m.courseId;
    lessons.push({
      id: m.id,
      kind: "lesson_pdf",
      title: m.title,
      titleAr: m.title,
      courseId: m.courseId,
      courseTitle: cTitle,
      instructorId: m.instructorId,
      text: m.extractedText || m.description || m.title,
    });
  });

  return {
    role,
    courses,
    materials,
    lessons,
    quizzes,
    assignments,
    results,
    students,
    instructors: allInstructors,
    quizAccess,
  };
}

export async function processChatbotMessage({
  message,
  user,
  lang = "en",
  history = [],
  explicitAction = null,
}) {
  const dataset = await loadScopedPlatformDataset(user);
  return processChatbotMessageWithDataset({
    message,
    user,
    lang,
    history,
    explicitAction,
    dataset,
    createQuizFn: createQuiz,
    useNetwork: true,
  });
}
