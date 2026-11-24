# 🎓 AI Training & Assessment Platform — Development Plan

> **Stack:** React (Vite) + Firebase (Auth, Firestore, Storage, Functions) + Local Trained LLM (QLoRA + Ollama)
> **Repo Architecture Tool:** [Archify](https://github.com/tt-a1i/archify)
> **Target Repository (HTTPS):** `https://github.com/Mohamedmaher-28/Ai-Training-Assessment-Platform.git`
> **Target Repository (SSH):** `git@github.com:Mohamedmaher-28/Ai-Training-Assessment-Platform.git`
> **i18n:** Arabic + English (RTL/LTR) | **Theme:** Light + Dark
> **Document Scope:** Current Requirements Only (Planning Phase — No Code Implemented Yet)

---

## 📐 Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                  React SPA (Vite)                        │
│  ┌─────────┐  ┌──────────────┐  ┌────────────────────┐  │
│  │ UI Layer│  │Context Layer │  │  Feature Modules   │  │
│  │Components│  │Auth/Theme/i18n│  │courses|quiz|grades│  │
│  └─────────┘  └──────────────┘  └────────────────────┘  │
└───────────────────────┬─────────────────────────────────┘
                        │
          ┌─────────────┼──────────────┐
          ▼             ▼              ▼
  ┌──────────────┐ ┌─────────┐ ┌────────────────┐
  │Firebase Auth │ │Firestore│ │Firebase Storage│
  │  (Roles)     │ │  (Data) │ │  (Files/PDFs)  │
  └──────────────┘ └─────────┘ └────────────────┘
                        │
                        ▼
              ┌──────────────────┐
              │  LLM Proxy       │
              │  (Express :3001) │
              └────────┬─────────┘
                       ▼
              ┌──────────────────┐
              │  Ollama Server   │
              │  (localhost:11434│
              │  Mistral / Aya)  │
              └──────────────────┘
```

---

## 🗂️ Planned Repository Structure (Feature-First)

```
ai-training-platform/
├── PLAN.md                        ← this file
├── .firebaserc
├── firebase.json
├── firestore.rules
├── storage.rules
│
├── functions/                     # Firebase Cloud Functions
│   ├── index.js
│   └── src/
│       ├── onCourseUpload.js      # Trigger LLM quiz draft on file upload
│       └── notifications.js
│
├── llm-proxy/                     # Local Express server → Ollama bridge
│   ├── server.js
│   ├── .env
│   ├── routes/
│   │   ├── quiz.js                # POST /api/quiz/generate
│   │   └── feedback.js            # POST /api/feedback
│   └── prompts/                   # Prompt templates (AR + EN)
│       ├── quiz_en.txt
│       └── quiz_ar.txt
│
└── client/                        # Vite React App
    ├── index.html
    ├── vite.config.js
    ├── tailwind.config.js
    └── src/
        ├── main.jsx
        ├── app/
        │   ├── App.jsx
        │   ├── Routes.jsx
        │   └── providers/           # All context providers stacked here
        │
        ├── assets/                  # Images, icons, global styles
        │
        ├── components/
        │   ├── common/              # Button, Modal, Spinner, Badge, Input
        │   ├── layout/              # Navbar, Sidebar, PageWrapper, Footer
        │   └── rtl/                 # RTL-aware wrapper components
        │
        ├── context/
        │   ├── AuthContext.jsx      # User session + role
        │   ├── ThemeContext.jsx     # light / dark
        │   └── LangContext.jsx      # ar / en + RTL flag
        │
        ├── features/
        │   ├── auth/
        │   │   ├── components/      # LoginForm, RegisterForm
        │   │   ├── hooks/           # useAuth.js
        │   │   └── services/        # authService.js
        │   │
        │   ├── courses/
        │   │   ├── components/      # CourseCard, CourseList, LessonViewer
        │   │   ├── hooks/           # useCourses.js
        │   │   └── services/        # coursesService.js
        │   │
        │   ├── quiz/
        │   │   ├── components/      # QuizBuilder, QuizPlayer, QuizReview
        │   │   ├── hooks/           # useQuiz.js
        │   │   └── services/        # quizService.js, llmService.js
        │   │
        │   ├── grades/
        │   │   ├── components/      # GradeTable, ProgressBar
        │   │   └── services/        # gradesService.js
        │   │
        │   ├── feedback/
        │   │   ├── components/      # FeedbackPanel (AI study tips)
        │   │   └── services/        # feedbackService.js
        │   │
        │   └── dashboard/
        │       ├── instructor/      # InstructorDashboard, ReportView
        │       └── student/         # StudentDashboard, EnrollmentList
        │
        ├── hooks/                   # Global hooks (useDebounce, useRTL...)
        │
        ├── lib/
        │   ├── firebase.js          # Firebase init
        │   └── ollama.js            # Axios client → llm-proxy
        │
        ├── locales/
        │   ├── en.json              # English translations
        │   └── ar.json              # Arabic translations
        │
        └── utils/
            ├── pdfParser.js
            └── formatters.js
```

---

## 🚀 Development Phases

### Phase 1 — Project Bootstrap *(Week 1)*

| Task | Details |
|------|---------|
| Init Vite + React | `npm create vite@latest client --template react` |
| Firebase project setup | Auth, Firestore, Storage, Functions enabled in console |
| Tailwind CSS + RTL plugin | `tailwindcss` + `tailwindcss-rtl` for Arabic layout |
| i18n setup | `react-i18next` with `ar.json` / `en.json` files |
| Theme system | CSS variables + `ThemeContext` (light/dark) |
| Router | `react-router-dom` v6 with role-based route guards |
| Archify integration | Run archify to auto-generate architecture diagram |

### Phase 2 — Auth & Role System *(Week 1–2)*

| Task | Details |
|------|---------|
| Firebase Auth setup | Email/password sign-up & login |
| Roles in Firestore | `users/{uid}` doc with `role: "instructor" \| "student" \| "admin"` |
| Protected routes | `<RoleGuard>` HOC blocks wrong-role access |
| Auth Context | `useAuth()` hook exposes `user`, `role`, `loading` |

**Firestore Schema — `users` collection:**
```
users/{uid}
  ├── displayName: string
  ├── email: string
  ├── role: "instructor" | "student" | "admin"
  ├── lang: "ar" | "en"
  ├── theme: "light" | "dark"
  ├── enrolledCourses: string[]
  └── createdAt: timestamp
```

### Phase 3 — Course Management *(Week 2–3)*

| Task | Details |
|------|---------|
| Course CRUD | Instructors create / edit / delete courses |
| File upload | PDF / DOCX / Video → Firebase Storage |
| Enrolment | Students browse & enrol in courses |
| Lesson viewer | PDF viewer + video player inline |

**Firestore Schema — `courses` collection:**
```
courses/{courseId}
  ├── title: { ar: string, en: string }
  ├── description: { ar: string, en: string }
  ├── instructorId: string
  ├── enrolledStudents: string[]
  ├── createdAt: timestamp
  └── lessons/           ← subcollection
        {lessonId}
          ├── title: { ar: string, en: string }
          ├── fileUrl: string        (Storage URL)
          ├── fileType: "pdf" | "video"
          └── order: number
```

### Phase 4 — LLM Integration (Local Ollama) *(Week 3–4)*

| Task | Details |
|------|---------|
| Ollama setup | Install Ollama, pull Mistral or LLaMA 3 / Aya model |
| Prompt templates | System prompts for quiz generation (AR + EN) in `/prompts` |
| Express proxy | `llm-proxy/server.js` bridges React → Ollama (avoids CORS) |
| Quiz draft endpoint | `POST /api/quiz/generate` — sends lesson text, returns MCQ JSON |
| Feedback endpoint | `POST /api/feedback` — sends student answers, returns study tips |

**LLM Quiz Generation Flow:**
```
Instructor uploads PDF
        ↓
React extracts text from PDF (pdf-parse / pdfjs)
        ↓
POST /api/quiz/generate  { text, lang, count }
        ↓
Express Proxy → Ollama  (system prompt + lesson text)
        ↓
Ollama returns JSON  { questions: [ MCQ... ] }
        ↓
React shows QuizBuilder (instructor reviews / edits)
        ↓
Instructor approves → saved to Firestore quizzes/{quizId}
```

**Firestore Schema — `quizzes` collection:**
```
quizzes/{quizId}
  ├── courseId: string
  ├── lessonId: string
  ├── status: "draft" | "approved" | "published"
  ├── createdBy: uid  (instructor)
  ├── questions: [
  │     {
  │       id: string,
  │       text: { ar: string, en: string },
  │       options: [ { id, text: { ar, en } } ],
  │       correctOptionId: string
  │     }
  │   ]
  └── createdAt: timestamp
```

### Phase 5 — Quiz Player, Camera Proctoring & Anti-Cheat Engine *(Week 4–5)*

| Task | Details |
|------|---------|
| QuizPlayer component | Timed, single/multiple MCQ, submit flow |
| Camera Proctoring Gate | Mandatory webcam verification before quiz can start |
| Top-Center Live PiP | 160×110px mirrored live video feed with glowing `LIVE` indicator |
| Mobile Phone Detection | Real-time on-device TensorFlow.js + COCO-SSD object detection (immediate termination on first offense) |
| Camera Covered / Black Screen Detection | Fast 2D canvas luminance analysis; terminates quiz if lens is covered/blacked out for ~1.2s |
| Camera Disconnect Protection | 1 warning on camera drop; 2nd drop terminates attempt |
| Screen Capture Shield | Blocks PrintScreen, Win+Shift+S, dev tools, and window blur with privacy blur & clipboard wipe |
| Cheating Termination Modal | High-priority dialog (`z-index: 100010`) explaining violation and locking re-entry |
| Auto-grading | Score calculated client-side, stored in Firebase RTDB |
| Results view | Per-question breakdown + correct answers highlighted |
| AI feedback | After submission → `POST /api/feedback` → study tips shown |

**Firebase Schema — `quizAttempts` and `quizAccess`:**
```
quizAccess/{quizId}/{studentId}
  ├── status: "entered" | "submitted" | "terminated_cheating"
  ├── retakeStatus: "none" | "pending" | "approved" | "rejected"
  ├── violationReason: "mobile_phone_detected" | "camera_covered_detected" | "print_screen" | ...
  └── cheatingType: "mobile_phone" | "camera_blackout_covered" | "privacy_shortcut"
```

**Firestore Schema — `results` collection:**
```
results/{resultId}
  ├── studentId: string
  ├── quizId: string
  ├── courseId: string
  ├── score: number          (0–100)
  ├── answers: { questionId: chosenOptionId }
  ├── aiFeedback: string     (from LLM)
  └── submittedAt: timestamp
```

### Phase 6 — Dashboards & Reports *(Week 5–6)*

| Instructor Dashboard | Student Dashboard |
|---------------------|------------------|
| All enrolled students | My enrolled courses |
| Quiz draft approvals queue | Upcoming / past quizzes |
| Grade distribution charts | My scores & AI feedback |
| Course progress heatmap | Study recommendations |
| Export report (PDF / CSV) | Progress bar per course |

**Tech:** Recharts for charts, jsPDF for PDF export.

### Phase 7 — UI Polish *(Week 6)*

| Task | Details |
|------|---------|
| RTL / LTR switching | All layouts flip with `dir="rtl"` on `<html>` |
| Light / Dark theme | Tailwind `dark:` classes + CSS variables |
| Language switcher | Navbar toggle AR ↔ EN (persisted in Firestore + localStorage) |
| Responsive design | Mobile-first, instructor tablet-ready |
| Accessibility | ARIA labels in both languages |

---

## 🔥 Target Firebase Environment (Provisioned Project Details)

> **Note:** Provisioned Firebase configuration documented for planning only — no application files have been implemented yet.

- **Project ID:** `training-assessment-platform`
- **Firebase Authentication:** Activated
- **Auth Domain:** `training-assessment-platform.firebaseapp.com`
- **Realtime Database URL:** `https://training-assessment-platform-default-rtdb.firebaseio.com`
- **Storage Bucket:** `training-assessment-platform.firebasestorage.app`
- **Analytics Measurement ID:** `G-FR5SK5090B`

### Current Firestore Rules (Locked Default — To Be Updated During Implementation)
```js
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

### Current Realtime Database Rules (Test Mode Until 2026-12-11)
```json
{
  "rules": {
    ".read": "now < 1796940000000",  // 2026-12-11
    ".write": "now < 1796940000000"  // 2026-12-11
  }
}
```

### Target Web App Firebase Config
```js
const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY || "YOUR_FIREBASE_API_KEY",
  authDomain: "training-assessment-platform.firebaseapp.com",
  databaseURL: "https://training-assessment-platform-default-rtdb.firebaseio.com",
  projectId: "training-assessment-platform",
  storageBucket: "training-assessment-platform.firebasestorage.app",
  messagingSenderId: "762793101420",
  appId: "1:762793101420:web:3a4dbc9a1bdfdb9643b049",
  measurementId: "G-FR5SK5090B"
};
```

---

## 🔥 Target Firestore Security Rules (Planned Implementation Design)

```js
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Users can only read/write their own profile
    match /users/{uid} {
      allow read, write: if request.auth.uid == uid;
    }

    // Courses: instructors write, any authenticated user reads
    match /courses/{courseId} {
      allow read: if request.auth != null;
      allow write: if get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == "instructor";

      // Lessons subcollection — same rules as parent
      match /lessons/{lessonId} {
        allow read: if request.auth != null;
        allow write: if get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == "instructor";
      }
    }

    // Quizzes: instructors manage, students read published only
    match /quizzes/{quizId} {
      allow read: if resource.data.status == "published" && request.auth != null;
      allow write: if get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == "instructor";
    }

    // Results: students write their own, instructors read all
    match /results/{resultId} {
      allow create: if request.auth.uid == request.resource.data.studentId;
      allow read:   if request.auth.uid == resource.data.studentId
                    || get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == "instructor";
    }
  }
}
```

---

## 🤖 Local Trained LLM Setup (QLoRA + Ollama)

1. **Starter Data & Dataset Prep:** Extract bilingual (AR/EN) text from academy-permitted materials and format instruction-tuning `.jsonl` pairs for MCQ drafting and learner study feedback.
2. **Offline QLoRA Fine-Tuning:** Train LoRA adapters on a base model (`Qwen2.5-7B`, `Cohere Aya` for Arabic, or `Mistral-7B`), merge weights, and quantize to 4-bit GGUF.
3. **Local Serving via Ollama:**

```bash
# 1. Install Ollama for Windows
#    Download from: https://ollama.com/download

# 2. Register the fine-tuned local model (from GGUF + Modelfile)
ollama create academy-tutor -f llm-training/Modelfile

# 3. Start Ollama (runs on http://localhost:11434)
ollama serve

# 4. Start the LLM proxy (once implemented)
cd llm-proxy
npm start                  # Runs on http://localhost:3001
```

> **Arabic recommendation:** Use `aya` or `qwen2.5` as the fine-tuning base for best Arabic quiz generation quality.
> **English recommendation:** Use `mistral` or `qwen2.5` — fast on consumer hardware.

---

## 📦 Key Dependencies

| Package | Purpose |
|---------|---------|
| `react-router-dom` | Routing + role guards |
| `firebase` | Auth, Firestore, Storage SDK |
| `react-i18next` + `i18next` | AR/EN translations |
| `tailwindcss` + `tailwindcss-rtl` | Styling + RTL support |
| `recharts` | Charts in dashboards |
| `@react-pdf-viewer/core` | Render PDFs in lesson viewer |
| `axios` | HTTP client → LLM proxy |
| `jspdf` | Export grade reports to PDF |
| `react-hot-toast` | Notifications |
| `zustand` | Lightweight state management |
| `react-hook-form` | Form handling |
| `pdf-parse` | Extract text from PDFs (in proxy) |
| `express` + `cors` | LLM proxy server |

---

## 🗓️ Sprint Timeline

```
Week 1  │ Bootstrap + Auth
Week 2  │ Course Management (CRUD + enrolment)
Week 3  │ File Upload + LLM Proxy setup
Week 4  │ Quiz Builder + LLM Draft generation
Week 5  │ Quiz Player + Auto-grading + AI Feedback
Week 6  │ Instructor & Student Dashboards + Reports
Week 7  │ UI Polish — AR/EN RTL + Light/Dark
Week 8  │ Testing + Firebase deploy
```

---

## ✅ Final Demo Sign-Off Checklist

- [x] Instructor uploads a lesson PDF
- [x] Local trained LLM auto-drafts 10, 15, or 20 MCQs from the PDF content
- [x] Instructor reviews and approves the quiz in QuizBuilder
- [x] Student enrols in the course
- [x] Student takes the quiz with a timer and webcam proctoring
- [x] Score is saved to Firebase RTDB and displayed on live scoreboard
- [x] AI study feedback and diagnostic report is shown after submission
- [x] Instructor sees all student results in dashboard and progress tracker
- [x] Full AR ↔ EN toggle with RTL layout
- [x] Light / Dark theme toggle works across all pages
- [x] Student Rewards Store & Gamified Coin Economy with Strict Academic Point Protection
- [x] Interactive Login Mascot with real-time eye-covering password typing animation
- [x] Chatbot inline Arabic translation engine in assistant response footers
- [x] Strict username validation rules (`>= 8` chars and `@` or `_`)
- [x] Conditional WhatsApp support button (displayed only when status is "Needs Support")
- [x] Cognitive IQ Puzzles module with 10 ascending difficulty tiers and proportional rewards

---

## 🌟 Recently Completed Major Features & Modernizations

### 1. Student Rewards Store & Coin Economy (`/student/store`)
- **Point Conversion**: Academic points convert to spendable Coins ($1 \text{ pt} = 10 \text{ coins}$), plus bonus coins earned from Cognitive IQ Puzzles (+15 to +400 coins per puzzle).
- **Strict Academic Point Protection**: Purchasing cosmetic items in the store **strictly spends Coins only**. Academic points, course marks, certificate eligibility, and podium standings are never deducted.
- **Cosmetics Catalog**: 8 Glowing Name Tags, 8 Liquid-Glass Avatar Frames, and Chatbot Studio (6 Robot skins, 7 Hats, 6 Glasses, 5 Shoes).
- **Live Equip State**: Synchronized across header, sidebar, profile settings modal, chatbot widget, and scoreboard podiums.

### 2. Interactive Login Mascot (Eye-Covering Password Privacy Animation)
- SVG robot mascot mounted on `LoginPage.jsx`.
- Covers his eyes with hands and fingers when the user is typing their password.
- 1-second debounce inactivity release and blur unmasking.
- Peeking mode: Parts fingers and peeks when `showPass` is enabled.

### 3. AI Quiz 10, 15, and 20 Question Generation Buttons
- Instructors have 3 quick AI generation buttons to tailor quiz depth to lesson requirements.

### 4. Chatbot Response Inline Arabic Translation Engine
- Dedicated "Translate into Arabic" button (`Languages` icon) in every assistant message footer beside the copy button.

### 5. Strict Username Security & Conditional Support
- Enforced username validation rule (`username.length >= 8` and must contain `@` or `_`).
- WhatsApp support button displayed on student dashboard only when student status is "Needs Support".

---

## 🏗️ Architecture Visualization with Archify

After scaffolding the project, run Archify to auto-generate a live interactive architecture diagram:

```bash
# Install Archify skill
npx -y skills@latest add https://archify.si --skill archify --agent claude-code --global --copy --yes

# Then prompt your AI agent:
# "Use Archify to map the full architecture of this React + Firebase + Ollama project"
```

Archify traces all imports, Firebase SDK calls, and Ollama API calls to generate an interactive HTML diagram of the full data-flow topology — useful for documentation and onboarding new team members.

