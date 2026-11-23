# Public demo (Vercel)

The public demo is the real CourseCue interface built in **demo mode**. It is a
statically exported site with no server code, so it cannot relay documents or keys
anywhere.

## What demo mode changes

Demo mode is enabled only when `NEXT_PUBLIC_COURSECUE_DEMO=true` at build time.
Normal `npm run dev` / `npm run build` (vinext, Cloudflare Workers) are unchanged.

| Area | Demo behavior |
| --- | --- |
| First load | The bundled sample syllabus is analyzed in the browser and opened |
| Analysis | Runs `lib/local-analyzer.ts` in the browser; `/api/analyze` is never called |
| File types | TXT, Markdown, and pasted text. PDF/DOCX show a "run it locally" message |
| Settings | API-key entry is replaced with an explanation; stored keys are ignored |
| Canvas feed | Live feed sync is replaced with a "run it locally" note; `.ics` file import still works |
| API routes | Not included in the build (`pageExtensions: ['tsx']` skips `route.ts`); the handlers also return 403 if a demo-flagged server build is ever deployed |
| Banner | Slim "LIVE DEMO" bar with GitHub, local quick-start, and **Reset demo** |
| Storage | Browser `localStorage` / IndexedDB only, as in the normal app |

## Vercel project settings

`vercel.json` already sets these, so importing the repository is enough:

| Setting | Value |
| --- | --- |
| Framework preset | Other (`"framework": null`) |
| Install command | `npm ci` |
| Build command | `npm run build:demo` |
| Output directory | `out` |
| Node.js version | 22.x or newer (`engines` requires `>=22.13.0`) |
| Environment variables | None required. `build:demo` sets `NEXT_PUBLIC_COURSECUE_DEMO=true` itself |

Do **not** add any AI-provider API keys to the Vercel project. The demo has no use for them.

`vercel.json` also sends a Content-Security-Policy with `connect-src 'self'`, so
the browser itself blocks any request to an AI provider or calendar host, plus
`frame-ancestors 'none'`, `Referrer-Policy: no-referrer`, and `nosniff`.

> `vercel.json` applies to every Vercel deployment of this repository. That is fine
> while Vercel hosts only the demo. If you ever deploy the full app to Vercel,
> use a separate project or remove `vercel.json`.

## Local commands

```bash
npm run dev:demo     # next dev with the demo flag
npm run build:demo   # export the demo site to ./out
npx serve out        # optional: preview the export
```

Both demo scripts run through `scripts/demo-next.mjs`. It sets the flag and
restores `next-env.d.ts` afterwards, because plain `next` rewrites that file without
the vinext type import.
