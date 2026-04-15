'use client'

import { useState, useRef, useCallback } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { CZESC_I } from '@/content/journal-content'

// ── Types ─────────────────────────────────────────────────────

type ThurisazEntry = { wydarzenie: string; nowa_interpretacja: string }

type FormState = {
  kenaz_pragnienie: string
  kenaz_dlaczego_1: string
  kenaz_dlaczego_2: string
  kenaz_dlaczego_3: string
  kenaz_dlaczego_4: string
  kenaz_dlaczego_5: string
  kenaz_dlaczego_6: string
  kenaz_dlaczego_7: string
  kenaz_kluczowe_slowa: string
  fehu_jak_chce_zyc: string
  ansuz_wizja: string
  raido_kierunek: string
  raido_dzialania: string
  thurisaz_entries: ThurisazEntry[]
  hagalaz_dary: string
  tiwaz_cechy: string
  tiwaz_nawyki: string
  tiwaz_dzien: string
  tiwaz_otoczenie: string
  tiwaz_relacje: string
  tiwaz_wyniki: string
  tiwaz_emocje: string
  tiwaz_mozliwosci: string
}

type SaveStatus = 'idle' | 'pending' | 'saving' | 'saved' | 'error'

interface Props {
  userId: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  initialData: Record<string, any> | null
}

// ── Constants ─────────────────────────────────────────────────

const EMPTY: FormState = {
  kenaz_pragnienie: '',
  kenaz_dlaczego_1: '',
  kenaz_dlaczego_2: '',
  kenaz_dlaczego_3: '',
  kenaz_dlaczego_4: '',
  kenaz_dlaczego_5: '',
  kenaz_dlaczego_6: '',
  kenaz_dlaczego_7: '',
  kenaz_kluczowe_slowa: '',
  fehu_jak_chce_zyc: '',
  ansuz_wizja: '',
  raido_kierunek: '',
  raido_dzialania: '',
  thurisaz_entries: [],
  hagalaz_dary: '',
  tiwaz_cechy: '',
  tiwaz_nawyki: '',
  tiwaz_dzien: '',
  tiwaz_otoczenie: '',
  tiwaz_relacje: '',
  tiwaz_wyniki: '',
  tiwaz_emocje: '',
  tiwaz_mozliwosci: '',
}

// ── Helpers ────────────────────────────────────────────────────

function initState(data: Record<string, unknown> | null): FormState {
  if (!data) return EMPTY
  const s = (k: keyof FormState) =>
    typeof data[k] === 'string' ? (data[k] as string) : ''
  return {
    kenaz_pragnienie: s('kenaz_pragnienie'),
    kenaz_dlaczego_1: s('kenaz_dlaczego_1'),
    kenaz_dlaczego_2: s('kenaz_dlaczego_2'),
    kenaz_dlaczego_3: s('kenaz_dlaczego_3'),
    kenaz_dlaczego_4: s('kenaz_dlaczego_4'),
    kenaz_dlaczego_5: s('kenaz_dlaczego_5'),
    kenaz_dlaczego_6: s('kenaz_dlaczego_6'),
    kenaz_dlaczego_7: s('kenaz_dlaczego_7'),
    kenaz_kluczowe_slowa: s('kenaz_kluczowe_slowa'),
    fehu_jak_chce_zyc: s('fehu_jak_chce_zyc'),
    ansuz_wizja: s('ansuz_wizja'),
    raido_kierunek: s('raido_kierunek'),
    raido_dzialania: s('raido_dzialania'),
    thurisaz_entries: Array.isArray(data.thurisaz_entries)
      ? (data.thurisaz_entries as ThurisazEntry[])
      : [],
    hagalaz_dary: s('hagalaz_dary'),
    tiwaz_cechy: s('tiwaz_cechy'),
    tiwaz_nawyki: s('tiwaz_nawyki'),
    tiwaz_dzien: s('tiwaz_dzien'),
    tiwaz_otoczenie: s('tiwaz_otoczenie'),
    tiwaz_relacje: s('tiwaz_relacje'),
    tiwaz_wyniki: s('tiwaz_wyniki'),
    tiwaz_emocje: s('tiwaz_emocje'),
    tiwaz_mozliwosci: s('tiwaz_mozliwosci'),
  }
}

// content field key → DB column (only non-obvious mapping needed)
function dbKey(runeId: string, fieldKey: string): keyof FormState {
  if (runeId === 'kenaz' && fieldKey === 'glowne_pragnienie')
    return 'kenaz_pragnienie'
  return `${runeId}_${fieldKey}` as keyof FormState
}

function isComplete(runeId: string, state: FormState): boolean {
  const f = (v: string) => v.trim().length > 0
  switch (runeId) {
    case 'kenaz':     return f(state.kenaz_pragnienie)
    case 'fehu':      return f(state.fehu_jak_chce_zyc)
    case 'ansuz':     return f(state.ansuz_wizja)
    case 'raido':     return f(state.raido_kierunek)
    case 'thurisaz':  return state.thurisaz_entries.length > 0
    case 'hagalaz':   return f(state.hagalaz_dary)
    case 'tiwaz':     return f(state.tiwaz_cechy)
    default:          return false
  }
}

// ── Sub-components ─────────────────────────────────────────────

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
      rows={large ? 8 : 4}
      className="w-full bg-neutral-800 border border-neutral-700 focus:border-red-800 focus:outline-none rounded px-3 py-2.5 text-sm text-neutral-200 placeholder-neutral-600 resize-y leading-relaxed"
    />
  )
}

// ── Main component ─────────────────────────────────────────────

export default function PartOneClient({ userId, initialData }: Props) {
  const [activeIndex, setActiveIndex] = useState(0)
  const [state, setState] = useState<FormState>(() => initState(initialData))
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const save = useCallback(
    async (s: FormState) => {
      setSaveStatus('saving')
      const supabase = createClient()
      const { error } = await supabase
        .from('part_one')
        .upsert({ user_id: userId, ...s }, { onConflict: 'user_id' })

      if (error) {
        setSaveStatus('error')
        return
      }
      setSaveStatus('saved')
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current)
      savedTimerRef.current = setTimeout(() => setSaveStatus('idle'), 2500)
    },
    [userId]
  )

  function scheduleSave(next: FormState) {
    setSaveStatus('pending')
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => save(next), 1000)
  }

  function handleChange(key: keyof FormState, value: string) {
    const next = { ...state, [key]: value }
    setState(next)
    scheduleSave(next)
  }

  function handleThurisazUpdate(
    index: number,
    field: keyof ThurisazEntry,
    value: string
  ) {
    const entries = state.thurisaz_entries.map((e, i) =>
      i === index ? { ...e, [field]: value } : e
    )
    const next = { ...state, thurisaz_entries: entries }
    setState(next)
    scheduleSave(next)
  }

  function handleThurisazAdd() {
    const entries = [
      ...state.thurisaz_entries,
      { wydarzenie: '', nowa_interpretacja: '' },
    ]
    const next = { ...state, thurisaz_entries: entries }
    setState(next)
    scheduleSave(next)
  }

  function handleThurisazRemove(index: number) {
    const entries = state.thurisaz_entries.filter((_, i) => i !== index)
    const next = { ...state, thurisaz_entries: entries }
    setState(next)
    scheduleSave(next)
  }

  const runes = CZESC_I.runes
  const rune = runes[activeIndex]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const runeAny = rune as any

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-neutral-200 flex flex-col">
      {/* ── Header ─────────────────────────────────────────── */}
      <header className="border-b border-neutral-800 px-6 py-4 shrink-0">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/dashboard"
              className="text-neutral-600 hover:text-neutral-400 text-sm transition-colors"
            >
              ← Powrót
            </Link>
            <span className="text-neutral-800">|</span>
            <span className="text-xs font-bold tracking-[0.2em] text-neutral-400 uppercase">
              Część I — Runy Podstawy
            </span>
          </div>
          <SaveIndicator status={saveStatus} />
        </div>
      </header>

      <div className="flex flex-1 max-w-5xl mx-auto w-full">
        {/* ── Sidebar ──────────────────────────────────────── */}
        <aside className="hidden md:flex flex-col w-56 shrink-0 border-r border-neutral-800 py-6 px-3 gap-1">
          {runes.map((r, i) => {
            const done = isComplete(r.id, state)
            const active = i === activeIndex
            return (
              <button
                key={r.id}
                onClick={() => setActiveIndex(i)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded text-left transition-colors w-full ${
                  active
                    ? 'bg-neutral-800 text-neutral-100'
                    : 'hover:bg-neutral-900 text-neutral-500 hover:text-neutral-300'
                }`}
              >
                <span
                  className={`text-xl w-6 text-center shrink-0 ${
                    active ? 'text-red-600' : 'text-neutral-700'
                  }`}
                >
                  {r.symbol}
                </span>
                <span className="text-xs font-semibold tracking-widest flex-1">
                  {r.name}
                </span>
                <span
                  className={`text-xs ${done ? 'text-green-600' : 'text-neutral-800'}`}
                >
                  {done ? '✓' : '○'}
                </span>
              </button>
            )
          })}

          {/* Progress summary */}
          <div className="mt-auto pt-6 px-3">
            <div className="text-xs text-neutral-600 mb-2">
              {runes.filter((r) => isComplete(r.id, state)).length} / {runes.length} run
            </div>
            <div className="h-1 bg-neutral-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-red-800 rounded-full transition-all"
                style={{
                  width: `${
                    (runes.filter((r) => isComplete(r.id, state)).length /
                      runes.length) *
                    100
                  }%`,
                }}
              />
            </div>
          </div>
        </aside>

        {/* Mobile tab strip */}
        <div className="md:hidden flex overflow-x-auto border-b border-neutral-800 shrink-0 w-full">
          {runes.map((r, i) => {
            const done = isComplete(r.id, state)
            const active = i === activeIndex
            return (
              <button
                key={r.id}
                onClick={() => setActiveIndex(i)}
                className={`flex flex-col items-center gap-1 px-4 py-3 shrink-0 border-b-2 transition-colors ${
                  active
                    ? 'border-red-700 text-red-600'
                    : 'border-transparent text-neutral-600 hover:text-neutral-400'
                }`}
              >
                <span className="text-base">{r.symbol}</span>
                <span className="text-[10px] font-bold tracking-wider">
                  {r.name}
                </span>
                {done && (
                  <span className="text-[10px] text-green-600">✓</span>
                )}
              </button>
            )
          })}
        </div>

        {/* ── Content ──────────────────────────────────────── */}
        <main className="flex-1 overflow-y-auto">
          <div className="px-6 md:px-10 py-8 max-w-2xl">
            {/* Rune header */}
            <div className="flex items-start gap-5 mb-6">
              <span className="text-red-600 text-6xl leading-none select-none">
                {rune.symbol}
              </span>
              <div>
                <h1 className="text-2xl font-bold text-white tracking-[0.15em]">
                  {rune.name}
                </h1>
                <p className="text-red-700 text-xs tracking-[0.25em] font-semibold mt-0.5">
                  {rune.subtitle}
                </p>
              </div>
            </div>

            {/* Description */}
            <div className="text-neutral-500 text-sm leading-relaxed whitespace-pre-line mb-8 border-l-2 border-neutral-800 pl-4">
              {rune.description}
            </div>

            {/* ── Fields by rune ──────────────────────────── */}

            {/* KENAZ */}
            {rune.id === 'kenaz' && (
              <div className="space-y-5">
                {rune.fields?.map((field) => (
                  <FieldBlock
                    key={field.key}
                    label={field.label}
                    isSmall={field.type === 'text'}
                  >
                    {field.type === 'text' ? (
                      <input
                        type="text"
                        value={state[dbKey(rune.id, field.key)] as string}
                        onChange={(e) =>
                          handleChange(dbKey(rune.id, field.key), e.target.value)
                        }
                        className="w-full bg-neutral-800 border border-neutral-700 focus:border-red-800 focus:outline-none rounded px-3 py-2.5 text-sm text-neutral-200 placeholder-neutral-600"
                      />
                    ) : (
                      <Textarea
                        value={state[dbKey(rune.id, field.key)] as string}
                        onChange={(v) => handleChange(dbKey(rune.id, field.key), v)}
                      />
                    )}
                  </FieldBlock>
                ))}
              </div>
            )}

            {/* FEHU / ANSUZ / RAIDO / HAGALAZ — standard fields */}
            {['fehu', 'ansuz', 'raido', 'hagalaz'].includes(rune.id) && (
              <div className="space-y-5">
                {rune.fields?.map((field) => (
                  <FieldBlock key={field.key} label={field.label}>
                    <Textarea
                      value={state[dbKey(rune.id, field.key)] as string}
                      onChange={(v) =>
                        handleChange(dbKey(rune.id, field.key), v)
                      }
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      placeholder={(field as any).placeholder}
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      large={(field as any).large}
                    />
                  </FieldBlock>
                ))}
              </div>
            )}

            {/* THURISAZ — multi-entry */}
            {rune.id === 'thurisaz' && (
              <div className="space-y-6">
                {state.thurisaz_entries.length === 0 && (
                  <p className="text-neutral-600 text-sm italic">
                    Nie dodano jeszcze żadnego wydarzenia. Kliknij przycisk
                    poniżej, aby zacząć.
                  </p>
                )}

                {state.thurisaz_entries.map((entry, i) => (
                  <div
                    key={i}
                    className="border border-neutral-800 rounded-lg p-5 space-y-4"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-neutral-600 font-semibold tracking-wider">
                        WYDARZENIE {i + 1}
                      </span>
                      <button
                        onClick={() => handleThurisazRemove(i)}
                        className="text-xs text-neutral-700 hover:text-red-700 transition-colors"
                      >
                        Usuń
                      </button>
                    </div>

                    <FieldBlock label="Wydarzenie z przeszłości">
                      <Textarea
                        value={entry.wydarzenie}
                        onChange={(v) =>
                          handleThurisazUpdate(i, 'wydarzenie', v)
                        }
                        placeholder="Opisz trudny moment, doświadczenie lub okres z życia..."
                      />
                    </FieldBlock>

                    <FieldBlock label="Nowa interpretacja (prezent, lekcja, zasób)">
                      <Textarea
                        value={entry.nowa_interpretacja}
                        onChange={(v) =>
                          handleThurisazUpdate(i, 'nowa_interpretacja', v)
                        }
                        placeholder="Czego się nauczyłem? Jaką wartość zrozumiałem? Jak mogę to wykorzystać?"
                      />
                    </FieldBlock>
                  </div>
                ))}

                <button
                  onClick={handleThurisazAdd}
                  className="flex items-center gap-2 text-sm text-red-700 hover:text-red-500 transition-colors font-semibold"
                >
                  <span className="text-lg leading-none">+</span>
                  {runeAny.multiEntryLabel}
                </button>
              </div>
            )}

            {/* TIWAZ — two-part structure */}
            {rune.id === 'tiwaz' && (
              <div className="space-y-8">
                {/* Part I — instruction only */}
                <div className="border border-neutral-800 rounded-lg p-5">
                  <h3 className="text-xs font-bold tracking-[0.2em] text-red-800 mb-4">
                    {runeAny.part1.title}
                  </h3>
                  <p className="text-neutral-500 text-sm leading-relaxed whitespace-pre-line">
                    {runeAny.part1.instruction}
                  </p>
                </div>

                {/* Part II — fields */}
                <div>
                  <h3 className="text-xs font-bold tracking-[0.2em] text-red-800 mb-2">
                    {runeAny.part2.title}
                  </h3>
                  <p className="text-neutral-500 text-sm leading-relaxed whitespace-pre-line mb-6">
                    {runeAny.part2.instruction}
                  </p>

                  <div className="space-y-5">
                    {runeAny.part2.fields.map(
                      (field: { key: string; label: string }) => (
                        <FieldBlock key={field.key} label={field.label}>
                          <Textarea
                            value={state[dbKey('tiwaz', field.key)] as string}
                            onChange={(v) =>
                              handleChange(dbKey('tiwaz', field.key), v)
                            }
                          />
                        </FieldBlock>
                      )
                    )}
                  </div>

                  <p className="mt-6 text-neutral-600 text-xs leading-relaxed whitespace-pre-line italic border-l-2 border-neutral-800 pl-4">
                    {runeAny.part2.closing}
                  </p>
                </div>
              </div>
            )}

            {/* ── Navigation ──────────────────────────────── */}
            <div className="flex items-center justify-between mt-10 pt-6 border-t border-neutral-800">
              <button
                onClick={() => setActiveIndex((i) => Math.max(0, i - 1))}
                disabled={activeIndex === 0}
                className="flex items-center gap-2 text-sm text-neutral-500 hover:text-neutral-300 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                ← Poprzednia runa
              </button>

              <span className="text-xs text-neutral-700">
                {activeIndex + 1} / {runes.length}
              </span>

              <button
                onClick={() =>
                  setActiveIndex((i) => Math.min(runes.length - 1, i + 1))
                }
                disabled={activeIndex === runes.length - 1}
                className="flex items-center gap-2 text-sm text-neutral-500 hover:text-neutral-300 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                Następna runa →
              </button>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}

// ── Field wrapper ──────────────────────────────────────────────

function FieldBlock({
  label,
  children,
  isSmall,
}: {
  label: string
  children: React.ReactNode
  isSmall?: boolean
}) {
  return (
    <div className={isSmall ? '' : ''}>
      <label className="block text-xs text-neutral-400 font-semibold tracking-wide mb-2">
        {label}
      </label>
      {children}
    </div>
  )
}

// ── Save indicator ─────────────────────────────────────────────

function SaveIndicator({ status }: { status: SaveStatus }) {
  if (status === 'idle') return null

  const map: Record<Exclude<SaveStatus, 'idle'>, { text: string; cls: string }> =
    {
      pending: { text: 'Oczekiwanie...', cls: 'text-neutral-600' },
      saving:  { text: 'Zapisywanie...', cls: 'text-neutral-500' },
      saved:   { text: 'Zapisano ✓',    cls: 'text-green-600' },
      error:   { text: 'Błąd zapisu',   cls: 'text-red-600' },
    }

  const { text, cls } = map[status]
  return <span className={`text-xs transition-colors ${cls}`}>{text}</span>
}
