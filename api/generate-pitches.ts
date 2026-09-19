import { Type } from '@google/genai'
import { MODEL, generateWithRetry, withGeminiHandler, describeProfile, type Req, type Res } from './_lib/gemini'
import type { ProfileData } from '../src/wizard/types'

interface PitchCompanyInput {
  companyName: string
  boothNumber: string
  summary: string
  openRoles: string[]
}

interface GeneratePitchesPayload {
  profile: ProfileData
  companies: PitchCompanyInput[]
}

export default async function handler(req: Req, res: Res) {
  await withGeminiHandler(req, res, async (ai, payload) => {
    const { profile, companies } = payload as GeneratePitchesPayload

    const companyList = companies
      .map((company, index) => `${index + 1}. ${company.companyName} - ${company.summary} Open roles: ${company.openRoles.join(', ')}`)
      .join('\n')

    const prompt = `A student is about to walk a career fair floor and will talk to a recruiter at each of the following companies. For EACH one, write a short personalized 2-3 sentence elevator pitch script and 2 thoughtful recruiter questions, tailored to that specific company using the student's real background.

Student profile:
${describeProfile(profile)}

Companies, in order:
${companyList}

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
                },
                required: ['companyName', 'elevatorPitch', 'questions'],
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
