export type TargetPosition = 'internship' | 'fulltime'
export type AsyncStatus = 'idle' | 'working' | 'done'
export type SpeechStyle = 'concise' | 'enthusiastic' | 'technical' | 'custom'
export type AcademicStanding = 'Freshman' | 'Sophomore' | 'Junior' | 'Senior' | 'Graduate'

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
  academicStanding: AcademicStanding
  speechStyle: SpeechStyle
  /** 1-2 sentences of the user's own writing/speech, pasted in to help pitches sound like them instead of generic AI. */
  voiceSample: string
}

export interface Booth {
  boothNumber: string
  companyName: string
  /**
   * Only populated when the source exhibitor directory explicitly states
   * this - Gemini is instructed never to guess it. An empty array means
   * "not stated," not "accepts everyone."
   */
  acceptedStandings: AcademicStanding[]
  /** Empty string when not explicitly stated in the source directory. */
  citizenshipRequirement: string
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
  /** See Booth.acceptedStandings - empty means not stated in the source directory. */
  acceptedStandings: AcademicStanding[]
  citizenshipRequirement: string
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

/** Draft: created but no companies matched yet. In progress: matched, not yet fully worked. Completed: fair mode was entered and exited. */
export type FairStatus = 'draft' | 'in-progress' | 'completed'

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
  status: FairStatus
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
  step: number
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
    status: 'draft',
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

export const TOTAL_STEPS = 6

/** Maps each wizard step to its real route, for goNext/goBack navigation. */
export const STEP_ROUTES: Record<number, string> = {
  1: '/upload',
  2: '/profile',
  3: '/fair',
  4: '/matches',
  5: '/briefs',
  6: '/fair-mode',
}

export const initialWizardState: WizardState = {
  step: 1,
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
    academicStanding: 'Freshman',
    speechStyle: 'concise',
    voiceSample: '',
  },
  // Seeded with one fair so the existing single-fair flow (Steps 3-6) keeps
  // working unchanged until the dashboard UI for managing several exists.
  // A fixed id (not crypto.randomUUID()) keeps this module-level constant
  // deterministic between server/client evaluations.
  fairProfiles: [createFairProfile({ id: 'default', name: '' })],
  activeFairId: 'default',
}
