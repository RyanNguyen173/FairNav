export type TargetPosition = 'internship' | 'fulltime'
export type ExperienceLevel = 'no-experience' | 'some-experience' | 'experienced'
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

export interface ProfileData {
  major: string
  gradYear: string
  experienceLevel: ExperienceLevel
  skills: string[]
  interests: string[]
  /** One line per role/internship/project, e.g. "Software Engineering Intern @ Acme (2024)". */
  experience: string[]
  /** One line per leadership/extracurricular role, e.g. "President, Robotics Club". */
  leadership: string[]
}

export interface FairData {
  eventName: string
  date: string
  location: string
  mapFileName: string | null
  companyListFileName: string | null
  companyDirectoryText: string
  status: AsyncStatus
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

export interface WizardState {
  step: number
  resume: ResumeData
  profile: ProfileData
  fair: FairData
  companies: Company[]
  selectedCompanyIds: string[]
  prep: Record<string, CompanyPrep>
  fairMode: {
    active: boolean
    startedAt: number | null
    companyState: Record<string, FairModeCompanyState>
  }
}

export const TOTAL_STEPS = 6

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
    experienceLevel: 'some-experience',
    skills: [],
    interests: [],
    experience: [],
    leadership: [],
  },
  fair: {
    eventName: '',
    date: '',
    location: '',
    mapFileName: null,
    companyListFileName: null,
    companyDirectoryText: '',
    status: 'idle',
  },
  companies: [],
  selectedCompanyIds: [],
  prep: {},
  fairMode: {
    active: false,
    startedAt: null,
    companyState: {},
  },
}
