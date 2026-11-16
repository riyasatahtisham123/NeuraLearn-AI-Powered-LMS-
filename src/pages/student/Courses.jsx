import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  BookOpen, Layers, FileText, ClipboardList, Clock, ArrowRight, CheckCircle2,
  GraduationCap, SearchX, Plus, LogOut, Target,
} from 'lucide-react'
import { useStore } from '../../lib/store.jsx'
import { courseCompletion, topicScores, isCompleted } from '../../lib/ai.js'
import { fmtDate } from '../../lib/format.js'
import { PageHead, Panel, SearchBox, Segmented, Bar, Chip, Empty, Modal, Field, Banner } from '../../components/ui.jsx'

export default function Courses() {
  const { state, user, enroll, dispatch, toast } = useStore()
  const [q, setQ] = useState('')
  const [view, setView] = useState('enrolled')
  const [sort, setSort] = useState('progress')
  const [enrollTarget, setEnrollTarget] = useState(null)

  const completion = useMemo(() => courseCompletion(state, user.id), [state, user.id])
  const enrolledIds = useMemo(() => state.enrollments.filter((e) => e.studentId === user.id).map((e) => e.courseId), [state.enrollments, user.id])

  const rows = useMemo(() => {
    let list = state.courses.map((c) => {
      const comp = completion.find((x) => x.courseId === c.id)
      const scores = topicScores(state, user.id).filter((r) => r.courseId === c.id)
      const questions = c.topics.reduce((s, t) => s + t.questions.length, 0)
      const minutes = c.topics.reduce((s, t) => s + (t.estMinutes || 0), 0)
      return {
        ...c, enrolled: enrolledIds.includes(c.id),
        percent: comp?.percent ?? 0, average: comp?.average ?? 0,
        attempted: comp?.attemptedTopics ?? 0, resDone: comp?.resDone ?? 0, resTotal: comp?.resTotal ?? 0,
        questions, minutes, gaps: scores.filter((s) => s.percentage < 60).length,
        enrolledAt: state.enrollments.find((e) => e.studentId === user.id && e.courseId === c.id)?.enrolledAt,
      }
    })
    if (view === 'enrolled') list = list.filter((c) => c.enrolled)
    if (view === 'available') list = list.filter((c) => !c.enrolled)
    if (q.trim()) {
      const t = q.trim().toLowerCase()
      list = list.filter((c) => `${c.title} ${c.code} ${c.description} ${c.instructor} ${c.topics.map((x) => x.name).join(' ')}`.toLowerCase().includes(t))
    }
    const sorters = {
      progress: (a, b) => b.percent - a.percent,
      average: (a, b) => b.average - a.average,
      title: (a, b) => a.title.localeCompare(b.title),
      gaps: (a, b) => b.gaps - a.gaps,
      topics: (a, b) => b.topics.length - a.topics.length,
    }
    return list.sort(sorters[sort] ?? sorters.progress)
  }, [state, user.id, completion, enrolledIds, view, q, sort])

  const counts = {
    all: state.courses.length,
    enrolled: enrolledIds.length,
    available: state.courses.length - enrolledIds.length,
  }

  return (
    <>
      <PageHead eyebrow="Learning" title="My Courses"
        subtitle="Every course is broken into topics. Topics are the unit the AI analyses — your quiz answers, completed resources and study minutes are all recorded against them."
        actions={<Link className="btn btn-primary" to="/learning-path"><Target /> Go to learning path</Link>} />

      <div className="filter-bar reveal reveal-1">
        <SearchBox value={q} onChange={setQ} placeholder="Search courses, topics or instructors…" />
        <Segmented value={view} onChange={setView} options={[
          { value: 'enrolled', label: `Enrolled (${counts.enrolled})` },
          { value: 'available', label: `Available (${counts.available})` },
          { value: 'all', label: `All (${counts.all})` },
        ]} />
        <select className="select" value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort courses" style={{ marginLeft: 'auto' }}>
          <option value="progress">Sort: Completion</option>
          <option value="average">Sort: Average score</option>
          <option value="gaps">Sort: Most gaps</option>
          <option value="topics">Sort: Topic count</option>
          <option value="title">Sort: Title A–Z</option>
        </select>
      </div>

      {rows.length === 0 ? (
        <Panel className="reveal reveal-2">
          <Empty icon={q ? SearchX : BookOpen} title={q ? `No courses match “${q}”` : view === 'available' ? 'You are enrolled in every course' : 'No enrolled courses'}
            action={q ? <button className="btn btn-sm btn-outline mt12" onClick={() => setQ('')}>Clear search</button>
              : view === 'enrolled' ? <button className="btn btn-sm btn-primary mt12" onClick={() => setView('available')}>Browse available courses</button> : null}>
            {view === 'available' ? 'Switch to the Enrolled tab to continue learning.' : 'Enrol in a course to start tracking topic-wise performance.'}
          </Empty>
        </Panel>
      ) : (
        <div className="grid g3">
          {rows.map((c, i) => (
            <article className="panel course-card reveal" key={c.id} style={{ animationDelay: `${60 + i * 55}ms` }}>
              <div className={`course-banner course-banner-${c.tone}`}>
                <span className="course-code">{c.code}</span>
                <span style={{ position: 'absolute', right: 14, top: 13, zIndex: 2 }}>
                  {c.enrolled
                    ? <span className="chip" style={{ background: 'rgba(6,10,30,0.45)', color: '#fff', borderColor: 'rgba(255,255,255,0.3)' }}><CheckCircle2 size={11} /> Enrolled</span>
                    : <span className="chip" style={{ background: 'rgba(6,10,30,0.45)', color: '#fff', borderColor: 'rgba(255,255,255,0.3)' }}>Not enrolled</span>}
                </span>
                <span style={{ position: 'absolute', left: 16, bottom: 12, zIndex: 2, fontFamily: 'var(--font-mono)', fontSize: 10.5, color: 'rgba(255,255,255,0.9)', letterSpacing: '0.08em' }}>
                  SEM {c.semester} · {c.credits} CREDITS
                </span>
              </div>

              <div className="course-body">
                <h3>{c.title}</h3>
                <p>{c.description}</p>

                <div className="course-meta">
                  <span><Layers />{c.topics.length} topics</span>
                  <span><FileText />{c.topics.reduce((s, t) => s + t.resources.length, 0)} resources</span>
                  <span><ClipboardList />{c.questions} questions</span>
                  <span><Clock />{Math.round(c.minutes / 60)}h content</span>
                </div>

                <div className="row gap8 mt12" style={{ fontSize: 11.5, color: 'var(--text-3)' }}>
                  <GraduationCap size={13} /> <span className="truncate">{c.instructor || 'Course instructor'}</span>
                </div>

                <hr className="rule" />

                {c.enrolled ? (
                  <>
                    <div className="row-between mb8" style={{ fontSize: 12 }}>
                      <span className="muted">Topics attempted</span>
                      <b className="mono">{c.attempted}/{c.topics.length} · {c.percent}%</b>
                    </div>
                    <Bar value={c.percent} tone={c.tone} />
                    <div className="row-between mt12">
                      <div className="row gap6">
                        <Chip tone={c.average >= 80 ? 'ok' : c.average >= 60 ? 'warn' : c.attempted ? 'danger' : 'slate'}>
                          <Target size={11} />{c.attempted ? `${c.average}% avg` : 'No attempts'}
                        </Chip>
                        {c.gaps > 0 && <Chip tone="danger">{c.gaps} {c.gaps === 1 ? 'gap' : 'gaps'}</Chip>}
                      </div>
                      <span className="mono" style={{ fontSize: 11, color: 'var(--text-3)' }}>{c.resDone}/{c.resTotal} done</span>
                    </div>
                    <div className="row gap8 mt16">
                      <Link className="btn btn-primary btn-sm" style={{ flex: 1 }} to={`/courses/${c.id}`}>
                        Continue <ArrowRight />
                      </Link>
                      <button className="btn btn-ghost btn-sm btn-icon" title="Leave course"
                        onClick={() => { dispatch({ type: 'UNENROLL', studentId: user.id, courseId: c.id }); toast(`Left “${c.title}”`, { tone: 'warn' }) }}>
                        <LogOut />
                      </button>
                    </div>
                    {c.enrolledAt && <p className="field-hint mt8">Enrolled {fmtDate(c.enrolledAt)}</p>}
                  </>
                ) : (
                  <>
                    <p style={{ fontSize: 12.3, color: 'var(--text-3)', lineHeight: 1.6 }}>
                      Enrolling unlocks the topic quizzes, resource completion tracking and AI recommendations for this course.
                    </p>
                    <button className="btn btn-accent btn-block mt16" onClick={() => setEnrollTarget(c)}>
                      <Plus /> Enrol in this course
                    </button>
                  </>
                )}
              </div>
            </article>
          ))}
        </div>
      )}

      <Modal open={!!enrollTarget} onClose={() => setEnrollTarget(null)} icon={BookOpen}
        title={`Enrol in ${enrollTarget?.title ?? ''}?`}
        subtitle={enrollTarget ? `${enrollTarget.code} · ${enrollTarget.topics.length} topics · ${enrollTarget.credits} credits` : ''}
        footer={<>
          <button className="btn btn-ghost" onClick={() => setEnrollTarget(null)}>Cancel</button>
          <button className="btn btn-primary" onClick={() => { enroll(enrollTarget.id); setEnrollTarget(null) }}>
            <CheckCircle2 /> Confirm enrolment
          </button>
        </>}>
        {enrollTarget && (
          <>
            <Banner tone="info" icon={Target} title="What enrolment enables">
              Topic quizzes, per-question answer records, resource completion, study-time logging and
              personalized recommendations for all {enrollTarget.topics.length} topics.
            </Banner>
            <div className="col gap8 mt16">
              {enrollTarget.topics.map((t, i) => (
                <div className="row gap10" key={t.id} style={{ fontSize: 12.8 }}>
                  <span className="topic-index" style={{ width: 24, height: 24, fontSize: 10.5 }}>{i + 1}</span>
                  <span style={{ flex: 1 }}>{t.name}</span>
                  <Chip tone={t.difficulty === 1 ? 'lime' : t.difficulty === 2 ? 'amber' : 'rose'}>
                    {['Easy', 'Medium', 'Hard'][t.difficulty - 1]}
                  </Chip>
                </div>
              ))}
            </div>
          </>
        )}
      </Modal>
    </>
  )
}