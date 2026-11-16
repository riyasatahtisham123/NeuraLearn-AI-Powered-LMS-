import { useMemo, useState } from 'react'
import {
  FolderTree, Plus, Pencil, Trash2, BookOpen, Layers, FileText, Video, FileDown,
  Dumbbell, HelpCircle, GripVertical, Save, X, SearchX, Filter, ExternalLink,
  ClipboardList, CheckCircle2, AlertTriangle, ChevronRight, Copy, Eye,
} from 'lucide-react'
import { useStore } from '../../lib/store.jsx'
import { flattenTopics, flattenResources } from '../../lib/ai.js'
import { LEVELS, RESOURCE_TYPES } from '../../data/content.js'
import {
  PageHead, Panel, Kpi, Chip, Empty, SearchBox, Tabs, Modal, Field, ConfirmDialog,
  DifficultyChip, Banner, StatLine,
} from '../../components/ui.jsx'

const TYPE_ICON = { article: FileText, video: Video, pdf: FileDown, practice: Dumbbell }
const TONES = ['cyan', 'violet', 'magenta', 'lime', 'amber', 'rose']
const BLANK_COURSE = { title: '', code: '', description: '', tone: 'cyan', credits: 3, semester: 'V', instructor: '' }
const BLANK_TOPIC = { name: '', description: '', difficulty: 1, estMinutes: 45 }
const BLANK_RESOURCE = { title: '', description: '', rtype: 'article', difficulty: 1, minutes: 15, url: '' }
const BLANK_QUESTION = { text: '', options: { a: '', b: '', c: '', d: '' }, correct: 'a', marks: 1, explain: '' }

export default function ContentManager() {
  const {
    state, toast, addCourse, updateCourse, deleteCourse,
    addTopic, updateTopic, deleteTopic, reorderTopics,
    addResource, updateResource, deleteResource,
    addQuestion, updateQuestion, deleteQuestion,
  } = useStore()

  const [courseId, setCourseId] = useState(state.courses[0]?.id ?? null)
  const [tab, setTab] = useState('topics')
  const [q, setQ] = useState('')
  const [topicFilter, setTopicFilter] = useState('all')
  const [dragId, setDragId] = useState(null)
  const [overId, setOverId] = useState(null)

  const [courseModal, setCourseModal] = useState(null)
  const [topicModal, setTopicModal] = useState(null)
  const [resourceModal, setResourceModal] = useState(null)
  const [questionModal, setQuestionModal] = useState(null)
  const [confirm, setConfirm] = useState(null)
  const [errors, setErrors] = useState({})
  const [preview, setPreview] = useState(null)

  const course = state.courses.find((c) => c.id === courseId) ?? null
  const allTopics = useMemo(() => flattenTopics(state.courses), [state.courses])
  const allResources = useMemo(() => flattenResources(state.courses), [state.courses])
  const questionCount = allTopics.reduce((s, t) => s + t.questions.length, 0)

  const topics = useMemo(() => {
    if (!course) return []
    let list = course.topics.slice().sort((a, b) => a.position - b.position)
    if (q.trim()) {
      const t = q.trim().toLowerCase()
      list = list.filter((x) => `${x.name} ${x.description}`.toLowerCase().includes(t))
    }
    return list
  }, [course, q])

  const resources = useMemo(() => {
    if (!course) return []
    let list = course.topics.flatMap((t) => t.resources.map((r) => ({ ...r, topicId: t.id, topicName: t.name })))
    if (topicFilter !== 'all') list = list.filter((r) => r.topicId === Number(topicFilter))
    if (q.trim()) {
      const t = q.trim().toLowerCase()
      list = list.filter((r) => `${r.title} ${r.description} ${r.topicName}`.toLowerCase().includes(t))
    }
    return list
  }, [course, topicFilter, q])

  const questions = useMemo(() => {
    if (!course) return []
    let list = course.topics.flatMap((t) => t.questions.map((x) => ({ ...x, topicId: t.id, topicName: t.name })))
    if (topicFilter !== 'all') list = list.filter((x) => x.topicId === Number(topicFilter))
    if (q.trim()) {
      const t = q.trim().toLowerCase()
      list = list.filter((x) => `${x.text} ${x.topicName} ${Object.values(x.options).join(' ')}`.toLowerCase().includes(t))
    }
    return list
  }, [course, topicFilter, q])

  const openCourse = (c) => { setErrors({}); setCourseModal(c ? { mode: 'edit', id: c.id, data: { ...BLANK_COURSE, ...c } } : { mode: 'new', data: { ...BLANK_COURSE, code: `CS-${200 + state.courses.length + 1}` } }) }
  const openTopic = (t) => { setErrors({}); setTopicModal(t ? { mode: 'edit', id: t.id, data: { ...BLANK_TOPIC, ...t } } : { mode: 'new', data: { ...BLANK_TOPIC } }) }
  const openResource = (r, topicId) => { setErrors({}); setResourceModal(r ? { mode: 'edit', id: r.id, data: { ...BLANK_RESOURCE, ...r } } : { mode: 'new', topicId: topicId ?? course?.topics[0]?.id, data: { ...BLANK_RESOURCE } }) }
  const openQuestion = (x, topicId) => {
    setErrors({})
    setQuestionModal(x
      ? { mode: 'edit', id: x.id, data: { ...BLANK_QUESTION, ...x, options: { ...x.options } } }
      : { mode: 'new', topicId: topicId ?? course?.topics[0]?.id, data: { ...BLANK_QUESTION, options: { ...BLANK_QUESTION.options } } })
  }

  const saveCourse = (e) => {
    e.preventDefault()
    const d = courseModal.data
    const errs = {}
    if (!d.title.trim()) errs.title = 'Course title is required.'
    if (!d.code.trim()) errs.code = 'Course code is required.'
    else if (state.courses.some((c) => c.id !== courseModal.id && c.code.toLowerCase() === d.code.trim().toLowerCase())) errs.code = 'This code is already used.'
    setErrors(errs)
    if (Object.keys(errs).length) return
    const patch = { ...d, title: d.title.trim(), code: d.code.trim().toUpperCase(), description: d.description.trim(), instructor: d.instructor.trim(), credits: Number(d.credits) || 3 }
    if (courseModal.mode === 'new') {
      const created = addCourse(patch)
      setCourseId(created.id)
    } else updateCourse(courseModal.id, patch)
    setCourseModal(null)
  }

  const saveTopic = (e) => {
    e.preventDefault()
    const d = topicModal.data
    const errs = {}
    if (!d.name.trim()) errs.name = 'Topic name is required.'
    setErrors(errs)
    if (Object.keys(errs).length) return
    const patch = { ...d, name: d.name.trim(), description: d.description.trim(), difficulty: Number(d.difficulty), estMinutes: Number(d.estMinutes) || 45 }
    if (topicModal.mode === 'new') addTopic(courseId, patch)
    else updateTopic(topicModal.id, patch)
    setTopicModal(null)
  }

  const saveResource = (e) => {
    e.preventDefault()
    const d = resourceModal.data
    const errs = {}
    if (!d.title.trim()) errs.title = 'Resource title is required.'
    if (!resourceModal.topicId) errs.topicId = 'Choose a topic.'
    if (d.url.trim() && !/^https?:\/\/.+/i.test(d.url.trim())) errs.url = 'Use a full http(s) URL or leave it blank.'
    setErrors(errs)
    if (Object.keys(errs).length) return
    const patch = { ...d, title: d.title.trim(), description: d.description.trim(), url: d.url.trim(), rtype: d.rtype, difficulty: Number(d.difficulty), minutes: Number(d.minutes) || 15 }
    if (resourceModal.mode === 'new') addResource(resourceModal.topicId, patch)
    else updateResource(resourceModal.id, patch)
    setResourceModal(null)
  }

  const saveQuestion = (e) => {
    e.preventDefault()
    const d = questionModal.data
    const errs = {}
    if (!d.text.trim()) errs.text = 'Question text is required.'
    if (!questionModal.topicId) errs.topicId = 'Choose a topic.'
    const filled = Object.entries(d.options).filter(([, v]) => v.trim()).length
    if (filled < 2) errs.options = 'Provide at least two options.'
    if (!d.options[d.correct]?.trim()) errs.correct = 'The correct option must have text.'
    setErrors(errs)
    if (Object.keys(errs).length) return
    const patch = {
      ...d, text: d.text.trim(), explain: d.explain.trim(), marks: Number(d.marks) || 1,
      options: Object.fromEntries(Object.entries(d.options).map(([k, v]) => [k, v.trim()])),
    }
    if (questionModal.mode === 'new') addQuestion(questionModal.topicId, patch)
    else updateQuestion(questionModal.id, patch)
    setQuestionModal(null)
  }

  const onDrop = (targetId) => {
    if (dragId == null || dragId === targetId || !course) { setDragId(null); setOverId(null); return }
    const ids = course.topics.slice().sort((a, b) => a.position - b.position).map((t) => t.id)
    const from = ids.indexOf(dragId)
    const to = ids.indexOf(targetId)
    ids.splice(to, 0, ids.splice(from, 1)[0])
    reorderTopics(course.id, ids)
    toast('Topic order updated', { tone: 'success' })
    setDragId(null)
    setOverId(null)
  }

  const duplicateTopic = (t) => {
    const copy = addTopic(courseId, { name: `${t.name} (copy)`, description: t.description, difficulty: t.difficulty, estMinutes: t.estMinutes })
    t.resources.forEach((r) => addResource(copy.id, { title: r.title, description: r.description, rtype: r.rtype, difficulty: r.difficulty, minutes: r.minutes, url: r.url }))
    t.questions.forEach((x) => addQuestion(copy.id, { text: x.text, options: { ...x.options }, correct: x.correct, marks: x.marks, explain: x.explain }))
    toast(`Duplicated “${t.name}” with ${t.resources.length} resources and ${t.questions.length} questions`, { tone: 'success' })
  }

  const set = (setter) => (k, v) => setter((m) => ({ ...m, data: { ...m.data, [k]: v } }))
  const setCourse = set(setCourseModal)
  const setTopic = set(setTopicModal)
  const setResource = set(setResourceModal)
  const setQuestion = set(setQuestionModal)

  return (
    <>
      <PageHead eyebrow="Management" title="Content Manager"
        subtitle="Full control of the catalogue: courses, topics, learning resources and quiz questions. Every change is saved immediately and feeds the AI module — deleting a topic also removes its attempts, study sessions and resource records."
        actions={<button className="btn btn-primary" onClick={() => openCourse(null)}><Plus /> New course</button>} />

      <div className="grid g4 mb16">
        <Kpi label="Courses" value={state.courses.length} icon={BookOpen} tone="cyan" delay={40} />
        <Kpi label="Topics" value={allTopics.length} icon={Layers} tone="violet" delay={80} />
        <Kpi label="Resources" value={allResources.length} icon={FileText} tone="magenta" delay={120} />
        <Kpi label="Questions" value={questionCount} icon={HelpCircle} tone="amber" delay={160}
          foot={<>{allTopics.length} quizzes · one per topic</>} />
      </div>

      {state.courses.length === 0 ? (
        <Panel className="reveal">
          <Empty icon={FolderTree} title="The catalogue is empty"
            action={<button className="btn btn-primary mt12" onClick={() => openCourse(null)}><Plus /> Create the first course</button>}>
            Add a course, then topics, resources and quiz questions inside it.
          </Empty>
        </Panel>
      ) : (
        <div className="grid g-side">
          <Panel title="Courses" icon={BookOpen} className="reveal reveal-1" bodyClass="tight"
            actions={<button className="btn btn-sm btn-outline" onClick={() => openCourse(null)}><Plus /> Add</button>}>
            <div className="col gap8">
              {state.courses.map((c) => {
                const active = c.id === courseId
                const resCount = c.topics.reduce((s, t) => s + t.resources.length, 0)
                const qCount = c.topics.reduce((s, t) => s + t.questions.length, 0)
                return (
                  <button key={c.id} onClick={() => { setCourseId(c.id); setQ(''); setTopicFilter('all') }}
                    className="resource" aria-pressed={active}
                    style={{
                      cursor: 'pointer', textAlign: 'left', width: '100%',
                      borderColor: active ? 'var(--brand-3)' : undefined,
                      background: active ? 'color-mix(in srgb, var(--brand-2) 14%, transparent)' : undefined,
                    }}>
                    <span className={`resource-icon ${c.tone === 'cyan' ? 'article' : c.tone === 'magenta' ? 'video' : c.tone === 'lime' ? 'practice' : 'pdf'}`}><BookOpen /></span>
                    <span className="resource-text">
                      <b>{c.title}</b>
                      <span>{c.code} · {c.topics.length} topics · {resCount} resources · {qCount} questions</span>
                    </span>
                    <ChevronRight size={15} style={{ color: active ? 'var(--brand-3)' : 'var(--text-4)', flex: 'none' }} />
                  </button>
                )
              })}
            </div>
          </Panel>

          <div className="col gap16">
            {!course ? (
              <Panel className="reveal reveal-2"><Empty icon={BookOpen} title="Select a course">Choose a course from the list to manage its content.</Empty></Panel>
            ) : (
              <>
                <Panel className="reveal reveal-2" bodyClass="tight">
                  <div className="row-between wrap gap12">
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div className="row gap8 wrap mb8">
                        <span className={`chip chip-${course.tone}`}>{course.code}</span>
                        <Chip tone="slate">Semester {course.semester}</Chip>
                        <Chip tone="slate">{course.credits} credits</Chip>
                      </div>
                      <h2 style={{ fontSize: 20 }}>{course.title}</h2>
                      <p className="muted mt4" style={{ fontSize: 12.5, lineHeight: 1.6 }}>{course.description || 'No description yet.'}</p>
                      <p className="field-hint mt8">Instructor: <b style={{ color: 'var(--text-2)' }}>{course.instructor || '—'}</b></p>
                    </div>
                    <div className="row gap8">
                      <button className="btn btn-sm btn-outline" onClick={() => openCourse(course)}><Pencil /> Edit course</button>
                      <button className="btn btn-sm btn-danger" onClick={() => setConfirm({
                        title: `Delete “${course.title}”?`,
                        message: `This removes ${course.topics.length} topics, ${course.topics.reduce((s, t) => s + t.resources.length, 0)} resources, ${course.topics.reduce((s, t) => s + t.questions.length, 0)} questions, and every enrolment, attempt, study session and resource record attached to them.`,
                        label: 'Delete course',
                        run: () => { deleteCourse(course.id); setCourseId(state.courses.find((c) => c.id !== course.id)?.id ?? null) },
                      })}><Trash2 /> Delete</button>
                    </div>
                  </div>
                </Panel>

                <Panel className="reveal reveal-3" bodyClass="tight">
                  <Tabs value={tab} onChange={(v) => { setTab(v); setQ('') }} tabs={[
                    { value: 'topics', label: 'Topics', icon: Layers, count: course.topics.length },
                    { value: 'resources', label: 'Resources', icon: FileText, count: course.topics.reduce((s, t) => s + t.resources.length, 0) },
                    { value: 'questions', label: 'Questions', icon: HelpCircle, count: course.topics.reduce((s, t) => s + t.questions.length, 0) },
                  ]} />
                  <div className="filter-bar" style={{ marginBottom: 0 }}>
                    <SearchBox value={q} onChange={setQ} placeholder={`Search ${tab}…`} />
                    {tab !== 'topics' && (
                      <select className="select" value={topicFilter} onChange={(e) => setTopicFilter(e.target.value)} aria-label="Filter by topic">
                        <option value="all">All topics</option>
                        {course.topics.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                      </select>
                    )}
                    <button className="btn btn-sm btn-primary" style={{ marginLeft: 'auto' }}
                      onClick={() => tab === 'topics' ? openTopic(null) : tab === 'resources' ? openResource(null) : openQuestion(null)}
                      disabled={tab !== 'topics' && course.topics.length === 0}>
                      <Plus /> Add {tab === 'topics' ? 'topic' : tab === 'resources' ? 'resource' : 'question'}
                    </button>
                  </div>
                  {tab !== 'topics' && course.topics.length === 0 && (
                    <p className="field-hint mt12" style={{ color: 'var(--warn)' }}>Add a topic first — resources and questions belong to a topic.</p>
                  )}
                </Panel>

                {tab === 'topics' && (
                  <Panel title="Topics" icon={Layers} className="reveal reveal-4"
                    eyebrow="Drag the handle to reorder · order drives the course page"
                    actions={<span className="muted mono" style={{ fontSize: 11 }}>{topics.length} shown</span>}>
                    {topics.length === 0 ? (
                      <Empty icon={SearchX} title={q ? 'No topics match this search' : 'No topics in this course'}
                        action={q ? <button className="btn btn-sm btn-outline mt12" onClick={() => setQ('')}><Filter /> Clear search</button>
                          : <button className="btn btn-sm btn-primary mt12" onClick={() => openTopic(null)}><Plus /> Add the first topic</button>} />
                    ) : (
                      <div className="col gap8">
                        {topics.map((t, i) => (
                          <div key={t.id}
                            className={`resource ${dragId === t.id ? 'dragging' : ''} ${overId === t.id && dragId !== t.id ? 'drop-target' : ''}`}
                            onDragOver={(e) => { e.preventDefault(); setOverId(t.id) }}
                            onDragLeave={() => setOverId((o) => (o === t.id ? null : o))}
                            onDrop={() => onDrop(t.id)}
                            style={{ alignItems: 'flex-start' }}>
                            <span className="drag-handle" draggable title="Drag to reorder"
                              onDragStart={() => setDragId(t.id)} onDragEnd={() => { setDragId(null); setOverId(null) }}>
                              <GripVertical size={15} />
                            </span>
                            <span className="topic-index">{String(i + 1).padStart(2, '0')}</span>
                            <span className="resource-text">
                              <b>{t.name}</b>
                              <span>{t.description || 'No description.'}</span>
                              <span className="row gap6 wrap mt8">
                                <DifficultyChip level={t.difficulty} />
                                <Chip tone="slate">{t.resources.length} resources</Chip>
                                <Chip tone="slate">{t.questions.length} questions</Chip>
                                <Chip tone="slate">~{t.estMinutes} min</Chip>
                                <Chip tone="cyan">{state.attempts.filter((a) => a.topicId === t.id).length} attempts</Chip>
                              </span>
                            </span>
                            <span className="resource-actions">
                              <button className="btn btn-sm btn-ghost btn-icon" title="Preview quiz" onClick={() => setPreview(t)}><Eye /></button>
                              <button className="btn btn-sm btn-ghost btn-icon" title="Duplicate topic" onClick={() => duplicateTopic(t)}><Copy /></button>
                              <button className="btn btn-sm btn-outline btn-icon" title="Edit topic" onClick={() => openTopic(t)}><Pencil /></button>
                              <button className="btn btn-sm btn-danger btn-icon" title="Delete topic" onClick={() => setConfirm({
                                title: `Delete topic “${t.name}”?`,
                                message: `Removes ${t.resources.length} resources and ${t.questions.length} questions, plus ${state.attempts.filter((a) => a.topicId === t.id).length} quiz attempts and all study sessions recorded against this topic.`,
                                label: 'Delete topic', run: () => deleteTopic(t.id),
                              })}><Trash2 /></button>
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </Panel>
                )}

                {tab === 'resources' && (
                  <Panel title="Learning resources" icon={FileText} className="reveal reveal-4"
                    actions={<span className="muted mono" style={{ fontSize: 11 }}>{resources.length} shown</span>}>
                    {resources.length === 0 ? (
                      <Empty icon={SearchX} title={q || topicFilter !== 'all' ? 'No resources match this filter' : 'No resources yet'}
                        action={<button className="btn btn-sm btn-outline mt12" onClick={() => { setQ(''); setTopicFilter('all') }}><Filter /> Reset filters</button>} />
                    ) : (
                      <div className="table-wrap">
                        <table className="tbl">
                          <thead>
                            <tr><th>Resource</th><th>Topic</th><th>Type</th><th>Difficulty</th><th className="num">Minutes</th><th className="num">Completions</th><th>Link</th><th></th></tr>
                          </thead>
                          <tbody>
                            {resources.map((r) => {
                              const Icon = TYPE_ICON[r.rtype] ?? FileText
                              return (
                                <tr key={r.id}>
                                  <td>
                                    <span className="row gap10">
                                      <span className={`resource-icon ${r.rtype}`} style={{ width: 28, height: 28 }}><Icon /></span>
                                      <span style={{ minWidth: 0 }}>
                                        <b style={{ fontSize: 12.6, display: 'block' }}>{r.title}</b>
                                        <span className="muted" style={{ fontSize: 11, display: 'block', maxWidth: 340, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.description}</span>
                                      </span>
                                    </span>
                                  </td>
                                  <td><Chip tone="slate">{r.topicName}</Chip></td>
                                  <td><Chip tone={RESOURCE_TYPES[r.rtype]?.tone ?? 'slate'}>{RESOURCE_TYPES[r.rtype]?.label ?? r.rtype}</Chip></td>
                                  <td><DifficultyChip level={r.difficulty} /></td>
                                  <td className="num">{r.minutes}</td>
                                  <td className="num">{state.resourceViews.filter((v) => v.resourceId === r.id && v.completed).length}</td>
                                  <td>{r.url ? <a className="btn btn-sm btn-ghost btn-icon" href={r.url} target="_blank" rel="noreferrer noopener" title={r.url}><ExternalLink /></a> : <span className="muted">—</span>}</td>
                                  <td>
                                    <span className="row gap6">
                                      <button className="btn btn-sm btn-outline btn-icon" title="Edit resource" onClick={() => openResource(r, r.topicId)}><Pencil /></button>
                                      <button className="btn btn-sm btn-danger btn-icon" title="Delete resource" onClick={() => setConfirm({
                                        title: `Delete “${r.title}”?`,
                                        message: 'The resource is removed from the library and from every learner’s completion record. The recommender will stop ranking it.',
                                        label: 'Delete resource', run: () => deleteResource(r.id),
                                      })}><Trash2 /></button>
                                    </span>
                                  </td>
                                </tr>
                              )
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </Panel>
                )}

                {tab === 'questions' && (
                  <Panel title="Quiz questions" icon={HelpCircle} className="reveal reveal-4"
                    eyebrow="One quiz per topic · every question is graded immediately on submission"
                    actions={<span className="muted mono" style={{ fontSize: 11 }}>{questions.length} shown</span>}>
                    {questions.length === 0 ? (
                      <Empty icon={SearchX} title={q || topicFilter !== 'all' ? 'No questions match this filter' : 'No questions yet'}
                        action={<button className="btn btn-sm btn-outline mt12" onClick={() => { setQ(''); setTopicFilter('all') }}><Filter /> Reset filters</button>} />
                    ) : (
                      <div className="col gap10">
                        {questions.map((x, i) => (
                          <div className="q-card" key={x.id} style={{ padding: 15 }}>
                            <div className="row-between wrap gap8 mb8">
                              <span className="row gap8">
                                <span className="q-num">Q{i + 1} · id {x.id}</span>
                                <Chip tone="slate">{x.topicName}</Chip>
                                <Chip tone="cyan">{x.marks} mark{x.marks === 1 ? '' : 's'}</Chip>
                              </span>
                              <span className="row gap6">
                                <button className="btn btn-sm btn-outline btn-icon" title="Edit question" onClick={() => openQuestion(x, x.topicId)}><Pencil /></button>
                                <button className="btn btn-sm btn-danger btn-icon" title="Delete question" onClick={() => setConfirm({
                                  title: 'Delete this question?',
                                  message: `“${x.text}” will be removed from the quiz and from every stored attempt answer. Existing percentages are recalculated from the remaining answers.`,
                                  label: 'Delete question', run: () => deleteQuestion(x.id),
                                })}><Trash2 /></button>
                              </span>
                            </div>
                            <p style={{ fontSize: 13.5, fontWeight: 600, lineHeight: 1.5 }}>{x.text}</p>
                            <div className="grid g2 mt12" style={{ gap: 6 }}>
                              {Object.entries(x.options).map(([k, v]) => (
                                <div key={k} className={`q-option ${k === x.correct ? 'right' : ''}`} style={{ padding: '7px 10px', cursor: 'default' }}>
                                  <span className="q-option-key" style={{ width: 21, height: 21, fontSize: 10 }}>{k.toUpperCase()}</span>
                                  <span className="q-option-text" style={{ fontSize: 12.3 }}>{v || <i className="muted">empty</i>}</span>
                                  {k === x.correct && <CheckCircle2 size={13} style={{ color: 'var(--ok)', flex: 'none' }} />}
                                </div>
                              ))}
                            </div>
                            {x.explain && <div className="q-explain"><AlertTriangle /><span>{x.explain}</span></div>}
                          </div>
                        ))}
                      </div>
                    )}
                  </Panel>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- course modal */}
      <Modal open={!!courseModal} onClose={() => setCourseModal(null)} wide
        icon={BookOpen} title={courseModal?.mode === 'new' ? 'Create a course' : 'Edit course'}
        subtitle="Courses group topics; each topic carries its own resources and quiz."
        footer={<>
          <button className="btn btn-ghost" onClick={() => setCourseModal(null)}>Cancel</button>
          <button className="btn btn-primary" type="submit" form="course-form"><Save /> {courseModal?.mode === 'new' ? 'Create course' : 'Save changes'}</button>
        </>}>
        {courseModal && (
          <form id="course-form" onSubmit={saveCourse}>
            <div className="grid g2">
              <Field label="Course title" required error={errors.title}>
                <input className="input" value={courseModal.data.title} onChange={(e) => setCourse('title', e.target.value)} placeholder="e.g. Operating Systems" />
              </Field>
              <Field label="Course code" required error={errors.code}>
                <input className="input" value={courseModal.data.code} onChange={(e) => setCourse('code', e.target.value)} placeholder="CS-204" />
              </Field>
            </div>
            <Field label="Description">
              <textarea className="input" rows={3} value={courseModal.data.description} onChange={(e) => setCourse('description', e.target.value)} placeholder="What this course covers" />
            </Field>
            <div className="grid g3">
              <Field label="Instructor">
                <input className="input" value={courseModal.data.instructor} onChange={(e) => setCourse('instructor', e.target.value)} placeholder="Faculty name" />
              </Field>
              <Field label="Semester">
                <select className="select" value={courseModal.data.semester} onChange={(e) => setCourse('semester', e.target.value)}>
                  {['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII'].map((s) => <option key={s} value={s}>Semester {s}</option>)}
                </select>
              </Field>
              <Field label="Credits">
                <input className="input" type="number" min={1} max={10} value={courseModal.data.credits} onChange={(e) => setCourse('credits', e.target.value)} />
              </Field>
            </div>
            <Field label="Accent colour" hint="Used on the course banner, chips and charts.">
              <div className="row gap8 wrap">
                {TONES.map((t) => (
                  <button key={t} type="button" onClick={() => setCourse('tone', t)} aria-pressed={courseModal.data.tone === t} aria-label={t}
                    style={{
                      width: 32, height: 32, borderRadius: 10, cursor: 'pointer', background: `var(--${t})`,
                      border: courseModal.data.tone === t ? '2px solid var(--text)' : '1px solid var(--line-2)',
                      display: 'grid', placeItems: 'center', color: '#0b1030',
                    }}>
                    {courseModal.data.tone === t && <CheckCircle2 size={15} />}
                  </button>
                ))}
              </div>
            </Field>
          </form>
        )}
      </Modal>

      {/* ----------------------------------------------------- topic modal */}
      <Modal open={!!topicModal} onClose={() => setTopicModal(null)}
        icon={Layers} title={topicModal?.mode === 'new' ? 'Add a topic' : 'Edit topic'}
        subtitle={course ? `Inside ${course.title}` : ''}
        footer={<>
          <button className="btn btn-ghost" onClick={() => setTopicModal(null)}>Cancel</button>
          <button className="btn btn-primary" type="submit" form="topic-form"><Save /> {topicModal?.mode === 'new' ? 'Add topic' : 'Save changes'}</button>
        </>}>
        {topicModal && (
          <form id="topic-form" onSubmit={saveTopic}>
            <Field label="Topic name" required error={errors.name}>
              <input className="input" value={topicModal.data.name} onChange={(e) => setTopic('name', e.target.value)} placeholder="e.g. Process Scheduling" />
            </Field>
            <Field label="Description" hint="This text is part of the TF-IDF corpus the recommender matches against.">
              <textarea className="input" rows={3} value={topicModal.data.description} onChange={(e) => setTopic('description', e.target.value)} placeholder="What the topic covers" />
            </Field>
            <div className="grid g2">
              <Field label="Difficulty">
                <select className="select" value={topicModal.data.difficulty} onChange={(e) => setTopic('difficulty', e.target.value)}>
                  {LEVELS.map((l, i) => <option key={l} value={i + 1}>{l}</option>)}
                </select>
              </Field>
              <Field label="Estimated minutes">
                <input className="input" type="number" min={5} max={600} step={5} value={topicModal.data.estMinutes} onChange={(e) => setTopic('estMinutes', e.target.value)} />
              </Field>
            </div>
            {topicModal.mode === 'new' && (
              <Banner tone="info" icon={ClipboardList} title="A quiz is created automatically">
                The topic gets its own quiz. Add questions to it from the Questions tab.
              </Banner>
            )}
          </form>
        )}
      </Modal>

      {/* -------------------------------------------------- resource modal */}
      <Modal open={!!resourceModal} onClose={() => setResourceModal(null)} wide
        icon={FileText} title={resourceModal?.mode === 'new' ? 'Add a learning resource' : 'Edit resource'}
        subtitle="Resources are vectorised with TF-IDF and ranked against each learner's gap profile."
        footer={<>
          <button className="btn btn-ghost" onClick={() => setResourceModal(null)}>Cancel</button>
          <button className="btn btn-primary" type="submit" form="resource-form"><Save /> {resourceModal?.mode === 'new' ? 'Add resource' : 'Save changes'}</button>
        </>}>
        {resourceModal && (
          <form id="resource-form" onSubmit={saveResource}>
            <Field label="Title" required error={errors.title}>
              <input className="input" value={resourceModal.data.title} onChange={(e) => setResource('title', e.target.value)} placeholder="e.g. CPU Scheduling Algorithms" />
            </Field>
            <Field label="Description" hint="Used directly by the recommender's text similarity.">
              <textarea className="input" rows={3} value={resourceModal.data.description} onChange={(e) => setResource('description', e.target.value)} placeholder="What the learner will understand after this resource" />
            </Field>
            <div className="grid g2">
              <Field label="Topic" required error={errors.topicId}>
                <select className="select" value={resourceModal.topicId ?? ''} disabled={resourceModal.mode === 'edit'}
                  onChange={(e) => setResourceModal((m) => ({ ...m, topicId: Number(e.target.value) }))}>
                  <option value="" disabled>Choose a topic</option>
                  {course?.topics.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </Field>
              <Field label="Resource type">
                <select className="select" value={resourceModal.data.rtype} onChange={(e) => setResource('rtype', e.target.value)}>
                  {Object.entries(RESOURCE_TYPES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>
              </Field>
              <Field label="Difficulty">
                <select className="select" value={resourceModal.data.difficulty} onChange={(e) => setResource('difficulty', e.target.value)}>
                  {LEVELS.map((l, i) => <option key={l} value={i + 1}>{l}</option>)}
                </select>
              </Field>
              <Field label="Duration (minutes)">
                <input className="input" type="number" min={1} max={600} value={resourceModal.data.minutes} onChange={(e) => setResource('minutes', e.target.value)} />
              </Field>
            </div>
            <Field label="External URL" error={errors.url} hint="Optional. Leave blank for offline material such as a practice sheet.">
              <input className="input" value={resourceModal.data.url} onChange={(e) => setResource('url', e.target.value)} placeholder="https://…" />
            </Field>
          </form>
        )}
      </Modal>

      {/* -------------------------------------------------- question modal */}
      <Modal open={!!questionModal} onClose={() => setQuestionModal(null)} wide
        icon={HelpCircle} title={questionModal?.mode === 'new' ? 'Add a quiz question' : 'Edit question'}
        subtitle="Four options, one correct answer. Marks feed the topic percentage."
        footer={<>
          <button className="btn btn-ghost" onClick={() => setQuestionModal(null)}>Cancel</button>
          <button className="btn btn-primary" type="submit" form="question-form"><Save /> {questionModal?.mode === 'new' ? 'Add question' : 'Save changes'}</button>
        </>}>
        {questionModal && (
          <form id="question-form" onSubmit={saveQuestion}>
            <Field label="Question text" required error={errors.text}>
              <textarea className="input" rows={2} value={questionModal.data.text} onChange={(e) => setQuestion('text', e.target.value)} placeholder="Write the question" />
            </Field>
            <div className="grid g2">
              <Field label="Topic" required error={errors.topicId}>
                <select className="select" value={questionModal.topicId ?? ''} disabled={questionModal.mode === 'edit'}
                  onChange={(e) => setQuestionModal((m) => ({ ...m, topicId: Number(e.target.value) }))}>
                  <option value="" disabled>Choose a topic</option>
                  {course?.topics.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </Field>
              <Field label="Marks">
                <input className="input" type="number" min={1} max={10} value={questionModal.data.marks} onChange={(e) => setQuestion('marks', e.target.value)} />
              </Field>
            </div>
            <Field label="Options" required error={errors.options} hint="Select the radio button next to the correct answer.">
              <div className="col gap8">
                {['a', 'b', 'c', 'd'].map((k) => (
                  <div className="row gap8" key={k}>
                    <label className="row gap6" style={{ cursor: 'pointer', flex: 'none' }} title={`Mark ${k.toUpperCase()} as correct`}>
                      <input type="radio" name="correct-option" className="check" checked={questionModal.data.correct === k}
                        onChange={() => setQuestion('correct', k)} aria-label={`Option ${k.toUpperCase()} is correct`} />
                      <span className="q-option-key">{k.toUpperCase()}</span>
                    </label>
                    <input className="input" value={questionModal.data.options[k]}
                      onChange={(e) => setQuestionModal((m) => ({ ...m, data: { ...m.data, options: { ...m.data.options, [k]: e.target.value } } }))}
                      placeholder={`Option ${k.toUpperCase()}`} />
                  </div>
                ))}
              </div>
            </Field>
            {errors.correct && <p className="field-error mb12"><AlertTriangle size={12} />{errors.correct}</p>}
            <Field label="Explanation" hint="Shown to the learner on the result review screen.">
              <textarea className="input" rows={2} value={questionModal.data.explain} onChange={(e) => setQuestion('explain', e.target.value)} placeholder="Why the correct option is right" />
            </Field>
          </form>
        )}
      </Modal>

      {/* --------------------------------------------------- quiz preview */}
      <Modal open={!!preview} onClose={() => setPreview(null)} wide icon={Eye}
        title={preview ? `Quiz preview · ${preview.name}` : ''}
        subtitle={preview ? `${preview.questions.length} questions · ${preview.questions.reduce((s, x) => s + x.marks, 0)} marks · ${preview.questions.length} minute limit` : ''}
        footer={<button className="btn btn-primary" onClick={() => setPreview(null)}>Close preview</button>}>
        {preview && (preview.questions.length === 0 ? (
          <Empty icon={HelpCircle} title="This quiz has no questions"
            action={<button className="btn btn-sm btn-primary mt12" onClick={() => { setPreview(null); setTab('questions'); openQuestion(null, preview.id) }}><Plus /> Add a question</button>} />
        ) : (
          <div className="col gap12">
            {preview.questions.map((x, i) => (
              <div className="q-card" key={x.id} style={{ padding: 15 }}>
                <span className="q-num">Question {i + 1} · {x.marks} mark{x.marks === 1 ? '' : 's'}</span>
                <p className="q-text" style={{ fontSize: 14 }}>{x.text}</p>
                <div className="q-options">
                  {Object.entries(x.options).map(([k, v]) => (
                    <div className={`q-option ${k === x.correct ? 'right' : ''}`} key={k} style={{ cursor: 'default' }}>
                      <span className="q-option-key">{k.toUpperCase()}</span>
                      <span className="q-option-text">{v}</span>
                      {k === x.correct && <CheckCircle2 size={14} style={{ color: 'var(--ok)', flex: 'none' }} />}
                    </div>
                  ))}
                </div>
                {x.explain && <div className="q-explain"><AlertTriangle /><span>{x.explain}</span></div>}
              </div>
            ))}
            <div className="rule" />
            <StatLine label="Pass mark" value="60%" />
            <StatLine label="Total marks" value={preview.questions.reduce((s, x) => s + x.marks, 0)} />
          </div>
        ))}
      </Modal>

      <ConfirmDialog open={!!confirm} onClose={() => setConfirm(null)}
        onConfirm={() => confirm?.run()} title={confirm?.title ?? ''} message={confirm?.message ?? ''}
        confirmLabel={confirm?.label ?? 'Delete'} />
    </>
  )
}