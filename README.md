<div align="center">

# CourseCue

<img width="1505" height="1187" alt="image" src="https://github.com/user-attachments/assets/1f3d781a-62dc-4e36-90ea-57998ee9833f" />



### Read it once. Know it all semester.

CourseCue turns a syllabus into a clear, source-backed workspace for policies, grades, deadlines, workload, and instructor information.

[![Version](https://img.shields.io/badge/version-v0.9.7-15392e?style=flat-square)](https://github.com/ztxv/CourseCue)
![Node](https://img.shields.io/badge/Node.js-22.13%2B-43853d?style=flat-square)
![Local first](https://img.shields.io/badge/storage-local--first-59c7f5?style=flat-square)

</div>

## Why CourseCue?

Important syllabus details are usually buried across pages of policies and schedules. CourseCue extracts the information students repeatedly need and keeps it in one browser-local workspace.

- Drop in PDF, DOCX, TXT, or Markdown syllabi
- Review source-backed policies, grading weights, dates, and workload
- Correct missing course or instructor details from the Syllabi Overview
- Keep up to six syllabi in one workspace
- Export extracted dates to an `.ics` calendar file
- Optionally connect a private Canvas iCal feed
- Use light or dark mode with no CourseCue account required

The **syllabus pressure** score measures stated deadline, attendance, exam, workload, and assignment pressure. It does not rate subject difficulty or professor quality.

## Quick start

```bash
git clone https://github.com/ztxv/CourseCue.git
cd CourseCue
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000), select the gear beside the theme toggle, and add your personal API key. A server-owned key or `.env.local` setup is not required.

> [!IMPORTANT]
> API keys are stored in that browser and sent through the local CourseCue analysis route only when a syllabus is analyzed. Never commit an API key. For the strongest privacy boundary, run your own copy of CourseCue.

## AI providers

CourseCue detects the provider from the API-key prefix and selects a compatible model.

| Provider | Key prefix | Supported input in CourseCue | Notes |
| --- | --- | --- | --- |
| OpenAI | `sk-…` | PDF, DOCX, TXT, Markdown, pasted text | Best match for the current structured extraction pipeline |
| Anthropic | `sk-ant-…` | PDF, TXT, Markdown, pasted text | Convert DOCX files to PDF first |
| NVIDIA NIM | `nvapi-…` | TXT, Markdown, pasted text | Includes available Kimi and DeepSeek choices |
| Local fallback | No key | Pasted text | Uses the built-in heuristic analyzer |

Provider behavior and model output can differ. Always verify important dates and policies against the original syllabus.

## How it works

```text
Syllabus file or pasted text
            ↓
      /api/analyze
            ↓
AI provider or local fallback
            ↓
Structured course analysis
            ↓
Course dashboard + Syllabi Overview
```

Analyzed courses are saved to `localStorage`. Original uploaded files are stored in IndexedDB when the browser supports it. CourseCue does not use accounts or a backend course database.

## Features

### Syllabus analysis

- Course code, title, institution, term, section, credits, dates, and meeting details
- Instructor name, role, email, phone, office, and office hours
- Late-work, attendance, exam, communication, integrity, and accommodation policies
- Grading weights, weekly workload, materials, alerts, and unknown information
- Short source quotes for verification when available
- Transparent pressure score with a factor-by-factor breakdown

### Course workspace

- File-first drag-and-drop intake with automatic analysis
- Optional pasted-text workflow and sample syllabus
- Six-syllabus local limit with clear deletion guidance
- Editable course and instructor information that persists locally
- Original-file access and `.ics` date export

### Syllabi Overview

- Combined course count, credits, weekly workload, and average pressure
- Upcoming dates across every analyzed course
- Same-day deadline collision detection
- Canvas calendar-feed connection and `.ics` import

## Technology

| Layer | Technology |
| --- | --- |
| Application | Next.js 16 App Router through Vinext and Vite |
| Interface | React 19, Tailwind CSS 4, shadcn/Base UI, Lucide |
| AI | OpenAI Responses API, Anthropic Messages API, NVIDIA NIM |
| Local analysis | CourseCue heuristic text analyzer |
| Persistence | Browser `localStorage` and IndexedDB |
| Deployment target | Cloudflare Workers |

Node.js `22.13` or newer is required.

## Commands

```bash
npm run dev      # Start the local development server
npm run lint     # Run ESLint
npm run build    # Create a production build
npm run start    # Start the production build
```

## Project structure

```text
app/
  page.tsx                  Main CourseCue interface
  layout.tsx                Metadata, fonts, and theme bootstrap
  api/analyze/route.ts      AI and local syllabus analysis
  api/calendar-feed/route.ts
components/
  semester-dashboard.tsx    Syllabi Overview workspace
  settings-dialog.tsx       Provider detection and local API settings
  theme-toggle-button.tsx
  remove-course-button.tsx
  ui/                       Shared interface primitives
lib/
  ai-provider.ts            Provider detection and model choices
  local-analyzer.ts         Heuristic text analysis
  file-store.ts             IndexedDB original-file storage
  ics.ts                    iCalendar parsing
  types.ts                  Shared CourseCue data types
```

## Privacy and security

- Course data and original files remain in the current browser.
- Personal API keys remain in browser storage and are relayed only for analysis requests.
- OpenAI requests set `store: false`.
- Canvas feed URLs are treated as secrets and are not persisted.
- Uploaded syllabi are treated as untrusted input; instructions inside them are not followed.
- AI extraction can be wrong, so important information should be checked against the source.

## Current limitations

- No cloud sync or multi-device accounts
- No automatic Canvas refresh
- No automatic Rate My Professors matching or scraping
- NVIDIA models do not currently receive PDF or DOCX files
- Claude requires DOCX files to be converted to PDF
- Relative or ambiguous dates may be omitted instead of guessed

## Contributing

Contributions and focused improvements are welcome.

1. Fork the repository.
2. Create a branch for one focused change.
3. Run `npm run lint` and `npm run build`.
4. Open a pull request describing the behavior you changed and how you verified it.

---

<div align="center">

**CourseCue v0.9.7** · Built by [ztxv](https://github.com/ztxv)

</div>
