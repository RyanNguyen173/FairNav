'use client'

import { ArrowClockwise, Play, Warning } from '@phosphor-icons/react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Button } from '../../../src/components/Button'
import { Header } from '../../../src/components/Header'
import { FieldLabel, SectionCard, TextInput } from '../../../src/components/StepShell'
import {
  buildGeneratePitchesPrompt,
  buildRankCompaniesPrompt,
  type MergedCompanyInput,
  type PitchCompanyInput,
} from '../../../src/lib/aiPrompts'
import type { ProfileData } from '../../../src/wizard/types'

type Tab = 'rank' | 'pitches'
type ThinkingLevelChoice = '' | 'MINIMAL' | 'LOW' | 'MEDIUM' | 'HIGH'

interface ProfileFormState {
  major: string
  gradYear: string
  skills: string
  interests: string
}

interface ParamsState {
  model: string
  temperature: string
  topP: string
  topK: string
  maxOutputTokens: string
  thinkingLevel: ThinkingLevelChoice
}

interface RunResult {
  text: string
  usageMetadata: {
    promptTokenCount?: number
    candidatesTokenCount?: number
    thoughtsTokenCount?: number
    totalTokenCount?: number
  } | null
  tookMs: number
}

const DEFAULT_PROFILE: ProfileFormState = {
  major: 'Mechanical Engineering',
  gradYear: '2027',
  skills: 'Python, SolidWorks, CAD, rapid prototyping',
  interests: 'Robotics, aerospace, sustainable manufacturing',
}

const DEFAULT_RANK_COMPANIES: MergedCompanyInput[] = [
  { companyName: 'Blue Origin', boothNumbers: ['12'] },
  { companyName: 'GE Aerospace', boothNumbers: ['45', '46'] },
  { companyName: 'Sandia National Lab', boothNumbers: ['8'] },
]

const DEFAULT_PITCH_COMPANIES: PitchCompanyInput[] = [
  {
    companyName: 'Blue Origin',
    boothNumbers: ['12'],
    summary: 'Builds orbital and suborbital launch vehicles and rocket engines.',
    industry: 'Aerospace',
    openRoles: ['Systems Engineer Intern', 'Manufacturing Engineer Intern'],
  },
  {
    companyName: 'GE Aerospace',
    boothNumbers: ['45', '46'],
    summary: 'Designs and manufactures jet engines and propulsion systems.',
    industry: 'Aerospace',
    openRoles: ['Software Engineer Intern'],
  },
]

const DEFAULT_PARAMS: ParamsState = {
  model: 'gemini-3.5-flash-lite',
  temperature: '',
  topP: '',
  topK: '',
  maxOutputTokens: '',
  thinkingLevel: '',
}

function toProfileData(form: ProfileFormState): ProfileData {
  return {
    major: form.major,
    gradYear: form.gradYear,
    skills: form.skills
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
    interests: form.interests
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
    experience: [],
    education: [],
  }
}

function ParamsPanel({ params, onChange }: { params: ParamsState; onChange: (next: ParamsState) => void }) {
  return (
    <SectionCard>
      <h3 className="mb-3 text-sm font-semibold text-foreground">Generation parameters</h3>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        <div>
          <FieldLabel htmlFor="p-model">Model</FieldLabel>
          <TextInput id="p-model" value={params.model} onChange={(e) => onChange({ ...params, model: e.target.value })} />
        </div>
        <div>
          <FieldLabel htmlFor="p-temp">Temperature (0-2)</FieldLabel>
          <TextInput
            id="p-temp"
            placeholder="model default"
            value={params.temperature}
            onChange={(e) => onChange({ ...params, temperature: e.target.value })}
          />
        </div>
        <div>
          <FieldLabel htmlFor="p-topp">Top P</FieldLabel>
          <TextInput
            id="p-topp"
            placeholder="model default"
            value={params.topP}
            onChange={(e) => onChange({ ...params, topP: e.target.value })}
          />
        </div>
        <div>
          <FieldLabel htmlFor="p-topk">Top K</FieldLabel>
          <TextInput
            id="p-topk"
            placeholder="model default"
            value={params.topK}
            onChange={(e) => onChange({ ...params, topK: e.target.value })}
          />
        </div>
        <div>
          <FieldLabel htmlFor="p-maxtok">Max output tokens</FieldLabel>
          <TextInput
            id="p-maxtok"
            placeholder="model default"
            value={params.maxOutputTokens}
            onChange={(e) => onChange({ ...params, maxOutputTokens: e.target.value })}
          />
        </div>
        <div>
          <FieldLabel htmlFor="p-thinking">Thinking level</FieldLabel>
          <select
            id="p-thinking"
            value={params.thinkingLevel}
            onChange={(e) => onChange({ ...params, thinkingLevel: e.target.value as ThinkingLevelChoice })}
            className="min-h-11 w-full rounded-xl border border-border bg-card px-3.5 text-[15px] text-card-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="">MINIMAL (route default)</option>
            <option value="MINIMAL">MINIMAL</option>
            <option value="LOW">LOW</option>
            <option value="MEDIUM">MEDIUM</option>
            <option value="HIGH">HIGH</option>
          </select>
        </div>
      </div>
    </SectionCard>
  )
}

function ResultPanel({ result, error, loading }: { result: RunResult | null; error: string | null; loading: boolean }) {
  let parsed: unknown = null
  let parseError: string | null = null
  if (result) {
    try {
      parsed = JSON.parse(result.text)
    } catch {
      parseError = 'Response was not valid JSON (shown raw below).'
    }
  }

  return (
    <SectionCard>
      <h3 className="mb-3 text-sm font-semibold text-foreground">Result</h3>
      {loading && <p className="text-sm text-muted-foreground">Calling Gemini…</p>}
      {!loading && error && (
        <p className="flex items-start gap-1.5 text-sm text-destructive">
          <Warning size={16} weight="fill" className="mt-0.5 shrink-0" aria-hidden="true" />
          {error}
        </p>
      )}
      {!loading && !error && !result && <p className="text-sm text-muted-foreground">Run a prompt to see output here.</p>}
      {!loading && !error && result && (
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground">
            {result.tookMs}ms
            {result.usageMetadata && (
              <>
                {' · '}
                {result.usageMetadata.promptTokenCount ?? '?'} prompt + {result.usageMetadata.candidatesTokenCount ?? '?'}{' '}
                output
                {typeof result.usageMetadata.thoughtsTokenCount === 'number' &&
                  result.usageMetadata.thoughtsTokenCount > 0 &&
                  ` + ${result.usageMetadata.thoughtsTokenCount} thinking`}
                {' = '}
                {result.usageMetadata.totalTokenCount ?? '?'} tokens
              </>
            )}
          </p>
          {parseError && <p className="text-xs text-destructive">{parseError}</p>}
          <pre className="max-h-[600px] overflow-auto rounded-xl bg-surface p-3.5 text-xs leading-relaxed text-foreground">
            {parsed ? JSON.stringify(parsed, null, 2) : result.text}
          </pre>
        </div>
      )}
    </SectionCard>
  )
}

export default function AiPlaygroundPage() {
  const router = useRouter()
  const [tab, setTab] = useState<Tab>('rank')

  const [profileForm, setProfileForm] = useState(DEFAULT_PROFILE)
  const [rankCompaniesJson, setRankCompaniesJson] = useState(() => JSON.stringify(DEFAULT_RANK_COMPANIES, null, 2))
  const [pitchCompaniesJson, setPitchCompaniesJson] = useState(() => JSON.stringify(DEFAULT_PITCH_COMPANIES, null, 2))
  const [rankPrompt, setRankPrompt] = useState(() =>
    buildRankCompaniesPrompt(toProfileData(DEFAULT_PROFILE), DEFAULT_RANK_COMPANIES),
  )
  const [pitchPrompt, setPitchPrompt] = useState(() =>
    buildGeneratePitchesPrompt(toProfileData(DEFAULT_PROFILE), DEFAULT_PITCH_COMPANIES),
  )
  const [companiesError, setCompaniesError] = useState<string | null>(null)
  const [params, setParams] = useState(DEFAULT_PARAMS)
  const [result, setResult] = useState<RunResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const rebuildPrompt = () => {
    setCompaniesError(null)
    try {
      if (tab === 'rank') {
        const companies = JSON.parse(rankCompaniesJson) as MergedCompanyInput[]
        setRankPrompt(buildRankCompaniesPrompt(toProfileData(profileForm), companies))
      } else {
        const companies = JSON.parse(pitchCompaniesJson) as PitchCompanyInput[]
        setPitchPrompt(buildGeneratePitchesPrompt(toProfileData(profileForm), companies))
      }
    } catch {
      setCompaniesError('Companies JSON is invalid - fix it and try rebuilding again.')
    }
  }

  const run = async () => {
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const endpoint = tab === 'rank' ? '/api/dev/rank-companies' : '/api/dev/generate-pitches'
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: tab === 'rank' ? rankPrompt : pitchPrompt,
          model: params.model || undefined,
          temperature: params.temperature ? Number(params.temperature) : undefined,
          topP: params.topP ? Number(params.topP) : undefined,
          topK: params.topK ? Number(params.topK) : undefined,
          maxOutputTokens: params.maxOutputTokens ? Number(params.maxOutputTokens) : undefined,
          thinkingLevel: params.thinkingLevel || undefined,
        }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || `Request failed with status ${response.status}`)
      setResult(data as RunResult)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Request failed')
    } finally {
      setLoading(false)
    }
  }

  const prompt = tab === 'rank' ? rankPrompt : pitchPrompt
  const setPrompt = tab === 'rank' ? setRankPrompt : setPitchPrompt
  const companiesJson = tab === 'rank' ? rankCompaniesJson : pitchCompaniesJson
  const setCompaniesJson = tab === 'rank' ? setRankCompaniesJson : setPitchCompaniesJson

  return (
    <>
      <Header title="AI Playground" onBack={() => router.push('/')} />
      <div className="mx-auto w-full max-w-4xl flex-1 px-4 pb-16 pt-5 md:px-8">
        <div className="mb-5 flex items-start gap-2 rounded-xl border border-border bg-accent-wash px-3.5 py-2.5 text-xs text-accent-ink">
          <Warning size={15} weight="fill" className="mt-0.5 shrink-0" aria-hidden="true" />
          Local development only - the underlying /api/dev/* routes 404 in production, since letting anyone run
          arbitrary prompts against the project's Gemini key would be a real cost risk.
        </div>

        <div className="mb-5 flex gap-2" role="tablist" aria-label="Playground target">
          {(['rank', 'pitches'] as const).map((value) => (
            <button
              key={value}
              type="button"
              role="tab"
              aria-selected={tab === value}
              onClick={() => setTab(value)}
              className={[
                'min-h-9 cursor-pointer rounded-full border px-4 text-sm font-semibold transition-colors duration-150',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                tab === value ? 'border-primary bg-primary text-on-primary' : 'border-border bg-card text-card-foreground',
              ].join(' ')}
            >
              {value === 'rank' ? 'Rank companies' : 'Generate pitches'}
            </button>
          ))}
        </div>

        <div className="space-y-5">
          <SectionCard>
            <h3 className="mb-3 text-sm font-semibold text-foreground">Student profile</h3>
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <FieldLabel htmlFor="profile-major">Major</FieldLabel>
                <TextInput
                  id="profile-major"
                  value={profileForm.major}
                  onChange={(e) => setProfileForm({ ...profileForm, major: e.target.value })}
                />
              </div>
              <div>
                <FieldLabel htmlFor="profile-gradyear">Graduation year</FieldLabel>
                <TextInput
                  id="profile-gradyear"
                  value={profileForm.gradYear}
                  onChange={(e) => setProfileForm({ ...profileForm, gradYear: e.target.value })}
                />
              </div>
              <div>
                <FieldLabel htmlFor="profile-skills">Skills (comma-separated)</FieldLabel>
                <TextInput
                  id="profile-skills"
                  value={profileForm.skills}
                  onChange={(e) => setProfileForm({ ...profileForm, skills: e.target.value })}
                />
              </div>
              <div>
                <FieldLabel htmlFor="profile-interests">Interests (comma-separated)</FieldLabel>
                <TextInput
                  id="profile-interests"
                  value={profileForm.interests}
                  onChange={(e) => setProfileForm({ ...profileForm, interests: e.target.value })}
                />
              </div>
            </div>
          </SectionCard>

          <SectionCard>
            <h3 className="mb-3 text-sm font-semibold text-foreground">
              Companies ({tab === 'rank' ? 'name + booth numbers' : 'name, booths, summary, industry, open roles'})
            </h3>
            <textarea
              value={companiesJson}
              onChange={(e) => setCompaniesJson(e.target.value)}
              rows={8}
              spellCheck={false}
              className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 font-mono text-xs text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            {companiesError && <p className="mt-2 text-xs text-destructive">{companiesError}</p>}
            <Button variant="secondary" className="mt-3" icon={<ArrowClockwise size={15} weight="bold" aria-hidden="true" />} onClick={rebuildPrompt}>
              Rebuild prompt from profile + companies
            </Button>
          </SectionCard>

          <SectionCard>
            <h3 className="mb-3 text-sm font-semibold text-foreground">Prompt (sent to Gemini as-is - edit freely)</h3>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={16}
              spellCheck={false}
              className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 font-mono text-xs leading-relaxed text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </SectionCard>

          <ParamsPanel params={params} onChange={setParams} />

          <Button icon={<Play size={16} weight="fill" aria-hidden="true" />} loading={loading} onClick={run}>
            Run against Gemini
          </Button>

          <ResultPanel result={result} error={error} loading={loading} />
        </div>
      </div>
    </>
  )
}
