import { ThinkingLevel } from '@google/genai'
import { NextResponse, type NextRequest } from 'next/server'
import { GENERATE_PITCHES_SCHEMA, MODEL, generateWithRetry, getClient } from '../../../../src/lib/gemini'

export const maxDuration = 60

/** Same shape as app/api/dev/rank-companies - see its comment for why this exists and why it's NODE_ENV-gated. */
interface DevGeneratePitchesPayload {
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
    const body = (await request.json()) as DevGeneratePitchesPayload
    if (!body.prompt) return NextResponse.json({ error: 'prompt is required' }, { status: 400 })

    const ai = getClient()
    const startedAt = Date.now()
    const response = await generateWithRetry(ai, {
      model: body.model || MODEL,
      contents: body.prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: GENERATE_PITCHES_SCHEMA,
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
    console.error('Dev generate-pitches request failed:', error)
    const message = error instanceof Error ? error.message : 'AI request failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
