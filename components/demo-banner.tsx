'use client';

import { DEMO_QUICKSTART_URL, DEMO_REPO_URL } from '@/lib/demo';

// Demo-only styles live here (not in globals.css) so they ship only when this
// component is rendered, i.e. only in the demo build.
const demoStyles = `
.demo-banner { position: relative; z-index: 30; display: flex; align-items: center; justify-content: center; gap: 14px; min-height: 38px; padding: 6px 16px; background: var(--forest); color: var(--forest-text); font-size: 12px; line-height: 1.35; border-bottom: 1px solid color-mix(in srgb, var(--accent) 22%, transparent); }
.demo-banner-chip { flex: 0 0 auto; display: inline-flex; align-items: center; gap: 6px; padding: 4px 8px; border-radius: 999px; background: var(--accent); color: #15392e; font-size: 10px; font-weight: 800; letter-spacing: .08em; }
.demo-banner-chip::before { content: ''; width: 6px; height: 6px; border-radius: 50%; background: #15392e; animation: demo-pulse 2s cubic-bezier(.4, 0, .2, 1) infinite; }
.demo-banner-copy { margin: 0; color: color-mix(in srgb, var(--forest-text) 78%, transparent); }
.demo-banner-copy strong { color: var(--forest-text); font-weight: 700; }
.demo-banner-links { display: flex; align-items: center; gap: 6px; flex: 0 0 auto; }
.demo-banner a, .demo-banner button { display: inline-flex; align-items: center; gap: 4px; min-height: 26px; padding: 0 9px; border: 1px solid rgba(255,255,255,.16); border-radius: 7px; background: rgba(255,255,255,.06); color: var(--forest-text); font-size: 11px; font-weight: 700; text-decoration: none; cursor: pointer; white-space: nowrap; }
.demo-banner a:hover, .demo-banner button:hover { border-color: rgba(255,255,255,.3); background: rgba(255,255,255,.12); }
.demo-banner a:focus-visible, .demo-banner button:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
.demo-settings-note { margin-top: 4px; padding: 14px; border: 1px dashed var(--line-strong); border-radius: 10px; background: var(--surface-soft); color: var(--muted); font-size: 12px; line-height: 1.55; }
.demo-settings-note strong { display: block; margin-bottom: 4px; color: var(--ink); font-size: 13px; }
.demo-settings-note a { color: var(--ink); font-weight: 700; }
@keyframes demo-pulse { 50% { opacity: .35; } }
@media (prefers-reduced-motion: reduce) { .demo-banner-chip::before { animation: none; } }
@media (max-width: 900px) { .demo-banner-copy { display: none; } .demo-banner { justify-content: space-between; } }
@media (max-width: 420px) { .demo-banner { gap: 8px; padding: 6px 10px; } .demo-banner a, .demo-banner button { padding: 0 7px; } .demo-banner-local { display: none !important; } }
`;

export function DemoBanner({ onReset }: { onReset: () => void }) {
  return (
    <>
      <style>{demoStyles}</style>
      <div className="demo-banner" role="region" aria-label="Live demo notice">
        <span className="demo-banner-chip">LIVE DEMO</span>
        <p className="demo-banner-copy"><strong>Runs entirely in your browser.</strong> Analysis uses the local analyzer; nothing you add is uploaded or stored on a server.</p>
        <div className="demo-banner-links">
          <a href={DEMO_REPO_URL} target="_blank" rel="noreferrer">GitHub <span aria-hidden="true">↗</span></a>
          <a className="demo-banner-local" href={DEMO_QUICKSTART_URL} target="_blank" rel="noreferrer">Run it locally <span aria-hidden="true">↗</span></a>
          <button type="button" onClick={onReset}><span aria-hidden="true">↺</span> Reset demo</button>
        </div>
      </div>
    </>
  );
}
