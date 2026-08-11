// src/utils/tournament/common.js

// ============================================================
// SHUFFLE HELPER
// ============================================================

export function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

// ============================================================
// MATCH MAKERS
// ============================================================

export function makeMatch(team1, team2) {
  return {
    team1,
    team2,
    completed: false,
    score1: 0,
    score2: 0,
  }
}

export function makeBye(players) {
  return {
    team1: players,
    team2: null,
    completed: true,
    score1: 0,
    score2: 0,
    isBye: true,
  }
}

// ============================================================
// ID HELPERS
// ============================================================

export function idOf(item) {
  return item?.id
}

export function countValue(map, id) {
  return map[id] ?? 0
}

// ============================================================
// HISTORY HELPERS
// ============================================================

export function addHistory(map, a, b) {
  if (!map[a]) map[a] = new Set()
  if (!map[b]) map[b] = new Set()
  map[a].add(b)
  map[b].add(a)
}

// ============================================================
// SELECT SIT-OUTS — Fairly choose players to sit out
// ============================================================

export function selectSitOuts(
  pool,
  count,
  sitCounts = {},
  lastPlayedIds = new Set()
) {
  if (count <= 0) return []
  if (count >= pool.length) return [...pool]

  // Tournament sizes are normally small.
  // Exhaustive combinations provide better fairness than positional rotation.
  if (pool.length <= 20) {
    let best = null
    const chosen = []

    const evaluate = () => {
      const selectedIds = new Set(chosen.map(idOf))
      const newCounts = {}

      pool.forEach(item => {
        const id = idOf(item)
        newCounts[id] =
          countValue(sitCounts, id) +
          (selectedIds.has(id) ? 1 : 0)
      })

      // Number of players who played last round AND are playing again.
      const consecutivePlay = pool.reduce((sum, item) => {
        const id = idOf(item)
        return sum + (lastPlayedIds.has(id) && !selectedIds.has(id) ? 1 : 0)
      }, 0)

      const values = Object.values(newCounts)
      const spread = Math.max(...values) - Math.min(...values)
      const variance = values.reduce((sum, value) => sum + value * value, 0)

      const score = [consecutivePlay, spread, variance]

      let better = false

      if (!best) {
        better = true
      } else {
        for (let i = 0; i < score.length; i++) {
          if (score[i] < best.score[i]) {
            better = true
            break
          }
          if (score[i] > best.score[i]) {
            break
          }
        }
      }

      if (better) {
        best = {
          score,
          chosen: [...chosen],
        }
      }
    }

    const walk = (start, remaining) => {
      if (remaining === 0) {
        evaluate()
        return
      }

      for (let i = start; i <= pool.length - remaining; i++) {
        chosen.push(pool[i])
        walk(i + 1, remaining - 1)
        chosen.pop()
      }
    }

    walk(0, count)
    return best?.chosen ?? pool.slice(0, count)
  }

  // Fallback for unusually large tournaments.
  return [...pool]
    .sort((a, b) => {
      const aPlayed = lastPlayedIds.has(idOf(a)) ? 0 : 1
      const bPlayed = lastPlayedIds.has(idOf(b)) ? 0 : 1
      if (aPlayed !== bPlayed) return aPlayed - bPlayed
      return countValue(sitCounts, idOf(a)) - countValue(sitCounts, idOf(b))
    })
    .slice(0, count)
}

// ============================================================
// FIND BEST PAIRING — Minimizes repeated partners
// ============================================================

export function findBestPairing(items, history) {
  if (items.length % 2 !== 0) return []

  let best = null

  const recurse = (remaining, pairs, repeatCost) => {
    if (remaining.length === 0) {
      if (!best || repeatCost < best.cost) {
        best = { cost: repeatCost, pairs: pairs.map(pair => [...pair]) }
      }
      return
    }

    if (best && repeatCost > best.cost) return

    const first = remaining[0]

    for (let i = 1; i < remaining.length; i++) {
      const second = remaining[i]
      const rest = remaining.slice(1, i).concat(remaining.slice(i + 1))
      const repeated = history[first.id]?.has(second.id) ? 1 : 0

      recurse(rest, [...pairs, [first, second]], repeatCost + repeated)

      if (best?.cost === 0) return
    }
  }

  recurse([...items], [], 0)
  return best?.pairs ?? []
}

// ============================================================
// FIND BEST TEAM MATCHES — Minimizes repeated opponents
// ============================================================

export function findBestTeamMatches(teams, opposed) {
  if (teams.length % 2 !== 0) return []

  let best = null

  const recurse = (remaining, matches, cost) => {
    if (remaining.length === 0) {
      if (!best || cost < best.cost) {
        best = { cost, matches: matches.map(match => [...match]) }
      }
      return
    }

    if (best && cost > best.cost) return

    const first = remaining[0]

    for (let i = 1; i < remaining.length; i++) {
      const second = remaining[i]
      const rest = remaining.slice(1, i).concat(remaining.slice(i + 1))

      let repeated = 0
      first.forEach(a => {
        second.forEach(b => {
          if (opposed[a.id]?.has(b.id)) repeated += 1
        })
      })

      recurse(rest, [...matches, [first, second]], cost + repeated)

      if (best?.cost === 0) return
    }
  }

  recurse([...teams], [], 0)
  return best?.matches ?? []
}
