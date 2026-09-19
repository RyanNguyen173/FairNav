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

/**
 * Derives the AES-256-GCM key used to encrypt/decrypt this user's data (the
 * legacy pre-DEK model), or to wrap/unwrap a DEK (the current model) - same
 * derivation either way, just used differently by the caller. Needs all
 * four usages since WebCrypto's wrapKey()/unwrapKey() require the
 * wrapping/unwrapping key to explicitly carry "wrapKey"/"unwrapKey", not
 * just "encrypt"/"decrypt".
 */
export async function deriveEncryptionKey(password: string, saltBase64: string): Promise<CryptoKey> {
  const passwordKey = await importPasswordKey(password)
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: base64ToBuffer(saltBase64), iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
    passwordKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt', 'wrapKey', 'unwrapKey'],
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

/**
 * Data Encryption Key (DEK) model, layered on top of the password-derived
 * key above so a password reset doesn't destroy access to existing data.
 *
 * Instead of a password-derived key encrypting the user's data directly, it
 * encrypts one random DEK, which in turn encrypts the data and never
 * changes. The same DEK is *also* wrapped by a key derived from a one-time
 * recovery code. Resetting a password just re-wraps the still-unchanged DEK
 * under a new password-derived key - the data itself is never re-encrypted
 * and the recovery-wrapped copy is untouched, so it keeps working.
 * Extractable (unlike deriveEncryptionKey's key) because wrapKey/unwrapKey
 * need to serialize it - it never leaves this module unwrapped either way.
 */
export async function generateDataKey(): Promise<CryptoKey> {
  return crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt'])
}

export async function wrapKey(wrappingKey: CryptoKey, keyToWrap: CryptoKey): Promise<EncryptedPayload> {
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const wrapped = await crypto.subtle.wrapKey('raw', keyToWrap, wrappingKey, { name: 'AES-GCM', iv })
  return { ciphertext: bufferToBase64(new Uint8Array(wrapped)), iv: bufferToBase64(iv) }
}

/** Throws (AES-GCM auth tag check fails) if `wrappingKey` was derived from the wrong secret. */
export async function unwrapKey(wrappingKey: CryptoKey, payload: EncryptedPayload): Promise<CryptoKey> {
  return crypto.subtle.unwrapKey(
    'raw',
    base64ToBuffer(payload.ciphertext),
    wrappingKey,
    { name: 'AES-GCM', iv: base64ToBuffer(payload.iv) },
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt'],
  )
}

// Excludes visually ambiguous characters (0/O, 1/I/L) since this is meant
// to be hand-copied/retyped from a screen, unlike a password.
const RECOVERY_KEY_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'

/** A 24-character recovery code (~120 bits of entropy) shown once at signup. */
export function generateRecoveryKey(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(24))
  const chars = Array.from(bytes, (byte) => RECOVERY_KEY_ALPHABET[byte % RECOVERY_KEY_ALPHABET.length])
  const groups: string[] = []
  for (let i = 0; i < chars.length; i += 4) groups.push(chars.slice(i, i + 4).join(''))
  return groups.join('-')
}

/** Strips formatting so pasted/retyped recovery keys match regardless of spacing or case. */
export function normalizeRecoveryKey(input: string): string {
  return input.replace(/[^a-z0-9]/gi, '').toUpperCase()
}
