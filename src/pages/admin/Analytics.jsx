import { useMemo, useState } from 'react'
import {
  ChartPie, Download, Target, Users, Grid3x3, Sigma, Activity, Award,
  AlertTriangle, Clock, Layers, TrendingUp, Filter, SearchX, BookOpen,
} from 'lucide-react'
import { useStore } from '../../lib/store.jsx'
import {
  classOverview, allStudentSummary, classTopicAverages, heatmapData, scoreDistribution,
  difficultySpread, resourceTypeSpread, weeklyStudy, flattenTopics, topicScores,
  predictNextScore, totalStudyMinutes, WEAK_LIMIT, STRONG_LIMIT, bandOf,
} from '../../lib/ai.js'
import { RESOURCE_TYPES } from '../../data/content.js'
import { downloadCSV, hoursMinutes, pct, BAND_COLORS, CHART_COLORS, heatColor } from '../../lib/format.js'
import {
  PageHead, Panel, Kpi, Chip, Avatar, Bar, Empty, Tabs, Segmented, Banner,
  StatLine, ScoreRing, DifficultyChip,
} from '../../components/ui.jsx'
import {
  ClassBarChart, Histogram, Donut, TopicRadar, MultiLine, WeeklyArea, ChartLegend, TopicBarChart, StudyScatter,
} from '../../components/charts.jsx'

export default function Analytics() {
  const { state, toast } = useStore()
  const [tab, setTab] = useState('heatmap')
  const [courseFilter, setCourseFilter] = useState('all')
  const [heatMode, setHeatMode] = useState('score')
  const [compare, setCompare] = useState(() => new Set())

  const d = useMemo(() => {
    const overview = classOverview(state)
    const students = allStudentSummary(state)
    const topics = classTopicAverages(state)
    const heat = heatmapData(state)
    const distribution = scoreDistribution(state)
    const difficulty = difficultySpread(state)
    const types = resourceTypeSpread(state)
    const weekly = weeklyStudy(state, null, 8)
    const allTopics = flattenTopics(state.courses)
    const predictions = students.map((s) => ({ student: s, model: predictNextScore(state, s.id) })).filter((p) => p.model)
    const studyByStudent = students.map((s) => ({
      name: s.name.split(' ')[0], full: s.name, minutes: totalStudyMinutes(state, s.id), average: s.average,
    }))
    const courseAverages = state.courses.map((c, i) => {
      const rows = topics.filter((t) => t.courseCode === c.code)
      const avg = rows.length ? Math.round((rows.reduce((s, r) => s + r.average, 0) / rows.length) * 10) / 10 : 0
      return { name: c.code, title: c.title, average: avg, fill: CHART_COLORS[i % CHART_COLORS.length], topics: rows.length }
    })
    const bandCounts = {
      strong: students.filter((s) => s.average >= STRONG_LIMIT).length,
      medium: students.filter((s) => s.average >= WEAK_LIMIT && s.average < STRONG_LIMIT).length,
      weak: students.filter((s) => s.average < WEAK_LIMIT).length,
    }
    return { overview, students, topics, heat, distribution, difficulty, types, weekly, allTopics, predictions, studyByStudent, courseAverages, bandCounts }
  }, [state])

  const { overview, students, topics, heat, distribution, difficulty, types, weekly, allTopics, predictions, studyByStudent, courseAverages, bandCounts } = d

  const visibleTopics = courseFilter === 'all' ? allTopics : allTopics.filter((t) => t.courseId === Number(courseFilter))

  const heatRows = useMemo(() => heat.map((row) => ({
    ...row,
    cells: row.cells.filter((c) => visibleTopics.some((t) => t.id === c.topicId)),
  })), [heat, visibleTopics])

  const compareStudents = students.filter((s) => compare.has(s.id))
  const radarRows = visibleTopics.map((t) => ({
    name: t.name,
    percentage: topics.find((x) => x.topicId === t.id)?.average ?? 0,
  }))
  const radarSeries = compareStudents.length
    ? compareStudents.map((s, i) => ({
      key: `s${s.id}`, name: s.name.split(' ')[0], color: CHART_COLORS[i % CHART_COLORS.length],
      values: visibleTopics.map((t) => topicScores(state, s.id).find((r) => r.topicId === t.id)?.percentage ?? null),
    }))
    : [{ key: 'class', name: 'Class average', color: '#22d3ee', values: radarRows.map((r) => r.percentage) }]

  const toggleCompare = (id) => setCompare((s) => {
    const n = new Set(s)
    if (n.has(id)) n.delete(id)
    else if (n.size < 5) n.add(id)
    else { toast('Compare up to 5 learners at a time', { tone: 'warn' }); return s }
    return n
  })

  const exportHeatmap = () => {
    downloadCSV('neuralearn-class-heatmap.csv', heatRows.map((row) => {
      const out = { Student: row.student.name, Roll: row.student.roll ?? '', Email: row.student.email }
      row.cells.forEach((c) => { out[c.name] = c.value == null ? '' : c.value })
      return out
    }))
    toast('Class heatmap exported', { tone: 'success' })
  }

  const exportTopics = () => {
    downloadCSV('neuralearn-topic-averages.csv', topics.map((t) => ({
      Topic: t.name, Course: t.courseTitle, Code: t.courseCode,
      Difficulty: ['Easy', 'Medium', 'Hard'][t.difficulty - 1],
      'Class average %': t.average, Learners: t.samples, Band: t.band,
      'Individual scores': t.values.join(' | '),
    })))
    toast('Topic averages exported', { tone: 'success' })
  }

  const exportStudents = () => {
    downloadCSV('neuralearn-class-summary.csv', students.map((s) => ({
      Name: s.name, Email: s.email, Roll: s.roll ?? '', 'Average %': s.average,
      Gaps: s.weakTopics, Strengths: s.strongTopics, 'Topics covered': s.topicsCovered,
      Attempts: s.attempts, 'Study minutes': s.minutes,
      'Resources done': s.resourcesDone, 'Needs support': s.needsSupport ? 'yes' : 'no',
    })))
    toast('Class summary exported', { tone: 'success' })
  }

  if (students.length === 0) {
    return (
      <>
        <PageHead eyebrow="People" title="Class Analytics" subtitle="Cross-learner analysis of every topic, attempt and study session." />
        <Panel className="reveal"><Empty icon={Users} title="No learners registered"
          action={<a className="btn btn-primary mt12" href="#/admin/students">Add students</a>}>
          Analytics needs at least one student record.
        </Empty></Panel>
      </>
    )
  }

  return (
    <>
      <PageHead eyebrow="People" title="Class Analytics"
        subtitle={`${students.length} learners × ${allTopics.length} topics · ${overview.attempts} attempts · ${overview.questions} questions. The heatmap, distributions and regression models below are all derived from the stored records.`}
        actions={<>
          <button className="btn btn-outline" onClick={exportStudents}><Download /> Class summary</button>
          <button className="btn btn-primary" onClick={tab === 'heatmap' ? exportHeatmap : exportTopics}>
            <Download /> Export {tab === 'heatmap' ? 'heatmap' : 'topics'}
          </button>
        </>} />

      <div className="grid g6 mb16">
        <Kpi label="Class average" value={overview.classAverage} unit="%" icon={Target} tone="cyan" delay={40} />
        <Kpi label="Attempt average" value={overview.attemptAverage} unit="%" icon={Activity} tone="violet" delay={80}
          foot={<>{overview.attempts} attempts</>} />
        <Kpi label="Pass rate" value={overview.passRate} unit="%" icon={Award} tone="lime" delay={120} />
        <Kpi label="Needs support" value={overview.needsSupport} icon={AlertTriangle} tone={overview.needsSupport ? 'rose' : 'lime'} delay={160} />
        <Kpi label="Total gaps" value={overview.totalGaps} icon={Target} tone="amber" delay={200} />
        <Kpi label="Study logged" value={hoursMinutes(overview.studyMinutes)} icon={Clock} tone="magenta" delay={240} />
      </div>

      <Tabs value={tab} onChange={setTab} tabs={[
        { value: 'heatmap', label: 'Topic heatmap', icon: Grid3x3 },
        { value: 'topics', label: 'Topic difficulty', icon: Layers, count: topics.length },
        { value: 'compare', label: 'Compare learners', icon: Users, count: compare.size || undefined },
        { value: 'distribution', label: 'Distributions', icon: ChartPie },
        { value: 'prediction', label: 'Study vs score', icon: Sigma, count: predictions.length },
      ]} />

      {tab === 'heatmap' && (
        <>
          <div className="filter-bar reveal reveal-1">
            <select className="select" value={courseFilter} onChange={(e) => setCourseFilter(e.target.value)} aria-label="Filter heatmap by course">
              <option value="all">All courses ({allTopics.length} topics)</option>
              {state.courses.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
            </select>
            <Segmented value={heatMode} onChange={setHeatMode} size="sm"
              options={[{ value: 'score', label: 'Percentages' }, { value: 'band', label: 'Bands' }]} />
            <span className="muted mono" style={{ fontSize: 11.5 }}>{heatRows.length} learners × {visibleTopics.length} topics</span>
            <button className="btn btn-sm btn-outline" style={{ marginLeft: 'auto' }} onClick={exportHeatmap}><Download /> Export</button>
          </div>

          <Panel title="Student × topic mastery matrix" icon={Grid3x3} className="reveal reveal-2 mb16"
            eyebrow="Hover a cell for the exact value · blank means not attempted">
            {visibleTopics.length === 0 ? (
              <Empty icon={SearchX} title="No topics in this course" />
            ) : (
              <div className="table-wrap">
                <div className="heatmap" style={{ gridTemplateColumns: `190px repeat(${visibleTopics.length}, minmax(58px, 1fr))` }}>
                  <div />
                  {visibleTopics.map((t) => (
                    <div className="heat-col-label" key={t.id} title={`${t.name} · ${t.courseTitle}`}>
                      {t.name.split(' ').slice(0, 2).join(' ')}
                    </div>
                  ))}
                  {heatRows.map((row) => (
                    <HeatRow key={row.student.id} row={row} mode={heatMode} topics={visibleTopics} />
                  ))}
                  <div className="heat-label" style={{ fontWeight: 700, color: 'var(--text)' }}>Class average</div>
                  {visibleTopics.map((t) => {
                    const avg = topics.find((x) => x.topicId === t.id)?.average ?? null
                    const c = heatMode === 'band' ? { bg: BAND_COLORS[bandOf(avg)] ?? 'var(--surface-2)', fg: '#0b1030' } : heatColor(avg)
                    return (
                      <div className="heat-cell" key={t.id} style={{ background: c.bg, color: c.fg, fontWeight: 700 }}
                        title={`${t.name}: class average ${avg == null ? '—' : pct(avg)}`}>
                        {avg == null ? '—' : Math.round(avg)}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
            <div className="mt16">
              <ChartLegend items={[
                { label: `≥${STRONG_LIMIT}% strength`, color: 'rgba(163,230,53,0.72)' },
                { label: '70–79%', color: 'rgba(163,230,53,0.4)' },
                { label: `${WEAK_LIMIT}–69%`, color: 'rgba(251,191,36,0.5)' },
                { label: '45–59%', color: 'rgba(251,191,36,0.26)' },
                { label: '30–44%', color: 'rgba(251,113,133,0.42)' },
                { label: `<30%`, color: 'rgba(251,113,133,0.68)' },
                { label: 'Not attempted', color: 'var(--surface-3)' },
              ]} />
            </div>
          </Panel>

          <div className="grid g2">
            <Panel title="Hardest topics for this class" icon={AlertTriangle} className="reveal reveal-3">
              <div className="col gap12">
                {topics.slice(0, 6).map((t) => (
                  <div key={t.topicId}>
                    <div className="row-between mb8">
                      <span className="row gap8" style={{ minWidth: 0 }}>
                        <span className={`chip chip-${t.tone}`} style={{ fontSize: 9.5 }}>{t.courseCode}</span>
                        <b className="truncate" style={{ fontSize: 12.6 }}>{t.name}</b>
                      </span>
                      <b className="mono" style={{ color: BAND_COLORS[t.band], fontSize: 12 }}>{pct(t.average)}</b>
                    </div>
                    <Bar value={t.average} band={t.band} height={6} />
                    <div className="muted mono mt4" style={{ fontSize: 10 }}>{t.samples} learners · difficulty {t.difficulty}/3</div>
                  </div>
                ))}
              </div>
            </Panel>
            <Panel title="Course averages" icon={BookOpen} className="reveal reveal-4">
              <ClassBarChart data={courseAverages} height={230} name="Course average" />
              <div className="col gap8 mt12">
                {courseAverages.map((c) => (
                  <div className="row-between" key={c.name} style={{ fontSize: 12 }}>
                    <span className="row gap8"><span className="legend-swatch" style={{ background: c.fill }} />{c.title}</span>
                    <b className="mono">{pct(c.average)}</b>
                  </div>
                ))}
              </div>
            </Panel>
          </div>
        </>
      )}

      {tab === 'topics' && (
        <>
          <div className="grid g2 mb16">
            <Panel title="Class average per topic" icon={Target} eyebrow="Ascending · weakest first" className="reveal reveal-1">
              <TopicBarChart rows={topics.map((t) => ({ name: t.name, percentage: t.average, band: t.band, courseTitle: t.courseTitle }))}
                horizontal height={Math.max(280, topics.length * 32)} />
            </Panel>
            <Panel title="Topic radar" icon={Activity} eyebrow="Class average shape across the catalogue" className="reveal reveal-2">
              {topics.length >= 3 ? <TopicRadar rows={topics.map((t) => ({ name: t.name, percentage: t.average }))} height={340} />
                : <Empty icon={Activity} title="Needs at least 3 topics" />}
            </Panel>
          </div>

          <Panel title="Topic difficulty analysis" icon={Layers} className="reveal reveal-3"
            actions={<button className="btn btn-sm btn-outline" onClick={exportTopics}><Download /> Export</button>}>
            <div className="table-wrap">
              <table className="tbl">
                <thead>
                  <tr>
                    <th>Topic</th><th>Course</th><th>Difficulty</th><th className="num">Learners</th>
                    <th style={{ minWidth: 150 }}>Class average</th><th className="num">%</th>
                    <th className="num">Low</th><th className="num">High</th><th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {topics.map((t) => (
                    <tr key={t.topicId}>
                      <td><b style={{ fontSize: 12.6 }}>{t.name}</b></td>
                      <td><span className={`chip chip-${t.tone}`} style={{ fontSize: 9.5 }}>{t.courseCode}</span></td>
                      <td><DifficultyChip level={t.difficulty} /></td>
                      <td className="num">{t.samples}</td>
                      <td><Bar value={t.average} band={t.band} height={6} /></td>
                      <td className="num"><b style={{ color: BAND_COLORS[t.band] }}>{t.average}</b></td>
                      <td className="num" style={{ color: 'var(--rose)' }}>{t.values.length ? Math.min(...t.values) : '—'}</td>
                      <td className="num" style={{ color: 'var(--lime)' }}>{t.values.length ? Math.max(...t.values) : '—'}</td>
                      <td><Chip tone={t.band === 'strong' ? 'ok' : t.band === 'medium' ? 'warn' : 'danger'}>
                        {t.band === 'strong' ? 'Strength' : t.band === 'medium' ? 'Developing' : 'Class gap'}
                      </Chip></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>

          <div className="grid g2 mt16">
            <Panel title="Difficulty spread" icon={Layers} className="reveal reveal-4">
              <Donut height={210} centerLabel="topics"
                data={Object.entries(difficulty).map(([name, value], i) => ({ name, value, fill: ['#a3e635', '#fbbf24', '#fb7185'][i] }))} />
              <div className="col gap8 mt12">
                {Object.entries(difficulty).map(([name, value], i) => (
                  <div className="row-between" key={name} style={{ fontSize: 12.5 }}>
                    <span className="row gap8"><span className="legend-swatch" style={{ background: ['#a3e635', '#fbbf24', '#fb7185'][i] }} />{name}</span>
                    <b className="mono">{value} topics</b>
                  </div>
                ))}
              </div>
            </Panel>
            <Panel title="Resource mix" icon={BookOpen} className="reveal reveal-5">
              <Donut height={210} centerLabel="resources"
                data={Object.entries(types).map(([k, v], i) => ({ name: RESOURCE_TYPES[k]?.label ?? k, value: v, fill: CHART_COLORS[i % CHART_COLORS.length] }))} />
              <div className="col gap8 mt12">
                {Object.entries(types).map(([k, v], i) => (
                  <div className="row-between" key={k} style={{ fontSize: 12.5 }}>
                    <span className="row gap8"><span className="legend-swatch" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />{RESOURCE_TYPES[k]?.label ?? k}</span>
                    <b className="mono">{v}</b>
                  </div>
                ))}
              </div>
            </Panel>
          </div>
        </>
      )}

      {tab === 'compare' && (
        <>
          <Banner tone="info" icon={Users} title="Pick up to five learners to overlay on the radar"
            action={compare.size > 0 ? <button className="btn btn-sm btn-ghost" onClick={() => setCompare(new Set())}>Clear selection</button> : null}>
            {compare.size === 0
              ? 'With nobody selected the radar shows the class average. Selecting learners overlays their individual topic scores.'
              : `${compare.size} selected: ${compareStudents.map((s) => s.name).join(', ')}.`}
          </Banner>

          <Panel title="Select learners" icon={Users} className="reveal reveal-1 mt16 mb16" bodyClass="tight">
            <div className="row gap8 wrap">
              {students.map((s) => (
                <button key={s.id} className={`btn btn-sm ${compare.has(s.id) ? 'btn-accent' : 'btn-outline'}`}
                  onClick={() => toggleCompare(s.id)} aria-pressed={compare.has(s.id)}>
                  <Avatar user={s} size="sm" /> {s.name.split(' ')[0]} <span className="mono">{pct(s.average)}</span>
                </button>
              ))}
            </div>
          </Panel>

          <div className="grid g-main mb16">
            <Panel title="Topic radar comparison" icon={Activity} className="reveal reveal-2"
              eyebrow={courseFilter === 'all' ? 'All topics' : 'Filtered course'}>
              <div className="filter-bar" style={{ marginBottom: 12 }}>
                <select className="select" value={courseFilter} onChange={(e) => setCourseFilter(e.target.value)} aria-label="Filter comparison by course">
                  <option value="all">All courses</option>
                  {state.courses.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
                </select>
              </div>
              {radarRows.length >= 3 ? <TopicRadar rows={radarRows} height={360} series={radarSeries} />
                : <Empty icon={Activity} title="A radar needs at least 3 topics" />}
            </Panel>

            <Panel title="Selected learners" icon={Users} className="reveal reveal-3">
              {compareStudents.length === 0 ? (
                <Empty icon={Users} title="Nobody selected">Choose learners above to see their side-by-side record.</Empty>
              ) : (
                <div className="col gap16">
                  {compareStudents.map((s, i) => (
                    <div key={s.id}>
                      <div className="row gap10 mb8">
                        <span className="legend-swatch" style={{ background: CHART_COLORS[i % CHART_COLORS.length], width: 12, height: 12 }} />
                        <Avatar user={s} size="sm" />
                        <b style={{ fontSize: 12.8, flex: 1 }}>{s.name}</b>
                        <b className="mono" style={{ color: BAND_COLORS[bandOf(s.average)] }}>{pct(s.average)}</b>
                      </div>
                      <Bar value={s.average} band={bandOf(s.average)} height={5} />
                      <div className="row-between mt8" style={{ fontSize: 11, color: 'var(--text-3)' }}>
                        <span>{s.weakTopics} gaps · {s.strongTopics} strengths</span>
                        <span className="mono">{s.attempts} attempts · {hoursMinutes(s.minutes)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Panel>
          </div>

          <Panel title="Attempt-by-attempt comparison" icon={TrendingUp} className="reveal reveal-4"
            eyebrow="Each learner's own attempt sequence, overlaid">
            {compareStudents.length === 0 ? (
              <Empty icon={TrendingUp} title="Select learners to compare their trends" />
            ) : (
              <MultiLine height={300} xKey="name"
                data={Array.from({ length: Math.max(...compareStudents.map((s) => s.attempts), 1) }, (_, i) => {
                  const row = { name: `#${i + 1}` }
                  compareStudents.forEach((s) => {
                    const mine = state.attempts.filter((a) => a.studentId === s.id)
                      .slice().sort((a, b) => new Date(a.finishedAt) - new Date(b.finishedAt))
                    row[`s${s.id}`] = mine[i]?.percentage ?? null
                  })
                  return row
                })}
                series={compareStudents.map((s, i) => ({ key: `s${s.id}`, name: s.name.split(' ')[0], color: CHART_COLORS[i % CHART_COLORS.length] }))} />
            )}
          </Panel>
        </>
      )}

      {tab === 'distribution' && (
        <>
          <div className="grid g2 mb16">
            <Panel title="Attempt score distribution" icon={ChartPie} eyebrow={`${overview.attempts} attempts in five bands`} className="reveal reveal-1">
              <Histogram data={distribution} height={260} />
              <div className="col gap8 mt12">
                {distribution.map((b, i) => (
                  <div className="row-between" key={b.name} style={{ fontSize: 12.3 }}>
                    <span className="row gap8"><span className="legend-swatch" style={{ background: ['#fb7185', '#fb923c', '#fbbf24', '#a3e635', '#22d3ee'][i] }} />{b.name}%</span>
                    <span className="mono">{b.count} attempts · {overview.attempts ? Math.round((b.count / overview.attempts) * 100) : 0}%</span>
                  </div>
                ))}
              </div>
            </Panel>

            <Panel title="Learner band distribution" icon={Users} eyebrow="By overall average" className="reveal reveal-2">
              <div className="row gap16 wrap" style={{ justifyContent: 'center' }}>
                <ScoreRing value={overview.classAverage} size={140} label="Class avg" />
                <div style={{ flex: 1, minWidth: 150 }}>
                  <Donut height={150} centerLabel="learners"
                    colors={[BAND_COLORS.strong, BAND_COLORS.medium, BAND_COLORS.weak]}
                    data={['strong', 'medium', 'weak'].map((b) => ({
                      name: b === 'strong' ? 'Strength' : b === 'medium' ? 'Developing' : 'At risk', value: bandCounts[b],
                    }))} />
                </div>
              </div>
              <div className="col gap10 mt16">
                {['strong', 'medium', 'weak'].map((b) => (
                  <div key={b}>
                    <div className="row-between mb8" style={{ fontSize: 12.5 }}>
                      <span className="row gap8"><span className="legend-swatch" style={{ background: BAND_COLORS[b] }} />
                        {b === 'strong' ? `Strength ≥${STRONG_LIMIT}%` : b === 'medium' ? `Developing ${WEAK_LIMIT}–${STRONG_LIMIT - 1}%` : `At risk <${WEAK_LIMIT}%`}</span>
                      <b className="mono">{bandCounts[b]}</b>
                    </div>
                    <Bar value={students.length ? (bandCounts[b] / students.length) * 100 : 0} band={b} height={5} />
                  </div>
                ))}
              </div>
            </Panel>
          </div>

          <div className="grid g2">
            <Panel title="Average by learner" icon={Users} className="reveal reveal-3">
              <ClassBarChart data={students.map((s) => ({ name: s.name.split(' ')[0], average: s.average }))} height={260} />
            </Panel>
            <Panel title="Study time by learner" icon={Clock} className="reveal reveal-4">
              <div className="col gap12">
                {studyByStudent.slice().sort((a, b) => b.minutes - a.minutes).map((s, i) => (
                  <div key={s.full}>
                    <div className="row-between mb8" style={{ fontSize: 12.5 }}>
                      <span className="row gap8"><span className="legend-swatch" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />{s.full}</span>
                      <b className="mono">{hoursMinutes(s.minutes)}</b>
                    </div>
                    <Bar value={studyByStudent.some((x) => x.minutes > 0) ? (s.minutes / Math.max(...studyByStudent.map((x) => x.minutes))) * 100 : 0}
                      tone={['cyan', 'violet', 'magenta', 'lime', 'amber', 'rose'][i % 6]} height={6} />
                    <div className="muted mono mt4" style={{ fontSize: 10 }}>average score {pct(s.average)}</div>
                  </div>
                ))}
              </div>
              <p className="field-hint mt12">Minutes logged per learner. The next tab fits a regression per student.</p>
            </Panel>
          </div>

          <Panel title="Class study activity" icon={Activity} eyebrow="Last 8 weeks · all learners combined" className="reveal reveal-5 mt16">
            <WeeklyArea data={weekly} height={220} />
          </Panel>
        </>
      )}

      {tab === 'prediction' && (
        <>
          {predictions.length === 0 ? (
            <Panel className="reveal reveal-1">
              <Banner tone="info" icon={Sigma} title="No learner has enough data for a regression yet">
                Each model needs at least two study sessions with different minute values paired with quiz attempts.
              </Banner>
            </Panel>
          ) : (
            <>
              <Panel title="Per-learner score prediction" icon={Sigma} className="reveal reveal-1 mb16"
                eyebrow="Least-squares fit of quiz percentage on study minutes · prediction at +25% study time">
                <div className="table-wrap">
                  <table className="tbl">
                    <thead>
                      <tr>
                        <th>Learner</th><th className="num">Points</th><th className="num">Slope</th>
                        <th className="num">Intercept</th><th className="num">R²</th>
                        <th className="num">Current</th><th className="num">Avg min</th>
                        <th className="num">Target min</th><th className="num">Predicted</th><th className="num">Δ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {predictions.map(({ student, model }) => (
                        <tr key={student.id}>
                          <td>
                            <span className="row gap10"><Avatar user={student} size="sm" />
                              <b style={{ fontSize: 12.6 }}>{student.name}</b></span>
                          </td>
                          <td className="num">{model.points.length}</td>
                          <td className="num">{model.slope}</td>
                          <td className="num">{model.intercept}</td>
                          <td className="num"><b style={{ color: model.r2 >= 0.5 ? 'var(--lime)' : model.r2 >= 0.25 ? 'var(--amber)' : 'var(--rose)' }}>{model.r2}</b></td>
                          <td className="num">{model.current}%</td>
                          <td className="num">{model.avgMinutes}</td>
                          <td className="num">{model.targetMinutes}</td>
                          <td className="num"><b style={{ color: 'var(--cyan)' }}>{model.predicted}%</b></td>
                          <td className="num" style={{ color: model.delta >= 0 ? 'var(--lime)' : 'var(--rose)' }}>
                            {model.delta >= 0 ? '+' : ''}{model.delta}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Panel>

              <div className="grid g2">
                {predictions.slice(0, 4).map(({ student, model }, i) => (
                  <Panel key={student.id} title={`${student.name} · model fit`} icon={Sigma}
                    className={`reveal reveal-${Math.min(i + 2, 5)}`}
                    actions={<Chip tone={model.r2 >= 0.5 ? 'ok' : model.r2 >= 0.25 ? 'warn' : 'danger'}>R² {model.r2}</Chip>}>
                    <div className="col gap10">
                      <StudyScatter prediction={model} height={180} />
                      <StatLine label="Equation" value={<span className="mono" style={{ fontSize: 11.5 }}>{model.slope} × min + {model.intercept}</span>} />
                      <StatLine label="Current average" value={`${model.current}%`} />
                      <StatLine label="Predicted at +25% study" value={`${model.predicted}%`} tone="lime" />
                      <StatLine label="Expected change" value={`${model.delta >= 0 ? '+' : ''}${model.delta}%`} tone={model.delta >= 0 ? 'lime' : 'rose'} />
                      <div className="rule" />
                      <div className="row-between" style={{ fontSize: 12 }}>
                        <span className="muted">Study minutes raised from</span>
                        <b className="mono">{model.avgMinutes} → {model.targetMinutes}</b>
                      </div>
                      <Bar value={model.predicted} band={bandOf(model.predicted)} height={7} />
                    </div>
                  </Panel>
                ))}
              </div>
            </>
          )}
        </>
      )}

      <div className="row gap8 wrap mt20" style={{ justifyContent: 'center' }}>
        <Chip tone="slate"><Filter size={11} /> {overview.courses} courses</Chip>
        <Chip tone="slate">{overview.topics} topics</Chip>
        <Chip tone="slate">{overview.resources} resources</Chip>
        <Chip tone="slate">{overview.attempts} attempts</Chip>
        <Chip tone="slate">{overview.completions} completions</Chip>
      </div>
    </>
  )
}

function HeatRow({ row, mode, topics }) {
  return (
    <>
      <div className="heat-label">
        <Avatar user={row.student} size="sm" />
        <span className="truncate" title={row.student.name}>{row.student.name}</span>
      </div>
      {topics.map((t) => {
        const cell = row.cells.find((c) => c.topicId === t.id)
        const value = cell?.value ?? null
        const band = bandOf(value)
        const c = mode === 'band'
          ? { bg: value == null ? 'var(--surface-2)' : BAND_COLORS[band], fg: value == null ? 'var(--text-4)' : '#0b1030' }
          : heatColor(value)
        return (
          <div className="heat-cell" key={t.id} style={{ background: c.bg, color: c.fg }}
            title={`${row.student.name} · ${t.name}: ${value == null ? 'not attempted' : pct(value)}`}>
            {value == null ? '·' : mode === 'band' ? band[0].toUpperCase() : Math.round(value)}
          </div>
        )
      })}
    </>
  )
}