export type CalendarEvent = {
  id: string;
  title: string;
  date: string;
  dateTime: string;
  courseName: string;
  type: 'assignment' | 'exam' | 'other';
  source: 'canvas' | 'syllabus';
  url: string;
};

export type CalendarConnection = {
  calendarName: string;
  lastSynced: string;
};
