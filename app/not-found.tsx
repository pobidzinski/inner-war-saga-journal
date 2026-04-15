import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-neutral-200 flex items-center justify-center px-6">
      <div className="text-center">
        <p className="text-6xl text-red-900 mb-6 select-none">ᚷ</p>
        <h1 className="text-lg font-bold tracking-[0.15em] text-neutral-300 mb-2">
          Nie znaleziono strony
        </h1>
        <p className="text-sm text-neutral-600 mb-8">
          Ta ścieżka nie istnieje w Twojej sadze.
        </p>
        <Link
          href="/dashboard"
          className="text-sm text-red-700 hover:text-red-500 transition-colors"
        >
          ← Wróć do pulpitu
        </Link>
      </div>
    </div>
  )
}
