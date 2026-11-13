import { useEffect, useRef, useState } from 'react'
import Diagram from '../components/Diagram'
import { ArrowLeft, ArrowRight } from '../components/Icons'
import { AGENT_NAME } from '../data/content'
import { AGENT, AGENT_ROUTES, OVERVIEW, REQUEST, REQUEST_STEPS } from '../data/agentDiagrams'
import { routeLink } from '../router'
import './Case.css'

const SPEC = [
  ['Platform', 'AWS'],
  ['Compute', 'Lambda and ECS Fargate'],
  ['Data', 'Parquet on S3, read by DuckDB'],
  ['AI', 'Claude on Bedrock, LangGraph'],
  ['Infrastructure', 'Terraform via GitHub Actions'],
  ['Environments', 'Dev and prod, separate stacks'],
]

const NUMBERS = [
  ['1', 'semantic model behind every number'],
  ['2', 'model calls for most questions'],
  ['14', 'nodes in the agent graph'],
  ['0', 'lines of SQL written by the model'],
]

const AREAS = [
  { id: 'ingest', n: '01', title: 'Data in', body: 'Each nightly export becomes a new, versioned set of Parquet files. Nothing is visible until a whole batch converts.' },
  { id: 'ask', n: '02', title: 'Asking', body: 'Questions are queued and answered asynchronously, so a thoughtful answer never hits a gateway timeout.' },
  { id: 'agent', n: '03', title: 'The agent', body: 'A LangGraph service plans with Claude on Bedrock and asks the query service for numbers.' },
  { id: 'canvas', n: '04', title: 'Canvas', body: 'Dashboards call the same query service directly, so chat and canvas can never disagree.' },
]

const MODELS = [
  ['Plan a data question', 'Sonnet', 'medium', 'One structured call: the route and the semantic query.'],
  ['Re-plan a rejected query', 'Opus', 'high', 'The single repair gets the stronger model, with the reason it failed.'],
  ['Action agent', 'Sonnet', 'high', 'Picks one tool from a fixed list and fills its arguments.'],
  ['Write the answer', 'Sonnet', 'low', 'Streamed. A sentence with an unchecked number is rewritten once, then dropped.'],
  ['Summarise a dashboard', 'Sonnet', 'medium', 'Reads every visual together; every number checked the same way.'],
  ['Admin analysis', 'Opus', 'high', 'Feedback investigations in the background, never on a live answer.'],
]

const INGEST = [
  ['Export lands', 'The DBT export writes CSVs to a shared bucket, then a success file.'],
  ['Event fires', 'An EventBridge rule matches only that success file and queues it.'],
  ['Raw copy', 'A Lambda validates the files against the dataset contract and keeps an immutable raw batch.'],
  ['Hand-off', 'raw_ready on SNS; a dispatcher starts one Step Functions run per batch.'],
  ['Convert', 'A Fargate task runs DuckDB: types, required columns and row counts enforced, Parquet written by month.'],
  ['Publish', 'A conditional write flips the dataset’s version pointer. Readers switch in one step.'],
  ['Announce', 'dataset_ready tells the preset refresher and automation runner new data is live.'],
]

const CANVAS = ['Resolve model IDs', 'Check viewer access', 'Pin data version', 'Compile safe SQL', 'Cache or run DuckDB']

const AUTOMATE = [
  ['Confirm', 'The agent proposes an alert or report; the person confirms; access is checked again.'],
  ['Wake', 'A runner Lambda wakes on every data publish and once a minute.'],
  ['Compute', 'It reads numbers through the query service as the owner and compares them with their line.'],
  ['Deliver', 'Messages queue to a notifier that posts to Microsoft Teams with a link back.'],
]

const DELIVER = [
  ['Checks', 'Tests, plus every semantic measure run against DuckDB.'],
  ['Images', 'Query service, agent and converter, tagged by commit, pushed to ECR.'],
  ['Terraform', 'One state per environment. Nobody applies from a laptop.'],
  ['Roll out', 'ECS services move to the new images.'],
  ['Model last', 'The semantic bundle publishes only once the code that reads it runs.'],
]

const RULES = [
  ['Claude never writes SQL', 'The model picks names from the semantic model; a deterministic compiler writes parameterised SQL.'],
  ['One definition per number', 'Business definitions live once, in reviewed YAML. Chat and canvas both read it.'],
  ['Access fails closed', 'Group and row rules are enforced in the query service. A rule it can’t enforce refuses the query.'],
  ['Answers are grounded', 'A number in an answer must appear in the result, or the sentence goes.'],
  ['Same data all the way', 'Each request pins one version of every dataset, so a load mid-answer changes nothing.'],
  ['Private by default', 'Compute in private subnets with no internet route; AWS reached through VPC endpoints.'],
  ['Watched', 'Alarms on API errors, dead-letter queues, Bedrock throttling, timeouts and capacity.'],
  ['No new vendors', 'AWS, LangGraph and DuckDB only. Logs and traces stay in CloudWatch.'],
]

function Section({ id, n, label, title, lede, children }) {
  return (
    <section id={id} className="case-sec" data-inview>
      <div className="wrap case-sec__grid">
        <div className="case-sec__side">
          <span className="case-sec__n">{n}</span>
          <span className="label">{label}</span>
        </div>
        <div className="case-sec__main">
          <h2>
            <span className="line-mask">
              <span>{title}</span>
            </span>
          </h2>
          {lede && (
            <p className="case-lede" data-reveal>
              {lede}
            </p>
          )}
          {children}
        </div>
      </div>
    </section>
  )
}

// The request diagram stays pinned while its steps scroll past; the step under the
// middle of the screen lights its part of the diagram.
function RequestWalkthrough() {
  const [active, setActive] = useState(1)
  const listRef = useRef(null)

  useEffect(() => {
    const items = listRef.current.querySelectorAll('[data-step]')
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) setActive(Number(e.target.dataset.step))
      },
      { rootMargin: '-45% 0px -50% 0px' },
    )
    items.forEach((el) => io.observe(el))
    return () => io.disconnect()
  }, [])

  return (
    <div className="walk">
      <div className="walk__figure">
        <figure className="case-fig">
          <Diagram spec={REQUEST} active={active} label="The path of one question through the platform's AWS services" />
          <figcaption>
            <span className="walk__now">
              {String(active).padStart(2, '0')} · {REQUEST_STEPS[active - 1].title}
            </span>
          </figcaption>
        </figure>
      </div>
      <ol className="walk__steps" ref={listRef}>
        {REQUEST_STEPS.map((s, i) => (
          <li key={s.title} data-step={i + 1} className={active === i + 1 ? 'is-active' : ''}>
            <button type="button" onClick={() => setActive(i + 1)}>
              <span className="walk__n">{String(i + 1).padStart(2, '0')}</span>
              <span>
                <strong>{s.title}</strong>
                <span className="walk__body">{s.body}</span>
              </span>
            </button>
          </li>
        ))}
      </ol>
    </div>
  )
}

function AgentGraph() {
  const [routeId, setRoute] = useState('query')
  const r = AGENT_ROUTES.find((x) => x.id === routeId)
  return (
    <>
      <div className="routes" role="tablist" aria-label="Request types">
        {AGENT_ROUTES.map((x) => (
          <button
            key={x.id}
            type="button"
            role="tab"
            aria-selected={x.id === routeId}
            className={x.id === routeId ? 'is-active' : ''}
            onClick={() => setRoute(x.id)}
          >
            {x.label}
          </button>
        ))}
      </div>
      <figure className="case-fig case-fig--wide">
        <Diagram spec={AGENT} active={routeId} label="The LangGraph state graph behind the agent" />
        <figcaption>
          <span key={routeId} className="routes__note">
            {r.note}
          </span>
          <span className="routes__legend">
            <i className="lg lg--cond" /> router picks the next node
            <i className="lg lg--fail" /> empty or rejected: one re-plan with Opus
          </span>
        </figcaption>
      </figure>
    </>
  )
}

export default function CaseStudy() {
  const [area, setArea] = useState(null)

  return (
    <article className="case">
      {/* ---- Hero: the same cycle as the home page, starting with the human ---- */}
      <header
        className="case-hero wrap"
        data-inview
        data-drag
        data-shape="cycle"
        data-cycle="self cube eye brain"
        data-pos="3.1 0.75 0.95 0.85"
        data-pos-m="0 2.5 0.4 0"
        data-amb="0.7"
      >
        <a className="link case-back" href="#work" onClick={routeLink}>
          <ArrowLeft />
          All work
        </a>
        <p className="label case-hero__label">How it’s built · At work · 2026</p>
        <h1 className="case-hero__title case-hero__title--long">
          <span className="line-mask">
            <span>{AGENT_NAME}</span>
          </span>
        </h1>
        <p className="case-hero__lede">
          A full-scale, self-serve analytics platform for every dataset in the business. People ask in
          plain English, in chat or on a live canvas, and every number they get back comes from one
          semantic model and one query engine, so it can be traced, explained and trusted.
        </p>
        <dl className="case-spec">
          {SPEC.map(([k, v]) => (
            <div key={k}>
              <dt className="label">{k}</dt>
              <dd>{v}</dd>
            </div>
          ))}
        </dl>
      </header>

      <div className="case-rest" data-shape="dust" data-pos="0 0 1 0.2">
      <div className="wrap">
        <figure className="case-fig case-fig--hero" data-morph-target>
          <Diagram spec={OVERVIEW} active={area} label="The platform's architecture: data flows across the top, questions along the bottom" />
          <figcaption>
            <div className="areas">
              {AREAS.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  className={area === a.id ? 'is-active' : ''}
                  onMouseEnter={() => setArea(a.id)}
                  onMouseLeave={() => setArea(null)}
                  onFocus={() => setArea(a.id)}
                  onBlur={() => setArea(null)}
                  onClick={() => setArea(area === a.id ? null : a.id)}
                >
                  <span className="areas__n">{a.n}</span>
                  <strong>{a.title}</strong>
                  <span>{a.body}</span>
                </button>
              ))}
            </div>
          </figcaption>
        </figure>

        <ul className="numbers">
          {NUMBERS.map(([n, t], i) => (
            <li key={t} data-reveal style={{ '--d': i }}>
              <span className="numbers__n">{n}</span>
              <span>{t}</span>
            </li>
          ))}
        </ul>
      </div>

      <Section
        id="ask"
        n="01"
        label="Asking a question"
        title="Asynchronous by design."
        lede="API Gateway allows 29 seconds per request, and a good answer can take longer. So the API queues the question and replies at once, a long-running agent answers it, and the browser follows along. Scroll the steps; the diagram follows you."
      >
        <RequestWalkthrough />
      </Section>

      <Section
        id="agent"
        n="02"
        label="Inside the agent"
        title="Claude chooses, code computes."
        lede="The agent is a LangGraph state graph: a fixed set of steps passing one typed state between them. Claude is called only where judgement is needed, each time with the model and effort that suits it. Code runs the queries, checks the numbers and decides what runs next."
      >
        <AgentGraph />

        <div className="case-cols">
          <div data-reveal>
            <h3>Which model does what</h3>
            <p className="case-note">All calls go to Claude on Bedrock. Production runs the 4.6 models; newer ones move up only after an evaluation run shows they are as accurate.</p>
          </div>
          <div className="models" data-reveal style={{ '--d': 1 }}>
            {MODELS.map(([step, model, effort, what]) => (
              <div key={step} className="models__row">
                <span className="models__step">{step}</span>
                <span className={`models__chip models__chip--${model.toLowerCase()}`}>
                  {model} · {effort}
                </span>
                <span className="models__what">{what}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="why">
          {[
            ['A fixed graph, not an open loop', 'Every route is a small function that reads the state. A recursion limit of 30 and one repair keep every run bounded.'],
            ['One typed state', 'About 35 fields carry a request through every step, so any answer can be traced node by node, with its cost.'],
            ['Pause and resume', 'interrupt() saves a checkpoint to DynamoDB; whichever task picks up the reply carries on from it.'],
          ].map(([t, b], i) => (
            <div key={t} data-reveal style={{ '--d': i }}>
              <h3>{t}</h3>
              <p>{b}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section
        id="data"
        n="03"
        label="Data in"
        title="From file drop to Parquet."
        lede="Ingestion is event-driven and safe to repeat. Every queue has a dead-letter queue and an alarm, and nothing reaches people until a whole batch has converted and its version pointer has moved."
      >
        <ol className="rail">
          {INGEST.map(([t, b], i) => (
            <li key={t} data-reveal style={{ '--d': i }}>
              <span className="rail__n">{String(i + 1).padStart(2, '0')}</span>
              <strong>{t}</strong>
              <p>{b}</p>
            </li>
          ))}
        </ol>
        <p className="case-note case-note--fail" data-reveal>
          If conversion still fails after two retries, a failure Lambda records it on the batch and alerts the team.
          Old versions are kept, so any past answer can be replayed on the data it used.
        </p>
      </Section>

      <Section
        id="canvas"
        n="04"
        label="Canvas"
        title="Live dashboards, same engine."
        lede="Visuals are saved as semantic queries, not pictures, so they stay live. Every one runs through the same query service as chat, as the person viewing it."
      >
        <div className="chain" data-reveal>
          {CANVAS.map((c, i) => (
            <span key={c} className="chain__step" style={{ '--d': i }}>
              {c}
            </span>
          ))}
        </div>
        <p className="case-note" data-reveal>
          Batches of up to 20 visuals run two at a time; one slot is always held back so chat never waits behind a busy
          canvas. Results are cached by data version, so a new load never serves an old number.
        </p>
      </Section>

      <Section id="ops" n="05" label="Automations and delivery" title="Quiet machinery.">
        <div className="case-cols case-cols--even">
          <div>
            <h3 data-reveal>Alerts and reports</h3>
            <ol className="mini">
              {AUTOMATE.map(([t, b], i) => (
                <li key={t} data-reveal style={{ '--d': i }}>
                  <strong>{t}</strong>
                  <p>{b}</p>
                </li>
              ))}
            </ol>
          </div>
          <div>
            <h3 data-reveal>How changes ship</h3>
            <ol className="mini">
              {DELIVER.map(([t, b], i) => (
                <li key={t} data-reveal style={{ '--d': i }}>
                  <strong>{t}</strong>
                  <p>{b}</p>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </Section>

      <Section
        id="rules"
        n="06"
        label="Guardrails"
        title="Why the numbers hold."
        lede="These rules hold everywhere in the platform. They are why the same question gives the same, explainable number in chat, on the canvas and in a scheduled report."
      >
        <div className="rules">
          {RULES.map(([t, b], i) => (
            <div key={t} className="rules__item" data-reveal style={{ '--d': i % 4 }}>
              <h3>{t}</h3>
              <p>{b}</p>
            </div>
          ))}
        </div>
      </Section>

      <div className="wrap case-end">
        <p className="case-note">
          Diagrams redrawn from the platform’s architecture documents and Terraform. AWS service icons from the official AWS
          Architecture Icons. Product data shown elsewhere on this site is illustrative.
        </p>
        <a className="case-next" href="#work" onClick={routeLink}>
          <span className="label">Next project</span>
          <span className="case-next__title">
            Coming soon <ArrowRight />
          </span>
        </a>
      </div>
      </div>
    </article>
  )
}
