import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Target, ChevronDown, FileText, Video, FileDown, Dumbbell, ExternalLink, CheckCircle2,
  Plus, Play, Clock, Sparkles, Route, ListChecks, Award, Filter, SearchX, Download,
  Eye, EyeOff, TrendingUp,
} from 'lucide-react'
import { useStore } from '../../lib/store.jsx'
import { learningPath, isCompleted, isViewed, studyTimeByTopic, BAND_META, WEAK_LIMIT, STRONG_LIMIT } from '../../lib/ai.js'
import { RESOURCE_TYPES } from '../../data/content.js'
import { hoursMinutes, pct, downloadCSV } from '../../lib/format.js'
import {
  PageHead, Panel, Kpi, Chip, DifficultyChip, BandChip, Bar, Empty, Stepper, Modal,
  Segmented, Banner, Toggle, StatLine,
} from '../../components/ui.jsx'

const TYPE_ICON = { article: FileText, video: Video, pdf: FileDown, practice: Dumbbell }

export default function LearningPath() {
  const { state, user, setResourceCompleted, logStudy, toast } = useStore()
  const navigate = useNavigate()
  const [status, setStatus] = useState('all')
  const [course, setCourse] = useState('all')
  const [hideMastered, setHideMastered] = useState(false)
  const [open, setOpen] = useState(() => new Set())
  const [studyTopic, setStudyTopic] = useState(null)
  const [minutes, setMinutes] = useState(25)

  const path = useMemo(() => learningPath(state, user.id), [state, user.id])
  const study = useMemo(() => studyTimeByTopic(state, user.id), [state, user.id])

  const rows = useMemo(() => {
    let list = path
    if (hideMastered) list = list.filter((s) => s.status !== 'strong')
    if (status !== 'all') list = list.filter((s) => s.status === status)
    if (course !== 'all') list = list.filter((s) => s.courseId === Number(course))
    return list
  }, [path, status, course, hideMastered])

  const counts = {
    weak: path.filter((s) => s.status === 'weak').length,
    medium: path.filter((s) => s.status === 'medium').length,
    strong: path.filter((s) => s.status === 'strong').length,
    new: path.filter((s) => s.status === 'new').length,
  }
  const resTotal = path.reduce((s, x) => s + x.resources.length, 0)
  const resDone = path.reduce((s, x) => s + x.doneCount, 0)
  const totalMinutes = study.reduce((s, x) => s + x.minutes, 0)
  const nextStep = path.find((s) => s.status !== 'strong')

  const toggle = (id) => setOpen((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n })

  const exportPath = () => {
    downloadCSV('neuralearn-learning-path.csv', rows.map((s) => ({
      Step: s.step,
      Topic: s.name,
      Course: s.courseTitle,
      Status: BAND_META[s.status].label,
      'Score %': s.percentage ?? '',
      Attempts: s.attempts,
      'Resources done': `${s.doneCount}/${s.resources.length}`,
      'Est. minutes': s.estMinutes,
      'Next action': s.suggestion,
    })))
    toast(`${rows.length} steps exported`, { tone: 'success' })
  }

  return (
    <>
      <PageHead eyebrow="AI Engine · Adaptive sequence" title="My Learning Path"
        subtitle="Every topic ordered weakest-first, exactly as the recommendation module builds it. Each step lists the resources to revise in easy-to-hard order, the study time logged and the quiz that closes the loop."
        actions={<>
          <button className="btn btn-outline" onClick={exportPath} disabled={!rows.length}><Download /> Export path</button>
          <Link className="btn btn-primary" to="/recommendations"><Sparkles /> AI matches</Link>
        </>} />

      {nextStep && (
        <Banner tone={nextStep.status === 'weak' ? 'danger' : nextStep.status === 'new' ? 'info' : 'warn'}
          icon={Route} title={`Step ${nextStep.step} · ${nextStep.name}`}
          action={<button className="btn btn-sm btn-primary" onClick={() => navigate(`/quiz/${nextStep.quizId}`)}
            disabled={!state.courses.flatMap((c) => c.topics).find((t) => t.id === nextStep.quizId)?.questions.length}>
            <Play /> {nextStep.attempts ? 'Re-attempt' : 'Start quiz'}
          </button>}>
          {nextStep.suggestion}{nextStep.percentage != null ? ` Current topic average ${pct(nextStep.percentage)}.` : ''}
        </Banner>
      )}

      <div className="grid g5 mt16 mb16">
        <Kpi label="Path steps" value={path.length} icon={Route} tone="cyan" delay={40} foot={<>all topics in your catalogue</>} />
        <Kpi label="Learning gaps" value={counts.weak} icon={Target} tone={counts.weak ? 'rose' : 'lime'} delay={80} foot={<>below {WEAK_LIMIT}%</>} />
        <Kpi label="Developing" value={counts.medium} icon={TrendingUp} tone="amber" delay={120} foot={<>aim for {STRONG_LIMIT}%</>} />
        <Kpi label="Mastered" value={counts.strong} icon={Award} tone="lime" delay={160} foot={<>{path.length ? Math.round((counts.strong / path.length) * 100) : 0}% of the path</>} />
        <Kpi label="Resources done" value={resDone} unit={`/ ${resTotal}`} icon={ListChecks} tone="magenta" delay={200} foot={<>{hoursMinutes(totalMinutes)} logged</>} />
      </div>

      <div className="grid g-main">
        <div className="col gap16">
          <Panel bodyClass="tight" className="reveal reveal-2">
            <div className="filter-bar" style={{ marginBottom: 0 }}>
              <Segmented value={status} onChange={setStatus} size="sm" options={[
                { value: 'all', label: `All ${path.length}` },
                { value: 'weak', label: `Gaps ${counts.weak}` },
                { value: 'medium', label: `Developing ${counts.medium}` },
                { value: 'strong', label: `Mastered ${counts.strong}` },
                { value: 'new', label: `New ${counts.new}` },
              ]} />
              <select className="select" value={course} onChange={(e) => setCourse(e.target.value)} aria-label="Filter by course">
                <option value="all">All courses</option>
                {state.courses.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
              </select>
              <label className="row gap8" style={{ fontSize: 12.5, color: 'var(--text-2)', cursor: 'pointer' }}>
                <Toggle checked={hideMastered} onChange={setHideMastered} label="Hide mastered steps" />
                {hideMastered ? <EyeOff size={13} /> : <Eye size={13} />} Focus mode
              </label>
              <div className="row gap6" style={{ marginLeft: 'auto' }}>
                <button className="btn btn-sm btn-outline" onClick={() => setOpen(new Set(rows.map((s) => s.topicId)))}>Expand all</button>
                <button className="btn btn-sm btn-ghost" onClick={() => setOpen(new Set())}>Collapse</button>
              </div>
            </div>
          </Panel>

          {rows.length === 0 ? (
            <Panel className="reveal reveal-3">
              <Empty icon={SearchX} title="No steps match this filter"
                action={<button className="btn btn-sm btn-outline mt12" onClick={() => { setStatus('all'); setCourse('all'); setHideMastered(false) }}>
                  <Filter /> Reset filters
                </button>}>
                {hideMastered && counts.strong === path.length
                  ? 'Every topic is mastered — turn off focus mode to review the full path.'
                  : 'Try another status or course.'}
              </Empty>
            </Panel>
          ) : (
            <Panel className="reveal reveal-3" title="Weakest first" icon={Route}
              eyebrow={`${rows.length} step${rows.length === 1 ? '' : 's'} in sequence`}>
              <div className="path">
                {rows.map((s, i) => {
                  const isOpen = open.has(s.topicId)
                  const topicMinutes = study.find((x) => x.topicId === s.topicId)?.minutes ?? 0
                  const topic = state.courses.flatMap((c) => c.topics).find((t) => t.id === s.topicId)
                  const questionCount = topic?.questions.length ?? 0
                  return (
                    <div className="path-step" key={s.topicId} style={{ animation: `slideUp 0.4s var(--ease) ${Math.min(i * 40, 400)}ms both` }}>
                      <span className={`path-node ${s.status}`}>{s.step}</span>
                      <div className={`topic ${isOpen ? 'open' : ''}`}>
                        <button className="topic-head" onClick={() => toggle(s.topicId)} aria-expanded={isOpen}>
                          <span className="topic-title">
                            <b>{s.name}</b>
                            <span>{s.courseCode} · {s.courseTitle} — {s.description}</span>
                          </span>
                          <span className="row gap8 desktop-only">
                            <DifficultyChip level={s.difficulty} />
                            <BandChip band={s.status} value={s.percentage} />
                            <Chip tone="slate"><CheckCircle2 size={11} />{s.doneCount}/{s.resources.length}</Chip>
                          </span>
                          <ChevronDown className="topic-chevron" />
                        </button>

                        {isOpen && (
                          <div className="topic-body">
                            <div className="row gap8 wrap mt12 mb12">
                              <BandChip band={s.status} value={s.percentage} />
                              <Chip tone="cyan"><Clock size={11} />{hoursMinutes(topicMinutes)} studied</Chip>
                              <Chip tone="violet"><ListChecks size={11} />{s.attempts} attempt{s.attempts === 1 ? '' : 's'}</Chip>
                              <Chip tone="slate">~{s.estMinutes} min content</Chip>
                              {s.possible > 0 && <Chip tone="slate">{s.scored}/{s.possible} marks</Chip>}
                            </div>

                            {s.percentage != null && <div className="mb12"><Bar value={s.percentage} band={s.status} height={6} /></div>}

                            <div className="q-explain" style={{ marginTop: 0, marginBottom: 14 }}>
                              <Sparkles /><span><b>AI suggestion:</b> {s.suggestion}</span>
                            </div>

                            <div className="eyebrow mb8">Revise in this order · easy to hard</div>
                            <div className="col gap8">
                              {s.resources.length === 0 && <Empty icon={FileText} title="No resources published for this topic yet" />}
                              {s.resources.map((r, ri) => {
                                const Icon = TYPE_ICON[r.rtype] ?? FileText
                                const done = isCompleted(state, user.id, r.id)
                                const seen = isViewed(state, user.id, r.id)
                                return (
                                  <div className={`resource ${done ? 'done' : ''}`} key={r.id}>
                                    <span className="topic-index" style={{ width: 24, height: 24, fontSize: 10.5 }}>{ri + 1}</span>
                                    <span className={`resource-icon ${r.rtype}`}><Icon /></span>
                                    <span className="resource-text">
                                      <b>{r.title}</b>
                                      <span>{r.description}</span>
                                      <span className="row gap8 wrap mt8" style={{ fontSize: 10.5 }}>
                                        <span className="chip chip-slate" style={{ fontSize: 9.5 }}>{RESOURCE_TYPES[r.rtype]?.label ?? r.rtype}</span>
                                        <DifficultyChip level={r.difficulty} />
                                        <span className="muted mono">{r.minutes} min</span>
                                        {seen && !done && <span style={{ color: 'var(--amber)' }}>In progress</span>}
                                      </span>
                                    </span>
                                    <span className="resource-actions">
                                      {r.url && <a className="btn btn-sm btn-outline btn-icon" href={r.url} target="_blank" rel="noreferrer noopener" title="Open resource"><ExternalLink /></a>}
                                      <button className={`btn btn-sm ${done ? 'btn-ok' : 'btn-outline'}`} onClick={() => setResourceCompleted(r.id, !done)}>
                                        {done ? <CheckCircle2 /> : <Plus />}<span className="desktop-only">{done ? 'Done' : 'Mark done'}</span>
                                      </button>
                                    </span>
                                  </div>
                                )
                              })}
                            </div>

                            <hr className="rule" />
                            <div className="row-between wrap gap12">
                              <button className="btn btn-sm btn-outline" onClick={() => { setStudyTopic(s); setMinutes(25) }}><Clock /> Log study time</button>
                              <div className="row gap8">
                                <Link className="btn btn-sm btn-ghost" to={`/courses/${s.courseId}`}>Course</Link>
                                <button className="btn btn-sm btn-primary" onClick={() => navigate(`/quiz/${s.quizId}`)} disabled={!questionCount}>
                                  <Play /> {s.attempts ? 'Re-attempt quiz' : 'Start quiz'} · {questionCount} Q
                                </button>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </Panel>
          )}
        </div>

        <div className="col gap16">
          <Panel title="Path progress" icon={Award} className="reveal reveal-3">
            <div className="center">
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 40, fontWeight: 700, letterSpacing: '-0.045em', lineHeight: 1, color: 'var(--lime)' }}>
                {path.length ? Math.round((counts.strong / path.length) * 100) : 0}<span style={{ fontSize: '0.45em' }}>%</span>
              </div>
              <div className="eyebrow mt8">of the path mastered</div>
            </div>
            <div className="mt16"><Bar value={path.length ? (counts.strong / path.length) * 100 : 0} tone="lime" height={8} /></div>
            <div className="col gap10 mt16">
              {['weak', 'medium', 'strong', 'new'].map((b) => (
                <div className="row-between" key={b} style={{ fontSize: 12.5 }}>
                  <span className="row gap8"><span className="dot" style={{ background: b === 'weak' ? 'var(--rose)' : b === 'medium' ? 'var(--amber)' : b === 'strong' ? 'var(--lime)' : 'var(--text-4)' }} />{BAND_META[b].label}</span>
                  <b className="mono">{counts[b]}</b>
                </div>
              ))}
            </div>
            <div className="rule mt16 mb12" />
            <StatLine label="Resources completed" value={`${resDone} / ${resTotal}`} />
            <StatLine label="Study time logged" value={hoursMinutes(totalMinutes)} tone="cyan" />
            <StatLine label="Quizzes attempted" value={state.attempts.filter((a) => a.studentId === user.id).length} />
          </Panel>

          <Panel title="How the sequence is built" icon={Sparkles} className="reveal reveal-5">
            <div className="ai-steps" style={{ marginTop: 0 }}>
              <div className="ai-step"><span className="ai-step-n">1</span><span>All quiz answers are grouped by topic and converted to a percentage of marks.</span></div>
              <div className="ai-step"><span className="ai-step-n">2</span><span>Topics are sorted ascending by that percentage, so the weakest area is always step 1. Unattempted topics go last.</span></div>
              <div className="ai-step"><span className="ai-step-n">3</span><span>Inside each step, resources are ordered by difficulty then id — read the easy material before the hard material.</span></div>
              <div className="ai-step"><span className="ai-step-n">4</span><span>Finish with the topic quiz. A new attempt changes the average and the path re-orders itself immediately.</span></div>
            </div>
          </Panel>

          <Panel title="Study time by topic" icon={Clock} className="reveal reveal-5">
            {study.length === 0 ? (
              <Empty icon={Clock} title="No study time logged">Use “Log study time” on any step — it feeds the score prediction model.</Empty>
            ) : (
              <div className="col gap10">
                {study.slice(0, 8).map((s) => (
                  <div key={s.topicId}>
                    <div className="row-between mb8" style={{ fontSize: 12.3 }}>
                      <span className="truncate">{s.name}</span>
                      <b className="mono">{hoursMinutes(s.minutes)}</b>
                    </div>
                    <Bar value={(s.minutes / study[0].minutes) * 100} tone={s.tone} height={5} />
                  </div>
                ))}
              </div>
            )}
            <Link className="btn btn-outline btn-block mt16" to="/performance"><TrendingUp /> Score prediction</Link>
          </Panel>
        </div>
      </div>

      <Modal open={!!studyTopic} onClose={() => setStudyTopic(null)} icon={Clock}
        title="Log study time" subtitle={studyTopic ? `Step ${studyTopic.step} · ${studyTopic.name}` : ''}
        footer={<>
          <button className="btn btn-ghost" onClick={() => setStudyTopic(null)}>Cancel</button>
          <button className="btn btn-primary" disabled={minutes <= 0}
            onClick={() => { logStudy(studyTopic.topicId, minutes); setStudyTopic(null) }}>
            <CheckCircle2 /> Save {minutes} minutes
          </button>
        </>}>
        <p style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.65 }}>
          These minutes are paired with your quiz percentages to fit the linear-regression model on the Performance screen.
        </p>
        <div className="row gap12 mt16" style={{ justifyContent: 'center' }}>
          <Stepper value={minutes} onChange={setMinutes} min={5} max={480} step={5} suffix="Study minutes" />
          <span className="muted" style={{ fontSize: 13 }}>= {hoursMinutes(minutes)}</span>
        </div>
        <div className="row gap8 mt16" style={{ justifyContent: 'center' }}>
          {[15, 25, 45, 60, 90].map((m) => (
            <button key={m} className={`btn btn-sm ${minutes === m ? 'btn-accent' : 'btn-outline'}`} onClick={() => setMinutes(m)}>{m}m</button>
          ))}
        </div>
      </Modal>
    </>
  )
}