import { Type } from '@google/genai'
import type { NextRequest } from 'next/server'
import { MODEL, describeProfile, generateWithRetry, withGeminiHandler } from '../../../src/lib/gemini'
import type { ProfileData } from '../../../src/wizard/types'

export const maxDuration = 60

interface MergedCompany {
  companyName: string
  /** Every booth this company holds - already deduplicated/merged client-side before this call. */
  boothNumbers: string[]
}

interface RankCompaniesPayload {
  profile: ProfileData
  companies: MergedCompany[]
}

export async function POST(request: NextRequest) {
  return withGeminiHandler(request, async (ai, payload) => {
    const { profile, companies } = payload as RankCompaniesPayload

    const companyList = companies
      .map((company, index) => {
        const booths = company.boothNumbers.length > 0 ? company.boothNumbers.join(', ') : 'unknown'
        return `${index + 1}. ${company.companyName} (booth${company.boothNumbers.length === 1 ? '' : 's'} ${booths})`
      })
      .join('\n')

    // The model asked to echo back companyName/boothNumbers verbatim for every
    // entry sometimes drops or blanks one on a long list - rather than trust
    // that, it returns `index` (the 1-based number from the prompt) and the
    // caller re-attaches the already-known-correct name/booths itself. Only
    // the genuinely AI-generated fields (score/overview/industry/roles) come
    // from here.
    const prompt = `Rank these career fair companies for a student, from best to worst fit.

Student profile:
${describeProfile(profile)}

Companies attending, with booth numbers:
${companyList}

For each and every one of the ${companies.length} companies listed above (do not skip or merge any), return:
- index: its number from the list above (1-${companies.length}).
- summary: 1-2 sentences that are a genuine company overview - what the company actually does/sells/builds. Not a sentence about why it fits this student.
- industry: the single primary industry this company operates in (e.g. "Fintech", "Aerospace", "Healthcare", "Software Engineering").
- openRoles: 1-2 plausible open roles.
- matchScore: 0-100 reflecting fit with this student.
You must return exactly ${companies.length} results, one per index, with no duplicate or missing index.`

    const response = await generateWithRetry(ai, {
      model: MODEL,
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
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
        },
      },
    })

    return JSON.parse(response.text ?? '{"rankedCompanies":[]}')
  })
}
