import type { CourseAnalysis, Evidence, Policy } from './types';

const monthNames = 'January|February|March|April|May|June|July|August|September|October|November|December';

function lineValue(text: string, labels: string[]) {
  const line = text.split(/\r?\n/).map((item) => item.trim()).find((item) => labels.some((label) => item.toLowerCase().startsWith(label)));
  return line?.replace(/^[^:]+:\s*/, '').trim() || '';
}

function findSection(text: string, keywords: string[]) {
  const paragraphs = text.split(/\n\s*\n/).map((item) => item.trim()).filter(Boolean);
  return paragraphs.find((part) => keywords.some((word) => part.toLowerCase().includes(word))) || '';
}

function clean(value: string) {
  return value.replace(/^[A-Z][A-Z\s&/-]{2,}\n/, '').replace(/\s+/g, ' ').trim();
}

function proof(value: string, context: string): Evidence | null {
  const quote = clean(value);
  return quote ? { quote: quote.slice(0, 500), context } : null;
}

function unknown(label: string): Policy {
  return { status: 'unknown', headline: 'Not specified', summary: `No clear ${label.toLowerCase()} policy was found.`, details: [], impact: 'Confirm this directly with the instructor.', evidence: null };
}

function generic(value: string, label: string): Policy {
  if (!value) return unknown(label);
  return { status: 'moderate', headline: label, summary: clean(value).slice(0, 330), details: [], impact: `Review the ${label.toLowerCase()} details before the course begins.`, evidence: proof(value, `${label} section`) };
}

function isoDate(raw: string) {
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? '' : date.toISOString().slice(0, 10);
}

export function analyzeLocally(source: string, sourceName = 'Pasted syllabus'): CourseAnalysis {
  const text = source.replace(/\u00a0/g, ' ').trim();
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const courseLine = lines.find((line) => /\b[A-Z]{2,6}\s?\d{2,4}[A-Z]?\b/.test(line)) || lines[0] || 'Untitled course';
  const code = courseLine.match(/\b[A-Z]{2,6}\s?\d{2,4}[A-Z]?\b/)?.[0] || 'COURSE';
  const title = courseLine.replace(code, '').replace(/^[\s—–:-]+/, '').trim() || 'Untitled course';
  const institution = lines.slice(0, 12).find((line) => /\b(university|college|institute|school)\b/i.test(line) && line !== courseLine) || '';
  const term = text.match(/\b(Spring|Summer|Fall|Winter)\s+20\d{2}\b/i)?.[0] || 'Term not found';
  const sectionNumber = text.match(/\bSection\s+([\w-]+)/i)?.[1] || '';
  const meetingLine = lines.slice(0, 12).find((line) => /(?:monday|tuesday|wednesday|thursday|friday|\bMWF\b|\bTR\b).*(?:AM|PM|\d{1,2}:\d{2})/i.test(line)) || '';
  const creditsMatch = text.match(/\b(\d(?:\.\d)?)\s*(?:semester\s+)?credit(?:\s+hours?)?\b/i) || text.match(/\bcredits?\s*:?\s*(\d(?:\.\d)?)/i);
  const credits = creditsMatch ? Number(creditsMatch[1]) : null;

  const late = findSection(text, ['late work', 'late submission', 'late assignment']);
  const attendance = findSection(text, ['attendance', 'unexcused absences']);
  const grading = findSection(text, ['grading', 'grade breakdown']);
  const workload = findSection(text, ['workload', 'hours of work', 'outside class']);
  const communication = findSection(text, ['communication', 'response time']);
  const integrity = findSection(text, ['academic integrity', 'academic honesty', 'plagiarism']);
  const accommodations = findSection(text, ['accommodations', 'accessibility services', 'disability services']);
  const materialsSource = findSection(text, ['required materials', 'textbook']);

  const lateHours = Number(late.match(/(\d+)\s*hours?/i)?.[1] || 0);
  const lateDays = Number(late.match(/(\d+)\s*days?/i)?.[1] || 0);
  const latePenalty = Number(late.match(/(\d+(?:\.\d+)?)\s*%[^.]{0,35}(?:day|late)/i)?.[1] || 0);
  const hardStop = /no submissions|no late|not accepted|will not be accepted/i.test(late);
  const latePolicy: Policy = late ? {
    status: hardStop && !lateHours && !lateDays ? 'strict' : latePenalty >= 20 ? 'strict' : 'moderate',
    headline: lateHours ? `${lateHours}-hour window` : lateDays ? `${lateDays}-day window` : hardStop ? 'No late work' : 'Conditions apply',
    summary: clean(late).slice(0, 360),
    details: [lateHours ? `${lateHours} hours maximum` : '', lateDays ? `${lateDays} days maximum` : '', latePenalty ? `${latePenalty}% penalty stated` : ''].filter(Boolean),
    impact: hardStop ? 'Missing the final window could mean receiving no credit.' : 'Plan a buffer before each due date.',
    evidence: proof(late, 'Late work section'),
  } : unknown('Late work');

  const absences = Number(attendance.match(/(?:more than|after)\s+(\d+)\s+(?:unexcused\s+)?absences?/i)?.[1] || 0);
  const attendancePenalty = /reduce|lower|deduct|fail|grade/i.test(attendance);
  const attendanceRequired = /required|mandatory|expected to attend|must attend/i.test(attendance);
  const attendancePolicy: Policy = attendance ? {
    status: attendancePenalty ? 'strict' : attendanceRequired ? 'moderate' : /optional|not required/i.test(attendance) ? 'flexible' : 'moderate',
    headline: attendancePenalty ? 'Effectively mandatory' : attendanceRequired ? 'Attendance expected' : /optional|not required/i.test(attendance) ? 'Not required' : 'Policy mentioned',
    summary: clean(attendance).slice(0, 360),
    details: [absences ? `Penalty after ${absences} absences` : '', /material.*(?:class|lecture)|class.*material/i.test(attendance) ? 'Class-only material may be assessed' : ''].filter(Boolean),
    impact: attendancePenalty ? 'Absences can directly affect the final grade.' : 'Attendance may affect how much material you miss.',
    evidence: proof(attendance, 'Attendance section'),
  } : unknown('Attendance');

  const gradeItems = Array.from(grading.matchAll(/([A-Za-z][A-Za-z\s&/-]{1,45}?)\s+(\d{1,3}(?:\.\d+)?)\s*%/g)).map((match) => ({
    name: match[1].replace(/^GRADING\s*/i, '').replace(/^[,.;:\s]+|[,.;:\s]+$/g, ''),
    weight: Number(match[2]),
  })).filter((item) => item.weight <= 100);
  const examWeight = gradeItems.filter((item) => /exam|midterm|final/i.test(item.name)).reduce((sum, item) => sum + item.weight, 0);
  const examPolicy: Policy = grading ? {
    status: examWeight >= 50 || /cumulative/i.test(grading) ? 'strict' : examWeight >= 30 ? 'moderate' : 'flexible',
    headline: /cumulative/i.test(grading) ? 'Cumulative final' : examWeight ? `${examWeight}% exam weight` : 'Assessments listed',
    summary: clean(grading).slice(0, 350), details: [examWeight ? `${examWeight}% tied to exams` : '', /cumulative/i.test(grading) ? 'Final covers the full course' : ''].filter(Boolean),
    impact: examWeight >= 50 ? 'A small number of tests can move the final grade significantly.' : 'Review the assessment mix when planning study time.', evidence: proof(grading, 'Grading section'),
  } : unknown('Exams');

  const hoursRange = workload.match(/(\d+(?:\.\d+)?)\s*[–—-]\s*(\d+(?:\.\d+)?)\s*hours?/i);
  const singleHours = workload.match(/(\d+(?:\.\d+)?)\s*hours?/i);
  const hoursMin = hoursRange ? Number(hoursRange[1]) : singleHours ? Number(singleHours[1]) : null;
  const hoursMax = hoursRange ? Number(hoursRange[2]) : singleHours ? Number(singleHours[1]) : null;
  const words: Record<string, number> = { one: 1, two: 2, three: 3, four: 4, five: 5 };
  const assignmentMatch = workload.match(/\b(one|two|three|four|five|\d+)\s+(?:\w+\s+)?assignments?\b/i);
  const assignments = assignmentMatch ? words[assignmentMatch[1].toLowerCase()] || Number(assignmentMatch[1]) : /weekly assignment/i.test(workload) ? 1 : null;

  const factorScores = [
    { label: 'Deadline pressure', score: !late ? .6 : hardStop && !lateHours && !lateDays ? 2 : latePenalty >= 20 ? 1.7 : latePenalty ? 1.2 : .7, max: 2, reason: latePolicy.headline },
    { label: 'Attendance pressure', score: !attendance ? .4 : attendancePenalty ? 1.5 : attendanceRequired ? 1 : .3, max: 1.5, reason: attendancePolicy.headline },
    { label: 'High-stakes exams', score: examWeight >= 60 ? 2.5 : examWeight >= 45 ? 1.9 : examWeight >= 25 ? 1.3 : .7, max: 2.5, reason: examWeight ? `${examWeight}% of the grade` : examPolicy.headline },
    { label: 'Weekly workload', score: (hoursMax || 0) >= 12 ? 2.5 : (hoursMax || 0) >= 10 ? 1.9 : (hoursMax || 0) >= 7 ? 1.5 : hoursMax ? .9 : .8, max: 2.5, reason: hoursMax ? `${hoursMin === hoursMax ? hoursMax : `${hoursMin}–${hoursMax}`} hours outside class` : 'No estimate provided' },
    { label: 'Assignment cadence', score: (assignments || 0) >= 2 ? 1.5 : assignments === 1 || /weekly/i.test(workload) ? 1 : .5, max: 1.5, reason: assignments ? `${assignments} assignment${assignments === 1 ? '' : 's'} most weeks` : 'Cadence is unclear' },
  ];
  const pressure = Math.round(factorScores.reduce((sum, item) => sum + item.score, 0) * 10) / 10;
  const pressureLabel = pressure >= 8.8 ? 'Extreme' : pressure >= 7.5 ? 'Intense' : pressure >= 5.6 ? 'Demanding' : pressure >= 3.1 ? 'Moderate' : 'Light';

  const dates: CourseAnalysis['dates'] = [];
  const dateRegex = new RegExp(`([^\\n—–-]{2,55})\\s*[—–-]\\s*(${monthNames})\\s+(\\d{1,2})(?:,\\s*(20\\d{2}))?`, 'gi');
  for (const match of text.matchAll(dateRegex)) {
    const year = match[4] || term.match(/20\d{2}/)?.[0] || String(new Date().getFullYear());
    const label = match[1].replace(/^.*(?:DATES|DATE)\s*/i, '').trim();
    dates.push({ label, date: isoDate(`${match[2]} ${match[3]}, ${year}`), endDate: '', type: /exam|midterm|final/i.test(label) ? 'exam' : /assignment|project|paper|quiz/i.test(label) ? 'assignment' : 'other', notes: '' });
  }
  const orderedDates = dates.map((item) => item.date).filter(Boolean).sort();
  const labeledDate = (labels: string[]) => {
    const pattern = new RegExp(`(?:${labels.join('|')})[^\\n]{0,35}?(${monthNames})\\s+(\\d{1,2})(?:,\\s*(20\\d{2}))?`, 'i');
    const match = text.match(pattern);
    const year = match?.[3] || term.match(/20\d{2}/)?.[0] || String(new Date().getFullYear());
    return match ? isoDate(`${match[1]} ${match[2]}, ${year}`) : '';
  };
  const startDate = labeledDate(['classes? begin', 'course (?:begins|starts)', 'start date', 'semester begins']) || orderedDates[0] || '';
  const endDate = labeledDate(['classes? end', 'course ends', 'end date', 'semester ends', 'last day of class']) || orderedDates.at(-1) || '';

  const alerts = [
    attendancePenalty ? (absences ? `More than ${absences} absences may lower your grade.` : 'Attendance can directly lower your grade.') : '',
    hardStop ? 'Late submissions stop being accepted after the stated window.' : '',
    examWeight >= 50 ? `${examWeight}% of the course grade is tied to exams.` : '',
    /minimum exam average|must average/i.test(grading) ? 'The syllabus includes a minimum exam-average requirement.' : '',
  ].filter(Boolean);

  const unknowns = [!late ? 'Late-work rules' : '', !attendance ? 'Attendance expectations' : '', !grading ? 'Grading breakdown' : '', !workload ? 'Expected weekly workload' : '', !lineValue(text, ['office hours:', 'student hours:']) ? 'Office hours' : ''].filter(Boolean);

  return {
    id: `course_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`, createdAt: new Date().toISOString(), sourceName, analysisMode: 'local',
    course: { code, title, institution, term, section: sectionNumber, meetingTime: meetingLine, location: '', credits, startDate, endDate },
    instructor: {
      name: lineValue(text, ['instructor:', 'professor:', 'teacher:']), role: 'Instructor',
      email: text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0] || '',
      phone: text.match(/(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]\d{3}[-.\s]\d{4}/)?.[0] || '',
      office: lineValue(text, ['office:']), officeHours: lineValue(text, ['office hours:', 'student hours:']), alternateContact: /canvas/i.test(communication) ? 'Canvas' : '',
    },
    quickTake: `${pressureLabel} syllabus pressure. ${hoursMax ? `Plan for about ${hoursMin === hoursMax ? hoursMax : `${hoursMin}–${hoursMax}`} hours outside class each week.` : 'No weekly time estimate is stated.'} ${alerts[0] || 'Review the policies below before the first deadline.'}`,
    alerts, difficulty: { score: pressure, label: pressureLabel, summary: 'This measures policy and workload pressure—not subject difficulty or instructor quality.', factors: factorScores },
    policies: { lateWork: latePolicy, attendance: attendancePolicy, exams: examPolicy, communication: generic(communication, 'Communication'), academicIntegrity: generic(integrity, 'Collaboration rules'), accommodations: generic(accommodations, 'Accommodation process') },
    workload: { hoursMin, hoursMax, assignmentsPerWeek: Number.isFinite(assignments) ? assignments : null, assignmentFrequency: assignments ? `${assignments} most weeks` : /weekly/i.test(workload) ? 'Weekly' : 'Not specified', readingFrequency: /reading.*(?:each|per)\s+week|weekly reading/i.test(workload) ? 'Weekly' : 'Not specified', summary: clean(workload) || 'No clear weekly workload estimate was found.', evidence: proof(workload, 'Workload section') },
    grading: { items: gradeItems, totalKnown: gradeItems.reduce((sum, item) => sum + item.weight, 0), summary: clean(grading) || 'No clear grading breakdown was found.', evidence: proof(grading, 'Grading section') },
    dates: dates.filter((item) => item.date).slice(0, 30), materials: clean(materialsSource).split(/(?<=[.!?])\s+/).filter(Boolean).slice(0, 5), unknowns, sourceText: text,
    rateMyProfessor: { status: 'not_checked', rating: null, difficulty: null, wouldTakeAgain: null, profileUrl: '' },
  };
}
