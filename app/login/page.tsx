'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleLogin() {
    setError(null)
    setLoading(true)

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError('Nieprawidłowy e-mail lub hasło.')
      setLoading(false)
      return
    }

    router.push('/dashboard')
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: '#0a0a0a',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'sans-serif',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 380,
          padding: '2.5rem 2rem',
          border: '1px solid #1f1f1f',
          borderRadius: 8,
          backgroundColor: '#111',
        }}
      >
        <h1
          style={{
            color: '#c0392b',
            fontSize: '1.5rem',
            fontWeight: 700,
            marginBottom: '0.25rem',
            letterSpacing: '0.05em',
            textTransform: 'uppercase',
          }}
        >
          Inner War
        </h1>
        <p style={{ color: '#555', fontSize: '0.85rem', marginBottom: '2rem' }}>
          Dziennik 90-dniowej podróży
        </p>

        <label style={{ display: 'block', marginBottom: '1.25rem' }}>
          <span style={{ color: '#888', fontSize: '0.8rem', display: 'block', marginBottom: '0.4rem' }}>
            Adres e-mail
          </span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
            autoComplete="email"
            style={{
              width: '100%',
              padding: '0.6rem 0.75rem',
              backgroundColor: '#1a1a1a',
              border: '1px solid #2a2a2a',
              borderRadius: 4,
              color: '#e0e0e0',
              fontSize: '0.95rem',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
        </label>

        <label style={{ display: 'block', marginBottom: '1.5rem' }}>
          <span style={{ color: '#888', fontSize: '0.8rem', display: 'block', marginBottom: '0.4rem' }}>
            Hasło
          </span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
            autoComplete="current-password"
            style={{
              width: '100%',
              padding: '0.6rem 0.75rem',
              backgroundColor: '#1a1a1a',
              border: '1px solid #2a2a2a',
              borderRadius: 4,
              color: '#e0e0e0',
              fontSize: '0.95rem',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
        </label>

        {error && (
          <p style={{ color: '#c0392b', fontSize: '0.85rem', marginBottom: '1rem' }}>
            {error}
          </p>
        )}

        <button
          onClick={handleLogin}
          disabled={loading}
          style={{
            width: '100%',
            padding: '0.7rem',
            backgroundColor: loading ? '#7f1a10' : '#c0392b',
            color: '#fff',
            border: 'none',
            borderRadius: 4,
            fontSize: '0.95rem',
            fontWeight: 600,
            cursor: loading ? 'not-allowed' : 'pointer',
            letterSpacing: '0.03em',
            transition: 'background-color 0.15s',
          }}
        >
          {loading ? 'Logowanie…' : 'Zaloguj się'}
        </button>
      </div>
    </div>
  )
}
