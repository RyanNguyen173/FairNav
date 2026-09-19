import type {
  AcademicStanding,
  Company,
  CompanyPrep,
  ContactInfo,
  Education,
  ProfileData,
  WorkExperience,
} from './types'

const MAJOR_POOL = [
  'Computer Science',
  'Mechanical Engineering',
  'Electrical Engineering',
  'Data Science',
  'Industrial Engineering',
  'Business Administration',
]

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

/**
 * Curated from common O*NET/ESCO skill-taxonomy categories (programming,
 * data/ML, cloud, design, hardware, business, and general professional
 * skills) rather than a live API call - keeps the autocomplete instant and
 * offline-capable instead of adding network latency/rate limits to typing.
 */
export const SKILL_POOL = [
  // Programming languages
  'Python',
  'Java',
  'JavaScript',
  'TypeScript',
  'C++',
  'C',
  'C#',
  'Go',
  'Rust',
  'Swift',
  'Kotlin',
  'R',
  'MATLAB',
  'SQL',
  'HTML/CSS',
  'PHP',
  'Ruby',
  'Scala',
  // Web & app frameworks
  'React',
  'Angular',
  'Vue.js',
  'Node.js',
  'Next.js',
  'Django',
  'Flask',
  'Spring Boot',
  '.NET',
  'React Native',
  'Flutter',
  // Data & machine learning
  'Data Analysis',
  'Machine Learning',
  'Deep Learning',
  'Natural Language Processing',
  'Computer Vision',
  'Data Visualization',
  'Statistical Analysis',
  'Data Engineering',
  'ETL Pipelines',
  'Pandas',
  'NumPy',
  'TensorFlow',
  'PyTorch',
  'Scikit-learn',
  'Tableau',
  'Power BI',
  'A/B Testing',
  // Cloud & DevOps
  'AWS',
  'Azure',
  'Google Cloud Platform',
  'Docker',
  'Kubernetes',
  'CI/CD',
  'Git',
  'Linux',
  'Terraform',
  'System Design',
  // Design
  'Figma',
  'Adobe Photoshop',
  'Adobe Illustrator',
  'Adobe XD',
  'Sketch',
  'UX Research',
  'UI Design',
  'Wireframing',
  'Prototyping',
  'Graphic Design',
  // Engineering & hardware
  'CAD',
  'SolidWorks',
  'AutoCAD',
  'Circuit Design',
  'PCB Design',
  'Embedded Systems',
  'Robotics',
  '3D Printing',
  'Simulink',
  'FEA Analysis',
  'Six Sigma',
  'Lean Manufacturing',
  // Business & finance
  'Excel Modeling',
  'Financial Modeling',
  'Valuation',
  'Accounting',
  'Bloomberg Terminal',
  'SAP',
  'Salesforce',
  'HubSpot',
  'QuickBooks',
  'Market Research',
  'Business Development',
  // Professional & soft skills
  'Project Management',
  'Public Speaking',
  'Leadership',
  'Negotiation',
  'Written Communication',
  'Customer Service',
  'Cross-functional Collaboration',
  'Agile/Scrum',
  'Problem Solving',
  'Critical Thinking',
  'Time Management',
  // Life sciences
  'Lab Techniques',
  'PCR',
  'Cell Culture',
  'Clinical Research',
  'Biostatistics',
  'CRISPR',
  // Legal & policy
  'Legal Research',
  'Contract Drafting',
  'Policy Analysis',
]

export const INTEREST_POOL = [
  'Software Engineering',
  'Product Management',
  'Data Science',
  'Machine Learning & AI',
  'UX/UI Design',
  'Hardware Engineering',
  'Robotics',
  'Cybersecurity',
  'Cloud Computing',
  'DevOps',
  'Finance',
  'Investment Banking',
  'Private Equity',
  'Venture Capital',
  'Accounting',
  'Consulting',
  'Management Consulting',
  'Marketing',
  'Sales',
  'Business Development',
  'Human Resources',
  'Supply Chain Management',
  'Operations',
  'Manufacturing',
  'Biotechnology',
  'Pharmaceuticals',
  'Healthcare',
  'Medical Devices',
  'Nonprofit Impact',
  'Sustainability',
  'Clean Energy',
  'Aerospace',
  'Automotive',
  'Telecommunications',
  'Retail',
  'E-commerce',
  'Real Estate',
  'Insurance',
  'Legal',
  'Education',
  'Government & Public Policy',
  'Media & Entertainment',
  'Gaming',
  'Hospitality & Tourism',
  'Agriculture',
  'Construction',
  'Energy & Oil',
  'Transportation & Logistics',
  'Fintech',
  'Edtech',
  'Healthtech',
  'Semiconductors',
  'Materials Science',
  'Chemical Engineering',
  'Civil Engineering',
  'Architecture',
  'Journalism',
  'Public Relations',
  'International Development',
  'Social Impact',
  'Quality Assurance',
  'Research & Development',
]

const JOB_TITLE_POOL = [
  'Software Engineering Intern',
  'Data Analyst Co-op',
  'Research Assistant',
  'Teaching Assistant',
  'Product Design Intern',
  'Business Operations Intern',
]

const EMPLOYER_POOL = [
  'Northwind Analytics',
  'Cascade Health Collective',
  'Studio Halcyon',
  'Fablink Robotics',
  'Brightloop',
  'Verdant Finance',
]

const JOB_LOCATION_POOL = ['Seattle, WA', 'Austin, TX', 'San Jose, CA', 'Remote', 'Atlanta, GA', 'Chicago, IL']

const DEGREE_POOL = ['Bachelor of Science', 'Bachelor of Arts']

function mmYyyy(month: number, year: number) {
  return `${String(month).padStart(2, '0')}/${year}`
}

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
  major: string
  gradYear: string
  skills: string[]
  interests: string[]
  experience: WorkExperience[]
  education: Education[]
}

function randomExperienceEntry(mostRecent: boolean): WorkExperience {
  const jobTitle = randomFrom(JOB_TITLE_POOL)
  const company = randomFrom(EMPLOYER_POOL)
  const startYear = 2023 + Math.floor(Math.random() * 2)
  const startMonth = 1 + Math.floor(Math.random() * 9)
  const current = mostRecent && Math.random() < 0.5
  const endMonth = Math.min(12, startMonth + 2 + Math.floor(Math.random() * 3))

  return {
    id: crypto.randomUUID(),
    jobTitle,
    company,
    location: randomFrom(JOB_LOCATION_POOL),
    current,
    startDate: mmYyyy(startMonth, startYear),
    endDate: current ? '' : mmYyyy(endMonth, startYear),
    description: `Contributed to ${jobTitle.toLowerCase()} projects at ${company}, collaborating cross-functionally to ship work and improve team processes.`,
  }
}

function randomEducationEntry(): Education {
  return {
    id: crypto.randomUUID(),
    university: randomFrom(UNIVERSITY_POOL),
    degree: randomFrom(DEGREE_POOL),
    fieldOfStudy: randomFrom(MAJOR_POOL),
    gpa: Math.min(4, 3 + Math.random()).toFixed(2),
    startDate: mmYyyy(9, 2022),
    expectedGradDate: mmYyyy(5, 2026 + Math.floor(Math.random() * 3)),
  }
}

/** Simulates extracting contact info, skills, experience, and education from an uploaded PDF/DOCX. */
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
    major: randomFrom(MAJOR_POOL),
    gradYear: String(2026 + Math.floor(Math.random() * 4)),
    skills: pickRandom(SKILL_POOL, 5),
    interests: pickRandom(INTEREST_POOL, 3),
    experience: [randomExperienceEntry(false), randomExperienceEntry(true)],
    education: [randomEducationEntry()],
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

interface CompanyTemplate {
  name: string
  industry: string
  skillTags: string[]
  openRoles: string[]
  overview: string
  acceptedStandings: AcademicStanding[]
  citizenshipRequirement: string
}

const DEMO_COMPANY_POOL: CompanyTemplate[] = [
  {
    name: 'Northwind Analytics',
    industry: 'Data Science',
    skillTags: ['Python', 'SQL', 'Machine Learning', 'Data Analysis'],
    openRoles: ['Data Analyst Intern', 'ML Engineer I'],
    overview: 'Builds forecasting tools for logistics and supply chain teams.',
    acceptedStandings: ['Sophomore', 'Junior', 'Senior'],
    citizenshipRequirement: '',
  },
  {
    name: 'Cascade Health Collective',
    industry: 'Health & Social Impact',
    skillTags: ['Data Analysis', 'Public Speaking', 'Project Management'],
    openRoles: ['Program Analyst', 'Community Health Fellow'],
    overview: 'Nonprofit expanding access to preventive care in underserved counties.',
    acceptedStandings: ['Freshman', 'Sophomore', 'Junior', 'Senior', 'Graduate'],
    citizenshipRequirement: '',
  },
  {
    name: 'Fablink Robotics',
    industry: 'Hardware',
    skillTags: ['CAD', 'C++', 'Circuit Design'],
    openRoles: ['Hardware Engineering Intern', 'Firmware Engineer I'],
    overview: 'Designs modular robotic arms for small manufacturing lines.',
    acceptedStandings: ['Junior', 'Senior'],
    citizenshipRequirement: 'US Citizenship required (export-controlled hardware).',
  },
  {
    name: 'Brightloop',
    industry: 'Software Engineering',
    skillTags: ['React', 'Python', 'SQL'],
    openRoles: ['Software Engineer Intern', 'Full-Stack Engineer I'],
    overview: 'B2B scheduling platform used by 4,000+ small clinics.',
    acceptedStandings: ['Sophomore', 'Junior', 'Senior'],
    citizenshipRequirement: '',
  },
  {
    name: 'Verdant Finance',
    industry: 'Finance',
    skillTags: ['Excel Modeling', 'Data Analysis', 'Project Management'],
    openRoles: ['Finance Rotational Intern', 'Associate Analyst'],
    overview: 'Impact-investing firm funding climate-resilient infrastructure.',
    acceptedStandings: ['Junior', 'Senior', 'Graduate'],
    citizenshipRequirement: '',
  },
  {
    name: 'Studio Halcyon',
    industry: 'UX Design',
    skillTags: ['Figma', 'UX Research', 'React'],
    openRoles: ['Product Design Intern', 'UX Researcher I'],
    overview: 'Design consultancy for civic and accessibility-first products.',
    acceptedStandings: ['Freshman', 'Sophomore', 'Junior', 'Senior'],
    citizenshipRequirement: '',
  },
  {
    name: 'Kestrel Aerospace',
    industry: 'Hardware Engineering',
    skillTags: ['CAD', 'Circuit Design', 'C++'],
    openRoles: ['Systems Engineering Intern', 'Avionics Engineer I'],
    overview: 'Small-satellite components for university and commercial launches.',
    acceptedStandings: ['Junior', 'Senior', 'Graduate'],
    citizenshipRequirement: 'US Citizenship required for ITAR-controlled roles.',
  },
  {
    name: 'Openhand Foundation',
    industry: 'Nonprofit Impact',
    skillTags: ['Public Speaking', 'Project Management', 'Salesforce'],
    openRoles: ['Development Associate', 'Program Coordinator'],
    overview: 'Runs literacy and job-readiness programs in six U.S. cities.',
    acceptedStandings: ['Freshman', 'Sophomore', 'Junior', 'Senior', 'Graduate'],
    citizenshipRequirement: '',
  },
  {
    name: 'Marrow Labs',
    industry: 'Machine Learning',
    skillTags: ['Machine Learning', 'Python', 'Data Analysis'],
    openRoles: ['ML Research Intern', 'Applied Scientist I'],
    overview: 'Early-stage startup building diagnostic imaging models.',
    acceptedStandings: ['Senior', 'Graduate'],
    citizenshipRequirement: '',
  },
  {
    name: 'Pinewell Consulting',
    industry: 'Consulting',
    skillTags: ['Project Management', 'Excel Modeling', 'Public Speaking'],
    openRoles: ['Summer Associate', 'Business Analyst'],
    overview: 'Strategy consulting for mid-market healthcare and education clients.',
    acceptedStandings: ['Junior', 'Senior'],
    citizenshipRequirement: '',
  },
  {
    name: 'Glidepath Mobility',
    industry: 'Software Engineering',
    skillTags: ['Java', 'SQL', 'Project Management'],
    openRoles: ['Software Engineer Intern', 'QA Engineer I'],
    overview: 'Builds accessible trip-planning software for transit agencies.',
    acceptedStandings: ['Sophomore', 'Junior', 'Senior'],
    citizenshipRequirement: '',
  },
  {
    name: 'Solace Financial',
    industry: 'Finance',
    skillTags: ['Excel Modeling', 'Salesforce', 'Data Analysis'],
    openRoles: ['Analyst Intern', 'Client Operations Associate'],
    overview: 'Fintech offering low-fee banking for gig and hourly workers.',
    acceptedStandings: ['Junior', 'Senior', 'Graduate'],
    citizenshipRequirement: '',
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

/** Simulates the "parse directory + rank companies" steps combined. */
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
      companyName: template.name,
      boothNumber: String(index + 1).padStart(2, '0'),
      summary: template.overview,
      openRoles: template.openRoles,
      x,
      y,
      matchScore: computeMatchScore(profile, template),
      acceptedStandings: template.acceptedStandings,
      citizenshipRequirement: template.citizenshipRequirement,
    }
  }).sort((a, b) => b.matchScore - a.matchScore)
}

function computeMatchScore(profile: ProfileData, template: CompanyTemplate): number {
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
  const anchorSkill = profile.skills[0] ?? 'hands-on project work'
  const secondSkill = profile.skills[1] ?? 'cross-functional teamwork'
  const interestAnchor = profile.interests[0] ?? 'this space'

  const elevatorPitch = `My background in ${anchorSkill} lines up well with what ${company.companyName} is doing — ${company.summary} I've also worked with ${secondSkill}, which maps to the ${company.openRoles[0] ?? 'open role'} you're hiring for, and as a ${profile.major || 'student'} graduating ${profile.gradYear || 'soon'}, I'm looking for a team where I can keep growing in ${interestAnchor.toLowerCase()}.`

  const questions = [
    `What does a strong first 90 days look like for someone in the ${company.openRoles[0] ?? 'open'} role?`,
    `How does ${company.companyName} support people moving deeper into ${interestAnchor.toLowerCase()}?`,
  ]

  return { elevatorPitch, questions }
}
