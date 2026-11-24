# Athar Educational Platform — Frontend Client

The frontend application for **Athar Educational Platform (منصة أثر التعليمية)** built with React 19, Vite 8, Tailwind CSS, and in-memory routing architecture.

---

## 🚀 Key Modules & Features

### 1. In-Memory Routing Architecture & Direct Login Entry (`src/App.jsx`, `src/context/AuthContext.jsx`)
- **Address Bar Independence (`MemoryRouter`)**:
  - The entire routing system is powered by `react-router-dom`'s `MemoryRouter`. The browser URL remains fixed at the root host (`/`), completely preventing route tampering, unauthorized URL scraping, or path history tracking in the browser.
- **Direct Login Entry & Protected Workspaces**:
  - When opening the platform, the first screen presented is the **Login Page (`/login`)**.
  - All workspace modules are protected by `RoleGuard.jsx`. Once credentials are authenticated, the user is navigated to their designated dashboard (`/student`, `/instructor`, or `/admin`).
  - Account registration is accessible via `/register`.

### 2. Advanced Quiz Proctoring & Anti-Cheat Engine (`src/features/quiz/QuizzesModule.jsx`)
- **Flexible AI Question Presets**: Generates 10, 15, or 20 multiple-choice questions per assessment with dedicated creation buttons tailored for quick checks or comprehensive exams.
- **Webcam Pre-Quiz Gate**: Assessments cannot be accessed until the student grants camera permissions and validates the feed via a verification modal.
- **Top-Center Floating PiP Window**: A 160×110 px mirrored live camera feed fixed at `top: 14px; left: 50%` with a glowing red `LIVE` badge, providing continuous face monitoring without obscuring quiz content.
- **On-Device Real-Time Mobile Phone Detection**: Continuous object detection powered by `@tensorflow/tfjs` and `@tensorflow-models/coco-ssd`. Detecting a cell phone triggers **immediate first-offense termination** as a cheating violation without prior warnings.
- **Instant Camera Covering & Blackout Detection**: Zero-latency canvas luminance and texture variance analysis. Evaluates average brightness (`avgBrightness < 35`) and pixel standard deviation (`stdDev < 15`). If the student covers the camera (with finger, hand, tape, or paper) or the screen goes black for ~0.9–1.0 second, the quiz terminates immediately for cheating.
- **Camera Drop Monitoring**: Detects disconnection of the video track. Issues 1 warning; a 2nd disconnection results in immediate quiz cancellation.
- **Screen Capture Shield**: Intercepts `PrintScreen`, `Win+Shift+S`, `Cmd+Shift+3/4/5`, developer tools, printing, window blur, and tab loss. Immediately hides quiz content behind a privacy mask and clears the clipboard.
- **Fullscreen Cheating Violation Modal (`z-index: 100010`)**: Unmissable alert dialog communicating the exact reason for termination to the student and locking re-entry until approved by the instructor.

### 3. 50 Cognitive IQ Puzzles with Single-Attempt Lock (`src/features/puzzles/IQPuzzlesModule.jsx`)
- **50 Progressively Calibrated Levels (`puzzleLevelsData.js`)**:
  - Spans 6 mental rank tiers: *Novice Analyst*, *Logic Operator*, *Pattern Architect*, *Quantum Thinker*, *Cognitive Strategist*, and *IQ Grandmaster*.
  - Total achievable coin bounty across all 50 levels: **12,740 Coins**.
- **Strict Single-Attempt Choice Lock**:
  - Answer buttons lock immediately upon the first click (`selectedAnswer !== null`).
  - Wrong answers strictly block advancement to the next level.
  - A dedicated **Retry Level** button allows the student to reset their selection and try the puzzle again.
- **Sequential Level Unlocking**:
  - Level $N$ is locked until Level $N-1$ is solved and verified.
- **Scoreboard Decoupling**:
  - Solved puzzles award spendable bounty coins for the Rewards Store, but never impact or modify academic course scores.

### 4. Student Rewards Store & Decoupled Coin Economy (`src/features/store/StudentStoreModule.jsx`)
- **Tri-Source Coin Generation**:
  - Quizzes: $10 \text{ coins}$ per earned point.
  - Graded PDF Assignments: $10 \text{ coins}$ per earned point.
  - 50 IQ Puzzles: $+50$ to $+800 \text{ bounty coins}$ per level.
- **Academic Point Protection Guarantee**:
  - Purchasing cosmetic items in the store **strictly spends Coins only** (`availableCoins`).
  - Academic points, course marks, certificate eligibility, and podium standings are never deducted.
- **Cosmetics Catalog (`src/features/store/storeData.js`)**:
  - **8 Glowing Name Tags**: Novice Scholar, Code Ninja, Bug Hunter, AI Pioneer, Byte Master, Logic Wizard, Cyber Sentinel, Grand Alchemist.
  - **8 Liquid-Glass Avatar Frames**: Neon Azure, Emerald Pulse, Golden Radiance, Cyberpunk Violet, Crimson Flame, Quantum Glitch, Starry Nebula, Royal Obsidian.
  - **Robot Chatbot Customization Studio**:
    - **6 Color Skins**: Classic Cobalt, Emerald Bot, Crimson Fury, Cyber Gold, Violet Shadow, Neon Pink.
    - **7 Hats**: Top Hat, Graduation Cap, Beanie, Baseball Cap, Crown, Viking Helmet, Wizard Hat.
    - **6 Glasses**: Nerdy Specs, Cool Shades, Steampunk Goggles, VR Headset, Monocle, Cyber Visor.
    - **5 Shoes**: Sport Sneakers, Cyber Boots, Roller Skates, Golden Kicks, Classic Loafers.
- **Dynamic Cross-Platform Synchronization**: Equipped frames and titles immediately apply to the student's avatar in the sidebar, header coins pill, profile settings modal, and scoreboard podium. Robot cosmetics apply directly to the live floating AI chatbot assistant.

### 5. Luxury Official Top-3 PDF Certificates (`src/utils/certificateGenerator.js`)
- **Tailored Rank Templates**:
  - **1st Place — Gold Rank** (`cert_template_1.jpg`): Warm golden guilloche framing, embossed gold medallion, and golden rank banner.
  - **2nd Place — Silver Rank** (`cert_template_2.jpg`): Cool metallic silver-indigo filigree framing, silver medallion, and silver rank banner.
  - **3rd Place — Bronze Rank** (`cert_template_3.jpg`): Warm copper-bronze rosettes, metallic bronze medallion, and bronze rank banner.
- **2x Retina Canvas Compositing ($2000 \times 1414 \text{ px}$)**:
  - Inpainted background templates using vertical gradient text-pixel interpolation to eliminate background streaks and border rosette clipping.
  - Uses the template's embedded citation text while cleanly positioning the student's name in prominent cursive script (*Alex Brush* / *Great Vibes*), followed by the official course name and verified academic score at $Y = 965$.
  - Authenticated with digital cursive signature, official date, and verification ID.

### 6. Interactive Login Mascot & Password Privacy (`src/components/common/RobotMascotSvg.jsx`)
- Interactive SVG Robot Mascot sitting atop the login portal card.
- **Complete Eye-Covering (`🙈`) on Password Reveal & Typing**:
  - The robot smoothly covers his eyes when typing in the password field.
  - Clicking the **eye icon** (`showPass`) keeps the robot's eyes firmly covered to protect the password from observers.
- **Cursor Tracking & Inactivity Debounce**:
  - Drops hands down when typing pauses or when the field is blurred.
  - Mascot eyes smoothly track cursor position across the screen when idle.

### 7. Interactive Live PDF Annotation Canvas & Solved Uploads
- Multi-page PDF rendering via Mozilla PDF.js.
- Watermarked assignment PDF downloader (`assignmentPdfDownloader.js`) applying the platform watermark across every page.
- Dual-layer ink pen, highlighter, inline text notes, and eraser (`LiveAnnotationModal.jsx`).
- Solved PDF / image upload modal (`UploadSolvedAssignmentModal.jsx`) with multi-page preview.
- AI auto-grading with blank worksheet detection (0 pts), proportional scoring, diagnostic feedback, and teacher model answer keys.

### 8. Smart Multimodal AI Chatbot (`src/components/common/PlatformChatbotWidget.jsx`)
- Interactive walking robot mascot (RTL/LTR patrol-aware) and website intro splash screen (`WalkingRobotIntro.jsx`).
- Multimodal intelligence: high-speed text analysis and instant photo/PDF document parsing.
- **Inline Arabic Translation Toggle**: Dedicated "Translate into Arabic" button in the footer of every assistant response for immediate, natural Arabic translations.
- Lesson Summarization browser: lists all available course lessons with quick-action chips for instant AI summary generation.

### 9. Account Security & Privacy Policies
- **Strict Username Validation**: Enforces username length $\ge 8$ characters and the presence of `@` or `_`.
- **Profile Photo Privacy**: The photo upload option has been removed from `ProfileSettingsModal.jsx` to standardize avatar rendering and ensure user privacy.
- **Conditional WhatsApp Support**: Direct instructor WhatsApp button displays only when student academic status indicates "Needs Support".

---

## 🛠️ Technology Stack & Libraries

| Technology | Purpose |
|---|---|
| **React 19 & Vite 8** | Modern UI framework and high-speed build tool |
| **React Router DOM v7** | In-memory routing (`MemoryRouter`) for address bar decoupling |
| **Tailwind CSS 3.4 & Tailwind-RTL** | Liquid glass design language and bidirectional styling |
| **TensorFlow.js (`@tensorflow/tfjs`)** | On-device machine learning runtime |
| **COCO-SSD (`@tensorflow-models/coco-ssd`)** | Real-time object detection (mobile phone recognition) |
| **Mozilla PDF.js (`pdfjs-dist`)** | Client-side PDF page rendering and text extraction |
| **Firebase SDK (`firebase`)** | Realtime Database, Authentication, and Storage |
| **i18next & react-i18next** | Bilingual localization (Arabic RTL & English LTR) |
| **Lucide React** | Consistent SVG iconography |
| **Recharts** | Interactive student progress analytics charts |
| **jsPDF & HTML5 Canvas** | Luxury 2x Retina Top-3 official certificate generation |

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
