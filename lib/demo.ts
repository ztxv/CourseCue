// Public demo mode. Enabled only when NEXT_PUBLIC_COURSECUE_DEMO=true at build
// time (see `npm run build:demo`). The value is inlined by the bundler, so in a
// normal build every `IS_DEMO &&` branch is constant-folded away.
export const IS_DEMO = process.env.NEXT_PUBLIC_COURSECUE_DEMO === 'true';

export const DEMO_REPO_URL = 'https://github.com/ztxv/CourseCue';
export const DEMO_QUICKSTART_URL = 'https://github.com/ztxv/CourseCue#quick-start';
export const DEMO_SAMPLE_NAME = 'Sample syllabus (CS 312)';

export const DEMO_FILE_TYPE_MESSAGE = 'The public demo reads TXT, Markdown, or pasted text in your browser. Run CourseCue locally to analyze PDF or DOCX syllabi with your own API key.';
export const DEMO_CALENDAR_MESSAGE = 'Live Canvas feed sync is available when you run CourseCue locally. In the demo, import a downloaded .ics file instead.';
