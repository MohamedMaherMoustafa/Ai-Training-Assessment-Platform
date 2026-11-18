# 🎓 Athar Educational Platform (منصة أثر التعليمية)
### *Learn · Develop · Achieve Your Goals*

[![React 18](https://img.shields.io/badge/React-18-blue.svg)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-6.x-purple.svg)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-38bdf8.svg)](https://tailwindcss.com/)
[![Firebase](https://img.shields.io/badge/Firebase-RTDB%20%26%20Auth-ffca28.svg)](https://firebase.google.com/)
[![AI Engine](https://img.shields.io/badge/Google-Gemini%20AI-4285F4.svg)](https://deepmind.google/technologies/gemini/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

---

## 🌟 Overview

The **Athar Educational Platform (منصة أثر التعليمية)** is an enterprise-grade, intelligent educational web application tailored for technical education, continuous skill assessment, and modern interactive learning. Built with a **modern glassmorphism (liquid glass)** design language, it bridges students, instructors, and system administrators into a seamless, high-performance learning ecosystem.

The platform provides end-to-end support for coursework, lesson materials, digital PDF annotation, AI-generated quizzes with anti-cheating enforcement, automated weekly progress tracking, voice/photo AI assistance, and real-time live performance analytics.

---

## ✨ Key Features & Capabilities

### 1. 👥 Multi-Role Access Control (RBAC)
- **Student**:
  - Browse and enroll in courses provided by chosen instructors.
  - Interactive multi-page PDF reader with private freehand ink drawing, highlighting, and study notebook.
  - Interactive timed quizzes with instant per-question AI explanations.
  - Weekly progress reports arranged week-by-week.
  - Top 5 leaderboard and personal credential updating (name & password).
- **Instructor (Teacher)**:
  - Create and manage courses with English and Arabic curriculum details.
  - Upload lecture PDFs with automatic text extraction for AI features.
  - Publish PDF worksheets/assignments with customizable deadlines and point presets.
  - Correct and annotate submitted student PDF homework in real-time with dual-layer ink pens, stamps, and feedback.
  - Draft interactive quizzes in seconds using Platform AI or custom question authoring.
  - Manage quiz retake requests and monitor student performance.
- **System Administrator**:
  - Comprehensive platform overview with real-time counters and recent event logs.
  - Add, edit, activate/deactivate, and delete instructor accounts.
  - Manage all platform courses and assignments centrally.
  - Full leaderboard access and platform-wide notification broadcasting.

---

### 2. 📝 Interactive Live PDF Annotation Canvas
- **Multi-page PDF Engine**: Renders high-resolution PDF pages directly onto an HTML5 canvas.
- **Drawing Tools**: Smooth ink pen, translucent highlighter, inline text notes, and eraser.
- **Color Palette**: Preset colors with custom stroke widths and smooth bezier interpolation.
- **Private Student Study**: Private ink annotations and personal study notes for every lesson PDF.
- **Instructor Grading Studio**: Dual-layer canvas viewing where teachers inspect student submissions, draw corrections, award points (0–max), write feedback, and notify students instantly.

---

### 3. ⏱️ AI Quizzes & Advanced Anti-Cheating Proctoring
- **Platform AI Quiz Generation**: Automatically generates context-aware multiple-choice questions (MCQs) directly from lesson contents in Arabic or English.
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

### 4. 🤖 Platform AI Chatbot Assistant
- **Multimodal Intelligence**: Accepts text queries, audio/voice inputs (recorded directly in the browser), and attachments (photos and PDF documents).
- **Course & Student Aware**: Can answer conceptual questions, summarize lectures in Arabic or English, look up student marks and rankings, and explain platform mechanics.
- **Safe Guardrails**: Scoped strictly to educational topics without dumping raw internal data.

---

### 5. 📊 Automated 7-Day Weekly Performance Reports
- **Weekly Schedule Engine**: Evaluates student activity and progress every 7 calendar days.
- **Organized View**: Formats historical student performance chronologically (e.g., Week 1, Week 2, Current Week).
- **Automated Notifications**: Automatically dispatches a notification every 7 days inviting the student to view their updated performance breakdown.

---

### 6. 🎨 Glassmorphic UI & Accessibility
- **Modern Liquid Glass Design**: Frosted glass cards, translucent inputs (`.glass-input`), glowing accent indicators, and backdrop blur.
- **Bilingual & RTL/LTR Support**: Fully translated in English (LTR) and Arabic (RTL) with instant language toggle.
- **Theme Modes**: Seamless Dark mode (`#080c1a`) and crisp Light mode with high-contrast text and visible navigation.
- **Upload Progress Modal**: Real-time progress bar displaying upload speed (KB/s, MB/s) and calculated estimated time remaining.

---

## 🛠️ Technology Stack

| Layer | Technologies |
|---|---|
| **Frontend Framework** | React 19, Vite 8, React Router DOM v7 |
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
│   │   └── pdf.worker.min.mjs       # Mozilla PDF.js web worker
│   ├── src/
│   │   ├── components/
│   │   │   ├── common/              # Chatbot widget, profile modal, progress modal
│   │   │   └── layout/              # AppLayout, Sidebar, TopHeader, Notifications
│   │   ├── context/                 # AuthContext, LangContext, PopupContext, UploadContext
│   │   ├── features/
│   │   │   ├── admin/               # Overview & Instructors management
│   │   │   ├── assignments/         # Assignment publishing & Live Annotation studio
│   │   │   ├── auth/                # Login & Registration pages
│   │   │   ├── courses/             # Courses & lesson material management
│   │   │   ├── lessons/             # PDF Lesson library & student private notebooks
│   │   │   ├── quiz/                # AI Quiz builder & interactive exam runner
│   │   │   ├── reports/             # Weekly 7-day performance reports module
│   │   │   └── scoreboard/          # Dynamic top 5 leaderboard
│   │   ├── locales/                 # ar.json & en.json translation bundles
│   │   ├── services/                # platformService.js (RTDB & Auth business logic)
│   │   ├── utils/                   # pdfPageRenderer, pdfExtractor, soundEffects
│   │   ├── App.jsx                  # Main application routing
│   │   └── index.css                # Glassmorphic component styles & utility classes
│   └── package.json
├── llm-proxy/                       # Node.js backend proxy for Gemini AI API
│   ├── server.js                    # Express endpoints (/api/chat, /api/quiz/generate, etc.)
│   └── package.json
├── scripts/
│   └── test-platform.mjs            # Automated 13-point platform verification suite
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
   Navigate to `http://localhost:5173`.

---

## 🧪 Automated Verification Suite

The repository includes a comprehensive 13-stage test suite covering AI chatbot responses, quiz generation, scoreboard queries, lesson conceptual summarization, and build integrity:

```bash
node scripts/test-platform.mjs
```

---

## 📄 License
This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.

