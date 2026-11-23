import type { NextConfig } from 'next';

// Public demo build (`npm run build:demo`, plain `next build`): a fully statically
// exported site with no server. `pageExtensions: ['tsx']` leaves the `route.ts` API
// handlers out of the demo entirely, so the public host has no analysis relay
// and no server-side URL fetcher. The normal vinext build is unaffected.
const isDemo = process.env.NEXT_PUBLIC_COURSECUE_DEMO === 'true';

const nextConfig: NextConfig = isDemo
  ? { output: 'export', pageExtensions: ['tsx'], images: { unoptimized: true } }
  : {};

export default nextConfig;
