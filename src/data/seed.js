/**
 * Demo database seed — mirrors seed.py of the Flask/SQLite build.
 * One administrator, four learners, their enrolments, quiz attempts with
 * per-question answers, study sessions and resource completion records.
 * Deterministic PRNG so the demo data is identical on every machine.
 */
import { COURSES, QUIZZES } from './content.js'

export const ADMIN = {
  id: 1,
  name: 'Project Administrator',
  email: 'admin@lms.edu',
  password: 'admin123',
  role: 'admin',
  designation: 'System Administrator',
  department: 'Computer Science & Engineering',
}

/** name, email, password, per-topic ability (12 topics in course order), study hours */
const LEARNERS = [
  { name: 'Farhan Nadeem', email: 'farhan@lms.edu', roll: '2300101833', ability: [0.95, 0.8, 0.55, 0.4, 0.85, 0.5, 0.45, 0.35, 0.9, 0.6, 0.45, 0.55], hours: 14 },
  { name: 'Farhan Ahmad', email: 'farhanahmad@lms.edu', roll: '2300101643', ability: [0.7, 0.65, 0.8, 0.5, 0.55, 0.75, 0.6, 0.45, 0.65, 0.85, 0.7, 0.6], hours: 22 },
  { name: 'Aman Shadab Afsar', email: 'aman@lms.edu', roll: '2300104876', ability: [0.85, 0.9, 0.85, 0.75, 0.8, 0.9, 0.85, 0.8, 0.85, 0.9, 0.75, 0.85], hours: 30 },
  { name: 'Riya Kapoor', email: 'riya@lms.edu', roll: '2300102214', ability: [0.55, 0.4, 0.45, 0.3, 0.45, 0.35, 0.4, 0.25, 0.5, 0.45, 0.35, 0.4], hours: 8 },
]

function mulberry32(seed) {
  let a = seed >>> 0
  return function () {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const initials = (name) =>
  name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('')

const DAY = 86400000

export function buildSeed(now = Date.now()) {
  const rand = mulberry32(7)
  const topics = COURSES.flatMap((c) => c.topics.map((t) => ({ ...t, courseId: c.id })))
  const users = [
    { ...ADMIN, initials: 'PA', createdAt: new Date(now - 120 * DAY).toISOString(), tone: 'violet' },
    ...LEARNERS.map((l, i) => ({
      id: i + 2,
      name: l.name,
      email: l.email,
      password: 'student123',
      role: 'student',
      roll: l.roll,
      initials: initials(l.name),
      branch: 'B.Tech CSE',
      semester: 'V',
      section: 'A',
      tone: ['cyan', 'magenta', 'lime', 'amber'][i],
      createdAt: new Date(now - (90 - i * 7) * DAY).toISOString(),
    })),
  ]

  const enrollments = []
  const attempts = []
  const resourceViews = []
  const studySessions = []
  let attemptId = 1
  let viewId = 1
  let sessionId = 1

  const students = users.filter((u) => u.role === 'student')

  students.forEach((student, si) => {
    COURSES.forEach((c, ci) => {
      enrollments.push({
        id: enrollments.length + 1,
        studentId: student.id,
        courseId: c.id,
        enrolledAt: new Date(now - (80 - si * 5 - ci * 3) * DAY).toISOString(),
      })
    })

    const learner = LEARNERS[si]
    const baseResults = []

    topics.forEach((topic, ti) => {
      const ability = learner.ability[ti]
      const quiz = QUIZZES.find((q) => q.topicId === topic.id)
      const finishedAt = new Date(now - ((11 - ti) * 2 + 1) * DAY - si * 3 * 3600000)
      const result = takeAttempt(topic, quiz, ability, finishedAt)
      baseResults.push({ topic, ability, ...result })

      studySessions.push({
        id: sessionId++,
        studentId: student.id,
        topicId: topic.id,
        minutes: Math.round(learner.hours * 6 * ability),
        studiedAt: new Date(finishedAt.getTime() - 2 * 3600000).toISOString(),
      })

      const done = Math.max(0, Math.round(ability * topic.resources.length))
      topic.resources.forEach((r, ri) => {
        if (ri < done) {
          resourceViews.push({
            id: viewId++, studentId: student.id, resourceId: r.id,
            completed: true, viewedAt: new Date(finishedAt.getTime() - (4 + ri) * 3600000).toISOString(),
          })
        } else if (ri === done && ability < 0.6) {
          resourceViews.push({
            id: viewId++, studentId: student.id, resourceId: r.id,
            completed: false, viewedAt: new Date(finishedAt.getTime() - 1 * 3600000).toISOString(),
          })
        }
      })
    })

    // A revision attempt on the two weakest topics — shows the profile improving.
    baseResults
      .slice()
      .sort((a, b) => a.percentage - b.percentage)
      .slice(0, 2)
      .forEach((weak, k) => {
        const quiz = QUIZZES.find((q) => q.topicId === weak.topic.id)
        const at = new Date(now - (2 + k) * DAY - si * 5 * 3600000)
        takeAttempt(weak.topic, quiz, Math.min(0.97, weak.ability + 0.22), at)
        studySessions.push({
          id: sessionId++, studentId: student.id, topicId: weak.topic.id,
          minutes: Math.round(learner.hours * 3), studiedAt: new Date(at.getTime() - 3 * 3600000).toISOString(),
        })
      })

    function takeAttempt(topic, quiz, ability, finishedAt) {
      const answers = topic.questions.map((q) => {
        const ok = rand() < ability
        let chosen = q.correct
        if (!ok) {
          const wrong = ['a', 'b', 'c', 'd'].filter((o) => q.options[o] && o !== q.correct)
          chosen = wrong[Math.floor(rand() * wrong.length)] || q.correct
        }
        return { questionId: q.id, chosen, isCorrect: ok }
      })
      const total = topic.questions.reduce((s, q) => s + q.marks, 0)
      const score = answers.reduce((s, a) => {
        const q = topic.questions.find((x) => x.id === a.questionId)
        return s + (a.isCorrect ? q.marks : 0)
      }, 0)
      const percentage = Math.round((score / total) * 1000) / 10
      const attempt = {
        id: attemptId++,
        studentId: student.id,
        quizId: quiz.id,
        topicId: topic.id,
        courseId: topic.courseId,
        score,
        total,
        percentage,
        durationSec: Math.round(quiz.durationSec * (0.45 + rand() * 0.4)),
        finishedAt: finishedAt.toISOString(),
        answers,
      }
      attempts.push(attempt)
      return { score, total, percentage }
    }
  })

  attempts.sort((a, b) => new Date(a.finishedAt) - new Date(b.finishedAt))

  return { users, enrollments, attempts, resourceViews, studySessions, seededAt: new Date(now).toISOString() }
}