/*
  All of the portfolio's words and projects live here. Edit this file to change the site.
*/

export const SITE = {
  name: 'Krish Jadav',
  role: 'AI Product Engineer',
  github: 'https://github.com/KrishJadav23',
  repo: 'https://github.com/KrishJadav23/KrishJadav23.github.io',
  // Add these and they appear in the footer, e.g. 'hello@yourdomain.com'
  email: '',
  linkedin: '',
}

// The hero reads "Engineering AI people <word>"; the word melts between these.
export const HERO_WORDS = ['trust.', 'rely on.', 'understand.']

// The project's name, used everywhere it appears.
export const AGENT_NAME = 'Self Serving Analytics Agent'
export const AGENT_ID = 'analytics-agent'

// Small facts under the hero. Edit freely.
export const HERO_META = [
  { label: 'Now', value: AGENT_NAME },
  { label: 'Stack', value: 'AWS, LangGraph, Claude, React' },
]

/*
  The teaser on the home page: a product window that morphs through
  Ask -> Reason -> Answer as you scroll. The data in the window is illustrative.
*/
export const AGENT_TEASER = {
  title: AGENT_NAME,
  tagline: 'A full-scale, self-serve analytics platform for every dataset in the business. Ask in plain English; every number traces back to one semantic model.',
  steps: [
    {
      label: 'Ask',
      title: 'in plain English',
      body: 'Anyone asks the way they would ask a data analyst. The API queues the question and replies at once, so a long answer never times out.',
    },
    {
      label: 'Reason',
      title: 'Claude chooses, code computes',
      body: 'A LangGraph agent asks Claude on Bedrock to plan using names from the semantic model. A compiler writes the SQL and DuckDB runs it on pinned Parquet.',
    },
    {
      label: 'Answer',
      title: 'grounded, then streamed',
      body: 'Claude writes the answer, and only sentences whose numbers appear in the result survive. The chart and its query travel with it.',
    },
  ],
  demo: {
    window: 'Analytics Agent',
    question: 'Why did weekly active users drop in Europe last month?',
    suggestions: ['Retention by signup cohort', 'Orders vs. forecast this quarter', 'Which features drive upgrades?'],
    plan: [
      { node: 'load_context', note: 'memory, model search, pin data' },
      { node: 'plan', note: 'Claude Sonnet · route: investigate' },
      { node: 'investigate', note: '3 queries, run together' },
      { node: 'narrate', note: 'numbers checked against result' },
    ],
    query: [
      '{',
      '  "measures":   ["weekly_active_users"],',
      '  "dimensions": ["platform"],',
      '  "filters":    { "region": "Europe" },',
      '  "period":     "last_month",',
      '  "compare":    "previous_period"',
      '}',
    ],
    bars: [
      { label: 'Web', value: 3, display: '−3%' },
      { label: 'iOS', value: 18, display: '−18%', hot: true },
      { label: 'Android', value: 5, display: '−5%' },
      { label: 'API', value: 1, display: '−1%' },
    ],
    insight: 'Most of the drop is on iOS, starting the week of the last app release. Web, Android and the API held roughly steady.',
  },
}

/*
  Work. A project with an id opens its own page at #/work/<id>.
  `soon: true` shows a "coming soon" card instead.
*/
export const PROJECTS = [
  {
    id: AGENT_ID,
    title: AGENT_NAME,
    kind: 'AI analytics platform on AWS',
    year: '2026',
    summary: 'Self-serve analytics for every dataset: a LangGraph agent on Bedrock over one governed query engine.',
    stack: ['Bedrock', 'LangGraph', 'Fargate', 'DuckDB'],
    theme: 'powder',
    art: 'graph',
    wide: true,
  },
  {
    soon: true,
    title: 'Coming soon',
    summary: 'The next one is in progress.',
  },
]

/*
  The 3D ring. `aws` names an AWS icon from the sprite; `icon` names a file in public/icons/.
*/
export const RING = [
  { name: 'Amazon Bedrock', use: 'Claude, managed', aws: 'i-bedrock' },
  { name: 'Claude', use: 'Planning and answers', icon: 'anthropic', colour: '#e8d5c4' },
  { name: 'LangGraph', use: 'Agent orchestration', icon: 'langchain', colour: '#b4d2e7' },
  { name: 'AWS Lambda', use: 'APIs and glue', aws: 'i-lambda' },
  { name: 'ECS Fargate', use: 'Agent and query services', aws: 'i-fargate' },
  { name: 'Step Functions', use: 'Batch pipelines', aws: 'i-sfn' },
  { name: 'API Gateway', use: 'The HTTP edge', aws: 'i-apigw' },
  { name: 'DynamoDB', use: 'State and checkpoints', aws: 'i-ddb' },
  { name: 'Amazon S3', use: 'Versioned Parquet', aws: 'i-s3' },
  { name: 'Amazon SQS', use: 'Queues and retries', aws: 'i-sqs' },
  { name: 'DuckDB', use: 'The query engine', icon: 'duckdb', colour: '#fff000' },
  { name: 'Python', use: 'Agents and services', icon: 'python', colour: '#6aa6d8' },
  { name: 'Terraform', use: 'Every resource', icon: 'terraform', colour: '#9b7cf0' },
  { name: 'React', use: 'Product interfaces', icon: 'react', colour: '#61DAFB' },
]

// The full stack, grouped, under the ring.
export const STACK = [
  { group: 'AI', items: ['Amazon Bedrock', 'Claude (Sonnet, Opus)', 'LangGraph', 'langchain-aws', 'Evaluation runs'] },
  {
    group: 'AWS',
    items: ['Lambda', 'ECS Fargate', 'Step Functions', 'API Gateway', 'SQS and SNS', 'EventBridge', 'DynamoDB', 'S3', 'Cognito', 'CloudWatch', 'ECR', 'Secrets Manager'],
  },
  { group: 'Data', items: ['DuckDB', 'Parquet', 'Semantic models', 'FastAPI', 'Python'] },
  { group: 'Delivery', items: ['Terraform', 'GitHub Actions', 'Docker'] },
  { group: 'Interface', items: ['React', 'TypeScript', 'WebGL and GLSL', 'CSS motion'] },
]
