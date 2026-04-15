'use client'

import Link from 'next/link'

interface Props {
  dayNumber: number
  activeSection: number
  totalSections: number
  isComplete: boolean
  onSectionChange: (n: number) => void
}

export default function DayNav({
  dayNumber,
  activeSection,
  totalSections,
  isComplete,
  onSectionChange,
}: Props) {
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-[#0a0a0a] border-t border-neutral-800 z-50">
      {isComplete && (
        <div className="text-center py-1 bg-neutral-900 border-b border-neutral-800">
          <span className="text-xs text-green-600 font-semibold tracking-wide">
            Dzień {dayNumber} ukończony ✓
          </span>
        </div>
      )}

      <div className="max-w-2xl mx-auto flex items-center justify-between px-6 py-3">
        {/* Previous day */}
        {dayNumber > 1 ? (
          <Link
            href={`/dzien/${dayNumber - 1}`}
            className="text-sm text-neutral-600 hover:text-neutral-300 transition-colors"
          >
            ← Dzień {dayNumber - 1}
          </Link>
        ) : (
          <Link
            href="/dashboard"
            className="text-sm text-neutral-600 hover:text-neutral-300 transition-colors"
          >
            ← Pulpit
          </Link>
        )}

        {/* Section dots */}
        <div className="flex items-center gap-2">
          {Array.from({ length: totalSections }, (_, i) => (
            <button
              key={i}
              onClick={() => onSectionChange(i)}
              className={`rounded-full transition-all ${
                i === activeSection
                  ? 'w-4 h-2 bg-red-700'
                  : 'w-2 h-2 bg-neutral-700 hover:bg-neutral-500'
              }`}
              aria-label={`Sekcja ${i + 1}`}
            />
          ))}
        </div>

        {/* Next day */}
        {dayNumber < 90 ? (
          <Link
            href={`/dzien/${dayNumber + 1}`}
            className="text-sm text-neutral-600 hover:text-neutral-300 transition-colors"
          >
            Dzień {dayNumber + 1} →
          </Link>
        ) : (
          <Link
            href="/dashboard"
            className="text-sm text-neutral-600 hover:text-neutral-300 transition-colors"
          >
            Pulpit →
          </Link>
        )}
      </div>
    </div>
  )
}
