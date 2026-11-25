# 🔥 Firebase Configurations & Complete API Reference

**Project:** Athar Educational Platform (منصة أثر التعليمية)  
**Architecture:** React (Vite) Frontend + Firebase (Auth, RTDB, Firestore, Storage, Analytics, Hosting) + Express LLM Proxy (`llm-proxy`)

---

## 📑 Table of Contents
1. [Firebase Configurations](#-1-firebase-configurations)
   - [1.1 Client SDK Initialization (`client/src/lib/firebase.js`)](#11-client-sdk-initialization-clientsrclibfirebasejs)
   - [1.2 Client Environment Variables (`client/.env.example`)](#12-client-environment-variables-clientenvexample)
   - [1.3 Multi-Auth Instance (`getSecondaryAuth`)](#13-multi-auth-instance-getsecondaryauth)
   - [1.4 Hosting & Rules Mapping (`firebase.json`)](#14-hosting--rules-mapping-firebasejson)
   - [1.5 Realtime Database Rules (`database.rules.json`)](#15-realtime-database-rules-databaserulesjson)
   - [1.6 Cloud Firestore Rules (`firestore.rules`)](#16-cloud-firestore-rules-firestorerules)
   - [1.7 Realtime Database (RTDB) Root Collections](#17-realtime-database-rtdb-root-collections)
2. [Backend LLM Proxy Server (`llm-proxy`)](#-2-backend-llm-proxy-server-llm-proxy)
   - [2.1 Server Configuration & Environment Variables (`llm-proxy/.env.example`)](#21-server-configuration--environment-variables-llm-proxyenvexample)
   - [2.2 Express Middleware & Limits](#22-express-middleware--limits)
3. [Internal REST API Endpoints (`http://localhost:3001`)](#-3-internal-rest-api-endpoints-httplocalhost3001)
   - [3.1 Health Check (`GET /health`)](#31-health-check-get-health)
   - [3.2 Multimodal AI Chatbot (`POST /api/chat`)](#32-multimodal-ai-chatbot-post-apichat)
   - [3.3 Chatbot Arabic Translation (`POST /api/chat/translate` & `POST /api/translate`)](#33-chatbot-arabic-translation-post-apichattranslate--post-apitranslate)
   - [3.4 AI Quiz Generator (`POST /api/quiz/generate`)](#34-ai-quiz-generator-post-apiquizgenerate)
   - [3.5 Theoretical Answer Evaluator (`POST /api/quiz/evaluate-answers`)](#35-theoretical-answer-evaluator-post-apiquizevaluate-answers)
   - [3.6 Quiz Time Estimator (`POST /api/quiz/estimate-time`)](#36-quiz-time-estimator-post-apiquizestimate-time)
   - [3.7 Study Feedback Generator (`POST /api/feedback`)](#37-study-feedback-generator-post-apifeedback)
   - [3.8 Structured Assignment Grader (`POST /api/assignment/grade`)](#38-structured-assignment-grader-post-apiassignmentgrade)
   - [3.9 PDF Worksheet Assignment Grader (`POST /api/assignment/grade-pdf`)](#39-pdf-worksheet-assignment-grader-post-apiassignmentgrade-pdf)
4. [External & Client-Side APIs](#-4-external--client-side-apis)
   - [4.1 Google Gemini REST API](#41-google-gemini-rest-api)
   - [4.2 Local Ollama API](#42-local-ollama-api)
   - [4.3 MyMemory Translation Fallback API](#43-mymemory-translation-fallback-api)
   - [4.4 Client-Side API Callers](#44-client-side-api-callers)

---

## 🔥 1. Firebase Configurations

### 1.1 Client SDK Initialization (`client/src/lib/firebase.js`)
The frontend initializes Firebase using `import.meta.env` variables with fallback defaults for the platform's Firebase project:

| Config Key | Environment Variable | Default / Fallback Value |
|---|---|---|
| `apiKey` | `VITE_FIREBASE_API_KEY` | `""` *(Must be supplied via `.env`)* |
| `authDomain` | `VITE_FIREBASE_AUTH_DOMAIN` | `"training-assessment-platform.firebaseapp.com"` |
| `databaseURL` | `VITE_FIREBASE_DATABASE_URL` | `"https://training-assessment-platform-default-rtdb.firebaseio.com"` |
| `projectId` | `VITE_FIREBASE_PROJECT_ID` | `"training-assessment-platform"` |
| `storageBucket` | `VITE_FIREBASE_STORAGE_BUCKET` | `"training-assessment-platform.firebasestorage.app"` |
| `messagingSenderId` | `VITE_FIREBASE_MESSAGING_SENDER_ID` | `"762793101420"` |
| `appId` | `VITE_FIREBASE_APP_ID` | `"1:762793101420:web:3a4dbc9a1bdfdb9643b049"` |
| `measurementId` | `VITE_FIREBASE_MEASUREMENT_ID` | `"G-FR5SK5090B"` |

**Exported Firebase Service Instances:**
- `app` — Primary Firebase App (`initializeApp(firebaseConfig)`)
- `auth` — Firebase Authentication (`getAuth(app)`)
- `firestore` — Cloud Firestore (`getFirestore(app)`)
- `rtdb` — Firebase Realtime Database (`getDatabase(app)`)
- `storage` — Firebase Cloud Storage (`getStorage(app)`)
- `analytics` — Firebase Analytics (`getAnalytics(app)`, conditionally initialized if `isSupported()` resolves `true`)

---

### 1.2 Client Environment Variables (`client/.env.example`)
```env
# AI & LLM Environment Keys
VITE_GEMINI_API_KEY=your_gemini_api_key_here

# Firebase Configuration
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_DATABASE_URL=https://your_project-default-rtdb.firebaseio.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_FIREBASE_MEASUREMENT_ID=your_measurement_id
```

---

### 1.3 Multi-Auth Instance (`getSecondaryAuth`)
Defined in `client/src/lib/firebase.js`:
- Initializes a named secondary Firebase App (`"AdminUserCreator"`) using the same `firebaseConfig`.
- **Purpose:** Allows an active **Admin** to create new **Instructor** accounts in Firebase Authentication without signing out the currently logged-in Admin session.

---

### 1.4 Hosting & Rules Mapping (`firebase.json`)
```json
{
  "hosting": {
    "public": "client/dist",
    "ignore": ["firebase.json", "**/.*", "**/node_modules/**"],
    "rewrites": [{ "source": "**", "destination": "/index.html" }]
  },
  "database": {
    "rules": "database.rules.json"
  },
  "firestore": {
    "rules": "firestore.rules"
  }
}
```
- **SPA Rewrite:** All routes rewrite to `/index.html` to support React Router DOM v7 client-side routing.

---

### 1.5 Realtime Database Rules (`database.rules.json`)
```json
{
  "rules": {
    ".read": "now < 1796940000000",
    ".write": "now < 1796940000000"
  }
}
```
> **Note:** These are time-bounded development rules. Harden `.read` and `.write` rules with `auth != null` and role checks before public production deployment.

---

### 1.6 Cloud Firestore Rules (`firestore.rules`)
Role-based access control rules (`rules_version = '2'`):
- **`/users/{uid}`**:
  - `read`: Any authenticated user (`request.auth != null`).
  - `write`: Account owner (`request.auth.uid == uid`) or `admin`.
- **`/courses/{courseId}`** & **`/courses/{courseId}/lessons/{lessonId}`**:
  - `read`: Any authenticated user.
  - `write`: `instructor` or `admin`.
- **`/quizzes/{quizId}`**:
  - `read`: Authenticated users if `status == "published"`, or `instructor` / `admin`.
  - `write`: `instructor` or `admin`.
- **`/results/{resultId}`**:
  - `create`: Student creating their own result (`request.auth.uid == request.resource.data.studentId`).
  - `read`: Result owner (`studentId`) or `instructor` / `admin`.

---

### 1.7 Realtime Database (RTDB) Root Collections
Managed via `client/src/services/platformService.js`:

| Root Node | Purpose |
|---|---|
| `users/{uid}` | User profiles (admin, instructor, student), approval status, enrolled courses, store coins/cosmetics, equipped items |
| `usernames/{key}` | Username & email lookup index mapping to `{ uid, email, authEmail }` |
| `admins/admin_123` | Primary administrator account metadata & credentials sync |
| `courses/{courseId}` | Course definitions, lessons array (`courses/{courseId}/lessons`), enrolled student IDs |
| `lessonMaterials/{materialId}` | Uploaded PDF lessons, extracted text, and private student annotations (`annotations/{studentId}`) |
| `assignments/{assignmentId}` | PDF assignments, max marks, deadlines, and student submissions (`submissions/{studentId}`) |
| `assignmentSubmissions` | Assignment submission tracking records |
| `quizzes/{quizId}` | Published/draft quizzes, questions (MCQ & theoretical), timers, difficulty |
| `quizAccess/{quizId}/{studentId}` | Single-entry lock status, cheating violation logs, and instructor retake approvals |
| `results/{resultId}` | Student quiz scores, answers, and AI theoretical evaluations |
| `directChats/{chatId}` | 1-on-1 student–instructor real-time messaging and unread counters (`unreadByInstructor`, `unreadByStudent`) |
| `courseSessions/{sessionId}` | Course live/video classroom sessions |
| `notifications/{recipientId}` | Per-user notifications with read state |
| `weeklyReportsSent` | Tracking flags for automated 7-day weekly progress report notifications |
| `_health/lastPing` | RTDB connectivity health-check timestamp |

---

## ⚙️ 2. Backend LLM Proxy Server (`llm-proxy`)

### 2.1 Server Configuration & Environment Variables (`llm-proxy/.env.example`)
```env
PORT=3001
CLIENT_URL=http://localhost:5173
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=academy-tutor
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-3.5-flash
```

| Variable | Default | Description |
|---|---|---|
| `PORT` | `3001` | Port on which the Express proxy server listens |
| `CLIENT_URL` | `http://localhost:5173` | Allowed CORS origin for the Vite frontend |
| `OLLAMA_BASE_URL` | `http://localhost:11434` | Local Ollama server base URL |
| `OLLAMA_MODEL` | `academy-tutor` | Preferred fine-tuned local Ollama model name |
| `GEMINI_API_KEY` | `""` | Google Gemini API key (Priority 1 AI provider) |
| `GEMINI_MODEL` | `gemini-3.5-flash` | Default Gemini model (`chat.js` / `assignment.js` also support `gemini-flash-lite-latest`) |

### 2.2 Express Middleware & Limits (`llm-proxy/server.js`)
- **CORS:** `cors({ origin: process.env.CLIENT_URL || "http://localhost:5173" })`
- **Body Parsers:** `express.json({ limit: "50mb" })` and `express.urlencoded({ extended: true, limit: "50mb" })` (supports base64 images, PDFs, and audio attachments).
- **File Uploads (`quiz.js`):** `multer({ storage: multer.memoryStorage(), limits: { fileSize: 15 * 1024 * 1024 } })` (15 MB max PDF upload).

---

## 🔌 3. Internal REST API Endpoints (`http://localhost:3001`)

### 3.1 Health Check (`GET /health`)
Returns server status and configured AI provider metadata.
- **Response (`200 OK`):**
  ```json
  {
    "status": "ok",
    "hasGemini": true,
    "geminiModel": "gemini-3.5-flash",
    "ollamaUrl": "http://localhost:11434",
    "model": "academy-tutor"
  }
  ```

---

### 3.2 Multimodal AI Chatbot (`POST /api/chat`)
Handles educational Q&A, lesson summarization, platform data queries, and multimodal attachments (images, PDFs, voice audio).
- **Provider Priority:** `Gemini API` → `Local Ollama` → `Platform Grounded Fallback`
- **Request Body (`application/json`):**
  ```json
  {
    "role": "student | instructor | admin",
    "lang": "en | ar",
    "mode": "qa | summarize",
    "message": "string",
    "attachments": [
      { "kind": "image | pdf | audio", "mimeType": "string", "data": "base64...", "name": "string" }
    ],
    "history": [{ "sender": "user | bot", "text": "string" }],
    "contextSummary": "string (live platform dataset)",
    "lessonTitle": "string",
    "lessonText": "string"
  }
  ```
- **Response (`200 OK`):**
  ```json
  {
    "model": "AI Assistant | academy-tutor | platform-ai-grounded",
    "provider": "ai | ollama | grounded-fallback",
    "reply": "string",
    "hasAttachments": false
  }
  ```

---

### 3.3 Chatbot Arabic Translation (`POST /api/chat/translate` & `POST /api/translate`)
Translates chatbot responses from English into Modern Standard Arabic while preserving markdown, lists, numbers, and code blocks.
- **Provider Priority:** `Gemini API` → `Local Ollama` → `MyMemory Translation API`
- **Request Body (`application/json`):**
  ```json
  {
    "text": "string (required)",
    "from": "en",
    "to": "ar"
  }
  ```
- **Response (`200 OK`):**
  ```json
  {
    "translatedText": "string",
    "provider": "gemini | ollama | mymemory"
  }
  ```
- **Error Responses:** `400` if `text` is empty; `500` if all translation providers fail.

---

### 3.4 AI Quiz Generator (`POST /api/quiz/generate`)
Generates MCQ and theoretical questions from lesson text or an uploaded PDF file.
- **Provider Priority:** `Gemini API` → `Local Ollama` → `Grounded Local Quiz Generator`
- **Request:** `application/json` or `multipart/form-data` (with optional `file` PDF field up to 15 MB):
  - `text`: Lesson text (minimum 20 characters if no PDF is uploaded)
  - `lang`: `"en"` | `"ar"` (default `"en"`)
  - `count`: `1..30` (UI presets: `10`, `15`, `20`; default `10`)
  - `includeTheoretical`: `boolean` (default `true` — ~70% MCQ / 30% theoretical)
  - `difficulty`: `"easy"` | `"medium"` | `"hard"` (default `"medium"`)
- **Response (`200 OK`):**
  ```json
  {
    "model": "gemini-3.5-flash | academy-tutor | platform-ai-grounded",
    "provider": "gemini",
    "difficulty": "medium",
    "estimatedTimeMinutes": 15,
    "questions": [ ... ]
  }
  ```

---

### 3.5 Theoretical Answer Evaluator (`POST /api/quiz/evaluate-answers`)
Performs AI evaluation on written/theoretical quiz answers against model answers and rubrics.
- **Request Body:** `{ "lang": "en | ar", "answers": { "[qId]": "studentAnswer" }, "questions": [ ... ] }`
- **Response (`200 OK`):** `{ "status": "ok", "evaluations": { "[qId]": { ... } } }`

---

### 3.6 Quiz Time Estimator (`POST /api/quiz/estimate-time`)
Calculates recommended quiz duration in minutes based on question types (`mcq` vs `theoretical`) and difficulty (`easy`, `medium`, `hard`).
- **Request Body:** `{ "questions": [ ... ], "difficulty": "easy | medium | hard" }`
- **Response (`200 OK`):** `{ "difficulty": "medium", "estimatedTimeMinutes": 15 }`

---

### 3.7 Study Feedback Generator (`POST /api/feedback`)
Generates 3–5 personalized study tips based on quiz score and missed questions.
- **Provider Priority:** `Local Ollama` → `Platform Grounded Feedback`
- **Request Body:**
  ```json
  {
    "lang": "en | ar",
    "score": 8,
    "totalQuestions": 10,
    "wrongAnswers": [{ "question": "...", "studentAnswer": "...", "correctAnswer": "..." }]
  }
  ```
- **Response (`200 OK`):** `{ "model": "academy-tutor | platform-ai-grounded", "feedback": "string" }`

---

### 3.8 Structured Assignment Grader (`POST /api/assignment/grade`)
Grades structured question-by-question assignments.
- **Provider Priority:** `Gemini API` → `Semantic Grading Engine`
- **Request Body:** `{ "questions": [{ "id": "...", "questionText": "...", "studentAnswer": "...", "modelAnswer": "...", "maxMarks": 5 }], "lang": "en | ar" }`
- **Response (`200 OK`):**
  ```json
  {
    "success": true,
    "provider": "gemini | grounded-agent",
    "gradedQuestions": [{ "id": "...", "score": 4.5, "feedback": "..." }],
    "totalScore": 4.5,
    "maxTotalMarks": 5,
    "overallFeedback": "string"
  }
  ```

---

### 3.9 PDF Worksheet Assignment Grader (`POST /api/assignment/grade-pdf`)
Grades uploaded/annotated PDF assignment submissions using multimodal Gemini vision or semantic fallback, with strict blank-submission detection (`0 pts`).
- **Provider Priority:** `Gemini API` → `Semantic PDF Fallback`
- **Request Body:**
  ```json
  {
    "assignmentTitle": "string",
    "pdfText": "string",
    "instructions": "string",
    "studentAnswerText": "string",
    "studentPages": [ ... ],
    "maxMarks": 10,
    "lang": "en | ar"
  }
  ```
- **Response (`200 OK`):**
  ```json
  {
    "success": true,
    "provider": "gemini | grounded-agent",
    "score": 8.5,
    "maxMarks": 10,
    "summary": "string",
    "whatWentWrong": ["..."],
    "whatWentRight": ["..."],
    "detailedMistakes": [ ... ],
    "feedback": "string"
  }
  ```

---

## 🌐 4. External & Client-Side APIs

### 4.1 Google Gemini REST API
- **Endpoint:** `https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={GEMINI_API_KEY}`
- **Used by:** `llm-proxy/routes/chat.js`, `quiz.js`, and `assignment.js` for multimodal chat, Arabic translation, quiz generation, and PDF assignment grading.

### 4.2 Local Ollama API
- **Endpoints:**
  - `GET {OLLAMA_BASE_URL}/api/tags` — Checks installed local models.
  - `POST {OLLAMA_BASE_URL}/api/generate` — Runs local LLM inference (`academy-tutor`).
- **Used by:** `llm-proxy/routes/chat.js`, `quiz.js`, `feedback.js`, and `assignment.js` as a local offline fallback.

### 4.3 MyMemory Translation Fallback API
- **Endpoint:** `https://api.mymemory.translated.net/get?q={text}&langpair={from}|{to}`
- **Used by:** `llm-proxy/routes/chat.js` (`POST /api/chat/translate`) when Gemini and Ollama are unavailable.

### 4.4 Client-Side API Callers
| Client File | Endpoints / Services Called |
|---|---|
| `client/src/lib/firebase.js` | Firebase Auth, RTDB, Firestore, Storage, Analytics |
| `client/src/services/platformService.js` | Firebase Auth (`signInWithEmailAndPassword`, `createUserWithEmailAndPassword`, `getSecondaryAuth`) & RTDB CRUD |
| `client/src/utils/aiGrader.js` | `POST http://localhost:3001/api/assignment/grade`, `POST http://localhost:3001/api/assignment/grade-pdf` |
| `client/src/utils/chatbotCore.js` | `POST http://localhost:3001/api/quiz/generate`, `POST http://localhost:3001/api/chat` |
| `client/src/components/common/PlatformChatbotWidget.jsx` | `POST http://localhost:3001/api/chat/translate` (via proxy/chatbot translate action) |
