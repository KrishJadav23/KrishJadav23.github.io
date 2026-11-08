import './ProjectArt.css'

/*
  Drawn covers for project cards, so a project looks finished before it has a
  screenshot. Give a project an `image` in content.js to use a picture instead.
*/

// A small architecture graph with requests travelling through it.
const G_NODES = [
  ['API', 30, 110],
  ['Queue', 120, 110],
  ['Agent', 210, 60],
  ['Bedrock', 310, 30],
  ['Query', 210, 170],
  ['Parquet', 310, 200],
  ['State', 310, 115],
]
const G_EDGES = [
  [0, 1],
  [1, 2],
  [2, 3],
  [2, 4],
  [4, 5],
  [2, 6],
]

function GraphArt() {
  const at = (i) => [G_NODES[i][1] + 32, G_NODES[i][2] + 13]
  return (
    <svg className="art art--graph" viewBox="0 0 400 260" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
      <rect width="400" height="260" fill="#0b0c0e" />
      <g stroke="#b4d2e7" strokeOpacity="0.06">
        {Array.from({ length: 21 }, (_, i) => (
          <line key={`v${i}`} x1={i * 20} x2={i * 20} y1="0" y2="260" />
        ))}
        {Array.from({ length: 14 }, (_, i) => (
          <line key={`h${i}`} y1={i * 20} y2={i * 20} x1="0" x2="400" />
        ))}
      </g>
      {G_EDGES.map(([a, b], i) => {
        const [x1, y1] = at(a)
        const [x2, y2] = at(b)
        const mx = (x1 + x2) / 2
        const d = `M${x1},${y1} C${mx},${y1} ${mx},${y2} ${x2},${y2}`
        return (
          <g key={i}>
            <path d={d} fill="none" stroke="#b4d2e7" strokeOpacity="0.35" strokeWidth="1" />
            <circle r="2.4" fill={i === 2 ? '#ec4a32' : '#edf2f6'}>
              <animateMotion dur={`${2.2 + i * 0.35}s`} repeatCount="indefinite" path={d} />
            </circle>
          </g>
        )
      })}
      {G_NODES.map(([label, x, y]) => (
        <g key={label}>
          <rect x={x} y={y} width="64" height="26" rx="6" fill="#121418" stroke="#b4d2e7" strokeOpacity="0.45" />
          <text x={x + 32} y={y + 17} textAnchor="middle" fontSize="10" fill="#edf2f6" fontFamily="Geist Mono, monospace">
            {label}
          </text>
        </g>
      ))}
    </svg>
  )
}

export default function ProjectArt({ project }) {
  if (project.image) {
    return <img className="art art--image" src={project.image} alt="" loading="lazy" />
  }
  return <GraphArt />
}
