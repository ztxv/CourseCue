'use client';

import { useEffect, useRef, useState, type CSSProperties, type DragEvent as ReactDragEvent } from 'react';
import { FileUp } from 'lucide-react';
import { RemoveCourseButton } from '@/components/remove-course-button';
import { SemesterDashboard } from '@/components/semester-dashboard';
import { SettingsDialog } from '@/components/settings-dialog';
import { ThemeToggleButton, type Theme } from '@/components/theme-toggle-button';
import { AI_SETTINGS_KEY, EMPTY_AI_SETTINGS, detectProvider, type AiSettings } from '@/lib/ai-provider';
import type { CalendarConnection, CalendarEvent } from '@/lib/calendar-types';
import { deleteOriginalFile, getOriginalFile, saveOriginalFile } from '@/lib/file-store';
import { sampleSyllabus } from '../lib/sample';
import type { CourseAnalysis, Evidence, Policy } from '../lib/types';

const STORAGE_KEY = 'coursecue-courses-v2';
const THEME_KEY = 'coursecue-theme';
const CALENDAR_EVENTS_KEY = 'coursecue-calendar-events-v1';
const CALENDAR_CONNECTION_KEY = 'coursecue-calendar-connection-v1';
const MAX_COURSES = 6;
type AppView = 'course' | 'semester';
type SelectedSyllabusFile = { name: string; data: string; type: string; original: File };
type AnalyzeOptions = { fileOverride?: SelectedSyllabusFile; textOverride?: string; fromDrop?: boolean };

function normalizeCourse(course: CourseAnalysis): CourseAnalysis {
  return {
    ...course,
    course: { ...course.course, credits: course.course.credits ?? null, startDate: course.course.startDate || '', endDate: course.course.endDate || '' },
    dates: (course.dates || []).map((item) => ({ ...item, endDate: item.endDate || '' })),
  };
}

function formatDate(value: string) {
  const date = new Date(`${value}T12:00:00`);
  return Number.isNaN(date.getTime()) ? value || 'Date not found' : new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(date);
}

function initials(value: string) {
  return value.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || 'CC';
}

function exportCalendar(course: CourseAnalysis) {
  if (!course.dates.length) return;
  const escape = (value: string) => value.replace(/\\/g, '\\\\').replace(/,/g, '\\,').replace(/;/g, '\\;').replace(/\n/g, '\\n');
  const events = course.dates.map((item) => {
    const day = item.date.replace(/-/g, '');
    const end = item.endDate ? new Date(`${item.endDate}T12:00:00`) : null;
    if (end && !Number.isNaN(end.getTime())) end.setDate(end.getDate() + 1);
    const endLine = end ? `DTEND;VALUE=DATE:${end.toISOString().slice(0, 10).replace(/-/g, '')}` : '';
    return ['BEGIN:VEVENT', `UID:${course.id}-${day}-${item.label.replace(/\W/g, '')}@coursecue.local`, `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')}`, `DTSTART;VALUE=DATE:${day}`, endLine, `SUMMARY:${escape(`${course.course.code}: ${item.label}`)}`, `DESCRIPTION:${escape(item.notes || `Imported from ${course.sourceName}`)}`, 'END:VEVENT'].filter(Boolean).join('\r\n');
  }).join('\r\n');
  const url = URL.createObjectURL(new Blob([`BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//CourseCue//EN\r\nCALSCALE:GREGORIAN\r\n${events}\r\nEND:VCALENDAR`], { type: 'text/calendar' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = `${course.course.code || 'course'}-dates.ics`.replace(/\s+/g, '-').toLowerCase();
  link.click();
  URL.revokeObjectURL(url);
}

function PolicyCard({ label, mark, policy, tone, showEvidence }: { label: string; mark: string; policy: Policy; tone: string; showEvidence: (value: Evidence) => void }) {
  return (
    <article className={`policy-detail ${tone}`}>
      <div className="policy-top"><span className="detail-mark" aria-hidden="true">{mark}</span><span className={`status-chip ${policy.status}`}>{policy.status === 'unknown' ? 'Confirm' : policy.status}</span></div>
      <p className="overline">{label}</p>
      <h3>{policy.headline}</h3>
      <p className="policy-copy">{policy.summary}</p>
      {policy.details.length > 0 && <div className="mini-tags">{policy.details.slice(0, 3).map((detail) => <span key={detail}>{detail}</span>)}</div>}
      <div className="impact"><strong>Why it matters</strong>{policy.impact}</div>
      {policy.evidence ? <button className="source-link" type="button" onClick={() => showEvidence(policy.evidence!)}>View source text <span>↗</span></button> : <span className="no-source">No direct quote found</span>}
    </article>
  );
}

function FileDropOverlay({ visible, blocked, busy }: { visible: boolean; blocked: boolean; busy: boolean }) {
  const heading = blocked ? 'Your semester is full' : busy ? 'Analysis in progress' : 'Drop to analyze';
  const copy = blocked ? 'Delete a saved syllabus before adding another.' : busy ? 'Let the current syllabus finish first.' : 'Release your syllabus anywhere. Analysis starts instantly.';
  return (
    <div className={`global-drop-overlay ${visible ? 'visible' : ''}`} aria-hidden={!visible}>
      <div className={`global-drop-card ${blocked || busy ? 'blocked' : ''}`}>
        <span className="global-drop-icon"><FileUp aria-hidden="true" /></span>
        <strong>{heading}</strong>
        <p>{copy}</p>
        {!blocked && !busy && <small>PDF, DOCX, TXT, or Markdown · up to 10 MB</small>}
      </div>
    </div>
  );
}

function DropStatus({ fileName, message }: { fileName: string; message: string }) {
  if (!fileName && !message) return null;
  return <div className={`drop-status ${message ? 'error' : ''}`} role="status">{message ? <span>!</span> : <i className="spinner" />}<strong>{message || `Analyzing ${fileName}…`}</strong></div>;
}

export default function Home() {
  const [theme, setTheme] = useState<Theme>('light');
  const [aiSettings, setAiSettings] = useState<AiSettings>(EMPTY_AI_SETTINGS);
  const [method, setMethod] = useState<'paste' | 'upload'>('upload');
  const [syllabus, setSyllabus] = useState('');
  const [file, setFile] = useState<SelectedSyllabusFile | null>(null);
  const [analysis, setAnalysis] = useState<CourseAnalysis | null>(null);
  const [courses, setCourses] = useState<CourseAnalysis[]>([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState('');
  const [evidence, setEvidence] = useState<Evidence | null>(null);
  const [view, setView] = useState<AppView>('course');
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
  const [calendarConnection, setCalendarConnection] = useState<CalendarConnection | null>(null);
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const [autoAnalyzingFile, setAutoAnalyzingFile] = useState('');
  const [dropNotice, setDropNotice] = useState('');
  const fileInput = useRef<HTMLInputElement>(null);
  const dragDepth = useRef(0);
  const dropNoticeTimer = useRef<number | null>(null);
  const atCourseLimit = courses.length >= MAX_COURSES;

  useEffect(() => {
    const savedTheme = localStorage.getItem(THEME_KEY) as Theme | null;
    const nextTheme = savedTheme || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    document.documentElement.dataset.theme = nextTheme;
    document.documentElement.classList.toggle('dark', nextTheme === 'dark');
    document.documentElement.style.colorScheme = nextTheme;
    let storedCourses: CourseAnalysis[] = [];
    let storedEvents: CalendarEvent[] = [];
    let storedConnection: CalendarConnection | null = null;
    let storedAiSettings = EMPTY_AI_SETTINGS;
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) storedCourses = (JSON.parse(stored) as CourseAnalysis[]).map(normalizeCourse);
    } catch { localStorage.removeItem(STORAGE_KEY); }
    try {
      const savedEvents = localStorage.getItem(CALENDAR_EVENTS_KEY);
      const savedConnection = localStorage.getItem(CALENDAR_CONNECTION_KEY);
      if (savedEvents) storedEvents = JSON.parse(savedEvents);
      if (savedConnection) storedConnection = JSON.parse(savedConnection);
    } catch {
      localStorage.removeItem(CALENDAR_EVENTS_KEY);
      localStorage.removeItem(CALENDAR_CONNECTION_KEY);
    }
    try {
      const savedAiSettings = localStorage.getItem(AI_SETTINGS_KEY);
      if (savedAiSettings) {
        const parsed = JSON.parse(savedAiSettings) as Partial<AiSettings>;
        const apiKey = typeof parsed.apiKey === 'string' ? parsed.apiKey : '';
        storedAiSettings = {
          apiKey,
          provider: detectProvider(apiKey),
          model: typeof parsed.model === 'string' ? parsed.model : '',
        };
      }
    } catch { localStorage.removeItem(AI_SETTINGS_KEY); }
    const frame = window.requestAnimationFrame(() => {
      setTheme(nextTheme);
      setCourses(storedCourses);
      setCalendarEvents(storedEvents);
      setCalendarConnection(storedConnection);
      setAiSettings(storedAiSettings);
    });
    return () => {
      window.cancelAnimationFrame(frame);
      if (dropNoticeTimer.current) window.clearTimeout(dropNoticeTimer.current);
    };
  }, []);

  function toggleTheme() {
    const next: Theme = theme === 'light' ? 'dark' : 'light';
    const apply = () => {
      document.documentElement.dataset.theme = next;
      document.documentElement.classList.toggle('dark', next === 'dark');
      document.documentElement.style.colorScheme = next;
      setTheme(next);
      localStorage.setItem(THEME_KEY, next);
    };
    document.documentElement.classList.add('theme-shifting');
    const viewDocument = document as Document & { startViewTransition?: (callback: () => void) => void };
    if (viewDocument.startViewTransition && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) viewDocument.startViewTransition(apply);
    else apply();
    window.setTimeout(() => document.documentElement.classList.remove('theme-shifting'), 700);
  }

  function saveAiSettings(next: AiSettings) {
    setAiSettings(next);
    if (next.apiKey) localStorage.setItem(AI_SETTINGS_KEY, JSON.stringify(next));
    else localStorage.removeItem(AI_SETTINGS_KEY);
  }

  function persist(course: CourseAnalysis) {
    const exists = courses.some((item) => item.id === course.id);
    if (!exists && courses.length >= MAX_COURSES) return false;
    const next = [course, ...courses.filter((item) => item.id !== course.id)];
    setCourses(next);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch { /* The result still remains open. */ }
    return true;
  }

  function updateCourse(course: CourseAnalysis) {
    const next = courses.map((item) => item.id === course.id ? normalizeCourse(course) : item);
    setCourses(next);
    if (analysis?.id === course.id) setAnalysis(normalizeCourse(course));
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch { /* Keep the in-memory update. */ }
  }

  function storeCalendarImport(events: CalendarEvent[], calendarName: string) {
    const connection = { calendarName: calendarName || 'Canvas calendar', lastSynced: new Date().toISOString() };
    setCalendarEvents(events);
    setCalendarConnection(connection);
    try {
      localStorage.setItem(CALENDAR_EVENTS_KEY, JSON.stringify(events));
      localStorage.setItem(CALENDAR_CONNECTION_KEY, JSON.stringify(connection));
    } catch { /* The events still remain available for this session. */ }
    return { count: events.length, calendarName: connection.calendarName };
  }

  async function syncCalendar(url: string) {
    const response = await fetch('/api/calendar-feed', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url }) });
    const payload = await response.json() as { calendarName?: string; events?: CalendarEvent[]; error?: string };
    if (!response.ok || !payload.events) throw new Error(payload.error || 'Calendar sync failed.');
    return storeCalendarImport(payload.events, payload.calendarName || 'Canvas calendar');
  }

  function showDropNotice(message: string) {
    setDropNotice(message);
    if (dropNoticeTimer.current) window.clearTimeout(dropNoticeTimer.current);
    dropNoticeTimer.current = window.setTimeout(() => setDropNotice(''), 4200);
  }

  async function analyze(options?: AnalyzeOptions) {
    const activeFile = options?.fileOverride ?? file;
    const activeText = (options?.textOverride ?? syllabus).trim();
    if (!activeText && !activeFile) return;
    if (analyzing) {
      if (options?.fromDrop) showDropNotice('A syllabus is already being analyzed.');
      return;
    }
    if (atCourseLimit) {
      const message = `You can save up to ${MAX_COURSES} syllabi. Delete one from your Syllabi dashboard before adding another.`;
      setError(message);
      if (options?.fromDrop) showDropNotice(message);
      return;
    }
    setAnalyzing(true);
    setError('');
    try {
      const response = await fetch('/api/analyze', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: activeText, fileData: activeFile?.data || '', fileName: activeFile?.name || 'Pasted syllabus', ai: aiSettings.apiKey ? aiSettings : undefined }),
      });
      const payload = await response.json() as { analysis?: CourseAnalysis; error?: string };
      if (!response.ok || !payload.analysis) throw new Error(payload.error || 'The syllabus could not be analyzed.');
      let completed = normalizeCourse(payload.analysis);
      if (activeFile?.original) {
        const sourceFile = { name: activeFile.name, mimeType: activeFile.type || 'application/octet-stream', available: true };
        try { await saveOriginalFile(completed.id, activeFile.original); }
        catch { sourceFile.available = false; }
        completed = { ...completed, sourceFile };
      }
      setAnalysis(completed);
      setView('course');
      persist(completed);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : 'Something went wrong.';
      setError(message);
      if (options?.fromDrop) showDropNotice(message);
    }
    finally { setAnalyzing(false); }
  }

  function chooseFile(selected?: File, autoAnalyze = false) {
    if (!selected) return;
    setError('');
    setDropNotice('');
    const reject = (message: string) => { setError(message); if (autoAnalyze) showDropNotice(message); };
    if (atCourseLimit) return reject(`You have reached the ${MAX_COURSES}-syllabus limit. Delete one from your Syllabi dashboard to add another.`);
    if (analyzing) return reject('A syllabus is already being analyzed.');
    if (selected.size > 10 * 1024 * 1024) return reject('Keep the file under 10 MB.');
    const extension = selected.name.split('.').pop()?.toLowerCase();
    if (!['pdf', 'docx', 'txt', 'md'].includes(extension || '')) return reject('Use a PDF, DOCX, TXT, or Markdown file.');
    const reader = new FileReader();
    const finish = (prepared: SelectedSyllabusFile, text: string) => {
      setMethod('upload');
      setFile(prepared);
      setSyllabus(text);
      if (autoAnalyze) {
        setAutoAnalyzingFile(prepared.name);
        void analyze({ fileOverride: prepared, textOverride: text, fromDrop: true }).finally(() => setAutoAnalyzingFile(''));
      }
    };
    reader.onerror = () => reject('That file could not be read. Try it again or choose another copy.');
    if (extension === 'pdf' || extension === 'docx') {
      reader.onload = () => finish({ name: selected.name, data: String(reader.result || ''), type: selected.type, original: selected }, '');
      reader.readAsDataURL(selected);
    } else {
      reader.onload = () => finish({ name: selected.name, data: '', type: selected.type, original: selected }, String(reader.result || ''));
      reader.readAsText(selected);
    }
  }

  function isFileDrag(event: ReactDragEvent<HTMLElement>) {
    return Array.from(event.dataTransfer.types).includes('Files');
  }

  function handleDragEnter(event: ReactDragEvent<HTMLElement>) {
    if (!isFileDrag(event)) return;
    event.preventDefault();
    dragDepth.current += 1;
    setIsDraggingFile(true);
  }

  function handleDragOver(event: ReactDragEvent<HTMLElement>) {
    if (!isFileDrag(event)) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = atCourseLimit || analyzing ? 'none' : 'copy';
  }

  function handleDragLeave(event: ReactDragEvent<HTMLElement>) {
    if (dragDepth.current === 0) return;
    event.preventDefault();
    dragDepth.current = Math.max(0, dragDepth.current - 1);
    if (dragDepth.current === 0) setIsDraggingFile(false);
  }

  function handleDrop(event: ReactDragEvent<HTMLElement>) {
    if (!isFileDrag(event)) return;
    event.preventDefault();
    event.stopPropagation();
    dragDepth.current = 0;
    setIsDraggingFile(false);
    chooseFile(event.dataTransfer.files[0], true);
  }

  const globalDropProps = { onDragEnter: handleDragEnter, onDragOver: handleDragOver, onDragLeave: handleDragLeave, onDrop: handleDrop };
  const globalFileUi = <><FileDropOverlay visible={isDraggingFile} blocked={atCourseLimit} busy={analyzing} /><DropStatus fileName={autoAnalyzingFile} message={dropNotice} /></>;

  function newCourse() {
    setView('course'); setAnalysis(null); setSyllabus(''); setFile(null); setError('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function selectCourse(course: CourseAnalysis) {
    setAnalysis(normalizeCourse(course));
    setView('course');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function removeCourse(course: CourseAnalysis) {
    const next = courses.filter((item) => item.id !== course.id);
    setCourses(next);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch { /* Keep the in-memory removal. */ }
    try { await deleteOriginalFile(course.id); } catch { /* The analysis is still removed. */ }
    if (analysis?.id === course.id) {
      setAnalysis(next[0] ? normalizeCourse(next[0]) : null);
      setView(next.length ? 'semester' : 'course');
    }
  }

  async function viewOriginal(course: CourseAnalysis) {
    if (!course.sourceFile) {
      if (course.sourceText.trim()) setEvidence({ quote: course.sourceText.slice(0, 5000), context: course.sourceName });
      else setEvidence({ quote: 'This course was saved before original-file storage was added. Re-upload the syllabus to make the source available here.', context: 'Original unavailable' });
      return;
    }
    const isPdf = course.sourceFile.mimeType === 'application/pdf' || course.sourceFile.name.toLowerCase().endsWith('.pdf');
    const opened = isPdf ? window.open('', '_blank') : null;
    try {
      const stored = await getOriginalFile(course.id);
      if (!stored) {
        opened?.close();
        setEvidence({ quote: 'The saved original file is no longer available in this browser. Re-upload the syllabus to restore it.', context: 'Original unavailable' });
        return;
      }
      const url = URL.createObjectURL(new Blob([stored.blob], { type: stored.type }));
      if (isPdf && opened) opened.location.href = url;
      else {
        const link = document.createElement('a');
        link.href = url;
        link.target = isPdf ? '_blank' : '_self';
        link.download = isPdf ? '' : stored.name;
        link.click();
      }
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch {
      opened?.close();
      setEvidence({ quote: 'The original file could not be opened from this browser. Re-upload it and try again.', context: 'Original unavailable' });
    }
  }

  if (view === 'semester' && courses.length) {
    return (
      <main className="dashboard-shell" {...globalDropProps}>
        {globalFileUi}
        <header className="dashboard-topbar">
          <button className="brand brand-button" type="button" onClick={newCourse}><span className="brand-mark">C</span><span>CourseCue</span></button>
          <div className="dashboard-actions"><span className="semester-badge">Syllabi overview</span><SettingsDialog settings={aiSettings} onSave={saveAiSettings} /><ThemeToggleButton theme={theme} onToggle={toggleTheme} /><button className="secondary-button" type="button" onClick={newCourse} disabled={atCourseLimit} title={atCourseLimit ? `Delete a course to add another (${MAX_COURSES}/${MAX_COURSES})` : undefined}>＋ Add syllabus</button></div>
        </header>
        <div className="dashboard-layout">
          <aside className="course-sidebar">
            <p className="sidebar-label">WORKSPACE</p>
            <button className="semester-nav active" type="button"><span>⌂</span><strong>Syllabi overview</strong></button>
            <p className="sidebar-label course-label">MY COURSES</p>
            <div className="course-list">{courses.map((course, index) => <div className="course-list-entry" key={course.id}><button type="button" className="course-list-item" onClick={() => selectCourse(course)}><span className={`course-color color-${index % 4}`}>{(course.course.code || 'CC').slice(0, 2)}</span><span><strong>{course.course.code}</strong><small>{course.course.title}</small></span></button><RemoveCourseButton course={course} onRemove={removeCourse} compact /></div>)}</div>
            <button className="add-course-link" type="button" onClick={newCourse} disabled={atCourseLimit}>{atCourseLimit ? `${MAX_COURSES} / ${MAX_COURSES} syllabi` : '＋ Analyze another'}</button>
            <div className="sidebar-note"><span>⌘</span><p><strong>Your local workspace</strong>Saved courses and events remain in this browser.</p></div>
          </aside>
          <SemesterDashboard courses={courses} courseLimit={MAX_COURSES} canvasEvents={calendarEvents} connection={calendarConnection} onSelectCourse={selectCourse} onNewCourse={newCourse} onUpdateCourse={updateCourse} onRemoveCourse={removeCourse} onSyncCalendar={syncCalendar} onImportCalendar={storeCalendarImport} />
        </div>
      </main>
    );
  }

  if (analysis) {
    const rmp = analysis.rateMyProfessor;
    return (
      <main className="dashboard-shell" {...globalDropProps}>
        {globalFileUi}
        <header className="dashboard-topbar">
          <button className="brand brand-button" type="button" onClick={newCourse}><span className="brand-mark">C</span><span>CourseCue</span></button>
          <div className="dashboard-actions"><button className="semester-link" type="button" onClick={() => setView('semester')}>Syllabi</button><span className={`mode-badge ${analysis.analysisMode}`}>{analysis.analysisMode === 'ai' ? 'AI analyzed' : 'Local analysis'}</span><SettingsDialog settings={aiSettings} onSave={saveAiSettings} /><ThemeToggleButton theme={theme} onToggle={toggleTheme} /><button className="secondary-button" type="button" onClick={newCourse} disabled={atCourseLimit} title={atCourseLimit ? `Delete a course to add another (${MAX_COURSES}/${MAX_COURSES})` : undefined}>＋ Add syllabus</button></div>
        </header>

        <div className="dashboard-layout">
          <aside className="course-sidebar">
            <p className="sidebar-label">WORKSPACE</p>
            <button className="semester-nav" type="button" onClick={() => setView('semester')}><span>⌂</span><strong>Syllabi overview</strong></button>
            <p className="sidebar-label course-label">MY COURSES</p>
            <div className="course-list">{courses.map((course, index) => <div className={`course-list-entry ${course.id === analysis.id ? 'active' : ''}`} key={course.id}><button type="button" className="course-list-item" onClick={() => selectCourse(course)}><span className={`course-color color-${index % 4}`}>{(course.course.code || 'CC').slice(0, 2)}</span><span><strong>{course.course.code}</strong><small>{course.course.title}</small></span></button><RemoveCourseButton course={course} onRemove={removeCourse} compact /></div>)}</div>
            <button className="add-course-link" type="button" onClick={newCourse} disabled={atCourseLimit}>{atCourseLimit ? `${MAX_COURSES} / ${MAX_COURSES} syllabi` : '＋ Analyze another'}</button>
            <div className="sidebar-note"><span>⌘</span><p><strong>Your local workspace</strong>Saved courses remain in this browser.</p></div>
          </aside>

          <section className="dashboard-main animate-in fade-in slide-in-from-bottom-2 duration-500">
            <div className="course-heading">
              <div><div className="course-meta-row"><span className="course-code-dark">{analysis.course.code}</span><span>{analysis.course.term}</span>{analysis.course.section && <span>Section {analysis.course.section}</span>}</div><h1>{analysis.course.title}</h1><p>{analysis.instructor.name || 'Instructor not found'}{analysis.course.institution ? ` · ${analysis.course.institution}` : ''}{analysis.course.meetingTime ? ` · ${analysis.course.meetingTime}` : ''}</p></div>
              <button className="calendar-button" type="button" onClick={() => exportCalendar(analysis)} disabled={!analysis.dates.length}>↓ Export dates</button>
            </div>

            {analysis.alerts.length > 0 && <section className="attention-strip"><span>!</span><div><strong>Worth knowing now</strong><p>{analysis.alerts.slice(0, 3).join(' ')}</p></div></section>}

            <section className="overview-grid">
              <article className="pressure-card"><div className="pressure-copy"><p className="overline light">SYLLABUS PRESSURE</p><h2>{analysis.difficulty.label}</h2><p>{analysis.quickTake}</p><button type="button" onClick={() => document.getElementById('pressure')?.scrollIntoView({ behavior: 'smooth' })}>View scoring method ↓</button></div><div className="large-score" style={{ '--score': `${analysis.difficulty.score * 10}%` } as CSSProperties}><strong>{analysis.difficulty.score.toFixed(1)}</strong><span>/10</span></div></article>
              <article className="stat-card workload-stat"><span className="stat-symbol">≈</span><p className="overline">WEEKLY WORKLOAD</p><h3>{analysis.workload.hoursMax ? `${analysis.workload.hoursMin === analysis.workload.hoursMax ? analysis.workload.hoursMax : `${analysis.workload.hoursMin}–${analysis.workload.hoursMax}`} hrs` : 'Not stated'}</h3><p>{analysis.workload.assignmentFrequency} assignments · {analysis.workload.readingFrequency} reading</p></article>
              <article className="stat-card deadline-stat"><span className="stat-symbol">↘</span><p className="overline">LATE WORK</p><h3>{analysis.policies.lateWork.headline}</h3><p>{analysis.policies.lateWork.impact}</p></article>
            </section>

            <section className="dashboard-section"><div className="section-heading"><div><p className="overline">POLICIES</p><h2>Know the rules before they matter.</h2></div><span>{Object.values(analysis.policies).filter((item) => item.status !== 'unknown').length}/6 found</span></div><div className="policy-grid">
              <PolicyCard label="LATE WORK" mark="↘" policy={analysis.policies.lateWork} tone="sand" showEvidence={setEvidence} />
              <PolicyCard label="ATTENDANCE" mark="◎" policy={analysis.policies.attendance} tone="mint" showEvidence={setEvidence} />
              <PolicyCard label="EXAMS" mark="◇" policy={analysis.policies.exams} tone="paper" showEvidence={setEvidence} />
              <PolicyCard label="COMMUNICATION" mark="@" policy={analysis.policies.communication} tone="blue" showEvidence={setEvidence} />
              <PolicyCard label="ACADEMIC INTEGRITY" mark="§" policy={analysis.policies.academicIntegrity} tone="paper" showEvidence={setEvidence} />
              <PolicyCard label="ACCOMMODATIONS" mark="＋" policy={analysis.policies.accommodations} tone="lavender" showEvidence={setEvidence} />
            </div></section>

            <section className="dashboard-section split-section">
              <article className="data-panel"><div className="panel-heading"><div><p className="overline">GRADING</p><h2>Where the grade comes from.</h2></div>{analysis.grading.evidence && <button type="button" onClick={() => setEvidence(analysis.grading.evidence)}>Source ↗</button>}</div>{analysis.grading.items.length ? <div className="grade-list">{analysis.grading.items.map((item, index) => <div className="grade-row" key={`${item.name}-${index}`}><div><span>{item.name}</span><strong>{item.weight === null ? '—' : `${item.weight}%`}</strong></div><span className="metric-track"><i style={{ width: `${Math.min(item.weight || 8, 100)}%` }} /></span></div>)}</div> : <p className="empty-copy">No clear percentage breakdown was found.</p>}<p className="panel-footnote">Known weights total {analysis.grading.totalKnown}%.</p></article>
              <article className="data-panel"><div className="panel-heading"><div><p className="overline">EXAMS &amp; KEY DATES</p><h2>Big things on the horizon.</h2></div><button type="button" disabled={!analysis.dates.length} onClick={() => exportCalendar(analysis)}>Export .ics</button></div>{analysis.dates.length ? <div className="date-list">{[...analysis.dates].sort((a, b) => (a.type === 'exam' ? -1 : 1) - (b.type === 'exam' ? -1 : 1) || a.date.localeCompare(b.date)).slice(0, 9).map((item, index) => <div className="date-row" key={`${item.label}-${index}`}><span className={`date-type ${item.type}`}>{item.type === 'exam' ? 'EX' : item.type === 'assignment' ? 'AS' : '•'}</span><div><strong>{item.label}</strong><small>{formatDate(item.date)}{item.endDate ? ` – ${formatDate(item.endDate)}` : ''}</small>{item.notes && <small className="date-note">{item.notes}</small>}</div></div>)}</div> : <p className="empty-copy">No explicit exam or assignment dates could be confidently normalized.</p>}</article>
            </section>

            <section className="dashboard-section split-section" id="pressure">
              <article className="data-panel pressure-panel"><div className="panel-heading"><div><p className="overline">PRESSURE BREAKDOWN</p><h2>A transparent rating.</h2></div><strong className="panel-score">{analysis.difficulty.score.toFixed(1)}</strong></div><p className="method-note">{analysis.difficulty.summary}</p><div className="factor-list">{analysis.difficulty.factors.map((factor) => <div className="factor-row" key={factor.label}><div><span>{factor.label}</span><strong>{factor.score.toFixed(1)} / {factor.max}</strong></div><span className="metric-track"><i style={{ width: `${Math.min((factor.score / factor.max) * 100, 100)}%` }} /></span><small>{factor.reason}</small></div>)}</div></article>
              <article className="data-panel instructor-panel"><p className="overline">INSTRUCTOR</p><div className="instructor-profile"><span>{initials(analysis.instructor.name)}</span><div><h2>{analysis.instructor.name || 'Not listed'}</h2><p>{analysis.instructor.role || 'Instructor'}</p></div></div><dl className="contact-list"><div><dt>Email</dt><dd>{analysis.instructor.email ? <a href={`mailto:${analysis.instructor.email}`}>{analysis.instructor.email}</a> : 'Not listed'}</dd></div><div><dt>Phone</dt><dd>{analysis.instructor.phone || 'Not listed'}</dd></div><div><dt>Office</dt><dd>{analysis.instructor.office || 'Not listed'}</dd></div><div><dt>Office hours</dt><dd>{analysis.instructor.officeHours || 'Not listed'}</dd></div><div><dt>Also reachable via</dt><dd>{analysis.instructor.alternateContact || 'Not listed'}</dd></div></dl>
                <div className="rmp-card"><div className="rmp-top"><span className="rmp-mark">RMP</span><div><strong>Rate My Professors</strong><small>{rmp?.status === 'matched' ? 'Verified profile match' : 'No verified profile linked'}</small></div></div>{rmp?.status === 'matched' ? <div className="rmp-stats"><span><strong>{rmp.rating?.toFixed(1)}</strong>Quality</span><span><strong>{rmp.difficulty?.toFixed(1)}</strong>Difficulty</span><span><strong>{rmp.wouldTakeAgain}%</strong>Would take again</span></div> : <p>Automatic matching is prepared, but disabled until an authorized data source is available.</p>}<a href={rmp?.profileUrl || 'https://www.ratemyprofessors.com/'} target="_blank" rel="noreferrer">Search on Rate My Professors ↗</a></div>
              </article>
            </section>

            {(analysis.materials.length > 0 || analysis.unknowns.length > 0) && <section className="dashboard-section note-grid"><article><p className="overline">MATERIALS</p><h2>What you may need.</h2><ul>{analysis.materials.map((item) => <li key={item}>{item}</li>)}</ul></article><article><p className="overline">NOT FOUND</p><h2>Worth confirming.</h2><ul>{analysis.unknowns.map((item) => <li key={item}>{item}</li>)}</ul></article></section>}

            <footer className="app-footer"><span>CourseCue</span><p>AI can misread a syllabus. Verify important policies against the original source.</p><button type="button" onClick={() => viewOriginal(analysis)}>{analysis.sourceFile?.available ? 'View original file ↗' : analysis.sourceFile ? 'Original unavailable' : analysis.sourceText.trim() ? 'View original text' : 'Original unavailable'}</button></footer>
          </section>
        </div>

        {evidence && <div className="modal-backdrop animate-in fade-in duration-200" onMouseDown={(event) => event.currentTarget === event.target && setEvidence(null)}><section className="evidence-modal animate-in fade-in zoom-in-95 duration-200" role="dialog" aria-modal="true" aria-labelledby="evidence-heading"><div className="modal-heading"><div><p className="overline">SOURCE EVIDENCE</p><h2 id="evidence-heading">{evidence.context}</h2></div><button type="button" onClick={() => setEvidence(null)} aria-label="Close">×</button></div><blockquote>{evidence.quote || 'Original text is not available for this file-based analysis.'}</blockquote><p>Verify important decisions against your original syllabus.</p></section></div>}
      </main>
    );
  }

  return (
    <main className="app-shell" {...globalDropProps}>
      {globalFileUi}
      <nav className="topbar"><a className="brand" href="#top"><span className="brand-mark">C</span><span>CourseCue</span></a><div className="nav-actions"><a href="#features">What it finds</a><button type="button" onClick={() => courses.length && setView('semester')}>Syllabi {courses.length ? `(${courses.length})` : ''}</button><SettingsDialog settings={aiSettings} onSave={saveAiSettings} /><ThemeToggleButton theme={theme} onToggle={toggleTheme} /></div></nav>
      <section className="hero animate-in fade-in slide-in-from-bottom-2 duration-500" id="top"><div className="eyebrow"><span /> A syllabus workspace for students</div><h1>Read it once.<br />Know it all semester.</h1><p className="hero-copy">CourseCue turns the document you keep reopening into a clear, source-backed guide to every policy, deadline, grade, and expectation.</p>
        <div className="import-card">
          <div className="import-heading"><div><span className="document-index">{String(Math.min(courses.length + 1, MAX_COURSES)).padStart(2, '0')}</span><div><strong>New course analysis</strong><small>{courses.length} of {MAX_COURSES} syllabi saved in this browser.</small></div></div><span className="ai-ready">AI ready</span></div>
          <div className="import-tabs"><button className={method === 'upload' ? 'active' : ''} type="button" onClick={() => setMethod('upload')}>Drop a file</button><button className={method === 'paste' ? 'active' : ''} type="button" onClick={() => setMethod('paste')}>Paste text</button></div>
          {atCourseLimit ? <div className="upload-limit"><span>{MAX_COURSES}/{MAX_COURSES}</span><strong>Your semester is full.</strong><p>Delete a syllabus from the Syllabi dashboard before adding another.</p><button type="button" onClick={() => setView('semester')}>Manage syllabi</button></div> : method === 'upload' ? <button className="file-drop" type="button" onClick={() => fileInput.current?.click()}><span>↑</span>{file ? <><strong>{file.name}</strong><small>Ready to analyze · click to replace</small></> : <><strong>Drop your syllabus anywhere</strong><small>It analyzes automatically · PDF, DOCX, TXT, or Markdown · up to 10 MB</small></>}</button> : <><label className="sr-only" htmlFor="syllabus-text">Syllabus text</label><textarea id="syllabus-text" value={syllabus} onChange={(event) => setSyllabus(event.target.value)} placeholder="Paste the full syllabus here…" /></>}
          <input ref={fileInput} className="sr-only" type="file" accept=".pdf,.docx,.txt,.md,text/plain,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document" onChange={(event) => chooseFile(event.target.files?.[0])} />
          <div className="import-footer"><span><i /> Stored locally after analysis</span><div><button className="example-button" type="button" disabled={atCourseLimit} onClick={() => { setMethod('paste'); setSyllabus(sampleSyllabus); setFile(null); setError(''); }}>Use sample</button><button className="analyze-button" type="button" disabled={atCourseLimit || analyzing || (!syllabus.trim() && !file)} onClick={() => void analyze()}>{analyzing ? <><i className="spinner" />Reading every section…</> : <>Analyze syllabus <b>→</b></>}</button></div></div>
        </div>
        {error && <p className="form-error" role="alert">{error}</p>}
        <div className="trust-row"><span>Source-backed answers</span><span>Transparent scoring</span><span>No account required</span></div>
      </section>

      <section className="preview-section" id="features"><div className="preview-heading"><div><p className="overline">THE SECOND LOOKUP, SOLVED</p><h2>Everything you need.<br />Nothing you have to hunt for.</h2></div><span>Example course</span></div><div className="preview-grid"><article className="preview-course"><div><span>CS 312</span><small>Fall 2026</small></div><h3>Data Structures<br />&amp; Algorithms</h3><p>Dr. Maya Chen · Northwood University</p><footer><div><span>SYLLABUS PRESSURE</span><strong>Intense</strong></div><b>7.8<small>/10</small></b></footer></article><article className="preview-policy sand"><span className="preview-mark">↘</span><p className="overline">LATE WORK</p><h3>48-hour window</h3><p>Accepted with a 15% deduction per day. Nothing after 48 hours without approval.</p><small>Exact source attached</small></article><article className="preview-policy mint"><span className="preview-mark">◎</span><p className="overline">ATTENDANCE</p><h3>Effectively mandatory</h3><p>Three unexcused absences lowers the final grade by one letter.</p><small>Exact source attached</small></article></div><div className="feature-index">{['Instructor contact', 'Grading weights', 'Key dates', 'Weekly workload', 'Required materials', 'Unknowns to confirm'].map((feature, index) => <span key={feature}><b>0{index + 1}</b>{feature}</span>)}</div></section>
    </main>
  );
}
