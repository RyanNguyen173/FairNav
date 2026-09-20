import type { NextRequest } from 'next/server'
import type { MergedCompanyInput } from '../../../src/lib/aiPrompts'
import { buildRankCompaniesPrompt } from '../../../src/lib/aiPrompts'
import { MODEL, RANK_COMPANIES_SCHEMA, generateWithRetry, withGeminiHandler } from '../../../src/lib/gemini'
import type { ProfileData, TargetPosition } from '../../../src/wizard/types'

export const maxDuration = 60

interface RankCompaniesPayload {
  profile: ProfileData
  companies: MergedCompanyInput[]
  targetPosition: TargetPosition
}

export async function POST(request: NextRequest) {
  return withGeminiHandler(request, async (ai, payload) => {
    const { profile, companies, targetPosition } = payload as RankCompaniesPayload

    const response = await generateWithRetry(ai, {
      model: MODEL,
      contents: buildRankCompaniesPrompt(profile, companies, targetPosition),
      config: {
        responseMimeType: 'application/json',
        responseSchema: RANK_COMPANIES_SCHEMA,
        temperature: 0.1,
      },
    })

    return JSON.parse(response.text ?? '{"rankedCompanies":[]}')
  })
}
