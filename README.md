# CourseCue v1.5

**Read it once. Know it all semester.**

CourseCue is a no-account syllabus workspace for students. Paste or upload a course syllabus and get a source-backed dashboard of policies, grading, workload, deadlines, and instructor contact—plus a semester overview and optional Canvas calendar sync. Everything you save stays in your browser.

---

## What it is

Students usually reopen the PDF every time they need a late-work rule, an exam date, or a grading weight. CourseCue turns that document into a persistent local workspace you can open all semester.

It is **not** an LMS, gradebook, or study planner. It does **not** judge how hard a subject is or how good a professor is. The “syllabus pressure” score only reflects what the syllabus itself says about deadlines, attendance, high-stakes exams, weekly workload, and assignment cadence.

---

## How it works

```
Paste or upload syllabus
        ↓
POST /api/analyze  (OpenAI Responses API, or local text fallback)
        ↓
Structured CourseAnalysis (policies, grades, dates, workload, evidence)
        ↓
Course dashboard + save to browser (localStorage / IndexedDB)
        ↓
Optional: Semester overview + Canvas iCal / .ics import
```

1. **Import** — Paste syllabus text, or upload PDF, DOCX, TXT, or Markdown (max 10 MB).
2. **Analyze** — With an OpenAI API key, the server calls the Responses API with a strict JSON schema. Without a key, pasted text can still be parsed by a local heuristic analyzer (PDF/DOCX need the key).
3. **Dashboard** — Review policies with source quotes, grading weights, key dates, workload, alerts, and instructor info.
4. **Save locally** — Up to 8 courses stay in `localStorage`. Original files are kept in IndexedDB when available.
5. **Semester view** — Aggregate credits, workload, average pressure, upcoming items, and same-day deadline collisions.
6. **Calendar** — Connect a Canvas private iCal feed (or import an `.ics` file). Export syllabus dates as `.ics` from a course dashboard.

Analysis mode is shown in the UI as **AI analyzed** or **Local analysis**.

---

## Features (v1.5)

### Syllabus intake
- Paste text or upload PDF / DOCX / TXT / Markdown
- Sample syllabus for a quick demo
- Server-side limits on paste length and file size

### AI extraction (OpenAI Responses API)
- Course metadata (code, title, term, section, credits, meeting time, location, dates)
- Instructor contact (email, office hours, phone, etc.)
- Six policy cards: late work, attendance, exams, communication, academic integrity, accommodations
- Transparent **syllabus pressure** score `/10` with factor breakdown
- Workload estimates, grading weights, materials, alerts, and unknowns
- Evidence quotes tied back to source text when available

### Course workspace
- Saved course list (max 8) with quick switch
- View original file or source text
- Export extracted dates as a `.ics` calendar file
- Remove courses when you no longer need them

### Semester overview
- Course count, editable credits, weekly work sum, semester end date, average pressure
- Combined “Up next” list from syllabus exams and Canvas events
- **Collision radar** for same-day stacked deadlines

### Canvas calendar feed
- Paste your private Canvas iCal URL and connect
- Server fetches and parses the feed; parsed events are stored in the browser
- The feed URL itself is **not** saved—paste again to refresh
- Fallback: import a downloaded `.ics` file if the feed is blocked

### Theme
- Light and dark modes with animated toggle
- Preference saved in the browser

### Rate My Professors (presentation only)
- UI shape is ready for a future verified match
- Automatic scraping/matching is **disabled**; search opens RMP manually
- A production match would need an authorized data source

---

## Tech stack

| Layer | Choice |
|--------|--------|
| App | Next.js 16 (App Router) via Vinext + Vite |
| UI | React 19, Tailwind CSS 4, shadcn / Base UI, Lucide |
| AI | OpenAI Responses API (`/v1/responses`) + JSON schema |
| Fallback | Local heuristic analyzer (`lib/local-analyzer.ts`) |
| Deploy target | Cloudflare Workers (Wrangler / Vinext) |
| Persistence | Browser `localStorage` + IndexedDB (no accounts) |

**Node.js:** `>= 22.13.0`

---

## Requirements

- Node.js 22.13+ and npm
- An [OpenAI API key](https://platform.openai.com/) for AI analysis and for PDF/DOCX uploads  
  (optional for paste-only local analysis)

---

## Setup

```bash
git clone <your-repo-url>
cd coursecue
npm install
cp .env.example .env.local
```

Edit `.env.local`:

```bash
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-5.4-mini
```

`.env.local` is gitignored. Never commit API keys or put them in client-side code.

---

## Scripts

```bash
npm run dev     # local dev server → http://localhost:3000
npm run build   # production build
npm run start   # run the production build
npm run lint    # ESLint
```

---

## Project layout

```
app/
  page.tsx                 # Main client UI (import, course, semester)
  layout.tsx               # Metadata, fonts, theme bootstrap
  api/analyze/route.ts     # Syllabus analysis (AI or local)
  api/calendar-feed/route.ts
components/
  semester-dashboard.tsx
  theme-toggle-button.tsx
  remove-course-button.tsx
  ui/                      # shadcn primitives
lib/
  types.ts                 # CourseAnalysis and related types
  local-analyzer.ts        # Offline/heuristic text parser
  ics.ts                   # iCal parsing
  file-store.ts            # IndexedDB for original uploads
  calendar-types.ts
  sample.ts                # Demo syllabus
```

---

## Privacy and security

- **No accounts.** Course data lives in your browser, not on a CourseCue server database.
- With AI mode on, syllabus content is sent to OpenAI for extraction (`store: false` on the Responses request). Local mode avoids the model for pasted text.
- Treat a Canvas calendar feed URL like a password. CourseCue does not persist it; rotate the link in Canvas if it is exposed.
- If an API key was ever pasted into chat or another shared place, rotate it in the OpenAI dashboard before real use.
- AI can misread a syllabus. Always verify important policies and dates against the original document.

---

## What CourseCue does not do

- Cloud sync, multi-device accounts, or backend course storage
- Automatic Rate My Professors scraping or matching
- Full LMS features (assignments submission, grades from Canvas, messaging)
- Subject difficulty or professor quality ratings (pressure ≠ course quality)
- Auto-refresh of Canvas feeds (you reconnect or re-import to update)
- Perfect extraction—relative dates and vague wording may be omitted or marked unknown

---

## Canvas calendar notes

1. In Canvas, copy your private calendar feed URL.
2. Open **Semester** in CourseCue → paste the link → **Connect feed**.
3. Use **Import .ics** if the live feed is blocked (e.g. some campus networks return 403).

Feed links can grant access to calendar data. Keep them private.

---

## Version

**CourseCue v1.5** — syllabus workspace with AI/local analysis, source-backed policies, transparent pressure scoring, local course library, semester overview, Canvas/.ics calendar sync, collision radar, calendar export, and light/dark themes.

---

## License

Private project (`"private": true` in `package.json`). Add a license file if you plan to open-source it.
# coursecuev1
