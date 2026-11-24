import type { Metadata, Viewport } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

const SITE_URL = 'https://course-cue.vercel.app';
const OG_IMAGE = { url: '/og-image.png', width: 1200, height: 630, alt: 'CourseCue: Read it once. Know it all semester.' };

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: 'CourseCue — Your syllabus, decoded',
  description: 'Turn a course syllabus into a source-backed guide to policies, deadlines, grading, workload, and instructor information.',
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/favicon.svg', type: 'image/svg+xml' },
    ],
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
  },
  openGraph: {
    title: 'CourseCue — Your syllabus, decoded',
    description: 'A source-backed syllabus workspace for students.',
    type: 'website',
    images: [OG_IMAGE],
  },
  twitter: { card: 'summary_large_image', title: 'CourseCue', description: 'A source-backed syllabus workspace for students.', images: [OG_IMAGE.url] },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f2f2ed' },
    { media: '(prefers-color-scheme: dark)', color: '#0d1210' },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: `(function(){try{var t=localStorage.getItem('coursecue-theme')||(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light');document.documentElement.dataset.theme=t;document.documentElement.classList.toggle('dark',t==='dark');document.documentElement.style.colorScheme=t}catch(e){}})()` }} />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
