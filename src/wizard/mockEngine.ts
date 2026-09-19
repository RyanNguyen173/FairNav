import type {
  Company,
  CompanyPrep,
  ContactInfo,
  ProfileData,
} from './types'

/**
 * DEMO MODE.
 * Everything in this file simulates the resume parsing / company matching /
 * pitch generation that a real backend (PDF+DOCX text extraction, an LLM
 * call) will eventually do. It runs entirely client-side so the app has no
 * server dependency yet. Swap this module out when the real AI backend
 * lands — every function keeps the same signature a real implementation
 * would need.
 */

const NAME_POOL = [
  'Jordan Alvarez',
  'Priya Natarajan',
  'Wei Chen',
  'Amara Okafor',
  'Sofia Ramirez',
  'Ethan Park',
]

const UNIVERSITY_POOL = [
  'University of Washington',
  'San Jose State University',
  'Georgia Institute of Technology',
  'University of Illinois Urbana-Champaign',
  'Arizona State University',
]

const SKILL_POOL = [
  'Python',
  'React',
  'SQL',
  'Figma',
  'CAD',
  'Data Analysis',
  'Public Speaking',
  'Java',
  'Project Management',
  'Machine Learning',
  'UX Research',
  'C++',
  'Excel Modeling',
  'Circuit Design',
  'Salesforce',
]

const INTEREST_POOL = [
  'Software Engineering',
  'Product Management',
  'Data Science',
  'UX Design',
  'Hardware Engineering',
  'Finance',
  'Consulting',
  'Sustainability',
  'Nonprofit Impact',
  'Marketing',
]

function pickRandom<T>(pool: T[], count: number): T[] {
  const shuffled = [...pool].sort(() => Math.random() - 0.5)
  return shuffled.slice(0, count)
}

function randomFrom<T>(pool: T[]): T {
  return pool[Math.floor(Math.random() * pool.length)]
}

export function fakeDelay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export interface ParsedResume {
  contact: ContactInfo
  skills: string[]
}

/** Simulates extracting contact info + skills from an uploaded PDF/DOCX. */
export async function mockParseResume(file: File): Promise<ParsedResume> {
  await fakeDelay(1600)
  const baseName = file.name.replace(/\.(pdf|docx)$/i, '').replace(/[_-]/g, ' ')
  const looksLikeAName = /^[a-z]+\s+[a-z]+$/i.test(baseName.trim())
  const fullName = looksLikeAName ? toTitleCase(baseName.trim()) : randomFrom(NAME_POOL)
  const handle = fullName.toLowerCase().replace(/\s+/g, '.')

  return {
    contact: {
      fullName,
      email: `${handle}@university.edu`,
      phone: `(${randomDigits(3)}) ${randomDigits(3)}-${randomDigits(4)}`,
      university: randomFrom(UNIVERSITY_POOL),
    },
    skills: pickRandom(SKILL_POOL, 5),
  }
}

function toTitleCase(value: string) {
  return value
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

function randomDigits(length: number) {
  return Array.from({ length }, () => Math.floor(Math.random() * 10)).join('')
}

export function suggestedInterests(): string[] {
  return pickRandom(INTEREST_POOL, 6)
}

interface CompanyTemplate {
  name: string
  industry: string
  skillTags: string[]
  openRoles: string[]
  overview: string
}

const DEMO_COMPANY_POOL: CompanyTemplate[] = [
  {
    name: 'Northwind Analytics',
    industry: 'Data Science',
    skillTags: ['Python', 'SQL', 'Machine Learning', 'Data Analysis'],
    openRoles: ['Data Analyst Intern', 'ML Engineer I'],
    overview: 'Builds forecasting tools for logistics and supply chain teams.',
  },
  {
    name: 'Cascade Health Collective',
    industry: 'Health & Social Impact',
    skillTags: ['Data Analysis', 'Public Speaking', 'Project Management'],
    openRoles: ['Program Analyst', 'Community Health Fellow'],
    overview: 'Nonprofit expanding access to preventive care in underserved counties.',
  },
  {
    name: 'Fablink Robotics',
    industry: 'Hardware',
    skillTags: ['CAD', 'C++', 'Circuit Design'],
    openRoles: ['Hardware Engineering Intern', 'Firmware Engineer I'],
    overview: 'Designs modular robotic arms for small manufacturing lines.',
  },
  {
    name: 'Brightloop',
    industry: 'Software Engineering',
    skillTags: ['React', 'Python', 'SQL'],
    openRoles: ['Software Engineer Intern', 'Full-Stack Engineer I'],
    overview: 'B2B scheduling platform used by 4,000+ small clinics.',
  },
  {
    name: 'Verdant Finance',
    industry: 'Finance',
    skillTags: ['Excel Modeling', 'Data Analysis', 'Project Management'],
    openRoles: ['Finance Rotational Intern', 'Associate Analyst'],
    overview: 'Impact-investing firm funding climate-resilient infrastructure.',
  },
  {
    name: 'Studio Halcyon',
    industry: 'UX Design',
    skillTags: ['Figma', 'UX Research', 'React'],
    openRoles: ['Product Design Intern', 'UX Researcher I'],
    overview: 'Design consultancy for civic and accessibility-first products.',
  },
  {
    name: 'Kestrel Aerospace',
    industry: 'Hardware Engineering',
    skillTags: ['CAD', 'Circuit Design', 'C++'],
    openRoles: ['Systems Engineering Intern', 'Avionics Engineer I'],
    overview: 'Small-satellite components for university and commercial launches.',
  },
  {
    name: 'Openhand Foundation',
    industry: 'Nonprofit Impact',
    skillTags: ['Public Speaking', 'Project Management', 'Salesforce'],
    openRoles: ['Development Associate', 'Program Coordinator'],
    overview: 'Runs literacy and job-readiness programs in six U.S. cities.',
  },
  {
    name: 'Marrow Labs',
    industry: 'Machine Learning',
    skillTags: ['Machine Learning', 'Python', 'Data Analysis'],
    openRoles: ['ML Research Intern', 'Applied Scientist I'],
    overview: 'Early-stage startup building diagnostic imaging models.',
  },
  {
    name: 'Pinewell Consulting',
    industry: 'Consulting',
    skillTags: ['Project Management', 'Excel Modeling', 'Public Speaking'],
    openRoles: ['Summer Associate', 'Business Analyst'],
    overview: 'Strategy consulting for mid-market healthcare and education clients.',
  },
  {
    name: 'Glidepath Mobility',
    industry: 'Software Engineering',
    skillTags: ['Java', 'SQL', 'Project Management'],
    openRoles: ['Software Engineer Intern', 'QA Engineer I'],
    overview: 'Builds accessible trip-planning software for transit agencies.',
  },
  {
    name: 'Solace Financial',
    industry: 'Finance',
    skillTags: ['Excel Modeling', 'Salesforce', 'Data Analysis'],
    openRoles: ['Analyst Intern', 'Client Operations Associate'],
    overview: 'Fintech offering low-fee banking for gig and hourly workers.',
  },
]

export function boothCoordinatesForIndex(index: number, total: number) {
  const columns = Math.max(3, Math.ceil(Math.sqrt(total)))
  const row = Math.floor(index / columns)
  const col = index % columns
  const rows = Math.ceil(total / columns)
  const x = ((col + 0.5) / columns) * 82 + 9
  const y = ((row + 0.5) / Math.max(rows, 1)) * 78 + 10
  return { x, y }
}

/** Parses a pasted/uploaded company directory, falling back to demo data. */
export function buildCompanyDirectory(rawText: string, fileName: string | null): CompanyTemplate[] {
  const parsedNames = rawText
    .split(/\r?\n|,/)
    .map((line) => line.trim())
    .filter(Boolean)

  if (parsedNames.length === 0 && !fileName) {
    return DEMO_COMPANY_POOL
  }

  if (parsedNames.length === 0) {
    // A file was "uploaded" but we can't read binary CSV/PDF client-side in
    // demo mode — use the curated pool so the flow still feels real.
    return DEMO_COMPANY_POOL
  }

  return parsedNames.slice(0, 16).map((name, index) => {
    const template = DEMO_COMPANY_POOL[index % DEMO_COMPANY_POOL.length]
    return { ...template, name }
  })
}

/** Simulates the "analyze fair + match companies" step. */
export async function mockAnalyzeFair(
  rawText: string,
  fileName: string | null,
  profile: ProfileData,
): Promise<Company[]> {
  await fakeDelay(1800)
  const templates = buildCompanyDirectory(rawText, fileName)

  return templates.map((template, index) => {
    const { x, y } = boothCoordinatesForIndex(index, templates.length)
    return {
      id: `company-${index}-${template.name.replace(/\s+/g, '-').toLowerCase()}`,
      name: template.name,
      boothNumber: String(index + 1).padStart(2, '0'),
      overview: template.overview,
      openRoles: template.openRoles,
      skillTags: template.skillTags,
      industry: template.industry,
      x,
      y,
      matchPercent: computeMatchPercent(profile, template),
    }
  }).sort((a, b) => b.matchPercent - a.matchPercent)
}

function computeMatchPercent(profile: ProfileData, template: CompanyTemplate): number {
  const profileTags = new Set([...profile.skills, ...profile.interests].map((s) => s.toLowerCase()))
  const companyTags = new Set([
    ...template.skillTags,
    template.industry,
  ].map((s) => s.toLowerCase()))

  let overlap = 0
  for (const tag of companyTags) {
    if (profileTags.has(tag)) overlap += 1
  }

  const base = 46 + overlap * 13
  const jitter = Math.floor(Math.random() * 8)
  return Math.min(98, base + jitter)
}

/** Simulates generating a personalized elevator pitch + follow-up questions. */
export function mockGeneratePrep(profile: ProfileData, company: Company): CompanyPrep {
  const sharedSkills = profile.skills.filter((skill) =>
    company.skillTags.some((tag) => tag.toLowerCase() === skill.toLowerCase()),
  )
  const anchorSkill = sharedSkills[0] ?? profile.skills[0] ?? 'hands-on project work'
  const secondSkill = sharedSkills[1] ?? profile.skills[1] ?? 'cross-functional teamwork'

  const talkingPoints = [
    `My background in ${anchorSkill} lines up directly with ${company.name}'s work in ${company.industry.toLowerCase()} — I'd point to a project where I used it end to end.`,
    `I've also worked with ${secondSkill}, which maps to the ${company.openRoles[0] ?? 'open role'} you're hiring for.`,
    `As a ${profile.major || 'student'} graduating ${profile.gradYear || 'soon'}, I'm looking for a team where I can grow past ${profile.experienceLevel.replace('-', ' ')}.`,
  ]

  const interestAnchor = profile.interests[0] ?? company.industry

  const questions = [
    `What does a strong first 90 days look like for someone in the ${company.openRoles[0] ?? 'open'} role?`,
    `How does ${company.name} support people moving deeper into ${interestAnchor.toLowerCase()}?`,
  ]

  return { talkingPoints, questions }
}
