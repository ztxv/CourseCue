// Runs plain `next <command>` with the public-demo flag set, then restores
// next-env.d.ts, which Next rewrites (dropping the vinext type import that the
// normal build relies on).
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const envFile = new URL('../next-env.d.ts', import.meta.url);
const original = existsSync(envFile) ? readFileSync(envFile, 'utf8') : null;
const restore = () => { if (original !== null) writeFileSync(envFile, original); };
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => { restore(); process.exit(130); });

const nextBin = createRequire(import.meta.url).resolve('next/dist/bin/next');
const result = spawnSync(process.execPath, [nextBin, ...process.argv.slice(2)], {
  stdio: 'inherit',
  env: { ...process.env, NEXT_PUBLIC_COURSECUE_DEMO: 'true' },
});
restore();
process.exit(result.status ?? 1);
