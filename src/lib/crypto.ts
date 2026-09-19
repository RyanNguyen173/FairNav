/**
 * Zero-knowledge client-side encryption via the Web Crypto API. Everything
 * here runs in the browser - the derived key never leaves memory, and
 * nothing in this file ever talks to a server.
 *
 * Key derivation: PBKDF2-SHA256 from the user's password + a random
 * per-user salt (stored alongside the ciphertext - the salt isn't secret,
 * it's just required to re-derive the same key later; see supabase/schema.sql).
 * 600,000 iterations follows OWASP's current Password Storage guidance for
 * PBKDF2-HMAC-SHA256.
 *
 * Encryption: AES-256-GCM, a fresh random IV per encryption call (IVs are
 * not secret either - reusing one WOULD be a real vulnerability, generating
 * a new one every time is what actually matters here).
 */

const PBKDF2_ITERATIONS = 600_000

function bufferToBase64(buffer: Uint8Array<ArrayBuffer>): string {
  let binary = ''
  for (const byte of buffer) binary += String.fromCharCode(byte)
  return btoa(binary)
}

// Explicit `Uint8Array<ArrayBuffer>` return type (rather than bare
// `Uint8Array`, whose default type parameter is the wider `ArrayBufferLike`)
// so this satisfies Web Crypto's `BufferSource` parameter type directly,
// without casts at every call site.
function base64ToBuffer(base64: string): Uint8Array<ArrayBuffer> {
  const binary = atob(base64)
  const buffer = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) buffer[i] = binary.charCodeAt(i)
  return buffer
}

export function generateSaltBase64(): string {
  return bufferToBase64(crypto.getRandomValues(new Uint8Array(16)))
}

async function importPasswordKey(password: string): Promise<CryptoKey> {
  return crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveKey'])
}

/** Derives the AES-256-GCM key used to encrypt/decrypt this user's data. */
export async function deriveEncryptionKey(password: string, saltBase64: string): Promise<CryptoKey> {
  const passwordKey = await importPasswordKey(password)
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: base64ToBuffer(saltBase64), iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
    passwordKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  )
}

export interface EncryptedPayload {
  ciphertext: string
  iv: string
}

export async function encryptJSON(key: CryptoKey, data: unknown): Promise<EncryptedPayload> {
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const plaintext = new TextEncoder().encode(JSON.stringify(data))
  const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, plaintext)
  return { ciphertext: bufferToBase64(new Uint8Array(encrypted)), iv: bufferToBase64(iv) }
}

export async function decryptJSON<T>(key: CryptoKey, payload: EncryptedPayload): Promise<T> {
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: base64ToBuffer(payload.iv) },
    key,
    base64ToBuffer(payload.ciphertext),
  )
  return JSON.parse(new TextDecoder().decode(decrypted)) as T
}
