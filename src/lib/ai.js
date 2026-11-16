/**
 * AI / ML module — JavaScript port of ai_module/performance.py and
 * ai_module/recommender.py so the frontend demonstrates the same pipeline:
 *   answers → topic-wise percentages → strengths / learning gaps
 *   gaps → text profile → TF-IDF vectors → cosine similarity → ranked resources
 *   study minutes → least-squares regression → predicted next score
 */

export const WEAK_LIMIT = 60
export const STRONG_LIMIT = 80
export const MEDIUM_LIMIT = 70

export const bandOf = (pct) =>
  pct == null ? 'new' : pct >= STRONG_LIMIT ? 'strong' : pct >= WEAK_LIMIT ? 'medium' : 'weak'

export const BAND_META = {
  strong: { label: 'Strength', tone: 'lime', hint: `${STRONG_LIMIT}% and above` },
  medium: { label: 'Developing', tone: 'amber', hint: `${WEAK_LIMIT}–${STRONG_LIMIT - 1}%` },
  weak: { label: 'Learning gap', tone: 'rose', hint: `Below ${WEAK_LIMIT}%` },
  new: { label: 'Not attempted', tone: 'slate', hint: 'No quiz data yet' },
}

/* ------------------------------------------------------------- selectors */

export const flattenTopics = (courses) =>
  courses.flatMap((c) =>
    c.topics.map((t) => ({
      ...t,
      courseId: c.id,
      courseTitle: c.title,
      courseCode: c.code,
      tone: c.tone,
      quizId: t.id,
    })),
  )

export const flattenResources = (courses) =>
  flattenTopics(courses).flatMap((t) =>
    t.resources.map((r) => ({
      ...r,
      topicId: t.id,
      topicName: t.name,
      topicText: t.description,
      topicDifficulty: t.difficulty,
      courseId: t.courseId,
      courseTitle: t.courseTitle,
      tone: t.tone,
    })),
  )

export const findTopic = (courses, id) => flattenTopics(courses).find((t) => t.id === Number(id))
export const findResource = (courses, id) => flattenResources(courses).find((r) => r.id === Number(id))
export const findCourse = (courses, id) => courses.find((c) => c.id === Number(id))

/* ------------------------------------------------- performance analysis */

/** Topic-wise percentage for one learner, weakest first (pandas groupby equivalent). */
export function topicScores(state, studentId, { includeAll = false } = {}) {
  const topics = flattenTopics(state.courses)
  const mine = state.attempts.filter((a) => a.studentId === studentId)
  const rows = []

  topics.forEach((t) => {
    const attempts = mine.filter((a) => a.topicId === t.id)
    if (!attempts.length) {
      if (includeAll) {
        rows.push({
          topicId: t.id, name: t.name, courseId: t.courseId, courseTitle: t.courseTitle,
          courseCode: t.courseCode, tone: t.tone, difficulty: t.difficulty,
          scored: 0, possible: 0, attempts: 0, percentage: null, band: 'new',
        })
      }
      return
    }
    let scored = 0
    let possible = 0
    attempts.forEach((a) => {
      a.answers.forEach((ans) => {
        const q = t.questions.find((x) => x.id === ans.questionId)
        if (!q) return
        possible += q.marks
        if (ans.isCorrect) scored += q.marks
      })
    })
    const percentage = possible ? Math.round((scored / possible) * 1000) / 10 : 0
    rows.push({
      topicId: t.id, name: t.name, courseId: t.courseId, courseTitle: t.courseTitle,
      courseCode: t.courseCode, tone: t.tone, difficulty: t.difficulty,
      scored, possible, attempts: attempts.length, percentage, band: bandOf(percentage),
    })
  })

  return rows.sort((a, b) => (a.percentage ?? 101) - (b.percentage ?? 101))
}

export function strengthsAndGaps(state, studentId) {
  const rows = topicScores(state, studentId)
  const gaps = rows.filter((r) => r.percentage < WEAK_LIMIT)
  const strengths = rows.filter((r) => r.percentage >= STRONG_LIMIT)
  const medium = rows.filter((r) => r.percentage >= WEAK_LIMIT && r.percentage < STRONG_LIMIT)
  const overall = rows.length ? Math.round((rows.reduce((s, r) => s + r.percentage, 0) / rows.length) * 10) / 10 : 0
  return { rows, gaps, strengths, medium, overall, topicsCovered: rows.length }
}

export function progressOverTime(state, studentId) {
  return state.attempts
    .filter((a) => a.studentId === studentId)
    .slice()
    .sort((a, b) => new Date(a.finishedAt) - new Date(b.finishedAt))
    .map((a, i) => {
      const t = findTopic(state.courses, a.topicId)
      return {
        index: i + 1,
        label: `#${i + 1}`,
        date: a.finishedAt,
        percentage: a.percentage,
        topic: t?.name ?? '—',
        quizTitle: t ? `Quiz: ${t.name}` : '—',
        attemptId: a.id,
      }
    })
}

export function studyTimeByTopic(state, studentId) {
  const map = new Map()
  state.studySessions.filter((s) => s.studentId === studentId).forEach((s) => {
    map.set(s.topicId, (map.get(s.topicId) || 0) + s.minutes)
  })
  return flattenTopics(state.courses)
    .filter((t) => map.has(t.id))
    .map((t) => ({ topicId: t.id, name: t.name, minutes: map.get(t.id), tone: t.tone }))
    .sort((a, b) => b.minutes - a.minutes)
}

export function totalStudyMinutes(state, studentId) {
  return state.studySessions.filter((s) => s.studentId === studentId).reduce((sum, s) => sum + s.minutes, 0)
}

/** (minutes, percentage) pairs for the scatter chart + regression. */
export function scoreVsStudyTime(state, studentId) {
  const sessions = state.studySessions.filter((s) => s.studentId === studentId)
  const pairs = []
  sessions.forEach((s) => {
    state.attempts
      .filter((a) => a.studentId === studentId && a.topicId === s.topicId)
      .forEach((a) => pairs.push({ x: s.minutes, y: a.percentage, topicId: s.topicId }))
  })
  const grouped = new Map()
  pairs.forEach((p) => {
    const g = grouped.get(p.x) || { sum: 0, n: 0 }
    g.sum += p.y
    g.n += 1
    grouped.set(p.x, g)
  })
  return [...grouped.entries()]
    .map(([x, g]) => ({ x, y: Math.round((g.sum / g.n) * 10) / 10 }))
    .sort((a, b) => a.x - b.x)
}

export function courseCompletion(state, studentId) {
  const enrolled = state.enrollments.filter((e) => e.studentId === studentId).map((e) => e.courseId)
  return state.courses
    .filter((c) => enrolled.includes(c.id))
    .map((c) => {
      const total = c.topics.length
      const attempted = c.topics.filter((t) =>
        state.attempts.some((a) => a.studentId === studentId && a.topicId === t.id),
      ).length
      const resTotal = c.topics.reduce((s, t) => s + t.resources.length, 0)
      const resDone = c.topics.reduce(
        (s, t) => s + t.resources.filter((r) => isCompleted(state, studentId, r.id)).length, 0,
      )
      const rows = topicScores(state, studentId).filter((r) => r.courseId === c.id)
      const avg = rows.length ? Math.round((rows.reduce((s, r) => s + r.percentage, 0) / rows.length) * 10) / 10 : 0
      return {
        courseId: c.id, title: c.title, code: c.code, tone: c.tone,
        totalTopics: total, attemptedTopics: attempted,
        percent: total ? Math.round((attempted / total) * 1000) / 10 : 0,
        resTotal, resDone, average: avg,
      }
    })
}

export const isCompleted = (state, studentId, resourceId) =>
  state.resourceViews.some((v) => v.studentId === studentId && v.resourceId === resourceId && v.completed)

export const isViewed = (state, studentId, resourceId) =>
  state.resourceViews.some((v) => v.studentId === studentId && v.resourceId === resourceId)

export function resourceStats(state, studentId) {
  const all = flattenResources(state.courses)
  const completed = all.filter((r) => isCompleted(state, studentId, r.id)).length
  const opened = all.filter((r) => isViewed(state, studentId, r.id) && !isCompleted(state, studentId, r.id)).length
  return { total: all.length, completed, opened, remaining: all.length - completed - opened }
}

/* ------------------------------------------------------ text vectorisation */

const STOP = new Set([
  'the', 'a', 'an', 'and', 'or', 'of', 'to', 'in', 'on', 'for', 'with', 'is', 'are', 'was', 'were',
  'this', 'that', 'these', 'those', 'using', 'use', 'how', 'from', 'each', 'their', 'them', 'into',
  'over', 'you', 'your', 'it', 'its', 'as', 'at', 'by', 'be', 'which', 'what', 'when', 'all', 'can',
])

export const tokenize = (text) =>
  String(text).toLowerCase().replace(/[^a-z0-9 ]/g, ' ').split(/\s+/)
    .filter((w) => w.length > 2 && !STOP.has(w))

/** TF-IDF weighting over a corpus of token lists. */
export function tfidf(documents) {
  const n = documents.length
  const df = {}
  documents.forEach((tokens) => new Set(tokens).forEach((t) => { df[t] = (df[t] || 0) + 1 }))
  return documents.map((tokens) => {
    const tf = {}
    tokens.forEach((t) => { tf[t] = (tf[t] || 0) + 1 })
    const vector = {}
    Object.keys(tf).forEach((t) => { vector[t] = tf[t] * Math.log(1 + n / (1 + (df[t] || 0))) })
    return vector
  })
}

export function cosine(u, v) {
  let dot = 0, nu = 0, nv = 0
  Object.keys(u).forEach((k) => { nu += u[k] * u[k]; if (v[k]) dot += u[k] * v[k] })
  Object.keys(v).forEach((k) => { nv += v[k] * v[k] })
  return nu && nv ? dot / (Math.sqrt(nu) * Math.sqrt(nv)) : 0
}

export const topTerms = (vector, limit = 8) =>
  Object.entries(vector).sort((a, b) => b[1] - a[1]).slice(0, limit).map(([term, weight]) => ({ term, weight: Math.round(weight * 1000) / 1000 }))

/* ------------------------------------------------------- recommender */

function popularityScores(state) {
  const counts = {}
  state.resourceViews.filter((v) => v.completed).forEach((v) => {
    counts[v.resourceId] = (counts[v.resourceId] || 0) + 1
  })
  return counts
}

export function buildProfile(state, studentId) {
  const summary = strengthsAndGaps(state, studentId)
  const topics = flattenTopics(state.courses)
  let gaps = summary.gaps.map((g) => {
    const t = topics.find((x) => x.id === g.topicId)
    return { topicId: g.topicId, name: g.name, text: t?.description ?? '' }
  })
  let fallback = false
  if (!gaps.length) {
    fallback = true
    gaps = topics
      .slice()
      .sort((a, b) => b.difficulty - a.difficulty || a.id - b.id)
      .slice(0, 3)
      .map((t) => ({ topicId: t.id, name: t.name, text: t.description }))
  }
  const text = gaps.map((g) => `${g.name} ${g.text} weak revision practice basics`).join(' ').toLowerCase()
  return { text, gaps, fallback, summary }
}

/** Content-based recommendation: TF-IDF + cosine similarity, best match first. */
export function recommend(state, studentId, limit = 8) {
  const resources = flattenResources(state.courses)
  if (!resources.length) return { items: [], profile: null, vocabulary: 0 }

  const profile = buildProfile(state, studentId)
  const gapIds = new Set(profile.gaps.map((g) => g.topicId))
  const pop = popularityScores(state)

  const corpus = resources.map((r) =>
    tokenize(`${r.title} ${r.description} ${r.topicName} ${r.topicText} ${r.courseTitle} ${r.rtype}`),
  )
  const vectors = tfidf([...corpus, tokenize(profile.text)])
  const profileVector = vectors[vectors.length - 1]
  const vocabulary = Object.keys(profileVector).length + new Set(corpus.flat()).size

  const scored = resources.map((r, i) => {
    const relevance = cosine(profileVector, vectors[i])
    const gapBonus = gapIds.has(r.topicId) ? 0.25 : 0
    const popBonus = (pop[r.id] || 0) * 0.01
    const difficultyBonus = r.difficulty * 0.02
    const seen = isViewed(state, studentId, r.id)
    const done = isCompleted(state, studentId, r.id)
    return {
      resource: r,
      relevance: Math.round(relevance * 1000) / 1000,
      score: Math.round((relevance + gapBonus + popBonus + difficultyBonus) * 1000) / 1000,
      gapBonus, popBonus: Math.round(popBonus * 1000) / 1000, difficultyBonus,
      learners: pop[r.id] || 0,
      seen, done, inGap: gapIds.has(r.topicId),
      terms: topTerms(vectors[i], 5),
      reason: gapIds.has(r.topicId)
        ? `Covers the weak topic “${r.topicName}”`
        : done
          ? `Revisit this resource from “${r.topicName}”`
          : `Related to “${r.topicName}” and matches your profile`,
    }
  })

  scored.sort((a, b) => b.score - a.score)
  const fresh = scored.filter((s) => !s.seen)
  const ordered = [...fresh, ...scored.filter((s) => s.seen)]
  const seenIds = new Set()
  const items = []
  for (const item of ordered) {
    if (seenIds.has(item.resource.id)) continue
    seenIds.add(item.resource.id)
    items.push(item)
    if (items.length >= limit) break
  }
  return { items, profile, profileTerms: topTerms(profileVector, 10), vocabulary }
}

/** Weakest-first step-by-step path with the resources and quiz for each step. */
export function learningPath(state, studentId) {
  const rows = topicScores(state, studentId, { includeAll: true })
  return rows.map((row, i) => {
    const t = findTopic(state.courses, row.topicId)
    const resources = (t?.resources ?? []).slice().sort((a, b) => a.difficulty - b.difficulty || a.id - b.id)
    const doneCount = resources.filter((r) => isCompleted(state, studentId, r.id)).length
    return {
      ...row,
      step: i + 1,
      status: row.band,
      description: t?.description ?? '',
      estMinutes: t?.estMinutes ?? 0,
      resources,
      doneCount,
      quizId: row.topicId,
      suggestion:
        row.band === 'new' ? 'Start here — read the resources, then take the diagnostic quiz'
        : row.band === 'weak' ? 'Revise these resources and re-attempt the quiz'
        : row.band === 'medium' ? 'Practice more to cross 80%'
        : 'Good work. Move to the next topic',
    }
  })
}

/** Least-squares regression of quiz percentage on study minutes. */
export function predictNextScore(state, studentId) {
  const points = scoreVsStudyTime(state, studentId)
  if (points.length < 2 || new Set(points.map((p) => p.x)).size < 2) return null
  const n = points.length
  const sx = points.reduce((s, p) => s + p.x, 0)
  const sy = points.reduce((s, p) => s + p.y, 0)
  const sxx = points.reduce((s, p) => s + p.x * p.x, 0)
  const sxy = points.reduce((s, p) => s + p.x * p.y, 0)
  const syy = points.reduce((s, p) => s + p.y * p.y, 0)
  const den = n * sxx - sx * sx
  if (!den) return null
  const slope = (n * sxy - sx * sy) / den
  const intercept = (sy - slope * sx) / n
  const rDen = Math.sqrt(den * (n * syy - sy * sy))
  const r = rDen ? (n * sxy - sx * sy) / rDen : 0
  const avgMinutes = sx / n
  const target = avgMinutes * 1.25
  const raw = slope * target + intercept
  const predicted = Math.round(Math.max(0, Math.min(100, raw)) * 10) / 10
  const current = Math.round((sy / n) * 10) / 10
  const line = [
    { x: 0, y: Math.round(Math.max(0, Math.min(100, intercept)) * 10) / 10 },
    { x: Math.ceil(Math.max(...points.map((p) => p.x), target) * 1.1), y: 0 },
  ]
  line[1].y = Math.round(Math.max(0, Math.min(100, slope * line[1].x + intercept)) * 10) / 10
  return {
    slope: Math.round(slope * 1000) / 1000,
    intercept: Math.round(intercept * 1000) / 1000,
    r2: Math.round(r * r * 1000) / 1000,
    predicted, current, avgMinutes: Math.round(avgMinutes), targetMinutes: Math.round(target),
    delta: Math.round((predicted - current) * 10) / 10,
    points, line,
    note: 'Predicted score if study time is increased by 25%',
  }
}

/** Learners who share the same weak topics. */
export function similarStudents(state, studentId, limit = 3) {
  const mine = new Set(strengthsAndGaps(state, studentId).gaps.map((g) => g.topicId))
  if (!mine.size) return []
  return state.users
    .filter((u) => u.role === 'student' && u.id !== studentId)
    .map((u) => {
      const theirs = strengthsAndGaps(state, u.id).gaps.map((g) => g.topicId)
      const common = theirs.filter((id) => mine.has(id))
      return { student: u, common: common.length, of: mine.size, topics: common.map((id) => findTopic(state.courses, id)?.name).filter(Boolean) }
    })
    .filter((r) => r.common > 0)
    .sort((a, b) => b.common - a.common)
    .slice(0, limit)
}

/* ------------------------------------------------- administrator analytics */

export function allStudentSummary(state) {
  return state.users
    .filter((u) => u.role === 'student')
    .map((u) => {
      const s = strengthsAndGaps(state, u.id)
      const attempts = state.attempts.filter((a) => a.studentId === u.id)
      const minutes = totalStudyMinutes(state, u.id)
      const stats = resourceStats(state, u.id)
      return {
        id: u.id, name: u.name, email: u.email, roll: u.roll, initials: u.initials, tone: u.tone,
        average: s.overall, weakTopics: s.gaps.length, strongTopics: s.strengths.length,
        topicsCovered: s.topicsCovered, attempts: attempts.length, minutes,
        resourcesDone: stats.completed, resourcesTotal: stats.total,
        lastActive: attempts.length ? attempts[attempts.length - 1].finishedAt : u.createdAt,
        needsSupport: s.overall < WEAK_LIMIT || s.gaps.length >= 4,
        rows: s.rows, gaps: s.gaps, strengths: s.strengths,
      }
    })
    .sort((a, b) => a.average - b.average)
}

export function classTopicAverages(state) {
  const students = state.users.filter((u) => u.role === 'student')
  return flattenTopics(state.courses).map((t) => {
    const values = students
      .map((s) => topicScores(state, s.id).find((r) => r.topicId === t.id)?.percentage)
      .filter((v) => v != null)
    const avg = values.length ? Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 10) / 10 : 0
    return {
      topicId: t.id, name: t.name, courseTitle: t.courseTitle, courseCode: t.courseCode,
      tone: t.tone, difficulty: t.difficulty, average: avg, samples: values.length,
      band: bandOf(avg), values,
    }
  }).sort((a, b) => a.average - b.average)
}

export function difficultySpread(state) {
  const spread = { Easy: 0, Medium: 0, Hard: 0 }
  flattenTopics(state.courses).forEach((t) => { spread[['Easy', 'Medium', 'Hard'][t.difficulty - 1]] += 1 })
  return spread
}

export function resourceTypeSpread(state) {
  const spread = {}
  flattenResources(state.courses).forEach((r) => { spread[r.rtype] = (spread[r.rtype] || 0) + 1 })
  return spread
}

export function bandDistribution(state, studentId) {
  const rows = topicScores(state, studentId)
  return ['strong', 'medium', 'weak'].map((band) => ({
    band, name: BAND_META[band].label, value: rows.filter((r) => r.band === band).length,
  }))
}

export function scoreDistribution(state) {
  const buckets = [
    { name: '0–20', min: 0, max: 20 }, { name: '21–40', min: 21, max: 40 },
    { name: '41–60', min: 41, max: 60 }, { name: '61–80', min: 61, max: 80 },
    { name: '81–100', min: 81, max: 100 },
  ]
  return buckets.map((b) => ({
    ...b,
    count: state.attempts.filter((a) => a.percentage >= b.min && a.percentage <= b.max).length,
  }))
}

export function classOverview(state) {
  const summary = allStudentSummary(state)
  const attempts = state.attempts
  const avg = summary.length ? Math.round((summary.reduce((s, x) => s + x.average, 0) / summary.length) * 10) / 10 : 0
  const attemptAvg = attempts.length ? Math.round((attempts.reduce((s, a) => s + a.percentage, 0) / attempts.length) * 10) / 10 : 0
  const topics = flattenTopics(state.courses)
  const resources = flattenResources(state.courses)
  const questions = topics.reduce((s, t) => s + t.questions.length, 0)
  const minutes = state.studySessions.reduce((s, x) => s + x.minutes, 0)
  const completions = state.resourceViews.filter((v) => v.completed).length
  return {
    students: summary.length,
    admins: state.users.filter((u) => u.role === 'admin').length,
    courses: state.courses.length,
    topics: topics.length,
    resources: resources.length,
    quizzes: topics.length,
    questions,
    attempts: attempts.length,
    classAverage: avg,
    attemptAverage: attemptAvg,
    needsSupport: summary.filter((s) => s.needsSupport).length,
    totalGaps: summary.reduce((s, x) => s + x.weakTopics, 0),
    studyMinutes: minutes,
    completions,
    enrollments: state.enrollments.length,
    passRate: attempts.length ? Math.round((attempts.filter((a) => a.percentage >= WEAK_LIMIT).length / attempts.length) * 1000) / 10 : 0,
  }
}

/** Unified activity feed built from the real records (no synthetic table). */
export function activityFeed(state, { studentId = null, limit = 30 } = {}) {
  const events = []
  state.attempts.forEach((a) => {
    if (studentId && a.studentId !== studentId) return
    const t = findTopic(state.courses, a.topicId)
    events.push({
      id: `a${a.id}`, kind: 'attempt', at: a.finishedAt, studentId: a.studentId,
      title: `Attempted ${t ? `Quiz: ${t.name}` : 'a quiz'}`,
      detail: `${a.score}/${a.total} · ${a.percentage}%`,
      tone: a.percentage >= STRONG_LIMIT ? 'lime' : a.percentage >= WEAK_LIMIT ? 'amber' : 'rose',
      pct: a.percentage,
    })
  })
  state.resourceViews.forEach((v) => {
    if (studentId && v.studentId !== studentId) return
    const r = findResource(state.courses, v.resourceId)
    if (!r) return
    events.push({
      id: `v${v.id}`, kind: v.completed ? 'complete' : 'view', at: v.viewedAt, studentId: v.studentId,
      title: v.completed ? `Completed “${r.title}”` : `Opened “${r.title}”`,
      detail: `${r.topicName} · ${r.rtype}`, tone: v.completed ? 'cyan' : 'slate',
    })
  })
  state.studySessions.forEach((s) => {
    if (studentId && s.studentId !== studentId) return
    const t = findTopic(state.courses, s.topicId)
    events.push({
      id: `s${s.id}`, kind: 'study', at: s.studiedAt, studentId: s.studentId,
      title: `Logged ${s.minutes} min of study`, detail: t?.name ?? '—', tone: 'violet',
    })
  })
  return events.sort((a, b) => new Date(b.at) - new Date(a.at)).slice(0, limit)
}

export function weeklyStudy(state, studentId, weeks = 8) {
  const now = Date.now()
  const out = []
  for (let w = weeks - 1; w >= 0; w--) {
    const end = now - w * 7 * DAY
    const start = end - 7 * DAY
    const minutes = state.studySessions
      .filter((s) => (!studentId || s.studentId === studentId) && new Date(s.studiedAt).getTime() > start && new Date(s.studiedAt).getTime() <= end)
      .reduce((sum, s) => sum + s.minutes, 0)
    out.push({ name: w === 0 ? 'This wk' : `W-${w}`, minutes })
  }
  return out
}

const DAY = 86400000

export function heatmapData(state) {
  const students = state.users.filter((u) => u.role === 'student')
  const topics = flattenTopics(state.courses)
  return students.map((s) => {
    const rows = topicScores(state, s.id)
    const cells = topics.map((t) => {
      const r = rows.find((x) => x.topicId === t.id)
      return { topicId: t.id, name: t.name, value: r?.percentage ?? null }
    })
    return { student: s, cells }
  })
}