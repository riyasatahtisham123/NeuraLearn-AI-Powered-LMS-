import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft, BookOpen, ChevronDown, FileText, Video, FileDown, Dumbbell, ExternalLink,
  Play, Clock, CheckCircle2, Target, ClipboardList, Plus, Minus, Sparkles, Layers,
} from 'lucide-react'
import { useStore } from '../../lib/store.jsx'
import { topicScores, isCompleted, isViewed, findCourse, studyTimeByTopic } from '../../lib/ai.js'
import { RESOURCE_TYPES } from '../../data/content.js'
import { hoursMinutes, fmtDate } from '../../lib/format.js'
import {
  PageHead, Panel, Chip, DifficultyChip, BandChip, Bar, Empty, Stepper, Modal, Banner, ScoreRing,
} from '../../components/ui.jsx'

const TYPE_ICON = { article: FileText, video: Video, pdf: FileDown, practice: Dumbbell }

export default function CourseDetail() {
  const { courseId } = useParams()
  const { state, user, setResourceCompleted, logStudy } = useStore()
  const navigate = useNavigate()
  const course = findCourse(state.courses, courseId)
  const [open, setOpen] = useState(() => new Set())
  const [studyTopic, setStudyTopic] = useState(null)
  const [minutes, setMinutes] = useState(25)

  const scores = useMemo(() => (course ? topicScores(state, user.id).filter((r) => r.courseId === course.id) : []), [state, user.id, course])
  const study = useMemo(() => studyTimeByTopic(state, user.id), [state, user.id])
  const enrolled = state.enrollments.some((e) => e.studentId === user.id && e.courseId === Number(courseId))

  if (!course) {
    return (
      <Panel><Empty icon={BookOpen} title="Course not found"
        action={<Link className="btn btn-primary mt12" to="/courses">Back to courses</Link>}>
        This course may have been removed by the administrator.
      </Empty></Panel>
    )
  }

  const toggle = (id) => setOpen((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n })
  const avg = scores.length ? Math.round((scores.reduce((s, r) => s + r.percentage, 0) / scores.length) * 10) / 10 : 0
  const gaps = scores.filter((r) => r.percentage < 60).length
  const resTotal = course.topics.reduce((s, t) => s + t.resources.length, 0)
  const resDone = course.topics.reduce((s, t) => s + t.resources.filter((r) => isCompleted(state, user.id, r.id)).length, 0)
  const attempted = course.topics.filter((t) => state.attempts.some((a) => a.studentId === user.id && a.topicId === t.id)).length
  const totalMinutes = study.filter((s) => course.topics.some((t) => t.id === s.topicId)).reduce((sum, s) => sum + s.minutes, 0)

  return (
    <>
      <Link to="/courses" className="btn btn-ghost btn-sm mb12 reveal"><ArrowLeft /> All courses</Link>

      <div className={`panel course-card mb16 reveal reveal-1`} style={{ overflow: 'hidden' }}>
        <div className={`course-banner course-banner-${course.tone}`} style={{ height: 116 }}>
          <span className="course-code">{course.code}</span>
          <span style={{ position: 'absolute', right: 16, top: 14, zIndex: 2 }}>
            <Chip tone={enrolled ? 'ok' : 'slate'}>{enrolled ? 'Enrolled' : 'Not enrolled'}</Chip>
          </span>
        </div>
        <div className="course-body">
          <div className="row-between wrap gap16">
            <div style={{ flex: 1, minWidth: 240 }}>
              <h1 style={{ fontSize: 27 }}>{course.title}</h1>
              <p style={{ fontSize: 13.5, color: 'var(--text-3)', marginTop: 7, maxWidth: '70ch' }}>{course.description}</p>
              <div className="course-meta">
                <span><Layers />{course.topics.length} topics</span>
                <span><FileText />{resTotal} resources</span>
                <span><ClipboardList />{course.topics.reduce((s, t) => s + t.questions.length, 0)} questions</span>
                <span><Clock />{hoursMinutes(totalMinutes)} studied</span>
                <span>Semester {course.semester} · {course.credits} credits</span>
              </div>
              <p className="field-hint mt8">Instructor: <b style={{ color: 'var(--text-2)' }}>{course.instructor || '—'}</b></p>
            </div>
            <div className="row gap20">
              <ScoreRing value={avg} size={124} label="Course avg" />
              <div className="col gap8" style={{ minWidth: 132 }}>
                <div className="stat-line" style={{ padding: '5px 0' }}><span className="muted">Topics done</span><b>{attempted}/{course.topics.length}</b></div>
                <div className="stat-line" style={{ padding: '5px 0' }}><span className="muted">Resources</span><b>{resDone}/{resTotal}</b></div>
                <div className="stat-line" style={{ padding: '5px 0' }}><span className="muted">Gaps</span><b style={{ color: gaps ? 'var(--rose)' : 'var(--ok)' }}>{gaps}</b></div>
              </div>
            </div>
          </div>
          <div className="mt16">
            <div className="row-between mb8" style={{ fontSize: 12 }}>
              <span className="muted">Course completion</span>
              <b className="mono">{course.topics.length ? Math.round((attempted / course.topics.length) * 100) : 0}%</b>
            </div>
            <Bar value={course.topics.length ? (attempted / course.topics.length) * 100 : 0} tone={course.tone} height={8} />
          </div>
        </div>
      </div>

      {gaps > 0 && (
        <div className="mb16 reveal reveal-2">
          <Banner tone="danger" icon={Target} title={`${gaps} topic${gaps === 1 ? '' : 's'} in this course below 60%`}
            action={<Link className="btn btn-sm btn-danger" to="/learning-path">Open path <Sparkles size={13} /></Link>}>
            The AI recommends revising the listed resources before re-attempting these quizzes.
          </Banner>
        </div>
      )}

      <div className="row-between mb12 reveal reveal-2">
        <h2 style={{ fontSize: 19 }}>Topics & learning resources</h2>
        <div className="btn-row">
          <button className="btn btn-sm btn-outline" onClick={() => setOpen(new Set(course.topics.map((t) => t.id)))}>Expand all</button>
          <button className="btn btn-sm btn-ghost" onClick={() => setOpen(new Set())}>Collapse all</button>
        </div>
      </div>

      <div className="col gap12">
        {course.topics.slice().sort((a, b) => a.position - b.position).map((t, i) => {
          const score = scores.find((s) => s.topicId === t.id)
          const isOpen = open.has(t.id)
          const doneCount = t.resources.filter((r) => isCompleted(state, user.id, r.id)).length
          const topicMinutes = study.find((s) => s.topicId === t.id)?.minutes ?? 0
          const attempts = state.attempts.filter((a) => a.studentId === user.id && a.topicId === t.id)
          return (
            <div className={`topic reveal ${isOpen ? 'open' : ''}`} key={t.id} style={{ animationDelay: `${100 + i * 50}ms` }}>
              <button className="topic-head" onClick={() => toggle(t.id)} aria-expanded={isOpen}>
                <span className="topic-index">{String(i + 1).padStart(2, '0')}</span>
                <span className="topic-title">
                  <b>{t.name}</b>
                  <span>{t.description}</span>
                </span>
                <span className="row gap8 desktop-only">
                  <DifficultyChip level={t.difficulty} />
                  {score ? <BandChip band={score.band} value={score.percentage} /> : <Chip tone="slate">Not attempted</Chip>}
                  <Chip tone="slate"><CheckCircle2 size={11} />{doneCount}/{t.resources.length}</Chip>
                </span>
                <ChevronDown className="topic-chevron" />
              </button>

              {isOpen && (
                <div className="topic-body">
                  <div className="row gap8 wrap mt12 mb12">
                    <DifficultyChip level={t.difficulty} />
                    {score ? <BandChip band={score.band} value={score.percentage} /> : <Chip tone="slate">Not attempted</Chip>}
                    <Chip tone="cyan"><Clock size={11} />{hoursMinutes(topicMinutes)} studied</Chip>
                    <Chip tone="violet"><ClipboardList size={11} />{attempts.length} {attempts.length === 1 ? 'attempt' : 'attempts'}</Chip>
                    <Chip tone="slate">~{t.estMinutes} min content</Chip>
                    {score && <Chip tone="slate">{score.scored}/{score.possible} marks correct</Chip>}
                  </div>

                  {score && (
                    <div className="mb16">
                      <Bar value={score.percentage} band={score.band} height={6} />
                    </div>
                  )}

                  <div className="eyebrow mb8">Learning resources · {t.resources.length}</div>
                  <div className="col gap8">
                    {t.resources.length === 0 && <Empty icon={FileText} title="No resources in this topic yet">The administrator has not added any material here.</Empty>}
                    {t.resources.map((r) => {
                      const Icon = TYPE_ICON[r.rtype] ?? FileText
                      const done = isCompleted(state, user.id, r.id)
                      const seen = isViewed(state, user.id, r.id)
                      return (
                        <div className={`resource ${done ? 'done' : ''}`} key={r.id}>
                          <span className={`resource-icon ${r.rtype}`}><Icon /></span>
                          <span className="resource-text">
                            <b>{r.title}</b>
                            <span>{r.description}</span>
                            <span className="row gap8 mt8" style={{ fontSize: 10.5 }}>
                              <span className="chip chip-slate" style={{ fontSize: 9.5 }}>{RESOURCE_TYPES[r.rtype]?.label ?? r.rtype}</span>
                              <span className="muted mono">{r.minutes} min</span>
                              <span className="muted mono">{['Easy', 'Medium', 'Hard'][r.difficulty - 1]}</span>
                              {seen && !done && <span style={{ color: 'var(--amber)' }}>In progress</span>}
                            </span>
                          </span>
                          <span className="resource-actions">
                            {r.url && (
                              <a className="btn btn-sm btn-outline btn-icon" href={r.url} target="_blank" rel="noreferrer noopener"
                                title="Open resource" onClick={() => { if (!seen) setResourceCompleted(r.id, false) }}>
                                <ExternalLink />
                              </a>
                            )}
                            <button className={`btn btn-sm ${done ? 'btn-ok' : 'btn-outline'}`}
                              onClick={() => setResourceCompleted(r.id, !done)}>
                              {done ? <CheckCircle2 /> : <Plus />}<span className="desktop-only">{done ? 'Done' : 'Mark done'}</span>
                            </button>
                          </span>
                        </div>
                      )
                    })}
                  </div>

                  <hr className="rule" />

                  <div className="row-between wrap gap12">
                    <div className="row gap8">
                      <button className="btn btn-sm btn-outline" onClick={() => { setStudyTopic(t); setMinutes(25) }}>
                        <Clock /> Log study time
                      </button>
                      {attempts.length > 0 && (
                        <span className="field-hint">
                          Last attempt {fmtDate(attempts[attempts.length - 1].finishedAt)} · {attempts[attempts.length - 1].percentage}%
                        </span>
                      )}
                    </div>
                    <button className="btn btn-primary btn-sm" onClick={() => navigate(`/quiz/${t.id}`)} disabled={!t.questions.length}>
                      <Play /> {attempts.length ? 'Re-attempt quiz' : 'Start quiz'} · {t.questions.length} questions
                    </button>
                  </div>
                  {!t.questions.length && <p className="field-hint mt8" style={{ color: 'var(--warn)' }}>This quiz has no questions yet — ask the administrator to add some.</p>}
                </div>
              )}
            </div>
          )
        })}
      </div>

      <Modal open={!!studyTopic} onClose={() => setStudyTopic(null)} icon={Clock}
        title="Log study time" subtitle={studyTopic ? `${studyTopic.name} · ${course.title}` : ''}
        footer={<>
          <button className="btn btn-ghost" onClick={() => setStudyTopic(null)}>Cancel</button>
          <button className="btn btn-primary" disabled={minutes <= 0}
            onClick={() => { logStudy(studyTopic.id, minutes); setStudyTopic(null) }}>
            <CheckCircle2 /> Save {minutes} minutes
          </button>
        </>}>
        <p style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.65 }}>
          Study minutes feed the linear-regression model that predicts your next quiz score.
          Log the time you actually spent on this topic's resources.
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