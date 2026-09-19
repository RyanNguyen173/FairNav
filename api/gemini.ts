import { ApiError, GoogleGenAI, Type, createPartFromBase64, createUserContent } from '@google/genai'
import type { GenerateContentParameters } from '@google/genai'
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

const MODEL = 'gemini-3.5-flash-lite'

type AiCompanyMatch = Omit<Company, 'id' | 'x' | 'y'>

interface AnalyzeFairPayload {
  rawText: string
  file: { mimeType: string; dataBase64: string } | null
  profile: ProfileData
}

interface GeneratePrepsPayload {
  profile: ProfileData
  companies: Company[]
}

function getClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) throw new Error('GEMINI_API_KEY is not configured')
  return new GoogleGenAI({ apiKey })
}

/**
 * Gemini occasionally returns 503 (model overloaded) or 429 (rate limited)
 * under load - both transient. Retry those with backoff; anything else
 * (bad request, auth) fails immediately since retrying won't help.
 */
async function generateWithRetry(ai: GoogleGenAI, params: GenerateContentParameters, attempts = 2) {
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      return await ai.models.generateContent(params)
    } catch (error) {
      const retryable = error instanceof ApiError && (error.status === 503 || error.status === 429)
      if (!retryable || attempt === attempts) throw error
      await new Promise((resolve) => setTimeout(resolve, 750 * attempt))
    }
  }
  throw new Error('unreachable')
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

async function analyzeFair(ai: GoogleGenAI, payload: AnalyzeFairPayload): Promise<AiCompanyMatch[]> {
  const directoryInstruction = payload.file
    ? 'Extract every exhibitor/company from the attached exhibitor directory document, including its booth number(s) exactly as printed (if a company lists multiple booth numbers, use the first one).'
    : payload.rawText.trim()
      ? `Here is the list of companies attending the fair (one per line):\n${payload.rawText}`
      : 'No company directory was provided. Invent a realistic set of 8-10 companies that would plausibly attend a general career fair and would be a good fit for this student.'

  const prompt = `You are ranking companies at a career fair for a student, from best to worst fit.

Student profile:
${describeProfile(payload.profile)}

${directoryInstruction}

For each company, include its booth number if known (empty string if not), a one-sentence overview, 1-2 plausible open roles, 2-4 relevant skill tags, an industry label, and a matchPercent (0-100) reflecting how well it fits this student. Order the array from highest matchPercent to lowest.`

  const response = await generateWithRetry(ai, {
    model: MODEL,
    contents: payload.file
      ? createUserContent([prompt, createPartFromBase64(payload.file.dataBase64, payload.file.mimeType || 'application/pdf')])
      : prompt,
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING },
            boothNumber: { type: Type.STRING },
            overview: { type: Type.STRING },
            openRoles: { type: Type.ARRAY, items: { type: Type.STRING } },
            skillTags: { type: Type.ARRAY, items: { type: Type.STRING } },
            industry: { type: Type.STRING },
            matchPercent: { type: Type.INTEGER },
          },
          required: ['name', 'boothNumber', 'overview', 'openRoles', 'skillTags', 'industry', 'matchPercent'],
        },
      },
    },
  })

  return JSON.parse(response.text ?? '[]')
}

/**
 * One request for ALL selected companies rather than one request per
 * company. Cuts N concurrent Gemini calls (which compete for the same rate
 * limit and are the likeliest source of "model overloaded" 503s under
 * normal use) down to 1, and returns results in the same order as the
 * input so the caller can zip them back onto company ids by index.
 */
async function generatePreps(ai: GoogleGenAI, payload: GeneratePrepsPayload): Promise<CompanyPrep[]> {
  const { profile, companies } = payload
  const companyList = companies
    .map(
      (company, index) =>
        `${index + 1}. ${company.name} - industry: ${company.industry}; overview: ${company.overview}; open roles: ${company.openRoles.join(', ')}; skill tags: ${company.skillTags.join(', ')}`,
    )
    .join('\n')

  const prompt = `A student is about to walk a career fair floor and will talk to a recruiter at each of the following companies. For EACH one, write a short personalized elevator pitch and a couple of smart questions to ask, tailored to that specific company using the student's real background.

Student profile:
${describeProfile(profile)}

Companies, in order:
${companyList}

Respond with exactly ${companies.length} results, one per company, in the same order as listed above. For each: 3 talking points connecting the student's real background to that specific company, and 2 thoughtful questions to ask that recruiter that go beyond generic questions.`

  const response = await generateWithRetry(ai, {
    model: MODEL,
    contents: prompt,
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            talkingPoints: { type: Type.ARRAY, items: { type: Type.STRING } },
            questions: { type: Type.ARRAY, items: { type: Type.STRING } },
          },
          required: ['talkingPoints', 'questions'],
        },
      },
    },
  })

  return JSON.parse(response.text ?? '[]')
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
      case 'analyzeFair':
        res.status(200).json(await analyzeFair(ai, payload as AnalyzeFairPayload))
        return
      case 'generatePreps':
        res.status(200).json(await generatePreps(ai, payload as GeneratePrepsPayload))
        return
      default:
        res.status(400).json({ error: 'Unknown action' })
    }
  } catch (error) {
    console.error('Gemini request failed:', error)
    res.status(500).json({ error: 'AI request failed' })
  }
}
