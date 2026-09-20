import { ThinkingLevel } from '@google/genai'
import { NextResponse, type NextRequest } from 'next/server'
import { MODEL, RANK_COMPANIES_SCHEMA, generateWithRetry, getClient } from '../../../../src/lib/gemini'

export const maxDuration = 60

/**
 * Backs app/dev/ai-playground: runs a prompt the playground built (and the
 * developer may have hand-edited) against real Gemini, with tunable
 * generation parameters, so prompt/parameter changes for rank-companies can
 * be tried against real output before editing the actual route. Deliberately
 * NOT gated behind auth (the playground page isn't either) - the NODE_ENV
 * check below is the real boundary, since exposing an arbitrary-prompt
 * endpoint in a live deployment would let anyone spend the project's Gemini
 * quota with no relation to the app's own product limits.
 */
interface DevRankCompaniesPayload {
  prompt: string
  model?: string
  temperature?: number
  topP?: number
  topK?: number
  maxOutputTokens?: number
  thinkingLevel?: keyof typeof ThinkingLevel
}

export async function POST(request: NextRequest) {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  try {
    const body = (await request.json()) as DevRankCompaniesPayload
    if (!body.prompt) return NextResponse.json({ error: 'prompt is required' }, { status: 400 })

    const ai = getClient()
    const startedAt = Date.now()
    const response = await generateWithRetry(ai, {
      model: body.model || MODEL,
      contents: body.prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: RANK_COMPANIES_SCHEMA,
        temperature: body.temperature,
        topP: body.topP,
        topK: body.topK,
        maxOutputTokens: body.maxOutputTokens,
        thinkingConfig: body.thinkingLevel ? { thinkingLevel: ThinkingLevel[body.thinkingLevel] } : undefined,
      },
    })
    const tookMs = Date.now() - startedAt

    return NextResponse.json({ text: response.text ?? '', usageMetadata: response.usageMetadata ?? null, tookMs })
  } catch (error) {
    console.error('Dev rank-companies request failed:', error)
    const message = error instanceof Error ? error.message : 'AI request failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
