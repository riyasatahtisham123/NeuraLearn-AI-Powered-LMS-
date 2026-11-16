import { useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Target, AlertTriangle, BookOpen, Clock, CheckCircle2, ClipboardList,
  Sparkles, ArrowRight, TrendingUp, Flame, Route as RouteIcon, Activity,
  FileText, Play, Library, CalendarDays,
} from 'lucide-react'
import { useStore } from '../../lib/store.jsx'
import {
  strengthsAndGaps, progressOverTime, recommend, courseCompletion, resourceStats,
  totalStudyMinutes, activityFeed, bandDistribution, weeklyStudy, findTopic,
} from '../../lib/ai.js'
import { fmtDate, greeting, hoursMinutes, relativeTime, BAND_COLORS } from '../../lib/format.js'
import { PageHead, Kpi, Panel, Bar, BarRow, ScoreRing, Sparkline, Chip, Banner, Empty, Avatar } from '../../components/ui.jsx'
import { TopicBarChart, TrendChart, BandDonut, WeeklyArea, ChartLegend } from '../../components/charts.jsx'

export default function Dashboard() {
  const { state, user } = useStore()
  const navigate = useNavigate()

  const data = useMemo(() => {
    const summary = strengthsAndGaps(state, user.id)
    const trend = progressOverTime(state, user.id)
    const recs = recommend(state, user.id, 4)
    const courses = courseCompletion(state, user.id)
    const res = resourceStats(state, user.id)
    const minutes = totalStudyMinutes(state, user.id)
    const feed = activityFeed(state, { studentId: user.id, limit: 7 })
    const bands = bandDistribution(state, user.id)
    const weekly = weeklyStudy(state, user.id, 8)
    const attempts = state.attempts.filter((a) => a.studentId === user.id)
    const last7 = weekly[weekly.length - 1]?.minutes ?? 0
    const prev7 = weekly[weekly.length - 2]?.minutes ?? 0
    const delta = prev7 ? Math.round(((last7 - prev7) / prev7) * 100) : 0
    const recent = trend.slice(-5).map((t) => t.percentage)
    const first = trend.length ? trend[0].percentage : 0
    const latest = trend.length ? trend[trend.length - 1].percentage : 0
    return { summary, trend, recs, courses, res, minutes, feed, bands, weekly, attempts, delta, recent, first, latest }
  }, [state, user.id])

  const { summary, trend, recs, courses, res, minutes, feed, bands, weekly, attempts, delta, recent, first, latest } = data
  const growth = Math.round((latest - first) * 10) / 10
  const topGap = summary.gaps[0]

  return (
    <>
      <PageHead
        eyebrow={`${greeting()}, ${user.name.split(' ')[0]}`}
        title="Your learning dashboard"
        subtitle={`${fmtDate(new Date().toISOString())} · ${summary.topicsCovered} topics analysed · recommendations refreshed from your latest ${attempts.length} quiz attempts.`}
        actions={<>
          <Link className="btn btn-outline" to="/learning-path"><RouteIcon /> Learning path</Link>
          <Link className="btn btn-primary" to="/recommendations"><Sparkles /> AI recommendations</Link>
        </>}
      />

      {summary.gaps.length > 0 ? (
        <div className="mb16 reveal reveal-1">
          <Banner tone="danger" icon={AlertTriangle}
            title={`${summary.gaps.length} learning ${summary.gaps.length === 1 ? 'gap' : 'gaps'} detected below 60%`}
            action={<Link className="btn btn-sm btn-danger" to="/learning-path">Fix weakest first <ArrowRight /></Link>}>
            Weakest topic: <b>{topGap.name}</b> at {topGap.percentage}% ({topGap.courseTitle}). The AI has ranked{' '}
            {recs.items.length} resources against this gap — start with the top match.
          </Banner>
        </div>
      ) : summary.topicsCovered === 0 ? (
        <div className="mb16 reveal reveal-1">
          <Banner tone="info" icon={Sparkles} title="No performance data yet"
            action={<Link className="btn btn-sm btn-accent" to="/courses">Take a quiz <ArrowRight /></Link>}>
            Attempt any topic quiz and the AI will immediately build your strengths, gaps and personalized path.
          </Banner>
        </div>
      ) : (
        <div className="mb16 reveal reveal-1">
          <Banner tone="ok" icon={CheckCircle2} title="No learning gaps — every attempted topic is at 60% or above"
            action={<Link className="btn btn-sm btn-ok" to="/courses">Keep going <ArrowRight /></Link>}>
            {summary.strengths.length} of {summary.topicsCovered} topics are already strengths at 80%+.
          </Banner>
        </div>
      )}

      <div className="grid g6 mb16">
        <Kpi label="Overall average" value={summary.overall} unit="%" icon={Target} tone="cyan" delay={40}
          foot={<><TrendingUp size={12} style={{ color: growth >= 0 ? 'var(--ok)' : 'var(--danger)' }} />
            <span style={{ color: growth >= 0 ? 'var(--ok)' : 'var(--danger)' }}>{growth >= 0 ? '+' : ''}{growth}%</span> since first attempt</>} />
        <Kpi label="Learning gaps" value={summary.gaps.length} icon={AlertTriangle} tone="rose" delay={80}
          foot={<>below 60% · {summary.strengths.length} strengths</>} />
        <Kpi label="Topics covered" value={summary.topicsCovered} unit={`/ ${state.courses.reduce((s, c) => s + c.topics.length, 0)}`} icon={BookOpen} tone="violet" delay={120}
          foot={<>{attempts.length} quiz attempts</>} />
        <Kpi label="Study time" value={hoursMinutes(minutes)} icon={Clock} tone="magenta" delay={160}
          foot={<><Flame size={12} style={{ color: delta >= 0 ? 'var(--ok)' : 'var(--warn)' }} />{delta >= 0 ? '+' : ''}{delta}% vs last week</>} />
        <Kpi label="Resources done" value={res.completed} unit={`/ ${res.total}`} icon={CheckCircle2} tone="lime" delay={200}
          foot={<>{res.opened} opened, not finished</>} />
        <Kpi label="Latest score" value={latest} unit="%" icon={ClipboardList} tone="amber" delay={240}
          foot={<Sparkline data={recent} width={78} height={20} color={latest >= 60 ? 'var(--lime)' : 'var(--rose)'} />} />
      </div>

      <div className="grid g-main mb16">
        <div className="col gap16">
          <Panel title="Topic-wise performance" icon={Target} eyebrow="Weakest first"
            actions={<Link className="btn btn-sm btn-ghost" to="/performance">Full analysis <ArrowRight /></Link>}
            className="reveal reveal-2">
            {summary.rows.length ? (
              <>
                <ChartLegend items={[
                  { label: 'Strength ≥80%', color: BAND_COLORS.strong, value: summary.strengths.length },
                  { label: 'Developing 60–79%', color: BAND_COLORS.medium, value: summary.medium.length },
                  { label: 'Gap <60%', color: BAND_COLORS.weak, value: summary.gaps.length },
                ]} />
                <div className="mt16">
                  <TopicBarChart rows={summary.rows} horizontal height={Math.max(240, summary.rows.length * 34)} />
                </div>
              </>
            ) : <Empty icon={Target} title="No topic scores yet">Attempt a quiz to populate this chart.</Empty>}
          </Panel>

          <Panel title="Progress over time" icon={Activity} eyebrow={`${trend.length} attempts`}
            actions={<Chip tone={growth >= 0 ? 'ok' : 'danger'}><TrendingUp size={11} />{growth >= 0 ? '+' : ''}{growth}% overall</Chip>}
            className="reveal reveal-3">
            {trend.length ? <TrendChart data={trend} height={250} /> : <Empty icon={Activity} title="No attempts recorded" />}
          </Panel>
        </div>

        <div className="col gap16">
          <Panel title="Mastery profile" icon={Target} className="reveal reveal-2">
            <div className="row gap20 wrap" style={{ justifyContent: 'center' }}>
              <ScoreRing value={summary.overall} label="Average" size={150} />
              <div style={{ flex: 1, minWidth: 150 }}>
                <BandDonut data={bands} height={150} centerLabel="topics" />
                <div className="col gap6 mt12">
                  {bands.map((b) => (
                    <div className="row-between" key={b.band} style={{ fontSize: 12 }}>
                      <span className="row gap6"><span className="legend-swatch" style={{ background: BAND_COLORS[b.band] }} />{b.name}</span>
                      <b className="mono">{b.value}</b>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Panel>

          <Panel title="Top AI matches" icon={Sparkles} eyebrow="TF-IDF + cosine"
            actions={<Link className="btn btn-sm btn-ghost" to="/recommendations">All <ArrowRight /></Link>}
            className="reveal reveal-3">
            {recs.items.length ? (
              <div className="col gap10">
                {recs.items.slice(0, 3).map((r, i) => (
                  <button key={r.resource.id} className="resource" style={{ cursor: 'pointer', textAlign: 'left', width: '100%' }}
                    onClick={() => navigate('/recommendations')}>
                    <span className="topic-index" style={{ width: 26, height: 26, fontSize: 11 }}>{i + 1}</span>
                    <span className="resource-text">
                      <b className="truncate">{r.resource.title}</b>
                      <span className="truncate">{r.reason}</span>
                    </span>
                    <span className="match-val">{Math.round(r.relevance * 100)}%</span>
                  </button>
                ))}
              </div>
            ) : <Empty icon={Sparkles} title="Nothing to recommend yet" />}
          </Panel>

          <Panel title="Study activity" icon={Clock} eyebrow="Last 8 weeks" className="reveal reveal-4">
            <WeeklyArea data={weekly} height={160} />
          </Panel>
        </div>
      </div>

      <div className="grid g-main">
        <Panel title="Course completion" icon={Library} eyebrow="Topics attempted per course" className="reveal reveal-4">
          {courses.length ? (
            <div className="col gap16">
              {courses.map((c) => (
                <div key={c.courseId}>
                  <div className="row-between mb8">
                    <Link to={`/courses/${c.courseId}`} className="row gap9" style={{ textDecoration: 'none', color: 'var(--text)' }}>
                      <span className={`chip chip-${c.tone}`}>{c.code}</span>
                      <b style={{ fontSize: 13.5, fontFamily: 'var(--font-display)' }}>{c.title}</b>
                    </Link>
                    <span className="mono" style={{ fontSize: 12, color: 'var(--text-2)' }}>{c.attemptedTopics}/{c.totalTopics} topics</span>
                  </div>
                  <Bar value={c.percent} tone={c.tone} />
                  <div className="row-between mt8" style={{ fontSize: 11.5, color: 'var(--text-3)' }}>
                    <span>{c.resDone}/{c.resTotal} resources completed</span>
                    <span>average <b className="mono" style={{ color: c.average >= 80 ? 'var(--lime)' : c.average >= 60 ? 'var(--amber)' : 'var(--rose)' }}>{c.average}%</b></span>
                  </div>
                </div>
              ))}
            </div>
          ) : <Empty icon={Library} title="Not enrolled in any course" action={<Link className="btn btn-sm btn-primary mt12" to="/courses">Browse courses</Link>} />}
        </Panel>

        <Panel title="Recent activity" icon={CalendarDays} eyebrow="Your learning record" className="reveal reveal-5">
          {feed.length ? (
            <div>
              {feed.map((f) => {
                const Icon = f.kind === 'attempt' ? ClipboardList : f.kind === 'study' ? Clock : f.kind === 'complete' ? CheckCircle2 : FileText
                return (
                  <div className="activity-item" key={f.id}>
                    <span className="activity-dot" style={{ color: `var(--${f.tone === 'slate' ? 'text-3' : f.tone})` }} />
                    <div className="activity-text">
                      <b>{f.title}</b>
                      <span>{f.detail}</span>
                    </div>
                    <span className="activity-time">{relativeTime(f.at)}</span>
                  </div>
                )
              })}
            </div>
          ) : <Empty icon={Activity} title="No activity yet" />}
        </Panel>
      </div>

      <div className="grid g4 mt16">
        {[
          { to: '/courses', icon: BookOpen, title: 'Browse courses', text: `${state.courses.length} courses · ${state.courses.reduce((s, c) => s + c.topics.length, 0)} topics`, tone: 'cyan' },
          { to: '/resources', icon: Library, title: 'Resource library', text: `${res.total} resources · ${res.remaining} not started`, tone: 'magenta' },
          { to: '/learning-path', icon: RouteIcon, title: 'Follow your path', text: `${summary.gaps.length} gaps ordered weakest first`, tone: 'lime' },
          { to: '/performance', icon: TrendingUp, title: 'Deep performance', text: 'Radar, trend, regression and history', tone: 'amber' },
        ].map((q, i) => (
          <Link key={q.to} to={q.to} className="panel panel-pad reveal" style={{ textDecoration: 'none', display: 'block', animationDelay: `${280 + i * 50}ms` }}>
            <div className="row gap10 mb8">
              <span className={`resource-icon ${q.tone === 'cyan' ? 'article' : q.tone === 'magenta' ? 'video' : q.tone === 'lime' ? 'practice' : 'pdf'}`}><q.icon /></span>
              <b style={{ fontFamily: 'var(--font-display)', fontSize: 14, color: 'var(--text)' }}>{q.title}</b>
              <ArrowRight size={15} style={{ marginLeft: 'auto', color: 'var(--text-3)' }} />
            </div>
            <p style={{ fontSize: 12, color: 'var(--text-3)' }}>{q.text}</p>
          </Link>
        ))}
      </div>
    </>
  )
}