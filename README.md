<p align="center">
  <img src="frontend/public/favicon.svg" width="130" alt="Professor Orca Logo" />
</p>

<h1 align="center">Professor Orca — Intelligent Academic College Scheduler</h1>

<p align="center">
  <b>מערכת שיבוץ מערכות שעות חכמה ועוזר אקדמי אישי לתלמידי מכללת אורט בראודה</b>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/React-19.2-61DAFB?logo=react" alt="React" />
  <img src="https://img.shields.io/badge/TypeScript-6.0-3178C6?logo=typescript" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Vite-8.0-646CFF?logo=vite" alt="Vite" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-3.4-38BDF8?logo=tailwindcss" alt="Tailwind CSS" />
  <img src="https://img.shields.io/badge/FastAPI-0.100+-009688?logo=fastapi" alt="FastAPI" />
  <img src="https://img.shields.io/badge/Python-3.10+-3776AB?logo=python" alt="Python" />
  <img src="https://img.shields.io/badge/Gemini_AI-2.5-8E75B2?logo=google" alt="Gemini AI" />
</p>

---

## 📌 Overview / סקירה כללית

**Professor Orca** is a full-stack automated schedule builder and AI academic assistant engineered specifically for Ort Braude College students.

Finding an optimal schedule without time conflicts, minimized campus days, and aligned with personal preferences is often time-consuming. **Professor Orca** solves this by leveraging a **Simulated Annealing** optimization engine alongside a **Gemini AI Assistant** connected to live Model Context Protocol (MCP) data services.

---

## ✨ Key Features / תכונות עיקריות

- ⚡ **Simulated Annealing Schedule Optimization**:
  - **Zero Time Collisions**: Ensures absolute 100% collision-free schedules across chosen lectures, tutorials, and labs.
  - **Mode A (Minimize Days)**: Minimizes active days on campus and penalizes awkward window gaps between classes.
  - **Mode B (Exclude Days)**: Allows blocking specific weekdays off completely (e.g. reserving Sundays or Thursdays for work).
  - **Custom Start Times**: Custom preferred daily start times for every single day.

- 🤖 **Professor Orca AI Assistant**:
  - Powered by **Google Gemini AI** integrated with **Model Context Protocol (MCP)**.
  - Direct access to course schedules, course prerequisites, academic calendars, exam schedules, and holiday dates.
  - Full **Markdown Rendering** support with rich code blocks, tables, lists, formatted text, and one-click answer copying.

- 📄 **Live Syllabus PDF Extraction**:
  - Live downloading and text parsing of course syllabus PDFs (`pypdf`).
  - Answers questions on mandatory attendance rules (*חובת נוכחות*), grade composition, homework policy, exam structures, and textbook recommendations.

- 🎨 **Modern Dark Glassmorphism UI**:
  - Built with React 19, TypeScript, Tailwind CSS, and Lucide React icons.
  - Full Hebrew (RTL) support tailored for an intuitive student user experience.
  - One-click **PNG Export** (`html2canvas`) to save and share schedule grids.

- 🔒 **Cloudflare Turnstile Bot Protection**:
  - Integrated human verification guarding schedule generation endpoints against automated abuse.

---

## 🛠️ Tech Stack / טכנולוגיות

| Layer | Technology | Description |
| :--- | :--- | :--- |
| **Frontend** | React 19 + Vite + TS | Fast SPA with modern React hooks & TypeScript |
| **Styling** | Tailwind CSS v3.4 | Dark glassmorphism UI design system with RTL support |
| **Backend API** | FastAPI + Uvicorn | High-performance Python async backend |
| **Optimization** | Simulated Annealing | Multi-objective probabilistic schedule solver (`optimizer_engine.py`) |
| **AI Engine** | Gemini 2.5 + MCP Tools | Function-calling AI assistant linked to Braude MCP endpoints |
| **Data Layer** | Ephemeral SQLite Cache | Downloaded on-demand to `/tmp/braude_cached.sqlite` (1h TTL) |
| **Security** | Cloudflare Turnstile | Anti-bot verification integration |

---

## 📁 Repository Structure / מבנה הפרויקט

```
college-scheduler/
├── AGENTS.md                  # Project rules and AI agent guidelines
├── README.md                  # Project documentation (This file)
├── backend/
│   ├── app.py                 # FastAPI server, endpoints, Gemini AI & MCP integration
│   ├── data_service.py        # Ephemeral SQLite database fetcher & query service
│   ├── optimizer_engine.py    # Simulated Annealing algorithm (CourseSchedulerSA)
│   ├── web_generate_schedule.py # Scheduler pipeline entrypoint
│   └── requirements.txt       # Backend dependencies
├── frontend/
│   ├── public/
│   │   └── favicon.svg        # Professor Orca animated SVG logo
│   └── src/
│       ├── App.tsx            # Main application layout
│       ├── api/client.ts      # Frontend API integration layer
│       └── components/        # React components (Chat, Header, Schedule Grid, etc.)
└── testing/
    ├── test_engine.py         # Optimization engine unit tests
    └── test_e2e_preview.py     # End-to-end integration tests
```

---

## 🚀 Quick Start / הרצה מקומית

### Prerequisites
- **Node.js**: v18.x or higher
- **Python**: v3.10 or higher
- **npm** or **yarn**

### 1. Backend Setup

```bash
# Navigate to backend directory
cd backend

# Create a virtual environment (optional but recommended)
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Create .env file (see .env.example)
cp .env.example .env

# Run FastAPI dev server
uvicorn app:app --reload --port 8000
```
Backend will run at: `http://localhost:8000` (API Docs at `http://localhost:8000/docs`).

### 2. Frontend Setup

```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Start Vite dev server
npm run dev
```
Frontend will run at: `http://localhost:5173`

---

## 🧪 Running Tests / הרצת בדיקות

To run the backend optimizer unit tests:

```bash
python testing/test_engine.py
```

---

## 📜 Agent Guidelines & Rules

All AI agents working on this project must adhere to the rules outlined in [`AGENTS.md`](file:///Users/oshriagronov/Documents/Projects/college-scheduler/AGENTS.md). 
**Rule Reminder**: Any critical architectural or code changes MUST be updated in both `AGENTS.md` and `README.md`.

---

<p align="center">
  Developed with ❤️ for Ort Braude College Students
</p>
