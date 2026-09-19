# FairNav

A mobile-first career fair copilot. Upload your resume, tell it what you're
looking for, and FairNav ranks attending companies against your profile,
writes you a personalized pitch for each one, and guides you booth-to-booth
during the event with a live route map.

Built for SASEhack 2026 — Social Impact and Design tracks.

## Status: real AI backend + zero-knowledge auth, with a demo fallback

Accounts, encryption, and persistence (Supabase Auth + Postgres, AES-256-GCM
client-side encryption) are live — see "Authentication & encryption" below.
If `NEXT_PUBLIC_SUPABASE_URL`/`NEXT_PUBLIC_SUPABASE_ANON_KEY` aren't set, the
app skips auth entirely and runs the wizard directly (no bricked app during
local UI work), same fallback philosophy as the AI calls below.

Every AI step is its own Gemini-backed Next.js Route Handler, each holding
`GEMINI_API_KEY` server-side:

- `app/api/parse-resume` — resume → contact info, major, grad year, skills, interests, work experience, and education
- `app/api/parse-directory` — exhibitor directory (file or pasted text) → company + booth number pairs
- `app/api/rank-companies` — parsed booths + profile → ranked companies with match scores
- `app/api/generate-pitches` — selected companies + profile → elevator pitch + questions per company

If any call fails for any reason — no key configured, offline, rate limited
— the app falls back to the original simulated data in `src/wizard/mockEngine.ts`
so the wizard stays usable either way (a console warning notes when this happens).

Pitch generation for all selected companies happens in a single request
rather than one per company — fewer concurrent calls against the same API
key/rate limit, which is both faster and less prone to transient "model
overloaded" errors. Transient 503/429 responses from Gemini are retried
once with backoff before giving up. Every call also sets `thinkingLevel:
MINIMAL` (Gemini 3.x's low-latency setting) since these are structured
extraction/classification tasks, not multi-step reasoning.

Two follow-ups are intentionally deferred and still open:

- **Booth map image isn't analyzed.** Step 3's "Booth map" upload (the
  fair's physical layout image/PDF) is stored by name only and never read —
  the route map's booth positions are a synthetic grid (`boothCoordinatesForIndex`
  in `mockEngine.ts`), not the real layout. Feeding that image to Gemini's
  vision input to place booths at real positions is a natural next step, but
  adds another AI call (and more latency) per fair setup, so it's left as a
  deliberate choice rather than bundled in silently.
- **No route guards.** Each wizard step is now a real URL (see "Stack"
  below), but nothing stops visiting e.g. `/matches` directly before
  finishing `/fair` - it'll just render with empty data. Not a problem for
  the intended flow (each step's own footer button is the only way forward),
  but worth knowing if you're testing by typing URLs directly.

## Stack

- **Next.js (App Router) + React + TypeScript**, fully client-rendered
  (every page is a `'use client'` component - this app is an authenticated
  tool with per-user encrypted state, not content that benefits from SSR).
- Six wizard steps as real routes (`/upload`, `/profile`, `/fair`, `/matches`,
  `/briefs`, `/fair-mode`) instead of in-memory step switching - `/` redirects
  to wherever `WizardContext` says you left off.
- Tailwind CSS v4 (`@tailwindcss/postcss`), design tokens in `app/globals.css`.
- Phosphor icons (`@phosphor-icons/react`).
- Gemini API (`@google/genai`), 4 Route Handlers under `app/api/*/route.ts`
  sharing helpers from `src/lib/gemini.ts`.
- Supabase (`@supabase/supabase-js`) for email/password auth and Postgres
  storage of encrypted profile data.
- Web Crypto API (PBKDF2 + AES-256-GCM) for client-side encryption —
  `src/lib/crypto.ts`, no dependency.

## Running locally

```bash
npm install
npm run dev
```

Without `GEMINI_API_KEY`/Supabase env vars set, AI calls fall back to mock
data and auth is skipped entirely — good enough for UI work with zero setup.

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

**Why there's still an "unlock" prompt on a returning visit:** with
"Remember me" checked, Supabase restores the session automatically on a
page reload — but the encryption key is never persisted (by design), so
`AuthScreen.tsx`'s `UnlockPrompt` asks for the password again to re-derive
it before any encrypted data can be read. This is what keeps the
zero-knowledge property real rather than nominal: a persisted session alone
is never enough to decrypt anything. `AuthContext.tsx` tracks an
`authenticating` flag so this prompt doesn't flash on-screen during the
brief window between Supabase establishing the session and the key
finishing derivation right after you submit the sign-in form.

Password-only auth (no magic link) was a deliberate simplification — the
original spec's magic-link option couldn't supply a password to derive a
key from anyway, so it would have needed this same unlock step immediately
after signing in, which added a confusing extra screen for little benefit.

### Setup

1. Create a free project at [supabase.com](https://supabase.com).
2. In the SQL Editor, run `supabase/schema.sql` once (creates the
   `profiles` table with Row Level Security — the anon key can only ever
   read/write the signed-in user's own row).
3. From Settings → API, copy the Project URL and anon public key into
   `.env.local` as `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   (see `.env.example`). These are meant to ship in the client bundle — the
   anon key's access is enforced by the database's RLS policies, not by
   secrecy.
4. For deployment, set the same two variables in Vercel's project settings.

## Using the real AI backend

1. Get a key from [Google AI Studio](https://aistudio.google.com/apikey).
2. Copy `.env.example` to `.env.local` and paste it into `GEMINI_API_KEY`.
3. Run `npm run dev` — Next.js serves the 4 `app/api/*/route.ts` handlers
   alongside the app automatically and picks up `.env.local` on its own, no
   extra CLI or config needed.
4. To deploy: import the repo at [vercel.com](https://vercel.com) (zero-config
   for Next.js), then set `GEMINI_API_KEY` as an environment variable in the
   project's settings.

Note: resume and directory files are base64-encoded and sent in the
route handler's request body, which has a practical size ceiling well under
the 10MB the UI mentions (Vercel functions cap request bodies around 4.5MB)
— large files may need a signed-upload flow later.

Each route handler exports `export const maxDuration = 60` (Vercel's
default is much shorter, and calls that include a document, like a resume
or exhibitor PDF, can take longer than that). If you're on a plan with a
lower cap, Vercel will tell you at deploy time — lower the number in each
`app/api/*/route.ts` file to match.

## Project structure

```
app/
  layout.tsx             Root layout - metadata, theme-flash-prevention script
  providers.tsx           ThemeProvider + AuthProvider + auth gate, wraps every route
  globals.css              Tailwind import + design tokens
  page.tsx                 / - redirects to wherever the wizard was left off
  upload/, profile/, fair/, matches/, briefs/, fair-mode/
                            One route per wizard step, each a thin page
                            rendering the matching component from src/steps/
  api/
    parse-resume/route.ts        Resume -> contact info, major, gradYear, skills, interests, experience, education
    parse-directory/route.ts     Exhibitor directory -> company + booth number pairs
    rank-companies/route.ts      Parsed booths + profile -> ranked companies
    generate-pitches/route.ts    Selected companies + profile -> pitch + questions per company
supabase/
  schema.sql     Run once in the Supabase SQL Editor - profiles table + RLS
src/
  auth/          AuthContext (Supabase session + encryption key lifecycle),
                 AuthScreen (sign in/up, password-unlock prompt)
  lib/           supabaseClient.ts, crypto.ts (PBKDF2 + AES-256-GCM, no deps),
                 gemini.ts (shared Gemini client/retry logic for the API routes)
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
blue highlights. Tokens live in `app/globals.css`, tuned to keep 4.5:1 text
contrast in both modes (note: buttons use dark text on the bright blue
background in both themes, since white text on a mid-tone blue like
#3B82F6 fails that contrast floor).
