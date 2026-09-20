import { Type } from '@google/genai'
import type { NextRequest } from 'next/server'
import { MODEL, describeProfile, generateWithRetry, withGeminiHandler } from '../../../src/lib/gemini'
import type { ProfileData } from '../../../src/wizard/types'

export const maxDuration = 60

interface PitchCompanyInput {
  companyName: string
  boothNumbers: string[]
  summary: string
  industry: string
  openRoles: string[]
}

interface GeneratePitchesPayload {
  profile: ProfileData
  companies: PitchCompanyInput[]
}

export async function POST(request: NextRequest) {
  return withGeminiHandler(request, async (ai, payload) => {
    const { profile, companies } = payload as GeneratePitchesPayload

    const companyList = companies
      .map(
        (company, index) =>
          `${index + 1}. ${company.companyName} (${company.industry}) - ${company.summary} Open roles: ${company.openRoles.join(', ')}`,
      )
      .join('\n')

    const prompt = `A student is about to walk a career fair floor and will talk to a recruiter at each of the following companies. For EACH one, produce a personalized pitch plus a research brief, using the student's real background and your general knowledge of each company.

Student profile:
${describeProfile(profile)}

Companies, in order:
${companyList}

For each company, return:
- elevatorPitch: a short personalized 2-3 sentence pitch script tailored to that company using the student's real background.
- questions: 2 thoughtful recruiter questions.
- overview: 2-3 sentences on what the company actually does/sells/builds.
- locations: office or headquarters locations, as many real ones as you know (city, state/country) - best estimate if unsure, empty array only if truly unknown.
- values: 3-5 stated company values or cultural pillars.
- industries: 1-3 relevant industries/sectors.
- majors: 3-5 majors or fields of study this company commonly hires from.
- positions: 3-5 realistic job/internship titles this company would plausibly be hiring for right now, based on its industry and size.

Give your best realistic answer for every field from what you already know about each company - do not say you lack live access or leave a field empty just because you cannot browse the web right now.

Respond with exactly ${companies.length} results, one per company, in the same order as listed above, keeping each company's companyName exactly as given.`

    const response = await generateWithRetry(ai, {
      model: MODEL,
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
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
        },
      },
    })

    return JSON.parse(response.text ?? '{"pitches":[]}')
  })
}
