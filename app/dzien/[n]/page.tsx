import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import DayEntryClient from './DayEntryClient'

export default async function DayPage({
  params,
}: {
  params: Promise<{ n: string }>
}) {
  const { n: nStr } = await params
  const dayNumber = parseInt(nStr, 10)

  if (isNaN(dayNumber) || dayNumber < 1 || dayNumber > 90) {
    redirect('/dashboard')
  }

  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: entry, error } = await supabase
    .from('daily_entries')
    .select('*')
    .eq('day_number', dayNumber)
    .maybeSingle()

  if (error) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center px-6">
        <div className="text-center">
          <p className="text-red-700 text-3xl mb-4">ᚢ</p>
          <p className="text-sm text-neutral-400 mb-2">
            Nie udało się wczytać wpisu. Spróbuj ponownie.
          </p>
          <p className="text-xs text-neutral-700 mb-6">{error.message}</p>
          <a href="/dashboard" className="text-sm text-red-700 hover:text-red-500 transition-colors">
            ← Wróć do pulpitu
          </a>
        </div>
      </div>
    )
  }

  // If entry exists use its date, otherwise use today
  const entryDate =
    entry?.entry_date ?? new Date().toISOString().slice(0, 10)

  return (
    <DayEntryClient
      userId={user.id}
      dayNumber={dayNumber}
      entryDate={entryDate}
      initialData={entry}
    />
  )
}
