import type { Education, ProfileData, WorkExperience } from '../wizard/types'

/**
 * The prompt text for the rank-companies and generate-pitches Gemini calls,
 * factored out of their route handlers so the exact same prompt-building
 * logic can be reused by app/dev/ai-playground (a local-only tool for
 * tuning these prompts and generation parameters against real Gemini
 * calls). Deliberately has no `@google/genai` import and touches no server
 * secret - the playground page (a client component) imports this directly
 * to build/preview a prompt without a network round trip; the response
 * schemas these calls also need live in gemini.ts instead, since that
 * module already depends on `@google/genai` and never runs client-side.
 */

export interface MergedCompanyInput {
  companyName: string
  boothNumbers: string[]
}

export interface PitchCompanyInput {
  companyName: string
  boothNumbers: string[]
  summary: string
  industry: string
  openRoles: string[]
}

function describeExperience(experience: WorkExperience[]): string {
  if (experience.length === 0) return 'None listed'
  return experience
    .map((job) => {
      const dates = `${job.startDate || 'unknown'} - ${job.current ? 'present' : job.endDate || 'unknown'}`
      const description = job.description ? `: ${job.description}` : ''
      return `${job.jobTitle || 'Role'} at ${job.company || 'unknown company'} (${dates})${description}`
    })
    .join('; ')
}

function describeEducation(education: Education[]): string {
  if (education.length === 0) return 'None listed'
  return education
    .map((edu) => {
      const degree = [edu.degree, edu.fieldOfStudy].filter(Boolean).join(' in ') || 'Degree'
      return `${degree} - ${edu.university || 'unknown university'} (expected ${edu.expectedGradDate || 'unknown'})`
    })
    .join('; ')
}

export function describeProfile(profile: ProfileData): string {
  return [
    `- Major: ${profile.major || 'Undeclared'}`,
    `- Graduation year: ${profile.gradYear || 'Unknown'}`,
    `- Skills: ${profile.skills.join(', ') || 'None listed'}`,
    `- Interests: ${profile.interests.join(', ') || 'None listed'}`,
    `- Work experience: ${describeExperience(profile.experience)}`,
    `- Education: ${describeEducation(profile.education)}`,
  ].join('\n')
}

export function formatCompanyListForRanking(companies: MergedCompanyInput[]): string {
  return companies
    .map((company, index) => {
      const booths = company.boothNumbers.length > 0 ? company.boothNumbers.join(', ') : 'unknown'
      return `${index + 1}. ${company.companyName} (booth${company.boothNumbers.length === 1 ? '' : 's'} ${booths})`
    })
    .join('\n')
}

export function buildRankCompaniesPrompt(profile: ProfileData, companies: MergedCompanyInput[]): string {
  const companyList = formatCompanyListForRanking(companies)

  // The model asked to echo back companyName/boothNumbers verbatim for every
  // entry sometimes drops or blanks one on a long list - rather than trust
  // that, it returns `index` (the 1-based number from the prompt) and the
  // caller re-attaches the already-known-correct name/booths itself. Only
  // the genuinely AI-generated fields (score/overview/industry/roles) come
  // from here.
  return `Rank these career fair companies for a student, from best to worst fit.

Student profile:
${describeProfile(profile)}

Companies attending, with booth numbers:
${companyList}

For each and every one of the ${companies.length} companies listed above (do not skip or merge any), return:
- index: its number from the list above (1-${companies.length}).
- summary: 2-3 sentences. First cover what the company actually does/sells/builds (a genuine company overview), then explain specifically why it would match or interest this student given their profile above.
- industry: the single primary industry this company operates in (e.g. "Fintech", "Aerospace", "Healthcare", "Software Engineering").
- openRoles: 1-2 plausible open roles.
- matchScore: 0-100 reflecting fit with this student.
You must return exactly ${companies.length} results, one per index, with no duplicate or missing index.`
}

export function formatCompanyListForPitches(companies: PitchCompanyInput[]): string {
  return companies
    .map(
      (company, index) =>
        `${index + 1}. ${company.companyName} (${company.industry}) - ${company.summary} Open roles: ${company.openRoles.join(', ')}`,
    )
    .join('\n')
}

export function buildGeneratePitchesPrompt(profile: ProfileData, companies: PitchCompanyInput[]): string {
  const companyList = formatCompanyListForPitches(companies)

  return `A student is about to walk a career fair floor and will talk to a recruiter at each of the following companies. For EACH one, produce a personalized pitch plus a research brief, using the student's real background and your general knowledge of each company.

Student profile:
${describeProfile(profile)}

Companies, in order:
${companyList}

For each company, return:
- elevatorPitch: 2-3 sentences on why this specific company relates to the student's interests, skills, and experience - include at least one concrete example of how a specific experience, project, or course from their background directly connects to what this company does.
- questions: 2 thoughtful recruiter questions.
- overview: 2-3 sentences on what the company actually does/sells/builds.
- locations: office or headquarters locations, as many real ones as you know (city, state/country) - best estimate if unsure, empty array only if truly unknown.
- values: 3-5 stated company values or cultural pillars.
- industries: 1-3 relevant industries/sectors.
- majors: 3-5 majors or fields of study this company commonly hires from.
- positions: 3-5 realistic job/internship titles this company would plausibly be hiring for right now, based on its industry and size.

Give your best realistic answer for every field from what you already know about each company - do not say you lack live access or leave a field empty just because you cannot browse the web right now.

Respond with exactly ${companies.length} results, one per company, in the same order as listed above, keeping each company's companyName exactly as given.`
}
