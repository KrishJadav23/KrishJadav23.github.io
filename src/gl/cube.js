import { CUBE_SIZE, mulberry } from './shapes'

/*
  A Rubik's cube that keeps solving itself.

  It tracks the 27 cubies (position and orientation). One quarter-turn plays at a
  time, eased. The loop: start scrambled -> solve move by move -> hold, solved ->
  scramble quickly -> solve again. The solve is the scramble played backwards, so
  every turn is a real move on a real cube.
*/

// Row-major 3x3 rotation about x (0), y (1) or z (2).
const rot = (axis, a) => {
  const c = Math.cos(a)
  const s = Math.sin(a)
  if (axis === 0) return [1, 0, 0, 0, c, -s, 0, s, c]
  if (axis === 1) return [c, 0, s, 0, 1, 0, -s, 0, c]
  return [c, -s, 0, s, c, 0, 0, 0, 1]
}
const mul = (A, B) => {
  const o = new Array(9)
  for (let r = 0; r < 3; r += 1) {
    for (let c = 0; c < 3; c += 1) o[r * 3 + c] = A[r * 3] * B[c] + A[r * 3 + 1] * B[3 + c] + A[r * 3 + 2] * B[6 + c]
  }
  return o
}
const apply = (M, x, y, z) => [M[0] * x + M[1] * y + M[2] * z, M[3] * x + M[4] * y + M[5] * z, M[6] * x + M[7] * y + M[8] * z]
const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2)
const ID = [1, 0, 0, 0, 1, 0, 0, 0, 1]

const SOLVE_TURN = 0.45
const SCRAMBLE_TURN = 0.14
const HOLD = 1.6
const MOVES = 10

export function createCube(model, N) {
  const rand = mulberry(9)
  const state = model.cubies.map((p) => ({ p: [...p], R: ID }))
  let queue = []
  let move = null
  let t = 0
  let phase = 'solved'
  let hold = 0
  let scramble = []

  const randomMoves = (n) => {
    const out = []
    let lastAxis = -1
    while (out.length < n) {
      const axis = Math.floor(rand() * 3)
      if (axis === lastAxis) continue
      lastAxis = axis
      out.push({ axis, layer: Math.floor(rand() * 3) - 1, dir: rand() < 0.5 ? 1 : -1 })
    }
    return out
  }
  const commit = (m) => {
    const M = rot(m.axis, (m.dir * Math.PI) / 2)
    for (const c of state) {
      if (c.p[m.axis] === m.layer) {
        c.p = apply(M, ...c.p).map(Math.round)
        c.R = mul(M, c.R)
      }
    }
  }
  const solveQueue = (s) => s.slice().reverse().map((m) => ({ ...m, dir: -m.dir, dur: SOLVE_TURN }))

  return {
    // Jump to a scrambled cube and start solving it.
    start(reduced) {
      state.forEach((c, i) => {
        c.p = [...model.cubies[i]]
        c.R = ID
      })
      move = null
      if (reduced) {
        queue = []
        phase = 'solved'
        return
      }
      scramble = randomMoves(MOVES)
      scramble.forEach(commit)
      queue = solveQueue(scramble)
      phase = 'solving'
    },

    update(dt) {
      if (move) {
        t += dt / move.dur
        if (t >= 1) {
          commit(move)
          move = null
        }
      }
      if (move) return
      if (queue.length) {
        move = queue.shift()
        t = 0
      } else if (phase === 'solving') {
        phase = 'holding'
        hold = HOLD
      } else if (phase === 'holding') {
        hold -= dt
        if (hold <= 0) {
          scramble = randomMoves(MOVES)
          queue = scramble.map((m) => ({ ...m, dur: SCRAMBLE_TURN }))
          phase = 'scrambling'
        }
      } else if (phase === 'scrambling') {
        queue = solveQueue(scramble)
        phase = 'solving'
      }
    },

    // Particle positions for the current state, into a Float32Array of N * 4.
    write(out) {
      const turning = move ? rot(move.axis, ((move.dir * Math.PI) / 2) * ease(Math.min(1, t))) : null
      for (let i = 0; i < N; i += 1) {
        const c = state[model.cubie[i]]
        let v = apply(c.R, model.local[i * 3], model.local[i * 3 + 1], model.local[i * 3 + 2])
        v = [v[0] + c.p[0] * CUBE_SIZE, v[1] + c.p[1] * CUBE_SIZE, v[2] + c.p[2] * CUBE_SIZE]
        if (turning && c.p[move.axis] === move.layer) v = apply(turning, v[0], v[1], v[2])
        out[i * 4] = v[0]
        out[i * 4 + 1] = v[1]
        out[i * 4 + 2] = v[2]
        out[i * 4 + 3] = model.w[i]
      }
    },
  }
}
