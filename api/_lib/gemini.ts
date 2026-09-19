import { ApiError, GoogleGenAI, ThinkingLevel } from '@google/genai'
import type { GenerateContentParameters } from '@google/genai'
import type { ProfileData } from '../../src/wizard/types'

/**
 * Shared helpers for the 4 Gemini-only route handlers (parse-resume,
 * parse-directory, rank-companies, generate-pitches). Lives under `_lib/` -
 * Vercel's file-based routing ignores underscore-prefixed paths, so this
 * isn't itself exposed as an endpoint.
 */

export const MODEL = 'gemini-3.5-flash-lite'

export interface Req {
  method?: string
  body?: unknown
}

export interface Res {
  status(code: number): { json(body: unknown): void }
}

export function getClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) throw new Error('GEMINI_API_KEY is not configured')
  return new GoogleGenAI({ apiKey })
}

/**
 * Gemini occasionally returns 503 (model overloaded) or 429 (rate limited)
 * under load - both transient. Retry those with backoff; anything else
 * (bad request, auth) fails immediately since retrying won't help.
 */
export async function generateWithRetry(ai: GoogleGenAI, params: GenerateContentParameters, attempts = 2) {
  // None of these 4 calls need multi-step reasoning - they're structured
  // extraction/classification against a fixed schema. Gemini's "thinking"
  // models otherwise spend a variable, model-chosen amount of extra time
  // reasoning before responding, which is the main source of latency for a
  // "flash-lite" model that's supposed to be fast. Gemini 3.x models (which
  // gemini-3.5-flash-lite is) configure this via the `thinkingLevel` enum,
  // not the numeric `thinkingBudget` older Gemini 2.5 models use - sending
  // thinkingBudget here 400s with INVALID_ARGUMENT. A caller can still opt
  // back into more thinking by passing its own thinkingConfig.
  const requestParams: GenerateContentParameters = {
    ...params,
    config: { thinkingConfig: { thinkingLevel: ThinkingLevel.MINIMAL }, ...params.config },
  }

  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      return await ai.models.generateContent(requestParams)
    } catch (error) {
      const retryable = error instanceof ApiError && (error.status === 503 || error.status === 429)
      if (!retryable || attempt === attempts) throw error
      await new Promise((resolve) => setTimeout(resolve, 750 * attempt))
    }
  }
  throw new Error('unreachable')
}

export function describeProfile(profile: ProfileData): string {
  return [
    `- Major: ${profile.major || 'Undeclared'}`,
    `- Graduation year: ${profile.gradYear || 'Unknown'}`,
    `- Experience level: ${profile.experienceLevel}`,
    `- Skills: ${profile.skills.join(', ') || 'None listed'}`,
    `- Interests: ${profile.interests.join(', ') || 'None listed'}`,
  ].join('\n')
}

/** Standard method-check + client init + error handling wrapper. */
export async function withGeminiHandler(
  req: Req,
  res: Res,
  run: (ai: GoogleGenAI, payload: unknown) => Promise<unknown>,
) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  try {
    const ai = getClient()
    const { payload } = (req.body ?? {}) as { payload?: unknown }
    const result = await run(ai, payload)
    res.status(200).json(result)
  } catch (error) {
    console.error('Gemini request failed:', error)
    res.status(500).json({ error: 'AI request failed' })
  }
}
