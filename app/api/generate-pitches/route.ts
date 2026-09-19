import { Type } from '@google/genai'
import type { NextRequest } from 'next/server'
import { MODEL, describeProfile, describeVoice, generateWithRetry, withGeminiHandler } from '../../../src/lib/gemini'
import type { ProfileData } from '../../../src/wizard/types'

export const maxDuration = 60

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

export async function POST(request: NextRequest) {
  return withGeminiHandler(request, async (ai, payload) => {
    const { profile, companies } = payload as GeneratePitchesPayload

    const companyList = companies
      .map((company, index) => `${index + 1}. ${company.companyName} - ${company.summary} Open roles: ${company.openRoles.join(', ')}`)
      .join('\n')

    const prompt = `A student is about to walk a career fair floor and will talk to a recruiter at each of the following companies. For EACH one, write a short personalized 2-3 sentence elevator pitch script and 2 thoughtful recruiter questions, tailored to that specific company using the student's real background.

Student profile:
${describeProfile(profile)}

Voice/tone to write in:
${describeVoice(profile)}

Write every pitch the way this specific student would actually say it out loud, not generic corporate copy. Never use hollow buzzwords or jargon like "synergy," "spearhead," "passionate about driving results," "boasts an impressive," "leverage," or "dynamic team player." Use direct first-person framing ("I built...", "I've been working on...") and natural spoken rhythm - contractions, short sentences, the kind of thing a real person says when introducing themselves, not a LinkedIn summary.

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
