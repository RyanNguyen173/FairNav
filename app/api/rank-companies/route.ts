import { Type } from '@google/genai'
import type { NextRequest } from 'next/server'
import { MODEL, describeProfile, generateWithRetry, withGeminiHandler } from '../../../src/lib/gemini'
import type { ProfileData } from '../../../src/wizard/types'

export const maxDuration = 60

interface Booth {
  boothNumber: string
  companyName: string
  acceptedStandings: string[]
  citizenshipRequirement: string
}

interface RankCompaniesPayload {
  profile: ProfileData
  booths: Booth[]
}

export async function POST(request: NextRequest) {
  return withGeminiHandler(request, async (ai, payload) => {
    const { profile, booths } = payload as RankCompaniesPayload

    const boothList = booths
      .map((booth, index) => `${index + 1}. ${booth.companyName} (booth ${booth.boothNumber || 'unknown'})`)
      .join('\n')

    const prompt = `Rank these career fair companies for a student, from best to worst fit.

Student profile:
${describeProfile(profile)}

Companies attending, with booth numbers:
${boothList}

For each company, keep its companyName and boothNumber exactly as given, and add a one-sentence summary of what it does, 1-2 plausible open roles, and a matchScore (0-100) reflecting fit with this student. Order the array from highest matchScore to lowest.`

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
                  companyName: { type: Type.STRING },
                  boothNumber: { type: Type.STRING },
                  matchScore: { type: Type.INTEGER },
                  summary: { type: Type.STRING },
                  openRoles: { type: Type.ARRAY, items: { type: Type.STRING } },
                },
                required: ['companyName', 'boothNumber', 'matchScore', 'summary', 'openRoles'],
              },
            },
          },
          required: ['rankedCompanies'],
        },
      },
    })

    const parsed = JSON.parse(response.text ?? '{"rankedCompanies":[]}') as {
      rankedCompanies: { companyName: string; boothNumber: string; matchScore: number; summary: string; openRoles: string[] }[]
    }

    // Merge in acceptedStandings/citizenshipRequirement from the original
    // booths ourselves rather than asking Gemini to repeat them back - it's
    // already-extracted data, not something to infer, so passing it through
    // in code avoids any risk of the model altering or dropping it.
    const boothsByName = new Map(booths.map((booth) => [booth.companyName.toLowerCase(), booth]))
    const rankedCompanies = parsed.rankedCompanies.map((company) => {
      const booth = boothsByName.get(company.companyName.toLowerCase())
      return {
        ...company,
        acceptedStandings: booth?.acceptedStandings ?? [],
        citizenshipRequirement: booth?.citizenshipRequirement ?? '',
      }
    })

    return { rankedCompanies }
  })
}
