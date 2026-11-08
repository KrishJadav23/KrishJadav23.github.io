import './ProjectArt.css'

/*
  Drawn covers for project cards, so a project looks finished before it has a
  screenshot. Give a project an `image` in content.js to use a picture instead.
*/

// The analytics agent's request path, as a live flow: requests travel through it.
const NW = 132
const NH = 46
const G_NODES = {
  q: ['Question', 'browser', 'i-user', 24, 107],
  api: ['API Gateway', 'HTTP API', 'i-apigw', 196, 107],
  sqs: ['SQS', 'chat queue', 'i-sqs', 368, 107],
  agent: ['Agent', 'LangGraph', 'i-fargate', 540, 107],
  bed: ['Bedrock', 'plans, writes', 'i-bedrock', 730, 26],
  qs: ['Query', 'DuckDB', 'i-fargate', 730, 107],
  ddb: ['DynamoDB', 'state', 'i-ddb', 730, 188],
  pq: ['Parquet', 'on S3', 'i-s3', 920, 107],
}
const G_EDGES = [
  ['q', 'api'],
  ['api', 'sqs'],
  ['sqs', 'agent'],
  ['agent', 'bed', true],
  ['agent', 'qs'],
  ['agent', 'ddb'],
  ['qs', 'pq'],
]

function GraphArt() {
  const right = (k) => [G_NODES[k][3] + NW, G_NODES[k][4] + NH / 2]
  const left = (k) => [G_NODES[k][3], G_NODES[k][4] + NH / 2]
  return (
    <svg className="art art--graph" viewBox="0 0 1080 260" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
      <defs>
        <pattern id="art-grid" width="24" height="24" patternUnits="userSpaceOnUse">
          <path d="M24 0H0V24" fill="none" stroke="#b4d2e7" strokeOpacity="0.06" />
        </pattern>
      </defs>
      <rect width="1080" height="260" fill="url(#art-grid)" />
      {G_EDGES.map(([a, b, hot], i) => {
        const [x1, y1] = right(a)
        const [x2, y2] = left(b)
        const mx = (x1 + x2) / 2
        const d = y1 === y2 ? `M${x1},${y1} L${x2},${y2}` : `M${x1},${y1} C${mx},${y1} ${mx},${y2} ${x2},${y2}`
        return (
          <g key={i}>
            <path d={d} fill="none" stroke="#b4d2e7" strokeOpacity="0.32" strokeWidth="1.2" />
            <circle r="3" fill={hot ? '#ec4a32' : '#edf2f6'}>
              <animateMotion dur={`${1.6 + (i % 3) * 0.45}s`} begin={`${i * 0.3}s`} repeatCount="indefinite" path={d} />
            </circle>
          </g>
        )
      })}
      {Object.entries(G_NODES).map(([k, [label, sub, icon, x, y]]) => (
        <g key={k}>
          <rect
            x={x}
            y={y}
            width={NW}
            height={NH}
            rx="9"
            fill="#121418"
            stroke="#b4d2e7"
            strokeOpacity={k === 'agent' ? 0.7 : 0.28}
            strokeDasharray={k === 'q' ? '4 3' : undefined}
          />
          <svg x={x + 10} y={y + 11} width="24" height="24" viewBox="0 0 64 64" style={{ color: '#b4d2e7' }}>
            <use href={`#${icon}`} />
          </svg>
          <text x={x + 44} y={y + 21} fontSize="12.5" fill="#edf2f6" fontFamily="Inter, sans-serif" fontWeight="500">
            {label}
          </text>
          <text x={x + 44} y={y + 35} fontSize="10.5" fill="#95a1ac" fontFamily="Inter, sans-serif">
            {sub}
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
