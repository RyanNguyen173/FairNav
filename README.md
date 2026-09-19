# FairNav

A mobile-first career fair copilot. Upload your resume, tell it what you're
looking for, and FairNav ranks attending companies against your profile,
writes you a personalized pitch for each one, and guides you booth-to-booth
during the event with a live route map.

Built for SASEhack 2026 — Social Impact and Design tracks.

## Status: real AI backend, with a demo fallback

Resume parsing calls **apilayer's Resume Parser API** through
`api/resume-parser.ts`. Company matching and pitch generation call the
**Gemini API** through `api/gemini.ts`. Both serverless functions hold their
API key server-side. If either call fails for any reason — no key
configured, offline, running under plain `vite dev`, rate limited — the app
falls back to the original simulated data in `src/wizard/mockEngine.ts` so
the wizard stays usable either way (a console warning notes when this
happens).

Pitch generation for all selected companies happens in a single Gemini
request rather than one request per company — fewer concurrent calls
against the same API key/rate limit, which is both faster and less prone to
transient "model overloaded" errors. Transient 503/429 responses from
Gemini are retried once with backoff before giving up.

Two follow-ups are intentionally deferred and still open:

- **Six separate routes.** The app currently runs as a single-page wizard
  (one URL, step state held in memory). Splitting it into six deep-linkable
  routes (`/upload`, `/profile`, `/matches`, ...) with persisted step state
  is the next structural change.
- **Booth map image isn't analyzed.** Step 3's "Booth map" upload (the
  fair's physical layout image/PDF) is stored by name only and never read —
  the route map's booth positions are a synthetic grid (`boothCoordinatesForIndex`
  in `mockEngine.ts`), not the real layout. Feeding that image to Gemini's
  vision input to place booths at real positions is a natural next step, but
  adds another AI call (and more latency) per fair setup, so it's left as a
  deliberate choice rather than bundled in silently.

## Stack

- Vite + React + TypeScript
- Tailwind CSS v4 (`@tailwindcss/vite`), design tokens in `src/index.css`
- Phosphor icons (`@phosphor-icons/react`)
- Gemini API (`@google/genai`) and apilayer's Resume Parser API, each
  behind its own Vercel serverless function

## Running locally

```bash
npm install
npm run dev
```

This runs the wizard in demo mode (the plain Vite dev server doesn't serve
`/api/*` routes) — good enough for UI work, but AI calls will fall back to
mock data.

## Using the real AI backend

1. Get a Gemini key from [Google AI Studio](https://aistudio.google.com/apikey)
   and a Resume Parser key from [apilayer](https://apilayer.com/marketplace/resume_parser-api).
2. Copy `.env.example` to `.env` and paste both keys in
   (`GEMINI_API_KEY` and `RESUME_PARSER_API_KEY`).
3. Install the Vercel CLI once (`npm i -g vercel`), then run `vercel dev`
   instead of `npm run dev` — this serves both `api/gemini.ts` and
   `api/resume-parser.ts` locally alongside the Vite app and picks up `.env`
   automatically.
4. To deploy: import the repo at [vercel.com](https://vercel.com) (zero-config
   for Vite), then set both `GEMINI_API_KEY` and `RESUME_PARSER_API_KEY` as
   environment variables in the project's settings. Netlify works too, with
   the functions moved to `netlify/functions/`.

Note: resume files are base64-encoded and sent in the function's request
body, which has a practical size ceiling well under the 10MB the UI mentions
(Vercel functions cap request bodies around 4.5MB) — large resumes may need
a signed-upload flow later.

`vercel.json` sets `api/gemini.ts`'s `maxDuration` to 60s (Vercel's default
is much shorter and calls that include a document, like the exhibitor PDF,
can take longer than that). If you're on a plan with a lower cap, Vercel
will tell you at deploy time — lower the number in `vercel.json` to match.

apilayer's own docs don't show a confirmed field name for phone numbers in
`api/resume-parser.ts`'s response mapping — it tries a couple of likely
keys (`phone`, `phone_number`, `mobile`) and falls back to an empty string.
If your real responses use a different key, adjust `PHONE_KEYS` in that
file.

## Project structure

```
api/
  gemini.ts         Serverless function - holds GEMINI_API_KEY, calls Gemini
  resume-parser.ts  Serverless function - holds RESUME_PARSER_API_KEY, calls apilayer
src/
  theme/         Light/dark theme context (persists to localStorage)
  wizard/        Wizard state (reducer), types, aiEngine (real calls) and
                 mockEngine (demo fallback data)
  components/    Shared UI: Button, Chip, UploadDropzone, Header, RouteMap...
  steps/         The six screens (Step1ResumeUpload ... Step6FairModeHUD)
```

## Design system

Generated with the `ui-ux-pro-max` skill for a career-fair productivity
product: teal primary / orange accent, Plus Jakarta Sans, flat design with
light and dark token sets tuned to keep 4.5:1 text contrast in both modes.
