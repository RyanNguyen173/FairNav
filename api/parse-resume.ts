import { Type, createPartFromBase64, createUserContent } from '@google/genai'
import { MODEL, generateWithRetry, withGeminiHandler, type Req, type Res } from './_lib/gemini'

interface ParseResumePayload {
  mimeType: string
  dataBase64: string
}

export default async function handler(req: Req, res: Res) {
  await withGeminiHandler(req, res, async (ai, payload) => {
    const { mimeType, dataBase64 } = payload as ParseResumePayload

    const prompt = `Extract structured information from the attached resume.

Only include information that actually appears in the document. If a field cannot be determined, use an empty string (or an empty array for skills/interests/experience/leadership) - never invent placeholder values. List skills as short keywords or phrases (e.g. "Python", "Public Speaking"), deduplicated, most relevant first, at most 8. Infer 2-4 likely career interest areas (e.g. "Software Engineering", "Data Science") from the resume's projects, experience, and coursework. List each work/internship/research/project experience as one short line combining role, organization, and dates if available (e.g. "Software Engineering Intern @ Acme (Summer 2024)"), most recent first, at most 5. List each leadership or extracurricular role as one short line (e.g. "President, Robotics Club"), at most 5.`

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
            experience: { type: Type.ARRAY, items: { type: Type.STRING } },
            leadership: { type: Type.ARRAY, items: { type: Type.STRING } },
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
            'leadership',
          ],
        },
      },
    })

    return JSON.parse(response.text ?? '{}')
  })
}
