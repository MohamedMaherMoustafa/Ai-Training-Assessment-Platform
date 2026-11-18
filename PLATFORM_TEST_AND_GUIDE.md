# AI Training & Assessment Platform — Architecture, Features & Verification Report

## Overview
A bilingual (English / Arabic RTL) **Aurora Prism Liquid-Glass** web platform backed by **Firebase Authentication & Realtime Database** and a local **AI Proxy (`llm-proxy`)** with automatic grounded NLP/extractive fallbacks.

---

## Core Implemented Modules & Features

### 1. Authentication, Roles & Multi-Instructor Workspace
- **Roles:** `admin`, `instructor`, and `student` (`client/src/features/auth/LoginPage.jsx`, `RegisterPage.jsx`, `RoleGuard.jsx`).
- **Student Approval & Workspace Filter:** Students select one or more instructors during sign-up, wait for instructor approval, and choose which approved instructor workspace to open after login (`StudentDashboard.jsx`).
- **Clean Forms:** Auth and creation forms clear state cleanly between navigations and actions.

### 2. Aurora Prism Liquid-Glass UI & Interactive Audio
- **Visual System (`client/src/index.css`, `AppLayout.jsx`):** Multi-hue aurora gradient backdrop, floating rounded dock sidebar (`300px` single-line nav labels), mobile-responsive pill topbars, split-hero login card, and Light/Dark + EN/AR toggles.
- **Audio Feedback (`client/src/utils/soundEffects.js`):** Subtle Web Audio click sound on UI controls (mute/unmute toggle in the top bar) and an ascending chime upon successful login.

### 3. Lesson PDFs & Student Private Annotation Notebook
- **Module (`client/src/features/lessons/LessonLibraryModule.jsx`):** Instructors upload PDF lessons (`renderPdfFileToPages.js` + `extractTextFromPdfFile.js`) stored in Firebase RTDB (`lessonMaterials/`).
- **Private Student Notes:** Students open lesson PDFs in `LiveAnnotationModal.jsx` (`mode="lesson"`), draw/highlight/type/erase across pages, and save personal ink layers & study notes strictly to their own student record (`lessonMaterials/{id}/annotations/{studentId}`).

### 4. PDF Assignments, Live Annotation, Teacher Correction & Due-Date Lock
- **Instructor Creation (`client/src/features/assignments/AssignmentsModule.jsx`):** Upload PDF worksheets, set total points (`maxMarks`), set future Due Date (`min={today}`) and Due Time, edit existing assignments (`updateAssignment`), or delete assignments with popup confirmation (`deleteAssignment`).
- **Student Live Annotation (`LiveAnnotationModal.jsx`):** Freehand Pen, Highlighter, Text Tool, Eraser, Undo/Redo, Clear Page, multi-page navigation, and optional written note. Automatically locks and shows `Unavailable — Due date has passed` once the deadline expires.
- **Instructor Correction:** Teachers click **Review & Correct PDF** to draw red/green correction marks directly on student submissions, award points (`0..maxMarks`), add feedback, and notify the student.

### 5. Timed Multi-Answer Quizzes, Camera Proctoring & Anti-Cheating
- **Quiz Builder & Player (`client/src/features/quiz/QuizzesModule.jsx`):** Minute-based timer, single/multiple correct answers, AI-assisted drafting, single-entry lock with instructor retake approvals, and integer points scoring (`1, 2, 3... pts`).
- **Webcam Proctoring Gate**: The quiz cannot be started without granting camera permission. A pre-quiz verification modal previews the live camera stream and outlines proctoring rules before entering.
- **Top-Center Floating Proctoring Window (PiP)**: A mirrored live camera feed (160×110 px) fixed at `top: 14px; left: 50%` with a glowing red `LIVE` badge, ensuring the student's face remains monitored without obstructing questions or answer options.
- **AI-Powered Real-Time Mobile Phone Detection**: Continuous client-side object detection using **TensorFlow.js** (`@tensorflow/tfjs`) and **COCO-SSD** (`@tensorflow-models/coco-ssd`). Detecting a `cell phone` in front of the camera triggers an **immediate first-offense quiz termination** without submission as a cheating violation.
- **Camera Blackout & Lens Obscuration Detection**: Fast canvas luminance analysis evaluates frame brightness. If the student covers the camera lens (using hand, tape, or paper) or the feed remains black (`avgBrightness < 15`) for ~1.2 seconds, the quiz terminates immediately for cheating.
- **Camera Disconnect Protection**: Tracks `MediaStreamTrack` status; disconnecting the camera triggers 1 warning, and a second camera closure causes immediate disqualification.
- **Anti-Screenshot & Privacy Shield (Strict 2-Strike System)**: Active quizzes block right-click/copy/cut, listen for `PrintScreen`, snipping shortcuts (`Win+Shift+S`, `Cmd+Shift+3/4/5`), `Ctrl+P`/`Ctrl+S`, `F12`, tab visibility loss, and window blur to hide questions under a **Content Privacy Restricted** overlay with clipboard wiping.
- **Dedicated High-Priority Termination Modal (`z-index: 100010`)**: Unmissable fullscreen modal displaying the exact violation reason (`mobile_phone`, `camera_blackout_covered`, or `privacy_shortcut`), recording the incident in RTDB, and locking re-entry until approved by the instructor.

### 6. Points-Based Top-5 Scoreboard & Top-3 PDF Certificates
- **Stepped Liquid-Glass Podium (`client/src/features/scoreboard/ScoreboardModule.jsx`):** Ranks Top 5 students per course by total earned points (`Quiz pts + Assignment pts`).
- **Top-3 Branded Certificates (`client/src/utils/certificateGenerator.js`):** Instructors and Admins can print **Gold (1st)**, **Silver-Indigo (2nd)**, and **Bronze-Teal (3rd)** PDF certificates featuring the platform logo, student & course data, points breakdown, and cursive signature rendered from the course instructor's name. The Student scoreboard is strictly read-only.

### 7. Instructor Student Progress Tracker & Branded Reports
- **Progress Tracker (`client/src/features/instructor/StudentProgressTrackerModule.jsx`):** Instructors choose a student and From/To interval (`To Date` cannot precede `From Date`) to view all quiz marks, assignment submissions, retake logs, Recharts points bar chart, and course breakdown.
- **Report Extraction (`client/src/utils/progressReportGenerator.js`):** Generates branded multi-page PDF reports (with platform logo, `From ... To ...` date range, KPIs, course breakdown, chronological activity logs, and instructor signature) and CSV exports.

### 8. Live Walking Robot Smart Platform Chatbot
- **UI Mascot (`client/src/components/common/PlatformChatbotWidget.jsx`):** Animated walking SVG robot launcher (RTL/LTR patrol-aware) that opens a Liquid-Glass popup chat.
- **Trained Intent & Grounded RAG Engine (`client/src/utils/chatbotCore.js`, `platformChatbotEngine.js`, `llm-proxy/routes/chat.js`, `llm-training/Modelfile`):**
  - Directly generates & publishes quizzes on named lessons for instructors/admins.
  - Answers exact student metrics (points, quizzes, assignments), course summaries, Top-5 scoreboard standings, assignments, and quiz retake queries.
  - Summarizes course lessons and Lesson PDFs or answers conceptual questions from lesson text in English and Arabic.
  - Never dumps raw database context strings on unrecognized prompts.

---

## Automated Verification Results

Executed from project root (`d:\DATA-1\STA\Grade 3\AI\Ai Training & Assessment Platform`):

| Check | Command | Result |
| --- | --- | --- |
| Chatbot & Proxy Integration Suite | `npm test` (`node scripts/test-platform.mjs`) | **13 / 13 Passed** (`exit code 0`) |
| Client Production Build | `npm run build` | **Passed** (`2810 modules transformed`, `client/dist` built) |
| Linter Check | `node ./client/node_modules/oxlint/bin/oxlint ./client/src` | **0 Errors** (`0` warnings in new/updated engine files) |

### Test Cases Verified (`scripts/test-platform.mjs`)
1. Role-aware greeting response (`EN`, no raw dump)
2. Direct quiz creation & publishing by instructor on a named lesson (question count + duration + published status)
3. Quiz creation fallback offering clickable lesson chips when lesson is omitted
4. Student lookup by name returning exact Quiz pts + Assignment pts + Total pts
5. Course details query (instructor, enrolled count, text & PDF lessons, quizzes, assignments)
6. Live Top-5 scoreboard query
7. Lesson summarization in English & Arabic
8. Conceptual Q&A extracted from lesson content
9. Platform workflow guidance (Live Annotation & Quiz Screenshot Privacy)
10. Out-of-scope query handled cleanly without dumping raw dataset strings
11. Backend `/api/chat` grounded fallback unit check
12. Live HTTP proxy verification (`/health`, `/api/chat`, `/api/quiz/generate`, `/api/feedback` returning HTTP `200`)
13. Critical platform modules & built bundle file existence check

---

## Running Locally & Deploying
- **Install & Start All Services:** `npm start` (runs Vite client on `http://localhost:5173` and AI proxy on `http://localhost:3001`, plus warms Ollama if installed)
- **Build Client:** `npm run build`
- **Run Automated Tests:** `npm test`
- **Firebase Hosting:** Config in `firebase.json` (`public: "client/dist"`). Add `.firebaserc` / run `firebase use training-assessment-platform` and harden `database.rules.json` before public production deployment.

