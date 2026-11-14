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

async function generateQuizWithGemini(text, lang = "en", count = 5) {
  if (!GEMINI_API_KEY) return null;
  const prompt = [
    `You are an expert educational exam designer.`,
    `Generate exactly ${count} high-quality multiple choice questions based on the lesson text below.`,
    `Language: ${lang === "ar" ? "Arabic" : "English"}.`,
    `Format: Return ONLY a valid JSON object with a "questions" array. Each question must have:`,
    `- "id": string (e.g. "q1")`,
    `- "text": string (the question text)`,
    `- "options": array of exactly 4 strings or objects with "id" ("a","b","c","d") and "text"`,
    `- "correctOptionId": "a", "b", "c", or "d"`,
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
      text: q.text || `Question ${idx + 1}`,
      allowMultiple: correctIds.length > 1 || Boolean(q.allowMultiple),
      options: normalizedOpts,
      correctOptionId: correctIds[0] || "a",
      correctOptionIds: correctIds,
    };
  });
}

/**
 * Grounded local NLP quiz generator used automatically if Ollama runtime
 * is not installed/running on the host yet. Extracts factual statements
 * from the lesson text to build bilingual MCQs.
 */
function generateGroundedLocalQuiz(rawText, lang = "en", count = 10) {
  const clean = rawText.replace(/\r/g, "").replace(/[#*`>_]/g, " ");
  const sentences = clean
    .split(/[\n.!؟?]+/)
    .map((s) => s.replace(/\s+/g, " ").trim())
    .filter((s) => s.length >= 28 && s.length <= 220);

  const pool = sentences.length > 0 ? sentences : [clean.slice(0, 140).trim()];
  const total = Math.min(Math.max(Number(count) || 10, 1), 15);
  const questions = [];

  for (let i = 0; i < total; i += 1) {
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
      id: `q_${Date.now()}_${i}`,
      text: questionText,
      allowMultiple: false,
      options,
      correctOptionId: optIds[correctIdx],
      correctOptionIds: [optIds[correctIdx]],
    });
  }

  return questions;
}

/**
 * POST /api/quiz/generate
 * Accepts JSON { text, lang, courseId, count } OR multipart/form-data with a PDF file field "file"
 */
router.post("/generate", upload.single("file"), async (req, res) => {
  let { text = "", lang = "en", count = 10 } = req.body;

  try {
    if (req.file && req.file.mimetype === "application/pdf") {
      const parsedPdf = await pdfParse(req.file.buffer);
      text = parsedPdf.text || text;
    }

    if (!text || text.trim().length < 20) {
      return res.status(400).json({ error: "Lesson text is too short to generate questions." });
    }

    // Try Gemini first if key exists
    if (GEMINI_API_KEY) {
      try {
        const geminiQuestions = await generateQuizWithGemini(text, lang === "ar" ? "ar" : "en", count);
        if (geminiQuestions && geminiQuestions.length > 0) {
          return res.json({
            model: GEMINI_MODEL,
            provider: "gemini",
            questions: geminiQuestions,
          });
        }
      } catch (gErr) {
        console.warn("Gemini quiz generation failed, trying local Ollama:", gErr.message);
      }
    }

    const model = await resolveAvailableModel();
    if (!model) {
      const fallbackQuestions = generateGroundedLocalQuiz(text, lang === "ar" ? "ar" : "en", count);
      return res.json({
        model: "platform-ai-grounded",
        questions: fallbackQuestions,
      });
    }

    const template = loadPromptTemplate(lang === "ar" ? "ar" : "en");
    const systemPrompt = `${template}\nGenerate exactly ${count} questions.`;

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

    return res.json({
      model,
      questions: normalizeQuestions(parsed.questions || []),
    });
  } catch (err) {
    console.warn("Falling back to Platform AI grounded generator:", err.message);
    const fallbackQuestions = generateGroundedLocalQuiz(text, lang === "ar" ? "ar" : "en", count);
    return res.json({
      model: "platform-ai-grounded",
      questions: fallbackQuestions,
    });
  }
});

module.exports = router;
