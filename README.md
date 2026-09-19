# FairNav

A mobile-first career fair copilot. Upload your resume, tell it what you're
looking for, and FairNav ranks attending companies against your profile,
writes you a personalized pitch for each one, and guides you booth-to-booth
during the event with a live route map.

Built for SASEhack 2026 — Social Impact and Design tracks.

## Status: demo mode

The matching, resume parsing, and pitch generation you see right now are
**simulated client-side** (see `src/wizard/mockEngine.ts`) — there is no
backend and no LLM call yet. This was a deliberate scope call for the
hackathon build: get all six screens fully wired and demoable first, wire in
a real backend after.

Two follow-ups are intentionally deferred and still open:

1. **Real AI backend.** Swap `mockEngine.ts` for actual resume text
   extraction (PDF/DOCX) and a real LLM call (e.g. the Claude API) for
   company matching and pitch generation. Every mock function already has
   the signature a real implementation would need.
2. **Six separate routes.** The app currently runs as a single-page wizard
   (one URL, step state held in memory). Splitting it into six deep-linkable
   routes (`/upload`, `/profile`, `/matches`, ...) with persisted step state
   is the next structural change.

## Stack

- Vite + React + TypeScript
- Tailwind CSS v4 (`@tailwindcss/vite`), design tokens in `src/index.css`
- Phosphor icons (`@phosphor-icons/react`)
- No backend, no external API calls — everything currently runs client-side

## Running locally

```bash
npm install
npm run dev
```

## Project structure

```
src/
  theme/         Light/dark theme context (persists to localStorage)
  wizard/        Wizard state (reducer), types, and the mock "AI" engine
  components/    Shared UI: Button, Chip, UploadDropzone, Header, RouteMap...
  steps/         The six screens (Step1ResumeUpload ... Step6FairModeHUD)
```

## Design system

Generated with the `ui-ux-pro-max` skill for a career-fair productivity
product: teal primary / orange accent, Plus Jakarta Sans, flat design with
light and dark token sets tuned to keep 4.5:1 text contrast in both modes.
