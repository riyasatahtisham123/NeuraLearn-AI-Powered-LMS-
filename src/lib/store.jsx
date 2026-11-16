import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef, useState } from 'react'
import { COURSES } from '../data/content.js'
import { buildSeed } from '../data/seed.js'

const STORAGE_KEY = 'neuralearn.state.v1'
const SESSION_KEY = 'neuralearn.session.v1'
const THEME_KEY = 'neuralearn.theme.v1'

const clone = (x) => JSON.parse(JSON.stringify(x))

function freshState() {
  return { courses: clone(COURSES), ...buildSeed(), version: 1 }
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return freshState()
    const parsed = JSON.parse(raw)
    if (parsed?.version !== 1 || !Array.isArray(parsed.courses) || !Array.isArray(parsed.users)) return freshState()
    return parsed
  } catch {
    return freshState()
  }
}

const maxId = (arr) => arr.reduce((m, x) => Math.max(m, Number(x.id) || 0), 0)

function reducer(state, action) {
  switch (action.type) {
    case 'RESET':
      return freshState()

    case 'RESTORE':
      return action.snapshot

    case 'LOGIN':
      return { ...state, users: action.users ?? state.users }

    case 'ADD_USER':
      return { ...state, users: [...state.users, action.user] }

    case 'UPDATE_PROFILE':
      return {
        ...state,
        users: state.users.map((u) => (u.id === action.id ? { ...u, ...action.patch } : u)),
      }

    case 'ADD_ATTEMPT':
      return { ...state, attempts: [...state.attempts, action.attempt] }

    case 'SET_RESOURCE_VIEW': {
      const existing = state.resourceViews.find(
        (v) => v.studentId === action.studentId && v.resourceId === action.resourceId,
      )
      if (existing) {
        return {
          ...state,
          resourceViews: state.resourceViews.map((v) =>
            v.id === existing.id ? { ...v, completed: action.completed, viewedAt: new Date().toISOString() } : v,
          ),
        }
      }
      return {
        ...state,
        resourceViews: [
          ...state.resourceViews,
          {
            id: maxId(state.resourceViews) + 1,
            studentId: action.studentId,
            resourceId: action.resourceId,
            completed: action.completed,
            viewedAt: new Date().toISOString(),
          },
        ],
      }
    }

    case 'ADD_STUDY':
      return {
        ...state,
        studySessions: [
          ...state.studySessions,
          {
            id: maxId(state.studySessions) + 1,
            studentId: action.studentId,
            topicId: action.topicId,
            minutes: action.minutes,
            studiedAt: new Date().toISOString(),
          },
        ],
      }

    case 'ENROLL': {
      if (state.enrollments.some((e) => e.studentId === action.studentId && e.courseId === action.courseId)) return state
      return {
        ...state,
        enrollments: [
          ...state.enrollments,
          { id: maxId(state.enrollments) + 1, studentId: action.studentId, courseId: action.courseId, enrolledAt: new Date().toISOString() },
        ],
      }
    }

    case 'UNENROLL':
      return {
        ...state,
        enrollments: state.enrollments.filter((e) => !(e.studentId === action.studentId && e.courseId === action.courseId)),
      }

    /* ------------------------------------------------ content management */
    case 'ADD_COURSE':
      return { ...state, courses: [...state.courses, action.course] }

    case 'UPDATE_COURSE':
      return { ...state, courses: state.courses.map((c) => (c.id === action.id ? { ...c, ...action.patch } : c)) }

    case 'DELETE_COURSE': {
      const topicIds = state.courses.find((c) => c.id === action.id)?.topics.map((t) => t.id) ?? []
      const resourceIds = state.courses.find((c) => c.id === action.id)?.topics.flatMap((t) => t.resources.map((r) => r.id)) ?? []
      return {
        ...state,
        courses: state.courses.filter((c) => c.id !== action.id),
        enrollments: state.enrollments.filter((e) => e.courseId !== action.id),
        attempts: state.attempts.filter((a) => !topicIds.includes(a.topicId)),
        resourceViews: state.resourceViews.filter((v) => !resourceIds.includes(v.resourceId)),
        studySessions: state.studySessions.filter((s) => !topicIds.includes(s.topicId)),
      }
    }

    case 'ADD_TOPIC':
      return {
        ...state,
        courses: state.courses.map((c) =>
          c.id === action.courseId
            ? { ...c, topics: [...c.topics, action.topic] }
            : c,
        ),
      }

    case 'UPDATE_TOPIC':
      return {
        ...state,
        courses: state.courses.map((c) => ({
          ...c,
          topics: c.topics.map((t) => (t.id === action.id ? { ...t, ...action.patch } : t)),
        })),
      }

    case 'DELETE_TOPIC':
      return {
        ...state,
        courses: state.courses.map((c) => ({ ...c, topics: c.topics.filter((t) => t.id !== action.id) })),
        attempts: state.attempts.filter((a) => a.topicId !== action.id),
        studySessions: state.studySessions.filter((s) => s.topicId !== action.id),
        resourceViews: state.resourceViews.filter((v) => !action.resourceIds.includes(v.resourceId)),
      }

    case 'REORDER_TOPICS':
      return {
        ...state,
        courses: state.courses.map((c) =>
          c.id === action.courseId
            ? { ...c, topics: action.ids.map((id, i) => ({ ...c.topics.find((t) => t.id === id), position: i + 1 })).filter(Boolean) }
            : c,
        ),
      }

    case 'ADD_RESOURCE':
      return {
        ...state,
        courses: state.courses.map((c) => ({
          ...c,
          topics: c.topics.map((t) => (t.id === action.topicId ? { ...t, resources: [...t.resources, action.resource] } : t)),
        })),
      }

    case 'UPDATE_RESOURCE':
      return {
        ...state,
        courses: state.courses.map((c) => ({
          ...c,
          topics: c.topics.map((t) => ({
            ...t,
            resources: t.resources.map((r) => (r.id === action.id ? { ...r, ...action.patch } : r)),
          })),
        })),
      }

    case 'DELETE_RESOURCE':
      return {
        ...state,
        courses: state.courses.map((c) => ({
          ...c,
          topics: c.topics.map((t) => ({ ...t, resources: t.resources.filter((r) => r.id !== action.id) })),
        })),
        resourceViews: state.resourceViews.filter((v) => v.resourceId !== action.id),
      }

    case 'ADD_QUESTION':
      return {
        ...state,
        courses: state.courses.map((c) => ({
          ...c,
          topics: c.topics.map((t) => (t.id === action.topicId ? { ...t, questions: [...t.questions, action.question] } : t)),
        })),
      }

    case 'UPDATE_QUESTION':
      return {
        ...state,
        courses: state.courses.map((c) => ({
          ...c,
          topics: c.topics.map((t) => ({
            ...t,
            questions: t.questions.map((q) => (q.id === action.id ? { ...q, ...action.patch } : q)),
          })),
        })),
      }

    case 'DELETE_QUESTION':
      return {
        ...state,
        courses: state.courses.map((c) => ({
          ...c,
          topics: c.topics.map((t) => ({ ...t, questions: t.questions.filter((q) => q.id !== action.id) })),
        })),
        attempts: state.attempts.map((a) => ({ ...a, answers: a.answers.filter((x) => x.questionId !== action.id) })),
      }

    default:
      return state
  }
}

const StoreContext = createContext(null)

export function StoreProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, undefined, loadState)
  const [userId, setUserId] = useState(() => {
    try { return Number(localStorage.getItem(SESSION_KEY)) || null } catch { return null }
  })
  const [theme, setTheme] = useState(() => {
    try { return localStorage.getItem(THEME_KEY) || 'dark' } catch { return 'dark' }
  })
  const [toasts, setToasts] = useState([])
  const undoRef = useRef(null)
  const toastId = useRef(1)

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)) } catch { /* storage full or blocked */ }
  }, [state])

  useEffect(() => {
    try {
      if (userId) localStorage.setItem(SESSION_KEY, String(userId))
      else localStorage.removeItem(SESSION_KEY)
    } catch { /* ignore */ }
  }, [userId])

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    try { localStorage.setItem(THEME_KEY, theme) } catch { /* ignore */ }
  }, [theme])

  const user = useMemo(() => state.users.find((u) => u.id === userId) ?? null, [state.users, userId])

  useEffect(() => {
    if (userId && !user) setUserId(null)
  }, [userId, user])

  const dismissToast = useCallback((id) => setToasts((t) => t.filter((x) => x.id !== id)), [])

  const toast = useCallback((message, { tone = 'info', action = null, duration = 4200 } = {}) => {
    const id = toastId.current++
    setToasts((t) => [...t.slice(-3), { id, message, tone, action }])
    if (duration) setTimeout(() => dismissToast(id), duration)
    return id
  }, [dismissToast])

  /** Snapshot before a destructive change so the toast can undo it. */
  const withUndo = useCallback((label, fn) => {
    undoRef.current = clone(state)
    fn()
    toast(label, {
      tone: 'warn',
      duration: 7000,
      action: {
        label: 'Undo',
        run: () => {
          if (undoRef.current) {
            dispatch({ type: 'RESTORE', snapshot: undoRef.current })
            undoRef.current = null
            toast('Change undone', { tone: 'success' })
          }
        },
      },
    })
  }, [state, toast])

  /* ------------------------------------------------------------- auth */
  const login = useCallback((email, password) => {
    const found = state.users.find((u) => u.email.toLowerCase() === String(email).trim().toLowerCase())
    if (!found) return { ok: false, error: 'No account found with this email address.' }
    if (found.password !== password) return { ok: false, error: 'Incorrect password. Please try again.' }
    setUserId(found.id)
    return { ok: true, user: found }
  }, [state.users])

  const logout = useCallback(() => { setUserId(null); toast('Signed out successfully', { tone: 'info' }) }, [toast])

  /* -------------------------------------------------------- learning */
  const submitQuiz = useCallback((topicId, answers, durationSec) => {
    const topic = state.courses.flatMap((c) => c.topics).find((t) => t.id === topicId)
    if (!topic || !user) return null
    const total = topic.questions.reduce((s, q) => s + (q.marks || 1), 0)
    const graded = topic.questions.map((q) => ({
      questionId: q.id,
      chosen: answers[q.id] ?? '',
      isCorrect: answers[q.id] === q.correct,
    }))
    const score = graded.reduce((s, a) => {
      const q = topic.questions.find((x) => x.id === a.questionId)
      return s + (a.isCorrect ? (q.marks || 1) : 0)
    }, 0)
    const attempt = {
      id: maxId(state.attempts) + 1,
      studentId: user.id,
      quizId: topicId,
      topicId,
      courseId: state.courses.find((c) => c.topics.some((t) => t.id === topicId))?.id ?? 0,
      score, total,
      percentage: total ? Math.round((score / total) * 1000) / 10 : 0,
      durationSec,
      finishedAt: new Date().toISOString(),
      answers: graded,
    }
    dispatch({ type: 'ADD_ATTEMPT', attempt })
    return attempt
  }, [state.attempts, state.courses, user])

  const setResourceCompleted = useCallback((resourceId, completed) => {
    if (!user) return
    dispatch({ type: 'SET_RESOURCE_VIEW', studentId: user.id, resourceId, completed })
  }, [user])

  const logStudy = useCallback((topicId, minutes) => {
    if (!user || minutes <= 0) return
    dispatch({ type: 'ADD_STUDY', studentId: user.id, topicId, minutes })
    toast(`${minutes} minutes logged`, { tone: 'success' })
  }, [user, toast])

  const enroll = useCallback((courseId) => {
    if (!user) return
    dispatch({ type: 'ENROLL', studentId: user.id, courseId })
    toast('Enrolled in course', { tone: 'success' })
  }, [user, toast])

  /* ------------------------------------------------- admin content CRUD */
  const nextIds = useMemo(() => ({
    course: maxId(state.courses) + 1,
    topic: Math.max(0, ...state.courses.flatMap((c) => c.topics.map((t) => t.id))) + 1,
    resource: Math.max(0, ...state.courses.flatMap((c) => c.topics.flatMap((t) => t.resources.map((r) => r.id)))) + 1,
    question: Math.max(0, ...state.courses.flatMap((c) => c.topics.flatMap((t) => t.questions.map((q) => q.id)))) + 1,
  }), [state.courses])

  const addCourse = useCallback((data) => {
    const course = { id: nextIds.course, topics: [], tone: 'cyan', credits: 3, semester: 'V', instructor: '', code: `CS-${200 + nextIds.course}`, ...data }
    dispatch({ type: 'ADD_COURSE', course })
    toast(`Course “${course.title}” created`, { tone: 'success' })
    return course
  }, [nextIds.course, toast])

  const updateCourse = useCallback((id, patch) => {
    dispatch({ type: 'UPDATE_COURSE', id, patch })
    toast('Course updated', { tone: 'success' })
  }, [toast])

  const deleteCourse = useCallback((id) => {
    const title = state.courses.find((c) => c.id === id)?.title ?? 'Course'
    withUndo(`Deleted “${title}” and all its records`, () => dispatch({ type: 'DELETE_COURSE', id }))
  }, [state.courses, withUndo])

  const addTopic = useCallback((courseId, data) => {
    const topic = {
      id: nextIds.topic, name: '', description: '', difficulty: 1,
      position: (state.courses.find((c) => c.id === courseId)?.topics.length ?? 0) + 1,
      estMinutes: 45, resources: [], questions: [], ...data,
    }
    dispatch({ type: 'ADD_TOPIC', courseId, topic })
    toast(`Topic “${topic.name}” added`, { tone: 'success' })
    return topic
  }, [nextIds.topic, state.courses, toast])

  const updateTopic = useCallback((id, patch) => {
    dispatch({ type: 'UPDATE_TOPIC', id, patch })
    toast('Topic updated', { tone: 'success' })
  }, [toast])

  const deleteTopic = useCallback((id) => {
    const topic = state.courses.flatMap((c) => c.topics).find((t) => t.id === id)
    withUndo(`Deleted topic “${topic?.name ?? id}”`, () =>
      dispatch({ type: 'DELETE_TOPIC', id, resourceIds: topic?.resources.map((r) => r.id) ?? [] }))
  }, [state.courses, withUndo])

  const reorderTopics = useCallback((courseId, ids) => dispatch({ type: 'REORDER_TOPICS', courseId, ids }), [])

  const addResource = useCallback((topicId, data) => {
    const resource = { id: nextIds.resource, title: '', description: '', rtype: 'article', difficulty: 1, minutes: 15, url: '', ...data }
    dispatch({ type: 'ADD_RESOURCE', topicId, resource })
    toast(`Resource “${resource.title}” added`, { tone: 'success' })
    return resource
  }, [nextIds.resource, toast])

  const updateResource = useCallback((id, patch) => {
    dispatch({ type: 'UPDATE_RESOURCE', id, patch })
    toast('Resource updated', { tone: 'success' })
  }, [toast])

  const deleteResource = useCallback((id) => {
    const r = state.courses.flatMap((c) => c.topics.flatMap((t) => t.resources)).find((x) => x.id === id)
    withUndo(`Deleted resource “${r?.title ?? id}”`, () => dispatch({ type: 'DELETE_RESOURCE', id }))
  }, [state.courses, withUndo])

  const addQuestion = useCallback((topicId, data) => {
    const question = { id: nextIds.question, text: '', options: { a: '', b: '', c: '', d: '' }, correct: 'a', marks: 1, explain: '', ...data }
    dispatch({ type: 'ADD_QUESTION', topicId, question })
    toast('Question added to quiz', { tone: 'success' })
    return question
  }, [nextIds.question, toast])

  const updateQuestion = useCallback((id, patch) => {
    dispatch({ type: 'UPDATE_QUESTION', id, patch })
    toast('Question updated', { tone: 'success' })
  }, [toast])

  const deleteQuestion = useCallback((id) => {
    withUndo('Question removed from quiz', () => dispatch({ type: 'DELETE_QUESTION', id }))
  }, [withUndo])

  const resetDemo = useCallback(() => {
    withUndo('Demo data restored to the original seed', () => dispatch({ type: 'RESET' }))
  }, [withUndo])

  const value = useMemo(() => ({
    state, dispatch, user, theme, setTheme, toasts, toast, dismissToast,
    login, logout, submitQuiz, setResourceCompleted, logStudy, enroll,
    addCourse, updateCourse, deleteCourse,
    addTopic, updateTopic, deleteTopic, reorderTopics,
    addResource, updateResource, deleteResource,
    addQuestion, updateQuestion, deleteQuestion,
    resetDemo, nextIds,
    updateProfile: (patch) => { dispatch({ type: 'UPDATE_PROFILE', id: user?.id, patch }); toast('Profile updated', { tone: 'success' }) },
  }), [
    state, user, theme, toasts, toast, dismissToast, login, logout, submitQuiz,
    setResourceCompleted, logStudy, enroll, addCourse, updateCourse, deleteCourse, addTopic,
    updateTopic, deleteTopic, reorderTopics, addResource, updateResource, deleteResource,
    addQuestion, updateQuestion, deleteQuestion, resetDemo, nextIds,
  ])

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

export function useStore() {
  const ctx = useContext(StoreContext)
  if (!ctx) throw new Error('useStore must be used inside StoreProvider')
  return ctx
}