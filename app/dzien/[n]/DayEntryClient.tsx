'use client'

import { useState, useRef, useCallback } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { CZESC_II } from '@/content/journal-content'
import DayNav from './DayNav'

// ── Types ─────────────────────────────────────────────────────

type FormState = {
  plan: string
  plan_notatki: string
  rzeczywistosc: string
  rzeczywistosc_notatki: string
  uruz_score: number | null
  fehu_wnioski: string
  thurisaz_reframe: string
  ansuz_dzialania: string
  raido_decyzje: string
  gebo_prezent: string
  wunjo_identyfikacja: string
  algiz_postawa: string
  isa_cisza: string
  is_complete: boolean
}

type SaveStatus = 'idle' | 'pending' | 'saving' | 'saved' | 'error'

interface Props {
  userId: string
  dayNumber: number
  entryDate: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  initialData: Record<string, any> | null
}

// ── Constants ─────────────────────────────────────────────────

const EMPTY: FormState = {
  plan: '',
  plan_notatki: '',
  rzeczywistosc: '',
  rzeczywistosc_notatki: '',
  uruz_score: null,
  fehu_wnioski: '',
  thurisaz_reframe: '',
  ansuz_dzialania: '',
  raido_decyzje: '',
  gebo_prezent: '',
  wunjo_identyfikacja: '',
  algiz_postawa: '',
  isa_cisza: '',
  is_complete: false,
}

const TOTAL_SECTIONS = 6

const SECTION_LABELS = [
  'Plan dnia',
  'Rzeczywistość',
  'Wnioski i przepisanie',
  'Działanie i decyzje',
  'Prezent i tożsamość',
  'Postawa i cisza',
]

// ── Helpers ───────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function initState(data: Record<string, any> | null): FormState {
  if (!data) return EMPTY
  const s = (k: keyof FormState) =>
    typeof data[k] === 'string' ? (data[k] as string) : ''
  return {
    plan: s('plan'),
    plan_notatki: s('plan_notatki'),
    rzeczywistosc: s('rzeczywistosc'),
    rzeczywistosc_notatki: s('rzeczywistosc_notatki'),
    uruz_score: typeof data.uruz_score === 'number' ? data.uruz_score : null,
    fehu_wnioski: s('fehu_wnioski'),
    thurisaz_reframe: s('thurisaz_reframe'),
    ansuz_dzialania: s('ansuz_dzialania'),
    raido_decyzje: s('raido_decyzje'),
    gebo_prezent: s('gebo_prezent'),
    wunjo_identyfikacja: s('wunjo_identyfikacja'),
    algiz_postawa: s('algiz_postawa'),
    isa_cisza: s('isa_cisza'),
    is_complete: typeof data.is_complete === 'boolean' ? data.is_complete : false,
  }
}

function formatDate(dateStr: string): string {
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('pl-PL', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })
}

// ── Sub-components ────────────────────────────────────────────

function Textarea({
  value,
  onChange,
  placeholder,
  large,
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  large?: boolean
}) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={large ? 7 : 4}
      className="w-full bg-neutral-900 border border-neutral-800 focus:border-red-900 focus:outline-none rounded-lg px-4 py-3 text-sm text-neutral-200 placeholder-neutral-700 resize-y leading-relaxed"
    />
  )
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="block text-xs font-semibold tracking-wide text-neutral-400 mb-2">
      {children}
    </label>
  )
}

function RuneHeader({
  symbol,
  name,
  title,
}: {
  symbol: string
  name: string
  title: string
}) {
  return (
    <div className="flex items-start gap-4 mb-4">
      <span className="text-red-700 text-3xl leading-none select-none shrink-0">
        {symbol}
      </span>
      <div>
        <p className="text-xs font-bold tracking-[0.2em] text-neutral-600">
          {name}
        </p>
        <h3 className="text-base font-bold text-neutral-200 tracking-wide">
          {title}
        </h3>
      </div>
    </div>
  )
}

function QuestionHints({ questions }: { questions: string[] }) {
  return (
    <ul className="mb-4 space-y-1">
      {questions.map((q, i) => (
        <li key={i} className="text-xs text-neutral-600 leading-relaxed">
          » {q}
        </li>
      ))}
    </ul>
  )
}

function SaveIndicator({ status }: { status: SaveStatus }) {
  if (status === 'idle') return null
  const map: Record<
    Exclude<SaveStatus, 'idle'>,
    { text: string; cls: string }
  > = {
    pending: { text: 'Oczekiwanie...', cls: 'text-neutral-600' },
    saving:  { text: 'Zapisywanie...', cls: 'text-neutral-500' },
    saved:   { text: 'Zapisano ✓',    cls: 'text-green-600' },
    error:   { text: 'Błąd zapisu',   cls: 'text-red-600' },
  }
  const { text, cls } = map[status]
  return <span className={`text-xs ${cls}`}>{text}</span>
}

// ── Main component ────────────────────────────────────────────

export default function DayEntryClient({
  userId,
  dayNumber,
  entryDate,
  initialData,
}: Props) {
  const [activeSection, setActiveSection] = useState(0)
  const [state, setState] = useState<FormState>(() => initState(initialData))
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const save = useCallback(
    async (s: FormState) => {
      setSaveStatus('saving')
      const supabase = createClient()
      const { error } = await supabase.from('daily_entries').upsert(
        {
          user_id: userId,
          entry_date: entryDate,
          day_number: dayNumber,
          ...s,
        },
        { onConflict: 'user_id,day_number' }
      )
      if (error) {
        setSaveStatus('error')
        return
      }
      setSaveStatus('saved')
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current)
      savedTimerRef.current = setTimeout(() => setSaveStatus('idle'), 2500)
    },
    [userId, entryDate, dayNumber]
  )

  function scheduleSave(next: FormState) {
    setSaveStatus('pending')
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => save(next), 1000)
  }

  function handleChange(
    key: keyof FormState,
    value: string | number | boolean | null
  ) {
    const next = { ...state, [key]: value }
    setState(next)
    scheduleSave(next)
  }

  async function handleComplete() {
    const next = { ...state, is_complete: true }
    setState(next)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    await save(next)
  }

  function goSection(n: number) {
    setActiveSection(Math.max(0, Math.min(TOTAL_SECTIONS - 1, n)))
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ds = CZESC_II.dayStructure as any[]

  // ── Section renderers ──────────────────────────────────────

  function renderSection() {
    switch (activeSection) {
      // ── Section 1: PLAN DNIA ────────────────────────────
      case 0: {
        const sec = ds[0]
        return (
          <div className="space-y-6">
            <RuneHeader
              symbol={sec.runeSymbol}
              name={sec.runeName}
              title={sec.title}
            />
            <div>
              <FieldLabel>{sec.fields[0].label}</FieldLabel>
              <Textarea
                value={state.plan}
                onChange={(v) => handleChange('plan', v)}
                placeholder={sec.fields[0].placeholder}
                large
              />
            </div>
            <div>
              <FieldLabel>{sec.fields[1].label}</FieldLabel>
              <Textarea
                value={state.plan_notatki}
                onChange={(v) => handleChange('plan_notatki', v)}
                placeholder={sec.fields[1].placeholder}
              />
            </div>
          </div>
        )
      }

      // ── Section 2: RZECZYWISTOŚĆ ─────────────────────────
      case 1: {
        const sec = ds[1]
        return (
          <div className="space-y-6">
            <RuneHeader
              symbol={sec.runeSymbol}
              name={sec.runeName}
              title={sec.title}
            />
            <div>
              <FieldLabel>{sec.fields[0].label}</FieldLabel>
              <Textarea
                value={state.rzeczywistosc}
                onChange={(v) => handleChange('rzeczywistosc', v)}
                placeholder={sec.fields[0].placeholder}
                large
              />
            </div>

            {/* URUZ score */}
            <div>
              <FieldLabel>
                {sec.scaleLabel} — jak spójny był dzień z Twoją sagą?
              </FieldLabel>
              <div className="flex flex-wrap gap-2 mt-1">
                {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                  <button
                    key={n}
                    onClick={() =>
                      handleChange(
                        'uruz_score',
                        state.uruz_score === n ? null : n
                      )
                    }
                    className={`w-9 h-9 rounded text-sm font-bold transition-colors ${
                      state.uruz_score === n
                        ? 'bg-red-700 text-white'
                        : 'bg-neutral-800 text-neutral-500 hover:bg-neutral-700 hover:text-neutral-300'
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <FieldLabel>{sec.fields[1].label}</FieldLabel>
              <Textarea
                value={state.rzeczywistosc_notatki}
                onChange={(v) => handleChange('rzeczywistosc_notatki', v)}
                placeholder={sec.fields[1].placeholder}
              />
            </div>
          </div>
        )
      }

      // ── Sections 3-6: dual-rune sections ─────────────────
      case 2:
      case 3:
      case 4:
      case 5: {
        const sec = ds[activeSection]
        const fieldKeys: Record<string, keyof FormState> = {
          fehu_wnioski:       'fehu_wnioski',
          thurisaz_reframe:   'thurisaz_reframe',
          ansuz_dzialania:    'ansuz_dzialania',
          raido_decyzje:      'raido_decyzje',
          gebo_prezent:       'gebo_prezent',
          wunjo_identyfikacja:'wunjo_identyfikacja',
          algiz_postawa:      'algiz_postawa',
          isa_cisza:          'isa_cisza',
        }
        const isLast = activeSection === 5

        return (
          <div className="space-y-8">
            {sec.sections.map((sub: any, i: number) => (
              <div key={i}>
                {i > 0 && (
                  <div className="border-t border-neutral-800 pt-8" />
                )}

                <RuneHeader
                  symbol={sub.runeSymbol}
                  name={sub.runeName}
                  title={sub.title}
                />

                {sub.description && (
                  <p className="text-xs text-neutral-600 leading-relaxed mb-3">
                    {sub.description}
                  </p>
                )}

                {sub.questions && (
                  <QuestionHints questions={sub.questions} />
                )}

                {sub.principles && (
                  <div className="mb-3 space-y-1">
                    {sub.principles.map((p: string, j: number) => (
                      <p key={j} className="text-xs text-neutral-600 italic">
                        {j === 0 ? '✦ ' : '↳ '}{p}
                      </p>
                    ))}
                  </div>
                )}

                {sub.note && (
                  <p className="text-xs text-neutral-600 italic mb-3 border-l border-neutral-800 pl-3">
                    {sub.note}
                  </p>
                )}

                {sub.hint && (
                  <p className="text-xs text-neutral-600 italic mb-3">
                    {sub.hint}
                  </p>
                )}

                <FieldLabel>{sub.fields[0].label}</FieldLabel>
                <Textarea
                  value={state[fieldKeys[sub.fields[0].key]] as string}
                  onChange={(v) =>
                    handleChange(fieldKeys[sub.fields[0].key], v)
                  }
                  placeholder={sub.fields[0].placeholder}
                  large
                />

                {sub.closing && (
                  <p className="mt-3 text-xs text-neutral-600 italic">
                    {sub.closing}
                  </p>
                )}
              </div>
            ))}

            {/* Complete button on last section */}
            {isLast && (
              <div className="pt-4 border-t border-neutral-800">
                {state.is_complete ? (
                  <div className="flex items-center justify-center gap-2 py-3 rounded-lg border border-green-900 bg-neutral-900">
                    <span className="text-green-600 font-bold text-sm tracking-wide">
                      Dzień {dayNumber} ukończony ✓
                    </span>
                  </div>
                ) : (
                  <button
                    onClick={handleComplete}
                    className="w-full py-3 bg-red-800 hover:bg-red-700 text-white font-bold text-sm tracking-wide rounded-lg transition-colors"
                  >
                    Oznacz dzień jako ukończony
                  </button>
                )}
              </div>
            )}
          </div>
        )
      }

      default:
        return null
    }
  }

  // ── Render ─────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-neutral-200 pb-24">
      {/* Header */}
      <header className="border-b border-neutral-800 px-6 py-4 sticky top-0 bg-[#0a0a0a] z-40">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/dashboard"
              className="text-neutral-600 hover:text-neutral-400 text-sm transition-colors"
            >
              ← Powrót
            </Link>
            <span className="text-neutral-800 hidden sm:inline">|</span>
            <div className="hidden sm:block">
              <span className="text-xs font-bold tracking-[0.2em] text-red-800">
                DZIEŃ {dayNumber}
              </span>
              <span className="text-xs text-neutral-600 ml-2">
                {formatDate(entryDate)}
              </span>
            </div>
          </div>
          <SaveIndicator status={saveStatus} />
        </div>
      </header>

      {/* Section indicator */}
      <div className="sticky top-[57px] z-30 bg-[#0a0a0a] border-b border-neutral-900">
        <div className="max-w-2xl mx-auto px-6 py-2 flex items-center justify-between">
          <span className="text-xs text-neutral-700 font-semibold tracking-wide">
            STRONA {activeSection + 1} / {TOTAL_SECTIONS}
          </span>
          <span className="text-xs text-neutral-600">
            {SECTION_LABELS[activeSection]}
          </span>
        </div>
      </div>

      {/* Day info — mobile */}
      <div className="sm:hidden px-6 pt-4">
        <div className="flex items-center gap-3">
          <span className="text-xs font-bold tracking-[0.2em] text-red-800">
            DZIEŃ {dayNumber}
          </span>
          <span className="text-xs text-neutral-600">
            {formatDate(entryDate)}
          </span>
        </div>
      </div>

      {/* Main content */}
      <main className="max-w-2xl mx-auto px-6 py-8">
        {renderSection()}

        {/* Section navigation */}
        <div className="flex items-center justify-between mt-10 pt-6 border-t border-neutral-800">
          <button
            onClick={() => goSection(activeSection - 1)}
            disabled={activeSection === 0}
            className="text-sm text-neutral-500 hover:text-neutral-300 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            ← Poprzednia strona
          </button>
          <span className="text-xs text-neutral-700">
            {activeSection + 1} / {TOTAL_SECTIONS}
          </span>
          <button
            onClick={() => goSection(activeSection + 1)}
            disabled={activeSection === TOTAL_SECTIONS - 1}
            className="text-sm text-neutral-500 hover:text-neutral-300 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            Następna strona →
          </button>
        </div>
      </main>

      {/* Fixed bottom nav */}
      <DayNav
        dayNumber={dayNumber}
        activeSection={activeSection}
        totalSections={TOTAL_SECTIONS}
        isComplete={state.is_complete}
        onSectionChange={goSection}
      />
    </div>
  )
}
