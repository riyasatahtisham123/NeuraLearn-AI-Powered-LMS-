import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  Mail, Lock, Eye, EyeOff, ArrowRight, AlertTriangle, Moon, Sun,
  Loader2, ShieldCheck, Sparkles, CheckCircle2,
} from 'lucide-react'
import { useStore } from '../lib/store.jsx'
import { PROJECT } from '../data/content.js'
import { Ambient, Avatar, BrandMark, Field } from '../components/ui.jsx'
import NeuralField from '../components/NeuralField.jsx'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

export default function Login() {
  const { login, theme, setTheme, state, toast } = useStore()
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [show, setShow] = useState(false)
  const [errors, setErrors] = useState({})
  const [alert, setAlert] = useState('')
  const [busy, setBusy] = useState(false)
  const [ok, setOk] = useState(false)

  const counts = {
    courses: state.courses.length,
    topics: state.courses.reduce((s, c) => s + c.topics.length, 0),
    resources: state.courses.reduce((s, c) => s + c.topics.reduce((a, t) => a + t.resources.length, 0), 0),
    questions: state.courses.reduce((s, c) => s + c.topics.reduce((a, t) => a + t.questions.length, 0), 0),
    learners: state.users.filter((u) => u.role === 'student').length,
  }

  const validate = () => {
    const e = {}
    if (!email.trim()) e.email = 'Email address is required.'
    else if (!EMAIL_RE.test(email.trim())) e.email = 'Enter a valid email address.'
    if (!password) e.password = 'Password is required.'
    else if (password.length < 4) e.password = 'Password must be at least 4 characters.'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const doLogin = () => {
    setAlert('')
    setBusy(true)
    window.setTimeout(() => {
      const res = login(email, password)
      setBusy(false)
      if (!res.ok) { setAlert(res.error); setOk(false); return }
      setOk(true)
      toast(`Welcome back, ${res.user.name.split(' ')[0]}`, { tone: 'success' })
      const target = location.state?.from
      window.setTimeout(() => {
        navigate(res.user.role === 'admin' ? '/admin' : (target && target !== '/login' ? target : '/'), { replace: true })
      }, 420)
    }, 480)
  }

  const onSubmit = (e) => {
    e.preventDefault()
    if (busy || ok) return
    if (!validate()) return
    doLogin()
  }

  return (
    <>
      <Ambient />
      <div className="auth">
        {/* ------------------------------------------------ identity panel */}
        <aside className="auth-aside">
          <NeuralField nodes={30} />
          <div className="orb orb-a" style={{ opacity: 0.34 }} />
          <div className="orb orb-b" style={{ opacity: 0.28 }} />

          <div className="row gap12" style={{ alignItems: 'flex-start' }}>
            <BrandMark size={46} />
            <div>
              <div className="brand-name" style={{ fontSize: 22 }}>{PROJECT.name}</div>
              <div className="brand-sub">{PROJECT.code} · Synopsis 2026</div>
            </div>
          </div>

          <div>
            <span className="eyebrow" style={{ color: 'var(--brand-3)' }}>{PROJECT.degree}</span>
            <h1 className="auth-headline mt12">
              Learning that <em>adapts</em> to every learner.
            </h1>
            <p className="auth-lede">
              An AI-powered Learning Management System that analyses quiz performance and study
              activity to find learning gaps, then recommends the exact resources and the exact
              order to study them in.
            </p>

            <div className="auth-stats">
              <div className="auth-stat"><b style={{ color: 'var(--cyan)' }}>{counts.courses}</b><span>Courses</span></div>
              <div className="auth-stat"><b style={{ color: 'var(--magenta)' }}>{counts.topics}</b><span>Topics</span></div>
              <div className="auth-stat"><b style={{ color: 'var(--lime)' }}>{counts.resources}</b><span>Resources</span></div>
            </div>

            <div className="row gap8 wrap mt20">
              {['TF-IDF vectorisation', 'Cosine similarity', 'Linear regression'].map((t) => (
                <span className="chip chip-violet" key={t}><Sparkles size={11} />{t}</span>
              ))}
            </div>
          </div>

          <div className="auth-meta">
            <div>
              <span className="eyebrow">Submitted by</span>
              <div className="auth-team mt8">
                {PROJECT.team.map((m, i) => (
                  <div className="auth-team-row" key={m.roll}>
                    <Avatar name={m.name} size="sm" tone={['cyan', 'magenta', 'lime'][i]} />
                    <span>{m.name}</span>
                    <span className="mono">{m.roll}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="auth-supervisor">
              Under supervision of <b>{PROJECT.supervisor}</b><br />
              <span className="muted" style={{ fontSize: 11.5 }}>{PROJECT.university} · {PROJECT.session}</span>
            </div>
          </div>
        </aside>

        {/* ---------------------------------------------------- login form */}
        <main className="auth-main">
          <div className="auth-theme">
            <button className="icon-btn" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              aria-label="Toggle colour theme">
              {theme === 'dark' ? <Sun /> : <Moon />}
            </button>
          </div>

          <div className="auth-card reveal">
            <div className="auth-card-head">
              <span className="eyebrow" style={{ color: 'var(--brand-3)' }}>Secure sign in</span>
              <h2 className="mt8">Welcome back</h2>
              <p>Enter your email and password to open your personalized dashboard.</p>
            </div>

            {alert && (
              <div className="auth-alert mb16" role="alert"><AlertTriangle /><span>{alert}</span></div>
            )}
            {ok && (
              <div className="auth-alert ok mb16" role="status"><CheckCircle2 /><span>Authenticated. Opening your dashboard…</span></div>
            )}

            <form className="auth-form" onSubmit={onSubmit} noValidate>
              <Field label="Email address" error={errors.email} required>
                <div className="input-group">
                  <Mail />
                  <input className="input" type="email" name="email" autoComplete="username" placeholder="you@lms.edu"
                    value={email} aria-invalid={!!errors.email} disabled={busy || ok}
                    onChange={(e) => { setEmail(e.target.value); setErrors((x) => ({ ...x, email: undefined })); setAlert('') }} />
                </div>
              </Field>

              <Field label="Password" error={errors.password} required>
                <div className="input-group">
                  <Lock />
                  <input className="input" type={show ? 'text' : 'password'} name="password" autoComplete="current-password"
                    placeholder="Enter your password" value={password} aria-invalid={!!errors.password}
                    style={{ paddingRight: 44 }} disabled={busy || ok}
                    onChange={(e) => { setPassword(e.target.value); setErrors((x) => ({ ...x, password: undefined })); setAlert('') }} />
                  <span className="input-addon">
                    <button type="button" className="icon-btn btn-sm" style={{ background: 'transparent', border: 0 }}
                      onClick={() => setShow((v) => !v)} disabled={busy || ok} aria-label={show ? 'Hide password' : 'Show password'}>
                      {show ? <EyeOff /> : <Eye />}
                    </button>
                  </span>
                </div>
              </Field>

              <button className="btn btn-primary btn-lg btn-block" type="submit" disabled={busy || ok}>
                {busy ? <><Loader2 className="spin" /> Verifying…</> : ok ? <><CheckCircle2 /> Signed in</> : <>Sign in <ArrowRight /></>}
              </button>
            </form>

            <div className="auth-foot auth-foot-lock">
              <ShieldCheck size={14} />
              <span>Sign-in is restricted to accounts issued by the administrator.</span>
            </div>
          </div>
        </main>
      </div>
    </>
  )
}