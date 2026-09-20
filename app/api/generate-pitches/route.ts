import { ThinkingLevel } from '@google/genai'
import type { NextRequest } from 'next/server'
import type { PitchCompanyInput } from '../../../src/lib/aiPrompts'
import { buildGeneratePitchesPrompt } from '../../../src/lib/aiPrompts'
import { GENERATE_PITCHES_SCHEMA, MODEL, generateWithRetry, withGeminiHandler } from '../../../src/lib/gemini'
import type { ProfileData, TargetPosition } from '../../../src/wizard/types'

export const maxDuration = 60

interface GeneratePitchesPayload {
  profile: ProfileData
  companies: PitchCompanyInput[]
  targetPosition: TargetPosition
}

export async function POST(request: NextRequest) {
  return withGeminiHandler(request, async (ai, payload) => {
    const { profile, companies, targetPosition } = payload as GeneratePitchesPayload

    const response = await generateWithRetry(ai, {
      model: MODEL,
      contents: buildGeneratePitchesPrompt(profile, companies, targetPosition),
      config: {
        responseMimeType: 'application/json',
        responseSchema: GENERATE_PITCHES_SCHEMA,
        temperature: 0.1,
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
      },
    })

    return JSON.parse(response.text ?? '{"pitches":[]}')
  })
}
