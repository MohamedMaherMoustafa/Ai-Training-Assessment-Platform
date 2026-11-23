import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

const { processChatbotMessageWithDataset } = await import(
  "../client/src/utils/chatbotCore.js"
);
const chatRouter = require("../llm-proxy/routes/chat.js");
const assignmentRouter = require("../llm-proxy/routes/assignment.js");

const SAMPLE_DATASET = {
  role: "instructor",
  courses: [
    {
      id: "c_ai",
      title: { en: "Applied AI Systems", ar: "أنظمة الذكاء الاصطناعي" },
      description: { en: "Neural networks and REST APIs for AI", ar: "الشبكات العصبية" },
      instructorId: "inst_1",
      instructorName: "Dr. Sarah Ahmed",
      enrolledStudents: ["stu_1", "stu_2", "stu_3"],
      lessons: [
        {
          id: "l_rest",
          title: { en: "REST API Fundamentals", ar: "أساسيات REST API" },
          content:
            "REST stands for Representational State Transfer. HTTP methods include GET for reading, POST for creating, PUT for updating, and DELETE for removing resources. Status code 200 means OK and 404 means Not Found.",
        },
      ],
    },
  ],
  materials: [
    {
      id: "mat_nn",
      courseId: "c_ai",
      instructorId: "inst_1",
      title: "Deep Learning Slides PDF",
      description: "Backpropagation and activation functions",
      extractedText:
        "Neural networks consist of input, hidden, and output layers. ReLU is a popular non-linear activation function. Backpropagation computes gradients using the chain rule to minimize loss during training.",
    },
  ],
  lessons: [
    {
      id: "l_rest",
      kind: "course_lesson",
      title: "REST API Fundamentals",
      titleAr: "أساسيات REST API",
      courseId: "c_ai",
      courseTitle: "Applied AI Systems",
      instructorId: "inst_1",
      text: "REST stands for Representational State Transfer. HTTP methods include GET for reading, POST for creating, PUT for updating, and DELETE for removing resources. Status code 200 means OK and 404 means Not Found.",
    },
    {
      id: "mat_nn",
      kind: "lesson_pdf",
      title: "Deep Learning Slides PDF",
      titleAr: "Deep Learning Slides PDF",
      courseId: "c_ai",
      courseTitle: "Applied AI Systems",
      instructorId: "inst_1",
      text: "Neural networks consist of input, hidden, and output layers. ReLU is a popular non-linear activation function. Backpropagation computes gradients using the chain rule to minimize loss during training.",
    },
  ],
  quizzes: [
    {
      id: "qz_1",
      title: "REST Midterm",
      courseId: "c_ai",
      status: "published",
      durationMinutes: 15,
      questions: [{ id: "q1" }, { id: "q2" }, { id: "q3" }, { id: "q4" }, { id: "q5" }, { id: "q6" }],
    },
  ],
  assignments: [
    {
      id: "assn_1",
      courseId: "c_ai",
      title: "Architecture Worksheet 1",
      maxMarks: 10,
      dueDate: "2026-12-01",
      submissions: [
        { studentId: "stu_1", studentName: "Zyad Mahmoud", score: 9 },
        { studentId: "stu_2", studentName: "Adham Ali", score: 7 },
      ],
    },
  ],
  results: [
    {
      id: "res_1",
      studentId: "stu_1",
      studentName: "Zyad Mahmoud",
      quizId: "qz_1",
      quizTitle: "REST Midterm",
      courseId: "c_ai",
      points: 6,
      total: 6,
      score: 100,
    },
    {
      id: "res_2",
      studentId: "stu_2",
      studentName: "Adham Ali",
      quizId: "qz_1",
      quizTitle: "REST Midterm",
      courseId: "c_ai",
      points: 5,
      total: 6,
      score: 83,
    },
  ],
  students: [
    { uid: "stu_1", displayName: "Zyad Mahmoud", username: "zyad", email: "zyad@academy.com" },
    { uid: "stu_2", displayName: "Adham Ali", username: "adham", email: "adham@academy.com" },
    { uid: "stu_3", displayName: "Malak Hassan", username: "malak", email: "malak@academy.com" },
  ],
  instructors: [
    {
      uid: "inst_1",
      displayName: "Dr. Sarah Ahmed",
      specialization: { en: "Artificial Intelligence", ar: "الذكاء الاصطناعي" },
    },
  ],
  quizAccess: {
    qz_1: {
      stu_2: { retakeStatus: "pending" },
    },
  },
};

const INSTRUCTOR_USER = { uid: "inst_1", role: "instructor", displayName: "Dr. Sarah Ahmed" };
const STUDENT_USER = { uid: "stu_1", role: "student", displayName: "Zyad Mahmoud", instructorIds: ["inst_1"] };

const results = [];
async function runCase(name, fn) {
  try {
    await fn();
    results.push({ name, status: "PASS" });
    console.log(`PASS: ${name}`);
  } catch (err) {
    results.push({ name, status: "FAIL", error: err.message });
    console.error(`FAIL: ${name} -> ${err.message}`);
    process.exitCode = 1;
  }
}

console.log("=== Running Smart Chatbot & Platform Verification Suite ===\n");

await runCase("1. Greeting EN (role-aware, no random dump)", async () => {
  const res = await processChatbotMessageWithDataset({
    message: "hello",
    user: INSTRUCTOR_USER,
    lang: "en",
    dataset: SAMPLE_DATASET,
    useNetwork: false,
  });
  assert.match(res.reply, /Dr\. Sarah Ahmed/);
  assert.match(res.reply, /Make a quiz/i);
});

await runCase("2. Teacher Direct Quiz Creation on Named Lesson", async () => {
  let savedPayload = null;
  const mockCreateQuiz = async (payload) => {
    savedPayload = payload;
    return { id: "qz_created_1", ...payload };
  };
  const res = await processChatbotMessageWithDataset({
    message: "make a 4 questions quiz for 15 min on lesson REST API Fundamentals",
    user: INSTRUCTOR_USER,
    lang: "en",
    dataset: SAMPLE_DATASET,
    createQuizFn: mockCreateQuiz,
    useNetwork: false,
  });
  assert.ok(savedPayload, "createQuiz should have been invoked directly");
  assert.equal(savedPayload.courseId, "c_ai");
  assert.equal(savedPayload.lessonId, "l_rest");
  assert.equal(savedPayload.durationMinutes, 15);
  assert.equal(savedPayload.questions.length, 4);
  assert.equal(savedPayload.status, "published");
  assert.equal(res.actionCard?.type, "quiz_created");
});

await runCase("3. Teacher Quiz Creation Without Lesson Offers Quick Chips", async () => {
  const res = await processChatbotMessageWithDataset({
    message: "make a quiz for students",
    user: INSTRUCTOR_USER,
    lang: "en",
    dataset: SAMPLE_DATASET,
    useNetwork: false,
  });
  assert.ok(Array.isArray(res.quickActions) && res.quickActions.length === 2);
});

await runCase("4. Student Lookup by Name Returns Exact Points & Marks", async () => {
  const res = await processChatbotMessageWithDataset({
    message: "Tell me about Zyad Mahmoud",
    user: INSTRUCTOR_USER,
    lang: "en",
    dataset: SAMPLE_DATASET,
    useNetwork: false,
  });
  assert.match(res.reply, /Zyad Mahmoud/);
  assert.match(res.reply, /15 pts/); // 6 quiz + 9 assign = 15 pts
  assert.match(res.reply, /Quizzes: 6 pts, Assignments: 9 pts/);
});

await runCase("5. Course Details Query", async () => {
  const res = await processChatbotMessageWithDataset({
    message: "Show details for course Applied AI Systems",
    user: INSTRUCTOR_USER,
    lang: "en",
    dataset: SAMPLE_DATASET,
    useNetwork: false,
  });
  assert.match(res.reply, /Applied AI Systems/);
  assert.match(res.reply, /Enrolled Students: 3/);
  assert.match(res.reply, /Deep Learning Slides PDF/);
});

await runCase("6. Live Scoreboard Top-5 Query", async () => {
  const res = await processChatbotMessageWithDataset({
    message: "Who is on the scoreboard?",
    user: INSTRUCTOR_USER,
    lang: "en",
    dataset: SAMPLE_DATASET,
    useNetwork: false,
  });
  assert.match(res.reply, /#1 Zyad Mahmoud \(15 pts\)/);
  assert.match(res.reply, /#2 Adham Ali \(12 pts\)/);
});

await runCase("7. Lesson Summarization (EN + AR)", async () => {
  // Test 7a: Generic prompt / button click offers ALL available lessons
  const resPicker = await processChatbotMessageWithDataset({
    message: "Summarize a lesson",
    user: STUDENT_USER,
    lang: "en",
    dataset: SAMPLE_DATASET,
    useNetwork: false,
  });
  assert.ok(
    Array.isArray(resPicker.quickActions) && resPicker.quickActions.length === SAMPLE_DATASET.lessons.length,
    "Should return all lessons in quickActions when user asks to summarize a lesson"
  );
  assert.equal(resPicker.quickActions[0].type, "summarize_lesson");

  // Test 7b: User selects a lesson via quick action
  const resChosen = await processChatbotMessageWithDataset({
    message: resPicker.quickActions[0].label,
    user: STUDENT_USER,
    lang: "en",
    dataset: SAMPLE_DATASET,
    explicitAction: resPicker.quickActions[0],
    useNetwork: false,
  });
  assert.match(resChosen.reply, /Lesson Summary/);

  // Test 7c: Direct named lesson summary
  const resEn = await processChatbotMessageWithDataset({
    message: "Summarize Deep Learning Slides PDF",
    user: STUDENT_USER,
    lang: "en",
    dataset: SAMPLE_DATASET,
    useNetwork: false,
  });
  assert.match(resEn.reply, /Lesson Summary/);
  assert.match(resEn.reply, /ReLU|Backpropagation|Neural networks/i);

  const resAr = await processChatbotMessageWithDataset({
    message: "لخص درس REST API Fundamentals",
    user: STUDENT_USER,
    lang: "ar",
    dataset: SAMPLE_DATASET,
    useNetwork: false,
  });
  assert.match(resAr.reply, /ملخص الدرس/);
});

await runCase("8. Lesson Content Conceptual Question Answering", async () => {
  const res = await processChatbotMessageWithDataset({
    message: "What does HTTP status code 404 mean?",
    user: STUDENT_USER,
    lang: "en",
    dataset: SAMPLE_DATASET,
    useNetwork: false,
  });
  assert.match(res.reply, /REST API Fundamentals/);
  assert.match(res.reply, /404 means Not Found/);
});

await runCase("9. Platform Workflow Help (Live Annotation & Screenshot Privacy)", async () => {
  const resAnnot = await processChatbotMessageWithDataset({
    message: "How do I annotate a PDF assignment with pen and eraser?",
    user: STUDENT_USER,
    lang: "en",
    dataset: SAMPLE_DATASET,
    useNetwork: false,
  });
  assert.match(resAnnot.reply, /Live Annotation/);

  const resPriv = await processChatbotMessageWithDataset({
    message: "Why does screenshot show Content Privacy Restricted in quizzes?",
    user: STUDENT_USER,
    lang: "en",
    dataset: SAMPLE_DATASET,
    useNetwork: false,
  });
  assert.match(resPriv.reply, /Content Privacy Restricted/);
});

await runCase("10. Out-of-Scope Query Does NOT Dump Raw Dataset", async () => {
  const res = await processChatbotMessageWithDataset({
    message: "What is the weather on Jupiter tomorrow?",
    user: STUDENT_USER,
    lang: "en",
    dataset: SAMPLE_DATASET,
    useNetwork: false,
  });
  assert.doesNotMatch(res.reply, /PLATFORM FEATURES GUIDE/);
  assert.doesNotMatch(res.reply, /COURSES \(/);
  assert.match(res.reply, /couldn't find an exact match/i);
});

await runCase("11. Backend chat.js Fallback Never Dumps Raw Context", async () => {
  const out = chatRouter._test.buildFallbackReply({
    lang: "en",
    mode: "qa",
    message: "Who is Zyad Mahmoud?",
    contextSummary: "COURSES (1):\n- Course Applied AI\nSTUDENTS (1):\n- Student Zyad Mahmoud: 15 total pts",
  });
  assert.match(out, /Zyad Mahmoud/);
  assert.doesNotMatch(out, /COURSES \(1\)/);

  const unrelated = chatRouter._test.buildFallbackReply({
    lang: "en",
    mode: "qa",
    message: "random banana planet",
    contextSummary: "COURSES (1):\n- Course Applied AI",
  });
  assert.doesNotMatch(unrelated, /COURSES \(1\)/);
});

await runCase("12. Live HTTP Proxy (/health, /api/chat, /api/quiz/generate, /api/feedback)", async () => {
  const healthRes = await fetch("http://localhost:3001/health");
  assert.equal(healthRes.status, 200);
  const healthJson = await healthRes.json();
  assert.equal(healthJson.status, "ok");

  const chatRes = await fetch("http://localhost:3001/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      role: "student",
      lang: "en",
      mode: "qa",
      message: "tell me about Adham Ali",
      contextSummary: "- Student Adham Ali: 12 total pts (5 quiz pts, 7 assignment pts)",
    }),
  });
  assert.equal(chatRes.status, 200);
  const chatJson = await chatRes.json();
  assert.match(chatJson.reply, /Adham Ali/);

  const quizRes = await fetch("http://localhost:3001/api/quiz/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      text: "REST APIs use GET, POST, PUT, and DELETE HTTP methods to manipulate resources.",
      lang: "en",
      count: 3,
    }),
  });
  assert.equal(quizRes.status, 200);
  const quizJson = await quizRes.json();
  assert.ok(Array.isArray(quizJson.questions) && quizJson.questions.length === 3);

  const fbRes = await fetch("http://localhost:3001/api/feedback", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      lang: "en",
      score: 4,
      totalQuestions: 5,
      wrongAnswers: [{ question: "What is PUT?", studentAnswer: "Read", correctAnswer: "Update" }],
    }),
  });
  assert.equal(fbRes.status, 200);
  const fbJson = await fbRes.json();
  assert.ok(fbJson.feedback && fbJson.feedback.length > 10);
});

await runCase("13. Structural Check: Critical Feature Files Exist & Client Dist Built", async () => {
  const required = [
    "client/dist/index.html",
    "client/src/utils/soundEffects.js",
    "client/src/utils/certificateGenerator.js",
    "client/src/utils/progressReportGenerator.js",
    "client/src/utils/pdfPageRenderer.js",
    "client/src/utils/assignmentPdfDownloader.js",
    "client/src/utils/platformChatbotEngine.js",
    "client/src/features/assignments/LiveAnnotationModal.jsx",
    "client/src/features/lessons/LessonLibraryModule.jsx",
    "client/src/features/instructor/StudentProgressTrackerModule.jsx",
    "client/src/features/scoreboard/ScoreboardModule.jsx",
    "client/src/components/common/PlatformChatbotWidget.jsx",
    "llm-proxy/routes/chat.js",
    "llm-training/Modelfile",
    "llm-training/chatbot_knowledge_dataset.jsonl",
  ];
  for (const rel of required) {
    assert.ok(fs.existsSync(path.join(ROOT, rel)), `Missing file: ${rel}`);
  }
});

await runCase("14. PDF Blank Submission Strictly Returns 0 Pts & What-Went-Wrong Report", async () => {
  const blankEvaluation = assignmentRouter._test.gradePdfSemanticFallback({
    assignmentTitle: "Worksheet Unit 2",
    pdfText: "Explain neural network backpropagation and ReLU activation functions",
    instructions: "Answer in detail",
    studentAnswerText: "",
    maxMarks: 20,
    lang: "en",
  });
  assert.equal(blankEvaluation.score, 0, "Blank answer must score strictly 0 points (not 14/20!)");
  assert.ok(Array.isArray(blankEvaluation.whatWentWrong) && blankEvaluation.whatWentWrong.length > 0);
  assert.equal(blankEvaluation.whatWentRight.length, 0);
  assert.match(blankEvaluation.summary, /blank|no answers/i);
  assert.ok(Array.isArray(blankEvaluation.detailedMistakes) && blankEvaluation.detailedMistakes.length > 0);
  assert.ok(blankEvaluation.detailedMistakes[0].whyWrong && blankEvaluation.detailedMistakes[0].correctAnswer);
});

await runCase("15. PDF Answered Submission Returns Proportional Score & Diagnostic What-Went-Wrong / Right", async () => {
  const answeredEvaluation = assignmentRouter._test.gradePdfSemanticFallback({
    assignmentTitle: "Worksheet Unit 2",
    pdfText: "Neural networks consist of input, hidden, and output layers. ReLU is a popular non-linear activation function. Backpropagation computes gradients using the chain rule to minimize loss during training.",
    instructions: "Explain layers and activation functions",
    studentAnswerText: "Neural networks have layers and ReLU activation functions with backpropagation.",
    maxMarks: 20,
    lang: "en",
  });
  assert.ok(answeredEvaluation.score > 0, "Answered worksheet must receive positive points");
  assert.ok(answeredEvaluation.score <= 20, "Score cannot exceed maxMarks");
  assert.ok(Array.isArray(answeredEvaluation.whatWentRight) && answeredEvaluation.whatWentRight.length > 0);
  assert.ok(answeredEvaluation.summary && answeredEvaluation.summary.length > 5);
  assert.ok(Array.isArray(answeredEvaluation.detailedMistakes));
});

await runCase("16. AI Summary Breakdown for Teacher Contains Model Answers & Why Student Was Wrong", async () => {
  const partialEvaluation = assignmentRouter._test.gradePdfSemanticFallback({
    assignmentTitle: "Assignment 1: Foundations of Artificial Intelligence",
    pdfText: "Part A: Concept Matching. Part B: Narrow vs General AI. Part C: Ethics.",
    instructions: "Answer all questions",
    studentAnswerText: "weak ai can make like simple tasks such as filtering while strong...",
    maxMarks: 20,
    lang: "en",
  });
  assert.ok(Array.isArray(partialEvaluation.detailedMistakes) && partialEvaluation.detailedMistakes.length > 0);
  const q1 = partialEvaluation.detailedMistakes.find((m) => m.topicOrQuestion.includes("Part B - Q1"));
  assert.ok(q1, "Must contain diagnostic for Part B - Q1");
  assert.ok(q1.whyWrong && q1.whyWrong.length > 10, "Must explain why student got it wrong");
  assert.ok(q1.correctAnswer && q1.correctAnswer.length > 10, "Must provide the correct model answer");
});

const passed = results.filter((r) => r.status === "PASS").length;
console.log(`\n=== Suite Summary: ${passed}/${results.length} Passed ===`);
if (passed !== results.length) {
  process.exit(1);
}
