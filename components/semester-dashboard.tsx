'use client';

import { useMemo, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { AlertTriangle, ArrowRight, BookOpen, CalendarDays, Check, Clock3, FileUp, Link2, Pencil, RefreshCw, X } from 'lucide-react';
import { RemoveCourseButton } from '@/components/remove-course-button';
import type { CalendarConnection, CalendarEvent } from '@/lib/calendar-types';
import { parseFeed } from '@/lib/ics';
import type { CourseAnalysis } from '@/lib/types';

type Props = {
  courses: CourseAnalysis[];
  courseLimit: number;
  canvasEvents: CalendarEvent[];
  connection: CalendarConnection | null;
  onSelectCourse: (course: CourseAnalysis) => void;
  onNewCourse: () => void;
  onUpdateCourse: (course: CourseAnalysis) => void;
  onRemoveCourse: (course: CourseAnalysis) => void;
  onSyncCalendar: (url: string) => Promise<{ count: number; calendarName: string }>;
  onImportCalendar: (events: CalendarEvent[], calendarName: string) => { count: number; calendarName: string };
};

type TextFieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: 'text' | 'email' | 'tel' | 'date';
  placeholder?: string;
};

function TextField({ label, value, onChange, type = 'text', placeholder }: TextFieldProps) {
  return <label><span>{label}</span><input type={type} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} /></label>;
}

function CourseDetailsEditor({ course, onSave, onCancel }: { course: CourseAnalysis; onSave: (course: CourseAnalysis) => void; onCancel: () => void }) {
  const [draft, setDraft] = useState<CourseAnalysis>({ ...course, course: { ...course.course }, instructor: { ...course.instructor } });
  const setCourse = (field: keyof CourseAnalysis['course'], value: string | number | null) => setDraft((current) => ({ ...current, course: { ...current.course, [field]: value } }));
  const setInstructor = (field: keyof CourseAnalysis['instructor'], value: string) => setDraft((current) => ({ ...current, instructor: { ...current.instructor, [field]: value } }));

  function save(event: FormEvent) {
    event.preventDefault();
    onSave(draft);
  }

  return (
    <form className="course-details-editor" onSubmit={save}>
      <div className="editor-heading"><div><strong>Edit course details</strong><small>Changes save only in this browser.</small></div><button type="button" onClick={onCancel} aria-label="Cancel editing"><X /></button></div>
      <fieldset><legend>Course</legend><div className="editor-grid">
        <TextField label="Course code" value={draft.course.code} onChange={(value) => setCourse('code', value)} placeholder="ENGH 101" />
        <TextField label="Course title" value={draft.course.title} onChange={(value) => setCourse('title', value)} placeholder="Course title" />
        <TextField label="Institution" value={draft.course.institution} onChange={(value) => setCourse('institution', value)} placeholder="School or university" />
        <TextField label="Term" value={draft.course.term} onChange={(value) => setCourse('term', value)} placeholder="Fall 2026" />
        <TextField label="Section" value={draft.course.section} onChange={(value) => setCourse('section', value)} placeholder="001" />
        <TextField label="Meeting time" value={draft.course.meetingTime} onChange={(value) => setCourse('meetingTime', value)} placeholder="Mon/Wed 10:30 AM" />
        <TextField label="Location" value={draft.course.location} onChange={(value) => setCourse('location', value)} placeholder="Room or online" />
        <label><span>Credits</span><input type="number" min="0" max="12" step="0.5" value={draft.course.credits ?? ''} onChange={(event) => setCourse('credits', event.target.value === '' ? null : Math.min(12, Math.max(0, Number(event.target.value))))} placeholder="3" /></label>
        <TextField label="Start date" type="date" value={draft.course.startDate} onChange={(value) => setCourse('startDate', value)} />
        <TextField label="End date" type="date" value={draft.course.endDate} onChange={(value) => setCourse('endDate', value)} />
      </div></fieldset>
      <fieldset><legend>Instructor</legend><div className="editor-grid">
        <TextField label="Professor name" value={draft.instructor.name} onChange={(value) => setInstructor('name', value)} placeholder="Professor name" />
        <TextField label="Role" value={draft.instructor.role} onChange={(value) => setInstructor('role', value)} placeholder="Professor" />
        <TextField label="Email" type="email" value={draft.instructor.email} onChange={(value) => setInstructor('email', value)} placeholder="name@school.edu" />
        <TextField label="Phone" type="tel" value={draft.instructor.phone} onChange={(value) => setInstructor('phone', value)} placeholder="Phone number" />
        <TextField label="Office" value={draft.instructor.office} onChange={(value) => setInstructor('office', value)} placeholder="Building and room" />
        <TextField label="Office hours" value={draft.instructor.officeHours} onChange={(value) => setInstructor('officeHours', value)} placeholder="Tue 2–4 PM" />
        <TextField label="Other contact" value={draft.instructor.alternateContact} onChange={(value) => setInstructor('alternateContact', value)} placeholder="Canvas, Teams, etc." />
      </div></fieldset>
      <div className="editor-actions"><button type="button" onClick={onCancel}>Cancel</button><button type="submit"><Check /> Save changes</button></div>
    </form>
  );
}

function safeDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T12:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatDate(value: string, withYear = false) {
  const date = safeDate(value);
  if (!date) return 'Not found';
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', ...(withYear ? { year: 'numeric' } : {}) }).format(date);
}

function courseEnd(course: CourseAnalysis) {
  const found = course.course.endDate || course.dates.map((item) => item.date).filter(Boolean).sort().at(-1) || '';
  return safeDate(found) ? found : '';
}

function mostCommon(values: string[]) {
  const counts = new Map<string, number>();
  values.filter(Boolean).forEach((value) => counts.set(value, (counts.get(value) || 0) + 1));
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || 'Current semester';
}

function eventCourseLabel(event: CalendarEvent) {
  return event.courseName || (event.source === 'canvas' ? 'Canvas' : 'Course');
}

export function SemesterDashboard({ courses, courseLimit, canvasEvents, connection, onSelectCourse, onNewCourse, onUpdateCourse, onRemoveCourse, onSyncCalendar, onImportCalendar }: Props) {
  const [feedUrl, setFeedUrl] = useState('');
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const calendarFileInput = useRef<HTMLInputElement>(null);

  const data = useMemo(() => {
    const syllabusEvents: CalendarEvent[] = courses.flatMap((course) => course.dates.filter((item) => item.type === 'exam').map((item, index) => ({
      id: `syllabus_${course.id}_${index}`,
      title: item.label,
      date: item.date,
      dateTime: '',
      courseName: course.course.code || course.course.title,
      type: item.type,
      source: 'syllabus' as const,
      url: '',
    })));
    const canvasKeys = new Set(canvasEvents.map((event) => `${event.date}|${event.title.toLowerCase()}`));
    const combined = [...canvasEvents, ...syllabusEvents.filter((event) => !canvasKeys.has(`${event.date}|${event.title.toLowerCase()}`))]
      .filter((event) => safeDate(event.date))
      .sort((a, b) => a.date.localeCompare(b.date));
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const upcoming = combined.filter((event) => (safeDate(event.date)?.getTime() || 0) >= today.getTime()).slice(0, 10);
    const byDate = new Map<string, CalendarEvent[]>();
    combined.forEach((event) => byDate.set(event.date, [...(byDate.get(event.date) || []), event]));
    const collisions = [...byDate.entries()]
      .filter(([, events]) => events.length > 1 && (safeDate(events[0].date)?.getTime() || 0) >= today.getTime())
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(0, 5);
    const knownCredits = courses.map((course) => course.course.credits).filter((value): value is number => typeof value === 'number');
    const endDates = courses.map(courseEnd).filter(Boolean).sort();
    return {
      term: mostCommon(courses.map((course) => course.course.term).filter((term) => term !== 'Term not found')),
      credits: knownCredits.reduce((sum, value) => sum + value, 0),
      creditsKnown: knownCredits.length,
      weeklyHours: courses.reduce((sum, course) => sum + (course.workload.hoursMax || 0), 0),
      workloadKnown: courses.filter((course) => course.workload.hoursMax !== null).length,
      pressure: courses.length ? courses.reduce((sum, course) => sum + course.difficulty.score, 0) / courses.length : 0,
      endDate: endDates.at(-1) || '',
      upcoming,
      collisions,
    };
  }, [courses, canvasEvents]);

  async function sync(event: FormEvent) {
    event.preventDefault();
    if (!feedUrl.trim()) return;
    setSyncing(true);
    setSyncMessage('');
    try {
      const result = await onSyncCalendar(feedUrl.trim());
      setFeedUrl('');
      setSyncMessage(`${result.count} events synced from ${result.calendarName}.`);
    } catch (error) {
      setSyncMessage(error instanceof Error ? error.message : 'Calendar sync failed.');
    } finally {
      setSyncing(false);
    }
  }

  async function importCalendarFile(event: ChangeEvent<HTMLInputElement>) {
    const selected = event.target.files?.[0];
    event.target.value = '';
    if (!selected) return;
    setSyncMessage('');
    if (selected.size > 2_000_000) return setSyncMessage('Keep calendar files under 2 MB.');
    if (!selected.name.toLowerCase().endsWith('.ics')) return setSyncMessage('Choose an .ics calendar file.');
    try {
      const parsed = parseFeed(await selected.text());
      if (!parsed.events.length) throw new Error('No dated events were found in that calendar file.');
      const result = onImportCalendar(parsed.events, parsed.calendarName);
      setSyncMessage(`${result.count} events imported from ${result.calendarName}.`);
    } catch (error) {
      setSyncMessage(error instanceof Error ? error.message : 'The calendar file could not be imported.');
    }
  }

  return (
    <section className="semester-main animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="semester-heading">
        <div><p className="overline">SYLLABI OVERVIEW</p><h1>{data.term}</h1><p>Your course load, critical dates, and pressure points in one place.</p></div>
        <button className="secondary-button" type="button" onClick={onNewCourse} disabled={courses.length >= courseLimit}>＋ Add course</button>
      </div>

      {courses.length >= courseLimit && <div className="course-limit-banner" role="status"><span>{courses.length}/{courseLimit}</span><p><strong>Syllabus limit reached.</strong> Delete one below before adding another.</p></div>}

      <section className="semester-stats" aria-label="Syllabi summary">
        <article><span className="semester-stat-icon"><BookOpen /></span><p>Courses</p><strong>{courses.length}</strong><small>{courses.length === 1 ? 'syllabus analyzed' : 'syllabi analyzed'}</small></article>
        <article><span className="semester-stat-icon"><span>Cr</span></span><p>Total credits</p><strong>{data.creditsKnown ? data.credits : '—'}</strong><small>{data.creditsKnown === courses.length ? 'all courses counted' : `${data.creditsKnown}/${courses.length} courses known`}</small></article>
        <article><span className="semester-stat-icon"><Clock3 /></span><p>Weekly work</p><strong>{data.workloadKnown ? `${data.weeklyHours}h` : '—'}</strong><small>{data.workloadKnown === courses.length ? 'stated maximum' : `${data.workloadKnown}/${courses.length} estimates found`}</small></article>
        <article><span className="semester-stat-icon"><CalendarDays /></span><p>Semester ends</p><strong>{data.endDate ? formatDate(data.endDate) : '—'}</strong><small>{data.endDate ? formatDate(data.endDate, true) : 'end dates not found'}</small></article>
      </section>

      <section className="semester-grid semester-top-grid">
        <article className="semester-panel load-panel">
          <div className="semester-panel-heading"><div><p className="overline">COURSE LOAD</p><h2>Your semester at a glance.</h2></div><strong className="load-score">{data.pressure.toFixed(1)}<small>/10 avg</small></strong></div>
          <div className="semester-course-list">
            {courses.map((course, index) => (
              <div className={`semester-course-entry ${editingId === course.id ? 'editing' : ''}`} key={course.id}>
              <article className="semester-course-row">
                <button type="button" onClick={() => onSelectCourse(course)}>
                  <span className={`course-color color-${index % 4}`}>{(course.course.code || 'CC').slice(0, 2)}</span>
                  <span className="semester-course-copy"><strong>{course.course.code || 'Untitled course'}</strong><small>{course.course.title}</small></span>
                  <span className="course-pressure"><strong>{course.difficulty.score.toFixed(1)}</strong><small>{course.difficulty.label}</small></span>
                  <ArrowRight className="row-arrow" aria-hidden="true" />
                </button>
                <button className="edit-course-button" type="button" onClick={() => setEditingId(editingId === course.id ? null : course.id)} aria-expanded={editingId === course.id}><Pencil aria-hidden="true" /> Edit</button>
                <RemoveCourseButton course={course} onRemove={onRemoveCourse} compact />
              </article>
              {editingId === course.id && <CourseDetailsEditor course={course} onCancel={() => setEditingId(null)} onSave={(updated) => { onUpdateCourse(updated); setEditingId(null); }} />}
              </div>
            ))}
          </div>
        </article>

        <article className="semester-panel collision-panel">
          <div className="semester-panel-heading"><div><p className="overline">COLLISION RADAR</p><h2>Heavy dates.</h2></div><AlertTriangle aria-hidden="true" /></div>
          {data.collisions.length ? <div className="collision-list">{data.collisions.map(([date, events]) => <div className="collision-row" key={date}><time dateTime={date}><strong>{formatDate(date)}</strong><small>{events.length} items due</small></time><div>{events.slice(0, 3).map((event) => <span key={event.id}><i className={`event-dot ${event.type}`} />{eventCourseLabel(event)} · {event.title}</span>)}</div></div>)}</div> : <div className="calm-state"><span>✓</span><strong>No stacked deadlines found</strong><p>Same-day assignments and exams will surface here automatically.</p></div>}
        </article>
      </section>

      <section className="semester-grid calendar-grid">
        <article className="semester-panel calendar-connect-panel">
          <div className="semester-panel-heading"><div><p className="overline">CANVAS CALENDAR</p><h2>Keep changed dates in sync.</h2></div><Link2 aria-hidden="true" /></div>
          <p className="calendar-explainer">Paste your Canvas iCal feed to pull assignments, quizzes, exams, and course events into this dashboard.</p>
          <form className="calendar-feed-form" onSubmit={sync}>
            <label htmlFor="calendar-feed">Canvas iCal feed URL</label>
            <div><input id="calendar-feed" type="password" inputMode="url" autoComplete="off" value={feedUrl} onChange={(event) => setFeedUrl(event.target.value)} placeholder="https://…/feeds/calendars/…ics" /><button type="submit" disabled={syncing || !feedUrl.trim()}>{syncing ? <><RefreshCw className="sync-icon" /> Syncing</> : connection ? 'Sync again' : 'Connect feed'}</button></div>
          </form>
          <div className="feed-privacy"><span>⌁</span><p><strong>Treat this link like a password.</strong>CourseCue uses it for the sync request but does not save the URL.</p></div>
          <div className="calendar-fallback"><span><FileUp aria-hidden="true" /><span><strong>Canvas blocked the link?</strong><small>Download the feed as an .ics file and import it locally.</small></span></span><button type="button" onClick={() => calendarFileInput.current?.click()}>Import .ics</button><input ref={calendarFileInput} className="sr-only" type="file" accept=".ics,text/calendar" onChange={importCalendarFile} /></div>
          {connection && <p className="connection-status"><i /> {connection.calendarName} · last synced {new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(new Date(connection.lastSynced))}</p>}
          {syncMessage && <p className="sync-message" role="status">{syncMessage}</p>}
        </article>

        <article className="semester-panel upcoming-panel">
          <div className="semester-panel-heading"><div><p className="overline">UP NEXT</p><h2>Coming across every course.</h2></div><span className="event-count">{data.upcoming.length}</span></div>
          {data.upcoming.length ? <div className="upcoming-list">{data.upcoming.map((event) => <a className="upcoming-row" href={event.url || undefined} target={event.url ? '_blank' : undefined} rel={event.url ? 'noreferrer' : undefined} key={event.id}><time dateTime={event.date}><strong>{safeDate(event.date)?.getDate()}</strong><small>{safeDate(event.date)?.toLocaleString('en-US', { month: 'short' })}</small></time><span><strong>{event.title}</strong><small>{eventCourseLabel(event)} · {event.source === 'canvas' ? 'Canvas' : 'Syllabus'}</small></span><i className={`event-pill ${event.type}`}>{event.type}</i></a>)}</div> : <div className="calm-state"><span>◇</span><strong>No upcoming dates yet</strong><p>Add more syllabi or connect Canvas to build the full timeline.</p></div>}
        </article>
      </section>
    </section>
  );
}
