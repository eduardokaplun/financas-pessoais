'use client'
import dynamic from 'next/dynamic'
import { useEffect, useState } from 'react'
import { createClient } from '../lib/supabase'

const Login = dynamic(() => import('./login/page'), { ssr: false })
const Dashboard = dynamic(() => import('./dashboard/page'), { ssr: false })

export default function Home() {
  const [user, setUser] = useState(undefined)
  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user ?? null))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user ?? null)
    })
    return () => subscription.unsubscribe()
  }, [])

  if (user === undefined) return <div className="loading">Carregando...</div>
  if (!user) return <Login onLogin={setUser} />
  return <Dashboard user={user} onLogout={() => setUser(null)} />
}
