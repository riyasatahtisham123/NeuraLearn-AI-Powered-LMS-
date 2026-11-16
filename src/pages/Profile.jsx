import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  User, Mail, Lock, Save, Moon, Sun, Shield, GraduationCap, BookOpen, Clock,
  ClipboardList, CheckCircle2, RotateCcw, LogOut, Palette, Info, Eye, EyeOff,
  Award, Target, Building2, CalendarDays,
} from 'lucide-react'
import { useStore } from '../lib/store.jsx'
import { PROJECT } from '../data/content.js'
import {
  strengthsAndGaps, courseCompletion, totalStudyMinutes, resourceStats,
} from '../lib/ai.js'
import { fmtDate, hoursMinutes, pct } from '../lib/format.js'
import {
  PageHead, Panel, Field, Chip, Avatar, Kpi, StatLine, Segmented, ConfirmDialog,
  Banner, Bar, Empty,
} from '../components/ui.jsx'

const TONES = ['cyan', 'violet', 'magenta', 'lime', 'amber', 'rose']
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

export default function Profile() {
  const { state, user, theme, setTheme, updateProfile, resetDemo, logout, toast } = useStore()
  const navigate = useNavigate()
  const isAdmin = user.role === 'admin'

  const [form, setForm] = useState({
    name: user.name ?? '',
    email: user.email ?? '',
    roll: user.roll ?? '',
    branch: user.branch ?? '',
    semester: user.semester ?? '',
    section: user.section ?? '',
    designation: user.designation ?? '',
    department: user.department ?? '',
    tone: user.tone ?? 'violet',
  })
  const [pw, setPw] = useState({ current: '', next: '', confirm: '' })
  const [showPw, setShowPw] = useState(false)
  const [errors, setErrors] = useState({})
  const [pwErrors, setPwErrors] = useState({})
  const [resetOpen, setResetOpen] = useState(false)
  const [signOutOpen, setSignOutOpen] = useState(false)

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  const stats = useMemo(() => {
    if (isAdmin) {
      return {
        students: state.users.filter((u) => u.role === 'student').length,
        courses: state.courses.length,
        topics: state.courses.reduce((s, c) => s + c.topics.length, 0),
        resources: state.courses.reduce((s, c) => s + c.topics.reduce((n, t) => n + t.resources.length, 0), 0),
        questions: state.courses.reduce((s, c) => s + c.topics.reduce((n, t) => n + t.questions.length, 0), 0),
        attempts: state.attempts.length,
      }
    }
    const summary = strengthsAndGaps(state, user.id)
    return {
      summary,
      courses: courseCompletion(state, user.id),
      minutes: totalStudyMinutes(state, user.id),
      res: resourceStats(state, user.id),
      attempts: state.attempts.filter((a) => a.studentId === user.id).length,
      enrolled: state.enrollments.filter((e) => e.studentId === user.id).length,
    }
  }, [state, user.id, isAdmin])

  const dirty = Object.keys(form).some((k) => String(form[k] ?? '') !== String(user[k] ?? ''))

  const saveProfile = (e) => {
    e.preventDefault()
    const errs = {}
    if (!form.name.trim()) errs.name = 'Name is required.'
    if (!form.email.trim()) errs.email = 'Email is required.'
    else if (!EMAIL_RE.test(form.email.trim())) errs.email = 'Enter a valid email address.'
    else if (state.users.some((u) => u.id !== user.id && u.email.toLowerCase() === form.email.trim().toLowerCase())) {
      errs.email = 'Another account already uses this email.'
    }
    setErrors(errs)
    if (Object.keys(errs).length) return
    const patch = {
      name: form.name.trim(),
      email: form.email.trim().toLowerCase(),
      tone: form.tone,
      initials: form.name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? '').join(''),
      ...(isAdmin
        ? { designation: form.designation.trim(), department: form.department.trim() }
        : { roll: form.roll.trim(), branch: form.branch.trim(), semester: form.semester.trim(), section: form.section.trim() }),
    }
    updateProfile(patch)
  }

  const savePassword = (e) => {
    e.preventDefault()
    const errs = {}
    if (pw.current !== user.password) errs.current = 'Current password is incorrect.'
    if (pw.next.length < 4) errs.next = 'Use at least 4 characters.'
    if (pw.next !== pw.confirm) errs.confirm = 'Passwords do not match.'
    setPwErrors(errs)
    if (Object.keys(errs).length) return
    updateProfile({ password: pw.next })
    setPw({ current: '', next: '', confirm: '' })
    toast('Password changed — use it at the next sign in', { tone: 'success' })
  }

  return (
    <>
      <PageHead eyebrow="Account" title={isAdmin ? 'Administrator settings' : 'My profile'}
        subtitle={isAdmin
          ? 'Your administrator account, appearance preferences and the project record this system was built from.'
          : 'Your learner record, academic details, appearance preferences and a summary of everything the AI has analysed so far.'}
        actions={<button className="btn btn-ghost" onClick={() => setSignOutOpen(true)}><LogOut /> Sign out</button>} />

      <div className="grid g-main mb16">
        <Panel title="Account details" icon={User} className="reveal reveal-1"
          actions={dirty ? <Chip tone="warn">Unsaved changes</Chip> : <Chip tone="ok">Saved</Chip>}>
          <div className="row gap16 wrap mb20">
            <Avatar user={{ ...user, ...form }} size="xl" />
            <div style={{ flex: 1, minWidth: 200 }}>
              <h2 style={{ fontSize: 21 }}>{form.name || user.name}</h2>
              <p className="muted mono mt4" style={{ fontSize: 12 }}>{form.email || user.email}</p>
              <div className="row gap6 wrap mt8">
                <Chip tone={isAdmin ? 'violet' : 'cyan'} icon={Shield}>{isAdmin ? 'Administrator' : 'Student'}</Chip>
                {!isAdmin && form.roll && <Chip tone="slate">Roll {form.roll}</Chip>}
                <Chip tone="slate"><CalendarDays size={11} /> Joined {fmtDate(user.createdAt)}</Chip>
              </div>
            </div>
          </div>

          <form onSubmit={saveProfile}>
            <div className="grid g2">
              <Field label="Full name" required error={errors.name}>
                <div className="input-group"><span className="input-addon"><User size={14} /></span>
                  <input className="input" value={form.name} onChange={set('name')} placeholder="Your name" /></div>
              </Field>
              <Field label="Email address" required error={errors.email} hint="Used to sign in.">
                <div className="input-group"><span className="input-addon"><Mail size={14} /></span>
                  <input className="input" type="email" value={form.email} onChange={set('email')} placeholder="you@lms.edu" /></div>
              </Field>

              {isAdmin ? (
                <>
                  <Field label="Designation">
                    <input className="input" value={form.designation} onChange={set('designation')} placeholder="System Administrator" />
                  </Field>
                  <Field label="Department">
                    <input className="input" value={form.department} onChange={set('department')} placeholder="Computer Science & Engineering" />
                  </Field>
                </>
              ) : (
                <>
                  <Field label="Roll number">
                    <div className="input-group"><span className="input-addon"><GraduationCap size={14} /></span>
                      <input className="input" value={form.roll} onChange={set('roll')} placeholder="2300101833" /></div>
                  </Field>
                  <Field label="Branch / programme">
                    <input className="input" value={form.branch} onChange={set('branch')} placeholder="B.Tech CSE" />
                  </Field>
                  <Field label="Semester">
                    <select className="select" value={form.semester} onChange={set('semester')}>
                      {['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII'].map((s) => <option key={s} value={s}>Semester {s}</option>)}
                    </select>
                  </Field>
                  <Field label="Section">
                    <select className="select" value={form.section} onChange={set('section')}>
                      {['A', 'B', 'C', 'D'].map((s) => <option key={s} value={s}>Section {s}</option>)}
                    </select>
                  </Field>
                </>
              )}
            </div>

            <Field label="Avatar colour" hint="Used across the sidebar, tables and activity feed.">
              <div className="row gap8 wrap">
                {TONES.map((t) => (
                  <button key={t} type="button" onClick={() => setForm((f) => ({ ...f, tone: t }))}
                    aria-label={`Use ${t} avatar`} aria-pressed={form.tone === t}
                    style={{
                      width: 34, height: 34, borderRadius: 11, cursor: 'pointer',
                      border: form.tone === t ? '2px solid var(--text)' : '1px solid var(--line-2)',
                      background: `var(--${t})`, display: 'grid', placeItems: 'center',
                      color: '#0b1030', fontWeight: 700, fontSize: 12,
                    }}>
                    {form.tone === t ? <CheckCircle2 size={16} /> : (form.name || user.name).slice(0, 1).toUpperCase()}
                  </button>
                ))}
              </div>
            </Field>

            <div className="row gap8 mt20">
              <button className="btn btn-primary" type="submit" disabled={!dirty}><Save /> Save changes</button>
              <button className="btn btn-ghost" type="button" disabled={!dirty}
                onClick={() => {
                  setForm({
                    name: user.name ?? '', email: user.email ?? '', roll: user.roll ?? '',
                    branch: user.branch ?? '', semester: user.semester ?? '', section: user.section ?? '',
                    designation: user.designation ?? '', department: user.department ?? '', tone: user.tone ?? 'violet',
                  })
                  setErrors({})
                }}>Discard</button>
            </div>
          </form>
        </Panel>

        <div className="col gap16">
          <Panel title="Appearance" icon={Palette} className="reveal reveal-2">
            <Segmented value={theme} onChange={setTheme} options={[
              { value: 'dark', label: <><Moon size={13} /> Midnight</> },
              { value: 'light', label: <><Sun size={13} /> Daylight</> },
            ]} />
            <p className="field-hint mt12">
              The palette, charts, scrollbars and ambient background all follow this setting. Your choice is stored on this device.
            </p>
            <div className="row gap6 wrap mt12">
              {['cyan', 'violet', 'magenta', 'lime', 'amber', 'rose'].map((t) => (
                <span key={t} className="legend-swatch" style={{ background: `var(--${t})`, width: 18, height: 18, borderRadius: 6 }} title={t} />
              ))}
            </div>
          </Panel>

          <Panel title="Change password" icon={Lock} className="reveal reveal-3">
            <form onSubmit={savePassword}>
              <Field label="Current password" required error={pwErrors.current}>
                <div className="input-group">
                  <span className="input-addon"><Lock size={14} /></span>
                  <input className="input" type={showPw ? 'text' : 'password'} value={pw.current}
                    onChange={(e) => setPw((p) => ({ ...p, current: e.target.value }))} autoComplete="current-password" />
                  <button type="button" className="input-addon" onClick={() => setShowPw((s) => !s)}
                    aria-label={showPw ? 'Hide passwords' : 'Show passwords'} style={{ cursor: 'pointer', background: 'transparent', border: 0 }}>
                    {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </Field>
              <Field label="New password" required error={pwErrors.next} hint="Minimum 4 characters.">
                <input className="input" type={showPw ? 'text' : 'password'} value={pw.next}
                  onChange={(e) => setPw((p) => ({ ...p, next: e.target.value }))} autoComplete="new-password" />
              </Field>
              <Field label="Confirm new password" required error={pwErrors.confirm}>
                <input className="input" type={showPw ? 'text' : 'password'} value={pw.confirm}
                  onChange={(e) => setPw((p) => ({ ...p, confirm: e.target.value }))} autoComplete="new-password" />
              </Field>
              <button className="btn btn-outline btn-block mt8" type="submit"
                disabled={!pw.current && !pw.next && !pw.confirm}><Lock /> Update password</button>
            </form>
          </Panel>
        </div>
      </div>

      {isAdmin ? (
        <div className="grid g6 mb16">
          <Kpi label="Students" value={stats.students} icon={User} tone="cyan" delay={40} />
          <Kpi label="Courses" value={stats.courses} icon={BookOpen} tone="violet" delay={80} />
          <Kpi label="Topics" value={stats.topics} icon={Target} tone="magenta" delay={120} />
          <Kpi label="Resources" value={stats.resources} icon={CheckCircle2} tone="lime" delay={160} />
          <Kpi label="Questions" value={stats.questions} icon={ClipboardList} tone="amber" delay={200} />
          <Kpi label="Attempts" value={stats.attempts} icon={Award} tone="rose" delay={240} />
        </div>
      ) : (
        <>
          <div className="grid g5 mb16">
            <Kpi label="Overall average" value={stats.summary.overall} unit="%" icon={Target} tone="cyan" delay={40} />
            <Kpi label="Learning gaps" value={stats.summary.gaps.length} icon={Award} tone={stats.summary.gaps.length ? 'rose' : 'lime'} delay={80} />
            <Kpi label="Quiz attempts" value={stats.attempts} icon={ClipboardList} tone="violet" delay={120} />
            <Kpi label="Study time" value={hoursMinutes(stats.minutes)} icon={Clock} tone="magenta" delay={160} />
            <Kpi label="Resources done" value={stats.res.completed} unit={`/ ${stats.res.total}`} icon={CheckCircle2} tone="lime" delay={200} />
          </div>

          <div className="grid g2 mb16">
            <Panel title="Enrolled courses" icon={BookOpen} className="reveal reveal-3"
              actions={<Link className="btn btn-sm btn-ghost" to="/courses">Manage</Link>}>
              {stats.courses.length === 0 ? (
                <Empty icon={BookOpen} title="No enrolments" action={<Link className="btn btn-sm btn-primary mt12" to="/courses">Browse courses</Link>} />
              ) : (
                <div className="col gap16">
                  {stats.courses.map((c) => (
                    <div key={c.courseId}>
                      <div className="row-between mb8">
                        <Link to={`/courses/${c.courseId}`} className="row gap8" style={{ textDecoration: 'none', color: 'var(--text)' }}>
                          <span className={`chip chip-${c.tone}`}>{c.code}</span>
                          <b style={{ fontSize: 13, fontFamily: 'var(--font-display)' }}>{c.title}</b>
                        </Link>
                        <span className="mono" style={{ fontSize: 11.5 }}>{c.attemptedTopics}/{c.totalTopics} topics</span>
                      </div>
                      <Bar value={c.percent} tone={c.tone} height={6} />
                      <div className="row-between mt8" style={{ fontSize: 11.3, color: 'var(--text-3)' }}>
                        <span>{c.resDone}/{c.resTotal} resources</span>
                        <span>average <b className="mono">{pct(c.average)}</b></span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Panel>

            <Panel title="Academic record" icon={GraduationCap} className="reveal reveal-4">
              <div className="col gap10">
                <StatLine label="University" value={PROJECT.university} />
                <StatLine label="Programme" value={form.branch || '—'} />
                <StatLine label="Roll number" value={form.roll || '—'} />
                <StatLine label="Semester / section" value={`${form.semester || '—'} / ${form.section || '—'}`} />
                <StatLine label="Session" value={PROJECT.session} />
                <StatLine label="Account created" value={fmtDate(user.createdAt)} />
                <StatLine label="Courses enrolled" value={stats.enrolled} tone="cyan" />
                <StatLine label="Topics analysed" value={stats.summary.topicsCovered} tone="violet" />
                <StatLine label="Strengths" value={stats.summary.strengths.length} tone="lime" />
              </div>
            </Panel>
          </div>
        </>
      )}

      <div className="grid g2 mb16">
        <Panel title="About this project" icon={Building2} className="reveal reveal-4"
          eyebrow={`${PROJECT.code} · ${PROJECT.session}`}>
          <h3 style={{ fontSize: 16, lineHeight: 1.4 }}>{PROJECT.fullTitle}</h3>
          <p className="muted mt8" style={{ fontSize: 12.5, lineHeight: 1.65 }}>
            {PROJECT.degree} · {PROJECT.university}
          </p>
          <div className="rule mt16 mb12" />
          <StatLine label="Supervisor" value={PROJECT.supervisor} />
          <div className="eyebrow mt16 mb8">Project team</div>
          <div className="col gap8">
            {PROJECT.team.map((m) => (
              <div className="row gap10" key={m.roll}>
                <Avatar name={m.name} tone="violet" size="sm" />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <b style={{ fontSize: 12.6, display: 'block' }}>{m.name}</b>
                  <span className="muted" style={{ fontSize: 11 }}>{m.role}</span>
                </div>
                <span className="mono muted" style={{ fontSize: 11 }}>{m.roll}</span>
              </div>
            ))}
          </div>
          <div className="eyebrow mt16 mb8">Technology used</div>
          <div className="term-tags">
            {PROJECT.stack.map((s) => <span className="term-tag" key={s}>{s}</span>)}
          </div>
        </Panel>

        <div className="col gap16">
          <Panel title="Data & storage" icon={Info} className="reveal reveal-5">
            <Banner tone="info" icon={Info} title="Everything runs in your browser">
              Courses, learners, attempts, resource views and study sessions are seeded locally and saved to this device's
              localStorage. No server, no network calls, no account data leaves the browser.
            </Banner>
            <div className="col gap10 mt16">
              <StatLine label="Storage key" value={<span className="mono" style={{ fontSize: 11 }}>neuralearn.state.v1</span>} />
              <StatLine label="Users" value={state.users.length} />
              <StatLine label="Quiz attempts" value={state.attempts.length} />
              <StatLine label="Resource records" value={state.resourceViews.length} />
              <StatLine label="Study sessions" value={state.studySessions.length} />
              <StatLine label="Enrolments" value={state.enrollments.length} />
            </div>
          </Panel>

          <Panel title="Reset & sign out" icon={RotateCcw} className="reveal reveal-5">
            <p style={{ fontSize: 12.6, color: 'var(--text-2)', lineHeight: 1.65 }}>
              Restoring the demo seed rebuilds the original three courses, twelve topics, thirty-six resources,
              fifty questions and four learner histories. Your current changes can be undone from the notification.
            </p>
            <div className="row gap8 wrap mt16">
              <button className="btn btn-outline" onClick={() => setResetOpen(true)}><RotateCcw /> Restore demo data</button>
              <button className="btn btn-danger" onClick={() => setSignOutOpen(true)}><LogOut /> Sign out</button>
            </div>
          </Panel>
        </div>
      </div>

      <ConfirmDialog open={resetOpen} onClose={() => setResetOpen(false)} onConfirm={resetDemo}
        title="Restore the demo data?" confirmLabel="Restore seed"
        message="All courses, learners, attempts, resource completions and study sessions will be replaced with the original seeded records. Accounts you registered will be removed." />

      <ConfirmDialog open={signOutOpen} onClose={() => setSignOutOpen(false)}
        onConfirm={() => { logout(); navigate('/login', { replace: true }) }}
        title="Sign out of NeuraLearn?" confirmLabel="Sign out" tone="danger"
        message="Your learning records stay saved on this device. You will need your email and password to sign back in." />
    </>
  )
}