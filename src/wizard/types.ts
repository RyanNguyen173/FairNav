export type TargetPosition = 'internship' | 'fulltime'
export type AsyncStatus = 'idle' | 'working' | 'done'

export interface ContactInfo {
  fullName: string
  email: string
  phone: string
  university: string
}

export interface ResumeData {
  fileName: string | null
  status: AsyncStatus
  contact: ContactInfo
  extractedSkills: string[]
  targetPosition: TargetPosition
}

export interface WorkExperience {
  id: string
  jobTitle: string
  company: string
  location: string
  /** When true, endDate is meaningless and should be ignored/blank. */
  current: boolean
  /** MM/YYYY */
  startDate: string
  /** MM/YYYY, blank when `current` is true. */
  endDate: string
  description: string
}

export interface Education {
  id: string
  university: string
  degree: string
  fieldOfStudy: string
  gpa: string
  /** MM/YYYY */
  startDate: string
  /** MM/YYYY */
  expectedGradDate: string
}

export interface ProfileData {
  major: string
  gradYear: string
  skills: string[]
  interests: string[]
  experience: WorkExperience[]
  education: Education[]
}

export interface Booth {
  boothNumber: string
  companyName: string
}

export interface Company {
  id: string
  companyName: string
  boothNumber: string
  summary: string
  openRoles: string[]
  /** 0-100 coordinates on the booth map */
  x: number
  y: number
  /** 0-100, computed once companies are matched against the profile */
  matchScore: number
}

export interface CompanyPrep {
  elevatorPitch: string
  questions: string[]
}

export interface FairModeCompanyState {
  visited: boolean
  note: string
  visitedAt: number | null
}

/**
 * Not stored - derived from live data wherever it's shown (see
 * computeFairStatus in src/home/FairBoard.tsx) so it can never drift out of
 * sync with the fair's actual progress. In progress: the default, from the
 * moment a fair is created. Completed: every selected company has been
 * marked visited.
 */
export type FairStatus = 'in-progress' | 'completed'

/**
 * One saved career fair a student is (or was) preparing for - their own
 * directory, matched companies, pitch prep, and live fair-mode progress.
 * A student can have several of these, reusing the same base profile
 * (resume/skills/experience/education) across all of them.
 */
export interface FairProfile {
  id: string
  name: string
  date: string
  location: string
  targetPosition: TargetPosition
  mapFileName: string | null
  companyListFileName: string | null
  companyDirectoryText: string
  ingestStatus: AsyncStatus
  companies: Company[]
  selectedCompanyIds: string[]
  prep: Record<string, CompanyPrep>
  fairMode: {
    active: boolean
    startedAt: number | null
    companyState: Record<string, FairModeCompanyState>
  }
}

export interface WizardState {
  resume: ResumeData
  profile: ProfileData
  fairProfiles: FairProfile[]
  activeFairId: string | null
}

/** Creates a fresh, empty fair profile - used both to seed initial state and by the dashboard's "create new fair" flow. */
export function createFairProfile(overrides: {
  id: string
  name: string
  date?: string
  location?: string
  targetPosition?: TargetPosition
}): FairProfile {
  return {
    id: overrides.id,
    name: overrides.name,
    date: overrides.date ?? '',
    location: overrides.location ?? '',
    targetPosition: overrides.targetPosition ?? 'internship',
    mapFileName: null,
    companyListFileName: null,
    companyDirectoryText: '',
    ingestStatus: 'idle',
    companies: [],
    selectedCompanyIds: [],
    prep: {},
    fairMode: {
      active: false,
      startedAt: null,
      companyState: {},
    },
  }
}

export const initialWizardState: WizardState = {
  resume: {
    fileName: null,
    status: 'idle',
    contact: { fullName: '', email: '', phone: '', university: '' },
    extractedSkills: [],
    targetPosition: 'internship',
  },
  profile: {
    major: '',
    gradYear: '',
    skills: [],
    interests: [],
    experience: [],
    education: [],
  },
  // Seeded with one fair so a brand-new account always has something to
  // show on the Fair Board. A fixed id (not crypto.randomUUID()) keeps this
  // module-level constant deterministic between server/client evaluations.
  fairProfiles: [createFairProfile({ id: 'default', name: '' })],
  activeFairId: 'default',
}
