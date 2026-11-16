/* Headless-Chrome CDP driver: screenshots + runtime assertions for NeuraLearn. */
import { spawn } from 'node:child_process'
import { mkdirSync, writeFileSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const PORT = 9400 + Math.floor(Math.random() * 500)
const BASE = 'http://localhost:5173/'
const OUT = path.resolve('.qa/shots')
mkdirSync(OUT, { recursive: true })

const mode = process.argv[2] ?? 'student'
const W = mode === 'mobile' ? 390 : 1440
const H = mode === 'mobile' ? 844 : 900

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

class CDP {
  constructor(ws) {
    this.ws = ws; this.id = 0; this.pending = new Map(); this.events = []
    ws.addEventListener('message', (ev) => {
      const msg = JSON.parse(ev.data)
      if (msg.id && this.pending.has(msg.id)) {
        const { resolve, reject } = this.pending.get(msg.id); this.pending.delete(msg.id)
        msg.error ? reject(new Error(JSON.stringify(msg.error))) : resolve(msg.result)
      } else if (msg.method) this.events.push(msg)
    })
  }
  send(method, params = {}) {
    const id = ++this.id
    return new Promise((resolve, reject) => { this.pending.set(id, { resolve, reject }); this.ws.send(JSON.stringify({ id, method, params })) })
  }
  async eval(expression) {
    const r = await this.send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })
    if (r.exceptionDetails) throw new Error(`page eval: ${r.exceptionDetails.exception?.description ?? r.exceptionDetails.text}`)
    return r.result.value
  }
}

async function launch() {
  const profile = path.join(os.tmpdir(), `neuralearn-qa-${Date.now()}`)
  const chrome = spawn(CHROME, [
    '--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check', '--hide-scrollbars',
    '--disable-frame-rate-limit', '--disable-gpu-vsync', '--run-all-compositor-stages-before-draw',
    `--remote-debugging-port=${PORT}`, `--window-size=${W},${H}`, `--user-data-dir=${profile}`,
    '--force-device-scale-factor=1', 'about:blank',
  ], { stdio: 'ignore' })
  let target
  for (let i = 0; i < 60; i++) {
    await sleep(400)
    try {
      const list = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json()
      target = list.find((t) => t.type === 'page' && t.webSocketDebuggerUrl)
      if (target) break
    } catch { /* not up yet */ }
  }
  if (!target) { chrome.kill(); throw new Error('Chrome did not expose a debug target') }
  const ws = new WebSocket(target.webSocketDebuggerUrl)
  await new Promise((res, rej) => { ws.addEventListener('open', res); ws.addEventListener('error', rej) })
  const cdp = new CDP(ws)
  await cdp.send('Page.enable'); await cdp.send('Runtime.enable'); await cdp.send('Log.enable'); await cdp.send('Network.enable')
  await cdp.send('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: 1, mobile: mode === 'mobile' })
  return { cdp, chrome }
}

const errors = []
function watch(cdp) {
  const t = setInterval(() => {
    while (cdp.events.length) {
      const e = cdp.events.shift()
      if (e.method === 'Runtime.exceptionThrown') errors.push(`exception: ${e.params.exceptionDetails?.exception?.description ?? e.params.exceptionDetails?.text}`)
      if (e.method === 'Runtime.consoleAPICalled' && e.params.type === 'error') errors.push(`console.error: ${e.params.args.map((a) => a.value ?? a.description ?? '').join(' ').slice(0, 400)}`)
      if (e.method === 'Log.entryAdded' && e.params.entry.level === 'error') errors.push(`log: ${e.params.entry.text.slice(0, 300)}`)
      if (e.method === 'Network.loadingFailed' && !/ERR_ABORTED/.test(e.params.errorText)) errors.push(`net: ${e.params.errorText} ${e.params.type}`)
    }
  }, 120)
  t.unref()
}

async function setUser(cdp, id) {
  await cdp.send('Page.addScriptToEvaluateOnNewDocument', { source: `try{localStorage.setItem('neuralearn.session.v1','${id}');localStorage.removeItem('neuralearn.state.v1')}catch(e){}` })
}

async function go(cdp, hash, wait = 1200) {
  await cdp.send('Page.navigate', { url: BASE + hash })
  await sleep(wait)
  for (let i = 0; i < 20; i++) {
    const ready = await cdp.eval(`document.readyState === 'complete' && !!document.querySelector('#root')?.children.length`)
    if (ready) break
    await sleep(250)
  }
  await sleep(600)
}

async function metrics(cdp) {
  return cdp.eval(`(() => {
    const de = document.documentElement
    const wide = [...document.querySelectorAll('main *')].filter(e => {
      const r = e.getBoundingClientRect(); const s = getComputedStyle(e)
      return r.width > 0 && r.right > de.clientWidth + 2 && s.position !== 'fixed' && !e.closest('.table-wrap') && !e.closest('.recharts-wrapper')
    }).slice(0, 6).map(e => String(e.className).slice(0, 60))
    return {
      hash: location.hash,
      overflowX: de.scrollWidth > de.clientWidth,
      scrollW: de.scrollWidth, clientW: de.clientWidth,
      wide,
      charts: document.querySelectorAll('.recharts-surface').length,
      emptyCharts: [...document.querySelectorAll('.chart-box')].filter(c => !c.querySelector('.recharts-surface')).length,
      h: de.scrollHeight,
      text: document.body.innerText.length,
    }
  })()`)
}

async function shot(cdp, name, y = null) {
  const m = await cdp.send('Page.getLayoutMetrics')
  const height = y === null ? Math.min(Math.ceil(m.cssContentSize.height), 14000) : H
  const { data } = await cdp.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true, clip: { x: 0, y: y ?? 0, width: W, height, scale: 1 } })
  writeFileSync(path.join(OUT, `${name}.png`), Buffer.from(data, 'base64'))
  return `${name}.png (${W}x${height})`
}

const PAGE_HELPERS = `
  window.__qa = {
    click(sel, text) {
      const t = text.toLowerCase()
      const el = [...document.querySelectorAll(sel)].find(e => (e.innerText || e.title || '').trim().toLowerCase().includes(t))
      if (!el) throw new Error('click target not found: ' + sel + ' / ' + text)
      el.click(); return true
    },
    clickTitle(title) { const el = document.querySelector('[title="' + title + '"]'); if (!el) throw new Error('no title ' + title); el.click(); return true },
    set(sel, value, index = 0) {
      const el = [...document.querySelectorAll(sel)][index]
      if (!el) throw new Error('input not found: ' + sel + '[' + index + ']')
      const proto = el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : el.tagName === 'SELECT' ? HTMLSelectElement.prototype : HTMLInputElement.prototype
      Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, value)
      el.dispatchEvent(new Event(el.tagName === 'SELECT' ? 'change' : 'input', { bubbles: true }))
      return true
    },
    setByLabel(label, value) {
      const f = [...document.querySelectorAll('.field')].find(x => (x.querySelector('label')?.innerText || '').toLowerCase().includes(label.toLowerCase()))
      if (!f) throw new Error('field not found: ' + label)
      const el = f.querySelector('input, textarea, select')
      const proto = el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : el.tagName === 'SELECT' ? HTMLSelectElement.prototype : HTMLInputElement.prototype
      Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, value)
      el.dispatchEvent(new Event(el.tagName === 'SELECT' ? 'change' : 'input', { bubbles: true }))
      return true
    },
    text() { return document.body.innerText },
    has(t) { return document.body.innerText.includes(t) },
    match(re) { const m = document.body.innerText.match(new RegExp(re)); return m ? m[0] : null },
  }
`

const report = []
const log = (...a) => { const line = a.join(' '); report.push(line); console.log(line) }

async function main() {
  const { cdp, chrome } = await launch()
  watch(cdp)
  const kill = () => {
    try {
      if (process.platform === 'win32') spawn('taskkill', ['/PID', String(chrome.pid), '/T', '/F'], { stdio: 'ignore' })
      else chrome.kill()
    } catch { /* already gone */ }
  }
  try {
    if (mode === 'student' || mode === 'mobile') {
      await setUser(cdp, 2)
      const routes = mode === 'mobile'
        ? [['#/', 'm-dashboard'], ['#/courses', 'm-courses'], ['#/resources', 'm-resources'], ['#/recommendations', 'm-recs'], ['#/learning-path', 'm-path'], ['#/performance', 'm-performance'], ['#/quiz/11', 'm-quiz']]
        : [['#/', 'dashboard'], ['#/courses', 'courses'], ['#/courses/1', 'course-detail'], ['#/resources', 'resources'], ['#/recommendations', 'recommendations'], ['#/learning-path', 'learning-path'], ['#/performance', 'performance'], ['#/profile', 'profile']]
      for (const [hash, name] of routes) {
        await go(cdp, hash)
        await cdp.eval(PAGE_HELPERS)
        if (name.endsWith('performance')) {
          for (const tab of ['Topic analysis', 'Progress trend', 'Score prediction', 'Attempt history']) {
            await cdp.eval(`__qa.click('.tab', '${tab}')`).catch((e) => log('TAB FAIL', tab, e.message))
            await sleep(800)
            log('tab', tab, JSON.stringify(await metrics(cdp)))
            await shot(cdp, `${name}-${tab.split(' ')[1].toLowerCase()}`)
          }
          await cdp.eval(`__qa.click('.tab', 'Overview')`).catch(() => {})
          await sleep(600)
          if (mode === 'mobile') {
            const y = await cdp.eval(`(() => { const t = document.querySelector('.tabs'); return t ? Math.max(0, t.getBoundingClientRect().top + window.scrollY - 70) : 0 })()`)
            log('m-tabs-view', await shot(cdp, 'm-performance-tabs', y))
          }
        }
        if (name === 'm-quiz') {
          const y = await cdp.eval(`(() => { const p = [...document.querySelectorAll('main .panel')].pop(); return p ? Math.max(0, p.getBoundingClientRect().top + window.scrollY - 90) : 0 })()`)
          log('m-quiz-footer-view', await shot(cdp, 'm-quiz-footer', y))
        }
        if (name === 'course-detail' || name === 'm-courses') {
          await cdp.eval(`(() => { const b = document.querySelector('.topic-head'); if (b) b.click(); return !!b })()`)
          await sleep(600)
        }
        log(name, JSON.stringify(await metrics(cdp)), await shot(cdp, name))
      }
    }

    if (mode === 'admin') {
      await setUser(cdp, 1)
      for (const [hash, name] of [['#/admin', 'admin'], ['#/admin/students', 'admin-students'], ['#/admin/analytics', 'admin-analytics'], ['#/admin/content', 'admin-content'], ['#/admin/records', 'admin-records']]) {
        await go(cdp, hash)
        await cdp.eval(PAGE_HELPERS)
        if (name === 'admin-analytics') {
          for (const tab of ['Topic difficulty', 'Compare learners', 'Distributions', 'Study vs score']) {
            await cdp.eval(`__qa.click('.tab', '${tab}')`).catch((e) => log('TAB FAIL', tab, e.message))
            await sleep(900)
            log('analytics tab', tab, JSON.stringify(await metrics(cdp)))
            await shot(cdp, `analytics-${tab.split(' ')[0].toLowerCase()}`)
          }
          await cdp.eval(`__qa.click('.tab', 'Topic heatmap')`).catch(() => {})
          await sleep(600)
        }
        if (name === 'admin-students') {
          await cdp.eval(`__qa.click('tbody button', 'Farhan Nadeem')`)
          await sleep(900)
          log('student drawer', JSON.stringify(await metrics(cdp)), await shot(cdp, 'admin-student-drawer'))
          await cdp.eval(`__qa.click('.drawer-foot button', 'Close')`).catch(() => {})
          await sleep(500)
        }
        if (name === 'admin-records') {
          await cdp.eval(`__qa.click('tbody button', 'Answers')`)
          await sleep(900)
          log('record drawer', JSON.stringify(await metrics(cdp)), await shot(cdp, 'admin-record-drawer'))
          await cdp.eval(`__qa.click('.drawer .segmented button', 'Missed')`).catch((e) => log('missed filter fail', e.message))
          await sleep(500)
          await shot(cdp, 'admin-record-drawer-missed')
          await cdp.eval(`__qa.click('.drawer-foot button', 'Close')`).catch(() => {})
          await sleep(500)
          await cdp.eval(`__qa.set('.filter-bar select', 'fail', 3)`)
          await sleep(700)
          log('records fail filter', await cdp.eval(`__qa.match('[0-9]+ of [0-9]+ records')`))
          await shot(cdp, 'admin-records-failed')
        }
        log(name, JSON.stringify(await metrics(cdp)), await shot(cdp, name))
      }
    }

    if (mode === 'quiz') {
      await setUser(cdp, 2)
      await go(cdp, '#/quiz/11')
      await cdp.eval(PAGE_HELPERS)
      log('quiz loaded', await cdp.eval(`__qa.has('Quiz: Python Basics')`), JSON.stringify(await metrics(cdp)))
      await shot(cdp, 'quiz')
      const answered = await cdp.eval(`(() => {
        const cards = [...document.querySelectorAll('.q-card')]
        cards.forEach(c => c.querySelector('.q-option').click())
        return cards.length
      })()`)
      await sleep(600)
      log('answered', answered, await cdp.eval(`__qa.match('[0-9]+ / [0-9]+ answered')`))
      await cdp.eval(`__qa.click('.quiz-shell button.btn-primary', 'Submit quiz')`)
      await sleep(600)
      await shot(cdp, 'quiz-confirm')
      await cdp.eval(`__qa.click('.modal button', 'Submit & evaluate')`)
      await sleep(1600)
      log('result url', await cdp.eval(`location.hash`), JSON.stringify(await metrics(cdp)))
      await shot(cdp, 'quiz-result')
      log('result has review', await cdp.eval(`__qa.has('Answer review')`))
      await go(cdp, '#/recommendations')
      await cdp.eval(PAGE_HELPERS)
      log('recs after quiz', JSON.stringify(await metrics(cdp)), await shot(cdp, 'recs-after-quiz'))
      await go(cdp, '#/performance')
      log('performance after quiz', await cdp.eval(`__qa.match('[0-9]+ quiz attempts')`))
      await go(cdp, '#/admin/records')
      log('student blocked from admin', await cdp.eval(`location.hash`))
    }

    if (mode === 'crud') {
      await setUser(cdp, 1)
      await go(cdp, '#/admin/content')
      await cdp.eval(PAGE_HELPERS)
      await cdp.eval(`__qa.click('button', 'New course')`)
      await sleep(600)
      await cdp.eval(`__qa.setByLabel('Course title', 'Operating Systems')`)
      await cdp.eval(`__qa.setByLabel('Course code', 'CS-204')`)
      await cdp.eval(`__qa.setByLabel('Description', 'Processes, memory and file systems.')`)
      await cdp.eval(`__qa.click('.modal-foot button', 'Create course')`)
      await sleep(800)
      log('course created', await cdp.eval(`__qa.has('Operating Systems')`))
      await shot(cdp, 'crud-course-created')
      await cdp.eval(`__qa.click('button.resource', 'Operating Systems')`)
      await sleep(600)
      await cdp.eval(`__qa.click('.filter-bar button', 'Add topic')`)
      await sleep(600)
      await cdp.eval(`__qa.setByLabel('Topic name', 'Process Scheduling')`)
      await cdp.eval(`__qa.setByLabel('Description', 'FCFS, SJF and round robin.')`)
      await cdp.eval(`document.querySelector('#topic-form').requestSubmit()`)
      await sleep(800)
      log('topic created', await cdp.eval(`__qa.has('Process Scheduling')`))
      await cdp.eval(`__qa.clickTitle('Duplicate topic')`)
      await sleep(800)
      log('topic duplicated', await cdp.eval(`__qa.has('Process Scheduling (copy)')`))
      await cdp.eval(`(async () => {
        const tick = () => new Promise(r => setTimeout(r, 120))
        const rows = [...document.querySelectorAll('.resource')].filter(r => r.querySelector('.drag-handle'))
        const handles = rows.map(r => r.querySelector('.drag-handle'))
        if (handles.length < 2) throw new Error('need 2 drag handles, got ' + handles.length)
        const dt = new DataTransfer()
        handles[0].dispatchEvent(new DragEvent('dragstart', { bubbles: true, dataTransfer: dt }))
        await tick()
        rows[1].dispatchEvent(new DragEvent('dragover', { bubbles: true, cancelable: true, dataTransfer: dt }))
        await tick()
        rows[1].dispatchEvent(new DragEvent('drop', { bubbles: true, dataTransfer: dt }))
        await tick()
        handles[0].dispatchEvent(new DragEvent('dragend', { bubbles: true, dataTransfer: dt }))
        return true
      })()`)
      await sleep(800)
      log('reorder toast', await cdp.eval(`__qa.has('Topic order updated')`))
      await shot(cdp, 'crud-reordered')
      await cdp.eval(`__qa.clickTitle('Delete topic')`)
      await sleep(600)
      await cdp.eval(`__qa.click('.modal-foot button', 'Delete topic')`)
      await sleep(800)
      log('delete toast + undo', await cdp.eval(`__qa.has('Undo')`))
      await shot(cdp, 'crud-delete-undo')
      await cdp.eval(`__qa.click('.toast button', 'Undo')`)
      await sleep(800)
      log('undo restored', await cdp.eval(`__qa.has('Process Scheduling')`))
      await cdp.eval(`__qa.click('.tab', 'Resources')`)
      await sleep(600)
      await cdp.eval(`__qa.click('.filter-bar button', 'Add resource')`)
      await sleep(600)
      await cdp.eval(`__qa.setByLabel('Title', 'Scheduling Algorithms Explained')`)
      await cdp.eval(`__qa.setByLabel('Description', 'Walkthrough of FCFS, SJF and RR with examples.')`)
      await cdp.eval(`document.querySelector('#resource-form').requestSubmit()`)
      await sleep(800)
      log('resource created', await cdp.eval(`__qa.has('Scheduling Algorithms Explained')`))
      await cdp.eval(`__qa.click('.tab', 'Questions')`)
      await sleep(600)
      await cdp.eval(`__qa.click('.filter-bar button', 'Add question')`)
      await sleep(600)
      await cdp.eval(`__qa.setByLabel('Question text', 'Which algorithm uses a time quantum?')`)
      await cdp.eval(`__qa.set('input[placeholder="Option A"]', 'Round robin')`)
      await cdp.eval(`__qa.set('input[placeholder="Option B"]', 'FCFS')`)
      await cdp.eval(`document.querySelector('#question-form').requestSubmit()`)
      await sleep(800)
      log('question created', await cdp.eval(`__qa.has('Which algorithm uses a time quantum?')`))
      await shot(cdp, 'crud-questions')
      await cdp.eval(`__qa.click('.tab', 'Topics')`)
      await sleep(600)
      await cdp.eval(`__qa.clickTitle('Preview quiz')`)
      await sleep(700)
      log('quiz preview', await cdp.eval(`__qa.has('Quiz preview')`))
      await shot(cdp, 'crud-preview')
      await cdp.eval(`__qa.click('.modal-foot button', 'Close preview')`)
      await sleep(500)
      log('crud overflow', JSON.stringify(await metrics(cdp)))
    }

    if (mode === 'mobile') {
      await setUser(cdp, 1)
      await cdp.send('Page.reload')
      await sleep(2000)
      for (const [hash, name] of [['#/admin', 'm-admin'], ['#/admin/records', 'm-records'], ['#/admin/content', 'm-content'], ['#/admin/students', 'm-students'], ['#/admin/analytics', 'm-analytics']]) {
        await go(cdp, hash)
        await cdp.eval(PAGE_HELPERS)
        log(name, JSON.stringify(await metrics(cdp)), await shot(cdp, name))
      }
    }
  } catch (e) {
    log('QA STEP FAIL:', e.message)
  } finally {
    log('CONSOLE/PAGE ERRORS:', errors.length ? JSON.stringify([...new Set(errors)], null, 1) : 'none')
    writeFileSync(path.join(OUT, `${mode}-report.txt`), report.join('\n'))
    kill()
    setTimeout(() => process.exit(0), 400)
  }
}

main().catch((e) => { console.error('QA DRIVER FAIL', e); process.exit(1) })