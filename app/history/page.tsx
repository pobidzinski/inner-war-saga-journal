import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

// ── Types ─────────────────────────────────────────────────────

type Entry = {
  id: string
  day_number: number
  entry_date: string
  is_complete: boolean
  plan: string | null
}

// ── Stats helpers ──────────────────────────────────────────────

function calcCurrentStreak(entries: Entry[]): number {
  const completedDates = new Set(
    entries.filter((e) => e.is_complete).map((e) => e.entry_date)
  )
  let streak = 0
  const today = new Date()
  for (let i = 0; i < 90; i++) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    const key = d.toISOString().slice(0, 10)
    if (completedDates.has(key)) {
      streak++
    } else {
      break
    }
  }
  return streak
}

function calcLongestStreak(entries: Entry[]): number {
  const sorted = [...entries]
    .filter((e) => e.is_complete)
    .sort((a, b) => a.entry_date.localeCompare(b.entry_date))

  if (sorted.length === 0) return 0

  let longest = 1
  let current = 1

  for (let i = 1; i < sorted.length; i++) {
    const prev = new Date(sorted[i - 1].entry_date + 'T12:00:00')
    const curr = new Date(sorted[i].entry_date + 'T12:00:00')
    const diffDays = Math.round(
      (curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24)
    )
    if (diffDays === 1) {
      current++
      if (current > longest) longest = current
    } else {
      current = 1
    }
  }

  return longest
}

// ── Formatting ─────────────────────────────────────────────────

function formatDate(dateStr: string): string {
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('pl-PL', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

// ── Page ───────────────────────────────────────────────────────

export default async function HistoryPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: rows, error } = await supabase
    .from('daily_entries')
    .select('id, day_number, entry_date, is_complete, plan')
    .order('day_number', { ascending: true })

  if (error) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center px-6">
        <div className="text-center">
          <p className="text-red-700 text-3xl mb-4">ᛉ</p>
          <p className="text-sm text-neutral-400 mb-2">
            Nie udało się wczytać historii wpisów. Spróbuj ponownie.
          </p>
          <p className="text-xs text-neutral-700 mb-6">{error.message}</p>
          <a href="/dashboard" className="text-sm text-red-700 hover:text-red-500 transition-colors">
            ← Wróć do pulpitu
          </a>
        </div>
      </div>
    )
  }

  const entries: Entry[] = rows ?? []

  // Build lookup map
  const byDay = new Map<number, Entry>()
  for (const e of entries) byDay.set(e.day_number, e)

  // Today's day number
  const todayStr = new Date().toISOString().slice(0, 10)
  const todayEntry = entries.find((e) => e.entry_date === todayStr)
  const maxDayWritten = entries.length > 0
    ? Math.max(...entries.map((e) => e.day_number))
    : 0
  const todayDayNumber = todayEntry?.day_number ?? maxDayWritten + 1

  // Stats
  const totalWritten = entries.length
  const totalCompleted = entries.filter((e) => e.is_complete).length
  const currentStreak = calcCurrentStreak(entries)
  const longestStreak = calcLongestStreak(entries)

  // Written entries for list (desc order)
  const writtenEntries = [...entries].sort(
    (a, b) => b.day_number - a.day_number
  )

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-neutral-200">
      {/* ── Header ─────────────────────────────────────────── */}
      <header className="border-b border-neutral-800 px-6 py-4">
        <div className="max-w-3xl mx-auto flex items-center gap-4">
          <Link
            href="/dashboard"
            className="text-neutral-600 hover:text-neutral-400 text-sm transition-colors"
          >
            ← Powrót
          </Link>
          <span className="text-neutral-800">|</span>
          <div>
            <span className="text-red-700 text-sm mr-2">ᛉ</span>
            <span className="text-sm font-bold tracking-[0.15em] text-neutral-100 uppercase">
              Historia Twojej Sagi
            </span>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-8 space-y-8">
        {/* ── Stats row ──────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard
            value={totalWritten}
            label="Zapisanych dni"
            color="text-neutral-100"
          />
          <StatCard
            value={totalCompleted}
            label="Ukończonych"
            color="text-red-500"
          />
          <StatCard
            value={currentStreak}
            label="Obecna seria"
            color="text-neutral-100"
          />
          <StatCard
            value={longestStreak}
            label="Najdłuższa seria"
            color="text-neutral-100"
          />
        </div>

        {/* ── Calendar grid ──────────────────────────────── */}
        <section>
          <h2 className="text-xs font-bold tracking-[0.2em] text-neutral-500 uppercase mb-4">
            90 dni sagi
          </h2>

          <div className="grid grid-cols-10 gap-1.5">
            {Array.from({ length: 90 }, (_, i) => {
              const dayNum = i + 1
              const entry = byDay.get(dayNum)
              const isToday = dayNum === todayDayNumber
              const isComplete = entry?.is_complete === true
              const isWritten = !!entry && !isComplete

              let cellCls =
                'relative flex items-center justify-center aspect-square rounded text-xs font-bold transition-colors'

              if (isComplete) {
                cellCls += ' bg-[#c0392b] text-white'
              } else if (isWritten) {
                cellCls +=
                  ' bg-neutral-900 border border-red-900 text-red-400'
              } else {
                cellCls += ' bg-neutral-900 text-neutral-700'
              }

              if (isToday) {
                cellCls += ' ring-1 ring-white ring-offset-1 ring-offset-[#0a0a0a]'
              }

              return (
                <Link
                  key={dayNum}
                  href={`/dzien/${dayNum}`}
                  className={cellCls}
                  title={
                    entry
                      ? `Dzień ${dayNum} — ${formatDate(entry.entry_date)}${isComplete ? ' ✓' : ''}`
                      : `Dzień ${dayNum}`
                  }
                >
                  {dayNum}
                </Link>
              )
            })}
          </div>

          {/* Legend */}
          <div className="flex flex-wrap items-center gap-4 mt-4">
            <LegendItem
              cls="bg-neutral-900 border border-neutral-800"
              label="Brak wpisu"
            />
            <LegendItem
              cls="bg-neutral-900 border border-red-900"
              label="Rozpoczęty"
            />
            <LegendItem cls="bg-[#c0392b]" label="Ukończony" />
            <LegendItem
              cls="bg-neutral-900 ring-1 ring-white ring-offset-1 ring-offset-[#0a0a0a]"
              label="Dzisiaj"
            />
          </div>
        </section>

        {/* ── Entries list ───────────────────────────────── */}
        {writtenEntries.length > 0 && (
          <section>
            <h2 className="text-xs font-bold tracking-[0.2em] text-neutral-500 uppercase mb-4">
              Zapisane wpisy
            </h2>
            <div className="space-y-1">
              {writtenEntries.map((entry) => {
                const preview = entry.plan
                  ? entry.plan.slice(0, 100).trimEnd() +
                    (entry.plan.length > 100 ? '…' : '')
                  : null

                return (
                  <Link
                    key={entry.id}
                    href={`/dzien/${entry.day_number}`}
                    className="group flex items-start gap-4 px-4 py-3 rounded-lg hover:bg-neutral-900 transition-colors"
                  >
                    {/* Day badge */}
                    <div
                      className={`shrink-0 w-10 h-10 rounded flex items-center justify-center text-xs font-bold ${
                        entry.is_complete
                          ? 'bg-[#c0392b] text-white'
                          : 'bg-neutral-800 border border-red-900 text-red-400'
                      }`}
                    >
                      {entry.day_number}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-0.5">
                        <span className="text-sm font-semibold text-neutral-300">
                          Dzień {entry.day_number}
                        </span>
                        <span className="text-xs text-neutral-600">
                          {formatDate(entry.entry_date)}
                        </span>
                        {entry.is_complete && (
                          <span className="text-xs text-green-600 font-semibold">
                            Ukończony
                          </span>
                        )}
                      </div>
                      {preview && (
                        <p className="text-xs text-neutral-600 truncate">
                          {preview}
                        </p>
                      )}
                    </div>

                    <span className="text-neutral-700 group-hover:text-neutral-500 transition-colors shrink-0 self-center">
                      →
                    </span>
                  </Link>
                )
              })}
            </div>
          </section>
        )}

        {writtenEntries.length === 0 && (
          <div className="text-center py-16 text-neutral-700">
            <p className="text-4xl mb-4">ᛉ</p>
            <p className="text-sm">Twoja saga jeszcze się nie rozpoczęła.</p>
            <Link
              href="/dzien/1"
              className="inline-block mt-4 text-sm text-red-700 hover:text-red-500 transition-colors"
            >
              Rozpocznij Dzień 1 →
            </Link>
          </div>
        )}
      </main>
    </div>
  )
}

// ── Small components ───────────────────────────────────────────

function StatCard({
  value,
  label,
  color,
}: {
  value: number
  label: string
  color: string
}) {
  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-lg px-4 py-4 text-center">
      <p className={`text-3xl font-bold ${color}`}>{value}</p>
      <p className="text-xs text-neutral-600 mt-1">{label}</p>
    </div>
  )
}

function LegendItem({ cls, label }: { cls: string; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className={`w-4 h-4 rounded ${cls}`} />
      <span className="text-xs text-neutral-600">{label}</span>
    </div>
  )
}
