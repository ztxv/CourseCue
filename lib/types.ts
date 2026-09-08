export type Evidence = { quote: string; context: string };

export type Policy = {
  status: 'strict' | 'moderate' | 'flexible' | 'unknown';
  headline: string;
  summary: string;
  details: string[];
  impact: string;
  evidence: Evidence | null;
};

export type CourseAnalysis = {
  id: string;
  createdAt: string;
  sourceName: string;
  sourceFile?: {
    name: string;
    mimeType: string;
    available: boolean;
  };
  analysisMode: 'ai' | 'local';
  course: {
    code: string;
    title: string;
    institution: string;
    term: string;
    section: string;
    meetingTime: string;
    location: string;
    credits: number | null;
    startDate: string;
    endDate: string;
  };
  instructor: {
    name: string;
    role: string;
    email: string;
    phone: string;
    office: string;
    officeHours: string;
    alternateContact: string;
  };
  quickTake: string;
  alerts: string[];
  difficulty: {
    score: number;
    label: string;
    summary: string;
    factors: Array<{ label: string; score: number; max: number; reason: string }>;
  };
  policies: {
    lateWork: Policy;
    attendance: Policy;
    exams: Policy;
    communication: Policy;
    academicIntegrity: Policy;
    accommodations: Policy;
  };
  workload: {
    hoursMin: number | null;
    hoursMax: number | null;
    assignmentsPerWeek: number | null;
    assignmentFrequency: string;
    readingFrequency: string;
    summary: string;
    evidence: Evidence | null;
  };
  grading: {
    items: Array<{ name: string; weight: number | null }>;
    totalKnown: number;
    summary: string;
    evidence: Evidence | null;
  };
  dates: Array<{ label: string; date: string; endDate: string; type: 'exam' | 'assignment' | 'other'; notes: string }>;
  materials: string[];
  unknowns: string[];
  sourceText: string;
  rateMyProfessor?: {
    status: 'not_checked' | 'matched' | 'not_found';
    rating: number | null;
    difficulty: number | null;
    wouldTakeAgain: number | null;
    profileUrl: string;
  };
};
