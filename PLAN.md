# 🎓 AI Training & Assessment Platform — Development Plan

> **Stack:** React 19 (Vite) + MemoryRouter + Firebase (Auth, RTDB, Storage) + Local Trained LLM (Google Gemini / Express Proxy)
> **Repo Architecture Tool:** [Archify](https://github.com/tt-a1i/archify)
> **Target Repository (HTTPS):** `https://github.com/MohamedMaherMoustafa/Ai-Training-Assessment-Platform.git`
> **i18n:** Arabic + English (RTL/LTR) | **Theme:** Light + Dark
> **Routing Architecture:** In-Memory Client-Side Routing (`MemoryRouter`) — Static Address Bar & Zero History Tracking

---

## 📐 Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│              React 19 SPA (Vite + MemoryRouter)         │
│  ┌─────────┐  ┌──────────────┐  ┌────────────────────┐  │
│  │ UI Layer│  │Context Layer │  │  Feature Modules   │  │
│  │Components│  │Auth/Theme/i18n│  │puzzles|store|cert  │  │
│  └─────────┘  └──────────────┘  └────────────────────┘  │
└───────────────────────┬─────────────────────────────────┘
                        │
          ┌─────────────┼──────────────┐
          ▼             ▼              ▼
  ┌──────────────┐ ┌─────────┐ ┌────────────────┐
  │Firebase Auth │ │Firebase │ │Firebase Storage│
  │  (Roles)     │ │  RTDB   │ │  (Files/PDFs)  │
  └──────────────┘ └─────────┘ └────────────────┘
                        │
                        ▼
              ┌──────────────────┐
              │    AI Proxy      │
              │  (Express :3001) │
              └────────┬─────────┘
                       ▼
              ┌──────────────────┐
              │Google Gemini API │
              │(Flash 2.5/Vision)│
              └──────────────────┘
```

---

## 🗂️ Repository Structure (Feature-First)

```
ai-training-platform/
├── PLAN.md                                ← this file
├── README.md
├── PLATFORM_TEST_AND_GUIDE.md
├── FRONTEND_UI_AND_DESIGN_SYSTEM_GUIDE.md
├── firebase.json
├── database.rules.json
│
├── llm-proxy/                             # Express server → Gemini bridge
│   ├── server.js
│   ├── .env
│   └── routes/
│       ├── chat.js                        # POST /api/chat
│       ├── quiz.js                        # POST /api/quiz/generate
│       ├── assignment.js                  # POST /api/assignment/grade
│       └── feedback.js                    # POST /api/feedback
│
├── scripts/
│   └── test-platform.mjs                  # Automated 16-point platform test suite
│
└── client/                                # Vite React App
    ├── index.html
    ├── vite.config.js
    ├── tailwind.config.js
    └── src/
        ├── main.jsx
        ├── App.jsx                        # MemoryRouter root application
        ├── components/
        │   ├── common/                    # RobotMascotSvg, PlatformChatbotWidget, Modals
        │   └── layout/                    # AppLayout, Sidebar, Header, RoleSwitcher
        ├── context/
        │   ├── AuthContext.jsx            # In-memory session, guest mode, role adaptation
        │   ├── ThemeContext.jsx           # light / dark
        │   └── LangContext.jsx            # ar / en + RTL flag
        ├── features/
        │   ├── auth/                      # LoginPage, RegisterPage, RoleGuard
        │   ├── courses/                   # Course management & enrollment
        │   ├── lessons/                   # PDF library & private annotation notebook
        │   ├── assignments/               # Dual-solving assignment studio & AI grading
        │   ├── quiz/                      # 10/15/20 MCQ builder & anti-cheat proctored runner
        │   ├── puzzles/                   # 50 Cognitive IQ Puzzles with single-attempt lock
        │   ├── scoreboard/                # Curriculum scoreboard & Luxury Top-3 certificates
        │   ├── store/                     # Student Rewards Store & cosmetics customizer
        │   ├── reports/                   # 7-day automated weekly progress reports
        │   └── chat/                      # 1-on-1 direct real-time chat with attention badges
        ├── utils/
        │   ├── certificateGenerator.js    # 2x Retina canvas official certificate generator
        │   ├── puzzleLevelsData.js        # 50 calibrated cognitive levels (Tiers 1–6)
        │   ├── soundEffects.js            # Web Audio interactive sound effects
        │   └── pdfPageRenderer.js         # Mozilla PDF.js canvas renderer
        └── locales/
            ├── en.json                    # English translations
            └── ar.json                    # Arabic translations
```

---

## 🚀 Development Phases & Milestone Progress

### Phase 1 — Project Bootstrap *(Completed)*
- Initialized React 19 + Vite 8 client.
- Configured Tailwind CSS 3.4 with RTL plugin (`tailwindcss-rtl`).
- Implemented bilingual system (`ar.json` / `en.json`) with `i18next`.
- Established liquid-glass design system with light/dark theme variables.
- Configured in-memory routing (`MemoryRouter`) for address bar decoupling and zero path tracking.

### Phase 2 — Course Management & PDF Annotation *(Completed)*
- Full CRUD for course authoring with English and Arabic curriculum fields.
- Lesson materials library with high-resolution PDF rendering via Mozilla PDF.js.
- Dual-solving assignment studio with live digital ink annotation and solved document upload.
- Automated AI assignment grading engine with blank submission detection (0 pts), proportional scoring, and model answer keys.

### Phase 3 — Timed Quizzes & Anti-Cheating Computer Vision *(Completed)*
- AI quiz drafting with 10, 15, and 20 question presets.
- Pre-quiz webcam permission verification modal.
- Top-center floating PiP proctoring window (160×110 px) with live indicator.
- Client-side real-time mobile phone detection via TensorFlow.js and COCO-SSD (immediate first-offense termination).
- Zero-latency camera covering and blackout detection (luminance + variance analysis).
- Screen capture shield intercepting print-screen, snipping tools, developer tools, and window blur.
- High-priority violation modal locking re-entry until instructor approval.

### Phase 4 — Gamified 50 IQ Puzzles & Student Coin Economy *(Completed)*
- 50 ascending difficulty levels covering numerical reasoning, spatial rotation, cryptographic logic, Boolean circuits, and multi-constraint deduction.
- Strict single-attempt choice lock (buttons lock upon click; wrong answer prevents passing to next level; retry button allows resetting current puzzle).
- Sequential level unlocking (Level $N$ requires Level $N-1$ solved).
- Student Rewards Store with 8 glowing name tags, 8 liquid-glass animated avatar frames, and full chatbot studio (6 skins, 7 hats, 6 glasses, 5 shoes).
- Absolute academic score protection: purchasing cosmetics strictly deducts from `availableCoins` and never reduces scoreboard points.

### Phase 5 — Scoreboard Decoupling & Luxury Official Top-3 Certificates *(Completed)*
- Course scoreboard strictly calculates academic mastery: $\text{Total Score} = \text{Quiz Points} + \text{Assignment Points}$.
- Scoreboard decoupled from puzzle games and coin spendings with Official Certification Guarantee badge.
- High-resolution luxury PDF certificates for Top 3 students:
  - 1st Place: Gold Rank (`cert_template_1.jpg`)
  - 2nd Place: Silver Rank (`cert_template_2.jpg`)
  - 3rd Place: Bronze Rank (`cert_template_3.jpg`)
- 2x Retina canvas compositing ($2000 \times 1414 \text{ px}$) with vertical gradient text-pixel inpainting, Alex Brush / Great Vibes calligraphy, instructor cursive signature, official date, and tamper-resistant ID.

### Phase 6 — Authentication Security & Privacy Upgrades *(Completed)*
- Interactive SVG Robot Mascot on login card with real-time cursor tracking.
- Complete eye-covering (`🙈`) animation when typing password and when clicking the eye icon to reveal the password.
- Strict username validation rule requiring at least 8 characters and containing `@` or `_`.
- Removed profile photo upload option for user privacy.
- Switched to `MemoryRouter` with instant guest access and dynamic multi-role adaptation.

---

## ✅ Final Demo Sign-Off Checklist

- [x] Instructor uploads a lesson PDF
- [x] Local AI auto-drafts 10, 15, or 20 MCQs from the PDF content
- [x] Instructor reviews and approves the quiz in QuizBuilder
- [x] Student enrols in the course
- [x] Student takes the quiz with a timer and webcam proctoring
- [x] Score is saved to Firebase RTDB and displayed on live scoreboard
- [x] AI study feedback and diagnostic report is shown after submission
- [x] Instructor sees all student results in dashboard and progress tracker
- [x] Full AR ↔ EN toggle with RTL layout
- [x] Light / Dark theme toggle works across all pages
- [x] Student Rewards Store & Gamified Coin Economy with Strict Academic Point Protection
- [x] Interactive Login Mascot with real-time eye-covering password typing and eye icon reveal animation
- [x] Chatbot inline Arabic translation engine in assistant response footers
- [x] Strict username validation rules (`>= 8` chars and `@` or `_`)
- [x] Conditional WhatsApp support button (displayed only when status is "Needs Support")
- [x] 50 Cognitive IQ Puzzles with single-attempt lock and sequential level unlocking
- [x] Decoupled academic scoreboard from puzzle games and coin redemptions
- [x] Luxury official Top-3 PDF certificates (Gold 1st, Silver 2nd, Bronze 3rd) with 2x Retina canvas rendering
- [x] In-memory client-side routing (`MemoryRouter`) with instant guest exploration and static address bar

---

## 🌟 Recently Completed Major Features & Modernizations

### 1. 50 IQ Cognitive Puzzle Levels with Single-Attempt Lock (`/student/puzzles`)
- 50 progressively calibrated levels across 6 mental tiers up to IQ Grandmaster (total bounty 12,740 Coins).
- Strict single-attempt choice lock: answer buttons lock on click; wrong answer prevents passing to next level; interactive Retry button resets current puzzle.
- Sequential unlocking: Level $N$ cannot be opened without passing Level $N-1$.
- Absolute decoupling: awards spendable coins for the Store without altering academic scores.

### 2. Pure Curriculum Scoreboard & Luxury Top-3 Official Certificates
- Scoreboard strictly displays Quizzes + Graded Assignments, protected by an Official Certification Guarantee badge.
- Luxury Top-3 PDF Certificates rendered at 2x Retina ($2000 \times 1414 \text{ px}$):
  - Gold Rank (1st Place): `cert_template_1.jpg`
  - Silver Rank (2nd Place): `cert_template_2.jpg`
  - Bronze Rank (3rd Place): `cert_template_3.jpg`
- Inpainted templates using vertical gradient text-pixel interpolation to eliminate background streaks and border rosette clipping.
- Repositioned student calligraphy name and course/score line at $Y = 965$, completely eliminating text collision.

### 3. In-Memory Routing & Instant Platform Entry
- Switched to `MemoryRouter` in `App.jsx`, ensuring browser address bar remains permanently static at the root host (`/`).
- Users access the platform immediately without forced login screens, utilizing a default guest profile with dynamic role switching (`Student | Instructor | Admin`).

### 4. Interactive Login Mascot Privacy Upgrades
- Robot covers eyes smoothly during password typing and firmly keeps eyes covered when the student clicks the **eye icon** (`showPass`) to reveal the password in plain text.
- Resolved `lang` variable reference error in `LoginPage.jsx`.

---

## 🏗️ Architecture Visualization with Archify

After scaffolding the project, run Archify to auto-generate a live interactive architecture diagram:

```bash
# Install Archify skill
npx -y skills@latest add https://archify.si --skill archify --agent claude-code --global --copy --yes

# Then prompt your AI agent:
# "Use Archify to map the full architecture of this React + Firebase + Ollama project"
```

Archify traces all imports, Firebase SDK calls, and Ollama/Gemini API calls to generate an interactive HTML diagram of the full data-flow topology.
