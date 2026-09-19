import { GoogleGenAI, Type, createPartFromBase64, createUserContent } from '@google/genai'
import type { Company, CompanyPrep, ProfileData } from '../src/wizard/types'

/**
 * Server-side proxy to the Gemini API. Runs as a Vercel serverless function
 * so GEMINI_API_KEY never reaches the browser. Deploy target only - the
 * plain Vite dev server does not serve this route (use `vercel dev` locally).
 *
 * Typed loosely against Vercel's Node runtime shape rather than depending on
 * `@vercel/node` - this file isn't part of the app's tsc build (Vercel's own
 * function bundler compiles it independently), so the extra dependency
 * wouldn't buy type-checking, only devDependency weight.
 */

interface Req {
  method?: string
  body?: unknown
}

interface Res {
  status(code: number): { json(body: unknown): void }
}

const MODEL = 'gemini-flash-latest'

type AiCompanyMatch = Omit<Company, 'id' | 'boothNumber' | 'x' | 'y'>

interface ParseResumePayload {
  mimeType: string
  dataBase64: string
}

interface AnalyzeFairPayload {
  rawText: string
  fileName: string | null
  profile: ProfileData
}

interface GeneratePrepPayload {
  profile: ProfileData
  company: Company
}

function getClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) throw new Error('GEMINI_API_KEY is not configured')
  return new GoogleGenAI({ apiKey })
}

function describeProfile(profile: ProfileData): string {
  return [
    `- Major: ${profile.major || 'Undeclared'}`,
    `- Graduation year: ${profile.gradYear || 'Unknown'}`,
    `- Experience level: ${profile.experienceLevel}`,
    `- Skills: ${profile.skills.join(', ') || 'None listed'}`,
    `- Interests: ${profile.interests.join(', ') || 'None listed'}`,
  ].join('\n')
}

async function parseResume(ai: GoogleGenAI, payload: ParseResumePayload) {
  const prompt = `Extract structured contact information and a list of professional/technical skills from the attached resume.

Only include information that actually appears in the document. If a field is not present, use an empty string for that field - never invent placeholder values. List skills as short keywords or phrases (e.g. "Python", "Public Speaking"), deduplicated, most relevant first, at most 8.`

  const response = await ai.models.generateContent({
    model: MODEL,
    contents: createUserContent([
      prompt,
      createPartFromBase64(payload.dataBase64, payload.mimeType || 'application/pdf'),
    ]),
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          contact: {
            type: Type.OBJECT,
            properties: {
              fullName: { type: Type.STRING },
              email: { type: Type.STRING },
              phone: { type: Type.STRING },
              university: { type: Type.STRING },
            },
            required: ['fullName', 'email', 'phone', 'university'],
          },
          skills: { type: Type.ARRAY, items: { type: Type.STRING } },
        },
        required: ['contact', 'skills'],
      },
    },
  })

  return JSON.parse(response.text ?? '{}')
}

async function analyzeFair(ai: GoogleGenAI, payload: AnalyzeFairPayload): Promise<AiCompanyMatch[]> {
  const directoryInstruction = payload.rawText.trim()
    ? `Here is the list of companies attending the fair (one per line):\n${payload.rawText}`
    : 'No company directory was provided. Invent a realistic set of 8-10 companies that would plausibly attend a general career fair and would be a good fit for this student.'

  const prompt = `You are ranking companies at a career fair for a student, from best to worst fit.

Student profile:
${describeProfile(payload.profile)}

${directoryInstruction}

For each company, write a one-sentence overview, 1-2 plausible open roles, 2-4 relevant skill tags, an industry label, and a matchPercent (0-100) reflecting how well it fits this student. Order the array from highest matchPercent to lowest.`

  const response = await ai.models.generateContent({
    model: MODEL,
    contents: prompt,
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING },
            overview: { type: Type.STRING },
            openRoles: { type: Type.ARRAY, items: { type: Type.STRING } },
            skillTags: { type: Type.ARRAY, items: { type: Type.STRING } },
            industry: { type: Type.STRING },
            matchPercent: { type: Type.INTEGER },
          },
          required: ['name', 'overview', 'openRoles', 'skillTags', 'industry', 'matchPercent'],
        },
      },
    },
  })

  return JSON.parse(response.text ?? '[]')
}

async function generatePrep(ai: GoogleGenAI, payload: GeneratePrepPayload): Promise<CompanyPrep> {
  const { profile, company } = payload
  const prompt = `A student is about to talk to a recruiter at a career fair booth. Write a short, personalized elevator pitch and a couple of smart questions to ask.

Student profile:
${describeProfile(profile)}

Company:
- Name: ${company.name}
- Industry: ${company.industry}
- Overview: ${company.overview}
- Open roles: ${company.openRoles.join(', ')}
- Skill tags: ${company.skillTags.join(', ')}

Write 3 talking points the student can use to connect their real background to this specific company, and 2 thoughtful questions to ask the recruiter that go beyond generic questions.`

  const response = await ai.models.generateContent({
    model: MODEL,
    contents: prompt,
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          talkingPoints: { type: Type.ARRAY, items: { type: Type.STRING } },
          questions: { type: Type.ARRAY, items: { type: Type.STRING } },
        },
        required: ['talkingPoints', 'questions'],
      },
    },
  })

  return JSON.parse(response.text ?? '{}')
}

export default async function handler(req: Req, res: Res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  const { action, payload } = (req.body ?? {}) as { action?: string; payload?: unknown }

  try {
    const ai = getClient()

    switch (action) {
      case 'parseResume':
        res.status(200).json(await parseResume(ai, payload as ParseResumePayload))
        return
      case 'analyzeFair':
        res.status(200).json(await analyzeFair(ai, payload as AnalyzeFairPayload))
        return
      case 'generatePrep':
        res.status(200).json(await generatePrep(ai, payload as GeneratePrepPayload))
        return
      default:
        res.status(400).json({ error: 'Unknown action' })
    }
  } catch (error) {
    console.error('Gemini request failed:', error)
    res.status(500).json({ error: 'AI request failed' })
  }
}
