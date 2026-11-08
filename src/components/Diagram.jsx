import { useId, useMemo } from 'react'
import './Diagram.css'

/*
  Architecture diagrams from a small spec.

  spec = {
    w, h,
    groups: [{ x, y, w, h, label, sub, kind: 'cloud' | 'vpc' | 'lane' | 'ext' }],
    nodes:  { id: { x, y, w?, h?, icon?, title, sub, kind?: 'aws' | 'ext' | 'graph' | 'router' | 'term', name?, steps? } },
    edges:  [{ from, to, kind?: 'flow' | 'queue' | 'fail' | 'cond', label?, via?: [[x, y]], fromAt?, toAt?, steps? }],
  }

  `active` highlights every node and edge whose `steps` include it, and dims the rest.
  Packets travel along the edges (only the highlighted ones while something is active).
*/

const NODE_W = 150
const NODE_H = 56

const box = (n) => ({ w: NODE_W, h: NODE_H, ...n })

// The point on a node's side facing (tx, ty).
function anchor(n, tx, ty) {
  const b = box(n)
  if (b.kind === 'term') {
    const l = Math.hypot(tx - b.x, ty - b.y) || 1
    return [b.x + ((tx - b.x) / l) * 21, b.y + ((ty - b.y) / l) * 21]
  }
  if (b.kind === 'router') {
    const dx = tx - b.x
    const dy = ty - b.y
    if (Math.abs(dx) >= Math.abs(dy)) return [b.x + Math.sign(dx) * 26, b.y]
    return [b.x, b.y + Math.sign(dy) * 26]
  }
  const cx = b.x + b.w / 2
  const cy = b.y + b.h / 2
  const dx = tx - cx
  const dy = ty - cy
  if (Math.abs(dx) / b.w > Math.abs(dy) / b.h) return [dx > 0 ? b.x + b.w : b.x, cy]
  return [cx, dy > 0 ? b.y + b.h : b.y]
}

const center = (n) => {
  const b = box(n)
  return b.kind === 'term' || b.kind === 'router' ? [b.x, b.y] : [b.x + b.w / 2, b.y + b.h / 2]
}

function route(e, nodes) {
  const a = nodes[e.from]
  const b = nodes[e.to]
  const via = e.via || []
  const firstTarget = via[0] || center(b)
  const lastSource = via[via.length - 1] || center(a)
  const p0 = e.fromAt || anchor(a, ...firstTarget)
  const p1 = e.toAt || anchor(b, ...lastSource)
  let pts = [p0, ...via, p1]
  if (!via.length) {
    const horizontal = Math.abs(p1[0] - p0[0]) >= Math.abs(p1[1] - p0[1])
    const sideH = p0[0] === box(a).x || p0[0] === box(a).x + box(a).w
    if (p0[0] !== p1[0] && p0[1] !== p1[1]) {
      if (horizontal && sideH) {
        const mx = (p0[0] + p1[0]) / 2
        pts = [p0, [mx, p0[1]], [mx, p1[1]], p1]
      } else {
        const my = (p0[1] + p1[1]) / 2
        pts = [p0, [p0[0], my], [p1[0], my], p1]
      }
    }
  }
  const d = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0]},${p[1]}`).join(' ')
  // Label on the longest segment
  let best = 0
  let mid = pts[0]
  let len = 0
  for (let i = 1; i < pts.length; i += 1) {
    const l = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1])
    len += l
    if (l > best) {
      best = l
      mid = [(pts[i][0] + pts[i - 1][0]) / 2, (pts[i][1] + pts[i - 1][1]) / 2]
    }
  }
  return { d, mid, len }
}

const on = (item, active) => active != null && item.steps?.includes(active)

function Node({ id, n, active }) {
  const b = box(n)
  const lit = on(n, active)
  const cls = `dg-node dg-node--${b.kind || 'aws'}${lit ? ' is-on' : ''}${active != null && !lit ? ' is-dim' : ''}`

  if (b.kind === 'term') {
    return (
      <g className={cls} data-id={id}>
        <circle cx={b.x} cy={b.y} r="20" className="dg-term" />
        <text x={b.x} y={b.y + 3.5} textAnchor="middle" className="dg-term-t">
          {b.title}
        </text>
      </g>
    )
  }
  if (b.kind === 'router') {
    const s = 26
    return (
      <g className={cls} data-id={id}>
        <path d={`M${b.x},${b.y - s} L${b.x + s},${b.y} L${b.x},${b.y + s} L${b.x - s},${b.y} Z`} className="dg-router" />
        <text x={b.x} y={b.y + 4} textAnchor="middle" className="dg-router-t">
          {b.title}
        </text>
      </g>
    )
  }
  const pad = b.icon ? 50 : 14
  return (
    <g className={cls} data-id={id}>
      <rect x={b.x} y={b.y} width={b.w} height={b.h} rx="10" className="dg-box" />
      {b.icon && (
        <svg x={b.x + 12} y={b.y + (b.h - 28) / 2} width="28" height="28" viewBox="0 0 64 64" className="dg-icon">
          <use href={`#${b.icon}`} />
        </svg>
      )}
      {b.kind === 'graph' ? (
        <>
          <text x={b.x + pad} y={b.y + 18} className="dg-name">
            {b.name}
          </text>
          <text x={b.x + pad} y={b.y + 36} className="dg-title">
            {b.title}
          </text>
          <text x={b.x + pad} y={b.y + 51} className={`dg-sub${/Claude/.test(b.sub) ? ' dg-sub--model' : ''}`}>
            {b.sub}
          </text>
        </>
      ) : (
        <>
          <text x={b.x + pad} y={b.y + b.h / 2 - 2} className="dg-title">
            {b.title}
          </text>
          <text x={b.x + pad} y={b.y + b.h / 2 + 14} className="dg-sub">
            {b.sub}
          </text>
        </>
      )}
    </g>
  )
}

export default function Diagram({ spec, active = null, label, className = '' }) {
  const uid = useId().replace(/:/g, '')
  const edges = useMemo(() => spec.edges.map((e) => ({ ...e, ...route(e, spec.nodes) })), [spec])

  return (
    <div className={`dg-scroll ${className}`}>
      <svg
        className={`dg${active != null ? ' has-active' : ''}`}
        viewBox={`0 0 ${spec.w} ${spec.h}`}
        style={{ minWidth: spec.minW || 760 }}
        role="img"
        aria-label={label}
      >
        <defs>
          {['flow', 'queue', 'fail', 'cond', 'on'].map((k) => (
            <marker key={k} id={`${uid}-${k}`} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M0 1 L9 5 L0 9 z" className={`dg-mk dg-mk--${k}`} />
            </marker>
          ))}
        </defs>

        {spec.groups?.map((g) => (
          <g key={g.label} className={`dg-group dg-group--${g.kind}`}>
            <rect x={g.x} y={g.y} width={g.w} height={g.h} rx="16" />
            <text x={g.x + 16} y={g.y + 22} className="dg-group-t">
              {g.label}
              {g.sub && <tspan className="dg-group-s">{`  ${g.sub}`}</tspan>}
            </text>
          </g>
        ))}

        {edges.map((e, i) => {
          const lit = on(e, active)
          const k = e.kind || 'flow'
          return (
            <g key={i} className={`dg-edge dg-edge--${k}${lit ? ' is-on' : ''}${active != null && !lit ? ' is-dim' : ''}`}>
              <path d={e.d} markerEnd={`url(#${uid}-${lit ? 'on' : k})`} />
              {(active == null || lit) && k !== 'fail' && (
                <circle r={lit ? 3.4 : 2.6} className="dg-packet">
                  <animateMotion dur={`${Math.min(4.5, Math.max(1.2, e.len / 110))}s`} repeatCount="indefinite" path={e.d} begin={`${(i * 0.37) % 1.6}s`} />
                </circle>
              )}
              {e.label && (
                <g className="dg-pill" transform={`translate(${e.mid[0]},${e.mid[1]})`}>
                  <rect x={-(e.label.length * 3.15 + 8)} y="-10" width={e.label.length * 6.3 + 16} height="20" rx="10" />
                  <text y="3.6" textAnchor="middle">
                    {e.label}
                  </text>
                </g>
              )}
            </g>
          )
        })}

        {Object.entries(spec.nodes).map(([id, n]) => (
          <Node key={id} id={id} n={n} active={active} />
        ))}
      </svg>
    </div>
  )
}
