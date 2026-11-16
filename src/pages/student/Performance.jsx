import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  TrendingUp, Target, Clock, Activity, Radar as RadarIcon, Sigma, ListChecks,
  Download, Award, ArrowUpRight, ArrowDownRight, Minus, BookOpen, Gauge,
  Sparkles, SearchX, Filter, CalendarDays, Flame,
} from 'lucide-react'
import { useStore } from '../../lib/store.jsx'
import {
  strengthsAndGaps, progressOverTime, predictNextScore, studyTimeByTopic, totalStudyMinutes,
  courseCompletion, bandDistribution, weeklyStudy, resourceStats, findTopic, WEAK_LIMIT, STRONG_LIMIT,
} from '../../lib/ai.js'
import { downloadCSV, fmtDateTime, fmtShort, hoursMinutes, pct, BAND_COLORS, CHART_COLORS } from '../../lib/format.js'
import {
  PageHead, Panel, Kpi, Chip, ScoreRing, BandChip, DifficultyChip, Bar, Empty, Tabs,
  Segmented, StatLine, Banner,
} from '../../components/ui.jsx'
import {
  TopicBarChart, TrendChart, TopicRadar, StudyScatter, BandDonut, WeeklyArea,
  MultiLine, ChartLegend,
} from '../../components/charts.jsx'

export default function Performance() {
  const { state, user, toast } = useStore()
  const [tab, setTab] = useState('overview')
  const [chartMode, setChartMode] = useState('horizontal')
  const [courseFilter, setCourseFilter] = useState('all')
  const [historySort, setHistorySort] = useState('recent')

  const d = useMemo(() => {
    const summary = strengthsAndGaps(state, user.id)
    const trend = progressOverTime(state, user.id)
    const prediction = predictNextScore(state, user.id)
    const study = studyTimeByTopic(state, user.id)
    const minutes = totalStudyMinutes(state, user.id)
    const courses = courseCompletion(state, user.id)
    const bands = bandDistribution(state, user.id)
    const weekly = weeklyStudy(state, user.id, 8)
    const res = resourceStats(state, user.id)
    const attempts = state.attempts.filter((a) => a.studentId === user.id)
      .slice().sort((a, b) => new Date(b.finishedAt) - new Date(a.finishedAt))
    const first = trend.length ? trend[0].percentage : 0
    const latest = trend.length ? trend[trend.length - 1].percentage : 0
    const best = attempts.length ? Math.max(...attempts.map((a) => a.percentage)) : 0
    const worst = attempts.length ? Math.min(...attempts.map((a) => a.percentage)) : 0
    const passRate = attempts.length ? Math.round((attempts.filter((a) => a.percentage >= WEAK_LIMIT).length / attempts.length) * 1000) / 10 : 0
    const totalTime = attempts.reduce((s, a) => s + a.durationSec, 0)
    const avgTime = attempts.length ? Math.round(totalTime / attempts.length) : 0
    const courseTrend = state.courses.map((c, i) => ({
      key: `c${c.id}`, name: c.code, color: CHART_COLORS[i % CHART_COLORS.length],
      values: trend.map((t) => {
        const attempt = attempts.find((a) => a.id === t.attemptId)
        return attempt?.courseId === c.id ? t.percentage : null
      }),
    }))
    return { summary, trend, prediction, study, minutes, courses, bands, weekly, res, attempts, first, latest, best, worst, passRate, avgTime, courseTrend }
  }, [state, user.id])

  const { summary, trend, prediction, study, minutes, courses, bands, weekly, res, attempts, first, latest, best, worst, passRate, avgTime, courseTrend } = d
  const growth = Math.round((latest - first) * 10) / 10

  const topicRows = useMemo(() => {
    const list = courseFilter === 'all' ? summary.rows : summary.rows.filter((r) => r.courseId === Number(courseFilter))
    return list
  }, [summary.rows, courseFilter])

  const historyRows = useMemo(() => {
    let list = attempts
    if (courseFilter !== 'all') list = list.filter((a) => a.courseId === Number(courseFilter))
    const sorters = {
      recent: (a, b) => new Date(b.finishedAt) - new Date(a.finishedAt),
      oldest: (a, b) => new Date(a.finishedAt) - new Date(b.finishedAt),
      highest: (a, b) => b.percentage - a.percentage,
      lowest: (a, b) => a.percentage - b.percentage,
    }
    return list.slice().sort(sorters[historySort] ?? sorters.recent)
  }, [attempts, courseFilter, historySort])

  const exportTopics = () => {
    downloadCSV('neuralearn-topic-performance.csv', topicRows.map((r) => ({
      Topic: r.name, Course: r.courseTitle, Code: r.courseCode,
      Difficulty: ['Easy', 'Medium', 'Hard'][r.difficulty - 1],
      'Marks scored': r.scored, 'Marks possible': r.possible, Attempts: r.attempts,
      'Percentage': r.percentage, Band: r.band,
    })))
    toast('Topic performance exported', { tone: 'success' })
  }

  const exportHistory = () => {
    downloadCSV('neuralearn-attempt-history.csv', historyRows.map((a) => {
      const t = findTopic(state.courses, a.topicId)
      return {
        'Attempt ID': a.id, Topic: t?.name ?? '—', Course: t?.courseTitle ?? '—',
        Score: a.score, Total: a.total, 'Percentage': a.percentage,
        'Time (sec)': a.durationSec, 'Finished at': a.finishedAt,
        Result: a.percentage >= WEAK_LIMIT ? 'Pass' : 'Fail',
      }
    }))
    toast(`${historyRows.length} attempts exported`, { tone: 'success' })
  }

  if (summary.topicsCovered === 0) {
    return (
      <>
        <PageHead eyebrow="AI Engine · Module 1" title="Performance Analysis"
          subtitle="Topic-wise percentages, strengths, learning gaps, progress trend and the regression-based score prediction." />
        <Panel className="reveal">
          <Empty icon={Gauge} title="No performance data yet"
            action={<Link className="btn btn-primary mt12" to="/courses"><BookOpen /> Take your first quiz</Link>}>
            The analysis module needs at least one quiz attempt. Everything on this screen is computed live from your answers — nothing is pre-baked.
          </Empty>
        </Panel>
      </>
    )
  }

  return (
    <>
      <PageHead eyebrow="AI Engine · Module 1" title="Performance Analysis"
        subtitle={`${summary.topicsCovered} topics analysed from ${attempts.length} attempts · ${summary.gaps.length} learning gaps below ${WEAK_LIMIT}% · ${summary.strengths.length} strengths at ${STRONG_LIMIT}%+ · every figure recomputed from your stored answers.`}
        actions={<>
          <button className="btn btn-outline" onClick={tab === 'history' ? exportHistory : exportTopics}><Download /> Export CSV</button>
          <Link className="btn btn-primary" to="/recommendations"><Sparkles /> Act on this</Link>
        </>} />

      <div className="grid g6 mb16">
        <Kpi label="Overall average" value={summary.overall} unit="%" icon={Target} tone="cyan" delay={40}
          foot={<><TrendingUp size={12} style={{ color: growth >= 0 ? 'var(--ok)' : 'var(--danger)' }} />{growth >= 0 ? '+' : ''}{growth}% since first attempt</>} />
        <Kpi label="Best attempt" value={best} unit="%" icon={Award} tone="lime" delay={80} foot={<>worst {worst}%</>} />
        <Kpi label="Pass rate" value={passRate} unit="%" icon={ListChecks} tone="violet" delay={120} foot={<>pass mark {WEAK_LIMIT}%</>} />
        <Kpi label="Study time" value={hoursMinutes(minutes)} icon={Clock} tone="magenta" delay={160} foot={<>{study.length} topics logged</>} />
        <Kpi label="Avg. quiz time" value={avgTime} unit="sec" icon={Flame} tone="amber" delay={200} foot={<>{attempts.length} attempts timed</>} />
        <Kpi label="Predicted next" value={prediction ? prediction.predicted : '—'} unit={prediction ? '%' : ''} icon={Sigma} tone="blue" delay={240}
          foot={prediction ? <>{prediction.delta >= 0 ? '+' : ''}{prediction.delta}% at +25% study time</> : <>needs 2+ distinct study sessions</>} />
      </div>

      <Tabs value={tab} onChange={setTab} tabs={[
        { value: 'overview', label: 'Overview', icon: Gauge },
        { value: 'topics', label: 'Topic analysis', icon: Target, count: summary.rows.length },
        { value: 'trend', label: 'Progress trend', icon: Activity, count: trend.length },
        { value: 'prediction', label: 'Score prediction', icon: Sigma },
        { value: 'history', label: 'Attempt history', icon: CalendarDays, count: attempts.length },
      ]} />

      {tab === 'overview' && (
        <>
          <div className="grid g-main mb16">
            <Panel title="Topic-wise performance" icon={Target} eyebrow="Weakest first" className="reveal reveal-1"
              actions={<Segmented value={chartMode} onChange={setChartMode} size="sm"
                options={[{ value: 'horizontal', label: 'Bars' }, { value: 'vertical', label: 'Columns' }]} />}>
              <ChartLegend items={[
                { label: `Strength ≥${STRONG_LIMIT}%`, color: BAND_COLORS.strong, value: summary.strengths.length },
                { label: `Developing ${WEAK_LIMIT}–${STRONG_LIMIT - 1}%`, color: BAND_COLORS.medium, value: summary.medium.length },
                { label: `Gap <${WEAK_LIMIT}%`, color: BAND_COLORS.weak, value: summary.gaps.length },
              ]} />
              <div className="mt16">
                <TopicBarChart rows={summary.rows} horizontal={chartMode === 'horizontal'}
                  height={chartMode === 'horizontal' ? Math.max(260, summary.rows.length * 34) : 320} />
              </div>
            </Panel>

            <div className="col gap16">
              <Panel title="Mastery profile" icon={Award} className="reveal reveal-2">
                <div className="row gap16 wrap" style={{ justifyContent: 'center' }}>
                  <ScoreRing value={summary.overall} size={144} label="Average" />
                  <div style={{ flex: 1, minWidth: 150 }}>
                    <BandDonut data={bands} height={140} centerLabel="topics" />
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
              <Panel title="Study activity" icon={Clock} eyebrow="Last 8 weeks" className="reveal reveal-3">
                <WeeklyArea data={weekly} height={150} />
                <div className="row-between mt12" style={{ fontSize: 11.5 }}>
                  <span className="muted">This week</span>
                  <b className="mono">{hoursMinutes(weekly[weekly.length - 1]?.minutes ?? 0)}</b>
                </div>
              </Panel>
            </div>
          </div>

          <div className="grid g2 mb16">
            <Panel title="Strengths" icon={Award} eyebrow={`${STRONG_LIMIT}% and above`} className="reveal reveal-3">
              {summary.strengths.length === 0 ? (
                <Empty icon={Award} title="No strengths yet">Cross {STRONG_LIMIT}% on a topic to see it here.</Empty>
              ) : (
                <div className="col gap10">
                  {summary.strengths.slice().sort((a, b) => b.percentage - a.percentage).map((r) => (
                    <div key={r.topicId}>
                      <div className="row-between mb8">
                        <Link to={`/quiz/${r.topicId}`} style={{ fontSize: 12.8, fontWeight: 600, textDecoration: 'none', color: 'var(--text)' }}>{r.name}</Link>
                        <b className="mono" style={{ color: 'var(--lime)', fontSize: 12 }}>{pct(r.percentage)}</b>
                      </div>
                      <Bar value={r.percentage} band="strong" height={5} />
                      <div className="muted mono mt4" style={{ fontSize: 10 }}>{r.courseCode} · {r.scored}/{r.possible} marks · {r.attempts} attempts</div>
                    </div>
                  ))}
                </div>
              )}
            </Panel>

            <Panel title="Learning gaps" icon={Target} eyebrow={`Below ${WEAK_LIMIT}%`} className="reveal reveal-4">
              {summary.gaps.length === 0 ? (
                <Empty icon={Award} title="No learning gaps">Every attempted topic is at or above {WEAK_LIMIT}%.</Empty>
              ) : (
                <div className="col gap10">
                  {summary.gaps.map((r) => (
                    <div key={r.topicId}>
                      <div className="row-between mb8">
                        <Link to={`/quiz/${r.topicId}`} style={{ fontSize: 12.8, fontWeight: 600, textDecoration: 'none', color: 'var(--text)' }}>{r.name}</Link>
                        <b className="mono" style={{ color: 'var(--rose)', fontSize: 12 }}>{pct(r.percentage)}</b>
                      </div>
                      <Bar value={r.percentage} band="weak" height={5} />
                      <div className="row-between mt4" style={{ fontSize: 10 }}>
                        <span className="muted mono">{r.courseCode} · {r.scored}/{r.possible} marks · {r.attempts} attempts</span>
                        <Link to="/learning-path" style={{ color: 'var(--brand-3)', textDecoration: 'none' }}>Fix this →</Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Panel>
          </div>

          <div className="grid g2">
            <Panel title="Course completion" icon={BookOpen} className="reveal reveal-4">
              {courses.length === 0 ? (
                <Empty icon={BookOpen} title="Not enrolled in any course" action={<Link className="btn btn-sm btn-primary mt12" to="/courses">Browse courses</Link>} />
              ) : (
                <div className="col gap16">
                  {courses.map((c) => (
                    <div key={c.courseId}>
                      <div className="row-between mb8">
                        <Link to={`/courses/${c.courseId}`} className="row gap8" style={{ textDecoration: 'none', color: 'var(--text)' }}>
                          <span className={`chip chip-${c.tone}`}>{c.code}</span>
                          <b style={{ fontSize: 13, fontFamily: 'var(--font-display)' }}>{c.title}</b>
                        </Link>
                        <span className="mono" style={{ fontSize: 11.5, color: 'var(--text-2)' }}>{c.attemptedTopics}/{c.totalTopics}</span>
                      </div>
                      <Bar value={c.percent} tone={c.tone} />
                      <div className="row-between mt8" style={{ fontSize: 11.3, color: 'var(--text-3)' }}>
                        <span>{c.resDone}/{c.resTotal} resources done</span>
                        <span>avg <b className="mono" style={{ color: c.average >= STRONG_LIMIT ? 'var(--lime)' : c.average >= WEAK_LIMIT ? 'var(--amber)' : 'var(--rose)' }}>{c.average}%</b></span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Panel>

            <Panel title="Study time by topic" icon={Clock} eyebrow="Feeds the regression model" className="reveal reveal-5">
              {study.length === 0 ? (
                <Empty icon={Clock} title="No study sessions logged">Log study time from any course topic or learning-path step.</Empty>
              ) : (
                <div className="col gap10">
                  {study.map((s) => (
                    <div key={s.topicId}>
                      <div className="row-between mb8" style={{ fontSize: 12.5 }}>
                        <span className="truncate">{s.name}</span>
                        <b className="mono">{hoursMinutes(s.minutes)}</b>
                      </div>
                      <Bar value={(s.minutes / study[0].minutes) * 100} tone={s.tone} height={5} />
                    </div>
                  ))}
                  <div className="rule" />
                  <StatLine label="Total logged" value={hoursMinutes(minutes)} tone="cyan" />
                  <StatLine label="Resources completed" value={`${res.completed} / ${res.total}`} />
                </div>
              )}
            </Panel>
          </div>
        </>
      )}

      {tab === 'topics' && (
        <>
          <div className="filter-bar reveal reveal-1">
            <select className="select" value={courseFilter} onChange={(e) => setCourseFilter(e.target.value)} aria-label="Filter topics by course">
              <option value="all">All courses</option>
              {state.courses.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
            </select>
            <span className="muted mono" style={{ fontSize: 11.5 }}>{topicRows.length} topics</span>
            <button className="btn btn-sm btn-outline" style={{ marginLeft: 'auto' }} onClick={exportTopics}><Download /> Export</button>
          </div>

          <div className="grid g2 mb16">
            <Panel title="Topic radar" icon={RadarIcon} eyebrow="One axis per topic, grouped by course" className="reveal reveal-2">
              {topicRows.length >= 3 ? (
                <TopicRadar rows={topicRows} height={340} />
              ) : (
                <Empty icon={RadarIcon} title="A radar needs at least 3 topics">Select “All courses” to see the full profile.</Empty>
              )}
            </Panel>
            <Panel title="Score distribution" icon={Target} className="reveal reveal-3">
              <TopicBarChart rows={topicRows.slice().sort((a, b) => b.percentage - a.percentage)} height={340} />
            </Panel>
          </div>

          <Panel title="Topic analysis table" icon={ListChecks} className="reveal reveal-4"
            eyebrow="Grouped from every answer you have ever submitted">
            {topicRows.length === 0 ? (
              <Empty icon={SearchX} title="No topics for this course" action={<button className="btn btn-sm btn-outline mt12" onClick={() => setCourseFilter('all')}><Filter /> Show all</button>} />
            ) : (
              <div className="table-wrap">
                <table className="tbl">
                  <thead>
                    <tr>
                      <th>Topic</th><th>Course</th><th>Difficulty</th>
                      <th className="num">Marks</th><th className="num">Attempts</th>
                      <th style={{ minWidth: 150 }}>Score</th><th className="num">%</th><th>Status</th><th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {topicRows.map((r) => (
                      <tr key={r.topicId}>
                        <td><b style={{ fontSize: 12.8 }}>{r.name}</b></td>
                        <td><span className={`chip chip-${r.tone}`} style={{ fontSize: 9.5 }}>{r.courseCode}</span></td>
                        <td><DifficultyChip level={r.difficulty} /></td>
                        <td className="num">{r.scored}/{r.possible}</td>
                        <td className="num">{r.attempts}</td>
                        <td><Bar value={r.percentage} band={r.band} height={6} /></td>
                        <td className="num"><b style={{ color: BAND_COLORS[r.band] }}>{r.percentage}</b></td>
                        <td><BandChip band={r.band} /></td>
                        <td><Link className="btn btn-sm btn-ghost" to={`/quiz/${r.topicId}`}>Re-attempt</Link></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>
        </>
      )}

      {tab === 'trend' && (
        <>
          <div className="grid g4 mb16">
            <Kpi label="First attempt" value={first} unit="%" icon={Activity} tone="violet" delay={40} />
            <Kpi label="Latest attempt" value={latest} unit="%" icon={TrendingUp} tone="cyan" delay={80} />
            <Kpi label="Net growth" value={`${growth >= 0 ? '+' : ''}${growth}`} unit="%" icon={growth >= 0 ? ArrowUpRight : ArrowDownRight} tone={growth >= 0 ? 'lime' : 'rose'} delay={120} />
            <Kpi label="Attempts" value={trend.length} icon={ListChecks} tone="amber" delay={160} foot={<>{summary.topicsCovered} distinct topics</>} />
          </div>

          <Panel title="Score over every attempt" icon={Activity} className="reveal reveal-2 mb16"
            eyebrow="Chronological order · dashed line is your running average">
            <TrendChart data={trend} height={300} />
          </Panel>

          <div className="grid g2 mb16">
            <Panel title="Per-course trend" icon={BookOpen} className="reveal reveal-3"
              eyebrow="Average of that course's attempts at each point">
              <MultiLine data={trend.map((t, i) => {
                const row = { name: t.label }
                courseTrend.forEach((s) => { row[s.key] = s.values[i] })
                return row
              })} series={courseTrend.map((s) => ({ key: s.key, name: s.name, color: s.color }))} height={280} />
            </Panel>
            <Panel title="Attempt-by-attempt record" icon={CalendarDays} className="reveal reveal-4">
              <div className="table-wrap" style={{ maxHeight: 320, overflowY: 'auto' }}>
                <table className="tbl">
                  <thead><tr><th>#</th><th>Topic</th><th>Date</th><th className="num">Score</th><th>Change</th></tr></thead>
                  <tbody>
                    {trend.map((t, i) => {
                      const prev = i > 0 ? trend[i - 1].percentage : null
                      const delta = prev == null ? null : Math.round((t.percentage - prev) * 10) / 10
                      return (
                        <tr key={t.attemptId}>
                          <td className="num">{t.index}</td>
                          <td><Link to={`/result/${t.attemptId}`} style={{ textDecoration: 'none', color: 'var(--text)', fontSize: 12.5 }}>{t.topic}</Link></td>
                          <td className="mono" style={{ fontSize: 11 }}>{fmtShort(t.date)}</td>
                          <td className="num"><b style={{ color: BAND_COLORS[t.percentage >= STRONG_LIMIT ? 'strong' : t.percentage >= WEAK_LIMIT ? 'medium' : 'weak'] }}>{t.percentage}%</b></td>
                          <td>
                            {delta == null ? <span className="muted">—</span> : (
                              <span className="row gap4" style={{ fontSize: 11.5, color: delta > 0 ? 'var(--lime)' : delta < 0 ? 'var(--rose)' : 'var(--text-3)' }}>
                                {delta > 0 ? <ArrowUpRight size={12} /> : delta < 0 ? <ArrowDownRight size={12} /> : <Minus size={12} />}
                                <span className="mono">{delta > 0 ? '+' : ''}{delta}</span>
                              </span>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </Panel>
          </div>
        </>
      )}

      {tab === 'prediction' && (
        <>
          {!prediction ? (
            <Panel className="reveal reveal-1">
              <Banner tone="info" icon={Sigma} title="Not enough data to fit a regression"
                action={<Link className="btn btn-sm btn-outline" to="/learning-path"><Clock /> Log study time</Link>}>
                The model needs at least two study sessions with different minute values paired with quiz attempts. Log study time on two topics and this screen fills in.
              </Banner>
            </Panel>
          ) : (
            <>
              <div className="grid g4 mb16">
                <Kpi label="Current average" value={prediction.current} unit="%" icon={Target} tone="cyan" delay={40} />
                <Kpi label="Predicted score" value={prediction.predicted} unit="%" icon={Sigma} tone="lime" delay={80}
                  foot={<>at {prediction.targetMinutes} min per topic</>} />
                <Kpi label="Expected change" value={`${prediction.delta >= 0 ? '+' : ''}${prediction.delta}`} unit="%" icon={TrendingUp} tone={prediction.delta >= 0 ? 'lime' : 'rose'} delay={120} />
                <Kpi label="Model fit (R²)" value={prediction.r2} icon={Gauge} tone="violet" delay={160} foot={<>{prediction.points.length} data points</>} />
              </div>

              <div className="grid g-main mb16">
                <Panel title="Study minutes vs quiz score" icon={Sigma} className="reveal reveal-2"
                  eyebrow="Least-squares linear regression · dashed line is the fitted model">
                  <StudyScatter prediction={prediction} height={320} />
                  <ChartLegend items={[
                    { label: 'Observed topic averages', color: '#22d3ee' },
                    { label: 'Fitted regression line', color: '#a855f7' },
                    { label: 'Prediction at +25% study time', color: '#a3e635' },
                  ]} />
                </Panel>

                <div className="col gap16">
                  <Panel title="Model parameters" icon={Gauge} className="reveal reveal-3">
                    <div className="col gap10">
                      <StatLine label="Slope (Δ% per minute)" value={prediction.slope} tone="cyan" />
                      <StatLine label="Intercept" value={prediction.intercept} />
                      <StatLine label="R² (goodness of fit)" value={prediction.r2} tone="violet" />
                      <StatLine label="Average study minutes" value={`${prediction.avgMinutes} min`} />
                      <StatLine label="Target minutes (+25%)" value={`${prediction.targetMinutes} min`} tone="lime" />
                      <div className="rule" />
                      <div className="mono" style={{ fontSize: 12, color: 'var(--brand-3)', textAlign: 'center', padding: '8px 0' }}>
                        score = {prediction.slope} × minutes + {prediction.intercept}
                      </div>
                    </div>
                    <p className="field-hint mt12">{prediction.note}. The value is clamped to the 0–100 range.</p>
                  </Panel>

                  <Panel title="What this means" icon={Sparkles} className="reveal reveal-4">
                    <p style={{ fontSize: 12.8, color: 'var(--text-2)', lineHeight: 1.7 }}>
                      {prediction.slope > 0
                        ? <>Your data shows a <b style={{ color: 'var(--lime)' }}>positive</b> relationship: each extra minute of logged study is associated with about <b className="mono">{prediction.slope}%</b> more score. Raising your average session from {prediction.avgMinutes} to {prediction.targetMinutes} minutes projects <b className="mono">{prediction.predicted}%</b>.</>
                        : <>Your data shows a <b style={{ color: 'var(--amber)' }}>flat or negative</b> relationship between minutes and score. More time alone is not moving the needle — revise the specific weak-topic resources instead of extending sessions.</>}
                    </p>
                    <p className="field-hint mt12">
                      R² of {prediction.r2} means the model explains {Math.round(prediction.r2 * 100)}% of the variance in your scores.
                      {prediction.r2 < 0.4 ? ' Treat this as a weak signal — log more sessions for a reliable fit.' : ' This is a reasonably strong fit for your recorded data.'}
                    </p>
                    <Link className="btn btn-primary btn-block mt16" to="/learning-path"><Clock /> Log more study time</Link>
                  </Panel>
                </div>
              </div>

              <Panel title="Data points used by the model" icon={ListChecks} className="reveal reveal-5">
                <div className="table-wrap">
                  <table className="tbl">
                    <thead><tr><th className="num">#</th><th className="num">Study minutes</th><th className="num">Average score</th><th>Fitted value</th><th className="num">Residual</th></tr></thead>
                    <tbody>
                      {prediction.points.map((p, i) => {
                        const fitted = Math.round((prediction.slope * p.x + prediction.intercept) * 10) / 10
                        return (
                          <tr key={i}>
                            <td className="num">{i + 1}</td>
                            <td className="num">{p.x}</td>
                            <td className="num"><b>{p.y}%</b></td>
                            <td className="num">{fitted}%</td>
                            <td className="num" style={{ color: p.y - fitted >= 0 ? 'var(--lime)' : 'var(--rose)' }}>
                              {p.y - fitted >= 0 ? '+' : ''}{Math.round((p.y - fitted) * 10) / 10}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </Panel>
            </>
          )}
        </>
      )}

      {tab === 'history' && (
        <>
          <div className="filter-bar reveal reveal-1">
            <select className="select" value={courseFilter} onChange={(e) => setCourseFilter(e.target.value)} aria-label="Filter attempts by course">
              <option value="all">All courses</option>
              {state.courses.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
            </select>
            <select className="select" value={historySort} onChange={(e) => setHistorySort(e.target.value)} aria-label="Sort attempts">
              <option value="recent">Newest first</option>
              <option value="oldest">Oldest first</option>
              <option value="highest">Highest score</option>
              <option value="lowest">Lowest score</option>
            </select>
            <span className="muted mono" style={{ fontSize: 11.5 }}>{historyRows.length} attempts</span>
            <button className="btn btn-sm btn-outline" style={{ marginLeft: 'auto' }} onClick={exportHistory}><Download /> Export</button>
          </div>

          <Panel title="Every quiz attempt" icon={CalendarDays} className="reveal reveal-2"
            eyebrow="Click any row to open the full answer review">
            {historyRows.length === 0 ? (
              <Empty icon={SearchX} title="No attempts for this filter"
                action={<button className="btn btn-sm btn-outline mt12" onClick={() => setCourseFilter('all')}><Filter /> Show all courses</button>} />
            ) : (
              <div className="table-wrap">
                <table className="tbl">
                  <thead>
                    <tr>
                      <th className="num">#</th><th>Topic</th><th>Course</th><th>Finished</th>
                      <th className="num">Marks</th><th className="num">Time</th><th style={{ minWidth: 120 }}>Score</th>
                      <th className="num">%</th><th>Result</th><th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {historyRows.map((a) => {
                      const t = findTopic(state.courses, a.topicId)
                      const band = a.percentage >= STRONG_LIMIT ? 'strong' : a.percentage >= WEAK_LIMIT ? 'medium' : 'weak'
                      return (
                        <tr key={a.id}>
                          <td className="num">{a.id}</td>
                          <td><b style={{ fontSize: 12.6 }}>{t?.name ?? 'Removed topic'}</b></td>
                          <td>{t ? <span className={`chip chip-${t.tone}`} style={{ fontSize: 9.5 }}>{t.courseCode}</span> : <span className="muted">—</span>}</td>
                          <td className="mono" style={{ fontSize: 11 }}>{fmtDateTime(a.finishedAt)}</td>
                          <td className="num">{a.score}/{a.total}</td>
                          <td className="num">{a.durationSec}s</td>
                          <td><Bar value={a.percentage} band={band} height={6} /></td>
                          <td className="num"><b style={{ color: BAND_COLORS[band] }}>{a.percentage}</b></td>
                          <td><Chip tone={a.percentage >= WEAK_LIMIT ? 'ok' : 'danger'}>{a.percentage >= WEAK_LIMIT ? 'Pass' : 'Fail'}</Chip></td>
                          <td><Link className="btn btn-sm btn-ghost" to={`/result/${a.id}`}>Review</Link></td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>
        </>
      )}

      <p className="muted mono mt20" style={{ fontSize: 11, textAlign: 'center' }}>
        Thresholds: gap &lt; {WEAK_LIMIT}% · developing {WEAK_LIMIT}–{STRONG_LIMIT - 1}% · strength ≥ {STRONG_LIMIT}% · computed live from {attempts.length} stored attempts
      </p>
    </>
  )
}