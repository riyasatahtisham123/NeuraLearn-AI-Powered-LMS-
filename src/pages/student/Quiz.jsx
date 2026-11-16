import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft, Clock, CheckCircle2, AlertTriangle, Send, ChevronRight, ListChecks,
  Target, BookOpen, Flag, RotateCcw,
} from 'lucide-react'
import { useStore } from '../../lib/store.jsx'
import { findTopic, topicScores } from '../../lib/ai.js'
import { clock } from '../../lib/format.js'
import { Panel, Chip, DifficultyChip, BandChip, Empty, Modal, Banner } from '../../components/ui.jsx'

export default function Quiz() {
  const { topicId } = useParams()
  const { state, user, submitQuiz, toast } = useStore()
  const navigate = useNavigate()
  const topic = findTopic(state.courses, topicId)

  const [answers, setAnswers] = useState({})
  const [elapsed, setElapsed] = useState(0)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [leaveOpen, setLeaveOpen] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const cardRefs = useRef({})
  const startedAt = useRef(Date.now())
  const submittedRef = useRef(false)

  const duration = topic ? topic.questions.length * 60 : 0
  const remaining = Math.max(0, duration - elapsed)
  const answeredCount = topic ? topic.questions.filter((q) => answers[q.id]).length : 0
  const complete = topic ? answeredCount === topic.questions.length : false

  const previous = useMemo(
    () => (topic ? topicScores(state, user.id).find((r) => r.topicId === topic.id) : null),
    [state, user.id, topic],
  )

  const finish = useCallback((auto = false) => {
    if (submittedRef.current || !topic) return
    submittedRef.current = true
    setSubmitted(true)
    const secs = Math.round((Date.now() - startedAt.current) / 1000)
    const attempt = submitQuiz(topic.id, answers, secs)
    if (!attempt) { submittedRef.current = false; setSubmitted(false); return }
    toast(auto ? 'Time up — quiz submitted automatically' : `Quiz submitted · ${attempt.percentage}%`, { tone: auto ? 'warn' : attempt.percentage >= 60 ? 'success' : 'warn' })
    navigate(`/result/${attempt.id}`, { replace: true })
  }, [topic, answers, submitQuiz, navigate, toast])

  useEffect(() => {
    if (!topic || submitted) return
    const id = setInterval(() => setElapsed((e) => e + 1), 1000)
    return () => clearInterval(id)
  }, [topic, submitted])

  useEffect(() => {
    if (topic && remaining === 0 && elapsed > 0 && !submittedRef.current) finish(true)
  }, [remaining, elapsed, topic, finish])

  useEffect(() => {
    const h = (e) => {
      if (answeredCount > 0 && !submittedRef.current) { e.preventDefault(); e.returnValue = '' }
    }
    window.addEventListener('beforeunload', h)
    return () => window.removeEventListener('beforeunload', h)
  }, [answeredCount])

  if (!topic) {
    return <Panel><Empty icon={BookOpen} title="Quiz not found"
      action={<Link className="btn btn-primary mt12" to="/courses">Back to courses</Link>}>
      This topic may have been removed by the administrator.
    </Empty></Panel>
  }

  if (!topic.questions.length) {
    return <Panel><Empty icon={AlertTriangle} title="This quiz has no questions"
      action={<Link className="btn btn-primary mt12" to={`/courses/${topic.courseId}`}>Back to course</Link>}>
      The administrator has not added questions to “{topic.name}” yet.
    </Empty></Panel>
  }

  const firstUnanswered = topic.questions.find((q) => !answers[q.id])
  const jumpTo = (id) => cardRefs.current[id]?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  const progress = (answeredCount / topic.questions.length) * 100

  return (
    <div className="quiz-shell">
      <Link to={`/courses/${topic.courseId}`} className="btn btn-ghost btn-sm mb12"
        onClick={(e) => { if (answeredCount > 0 && !submitted) { e.preventDefault(); setLeaveOpen(true) } }}>
        <ArrowLeft /> Leave quiz
      </Link>

      <div className="panel mb16 reveal" style={{ position: 'sticky', top: 'calc(var(--topbar-h) + 10px)', zIndex: 40, padding: '15px 18px' }}>
        <div className="row-between wrap gap12">
          <div style={{ minWidth: 0 }}>
            <span className="eyebrow">{topic.courseCode} · {topic.courseTitle}</span>
            <h2 style={{ fontSize: 20, marginTop: 3 }}>Quiz: {topic.name}</h2>
          </div>
          <div className="row gap10 wrap">
            <DifficultyChip level={topic.difficulty} />
            {previous && <BandChip band={previous.band} value={previous.percentage} />}
            <span className={`quiz-timer ${remaining <= 60 ? 'low' : ''}`} role="timer" aria-live="off">
              <Clock />{clock(remaining)}
            </span>
          </div>
        </div>

        <div className="mt12">
          <div className="row-between mb8" style={{ fontSize: 11.5 }}>
            <span className="muted mono">{answeredCount} / {topic.questions.length} answered</span>
            <span className="mono" style={{ color: complete ? 'var(--ok)' : 'var(--text-3)' }}>{Math.round(progress)}%</span>
          </div>
          <div className="quiz-progress"><div style={{ width: `${progress}%` }} /></div>
        </div>

        <div className="row-between wrap gap12 mt12">
          <div className="q-nav">
            {topic.questions.map((q, i) => (
              <button key={q.id} type="button" onClick={() => jumpTo(q.id)}
                className={`${answers[q.id] ? 'done' : ''} ${firstUnanswered?.id === q.id ? 'current' : ''}`}
                aria-label={`Question ${i + 1}${answers[q.id] ? ', answered' : ', not answered'}`}>
                {i + 1}
              </button>
            ))}
          </div>
          <div className="row gap8 wrap">
            {!complete && (
              <button className="btn btn-sm btn-outline" onClick={() => jumpTo(firstUnanswered.id)}>
                <Flag /> Jump to unanswered
              </button>
            )}
            <button className="btn btn-primary btn-sm" disabled={!complete || submitted} onClick={() => setConfirmOpen(true)}>
              {submitted ? <><CheckCircle2 /> Submitted</> : <><Send /> Submit quiz</>}
            </button>
          </div>
        </div>
        {!complete && <p className="field-hint mt8">Answer all {topic.questions.length} questions to unlock submission. Each question carries 1 mark.</p>}
      </div>

      <div className="mb16 reveal reveal-1">
        <Banner tone="info" icon={Target} title={`${topic.questions.length} questions · ${topic.questions.reduce((s, q) => s + q.marks, 0)} marks · ${clock(duration)} time limit`}>
          {topic.description} Every answer is stored against this topic and immediately re-runs the recommendation engine.
        </Banner>
      </div>

      <div className="col gap12">
        {topic.questions.map((q, i) => {
          const picked = answers[q.id]
          return (
            <div key={q.id} ref={(el) => { cardRefs.current[q.id] = el }}
              className={`q-card reveal ${picked ? 'answered' : ''}`} style={{ animationDelay: `${Math.min(i * 45, 350)}ms` }}>
              <div className="row-between">
                <span className="q-num">Question {i + 1} of {topic.questions.length}</span>
                <span className="row gap6">
                  <Chip tone="slate">{q.marks} {q.marks === 1 ? 'mark' : 'marks'}</Chip>
                  {picked && <Chip tone="ok"><CheckCircle2 size={11} /> Answered</Chip>}
                </span>
              </div>
              <p className="q-text">{q.text}</p>
              <div className="q-options">
                {['a', 'b', 'c', 'd'].filter((k) => q.options[k]).map((k) => (
                  <button key={k} type="button" className={`q-option ${picked === k ? 'picked' : ''}`}
                    onClick={() => setAnswers((a) => ({ ...a, [q.id]: k }))} aria-pressed={picked === k}>
                    <span className="q-option-key">{k}</span>
                    <span className="q-option-text">{q.options[k]}</span>
                    {picked === k && <CheckCircle2 size={16} style={{ color: 'var(--brand-3)', flex: 'none' }} />}
                  </button>
                ))}
              </div>
              {picked && (
                <button className="btn btn-ghost btn-sm mt12" onClick={() => setAnswers((a) => { const n = { ...a }; delete n[q.id]; return n })}>
                  <RotateCcw /> Clear answer
                </button>
              )}
            </div>
          )
        })}
      </div>

      <div className="panel panel-pad mt16 reveal">
        <div className="row-between wrap gap12">
          <div className="row gap10">
            <ListChecks size={18} style={{ color: 'var(--brand-3)' }} />
            <div>
              <b style={{ fontSize: 13.5, fontFamily: 'var(--font-display)' }}>
                {complete ? 'All questions answered' : `${topic.questions.length - answeredCount} questions remaining`}
              </b>
              <p className="field-hint">Time used {clock(elapsed)} · {clock(remaining)} left</p>
            </div>
          </div>
          <div className="row gap8 wrap">
            {!complete && <button className="btn btn-outline" onClick={() => jumpTo(firstUnanswered.id)}>Go to next unanswered <ChevronRight /></button>}
            <button className="btn btn-primary btn-lg" disabled={!complete || submitted} onClick={() => setConfirmOpen(true)}>
              <Send /> Submit quiz
            </button>
          </div>
        </div>
      </div>

      <Modal open={confirmOpen} onClose={() => setConfirmOpen(false)} icon={Send} title="Submit this quiz?"
        subtitle={`${topic.name} · ${answeredCount}/${topic.questions.length} answered · ${clock(elapsed)} used`}
        footer={<>
          <button className="btn btn-ghost" onClick={() => setConfirmOpen(false)}>Keep reviewing</button>
          <button className="btn btn-primary" onClick={() => { setConfirmOpen(false); finish(false) }}><CheckCircle2 /> Submit & evaluate</button>
        </>}>
        <p style={{ fontSize: 13.3, color: 'var(--text-2)', lineHeight: 1.65 }}>
          Your answers are evaluated immediately. The result updates your topic score, which re-runs the
          strengths/gaps analysis and rebuilds your personalized recommendations and learning path.
        </p>
        <div className="grid g3 mt16">
          <div className="kpi kpi-cyan" style={{ padding: 12 }}><div className="kpi-label">Answered</div><div className="kpi-value" style={{ fontSize: 22 }}>{answeredCount}</div></div>
          <div className="kpi kpi-lime" style={{ padding: 12 }}><div className="kpi-label">Total marks</div><div className="kpi-value" style={{ fontSize: 22 }}>{topic.questions.reduce((s, q) => s + q.marks, 0)}</div></div>
          <div className="kpi kpi-violet" style={{ padding: 12 }}><div className="kpi-label">Time used</div><div className="kpi-value" style={{ fontSize: 22 }}>{clock(elapsed)}</div></div>
        </div>
      </Modal>

      <Modal open={leaveOpen} onClose={() => setLeaveOpen(false)} icon={AlertTriangle} title="Leave without submitting?"
        subtitle={`${answeredCount} of ${topic.questions.length} answers will be discarded`}
        footer={<>
          <button className="btn btn-ghost" onClick={() => setLeaveOpen(false)}>Stay on quiz</button>
          <button className="btn btn-danger" onClick={() => { submittedRef.current = true; navigate(`/courses/${topic.courseId}`) }}>Discard & leave</button>
        </>}>
        <p style={{ fontSize: 13.3, color: 'var(--text-2)', lineHeight: 1.65 }}>
          Nothing has been recorded yet. Leaving now discards your answers and the attempt will not appear
          in your performance history.
        </p>
      </Modal>
    </div>
  )
}