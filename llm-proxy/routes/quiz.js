const express = require("express");
const axios = require("axios");
const multer = require("multer");
const pdfParse = require("pdf-parse");
const fs = require("fs");
const path = require("path");

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 15 * 1024 * 1024 } });

const OLLAMA_BASE = process.env.OLLAMA_BASE_URL || "http://localhost:11434";
const PREFERRED_MODEL = process.env.OLLAMA_MODEL || "academy-tutor";
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-3.5-flash";

/**
 * Auto-calculate estimated quiz time in minutes based on difficulty and question types
 */
function calculateEstimatedQuizTime(questions = [], difficulty = "medium") {
  const diff = String(difficulty || "medium").toLowerCase();
  const mcqMins = diff === "easy" ? 1.0 : diff === "hard" ? 2.5 : 1.5;
  const theoMins = diff === "easy" ? 2.5 : diff === "hard" ? 5.0 : 3.5;

  let totalMinutes = 0;
  for (const q of questions) {
    if (q.type === "theoretical") {
      totalMinutes += theoMins;
    } else {
      totalMinutes += mcqMins;
    }
  }

  const minTime = diff === "easy" ? 5 : diff === "hard" ? 15 : 10;
  return Math.max(Math.ceil(totalMinutes), minTime);
}

async function generateQuizWithGemini(text, lang = "en", count = 10, includeTheoretical = true, difficulty = "medium") {
  if (!GEMINI_API_KEY) return null;

  const diffLabel = difficulty === "hard" ? "Advanced / Challenging" : difficulty === "easy" ? "Fundamental / Easy" : "Standard / Medium";

  const prompt = [
    `You are an expert educational exam designer.`,
    `Difficulty Level: ${diffLabel}.`,
    `Language: ${lang === "ar" ? "Arabic" : "English"}.`,
    `Generate exactly ${count} high-quality questions based on the lesson text below.`,
    includeTheoretical
      ? `Include a balanced combination: approx 70% Multiple Choice Questions (type: "mcq") and 30% Theoretical / Conceptual Written Questions (type: "theoretical").`
      : `All questions must be Multiple Choice Questions (type: "mcq").`,
    `Format: Return ONLY a valid JSON object with a "questions" array.`,
    `For Multiple Choice questions (type: "mcq"):`,
    `- "id": string (e.g. "q1")`,
    `- "type": "mcq"`,
    `- "text": string (the question text)`,
    `- "options": array of exactly 4 objects with "id" ("a","b","c","d") and "text"`,
    `- "correctOptionId": "a", "b", "c", or "d"`,
    `For Theoretical questions (type: "theoretical"):`,
    `- "id": string (e.g. "q2")`,
    `- "type": "theoretical"`,
    `- "text": string (thought-provoking explanation, definition, or analysis question)`,
    `- "modelAnswer": string (ideal, comprehensive model answer outlining key facts)`,
    `- "rubric": array of 2 to 4 key conceptual points required for full marks`,
    `- "points": 1`,
    `Lesson Content:\n${text.slice(0, 10000)}`,
  ].join("\n\n");

  const payload = {
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: {
      responseMimeType: "application/json",
      temperature: 0.5,
    },
  };

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;
  const res = await axios.post(url, payload, {
    headers: { "Content-Type": "application/json" },
    timeout: 60000,
  });

  const rawJson = res.data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!rawJson) return null;
  const parsed = JSON.parse(rawJson);
  const questionsList = parsed.questions || parsed.quiz || (Array.isArray(parsed) ? parsed : []);
  return normalizeQuestions(questionsList);
}

function loadPromptTemplate(lang = "en") {
  const file = path.join(__dirname, "..", "prompts", `quiz_${lang}.txt`);
  return fs.existsSync(file) ? fs.readFileSync(file, "utf-8") : "";
}

async function resolveAvailableModel() {
  try {
    const tags = await axios.get(`${OLLAMA_BASE}/api/tags`, { timeout: 2000 });
    const models = Array.isArray(tags.data?.models) ? tags.data.models.map((m) => m.name) : [];
    if (models.length === 0) return null;
    const exact = models.find((m) => m === PREFERRED_MODEL || m.startsWith(`${PREFERRED_MODEL}:`));
    return exact || models[0];
  } catch {
    return null;
  }
}

function normalizeQuestions(rawQuestions = []) {
  return rawQuestions.map((q, idx) => {
    const isTheoretical = q.type === "theoretical" || (!q.options && q.modelAnswer);

    if (isTheoretical) {
      return {
        id: q.id || `q_${Date.now()}_${idx}`,
        type: "theoretical",
        text: q.text || `Theoretical Question ${idx + 1}`,
        modelAnswer: q.modelAnswer || q.answer || "",
        rubric: Array.isArray(q.rubric) ? q.rubric : [],
        points: Number(q.points) || 1,
        allowMultiple: false,
      };
    }

    const opts = Array.isArray(q.options) ? q.options : [];
    const normalizedOpts = ["a", "b", "c", "d"].map((id, oIdx) => ({
      id,
      text: opts[oIdx]?.text || String(opts[oIdx] || `Option ${id.toUpperCase()}`),
    }));
    const validCorrect = ["a", "b", "c", "d"].includes(q.correctOptionId)
      ? q.correctOptionId
      : "a";
    const correctIds = Array.isArray(q.correctOptionIds) && q.correctOptionIds.length > 0
      ? q.correctOptionIds.filter((id) => ["a", "b", "c", "d"].includes(id))
      : [validCorrect];
    return {
      id: q.id || `q_${Date.now()}_${idx}`,
      type: "mcq",
      text: q.text || `Question ${idx + 1}`,
      allowMultiple: correctIds.length > 1 || Boolean(q.allowMultiple),
      options: normalizedOpts,
      correctOptionId: correctIds[0] || "a",
      correctOptionIds: correctIds,
      points: Number(q.points) || 1,
    };
  });
}

/**
 * Grounded local NLP quiz generator used automatically if Ollama runtime
 * is not installed/running on the host yet. Builds bilingual MCQs and
 * theoretical questions based on lesson text.
 */
function generateGroundedLocalQuiz(rawText, lang = "en", count = 10, includeTheoretical = true, difficulty = "medium") {
  const clean = rawText.replace(/\r/g, "").replace(/[#*`>_]/g, " ");
  const sentences = clean
    .split(/[\n.!؟?]+/)
    .map((s) => s.replace(/\s+/g, " ").trim())
    .filter((s) => s.length >= 28 && s.length <= 220);

  const pool = sentences.length > 0 ? sentences : [clean.slice(0, 140).trim()];
  const total = Math.min(Math.max(Number(count) || 10, 1), 30);
  const questions = [];

  const theoTargetCount = includeTheoretical && total >= 3 ? Math.max(1, Math.round(total * 0.25)) : 0;
  const mcqTargetCount = total - theoTargetCount;

  // 1. Generate Multiple Choice Questions
  for (let i = 0; i < mcqTargetCount; i += 1) {
    const fact = pool[i % pool.length];
    const words = fact.split(/\s+/).filter((w) => w.length > 3);
    const keyWord = words[Math.min(Math.floor(words.length / 2), words.length - 1)] || "concept";
    const masked = fact.replace(keyWord, "______");

    const distractors = [];
    for (let j = 1; j <= 3; j += 1) {
      const otherFact = pool[(i + j) % pool.length];
      const otherWords = otherFact.split(/\s+/).filter((w) => w.length > 3 && w !== keyWord);
      const pick =
        otherWords[j % Math.max(otherWords.length, 1)] ||
        (lang === "ar" ? `خيار بديل ${j}` : `Alternative term ${j}`);
      distractors.push(pick);
    }

    const correctIdx = i % 4;
    const optIds = ["a", "b", "c", "d"];
    let dPtr = 0;
    const options = optIds.map((id, idx) => ({
      id,
      text: idx === correctIdx ? keyWord : distractors[dPtr++],
    }));

    const questionText =
      lang === "ar"
        ? `استناداً إلى الدرس، أي مصطلح يكمل العبارة التالية بدقة؟\n"${masked}"`
        : `Based on the lesson, which term accurately completes this statement?\n"${masked}"`;

    questions.push({
      id: `q_${Date.now()}_mcq_${i}`,
      type: "mcq",
      text: questionText,
      allowMultiple: false,
      options,
      correctOptionId: optIds[correctIdx],
      correctOptionIds: [optIds[correctIdx]],
      points: 1,
    });
  }

  // 2. Generate Theoretical / Written Questions
  for (let t = 0; t < theoTargetCount; t += 1) {
    const fact = pool[(mcqTargetCount + t) % pool.length];
    const words = fact.split(/\s+/).filter((w) => w.length > 3);
    const topic = words[0] || (lang === "ar" ? "المفهوم الرئيسي" : "Core Concept");

    const questionText =
      lang === "ar"
        ? `اشرح بالتفصيل المفهوم المرتبط بـ «${topic}» كما ورد في الدرس، مبيناً أهم النقاط والأثر العملي.`
        : `Explain in detail the concept surrounding "${topic}" as presented in the lesson, highlighting its key principles and practical significance.`;

    const rubric = [
      lang === "ar" ? `ذكر تعريف دقيق لمفهوم ${topic}` : `Accurate definition of ${topic}`,
      lang === "ar" ? "شرح آلية العمل أو الخصائص الأساسية" : "Explanation of core mechanism or key characteristics",
      lang === "ar" ? "استخدام المصطلحات العلمية المناسبة" : "Usage of proper terminology and context",
    ];

    questions.push({
      id: `q_${Date.now()}_theo_${t}`,
      type: "theoretical",
      text: questionText,
      modelAnswer: fact,
      rubric,
      points: 1,
      allowMultiple: false,
    });
  }

  return questions;
}

/**
 * Evaluates a student's theoretical written response using Gemini or local semantic evaluation
 */
async function evaluateTheoreticalAnswer({ question, modelAnswer, rubric = [], studentAnswer = "", lang = "en" }) {
  const answer = String(studentAnswer || "").trim();

  // 1. Empty or trivial answer check
  if (!answer || answer.length < 5) {
    return {
      isCorrect: false,
      gradeStatus: "incorrect",
      score: 0,
      maxScore: 1,
      feedback:
        lang === "ar"
          ? "لم يتم تقديم إجابة أو كانت الإجابة فارغة. الإجابة النموذجية موضحة للمراجعة."
          : "No answer was provided or response was too brief. Review the model answer above.",
    };
  }

  // 2. Try Gemini first if key exists
  if (GEMINI_API_KEY) {
    try {
      const prompt = [
        `You are an expert academic evaluator. Assess this student's written response to an open-ended theoretical question.`,
        `Language: ${lang === "ar" ? "Arabic" : "English"}.`,
        `Question: ${question}`,
        `Model Answer: ${modelAnswer}`,
        `Key Rubric Points: ${Array.isArray(rubric) ? rubric.join("; ") : "N/A"}`,
        `Student's Response: "${answer}"`,
        `Determine:`,
        `1. "isCorrect": boolean (true if student shows accurate conceptual understanding, false if incorrect or fundamentally wrong)`,
        `2. "gradeStatus": string ("correct" if thorough, "partially_correct" if missing some aspects but largely sound, "incorrect" if wrong)`,
        `3. "score": number (1.0 for correct, 0.5 for partially_correct, 0.0 for incorrect)`,
        `4. "feedback": string (2-3 sentences in ${lang === "ar" ? "Arabic" : "English"} explaining why this score was awarded, what the student explained well, and what was missing or incorrect compared to the model answer)`,
        `Format: Return ONLY valid JSON with { "isCorrect": boolean, "gradeStatus": string, "score": number, "feedback": string }`,
      ].join("\n\n");

      const payload = {
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: "application/json", temperature: 0.2 },
      };

      const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;
      const res = await axios.post(url, payload, { headers: { "Content-Type": "application/json" }, timeout: 30000 });
      const rawJson = res.data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (rawJson) {
        const parsed = JSON.parse(rawJson);
        return {
          isCorrect: Boolean(parsed.isCorrect),
          gradeStatus: parsed.gradeStatus || (parsed.isCorrect ? "correct" : "incorrect"),
          score: typeof parsed.score === "number" ? parsed.score : parsed.isCorrect ? 1 : 0,
          maxScore: 1,
          feedback: parsed.feedback || (parsed.isCorrect ? "إجابة صحيحة ومفاهيم واضحة." : "إجابة غير دقيقة."),
        };
      }
    } catch (gErr) {
      console.warn("Gemini theoretical evaluation fallback:", gErr.message);
    }
  }

  // 3. Grounded semantic & keyword rubric evaluation
  const cleanAnswer = answer.toLowerCase();
  const cleanModel = String(modelAnswer || "").toLowerCase();
  const modelTokens = cleanModel.split(/[\s,.;:!?،؟]+/).filter((w) => w.length > 3);
  const rubricTokens = (Array.isArray(rubric) ? rubric : [])
    .join(" ")
    .toLowerCase()
    .split(/[\s,.;:!?،؟]+/)
    .filter((w) => w.length > 3);

  const targets = Array.from(new Set([...modelTokens, ...rubricTokens]));
  let matched = 0;
  for (const t of targets) {
    if (cleanAnswer.includes(t)) matched += 1;
  }

  const matchRatio = targets.length > 0 ? matched / targets.length : 0;
  const isWordy = cleanAnswer.split(/\s+/).length >= 10;

  let isCorrect = false;
  let gradeStatus = "incorrect";
  let score = 0;
  let feedback = "";

  if (matchRatio >= 0.45 || (matchRatio >= 0.3 && isWordy)) {
    isCorrect = true;
    gradeStatus = "correct";
    score = 1;
    feedback =
      lang === "ar"
        ? `إجابة نظرية ممتازة ودقيقة! تضمنت المفاهيم الأساسية المرتبطة بالسؤال (${matched} مفهوم مطابق).`
        : `Excellent and accurate theoretical response! Included key concepts (${matched} matched concepts).`;
  } else if (matchRatio >= 0.2 || (matchRatio >= 0.12 && isWordy)) {
    isCorrect = true;
    gradeStatus = "partially_correct";
    score = 0.5;
    feedback =
      lang === "ar"
        ? `إجابة صحيحة جزئياً. أشرت إلى الفكرة العامة ولكنك أغفلت بعض التفاصيل الدقيقة الموجودة في الإجابة النموذجية.`
        : `Partially correct answer. You grasped the general idea but missed some key details highlighted in the model answer.`;
  } else {
    isCorrect = false;
    gradeStatus = "incorrect";
    score = 0;
    feedback =
      lang === "ar"
        ? `الإجابة غير دقيقة أو لم تغطِ المعايير المطلوبة في الإجابة النموذجية. يرجى مراجعة شرح الدرس.`
        : `The answer is incomplete or does not accurately cover the required criteria. Please review the model answer.`;
  }

  return {
    isCorrect,
    gradeStatus,
    score,
    maxScore: 1,
    feedback,
  };
}

/**
 * POST /api/quiz/generate
 * Accepts JSON { text, lang, courseId, count, includeTheoretical, difficulty }
 * OR multipart/form-data with a PDF file field "file"
 */
router.post("/generate", upload.single("file"), async (req, res) => {
  let { text = "", lang = "en", count = 10, includeTheoretical = true, difficulty = "medium" } = req.body;
  count = Math.min(Math.max(parseInt(count, 10) || 10, 1), 30);
  includeTheoretical = includeTheoretical === true || includeTheoretical === "true" || includeTheoretical === 1 || includeTheoretical === "1";
  difficulty = ["easy", "medium", "hard"].includes(String(difficulty).toLowerCase())
    ? String(difficulty).toLowerCase()
    : "medium";

  try {
    if (req.file && req.file.mimetype === "application/pdf") {
      const parsedPdf = await pdfParse(req.file.buffer);
      text = parsedPdf.text || text;
    }

    if (!text || text.trim().length < 20) {
      return res.status(400).json({ error: "Lesson text is too short to generate questions." });
    }

    // 1. Try Gemini first if key exists
    if (GEMINI_API_KEY) {
      try {
        const geminiQuestions = await generateQuizWithGemini(text, lang === "ar" ? "ar" : "en", count, includeTheoretical, difficulty);
        if (geminiQuestions && geminiQuestions.length > 0) {
          const estimatedTimeMinutes = calculateEstimatedQuizTime(geminiQuestions, difficulty);
          return res.json({
            model: GEMINI_MODEL,
            provider: "gemini",
            difficulty,
            estimatedTimeMinutes,
            questions: geminiQuestions,
          });
        }
      } catch (gErr) {
        console.warn("Gemini quiz generation failed, trying local Ollama:", gErr.message);
      }
    }

    // 2. Try Ollama local model
    const model = await resolveAvailableModel();
    if (!model) {
      const fallbackQuestions = generateGroundedLocalQuiz(text, lang === "ar" ? "ar" : "en", count, includeTheoretical, difficulty);
      const estimatedTimeMinutes = calculateEstimatedQuizTime(fallbackQuestions, difficulty);
      return res.json({
        model: "platform-ai-grounded",
        difficulty,
        estimatedTimeMinutes,
        questions: fallbackQuestions,
      });
    }

    const template = loadPromptTemplate(lang === "ar" ? "ar" : "en");
    const systemPrompt = `${template}\nDifficulty: ${difficulty}. Generate exactly ${count} questions.${includeTheoretical ? ' Include both MCQ and theoretical questions.' : ''}`;

    const ollamaRes = await axios.post(
      `${OLLAMA_BASE}/api/generate`,
      {
        model,
        system: systemPrompt,
        prompt: `Lesson Content:\n\n${text.slice(0, 6000)}`,
        stream: false,
        format: "json",
      },
      { timeout: 120000 }
    );

    let parsed;
    try {
      parsed = JSON.parse(ollamaRes.data.response);
    } catch {
      const match = ollamaRes.data.response.match(/\{[\s\S]*\}/);
      if (match) parsed = JSON.parse(match[0]);
      else throw new Error("Platform AI did not return valid JSON");
    }

    const normalized = normalizeQuestions(parsed.questions || []);
    const estimatedTimeMinutes = calculateEstimatedQuizTime(normalized, difficulty);

    return res.json({
      model,
      difficulty,
      estimatedTimeMinutes,
      questions: normalized,
    });
  } catch (err) {
    console.warn("Falling back to Platform AI grounded generator:", err.message);
    const fallbackQuestions = generateGroundedLocalQuiz(text, lang === "ar" ? "ar" : "en", count, includeTheoretical, difficulty);
    const estimatedTimeMinutes = calculateEstimatedQuizTime(fallbackQuestions, difficulty);
    return res.json({
      model: "platform-ai-grounded",
      difficulty,
      estimatedTimeMinutes,
      questions: fallbackQuestions,
    });
  }
});

/**
 * POST /api/quiz/evaluate-answers
 * Evaluates student answers, performing AI correction on theoretical/written questions.
 * Body: { lang, answers: { [qId]: studentAnswer }, questions: [ ... ] }
 */
router.post("/evaluate-answers", async (req, res) => {
  const { lang = "en", answers = {}, questions = [] } = req.body;

  try {
    const evaluations = {};
    for (const q of questions) {
      if (q.type === "theoretical") {
        const studentAns = answers[q.id] || "";
        const evalRes = await evaluateTheoreticalAnswer({
          question: q.text,
          modelAnswer: q.modelAnswer || "",
          rubric: q.rubric || [],
          studentAnswer: studentAns,
          lang,
        });
        evaluations[q.id] = evalRes;
      }
    }

    return res.json({ status: "ok", evaluations });
  } catch (err) {
    console.error("Evaluation error:", err);
    return res.status(500).json({ error: "Failed to evaluate answers" });
  }
});

/**
 * POST /api/quiz/estimate-time
 * Auto calculates recommended quiz time based on question count, types, and difficulty
 */
router.post("/estimate-time", (req, res) => {
  const { questions = [], difficulty = "medium" } = req.body;
  const estimatedTimeMinutes = calculateEstimatedQuizTime(questions, difficulty);
  return res.json({ difficulty, estimatedTimeMinutes });
});

module.exports = router;
module.exports._test = {
  calculateEstimatedQuizTime,
  evaluateTheoreticalAnswer,
};
