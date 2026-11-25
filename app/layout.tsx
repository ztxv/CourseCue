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

// Production origin. Link-preview crawlers need ABSOLUTE URLs, and Next builds the absolute
// og:url, og:image, twitter:image and canonical from this base. Change it here if the domain changes.
const SITE_URL = 'https://course-cue.vercel.app';
const SHARE_TITLE = 'CourseCue — Read it once. Know it all semester.';
const SHARE_DESCRIPTION = 'Turn a syllabus into a source-backed guide to policies, grades, deadlines, and workload. Saved in your browser, no account needed.';
const OG_IMAGE = {
  url: '/og-image.png',
  type: 'image/png',
  width: 1200,
  height: 630,
  alt: 'CourseCue: the headline “Read it once. Know it all semester.” next to an example course card showing a syllabus pressure score of 7.8 out of 10.',
};

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: 'CourseCue — Your syllabus, decoded',
  description: 'Turn a course syllabus into a source-backed guide to policies, deadlines, grading, workload, and instructor information.',
  alternates: { canonical: '/' },
  manifest: '/manifest.webmanifest',
  appleWebApp: { title: 'CourseCue' },
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/favicon.svg', type: 'image/svg+xml' },
    ],
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
  },
  openGraph: {
    type: 'website',
    siteName: 'CourseCue',
    url: '/',
    title: SHARE_TITLE,
    description: SHARE_DESCRIPTION,
    images: [OG_IMAGE],
  },
  twitter: { card: 'summary_large_image', title: SHARE_TITLE, description: SHARE_DESCRIPTION, images: [{ url: OG_IMAGE.url, alt: OG_IMAGE.alt }] },
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
