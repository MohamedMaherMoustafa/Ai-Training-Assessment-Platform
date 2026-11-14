const express = require("express");
const axios = require("axios");

const router = express.Router();

const OLLAMA_BASE = process.env.OLLAMA_BASE_URL || "http://localhost:11434";
const PREFERRED_MODEL = process.env.OLLAMA_MODEL || "academy-tutor";
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-3.5-flash";

const STOP_WORDS = new Set([
  "the", "is", "are", "was", "were", "a", "an", "in", "on", "at", "to", "for", "of",
  "and", "or", "what", "who", "where", "when", "how", "can", "you", "me", "my", "i",
  "about", "tell", "show", "give", "please", "does", "do", "this", "that", "it",
  "من", "في", "على", "عن", "هل", "ما", "هو", "هي", "الى", "إلى", "ان", "أن", "مع", "لي", "كم",
]);

async function callGeminiChat({
  apiKey,
  model = "gemini-3.5-flash",
  systemPrompt,
  userPrompt,
  attachments = [],
}) {
  const parts = [];

  // Add attachments (photos, PDFs, voice recordings)
  if (Array.isArray(attachments) && attachments.length > 0) {
    for (const att of attachments) {
      if (att && att.data && att.mimeType) {
        const cleanBase64 = String(att.data).replace(/^data:[^;]+;base64,/, "");
        parts.push({
          inlineData: {
            mimeType: att.mimeType,
            data: cleanBase64,
          },
        });
      }
    }
  }

  // Add user prompt text
  parts.push({
    text: userPrompt || (attachments.length > 0 ? "Please analyze the attached file(s) and provide a detailed, helpful educational explanation." : "Hello"),
  });

  const payload = {
    contents: [
      {
        role: "user",
        parts,
      },
    ],
    systemInstruction: {
      parts: [{ text: systemPrompt }],
    },
    generationConfig: {
      temperature: 0.65,
      maxOutputTokens: 2500,
    },
  };

  const primaryModel = model || "gemini-3.5-flash";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${primaryModel}:generateContent?key=${apiKey}`;

  try {
    const res = await axios.post(url, payload, {
      headers: { "Content-Type": "application/json" },
      timeout: 60000,
    });
    const candidate = res.data?.candidates?.[0];
    const text = candidate?.content?.parts?.map((p) => p.text).filter(Boolean).join("\n");
    if (text) return { text, model: primaryModel };
  } catch (err) {
    console.warn(`Gemini (${primaryModel}) failed:`, err.response?.data?.error?.message || err.message);
    if (primaryModel !== "gemini-flash-latest") {
      try {
        const fallbackUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${apiKey}`;
        const res = await axios.post(fallbackUrl, payload, {
          headers: { "Content-Type": "application/json" },
          timeout: 60000,
        });
        const candidate = res.data?.candidates?.[0];
        const text = candidate?.content?.parts?.map((p) => p.text).filter(Boolean).join("\n");
        if (text) return { text, model: "gemini-flash-latest" };
      } catch (fErr) {
        console.warn("Gemini fallback model also failed:", fErr.message);
      }
    }
    throw err;
  }
  return null;
}

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
    attachments = [],
    history = [],
    contextSummary = "",
    lessonTitle = "",
    lessonText = "",
  } = req.body || {};

  const langRule =
    lang === "ar"
      ? "Reply fluently, accurately, and politely in Arabic. Use clear markdown formatting."
      : "Reply fluently, accurately, and politely in English. Use clear markdown formatting.";

  const historyBlock = Array.isArray(history)
    ? history
        .slice(-6)
        .map((h) => `${h.sender === "user" ? "User" : "Assistant"}: ${String(h.text || "").slice(0, 400)}`)
        .join("\n")
    : "";

  const systemPrompt = [
    "You are the Intelligent Multimodal AI Tutor & Educational Assistant of 'AI Training & Assessment Platform'.",
    `Target User Role: ${role}.`,
    langRule,
    "Multimodal Capabilities:",
    "- When the user sends photos/images: Analyze the visual content thoroughly (such as textbook pages, math formulas, circuit diagrams, charts, handwritten notes, or code screenshots) and explain the concepts step-by-step.",
    "- When the user sends a PDF document: Read, analyze, summarize, or extract key questions, answers, and study notes from the PDF.",
    "- When the user sends voice/audio: Accurately process the spoken query and provide a well-structured educational answer.",
    "Platform Grounding:",
    "- When the user asks about live platform data (e.g., student marks, points, scoreboard, course lists, quiz results, or instructor assignments), rely strictly on the LIVE PLATFORM DATASET below.",
    "- When the user asks general educational, scientific, coding, mathematics, or conceptual questions, provide comprehensive, high-quality educational guidance.",
    contextSummary ? `LIVE PLATFORM DATASET:\n${String(contextSummary).slice(0, 8000)}` : "",
    mode === "summarize" && lessonText ? `TARGET LESSON CONTENT:\nTitle: ${lessonTitle}\n${String(lessonText).slice(0, 6000)}` : "",
  ]
    .filter(Boolean)
    .join("\n\n");

  const userPrompt = [
    historyBlock ? `RECENT CHAT CONTEXT:\n${historyBlock}` : "",
    message ? `USER QUESTION: ${message}` : "",
    attachments.length > 0
      ? `(User attached ${attachments.length} file(s): ${attachments.map((a) => `${a.kind || 'file'}: ${a.fileName || a.mimeType}`).join(", ")})`
      : "",
  ]
    .filter(Boolean)
    .join("\n\n");

  // Priority 1: Gemini Multimodal API if configured
  if (GEMINI_API_KEY) {
    try {
      const geminiResult = await callGeminiChat({
        apiKey: GEMINI_API_KEY,
        model: GEMINI_MODEL,
        systemPrompt,
        userPrompt,
        attachments,
      });

      if (geminiResult?.text) {
        return res.json({
          model: "AI Assistant",
          provider: "ai",
          reply: geminiResult.text,
          hasAttachments: attachments.length > 0,
        });
      }
    } catch (gErr) {
      console.warn("Gemini generation failed, falling back to local runner:", gErr.message);
    }
  }

  // Priority 2: Ollama Local Model
  try {
    const model = await resolveAvailableModel();
    if (model) {
      const ollamaRes = await axios.post(
        `${OLLAMA_BASE}/api/generate`,
        {
          model,
          prompt: `${systemPrompt}\n\n${userPrompt}`,
          stream: false,
        },
        { timeout: 60000 }
      );

      const text = String(ollamaRes.data?.response || "").trim();
      if (text) {
        return res.json({
          model,
          provider: "ollama",
          reply: text,
        });
      }
    }
  } catch (oErr) {
    console.warn("Ollama unavailable:", oErr.message);
  }

  // Priority 3: Platform Grounded Fallback
  return res.json({
    model: "platform-ai-grounded",
    provider: "grounded-fallback",
    reply: buildFallbackReply({ lang, mode, message, contextSummary, lessonText, lessonTitle }),
  });
});

module.exports = router;
module.exports._test = { summarizeExtractive, searchContextLines, buildFallbackReply, extractKeywords, callGeminiChat };
