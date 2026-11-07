/*
  All of the portfolio's words and projects live here. Edit this file to change the site.
*/

export const SITE = {
  name: 'Krish Jadav',
  role: 'AI Product Engineer',
  github: 'https://github.com/KrishJadav23',
  repo: 'https://github.com/KrishJadav23/KrishJadav23.github.io',
  // Add these to show them in the footer and menu, e.g. 'hello@yourdomain.com'
  email: '',
  linkedin: '',
  available: true,
}

// The headline reads "Turning models into <word>"; the word melts between these.
export const MORPH_WORDS = ['products.', 'insights.', 'interfaces.', 'decisions.']

// The ticker along the bottom of the hero. Edit to match what you do.
export const CAPABILITIES = [
  'AI products',
  'LLM interfaces',
  'Analytics systems',
  'Agents & tooling',
  'Retrieval pipelines',
  'Design engineering',
  'Rapid prototyping',
  'Evaluation',
]

/*
  FEATURED: the AI analytics system you built at work.
  TODO: replace every line below with the real story (name, what it does, your role,
  the stack). The `demo` block drives the animated product window; keep it believable
  but you can change the question, plan, query and chart to match your system.
*/
export const FEATURED = {
  title: 'AI Analytics System',
  context: 'Built at work',
  tagline: 'Ask your data a question. Get an answer you can trace.',
  steps: [
    {
      label: 'Ask',
      title: 'in plain English',
      body: 'Anyone on the team types a question the way they would ask an analyst. No SQL, no dashboard hunting.',
    },
    {
      label: 'Reason',
      title: 'plan, query, check',
      body: 'The system plans the analysis, writes the query, runs it on the warehouse and checks the result before it says a word.',
    },
    {
      label: 'Answer',
      title: 'a chart and a sentence',
      body: 'It replies with the right chart, a plain summary and the query behind it, so every number can be traced back.',
    },
  ],
  stack: ['LLM orchestration', 'Python', 'SQL', 'React', 'Evaluation'],
  demo: {
    window: 'Analytics · Assistant',
    question: 'Which regions drove the rise in churn last quarter?',
    suggestions: ['Weekly active users by plan', 'Top drivers of churn', 'Revenue vs. forecast'],
    plan: ['Understand the question', 'Pick tables: accounts, events', 'Write and run the query', 'Check the result'],
    sql: [
      'SELECT region,',
      '       AVG(churned) AS churn_rate',
      'FROM   accounts a',
      'JOIN   events e USING (account_id)',
      "WHERE  quarter = '2026-Q3'",
      'GROUP  BY region',
      'ORDER  BY churn_rate DESC;',
    ],
    bars: [
      { label: 'EMEA', value: 9.4, display: '9.4%', hot: true },
      { label: 'NA', value: 5.1, display: '5.1%' },
      { label: 'APAC', value: 4.2, display: '4.2%' },
      { label: 'LATAM', value: 3.6, display: '3.6%' },
    ],
    insight: 'Churn rose fastest in EMEA, almost twice the next region, concentrated in accounts that never finished onboarding.',
    sources: 'accounts, events',
  },
}

/*
  Projects (the folder cards)
  - art: drawn cover when there is no screenshot ('tree' | 'keys' | 'ascii' | 'orbit')
    Give a project an `image` (e.g. '/projects/my-app.jpg' in public/) to use a screenshot.
  - theme: card colour ('ember' | 'paper' | 'ink' | 'smoke')
  - demo: a live demo in the project window ('scene' | 'keyboard' | 'ascii'), optional
  - links: leave one out to hide its button
*/
export const PROJECTS = [
  {
    id: 'keyboard-hero',
    title: 'Keyboard Hero',
    kind: 'Interactive 3D',
    year: '2026',
    summary: 'A tactile 3D keyboard you can play with the mouse or your own keys.',
    body: [
      'A fold-open device built entirely from CSS 3D transforms. Every keycap has a springy press, a glow and its own note on the display.',
      'Type on your own keyboard and the matching keys go down with you. Try it above.',
    ],
    stack: ['CSS 3D', 'React', 'Pointer events'],
    theme: 'ember',
    art: 'keys',
    demo: 'keyboard',
    links: { code: 'https://github.com/KrishJadav23/KrishJadav23.github.io' },
  },
  {
    id: 'night-scene',
    title: 'Night Scene',
    kind: 'Generative canvas',
    year: '2026',
    summary: 'A glowing tree, drifting clouds and fireflies, painted live on a canvas.',
    body: [
      'Tens of thousands of leaf-dots lit from the horizon, clumped with embossed value noise so every cluster catches the light, with a cheap bloom on top.',
      'The heavy layers are painted once per resize in small tasks, so the page never stalls; each frame only animates stars, birds and fireflies.',
    ],
    stack: ['Canvas 2D', 'JavaScript', 'React'],
    theme: 'paper',
    art: 'tree',
    demo: 'scene',
    links: { code: 'https://github.com/KrishJadav23/KrishJadav23.github.io' },
  },
  {
    id: 'ascii-valley',
    title: 'ASCII Valley',
    kind: 'Creative coding',
    year: '2026',
    summary: 'Mountains, pines and a lake, dithered into ASCII twelve times a second.',
    body: [
      'A procedural landscape sampled on a coarse grid, ordered-dithered with a 4×4 Bayer matrix and drawn as characters from a ten-step ramp.',
      'The sun sways, the lake ripples, birds cross the sky, and the whole thing leans with your pointer.',
    ],
    stack: ['Canvas', 'Bayer dithering', 'JavaScript'],
    theme: 'ink',
    art: 'ascii',
    demo: 'ascii',
    links: { code: 'https://github.com/KrishJadav23/KrishJadav23.github.io' },
  },
  {
    id: 'portfolio',
    title: 'This portfolio',
    kind: 'WebGL · Website',
    year: '2026',
    summary: 'Thirty thousand GPU particles that morph between shapes as you scroll.',
    body: [
      'Raw WebGL2, no 3D library. Every shape lives on the GPU at once and each particle pours from one to the next on its own delay, drifting on curl noise, swirled by your cursor.',
      'Around it: a dynamic-island menu, liquid type, cards that morph into their own case study. All of it respects reduced motion and works from the keyboard.',
    ],
    stack: ['WebGL2', 'GLSL', 'React 19', 'Vite'],
    theme: 'smoke',
    art: 'orbit',
    links: {
      live: 'https://krishjadav23.github.io/',
      code: 'https://github.com/KrishJadav23/KrishJadav23.github.io',
    },
  },
]

// The 3D ring in the Toolbox section. `icon` is a file in public/icons/.
// TODO: add the AI tools you use day to day (e.g. a model provider, a vector database).
export const TOOLS = [
  { name: 'Python', use: 'Models, data and APIs', icon: 'python', colour: '#4B8BBE' },
  { name: 'React', use: 'Product interfaces', icon: 'react', colour: '#61DAFB' },
  { name: 'JavaScript', use: 'Interaction and logic', icon: 'javascript', colour: '#F7DF1E' },
  { name: 'WebGL', use: 'Particles and shaders', icon: 'canvas', colour: '#ff8a50' },
  { name: 'CSS', use: 'Layout, 3D and motion', icon: 'css3', colour: '#3b8eea' },
  { name: 'HTML', use: 'Accessible markup', icon: 'html5', colour: '#E34F26' },
  { name: 'Vite', use: 'Dev server and builds', icon: 'vite', colour: '#646CFF' },
  { name: 'Node.js', use: 'Tooling and scripts', icon: 'nodedotjs', colour: '#5FA04E' },
  { name: 'Git', use: 'Branches and history', icon: 'git', colour: '#F05032' },
  { name: 'GitHub', use: 'Code and Pages hosting', icon: 'github', colour: '#ffffff' },
  { name: 'npm', use: 'Packages', icon: 'npm', colour: '#CB3837' },
]

// The About statement. Words wrapped in *stars* are set in the serif.
export const ABOUT =
  "I'm Krish, an AI product engineer. I take models out of notebooks and put them in front of people: the *data* underneath, the *reasoning* in the middle, and an interface that makes it feel obvious. I care about answers you can trust and details that make someone say *wow.*"

export const FACTS = [
  { label: 'Role', value: 'AI Product Engineer' },
  { label: 'Focus', value: 'AI products, analytics, interfaces' },
  { label: 'Status', value: 'Open to new work' },
]
