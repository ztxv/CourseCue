import type { CalendarEvent } from '@/lib/calendar-types';

function unfoldIcs(input: string) {
  return input.replace(/\r\n/g, '\n').replace(/\n[ \t]/g, '').split('\n');
}

function decodeIcs(value: string) {
  return value.replace(/\\n/gi, ' ').replace(/\\,/g, ',').replace(/\\;/g, ';').replace(/\\\\/g, '\\').trim();
}

function property(lines: string[], key: string) {
  const upper = key.toUpperCase();
  const line = lines.find((item) => {
    const separator = item.indexOf(':');
    if (separator < 0) return false;
    return item.slice(0, separator).split(';')[0].toUpperCase() === upper;
  });
  return line ? decodeIcs(line.slice(line.indexOf(':') + 1)) : '';
}

function parseIcsDate(raw: string) {
  const compact = raw.trim();
  if (/^\d{8}$/.test(compact)) return { date: `${compact.slice(0, 4)}-${compact.slice(4, 6)}-${compact.slice(6, 8)}`, dateTime: '' };
  const match = compact.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})?(Z)?$/);
  if (!match) return { date: '', dateTime: '' };
  const iso = `${match[1]}-${match[2]}-${match[3]}T${match[4]}:${match[5]}:${match[6] || '00'}${match[7] || ''}`;
  const parsed = new Date(iso);
  return { date: `${match[1]}-${match[2]}-${match[3]}`, dateTime: Number.isNaN(parsed.getTime()) ? '' : parsed.toISOString() };
}

function classify(title: string): CalendarEvent['type'] {
  if (/\b(exam|midterm|final)\b/i.test(title)) return 'exam';
  if (/\b(assignment|quiz|paper|project|discussion|homework|lab)\b/i.test(title)) return 'assignment';
  return 'other';
}

function safeEventUrl(raw: string) {
  try {
    const url = new URL(raw);
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.toString() : '';
  } catch { return ''; }
}

export function parseFeed(ics: string) {
  if (!ics.includes('BEGIN:VCALENDAR')) throw new Error('This file is not a valid iCalendar feed.');
  const lines = unfoldIcs(ics);
  const calendarName = property(lines, 'X-WR-CALNAME') || 'Imported calendar';
  const events: CalendarEvent[] = [];
  let block: string[] | null = null;

  for (const line of lines) {
    if (line.toUpperCase() === 'BEGIN:VEVENT') { block = []; continue; }
    if (line.toUpperCase() === 'END:VEVENT' && block) {
      const title = property(block, 'SUMMARY') || 'Untitled Canvas event';
      const parsedDate = parseIcsDate(property(block, 'DTSTART'));
      if (parsedDate.date) {
        const bracketMatches = [...title.matchAll(/\[([^\]]+)\]/g)];
        const courseName = bracketMatches.at(-1)?.[1]?.trim() || '';
        const uid = property(block, 'UID') || `${title}-${parsedDate.date}`;
        events.push({ id: `canvas_${uid}`, title, date: parsedDate.date, dateTime: parsedDate.dateTime, courseName, type: classify(title), source: 'canvas', url: safeEventUrl(property(block, 'URL')) });
      }
      block = null;
      continue;
    }
    if (block) block.push(line);
  }

  return { calendarName, events: Array.from(new Map(events.map((event) => [event.id, event])).values()).slice(0, 2500) };
}
