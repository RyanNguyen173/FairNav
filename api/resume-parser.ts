/**
 * Server-side proxy to apilayer's Resume Parser API. Runs as a Vercel
 * serverless function so RESUME_PARSER_API_KEY never reaches the browser.
 * Deploy target only - the plain Vite dev server does not serve this route
 * (use `vercel dev` locally).
 *
 * Field mapping below is based on apilayer's own documented example
 * response ({ name, email, skills, education: [{ name, dates }], ... }).
 * Their docs don't show a confirmed "phone" field - this tries a couple of
 * likely names and falls back to an empty string, matching the "don't
 * invent placeholder values" rule the rest of the app follows. If a real
 * response comes back with a different phone key, adjust PHONE_KEYS below.
 */

interface Req {
  method?: string
  body?: unknown
}

interface Res {
  status(code: number): { json(body: unknown): void }
}

interface ParseResumeBody {
  mimeType: string
  dataBase64: string
}

interface ApilayerResumeResponse {
  name?: string
  email?: string
  emails?: string[]
  phone?: string
  phone_number?: string
  mobile?: string
  skills?: string[]
  education?: { name?: string; dates?: string }[]
}

const PHONE_KEYS = ['phone', 'phone_number', 'mobile'] as const

function firstNonEmpty(data: ApilayerResumeResponse, keys: readonly (keyof ApilayerResumeResponse)[]): string {
  for (const key of keys) {
    const value = data[key]
    if (typeof value === 'string' && value.trim()) return value
  }
  return ''
}

export default async function handler(req: Req, res: Res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  const apiKey = process.env.RESUME_PARSER_API_KEY
  if (!apiKey) {
    res.status(500).json({ error: 'RESUME_PARSER_API_KEY is not configured' })
    return
  }

  try {
    const { dataBase64 } = (req.body ?? {}) as ParseResumeBody
    const fileBuffer = Buffer.from(dataBase64, 'base64')

    const response = await fetch('https://api.apilayer.com/resume_parser/upload', {
      method: 'POST',
      headers: {
        apikey: apiKey,
        'Content-Type': 'application/octet-stream',
      },
      body: fileBuffer,
    })

    if (!response.ok) {
      throw new Error(`apilayer resume parser responded with ${response.status}`)
    }

    const data = (await response.json()) as ApilayerResumeResponse

    res.status(200).json({
      contact: {
        fullName: data.name ?? '',
        email: data.email ?? data.emails?.[0] ?? '',
        phone: firstNonEmpty(data, PHONE_KEYS),
        university: data.education?.[0]?.name ?? '',
      },
      skills: data.skills ?? [],
    })
  } catch (error) {
    console.error('Resume parser request failed:', error)
    res.status(500).json({ error: 'Resume parsing failed' })
  }
}
