import { boothCoordinatesForIndex, mockAnalyzeFair, mockGeneratePrep, mockParseResume, type ParsedResume } from './mockEngine'
import type { Booth, Company, CompanyPrep, ProfileData } from './types'

/**
 * Real AI-backed resume parsing / directory parsing / company ranking /
 * pitch generation - each its own serverless function (api/parse-resume.ts,
 * api/parse-directory.ts, api/rank-companies.ts, api/generate-pitches.ts),
 * all calling Gemini directly, holding GEMINI_API_KEY server-side. Falls
 * back to the demo mock engine if a request fails for any reason (no key
 * configured, offline, running under plain `vite dev`, rate limit, etc.) so
 * the wizard stays usable either way.
 */

async function callApi<T>(endpoint: string, payload: unknown): Promise<T> {
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ payload }),
  })

  if (!response.ok) {
    throw new Error(`${endpoint} request failed with status ${response.status}`)
  }

  return (await response.json()) as T
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve((reader.result as string).split(',')[1] ?? '')
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

interface ParseResumeResponse {
  name: string
  email: string
  phone: string
  university: string
  major: string
  gradYear: string
  skills: string[]
  interests: string[]
}

export async function parseResume(file: File): Promise<ParsedResume> {
  try {
    const dataBase64 = await fileToBase64(file)
    const data = await callApi<ParseResumeResponse>('/api/parse-resume', { mimeType: file.type, dataBase64 })

    return {
      contact: { fullName: data.name, email: data.email, phone: data.phone, university: data.university },
      major: data.major,
      gradYear: data.gradYear,
      skills: data.skills,
      interests: data.interests,
    }
  } catch (error) {
    console.warn('Resume parsing unavailable, using demo data:', error)
    return mockParseResume(file)
  }
}

type RankedCompany = Omit<Company, 'id' | 'x' | 'y'>

export async function analyzeFair(
  rawText: string,
  companyListFile: File | null,
  profile: ProfileData,
): Promise<Company[]> {
  try {
    const file = companyListFile
      ? { mimeType: companyListFile.type, dataBase64: await fileToBase64(companyListFile) }
      : null

    const { booths } = await callApi<{ booths: Booth[] }>('/api/parse-directory', { rawText, file })
    const { rankedCompanies } = await callApi<{ rankedCompanies: RankedCompany[] }>('/api/rank-companies', {
      profile,
      booths,
    })

    return rankedCompanies.map((company, index) => {
      const { x, y } = boothCoordinatesForIndex(index, rankedCompanies.length)
      return {
        ...company,
        id: `company-${index}-${company.companyName.replace(/\s+/g, '-').toLowerCase()}`,
        x,
        y,
      }
    })
  } catch (error) {
    console.warn('Company matching unavailable, using demo data:', error)
    return mockAnalyzeFair(rawText, companyListFile?.name ?? null, profile)
  }
}

interface PitchResult {
  companyName: string
  elevatorPitch: string
  questions: string[]
}

/**
 * One request covering every selected company, rather than one request per
 * company - fewer concurrent calls against the same API key, less latency,
 * lower chance of hitting a transient rate limit / overload error.
 */
export async function generatePreps(
  profile: ProfileData,
  companies: Company[],
): Promise<Record<string, CompanyPrep>> {
  try {
    const { pitches } = await callApi<{ pitches: PitchResult[] }>('/api/generate-pitches', {
      profile,
      companies: companies.map(({ companyName, boothNumber, summary, openRoles }) => ({
        companyName,
        boothNumber,
        summary,
        openRoles,
      })),
    })

    const prep: Record<string, CompanyPrep> = {}
    companies.forEach((company, index) => {
      const result = pitches[index]
      prep[company.id] = { elevatorPitch: result.elevatorPitch, questions: result.questions }
    })
    return prep
  } catch (error) {
    console.warn('Pitch generation unavailable, using demo data:', error)
    const prep: Record<string, CompanyPrep> = {}
    for (const company of companies) {
      prep[company.id] = mockGeneratePrep(profile, company)
    }
    return prep
  }
}
