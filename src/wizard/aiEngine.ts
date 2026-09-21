import type { Booth, Company, CompanyPrep, ContactInfo, Education, ProfileData, TargetPosition, WorkExperience } from './types'

/**
 * AI-backed resume parsing / directory parsing / company ranking / pitch
 * generation - each its own serverless function (api/parse-resume.ts,
 * api/parse-directory.ts, api/rank-companies.ts, api/generate-pitches.ts),
 * all calling Gemini directly, holding GEMINI_API_KEY server-side. There is
 * no demo/mock fallback - a production deployment always has a real key
 * configured, so a failed call surfaces as a real error to the caller
 * rather than being papered over with invented data.
 */

async function callApi<T>(endpoint: string, payload: unknown): Promise<T> {
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ payload }),
  })

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { error?: string } | null
    throw new Error(body?.error || `${endpoint} request failed with status ${response.status}`)
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

export interface ParsedResume {
  contact: ContactInfo
  major: string
  gradYear: string
  skills: string[]
  interests: string[]
  experience: WorkExperience[]
  education: Education[]
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
  experience: Omit<WorkExperience, 'id'>[]
  education: Omit<Education, 'id'>[]
}

export async function parseResume(file: File): Promise<ParsedResume> {
  const dataBase64 = await fileToBase64(file)
  const data = await callApi<ParseResumeResponse>('/api/parse-resume', { mimeType: file.type, dataBase64 })

  return {
    contact: { fullName: data.name, email: data.email, phone: data.phone, university: data.university },
    major: data.major,
    gradYear: data.gradYear,
    skills: data.skills,
    interests: data.interests,
    experience: data.experience.map((entry) => ({ ...entry, id: crypto.randomUUID() })),
    education: data.education.map((entry) => ({ ...entry, id: crypto.randomUUID() })),
  }
}

interface MergedCompany {
  companyName: string
  boothNumbers: string[]
}

/**
 * What rank-companies actually generates - deliberately NOT companyName/
 * boothNumbers. On a long list the model sometimes blanks or drops them
 * when asked to echo them back verbatim; `index` (its 1-based position in
 * the prompt) is a far more reliable correlation key, so the real name and
 * booths always come from our own already-correct `merged` list instead.
 */
interface RankedCompanyResult {
  index: number
  matchScore: number
  summary: string
  industry: string
  openRoles: string[]
}

/**
 * A directory can list the same company more than once (multiple booths,
 * or the same booth split across rows) - merge those into one entry with
 * every booth number before ranking, so Matches/Briefs show one card per
 * company rather than a duplicate per booth.
 */
function mergeBoothsByCompany(booths: Booth[]): MergedCompany[] {
  const merged = new Map<string, MergedCompany>()
  for (const booth of booths) {
    const name = booth.companyName.trim()
    if (!name) continue
    const key = name.toLowerCase()
    const existing = merged.get(key)
    if (existing) {
      if (booth.boothNumber && !existing.boothNumbers.includes(booth.boothNumber)) {
        existing.boothNumbers.push(booth.boothNumber)
      }
    } else {
      merged.set(key, { companyName: name, boothNumbers: booth.boothNumber ? [booth.boothNumber] : [] })
    }
  }
  return [...merged.values()]
}

export async function analyzeFair(
  rawText: string,
  companyListFile: File | null,
  profile: ProfileData,
  targetPosition: TargetPosition,
): Promise<Company[]> {
  const file = companyListFile
    ? { mimeType: companyListFile.type, dataBase64: await fileToBase64(companyListFile) }
    : null

  const { booths } = await callApi<{ booths: Booth[] }>('/api/parse-directory', { rawText, file })
  const merged = mergeBoothsByCompany(booths)
  const { rankedCompanies } = await callApi<{ rankedCompanies: RankedCompanyResult[] }>('/api/rank-companies', {
    profile,
    companies: merged,
    targetPosition,
  })

  // Every company we know is real (from `merged`) gets a card - if the
  // model dropped its index from the response, it still shows up, just
  // with neutral placeholders instead of AI-generated fields.
  const byIndex = new Map(rankedCompanies.map((result) => [result.index, result]))
  const scored = merged.map((company, i) => {
    const result = byIndex.get(i + 1)
    return {
      companyName: company.companyName,
      boothNumbers: company.boothNumbers,
      summary: result?.summary ?? '',
      industry: result?.industry ?? '',
      openRoles: result?.openRoles ?? [],
      matchScore: result?.matchScore ?? 0,
    }
  })
  scored.sort((a, b) => b.matchScore - a.matchScore)

  return scored.map((company, index) => ({
    ...company,
    id: `company-${index}-${company.companyName.replace(/\s+/g, '-').toLowerCase()}`,
  }))
}

type PitchResult = CompanyPrep & { companyName: string }

/**
 * Takes one request covering every company passed in, rather than one
 * request per company, when called with more than one - fewer concurrent
 * calls against the same API key, less latency, lower chance of hitting a
 * transient rate limit / overload error. Callers generate briefs on demand,
 * so this is often called with a single company.
 */
export async function generatePreps(
  profile: ProfileData,
  companies: Company[],
  targetPosition: TargetPosition,
): Promise<Record<string, CompanyPrep>> {
  const { pitches } = await callApi<{ pitches: PitchResult[] }>('/api/generate-pitches', {
    profile,
    companies: companies.map(({ companyName, boothNumbers, summary, industry, openRoles }) => ({
      companyName,
      boothNumbers,
      summary,
      industry,
      openRoles,
    })),
    targetPosition,
  })

  const prep: Record<string, CompanyPrep> = {}
  companies.forEach((company, index) => {
    const { companyName: _companyName, ...result } = pitches[index]
    prep[company.id] = result
  })
  return prep
}
