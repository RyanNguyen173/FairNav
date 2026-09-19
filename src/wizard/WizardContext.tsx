import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useReducer,
  type ReactNode,
} from 'react'
import {
  initialWizardState,
  TOTAL_STEPS,
  type Company,
  type CompanyPrep,
  type ContactInfo,
  type ExperienceLevel,
  type TargetPosition,
  type WizardState,
} from './types'

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
    }
  | { type: 'SET_TARGET_POSITION'; position: TargetPosition }
  | { type: 'SET_PROFILE_FIELD'; field: 'major' | 'gradYear'; value: string }
  | { type: 'SET_EXPERIENCE_LEVEL'; value: ExperienceLevel }
  | { type: 'ADD_SKILL'; skill: string }
  | { type: 'REMOVE_SKILL'; skill: string }
  | { type: 'ADD_INTEREST'; interest: string }
  | { type: 'REMOVE_INTEREST'; interest: string }
  | { type: 'SET_FAIR_FIELD'; field: 'eventName' | 'date' | 'location'; value: string }
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
        },
      }
    case 'SET_TARGET_POSITION':
      return { ...state, resume: { ...state.resume, targetPosition: action.position } }

    case 'SET_PROFILE_FIELD':
      return { ...state, profile: { ...state.profile, [action.field]: action.value } }
    case 'SET_EXPERIENCE_LEVEL':
      return { ...state, profile: { ...state.profile, experienceLevel: action.value } }
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

    case 'SET_FAIR_FIELD':
      return { ...state, fair: { ...state.fair, [action.field]: action.value } }
    case 'SET_MAP_FILE':
      return { ...state, fair: { ...state.fair, mapFileName: action.fileName } }
    case 'SET_COMPANY_LIST_FILE':
      return { ...state, fair: { ...state.fair, companyListFileName: action.fileName } }
    case 'SET_COMPANY_DIRECTORY_TEXT':
      return { ...state, fair: { ...state.fair, companyDirectoryText: action.value } }
    case 'FAIR_ANALYZING':
      return { ...state, fair: { ...state.fair, status: 'working' } }
    case 'COMPANIES_MATCHED':
      return {
        ...state,
        fair: { ...state.fair, status: 'done' },
        companies: action.companies,
      }

    case 'TOGGLE_COMPANY_SELECTION': {
      const isSelected = state.selectedCompanyIds.includes(action.id)
      return {
        ...state,
        selectedCompanyIds: isSelected
          ? state.selectedCompanyIds.filter((id) => id !== action.id)
          : [...state.selectedCompanyIds, action.id],
      }
    }

    case 'PREP_GENERATED': {
      const companyState = { ...state.fairMode.companyState }
      for (const id of state.selectedCompanyIds) {
        if (!companyState[id]) {
          companyState[id] = { visited: false, note: '', visitedAt: null }
        }
      }
      return {
        ...state,
        prep: { ...state.prep, ...action.prep },
        fairMode: { ...state.fairMode, companyState },
      }
    }

    case 'ENTER_FAIR_MODE':
      return { ...state, fairMode: { ...state.fairMode, active: true, startedAt: Date.now() }, step: 6 }
    case 'EXIT_FAIR_MODE':
      return { ...state, fairMode: { ...state.fairMode, active: false }, step: 5 }

    case 'MARK_VISITED':
      return {
        ...state,
        fairMode: {
          ...state.fairMode,
          companyState: {
            ...state.fairMode.companyState,
            [action.id]: {
              ...state.fairMode.companyState[action.id],
              visited: true,
              visitedAt: Date.now(),
            },
          },
        },
      }
    case 'SET_NOTE':
      return {
        ...state,
        fairMode: {
          ...state.fairMode,
          companyState: {
            ...state.fairMode.companyState,
            [action.id]: {
              ...state.fairMode.companyState[action.id],
              note: action.note,
            },
          },
        },
      }

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

export function WizardProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialWizardState)

  const goNext = useCallback(() => {
    dispatch({ type: 'GO_TO_STEP', step: state.step + 1 })
  }, [state.step])

  const goBack = useCallback(() => {
    dispatch({ type: 'GO_TO_STEP', step: state.step - 1 })
  }, [state.step])

  const value = useMemo(() => ({ state, dispatch, goNext, goBack }), [state, goNext, goBack])

  return <WizardContext.Provider value={value}>{children}</WizardContext.Provider>
}

export function useWizard() {
  const ctx = useContext(WizardContext)
  if (!ctx) throw new Error('useWizard must be used within a WizardProvider')
  return ctx
}
