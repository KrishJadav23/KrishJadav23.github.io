import './ProjectArt.css'

/*
  Drawn covers for project cards, so a project looks finished before it has a
  screenshot. Give a project an `image` in content.js to use a picture instead.
*/

const mulberry = (seed) => {
  let a = seed
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// A tiny glowing tree: a dome of dots, brighter toward the lower right.
const TREE_DOTS = (() => {
  const rand = mulberry(7)
  const dots = []
  const cx = 150
  const cy = 112
  const rx = 118
  const ry = 82
  for (let i = 0; i < 900; i += 1) {
    const u = rand() * 2 - 1
    const v = rand() * 2 - 1
    const ve = v > 0 ? v / 0.72 : v
    const lump = 1 + 0.05 * Math.sin(Math.atan2(ve, u) * 9)
    const d = Math.hypot(u, ve) / lump
    if (d > 1.03) continue
    const lit = Math.max(0, (u * 0.5 + ve * 0.85) / (Math.hypot(u, ve) || 1))
    const l = Math.min(1, 0.08 + d ** 3 * (0.3 + 0.8 * lit) + rand() * 0.15)
    dots.push({ x: cx + u * rx, y: cy + v * ry, r: 0.6 + l * 1.3, l })
  }
  return dots
})()

function TreeArt() {
  return (
    <svg className="art art--tree" viewBox="0 0 400 260" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs>
        <linearGradient id="tree-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#040b2a" />
          <stop offset="0.7" stopColor="#0d32a8" />
          <stop offset="1" stopColor="#2a6dff" />
        </linearGradient>
        <radialGradient id="tree-glow" cx="0.35" cy="0.86" r="0.6">
          <stop offset="0" stopColor="#d4f1ff" stopOpacity="0.85" />
          <stop offset="1" stopColor="#3a7cff" stopOpacity="0" />
        </radialGradient>
        <filter id="tree-bloom" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="2.2" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <rect width="400" height="260" fill="url(#tree-sky)" />
      <rect width="400" height="260" fill="url(#tree-glow)" />
      <rect y="222" width="400" height="38" fill="#0c33b0" />
      <rect y="221" width="400" height="1.5" fill="#cdeeff" opacity="0.9" />
      <path d="M128 224c10-2 13-14 14-40 1-14 0-22-2-32h18c-2 10-3 18-2 32 1 26 4 38 16 40z" fill="#030a2a" />
      <ellipse cx="150" cy="112" rx="116" ry="80" fill="#051345" />
      <g filter="url(#tree-bloom)">
        {TREE_DOTS.map((d, i) => (
          <circle
            key={i}
            cx={d.x.toFixed(1)}
            cy={d.y.toFixed(1)}
            r={d.r.toFixed(2)}
            fill={d.l > 0.6 ? '#c9efff' : d.l > 0.3 ? '#4d97ff' : '#1a46c8'}
            opacity={(0.5 + d.l * 0.5).toFixed(2)}
          />
        ))}
      </g>
      <rect x="262" y="214" width="3" height="9" rx="1" fill="#010414" />
      <circle cx="263.5" cy="212" r="2" fill="#010414" />
      <g className="art__birds" stroke="#fff" strokeWidth="1.4" fill="none" strokeLinecap="round">
        <path d="M300 70q4-4 8 0q4-4 8 0" />
        <path d="M322 78q3-3 6 0q3-3 6 0" />
        <path d="M284 82q3-3 6 0q3-3 6 0" />
      </g>
    </svg>
  )
}

const KEYS = ['K', 'R', 'I', 'S', 'H', 'C', 'O', 'D', 'E', '✦', '↵', 'J']

function KeysArt() {
  return (
    <div className="art art--keys" aria-hidden="true">
      <div className="art__keybed">
        {KEYS.map((k, i) => (
          <span key={k} className={`art__key art__key--${i % 4}`} style={{ '--i': i }}>
            {k}
          </span>
        ))}
      </div>
    </div>
  )
}

// A small ASCII landscape, worked out once.
const ASCII = (() => {
  const ramp = ' .:-=+*#%@'
  const cols = 64
  const rows = 22
  const lines = []
  for (let r = 0; r < rows; r += 1) {
    let line = ''
    const v = r / rows
    for (let c = 0; c < cols; c += 1) {
      const u = c / cols
      const ridge = 0.62 - 0.22 * Math.abs(Math.sin(u * 5 + 1)) - 0.08 * Math.abs(Math.sin(u * 13))
      const ridge2 = 0.74 - 0.12 * Math.abs(Math.sin(u * 7 + 3))
      const sun = Math.hypot((u - 0.78) * 2.2, v - 0.25)
      let lum
      if (v > 0.86) lum = 0.12 + 0.08 * Math.sin(u * 40 + v * 20) + (Math.abs(u - 0.78) < 0.05 ? 0.5 : 0)
      else if (v > ridge2) lum = 0.3 - (v - ridge2)
      else if (v > ridge) lum = 0.5 - (v - ridge) * 1.2
      else if (sun < 0.1) lum = 1
      else lum = 0.04 + 0.5 * Math.exp(-(sun - 0.1) * 7) + (((c * 7 + r * 13) % 37 === 0 && v < 0.4) ? 0.6 : 0)
      const bayer = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5][(r & 3) * 4 + (c & 3)] / 16
      line += ramp[Math.min(9, Math.max(0, Math.floor(lum * 9 + bayer)))]
    }
    lines.push(line)
  }
  return lines.join('\n')
})()

function AsciiArt() {
  return (
    <div className="art art--ascii" aria-hidden="true">
      <pre>{ASCII}</pre>
    </div>
  )
}

function OrbitArt() {
  return (
    <svg className="art art--orbit" viewBox="0 0 400 260" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs>
        <radialGradient id="orbit-core" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="0.35" stopColor="#ffb27a" stopOpacity="0.9" />
          <stop offset="1" stopColor="#ff6a2b" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="orbit-bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#2a2421" />
          <stop offset="1" stopColor="#0b0a09" />
        </linearGradient>
      </defs>
      <rect width="400" height="260" fill="url(#orbit-bg)" />
      <g stroke="#ffd9bd" fill="none" opacity="0.5">
        {[0, 1, 2, 3, 4].map((i) => (
          <line key={`h${i}`} x1="0" x2="400" y1={40 + i * 50} y2={40 + i * 50} strokeOpacity="0.12" />
        ))}
        {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
          <line key={`v${i}`} y1="0" y2="260" x1={25 + i * 50} x2={25 + i * 50} strokeOpacity="0.12" />
        ))}
      </g>
      <circle cx="200" cy="130" r="60" fill="url(#orbit-core)" />
      {[
        [90, 34, 0, '18s'],
        [140, 54, -18, '26s'],
        [180, 74, 12, '34s'],
      ].map(([rx, ry, rot, dur], i) => (
        <g key={rx} transform={`rotate(${rot} 200 130)`}>
          <ellipse cx="200" cy="130" rx={rx} ry={ry} fill="none" stroke="#ffe3cf" strokeOpacity="0.35" />
          <circle r={3.5 - i * 0.6} fill="#fff">
            <animateMotion
              dur={dur}
              repeatCount="indefinite"
              path={`M${200 - rx},130 a${rx},${ry} 0 1,0 ${rx * 2},0 a${rx},${ry} 0 1,0 ${-rx * 2},0`}
            />
          </circle>
        </g>
      ))}
      <circle cx="200" cy="130" r="9" fill="#fff" />
    </svg>
  )
}

const ARTS = { tree: TreeArt, keys: KeysArt, ascii: AsciiArt, orbit: OrbitArt }

export default function ProjectArt({ project }) {
  if (project.image) {
    return <img className="art art--image" src={project.image} alt="" loading="lazy" />
  }
  const Art = ARTS[project.art] ?? OrbitArt
  return <Art />
}
