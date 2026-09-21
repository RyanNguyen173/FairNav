# FairNav

**Your personal guide for career fairs.** Upload your resume, tell FairNav
what kind of job you want, and it does the homework so you don't have to:
it figures out which companies at the fair are actually worth your time,
explains *why* each one fits you, and then walks you booth-to-booth on the
day of the event so you always know who's next.

**[Try it live at fairnav.xyz →](https://www.fairnav.xyz/)**

Built for SASEhack 2026 — Social Impact and Design tracks.

## What FairNav does

Career fairs are overwhelming — dozens of tables, no idea which ones matter
to you, and no time to research all of them beforehand. FairNav turns that
into a simple, guided process:

1. **Upload your resume once.** FairNav reads it and pulls out your skills,
   interests, and experience automatically — no forms to fill out by hand.
2. **Add a fair and its company list.** Upload or paste the list of
   companies attending (most fairs publish this ahead of time).
3. **Get a ranked list, made for you.** FairNav compares every company
   against your background and ranks them by how good a fit they are — with
   a plain-English explanation of *why*, not just a score.
4. **Pick who you actually want to visit**, and generate a short, personal
   "why this fits you" summary for each one — something to glance at right
   before you walk up to the table.
5. **On the day of the fair, use Live Fair Mode.** It shows you exactly
   which company to visit next, tracks who you've already talked to, and
   lets you jot quick notes as you go — like a checklist for the whole
   event.

Everything you upload is encrypted on your own device before it's ever sent
anywhere — see [How your data is protected](#how-your-data-is-protected)
below for the plain-English version, or
[Authentication & encryption](#authentication--encryption-technical) for
the technical details.

---

## For developers

Everything below this line is technical documentation for people building
or running the project — not required reading if you're just curious what
FairNav does.

### Status: real AI backend + zero-knowledge auth

Accounts, encryption, and persistence (Supabase Auth + Postgres, AES-256-GCM
client-side encryption) are live — see "Authentication & encryption" below.
If `NEXT_PUBLIC_SUPABASE_URL`/`NEXT_PUBLIC_SUPABASE_ANON_KEY` aren't set, the
app skips auth entirely and runs the wizard directly (a local-dev
convenience, unrelated to the AI backend below).

Every AI step is its own Gemini-backed Next.js Route Handler, each holding
`GEMINI_API_KEY` server-side:

- `app/api/parse-resume` — resume → contact info, major, grad year, skills, interests, work experience, and education
- `app/api/parse-directory` — exhibitor directory (file or pasted text) → company + booth number pairs
- `app/api/rank-companies` — parsed booths + profile → ranked companies with match scores
- `app/api/generate-pitches` — selected companies + profile → elevator pitch, questions, and company research per company

`GEMINI_API_KEY` is required in every real deployment - there is no demo/mock
fallback. If a call fails (offline, rate limited, misconfigured key), the
error is classified server-side (rate-limited vs. overloaded vs. malformed
response vs. misconfigured, see `src/lib/gemini.ts`) and surfaces to the
user with a specific message rather than being papered over with invented
data, and the UI won't let you proceed past a step (e.g. into Matches)
without real exhibitor data for the AI to work from in the first place.

Pitch generation for all selected companies happens in a single request
rather than one per company — fewer concurrent calls against the same API
key/rate limit, which is both faster and less prone to transient "model
overloaded" errors. Transient 503/429 responses from Gemini are retried
once with backoff before giving up. Every call also sets `thinkingLevel:
MINIMAL` (Gemini 3.x's low-latency setting) since these are structured
extraction/classification tasks, not multi-step reasoning.

One follow-up is intentionally deferred and still open:

- **No route guards.** Each per-fair page is a real URL (see "Stack"
  below), but nothing stops visiting e.g. `/matches` directly before
  finishing `/fair` - it'll just render with empty data. Not a problem for
  the intended flow (Home only links to a fair's next real step), but worth
  knowing if you're testing by typing URLs directly.

### Stack

- **Next.js (App Router) + React + TypeScript**, fully client-rendered
  (every page is a `'use client'` component - this app is an authenticated
  tool with per-user encrypted state, not content that benefits from SSR).
- **Home (`/`) is the landing page after sign-in** - an account menu
  (settings + sign out) top-right, and two tabs: **Fair Board** (every fair
  you've created, `src/home/FairBoard.tsx`) and **Fair Day**
  (`src/home/FairDay.tsx`, live Fair Mode for whichever fair is active, or a
  prompt to start one that's ready). Resume upload and profile editing live
  under **Account Settings** (`/account`), account-level rather than
  per-fair since they don't change between fairs. Each fair's own pipeline -
  directory ingestion (`/fair`), company matches (`/matches`), pitch briefs
  (`/briefs`) - is reached from its card on the Fair Board.
- Tailwind CSS v4 (`@tailwindcss/postcss`), design tokens in `app/globals.css`.
- Phosphor icons (`@phosphor-icons/react`).
- Gemini API (`@google/genai`), 4 Route Handlers under `app/api/*/route.ts`
  sharing helpers from `src/lib/gemini.ts`.
- Supabase (`@supabase/supabase-js`) for email/password auth and Postgres
  storage of encrypted profile data.
- Web Crypto API (PBKDF2 + AES-256-GCM) for client-side encryption —
  `src/lib/crypto.ts`, no dependency.

### Running locally

```bash
npm install
npm run dev
```

`GEMINI_API_KEY` is required for the AI steps to work at all — see "Using
the real AI backend" below. Without Supabase env vars set, auth is skipped
entirely, which is enough to poke at the UI without setting up a project.

### How your data is protected

In plain terms: everything you type or upload into FairNav — your resume,
skills, the companies you're matched with, your notes at the fair — is
locked with a key derived from your password, on your own device, *before*
it's sent anywhere to be saved. That means even the database it's stored in
never sees your real information, only scrambled data it can't read. Only
you, by entering your password, can unlock it again.

This is why FairNav sometimes asks for your password again on a new visit
even though you're still signed in — being signed in and being able to
*decrypt your data* are two different things by design, and that gap is
what keeps this promise real.

### Authentication & encryption (technical)

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

#### Setup

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

#### Auth emails (Mailtrap)

Supabase's own email sender is fine for local testing but rate-limited and
not meant for production, so signup confirmation emails are sent through
Mailtrap's SMTP relay instead. This is entirely Supabase-dashboard
configuration — nothing in the app code talks to Mailtrap or knows it
exists; `supabase.auth.signUp()` in `src/auth/AuthContext.tsx` is unchanged
and still triggers Supabase's own confirmation email, just delivered
through a different relay.

1. In Supabase Dashboard → Authentication → Emails → SMTP Settings, enable
   custom SMTP and enter your Mailtrap sending domain's credentials (host,
   port, username, password from Mailtrap's dashboard).
2. In Authentication → Emails → Templates → Confirm signup, paste in
   `supabase/email-templates/confirm-signup.html` — a Vesper-branded
   version of the confirmation email (FairNav logo, matching colors/type)
   in place of Supabase's plain default. It uses Supabase's own
   `{{ .ConfirmationURL }}` template variable, so no other change is
   needed.
3. Confirm `https://fairnav.xyz/account-created` (see "Authentication &
   encryption" below) is in Authentication → URL Configuration → Redirect
   URLs — that's independent of the SMTP relay and doesn't change with
   this switch.

### Using the real AI backend

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

### Project structure

```
app/
  layout.tsx             Root layout - metadata, theme-flash-prevention script
  providers.tsx           ThemeProvider + AuthProvider + auth gate, wraps every route
  globals.css              Tailwind import + design tokens
  page.tsx                 / - Home (Fair Board / Fair Day tabs)
  account/, fair/, matches/, briefs/
                            One route per per-fair pipeline stage (plus
                            account/ for settings), each a thin page
                            rendering the matching component
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
  home/          HomePage (tab switcher), FairBoard (all your fairs),
                 FairDay (live Fair Mode or a prompt to start one)
  account/       AccountSettings - resume upload + profile editor, account-level
  lib/           supabaseClient.ts, crypto.ts (PBKDF2 + AES-256-GCM, no deps),
                 gemini.ts (shared Gemini client/retry logic for the API routes)
  theme/         Light/dark theme context (persists to localStorage)
  wizard/        Wizard state (reducer), types, aiEngine (Gemini calls),
                 optionPools (skills/interests autocomplete data)
  components/    Shared UI: Button, Chip, UploadDropzone, Header, AccountMenu,
                 ResearchList...
  steps/         The per-fair pipeline screens (Step3FairIngestion ...
                 Step6FairModeHUD), each with its own mobile (<768px) and
                 desktop (>=768px) layout
```

### Design system

"Framer minimalist" system: clean typography, generous whitespace, subtle
1px card borders, blue accent highlights (#0066FF light / #3B82F6 dark),
Plus Jakarta Sans. Light surfaces are a soft off-white with blue tinting
(#F8FAFC); dark surfaces are deep slate blue-gray (#0B0F17) with electric
blue highlights. Tokens live in `app/globals.css`, tuned to keep 4.5:1 text
contrast in both modes (note: buttons use dark text on the bright blue
background in both themes, since white text on a mid-tone blue like
#3B82F6 fails that contrast floor).
