import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ClipboardList, Download, SearchX, Filter, ArrowUpDown, ArrowUp, ArrowDown,
  CheckCircle2, XCircle, CircleSlash, Clock, Target, Users, BookOpen, Eye, X,
  ListChecks, Lightbulb, Award, TrendingUp, TrendingDown, Repeat, CalendarDays,
  GraduationCap, Activity, Percent, RotateCcw, FileDown, Layers,
} from 'lucide-react'
import { useStore } from '../../lib/store.jsx'
import { flattenTopics, findCourse, bandOf, WEAK_LIMIT, STRONG_LIMIT } from '../../lib/ai.js'
import {
  downloadCSV, fmtDate, fmtDateTime, relativeTime, clock, pct, BAND_COLORS,
} from '../../lib/format.js'
import {
  PageHead, Panel, Kpi, Chip, Avatar, Bar, Empty, SearchBox, Drawer, Banner,
  ScoreRing, StatLine, DifficultyChip, Segmented, Toggle,
} from '../../components/ui.jsx'
import { Histogram, Donut, TrendChart, ChartLegend, HISTOGRAM_COLORS } from '../../components/charts.jsx'

const SORTS = [
  { key: 'finishedAt', label: 'Submitted' },
  { key: 'percentage', label: 'Score' },
  { key: 'studentName', label: 'Learner' },
  { key: 'topicName', label: 'Topic' },
  { key: 'durationSec', label: 'Time taken' },
  { key: 'id', label: 'Record #' },
]

const BUCKETS = [
  { name: '0–20', min: 0, max: 20 }, { name: '21–40', min: 21, max: 40 },
  { name: '41–60', min: 41, max: 60 }, { name: '61–80', min: 61, max: 80 },
  { name: '81–100', min: 81, max: 100 },
]

const round1 = (n) => Math.round(n * 10) / 10

export default function Records() {
  const { state, toast } = useStore()
  const [q, setQ] = useState('')
  const [student, setStudent] = useState('all')
  const [course, setCourse] = useState('all')
  const [topic, setTopic] = useState('all')
  const [result, setResult] = useState('all')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [repeatsOnly, setRepeatsOnly] = useState(false)
  const [sort, setSort] = useState({ key: 'finishedAt', dir: 'desc' })
  const [selected, setSelected] = useState(new Set())
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [detailId, setDetailId] = useState(null)
  const [review, setReview] = useState('all')

  const topics = useMemo(() => flattenTopics(state.courses), [state.courses])
  const topicMap = useMemo(() => new Map(topics.map((t) => [t.id, t])), [topics])
  const learners = useMemo(() => state.users.filter((u) => u.role === 'student'), [state.users])

  /** Every attempt joined to its learner, topic and course, plus re-attempt context. */
  const all = useMemo(() => {
    const perTopic = new Map()
    state.attempts.forEach((a) => {
      const key = `${a.studentId}:${a.topicId}`
      if (!perTopic.has(key)) perTopic.set(key, [])
      perTopic.get(key).push(a)
    })
    perTopic.forEach((list) => list.sort((x, y) => new Date(x.finishedAt) - new Date(y.finishedAt)))

    return state.attempts.map((a) => {
      const learner = state.users.find((u) => u.id === a.studentId)
      const t = topicMap.get(a.topicId)
      const c = findCourse(state.courses, a.courseId) ?? (t ? state.courses.find((x) => x.topics.some((y) => y.id === t.id)) : null)
      const siblings = perTopic.get(`${a.studentId}:${a.topicId}`) ?? [a]
      const index = siblings.findIndex((x) => x.id === a.id)
      const previous = index > 0 ? siblings[index - 1] : null
      const graded = a.answers ?? []
      return {
        ...a,
        learner,
        studentName: learner?.name ?? 'Removed learner',
        studentEmail: learner?.email ?? '—',
        roll: learner?.roll ?? '—',
        topicName: t?.name ?? 'Removed topic',
        topicDifficulty: t?.difficulty ?? 1,
        courseId: c?.id ?? a.courseId,
        courseTitle: c?.title ?? 'Removed course',
        courseCode: c?.code ?? '—',
        tone: c?.tone ?? 'slate',
        band: bandOf(a.percentage),
        passed: a.percentage >= WEAK_LIMIT,
        attemptNo: index + 1,
        attemptCount: siblings.length,
        previous,
        delta: previous ? round1(a.percentage - previous.percentage) : null,
        correct: graded.filter((x) => x.isCorrect).length,
        wrong: graded.filter((x) => !x.isCorrect && x.chosen).length,
        blank: graded.filter((x) => !x.chosen).length,
        questionCount: t?.questions.length ?? graded.length,
      }
    })
  }, [state.attempts, state.users, state.courses, topicMap])

  const rows = useMemo(() => {
    let list = all
    if (student !== 'all') list = list.filter((r) => r.studentId === Number(student))
    if (course !== 'all') list = list.filter((r) => r.courseId === Number(course))
    if (topic !== 'all') list = list.filter((r) => r.topicId === Number(topic))
    if (result === 'pass') list = list.filter((r) => r.passed)
    if (result === 'fail') list = list.filter((r) => !r.passed)
    if (result === 'perfect') list = list.filter((r) => r.percentage === 100)
    if (result === 'strong') list = list.filter((r) => r.percentage >= STRONG_LIMIT)
    if (repeatsOnly) list = list.filter((r) => r.attemptCount > 1)
    if (from) { const start = new Date(`${from}T00:00:00`).getTime(); list = list.filter((r) => new Date(r.finishedAt).getTime() >= start) }
    if (to) { const end = new Date(`${to}T23:59:59.999`).getTime(); list = list.filter((r) => new Date(r.finishedAt).getTime() <= end) }
    if (q.trim()) {
      const term = q.trim().toLowerCase()
      list = list.filter((r) => `${r.studentName} ${r.studentEmail} ${r.roll} ${r.topicName} ${r.courseTitle} ${r.courseCode}`.toLowerCase().includes(term))
    }
    const dir = sort.dir === 'asc' ? 1 : -1
    return list.slice().sort((a, b) => {
      const k = sort.key
      if (k === 'studentName') return a.studentName.localeCompare(b.studentName) * dir || a.id - b.id
      if (k === 'topicName') return a.topicName.localeCompare(b.topicName) * dir || a.id - b.id
      if (k === 'finishedAt') return (new Date(a.finishedAt) - new Date(b.finishedAt)) * dir || a.id - b.id
      return ((a[k] ?? 0) - (b[k] ?? 0)) * dir || a.id - b.id
    })
  }, [all, student, course, topic, result, repeatsOnly, from, to, q, sort])

  const stats = useMemo(() => {
    const total = rows.length
    const passed = rows.filter((r) => r.passed).length
    const perfect = rows.filter((r) => r.percentage === 100).length
    const failed = total - passed
    const average = total ? round1(rows.reduce((s, r) => s + r.percentage, 0) / total) : 0
    const seconds = total ? Math.round(rows.reduce((s, r) => s + (r.durationSec ?? 0), 0) / total) : 0
    const marks = rows.reduce((s, r) => s + r.score, 0)
    const possible = rows.reduce((s, r) => s + r.total, 0)
    return {
      total, passed, failed, perfect, average, seconds, marks, possible,
      passRate: total ? round1((passed / total) * 100) : 0,
      learners: new Set(rows.map((r) => r.studentId)).size,
      topics: new Set(rows.map((r) => r.topicId)).size,
      repeats: rows.filter((r) => r.attemptNo > 1).length,
      improved: rows.filter((r) => r.delta != null && r.delta > 0).length,
      declined: rows.filter((r) => r.delta != null && r.delta < 0).length,
    }
  }, [rows])

  const histogram = useMemo(() => BUCKETS.map((b) => ({
    ...b, count: rows.filter((r) => r.percentage >= b.min && r.percentage <= b.max).length,
  })), [rows])

  const resultSplit = useMemo(() => [
    { name: 'Strength ≥80%', value: rows.filter((r) => r.percentage >= STRONG_LIMIT).length, fill: BAND_COLORS.strong },
    { name: 'Developing 60–79%', value: rows.filter((r) => r.percentage >= WEAK_LIMIT && r.percentage < STRONG_LIMIT).length, fill: BAND_COLORS.medium },
    { name: 'Gap <60%', value: rows.filter((r) => r.percentage < WEAK_LIMIT).length, fill: BAND_COLORS.weak },
  ], [rows])

  const byCourse = useMemo(() => state.courses.map((c) => {
    const list = rows.filter((r) => r.courseId === c.id)
    const passed = list.filter((r) => r.passed).length
    return {
      id: c.id, title: c.title, code: c.code, tone: c.tone, attempts: list.length,
      learners: new Set(list.map((r) => r.studentId)).size,
      average: list.length ? round1(list.reduce((s, r) => s + r.percentage, 0) / list.length) : 0,
      passRate: list.length ? round1((passed / list.length) * 100) : 0,
      failed: list.length - passed,
    }
  }).filter((c) => c.attempts > 0).sort((a, b) => b.attempts - a.attempts), [state.courses, rows])

  const byTopic = useMemo(() => {
    const map = new Map()
    rows.forEach((r) => {
      if (!map.has(r.topicId)) map.set(r.topicId, { topicId: r.topicId, name: r.topicName, tone: r.tone, courseTitle: r.courseTitle, list: [] })
      map.get(r.topicId).list.push(r)
    })
    return [...map.values()].map((g) => {
      const list = g.list.slice().sort((a, b) => new Date(a.finishedAt) - new Date(b.finishedAt))
      const first = list[0]
      const last = list[list.length - 1]
      return {
        topicId: g.topicId, name: g.name, tone: g.tone, courseTitle: g.courseTitle,
        attempts: list.length, learners: new Set(list.map((r) => r.studentId)).size,
        average: round1(list.reduce((s, r) => s + r.percentage, 0) / list.length),
        best: Math.max(...list.map((r) => r.percentage)),
        worst: Math.min(...list.map((r) => r.percentage)),
        gain: round1(last.percentage - first.percentage),
        repeats: list.filter((r) => r.attemptNo > 1).length,
      }
    }).sort((a, b) => b.attempts - a.attempts || a.average - b.average)
  }, [rows])

  const detail = useMemo(() => {
    if (detailId == null) return null
    const record = all.find((r) => r.id === detailId)
    if (!record) return null
    const t = topicMap.get(record.topicId)
    const questions = t?.questions ?? []
    const reviewRows = (record.answers ?? []).map((ans, i) => {
      const question = questions.find((x) => x.id === ans.questionId)
      return { i, ans, question, ok: ans.isCorrect, chosen: ans.chosen }
    })
    const history = all
      .filter((r) => r.studentId === record.studentId && r.topicId === record.topicId)
      .sort((a, b) => new Date(a.finishedAt) - new Date(b.finishedAt))
      .map((r, i) => ({ label: `#${i + 1}`, percentage: r.percentage, id: r.id }))
    const learnerAttempts = all.filter((r) => r.studentId === record.studentId)
    return {
      record, topic: t, reviewRows, history,
      learnerAverage: learnerAttempts.length ? round1(learnerAttempts.reduce((s, r) => s + r.percentage, 0) / learnerAttempts.length) : 0,
      learnerAttempts: learnerAttempts.length,
      shown: reviewRows.filter((r) => (review === 'wrong' ? !r.ok : review === 'right' ? r.ok : true)),
    }
  }, [detailId, all, topicMap, review])

  const totalPages = pageSize === 0 ? 1 : Math.max(1, Math.ceil(rows.length / pageSize))
  const safePage = Math.min(page, totalPages)
  const pageRows = pageSize === 0 ? rows : rows.slice((safePage - 1) * pageSize, safePage * pageSize)
  const visibleIds = pageRows.map((r) => r.id)
  const allVisibleSelected = visibleIds.length > 0 && visibleIds.every((id) => selected.has(id))
  const selectionRows = rows.filter((r) => selected.has(r.id))
  const selectionPassRate = selectionRows.length
    ? round1((selectionRows.filter((r) => r.passed).length / selectionRows.length) * 100) : 0

  const toggleSort = (key) => setSort((s) => ({ key, dir: s.key === key && s.dir === 'asc' ? 'desc' : 'asc' }))
  const toggleSelect = (id) => setSelected((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n })

  const resetFilters = () => {
    setQ(''); setStudent('all'); setCourse('all'); setTopic('all'); setResult('all')
    setFrom(''); setTo(''); setRepeatsOnly(false); setPage(1)
  }
  const filtersActive = q || student !== 'all' || course !== 'all' || topic !== 'all' || result !== 'all' || from || to || repeatsOnly

  const exportRows = (list, filename = 'neuralearn-attempt-records.csv') => {
    if (!list.length) { toast('Nothing to export with these filters', { tone: 'warn' }); return }
    downloadCSV(filename, list.map((r) => ({
      'Record #': r.id, Learner: r.studentName, Email: r.studentEmail, Roll: r.roll,
      Course: `${r.courseCode} ${r.courseTitle}`, Topic: r.topicName,
      'Attempt no': `${r.attemptNo} of ${r.attemptCount}`,
      Marks: `${r.score}/${r.total}`, 'Score %': r.percentage, Band: r.band,
      Result: r.passed ? 'Pass' : 'Fail', Correct: r.correct, Incorrect: r.wrong, Unanswered: r.blank,
      'Time (sec)': r.durationSec ?? 0, 'Previous %': r.previous?.percentage ?? '',
      'Change %': r.delta ?? '', Submitted: r.finishedAt,
    })))
    toast(`${list.length} attempt records exported`, { tone: 'success' })
  }

  const exportAnswers = (d) => {
    downloadCSV(`neuralearn-attempt-${d.record.id}-answers.csv`, d.reviewRows.map(({ i, question, ans, ok }) => ({
      'Question #': i + 1,
      Question: question?.text ?? '(question removed from the quiz)',
      Marks: question?.marks ?? 1,
      'Chosen option': ans.chosen ? ans.chosen.toUpperCase() : 'Not answered',
      'Chosen text': question?.options?.[ans.chosen] ?? '',
      'Correct option': (question?.correct ?? '').toUpperCase(),
      'Correct text': question?.options?.[question?.correct] ?? '',
      Result: ok ? 'Correct' : ans.chosen ? 'Incorrect' : 'Unanswered',
      Explanation: question?.explain ?? '',
    })))
    toast('Answer sheet exported', { tone: 'success' })
  }

  const SortHead = ({ k, children, num }) => (
    <th className={`sortable ${num ? 'num' : ''}`} onClick={() => toggleSort(k)}
      aria-sort={sort.key === k ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none'}>
      {children}
      <span className="sort-ind">
        {sort.key === k ? (sort.dir === 'asc' ? <ArrowUp size={11} /> : <ArrowDown size={11} />) : <ArrowUpDown size={11} style={{ opacity: 0.4 }} />}
      </span>
    </th>
  )

  const topicOptions = course === 'all' ? topics : topics.filter((t) => t.courseId === Number(course))

  return (
    <>
      <PageHead eyebrow="Academic register" title="Quiz Records"
        subtitle="Every graded attempt in the system — the exact rows the AI module reads to compute topic averages, learning gaps and the regression model. Filter, inspect each answer sheet and export the register."
        actions={<>
          <button className="btn btn-outline" onClick={resetFilters} disabled={!filtersActive}><RotateCcw /> Reset filters</button>
          <button className="btn btn-primary" disabled={!rows.length}
            onClick={() => exportRows(selected.size ? rows.filter((r) => selected.has(r.id)) : rows)}>
            <Download /> Export {selected.size ? `${selected.size} selected` : 'CSV'}
          </button>
        </>} />

      <div className="grid g6 mb16">
        <Kpi label="Attempts" value={stats.total} unit={`/ ${all.length}`} icon={ClipboardList} tone="cyan" delay={40}
          foot={<>{stats.repeats} re-attempts</>} />
        <Kpi label="Pass rate" value={stats.passRate} unit="%" icon={Percent} tone={stats.passRate >= 60 ? 'lime' : 'rose'} delay={80}
          foot={<>{stats.passed} pass · {stats.failed} below {WEAK_LIMIT}%</>} />
        <Kpi label="Average score" value={stats.average} unit="%" icon={Target} tone="violet" delay={120}
          foot={<>{stats.marks}/{stats.possible} marks earned</>} />
        <Kpi label="Learners" value={stats.learners} unit={`/ ${learners.length}`} icon={Users} tone="magenta" delay={160}
          foot={<>{stats.topics} topics tested</>} />
        <Kpi label="Perfect scores" value={stats.perfect} icon={Award} tone="amber" delay={200}
          foot={<>{stats.total ? pct((stats.perfect / stats.total) * 100) : '0%'} of attempts</>} />
        <Kpi label="Avg time" value={clock(stats.seconds)} icon={Clock} tone="lime" delay={240}
          foot={<><TrendingUp size={12} style={{ color: 'var(--ok)' }} />{stats.improved} improved · {stats.declined} declined</>} />
      </div>

      {stats.failed > 0 && (
        <div className="mb16 reveal reveal-1">
          <Banner tone="danger" icon={Target} title={`${stats.failed} of ${stats.total} attempts scored below the ${WEAK_LIMIT}% pass mark`}
            action={<button className="btn btn-sm btn-danger" onClick={() => { setResult('fail'); setPage(1) }}>Show failed only <ArrowDown size={13} /></button>}>
            These are the attempts creating learning gaps. Open a record to see exactly which questions were missed, then check the learner's
            {' '}<Link to="/admin/analytics" style={{ color: 'inherit', textDecoration: 'underline' }}>class heatmap</Link> for the topic-level view.
          </Banner>
        </div>
      )}

      <Panel bodyClass="tight" className="reveal reveal-2 mb16">
        <div className="filter-bar" style={{ marginBottom: 0 }}>
          <SearchBox value={q} onChange={(v) => { setQ(v); setPage(1) }} placeholder="Search learner, roll, topic or course…" />
          <select className="select" value={student} aria-label="Filter by learner"
            onChange={(e) => { setStudent(e.target.value); setPage(1) }}>
            <option value="all">All learners ({learners.length})</option>
            {learners.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <select className="select" value={course} aria-label="Filter by course"
            onChange={(e) => { setCourse(e.target.value); setTopic('all'); setPage(1) }}>
            <option value="all">All courses ({state.courses.length})</option>
            {state.courses.map((c) => <option key={c.id} value={c.id}>{c.code} · {c.title}</option>)}
          </select>
          <select className="select" value={topic} aria-label="Filter by topic"
            onChange={(e) => { setTopic(e.target.value); setPage(1) }}>
            <option value="all">All topics ({topicOptions.length})</option>
            {topicOptions.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
          <select className="select" value={result} aria-label="Filter by result"
            onChange={(e) => { setResult(e.target.value); setPage(1) }}>
            <option value="all">Any result</option>
            <option value="pass">Passed (≥{WEAK_LIMIT}%)</option>
            <option value="fail">Failed (&lt;{WEAK_LIMIT}%)</option>
            <option value="strong">Strength (≥{STRONG_LIMIT}%)</option>
            <option value="perfect">Perfect (100%)</option>
          </select>
          <select className="select" value={`${sort.key}:${sort.dir}`} aria-label="Sort records"
            onChange={(e) => { const [key, dir] = e.target.value.split(':'); setSort({ key, dir }); setPage(1) }}>
            {SORTS.flatMap((s) => [
              <option key={`${s.key}:asc`} value={`${s.key}:asc`}>{s.label} ↑</option>,
              <option key={`${s.key}:desc`} value={`${s.key}:desc`}>{s.label} ↓</option>,
            ])}
          </select>
        </div>
        <div className="filter-bar mt12" style={{ marginBottom: 0 }}>
          <label className="row gap8" style={{ fontSize: 12, color: 'var(--text-3)' }}>
            <CalendarDays size={14} /> From
            <input className="input" type="date" value={from} max={to || undefined} style={{ width: 150 }}
              onChange={(e) => { setFrom(e.target.value); setPage(1) }} aria-label="Submitted from date" />
          </label>
          <label className="row gap8" style={{ fontSize: 12, color: 'var(--text-3)' }}>
            To
            <input className="input" type="date" value={to} min={from || undefined} style={{ width: 150 }}
              onChange={(e) => { setTo(e.target.value); setPage(1) }} aria-label="Submitted to date" />
          </label>
          <label className="row gap8" style={{ fontSize: 12.5, color: 'var(--text-2)', cursor: 'pointer' }}>
            <Toggle checked={repeatsOnly} onChange={(v) => { setRepeatsOnly(v); setPage(1) }} label="Re-attempts only" />
            <Repeat size={13} /> Re-attempts only
          </label>
          <span className="row gap8" style={{ marginLeft: 'auto' }}>
            <span className="muted mono" style={{ fontSize: 11.5 }}>{rows.length} of {all.length} records</span>
            {filtersActive && <button className="btn btn-sm btn-ghost" onClick={resetFilters}><X /> Clear</button>}
          </span>
        </div>
      </Panel>

      {selected.size > 0 && (
        <div className="row-between wrap gap12 mb12 reveal">
          <div className="row gap10">
            <Chip tone="violet">{selected.size} selected</Chip>
            <span className="muted" style={{ fontSize: 12 }}>
              {pct(selectionPassRate)} pass rate in selection
            </span>
          </div>
          <div className="row gap8">
            <button className="btn btn-sm btn-outline" onClick={() => exportRows(rows.filter((r) => selected.has(r.id)))}><Download /> Export selection</button>
            <button className="btn btn-sm btn-ghost" onClick={() => setSelected(new Set())}><X /> Clear</button>
          </div>
        </div>
      )}

      <Panel className="reveal reveal-3" bodyClass="tight"
        title="Attempt register" icon={ClipboardList} eyebrow={`${rows.length} graded records`}
        actions={
          <div className="row gap8">
            <select className="select" value={pageSize} aria-label="Rows per page" style={{ minWidth: 104 }}
              onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1) }}>
              <option value={10}>10 / page</option>
              <option value={20}>20 / page</option>
              <option value={50}>50 / page</option>
              <option value={0}>Show all</option>
            </select>
          </div>
        }>
        {rows.length === 0 ? (
          <Empty icon={SearchX} title={all.length ? 'No records match these filters' : 'No quiz attempts recorded yet'}
            action={all.length
              ? <button className="btn btn-sm btn-outline mt12" onClick={resetFilters}><Filter /> Reset all filters</button>
              : <Link className="btn btn-sm btn-primary mt12" to="/admin/content"><BookOpen /> Publish a quiz</Link>}>
            {all.length
              ? 'Widen the date range, or clear the learner, course and result filters.'
              : 'Attempts appear here the moment a learner submits a topic quiz.'}
          </Empty>
        ) : (
          <>
            <div className="table-wrap">
              <table className="tbl">
                <thead>
                  <tr>
                    <th style={{ width: 34 }}>
                      <input type="checkbox" className="check" checked={allVisibleSelected}
                        ref={(el) => { if (el) el.indeterminate = selected.size > 0 && !allVisibleSelected }}
                        onChange={() => setSelected(allVisibleSelected
                          ? new Set([...selected].filter((id) => !visibleIds.includes(id)))
                          : new Set([...selected, ...visibleIds]))}
                        aria-label="Select all records on this page" />
                    </th>
                    <SortHead k="id" num>#</SortHead>
                    <SortHead k="studentName">Learner</SortHead>
                    <th>Course</th>
                    <SortHead k="topicName">Topic</SortHead>
                    <th className="num">Marks</th>
                    <SortHead k="percentage">Score</SortHead>
                    <th style={{ minWidth: 96 }}>Band</th>
                    <th>Result</th>
                    <SortHead k="durationSec">Time</SortHead>
                    <SortHead k="finishedAt">Submitted</SortHead>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {pageRows.map((r) => (
                    <tr key={r.id} className={selected.has(r.id) ? 'selected' : ''}>
                      <td>
                        <input type="checkbox" className="check" checked={selected.has(r.id)} onChange={() => toggleSelect(r.id)}
                          aria-label={`Select attempt ${r.id}`} />
                      </td>
                      <td className="num mono" style={{ fontSize: 11, color: 'var(--text-3)' }}>{r.id}</td>
                      <td>
                        <button className="row gap10" style={{ background: 'transparent', border: 0, cursor: 'pointer', padding: 0, textAlign: 'left', color: 'inherit' }}
                          onClick={() => { setDetailId(r.id); setReview('all') }}>
                          <Avatar user={r.learner} name={r.studentName} size="sm" />
                          <span style={{ minWidth: 0 }}>
                            <b style={{ fontSize: 12.6, display: 'block' }}>{r.studentName}</b>
                            <span className="muted mono" style={{ fontSize: 10.2 }}>{r.roll}</span>
                          </span>
                        </button>
                      </td>
                      <td><span className={`chip chip-${r.tone}`} style={{ fontSize: 9.5 }}>{r.courseCode}</span></td>
                      <td style={{ maxWidth: 210 }}>
                        <b className="truncate" style={{ fontSize: 12.4, display: 'block' }}>{r.topicName}</b>
                        <span className="muted mono" style={{ fontSize: 10.2 }}>
                          attempt {r.attemptNo}/{r.attemptCount}
                          {r.delta != null && (
                            <span style={{ color: r.delta > 0 ? 'var(--ok)' : r.delta < 0 ? 'var(--danger)' : 'var(--text-3)', marginLeft: 6 }}>
                              {r.delta > 0 ? '▲' : r.delta < 0 ? '▼' : '='} {Math.abs(r.delta)}%
                            </span>
                          )}
                        </span>
                      </td>
                      <td className="num mono" style={{ fontSize: 12 }}>{r.score}/{r.total}</td>
                      <td><b className="mono" style={{ fontSize: 13.5, color: BAND_COLORS[r.band] }}>{pct(r.percentage)}</b></td>
                      <td><Bar value={r.percentage} band={r.band} height={6} /></td>
                      <td>
                        {r.percentage === 100 ? <Chip tone="ok" icon={Award}>Perfect</Chip>
                          : r.passed ? <Chip tone="ok" icon={CheckCircle2}>Pass</Chip>
                            : <Chip tone="danger" icon={XCircle}>Fail</Chip>}
                      </td>
                      <td className="mono" style={{ fontSize: 11.5 }}>{clock(r.durationSec ?? 0)}</td>
                      <td>
                        <span className="mono" style={{ fontSize: 11.3, display: 'block' }}>{fmtDate(r.finishedAt)}</span>
                        <span className="muted" style={{ fontSize: 10.2 }}>{relativeTime(r.finishedAt)}</span>
                      </td>
                      <td>
                        <button className="btn btn-sm btn-ghost" onClick={() => { setDetailId(r.id); setReview('all') }}>
                          <Eye /> <span className="desktop-only">Answers</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {pageSize !== 0 && totalPages > 1 && (
              <div className="row-between wrap gap12 mt16">
                <span className="muted mono" style={{ fontSize: 11.5 }}>
                  Showing {(safePage - 1) * pageSize + 1}–{Math.min(safePage * pageSize, rows.length)} of {rows.length}
                </span>
                <div className="row gap6">
                  <button className="btn btn-sm btn-outline" disabled={safePage === 1} onClick={() => setPage(1)}>First</button>
                  <button className="btn btn-sm btn-outline" disabled={safePage === 1} onClick={() => setPage(safePage - 1)}>Previous</button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter((p) => p === 1 || p === totalPages || Math.abs(p - safePage) <= 1)
                    .map((p, i, arr) => (
                      <span className="row gap6" key={p}>
                        {i > 0 && arr[i - 1] !== p - 1 && <span className="muted mono" style={{ fontSize: 11 }}>…</span>}
                        <button className={`btn btn-sm ${p === safePage ? 'btn-accent' : 'btn-ghost'}`} onClick={() => setPage(p)}
                          aria-current={p === safePage ? 'page' : undefined}>{p}</button>
                      </span>
                    ))}
                  <button className="btn btn-sm btn-outline" disabled={safePage === totalPages} onClick={() => setPage(safePage + 1)}>Next</button>
                  <button className="btn btn-sm btn-outline" disabled={safePage === totalPages} onClick={() => setPage(totalPages)}>Last</button>
                </div>
              </div>
            )}
          </>
        )}
      </Panel>

      {rows.length > 0 && (
        <>
          <div className="grid g-main mt16">
            <Panel title="Score distribution" icon={Activity} eyebrow="Filtered records" className="reveal reveal-4"
              actions={<Chip tone="cyan">{stats.total} attempts</Chip>}>
              <Histogram data={histogram} height={236} />
              <ChartLegend items={histogram.map((b, i) => ({ label: `${b.name}%`, color: HISTOGRAM_COLORS[i % HISTOGRAM_COLORS.length], value: b.count }))} />
            </Panel>
            <Panel title="Result split" icon={Percent} eyebrow="Pass mark 60%" className="reveal reveal-4">
              <Donut data={resultSplit} height={210} centerLabel="attempts" unit="" />
              <div className="col gap6 mt12">
                {resultSplit.map((s) => (
                  <div className="row-between" key={s.name} style={{ fontSize: 12 }}>
                    <span className="row gap6"><span className="legend-swatch" style={{ background: s.fill }} />{s.name}</span>
                    <b className="mono">{s.value}</b>
                  </div>
                ))}
              </div>
            </Panel>
          </div>

          <div className="grid g2 mt16">
            <Panel title="Attempts by course" icon={BookOpen} eyebrow="Within the current filters" className="reveal reveal-5">
              {byCourse.length === 0 ? <Empty icon={BookOpen} title="No course records in this selection" /> : (
                <div className="col gap16">
                  {byCourse.map((c) => (
                    <div key={c.id}>
                      <div className="row-between mb8 wrap gap8">
                        <span className="row gap8">
                          <span className={`chip chip-${c.tone}`} style={{ fontSize: 9.5 }}>{c.code}</span>
                          <b style={{ fontSize: 13, fontFamily: 'var(--font-display)' }}>{c.title}</b>
                        </span>
                        <span className="mono" style={{ fontSize: 11.5, color: 'var(--text-2)' }}>
                          {c.attempts} attempts · {c.learners} learners
                        </span>
                      </div>
                      <Bar value={c.average} tone={c.tone} height={6} />
                      <div className="row-between mt8" style={{ fontSize: 11.3, color: 'var(--text-3)' }}>
                        <span>average <b className="mono" style={{ color: BAND_COLORS[bandOf(c.average)] }}>{pct(c.average)}</b></span>
                        <span>pass rate <b className="mono">{pct(c.passRate)}</b> · {c.failed} failed</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Panel>

            <Panel title="Topic re-attempt patterns" icon={Repeat} eyebrow="Busiest quizzes first" className="reveal reveal-5"
              actions={<Chip tone="violet">{byTopic.length} topics</Chip>}>
              {byTopic.length === 0 ? <Empty icon={Repeat} title="No topic records in this selection" /> : (
                <div className="table-wrap">
                  <table className="tbl">
                    <thead>
                      <tr>
                        <th>Topic</th>
                        <th className="num">Attempts</th>
                        <th className="num">Learners</th>
                        <th className="num">Average</th>
                        <th className="num">Best</th>
                        <th className="num">Worst</th>
                        <th className="num">First→last</th>
                      </tr>
                    </thead>
                    <tbody>
                      {byTopic.slice(0, 12).map((t) => (
                        <tr key={t.topicId}>
                          <td style={{ maxWidth: 220 }}>
                            <button className="truncate" style={{ background: 'transparent', border: 0, padding: 0, cursor: 'pointer', color: 'var(--text)', fontSize: 12.4, fontWeight: 600, textAlign: 'left', display: 'block', maxWidth: '100%' }}
                              onClick={() => { setTopic(String(t.topicId)); setCourse('all'); setPage(1); toast(`Filtered to ${t.name}`, { tone: 'info' }) }}>
                              {t.name}
                            </button>
                            <span className="muted" style={{ fontSize: 10.4 }}>{t.courseTitle}</span>
                          </td>
                          <td className="num mono">{t.attempts}</td>
                          <td className="num mono">{t.learners}</td>
                          <td className="num"><b className="mono" style={{ color: BAND_COLORS[bandOf(t.average)] }}>{pct(t.average)}</b></td>
                          <td className="num mono" style={{ color: 'var(--lime)' }}>{t.best}%</td>
                          <td className="num mono" style={{ color: 'var(--rose)' }}>{t.worst}%</td>
                          <td className="num">
                            <span className="row gap4 mono" style={{ justifyContent: 'flex-end', fontSize: 11.5, color: t.gain > 0 ? 'var(--ok)' : t.gain < 0 ? 'var(--danger)' : 'var(--text-3)' }}>
                              {t.gain > 0 ? <TrendingUp size={12} /> : t.gain < 0 ? <TrendingDown size={12} /> : null}
                              {t.gain > 0 ? '+' : ''}{t.gain}%
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Panel>
          </div>
        </>
      )}

      <Drawer open={!!detail} onClose={() => setDetailId(null)} wide icon={ListChecks}
        title={detail ? `Attempt #${detail.record.id} · ${detail.record.topicName}` : ''}
        subtitle={detail ? `${detail.record.studentName} · ${detail.record.courseCode} ${detail.record.courseTitle}` : ''}
        headExtra={detail && (detail.record.passed
          ? <Chip tone="ok" icon={CheckCircle2}>Passed</Chip>
          : <Chip tone="danger" icon={XCircle}>Below pass mark</Chip>)}
        footer={detail && <>
          <button className="btn btn-ghost" onClick={() => setDetailId(null)}>Close</button>
          <button className="btn btn-outline" onClick={() => exportAnswers(detail)}><FileDown /> Export answer sheet</button>
          <button className="btn btn-primary" onClick={() => exportRows([detail.record], `neuralearn-attempt-${detail.record.id}.csv`)}>
            <Download /> Export record
          </button>
        </>}>
        {detail && (
          <>
            <div className="row gap16 wrap mb16">
              <Avatar user={detail.record.learner} name={detail.record.studentName} size="lg" />
              <div style={{ flex: 1, minWidth: 180 }}>
                <b style={{ fontFamily: 'var(--font-display)', fontSize: 16 }}>{detail.record.studentName}</b>
                <div className="muted mono mt4" style={{ fontSize: 11.5 }}>{detail.record.studentEmail} · Roll {detail.record.roll}</div>
                <div className="row gap6 wrap mt8">
                  <Chip tone={detail.record.tone}>{detail.record.courseCode}</Chip>
                  <DifficultyChip level={detail.record.topicDifficulty} />
                  <Chip tone="slate"><Repeat size={11} /> Attempt {detail.record.attemptNo} of {detail.record.attemptCount}</Chip>
                  <Chip tone="slate"><Clock size={11} /> {clock(detail.record.durationSec ?? 0)}</Chip>
                </div>
              </div>
              <ScoreRing value={detail.record.percentage} size={116} label="Score" />
            </div>

            <div className="grid g4 mb16">
              <Kpi label="Marks earned" value={`${detail.record.score}/${detail.record.total}`} icon={Target} tone="cyan" />
              <Kpi label="Correct" value={detail.record.correct} icon={CheckCircle2} tone="lime" />
              <Kpi label="Incorrect" value={detail.record.wrong} icon={XCircle} tone="rose" />
              <Kpi label="Unanswered" value={detail.record.blank} icon={CircleSlash} tone={detail.record.blank ? 'amber' : 'violet'} />
            </div>

            {detail.record.passed ? (
              <div className="mb16">
                <Banner tone="ok" icon={CheckCircle2} title={`Passed at ${pct(detail.record.percentage)}`}>
                  {detail.record.percentage >= STRONG_LIMIT
                    ? 'This attempt counts as a strength for the topic and lowers its priority in the learning path.'
                    : `Above the ${WEAK_LIMIT}% pass mark but below ${STRONG_LIMIT}% — the topic stays in the developing band.`}
                </Banner>
              </div>
            ) : (
              <div className="mb16">
                <Banner tone="danger" icon={Target} title={`Learning gap recorded at ${pct(detail.record.percentage)}`}>
                  The topic average now sits below {WEAK_LIMIT}%, so the recommender boosts its resources by +0.25 and the learning path places it first.
                </Banner>
              </div>
            )}

            <div className="grid g2 mb16">
              <div>
                <div className="eyebrow mb8">This topic · attempt history</div>
                {detail.history.length > 1
                  ? <TrendChart data={detail.history} height={186} />
                  : <Empty icon={Activity} title="First attempt on this topic">No earlier score to compare against.</Empty>}
              </div>
              <div>
                <div className="eyebrow mb8">Record details</div>
                <div className="col gap4">
                  <StatLine label="Submitted" value={fmtDateTime(detail.record.finishedAt)} />
                  <StatLine label="Time taken" value={clock(detail.record.durationSec ?? 0)} />
                  <StatLine label="Questions" value={`${detail.reviewRows.length} graded`} />
                  <StatLine label="Learner average" value={pct(detail.learnerAverage)} tone="cyan" />
                  <StatLine label="Learner attempts" value={detail.learnerAttempts} />
                  {detail.record.previous && (
                    <StatLine label="Change vs previous" value={`${detail.record.delta > 0 ? '+' : ''}${detail.record.delta}%`}
                      tone={detail.record.delta > 0 ? 'lime' : detail.record.delta < 0 ? 'rose' : 'cyan'} />
                  )}
                </div>
              </div>
            </div>

            <div className="row-between wrap gap12 mb12">
              <div className="eyebrow">Answer sheet · {detail.reviewRows.length} questions</div>
              <Segmented value={review} onChange={setReview} size="sm" options={[
                { value: 'all', label: `All ${detail.reviewRows.length}` },
                { value: 'wrong', label: `Missed ${detail.record.wrong + detail.record.blank}` },
                { value: 'right', label: `Correct ${detail.record.correct}` },
              ]} />
            </div>

            {detail.shown.length === 0 ? (
              <Empty icon={review === 'wrong' ? Award : Target}
                title={review === 'wrong' ? 'Nothing missed on this attempt' : 'No correct answers on this attempt'}>
                {review === 'wrong' ? 'Every question was answered correctly.' : 'Switch to “All” to see the correct options and explanations.'}
              </Empty>
            ) : (
              <div className="col gap12">
                {detail.shown.map(({ i, ans, question, ok, chosen }) => (
                  <article className={`q-card ${ok ? 'correct' : 'wrong'}`} key={ans.questionId ?? i}>
                    <div className="row-between wrap gap8">
                      <span className="q-num">Question {i + 1} · {question?.marks ?? 1} mark{(question?.marks ?? 1) === 1 ? '' : 's'}</span>
                      <Chip tone={ok ? 'ok' : chosen ? 'danger' : 'warn'} icon={ok ? CheckCircle2 : chosen ? XCircle : CircleSlash}>
                        {ok ? 'Correct' : chosen ? 'Incorrect' : 'Not answered'}
                      </Chip>
                    </div>
                    {question ? (
                      <>
                        <p className="q-text">{question.text}</p>
                        <div className="q-options">
                          {Object.entries(question.options).map(([key, text]) => {
                            const isRight = key === question.correct
                            const isPick = key === chosen
                            return (
                              <div className={`q-option ${isRight ? 'right' : isPick ? 'wrongpick' : ''}`} key={key} style={{ cursor: 'default' }}>
                                <span className="q-option-key">{key.toUpperCase()}</span>
                                <span className="q-option-text">{text}</span>
                                {isRight && <CheckCircle2 size={15} style={{ color: 'var(--ok)', flex: 'none' }} />}
                                {isPick && !isRight && <XCircle size={15} style={{ color: 'var(--danger)', flex: 'none' }} />}
                                {isPick && <Chip tone="violet" className="desktop-only">learner answer</Chip>}
                              </div>
                            )
                          })}
                        </div>
                        {question.explain && <div className="q-explain"><Lightbulb /><span><b>Why:</b> {question.explain}</span></div>}
                      </>
                    ) : (
                      <div className="q-explain">
                        <Lightbulb />
                        <span>This question was removed from the quiz after the attempt was submitted.
                          The learner chose <b>{chosen ? chosen.toUpperCase() : 'nothing'}</b> and the answer was graded <b>{ok ? 'correct' : 'incorrect'}</b> at the time.</span>
                      </div>
                    )}
                  </article>
                ))}
              </div>
            )}

            {detail.topic && detail.topic.resources.length > 0 && (
              <>
                <hr className="rule" />
                <div className="eyebrow mb8">Resources attached to this topic · {detail.topic.resources.length}</div>
                <div className="col gap8">
                  {detail.topic.resources.map((r) => {
                    const seen = state.resourceViews.find((v) => v.studentId === detail.record.studentId && v.resourceId === r.id)
                    return (
                      <div className={`resource ${seen?.completed ? 'done' : ''}`} key={r.id}>
                        <span className={`resource-icon ${r.rtype}`}><Layers /></span>
                        <span className="resource-text">
                          <b>{r.title}</b>
                          <span>{r.description}</span>
                        </span>
                        <span className="resource-actions">
                          <Chip tone="slate">{r.minutes} min</Chip>
                          {seen?.completed ? <Chip tone="ok" icon={CheckCircle2}>Completed</Chip>
                            : seen ? <Chip tone="warn">Opened</Chip>
                              : <Chip tone="slate">Not started</Chip>}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </>
            )}

            <div className="row gap8 wrap mt16">
              <Link className="btn btn-sm btn-outline" to="/admin/students"><GraduationCap /> Learner directory</Link>
              <Link className="btn btn-sm btn-outline" to="/admin/analytics"><Activity /> Class analytics</Link>
              <Link className="btn btn-sm btn-ghost" to="/admin/content"><BookOpen /> Edit this quiz</Link>
            </div>
          </>
        )}
      </Drawer>
    </>
  )
}