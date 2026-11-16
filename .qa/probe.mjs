import { spawn } from 'node:child_process'
import { writeFileSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const profile = path.join(os.tmpdir(), `probe-${Date.now()}`)
const chrome = spawn(CHROME, ['--headless=new', '--disable-gpu', '--no-first-run', '--hide-scrollbars', '--disable-frame-rate-limit', '--disable-gpu-vsync', '--run-all-compositor-stages-before-draw', '--remote-debugging-port=9334', '--window-size=1440,900', `--user-data-dir=${profile}`, 'about:blank'], { stdio: 'ignore' })
let target
for (let i = 0; i < 60; i++) { await sleep(400); try { const l = await (await fetch('http://127.0.0.1:9334/json/list')).json(); target = l.find((t) => t.type === 'page'); if (target) break } catch {} }
const ws = new WebSocket(target.webSocketDebuggerUrl)
await new Promise((r) => ws.addEventListener('open', r))
let id = 0; const pending = new Map()
ws.addEventListener('message', (ev) => { const m = JSON.parse(ev.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m.result); pending.delete(m.id) } })
const send = (method, params = {}) => new Promise((res) => { const i = ++id; pending.set(i, res); ws.send(JSON.stringify({ id: i, method, params })) })
const ev = async (expression) => (await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })).result.value
await send('Page.enable'); await send('Runtime.enable')
await send('Page.addScriptToEvaluateOnNewDocument', { source: `localStorage.setItem('neuralearn.session.v1','2')` })
await send('Page.navigate', { url: 'http://localhost:5173/#/' })
await sleep(4000)
console.log('bars', await ev(`(() => {
  const rects = [...document.querySelectorAll('.recharts-bar-rectangle path, .recharts-bar-rectangle rectangle')]
  const lines = [...document.querySelectorAll('.recharts-line-curve')]
  const sectors = [...document.querySelectorAll('.recharts-pie-sector path')]
  const areas = [...document.querySelectorAll('.recharts-area-area')]
  const box = (e) => { const r = e.getBoundingClientRect(); return [Math.round(r.width), Math.round(r.height)] }
  return { rects: rects.length, rectSizes: rects.slice(0,4).map(box), lines: lines.length, lineD: lines[0]?.getAttribute('d')?.slice(0,60), lineDash: lines[0]?.getAttribute('stroke-dasharray'), sectors: sectors.length, sectorD: sectors[0]?.getAttribute('d')?.slice(0,50), areas: areas.length, areaD: areas[0]?.getAttribute('d')?.slice(0,50), raf: typeof requestAnimationFrame }
})()`))
const shot1 = await send('Page.captureScreenshot', { format: 'png' })
writeFileSync('.qa/shots/probe-viewport.png', Buffer.from(shot1.data, 'base64'))
const m = await send('Page.getLayoutMetrics')
const shot2 = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true, clip: { x: 0, y: 0, width: 1440, height: Math.ceil(m.cssContentSize.height), scale: 1 } })
writeFileSync('.qa/shots/probe-full.png', Buffer.from(shot2.data, 'base64'))
await sleep(1500)
console.log('after capture bars', await ev(`[...document.querySelectorAll('.recharts-bar-rectangle path')].slice(0,3).map(e => { const r = e.getBoundingClientRect(); return [Math.round(r.width), Math.round(r.height)] })`))
chrome.kill(); process.exit(0)