import Link from 'next/link'

/**
 * Landing point for Supabase's email confirmation link (see emailRedirectTo
 * in AuthContext.tsx's signUp). Deliberately public - see providers.tsx's
 * AuthGate, which renders this route without requiring sign-in/unlock,
 * since a freshly-confirmed visitor has a Supabase session but no
 * encryption key yet (that's what the "Go back to sign-in" link leads into
 * next: AuthScreen's UnlockPrompt).
 */
export function AccountCreated() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-2xl bg-card p-10 text-center shadow-hairline">
        <img src="/logo-cat.png" alt="" className="mx-auto mb-5 h-10 w-10 object-contain" />
        <p className="mb-7 font-mono text-[13px] font-medium tracking-[-0.02em] text-muted-foreground">FairNav</p>

        <h1 className="mb-2 text-[22px] font-medium leading-[1.35] tracking-[-0.03em] text-foreground">
          Your account has been created
        </h1>
        <p className="mb-6 font-mono text-[11px] tracking-[0.02em] text-accent-ink">STATUS &middot; READY</p>

        <Link
          href="/"
          className="text-sm font-medium tracking-[-0.02em] text-accent-ink underline decoration-border underline-offset-[3px] transition-opacity duration-150 active:opacity-70"
        >
          Go back to sign-in
        </Link>
      </div>
    </div>
  )
}
