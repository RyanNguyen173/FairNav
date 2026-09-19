# FairNav

A mobile-first career fair copilot. Upload your resume, tell it what you're
looking for, and FairNav ranks attending companies against your profile,
writes you a personalized pitch for each one, and guides you booth-to-booth
during the event with a live route map.

Built for SASEhack 2026 — Social Impact and Design tracks.

## Status: real AI backend + zero-knowledge auth, with a demo fallback

Accounts, encryption, and persistence (Supabase Auth + Postgres, AES-256-GCM
client-side encryption) are live — see "Authentication & encryption" below.
If `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY` aren't set, the app skips
auth entirely and runs the wizard directly (no bricked app during local UI
work), same fallback philosophy as the AI calls below.

Every AI step is its own Gemini-backed serverless function, each holding
`GEMINI_API_KEY` server-side:

- `api/parse-resume.ts` — resume → contact info, major, grad year, skills, interests
- `api/parse-directory.ts` — exhibitor directory (file or pasted text) → company + booth number pairs
- `api/rank-companies.ts` — parsed booths + profile → ranked companies with match scores
- `api/generate-pitches.ts` — selected companies + profile → elevator pitch + questions per company

If any call fails for any reason — no key configured, offline, running
under plain `vite dev`, rate limited — the app falls back to the original
simulated data in `src/wizard/mockEngine.ts` so the wizard stays usable
either way (a console warning notes when this happens).

Pitch generation for all selected companies happens in a single request
rather than one per company — fewer concurrent calls against the same API
key/rate limit, which is both faster and less prone to transient "model
overloaded" errors. Transient 503/429 responses from Gemini are retried
once with backoff before giving up.

Three follow-ups are intentionally deferred and still open:

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
- **Model name unverified.** `MODEL` in `api/_lib/gemini.ts` is set to
  `gemini-3.5-flash-lite` as requested. If it 404s as an unrecognized model,
  swap it for a confirmed current model there (one edit point for all four
  functions).

## Stack

- Vite + React + TypeScript
- Tailwind CSS v4 (`@tailwindcss/vite`), design tokens in `src/index.css`
- Phosphor icons (`@phosphor-icons/react`)
- Gemini API (`@google/genai`), 4 separate Vercel serverless functions
  sharing helpers from `api/_lib/gemini.ts`
- Supabase (`@supabase/supabase-js`) for email/password + magic-link auth
  and Postgres storage of encrypted profile data
- Web Crypto API (PBKDF2 + AES-256-GCM) for client-side encryption —
  `src/lib/crypto.ts`, no dependency

## Running locally

```bash
npm install
npm run dev
```

This runs the wizard in demo mode (the plain Vite dev server doesn't serve
`/api/*` routes, and without Supabase env vars auth is skipped entirely) —
good enough for UI work, but AI calls fall back to mock data.

## Authentication & encryption

Every user's profile, skills, extracted resume data, company matches,
pitches, and fair-mode notes are encrypted **on their device** before ever
touching the database — the server and database only ever see an opaque
ciphertext blob (see `src/lib/crypto.ts` and `supabase/schema.sql`).

**How it works:** signing up or in derives an AES-256-GCM key from the
user's password via PBKDF2 (600,000 iterations, per OWASP's current
guidance) and a random per-user salt. That key lives only in React state —
never written to `localStorage`/`sessionStorage`/anywhere — so closing the
tab forgets it and a fresh sign-in re-derives it identically. `WizardProvider`
auto-saves the encrypted wizard state to Supabase on a 1.5s debounce.

**A real constraint worth knowing:** the spec's magic-link (passwordless)
option can't supply a password to derive a key from. Per the resolved
design, magic link only re-establishes the *session* — the app then shows
an "enter your password to unlock" prompt (`src/auth/AuthScreen.tsx`'s
`UnlockPrompt`) before any encrypted data can be read. This keeps the
zero-knowledge property intact for every account, at the cost of magic
link not being a full passwordless experience.

### Setup

1. Create a free project at [supabase.com](https://supabase.com).
2. In the SQL Editor, run `supabase/schema.sql` once (creates the
   `profiles` table with Row Level Security — the anon key can only ever
   read/write the signed-in user's own row).
3. From Settings → API, copy the Project URL and anon public key into
   `.env` as `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` (see
   `.env.example`). These are meant to ship in the client bundle — the
   anon key's access is enforced by the database's RLS policies, not by
   secrecy.
4. For deployment, set the same two variables in Vercel's project settings.

## Using the real AI backend

1. Get a key from [Google AI Studio](https://aistudio.google.com/apikey).
2. Copy `.env.example` to `.env` and paste it into `GEMINI_API_KEY`.
3. Install the Vercel CLI once (`npm i -g vercel`), then run `vercel dev`
   instead of `npm run dev` — this serves all 4 `api/*.ts` functions locally
   alongside the Vite app and picks up `.env` automatically.
4. To deploy: import the repo at [vercel.com](https://vercel.com) (zero-config
   for Vite), then set `GEMINI_API_KEY` as an environment variable in the
   project's settings. Netlify works too, with the functions moved to
   `netlify/functions/`.

Note: resume and directory files are base64-encoded and sent in the
function's request body, which has a practical size ceiling well under the
10MB the UI mentions (Vercel functions cap request bodies around 4.5MB) —
large files may need a signed-upload flow later.

`vercel.json` sets each function's `maxDuration` to 60s (Vercel's default is
much shorter and calls that include a document, like a resume or exhibitor
PDF, can take longer than that). If you're on a plan with a lower cap,
Vercel will tell you at deploy time — lower the numbers in `vercel.json` to
match.

## Project structure

```
api/
  _lib/gemini.ts        Shared client init, retry logic, error handling (not a route)
  parse-resume.ts        Resume -> contact info, major, gradYear, skills, interests
  parse-directory.ts     Exhibitor directory -> company + booth number pairs
  rank-companies.ts      Parsed booths + profile -> ranked companies
  generate-pitches.ts    Selected companies + profile -> pitch + questions per company
supabase/
  schema.sql     Run once in the Supabase SQL Editor - profiles table + RLS
src/
  auth/          AuthContext (Supabase session + encryption key lifecycle),
                 AuthScreen (Page 0: sign in/up, magic link, unlock prompt)
  lib/           supabaseClient.ts, crypto.ts (PBKDF2 + AES-256-GCM, no deps)
  theme/         Light/dark theme context (persists to localStorage)
  wizard/        Wizard state (reducer), types, aiEngine (real calls) and
                 mockEngine (demo fallback data)
  components/    Shared UI: Button, Chip, UploadDropzone, Header, RouteMap...
  steps/         The six screens (Step1ResumeUpload ... Step6FairModeHUD),
                 each with its own mobile (<768px) and desktop (>=768px) layout
```

## Design system

"Framer minimalist" system: clean typography, generous whitespace, subtle
1px card borders, blue accent highlights (#0066FF light / #3B82F6 dark),
Plus Jakarta Sans. Light surfaces are a soft off-white with blue tinting
(#F8FAFC); dark surfaces are deep slate blue-gray (#0B0F17) with electric
blue highlights. Tokens live in `src/index.css`, tuned to keep 4.5:1 text
contrast in both modes (note: buttons use dark text on the bright blue
background in both themes, since white text on a mid-tone blue like
#3B82F6 fails that contrast floor).
