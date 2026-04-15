'use client'

import { useState } from 'react'

interface Props {
  title: string
  verses: string[]
  closing: string
}

export default function PrayerCard({ title, verses, closing }: Props) {
  const [expanded, setExpanded] = useState(false)

  const preview = verses.slice(0, 3)
  const rest = verses.slice(3)

  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-6">
      <div className="flex items-center gap-3 mb-4">
        <span className="text-red-600 text-xl">᛭</span>
        <h2 className="text-xs font-bold tracking-[0.2em] text-neutral-400 uppercase">
          {title}
        </h2>
      </div>

      <div className="space-y-3">
        {preview.map((verse, i) => (
          <p key={i} className="text-neutral-300 text-sm leading-relaxed whitespace-pre-line">
            {verse}
          </p>
        ))}

        {expanded && (
          <>
            {rest.map((verse, i) => (
              <p key={i} className="text-neutral-300 text-sm leading-relaxed whitespace-pre-line">
                {verse}
              </p>
            ))}
            <p className="text-red-700 text-xs font-bold tracking-widest mt-4 whitespace-pre-line">
              {closing}
            </p>
          </>
        )}
      </div>

      <button
        onClick={() => setExpanded((v) => !v)}
        className="mt-4 text-xs text-red-600 hover:text-red-400 transition-colors tracking-wide font-semibold cursor-pointer"
      >
        {expanded ? '↑ Zwiń' : 'Czytaj całą modlitwę →'}
      </button>
    </div>
  )
}
