# AI Training & Assessment Platform — Architecture, Features & Verification Report

## Overview
A bilingual (English / Arabic RTL) **Aurora Prism Liquid-Glass** web platform backed by **Firebase Authentication & Realtime Database**, an in-memory client-side routing architecture, and a local **AI Proxy (`llm-proxy`)** with automatic grounded NLP/extractive fallbacks.

---

## Core Implemented Modules & Features

### 1. In-Memory Routing, Direct Login Entry & Multi-Role Workspaces
- **In-Memory Navigation (`MemoryRouter`):**
  - All routing is handled in-memory using `react-router-dom`'s `MemoryRouter`.
  - The browser address bar remains permanently static at the root host (`/`), completely preventing route tampering, unauthorized URL scraping, or internal path history storage in the browser.
- **Direct Login Entry & Protected Dashboards:**
  - When opening the platform, users immediately land on the **Login Page (`/login`)**.
  - All role dashboards (`/student`, `/instructor`, `/admin`) are strictly guarded by `RoleGuard.jsx`, redirecting unauthenticated users to `/login`.
  - Upon successful authentication, users are navigated to their corresponding role dashboard.

### 2. Aurora Prism Liquid-Glass UI & Interactive Audio
- **Visual System (`client/src/index.css`, `AppLayout.jsx`):** Multi-hue aurora gradient backdrop, floating rounded dock sidebar (`300px` single-line nav labels), mobile-responsive pill topbars, split-hero login card, and Light/Dark + EN/AR toggles.
- **Audio Feedback (`client/src/utils/soundEffects.js`):** Subtle Web Audio click sound on UI controls (mute/unmute toggle in the top bar) and an ascending chime upon successful login.

### 3. Lesson PDFs & Student Private Annotation Notebook
- **Module (`client/src/features/lessons/LessonLibraryModule.jsx`):** Instructors upload PDF lessons (`renderPdfFileToPages.js` + `extractTextFromPdfFile.js`) stored in Firebase RTDB (`lessonMaterials/`).
- **Private Student Notes:** Students open lesson PDFs in `LiveAnnotationModal.jsx` (`mode="lesson"`), draw/highlight/type/erase across pages, and save personal ink layers & study notes strictly to their own student record (`lessonMaterials/{id}/annotations/{studentId}`).

### 4. PDF Assignments, Dual Solving Mode, Live Annotation & Automated AI Grading
- **Instructor Creation (`client/src/features/assignments/AssignmentsModule.jsx`):** Upload PDF worksheets, set total points (`maxMarks`), set future Due Date (`min={today}`) and Due Time, edit existing assignments (`updateAssignment`), or delete assignments with popup confirmation (`deleteAssignment`).
- **Student Dual Solving Modes:**
  - **Live Annotation Mode (`LiveAnnotationModal.jsx`):** Freehand Pen, Highlighter, Text Tool, Eraser, Undo/Redo, Clear Page, multi-page navigation, and optional written note. Automatically locks and shows `Unavailable — Due date has passed` once the deadline expires.
  - **Upload Solved File Mode (`UploadSolvedAssignmentModal.jsx`):** Students can upload pre-solved PDF documents or clear photos/scans of their solved assignment pages with instant preview, canvas validation, and review before submission.
- **Automated AI Grading Engine (`llm-proxy/routes/assignment.js` → `/api/assignment/grade`):**
  - **Zero-Point Blank Detection**: Worksheets submitted blank or unanswered strictly receive 0 points along with a targeted "What Went Wrong" diagnostic report.
  - **Proportional Scoring**: Submissions with answers receive proportional marks matching demonstrated accuracy, accompanied by detailed "What Went Right" and "What Went Wrong" feedback.
  - **Teacher Model Answer Key**: Automatically provides instructors with model answers, step-by-step solutions, and specific reasons why the student lost points.
- **Instructor Correction Studio:** Teachers can also click **Review & Correct PDF** to draw red/green correction marks directly on student submissions, override or award points (`0..maxMarks`), add feedback, and notify the student.

### 5. Timed Multi-Answer Quizzes, Camera Proctoring & Anti-Cheating
- **Quiz Builder & Player (`client/src/features/quiz/QuizzesModule.jsx`):** Minute-based timer, single/multiple correct answers, AI-assisted drafting (10, 15, or 20 questions), single-entry lock with instructor retake approvals, and integer points scoring (`1, 2, 3... pts`).
- **Webcam Proctoring Gate**: The quiz cannot be started without granting camera permission. A pre-quiz verification modal previews the live camera stream and outlines proctoring rules before entering.
- **Top-Center Floating Proctoring Window (PiP)**: A mirrored live camera feed (160×110 px) fixed at `top: 14px; left: 50%` with a glowing red `LIVE` badge, ensuring the student's face remains monitored without obstructing questions or answer options.
- **AI-Powered Real-Time Mobile Phone Detection**: Continuous client-side object detection using **TensorFlow.js** (`@tensorflow/tfjs`) and **COCO-SSD** (`@tensorflow-models/coco-ssd`). Detecting a `cell phone` in front of the camera triggers an **immediate first-offense quiz termination** without submission as a cheating violation.
- **Instant Camera Covering & Blackout Detection**: Zero-latency canvas luminance and texture variance analysis running immediately upon quiz start without waiting for model downloads. Evaluates both average brightness (`avgBrightness < 35`) and standard deviation (`stdDev < 15`). If the student covers the camera lens (using finger, hand, tape, or paper) or the feed remains black for ~0.9–1.0 second, the quiz terminates immediately for cheating.
- **Camera Disconnect Protection**: Tracks `MediaStreamTrack` status; disconnecting the camera triggers 1 warning, and a second camera closure causes immediate disqualification.
- **Anti-Screenshot & Privacy Shield (Strict 2-Strike System)**: Active quizzes block right-click/copy/cut, listen for `PrintScreen`, snipping shortcuts (`Win+Shift+S`, `Cmd+Shift+3/4/5`), `Ctrl+P`/`Ctrl+S`, `F12`, tab visibility loss, and window blur to hide questions under a **Content Privacy Restricted** overlay with clipboard wiping.
- **Dedicated High-Priority Termination Modal (`z-index: 100010`)**: Unmissable fullscreen modal displaying the exact violation reason (`mobile_phone`, `camera_blackout_covered`, or `privacy_shortcut`), recording the incident in RTDB, and locking re-entry until approved by the instructor.

### 6. 50 IQ Cognitive Puzzle Levels with Strict Single-Attempt Lock (`IQPuzzlesModule.jsx`)
- **50 Calibrated Mental Challenges (`puzzleLevelsData.js`):**
  - Divided into 6 cognitive ranks: *Novice Analyst*, *Logic Operator*, *Pattern Architect*, *Quantum Thinker*, *Cognitive Strategist*, and *IQ Grandmaster*.
  - Total achievable coin bounty across all 50 levels: **12,740 Coins**.
- **Strict Single-Attempt Choice Lock:**
  - Selecting an answer immediately locks all options.
  - If incorrect, the student cannot advance to the next level.
  - A dedicated **Retry Level** button allows the student to reset their selection and try the puzzle again.
- **Sequential Level Progression:**
  - Level $N$ cannot be opened without passing Level $N-1$.
- **Scoreboard Independence:**
  - Puzzle bounty coins provide spendable balance for the Rewards Store, but never alter academic course grades or leaderboard rankings.

### 7. Student Rewards Store & Decoupled Coin Economy (`StudentStoreModule.jsx`, `storeData.js`)
- **Tri-Source Coin Generation:**
  - Quizzes: $10 \text{ coins}$ per earned point.
  - Graded PDF Assignments: $10 \text{ coins}$ per earned point.
  - 50 IQ Puzzles: $+50$ to $+800 \text{ bounty coins}$ per level.
- **Strict Academic Point Protection Guarantee:**
  - Purchasing cosmetic items in the store **strictly spends Coins only** (`availableCoins`).
  - Academic points, course marks, certificate eligibility, and podium standings are permanently protected and never reduced.
- **Cosmetics Catalog:**
  - **8 Glowing Name Tags**: Novice Scholar, Code Ninja, Bug Hunter, AI Pioneer, Byte Master, Logic Wizard, Cyber Sentinel, Grand Alchemist.
  - **8 Liquid-Glass Avatar Frames**: Neon Azure, Emerald Pulse, Golden Radiance, Cyberpunk Violet, Crimson Flame, Quantum Glitch, Starry Nebula, Royal Obsidian.
  - **Robot Chatbot Customization Studio**:
    - **6 Color Skins**: Classic Cobalt, Emerald Bot, Crimson Fury, Cyber Gold, Violet Shadow, Neon Pink.
    - **7 Hats**: Top Hat, Graduation Cap, Beanie, Baseball Cap, Crown, Viking Helmet, Wizard Hat.
    - **6 Glasses**: Nerdy Specs, Cool Shades, Steampunk Goggles, VR Headset, Monocle, Cyber Visor.
    - **5 Shoes**: Sport Sneakers, Cyber Boots, Roller Skates, Golden Kicks, Classic Loafers.
- **Dynamic Cross-Platform Synchronization**: Equipped frames and titles immediately apply to the student's avatar in the sidebar, header coins pill, profile settings modal, and scoreboard podium. Robot cosmetics apply directly to the live floating AI chatbot assistant.

### 8. Points-Based Academic Scoreboard & Luxury Top-3 Official Certificates
- **Stepped Liquid-Glass Podium (`client/src/features/scoreboard/ScoreboardModule.jsx`):** Ranks Top 5 students per course strictly by total earned academic points (`Quiz pts + Assignment pts`). Features an official certification guarantee badge affirming curriculum purity.
- **Luxury Official Top-3 PDF Certificates (`client/src/utils/certificateGenerator.js`):**
  - **1st Place**: **Gold Rank** (`cert_template_1.jpg`) with warm golden guilloche borders, embossed gold seal, and golden rank banner.
  - **2nd Place**: **Silver Rank** (`cert_template_2.jpg`) with cool silver-indigo filigree borders, metallic blue-silver seal, and silver rank banner.
  - **3rd Place**: **Bronze Rank** (`cert_template_3.jpg`) with warm copper-bronze rosettes, metallic bronze seal, and bronze rank banner.
  - **2x Retina Canvas Compositing ($2000 \times 1414 \text{ px}$)**:
    - Inpainted background templates using vertical gradient text-pixel interpolation to eliminate background streaks and border rosette clipping.
    - Zero duplicate citation text: utilizes the template's embedded citation text while cleanly positioning the student's name in prominent cursive script (*Alex Brush* / *Great Vibes*), followed by the official course name and verified academic score at $Y = 965$.
    - Authenticated with instructor's digital cursive signature, official date, and tamper-resistant certificate verification ID.

### 9. Interactive Login Mascot & Eye-Covering Privacy (`LoginPage.jsx`, `RobotMascotSvg.jsx`)
- **Interactive SVG Robot Mascot**: Positioned directly above the authentication card on `LoginPage.jsx`.
- **Complete Eye-Covering (`🙈`) on Password Reveal & Typing**:
  - When typing in the password field, the robot smoothly covers his eyes.
  - When the student clicks the **eye icon** (`showPass`) to reveal the password in plain text, the robot firmly keeps his eyes covered to protect the user's privacy from shoulder-surfers.
- **Inactivity Debounce & Smooth Lowering**: Drops hands back down when typing stops or when switching back to the username field.
- **Cursor Tracking**: Mascot eyes naturally follow the user's mouse cursor across the screen when idle.

### 10. Instructor Student Progress Tracker & Branded Reports
- **Progress Tracker (`client/src/features/instructor/StudentProgressTrackerModule.jsx`):** Instructors choose a student and From/To interval (`To Date` cannot precede `From Date`) to view all quiz marks, assignment submissions, retake logs, Recharts points bar chart, and course breakdown.
- **Report Extraction (`client/src/utils/progressReportGenerator.js`):** Generates branded multi-page PDF reports (with platform logo, `From ... To ...` date range, KPIs, course breakdown, chronological activity logs, and instructor signature) and CSV exports.

### 11. Live Walking Robot Smart Platform Chatbot & Lesson Summarizer
- **UI Mascot & Ergonomics (`client/src/components/common/PlatformChatbotWidget.jsx`):** Animated walking SVG robot launcher positioned ergonomically lower on the screen that opens a Liquid-Glass popup chat.
- **Lesson Summarization Browser**: Clicking the "Summarize a lesson" button lists all available course lessons and PDF materials with interactive chips, allowing the user to pick any lesson for an instant, high-quality AI summary.
- **Sub-3s Multimodal Attachment Analysis**: Direct native fetch connection from backend to Google Gemini 2.5 Flash, providing step-by-step visual explanations of attached photos and PDFs in under 3 seconds.
- **Inline Arabic Translation Engine**: Every assistant response features an instant **"Translate into Arabic"** button (`Languages` icon) in the message footer beside the copy button for immediate, natural Arabic translations.

### 12. Account Security & Privacy Policies
- **Strict Username Validation**: Enforces username length $\ge 8$ characters and the presence of `@` or `_`.
- **Profile Photo Privacy**: The photo upload option has been removed from `ProfileSettingsModal.jsx` to standardize avatar rendering and ensure user privacy.
- **Conditional WhatsApp Support**: Direct instructor WhatsApp button displays only when student academic status indicates "Needs Support".

---

## Automated Verification Results

Executed from project root (`d:\DATA-1\STA\Grade 3\AI\Ai Training & Assessment Platform`):

| Check | Command | Result |
| --- | --- | --- |
| Chatbot, Proctoring & AI Grading Suite | `npm test` (`node scripts/test-platform.mjs`) | **16 / 16 Passed** (`exit code 0`) |
| Client Production Build | `npm run build` | **Passed** (`client/dist` built with zero errors) |
| Linter Check | `node ./client/node_modules/oxlint/bin/oxlint ./client/src` | **0 Errors** (`0` warnings in new/updated engine files) |

### Test Cases Verified (`scripts/test-platform.mjs`)
1. Role-aware greeting response (`EN`, no raw dump)
2. Direct quiz creation & publishing by instructor on a named lesson (question count + duration + published status)
3. Quiz creation fallback offering clickable lesson chips when lesson is omitted
4. Student lookup by name returning exact Quiz pts + Assignment pts + Total pts
5. Course details query (instructor, enrolled count, text & PDF lessons, quizzes, assignments)
6. Live Top-5 scoreboard query
7. Lesson summarization in English & Arabic (generic prompt displays all lesson chips; direct named lesson summarizes immediately)
8. Conceptual Q&A extracted from lesson content
9. Platform workflow guidance (Live Annotation & Quiz Screenshot Privacy)
10. Out-of-scope query handled cleanly without dumping raw dataset strings
11. Backend `/api/chat` grounded fallback unit check
12. Live HTTP proxy verification (`/health`, `/api/chat`, `/api/quiz/generate`, `/api/feedback` returning HTTP `200`)
13. Critical platform modules & built bundle file existence check
14. PDF Blank Submission strictly returns 0 Pts & What-Went-Wrong Report
15. PDF Answered Submission returns proportional score & diagnostic What-Went-Wrong / Right feedback
16. AI Summary Breakdown for Teacher contains model answers & why student was wrong

---

## Running Locally & Deploying
- **Install & Start All Services:** `npm start` (runs Vite client on `http://localhost:5173` and AI proxy on `http://localhost:3001`, plus warms Ollama if installed)
- **Build Client:** `npm run build`
- **Run Automated Tests:** `npm test`
- **Firebase Hosting:** Config in `firebase.json` (`public: "client/dist"`). Add `.firebaserc` / run `firebase use training-assessment-platform` and harden `database.rules.json` before public production deployment.
