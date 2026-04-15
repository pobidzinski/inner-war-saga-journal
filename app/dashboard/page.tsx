import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { MODLITWA_WOJOWNIKA, CZESC_I } from '@/content/journal-content'
import PrayerCard from './_components/PrayerCard'
import LogoutButton from './_components/LogoutButton'

// ── helpers ──────────────────────────────────────────────────

function calcStreak(
  entries: { entry_date: string; is_complete: boolean }[]
): number {
  const completed = new Set(
    entries.filter((e) => e.is_complete).map((e) => e.entry_date)
  )
  let streak = 0
  const today = new Date()
  for (let i = 0; i < 90; i++) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    const key = d.toISOString().slice(0, 10)
    if (completed.has(key)) {
      streak++
    } else {
      break
    }
  }
  return streak
}

function isRuneComplete(
  partOne: Record<string, unknown> | null,
  runeId: string
): boolean {
  if (!partOne) return false
  const filled = (v: unknown) =>
    typeof v === 'string' ? v.trim().length > 0 : false

  switch (runeId) {
    case 'kenaz':
      return filled(partOne.kenaz_pragnienie)
    case 'fehu':
      return filled(partOne.fehu_jak_chce_zyc)
    case 'ansuz':
      return filled(partOne.ansuz_wizja)
    case 'raido':
      return filled(partOne.raido_kierunek)
    case 'thurisaz':
      return Array.isArray(partOne.thurisaz_entries) &&
        (partOne.thurisaz_entries as unknown[]).length > 0
    case 'hagalaz':
      return filled(partOne.hagalaz_dary)
    case 'tiwaz':
      return filled(partOne.tiwaz_cechy)
    default:
      return false
  }
}

// ── page ─────────────────────────────────────────────────────

export default async function DashboardPage() {
  const supabase = await createClient()

  const todayStr = new Date().toISOString().slice(0, 10)

  const [{ data: entries, error: entriesError }, { data: partOne }] =
    await Promise.all([
      supabase
        .from('daily_entries')
        .select('id, entry_date, day_number, is_complete')
        .order('day_number', { ascending: false }),
      supabase.from('part_one').select('*').maybeSingle(),
    ])

  const allEntries = entries ?? []
  const completedCount = allEntries.filter((e) => e.is_complete).length
  const streak = calcStreak(allEntries)

  const todayEntry = allEntries.find((e) => e.entry_date === todayStr) ?? null
  // allEntries[0] is the highest day_number (DESC order)
  const maxDayWritten = allEntries[0]?.day_number ?? 0
  const nextDayNumber = todayEntry
    ? todayEntry.day_number
    : Math.min(maxDayWritten + 1, 90)
  const sagaComplete = !todayEntry && maxDayWritten >= 90

  const recentEntries = [...allEntries]
    .sort((a, b) => b.day_number - a.day_number)
    .slice(0, 5)

  const progressPct = Math.round((completedCount / 90) * 100)

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-neutral-200">
      {/* ── Header ─────────────────────────────────── */}
      <header className="border-b border-neutral-800 px-6 py-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div>
            <span className="text-red-600 text-lg font-bold tracking-widest mr-2">ᛉ</span>
            <span className="text-sm font-bold tracking-[0.15em] text-neutral-100 uppercase">
              Saga Wewnętrznego Zwycięstwa
            </span>
          </div>
          <LogoutButton />
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-8 space-y-6">
        {/* ── Prayer ─────────────────────────────────── */}
        <PrayerCard
          title={MODLITWA_WOJOWNIKA.title}
          verses={MODLITWA_WOJOWNIKA.verses}
          closing={MODLITWA_WOJOWNIKA.closing}
        />

        {/* ── Progress ───────────────────────────────── */}
        <div className={`bg-neutral-900 border rounded-lg p-6 ${entriesError ? 'border-red-900' : 'border-neutral-800'}`}>
          <h2 className="text-xs font-bold tracking-[0.2em] text-neutral-400 uppercase mb-5">
            Twoja Saga — Postęp
          </h2>
          <div className="grid grid-cols-3 gap-4 mb-5">
            <div className="text-center">
              <p className="text-3xl font-bold text-red-600">{completedCount}</p>
              <p className="text-xs text-neutral-500 mt-1">dni ukończonych</p>
            </div>
            <div className="text-center border-x border-neutral-800">
              <p className="text-3xl font-bold text-neutral-100">{streak}</p>
              <p className="text-xs text-neutral-500 mt-1">dni z rzędu</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-neutral-100">
                {Math.min(nextDayNumber, 90)}
              </p>
              <p className="text-xs text-neutral-500 mt-1">dzień sagi</p>
            </div>
          </div>
          <div className="h-1.5 bg-neutral-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-red-700 rounded-full transition-all"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <p className="text-xs text-neutral-600 mt-2 text-right">
            {completedCount} / 90 dni
          </p>
        </div>

        {/* ── Today's entry CTA ──────────────────────── */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-6">
          <h2 className="text-xs font-bold tracking-[0.2em] text-neutral-400 uppercase mb-4">
            Dzisiejszy Wpis
          </h2>
          {entriesError ? (
            <p className="text-sm text-red-600 text-center py-3">
              Błąd wczytywania danych. Odśwież stronę.
            </p>
          ) : sagaComplete ? (
            <div className="block w-full text-center bg-neutral-800 text-yellow-500 font-bold py-4 rounded-lg tracking-wide text-sm border border-yellow-900">
              Twoja saga jest ukończona — 90 / 90 dni ✦
            </div>
          ) : !todayEntry ? (
            <Link
              href={`/dzien/${nextDayNumber}`}
              className="block w-full text-center bg-red-700 hover:bg-red-600 text-white font-bold py-4 rounded-lg tracking-wide transition-colors text-sm"
            >
              Rozpocznij Dzień {nextDayNumber}
            </Link>
          ) : todayEntry.is_complete ? (
            <div className="block w-full text-center bg-neutral-800 text-green-500 font-bold py-4 rounded-lg tracking-wide text-sm border border-green-900">
              Dzień {todayEntry.day_number} ukończony ✓
            </div>
          ) : (
            <Link
              href={`/dzien/${todayEntry.day_number}`}
              className="block w-full text-center border border-red-700 text-red-500 hover:bg-red-700 hover:text-white font-bold py-4 rounded-lg tracking-wide transition-colors text-sm"
            >
              Kontynuuj Dzień {todayEntry.day_number}
            </Link>
          )}
        </div>

        {/* ── Part One ───────────────────────────────── */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-xs font-bold tracking-[0.2em] text-neutral-400 uppercase">
              Część I — Runy Podstawy
            </h2>
            <Link
              href="/part-one"
              className="text-xs text-red-600 hover:text-red-400 transition-colors"
            >
              Otwórz →
            </Link>
          </div>
          <div className="space-y-2">
            {CZESC_I.runes.map((rune) => {
              const done = isRuneComplete(
                partOne as Record<string, unknown> | null,
                rune.id
              )
              return (
                <Link
                  key={rune.id}
                  href={`/part-one#${rune.id}`}
                  className="flex items-center gap-3 py-2 px-3 rounded hover:bg-neutral-800 transition-colors group"
                >
                  <span className="text-lg text-red-700 w-6 text-center shrink-0">
                    {rune.symbol}
                  </span>
                  <span className="text-sm text-neutral-400 font-semibold tracking-wider flex-1">
                    {rune.name}
                  </span>
                  <span className="text-xs text-neutral-600 flex-1 hidden sm:block">
                    {rune.subtitle}
                  </span>
                  <span
                    className={`text-xs font-bold tracking-wide ${
                      done ? 'text-green-600' : 'text-neutral-700'
                    }`}
                  >
                    {done ? '✓' : '○'}
                  </span>
                </Link>
              )
            })}
          </div>
        </div>

        {/* ── Recent entries ─────────────────────────── */}
        {recentEntries.length > 0 && (
          <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xs font-bold tracking-[0.2em] text-neutral-400 uppercase">
                Ostatnie Wpisy
              </h2>
              <Link
                href="/history"
                className="text-xs text-red-600 hover:text-red-400 transition-colors"
              >
                Historia →
              </Link>
            </div>
            <div className="space-y-1">
              {recentEntries.map((entry) => (
                <Link
                  key={entry.id}
                  href={`/dzien/${entry.day_number}`}
                  className="flex items-center gap-4 py-2.5 px-3 rounded hover:bg-neutral-800 transition-colors group"
                >
                  <span className="text-xs text-neutral-600 w-24 shrink-0">
                    {new Date(entry.entry_date + 'T12:00:00').toLocaleDateString(
                      'pl-PL',
                      { day: 'numeric', month: 'short' }
                    )}
                  </span>
                  <span className="text-sm text-neutral-400 flex-1">
                    Dzień {entry.day_number}
                  </span>
                  <span
                    className={`text-xs font-bold ${
                      entry.is_complete
                        ? 'text-green-600'
                        : 'text-neutral-600'
                    }`}
                  >
                    {entry.is_complete ? 'Ukończony' : 'W trakcie'}
                  </span>
                  <span className="text-neutral-700 group-hover:text-neutral-500 transition-colors">
                    →
                  </span>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* ── History link ───────────────────────────── */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-5">
          <Link
            href="/history"
            className="block w-full text-center text-sm text-red-600 hover:text-red-400 transition-colors font-semibold tracking-wide"
          >
            Zobacz całą historię →
          </Link>
        </div>
      </main>
    </div>
  )
}
