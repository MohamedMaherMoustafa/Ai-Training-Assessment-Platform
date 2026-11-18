# Athar Educational Platform — Frontend Client

The frontend application for **Athar Educational Platform (منصة أثر التعليمية)** built with React 19, Vite 8, and Tailwind CSS.

---

## 🚀 Key Modules & Features

### 1. Advanced Quiz Proctoring & Anti-Cheat Engine (`src/features/quiz/QuizzesModule.jsx`)
- **Webcam Pre-Quiz Gate**: Assessments cannot be accessed until the student grants camera permissions and validates the feed via a verification modal.
- **Top-Center Floating PiP Window**: A 160×110 px mirrored live camera feed fixed at `top: 14px; left: 50%` with a glowing red `LIVE` badge, providing continuous face monitoring without obscuring quiz content.
- **On-Device Real-Time Mobile Phone Detection**: Continuous object detection powered by `@tensorflow/tfjs` and `@tensorflow-models/coco-ssd`. Detecting a cell phone triggers **immediate first-offense termination** as a cheating violation without prior warnings.
- **Instant Camera Covering & Blackout Detection**: Zero-latency canvas luminance and texture variance analysis. Evaluates average brightness (`avgBrightness < 35`) and pixel standard deviation (`stdDev < 15`). If the student covers the camera (with finger, hand, tape, or paper) or the screen goes black for ~0.9–1.0 second, the quiz terminates immediately for cheating.
- **Camera Drop Monitoring**: Detects disconnection of the video track. Issues 1 warning; a 2nd disconnection results in immediate quiz cancellation.
- **Screen Capture Shield**: Intercepts `PrintScreen`, `Win+Shift+S`, `Cmd+Shift+3/4/5`, developer tools, printing, window blur, and tab loss. Immediately hides quiz content behind a privacy mask and clears the clipboard.
- **Fullscreen Cheating Violation Modal (`z-index: 100010`)**: Unmissable alert dialog communicating the exact reason for termination to the student and locking re-entry until approved by the instructor.

### 2. Multi-Role Workspaces
- **Student**: Course enrollment, private PDF annotation notebook, interactive timed quizzes, weekly progress tracker, and course scoreboard.
- **Instructor**: Course authoring, lecture PDF uploads with text extraction, assignment creation with due dates, PDF homework correction studio, AI quiz generator, and student progress reports.
- **Admin**: Central platform oversight, instructor account management, platform metrics, and system broadcasts.

### 3. Smart Multimodal AI Chatbot (`src/components/common/PlatformChatbotWidget.jsx`)
- Interactive walking robot mascot (RTL/LTR patrol-aware).
- Text, audio/voice input, and image/PDF attachment support.
- Course lesson summarization, student grade lookup, and educational Q&A.

### 4. Interactive Live PDF Annotation Canvas (`src/features/assignments/LiveAnnotationModal.jsx`)
- Multi-page PDF rendering via Mozilla PDF.js.
- Dual-layer ink pen, highlighter, inline text notes, and eraser.
- Student private study notes and instructor homework grading with score presets.

---

## 🛠️ Technology Stack & Libraries

| Technology | Purpose |
|---|---|
| **React 19 & Vite 8** | Modern UI framework and high-speed build tool |
| **Tailwind CSS 3.4 & Tailwind-RTL** | Liquid glass design language and bidirectional styling |
| **TensorFlow.js (`@tensorflow/tfjs`)** | On-device machine learning runtime |
| **COCO-SSD (`@tensorflow-models/coco-ssd`)** | Real-time object detection (mobile phone recognition) |
| **Mozilla PDF.js (`pdfjs-dist`)** | Client-side PDF page rendering and text extraction |
| **Firebase SDK (`firebase`)** | Realtime Database, Authentication, and Storage |
| **i18next & react-i18next** | Bilingual localization (Arabic RTL & English LTR) |
| **Lucide React** | Consistent SVG iconography |
| **Recharts** | Interactive student progress analytics charts |
| **jsPDF & html2canvas** | Multi-page branded PDF report & certificate generation |

---

## 💻 Development & Building

```bash
# Install dependencies
npm install

# Start Vite development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```
