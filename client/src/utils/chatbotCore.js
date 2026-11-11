import axios from "axios";

const STOP_WORDS = new Set([
  "the", "is", "are", "was", "were", "a", "an", "in", "on", "at", "to", "for", "of",
  "and", "or", "what", "who", "where", "when", "how", "can", "you", "me", "my", "i",
  "about", "tell", "show", "give", "please", "does", "do", "this", "that", "it", "with",
  "from", "all", "any", "list", "get", "make", "create",
  "من", "في", "على", "عن", "هل", "ما", "هو", "هي", "الى", "إلى", "ان", "أن", "مع", "لي", "كم", "اريد", "عايز",
]);

export function getQuizEarnedPoints(r) {
  if (r.points !== undefined && r.points !== null) return Number(r.points) || 0;
  const totalQ = Number(r.total) || 1;
  const pct = Number(r.score) || 0;
  return Math.round((pct / 100) * totalQ);
}

function normalizeText(str) {
  return String(str || "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractKeywords(str) {
  return normalizeText(str)
    .split(" ")
    .filter((t) => t.length >= 2 && !STOP_WORDS.has(t));
}

function findBestMatch(query, candidates, getLabel) {
  const qNorm = normalizeText(query);
  if (!qNorm) return null;
  const qTokens = extractKeywords(query);

  let best = null;
  let bestScore = 0;

  candidates.forEach((item) => {
    const labelRaw = getLabel(item);
    const labelNorm = normalizeText(labelRaw);
    if (!labelNorm) return;

    let score = 0;
    if (qNorm.includes(labelNorm) && labelNorm.length >= 3) {
      score += 120 + labelNorm.length;
    }
    const labelTokens = extractKeywords(labelNorm);
    labelTokens.forEach((tok) => {
      if (qTokens.includes(tok)) score += 16;
      else if (tok.length >= 3 && qNorm.includes(tok)) score += 8;
    });

    if (score > bestScore) {
      bestScore = score;
      best = item;
    }
  });

  return bestScore >= 16 ? best : null;
}

function buildFallbackQuestions(text, lang = "en", count = 5) {
  const clean = String(text || "").replace(/[#*`>_]/g, " ").replace(/\s+/g, " ").trim();
  const sentences = clean
    .split(/[.!؟?\n]+/)
    .map((s) => s.trim())
    .filter((s) => s.length >= 22 && s.length <= 220);
  const pool = sentences.length > 0 ? sentences : [clean.slice(0, 140) || "Core course concept"];
  const total = Math.min(Math.max(Number(count) || 5, 1), 15);

  const termsPool = pool
    .flatMap((s) => s.split(/\s+/).filter((w) => w.length > 4))
    .filter((v, i, a) => a.indexOf(v) === i);

  return Array.from({ length: total }).map((_, idx) => {
    const fact = pool[idx % pool.length];
    const words = fact.split(/\s+/).filter((w) => w.length > 3);
    const keyWord = words[Math.min(Math.floor(words.length / 2), Math.max(words.length - 1, 0))] || "Concept";
    const masked = fact.replace(keyWord, "______");
    const distractors = [];
    for (let j = 1; j <= 3; j += 1) {
      const cand = termsPool[(idx + j * 2) % Math.max(termsPool.length, 1)];
      distractors.push(
        cand && cand !== keyWord
          ? cand
          : lang === "ar"
          ? `مصطلح بديل ${j}`
          : `Alternative concept ${j}`
      );
    }

    return {
      id: `q_${Date.now()}_${idx}`,
      text:
        lang === "ar"
          ? `استناداً إلى الدرس، أي مصطلح يكمل العبارة التالية بدقة؟\n"${masked}"`
          : `Based on the lesson, which term accurately completes this statement?\n"${masked}"`,
      allowMultiple: false,
      options: [
        { id: "a", text: keyWord },
        { id: "b", text: distractors[0] },
        { id: "c", text: distractors[1] },
        { id: "d", text: distractors[2] },
      ],
      correctOptionId: "a",
      correctOptionIds: ["a"],
    };
  });
}

function localSummarizeText(rawText, lang = "en", title = "") {
  const clean = String(rawText || "").replace(/[#*`>_]/g, " ").replace(/\s+/g, " ").trim();
  if (!clean) {
    return lang === "ar"
      ? "لا يوجد نص قابل للتلخيص داخل هذا الدرس."
      : "No readable text found inside this lesson yet.";
  }
  const sentences = clean
    .split(/[.!؟?\n]+/)
    .map((s) => s.trim())
    .filter((s) => s.length >= 22);
  const pool = sentences.length > 0 ? sentences : [clean.slice(0, 260)];
  const step = Math.max(1, Math.floor(pool.length / 5));
  const picked = [];
  for (let i = 0; i < pool.length && picked.length < 5; i += step) {
    picked.push(pool[i]);
  }
  const header =
    lang === "ar" ? `ملخص الدرس (${title}):` : `Lesson Summary (${title}):`;
  return `${header}\n${picked.map((s) => `• ${s}`).join("\n")}`;
}

const PLATFORM_KB = [
  {
    keywords: ["assignment", "pdf", "annotate", "annotation", "pen", "eraser", "draw", "handwriting", "واجب", "واجبات", "تدوين", "قلم", "ممحاة", "حل"],
    en: "PDF Assignments & Live Annotation: Teachers upload a PDF worksheet, set total marks (pts), and set a Due Date/Time (past dates blocked). Students click 'Open Live Annotation & Answer' to write freely with Pen, Highlighter, Text, Undo/Redo & Eraser before the deadline. After due date passes, answering locks automatically. Teachers click 'Review & Correct PDF' to draw corrections and award points.",
    ar: "الواجبات والتعليق الحر: يرفع المعلم ملف PDF للواجب ويحدد الدرجة الكاملة وموعد الإغلاق. يجيب الطالب داخل نافذة الكتابة الحرة بالقلم والتظليل والنص والممحاة قبل انتهاء الموعد (يُغلق تلقائياً بعد الموعد). بعدها يضغط المعلم على «مراجعة وتصحيح الحل» لوضع التصحيح ورصد النقاط.",
  },
  {
    keywords: ["lesson", "notebook", "private", "lesson pdf", "notes", "درس", "دروس", "ملاحظات", "خاصة"],
    en: "Lesson PDFs & Private Notebook: Teachers upload lesson PDFs under 'Lesson PDFs'. Students can open any lesson PDF, annotate freely with pen/highlighter/text/eraser, and save personal study notes — saved privately to that student's own account only.",
    ar: "ملفات الدروس والملاحظات الخاصة: يرفع المحاضر الدروس بصيغة PDF في صفحة «ملفات الدروس PDF». يمكن للطالب فتح الدرس والتدوين والتظليل وحفظ ملاحظاته الدراسية وتُحفظ له وحده بشكل خاص.",
  },
  {
    keywords: ["quiz", "screenshot", "privacy", "retake", "timer", "multiple", "اختبار", "اختبارات", "تصوير", "خصوصية", "اعادة", "وقت"],
    en: "Timed Privacy-Protected Quizzes: Quizzes use minute timers, single or multiple-choice answers, and integer point scoring (1, 2, 3... pts). Students get one entry unless they send a Retake Request approved by the instructor. During an active quiz, screenshot shortcuts, print, copy, and tab switching trigger a 'Content Privacy Restricted' shield.",
    ar: "الاختبارات المحمية: تُضبط مدة الاختبار بالدقائق وتدعم إجابة واحدة أو عدة إجابات وتُحسب بالنقاط (1، 2، 3...). يدخل الطالب مرة واحدة ما لم يطلب إعادة الاختبار ويوافق المحاضر. أثناء الاختبار، يتم حجب التصوير والطباعة والنسخ ومغادرة النافذة برسالة «المحتوى محمي — قيود الخصوصية».",
  },
  {
    keywords: ["scoreboard", "top", "rank", "certificate", "gold", "silver", "bronze", "signature", "لوحة", "المتصدرين", "شهادة", "شهادات", "ذهبية", "توقيع"],
    en: "Points Scoreboard & Top-3 Certificates: Each course ranks the Top 5 students by total points earned (Quiz pts + Assignment pts). Only Instructors and Admins can print PDF certificates for the Top 3 ranks (1st Gold, 2nd Silver-Indigo, 3rd Bronze-Teal), signed with the course instructor's cursive signature. Students have a clean view-only scoreboard.",
    ar: "لوحة المتصدرين والشهادات: تعرض أفضل 5 طلاب في كل مقرر حسب مجموع النقاط (الاختبارات + الواجبات). طباعة شهادات PDF متاحة للمراكز الثلاثة الأولى فقط (الأول ذهبية، الثاني فضية، الثالث برونزية) بتوقيع المحاضر ومن لوحة المحاضر فقط، بينما تكون لوحة الطالب للعرض فقط.",
  },
  {
    keywords: ["progress", "tracker", "progress tracker", "report", "interval", "from date", "to date", "تقدم", "تقرير", "تقارير", "فترة"],
    en: "Student Progress Tracker: Instructors open 'Progress Tracker', pick any student and a From/To date interval (To Date cannot precede From Date) to review all recorded quiz marks, assignment submissions, retake logs, and points chart, then export a styled PDF or CSV report.",
    ar: "متتبع تقدم الطالب: يختار المحاضر الطالب والفترة الزمنية (من / إلى، مع منع اختيار تاريخ نهاية قبل البداية) لعرض جميع سجلّات الدرجات والواجبات والنقاط واستخراج تقرير PDF أو CSV احترافي.",
  },
  {
    keywords: ["sound", "click", "theme", "dark", "light", "language", "arabic", "english", "notification", "صوت", "وضع", "ليلي", "لغة", "اشعارات"],
    en: "UI Controls: Every platform click has subtle audio (mute/unmute via the speaker icon in the top header), login plays a success chime, and you can switch Arabic/English or Light/Dark liquid-glass modes from the top bar alongside real-time Notifications.",
    ar: "أدوات الواجهة: تصدر النقرات صوتاً لطيفاً مع زر كتم/تفعيل في الشريط العلوي، ونغمة نجاح عند تسجيل الدخول، كما يمكنك تبديل العربية/الإنجليزية والوضع الفاتح/الداكن ومتابعة الإشعارات الفورية من الشريط العلوي.",
  },
  {
    keywords: ["register", "approval", "join", "instructor", "switch", "تسجيل", "موافقة", "محاضر"],
    en: "Registration & Instructor Filtering: Students pick one or more instructors during sign-up and wait for instructor acceptance before signing in. On login, students pick which approved instructor workspace to open, filtering all courses, lesson PDFs, assignments, quizzes, and scoreboards.",
    ar: "التسجيل واختيار المحاضر: يختار الطالب محاضراً أو أكثر عند التسجيل وينتظر الموافقة قبل الدخول، وبعد تسجيل الدخول يختار المحاضر الذي يريد عرض مقرراته ودروسه وواجباته واختباراته ولوحة متصدريه.",
  },
];

function buildStudentMetricsSummary(student, dataset, lang) {
  const enrolledCourses = dataset.courses.filter((c) =>
    Array.isArray(c.enrolledStudents) ? c.enrolledStudents.includes(student.uid) : false
  );
  const stuResults = dataset.results.filter((r) => r.studentId === student.uid);
  const quizPts = stuResults.reduce((s, r) => s + getQuizEarnedPoints(r), 0);
  const avgQuizPct =
    stuResults.length > 0
      ? Math.round(stuResults.reduce((s, r) => s + (Number(r.score) || 0), 0) / stuResults.length)
      : 0;

  let assignSubmitted = 0;
  let assignGraded = 0;
  let assignPts = 0;
  dataset.assignments.forEach((a) => {
    const sub = (a.submissions || []).find((s) => (s.studentId || s.id) === student.uid);
    if (sub) {
      assignSubmitted += 1;
      if (sub.score !== undefined && sub.score !== null && sub.score !== "") {
        assignGraded += 1;
        assignPts += Number(sub.score) || 0;
      }
    }
  });

  const totalPts = quizPts + assignPts;
  const recentQuizzes = stuResults
    .slice(0, 4)
    .map((r) => `${r.quizTitle || r.quizId}: ${getQuizEarnedPoints(r)}/${r.total || 1} pts (${r.score}%)`)
    .join(" | ");

  if (lang === "ar") {
    return [
      `بيانات الطالب: ${student.displayName || student.email} (${student.email})`,
      `• إجمالي النقاط المكتسبة: ${totalPts} نقطة (الاختبارات: ${quizPts} نقطة، الواجبات: ${assignPts} نقطة)`,
      `• المقررات المسجّل بها: ${enrolledCourses.length} (${enrolledCourses.map((c) => c.title?.ar || c.title?.en).join("، ") || "لا يوجد"})`,
      `• الاختبارات المُنجزة: ${stuResults.length} (متوسط النسبة: ${avgQuizPct}%)`,
      `• الواجبات المسلمة: ${assignSubmitted} (المُصحّحة: ${assignGraded})`,
      recentQuizzes ? `• أحدث الاختبارات: ${recentQuizzes}` : "",
    ]
      .filter(Boolean)
      .join("\n");
  }

  return [
    `Student Record: ${student.displayName || student.email} (${student.email})`,
    `• Total Points Earned: ${totalPts} pts (Quizzes: ${quizPts} pts, Assignments: ${assignPts} pts)`,
    `• Enrolled Courses (${enrolledCourses.length}): ${enrolledCourses.map((c) => c.title?.en || c.title?.ar).join(", ") || "None"}`,
    `• Quizzes Completed: ${stuResults.length} (Avg: ${avgQuizPct}%)`,
    `• Assignments Submitted: ${assignSubmitted} (Graded: ${assignGraded})`,
    recentQuizzes ? `• Recent Quiz Marks: ${recentQuizzes}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

function buildContextSummaryText(dataset, lang) {
  const courseLines = dataset.courses.slice(0, 15).map((c) => {
    const title = c.title?.[lang] || c.title?.en || c.id;
    const lessonNames = (c.lessons || []).map((l) => l.title?.[lang] || l.title?.en).join(", ");
    const pdfNames = dataset.materials
      .filter((m) => m.courseId === c.id)
      .map((m) => m.title)
      .join(", ");
    return `- Course "${title}": ${(c.enrolledStudents || []).length} enrolled students. Text lessons: [${lessonNames || "none"}]. PDF lessons: [${pdfNames || "none"}].`;
  });

  const assnLines = dataset.assignments.slice(0, 12).map((a) => {
    return `- Assignment "${a.title}" (Max ${a.maxMarks || 10} pts, Due: ${a.dueDate || "open"}, Submissions: ${a.submissions?.length || 0})`;
  });

  const quizLines = dataset.quizzes.slice(0, 12).map((q) => {
    return `- Quiz "${q.title}" (${q.status}, ${(q.questions || []).length} Qs, ${q.durationMinutes || 10} min)`;
  });

  const studentLines = dataset.students.slice(0, 20).map((s) => {
    const sRes = dataset.results.filter((r) => r.studentId === s.uid);
    const qPts = sRes.reduce((sum, r) => sum + getQuizEarnedPoints(r), 0);
    let aPts = 0;
    dataset.assignments.forEach((a) => {
      const sub = (a.submissions || []).find((x) => (x.studentId || x.id) === s.uid);
      if (sub && sub.score !== undefined && sub.score !== null) aPts += Number(sub.score) || 0;
    });
    return `- Student ${s.displayName || s.email} (${s.email}): ${qPts + aPts} total pts (${qPts} quiz pts, ${aPts} assignment pts, ${sRes.length} quizzes)`;
  });

  return [
    `COURSES (${dataset.courses.length}):\n${courseLines.join("\n") || "None"}`,
    `ASSIGNMENTS (${dataset.assignments.length}):\n${assnLines.join("\n") || "None"}`,
    `QUIZZES (${dataset.quizzes.length}):\n${quizLines.join("\n") || "None"}`,
    `STUDENTS (${dataset.students.length}):\n${studentLines.join("\n") || "None"}`,
  ].join("\n\n");
}

function computeTopCourseBoards(dataset, lang) {
  return dataset.courses.map((c) => {
    const map = {};
    dataset.results
      .filter((r) => r.courseId === c.id)
      .forEach((r) => {
        if (!map[r.studentId]) map[r.studentId] = { name: r.studentName || r.studentId, pts: 0 };
        map[r.studentId].pts += getQuizEarnedPoints(r);
      });
    dataset.assignments
      .filter((a) => a.courseId === c.id)
      .forEach((a) => {
        (a.submissions || []).forEach((sub) => {
          if (sub.score !== undefined && sub.score !== null && sub.score !== "") {
            const sid = sub.studentId || sub.id;
            if (!map[sid]) map[sid] = { name: sub.studentName || sid, pts: 0 };
            map[sid].pts += Number(sub.score) || 0;
          }
        });
      });
    const ranked = Object.values(map).sort((a, b) => b.pts - a.pts).slice(0, 5);
    return {
      courseTitle: c.title?.[lang] || c.title?.en || c.id,
      top5: ranked,
    };
  });
}

function searchLessonContentQA(message, dataset, lang) {
  const keywords = extractKeywords(message);
  if (keywords.length === 0) return null;

  let bestHit = null;
  let bestScore = 0;

  dataset.lessons.forEach((lesson) => {
    const fullText = `${lesson.title} ${lesson.text || ""}`;
    const sentences = fullText
      .split(/[.!؟?\n]+/)
      .map((s) => s.trim())
      .filter((s) => s.length >= 20);

    const matchingSentences = [];
    let lessonScore = 0;
    sentences.forEach((sent) => {
      const low = normalizeText(sent);
      let sScore = 0;
      keywords.forEach((kw) => {
        if (low.includes(kw)) sScore += 10 + kw.length;
      });
      if (sScore > 0) {
        lessonScore += sScore;
        matchingSentences.push({ sent, sScore });
      }
    });

    if (lessonScore > bestScore && matchingSentences.length > 0) {
      bestScore = lessonScore;
      matchingSentences.sort((a, b) => b.sScore - a.sScore);
      bestHit = {
        lessonTitle: lesson.title,
        courseTitle: lesson.courseTitle,
        excerpts: matchingSentences.slice(0, 3).map((x) => x.sent),
      };
    }
  });

  if (!bestHit || bestScore < 14) return null;

  return lang === "ar"
    ? `من درس "${bestHit.lessonTitle}" (${bestHit.courseTitle}):\n${bestHit.excerpts
        .map((e) => `• ${e}`)
        .join("\n")}`
    : `From lesson "${bestHit.lessonTitle}" (${bestHit.courseTitle}):\n${bestHit.excerpts
        .map((e) => `• ${e}`)
        .join("\n")}`;
}

function searchPlatformKB(message, lang) {
  const keywords = extractKeywords(message);
  if (keywords.length === 0) return null;
  const msgNorm = normalizeText(message);

  let best = null;
  let bestScore = 0;

  PLATFORM_KB.forEach((entry) => {
    let score = 0;
    entry.keywords.forEach((kw) => {
      if (kw.includes(" ") && msgNorm.includes(kw)) {
        score += 18;
      } else if (keywords.includes(kw)) {
        score += 15;
      } else if (
        kw.length >= 4 &&
        keywords.some((t) => t.length >= 4 && (kw.includes(t) || t.includes(kw)))
      ) {
        score += 8;
      }
    });
    if (score > bestScore) {
      bestScore = score;
      best = entry;
    }
  });

  if (!best || bestScore < 14) return null;
  return lang === "ar" ? best.ar : best.en;
}

export async function executeDirectQuizCreation({
  lesson,
  course,
  user,
  lang,
  count = 5,
  durationMinutes = 10,
  createQuizFn,
  useNetwork = true,
}) {
  const sourceText = (
    lesson?.text && lesson.text.trim().length >= 20
      ? lesson.text
      : `${lesson?.title || ""} ${
          course?.description?.[lang] || course?.description?.en || course?.title?.en || ""
        }`
  ).trim();

  let generatedQuestions = [];
  if (useNetwork) {
    try {
      const res = await axios.post(
        "http://localhost:3001/api/quiz/generate",
        {
          text:
            sourceText.length >= 20
              ? sourceText
              : `${lesson?.title || "Lesson"} core concepts and objectives.`,
          lang,
          courseId: course.id,
          count,
        },
        { timeout: 45000 }
      );
      if (Array.isArray(res.data?.questions) && res.data.questions.length > 0) {
        generatedQuestions = res.data.questions;
      }
    } catch {
      // fallback below
    }
  }

  if (generatedQuestions.length === 0) {
    generatedQuestions = buildFallbackQuestions(sourceText, lang, count);
  }

  const quizTitle =
    lang === "ar" ? `اختبار: ${lesson.titleAr || lesson.title}` : `Quiz: ${lesson.title}`;

  const created = await createQuizFn({
    courseId: course.id,
    lessonId: lesson.id,
    title: quizTitle,
    durationMinutes: Number(durationMinutes) || 10,
    instructorId: course.instructorId || user.uid,
    questions: generatedQuestions,
    status: "published",
  });

  return {
    reply:
      lang === "ar"
        ? `تم إنشاء ونشر الاختبار "${quizTitle}" للطلاب مباشرة (${generatedQuestions.length} أسئلة، المدة ${durationMinutes} دقيقة) استناداً إلى الدرس "${lesson.titleAr || lesson.title}".`
        : `Created & published "${quizTitle}" directly for students (${generatedQuestions.length} questions, ${durationMinutes} min) based on "${lesson.title}".`,
    actionCard: {
      type: "quiz_created",
      quizId: created.id,
      title: quizTitle,
      courseTitle: course.title?.[lang] || course.title?.en || course.id,
      questionCount: generatedQuestions.length,
      link: user.role === "admin" ? "/admin/quizzes" : "/instructor/quizzes",
    },
  };
}

async function summarizeLessonViaAI(lesson, lang, useNetwork = true) {
  if (!lesson.text || lesson.text.trim().length < 15) {
    return {
      reply:
        lang === "ar"
          ? `الدرس "${lesson.titleAr || lesson.title}" لا يحتوي على نص كافٍ للتلخيص.`
          : `Lesson "${lesson.title}" does not have enough readable text to summarize yet.`,
    };
  }
  if (useNetwork) {
    try {
      const res = await axios.post(
        "http://localhost:3001/api/chat",
        {
          mode: "summarize",
          lang,
          lessonTitle: lesson.title,
          lessonText: lesson.text,
        },
        { timeout: 30000 }
      );
      if (res.data?.reply) {
        return { reply: res.data.reply };
      }
    } catch {
      // fallback below
    }
  }
  return {
    reply: localSummarizeText(lesson.text, lang, lesson.title),
  };
}

export async function processChatbotMessageWithDataset({
  message,
  user,
  lang = "en",
  history = [],
  explicitAction = null,
  dataset,
  createQuizFn,
  useNetwork = true,
}) {
  const role = user?.role || dataset.role || "student";
  const canAuthorQuiz = role === "instructor" || role === "admin";
  const displayName = user?.displayName || user?.username || "";

  if (explicitAction?.type === "create_quiz" && canAuthorQuiz) {
    const lesson = dataset.lessons.find((l) => l.id === explicitAction.lessonId);
    const course = dataset.courses.find((c) => c.id === lesson?.courseId);
    if (lesson && course) {
      return executeDirectQuizCreation({
        lesson,
        course,
        user,
        lang,
        count: explicitAction.count || 5,
        durationMinutes: explicitAction.durationMinutes || 10,
        createQuizFn,
        useNetwork,
      });
    }
  }

  if (explicitAction?.type === "summarize_lesson") {
    const lesson = dataset.lessons.find((l) => l.id === explicitAction.lessonId);
    if (lesson) {
      return summarizeLessonViaAI(lesson, lang, useNetwork);
    }
  }

  const msgTrim = String(message || "").trim();
  const msgLower = msgTrim.toLowerCase();

  if (
    /^(hi|hello|hey|good morning|good evening|thanks|thank you|who are you|help|مرحبا|أهلا|اهلا|السلام عليكم|صباح الخير|مساء الخير|شكرا|شكراً|من انت|مساعدة)[!؟?.\s]*$/i.test(
      msgTrim
    )
  ) {
    if (lang === "ar") {
      return {
        reply: canAuthorQuiz
          ? `أهلاً بك${displayName ? ` يا ${displayName}` : ""}! أنا المساعد الذكي للمنصة. يمكنك أن تطلب مني:\n• "اعمل اختبار على درس <اسم الدرس>"\n• "بيانات ودرجات الطالب <الاسم>"\n• "عرض ترتيب المتصدرين أو تفاصيل المقررات"`
          : `أهلاً بك${displayName ? ` يا ${displayName}` : ""}! أنا مساعدك الذكي. اسألني عن:\n• "لخّص درس <اسم الدرس>"\n• "كم مجموع نقاطي ودرجاتي؟"\n• "ما الواجبات المتاحة أو كيف أستخدم المنصة؟"`,
      };
    }
    return {
      reply: canAuthorQuiz
        ? `Hello${displayName ? ` ${displayName}` : ""}! I'm the Platform Smart Assistant. You can ask me:\n• "Make a quiz for students on lesson <name>"\n• "Tell me about student <name>"\n• "Show Top 5 scoreboard or courses summary"`
        : `Hello${displayName ? ` ${displayName}` : ""}! I'm your Platform Study Assistant. Try asking:\n• "Summarize lesson <name>"\n• "Show my points, quiz marks & assignments"\n• "How do Live Annotation assignments or quizzes work?"`,
    };
  }

  const wantsQuizCreate =
    canAuthorQuiz &&
    /(make|create|generate|build|prepare|add|write|اعمل|انشئ|أنشئ|جهز|سوي|اصنع)/i.test(msgLower) &&
    /(quiz|test|exam|questions|اختبار|كويز|امتحان|اسئلة|أسئلة)/i.test(msgLower);

  if (wantsQuizCreate) {
    const durMatch = msgLower.match(/(\d{1,3})\s*(min|minute|minutes|دقيق|دقائق)/i);
    const requestedDuration = durMatch ? Math.min(Math.max(Number(durMatch[1]), 1), 180) : 10;
    const countMatch =
      msgLower.match(/(\d{1,2})\s*(q|question|questions|سؤال|اسئل|أسئل)/i) ||
      msgLower.match(/\b(\d{1,2})\b/);
    const requestedCount = countMatch ? Math.min(Math.max(Number(countMatch[1]), 3), 15) : 5;

    let matchedLesson = findBestMatch(message, dataset.lessons, (l) => `${l.title} ${l.titleAr}`);
    if (!matchedLesson) {
      const matchedCourse = findBestMatch(
        message,
        dataset.courses,
        (c) => `${c.title?.en || ""} ${c.title?.ar || ""}`
      );
      if (matchedCourse) {
        matchedLesson = dataset.lessons.find((l) => l.courseId === matchedCourse.id) || null;
      }
    }

    if (matchedLesson) {
      const course = dataset.courses.find((c) => c.id === matchedLesson.courseId);
      if (course) {
        return executeDirectQuizCreation({
          lesson: matchedLesson,
          course,
          user,
          lang,
          count: requestedCount,
          durationMinutes: requestedDuration,
          createQuizFn,
          useNetwork,
        });
      }
    }

    if (dataset.lessons.length === 0) {
      return {
        reply:
          lang === "ar"
            ? "لا توجد دروس مسجلة في مقرراتك بعد. أضف درساً في المقرر أو ارفع ملف درس PDF أولاً لأتمكن من إنشاء الاختبار عليه."
            : "You don't have any lessons in your courses yet. Add a lesson or upload a Lesson PDF first so I can generate a quiz from it.",
      };
    }

    return {
      reply:
        lang === "ar"
          ? "اختر الدرس الذي تريد إنشاء الاختبار عليه مباشرة:"
          : "Pick the lesson you want me to generate & publish a quiz on:",
      quickActions: dataset.lessons.slice(0, 6).map((l) => ({
        type: "create_quiz",
        lessonId: l.id,
        count: requestedCount,
        durationMinutes: requestedDuration,
        label: `${l.title} (${l.courseTitle})`,
      })),
    };
  }

  const wantsSummarize = /(summarize|summary|sum up|ملخص|لخص|لخّص|تلخيص)/i.test(msgLower);
  if (wantsSummarize) {
    const matchedLesson = findBestMatch(message, dataset.lessons, (l) => `${l.title} ${l.titleAr}`);
    if (matchedLesson) {
      return summarizeLessonViaAI(matchedLesson, lang, useNetwork);
    }
    if (dataset.lessons.length === 0) {
      return {
        reply:
          lang === "ar"
            ? "لا توجد دروس متاحة للتلخيص حالياً."
            : "There are no lessons available to summarize yet.",
      };
    }
    return {
      reply:
        lang === "ar"
          ? "أي درس تريدني أن ألخّصه لك؟ اختر من القائمة:"
          : "Which lesson would you like me to summarize? Choose one below:",
      quickActions: dataset.lessons.slice(0, 6).map((l) => ({
        type: "summarize_lesson",
        lessonId: l.id,
        label: `${l.title} (${l.courseTitle})`,
      })),
    };
  }

  if (
    role === "student" &&
    /(my |me\b|score|grade|point|mark|result|نقاطي|درجاتي|نتائجي|مستواي)/i.test(msgLower) &&
    dataset.students[0]
  ) {
    return { reply: buildStudentMetricsSummary(dataset.students[0], dataset, lang) };
  }

  const matchedStudent = findBestMatch(
    message,
    dataset.students,
    (s) => `${s.displayName || ""} ${s.email || ""} ${s.username || ""}`
  );
  if (matchedStudent) {
    return { reply: buildStudentMetricsSummary(matchedStudent, dataset, lang) };
  }

  if (/(all students|list students|how many students|students summary|الطلاب|قائمة الطلاب|عدد الطلاب)/i.test(msgLower)) {
    if (dataset.students.length === 0) {
      return {
        reply: lang === "ar" ? "لا يوجد طلاب مسجلون حالياً في نطاقك." : "No students found in your workspace yet.",
      };
    }
    const listLines = dataset.students.slice(0, 12).map((s) => {
      const sRes = dataset.results.filter((r) => r.studentId === s.uid);
      const qPts = sRes.reduce((sum, r) => sum + getQuizEarnedPoints(r), 0);
      let aPts = 0;
      dataset.assignments.forEach((a) => {
        const sub = (a.submissions || []).find((x) => (x.studentId || x.id) === s.uid);
        if (sub && sub.score !== undefined && sub.score !== null) aPts += Number(sub.score) || 0;
      });
      return `• ${s.displayName || s.email} (${s.email}) — ${qPts + aPts} pts (${sRes.length} quizzes)`;
    });
    return {
      reply:
        lang === "ar"
          ? `الطلاب (${dataset.students.length}):\n${listLines.join("\n")}`
          : `Students (${dataset.students.length}):\n${listLines.join("\n")}`,
    };
  }

  if (/(scoreboard|leaderboard|top student|top 3|top 5|first place|rank|المتصدرين|الاوائل|الأوائل|الترتيب)/i.test(msgLower)) {
    const boards = computeTopCourseBoards(dataset, lang);
    if (boards.length === 0) {
      return {
        reply: lang === "ar" ? "لا توجد مقررات في لوحة المتصدرين حالياً." : "No courses found on the scoreboard yet.",
      };
    }
    const lines = boards.map((b) => {
      const rankStr =
        b.top5.length > 0
          ? b.top5.map((x, idx) => `#${idx + 1} ${x.name} (${x.pts} pts)`).join(" | ")
          : lang === "ar"
          ? "لا توجد نقاط بعد"
          : "No scores yet";
      return `• ${b.courseTitle}: ${rankStr}`;
    });
    return {
      reply:
        lang === "ar"
          ? `لوحة المتصدرين (أفضل 5 بالنقاط):\n${lines.join("\n")}`
          : `Live Course Scoreboard (Top 5 by Points):\n${lines.join("\n")}`,
    };
  }

  const matchedCourse = findBestMatch(
    message,
    dataset.courses,
    (c) => `${c.title?.en || ""} ${c.title?.ar || ""}`
  );
  if (matchedCourse) {
    const cTitle = matchedCourse.title?.[lang] || matchedCourse.title?.en || matchedCourse.id;
    const textLessons = (matchedCourse.lessons || []).map((l) => l.title?.[lang] || l.title?.en);
    const pdfLessons = dataset.materials.filter((m) => m.courseId === matchedCourse.id).map((m) => m.title);
    const cAssn = dataset.assignments.filter((a) => a.courseId === matchedCourse.id);
    const cQuizzes = dataset.quizzes.filter((q) => q.courseId === matchedCourse.id);
    const enrolledCount = (matchedCourse.enrolledStudents || []).length;

    return {
      reply:
        lang === "ar"
          ? `تفاصيل المقرر "${cTitle}":\n• المحاضر: ${matchedCourse.instructorName || "محاضر المنصة"}\n• الطلاب المسجلون: ${enrolledCount}\n• الدروس النصية (${textLessons.length}): ${textLessons.join("، ") || "لا يوجد"}\n• دروس PDF (${pdfLessons.length}): ${pdfLessons.join("، ") || "لا يوجد"}\n• الواجبات: ${cAssn.length} | الاختبارات: ${cQuizzes.length}`
          : `Course "${cTitle}":\n• Instructor: ${matchedCourse.instructorName || "Platform Instructor"}\n• Enrolled Students: ${enrolledCount}\n• Text Lessons (${textLessons.length}): ${textLessons.join(", ") || "None"}\n• PDF Lessons (${pdfLessons.length}): ${pdfLessons.join(", ") || "None"}\n• Assignments: ${cAssn.length} | Quizzes: ${cQuizzes.length}`,
    };
  }

  if (/(courses|what courses|list courses|my courses|مقررات|كورسات|المواد)/i.test(msgLower)) {
    if (dataset.courses.length === 0) {
      return {
        reply: lang === "ar" ? "لا توجد مقررات متاحة حالياً." : "No courses available in this scope yet.",
      };
    }
    const lines = dataset.courses.map((c) => {
      const t = c.title?.[lang] || c.title?.en || c.id;
      const lCount = (c.lessons || []).length + dataset.materials.filter((m) => m.courseId === c.id).length;
      return `• ${t} — ${(c.enrolledStudents || []).length} enrolled · ${lCount} lesson(s)`;
    });
    return {
      reply:
        lang === "ar"
          ? `المقررات المتاحة (${dataset.courses.length}):\n${lines.join("\n")}`
          : `Courses (${dataset.courses.length}):\n${lines.join("\n")}`,
    };
  }

  if (/(assignment|assignments|due|deadline|homework|واجب|واجبات|تكليف)/i.test(msgLower) && !/(how|explain|what is|كيف|ازاي)/i.test(msgLower)) {
    if (dataset.assignments.length === 0) {
      return {
        reply: lang === "ar" ? "لا توجد واجبات حالياً." : "No assignments posted yet.",
      };
    }
    const lines = dataset.assignments.slice(0, 10).map((a) => {
      const c = dataset.courses.find((cr) => cr.id === a.courseId);
      const cTitle = c?.title?.[lang] || c?.title?.en || a.courseId;
      if (role === "student") {
        const mySub = (a.submissions || []).find((s) => (s.studentId || s.id) === user?.uid);
        const stStatus = mySub
          ? mySub.score !== undefined
            ? `Graded (${mySub.score}/${a.maxMarks || 10} pts)`
            : "Submitted (Pending Grade)"
          : "Not submitted";
        return `• ${a.title} (${cTitle}) — Max ${a.maxMarks || 10} pts · Due: ${a.dueDate || "Open"} · ${stStatus}`;
      }
      const ungraded = (a.submissions || []).filter((s) => s.score === undefined).length;
      return `• ${a.title} (${cTitle}) — Max ${a.maxMarks || 10} pts · Due: ${a.dueDate || "Open"} · ${a.submissions?.length || 0} submissions (${ungraded} ungraded)`;
    });
    return {
      reply:
        lang === "ar"
          ? `الواجبات (${dataset.assignments.length}):\n${lines.join("\n")}`
          : `Assignments (${dataset.assignments.length}):\n${lines.join("\n")}`,
    };
  }

  if (/(quizzes|list quiz|retake|اختبارات|اعادة الاختبار)/i.test(msgLower) && !/(how|privacy|screenshot|كيف|خصوصية)/i.test(msgLower)) {
    let pendingRetakes = 0;
    Object.values(dataset.quizAccess || {}).forEach((stuMap) => {
      Object.values(stuMap || {}).forEach((entry) => {
        if (entry?.retakeStatus === "pending") pendingRetakes += 1;
      });
    });

    if (dataset.quizzes.length === 0) {
      return {
        reply: lang === "ar" ? "لا توجد اختبارات حالياً." : "No quizzes found yet.",
      };
    }
    const lines = dataset.quizzes.slice(0, 10).map((q) => {
      return `• ${q.title} — ${q.status} · ${(q.questions || []).length} Qs · ${q.durationMinutes || 10} min`;
    });
    const extra =
      canAuthorQuiz && pendingRetakes > 0
        ? lang === "ar"
          ? `\nطلبات إعادة الاختبار المعلقة: ${pendingRetakes}`
          : `\nPending retake requests: ${pendingRetakes}`
        : "";
    return {
      reply:
        (lang === "ar"
          ? `الاختبارات (${dataset.quizzes.length}):\n${lines.join("\n")}`
          : `Quizzes (${dataset.quizzes.length}):\n${lines.join("\n")}`) + extra,
    };
  }

  if (/(instructor|instructors|teacher|teachers|محاضر|محاضرين|مدرس)/i.test(msgLower) && !/(how|register|كيف|تسجيل)/i.test(msgLower)) {
    if (!dataset.instructors || dataset.instructors.length === 0) {
      return {
        reply: lang === "ar" ? "لا يوجد محاضرون مسجلون بعد." : "No active instructors found yet.",
      };
    }
    const lines = dataset.instructors.map((i) => {
      const name = i.name?.[lang] || i.displayName || i.email;
      const spec = i.specialization?.[lang] || "";
      return `• ${name}${spec ? ` — ${spec}` : ""}`;
    });
    return {
      reply:
        lang === "ar"
          ? `المحاضرون (${dataset.instructors.length}):\n${lines.join("\n")}`
          : `Platform Instructors (${dataset.instructors.length}):\n${lines.join("\n")}`,
    };
  }

  const lessonAnswer = searchLessonContentQA(message, dataset, lang);
  if (lessonAnswer) {
    return { reply: lessonAnswer };
  }

  const kbAnswer = searchPlatformKB(message, lang);
  if (kbAnswer) {
    return { reply: kbAnswer };
  }

  if (useNetwork) {
    const contextSummary = buildContextSummaryText(dataset, lang);
    try {
      const res = await axios.post(
        "http://localhost:3001/api/chat",
        {
          role,
          lang,
          mode: "qa",
          message,
          history,
          contextSummary,
        },
        { timeout: 30000 }
      );
      if (res.data?.reply) {
        return { reply: res.data.reply };
      }
    } catch {
      // fallback below
    }
  }

  return {
    reply:
      lang === "ar"
        ? "لم أتمكن من مطابقة سؤالك مع سجل محدد في المنصة. يمكنك سؤالي عن اسم طالب، اسم مقرر، تلخيص درس، لوحة المتصدرين، أو طلب إنشاء اختبار على درس."
        : "I couldn't find an exact match for that in the platform records. Try asking about a specific student, course, lesson summary, scoreboard, or ask me to create a quiz on a lesson.",
  };
}
