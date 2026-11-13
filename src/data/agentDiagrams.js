/*
  The analytics agent's architecture, redrawn for the case study from the architecture document.
  Simplified on purpose: each diagram shows what a reader needs, not every resource.
*/

const A = 'ingest'
const Q = 'ask'
const G = 'agent'
const C = 'canvas'

// 0 · The whole system: data flows along the top, questions along the bottom.
export const OVERVIEW = {
  w: 1240,
  h: 600,
  minW: 900,
  groups: [
    { x: 196, y: 14, w: 1030, h: 572, label: 'AWS Cloud', sub: 'Separate dev and prod stacks', kind: 'cloud' },
    { x: 210, y: 52, w: 1002, h: 150, label: 'Data in', kind: 'lane' },
    { x: 210, y: 222, w: 1002, h: 350, label: 'Questions', kind: 'lane' },
  ],
  nodes: {
    dbt: { x: 20, y: 100, title: 'DBT export', sub: 'nightly CSV', icon: 'i-docs', kind: 'ext', steps: [A] },
    users: { x: 20, y: 390, title: 'People', sub: 'any team, browser', icon: 'i-users', kind: 'ext', steps: [Q, C] },
    src: { x: 230, y: 100, title: 'Source bucket', sub: 'shared drop', icon: 'i-s3', steps: [A] },
    eb: { x: 394, y: 100, title: 'EventBridge', sub: 'success-file rule', icon: 'i-eb', steps: [A] },
    ing: { x: 558, y: 100, title: 'Ingestion', sub: 'Lambda · validate', icon: 'i-lambda', steps: [A] },
    sfn: { x: 722, y: 100, title: 'Step Functions', sub: 'one run per batch', icon: 'i-sfn', steps: [A] },
    conv: { x: 886, y: 100, title: 'Converter', sub: 'Fargate · DuckDB', icon: 'i-fargate', steps: [A] },
    pq: { x: 1050, y: 100, title: 'Analytics data', sub: 'versioned Parquet', icon: 'i-s3', steps: [A, C] },
    cog: { x: 230, y: 280, title: 'Cognito', sub: 'single sign-on', icon: 'i-cognito', steps: [Q] },
    api: { x: 230, y: 390, title: 'HTTP API', sub: 'API Gateway', icon: 'i-apigw', steps: [Q, C] },
    lam: { x: 394, y: 390, title: 'API Lambda', sub: 'every app route', icon: 'i-lambda', steps: [Q, C] },
    sqs: { x: 558, y: 390, title: 'Chat queue', sub: 'SQS + DLQ', icon: 'i-sqs', steps: [Q, G] },
    agent: { x: 722, y: 390, title: 'Agent', sub: 'LangGraph', icon: 'i-fargate', steps: [G] },
    bed: { x: 722, y: 280, title: 'Amazon Bedrock', sub: 'Claude', icon: 'i-bedrock', steps: [G] },
    qs: { x: 886, y: 390, title: 'Query service', sub: 'Fargate · DuckDB', icon: 'i-fargate', steps: [G, C] },
    ddb: { x: 1050, y: 390, title: 'DynamoDB', sub: 'state · memory', icon: 'i-ddb', steps: [G] },
  },
  edges: [
    { from: 'dbt', to: 'src', steps: [A] },
    { from: 'src', to: 'eb', steps: [A] },
    { from: 'eb', to: 'ing', kind: 'queue', steps: [A] },
    { from: 'ing', to: 'sfn', kind: 'queue', steps: [A] },
    { from: 'sfn', to: 'conv', steps: [A] },
    { from: 'conv', to: 'pq', steps: [A] },
    { from: 'users', to: 'cog', steps: [Q] },
    { from: 'users', to: 'api', steps: [Q, C] },
    { from: 'api', to: 'lam', steps: [Q, C] },
    { from: 'lam', to: 'sqs', kind: 'queue', steps: [Q] },
    { from: 'sqs', to: 'agent', kind: 'queue', steps: [G] },
    { from: 'agent', to: 'bed', label: 'plan · write', steps: [G] },
    { from: 'agent', to: 'qs', steps: [G] },
    { from: 'qs', to: 'pq', via: [[961, 240], [1125, 240]], label: 'reads pinned Parquet', steps: [G, C] },
    { from: 'lam', to: 'qs', via: [[469, 486], [961, 486]], label: 'canvas queries', steps: [C] },
    { from: 'agent', to: 'ddb', via: [[797, 540], [1125, 540]], label: 'requests · memory · checkpoints', steps: [G] },
  ],
}

// 2 · One question, end to end (synced with the numbered steps).
export const REQUEST = {
  w: 1000,
  h: 480,
  minW: 680,
  groups: [
    { x: 208, y: 12, w: 784, h: 460, label: 'AWS Cloud', kind: 'cloud' },
    { x: 398, y: 168, w: 580, h: 292, label: 'Analytics VPC', sub: 'private subnets · no internet route', kind: 'vpc' },
  ],
  nodes: {
    user: { x: 20, y: 52, title: 'Person', sub: 'browser', icon: 'i-user', kind: 'ext', steps: [1, 2, 9] },
    cog: { x: 228, y: 52, title: 'Cognito', sub: 'single sign-on', icon: 'i-cognito', steps: [1] },
    bed: { x: 798, y: 52, title: 'Amazon Bedrock', sub: 'Claude', icon: 'i-bedrock', steps: [5, 8] },
    api: { x: 228, y: 210, title: 'HTTP API', sub: 'API Gateway', icon: 'i-apigw', steps: [2, 3, 9] },
    lam: { x: 418, y: 210, title: 'API Lambda', sub: 'in the VPC', icon: 'i-lambda', steps: [3, 9] },
    sqs: { x: 608, y: 210, title: 'Chat queue', sub: 'SQS + DLQ', icon: 'i-sqs', steps: [3, 4] },
    agent: { x: 798, y: 210, title: 'Agent', sub: 'ECS Fargate', icon: 'i-fargate', steps: [4, 5, 6, 8] },
    ddb: { x: 418, y: 388, title: 'DynamoDB', sub: 'request record', icon: 'i-ddb', steps: [3, 8, 9] },
    s3: { x: 608, y: 388, title: 'Analytics data', sub: 'pinned Parquet', icon: 'i-s3', steps: [7] },
    qs: { x: 798, y: 388, title: 'Query service', sub: 'Fargate · DuckDB', icon: 'i-fargate', steps: [6, 7] },
  },
  edges: [
    { from: 'user', to: 'cog', label: 'sign in', steps: [1] },
    { from: 'user', to: 'api', via: [[95, 238]], label: 'ask', steps: [2, 9] },
    { from: 'api', to: 'lam', steps: [2, 3, 9] },
    { from: 'lam', to: 'ddb', label: 'save · poll', steps: [3, 9] },
    { from: 'lam', to: 'sqs', kind: 'queue', steps: [3] },
    { from: 'sqs', to: 'agent', kind: 'queue', steps: [4] },
    { from: 'agent', to: 'bed', label: 'plan · write', steps: [5, 8] },
    { from: 'agent', to: 'qs', label: 'internal ALB', steps: [6] },
    { from: 'qs', to: 's3', steps: [7] },
    { from: 'agent', to: 'ddb', fromAt: [830, 266], via: [[830, 340], [538, 340]], toAt: [538, 388], label: 'checked sentences', steps: [8] },
  ],
}

export const REQUEST_STEPS = [
  { title: 'Sign in', body: 'The person signs in through Amazon Cognito with company single sign-on and receives a token.' },
  { title: 'Ask', body: 'The browser posts the question to the HTTP API, which checks the token before anything runs.' },
  { title: 'Queue', body: 'API Gateway allows 29 seconds and a good answer can take longer, so the API Lambda saves a request record, queues the question and replies at once.' },
  { title: 'Pick up', body: 'The agent, an ECS Fargate service that scales on the queue backlog, takes the question.' },
  { title: 'Plan with Claude', body: 'Claude on Bedrock plans, but may only choose measures, dimensions and filters that exist in the semantic model. It never writes SQL.' },
  { title: 'Query', body: 'The semantic query goes to the query service through an internal load balancer only the platform’s own services can reach.' },
  { title: 'Read the data', body: 'The query service checks the person’s access, compiles parameterised SQL and has DuckDB read the pinned Parquet version straight from S3.' },
  { title: 'Write the answer', body: 'Claude writes the answer. Only sentences whose numbers appear in the result are kept, and they stream into the request record as they pass.' },
  { title: 'Follow progress', body: 'The browser polls about once a second and shows the draft, then the final answer with its chart.' },
]

// 3 · The LangGraph agent: a fixed graph of steps around Claude.
const all = ['query', 'investigate', 'act', 'dashboard', 'clarify']
export const AGENT = {
  w: 1180,
  h: 530,
  minW: 940,
  nodes: {
    start: { x: 28, y: 248, title: 'START', kind: 'term', steps: all },
    lc: { x: 70, y: 218, w: 156, h: 60, kind: 'graph', name: 'load_context', title: 'Load context', sub: 'No model call', steps: all },
    plan: { x: 262, y: 218, w: 156, h: 60, kind: 'graph', name: 'plan', title: 'Plan', sub: 'Claude Sonnet · medium', steps: all },
    router: { x: 482, y: 248, title: 'route', kind: 'router', steps: all },
    execute: { x: 580, y: 30, w: 156, h: 60, kind: 'graph', name: 'execute', title: 'Run the query', sub: 'DuckDB via query service', steps: ['query'] },
    inspect: { x: 772, y: 30, w: 156, h: 60, kind: 'graph', name: 'inspect', title: 'Inspect result', sub: 'Empty or rejected?', steps: ['query'] },
    investigate: { x: 580, y: 132, w: 156, h: 60, kind: 'graph', name: 'investigate', title: 'Investigate', sub: 'Up to 4 queries at once', steps: ['investigate'] },
    narrate: { x: 964, y: 84, w: 156, h: 60, kind: 'graph', name: 'narrate', title: 'Write answer', sub: 'Claude Sonnet · low', steps: ['query', 'investigate'] },
    pa: { x: 580, y: 234, w: 156, h: 60, kind: 'graph', name: 'plan_action', title: 'Action agent', sub: 'Claude Sonnet · high', steps: ['act'] },
    ra: { x: 772, y: 234, w: 156, h: 60, kind: 'graph', name: 'run_action', title: 'Run the tool', sub: 'Proposal until confirmed', steps: ['act'] },
    dash: { x: 580, y: 336, w: 156, h: 60, kind: 'graph', name: 'build_dashboard', title: 'Build dashboard', sub: 'Playbook visuals', steps: ['dashboard'] },
    clarify: { x: 580, y: 438, w: 156, h: 60, kind: 'graph', name: 'clarify', title: 'Ask the person', sub: 'interrupt() + checkpoint', steps: ['clarify'] },
    person: { x: 772, y: 438, w: 156, h: 60, kind: 'ext', title: 'Person answers', sub: 'resumes via SQS', steps: ['clarify'] },
    publish: { x: 964, y: 286, w: 156, h: 60, kind: 'graph', name: 'publish', title: 'Publish', sub: 'Artifact, memory, score', steps: ['query', 'investigate', 'act', 'dashboard'] },
    end: { x: 1152, y: 316, title: 'END', kind: 'term', steps: ['query', 'investigate', 'act', 'dashboard'] },
  },
  edges: [
    { from: 'start', to: 'lc', steps: all },
    { from: 'lc', to: 'plan', steps: all },
    { from: 'plan', to: 'router', steps: all },
    { from: 'router', to: 'execute', kind: 'cond', label: 'query', via: [[540, 248], [540, 60]], steps: ['query'] },
    { from: 'router', to: 'investigate', kind: 'cond', label: 'why', via: [[540, 248], [540, 162]], steps: ['investigate'] },
    { from: 'router', to: 'pa', kind: 'cond', label: 'act', via: [[540, 248], [540, 264]], steps: ['act'] },
    { from: 'router', to: 'dash', kind: 'cond', label: 'dashboard', via: [[540, 248], [540, 366]], steps: ['dashboard'] },
    { from: 'router', to: 'clarify', kind: 'cond', label: 'clarify', via: [[540, 248], [540, 468]], steps: ['clarify'] },
    { from: 'execute', to: 'inspect', steps: ['query'] },
    { from: 'inspect', to: 'narrate', steps: ['query'] },
    { from: 'investigate', to: 'narrate', steps: ['investigate'] },
    { from: 'narrate', to: 'publish', steps: ['query', 'investigate'] },
    { from: 'pa', to: 'ra', steps: ['act'] },
    { from: 'ra', to: 'publish', steps: ['act'] },
    { from: 'dash', to: 'publish', steps: ['dashboard'] },
    { from: 'clarify', to: 'person', kind: 'queue', steps: ['clarify'] },
    { from: 'person', to: 'plan', kind: 'queue', via: [[850, 516], [340, 516]], label: 'Command(resume)', steps: ['clarify'] },
    { from: 'inspect', to: 'plan', kind: 'fail', via: [[850, 12], [340, 12]], label: 're-plan once · Claude Opus · high', steps: [] },
    { from: 'publish', to: 'end', steps: ['query', 'investigate', 'act', 'dashboard'] },
  ],
}

export const AGENT_ROUTES = [
  { id: 'query', label: 'Data question', note: 'Plan, run the query, inspect it, write the answer.' },
  { id: 'investigate', label: 'Why question', note: 'Up to four planned queries run together; one answer from all of them.' },
  { id: 'act', label: 'Action', note: 'A separate action agent picks one tool. Anything that messages people stays a proposal until confirmed.' },
  { id: 'dashboard', label: 'Dashboard', note: 'A playbook in the semantic model decides the visuals. No model call.' },
  { id: 'clarify', label: 'Needs a choice', note: 'interrupt() pauses and checkpoints the graph; any agent task resumes it with the answer.' },
]
