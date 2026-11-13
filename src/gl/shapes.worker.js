// Builds the heavy surface shapes off the main thread, one at a time,
// in the order the hero shows them (the human first, so the opening is quick).
import { brain, eye, self as head } from './shapes'

globalThis.onmessage = (e) => {
  const { N } = e.data
  for (const [i, build] of [
    [2, head],
    [3, eye],
    [1, brain],
  ]) {
    const data = build(N)
    globalThis.postMessage({ i, data }, [data.buffer])
  }
}
