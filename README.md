# FairNav

A mobile-first career fair copilot. Upload your resume, tell it what you're
looking for, and FairNav ranks attending companies against your profile,
writes you a personalized pitch for each one, and guides you booth-to-booth
during the event with a live route map.

Built for SASEhack 2026 — Social Impact and Design tracks.

## Status: real AI backend, with a demo fallback

Resume parsing, company matching, and pitch generation call the **Gemini
API** through a serverless function (`api/gemini.ts`) that holds the API key
server-side. If that call fails for any reason — no key configured, offline,
running under plain `vite dev`, rate limited — the app falls back to the
original simulated data in `src/wizard/mockEngine.ts` so the wizard stays
usable either way (a console warning notes when this happens).

One follow-up is intentionally deferred and still open:

- **Six separate routes.** The app currently runs as a single-page wizard
  (one URL, step state held in memory). Splitting it into six deep-linkable
  routes (`/upload`, `/profile`, `/matches`, ...) with persisted step state
  is the next structural change.

## Stack

- Vite + React + TypeScript
- Tailwind CSS v4 (`@tailwindcss/vite`), design tokens in `src/index.css`
- Phosphor icons (`@phosphor-icons/react`)
- Gemini API (`@google/genai`) behind a Vercel serverless function

## Running locally

```bash
npm install
npm run dev
```

This runs the wizard in demo mode (the plain Vite dev server doesn't serve
`/api/*` routes) — good enough for UI work, but AI calls will fall back to
mock data.

## Using the real AI backend

1. Get a free key from [Google AI Studio](https://aistudio.google.com/apikey).
2. Copy `.env.example` to `.env` and paste your key into `GEMINI_API_KEY`.
3. Install the Vercel CLI once (`npm i -g vercel`), then run `vercel dev`
   instead of `npm run dev` — this serves `api/gemini.ts` locally alongside
   the Vite app and picks up `.env` automatically.
4. To deploy: import the repo at [vercel.com](https://vercel.com) (zero-config
   for Vite), then set `GEMINI_API_KEY` as an environment variable in the
   project's settings. Netlify works too, with the function moved to
   `netlify/functions/`.

Note: resume files are base64-encoded and sent in the function's request
body, which has a practical size ceiling well under the 10MB the UI mentions
(Vercel functions cap request bodies around 4.5MB) — large resumes may need
a signed-upload flow later.

## Project structure

```
api/
  gemini.ts      Serverless function - holds GEMINI_API_KEY, calls Gemini
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
