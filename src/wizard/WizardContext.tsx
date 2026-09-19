import { useRouter } from 'next/navigation'
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  type ReactNode,
} from 'react'
import { useAuth } from '../auth/AuthContext'
import { encryptJSON } from '../lib/crypto'
import { supabase } from '../lib/supabaseClient'
import {
  initialWizardState,
  STEP_ROUTES,
  TOTAL_STEPS,
  type Company,
  type CompanyPrep,
  type ContactInfo,
  type Education,
  type FairProfile,
  type TargetPosition,
  type WizardState,
  type WorkExperience,
} from './types'

/** Debounce so we don't hit the database on every keystroke. */
const AUTOSAVE_DELAY_MS = 1500

type Action =
  | { type: 'GO_TO_STEP'; step: number }
  | { type: 'RESUME_FILE_SELECTED'; fileName: string }
  | { type: 'RESUME_PARSING' }
  | {
      type: 'RESUME_PARSED'
      contact: ContactInfo
      major: string
      gradYear: string
      skills: string[]
      interests: string[]
      experience: WorkExperience[]
      education: Education[]
    }
  | { type: 'SET_TARGET_POSITION'; position: TargetPosition }
  | { type: 'SET_PROFILE_FIELD'; field: 'major' | 'gradYear'; value: string }
  | { type: 'ADD_SKILL'; skill: string }
  | { type: 'REMOVE_SKILL'; skill: string }
  | { type: 'ADD_INTEREST'; interest: string }
  | { type: 'REMOVE_INTEREST'; interest: string }
  | { type: 'ADD_EXPERIENCE' }
  | { type: 'UPDATE_EXPERIENCE'; id: string; patch: Partial<Omit<WorkExperience, 'id'>> }
  | { type: 'REMOVE_EXPERIENCE'; id: string }
  | { type: 'ADD_EDUCATION' }
  | { type: 'UPDATE_EDUCATION'; id: string; patch: Partial<Omit<Education, 'id'>> }
  | { type: 'REMOVE_EDUCATION'; id: string }
  | { type: 'SET_FAIR_FIELD'; field: 'name' | 'date' | 'location'; value: string }
  | { type: 'SET_MAP_FILE'; fileName: string }
  | { type: 'SET_COMPANY_LIST_FILE'; fileName: string }
  | { type: 'SET_COMPANY_DIRECTORY_TEXT'; value: string }
  | { type: 'FAIR_ANALYZING' }
  | { type: 'COMPANIES_MATCHED'; companies: Company[] }
  | { type: 'TOGGLE_COMPANY_SELECTION'; id: string }
  | { type: 'PREP_GENERATED'; prep: Record<string, CompanyPrep> }
  | { type: 'ENTER_FAIR_MODE' }
  | { type: 'EXIT_FAIR_MODE' }
  | { type: 'MARK_VISITED'; id: string }
  | { type: 'SET_NOTE'; id: string; note: string }

function getActiveFair(state: WizardState): FairProfile | undefined {
  return state.fairProfiles.find((fair) => fair.id === state.activeFairId)
}

/** Applies `updater` to the active fair profile and returns it swapped back into the array. No-ops if there's no active fair (shouldn't happen in practice). */
function updateActiveFair(state: WizardState, updater: (fair: FairProfile) => FairProfile): WizardState {
  const index = state.fairProfiles.findIndex((fair) => fair.id === state.activeFairId)
  if (index === -1) return state
  const fairProfiles = [...state.fairProfiles]
  fairProfiles[index] = updater(fairProfiles[index])
  return { ...state, fairProfiles }
}

function reducer(state: WizardState, action: Action): WizardState {
  switch (action.type) {
    case 'GO_TO_STEP':
      return { ...state, step: Math.min(Math.max(action.step, 1), TOTAL_STEPS) }

    case 'RESUME_FILE_SELECTED':
      return {
        ...state,
        resume: { ...state.resume, fileName: action.fileName, status: 'idle' },
      }
    case 'RESUME_PARSING':
      return { ...state, resume: { ...state.resume, status: 'working' } }
    case 'RESUME_PARSED':
      return {
        ...state,
        resume: {
          ...state.resume,
          status: 'done',
          contact: action.contact,
          extractedSkills: action.skills,
        },
        profile: {
          ...state.profile,
          major: action.major || state.profile.major,
          gradYear: action.gradYear || state.profile.gradYear,
          skills: action.skills,
          interests: action.interests,
          experience: action.experience,
          education: action.education,
        },
      }
    case 'SET_TARGET_POSITION':
      return { ...state, resume: { ...state.resume, targetPosition: action.position } }

    case 'SET_PROFILE_FIELD':
      return { ...state, profile: { ...state.profile, [action.field]: action.value } }
    case 'ADD_SKILL':
      if (state.profile.skills.includes(action.skill)) return state
      return { ...state, profile: { ...state.profile, skills: [...state.profile.skills, action.skill] } }
    case 'REMOVE_SKILL':
      return {
        ...state,
        profile: { ...state.profile, skills: state.profile.skills.filter((s) => s !== action.skill) },
      }
    case 'ADD_INTEREST':
      if (state.profile.interests.includes(action.interest)) return state
      return {
        ...state,
        profile: { ...state.profile, interests: [...state.profile.interests, action.interest] },
      }
    case 'REMOVE_INTEREST':
      return {
        ...state,
        profile: {
          ...state.profile,
          interests: state.profile.interests.filter((i) => i !== action.interest),
        },
      }

    case 'ADD_EXPERIENCE':
      return {
        ...state,
        profile: {
          ...state.profile,
          experience: [
            ...state.profile.experience,
            {
              id: crypto.randomUUID(),
              jobTitle: '',
              company: '',
              location: '',
              current: false,
              startDate: '',
              endDate: '',
              description: '',
            },
          ],
        },
      }
    case 'UPDATE_EXPERIENCE':
      return {
        ...state,
        profile: {
          ...state.profile,
          experience: state.profile.experience.map((entry) => {
            if (entry.id !== action.id) return entry
            const merged = { ...entry, ...action.patch }
            // Checking "currently work here" makes an end date meaningless.
            if (merged.current) merged.endDate = ''
            return merged
          }),
        },
      }
    case 'REMOVE_EXPERIENCE':
      return {
        ...state,
        profile: { ...state.profile, experience: state.profile.experience.filter((e) => e.id !== action.id) },
      }

    case 'ADD_EDUCATION':
      return {
        ...state,
        profile: {
          ...state.profile,
          education: [
            ...state.profile.education,
            {
              id: crypto.randomUUID(),
              university: '',
              degree: '',
              fieldOfStudy: '',
              gpa: '',
              startDate: '',
              expectedGradDate: '',
            },
          ],
        },
      }
    case 'UPDATE_EDUCATION':
      return {
        ...state,
        profile: {
          ...state.profile,
          education: state.profile.education.map((entry) =>
            entry.id === action.id ? { ...entry, ...action.patch } : entry,
          ),
        },
      }
    case 'REMOVE_EDUCATION':
      return {
        ...state,
        profile: { ...state.profile, education: state.profile.education.filter((e) => e.id !== action.id) },
      }

    case 'SET_FAIR_FIELD':
      return updateActiveFair(state, (fair) => ({ ...fair, [action.field]: action.value }))
    case 'SET_MAP_FILE':
      return updateActiveFair(state, (fair) => ({ ...fair, mapFileName: action.fileName }))
    case 'SET_COMPANY_LIST_FILE':
      return updateActiveFair(state, (fair) => ({ ...fair, companyListFileName: action.fileName }))
    case 'SET_COMPANY_DIRECTORY_TEXT':
      return updateActiveFair(state, (fair) => ({ ...fair, companyDirectoryText: action.value }))
    case 'FAIR_ANALYZING':
      return updateActiveFair(state, (fair) => ({ ...fair, ingestStatus: 'working' }))
    case 'COMPANIES_MATCHED':
      return updateActiveFair(state, (fair) => ({
        ...fair,
        ingestStatus: 'done',
        status: fair.status === 'draft' ? 'in-progress' : fair.status,
        companies: action.companies,
      }))

    case 'TOGGLE_COMPANY_SELECTION': {
      const activeFair = getActiveFair(state)
      if (!activeFair) return state
      const isSelected = activeFair.selectedCompanyIds.includes(action.id)
      return updateActiveFair(state, (fair) => ({
        ...fair,
        selectedCompanyIds: isSelected
          ? fair.selectedCompanyIds.filter((id) => id !== action.id)
          : [...fair.selectedCompanyIds, action.id],
      }))
    }

    case 'PREP_GENERATED':
      return updateActiveFair(state, (fair) => {
        const companyState = { ...fair.fairMode.companyState }
        for (const id of fair.selectedCompanyIds) {
          if (!companyState[id]) {
            companyState[id] = { visited: false, note: '', visitedAt: null }
          }
        }
        return {
          ...fair,
          prep: { ...fair.prep, ...action.prep },
          fairMode: { ...fair.fairMode, companyState },
        }
      })

    case 'ENTER_FAIR_MODE':
      return {
        ...updateActiveFair(state, (fair) => ({
          ...fair,
          fairMode: { ...fair.fairMode, active: true, startedAt: Date.now() },
        })),
        step: 6,
      }
    case 'EXIT_FAIR_MODE':
      return {
        ...updateActiveFair(state, (fair) => ({
          ...fair,
          fairMode: { ...fair.fairMode, active: false },
          status: 'completed',
        })),
        step: 5,
      }

    case 'MARK_VISITED':
      return updateActiveFair(state, (fair) => ({
        ...fair,
        fairMode: {
          ...fair.fairMode,
          companyState: {
            ...fair.fairMode.companyState,
            [action.id]: {
              ...fair.fairMode.companyState[action.id],
              visited: true,
              visitedAt: Date.now(),
            },
          },
        },
      }))
    case 'SET_NOTE':
      return updateActiveFair(state, (fair) => ({
        ...fair,
        fairMode: {
          ...fair.fairMode,
          companyState: {
            ...fair.fairMode.companyState,
            [action.id]: {
              ...fair.fairMode.companyState[action.id],
              note: action.note,
            },
          },
        },
      }))

    default:
      return state
  }
}

interface WizardContextValue {
  state: WizardState
  dispatch: React.Dispatch<Action>
  goNext: () => void
  goBack: () => void
}

const WizardContext = createContext<WizardContextValue | null>(null)

/**
 * Guards against a saved profile from before experience/education became
 * structured objects (it used to be `experience: string[]` plus a separate
 * `leadership: string[]`) - merging that shape in as-is would satisfy the
 * "array exists" check but crash the new UI reading `.jobTitle`/`.university`
 * off of what are actually plain strings. Drop anything that doesn't look
 * like the current shape rather than trusting old saved data blindly.
 */
function sanitizeExperience(value: unknown): WorkExperience[] {
  if (!Array.isArray(value)) return []
  return value.filter(
    (item): item is WorkExperience =>
      typeof item === 'object' && item !== null && typeof (item as WorkExperience).id === 'string' && typeof (item as WorkExperience).jobTitle === 'string',
  )
}

function sanitizeEducation(value: unknown): Education[] {
  if (!Array.isArray(value)) return []
  return value.filter(
    (item): item is Education =>
      typeof item === 'object' && item !== null && typeof (item as Education).id === 'string' && typeof (item as Education).university === 'string',
  )
}

/**
 * Migrates a saved WizardState from before multi-fair support - it used to
 * hold a single top-level fair/companies/selectedCompanyIds/prep/fairMode
 * instead of a fairProfiles array - into the new shape, preserving whatever
 * progress that one fair had. Falls back to the default empty fair if the
 * saved data doesn't look like either shape.
 */
function migrateFairProfiles(
  initialState: Partial<WizardState> & Record<string, unknown>,
): { fairProfiles: FairProfile[]; activeFairId: string | null } {
  if (Array.isArray(initialState.fairProfiles) && initialState.fairProfiles.length > 0) {
    const fairProfiles = initialState.fairProfiles.filter(
      (item): item is FairProfile =>
        typeof item === 'object' && item !== null && typeof (item as FairProfile).id === 'string',
    )
    if (fairProfiles.length > 0) {
      const activeFairId =
        typeof initialState.activeFairId === 'string' &&
        fairProfiles.some((fair) => fair.id === initialState.activeFairId)
          ? initialState.activeFairId
          : fairProfiles[0].id
      return { fairProfiles, activeFairId }
    }
  }

  const legacyFair = initialState.fair as
    | {
        eventName?: string
        date?: string
        location?: string
        mapFileName?: string | null
        companyListFileName?: string | null
        companyDirectoryText?: string
        status?: FairProfile['ingestStatus']
      }
    | undefined
  if (legacyFair) {
    const migrated: FairProfile = {
      id: 'legacy',
      name: legacyFair.eventName ?? '',
      date: legacyFair.date ?? '',
      location: legacyFair.location ?? '',
      targetPosition:
        (initialState.resume as { targetPosition?: TargetPosition } | undefined)?.targetPosition ?? 'internship',
      status: 'draft',
      mapFileName: legacyFair.mapFileName ?? null,
      companyListFileName: legacyFair.companyListFileName ?? null,
      companyDirectoryText: legacyFair.companyDirectoryText ?? '',
      ingestStatus: legacyFair.status ?? 'idle',
      companies: Array.isArray(initialState.companies) ? (initialState.companies as Company[]) : [],
      selectedCompanyIds: Array.isArray(initialState.selectedCompanyIds)
        ? (initialState.selectedCompanyIds as string[])
        : [],
      prep: (initialState.prep as Record<string, CompanyPrep>) ?? {},
      fairMode: (initialState.fairMode as FairProfile['fairMode']) ?? {
        active: false,
        startedAt: null,
        companyState: {},
      },
    }
    return { fairProfiles: [migrated], activeFairId: migrated.id }
  }

  return { fairProfiles: initialWizardState.fairProfiles, activeFairId: initialWizardState.activeFairId }
}

interface WizardProviderProps {
  children: ReactNode
  /** Decrypted state from sign-in, to resume where the user left off. */
  initialState?: Partial<WizardState> | null
}

export function WizardProvider({ children, initialState }: WizardProviderProps) {
  const router = useRouter()
  const [state, dispatch] = useReducer(
    reducer,
    initialState
      ? {
          ...initialWizardState,
          ...initialState,
          // Shallow-merging the top level isn't enough: a saved profile/resume/fair
          // object from before a schema change (e.g. adding experience/leadership)
          // would fully replace these defaults and leave newer fields undefined.
          resume: { ...initialWizardState.resume, ...initialState.resume },
          profile: {
            ...initialWizardState.profile,
            ...initialState.profile,
            experience: sanitizeExperience(initialState.profile?.experience),
            education: sanitizeEducation(initialState.profile?.education),
          },
          ...migrateFairProfiles(initialState as Partial<WizardState> & Record<string, unknown>),
        }
      : initialWizardState,
  )
  const { session, encryptionKey } = useAuth()

  // Auto-save: encrypt the whole wizard state client-side and upsert the
  // ciphertext whenever it changes, debounced. The server only ever sees
  // opaque bytes - see src/lib/crypto.ts and supabase/schema.sql.
  useEffect(() => {
    if (!session?.user || !encryptionKey) return

    const timeout = setTimeout(async () => {
      try {
        const { ciphertext, iv } = await encryptJSON(encryptionKey, state)
        const { error } = await supabase
          .from('profiles')
          .update({ ciphertext, iv, updated_at: new Date().toISOString() })
          .eq('user_id', session.user.id)
        if (error) console.warn('Failed to save encrypted profile:', error)
      } catch (error) {
        console.warn('Failed to encrypt/save profile:', error)
      }
    }, AUTOSAVE_DELAY_MS)

    return () => clearTimeout(timeout)
  }, [state, session, encryptionKey])

  const goNext = useCallback(() => {
    const nextStep = Math.min(state.step + 1, TOTAL_STEPS)
    dispatch({ type: 'GO_TO_STEP', step: nextStep })
    router.push(STEP_ROUTES[nextStep] ?? STEP_ROUTES[1])
  }, [state.step, router])

  const goBack = useCallback(() => {
    const prevStep = Math.max(state.step - 1, 1)
    dispatch({ type: 'GO_TO_STEP', step: prevStep })
    router.push(STEP_ROUTES[prevStep] ?? STEP_ROUTES[1])
  }, [state.step, router])

  const value = useMemo(() => ({ state, dispatch, goNext, goBack }), [state, goNext, goBack])

  return <WizardContext.Provider value={value}>{children}</WizardContext.Provider>
}

export function useWizard() {
  const ctx = useContext(WizardContext)
  if (!ctx) throw new Error('useWizard must be used within a WizardProvider')
  return ctx
}

/** The fair profile Steps 3-6 currently read/write. Always exists - one is seeded by default and every migration path guarantees at least one. */
export function useActiveFair(): FairProfile {
  const { state } = useWizard()
  const fair = state.fairProfiles.find((f) => f.id === state.activeFairId)
  if (!fair) throw new Error('No active fair profile - fairProfiles should never be empty')
  return fair
}
