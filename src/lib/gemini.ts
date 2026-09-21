import { ApiError, GoogleGenAI, ThinkingLevel, Type } from '@google/genai'
import type { GenerateContentParameters, Schema } from '@google/genai'
import { NextResponse, type NextRequest } from 'next/server'

/**
 * Shared helpers for the Gemini-only route handlers (app/api/parse-resume,
 * parse-directory, rank-companies, generate-pitches, and their app/api/dev
 * counterparts used by the ai-playground tuning tool). The prompt text
 * itself lives in aiPrompts.ts instead, since that file is also imported
 * client-side by the playground page and must stay free of the
 * `@google/genai` SDK.
 */

export const MODEL = 'gemini-3.5-flash-lite'

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

export const RANK_COMPANIES_SCHEMA: Schema = {
  type: Type.OBJECT,
  properties: {
    rankedCompanies: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          index: { type: Type.INTEGER },
          matchScore: { type: Type.INTEGER },
          summary: { type: Type.STRING },
          industry: { type: Type.STRING },
          openRoles: { type: Type.ARRAY, items: { type: Type.STRING } },
        },
        required: ['index', 'matchScore', 'summary', 'industry', 'openRoles'],
      },
    },
  },
  required: ['rankedCompanies'],
}

export const GENERATE_PITCHES_SCHEMA: Schema = {
  type: Type.OBJECT,
  properties: {
    pitches: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          companyName: { type: Type.STRING },
          elevatorPitch: { type: Type.STRING },
          questions: { type: Type.ARRAY, items: { type: Type.STRING } },
          overview: { type: Type.STRING },
          locations: { type: Type.ARRAY, items: { type: Type.STRING } },
          values: { type: Type.ARRAY, items: { type: Type.STRING } },
          industries: { type: Type.ARRAY, items: { type: Type.STRING } },
          majors: { type: Type.ARRAY, items: { type: Type.STRING } },
          positions: { type: Type.ARRAY, items: { type: Type.STRING } },
        },
        required: [
          'companyName',
          'elevatorPitch',
          'questions',
          'overview',
          'locations',
          'values',
          'industries',
          'majors',
          'positions',
        ],
      },
    },
  },
  required: ['pitches'],
}

/**
 * Turns a thrown error into an (httpStatus, message) pair that's actually
 * useful to the caller, instead of a blanket 500 "AI request failed" for
 * everything from a transient overload to a malformed model response to a
 * missing API key.
 */
function classifyError(error: unknown): { status: number; message: string } {
  if (error instanceof ApiError) {
    if (error.status === 429) return { status: 503, message: 'AI service is rate-limited right now - try again shortly.' }
    if (error.status === 503) return { status: 503, message: 'AI service is temporarily overloaded - try again shortly.' }
    if (error.status === 401 || error.status === 403) {
      // Never echo the SDK's own message here - it can include request
      // details tied to the API key. The real cause belongs in the server log.
      return { status: 500, message: 'AI service is misconfigured.' }
    }
    if (error.status === 400) return { status: 502, message: 'AI service rejected the request.' }
    return { status: 502, message: 'AI request failed.' }
  }
  // JSON.parse on the model's own response.text - the model returned text
  // that didn't match its response schema (rare, but response schemas are
  // a strong hint, not a hard guarantee).
  if (error instanceof SyntaxError) return { status: 502, message: 'AI returned an unexpected response format.' }
  if (error instanceof Error && error.message === 'GEMINI_API_KEY is not configured') {
    return { status: 500, message: 'AI service is misconfigured.' }
  }
  return { status: 500, message: 'AI request failed.' }
}

/** Standard client init + error handling wrapper around a POST body's `payload`. */
export async function withGeminiHandler(
  request: NextRequest,
  routeName: string,
  run: (ai: GoogleGenAI, payload: unknown) => Promise<unknown>,
) {
  try {
    const ai = getClient()
    const { payload } = (await request.json()) as { payload?: unknown }
    const result = await run(ai, payload)
    return NextResponse.json(result)
  } catch (error) {
    const { status, message } = classifyError(error)
    console.error(`[${routeName}] Gemini request failed (responding ${status}):`, error)
    return NextResponse.json({ error: message }, { status })
  }
}
