import { useMemo, useState } from 'react'
import {
  Users, SearchX, Filter, Download, UserPlus, ArrowUpDown, ArrowUp, ArrowDown,
  AlertTriangle, CheckCircle2, Clock, Target, Sparkles, Mail, GraduationCap,
  Activity, BookOpen, X, Eye, TrendingUp, Award,
} from 'lucide-react'
import { useStore } from '../../lib/store.jsx'
import {
  allStudentSummary, strengthsAndGaps, progressOverTime, recommend, courseCompletion,
  studyTimeByTopic, resourceStats, totalStudyMinutes, WEAK_LIMIT, STRONG_LIMIT,
} from '../../lib/ai.js'
import { downloadCSV, fmtDate, hoursMinutes, pct, relativeTime, BAND_COLORS } from '../../lib/format.js'
import {
  PageHead, Panel, Kpi, Chip, Avatar, Bar, Empty, SearchBox, Drawer, Modal, Field,
  Banner, ScoreRing, BandChip, StatLine, DifficultyChip,
} from '../../components/ui.jsx'
import { TopicBarChart, TrendChart, BandDonut, ChartLegend } from '../../components/charts.jsx'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
const SORTS = [
  { key: 'average', label: 'Average' },
  { key: 'name', label: 'Name' },
  { key: 'weakTopics', label: 'Gaps' },
  { key: 'attempts', label: 'Attempts' },
  { key: 'minutes', label: 'Study time' },
  { key: 'lastActive', label: 'Last active' },
]

export default function Students() {
  const { state, dispatch, toast } = useStore()
  const [q, setQ] = useState('')
  const [flag, setFlag] = useState('all')
  const [sort, setSort] = useState({ key: 'average', dir: 'asc' })
  const [selected, setSelected] = useState(new Set())
  const [detailId, setDetailId] = useState(null)
  const [addOpen, setAddOpen] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', roll: '', password: 'student123' })
  const [errors, setErrors] = useState({})

  const summary = useMemo(() => allStudentSummary(state), [state])

  const rows = useMemo(() => {
    let list = summary
    if (flag === 'risk') list = list.filter((s) => s.needsSupport)
    if (flag === 'strong') list = list.filter((s) => s.average >= STRONG_LIMIT)
    if (flag === 'gaps') list = list.filter((s) => s.weakTopics > 0)
    if (flag === 'clean') list = list.filter((s) => s.weakTopics === 0)
    if (flag === 'inactive') list = list.filter((s) => s.attempts === 0)
    if (q.trim()) {
      const t = q.trim().toLowerCase()
      list = list.filter((s) => `${s.name} ${s.email} ${s.roll ?? ''}`.toLowerCase().includes(t))
    }
    const dir = sort.dir === 'asc' ? 1 : -1
    return list.slice().sort((a, b) => {
      const k = sort.key
      if (k === 'name') return a.name.localeCompare(b.name) * dir
      if (k === 'lastActive') return (new Date(a.lastActive) - new Date(b.lastActive)) * dir
      return ((a[k] ?? 0) - (b[k] ?? 0)) * dir
    })
  }, [summary, flag, q, sort])

  const detail = useMemo(() => {
    if (detailId == null) return null
    const student = state.users.find((u) => u.id === detailId)
    if (!student) return null
    return {
      student,
      analysis: strengthsAndGaps(state, student.id),
      trend: progressOverTime(state, student.id),
      recs: recommend(state, student.id, 4),
      courses: courseCompletion(state, student.id),
      study: studyTimeByTopic(state, student.id),
      minutes: totalStudyMinutes(state, student.id),
      res: resourceStats(state, student.id),
      bands: ['strong', 'medium', 'weak'].map((b) => ({
        band: b, name: b === 'strong' ? 'Strength' : b === 'medium' ? 'Developing' : 'Gap',
        value: strengthsAndGaps(state, student.id).rows.filter((r) => r.band === b).length,
      })),
      summaryRow: summary.find((s) => s.id === student.id),
    }
  }, [detailId, state, summary])

  const toggleSort = (key) => setSort((s) => ({ key, dir: s.key === key && s.dir === 'asc' ? 'desc' : 'asc' }))
  const toggleSelect = (id) => setSelected((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n })
  const allSelected = rows.length > 0 && rows.every((r) => selected.has(r.id))

  const exportRows = (list) => {
    downloadCSV('neuralearn-students.csv', list.map((s) => ({
      Name: s.name, Email: s.email, Roll: s.roll ?? '', 'Average %': s.average,
      'Learning gaps': s.weakTopics, Strengths: s.strongTopics, 'Topics covered': s.topicsCovered,
      Attempts: s.attempts, 'Study minutes': s.minutes,
      'Resources done': `${s.resourcesDone}/${s.resourcesTotal}`,
      'Needs support': s.needsSupport ? 'yes' : 'no', 'Last active': s.lastActive,
    })))
    toast(`${list.length} student records exported`, { tone: 'success' })
  }

  const addStudent = (e) => {
    e.preventDefault()
    const errs = {}
    if (!form.name.trim()) errs.name = 'Name is required.'
    if (!form.email.trim()) errs.email = 'Email is required.'
    else if (!EMAIL_RE.test(form.email.trim())) errs.email = 'Enter a valid email address.'
    else if (state.users.some((u) => u.email.toLowerCase() === form.email.trim().toLowerCase())) errs.email = 'This email is already registered.'
    if (form.password.length < 4) errs.password = 'Use at least 4 characters.'
    setErrors(errs)
    if (Object.keys(errs).length) return
    const id = state.users.reduce((m, u) => Math.max(m, u.id), 0) + 1
    const name = form.name.trim()
    dispatch({
      type: 'ADD_USER',
      user: {
        id, name, email: form.email.trim().toLowerCase(), password: form.password, role: 'student',
        initials: name.split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? '').join(''),
        roll: form.roll.trim() || String(2300100000 + id * 137).slice(0, 10),
        branch: 'B.Tech CSE', semester: 'V', section: 'A', tone: 'cyan',
        createdAt: new Date().toISOString(),
      },
    })
    state.courses.forEach((c) => dispatch({ type: 'ENROLL', studentId: id, courseId: c.id }))
    toast(`${name} added and enrolled in ${state.courses.length} courses`, { tone: 'success' })
    setForm({ name: '', email: '', roll: '', password: 'student123' })
    setErrors({})
    setAddOpen(false)
  }

  const counts = {
    total: summary.length,
    risk: summary.filter((s) => s.needsSupport).length,
    strong: summary.filter((s) => s.average >= STRONG_LIMIT).length,
    gaps: summary.reduce((s, x) => s + x.weakTopics, 0),
    avg: summary.length ? Math.round((summary.reduce((s, x) => s + x.average, 0) / summary.length) * 10) / 10 : 0,
    attempts: summary.reduce((s, x) => s + x.attempts, 0),
  }

  const SortHead = ({ k, children, num }) => (
    <th className={`sortable ${num ? 'num' : ''}`} onClick={() => toggleSort(k)} aria-sort={sort.key === k ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none'}>
      {children}
      <span className="sort-ind">
        {sort.key === k ? (sort.dir === 'asc' ? <ArrowUp size={11} /> : <ArrowDown size={11} />) : <ArrowUpDown size={11} style={{ opacity: 0.4 }} />}
      </span>
    </th>
  )

  return (
    <>
      <PageHead eyebrow="People" title="Students"
        subtitle="Every learner with their AI-computed average, learning-gap count, study time and support flag. Open a row for the full topic analysis, trend and personalized recommendations."
        actions={<>
          <button className="btn btn-outline" onClick={() => exportRows(selected.size ? rows.filter((r) => selected.has(r.id)) : rows)} disabled={!rows.length}>
            <Download /> Export {selected.size ? `${selected.size} selected` : 'CSV'}
          </button>
          <button className="btn btn-primary" onClick={() => setAddOpen(true)}><UserPlus /> Add student</button>
        </>} />

      <div className="grid g6 mb16">
        <Kpi label="Learners" value={counts.total} icon={Users} tone="cyan" delay={40} />
        <Kpi label="Class average" value={counts.avg} unit="%" icon={Target} tone="violet" delay={80} />
        <Kpi label="Needs support" value={counts.risk} icon={AlertTriangle} tone={counts.risk ? 'rose' : 'lime'} delay={120}
          foot={<>avg &lt; {WEAK_LIMIT}% or 4+ gaps</>} />
        <Kpi label="At strength" value={counts.strong} icon={Award} tone="lime" delay={160} foot={<>average ≥ {STRONG_LIMIT}%</>} />
        <Kpi label="Total gaps" value={counts.gaps} icon={Target} tone="amber" delay={200} />
        <Kpi label="Attempts" value={counts.attempts} icon={Activity} tone="magenta" delay={240} />
      </div>

      <Panel bodyClass="tight" className="reveal reveal-2 mb16">
        <div className="filter-bar" style={{ marginBottom: 0 }}>
          <SearchBox value={q} onChange={setQ} placeholder="Search by name, email or roll number…" />
          <select className="select" value={flag} onChange={(e) => setFlag(e.target.value)} aria-label="Filter students">
            <option value="all">All learners ({summary.length})</option>
            <option value="risk">Needs support ({counts.risk})</option>
            <option value="strong">At strength ({counts.strong})</option>
            <option value="gaps">Has learning gaps</option>
            <option value="clean">No learning gaps</option>
            <option value="inactive">No attempts yet</option>
          </select>
          <select className="select" value={`${sort.key}:${sort.dir}`} aria-label="Sort students"
            onChange={(e) => { const [key, dir] = e.target.value.split(':'); setSort({ key, dir }) }}>
            {SORTS.flatMap((s) => [
              <option key={`${s.key}:asc`} value={`${s.key}:asc`}>{s.label} ↑</option>,
              <option key={`${s.key}:desc`} value={`${s.key}:desc`}>{s.label} ↓</option>,
            ])}
          </select>
          <span className="muted mono" style={{ fontSize: 11.5, marginLeft: 'auto' }}>{rows.length} shown</span>
        </div>
      </Panel>

      {selected.size > 0 && (
        <div className="row-between wrap gap12 mb12 reveal">
          <Chip tone="violet">{selected.size} selected</Chip>
          <div className="row gap8">
            <button className="btn btn-sm btn-outline" onClick={() => exportRows(rows.filter((r) => selected.has(r.id)))}><Download /> Export selection</button>
            <button className="btn btn-sm btn-ghost" onClick={() => setSelected(new Set())}><X /> Clear</button>
          </div>
        </div>
      )}

      <Panel className="reveal reveal-3" bodyClass="tight">
        {rows.length === 0 ? (
          <Empty icon={SearchX} title="No students match this filter"
            action={<button className="btn btn-sm btn-outline mt12" onClick={() => { setQ(''); setFlag('all') }}><Filter /> Reset filters</button>}>
            Try a different flag or search term.
          </Empty>
        ) : (
          <div className="table-wrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th style={{ width: 34 }}>
                    <input type="checkbox" className="check" checked={allSelected}
                      ref={(el) => { if (el) el.indeterminate = selected.size > 0 && !allSelected }}
                      onChange={() => setSelected(allSelected ? new Set() : new Set(rows.map((r) => r.id)))}
                      aria-label="Select all visible students" />
                  </th>
                  <SortHead k="name">Learner</SortHead>
                  <th>Roll</th>
                  <SortHead k="average">Average</SortHead>
                  <th style={{ minWidth: 130 }}>Progress</th>
                  <SortHead k="weakTopics" num>Gaps</SortHead>
                  <SortHead k="attempts" num>Attempts</SortHead>
                  <SortHead k="minutes">Study</SortHead>
                  <th>Resources</th>
                  <SortHead k="lastActive">Last active</SortHead>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((s) => {
                  const band = s.average >= STRONG_LIMIT ? 'strong' : s.average >= WEAK_LIMIT ? 'medium' : 'weak'
                  return (
                    <tr key={s.id} className={selected.has(s.id) ? 'selected' : ''}>
                      <td>
                        <input type="checkbox" className="check" checked={selected.has(s.id)} onChange={() => toggleSelect(s.id)} aria-label={`Select ${s.name}`} />
                      </td>
                      <td>
                        <button className="row gap10" style={{ background: 'transparent', border: 0, cursor: 'pointer', padding: 0, textAlign: 'left', color: 'inherit' }}
                          onClick={() => setDetailId(s.id)}>
                          <Avatar user={s} size="sm" />
                          <span style={{ minWidth: 0 }}>
                            <b style={{ fontSize: 12.8, display: 'block' }}>{s.name}</b>
                            <span className="muted mono" style={{ fontSize: 10.5 }}>{s.email}</span>
                          </span>
                        </button>
                      </td>
                      <td className="mono" style={{ fontSize: 11.5 }}>{s.roll ?? '—'}</td>
                      <td><b className="mono" style={{ color: BAND_COLORS[band], fontSize: 13 }}>{s.topicsCovered ? pct(s.average) : '—'}</b></td>
                      <td><Bar value={s.average} band={band} height={6} /></td>
                      <td className="num"><b style={{ color: s.weakTopics ? 'var(--rose)' : 'var(--lime)' }}>{s.weakTopics}</b></td>
                      <td className="num">{s.attempts}</td>
                      <td className="mono" style={{ fontSize: 11.5 }}>{hoursMinutes(s.minutes)}</td>
                      <td className="mono" style={{ fontSize: 11.5 }}>{s.resourcesDone}/{s.resourcesTotal}</td>
                      <td className="mono" style={{ fontSize: 11 }}>{relativeTime(s.lastActive)}</td>
                      <td>
                        {s.needsSupport ? <Chip tone="danger" icon={AlertTriangle}>Support</Chip>
                          : s.topicsCovered === 0 ? <Chip tone="slate">No data</Chip>
                            : <Chip tone="ok" icon={CheckCircle2}>On track</Chip>}
                      </td>
                      <td><button className="btn btn-sm btn-ghost" onClick={() => setDetailId(s.id)}><Eye /> Analysis</button></td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <Drawer open={!!detail} onClose={() => setDetailId(null)} wide icon={GraduationCap}
        title={detail?.student.name ?? ''} subtitle={detail ? `${detail.student.email} · Roll ${detail.student.roll ?? '—'}` : ''}
        headExtra={detail?.summaryRow?.needsSupport ? <Chip tone="danger">Needs support</Chip> : <Chip tone="ok">On track</Chip>}
        footer={detail && <>
          <button className="btn btn-ghost" onClick={() => setDetailId(null)}>Close</button>
          <button className="btn btn-outline" onClick={() => exportRows([detail.summaryRow].filter(Boolean))}><Download /> Export record</button>
        </>}>
        {detail && (
          <>
            <div className="row gap16 wrap mb16">
              <Avatar user={detail.student} size="lg" />
              <div style={{ flex: 1, minWidth: 180 }}>
                <div className="row gap6 wrap">
                  <Chip tone="cyan">{detail.student.branch ?? 'B.Tech CSE'}</Chip>
                  <Chip tone="slate">Sem {detail.student.semester ?? '—'} · Sec {detail.student.section ?? '—'}</Chip>
                  <Chip tone="slate"><Clock size={11} /> Joined {fmtDate(detail.student.createdAt)}</Chip>
                </div>
                <div className="row gap6 wrap mt8">
                  <a className="btn btn-sm btn-ghost" href={`mailto:${detail.student.email}`}><Mail /> {detail.student.email}</a>
                </div>
              </div>
              <ScoreRing value={detail.analysis.overall} size={112} label="Average" />
            </div>

            <div className="grid g4 mb16">
              <Kpi label="Learning gaps" value={detail.analysis.gaps.length} icon={Target} tone={detail.analysis.gaps.length ? 'rose' : 'lime'} />
              <Kpi label="Strengths" value={detail.analysis.strengths.length} icon={Award} tone="lime" />
              <Kpi label="Attempts" value={detail.trend.length} icon={Activity} tone="violet" />
              <Kpi label="Study time" value={hoursMinutes(detail.minutes)} icon={Clock} tone="magenta" />
            </div>

            {detail.analysis.topicsCovered === 0 ? (
              <Banner tone="info" icon={Sparkles} title="No quiz data for this learner yet">
                The AI module has nothing to analyse. Once they attempt a quiz, their gaps, path and recommendations appear here automatically.
              </Banner>
            ) : (
              <>
                <div className="eyebrow mb8">Topic-wise performance · weakest first</div>
                <ChartLegend items={[
                  { label: 'Strength', color: BAND_COLORS.strong, value: detail.analysis.strengths.length },
                  { label: 'Developing', color: BAND_COLORS.medium, value: detail.analysis.medium.length },
                  { label: 'Gap', color: BAND_COLORS.weak, value: detail.analysis.gaps.length },
                ]} />
                <div className="mt12 mb16">
                  <TopicBarChart rows={detail.analysis.rows} horizontal height={Math.max(220, detail.analysis.rows.length * 30)} />
                </div>

                <div className="grid g2 mb16">
                  <div>
                    <div className="eyebrow mb8">Progress over time</div>
                    {detail.trend.length ? <TrendChart data={detail.trend} height={190} /> : <Empty icon={TrendingUp} title="No attempts" />}
                  </div>
                  <div>
                    <div className="eyebrow mb8">Mastery split</div>
                    <BandDonut data={detail.bands} height={190} centerLabel="topics" />
                  </div>
                </div>

                <div className="eyebrow mb8">Learning gaps</div>
                {detail.analysis.gaps.length === 0 ? (
                  <Banner tone="ok" icon={CheckCircle2} title="No learning gaps">Every attempted topic is at or above {WEAK_LIMIT}%.</Banner>
                ) : (
                  <div className="col gap8 mb16">
                    {detail.analysis.gaps.map((g) => (
                      <div className="resource" key={g.topicId}>
                        <span className="resource-text">
                          <b>{g.name}</b>
                          <span>{g.courseTitle} · {g.scored}/{g.possible} marks over {g.attempts} attempt{g.attempts === 1 ? '' : 's'}</span>
                        </span>
                        <span className="resource-actions">
                          <DifficultyChip level={g.difficulty} />
                          <BandChip band="weak" value={g.percentage} />
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                <div className="eyebrow mb8">AI recommendations for this learner</div>
                <div className="col gap8 mb16">
                  {detail.recs.items.length === 0 ? <Empty icon={Sparkles} title="No resources to recommend" /> : detail.recs.items.map((r, i) => (
                    <div className="resource" key={r.resource.id}>
                      <span className="topic-index" style={{ width: 24, height: 24, fontSize: 10.5 }}>{i + 1}</span>
                      <span className="resource-text">
                        <b>{r.resource.title}</b>
                        <span>{r.reason}</span>
                      </span>
                      <span className="match-val">{r.score.toFixed(3)}</span>
                    </div>
                  ))}
                </div>
              </>
            )}

            <div className="eyebrow mb8">Course enrolment</div>
            {detail.courses.length === 0 ? (
              <Empty icon={BookOpen} title="Not enrolled in any course" />
            ) : (
              <div className="col gap12 mb16">
                {detail.courses.map((c) => (
                  <div key={c.courseId}>
                    <div className="row-between mb8" style={{ fontSize: 12.5 }}>
                      <span className="row gap8"><span className={`chip chip-${c.tone}`} style={{ fontSize: 9.5 }}>{c.code}</span><b>{c.title}</b></span>
                      <span className="mono">{c.attemptedTopics}/{c.totalTopics} topics · {pct(c.average)}</span>
                    </div>
                    <Bar value={c.percent} tone={c.tone} height={5} />
                  </div>
                ))}
              </div>
            )}

            <div className="rule mb12" />
            <div className="col gap10">
              <StatLine label="Resources completed" value={`${detail.res.completed} / ${detail.res.total}`} />
              <StatLine label="Opened, not finished" value={detail.res.opened} />
              <StatLine label="Topics with study time" value={detail.study.length} />
              <StatLine label="Overall average" value={pct(detail.analysis.overall)} tone="cyan" />
              <StatLine label="Support flag" value={detail.summaryRow?.needsSupport ? 'Flagged' : 'Not flagged'}
                tone={detail.summaryRow?.needsSupport ? 'rose' : 'lime'} />
            </div>
          </>
        )}
      </Drawer>

      <Modal open={addOpen} onClose={() => setAddOpen(false)} icon={UserPlus} title="Add a student"
        subtitle="The learner is enrolled in every published course automatically."
        footer={<>
          <button className="btn btn-ghost" onClick={() => setAddOpen(false)}>Cancel</button>
          <button className="btn btn-primary" form="add-student-form" type="submit"><UserPlus /> Create learner</button>
        </>}>
        <form id="add-student-form" onSubmit={addStudent}>
          <Field label="Full name" required error={errors.name}>
            <input className="input" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Student name" />
          </Field>
          <Field label="Email address" required error={errors.email} hint="Used as the sign-in identifier.">
            <input className="input" type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} placeholder="student@lms.edu" />
          </Field>
          <div className="grid g2">
            <Field label="Roll number" hint="Generated automatically if left blank.">
              <input className="input" value={form.roll} onChange={(e) => setForm((f) => ({ ...f, roll: e.target.value }))} placeholder="2300101833" />
            </Field>
            <Field label="Initial password" required error={errors.password}>
              <input className="input" value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} />
            </Field>
          </div>
          <Banner tone="info" icon={Sparkles} title="Cold start">
            A new learner has no attempts, so the recommender falls back to the hardest topics until their first quiz is graded.
          </Banner>
        </form>
      </Modal>
    </>
  )
}