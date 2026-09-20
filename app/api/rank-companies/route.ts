import type { NextRequest } from 'next/server'
import type { MergedCompanyInput } from '../../../src/lib/aiPrompts'
import { buildRankCompaniesPrompt } from '../../../src/lib/aiPrompts'
import { MODEL, RANK_COMPANIES_SCHEMA, generateWithRetry, withGeminiHandler } from '../../../src/lib/gemini'
import type { ProfileData } from '../../../src/wizard/types'

export const maxDuration = 60

interface RankCompaniesPayload {
  profile: ProfileData
  companies: MergedCompanyInput[]
}

export async function POST(request: NextRequest) {
  return withGeminiHandler(request, async (ai, payload) => {
    const { profile, companies } = payload as RankCompaniesPayload

    const response = await generateWithRetry(ai, {
      model: MODEL,
      contents: buildRankCompaniesPrompt(profile, companies),
      config: {
        responseMimeType: 'application/json',
        responseSchema: RANK_COMPANIES_SCHEMA,
      },
    })

    return JSON.parse(response.text ?? '{"rankedCompanies":[]}')
  })
}
