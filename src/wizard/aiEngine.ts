import { boothCoordinatesForIndex, mockAnalyzeFair, mockGeneratePrep, mockParseResume, type ParsedResume } from './mockEngine'
import type { Company, CompanyPrep, ProfileData } from './types'

/**
 * Real AI-backed resume parsing / company matching / pitch generation, via
 * the `/api/gemini` serverless function (holds GEMINI_API_KEY server-side).
 * Falls back to the demo mock engine if that request fails for any reason
 * (no key configured, offline, running under plain `vite dev`, rate limit,
 * etc.) so the wizard stays usable either way.
 */

type AiCompanyMatch = Omit<Company, 'id' | 'x' | 'y'>

async function callGemini<T>(action: string, payload: unknown): Promise<T> {
  const response = await fetch('/api/gemini', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, payload }),
  })

  if (!response.ok) {
    throw new Error(`Gemini request failed with status ${response.status}`)
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

export async function parseResume(file: File): Promise<ParsedResume> {
  try {
    const dataBase64 = await fileToBase64(file)
    return await callGemini<ParsedResume>('parseResume', { mimeType: file.type, dataBase64 })
  } catch (error) {
    console.warn('Gemini resume parsing unavailable, using demo data:', error)
    return mockParseResume(file)
  }
}

export async function analyzeFair(
  rawText: string,
  companyListFile: File | null,
  profile: ProfileData,
): Promise<Company[]> {
  try {
    const file = companyListFile
      ? { mimeType: companyListFile.type, dataBase64: await fileToBase64(companyListFile) }
      : null
    const ranked = await callGemini<AiCompanyMatch[]>('analyzeFair', { rawText, file, profile })
    return ranked.map((company, index) => {
      const { x, y } = boothCoordinatesForIndex(index, ranked.length)
      return {
        ...company,
        id: `company-${index}-${company.name.replace(/\s+/g, '-').toLowerCase()}`,
        boothNumber: company.boothNumber.trim() || String(index + 1).padStart(2, '0'),
        x,
        y,
      }
    })
  } catch (error) {
    console.warn('Gemini company matching unavailable, using demo data:', error)
    return mockAnalyzeFair(rawText, companyListFile?.name ?? null, profile)
  }
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
    const results = await callGemini<CompanyPrep[]>('generatePreps', { profile, companies })
    const prep: Record<string, CompanyPrep> = {}
    companies.forEach((company, index) => {
      prep[company.id] = results[index]
    })
    return prep
  } catch (error) {
    console.warn('Gemini pitch generation unavailable, using demo data:', error)
    const prep: Record<string, CompanyPrep> = {}
    for (const company of companies) {
      prep[company.id] = mockGeneratePrep(profile, company)
    }
    return prep
  }
}
