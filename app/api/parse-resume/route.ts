import { Type, createPartFromBase64, createUserContent } from '@google/genai'
import type { NextRequest } from 'next/server'
import { MODEL, generateWithRetry, withGeminiHandler } from '../../../src/lib/gemini'

export const maxDuration = 60

interface ParseResumePayload {
  mimeType: string
  dataBase64: string
}

export async function POST(request: NextRequest) {
  return withGeminiHandler(request, async (ai, payload) => {
    const { mimeType, dataBase64 } = payload as ParseResumePayload

    const prompt = `Extract structured information from the attached resume.

Only include information that actually appears in the document. If a field cannot be determined, use an empty string (or an empty array for skills/interests/experience/education) - never invent placeholder values. List skills as short keywords or phrases (e.g. "Python", "Public Speaking"), deduplicated, most relevant first, at most 8. Infer 2-4 likely career interest areas (e.g. "Software Engineering", "Data Science") from the resume's projects, experience, and coursework.

For "experience", list every work/internship/research role, most recent first, at most 5. For each: jobTitle, company, location (city, state - empty string if not listed), current (true only if the resume marks this as an ongoing/present role), startDate and endDate as "MM/YYYY" (best guess from whatever date format the resume uses; leave endDate as an empty string when current is true), and description (1-2 sentences summarizing responsibilities/impact, written in the resume's own words as closely as possible - do not invent accomplishments).

For "education", list every degree program listed, most recent first, at most 3. For each: university, degree (e.g. "Bachelor of Science"), fieldOfStudy (major), gpa (empty string if not listed), startDate and expectedGradDate as "MM/YYYY".`

    const response = await generateWithRetry(ai, {
      model: MODEL,
      contents: createUserContent([prompt, createPartFromBase64(dataBase64, mimeType || 'application/pdf')]),
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING },
            email: { type: Type.STRING },
            phone: { type: Type.STRING },
            university: { type: Type.STRING },
            major: { type: Type.STRING },
            gradYear: { type: Type.STRING },
            skills: { type: Type.ARRAY, items: { type: Type.STRING } },
            interests: { type: Type.ARRAY, items: { type: Type.STRING } },
            experience: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  jobTitle: { type: Type.STRING },
                  company: { type: Type.STRING },
                  location: { type: Type.STRING },
                  current: { type: Type.BOOLEAN },
                  startDate: { type: Type.STRING },
                  endDate: { type: Type.STRING },
                  description: { type: Type.STRING },
                },
                required: ['jobTitle', 'company', 'location', 'current', 'startDate', 'endDate', 'description'],
              },
            },
            education: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  university: { type: Type.STRING },
                  degree: { type: Type.STRING },
                  fieldOfStudy: { type: Type.STRING },
                  gpa: { type: Type.STRING },
                  startDate: { type: Type.STRING },
                  expectedGradDate: { type: Type.STRING },
                },
                required: ['university', 'degree', 'fieldOfStudy', 'gpa', 'startDate', 'expectedGradDate'],
              },
            },
          },
          required: [
            'name',
            'email',
            'phone',
            'university',
            'major',
            'gradYear',
            'skills',
            'interests',
            'experience',
            'education',
          ],
        },
      },
    })

    return JSON.parse(response.text ?? '{}')
  })
}
