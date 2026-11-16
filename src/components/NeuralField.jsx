import { useEffect, useMemo, useRef } from 'react'

/**
 * Animated neural constellation — nodes drift slowly, edges light up as
 * "signals" travel between them. Pure SVG + one rAF loop, no canvas needed.
 */
export default function NeuralField({ nodes = 26, className = '' }) {
  const ref = useRef(null)
  const raf = useRef(0)

  const graph = useMemo(() => {
    let s = 20261108
    const rnd = () => { s = (s * 1664525 + 1013904223) % 4294967296; return s / 4294967296 }
    const pts = Array.from({ length: nodes }, (_, i) => ({
      id: i,
      x: rnd() * 100,
      y: rnd() * 100,
      r: 1.1 + rnd() * 2.1,
      vx: (rnd() - 0.5) * 0.055,
      vy: (rnd() - 0.5) * 0.055,
      hue: [190, 268, 300, 84][Math.floor(rnd() * 4)],
      phase: rnd() * Math.PI * 2,
    }))
    const edges = []
    pts.forEach((p, i) => {
      const near = pts
        .map((q, j) => ({ j, d: Math.hypot(p.x - q.x, p.y - q.y) }))
        .filter((x) => x.j !== i)
        .sort((a, b) => a.d - b.d)
        .slice(0, 2)
      near.forEach((n) => {
        if (!edges.some((e) => (e.a === i && e.b === n.j) || (e.a === n.j && e.b === i))) {
          edges.push({ a: i, b: n.j, speed: 0.16 + rnd() * 0.3, offset: rnd() })
        }
      })
    })
    return { pts, edges }
  }, [nodes])

  useEffect(() => {
    const svg = ref.current
    if (!svg) return
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const nodeEls = [...svg.querySelectorAll('[data-node]')]
    const edgeEls = [...svg.querySelectorAll('[data-edge]')]
    const pulseEls = [...svg.querySelectorAll('[data-pulse]')]
    const pts = graph.pts.map((p) => ({ ...p }))
    let t0 = performance.now()

    const frame = (now) => {
      const dt = Math.min(48, now - t0)
      t0 = now
      const time = now / 1000
      if (!reduce) {
        pts.forEach((p) => {
          p.x += p.vx * (dt / 16)
          p.y += p.vy * (dt / 16)
          if (p.x < 2 || p.x > 98) p.vx *= -1
          if (p.y < 2 || p.y > 98) p.vy *= -1
          p.x = Math.max(1, Math.min(99, p.x))
          p.y = Math.max(1, Math.min(99, p.y))
        })
      }
      nodeEls.forEach((el, i) => {
        const p = pts[i]
        el.setAttribute('cx', p.x.toFixed(2))
        el.setAttribute('cy', p.y.toFixed(2))
        const glow = 0.45 + 0.55 * (0.5 + 0.5 * Math.sin(time * 1.3 + p.phase))
        el.setAttribute('opacity', glow.toFixed(2))
      })
      edgeEls.forEach((el, i) => {
        const e = graph.edges[i]
        const a = pts[e.a], b = pts[e.b]
        el.setAttribute('x1', a.x.toFixed(2)); el.setAttribute('y1', a.y.toFixed(2))
        el.setAttribute('x2', b.x.toFixed(2)); el.setAttribute('y2', b.y.toFixed(2))
      })
      pulseEls.forEach((el, i) => {
        const e = graph.edges[i]
        const a = pts[e.a], b = pts[e.b]
        const k = reduce ? e.offset : (time * e.speed + e.offset) % 1
        el.setAttribute('cx', (a.x + (b.x - a.x) * k).toFixed(2))
        el.setAttribute('cy', (a.y + (b.y - a.y) * k).toFixed(2))
        el.setAttribute('opacity', (Math.sin(k * Math.PI) * 0.9).toFixed(2))
      })
      raf.current = requestAnimationFrame(frame)
    }
    raf.current = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(raf.current)
  }, [graph])

  return (
    <svg ref={ref} className={`neural-net ${className}`} viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs>
        <linearGradient id="neuralGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.5" />
          <stop offset="50%" stopColor="#a855f7" stopOpacity="0.42" />
          <stop offset="100%" stopColor="#e879f9" stopOpacity="0.3" />
        </linearGradient>
        <radialGradient id="nodeGlow">
          <stop offset="0%" stopColor="#fff" stopOpacity="0.95" />
          <stop offset="100%" stopColor="#22d3ee" stopOpacity="0" />
        </radialGradient>
      </defs>
      <g>
        {graph.edges.map((e, i) => (
          <line key={`e${i}`} data-edge={i} x1={graph.pts[e.a].x} y1={graph.pts[e.a].y}
            x2={graph.pts[e.b].x} y2={graph.pts[e.b].y} stroke="url(#neuralGrad)" strokeWidth="0.16" />
        ))}
      </g>
      <g>
        {graph.edges.map((e, i) => (
          <circle key={`p${i}`} data-pulse={i} r="0.42" fill={i % 3 === 0 ? '#a3e635' : i % 3 === 1 ? '#e879f9' : '#22d3ee'} />
        ))}
      </g>
      <g>
        {graph.pts.map((p, i) => (
          <g key={`n${i}`}>
            <circle data-node={i} cx={p.x} cy={p.y} r={p.r * 0.42}
              fill={`hsl(${p.hue} 92% 68%)`} />
          </g>
        ))}
      </g>
    </svg>
  )
}