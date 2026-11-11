const express = require("express");
const axios = require("axios");

const router = express.Router();

const OLLAMA_BASE = process.env.OLLAMA_BASE_URL || "http://localhost:11434";
const PREFERRED_MODEL = process.env.OLLAMA_MODEL || "academy-tutor";

const STOP_WORDS = new Set([
  "the", "is", "are", "was", "were", "a", "an", "in", "on", "at", "to", "for", "of",
  "and", "or", "what", "who", "where", "when", "how", "can", "you", "me", "my", "i",
  "about", "tell", "show", "give", "please", "does", "do", "this", "that", "it",
  "من", "في", "على", "عن", "هل", "ما", "هو", "هي", "الى", "إلى", "ان", "أن", "مع", "لي", "كم",
]);

async function resolveAvailableModel() {
  try {
    const tags = await axios.get(`${OLLAMA_BASE}/api/tags`, { timeout: 1500 });
    const models = Array.isArray(tags.data?.models) ? tags.data.models.map((m) => m.name) : [];
    if (models.length === 0) return null;
    const exact = models.find((m) => m === PREFERRED_MODEL || m.startsWith(`${PREFERRED_MODEL}:`));
    return exact || models[0];
  } catch {
    return null;
  }
}

function extractKeywords(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 2 && !STOP_WORDS.has(w));
}

function summarizeExtractive(rawText, lang = "en", title = "", query = "") {
  const clean = String(rawText || "")
    .replace(/\r/g, "")
    .replace(/[#*`>_]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!clean) {
    return lang === "ar"
      ? "لا يوجد نص كافٍ داخل هذا الدرس لتلخيصه."
      : "This lesson does not contain extractable text yet.";
  }

  const sentences = clean
    .split(/[.!؟?\n]+/)
    .map((s) => s.trim())
    .filter((s) => s.length >= 22);

  const pool = sentences.length > 0 ? sentences : [clean.slice(0, 260)];
  const keywords = extractKeywords(query);

  let picked;
  if (keywords.length > 0) {
    const scored = pool.map((s, idx) => {
      const low = s.toLowerCase();
      let score = 0;
      keywords.forEach((kw) => {
        if (low.includes(kw)) score += 10;
      });
      return { s, idx, score };
    });
    const matches = scored.filter((x) => x.score > 0).sort((a, b) => b.score - a.score);
    picked = (matches.length > 0 ? matches : scored).slice(0, 5).map((x) => x.s);
  } else {
    // Pick evenly spaced representative sentences across the lesson
    const step = Math.max(1, Math.floor(pool.length / 5));
    picked = [];
    for (let i = 0; i < pool.length && picked.length < 5; i += step) {
      picked.push(pool[i]);
    }
  }

  const header =
    lang === "ar"
      ? `ملخص الدرس${title ? ` (${title})` : ""}:`
      : `Lesson Summary${title ? ` (${title})` : ""}:`;

  return `${header}\n${picked.map((s) => `• ${s}`).join("\n")}`;
}

function searchContextLines(message, contextSummary, lang = "en") {
  const keywords = extractKeywords(message);
  const lines = String(contextSummary || "")
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.startsWith("- "));

  if (lines.length === 0 || keywords.length === 0) {
    return null;
  }

  const scored = lines
    .map((line) => {
      const low = line.toLowerCase();
      let score = 0;
      keywords.forEach((kw) => {
        if (low.includes(kw)) score += 10 + kw.length;
      });
      return { line: line.slice(2), score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);

  if (scored.length === 0) return null;

  const header =
    lang === "ar"
      ? "إليك البيانات المطابقة من المنصة:"
      : "Here is what I found in the live platform data:";
  return `${header}\n${scored.map((x) => `• ${x.line}`).join("\n")}`;
}

function buildFallbackReply({
  lang = "en",
  mode = "qa",
  message = "",
  contextSummary = "",
  lessonText = "",
  lessonTitle = "",
}) {
  if (mode === "summarize" && lessonText) {
    return summarizeExtractive(lessonText, lang, lessonTitle, message);
  }

  const matched = searchContextLines(message, contextSummary, lang);
  if (matched) {
    return matched;
  }

  return lang === "ar"
    ? "لم أجد مطابقة محددة لهذا السؤال في سجلات المنصة. جرّب ذكر اسم الطالب أو المقرر أو الدرس (مثل: «لخّص درس ...» أو «بيانات الطالب ...» أو «ما هي المقررات المتاحة؟»)."
    : "I couldn't find a specific match for that question in the platform records. Try naming a student, course, or lesson (e.g., \"Summarize lesson ...\", \"Tell me about student ...\", or \"List courses\").";
}

router.post("/", async (req, res) => {
  const {
    role = "student",
    lang = "en",
    mode = "qa",
    message = "",
    history = [],
    contextSummary = "",
    lessonTitle = "",
    lessonText = "",
  } = req.body || {};

  const langRule =
    lang === "ar"
      ? "Reply concisely, accurately, and directly to the question in Arabic."
      : "Reply concisely, accurately, and directly to the question in English.";

  const historyBlock = Array.isArray(history)
    ? history
        .slice(-6)
        .map((h) => `${h.sender === "user" ? "User" : "Assistant"}: ${String(h.text || "").slice(0, 400)}`)
        .join("\n")
    : "";

  const systemGuide =
    mode === "summarize" && lessonText
      ? [
          "You are the Smart AI Tutor of 'AI Training & Assessment Platform'.",
          langRule,
          "Summarize the following lesson clearly into 4 to 6 concise bullet points plus 1 key takeaway.",
          `Lesson Title: ${lessonTitle || "Lesson"}`,
          `Lesson Content:\n${String(lessonText).slice(0, 6000)}`,
        ].join("\n\n")
      : [
          `You are the Smart AI Assistant of 'AI Training & Assessment Platform' assisting a ${role}.`,
          langRule,
          "Answer ONLY what the user asked. Use ONLY the live platform dataset below for metrics, names, courses, lessons, assignments, quizzes, and points. Never invent data and never dump the whole dataset.",
          contextSummary ? `LIVE PLATFORM DATASET:\n${String(contextSummary).slice(0, 8000)}` : "",
          historyBlock ? `RECENT CHAT:\n${historyBlock}` : "",
          `USER QUESTION: ${message}`,
        ]
          .filter(Boolean)
          .join("\n\n");

  try {
    const model = await resolveAvailableModel();
    if (!model) {
      return res.json({
        model: "platform-ai-grounded",
        reply: buildFallbackReply({ lang, mode, message, contextSummary, lessonText, lessonTitle }),
      });
    }

    const ollamaRes = await axios.post(
      `${OLLAMA_BASE}/api/generate`,
      {
        model,
        prompt: systemGuide,
        stream: false,
      },
      { timeout: 60000 }
    );

    const text = String(ollamaRes.data?.response || "").trim();
    return res.json({
      model,
      reply: text || buildFallbackReply({ lang, mode, message, contextSummary, lessonText, lessonTitle }),
    });
  } catch (err) {
    console.warn("Chat falling back to grounded response:", err.message);
    return res.json({
      model: "platform-ai-grounded",
      reply: buildFallbackReply({ lang, mode, message, contextSummary, lessonText, lessonTitle }),
    });
  }
});

module.exports = router;
module.exports._test = { summarizeExtractive, searchContextLines, buildFallbackReply, extractKeywords };
