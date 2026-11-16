import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  CheckCircle2, XCircle, CircleSlash, Clock, Award, Target, RotateCcw, ArrowLeft,
  Sparkles, TrendingUp, TrendingDown, Info, Lightbulb, FileText, Video, FileDown,
  Dumbbell, ExternalLink, Plus, ListChecks, BookOpen, Gauge,
} from 'lucide-react'
import { useStore } from '../../lib/store.jsx'
import {
  findTopic, findCourse, strengthsAndGaps, recommend, WEAK_LIMIT, STRONG_LIMIT, bandOf,
} from '../../lib/ai.js'
import { RESOURCE_TYPES } from '../../data/content.js'
import { clock, fmtDateTime, pct } from '../../lib/format.js'
import {
  PageHead, Panel, Kpi, Chip, ScoreRing, BandChip, DifficultyChip, Empty, Banner,
  Bar, StatLine, Segmented,
} from '../../components/ui.jsx'

const TYPE_ICON = { article: FileText, video: Video, pdf: FileDown, practice: Dumbbell }
const PASS = WEAK_LIMIT

export default function QuizResult() {
  const { attemptId } = useParams()
  const { state, user, setResourceCompleted } = useStore()
  const [review, setReview] = useState('all')

  const attempt = state.attempts.find((a) => a.id === Number(attemptId) && a.studentId === user.id)
  const topic = attempt ? findTopic(state.courses, attempt.topicId) : null
  const course = attempt ? findCourse(state.courses, attempt.courseId) : null

  const analysis = useMemo(() => strengthsAndGaps(state, user.id), [state, user.id])
  const next = useMemo(() => recommend(state, user.id, 3), [state, user.id])

  const history = useMemo(
    () => state.attempts
      .filter((a) => a.studentId === user.id && attempt && a.topicId === attempt.topicId)
      .slice().sort((a, b) => new Date(a.finishedAt) - new Date(b.finishedAt)),
    [state.attempts, user.id, attempt],
  )

  if (!attempt || !topic) {
    return (
      <Panel className="reveal">
        <Empty icon={ListChecks} title="Result not found"
          action={<Link className="btn btn-primary mt12" to="/performance"><Gauge /> View performance</Link>}>
          This attempt does not belong to your account, or it may have been reset with the demo data.
        </Empty>
      </Panel>
    )
  }

  const passed = attempt.percentage >= PASS
  const correct = attempt.answers.filter((a) => a.isCorrect).length
  const wrong = attempt.answers.filter((a) => a.chosen && !a.isCorrect).length
  const blank = attempt.answers.filter((a) => !a.chosen).length
  const previous = history.length > 1 ? history[history.length - 2] : null
  const delta = previous ? Math.round((attempt.percentage - previous.percentage) * 10) / 10 : null
  const topicRow = analysis.rows.find((r) => r.topicId === topic.id)

  const reviewRows = topic.questions.map((q, i) => {
    const ans = attempt.answers.find((a) => a.questionId === q.id)
    return { q, i, ans, chosen: ans?.chosen ?? '', ok: !!ans?.isCorrect }
  })
  const shown = review === 'wrong' ? reviewRows.filter((r) => !r.ok)
    : review === 'right' ? reviewRows.filter((r) => r.ok)
      : reviewRows

  const gapResources = topic.resources
    .filter((r) => !state.resourceViews.some((v) => v.studentId === user.id && v.resourceId === r.id && v.completed))
    .slice(0, 3)

  return (
    <>
      <PageHead
        eyebrow={`${course?.code ?? 'Quiz'} · ${course?.title ?? ''}`}
        title={`Result · ${topic.name}`}
        subtitle={`Submitted ${fmtDateTime(attempt.finishedAt)} · ${attempt.answers.length} questions · pass mark ${PASS}%`}
        actions={<>
          <Link className="btn btn-ghost" to={`/courses/${topic.courseId}`}><ArrowLeft /> Back to course</Link>
          <Link className="btn btn-primary" to={`/quiz/${topic.id}`}><RotateCcw /> Re-attempt quiz</Link>
        </>} />

      <Banner tone={passed ? 'ok' : 'danger'} icon={passed ? Award : Target}
        title={passed
          ? attempt.percentage >= STRONG_LIMIT ? 'Excellent — this topic is now a strength' : `Passed with ${pct(attempt.percentage)}`
          : `Below the pass mark — ${pct(attempt.percentage)}`}
        action={<Link className="btn btn-sm btn-outline" to="/recommendations"><Sparkles /> AI next steps</Link>}>
        {passed
          ? `You cleared ${correct} of ${attempt.answers.length} questions. The AI module has updated your topic profile and re-ranked your recommendations.`
          : `This topic stays in your learning gaps until your topic average crosses ${PASS}%. Revise the resources below and re-attempt — every attempt is counted in the topic average.`}
      </Banner>

      <div className="grid g6 mt16 mb16">
        <Kpi label="Correct" value={correct} unit={`/ ${attempt.answers.length}`} icon={CheckCircle2} tone="lime" delay={40} />
        <Kpi label="Incorrect" value={wrong} icon={XCircle} tone="rose" delay={80} />
        <Kpi label="Unanswered" value={blank} icon={CircleSlash} tone="amber" delay={120} />
        <Kpi label="Marks" value={attempt.score} unit={`/ ${attempt.total}`} icon={Award} tone="cyan" delay={160} />
        <Kpi label="Time taken" value={clock(attempt.durationSec)} icon={Clock} tone="violet" delay={200}
          foot={<>limit {clock(topic.questions.length * 60)}</>} />
        <Kpi label="Attempt" value={`#${history.length}`} icon={ListChecks} tone="magenta" delay={240}
          foot={previous ? <>previous {pct(previous.percentage)}</> : <>first attempt on this topic</>} />
      </div>

      <div className="grid g-main mb16">
        <Panel title="Score breakdown" icon={Gauge} className="reveal reveal-2"
          actions={<Chip tone={passed ? 'ok' : 'danger'}>{passed ? 'PASSED' : 'NOT PASSED'}</Chip>}>
          <div className="row gap20 wrap" style={{ alignItems: 'center' }}>
            <ScoreRing value={attempt.percentage} size={180} label="This attempt" />
            <div className="col gap12" style={{ flex: 1, minWidth: 240 }}>
              <StatLine label="Topic average (all attempts)" value={topicRow ? pct(topicRow.percentage) : '—'}
                tone={topicRow?.band === 'strong' ? 'lime' : topicRow?.band === 'weak' ? 'rose' : 'amber'} />
              <StatLine label="Topic status" value={<BandChip band={topicRow?.band ?? 'new'} />} />
              <StatLine label="Difficulty" value={<DifficultyChip level={topic.difficulty} />} />
              <StatLine label="Overall average" value={pct(analysis.overall)} />
              <StatLine label="Learning gaps remaining" value={`${analysis.gaps.length} topics`}
                tone={analysis.gaps.length ? 'rose' : 'lime'} />
              <div className="rule" />
              {delta != null ? (
                <div className="row gap8" style={{ fontSize: 12.5, color: delta >= 0 ? 'var(--lime)' : 'var(--rose)' }}>
                  {delta >= 0 ? <TrendingUp size={15} /> : <TrendingDown size={15} />}
                  <b className="mono">{delta >= 0 ? '+' : ''}{delta}%</b>
                  <span className="muted">compared with your previous attempt on this topic</span>
                </div>
              ) : (
                <div className="row gap8" style={{ fontSize: 12.5, color: 'var(--text-3)' }}>
                  <Info size={15} /><span>First recorded attempt on this topic — no comparison yet.</span>
                </div>
              )}
            </div>
          </div>
        </Panel>

        <Panel title="AI re-ranked for you" icon={Sparkles} className="reveal reveal-3"
          actions={<Link className="btn btn-sm btn-ghost" to="/recommendations">All matches</Link>}>
          {next.items.length === 0 ? (
            <Empty icon={BookOpen} title="No resources available">The administrator has not published resources yet.</Empty>
          ) : (
            <div className="col gap10">
              {next.items.map((item, i) => {
                const Icon = TYPE_ICON[item.resource.rtype] ?? FileText
                return (
                  <div className="resource" key={item.resource.id} style={{ alignItems: 'flex-start' }}>
                    <span className={`resource-icon ${item.resource.rtype}`}><Icon /></span>
                    <span className="resource-text">
                      <b>#{i + 1} · {item.resource.title}</b>
                      <span>{item.reason}</span>
                      <span className="match-meter mt8">
                        <Bar value={Math.min(100, item.score * 100)} tone="cyan" height={5} />
                        <span className="match-val">{item.relevance.toFixed(3)}</span>
                      </span>
                    </span>
                    <span className="resource-actions">
                      {item.resource.url && (
                        <a className="btn btn-sm btn-outline btn-icon" href={item.resource.url} target="_blank" rel="noreferrer noopener" title="Open resource"><ExternalLink /></a>
                      )}
                      <button className="btn btn-sm btn-outline btn-icon" title="Mark completed"
                        onClick={() => setResourceCompleted(item.resource.id, true)}><Plus /></button>
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </Panel>
      </div>

      {!passed && gapResources.length > 0 && (
        <Panel title="Revise these before re-attempting" icon={Lightbulb} className="reveal reveal-3 mb16"
          actions={<Link className="btn btn-sm btn-ghost" to="/learning-path">Full learning path</Link>}>
          <div className="grid g3">
            {gapResources.map((r) => {
              const Icon = TYPE_ICON[r.rtype] ?? FileText
              return (
                <div className="resource" key={r.id} style={{ alignItems: 'flex-start', background: 'var(--surface)' }}>
                  <span className={`resource-icon ${r.rtype}`}><Icon /></span>
                  <span className="resource-text">
                    <b>{r.title}</b>
                    <span>{r.description}</span>
                    <span className="row gap6 wrap mt8">
                      <Chip tone={RESOURCE_TYPES[r.rtype]?.tone ?? 'slate'}>{RESOURCE_TYPES[r.rtype]?.label}</Chip>
                      <Chip tone="slate">{r.minutes} min</Chip>
                    </span>
                    <span className="row gap6 mt8">
                      {r.url && <a className="btn btn-sm btn-outline" href={r.url} target="_blank" rel="noreferrer noopener"><ExternalLink /> Open</a>}
                      <button className="btn btn-sm btn-ok" onClick={() => setResourceCompleted(r.id, true)}><CheckCircle2 /> Mark done</button>
                    </span>
                  </span>
                </div>
              )
            })}
          </div>
        </Panel>
      )}

      <Panel title="Answer review" icon={ListChecks} className="reveal reveal-5"
        eyebrow="Every question with the correct option and an explanation"
        actions={
          <Segmented value={review} onChange={setReview} size="sm"
            options={[
              { value: 'all', label: `All ${reviewRows.length}` },
              { value: 'wrong', label: `Wrong ${reviewRows.length - correct}` },
              { value: 'right', label: `Right ${correct}` },
            ]} />
        }>
        {shown.length === 0 ? (
          <Empty icon={review === 'wrong' ? Award : Target}
            title={review === 'wrong' ? 'No incorrect answers' : 'No correct answers in this attempt'}>
            {review === 'wrong'
              ? 'You answered every question correctly on this attempt.'
              : 'Switch to “All” to review the correct options and explanations.'}
          </Empty>
        ) : (
          <div className="col gap12">
            {shown.map(({ q, i, chosen, ok }) => (
              <article className={`q-card ${ok ? 'correct' : 'wrong'}`} key={q.id}>
                <div className="row-between wrap gap8">
                  <span className="q-num">Question {i + 1} · {q.marks} mark{q.marks === 1 ? '' : 's'}</span>
                  <Chip tone={ok ? 'ok' : chosen ? 'danger' : 'warn'} icon={ok ? CheckCircle2 : chosen ? XCircle : CircleSlash}>
                    {ok ? 'Correct' : chosen ? 'Incorrect' : 'Not answered'}
                  </Chip>
                </div>
                <p className="q-text">{q.text}</p>
                <div className="q-options">
                  {Object.entries(q.options).map(([key, text]) => {
                    const isRight = key === q.correct
                    const isPick = key === chosen
                    const cls = isRight ? 'right' : isPick ? 'wrongpick' : ''
                    return (
                      <div className={`q-option ${cls}`} key={key} style={{ cursor: 'default' }}>
                        <span className="q-option-key">{key.toUpperCase()}</span>
                        <span className="q-option-text">{text}</span>
                        {isRight && <CheckCircle2 size={15} style={{ color: 'var(--ok)', flex: 'none' }} />}
                        {isPick && !isRight && <XCircle size={15} style={{ color: 'var(--danger)', flex: 'none' }} />}
                        {isPick && <Chip tone="violet" className="desktop-only">your answer</Chip>}
                      </div>
                    )
                  })}
                </div>
                {q.explain && <div className="q-explain"><Lightbulb /><span><b>Why:</b> {q.explain}</span></div>}
              </article>
            ))}
          </div>
        )}
      </Panel>

      <div className="grid g3 mt16">
        <Link className="panel panel-pad rec-card" to="/performance" style={{ textDecoration: 'none', color: 'inherit' }}>
          <TrendingUp size={19} style={{ color: 'var(--brand-3)' }} />
          <h3 className="mt12" style={{ fontSize: 14 }}>Performance analytics</h3>
          <p className="muted mt8" style={{ fontSize: 12 }}>See how this attempt moved your topic averages, trend line and regression prediction.</p>
        </Link>
        <Link className="panel panel-pad rec-card" to="/learning-path" style={{ textDecoration: 'none', color: 'inherit' }}>
          <Target size={19} style={{ color: 'var(--lime)' }} />
          <h3 className="mt12" style={{ fontSize: 14 }}>Learning path</h3>
          <p className="muted mt8" style={{ fontSize: 12 }}>Your weakest-first sequence, updated with the resources and quiz for every topic.</p>
        </Link>
        <Link className="panel panel-pad rec-card" to="/recommendations" style={{ textDecoration: 'none', color: 'inherit' }}>
          <Sparkles size={19} style={{ color: 'var(--magenta)' }} />
          <h3 className="mt12" style={{ fontSize: 14 }}>AI recommendations</h3>
          <p className="muted mt8" style={{ fontSize: 12 }}>TF-IDF and cosine similarity re-ranked the library against your new gap profile.</p>
        </Link>
      </div>

      <p className="muted mono mt20" style={{ fontSize: 11, textAlign: 'center' }}>
        Attempt #{attempt.id} · band {bandOf(attempt.percentage)} · stored locally with your learning records
      </p>
    </>
  )
}