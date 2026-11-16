import { useEffect, useMemo, useRef, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, BookOpen, Library, Route as RouteIcon, Sparkles, ChartNoAxesCombined,
  User, Users, ChartPie, FolderTree, ClipboardList, LogOut, Moon, Sun, Menu, X,
  Bell, Search, ChevronRight, Settings, RotateCcw, GraduationCap, Command,
  CheckCircle2, Clock, FileText, CornerDownLeft,
} from 'lucide-react'
import { useStore } from '../lib/store.jsx'
import { PROJECT } from '../data/content.js'
import { activityFeed, flattenResources, flattenTopics, strengthsAndGaps } from '../lib/ai.js'
import { relativeTime } from '../lib/format.js'
import { Ambient, Avatar, BrandMark, Modal, Popover } from './ui.jsx'

const STUDENT_NAV = [
  { label: 'Overview', items: [{ to: '/', icon: LayoutDashboard, text: 'Dashboard', end: true }] },
  {
    label: 'Learning',
    items: [
      { to: '/courses', icon: BookOpen, text: 'My Courses' },
      { to: '/resources', icon: Library, text: 'Resource Library' },
      { to: '/learning-path', icon: RouteIcon, text: 'Learning Path' },
    ],
  },
  {
    label: 'AI Engine',
    items: [
      { to: '/recommendations', icon: Sparkles, text: 'AI Recommendations' },
      { to: '/performance', icon: ChartNoAxesCombined, text: 'Performance' },
    ],
  },
  { label: 'Account', items: [{ to: '/profile', icon: User, text: 'My Profile' }] },
]

const ADMIN_NAV = [
  { label: 'Overview', items: [{ to: '/admin', icon: LayoutDashboard, text: 'Admin Dashboard', end: true }] },
  {
    label: 'People',
    items: [
      { to: '/admin/students', icon: Users, text: 'Students' },
      { to: '/admin/analytics', icon: ChartPie, text: 'Class Analytics' },
    ],
  },
  {
    label: 'Management',
    items: [
      { to: '/admin/content', icon: FolderTree, text: 'Content Manager' },
      { to: '/admin/records', icon: ClipboardList, text: 'Quiz Records' },
    ],
  },
  { label: 'Account', items: [{ to: '/profile', icon: Settings, text: 'Settings' }] },
]

const PAGE_TITLES = {
  '/': ['Dashboard', 'Learning overview'],
  '/courses': ['My Courses', 'Learning'],
  '/resources': ['Resource Library', 'Learning'],
  '/learning-path': ['Learning Path', 'AI Engine'],
  '/recommendations': ['AI Recommendations', 'AI Engine'],
  '/performance': ['Performance', 'AI Engine'],
  '/profile': ['My Profile', 'Account'],
  '/admin': ['Admin Dashboard', 'Overview'],
  '/admin/students': ['Students', 'People'],
  '/admin/analytics': ['Class Analytics', 'People'],
  '/admin/content': ['Content Manager', 'Management'],
  '/admin/records': ['Quiz Records', 'Management'],
}

/* ------------------------------------------------------- command palette */
function CommandPalette({ open, onClose }) {
  const { state, user } = useStore()
  const navigate = useNavigate()
  const [q, setQ] = useState('')
  const [active, setActive] = useState(0)
  const inputRef = useRef(null)

  useEffect(() => {
    if (open) { setQ(''); setActive(0); setTimeout(() => inputRef.current?.focus(), 40) }
  }, [open])

  const results = useMemo(() => {
    if (!user) return []
    const isAdmin = user.role === 'admin'
    const nav = (isAdmin ? ADMIN_NAV : STUDENT_NAV).flatMap((g) => g.items)
    const out = []
    const term = q.trim().toLowerCase()
    const match = (s) => !term || String(s).toLowerCase().includes(term)

    nav.forEach((n) => { if (match(n.text)) out.push({ kind: 'Page', icon: n.icon, title: n.text, sub: 'Navigate', run: () => navigate(n.to) }) })

    if (!isAdmin) {
      flattenTopics(state.courses).forEach((t) => {
        if (match(`${t.name} ${t.courseTitle}`)) out.push({ kind: 'Topic', icon: BookOpen, title: t.name, sub: t.courseTitle, run: () => navigate(`/courses/${t.courseId}`) })
      })
      flattenResources(state.courses).forEach((r) => {
        if (match(`${r.title} ${r.topicName}`)) out.push({ kind: 'Resource', icon: FileText, title: r.title, sub: `${r.topicName} · ${r.rtype}`, run: () => navigate('/resources') })
      })
    } else {
      state.users.filter((u) => u.role === 'student').forEach((s) => {
        if (match(`${s.name} ${s.email}`)) out.push({ kind: 'Student', icon: GraduationCap, title: s.name, sub: s.email, run: () => navigate('/admin/students') })
      })
      state.courses.forEach((c) => {
        if (match(c.title)) out.push({ kind: 'Course', icon: FolderTree, title: c.title, sub: c.code, run: () => navigate('/admin/content') })
      })
    }
    return out.slice(0, 24)
  }, [q, state, user, navigate])

  useEffect(() => { setActive(0) }, [q])

  if (!open) return null

  const choose = (r) => { r.run(); onClose() }

  return (
    <Modal open={open} onClose={onClose} title="Jump to anything" subtitle="Pages, topics, resources and people" icon={Command}
      footer={<div className="row gap16" style={{ width: '100%', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-3)' }}>
        <span className="row gap6"><kbd className="term-tag">↑↓</kbd> navigate <kbd className="term-tag">↵</kbd> open <kbd className="term-tag">esc</kbd> close</span>
        <span className="mono">{results.length} results</span>
      </div>}>
      <div className="input-group mb12">
        <Search />
        <input ref={inputRef} className="input" placeholder="Search courses, topics, resources, students…"
          value={q} onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => Math.min(a + 1, results.length - 1)) }
            if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)) }
            if (e.key === 'Enter' && results[active]) { e.preventDefault(); choose(results[active]) }
          }} />
      </div>
      <div style={{ maxHeight: 340, overflowY: 'auto', display: 'grid', gap: 3 }}>
        {results.length === 0 && <p className="muted center" style={{ padding: 24, fontSize: 13 }}>No matches for “{q}”.</p>}
        {results.map((r, i) => (
          <button key={`${r.kind}-${r.title}-${i}`} className="popover-item" onMouseEnter={() => setActive(i)}
            onClick={() => choose(r)}
            style={i === active ? { background: 'var(--surface-2)', color: 'var(--text)' } : undefined}>
            <r.icon style={{ color: i === active ? 'var(--brand-3)' : undefined }} />
            <span style={{ flex: 1, minWidth: 0 }}>
              <b style={{ display: 'block', fontSize: 13, fontWeight: 600 }} className="truncate">{r.title}</b>
              <span style={{ fontSize: 11, color: 'var(--text-3)' }}>{r.sub}</span>
            </span>
            <span className="chip chip-slate" style={{ fontSize: 9.5 }}>{r.kind}</span>
            {i === active && <CornerDownLeft size={13} style={{ color: 'var(--text-3)' }} />}
          </button>
        ))}
      </div>
    </Modal>
  )
}

/* ---------------------------------------------------------------- layout */
export default function Layout() {
  const { user, state, theme, setTheme, logout, resetDemo } = useStore()
  const navigate = useNavigate()
  const location = useLocation()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [userMenu, setUserMenu] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const [paletteOpen, setPaletteOpen] = useState(false)
  const userRef = useRef(null)
  const notifRef = useRef(null)

  const isAdmin = user?.role === 'admin'
  const nav = isAdmin ? ADMIN_NAV : STUDENT_NAV

  useEffect(() => { setMobileOpen(false); setUserMenu(false); setNotifOpen(false) }, [location.pathname])

  useEffect(() => {
    const h = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setPaletteOpen((v) => !v) }
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [])

  useEffect(() => {
    const h = (e) => {
      if (userRef.current && !userRef.current.contains(e.target)) setUserMenu(false)
      if (notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false)
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  const gaps = useMemo(() => (user && !isAdmin ? strengthsAndGaps(state, user.id).gaps.length : 0), [state, user, isAdmin])
  const supportCount = useMemo(() => {
    if (!isAdmin) return 0
    return state.users.filter((u) => u.role === 'student')
      .filter((u) => { const s = strengthsAndGaps(state, u.id); return s.overall < 60 || s.gaps.length >= 4 }).length
  }, [state, isAdmin])

  const feed = useMemo(() => activityFeed(state, { studentId: isAdmin ? null : user?.id, limit: 12 }), [state, user, isAdmin])
  const unread = feed.filter((f) => Date.now() - new Date(f.at).getTime() < 3 * 86400000).length

  const [section, title] = PAGE_TITLES[location.pathname] ?? [
    location.pathname.startsWith('/quiz') ? 'Quiz' : location.pathname.startsWith('/result') ? 'Quiz Result' : location.pathname.startsWith('/courses/') ? 'Course' : 'NeuraLearn',
    'Learning',
  ]

  const badges = { '/learning-path': gaps, '/recommendations': gaps, '/admin/students': supportCount }

  return (
    <>
      <Ambient />
      <div className="shell">
        {mobileOpen && <div className="sidebar-scrim" onClick={() => setMobileOpen(false)} />}

        <aside className={`sidebar ${mobileOpen ? 'open' : ''}`}>
          <div className="sidebar-brand">
            <BrandMark />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="brand-name">{PROJECT.name}</div>
              <div className="brand-sub">{PROJECT.code}</div>
            </div>
            <button className="icon-btn btn-sm mobile-only" onClick={() => setMobileOpen(false)} aria-label="Close menu"><X /></button>
          </div>

          <div className="sidebar-scroll">
            <button className="btn btn-outline btn-block btn-sm mb16" onClick={() => setPaletteOpen(true)}
              style={{ justifyContent: 'space-between', color: 'var(--text-3)' }}>
              <span className="row gap8"><Search size={13} /> Quick search</span>
              <kbd className="term-tag" style={{ fontSize: 9 }}>Ctrl K</kbd>
            </button>

            {nav.map((group) => (
              <div className="nav-group" key={group.label}>
                <div className="nav-group-label">{group.label}</div>
                {group.items.map((item) => (
                  <NavLink key={item.to} to={item.to} end={item.end}
                    className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                    <item.icon />
                    <span style={{ flex: 1 }}>{item.text}</span>
                    {badges[item.to] > 0 && <span className="nav-badge">{badges[item.to]}</span>}
                  </NavLink>
                ))}
              </div>
            ))}
          </div>

          <div className="sidebar-foot">
            <div className="sidebar-card">
              <span className="eyebrow">{isAdmin ? 'Administrator mode' : 'Personalization active'}</span>
              <p>
                {isAdmin
                  ? `${state.users.filter((u) => u.role === 'student').length} learners · ${state.attempts.length} quiz attempts analysed`
                  : gaps > 0
                    ? `${gaps} learning ${gaps === 1 ? 'gap' : 'gaps'} detected. Your path is ordered weakest first.`
                    : 'No learning gaps right now. Keep the streak going.'}
              </p>
              <div className="row gap6 mt12" style={{ fontSize: 10.5, color: 'var(--text-3)' }}>
                <span className="dot dot-live" style={{ color: 'var(--lime)' }} />
                <span className="mono">TF-IDF · cosine · regression</span>
              </div>
            </div>
          </div>
        </aside>

        <div className="main">
          <header className="topbar">
            <button className="icon-btn menu-btn" onClick={() => setMobileOpen(true)} aria-label="Open menu"><Menu /></button>
            <div className="topbar-crumb">
              <span className="desktop-only">{section}</span>
              <ChevronRight className="desktop-only" />
              <b className="truncate">{title}</b>
            </div>
            <div className="topbar-spacer" />
            <div className="topbar-actions">
              <button className="icon-btn desktop-only" onClick={() => setPaletteOpen(true)} aria-label="Search (Ctrl+K)" title="Quick search · Ctrl+K"><Search /></button>

              <div style={{ position: 'relative' }} ref={notifRef}>
                <button className="icon-btn" onClick={() => setNotifOpen((v) => !v)} aria-label="Notifications" aria-expanded={notifOpen}>
                  <Bell />{unread > 0 && <span className="badge-dot" />}
                </button>
                <Popover open={notifOpen} onClose={() => setNotifOpen(false)}>
                  <div className="row-between" style={{ padding: '6px 8px 8px' }}>
                    <span className="popover-label" style={{ padding: 0 }}>Recent activity</span>
                    <span className="chip chip-slate" style={{ fontSize: 9.5 }}>{feed.length}</span>
                  </div>
                  <div className="popover-sep" />
                  <div className="notif-list">
                    {feed.length === 0 && <p className="muted center" style={{ padding: 20, fontSize: 12.5 }}>No activity recorded yet.</p>}
                    {feed.map((f) => {
                      const Icon = f.kind === 'attempt' ? ClipboardList : f.kind === 'study' ? Clock : f.kind === 'complete' ? CheckCircle2 : FileText
                      const who = isAdmin ? state.users.find((u) => u.id === f.studentId)?.name : null
                      return (
                        <div className="notif" key={f.id}>
                          <div className="notif-icon" style={{ color: `var(--${f.tone === 'slate' ? 'text-3' : f.tone})` }}><Icon /></div>
                          <div className="notif-text">
                            <b>{f.title}</b>
                            <span>{who ? `${who} · ` : ''}{f.detail} · {relativeTime(f.at)}</span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </Popover>
              </div>

              <button className="icon-btn" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`} title="Toggle theme">
                {theme === 'dark' ? <Sun /> : <Moon />}
              </button>

              <div style={{ position: 'relative' }} ref={userRef}>
                <button className="user-menu" onClick={() => setUserMenu((v) => !v)} aria-expanded={userMenu} aria-label="Account menu">
                  <Avatar user={user} size="sm" />
                  <span className="user-menu-text desktop-only" style={{ textAlign: 'left' }}>
                    <span className="user-menu-name" style={{ display: 'block' }}>{user?.name}</span>
                    <span className="user-menu-role">{user?.role}</span>
                  </span>
                  <ChevronRight size={13} style={{ transform: 'rotate(90deg)', color: 'var(--text-3)' }} className="desktop-only" />
                </button>
                <Popover open={userMenu} onClose={() => setUserMenu(false)}>
                  <div style={{ padding: '9px 11px' }}>
                    <div className="row gap10">
                      <Avatar user={user} />
                      <div style={{ minWidth: 0 }}>
                        <b style={{ display: 'block', fontSize: 13 }}>{user?.name}</b>
                        <span className="muted truncate" style={{ fontSize: 11.5, display: 'block' }}>{user?.email}</span>
                      </div>
                    </div>
                  </div>
                  <div className="popover-sep" />
                  <button className="popover-item" onClick={() => { navigate('/profile'); setUserMenu(false) }}><User /> Profile & settings</button>
                  <button className="popover-item" onClick={() => { setTheme(theme === 'dark' ? 'light' : 'dark'); setUserMenu(false) }}>
                    {theme === 'dark' ? <Sun /> : <Moon />} {theme === 'dark' ? 'Light' : 'Dark'} theme
                  </button>
                  {isAdmin && (
                    <button className="popover-item" onClick={() => { resetDemo(); setUserMenu(false) }}><RotateCcw /> Reset demo data</button>
                  )}
                  <div className="popover-sep" />
                  <button className="popover-item danger" onClick={() => { logout(); navigate('/login') }}><LogOut /> Sign out</button>
                </Popover>
              </div>
            </div>
          </header>

          <main className="content">
            <Outlet />
          </main>

          <footer style={{ padding: '16px 24px 26px', borderTop: '1px solid var(--line)', marginTop: 8 }}>
            <div className="row-between wrap" style={{ fontSize: 11.5, color: 'var(--text-4)', gap: 10 }}>
              <span>{PROJECT.fullTitle} · {PROJECT.code}</span>
              <span className="mono">{PROJECT.university} · {PROJECT.session}</span>
            </div>
          </footer>
        </div>
      </div>

      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
    </>
  )
}