import { useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  AlertTriangle, Check, ChevronDown, Info, Minus, Plus, Search, X,
  CheckCircle2, XCircle, Sparkles,
} from 'lucide-react'
import { useStore } from '../lib/store.jsx'
import { BAND_COLORS } from '../lib/format.js'

/* ------------------------------------------------------------- panels */
export function Panel({ title, icon: Icon, actions, children, className = '', bodyClass = '', solid = false, eyebrow }) {
  return (
    <section className={`panel ${solid ? 'panel-solid' : ''} ${className}`}>
      {(title || actions) && (
        <header className="panel-head">
          <div className="panel-title">
            {Icon && <Icon size={16} style={{ color: 'var(--brand-3)' }} />}
            <div>
              {eyebrow && <span className="eyebrow" style={{ display: 'block', marginBottom: 2 }}>{eyebrow}</span>}
              <h3>{title}</h3>
            </div>
          </div>
          {actions && <div className="btn-row">{actions}</div>}
        </header>
      )}
      <div className={`panel-body ${bodyClass}`}>{children}</div>
    </section>
  )
}

export function PageHead({ eyebrow, title, subtitle, actions }) {
  return (
    <div className="page-head reveal">
      <div>
        {eyebrow && <span className="eyebrow">{eyebrow}</span>}
        <h1>{title}</h1>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {actions && <div className="page-head-actions">{actions}</div>}
    </div>
  )
}

/* --------------------------------------------------------------- kpi */
export function Kpi({ label, value, unit, icon: Icon, tone = 'cyan', foot, delay = 0 }) {
  return (
    <div className={`kpi kpi-${tone} reveal`} style={{ animationDelay: `${delay}ms` }}>
      <div className="kpi-label">{Icon && <Icon />} {label}</div>
      <div className="kpi-value">{value}{unit && <small>{unit}</small>}</div>
      {foot && <div className="kpi-foot">{foot}</div>}
    </div>
  )
}

/* -------------------------------------------------------------- chip */
export function Chip({ tone = 'slate', children, icon: Icon, className = '' }) {
  return <span className={`chip chip-${tone} ${className}`}>{Icon && <Icon />}{children}</span>
}

export function BandChip({ band, value }) {
  const map = { strong: ['ok', 'Strength'], medium: ['warn', 'Developing'], weak: ['danger', 'Gap'], new: ['slate', 'New'] }
  const [tone, label] = map[band] ?? map.new
  return <Chip tone={tone}>{value != null ? `${value}% · ` : ''}{label}</Chip>
}

export function DifficultyChip({ level }) {
  const map = { 1: ['lime', 'Easy'], 2: ['amber', 'Medium'], 3: ['rose', 'Hard'] }
  const [tone, label] = map[level] ?? map[1]
  return <Chip tone={tone}>{label}</Chip>
}

/* ------------------------------------------------------------ avatar */
export function Avatar({ user, size = '', name, tone }) {
  const initials = user?.initials ?? (name ? name.split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase()).join('') : '?')
  const t = user?.tone ?? tone ?? 'violet'
  return <div className={`avatar avatar-${t} ${size ? `avatar-${size}` : ''}`} title={user?.name ?? name}>{initials}</div>
}

/* ---------------------------------------------------------- progress */
export function Bar({ value, band, tone, height = 7, animate = true }) {
  const [w, setW] = useState(animate ? 0 : value)
  useEffect(() => {
    if (!animate) { setW(value); return }
    const id = requestAnimationFrame(() => setW(value))
    return () => cancelAnimationFrame(id)
  }, [value, animate])
  const cls = band ?? tone ?? ''
  return (
    <div className="bar-track" style={{ height }}>
      <div className={`bar-fill ${cls}`} style={{ width: `${Math.max(0, Math.min(100, w ?? 0))}%` }} />
    </div>
  )
}

export function BarRow({ name, sub, value, band, tone }) {
  return (
    <div className="bar-row">
      <div className="bar-head">
        <span className="truncate">{name}{sub && <span className="muted"> · {sub}</span>}</span>
        <b style={{ color: band ? BAND_COLORS[band] : undefined }}>{value == null ? '—' : `${value}%`}</b>
      </div>
      <Bar value={value ?? 0} band={band} tone={tone} />
    </div>
  )
}

export function ScoreRing({ value, size = 168, label = 'Score', tone }) {
  const r = 62
  const c = 2 * Math.PI * r
  const v = Math.max(0, Math.min(100, value ?? 0))
  const [dash, setDash] = useState(0)
  const gid = useId().replace(/:/g, '')
  useEffect(() => {
    const id = requestAnimationFrame(() => setDash((v / 100) * c))
    return () => cancelAnimationFrame(id)
  }, [v, c])
  const color = tone ?? (v >= 80 ? 'var(--lime)' : v >= 60 ? 'var(--amber)' : 'var(--rose)')
  return (
    <div className="score-ring" style={{ width: size, height: size }}>
      <svg viewBox="0 0 160 160">
        <defs>
          <linearGradient id={`ring-${gid}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={color} />
            <stop offset="100%" stopColor="var(--brand-3)" />
          </linearGradient>
        </defs>
        <circle cx="80" cy="80" r={r} fill="none" stroke="var(--bg-3)" strokeWidth="12" />
        <circle cx="80" cy="80" r={r} fill="none" stroke="var(--line)" strokeWidth="12" strokeDasharray="2 6" opacity="0.5" />
        <circle
          cx="80" cy="80" r={r} fill="none" stroke={`url(#ring-${gid})`} strokeWidth="12"
          strokeLinecap="round" strokeDasharray={`${dash} ${c}`}
          style={{ transition: 'stroke-dasharray 1.1s cubic-bezier(0.22,1,0.36,1)', filter: `drop-shadow(0 0 8px ${color})` }}
        />
      </svg>
      <div className="score-ring-value">
        <b style={{ color }}>{Math.round(v)}<span style={{ fontSize: '0.5em' }}>%</span></b>
        <span>{label}</span>
      </div>
    </div>
  )
}

export function Sparkline({ data, width = 120, height = 34, color = 'var(--brand-3)', fill = true }) {
  const gid = useId().replace(/:/g, '')
  if (!data?.length) return <svg className="spark" width={width} height={height} />
  const vals = data.map((d) => (typeof d === 'number' ? d : d.y))
  const min = Math.min(...vals)
  const max = Math.max(...vals)
  const span = max - min || 1
  const pts = vals.map((v, i) => [
    (i / Math.max(1, vals.length - 1)) * width,
    height - 3 - ((v - min) / span) * (height - 6),
  ])
  const line = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ')
  const area = `${line} L${width},${height} L0,${height} Z`
  const last = pts[pts.length - 1]
  return (
    <svg className="spark" width={width} height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
      <defs>
        <linearGradient id={`sp-${gid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.36" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      {fill && <path d={area} fill={`url(#sp-${gid})`} />}
      <path d={line} fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={last[0]} cy={last[1]} r="2.6" fill={color} />
    </svg>
  )
}

/* ------------------------------------------------------- form controls */
export function Field({ label, hint, error, children, required }) {
  return (
    <div className="field">
      {label && <label>{label}{required && <span style={{ color: 'var(--danger)' }}> *</span>}</label>}
      {children}
      {error && <span className="field-error"><AlertTriangle size={12} />{error}</span>}
      {!error && hint && <span className="field-hint">{hint}</span>}
    </div>
  )
}

export function SearchBox({ value, onChange, placeholder = 'Search…', className = '' }) {
  return (
    <div className={`search-box ${className}`}>
      <Search />
      <input className="input" type="search" value={value} placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)} aria-label={placeholder} />
    </div>
  )
}

export function Segmented({ options, value, onChange, size }) {
  return (
    <div className="segmented" role="group">
      {options.map((o) => {
        const v = o.value ?? o
        const label = o.label ?? o
        return (
          <button key={v} type="button" aria-pressed={value === v} onClick={() => onChange(v)}
            style={size === 'sm' ? { padding: '4px 10px', fontSize: 11.5 } : undefined}>
            {label}
          </button>
        )
      })}
    </div>
  )
}

export function Toggle({ checked, onChange, label }) {
  return (
    <button type="button" className="toggle" role="switch" aria-checked={checked}
      aria-label={label} onClick={() => onChange(!checked)} />
  )
}

export function Stepper({ value, onChange, min = 0, max = 999, step = 5, suffix }) {
  const clamp = (n) => Math.max(min, Math.min(max, n))
  return (
    <div className="stepper">
      <button type="button" onClick={() => onChange(clamp(value - step))} disabled={value <= min} aria-label="Decrease"><Minus /></button>
      <input type="number" value={value} min={min} max={max} step={step}
        onChange={(e) => onChange(clamp(Number(e.target.value) || 0))} aria-label={suffix ?? 'Value'} />
      <button type="button" onClick={() => onChange(clamp(value + step))} disabled={value >= max} aria-label="Increase"><Plus /></button>
    </div>
  )
}

export function Tabs({ tabs, value, onChange }) {
  return (
    <div className="tabs" role="tablist">
      {tabs.map((t) => (
        <button key={t.value} className="tab" role="tab" aria-selected={value === t.value}
          onClick={() => onChange(t.value)}>
          {t.icon && <t.icon />}{t.label}
          {t.count != null && <span className="tab-count">{t.count}</span>}
        </button>
      ))}
    </div>
  )
}

/* ------------------------------------------------------------- states */
export function Empty({ icon: Icon = Sparkles, title, children, action }) {
  return (
    <div className="empty">
      <Icon />
      <h4>{title}</h4>
      {children && <p>{children}</p>}
      {action}
    </div>
  )
}

export function Banner({ tone = 'warn', icon: Icon = AlertTriangle, title, children, action }) {
  return (
    <div className={`banner ${tone}`}>
      <div className="banner-icon"><Icon style={{ color: tone === 'danger' ? 'var(--danger)' : tone === 'ok' ? 'var(--ok)' : tone === 'info' ? 'var(--info)' : 'var(--warn)' }} /></div>
      <div className="banner-text"><b>{title}</b>{children && <span>{children}</span>}</div>
      {action}
    </div>
  )
}

export function StatLine({ label, value, tone }) {
  return (
    <div className="stat-line">
      <span className="muted">{label}</span>
      <b style={tone ? { color: `var(--${tone})` } : undefined}>{value}</b>
    </div>
  )
}

/* ------------------------------------------------------ modal / drawer */
function useEscape(onClose) {
  useEffect(() => {
    const h = (e) => { if (e.key === 'Escape') onClose?.() }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onClose])
}

function useLockScroll() {
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [])
}

export function Modal({ open, onClose, title, subtitle, icon: Icon, children, footer, wide }) {
  useEscape(open ? onClose : null)
  if (!open) return null
  return createPortal(
    <div className="modal-wrap" role="dialog" aria-modal="true" aria-label={title}>
      <div className="scrim" onClick={onClose} />
      <div className={`modal ${wide ? 'modal-lg' : ''}`}>
        <LockScroll />
        <header className="modal-head">
          {Icon && <div className="banner-icon" style={{ width: 34, height: 34 }}><Icon size={17} style={{ color: 'var(--brand-3)' }} /></div>}
          <div className="modal-head-text"><h3>{title}</h3>{subtitle && <p>{subtitle}</p>}</div>
          <button className="icon-btn" onClick={onClose} aria-label="Close dialog"><X /></button>
        </header>
        <div className="modal-body">{children}</div>
        {footer && <footer className="modal-foot">{footer}</footer>}
      </div>
    </div>,
    document.body,
  )
}

function LockScroll() { useLockScroll(); return null }

export function Drawer({ open, onClose, title, subtitle, icon: Icon, children, footer, wide, headExtra }) {
  useEscape(open ? onClose : null)
  if (!open) return null
  return createPortal(
    <>
      <div className="scrim" onClick={onClose} />
      <aside className={`drawer ${wide ? 'drawer-wide' : ''}`} role="dialog" aria-modal="true" aria-label={title}>
        <LockScroll />
        <header className="drawer-head">
          {Icon && <div className="banner-icon" style={{ width: 36, height: 36 }}><Icon size={18} style={{ color: 'var(--brand-3)' }} /></div>}
          <div className="drawer-head-text"><h3>{title}</h3>{subtitle && <p>{subtitle}</p>}</div>
          {headExtra}
          <button className="icon-btn" onClick={onClose} aria-label="Close panel"><X /></button>
        </header>
        <div className="drawer-body">{children}</div>
        {footer && <footer className="drawer-foot">{footer}</footer>}
      </aside>
    </>,
    document.body,
  )
}

export function ConfirmDialog({ open, onClose, onConfirm, title, message, confirmLabel = 'Delete', tone = 'danger' }) {
  return (
    <Modal open={open} onClose={onClose} title={title} icon={AlertTriangle}
      footer={<>
        <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
        <button className={`btn ${tone === 'danger' ? 'btn-danger' : 'btn-primary'}`} onClick={() => { onConfirm(); onClose() }}>
          {confirmLabel}
        </button>
      </>}>
      <p style={{ fontSize: 13.5, color: 'var(--text-2)', lineHeight: 1.65 }}>{message}</p>
      <p className="field-hint mt12" style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
        <Info size={13} /> You can undo this from the notification that appears.
      </p>
    </Modal>
  )
}

/* ------------------------------------------------------------- popover */
export function Popover({ open, onClose, children, className = '' }) {
  const ref = useRef(null)
  useEffect(() => {
    if (!open) return
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose() }
    const k = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('mousedown', h)
    document.addEventListener('keydown', k)
    return () => { document.removeEventListener('mousedown', h); document.removeEventListener('keydown', k) }
  }, [open, onClose])
  if (!open) return null
  return <div ref={ref} className={`popover ${className}`}>{children}</div>
}

/* -------------------------------------------------------------- toasts */
const TOAST_ICON = { success: CheckCircle2, error: XCircle, warn: AlertTriangle, info: Info }

export function ToastHost() {
  const { toasts, dismissToast } = useStore()
  return createPortal(
    <div className="toast-host" aria-live="polite">
      {toasts.map((t) => {
        const Icon = TOAST_ICON[t.tone] ?? Info
        return (
          <div key={t.id} className={`toast ${t.tone}`} role="status">
            <div className="toast-icon"><Icon /></div>
            <div className="toast-msg">{t.message}</div>
            {t.action && (
              <button className="toast-action" onClick={() => { t.action.run(); dismissToast(t.id) }}>
                {t.action.label}
              </button>
            )}
            <button className="icon-btn btn-sm" style={{ width: 24, height: 24, background: 'transparent', border: 0 }}
              onClick={() => dismissToast(t.id)} aria-label="Dismiss"><X size={13} /></button>
          </div>
        )
      })}
    </div>,
    document.body,
  )
}

/* ------------------------------------------------------- ambient layer */
export function Ambient({ orbs = true }) {
  return (
    <div className="ambient" aria-hidden="true">
      {orbs && <><div className="orb orb-a" /><div className="orb orb-b" /><div className="orb orb-c" /></>}
    </div>
  )
}

export function BrandMark({ size = 38 }) {
  return (
    <div className="brand-mark" style={{ width: size, height: size }}>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
        <path d="M5 19V5l14 14V5" />
        <circle cx="5" cy="5" r="1.6" fill="currentColor" stroke="none" />
        <circle cx="19" cy="19" r="1.6" fill="currentColor" stroke="none" />
      </svg>
    </div>
  )
}

export function CheckPill({ done, onClick, label }) {
  return (
    <button className={`btn btn-sm ${done ? 'btn-ok' : 'btn-outline'}`} onClick={onClick}
      title={done ? 'Mark as not completed' : 'Mark as completed'}>
      {done ? <Check /> : <Plus />}{label ?? (done ? 'Completed' : 'Mark done')}
    </button>
  )
}

export function Collapse({ open, children }) {
  if (!open) return null
  return <div style={{ animation: 'slideDown 0.3s var(--ease)' }}>{children}</div>
}