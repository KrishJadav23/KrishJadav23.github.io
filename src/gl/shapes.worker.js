// Builds the heavy surface shapes off the main thread, one at a time.
import { brain, eye, self as head } from './shapes'

globalThis.onmessage = (e) => {
  const { N } = e.data
  for (const [i, build] of [
    [1, brain],
    [2, head],
    [3, eye],
  ]) {
    const data = build(N)
    globalThis.postMessage({ i, data }, [data.buffer])
  }
}
