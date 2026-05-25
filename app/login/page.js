'use client'
import { useState } from 'react'
import { createClient } from '../../lib/supabase'

export default function Login({ onLogin }) {
  const [mode, setMode] = useState('login') // login | signup
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [msg, setMsg] = useState('')
  const supabase = createClient()

  async function handle() {
    setLoading(true); setError(''); setMsg('')
    if (mode === 'login') {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) setError('Email ou senha incorretos.')
      else onLogin(data.user)
    } else {
      const { error } = await supabase.auth.signUp({ email, password })
      if (error) setError(error.message)
      else setMsg('Conta criada! Verifique seu email para confirmar, depois faça login.')
    }
    setLoading(false)
  }

  return (
    <div className="login-wrap">
      <div className="login-box">
        <div style={{fontSize:32,marginBottom:12}}>💰</div>
        <div className="login-title">Minhas Finanças</div>
        <div className="login-sub">
          {mode === 'login' ? 'Entre na sua conta para continuar.' : 'Crie sua conta gratuita.'}
        </div>
        {error && <div className="login-err">{error}</div>}
        {msg && <div style={{background:'#f0fdf8',color:'var(--g)',border:'1px solid #bbf7d0',borderRadius:'var(--rads)',padding:'10px 14px',fontSize:13,marginBottom:14}}>{msg}</div>}
        <div className="login-field">
          <label>Email</label>
          <input type="email" placeholder="seu@email.com" value={email} onChange={e=>setEmail(e.target.value)} onKeyDown={e=>e.key==='Enter'&&handle()} />
        </div>
        <div className="login-field">
          <label>Senha</label>
          <input type="password" placeholder="••••••••" value={password} onChange={e=>setPassword(e.target.value)} onKeyDown={e=>e.key==='Enter'&&handle()} />
        </div>
        <button className="login-btn" onClick={handle} disabled={loading||!email||!password}>
          {loading ? <><span className="spinner"></span>Aguarde...</> : mode==='login' ? 'Entrar' : 'Criar conta'}
        </button>
        <div className="login-switch">
          {mode==='login' ? <>Não tem conta? <span onClick={()=>{setMode('signup');setError('');setMsg('')}}>Criar agora</span></> : <>Já tem conta? <span onClick={()=>{setMode('login');setError('');setMsg('')}}>Entrar</span></>}
        </div>
      </div>
    </div>
  )
}
