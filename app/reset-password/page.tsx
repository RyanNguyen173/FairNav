/**
 * Real route only so Supabase's password-reset email links land somewhere
 * that resolves - the actual UI is `AuthGate` in providers.tsx intercepting
 * on `passwordRecoveryPending`, which fires as soon as the SDK detects the
 * recovery tokens in the URL, regardless of which page they land on.
 */
export default function ResetPasswordPage() {
  return null
}
