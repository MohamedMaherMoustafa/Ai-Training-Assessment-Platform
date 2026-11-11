const express = require("express");
const axios = require("axios");

const router = express.Router();

const OLLAMA_BASE = process.env.OLLAMA_BASE_URL || "http://localhost:11434";
const PREFERRED_MODEL = process.env.OLLAMA_MODEL || "academy-tutor";

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

function buildGroundedFeedback({ lang, score, totalQuestions, wrongAnswers }) {
  if (wrongAnswers.length === 0) {
    return lang === "ar"
      ? `أداء رائع! حصلت على ${score} من ${totalQuestions}.\n• استمر في مراجعة المفاهيم الأساسية للمحافظة على هذا المستوى.\n• يمكنك الانتقال الآن إلى الدرس أو الواجب التالي.`
      : `Excellent work! You scored ${score} out of ${totalQuestions}.\n• Keep reviewing the core concepts to maintain mastery.\n• You are ready to move on to the next lesson or assignment.`;
  }

  const tips = wrongAnswers.slice(0, 4).map((w, i) =>
    lang === "ar"
      ? `${i + 1}. راجع السؤال "${w.question.slice(0, 70)}..." — ركّز على الإجابة الصحيحة: "${w.correctAnswer}".`
      : `${i + 1}. Review "${w.question.slice(0, 70)}..." — focus on why "${w.correctAnswer}" is the accurate answer.`
  );

  const header =
    lang === "ar"
      ? `حصلت على ${score} من ${totalQuestions}. إليك خطة المراجعة الموصى بها:`
      : `You scored ${score} out of ${totalQuestions}. Recommended study focus:`;

  return `${header}\n${tips.join("\n")}`;
}

router.post("/", async (req, res) => {
  const { lang = "en", score = 0, totalQuestions = 0, wrongAnswers = [] } = req.body;

  const wrongSummary = wrongAnswers
    .slice(0, 5)
    .map((w, i) =>
      lang === "ar"
        ? `${i + 1}. السؤال: ${w.question}\n   إجابتك: ${w.studentAnswer}\n   الإجابة الصحيحة: ${w.correctAnswer}`
        : `${i + 1}. Question: ${w.question}\n   Your answer: ${w.studentAnswer}\n   Correct: ${w.correctAnswer}`
    )
    .join("\n\n");

  const prompt =
    lang === "ar"
      ? `حصل الطالب على ${score} من ${totalQuestions}.\n\nالأسئلة التي أخطأ فيها:\n${wrongSummary || "لا يوجد"}\n\nقدّم 3 إلى 5 نصائح دراسية واضحة ومشجعة باللغة العربية لمساعدة الطالب على فهم النقاط الناقصة.`
      : `The student scored ${score} out of ${totalQuestions}.\n\nMissed questions:\n${wrongSummary || "None"}\n\nProvide 3 to 5 concise, encouraging study tips in English to help the student master these concepts.`;

  try {
    const model = await resolveAvailableModel();
    if (!model) {
      return res.json({
        model: "platform-ai-grounded",
        feedback: buildGroundedFeedback({ lang, score, totalQuestions, wrongAnswers }),
      });
    }

    const ollamaRes = await axios.post(
      `${OLLAMA_BASE}/api/generate`,
      {
        model,
        prompt,
        stream: false,
      },
      { timeout: 60000 }
    );

    return res.json({ model, feedback: ollamaRes.data.response });
  } catch (err) {
    console.warn("Falling back to grounded feedback:", err.message);
    return res.json({
      model: "platform-ai-grounded",
      feedback: buildGroundedFeedback({ lang, score, totalQuestions, wrongAnswers }),
    });
  }
});

module.exports = router;
