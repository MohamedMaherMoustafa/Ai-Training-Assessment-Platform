# Athar Educational Platform — Frontend Client

The frontend application for **Athar Educational Platform (منصة أثر التعليمية)** built with React 19, Vite 8, and Tailwind CSS.

---

## 🚀 Key Modules & Features

### 1. Advanced Quiz Proctoring & Anti-Cheat Engine (`src/features/quiz/QuizzesModule.jsx`)
- **Flexible AI Question Presets**: Generates 10, 15, or 20 multiple-choice questions per assessment with dedicated creation buttons tailored for quick checks or comprehensive exams.
- **Webcam Pre-Quiz Gate**: Assessments cannot be accessed until the student grants camera permissions and validates the feed via a verification modal.
- **Top-Center Floating PiP Window**: A 160×110 px mirrored live camera feed fixed at `top: 14px; left: 50%` with a glowing red `LIVE` badge, providing continuous face monitoring without obscuring quiz content.
- **On-Device Real-Time Mobile Phone Detection**: Continuous object detection powered by `@tensorflow/tfjs` and `@tensorflow-models/coco-ssd`. Detecting a cell phone triggers **immediate first-offense termination** as a cheating violation without prior warnings.
- **Instant Camera Covering & Blackout Detection**: Zero-latency canvas luminance and texture variance analysis. Evaluates average brightness (`avgBrightness < 35`) and pixel standard deviation (`stdDev < 15`). If the student covers the camera (with finger, hand, tape, or paper) or the screen goes black for ~0.9–1.0 second, the quiz terminates immediately for cheating.
- **Camera Drop Monitoring**: Detects disconnection of the video track. Issues 1 warning; a 2nd disconnection results in immediate quiz cancellation.
- **Screen Capture Shield**: Intercepts `PrintScreen`, `Win+Shift+S`, `Cmd+Shift+3/4/5`, developer tools, printing, window blur, and tab loss. Immediately hides quiz content behind a privacy mask and clears the clipboard.
- **Fullscreen Cheating Violation Modal (`z-index: 100010`)**: Unmissable alert dialog communicating the exact reason for termination to the student and locking re-entry until approved by the instructor.

### 2. Multi-Role Workspaces
- **Student**: Course enrollment, private PDF annotation notebook, interactive timed quizzes, weekly progress tracker, course scoreboard, gamified Cognitive IQ Puzzles, and Rewards Store.
  - **Conditional WhatsApp Support**: Direct WhatsApp button for instructor communication is dynamically displayed only when student status is "Needs Support".
- **Instructor**: Course authoring, lecture PDF uploads with text extraction, assignment creation with due dates, PDF homework correction studio, AI quiz generator (10/15/20 questions), and student progress reports.
- **Admin**: Central platform oversight, instructor account management, platform metrics, and system broadcasts.
- **Security & Validation**: Strict username validation rule enforced on instructor creation and student registration (`username.length >= 8` and must contain `@` or `_`).

### 3. Smart Multimodal AI Chatbot (`src/components/common/PlatformChatbotWidget.jsx`)
- Interactive walking robot mascot (RTL/LTR patrol-aware) and website intro splash screen (`WalkingRobotIntro.jsx`).
- Multimodal intelligence: high-speed text analysis and instant photo/PDF document parsing.
- **Inline Arabic Translation Toggle**: Dedicated "Translate into Arabic" button (`Languages` icon) in the footer of every assistant response beside the copy button for immediate, natural Arabic translations.
- Lesson Summarization browser: lists all available course lessons with quick-action chips for instant AI summary generation.
- Course lesson summarization, student grade lookup, and educational Q&A.

### 4. Direct Chat Real-Time Attention Badges (`src/components/layout/AppLayout.jsx`)
- Real-time unread message counter badge on the sidebar Direct Chat navigation link.
- Mobile hamburger menu notification indicator for unread direct messages.
- Instant real-time unread clear when reading or actively chatting in a conversation.

### 5. Interactive Live PDF Annotation Canvas & Solved Uploads
- Multi-page PDF rendering via Mozilla PDF.js.
- Watermarked assignment PDF downloader (`assignmentPdfDownloader.js`) applying the platform name watermark across every worksheet page for offline solving or printing.
- Dual-layer ink pen, highlighter, inline text notes, and eraser (`LiveAnnotationModal.jsx`).
- Solved PDF / image upload modal (`UploadSolvedAssignmentModal.jsx`) with multi-page preview.
- AI auto-grading with blank worksheet detection (0 pts), proportional scoring, diagnostic feedback, and teacher model answer keys.
- Student private study notes and instructor homework grading with score presets.

### 6. Student Rewards Store & Coin Economy (`src/features/store/StudentStoreModule.jsx`)
- **Coin Conversion System**: Academic points earned from Quizzes and Assignments automatically convert to spendable Coins ($1 \text{ Academic Point} = 10 \text{ Coins}$), augmented by Cognitive IQ Puzzle rewards (+15 to +400 coins per solved puzzle).
- **Strict Academic Point Protection**: Buying items in the store **only deducts from Coins**. Academic points, course marks, certificate eligibility, and podium standings are never affected.
- **Cosmetics Catalog (`src/features/store/storeData.js`)**:
  - **8 Glowing Name Tags**: Novice Scholar, Code Ninja, Bug Hunter, AI Pioneer, Byte Master, Logic Wizard, Cyber Sentinel, Grand Alchemist.
  - **8 Liquid-Glass Avatar Frames**: Neon Azure, Emerald Pulse, Golden Radiance, Cyberpunk Violet, Crimson Flame, Quantum Glitch, Starry Nebula, Royal Obsidian.
  - **Robot Chatbot Customization Studio**:
    - **6 Color Skins**: Classic Cobalt, Emerald Bot, Crimson Fury, Cyber Gold, Violet Shadow, Neon Pink.
    - **7 Hats**: Top Hat, Graduation Cap, Beanie, Baseball Cap, Crown, Viking Helmet, Wizard Hat.
    - **6 Glasses**: Nerdy Specs, Cool Shades, Steampunk Goggles, VR Headset, Monocle, Cyber Visor.
    - **5 Shoes**: Sport Sneakers, Cyber Boots, Roller Skates, Golden Kicks, Classic Loafers.
- **Dynamic Cross-Platform Synchronization**: Equipped frames and titles immediately apply to the student's avatar in the sidebar, header coins pill, profile settings modal, and scoreboard podium. Robot cosmetics apply directly to the live floating AI chatbot assistant.

### 7. Interactive Login Mascot (`src/components/common/RobotMascotSvg.jsx` & `LoginPage.jsx`)
- Interactive SVG Robot Mascot sitting atop the login portal card.
- **Eye-Covering Password Animation**: When the user types into the password input, the robot raises his hands and covers his eyes with his fingers.
- **Inactivity Debounce & Blur**: Drops hands and uncovers eyes after 1 second of typing inactivity or when the password field is blurred.
- **Peeking Animation**: If the password visibility toggle (`showPass`) is active, the robot peeks playfully between parted fingers!
- State-aware expressions for idle and username typing states.

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
