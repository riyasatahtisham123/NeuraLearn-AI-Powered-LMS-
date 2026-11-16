import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Library, FileText, Video, FileDown, Dumbbell, ExternalLink, CheckCircle2, Plus,
  SearchX, Clock, Filter, LayoutGrid, List, Sparkles, Target,
} from 'lucide-react'
import { useStore } from '../../lib/store.jsx'
import { flattenResources, isCompleted, isViewed, topicScores } from '../../lib/ai.js'
import { RESOURCE_TYPES } from '../../data/content.js'
import { hoursMinutes } from '../../lib/format.js'
import { PageHead, Panel, SearchBox, Segmented, Chip, Empty, Kpi, DifficultyChip } from '../../components/ui.jsx'

const TYPE_ICON = { article: FileText, video: Video, pdf: FileDown, practice: Dumbbell }

export default function Resources() {
  const { state, user, setResourceCompleted, toast } = useStore()
  const [q, setQ] = useState('')
  const [type, setType] = useState('all')
  const [course, setCourse] = useState('all')
  const [status, setStatus] = useState('all')
  const [sort, setSort] = useState('recommended')
  const [layout, setLayout] = useState('list')
  const [selected, setSelected] = useState(new Set())

  const scores = useMemo(() => topicScores(state, user.id), [state, user.id])
  const all = useMemo(() => flattenResources(state.courses), [state.courses])

  const rows = useMemo(() => {
    let list = all.map((r) => ({
      ...r,
      done: isCompleted(state, user.id, r.id),
      seen: isViewed(state, user.id, r.id),
      topicScore: scores.find((s) => s.topicId === r.topicId)?.percentage ?? null,
      learners: state.resourceViews.filter((v) => v.resourceId === r.id && v.completed).length,
    }))
    if (type !== 'all') list = list.filter((r) => r.rtype === type)
    if (course !== 'all') list = list.filter((r) => r.courseId === Number(course))
    if (status === 'done') list = list.filter((r) => r.done)
    if (status === 'progress') list = list.filter((r) => r.seen && !r.done)
    if (status === 'new') list = list.filter((r) => !r.seen)
    if (status === 'gap') list = list.filter((r) => r.topicScore != null && r.topicScore < 60)
    if (q.trim()) {
      const t = q.trim().toLowerCase()
      list = list.filter((r) => `${r.title} ${r.description} ${r.topicName} ${r.courseTitle}`.toLowerCase().includes(t))
    }
    const sorters = {
      recommended: (a, b) => (a.done - b.done) || ((a.topicScore ?? 101) - (b.topicScore ?? 101)) || b.learners - a.learners,
      title: (a, b) => a.title.localeCompare(b.title),
      topic: (a, b) => a.topicName.localeCompare(b.topicName) || a.id - b.id,
      duration: (a, b) => a.minutes - b.minutes,
      popularity: (a, b) => b.learners - a.learners,
      difficulty: (a, b) => a.difficulty - b.difficulty,
    }
    return list.sort(sorters[sort] ?? sorters.recommended)
  }, [all, state, user.id, scores, type, course, status, q, sort])

  const stats = {
    total: all.length,
    done: all.filter((r) => isCompleted(state, user.id, r.id)).length,
    progress: all.filter((r) => isViewed(state, user.id, r.id) && !isCompleted(state, user.id, r.id)).length,
    minutes: all.filter((r) => isCompleted(state, user.id, r.id)).reduce((s, r) => s + r.minutes, 0),
  }

  const toggleSelect = (id) => setSelected((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n })
  const allVisibleSelected = rows.length > 0 && rows.every((r) => selected.has(r.id))

  const bulkComplete = (value) => {
    selected.forEach((id) => setResourceCompleted(id, value))
    toast(`${selected.size} resources marked ${value ? 'completed' : 'not completed'}`, { tone: 'success' })
    setSelected(new Set())
  }

  const typeCounts = Object.keys(RESOURCE_TYPES).reduce((acc, k) => ({ ...acc, [k]: all.filter((r) => r.rtype === k).length }), {})

  return (
    <>
      <PageHead eyebrow="Learning" title="Resource Library"
        subtitle="Every learning resource across all courses, organised by topic. Filter by type, course or completion status — the default order puts resources from your weakest topics first."
        actions={<Link className="btn btn-primary" to="/recommendations"><Sparkles /> AI-ranked for me</Link>} />

      <div className="grid g4 mb16">
        <Kpi label="Total resources" value={stats.total} icon={Library} tone="cyan" delay={40} />
        <Kpi label="Completed" value={stats.done} unit={`/ ${stats.total}`} icon={CheckCircle2} tone="lime" delay={80}
          foot={<>{stats.total ? Math.round((stats.done / stats.total) * 100) : 0}% of the library</>} />
        <Kpi label="In progress" value={stats.progress} icon={Clock} tone="amber" delay={120} foot={<>opened but not finished</>} />
        <Kpi label="Content consumed" value={hoursMinutes(stats.minutes)} icon={Target} tone="magenta" delay={160} foot={<>from completed resources</>} />
      </div>

      <Panel className="reveal reveal-2" bodyClass="tight">
        <div className="filter-bar" style={{ marginBottom: 0 }}>
          <SearchBox value={q} onChange={setQ} placeholder="Search resources, topics, descriptions…" />
          <select className="select" value={type} onChange={(e) => setType(e.target.value)} aria-label="Filter by type">
            <option value="all">All types ({all.length})</option>
            {Object.entries(RESOURCE_TYPES).map(([k, v]) => <option key={k} value={k}>{v.label} ({typeCounts[k]})</option>)}
          </select>
          <select className="select" value={course} onChange={(e) => setCourse(e.target.value)} aria-label="Filter by course">
            <option value="all">All courses</option>
            {state.courses.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
          </select>
          <select className="select" value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Filter by status">
            <option value="all">Any status</option>
            <option value="new">Not started</option>
            <option value="progress">In progress</option>
            <option value="done">Completed</option>
            <option value="gap">From weak topics</option>
          </select>
          <select className="select" value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort resources">
            <option value="recommended">Sort: Weakest topic first</option>
            <option value="title">Sort: Title A–Z</option>
            <option value="topic">Sort: Topic</option>
            <option value="duration">Sort: Shortest</option>
            <option value="popularity">Sort: Most completed</option>
            <option value="difficulty">Sort: Easiest</option>
          </select>
          <Segmented value={layout} onChange={setLayout} options={[{ value: 'list', label: <List size={13} /> }, { value: 'grid', label: <LayoutGrid size={13} /> }]} />
        </div>
      </Panel>

      <div className="row-between wrap gap12 mt16 mb12 reveal reveal-3">
        <div className="row gap10">
          <label className="row gap8" style={{ cursor: 'pointer', fontSize: 12.5, color: 'var(--text-2)' }}>
            <input type="checkbox" className="check" checked={allVisibleSelected}
              ref={(el) => { if (el) el.indeterminate = selected.size > 0 && !allVisibleSelected }}
              onChange={() => setSelected(allVisibleSelected ? new Set() : new Set(rows.map((r) => r.id)))} />
            Select all visible
          </label>
          <span className="muted mono" style={{ fontSize: 11.5 }}>{rows.length} of {all.length} shown</span>
        </div>
        {selected.size > 0 && (
          <div className="row gap8">
            <Chip tone="violet">{selected.size} selected</Chip>
            <button className="btn btn-sm btn-ok" onClick={() => bulkComplete(true)}><CheckCircle2 /> Mark completed</button>
            <button className="btn btn-sm btn-outline" onClick={() => bulkComplete(false)}><Plus /> Mark not done</button>
            <button className="btn btn-sm btn-ghost" onClick={() => setSelected(new Set())}>Clear</button>
          </div>
        )}
      </div>

      {rows.length === 0 ? (
        <Panel className="reveal reveal-3">
          <Empty icon={SearchX} title="No resources match these filters"
            action={<button className="btn btn-sm btn-outline mt12" onClick={() => { setQ(''); setType('all'); setCourse('all'); setStatus('all') }}>
              <Filter /> Reset all filters
            </button>}>
            Try a different type, course or status combination.
          </Empty>
        </Panel>
      ) : layout === 'list' ? (
        <div className="col gap8">
          {rows.map((r, i) => {
            const Icon = TYPE_ICON[r.rtype] ?? FileText
            return (
              <div className={`resource reveal ${r.done ? 'done' : ''}`} key={r.id}
                style={{ animationDelay: `${Math.min(i * 22, 400)}ms`, background: 'var(--surface)', padding: '13px 15px' }}>
                <input type="checkbox" className="check" checked={selected.has(r.id)} onChange={() => toggleSelect(r.id)}
                  aria-label={`Select ${r.title}`} />
                <span className={`resource-icon ${r.rtype}`}><Icon /></span>
                <span className="resource-text">
                  <b>{r.title}</b>
                  <span>{r.description}</span>
                  <span className="row gap8 wrap mt8" style={{ fontSize: 10.5 }}>
                    <Link to={`/courses/${r.courseId}`} className={`chip chip-${r.tone}`} style={{ textDecoration: 'none', fontSize: 9.5 }}>{r.courseTitle}</Link>
                    <span className="chip chip-slate" style={{ fontSize: 9.5 }}>{r.topicName}</span>
                    <span className="chip chip-slate" style={{ fontSize: 9.5 }}>{RESOURCE_TYPES[r.rtype]?.label}</span>
                    <DifficultyChip level={r.difficulty} />
                    <span className="muted mono"><Clock size={10} style={{ display: 'inline', verticalAlign: -1 }} /> {r.minutes}m</span>
                    <span className="muted mono">{r.learners} {r.learners === 1 ? 'learner' : 'learners'} done</span>
                    {r.topicScore != null && r.topicScore < 60 && <Chip tone="danger">Topic at {r.topicScore}%</Chip>}
                  </span>
                </span>
                <span className="resource-actions">
                  {r.url && <a className="btn btn-sm btn-outline btn-icon" href={r.url} target="_blank" rel="noreferrer noopener" title="Open resource"><ExternalLink /></a>}
                  <Link className="btn btn-sm btn-ghost btn-icon" to={`/quiz/${r.topicId}`} title="Take the topic quiz"><Target /></Link>
                  <button className={`btn btn-sm ${r.done ? 'btn-ok' : 'btn-outline'}`} onClick={() => setResourceCompleted(r.id, !r.done)}>
                    {r.done ? <CheckCircle2 /> : <Plus />}<span className="desktop-only">{r.done ? 'Done' : 'Mark done'}</span>
                  </button>
                </span>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="grid g3">
          {rows.map((r, i) => {
            const Icon = TYPE_ICON[r.rtype] ?? FileText
            return (
              <article className={`panel panel-pad reveal ${r.done ? '' : ''}`} key={r.id}
                style={{ animationDelay: `${Math.min(i * 30, 400)}ms`, borderColor: r.done ? 'var(--ok-line)' : undefined }}>
                <div className="row-between mb12">
                  <span className={`resource-icon ${r.rtype}`}><Icon /></span>
                  <input type="checkbox" className="check" checked={selected.has(r.id)} onChange={() => toggleSelect(r.id)} aria-label={`Select ${r.title}`} />
                </div>
                <h3 style={{ fontSize: 14.5 }}>{r.title}</h3>
                <p style={{ fontSize: 12.2, color: 'var(--text-3)', marginTop: 6, lineHeight: 1.55, minHeight: 56 }}>{r.description}</p>
                <div className="row gap6 wrap mt12">
                  <span className={`chip chip-${r.tone}`} style={{ fontSize: 9.5 }}>{r.topicName}</span>
                  <DifficultyChip level={r.difficulty} />
                  <Chip tone="slate">{r.minutes}m</Chip>
                </div>
                <div className="row gap8 mt16">
                  {r.url && <a className="btn btn-sm btn-outline" href={r.url} target="_blank" rel="noreferrer noopener"><ExternalLink /> Open</a>}
                  <button className={`btn btn-sm ${r.done ? 'btn-ok' : 'btn-primary'}`} style={{ flex: 1 }} onClick={() => setResourceCompleted(r.id, !r.done)}>
                    {r.done ? <><CheckCircle2 /> Completed</> : <><Plus /> Mark done</>}
                  </button>
                </div>
              </article>
            )
          })}
        </div>
      )}
    </>
  )
}