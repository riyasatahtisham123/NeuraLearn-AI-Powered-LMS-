import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  Users, BookOpen, Library, ClipboardList, Target, AlertTriangle,
  Activity, Sparkles, ArrowRight, FolderTree, ChartPie, Clock, CheckCircle2,
  Award, GraduationCap, Layers, FileQuestion, CalendarDays,
} from 'lucide-react'
import { useStore } from '../../lib/store.jsx'
import {
  classOverview, allStudentSummary, classTopicAverages, activityFeed, weeklyStudy,
  difficultySpread, resourceTypeSpread, scoreDistribution, WEAK_LIMIT, STRONG_LIMIT,
} from '../../lib/ai.js'
import { RESOURCE_TYPES } from '../../data/content.js'
import { greeting, hoursMinutes, relativeTime, pct, BAND_COLORS, CHART_COLORS } from '../../lib/format.js'
import {
  PageHead, Panel, Kpi, Chip, Avatar, Bar, Empty, Banner, ScoreRing, StatLine,
} from '../../components/ui.jsx'
import { ClassBarChart, Histogram, Donut, WeeklyArea, ChartLegend } from '../../components/charts.jsx'

export default function AdminDashboard() {
  const { state } = useStore()

  const d = useMemo(() => {
    const overview = classOverview(state)
    const students = allStudentSummary(state)
    const topics = classTopicAverages(state)
    const feed = activityFeed(state, { limit: 9 })
    const weekly = weeklyStudy(state, null, 8)
    const difficulty = difficultySpread(state)
    const types = resourceTypeSpread(state)
    const distribution = scoreDistribution(state)
    const atRisk = students.filter((s) => s.needsSupport)
    const top = students.slice().sort((a, b) => b.average - a.average).slice(0, 3)
    const bandCounts = {
      strong: students.filter((s) => s.average >= STRONG_LIMIT).length,
      medium: students.filter((s) => s.average >= WEAK_LIMIT && s.average < STRONG_LIMIT).length,
      weak: students.filter((s) => s.average < WEAK_LIMIT).length,
    }
    return { overview, students, topics, feed, weekly, difficulty, types, distribution, atRisk, top, bandCounts }
  }, [state])

  const { overview, students, topics, feed, weekly, difficulty, types, distribution, atRisk, top, bandCounts } = d

  const typeData = Object.entries(types).map(([k, v], i) => ({
    name: RESOURCE_TYPES[k]?.label ?? k, value: v, fill: CHART_COLORS[i % CHART_COLORS.length],
  }))
  const bandData = ['strong', 'medium', 'weak'].map((b) => ({
    band: b, name: b === 'strong' ? 'Strength' : b === 'medium' ? 'Developing' : 'At risk', value: bandCounts[b],
  }))

  return (
    <>
      <PageHead eyebrow={`${greeting()}, Administrator`} title="Class Overview"
        subtitle={`${overview.students} learners · ${overview.courses} courses · ${overview.topics} topics · ${overview.attempts} quiz attempts analysed. Every figure below is computed live from the stored records.`}
        actions={<>
          <Link className="btn btn-outline" to="/admin/analytics"><ChartPie /> Class analytics</Link>
          <Link className="btn btn-primary" to="/admin/content"><FolderTree /> Manage content</Link>
        </>} />

      {atRisk.length > 0 && (
        <div className="mb16 reveal reveal-1">
          <Banner tone="danger" icon={AlertTriangle}
            title={`${atRisk.length} learner${atRisk.length === 1 ? '' : 's'} need support`}
            action={<Link className="btn btn-sm btn-danger" to="/admin/students">Review students <ArrowRight /></Link>}>
            Flagged when the overall average is below {WEAK_LIMIT}% or four or more topics are learning gaps.
            Weakest: <b>{atRisk[0].name}</b> at {pct(atRisk[0].average)} with {atRisk[0].weakTopics} gaps.
          </Banner>
        </div>
      )}

      <div className="grid g6 mb16">
        <Kpi label="Students" value={overview.students} icon={Users} tone="cyan" delay={40}
          foot={<>{overview.enrollments} enrolments</>} />
        <Kpi label="Class average" value={overview.classAverage} unit="%" icon={Target} tone="violet" delay={80}
          foot={<>attempt average {pct(overview.attemptAverage)}</>} />
        <Kpi label="Pass rate" value={overview.passRate} unit="%" icon={CheckCircle2} tone="lime" delay={120}
          foot={<>pass mark {WEAK_LIMIT}%</>} />
        <Kpi label="Learning gaps" value={overview.totalGaps} icon={AlertTriangle} tone="rose" delay={160}
          foot={<>{atRisk.length} learners flagged</>} />
        <Kpi label="Quiz attempts" value={overview.attempts} icon={ClipboardList} tone="amber" delay={200}
          foot={<>{overview.questions} questions in bank</>} />
        <Kpi label="Study logged" value={hoursMinutes(overview.studyMinutes)} icon={Clock} tone="magenta" delay={240}
          foot={<>{overview.completions} resources completed</>} />
      </div>

      <div className="grid g-main mb16">
        <div className="col gap16">
          <Panel title="Average score by student" icon={Users} eyebrow="Weakest first · dashed line is the 60% pass mark"
            className="reveal reveal-2"
            actions={<Link className="btn btn-sm btn-ghost" to="/admin/students">All students <ArrowRight /></Link>}>
            {students.length ? (
              <ClassBarChart data={students.map((s) => ({ name: s.name.split(' ')[0], average: s.average, full: s.name }))} height={280} />
            ) : <Empty icon={Users} title="No students registered" />}
          </Panel>

          <Panel title="Weakest topics across the class" icon={Target} eyebrow="Class average per topic"
            className="reveal reveal-3"
            actions={<Link className="btn btn-sm btn-ghost" to="/admin/analytics">Heatmap <ArrowRight /></Link>}>
            {topics.length ? (
              <>
                <ChartLegend items={[
                  { label: `Strength ≥${STRONG_LIMIT}%`, color: BAND_COLORS.strong },
                  { label: `Developing ${WEAK_LIMIT}–${STRONG_LIMIT - 1}%`, color: BAND_COLORS.medium },
                  { label: `Gap <${WEAK_LIMIT}%`, color: BAND_COLORS.weak },
                ]} />
                <div className="col gap12 mt16">
                  {topics.slice(0, 6).map((t) => (
                    <div key={t.topicId}>
                      <div className="row-between mb8">
                        <span className="row gap8" style={{ minWidth: 0 }}>
                          <span className={`chip chip-${t.tone}`} style={{ fontSize: 9.5 }}>{t.courseCode}</span>
                          <b className="truncate" style={{ fontSize: 12.8 }}>{t.name}</b>
                        </span>
                        <span className="row gap8">
                          <span className="muted mono" style={{ fontSize: 10.5 }}>{t.samples} learners</span>
                          <b className="mono" style={{ color: BAND_COLORS[t.band], fontSize: 12 }}>{pct(t.average)}</b>
                        </span>
                      </div>
                      <Bar value={t.average} band={t.band} height={6} />
                    </div>
                  ))}
                </div>
              </>
            ) : <Empty icon={Target} title="No topic data yet" />}
          </Panel>
        </div>

        <div className="col gap16">
          <Panel title="Class health" icon={Award} className="reveal reveal-2">
            <div className="row gap16 wrap" style={{ justifyContent: 'center' }}>
              <ScoreRing value={overview.classAverage} size={140} label="Class avg" />
              <div style={{ flex: 1, minWidth: 140 }}>
                <Donut data={bandData} height={140} centerLabel="learners"
                  colors={[BAND_COLORS.strong, BAND_COLORS.medium, BAND_COLORS.weak]} />
                <div className="col gap6 mt12">
                  {bandData.map((b) => (
                    <div className="row-between" key={b.band} style={{ fontSize: 12 }}>
                      <span className="row gap6"><span className="legend-swatch" style={{ background: BAND_COLORS[b.band] }} />{b.name}</span>
                      <b className="mono">{b.value}</b>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Panel>

          <Panel title="Needs support" icon={AlertTriangle} className="reveal reveal-3"
            actions={<Chip tone="danger">{atRisk.length}</Chip>}>
            {atRisk.length === 0 ? (
              <Empty icon={CheckCircle2} title="No learner is flagged">Everyone is at or above {WEAK_LIMIT}% with fewer than four gaps.</Empty>
            ) : (
              <div className="col gap10">
                {atRisk.map((s) => (
                  <Link key={s.id} to="/admin/students" className="resource" style={{ textDecoration: 'none', color: 'inherit', alignItems: 'center' }}>
                    <Avatar user={s} size="sm" />
                    <span className="resource-text">
                      <b>{s.name}</b>
                      <span>{s.weakTopics} gaps · {s.attempts} attempts · {hoursMinutes(s.minutes)} studied</span>
                    </span>
                    <b className="mono" style={{ color: 'var(--rose)', fontSize: 13 }}>{pct(s.average)}</b>
                  </Link>
                ))}
              </div>
            )}
          </Panel>

          <Panel title="Top performers" icon={Award} className="reveal reveal-4">
            {top.length === 0 ? <Empty icon={Award} title="No results yet" /> : (
              <div className="col gap10">
                {top.map((s, i) => (
                  <div className="row gap10" key={s.id}>
                    <span className="topic-index" style={{ width: 26, height: 26, fontSize: 11 }}>{i + 1}</span>
                    <Avatar user={s} size="sm" />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <b className="truncate" style={{ fontSize: 12.6, display: 'block' }}>{s.name}</b>
                      <span className="muted" style={{ fontSize: 11 }}>{s.strongTopics} strengths · {s.resourcesDone} resources done</span>
                    </div>
                    <b className="mono" style={{ color: 'var(--lime)', fontSize: 13 }}>{pct(s.average)}</b>
                  </div>
                ))}
              </div>
            )}
          </Panel>
        </div>
      </div>

      <div className="grid g3 mb16">
        <Panel title="Score distribution" icon={ChartPie} eyebrow="All attempts by band" className="reveal reveal-3">
          <Histogram data={distribution} height={210} />
        </Panel>
        <Panel title="Resource types" icon={Library} eyebrow={`${overview.resources} resources`} className="reveal reveal-4">
          <Donut data={typeData} height={210} centerLabel="resources" />
          <div className="col gap6 mt12">
            {typeData.map((t) => (
              <div className="row-between" key={t.name} style={{ fontSize: 12 }}>
                <span className="row gap6"><span className="legend-swatch" style={{ background: t.fill }} />{t.name}</span>
                <b className="mono">{t.value}</b>
              </div>
            ))}
          </div>
        </Panel>
        <Panel title="Class study activity" icon={Clock} eyebrow="Last 8 weeks · all learners" className="reveal reveal-5">
          <WeeklyArea data={weekly} height={210} />
          <div className="row-between mt12" style={{ fontSize: 11.5 }}>
            <span className="muted">This week</span>
            <b className="mono">{hoursMinutes(weekly[weekly.length - 1]?.minutes ?? 0)}</b>
          </div>
        </Panel>
      </div>

      <div className="grid g-main mb16">
        <Panel title="Recent activity across the class" icon={Activity} className="reveal reveal-4"
          actions={<Link className="btn btn-sm btn-ghost" to="/admin/records">Quiz records <ArrowRight /></Link>}>
          {feed.length === 0 ? <Empty icon={Activity} title="No activity recorded" /> : (
            <div>
              {feed.map((f) => {
                const student = state.users.find((u) => u.id === f.studentId)
                const Icon = f.kind === 'attempt' ? ClipboardList : f.kind === 'study' ? Clock : f.kind === 'complete' ? CheckCircle2 : Library
                return (
                  <div className="activity-item" key={f.id}>
                    <span className="activity-dot" style={{ color: `var(--${f.tone === 'slate' ? 'text-3' : f.tone})` }} />
                    <div className="activity-text">
                      <b><Icon size={12} style={{ display: 'inline', verticalAlign: -2, marginRight: 5 }} />{f.title}</b>
                      <span>{student?.name ?? 'Unknown learner'} · {f.detail}</span>
                    </div>
                    <span className="activity-time">{relativeTime(f.at)}</span>
                  </div>
                )
              })}
            </div>
          )}
        </Panel>

        <div className="col gap16">
          <Panel title="Catalogue" icon={Layers} className="reveal reveal-5">
            <div className="col gap10">
              <StatLine label="Courses" value={overview.courses} tone="cyan" />
              <StatLine label="Topics" value={overview.topics} tone="violet" />
              <StatLine label="Learning resources" value={overview.resources} tone="magenta" />
              <StatLine label="Quizzes" value={overview.quizzes} />
              <StatLine label="Questions" value={overview.questions} tone="amber" />
              <StatLine label="Administrator accounts" value={overview.admins} />
            </div>
            <div className="rule mt16 mb12" />
            <div className="eyebrow mb8">Topic difficulty spread</div>
            <div className="col gap8">
              {Object.entries(difficulty).map(([label, count], i) => (
                <div key={label}>
                  <div className="row-between mb4" style={{ fontSize: 12 }}>
                    <span>{label}</span><b className="mono">{count}</b>
                  </div>
                  <Bar value={overview.topics ? (count / overview.topics) * 100 : 0}
                    tone={['lime', 'amber', 'rose'][i]} height={5} />
                </div>
              ))}
            </div>
            <Link className="btn btn-outline btn-block mt16" to="/admin/content"><FolderTree /> Open content manager</Link>
          </Panel>

          <Panel title="Quick actions" icon={Sparkles} className="reveal reveal-5">
            <div className="col gap8">
              {[
                { to: '/admin/students', icon: GraduationCap, text: 'Review every learner', sub: `${overview.students} student records` },
                { to: '/admin/analytics', icon: ChartPie, text: 'Class analytics & heatmap', sub: 'Topic × student matrix' },
                { to: '/admin/content', icon: FileQuestion, text: 'Edit courses and quizzes', sub: `${overview.questions} questions` },
                { to: '/admin/records', icon: CalendarDays, text: 'Quiz attempt register', sub: `${overview.attempts} attempts` },
              ].map((a) => (
                <Link key={a.to} to={a.to} className="resource" style={{ textDecoration: 'none', color: 'inherit' }}>
                  <span className="resource-icon article"><a.icon /></span>
                  <span className="resource-text"><b>{a.text}</b><span>{a.sub}</span></span>
                  <ArrowRight size={15} style={{ color: 'var(--text-3)', flex: 'none' }} />
                </Link>
              ))}
            </div>
          </Panel>
        </div>
      </div>
    </>
  )
}