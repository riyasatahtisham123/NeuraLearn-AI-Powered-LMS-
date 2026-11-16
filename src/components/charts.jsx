import {
  ResponsiveContainer, BarChart, Bar as RBar, XAxis, YAxis, CartesianGrid, Tooltip,
  LineChart, Line, AreaChart, Area, PieChart, Pie, Cell, RadarChart, Radar,
  PolarGrid, PolarAngleAxis, PolarRadiusAxis, ScatterChart, Scatter, ZAxis,
  ReferenceLine, Legend, ComposedChart,
} from 'recharts'
import { CHART_COLORS, BAND_COLORS } from '../lib/format.js'

export { CHART_COLORS, BAND_COLORS }

const axis = { stroke: 'var(--line-2)', tickLine: false, axisLine: false }
const tickStyle = { fill: 'var(--text-3)', fontSize: 10.5, fontFamily: 'var(--font-mono)' }

export function ChartTip({ active, payload, label, unit = '', formatter }) {
  if (!active || !payload?.length) return null
  return (
    <div className="chart-tip">
      {label != null && <div className="tt-label">{label}</div>}
      {payload.map((p, i) => (
        <div className="tt-row" key={i}>
          <span className="tt-swatch" style={{ background: p.color ?? p.payload?.fill ?? CHART_COLORS[i % 8] }} />
          <span>{p.name}</span>
          <b>{formatter ? formatter(p.value, p) : `${p.value}${unit}`}</b>
        </div>
      ))}
    </div>
  )
}

const trunc = (s, n = 13) => (String(s).length > n ? `${String(s).slice(0, n - 1)}…` : String(s))

/* ------------------------------------------------ topic performance bar */
export function TopicBarChart({ rows, height = 300, horizontal = false }) {
  const data = rows.map((r) => ({
    name: r.name, full: r.name, course: r.courseTitle ?? r.course, value: r.percentage ?? r.pct ?? r.value ?? 0,
    band: r.band, fill: BAND_COLORS[r.band] ?? CHART_COLORS[0],
  }))
  if (!data.length) return null
  return (
    <div className="chart-box" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout={horizontal ? 'vertical' : 'horizontal'}
          margin={horizontal ? { top: 22, right: 26, left: 4, bottom: 4 } : { top: 8, right: 66, left: 2, bottom: 4 }}
          barCategoryGap={horizontal ? '22%' : '28%'}>
          <CartesianGrid strokeDasharray="3 6" horizontal={!horizontal} vertical={horizontal} />
          {horizontal ? (
            <>
              <XAxis type="number" domain={[0, 100]} {...axis} tick={tickStyle} unit="%" />
              <YAxis type="category" dataKey="name" width={126} {...axis}
                tick={{ ...tickStyle, fontSize: 11 }} tickFormatter={(v) => trunc(v, 19)} />
            </>
          ) : (
            <>
              <XAxis dataKey="name" {...axis} tick={tickStyle} interval={0} angle={-24} textAnchor="end" height={62} tickFormatter={(v) => trunc(v, 12)} />
              <YAxis domain={[0, 100]} {...axis} tick={tickStyle} unit="%" />
            </>
          )}
          <Tooltip content={<ChartTip unit="%" />} cursor={{ fill: 'var(--surface-3)', opacity: 0.35 }} />
          <ReferenceLine y={horizontal ? undefined : 60} x={horizontal ? 60 : undefined} stroke="var(--rose)" strokeOpacity={0.55} label={{ value: 'gap 60%', position: horizontal ? 'top' : 'right', dx: horizontal ? -20 : 0, fill: 'var(--rose)', fontSize: 9.5, fontFamily: 'var(--font-mono)' }} />
          <ReferenceLine y={horizontal ? undefined : 80} x={horizontal ? 80 : undefined} stroke="var(--lime)" strokeOpacity={0.5} label={{ value: 'strong 80%', position: horizontal ? 'top' : 'right', dx: horizontal ? 22 : 0, fill: 'var(--lime)', fontSize: 9.5, fontFamily: 'var(--font-mono)' }} />
          <RBar dataKey="value" name="Score" radius={horizontal ? [0, 6, 6, 0] : [6, 6, 0, 0]} maxBarSize={44}>
            {data.map((d, i) => <Cell key={i} fill={d.fill} />)}
          </RBar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

/* ------------------------------------------------------ progress trend */
export function TrendChart({ data, height = 250, showAverage = true }) {
  if (!data?.length) return null
  const avg = data.reduce((s, d) => s + d.percentage, 0) / data.length
  return (
    <div className="chart-box" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 8, right: 56, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#22d3ee" stopOpacity={0.42} />
              <stop offset="100%" stopColor="#a855f7" stopOpacity={0.02} />
            </linearGradient>
            <linearGradient id="trendStroke" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#22d3ee" />
              <stop offset="60%" stopColor="#a855f7" />
              <stop offset="100%" stopColor="#e879f9" />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 6" />
          <XAxis dataKey="label" {...axis} tick={tickStyle} />
          <YAxis domain={[0, 100]} {...axis} tick={tickStyle} unit="%" />
          <Tooltip content={<ChartTip unit="%" />} cursor={{ stroke: 'var(--line-3)' }} />
          {showAverage && <ReferenceLine y={avg} stroke="var(--amber)" strokeOpacity={0.6} strokeDasharray="5 5"
            label={{ value: `avg ${avg.toFixed(1)}%`, position: 'right', fill: 'var(--amber)', fontSize: 9.5, fontFamily: 'var(--font-mono)' }} />}
          <Area type="monotone" dataKey="percentage" stroke="none" fill="url(#trendFill)" name="Score" />
          <Line type="monotone" dataKey="percentage" stroke="url(#trendStroke)" strokeWidth={2.4}
            dot={{ r: 3, fill: 'var(--bg)', stroke: '#22d3ee', strokeWidth: 2 }}
            activeDot={{ r: 5.5, fill: '#e879f9', stroke: 'var(--bg)', strokeWidth: 2 }} name="Quiz score" />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}

/* --------------------------------------------------------- band donut */
export function BandDonut({ data, height = 220, centerLabel, centerValue }) {
  const total = data.reduce((s, d) => s + d.value, 0)
  return (
    <div className="chart-box" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" innerRadius="62%" outerRadius="88%"
            paddingAngle={3} stroke="var(--bg)" strokeWidth={2} startAngle={90} endAngle={-270}>
            {data.map((d, i) => <Cell key={i} fill={BAND_COLORS[d.band] ?? CHART_COLORS[i % 8]} />)}
          </Pie>
          <Tooltip content={<ChartTip />} />
        </PieChart>
      </ResponsiveContainer>
      {total > 0 && (
        <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', pointerEvents: 'none' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 27, fontWeight: 700, letterSpacing: '-0.04em', lineHeight: 1 }}>
              {centerValue ?? total}
            </div>
            <div className="eyebrow" style={{ marginTop: 4 }}>{centerLabel ?? 'topics'}</div>
          </div>
        </div>
      )}
    </div>
  )
}

/* ------------------------------------------------------- generic donut */
export function Donut({ data, height = 220, colors = CHART_COLORS, centerLabel, centerValue, unit = '' }) {
  const total = data.reduce((s, d) => s + d.value, 0)
  return (
    <div className="chart-box" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" innerRadius="58%" outerRadius="86%"
            paddingAngle={3} stroke="var(--bg)" strokeWidth={2}>
            {data.map((d, i) => <Cell key={i} fill={d.fill ?? colors[i % colors.length]} />)}
          </Pie>
          <Tooltip content={<ChartTip unit={unit} />} />
        </PieChart>
      </ResponsiveContainer>
      {total > 0 && (
        <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', pointerEvents: 'none' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 700, letterSpacing: '-0.04em', lineHeight: 1 }}>
              {centerValue ?? total}
            </div>
            <div className="eyebrow" style={{ marginTop: 4 }}>{centerLabel ?? 'total'}</div>
          </div>
        </div>
      )}
    </div>
  )
}

/* ------------------------------------------------------------- radar */
export function TopicRadar({ rows, height = 320, series }) {
  const names = rows.map((r) => r.name)
  const data = names.map((n, i) => {
    const entry = { topic: trunc(n, 15) }
    if (series) series.forEach((s) => { entry[s.key] = s.values[i] ?? 0 })
    else entry.score = rows[i].percentage ?? 0
    return entry
  })
  const keys = series ? series.map((s) => ({ key: s.key, name: s.name, color: s.color })) : [{ key: 'score', name: 'Score', color: '#22d3ee' }]
  return (
    <div className="chart-box" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart data={data} outerRadius="72%">
          <PolarGrid stroke="var(--line-2)" />
          <PolarAngleAxis dataKey="topic" tick={{ fill: 'var(--text-2)', fontSize: 10.5 }} />
          <PolarRadiusAxis domain={[0, 100]} tick={tickStyle} axisLine={false} tickCount={5} />
          {keys.map((k) => (
            <Radar key={k.key} name={k.name} dataKey={k.key} stroke={k.color} fill={k.color} fillOpacity={0.22} strokeWidth={2} dot={{ r: 2.5, fill: k.color }} />
          ))}
          <Tooltip content={<ChartTip unit="%" />} />
          {keys.length > 1 && <Legend wrapperStyle={{ fontSize: 11.5 }} />}
        </RadarChart>
      </ResponsiveContainer>
    </div>
  )
}

/* ---------------------------------------- study time vs score scatter */
export function StudyScatter({ prediction, height = 280 }) {
  if (!prediction) return null
  const { points, line, targetMinutes, predicted } = prediction
  const maxX = Math.ceil(Math.max(...points.map((p) => p.x), targetMinutes) * 1.15)
  const scatterData = points.map((p) => ({ ...p, name: 'Topic' }))
  const lineData = line.map((p) => ({ ...p }))
  const target = [{ x: targetMinutes, y: predicted }]
  return (
    <div className="chart-box" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <ScatterChart margin={{ top: 10, right: 18, left: -18, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 6" />
          <XAxis type="number" dataKey="x" name="Study minutes" domain={[0, maxX]} {...axis} tick={tickStyle}
            label={{ value: 'study minutes per topic', position: 'insideBottom', offset: -2, fill: 'var(--text-3)', fontSize: 10 }} />
          <YAxis type="number" dataKey="y" name="Score" domain={[0, 100]} {...axis} tick={tickStyle} unit="%" />
          <ZAxis range={[70, 71]} />
          <Tooltip content={<ChartTip unit="" formatter={(v, p) => (p.name === 'Study minutes' ? `${v} min` : `${v}%`)} />} cursor={{ strokeDasharray: '3 3', stroke: 'var(--line-3)' }} />
          <Scatter name="Regression" data={lineData} line={{ stroke: '#a855f7', strokeWidth: 2, strokeDasharray: '6 4' }} shape={() => <g />} legendType="none" />
          <Scatter name="Observed" data={scatterData} fill="#22d3ee">
            {scatterData.map((d, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
          </Scatter>
          <Scatter name="Predicted (+25% study)" data={target} fill="#a3e635" shape="star" legendType="star" />
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  )
}

/* ---------------------------------------------------- class comparison */
export function ClassBarChart({ data, height = 280, dataKey = 'average', name = 'Class average', colors }) {
  return (
    <div className="chart-box" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 12, left: -20, bottom: 4 }} barCategoryGap="26%">
          <CartesianGrid strokeDasharray="3 6" vertical={false} />
          <XAxis dataKey="name" {...axis} tick={tickStyle} interval={0} tickFormatter={(v) => trunc(v, 14)} />
          <YAxis domain={[0, 100]} {...axis} tick={tickStyle} unit="%" />
          <Tooltip content={<ChartTip unit="%" />} cursor={{ fill: 'var(--surface-3)', opacity: 0.35 }} />
          <ReferenceLine y={60} stroke="var(--rose)" strokeOpacity={0.5} strokeDasharray="5 5" />
          <RBar dataKey={dataKey} name={name} radius={[7, 7, 0, 0]} maxBarSize={54}>
            {data.map((d, i) => <Cell key={i} fill={d.fill ?? (colors ? colors[i % colors.length] : d.average >= 80 ? '#a3e635' : d.average >= 60 ? '#fbbf24' : '#fb7185')} />)}
          </RBar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

/* --------------------------------------------------------- weekly area */
export function WeeklyArea({ data, height = 200, dataKey = 'minutes', name = 'Study minutes' }) {
  return (
    <div className="chart-box" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 12, left: -22, bottom: 0 }}>
          <defs>
            <linearGradient id="weekFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#a855f7" stopOpacity={0.5} />
              <stop offset="100%" stopColor="#22d3ee" stopOpacity={0.04} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 6" vertical={false} />
          <XAxis dataKey="name" {...axis} tick={tickStyle} />
          <YAxis {...axis} tick={tickStyle} />
          <Tooltip content={<ChartTip unit=" min" />} cursor={{ stroke: 'var(--line-3)' }} />
          <Area type="monotone" dataKey={dataKey} name={name} stroke="#a855f7" strokeWidth={2.2} fill="url(#weekFill)"
            dot={{ r: 2.5, fill: '#22d3ee', stroke: 'var(--bg)', strokeWidth: 1.5 }} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

/* ---------------------------------------------------- score histogram */
export const HISTOGRAM_COLORS = ['#fb7185', '#fb923c', '#fbbf24', '#a3e635', '#22d3ee']

export function Histogram({ data, height = 230 }) {
  const colors = HISTOGRAM_COLORS
  return (
    <div className="chart-box" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 12, left: -22, bottom: 0 }} barCategoryGap="18%">
          <CartesianGrid strokeDasharray="3 6" vertical={false} />
          <XAxis dataKey="name" {...axis} tick={tickStyle} />
          <YAxis allowDecimals={false} {...axis} tick={tickStyle} />
          <Tooltip content={<ChartTip unit=" attempts" />} cursor={{ fill: 'var(--surface-3)', opacity: 0.35 }} />
          <RBar dataKey="count" name="Attempts" radius={[6, 6, 0, 0]} maxBarSize={62}>
            {data.map((d, i) => <Cell key={i} fill={colors[i % colors.length]} />)}
          </RBar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

/* ---------------------------------------------- multi-series line chart */
export function MultiLine({ data, series, height = 280, xKey = 'name' }) {
  return (
    <div className="chart-box" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 14, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 6" />
          <XAxis dataKey={xKey} {...axis} tick={tickStyle} />
          <YAxis domain={[0, 100]} {...axis} tick={tickStyle} unit="%" />
          <Tooltip content={<ChartTip unit="%" />} />
          <Legend wrapperStyle={{ fontSize: 11.5 }} />
          {series.map((s, i) => (
            <Line key={s.key} type="monotone" dataKey={s.key} name={s.name} stroke={s.color ?? CHART_COLORS[i % 8]}
              strokeWidth={2.2} dot={{ r: 2.6, strokeWidth: 2, fill: 'var(--bg)' }} connectNulls />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

export function ChartLegend({ items }) {
  return (
    <div className="legend">
      {items.map((it) => (
        <span className="legend-item" key={it.label}>
          <span className="legend-swatch" style={{ background: it.color }} />{it.label}
          {it.value != null && <b className="mono" style={{ marginLeft: 3 }}>{it.value}</b>}
        </span>
      ))}
    </div>
  )
}