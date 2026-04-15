import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import PartOneClient from './PartOneClient'

export default async function PartOnePage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: partOne, error } = await supabase
    .from('part_one')
    .select('*')
    .maybeSingle()

  if (error) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center px-6">
        <div className="text-center">
          <p className="text-red-700 text-3xl mb-4">ᚦ</p>
          <p className="text-sm text-neutral-400 mb-2">
            Nie udało się wczytać danych. Spróbuj ponownie.
          </p>
          <p className="text-xs text-neutral-700">{error.message}</p>
        </div>
      </div>
    )
  }

  return <PartOneClient userId={user.id} initialData={partOne} />
}
