# AGENTS.md — AI Agent Guidance & Project Rules

Welcome to **Professor Orca (College Scheduler)**. This document establishes the technical context, architectural constraints, project conventions, and operational guidelines for AI agents working in this repository.

> [!IMPORTANT]
> **Self-Updating Protocol Rule**: 
> On **EVERY critical change** (such as modifying backend architecture, introducing new API endpoints, altering frontend components/state, changing optimization heuristics, updating environment variables, or adding dependencies), the acting AI agent **MUST** update `AGENTS.md` and `README.md` to keep all documentation accurate and up to date before finishing its task.

---

## 1. Project Overview & Core Mission

**Professor Orca** is an intelligent academic scheduling system designed for Ort Braude College students. It consists of two main pillars:
1. **Automated Schedule Optimization Engine**: Powered by Simulated Annealing, solving multi-objective constraints to generate conflict-free academic schedules based on student preferences (minimizing campus days, excluding specific days, and matching daily start times).
2. **Professor Orca AI Assistant**: A Gemini-powered AI chatbot equipped with Model Context Protocol (MCP) tools to parse course syllabi, answer questions regarding attendance policy (*חובת נוכחות*), grading rubrics, course schedules, and academic calendars.

---

## 2. Tech Stack Reference

### Frontend (`/frontend`)
- **Framework**: React 19 + TypeScript + Vite
- **Styling**: Tailwind CSS (v3.4) with dark glassmorphic design and custom RTL styling (`App.css`, `index.css`)
- **Icons**: `lucide-react`
- **Security / Captcha**: Cloudflare Turnstile entry gate (`AccessGate.tsx`) via `@marsidev/react-turnstile`; a one-time siteverify exchanges the widget token for an 8-hour HMAC clearance stored in `localStorage`
- **Exporting**: `html2canvas` for downloading schedule grids as images
- **Markdown Rendering**: Custom React renderer (`MarkdownRenderer.tsx`) using `react-markdown` & `remark-gfm` with GFM tables, LTR code blocks, copy buttons, and RTL styling for AI assistant responses

### Backend (`/backend`)
- **Framework**: Python 3.10+ with FastAPI, Uvicorn, and Pydantic
- **Data Caching**: Ephemeral SQLite database cached in `/tmp/braude_cached.sqlite` with 1-hour TTL (`CACHE_TTL_SECONDS = 3600`) and in-memory dict caching
- **Optimization Algorithm**: Simulated Annealing (`CourseSchedulerSA` in `optimizer_engine.py`)
- **Preference Report**: `CourseSchedulerSA.evaluate_preferences(state)` inspects the final state and reports unmet soft preferences (excluded days used, campus days above `preferred_num_days`, days starting before the preferred start time). `web_generate_schedule.py` returns it under `warnings.preferences_met` / `warnings.preference_issues`; `App.tsx` renders a Hebrew notice when `preferences_met` is `false`.
- **AI & Function Calling**: Google Gemini API integration with MCP function calling (`https://braude-mcp.oshri-mcp.workers.dev/mcp`)
- **PDF Extraction**: `pypdf` for live downloading and parsing course syllabus PDFs
- **Text Processing**: `python-bidi` for Hebrew right-to-left string handling

### Testing (`/testing`)
- **Engine Tests**: `test_engine.py` (unit tests for Simulated Annealing logic)
- **E2E & Integration Tests**: `test_e2e_preview.py`

---

## 3. Project Structure & Key Files

```
college-scheduler/
├── AGENTS.md                  # Instructions & rules for AI agents (This file)
├── README.md                  # Public project documentation & setup guide
├── backend/
│   ├── app.py                 # FastAPI application, routes, Gemini AI, MCP dispatcher, Turnstile clearance
│   ├── data_service.py        # Remote SQLite DB downloader, caching layer, course queries
│   ├── optimizer_engine.py    # Simulated Annealing algorithm (CourseSchedulerSA)
│   ├── web_generate_schedule.py # High-level wrapper bridging API payload to optimizer
│   ├── weights.json           # Optimization weight defaults
│   ├── requirements.txt       # Python dependencies
│   └── .env.example           # Backend environment variable template
├── frontend/
│   ├── src/
│   │   ├── App.tsx            # Main application component & layout
│   │   ├── api/client.ts      # Type-safe API client for backend communication
│   │   ├── components/
│   │   │   ├── AccessGate.tsx        # Cloudflare Turnstile site-entry verification screen
│   │   │   ├── AiAssistantChat.tsx    # AI Assistant side drawer / chat interface
│   │   │   ├── CourseCard.tsx        # Individual course selector card
│   │   │   ├── CourseSelectionHeader.tsx # Header controls, search & filters
│   │   │   ├── Footer.tsx            # App footer with GitHub repository link & branding
│   │   │   ├── MarkdownRenderer.tsx  # Rich text & markdown formatter for AI responses
│   │   │   ├── PreferenceToggle.tsx  # Constraint/preference accordion (days, overlap tolerance, start times)
│   │   │   └── ResultsTable.tsx      # Interactive weekly schedule grid & details drawer
│   │   └── assets/
│   ├── public/
│   │   ├── favicon.svg        # Professor Orca animated SVG logo
│   │   └── icons.svg
│   ├── package.json           # Frontend dependencies & scripts
│   └── vite.config.ts         # Vite build configuration
└── testing/
    ├── test_engine.py         # Unit testing suite for schedule solver
    └── test_e2e_preview.py     # End-to-end integration test runner
```

---

## 4. Development Rules & Operational Principles

### 4.1 Stateless Backend & Ephemeral Caching
- The backend MUST remain stateless to support serverless / containerized deployments (e.g. Vercel, Render, Railway).
- Any runtime files (such as downloaded database snapshots) MUST be stored strictly inside `/tmp`.

### 4.2 Hebrew (RTL) First Approach
- All user-facing text in the frontend is presented in Hebrew (`dir="rtl"`).
- When modifying UI components, preserve right-to-left layout conventions, font legibility, and Hebrew text formatting.

### 4.3 Error Handling & Diagnostic Integrity
- Never catch exceptions silently without logging.
- Maintain full diagnostic log output in FastAPI (`logger.error(...)`) and re-throw structured `HTTPException` responses to the frontend.

### 4.4 Verification Protocol
- Before declaring any code edit complete, AI agents MUST execute verification commands:
  - Run frontend typechecks/build: `cd frontend && npm run build`
  - Execute backend unit tests: `python testing/test_engine.py`

### 4.5 Mandatory Documentation Self-Update
- **Whenever you make a critical change, update `AGENTS.md` and `README.md` immediately.**
- Critical changes include:
  - Adding or modifying backend endpoints (`backend/app.py`).
  - Adjusting optimization parameters or constraints (`backend/optimizer_engine.py`).
  - Adding or modifying frontend components (`frontend/src/components/`).
  - Changing API interfaces (`frontend/src/api/client.ts`).
  - Adding new dependencies to `package.json` or `requirements.txt`.
  - Updating environment variable specifications (`.env.example`).

---

## 5. Environment & API Keys

The following environment variables are utilized by the system:
- `GEMINI_API_KEY`: Key for Google Gemini AI inference.
- `TURNSTILE_SECRET_KEY`: Cloudflare Turnstile siteverify secret key (also used to HMAC-sign 8-hour site clearance tokens from `POST /api/verify`).
- `BRAUDE_DB_URL`: Remote URL to the latest Braude course database.
- `BRAUDE_MCP_URL`: Endpoint for Braude MCP server (`https://braude-mcp.oshri-mcp.workers.dev/mcp`).
