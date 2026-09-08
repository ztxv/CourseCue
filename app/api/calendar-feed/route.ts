import { parseFeed } from '@/lib/ics';

export const runtime = 'edge';

const MAX_FEED_BYTES = 2_000_000;

function isAllowedCanvasHost(hostname: string) {
  const host = hostname.toLowerCase();
  return host === 'instructure.com' || host.endsWith('.instructure.com') || host.startsWith('canvas.') || host.includes('.canvas.');
}

function validateFeedUrl(raw: string) {
  let url: URL;
  const normalized = raw.replace(/^webcal:\/\//i, 'https://');
  try { url = new URL(normalized); } catch { throw new Error('Paste a complete Canvas calendar feed link.'); }
  if (url.protocol !== 'https:') throw new Error('The calendar feed must use HTTPS.');
  if (url.username || url.password) throw new Error('Links with embedded usernames or passwords are not supported.');
  if (!isAllowedCanvasHost(url.hostname)) throw new Error('This does not look like a Canvas calendar host.');
  if (!/\/feeds\/calendars\//i.test(url.pathname)) throw new Error('Use the private iCal feed link from Canvas Calendar settings.');
  return url;
}

async function requestFeed(feedUrl: URL, signal: AbortSignal) {
  return fetch(feedUrl, {
    headers: {
      Accept: 'text/calendar,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
      'Cache-Control': 'no-cache',
      'User-Agent': 'CalendarAgent/954.8 CFNetwork/1568.100.1 Darwin/24.0.0',
    },
    cache: 'no-store', redirect: 'follow', signal,
  });
}

export async function POST(request: Request) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);
  try {
    const body = await request.json() as { url?: string };
    const feedUrl = validateFeedUrl((body.url || '').trim());
    const response = await requestFeed(feedUrl, controller.signal);
    if (!response.ok) {
      if (response.status === 403) throw new Error('Canvas blocked this server request (403). The feed may still be valid—download the .ics file and use the import option below.');
      throw new Error(`Canvas returned ${response.status}. Check that the feed link is current.`);
    }
    validateFeedUrl(response.url);
    const contentLength = Number(response.headers.get('content-length') || 0);
    if (contentLength > MAX_FEED_BYTES) throw new Error('This calendar feed is too large to import.');
    const ics = await response.text();
    if (ics.length > MAX_FEED_BYTES) throw new Error('This calendar feed is too large to import.');
    return Response.json(parseFeed(ics));
  } catch (error) {
    const message = error instanceof Error && error.name === 'AbortError' ? 'Canvas took too long to respond.' : error instanceof Error ? error.message : 'Calendar sync failed.';
    return Response.json({ error: message }, { status: 400 });
  } finally {
    clearTimeout(timeout);
  }
}
