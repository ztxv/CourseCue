// Used by plain `next build` / `next dev` (the demo scripts). The normal vinext
// build passes PostCSS plugins through vite.config.ts, and Vite then skips
// this file.
const config = {
  plugins: { '@tailwindcss/postcss': {} },
};

export default config;
