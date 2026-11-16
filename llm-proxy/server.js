const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const quizRouter = require("./routes/quiz");
const feedbackRouter = require("./routes/feedback");
const chatRouter = require("./routes/chat");

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: process.env.CLIENT_URL || "http://localhost:5173" }));
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

app.get("/health", (_req, res) =>
  res.json({
    status: "ok",
    hasGemini: Boolean(process.env.GEMINI_API_KEY),
    geminiModel: process.env.GEMINI_MODEL || "gemini-3.5-flash",
    ollamaUrl: process.env.OLLAMA_BASE_URL || "http://localhost:11434",
    model: process.env.OLLAMA_MODEL || "academy-tutor",
  })
);

app.use("/api/quiz", quizRouter);
app.use("/api/feedback", feedbackRouter);
app.use("/api/chat", chatRouter);
app.use("/api/translate", (req, res, next) => {
  req.url = "/translate";
  chatRouter(req, res, next);
});

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: err.message });
});

app.listen(PORT, () => {
  console.log(`Local LLM Proxy listening on http://localhost:${PORT}`);
});

