import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Sparkles, FileText, Video, FileDown, Dumbbell, ExternalLink, CheckCircle2, Plus,
  Target, Brain, Users, SearchX, Filter, Info, Eye, ChevronRight, Sigma, Layers,
  Gauge, BookOpen, Download,
} from 'lucide-react'
import { useStore } from '../../lib/store.jsx'
import { recommend, similarStudents, strengthsAndGaps, WEAK_LIMIT } from '../../lib/ai.js'
import { RESOURCE_TYPES } from '../../data/content.js'
import { downloadCSV, pct } from '../../lib/format.js'
import {
  PageHead, Panel, Kpi, Chip, Empty, Banner, Bar, DifficultyChip, BandChip, Avatar,
  SearchBox, Stepper, Drawer, StatLine,
} from '../../components/ui.jsx'

const TYPE_ICON = { article: FileText, video: Video, pdf: FileDown, practice: Dumbbell }

export default function Recommendations() {
  const { state, user, setResourceCompleted, toast } = useStore()
  const [limit, setLimit] = useState(9)
  const [q, setQ] = useState('')
  const [type, setType] = useState('all')
  const [scope, setScope] = useState('all')
  const [sort, setSort] = useState('score')
  const [detail, setDetail] = useState(null)

  const result = useMemo(() => recommend(state, user.id, limit), [state, user.id, limit])
  const summary = useMemo(() => strengthsAndGaps(state, user.id), [state, user.id])
  const peers = useMemo(() => similarStudents(state, user.id, 3), [state, user.id])

  const rows = useMemo(() => {
    let list = result.items
    if (type !== 'all') list = list.filter((r) => r.resource.rtype === type)
    if (scope === 'gap') list = list.filter((r) => r.inGap)
    if (scope === 'new') list = list.filter((r) => !r.seen)
    if (scope === 'done') list = list.filter((r) => r.done)
    if (q.trim()) {
      const t = q.trim().toLowerCase()
      list = list.filter((r) => `${r.resource.title} ${r.resource.description} ${r.resource.topicName}`.toLowerCase().includes(t))
    }
    const sorters = {
      score: (a, b) => b.score - a.score,
      relevance: (a, b) => b.relevance - a.relevance,
      popular: (a, b) => b.learners - a.learners,
      easy: (a, b) => a.resource.difficulty - b.resource.difficulty || a.resource.minutes - b.resource.minutes,
      short: (a, b) => a.resource.minutes - b.resource.minutes,
    }
    return list.slice().sort(sorters[sort] ?? sorters.score)
  }, [result.items, type, scope, q, sort])

  const exportRows = () => {
    downloadCSV('neuralearn-ai-recommendations.csv', rows.map((r, i) => ({
      Rank: i + 1,
      Resource: r.resource.title,
      Type: RESOURCE_TYPES[r.resource.rtype]?.label ?? r.resource.rtype,
      Topic: r.resource.topicName,
      Course: r.resource.courseTitle,
      'Cosine similarity': r.relevance,
      'Gap bonus': r.gapBonus,
      'Popularity bonus': r.popBonus,
      'Difficulty bonus': r.difficultyBonus,
      'Total score': r.score,
      'Learners completed': r.learners,
      'Already viewed': r.seen ? 'yes' : 'no',
      Reason: r.reason,
    })))
    toast(`${rows.length} recommendations exported`, { tone: 'success' })
  }

  const profile = result.profile
  const totalMinutes = rows.reduce((s, r) => s + r.resource.minutes, 0)

  return (
    <>
      <PageHead eyebrow="AI Engine · Module 2" title="Personalized Recommendations"
        subtitle="A content-based recommender: your learning gaps become a text profile, every resource becomes a TF-IDF vector, and cosine similarity ranks the library against you. Scores update the moment you finish a quiz or a resource."
        actions={<>
          <button className="btn btn-outline" onClick={exportRows} disabled={!rows.length}><Download /> Export CSV</button>
          <Link className="btn btn-primary" to="/learning-path"><Target /> Learning path</Link>
        </>} />

      {profile?.fallback && (
        <Banner tone="info" icon={Info} title="No learning gap detected yet"
          action={<Link className="btn btn-sm btn-outline" to="/courses">Take a quiz</Link>}>
          The recommender has fallen back to the three hardest topics in the catalogue, exactly as the Python module does. Attempt a quiz and your real weak areas will drive the ranking.
        </Banner>
      )}

      <div className="grid g5 mt16 mb16">
        <Kpi label="Ranked resources" value={result.items.length} unit={`/ ${state.courses.reduce((s, c) => s + c.topics.reduce((n, t) => n + t.resources.length, 0), 0)}`}
          icon={Layers} tone="cyan" delay={40} foot={<>top matches from the full library</>} />
        <Kpi label="Learning gaps" value={summary.gaps.length} icon={Target} tone={summary.gaps.length ? 'rose' : 'lime'} delay={80}
          foot={<>topics below {WEAK_LIMIT}%</>} />
        <Kpi label="Vocabulary terms" value={result.vocabulary} icon={Sigma} tone="violet" delay={120} foot={<>TF-IDF feature space</>} />
        <Kpi label="Fresh for you" value={result.items.filter((r) => !r.seen).length} icon={Sparkles} tone="magenta" delay={160} foot={<>never opened before</>} />
        <Kpi label="Suggested study" value={totalMinutes} unit="min" icon={Gauge} tone="lime" delay={200} foot={<>for the visible list</>} />
      </div>

      <div className="ai-explainer reveal reveal-2 mb16">
        <div className="row-between wrap gap12">
          <div className="row gap10">
            <Brain size={18} style={{ color: 'var(--brand-3)' }} />
            <b style={{ fontFamily: 'var(--font-display)', fontSize: 14 }}>How this ranking was produced</b>
          </div>
          <Chip tone="violet">TF-IDF + cosine similarity</Chip>
        </div>
        <div className="ai-steps">
          <div className="ai-step"><span className="ai-step-n">1</span>
            <span><b>Performance analysis</b> grouped all your quiz answers by topic. {summary.topicsCovered} topics attempted, {summary.gaps.length} below {WEAK_LIMIT}% became learning gaps, {summary.strengths.length} at or above 80% became strengths.</span></div>
          <div className="ai-step"><span className="ai-step-n">2</span>
            <span><b>Profile text</b> was built from the gap topic names and descriptions, plus the revision keywords. It was tokenised, stop-words removed, and weighted with TF-IDF over the whole resource corpus.</span></div>
          <div className="ai-step"><span className="ai-step-n">3</span>
            <span><b>Cosine similarity</b> compared your profile vector with every resource vector. A +0.25 gap bonus, +0.01 per learner who completed it and +0.02 per difficulty level were added, then unseen resources were floated to the top.</span></div>
        </div>
        {result.profileTerms?.length > 0 && (
          <>
            <div className="eyebrow mt16 mb8">Your profile vector · highest weighted terms</div>
            <div className="term-tags">
              {result.profileTerms.map((t) => (
                <span className="term-tag" key={t.term} title={`TF-IDF weight ${t.weight}`}>{t.term} <b style={{ color: 'var(--brand-3)' }}>{t.weight}</b></span>
              ))}
            </div>
          </>
        )}
      </div>

      <div className="grid g-main">
        <div className="col gap16">
          <Panel bodyClass="tight" className="reveal reveal-3">
            <div className="filter-bar" style={{ marginBottom: 0 }}>
              <SearchBox value={q} onChange={setQ} placeholder="Search the ranked list…" />
              <select className="select" value={type} onChange={(e) => setType(e.target.value)} aria-label="Filter by resource type">
                <option value="all">All types</option>
                {Object.entries(RESOURCE_TYPES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
              <select className="select" value={scope} onChange={(e) => setScope(e.target.value)} aria-label="Filter by scope">
                <option value="all">Everything ranked</option>
                <option value="gap">Covers a weak topic</option>
                <option value="new">Not opened yet</option>
                <option value="done">Already completed</option>
              </select>
              <select className="select" value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort recommendations">
                <option value="score">Sort: AI total score</option>
                <option value="relevance">Sort: Cosine similarity</option>
                <option value="popular">Sort: Most completed</option>
                <option value="easy">Sort: Easiest first</option>
                <option value="short">Sort: Shortest</option>
              </select>
            </div>
            <div className="row-between wrap gap12 mt12">
              <span className="muted mono" style={{ fontSize: 11.5 }}>{rows.length} shown</span>
              <div className="row gap10">
                <span className="muted" style={{ fontSize: 12 }}>Show top</span>
                <Stepper value={limit} onChange={setLimit} min={3} max={36} step={3} suffix="Number of recommendations" />
              </div>
            </div>
          </Panel>

          {rows.length === 0 ? (
            <Panel className="reveal reveal-3">
              <Empty icon={SearchX} title="Nothing matches these filters"
                action={<button className="btn btn-sm btn-outline mt12" onClick={() => { setQ(''); setType('all'); setScope('all'); setLimit(9) }}>
                  <Filter /> Reset filters
                </button>}>
                Widen the scope or raise the number of ranked resources.
              </Empty>
            </Panel>
          ) : (
            <div className="grid g2">
              {rows.map((item, i) => {
                const r = item.resource
                const Icon = TYPE_ICON[r.rtype] ?? FileText
                return (
                  <article className={`panel panel-pad rec-card reveal ${item.done ? '' : ''}`} key={r.id}
                    style={{ animationDelay: `${Math.min(i * 35, 420)}ms`, borderColor: item.inGap ? 'var(--danger-line)' : undefined }}>
                    <span className="rec-rank">#{i + 1}</span>
                    <div className="row gap10 mb12">
                      <span className={`resource-icon ${r.rtype}`}><Icon /></span>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div className="row gap6 wrap" style={{ fontSize: 10 }}>
                          <Chip tone={RESOURCE_TYPES[r.rtype]?.tone ?? 'slate'}>{RESOURCE_TYPES[r.rtype]?.label}</Chip>
                          <DifficultyChip level={r.difficulty} />
                          {item.done && <Chip tone="ok" icon={CheckCircle2}>Done</Chip>}
                        </div>
                      </div>
                    </div>
                    <h3 style={{ fontSize: 14.5, paddingRight: 46, lineHeight: 1.4 }}>{r.title}</h3>
                    <p className="muted mt8" style={{ fontSize: 12.2, lineHeight: 1.6, minHeight: 58 }}>{r.description}</p>

                    <div className="row gap6 wrap mt12">
                      <Link className={`chip chip-${r.tone}`} to={`/courses/${r.courseId}`} style={{ textDecoration: 'none', fontSize: 9.5 }}>{r.courseTitle}</Link>
                      <Chip tone={item.inGap ? 'danger' : 'slate'}>{r.topicName}</Chip>
                      <Chip tone="slate">{r.minutes} min</Chip>
                    </div>

                    <div className="rule mt12 mb12" />
                    <div className="row-between mb8">
                      <span className="eyebrow">AI match score</span>
                      <span className="match-val">{item.score.toFixed(3)}</span>
                    </div>
                    <div className="match-meter">
                      <Bar value={Math.min(100, item.score * 100)} tone={item.inGap ? 'rose' : 'cyan'} height={6} />
                    </div>
                    <div className="row-between mt8" style={{ fontSize: 10.5 }}>
                      <span className="muted mono">cosine {item.relevance.toFixed(3)}</span>
                      <span className="muted mono">{item.learners} learners done</span>
                    </div>
                    <p className="mt12" style={{ fontSize: 11.8, color: item.inGap ? 'var(--rose)' : 'var(--text-3)', lineHeight: 1.5 }}>
                      {item.inGap ? <Target size={12} style={{ display: 'inline', verticalAlign: -2, marginRight: 5 }} /> : <Info size={12} style={{ display: 'inline', verticalAlign: -2, marginRight: 5 }} />}
                      {item.reason}
                    </p>

                    <div className="row gap8 mt16">
                      <button className="btn btn-sm btn-ghost" onClick={() => setDetail(item)}><Eye /> Why this?</button>
                      {r.url && <a className="btn btn-sm btn-outline btn-icon" href={r.url} target="_blank" rel="noreferrer noopener" title="Open resource"><ExternalLink /></a>}
                      <button className={`btn btn-sm ${item.done ? 'btn-ok' : 'btn-primary'}`} style={{ flex: 1 }}
                        onClick={() => setResourceCompleted(r.id, !item.done)}>
                        {item.done ? <><CheckCircle2 /> Completed</> : <><Plus /> Mark done</>}
                      </button>
                    </div>
                    <Link className="btn btn-sm btn-ghost btn-block mt8" to={`/quiz/${r.topicId}`}><Target /> Take the {r.topicName} quiz</Link>
                  </article>
                )
              })}
            </div>
          )}
        </div>

        <div className="col gap16">
          <Panel title="Your gap profile" icon={Target} className="reveal reveal-3"
            actions={<Link className="btn btn-sm btn-ghost" to="/performance">Details</Link>}>
            {summary.gaps.length === 0 ? (
              <Empty icon={CheckCircle2} title="No learning gaps">Every attempted topic is at or above {WEAK_LIMIT}%.</Empty>
            ) : (
              <div className="col gap10">
                {summary.gaps.map((g) => (
                  <div key={g.topicId}>
                    <div className="row-between mb8">
                      <Link to={`/quiz/${g.topicId}`} style={{ fontSize: 12.8, fontWeight: 600, textDecoration: 'none', color: 'var(--text)' }}>{g.name}</Link>
                      <b className="mono" style={{ color: 'var(--rose)', fontSize: 12 }}>{pct(g.percentage)}</b>
                    </div>
                    <Bar value={g.percentage} band="weak" height={6} />
                    <div className="muted mono mt4" style={{ fontSize: 10 }}>{g.courseCode} · {g.attempts} attempt{g.attempts === 1 ? '' : 's'} · difficulty {g.difficulty}/3</div>
                  </div>
                ))}
              </div>
            )}
            <div className="rule mt16 mb12" />
            <StatLine label="Overall average" value={pct(summary.overall)} />
            <StatLine label="Strengths" value={`${summary.strengths.length} topics`} tone="lime" />
            <StatLine label="Developing" value={`${summary.medium.length} topics`} tone="amber" />
          </Panel>

          <Panel title="Learners with the same gaps" icon={Users} className="reveal reveal-5"
            eyebrow="Peer signal from shared weak topics">
            {peers.length === 0 ? (
              <Empty icon={Users} title="No overlap yet">No other learner currently shares your weak topics.</Empty>
            ) : (
              <div className="col gap12">
                {peers.map((p) => (
                  <div className="row gap10" key={p.student.id}>
                    <Avatar user={p.student} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <b style={{ fontSize: 12.8, display: 'block' }}>{p.student.name}</b>
                      <span className="muted" style={{ fontSize: 11 }}>{p.common} of {p.of} gaps in common</span>
                      <div className="row gap4 wrap mt4">
                        {p.topics.slice(0, 3).map((t) => <span className="term-tag" key={t}>{t}</span>)}
                      </div>
                    </div>
                    <Chip tone="violet">{Math.round((p.common / p.of) * 100)}%</Chip>
                  </div>
                ))}
              </div>
            )}
          </Panel>

          <Panel title="Next best action" icon={ChevronRight} className="reveal reveal-5">
            {summary.gaps.length > 0 ? (
              <>
                <p style={{ fontSize: 12.8, color: 'var(--text-2)', lineHeight: 1.65 }}>
                  Start with <b style={{ color: 'var(--text)' }}>{summary.gaps[0].name}</b> at {pct(summary.gaps[0].percentage)}.
                  Read its resources, log the study time, then re-attempt the quiz — the topic average is computed over every attempt, so one revision cycle moves it.
                </p>
                <Link className="btn btn-primary btn-block mt16" to={`/quiz/${summary.gaps[0].topicId}`}><Target /> Re-attempt {summary.gaps[0].name}</Link>
                <Link className="btn btn-outline btn-block mt8" to={`/courses/${summary.gaps[0].courseId}`}><BookOpen /> Open the course</Link>
              </>
            ) : (
              <>
                <p style={{ fontSize: 12.8, color: 'var(--text-2)', lineHeight: 1.65 }}>
                  You are above the gap threshold on every attempted topic. Push the developing ones past 80% to turn them into strengths.
                </p>
                <Link className="btn btn-primary btn-block mt16" to="/learning-path"><Target /> Open learning path</Link>
              </>
            )}
            <div className="row gap6 wrap mt16">
              <BandChip band="weak" />
              <BandChip band="medium" />
              <BandChip band="strong" />
            </div>
          </Panel>
        </div>
      </div>

      <Drawer open={!!detail} onClose={() => setDetail(null)} title={detail?.resource.title ?? ''}
        subtitle={detail ? `${detail.resource.topicName} · ${detail.resource.courseTitle}` : ''} icon={Sparkles}
        footer={detail && <>
          <button className="btn btn-ghost" onClick={() => setDetail(null)}>Close</button>
          {detail.resource.url && <a className="btn btn-outline" href={detail.resource.url} target="_blank" rel="noreferrer noopener"><ExternalLink /> Open resource</a>}
          <button className={`btn ${detail.done ? 'btn-ok' : 'btn-primary'}`}
            onClick={() => { setResourceCompleted(detail.resource.id, !detail.done); setDetail(null) }}>
            {detail.done ? <><CheckCircle2 /> Mark not done</> : <><Plus /> Mark completed</>}
          </button>
        </>}>
        {detail && (
          <>
            <p style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.7 }}>{detail.resource.description}</p>
            <div className="row gap6 wrap mt12">
              <Chip tone={RESOURCE_TYPES[detail.resource.rtype]?.tone ?? 'slate'}>{RESOURCE_TYPES[detail.resource.rtype]?.label}</Chip>
              <DifficultyChip level={detail.resource.difficulty} />
              <Chip tone="slate">{detail.resource.minutes} min</Chip>
              {detail.inGap && <Chip tone="danger">Weak topic match</Chip>}
              {detail.seen && <Chip tone="info">Already opened</Chip>}
            </div>

            <div className="rule mt20 mb16" />
            <div className="eyebrow mb12">Score composition</div>
            <div className="col gap10">
              <StatLine label="Cosine similarity (TF-IDF)" value={detail.relevance.toFixed(3)} tone="cyan" />
              <StatLine label="Gap bonus (topic below 60%)" value={`+${detail.gapBonus.toFixed(2)}`} tone={detail.gapBonus ? 'rose' : undefined} />
              <StatLine label={`Popularity bonus (${detail.learners} × 0.01)`} value={`+${detail.popBonus.toFixed(2)}`} tone="violet" />
              <StatLine label={`Difficulty bonus (${detail.resource.difficulty} × 0.02)`} value={`+${detail.difficultyBonus.toFixed(2)}`} tone="amber" />
              <div className="rule" />
              <StatLine label="Total ranking score" value={detail.score.toFixed(3)} tone="lime" />
            </div>

            <div className="eyebrow mt20 mb8">Resource vector · top TF-IDF terms</div>
            <div className="term-tags">
              {detail.terms.map((t) => <span className="term-tag" key={t.term}>{t.term} <b style={{ color: 'var(--brand-3)' }}>{t.weight}</b></span>)}
            </div>

            <div className="eyebrow mt20 mb8">Why the engine chose it</div>
            <div className="q-explain" style={{ marginTop: 0 }}><Info /><span>{detail.reason}</span></div>

            <Link className="btn btn-outline btn-block mt20" to={`/quiz/${detail.resource.topicId}`} onClick={() => setDetail(null)}>
              <Target /> Take the {detail.resource.topicName} quiz
            </Link>
          </>
        )}
      </Drawer>
    </>
  )
}