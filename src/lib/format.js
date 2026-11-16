export const CHART_COLORS = ['#22d3ee', '#a855f7', '#a3e635', '#fbbf24', '#fb7185', '#e879f9', '#60a5fa', '#2dd4bf']

export const BAND_COLORS = { strong: '#a3e635', medium: '#fbbf24', weak: '#fb7185', new: '#7d89bf' }

export const pct = (n) => `${Math.round(n * 10) / 10}%`

export const num = (n) => new Intl.NumberFormat('en-IN').format(Math.round(n))

export function hoursMinutes(mins) {
  const m = Math.max(0, Math.round(mins))
  const h = Math.floor(m / 60)
  return h ? `${h}h ${m % 60}m` : `${m}m`
}

export function clock(sec) {
  const s = Math.max(0, Math.floor(sec))
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
}

const DATE_FMT = new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
const SHORT_FMT = new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short' })
const TIME_FMT = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false })

export const fmtDate = (iso) => (iso ? DATE_FMT.format(new Date(iso)) : '—')
export const fmtShort = (iso) => (iso ? SHORT_FMT.format(new Date(iso)) : '—')
export const fmtTime = (iso) => (iso ? TIME_FMT.format(new Date(iso)) : '—')
export const fmtDateTime = (iso) => (iso ? `${DATE_FMT.format(new Date(iso))}, ${TIME_FMT.format(new Date(iso))}` : '—')

export function relativeTime(iso) {
  if (!iso) return '—'
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.round(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.round(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.round(hrs / 24)
  if (days < 7) return `${days}d ago`
  const weeks = Math.round(days / 7)
  if (weeks < 5) return `${weeks}w ago`
  return fmtShort(iso)
}

export const greeting = () => {
  const h = new Date().getHours()
  if (h < 5) return 'Burning the midnight oil'
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

export function downloadCSV(filename, rows) {
  if (!rows.length) return false
  const headers = Object.keys(rows[0])
  const escape = (v) => {
    const s = v == null ? '' : String(v)
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  const csv = [headers.join(','), ...rows.map((r) => headers.map((h) => escape(r[h])).join(','))].join('\r\n')
  const blob = new Blob([`﻿${csv}`], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 1500)
  return true
}

export function heatColor(value) {
  if (value == null) return { bg: 'var(--surface-2)', fg: 'var(--text-4)' }
  if (value >= 80) return { bg: 'rgba(163,230,53,0.72)', fg: '#152403' }
  if (value >= 70) return { bg: 'rgba(163,230,53,0.4)', fg: 'var(--text)' }
  if (value >= 60) return { bg: 'rgba(251,191,36,0.5)', fg: '#2a1c00' }
  if (value >= 45) return { bg: 'rgba(251,191,36,0.26)', fg: 'var(--text)' }
  if (value >= 30) return { bg: 'rgba(251,113,133,0.42)', fg: 'var(--text)' }
  return { bg: 'rgba(251,113,133,0.68)', fg: '#2b0409' }
}

export const pluralize = (n, one, many = `${one}s`) => `${n} ${n === 1 ? one : many}`