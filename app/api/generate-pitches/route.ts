import type { NextRequest } from 'next/server'
import type { PitchCompanyInput } from '../../../src/lib/aiPrompts'
import { buildGeneratePitchesPrompt } from '../../../src/lib/aiPrompts'
import { GENERATE_PITCHES_SCHEMA, MODEL, generateWithRetry, withGeminiHandler } from '../../../src/lib/gemini'
import type { ProfileData } from '../../../src/wizard/types'

export const maxDuration = 60

interface GeneratePitchesPayload {
  profile: ProfileData
  companies: PitchCompanyInput[]
}

export async function POST(request: NextRequest) {
  return withGeminiHandler(request, async (ai, payload) => {
    const { profile, companies } = payload as GeneratePitchesPayload

    const response = await generateWithRetry(ai, {
      model: MODEL,
      contents: buildGeneratePitchesPrompt(profile, companies),
      config: {
        responseMimeType: 'application/json',
        responseSchema: GENERATE_PITCHES_SCHEMA,
      },
    })

    return JSON.parse(response.text ?? '{"pitches":[]}')
  })
}
