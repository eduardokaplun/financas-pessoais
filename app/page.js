'use client'
import { useEffect, useState } from 'react'
import { createClient } from '../lib/supabase'
import Login from './login/page'
import Dashboard from './dashboard/page'

export default function Home() {
  const [user, setUser] = useState(undefined)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => setUser(data.user ?? null))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user ?? null)
    })
    return () => subscription.unsubscribe()
  }, [])

  if (!mounted || user === undefined) return <div className="loading">Carregando...</div>
  if (!user) return <Login onLogin={setUser} />
  return <Dashboard user={user} onLogout={() => setUser(null)} />
}
