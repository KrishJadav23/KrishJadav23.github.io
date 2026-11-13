import { STACK } from '../data/content'
import ToolRing from './ToolRing'

export default function Stack() {
  return (
    <section id="stack" className="section stack" aria-labelledby="stack-title" data-shape="dust" data-pos="0 0 1 0.22" data-pos-m="0 0 1 0.2">
      <div className="wrap">
        <div className="section-head" data-inview>
          <span className="label">Stack</span>
          <h2 id="stack-title">
            <span className="line-mask">
              <span style={{ '--d': 0 }}>Built with</span>
            </span>
            <span className="line-mask">
              <span style={{ '--d': 1 }} className="powder">
                what ships.
              </span>
            </span>
          </h2>
          <p data-reveal style={{ '--d': 3 }}>
            What I reach for at work and for fun. Drag the ring, or use the arrows.
          </p>
        </div>
      </div>

      <div data-reveal style={{ '--d': 2 }}>
        <ToolRing />
      </div>

      <div className="wrap">
        <div className="stack__groups">
          {STACK.map((g, i) => (
            <div key={g.group} data-reveal style={{ '--d': i }}>
              <h3 className="label">{g.group}</h3>
              <ul>
                {g.items.map((it) => (
                  <li key={it}>{it}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
