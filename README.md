# 🎓 Athar Educational Platform (منصة أثر التعليمية)
### *Learn · Develop · Achieve Your Goals*

[![React 19](https://img.shields.io/badge/React-19-blue.svg)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-6.x-purple.svg)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-38bdf8.svg)](https://tailwindcss.com/)
[![Firebase](https://img.shields.io/badge/Firebase-RTDB%20%26%20Auth-ffca28.svg)](https://firebase.google.com/)
[![AI Engine](https://img.shields.io/badge/Google-Gemini%20AI-4285F4.svg)](https://deepmind.google/technologies/gemini/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

---

## 🌟 Overview

The **Athar Educational Platform (منصة أثر التعليمية)** is an enterprise-grade, intelligent educational web application tailored for technical education, continuous skill assessment, and modern interactive learning. Built with a **modern glassmorphism (liquid glass)** design language, it bridges students, instructors, and system administrators into a seamless, high-performance learning ecosystem.

The platform provides end-to-end support for coursework, lesson materials, digital PDF annotation, AI-generated quizzes with anti-cheating enforcement, automated weekly progress tracking, voice/photo AI assistance, a gamified 50-level cognitive puzzle engine, student rewards economy, official luxury Top-3 certificates, and real-time live performance analytics.

---

## ✨ Key Features & Capabilities

### 1. 👥 Multi-Role Access Control (RBAC) & In-Memory Routing
- **In-Memory Navigation (`MemoryRouter`) & Direct Login Entry**:
  - The application utilizes in-memory client-side routing, keeping the browser address bar clean and static at the root host (`/`).
  - Internal URLs and route transitions are never stored in browser history, preventing unauthorized URL inspection or manual URL tampering.
  - When opening the platform, users are immediately greeted with the **Login Page (`/login`)** as the primary entry point. Upon authenticating, users are securely routed to their designated role workspace (**Student**, **Instructor**, or **Admin**).
- **Student**:
  - Browse and enroll in courses provided by chosen instructors.
  - Interactive multi-page PDF reader with private freehand ink drawing, highlighting, and study notebook.
  - Interactive timed quizzes with instant per-question AI explanations.
  - Weekly progress reports arranged week-by-week.
  - Top 5 leaderboard, gamified Rewards Store, and 50 Cognitive IQ Puzzles.
- **Instructor (Teacher)**:
  - Create and manage courses with English and Arabic curriculum details.
  - Upload lecture PDFs with automatic text extraction for AI features.
  - Publish PDF worksheets/assignments with customizable deadlines and point presets.
  - Correct and annotate submitted student PDF homework in real-time with dual-layer ink pens, stamps, and feedback.
  - Draft interactive quizzes in seconds using Platform AI (10, 15, or 20 questions) or custom question authoring.
  - Manage quiz retake requests, student progress analytics, and print luxury official Top-3 PDF certificates.
- **System Administrator**:
  - Comprehensive platform overview with real-time counters and recent event logs.
  - Add, edit, activate/deactivate, and delete instructor accounts.
  - Manage all platform courses and assignments centrally.
  - Full leaderboard access, luxury certificate issuance, and platform-wide notification broadcasting.

---

### 2. 📝 Assignments Studio & Dual Solving Mode (Live Annotation + Upload Solved PDF/Image)
- **Multi-page PDF Engine**: Renders high-resolution PDF pages directly onto an HTML5 canvas.
- **Watermarked Assignment PDF Download (`assignmentPdfDownloader.js`)**:
  - Students can download the assignment worksheet to solve offline on tablets, computers, or by printing.
  - Automatically imprints an official semi-transparent platform watermark (`"ATHAR EDUCATIONAL PLATFORM • منصة أثر التعليمية"`) across every page alongside security sub-banners and page numbers.
- **Dual Solving Options**:
  - **Live Annotation Mode**: Smooth ink pen, translucent highlighter, inline text notes, and eraser on digital PDF worksheets with deadline lock (`Unavailable — Due date has passed`).
  - **Upload Solved File Mode (`UploadSolvedAssignmentModal.jsx`)**: Students can upload their pre-solved PDF or scan/photo of handwritten sheets with instant page preview and verification.
- **Automated AI Grading & Diagnostic Breakdown (`/api/assignment/grade`)**:
  - Extracts and analyzes answers using Google Gemini multimodal vision.
  - **Strict Blank Detection**: Blank/unanswered worksheets are accurately awarded 0 points with a clear "What Went Wrong" diagnostic report.
  - **Proportional Scoring**: Evaluates completed work against question weights, generating detailed "What Went Right" and "What Went Wrong" reports.
  - **Teacher Model Answer Key**: Provides instructors with a comprehensive summary breakdown, model answers, and exact reasons why students lost points.
- **Instructor Grading Studio**: Dual-layer canvas viewing where teachers inspect student submissions, draw corrections, award points (0–max), write feedback, and notify students instantly.

---

### 3. 💬 Real-Time Direct Chat & Live Attention Badges
- **1-on-1 Student-Instructor Chat**: Real-time direct messaging channels powered by Firebase RTDB (`directChats/`).
- **Sidebar Unread Counter Badge**: Dynamically calculates unread messages based on user role (`unreadByInstructor` for instructors, `unreadByStudent` for students) and displays a vibrant gradient badge with a pulsing ping indicator beside the Direct Chat module.
- **Mobile Menu Notification Indicator**: Floating red attention dot on the mobile hamburger menu button alerting users to unread messages even when the sidebar is collapsed.
- **Instant Auto-Clear**: Automatically resets unread counters in real time when conversations are opened or while actively chatting.

---

### 4. 🤖 Platform AI Chatbot Assistant, Splash Intro & Inline Arabic Translation
- **Walking Mascot Splash Intro (`WalkingRobotIntro.jsx`)**: An animated robot walks across the center from left to right on website entry, dynamically writing **"ATHAR AI"** across the screen in futuristic glowing typography.
- **Multimodal Intelligence**: Accepts text queries and instant file attachments (photos, diagrams, and PDF documents) with sub-3s response times powered by native global fetch to Gemini API.
- **Inline Arabic Translation Engine**: Every assistant response features an instant **"Translate into Arabic"** button (`Languages` icon) in the message footer beside the copy button, allowing students to translate any explanation or answer into clear, natural Arabic instantly.
- **Course & Lesson Summarization Browser**: Clicking the **"Summarize a lesson"** action lists all available lessons in the course with interactive chips, allowing the user to select any lesson for an immediate AI summary.
- **Course & Student Aware**: Can answer conceptual questions, look up student marks and rankings, and explain platform mechanics.
- **Safe Guardrails**: Scoped strictly to educational topics without dumping raw internal data.

---

### 5. ⏱️ AI Quizzes (10, 15, or 20 Questions) & Advanced Anti-Cheating Proctoring
- **Flexible AI Question Generation Presets**: Instructors can generate quizzes instantly with three dedicated question count options: **10 Questions**, **15 Questions**, or **20 Questions**, tailoring the assessment depth to lesson scope and exam requirements.
- **Interactive Timer**: Configurable duration in minutes with a real-time countdown clock and auto-submit on time expiry.
- **Pre-Quiz Webcam Gate**: Students cannot initiate an assessment without enabling their camera. A pre-quiz verification modal previews the video feed and confirms active proctoring before releasing questions.
- **Top-Center Floating Proctoring Window (PiP)**: A persistent 160×110px mirrored live video feed anchored at `top: 14px; left: 50%` with a glowing red `LIVE` indicator, keeping questions and answer choices completely unobstructed.
- **Real-Time On-Device AI Mobile Phone Detection**: Powered by client-side **TensorFlow.js** and **COCO-SSD** running at ~3 fps. If a mobile device (`cell phone`) is placed in front of the camera, the quiz is **terminated immediately on the first offense** as a strict cheating violation without grace warnings.
- **Instant Real-Time Camera Covering & Blackout Detection**: Zero-latency canvas luminance and texture variance analysis. Evaluates both average brightness (`avgBrightness < 35`) and standard deviation (`stdDev < 15`). If the student covers the lens with a finger, hand, tape, or paper, or creates a black screen for ~0.9–1.0 second, the quiz terminates immediately for cheating.
- **Camera Drop Monitoring**: Detects sudden camera stream termination. Issues 1 critical warning with re-activation options; a second camera disconnect immediately cancels and disqualifies the quiz.
- **Screen Capture Shield (2-Strike System)**: Detects `PrintScreen`, `Win+Shift+S`, `Cmd+Shift+3/4/5`, developer tools, printing, window blur, and tab switching. Instantly masks content behind a blackout privacy shield and destroys clipboard data.
- **Fullscreen Cheating Violation Overlay**: Unmissable high-priority modal (`z-index: 100010`) explaining the exact reason for termination (`mobile_phone`, `camera_blackout_covered`, or `privacy_shortcut`), permanently logging the infraction in instructor records, and locking re-entry until instructor approval.
- **Single-Entry Lockdown & Retake Workflow**: Students are limited to a single attempt unless explicitly requesting a retake approved by their instructor.

---

### 6. 🪙 Student Rewards Store & Gamified Coin Economy (`/student/store`)
- **Tri-Source Coin Generation**:
  1. **Quizzes**: Automatically awards $10\text{ coins}$ per earned academic point ($1 \text{ pt} = 10 \text{ coins}$).
  2. **Graded PDF Assignments**: Automatically awards $10\text{ coins}$ per earned assignment point ($1 \text{ pt} = 10 \text{ coins}$).
  3. **Cognitive IQ Puzzles**: Awards lucrative level bounty coins (+50 to +800 coins per level) across 50 progressive mental challenges.
- **Strict Academic Score Protection Guarantee**:
  - Purchasing cosmetic items in the Rewards Store **strictly spends Coins only** (`availableCoins = totalCoinsEarned - spentCoins`).
  - **Academic points, course grades, official scoreboard rankings, and certificate eligibility are permanently protected and never reduced.**
- **Complete Cosmetics Catalog (`storeData.js`)**:
  - **8 Glowing Name Tags / Titles**: *Novice Scholar*, *Code Ninja*, *Bug Hunter*, *AI Pioneer*, *Byte Master*, *Logic Wizard*, *Cyber Sentinel*, and *Grand Alchemist*.
  - **8 Liquid-Glass Animated Avatar Frames**: *Neon Azure*, *Emerald Pulse*, *Golden Radiance*, *Cyberpunk Violet*, *Crimson Flame*, *Quantum Glitch*, *Starry Nebula*, and *Royal Obsidian*.
  - **Chatbot Customization Studio**:
    - **6 Robot Skins**: Classic Cobalt, Emerald Bot, Crimson Fury, Cyber Gold, Violet Shadow, and Neon Pink.
    - **7 Hats / Headwear**: Top Hat, Graduation Cap, Beanie, Baseball Cap, Crown, Viking Helmet, and Wizard Hat.
    - **6 Glasses / Eyewear**: Nerdy Specs, Cool Shades, Steampunk Goggles, VR Headset, Monocle, and Cyber Visor.
    - **5 Shoes / Footwear**: Sport Sneakers, Cyber Boots, Roller Skates, Golden Kicks, and Classic Loafers.
- **Live Dynamic Synchronization**: Equipped items update in real time across the platform:
  - Active Avatar Frame & Name Tag appear on the Student Sidebar profile card, Header Coins Pill, Profile Settings Modal, and Top-3 Podium on the Course Scoreboard.
  - Active Robot Skin and Accessories immediately customize the floating AI Assistant mascot across all student screens.

---

### 7. 🧠 50 IQ Cognitive Puzzle Levels with Strict Single-Attempt Lock (`IQPuzzlesModule.jsx`)
- **50 Ascending Difficulty Levels**:
  - Spans 6 progressive mental tiers:
    1. **Tier 1 (Levels 1–8)**: *Novice Analyst* (+50 to +90 coins).
    2. **Tier 2 (Levels 9–16)**: *Logic Operator* (+100 to +170 coins).
    3. **Tier 3 (Levels 17–25)**: *Pattern Architect* (+180 to +260 coins).
    4. **Tier 4 (Levels 26–34)**: *Quantum Thinker* (+280 to +400 coins).
    5. **Tier 5 (Levels 35–42)**: *Cognitive Strategist* (+420 to +560 coins).
    6. **Tier 6 (Levels 43–50)**: *IQ Grandmaster* (+580 to +800 coins).
  - Total achievable coin bounty across all 50 levels: **12,740 Coins**.
- **Strict Single-Attempt Choice Lock**:
  - Once a student selects an answer, the choices are immediately locked (`selectedAnswer !== null` locks all buttons).
  - If the choice is incorrect, the student cannot advance to the next level.
  - An interactive **Retry Level** button allows resetting the current puzzle to try again.
- **Sequential Level Unlocking**:
  - Level $N$ is strictly locked until Level $N-1$ is solved and verified.
  - Level state cards clearly distinguish **Solved** (green checkmark), **Current Available** (active play button), and **Locked** (padlock icon).
- **Absolute Scoreboard Decoupling**:
  - Puzzles award spendable bounty coins for the Rewards Store, but **puzzle points are 100% decoupled from the academic scoreboard**. The course leaderboard remains strictly dedicated to academic curriculum mastery (Quizzes + Graded Assignments).

---

### 8. 🏆 Decoupled Scoreboard & Luxury Top-3 Official Certificates
- **Pure Curriculum Scoreboard (`ScoreboardModule.jsx`)**:
  - Ranks students strictly by academic mastery: $\text{Total Score} = \text{Quiz Points} + \text{Assignment Points}$.
  - Features an **Official Certification Guarantee Badge** affirming that coin spendings and puzzle games never modify podium rankings.
  - Stepped Liquid-Glass podium celebrating the Top 3 students with crowns, medals, and equipped cosmetics.
- **Luxury Official Top-3 PDF Certificates (`certificateGenerator.js`)**:
  - Instructors and Admins can generate and print high-resolution official certificates for the top 3 ranking students:
    - **1st Place**: **Gold Rank** (`cert_template_1.jpg`) with warm golden guilloche borders, embossed gold seal, and ornate cursive calligraphy.
    - **2nd Place**: **Silver Rank** (`cert_template_2.jpg`) with cool silver-indigo filigree borders, metallic blue-silver seal, and silver rank banner.
    - **3rd Place**: **Bronze Rank** (`cert_template_3.jpg`) with warm copper-bronze rosettes, metallic bronze seal, and bronze rank banner.
  - **2x Retina Canvas Rendering ($2000 \times 1414 \text{ px}$)**:
    - Inpainted background templates using vertical gradient text-pixel interpolation to eliminate background streaks and border rosette clipping.
    - Zero duplicate citation text: utilizes the template's embedded citation text while cleanly positioning the student's name in prominent cursive script (*Alex Brush* / *Great Vibes*), followed by the official course name and verified academic score at $Y = 965$.
    - Authenticated with instructor's digital cursive signature, official date, and tamper-resistant certificate verification ID.

---

### 9. 🙈 Interactive Login Mascot (Eye-Covering Privacy Animation)
- **Interactive SVG Robot Mascot (`RobotMascotSvg.jsx`)**: Positioned above the authentication card on `LoginPage.jsx`.
- **Complete Eye-Covering (`🙈`) on Password Reveal & Typing**:
  - When typing in the password field, the robot smoothly covers his eyes.
  - When the student clicks the **eye icon** (`showPass`) to reveal the password in plain text, the robot firmly keeps his eyes covered to protect the user's privacy from shoulder-surfers.
- **Inactivity Debounce & Smooth Lowering**: Drops hands back down when typing stops or when switching back to the username field.
- **Cursor Tracking**: Mascot eyes naturally follow the user's mouse cursor across the screen when idle.

---

### 10. 📊 Automated 7-Day Weekly Performance Reports
- **Weekly Schedule Engine**: Evaluates student activity and progress every 7 calendar days.
- **Organized View**: Formats historical student performance chronologically (e.g., Week 1, Week 2, Current Week).
- **Automated Notifications**: Automatically dispatches a notification every 7 days inviting the student to view their updated performance breakdown.

---

### 11. 🛡️ System Security & Conditional Support
- **Strict Username Validation**: Instructor account creation and student registration strictly require usernames to be at least 8 characters long and contain either `@` or `_` (e.g., `student_user`, `john@athar`).
- **Profile Privacy**: Profile photo upload options are safely removed from the profile modal to maintain privacy and standardized avatar rendering.
- **Conditional WhatsApp Support Button**: The student dashboard displays the direct WhatsApp instructor contact button **only when the student's status is "Needs Support"**, keeping the interface clean and distraction-free when academic performance is on track.

---

### 12. 🎨 Glassmorphic UI & Accessibility
- **Modern Liquid Glass Design**: Frosted glass cards, translucent inputs (`.glass-input`), glowing accent indicators, and backdrop blur.
- **Bilingual & RTL/LTR Support**: Fully translated in English (LTR) and Arabic (RTL) with instant language toggle.
- **Theme Modes**: Seamless Dark mode (`#080c1a`) and crisp Light mode with high-contrast text and visible navigation.
- **Upload Progress Modal**: Real-time progress bar displaying upload speed (KB/s, MB/s) and calculated estimated time remaining.

---

## 🛠️ Technology Stack

| Layer | Technologies |
|---|---|
| **Frontend Framework** | React 19, Vite 8, React Router DOM v7 (MemoryRouter for in-memory security) |
| **Styling & UI** | Tailwind CSS 3.4, Custom Glassmorphism System, Lucide React Icons |
| **Computer Vision & Proctoring** | TensorFlow.js (`@tensorflow/tfjs`), COCO-SSD (`@tensorflow-models/coco-ssd`), WebRTC MediaDevices API |
| **Document Processing** | PDF.js (Mozilla), HTML5 Canvas 2D Rendering Engine, HTML2Canvas, jsPDF |
| **Backend & Realtime DB** | Firebase Realtime Database (RTDB), Firebase Authentication |
| **AI LLM Proxy** | Node.js, Express, Google Gemini 2.5 Flash / Pro API |
| **Internationalization** | i18next, react-i18next (English & Arabic RTL) |
| **State & Notifications** | React Context API, React Hot Toast, Native Audio FX |

---

## 📁 Repository Structure

```
.
├── client/                          # React + Vite Frontend Application
│   ├── public/
│   │   ├── Logo.png                 # Platform transparent brand logo
│   │   ├── cert_template_1.jpg      # Gold 1st Place certificate template
│   │   ├── cert_template_2.jpg      # Silver 2nd Place certificate template
│   │   ├── cert_template_3.jpg      # Bronze 3rd Place certificate template
│   │   └── pdf.worker.min.mjs       # Mozilla PDF.js web worker
│   ├── src/
│   │   ├── components/
│   │   │   ├── common/              # Chatbot widget, profile modal, progress modal, RobotMascotSvg
│   │   │   └── layout/              # AppLayout, Sidebar, TopHeader, Notifications
│   │   ├── context/                 # AuthContext (MemoryRouter session management), LangContext, PopupContext
│   │   ├── features/
│   │   │   ├── admin/               # Overview & Instructors management
│   │   │   ├── assignments/         # Assignment publishing & Live Annotation studio
│   │   │   ├── auth/                # Login (with eye-covering mascot) & Registration pages
│   │   │   ├── courses/             # Courses & lesson material management
│   │   │   ├── lessons/             # PDF Lesson library & student private notebooks
│   │   │   ├── puzzles/             # 50 Cognitive IQ Puzzles module (single-attempt lock)
│   │   │   ├── quiz/                # AI Quiz builder (10/15/20 questions) & proctored exam runner
│   │   │   ├── reports/             # Weekly 7-day performance reports module
│   │   │   ├── scoreboard/          # Pure academic leaderboard & luxury Top-3 certificates
│   │   │   └── store/               # Student Rewards Store & cosmetic customization studio
│   │   ├── locales/                 # ar.json & en.json translation bundles
│   │   ├── services/                # platformService.js (RTDB & Auth business logic)
│   │   ├── utils/                   # certificateGenerator.js, pdfPageRenderer, pdfExtractor
│   │   ├── App.jsx                  # MemoryRouter application root
│   │   └── index.css                # Glassmorphic component styles & utility classes
│   └── package.json
├── llm-proxy/                       # Node.js backend proxy for Gemini AI API
│   ├── server.js                    # Express endpoints (/api/chat, /api/quiz/generate, /api/assignment/grade)
│   └── package.json
├── scripts/
│   └── test-platform.mjs            # Automated 16-point platform verification suite
└── package.json                     # Root orchestrator scripts
```

---

## 🚀 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (version 18 or higher recommended)
- [Git](https://git-scm.com/)
- A Google Gemini API key (optional for local mock fallback)

---

### Installation & Setup

1. **Clone the Repository**:
   ```bash
   git clone https://github.com/MohamedMaherMoustafa/Ai-Training-Assessment-Platform.git
   cd Ai-Training-Assessment-Platform
   ```

2. **Install Root and Client Dependencies**:
   ```bash
   npm install
   npm --prefix client install
   npm --prefix llm-proxy install
   ```

3. **Configure Environment Variables**:
   Create or edit `llm-proxy/.env`:
   ```env
   PORT=3001
   GEMINI_API_KEY=your_gemini_api_key_here
   ```

4. **Start the Development Environment**:
   You can run both the LLM backend proxy and client simultaneously:
   ```bash
   # Terminal 1: Start LLM Proxy Server
   cd llm-proxy
   node server.js

   # Terminal 2: Start Client Development Server
   cd client
   npm run dev
   ```

5. **Open in Browser**:
   Navigate to `http://localhost:5173`. The platform launches directly to the Login Page with clean in-memory routing keeping the browser address bar static at the root host.

---

## 🧪 Automated Verification Suite

The repository includes a comprehensive 16-stage test suite covering AI chatbot responses, quiz generation, scoreboard queries, lesson conceptual summarization, automated PDF grading diagnostics, and build integrity:

```bash
node scripts/test-platform.mjs
```

---

## 📄 License
This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.
