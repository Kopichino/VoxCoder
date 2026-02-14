<p align="center">
  <h1 align="center">⚡ VoxCoder — Voice-to-Code IDE</h1>
  <p align="center">
    A full-stack, voice-driven web IDE that lets you write, run, debug, and practice coding — all using your voice.
    <br />
    Built with <strong>Next.js 16</strong>, <strong>Flask</strong>, <strong>OpenAI Whisper</strong>, and <strong>Groq LLM</strong>.
  </p>
</p>

---

## 📋 Table of Contents

- [Overview](#overview)
- [Key Features](#key-features)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Database Schema](#database-schema)
- [API Endpoints](#api-endpoints)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Usage Guide](#usage-guide)
- [Screenshots](#screenshots)
- [Contributing](#contributing)
- [License](#license)

---

## Overview

**VoxCoder** is a web-based Integrated Development Environment (IDE) that transforms spoken instructions into executable code. Designed as a Speech and Language Processing (SLP) project, it combines state-of-the-art speech recognition (OpenAI Whisper), large language model code generation (Groq / Llama 3.1), and a modern React-based frontend with a feature-rich code editor (CodeMirror 6).

Users can:

- **Speak** coding instructions, and the AI writes or edits code in real time.
- **Run** code in Python, JavaScript, or C++ directly in the browser.
- **Practice** LeetCode-style problems with automated test case verification.
- **Debug** with AI-powered diagnostics (voice or text).
- **Track** their progress with analytics, gamification, and streaks.
- **Learn** with curated study materials and AI-generated code explanations.

---

## Key Features

### 🎙️ Voice-Driven Coding
- **Speech-to-Text**: Records audio via the browser's MediaRecorder API, sends it to the Flask backend, which uses **OpenAI Whisper** (base model) for local transcription.
- **Natural Language → Code**: The transcribed instruction is processed by **Groq's Llama 3.1 8B Instant** LLM, which generates or edits Python/JS/C++ code based on the user's spoken intent.
- **Contextual Editing**: When existing code is present, the LLM receives both the current code and the voice instruction, producing a FULL updated version — not just a diff.

### 💻 Multi-Language Code Editor
- **CodeMirror 6** editor with syntax highlighting for **Python**, **JavaScript**, and **C++**.
- **Language Selector**: Switch between languages with a single click. The file extension, syntax highlighting, and runner all update automatically.
- **One Dark Theme** with JetBrains Mono / Fira Code monospace fonts.
- **Auto-indentation** with language-appropriate tab sizes (4 for Python, 2 for JS/C++).
- **Project Management**: Create, save, load, and delete multiple coding projects stored in SQLite.

### ▶️ Code Execution
- **Python**: Runs via `python` subprocess.
- **JavaScript**: Runs via `node` subprocess.
- **C++**: Compiles via `g++ -std=c++17`, then executes the binary.
- **Terminal Output**: Real-time stdout/stderr displayed in a built-in terminal panel.
- **Execution Controls**: Run, save (Ctrl+S), and language selector all accessible from the editor top bar.

### 🧪 LeetCode Practice Tab
- **Problem Search**: Search 14+ built-in problems or live-fetch from **LeetCode's GraphQL API**.
- **Problem Display**: Full problem description, examples with input/output/explanation, and constraints.
- **Multi-Language Templates**: Selecting Python/JS/C++ auto-generates the correct function template from the problem's Python signature:
  - **Python**: `def twoSum(self, nums: List[int], target: int) -> List[int]:`
  - **JavaScript**: `function twoSum(nums, target) { }`
  - **C++**: `class Solution { public: vector<int> twoSum(vector<int>& nums, int target) { } };`
- **Automated Test Cases**: Parsed from LeetCode's `exampleTestcases` + `metaData`, with AI-fallback generation via Groq when parsing fails.
- **Code Verification**: Runs user code against all test cases with per-case verdicts (✅ Passed, ❌ Wrong Answer, ⚠️ Runtime Error, ⏱️ TLE).
- **Practice Timer**: Configurable countdown (15/30/45/60 min or unlimited) with visual progress ring.
- **Voice Coding in Practice**: Same voice input pipeline works within the practice editor.

### 💡 AI Hints System
- **3-Level Progressive Hints**: Request increasingly detailed hints for the current problem:
  - Level 1: General approach direction
  - Level 2: Specific algorithm/data structure suggestion
  - Level 3: Pseudocode-level walkthrough
- **Powered by Groq LLM**: Hints are generated contextually based on the problem description and the user's current code.

### 🔍 AI Debugging
- **Voice Debug** (Editor): Record a voice description of the bug → Whisper transcribes → LLM analyzes code + terminal output + voice context → returns diagnosis, suggestion, and fixed code.
- **Text Debug** (Practice): Click the Debug button → sends code + error output + test results → LLM returns diagnosis, suggestion, fixed code, and a learning hint.
- **One-Click Fix**: Apply the AI-suggested fix directly to the editor with the "✨ Apply Fix" button.

### 📝 Code Explanation Mode
- **Selection-Based**: Select any code in the editor → floating "Explain" button appears → click to get a plain-English explanation from the LLM.
- **AI-Powered**: Uses Groq to analyze the selected code and explain its logic, purpose, and any patterns used.

### 🗣️ Text-to-Speech (TTS) Feedback
- **Browser Speech Synthesis**: Speaks test results, hints, debug diagnoses, and other feedback aloud.
- **Toggle On/Off**: Persisted in localStorage so your preference sticks between sessions.
- **Custom `useTTS` Hook**: Provides `speak()`, `stop()`, and `toggleTTS()` across all pages.

### 📊 Analytics Dashboard
- **Submission Tracking**: Log solved problems with topic, data structure, and difficulty metadata.
- **Visual Charts** (Chart.js):
  - Bar chart: submissions by topic (Arrays, Trees, DP, etc.)
  - Doughnut chart: difficulty distribution (Easy/Medium/Hard)
  - Line chart: daily activity over the past 30 days
  - Horizontal bar: data structure usage
- **Stats Cards**: Total problems solved, total projects, current streak.

### 🏆 Gamification & Streaks
- **XP System**: Earn XP for solving problems and completing practice sessions.
- **Leveling**: Level up as you accumulate XP (displayed on dashboard).
- **Streaks**: Track consecutive active days; see current and longest streak on the dashboard.
- **Visual Level Badge**: Gradient badge showing current level and XP progress.

### 📚 Study Materials
- **Curated Content**: Topic-organized learning resources (articles, videos, references).
- **In-App Viewer**: Browse materials without leaving the IDE.
- **Searchable**: Filter materials by topic or keyword.

### 🔐 Authentication System
- **JWT-Based Auth**: Secure login/signup with JSON Web Tokens stored in HTTP-only cookies.
- **Password Hashing**: bcryptjs for password security.
- **Protected Routes**: All `/dashboard`, `/editor`, `/practice`, `/analytics`, `/materials` routes require authentication.
- **Auth Context**: React Context provides `user`, `login()`, `signup()`, `logout()` across the app.
- **Session Persistence**: JWT verified on each page load via `/api/auth/me`.

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Browser (Client)                     │
│  ┌────────────────────────────────────────────────────┐ │
│  │           Next.js 16 Frontend (React 19)           │ │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐           │ │
│  │  │Dashboard │ │ Editor   │ │ Practice │  ...       │ │
│  │  └────┬─────┘ └────┬─────┘ └────┬─────┘           │ │
│  │       │    CodeMirror 6    │     │                 │ │
│  │       │    MediaRecorder   │     │                 │ │
│  │       │    Chart.js        │     │                 │ │
│  │       │    Web Speech API  │     │                 │ │
│  └───────┼────────────┼───────┼─────┼─────────────────┘ │
│          │            │       │     │                    │
│     Next.js API Routes (Proxy Layer)                    │
│     /api/auth/* /api/projects/* /api/practice/*          │
│     /api/analytics /api/explain /api/submissions         │
└──────────┼────────────┼───────┼─────┼────────────────────┘
           │            │       │     │
    ┌──────▼────────────▼───────▼─────▼──────┐
    │        Flask Backend (port 5000)        │
    │  ┌─────────────┐  ┌──────────────────┐ │
    │  │   Whisper    │  │   Groq LLM API   │ │
    │  │ (STT Engine) │  │ (Code Gen/Debug) │ │
    │  └─────────────┘  └──────────────────┘ │
    │  ┌─────────────┐  ┌──────────────────┐ │
    │  │  subprocess  │  │ LeetCode GraphQL │ │
    │  │ (py/node/g++)│  │      API         │ │
    │  └─────────────┘  └──────────────────┘ │
    └────────────────────────────────────────┘

    ┌────────────────────────────┐
    │   SQLite (voxcoder.db)     │
    │  users │ projects │ xp     │
    │  submissions │ sessions    │
    └────────────────────────────┘
```

---

## Tech Stack

### Frontend

| Technology | Version | Purpose |
|---|---|---|
| **Next.js** | 16.1.6 | React framework with App Router, API routes, SSR |
| **React** | 19.2.3 | UI component library |
| **TypeScript** | 5.x | Type-safe development |
| **CodeMirror 6** | 6.0.2 | Code editor with syntax highlighting |
| `@codemirror/lang-python` | 6.2.1 | Python language support |
| `@codemirror/lang-javascript` | 6.2.4 | JavaScript language support |
| `@codemirror/lang-cpp` | 6.0.3 | C++ language support |
| `@codemirror/theme-one-dark` | 6.1.3 | Dark theme for editor |
| **Chart.js** | 4.5.1 | Analytics charts (bar, doughnut, line) |
| **react-chartjs-2** | 5.3.1 | React bindings for Chart.js |
| **better-sqlite3** | 12.6.2 | Embedded SQLite database |
| **bcryptjs** | 3.0.3 | Password hashing |
| **jsonwebtoken** | 9.0.3 | JWT authentication |
| **Vanilla CSS (Modules)** | — | Scoped, component-level styling |

### Backend

| Technology | Purpose |
|---|---|
| **Flask** | Python web server with REST API |
| **Flask-CORS** | Cross-origin support for frontend ↔ backend |
| **OpenAI Whisper** | Local speech-to-text transcription |
| **Groq SDK** | LLM access (Llama 3.1 8B Instant) |
| **subprocess** | Code execution (Python, Node.js, g++) |
| **python-dotenv** | Environment variable management |

### AI / ML

| Model | Provider | Usage |
|---|---|---|
| **Whisper** (base) | OpenAI (local) | Audio → text transcription |
| **Llama 3.1 8B Instant** | Groq Cloud | Code generation, editing, debugging, hints, explanations, test case generation |

### Infrastructure

| Component | Technology |
|---|---|
| **Database** | SQLite (via better-sqlite3) |
| **Auth** | JWT + HTTP-only cookies + bcrypt |
| **TTS** | Web Speech Synthesis API (browser-native) |
| **Audio Input** | MediaRecorder API (browser-native) |
| **External API** | LeetCode GraphQL API |

---

## Project Structure

```
voice-to-code/
├── server.py                    # Flask backend — all API endpoints
├── requirements.txt             # Python dependencies
├── .env                         # Environment variables (GROQ_API_KEY)
├── src/
│   ├── llm_engine.py            # Groq LLM code generation engine
│   ├── transcriber.py           # Whisper audio transcription
│   ├── audio_recorder.py        # Audio recording utility (CLI)
│   └── server.py                # Legacy FastAPI server (unused)
├── main_phase1.py               # Phase 1: Basic voice → code pipeline
├── main_phase2.py               # Phase 2: Edit existing code via voice
├── main_phase3.py               # Phase 3: Full CLI pipeline
├── frontend/
│   ├── package.json             # Node.js dependencies
│   ├── next.config.ts           # Next.js configuration
│   ├── tsconfig.json            # TypeScript configuration
│   └── src/
│       ├── app/
│       │   ├── layout.tsx       # Root layout (HTML, fonts, AuthProvider)
│       │   ├── page.tsx         # Landing page (redirects to /dashboard)
│       │   ├── globals.css      # Global CSS with design tokens
│       │   ├── (auth)/          # Authentication pages
│       │   │   ├── auth.module.css
│       │   │   ├── login/page.tsx
│       │   │   └── signup/page.tsx
│       │   ├── (app)/           # Protected app pages
│       │   │   ├── layout.tsx   # App layout with Sidebar + auth guard
│       │   │   ├── dashboard/   # Dashboard with projects & XP
│       │   │   ├── editor/      # Code editor with voice input
│       │   │   │   └── [id]/    # Dynamic project editor route
│       │   │   ├── practice/    # LeetCode practice tab
│       │   │   ├── analytics/   # Submission analytics & charts
│       │   │   └── materials/   # Study materials browser
│       │   └── api/             # Next.js API routes (proxy + auth)
│       │       ├── auth/        # /me, /login, /logout, /signup
│       │       ├── projects/    # CRUD for projects
│       │       ├── practice/    # problems, verify, hint, debug
│       │       ├── analytics/   # Submission stats & XP
│       │       ├── explain/     # Code explanation
│       │       ├── analyze/     # Code analysis
│       │       └── submissions/ # Log submissions
│       ├── components/
│       │   ├── Sidebar.tsx      # Collapsible navigation sidebar
│       │   └── Toast.tsx        # Toast notification system
│       ├── context/
│       │   └── AuthContext.tsx   # Authentication React Context
│       ├── hooks/
│       │   └── useTTS.ts        # Text-to-Speech custom hook
│       └── lib/
│           ├── db.ts            # SQLite database initialization
│           └── auth.ts          # JWT helpers (sign, verify)
└── voxcoder.db                  # SQLite database file (auto-created)
```

---

## Database Schema

VoxCoder uses **SQLite** with 5 tables:

### `users`
| Column | Type | Description |
|---|---|---|
| `id` | INTEGER PK | Auto-increment user ID |
| `name` | TEXT | Display name |
| `email` | TEXT UNIQUE | Login email |
| `password` | TEXT | bcrypt-hashed password |
| `avatar_color` | TEXT | Hex color for avatar |
| `created_at` | DATETIME | Registration timestamp |

### `projects`
| Column | Type | Description |
|---|---|---|
| `id` | INTEGER PK | Auto-increment project ID |
| `user_id` | INTEGER FK | Owner user |
| `title` | TEXT | Project name |
| `description` | TEXT | Optional description |
| `code` | TEXT | Source code content |
| `language` | TEXT | `python`, `javascript`, or `cpp` |
| `created_at` | DATETIME | Creation time |
| `updated_at` | DATETIME | Last save time |

### `submissions`
| Column | Type | Description |
|---|---|---|
| `id` | INTEGER PK | Auto-increment |
| `user_id` | INTEGER FK | Submitting user |
| `project_id` | INTEGER FK | Related project (nullable) |
| `question_name` | TEXT | Problem name |
| `topic` | TEXT | Topic category (Arrays, DP, etc.) |
| `data_structure` | TEXT | DS used (HashMap, Stack, etc.) |
| `difficulty` | TEXT | Easy / Medium / Hard |
| `solved_at` | DATETIME | Submission timestamp |

### `practice_sessions`
| Column | Type | Description |
|---|---|---|
| `id` | INTEGER PK | Auto-increment |
| `user_id` | INTEGER FK | Practicing user |
| `problem_slug` | TEXT | LeetCode problem slug |
| `problem_title` | TEXT | Problem title |
| `difficulty` | TEXT | Easy / Medium / Hard |
| `status` | TEXT | `attempted` / `solved` |
| `hints_used` | INTEGER | Number of hints requested |
| `time_spent_seconds` | INTEGER | Time spent on problem |
| `test_cases_passed` | INTEGER | Passed test count |
| `test_cases_total` | INTEGER | Total test count |
| `created_at` | DATETIME | Session timestamp |

### `user_xp`
| Column | Type | Description |
|---|---|---|
| `id` | INTEGER PK | Auto-increment |
| `user_id` | INTEGER FK UNIQUE | User reference |
| `total_xp` | INTEGER | Accumulated XP |
| `level` | INTEGER | Current level |
| `current_streak` | INTEGER | Consecutive active days |
| `longest_streak` | INTEGER | Best streak ever |
| `last_active_date` | TEXT | Last active date (YYYY-MM-DD) |

---

## API Endpoints

### Flask Backend (`localhost:5000`)

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/` | Serve legacy HTML IDE |
| `GET` | `/api/code` | Get current generated script content |
| `POST` | `/api/save` | Save code to file (with language) |
| `POST` | `/api/run` | Execute code (Python/JS/C++) |
| `POST` | `/api/process_voice` | Upload audio → Whisper → LLM → code |
| `GET` | `/api/leetcode/problem?slug=` | Fetch LeetCode problem by slug |
| `GET` | `/api/leetcode/search?q=` | Search LeetCode problems |
| `POST` | `/api/practice/verify` | Run code against test cases |
| `POST` | `/api/debug_voice` | Voice-based AI debugging |
| `POST` | `/api/debug_practice` | Text-based AI debugging |

### Next.js API Routes (`localhost:3000/api`)

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/auth/signup` | Create new account |
| `POST` | `/api/auth/login` | Login, receive JWT cookie |
| `POST` | `/api/auth/logout` | Clear JWT cookie |
| `GET` | `/api/auth/me` | Get current user from JWT |
| `GET/POST/PUT/DELETE` | `/api/projects` | CRUD for user projects |
| `GET/PUT/DELETE` | `/api/projects/[id]` | Single project operations |
| `GET` | `/api/practice/problems` | Search or fetch problems (proxy) |
| `POST` | `/api/practice/verify` | Verify code (proxy to Flask) |
| `POST` | `/api/practice/hint` | Get AI hint (proxy to Flask) |
| `POST` | `/api/practice/debug` | AI debug (proxy to Flask) |
| `GET` | `/api/analytics` | Get user stats & charts data |
| `POST` | `/api/submissions` | Log a new submission |
| `POST` | `/api/explain` | Get AI code explanation |
| `POST` | `/api/analyze` | Analyze code quality |

---

## Getting Started

### Prerequisites

- **Python 3.10+** with pip
- **Node.js 18+** with npm
- **g++** (for C++ code execution) — install via MinGW on Windows or `build-essential` on Linux
- **FFmpeg** (required by Whisper for audio processing)
- A **Groq API key** (free at [console.groq.com](https://console.groq.com))

### 1. Clone the Repository

```bash
git clone https://github.com/Kopichino/VoxCoder.git
cd voice-to-code
```

### 2. Backend Setup

```bash
# Create and activate virtual environment
python -m venv venv
# Windows:
venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate

# Install Python dependencies
pip install -r requirements.txt
```

### 3. Frontend Setup

```bash
cd frontend
npm install
cd ..
```

### 4. Environment Variables

Create a `.env` file in the project root:

```env
GROQ_API_KEY=your_groq_api_key_here
```

Create `frontend/.env.local`:

```env
NEXT_PUBLIC_FLASK_URL=http://localhost:5000
JWT_SECRET=your_secret_key_here
```

### 5. Run the Application

**Terminal 1 — Flask Backend:**

```bash
python server.py
```

The Flask server starts at `http://localhost:5000`.

**Terminal 2 — Next.js Frontend:**

```bash
cd frontend
npm run dev
```

The frontend starts at `http://localhost:3000`.

### 6. Open in Browser

Navigate to `http://localhost:3000`. Create an account and start coding!

---

## Environment Variables

| Variable | Location | Required | Description |
|---|---|---|---|
| `GROQ_API_KEY` | `.env` (root) | ✅ | Groq API key for LLM features |
| `NEXT_PUBLIC_FLASK_URL` | `frontend/.env.local` | ✅ | Flask backend URL |
| `JWT_SECRET` | `frontend/.env.local` | ✅ | Secret for JWT token signing |

---

## Usage Guide

### 🎙️ Voice Coding
1. Open a project in the **Editor** tab.
2. Click the **🎤 microphone button** to start recording.
3. Speak your instruction (e.g., *"create a function to sort a list using bubble sort"*).
4. Click the mic button again to stop.
5. Watch as the AI generates code in your editor.

### 🧪 Practice Mode
1. Go to the **Practice** tab.
2. Search for a LeetCode problem (e.g., "Two Sum").
3. Select a language (Python / JavaScript / C++).
4. Write your solution in the editor.
5. Click **▶ Run Tests** to verify against test cases.
6. Use **💡 Hint** for progressive hints or **🔍 Debug** for AI-powered debugging.

### 📊 Tracking Progress
1. Go to **Analytics** to log solved problems.
2. View charts showing topic distribution, difficulty breakdown, and daily activity.
3. Check your **Dashboard** for XP level, streak, and recent projects.

---

## Built-In Problem Bank

VoxCoder includes 14 pre-loaded LeetCode problems for instant access (no internet required):

| # | Problem | Difficulty |
|---|---|---|
| 1 | Two Sum | 🟢 Easy |
| 9 | Palindrome Number | 🟢 Easy |
| 14 | Longest Common Prefix | 🟢 Easy |
| 20 | Valid Parentheses | 🟢 Easy |
| 21 | Merge Two Sorted Lists | 🟢 Easy |
| 53 | Maximum Subarray | 🟡 Medium |
| 70 | Climbing Stairs | 🟢 Easy |
| 121 | Best Time to Buy and Sell Stock | 🟢 Easy |
| 136 | Single Number | 🟢 Easy |
| 217 | Contains Duplicate | 🟢 Easy |
| 238 | Product of Array Except Self | 🟡 Medium |
| 283 | Move Zeroes | 🟢 Easy |
| 344 | Reverse String | 🟢 Easy |
| 412 | Fizz Buzz | 🟢 Easy |
| 704 | Binary Search | 🟢 Easy |

Additional problems are fetched live from LeetCode's GraphQL API.

---

## Development Phases

This project was developed incrementally across three phases:

### Phase 1 — Voice-to-Code Pipeline
- Audio recording → Whisper transcription → Groq code generation
- CLI-based pipeline (`main_phase1.py`)

### Phase 2 — Code Editing via Voice
- Support for editing existing code with voice commands
- Contextual code updates (`main_phase2.py`)

### Phase 3 — Full Web IDE
- Flask web server with REST API
- HTML/CSS/JS frontend (legacy `templates/`)
- Multi-language execution support
- Modern Next.js 16 frontend with full-featured IDE

---

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## License

This project is developed as part of an academic course (SEM6 — Speech and Language Processing). 

---

<p align="center">
  Made with ❤️ by the VoxCoder Team
  <br />
  <strong>⚡ VoxCoder</strong> — Code with your voice.
</p>
