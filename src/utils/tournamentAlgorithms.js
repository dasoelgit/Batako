// src/utils/tournamentAlgorithms.js

// ============================================================
// SCHEDULING HELPERS
// ============================================================

// ============================================================
// SHUFFLE HELPER — Randomizes match order
// ============================================================

function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

function makeMatch(team1, team2) {
  return {
    team1,
    team2,
    completed: false,
    score1: 0,
    score2: 0,
  }
}

function makeBye(players) {
  return {
    team1: players,
    team2: null,
    completed: true,
    score1: 0,
    score2: 0,
    isBye: true,
  }
}

function idOf(item) {
  return item?.id
}

function teamId(team) {
  return team?.id ?? team?.player1?.id ?? `team_${team?.player1?.name ?? 'unknown'}`
}

function countValue(map, id) {
  return map[id] ?? 0
}

// Choose exactly `count` sit-outs.
// Priority:
// 1. Minimize consecutive appearances.
// 2. Keep sit-out counts balanced.
function selectSitOuts(
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

        return (
          sum +
          (lastPlayedIds.has(id) && !selectedIds.has(id) ? 1 : 0)
        )
      }, 0)

      const values = Object.values(newCounts)
      const spread = Math.max(...values) - Math.min(...values)

      const variance = values.reduce(
        (sum, value) => sum + value * value,
        0
      )

      const score = [
        consecutivePlay,
        spread,
        variance,
      ]

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

      for (
        let i = start;
        i <= pool.length - remaining;
        i++
      ) {
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

      if (aPlayed !== bPlayed) {
        return aPlayed - bPlayed
      }

      return (
        countValue(sitCounts, idOf(a)) -
        countValue(sitCounts, idOf(b))
      )
    })
    .slice(0, count)
}

function addHistory(map, a, b) {
  map[a].add(b)
  map[b].add(a)
}

// Find a pairing of all players that minimizes repeated partners.
function findBestPairing(items, history) {
  if (items.length % 2 !== 0) return []

  let best = null

  const recurse = (
    remaining,
    pairs,
    repeatCost
  ) => {
    if (remaining.length === 0) {
      if (!best || repeatCost < best.cost) {
        best = {
          cost: repeatCost,
          pairs: pairs.map(pair => [...pair]),
        }
      }

      return
    }

    if (best && repeatCost > best.cost) {
      return
    }

    const first = remaining[0]

    for (let i = 1; i < remaining.length; i++) {
      const second = remaining[i]

      const rest = remaining
        .slice(1, i)
        .concat(remaining.slice(i + 1))

      const repeated =
        history[first.id]?.has(second.id) ? 1 : 0

      recurse(
        rest,
        [...pairs, [first, second]],
        repeatCost + repeated
      )

      if (best?.cost === 0) {
        return
      }
    }
  }

  recurse([...items], [], 0)

  return best?.pairs ?? []
}

// Pair teams into matches while minimizing repeated individual opponents.
function findBestTeamMatches(teams, opposed) {
  if (teams.length % 2 !== 0) return []

  let best = null

  const recurse = (
    remaining,
    matches,
    cost
  ) => {
    if (remaining.length === 0) {
      if (!best || cost < best.cost) {
        best = {
          cost,
          matches: matches.map(match => [...match]),
        }
      }

      return
    }

    if (best && cost > best.cost) {
      return
    }

    const first = remaining[0]

    for (let i = 1; i < remaining.length; i++) {
      const second = remaining[i]

      const rest = remaining
        .slice(1, i)
        .concat(remaining.slice(i + 1))

      let repeated = 0

      first.forEach(a => {
        second.forEach(b => {
          if (opposed[a.id]?.has(b.id)) {
            repeated += 1
          }
        })
      })

      recurse(
        rest,
        [...matches, [first, second]],
        cost + repeated
      )

      if (best?.cost === 0) {
        return
      }
    }
  }

  recurse([...teams], [], 0)

  return best?.matches ?? []
}

// ============================================================
// GENERATE AMERICANO ROUNDS
// Rotating Partners
// ============================================================

export function generateAmericanoRounds(
  players,
  totalRounds
) {
  const rounds = []

  const allPlayers = [...players].filter(
    player => !player.isBye
  )

  if (
    allPlayers.length < 4 ||
    totalRounds <= 0
  ) {
    return rounds
  }

  const partnered = Object.fromEntries(
    allPlayers.map(player => [
      player.id,
      new Set(),
    ])
  )

  const opposed = Object.fromEntries(
    allPlayers.map(player => [
      player.id,
      new Set(),
    ])
  )

  const sitCounts = Object.fromEntries(
    allPlayers.map(player => [
      player.id,
      0,
    ])
  )

  let lastPlayedIds = new Set()

  // One doubles match requires 4 players.
  //
  // Therefore:
  // 4 players  -> 4 play
  // 5 players  -> 4 play
  // 6 players  -> 4 play
  // 7 players  -> 4 play
  // 8 players  -> 8 play
  // 9 players  -> 8 play
  // etc.
  const playersPerRound =
    Math.floor(allPlayers.length / 4) * 4

  const workingPlayers = [...allPlayers]

  for (
    let round = 1;
    round <= totalRounds;
    round++
  ) {
    const sitOutCount =
      allPlayers.length - playersPerRound

    const sitOuts = selectSitOuts(
      workingPlayers,
      sitOutCount,
      sitCounts,
      lastPlayedIds
    )

    const sitOutIds = new Set(
      sitOuts.map(player => player.id)
    )

    const playing = workingPlayers.filter(
      player => !sitOutIds.has(player.id)
    )

    sitOuts.forEach(player => {
      sitCounts[player.id] += 1
    })

    // --- SHUFFLE PLAYING PLAYERS BEFORE PAIRING ---
    const shuffledPlaying = shuffleArray(playing)

    // Build teams while minimizing repeated partners.
    const partnerPairs = findBestPairing(
      shuffledPlaying,
      partnered
    )

    const teams = partnerPairs.map(
      ([player1, player2]) => [
        player1,
        player2,
      ]
    )

    // Match teams while minimizing repeated opponents.
    const teamMatches = findBestTeamMatches(
      teams,
      opposed
    )

    // Every player selected to play must appear
    // in exactly one match.
    const scheduledIds = new Set(
      teamMatches
        .flat(2)
        .map(player => player.id)
    )

    if (
      scheduledIds.size !== playing.length
    ) {
      throw new Error(
        `Americano scheduling failed in round ${round}: not every playing player was scheduled.`
      )
    }

    const roundMatches = teamMatches.map(
      ([team1, team2]) => {
        team1.forEach(player1 => {
          team2.forEach(player2 => {
            addHistory(
              opposed,
              player1.id,
              player2.id
            )
          })
        })

        return makeMatch(
          team1,
          team2
        )
      }
    )

    // Record partner history.
    teams.forEach(([player1, player2]) => {
      addHistory(
        partnered,
        player1.id,
        player2.id
      )
    })

    // Explicitly record every sit-out.
    // This prevents a player/team from being silently
    // left out of a round.
    sitOuts.forEach(player => {
      roundMatches.push(
        makeBye([player])
      )
    })

    // --- SHUFFLE MATCH ORDER ---
    const shuffledMatches = shuffleArray(roundMatches)

    rounds.push({
      round_number: round,
      matches: shuffledMatches,
    })

    // Used by the next round to minimize consecutive play.
    lastPlayedIds = new Set(
      playing.map(player => player.id)
    )

    // Rotate the pool so equal-priority choices don't
    // always start with the same player.
    workingPlayers.push(
      workingPlayers.shift()
    )
  }

  return rounds
}

// ============================================================
// GENERATE MEXICANO ROUNDS
// Competitive Pairing
// ============================================================
//
// Round 1 is generated immediately, using random 2v2 teams
// (there are no standings yet to seed pairings from).
//
// FIX: Round 1 previously used generateMatchesFromPlayers,
// which built 1v1 SINGLES matches. Every later round is built
// by generateMexicanoPairings, which builds 2v2 DOUBLES teams.
// That mismatch meant round 1 looked like a completely
// different (singles) tournament from round 2 onward. Round 1
// now builds doubles teams the same way, so the format is
// consistent across every round.
//
// Later rounds are intentionally left as placeholders
// because Mexicano pairing depends on live standings.
//

export function generateMexicanoRounds(
  players,
  totalRounds
) {
  const rounds = []

  const allPlayers = [...players].filter(
    player => !player.isBye
  )

  if (
    allPlayers.length < 4 ||
    totalRounds <= 0
  ) {
    return rounds
  }

  // Same "only full groups of 4 can play a doubles match" rule
  // Americano uses. Any remainder sits out round 1 as an
  // individual BYE.
  const playersPerRound =
    Math.floor(allPlayers.length / 4) * 4

  const sitOutCount =
    allPlayers.length - playersPerRound

  const shuffled = [...allPlayers].sort(
    () => Math.random() - 0.5
  )

  const sitOuts = shuffled.slice(0, sitOutCount)
  const playing = shuffled.slice(sitOutCount)

  const round1Matches = []

  for (let i = 0; i < playing.length; i += 4) {
    round1Matches.push(
      makeMatch(
        [playing[i], playing[i + 1]],
        [playing[i + 2], playing[i + 3]]
      )
    )
  }

  sitOuts.forEach(player => {
    round1Matches.push(makeBye([player]))
  })

  // --- SHUFFLE MATCH ORDER ---
  const shuffledMatches = shuffleArray(round1Matches)

  rounds.push({
    round_number: 1,
    matches: shuffledMatches,
  })

  for (
    let round = 2;
    round <= totalRounds;
    round++
  ) {
    rounds.push({
      round_number: round,
      matches: [],
    })
  }

  return rounds
}

// ============================================================
// GENERATE MEXICANO PAIRINGS FOR A ROUND
// Based on Standings
// ============================================================

export function generateMexicanoPairings(
  players,
  standings,
  roundNumber,
  previousPairings = [],
  byeCounts = null
) {
  const sortedPlayers = [...players].sort(
    (a, b) => {
      const aStats =
        standings[a.id] || {
          points: 0,
        }

      const bStats =
        standings[b.id] || {
          points: 0,
        }

      return (
        bStats.points -
        aStats.points
      )
    }
  )

  let available = [...sortedPlayers]
  let byePlayer = null

  if (available.length % 2 !== 0) {
    if (byeCounts) {
      const previousPlayed =
        new Set(
          previousPairings.flat()
        )

      const candidates =
        available.filter(player =>
          previousPlayed.has(player.id)
        )

      const pool =
        candidates.length
          ? candidates
          : available

      byePlayer = selectSitOuts(
        pool,
        1,
        byeCounts,
        new Set()
      )[0]

      byeCounts[byePlayer.id] =
        (byeCounts[byePlayer.id] ?? 0) + 1

      available = available.filter(
        player =>
          player.id !== byePlayer.id
      )
    } else {
      const previousPlayed =
        new Set(
          previousPairings.flat()
        )

      const candidates =
        available.filter(player =>
          previousPlayed.has(player.id)
        )

      byePlayer =
        (
          candidates.length
            ? candidates
            : available
        ).at(-1)

      available = available.filter(
        player =>
          player.id !== byePlayer.id
      )
    }
  }

  // Build partner history from previous rounds.
  //
  // FIX: previousPairings entries are the concatenation of a past
  // match's two partner pairs — [team1p1, team1p2, team2p1, team2p2].
  // The old code marked ALL 6 combinations within that 4-id group as
  // "already paired", which conflated partners with opponents. A
  // player who simply played AGAINST someone last round was then
  // treated as ineligible to PARTNER with them later, shrinking the
  // pool of "fresh" partner options faster than it should. Now only
  // the two real partner pairs (first two ids, last two ids) are
  // recorded as partner history.
  const pairHistory =
    Object.fromEntries(
      players.map(player => [
        player.id,
        new Set(),
      ])
    )

  previousPairings.forEach(pair => {
    if (!pair || pair.length < 4) {
      return
    }

    const [a1, a2, b1, b2] = pair

    if (pairHistory[a1] && pairHistory[a2]) {
      addHistory(pairHistory, a1, a2)
    }

    if (pairHistory[b1] && pairHistory[b2]) {
      addHistory(pairHistory, b1, b2)
    }
  })

  // --- SHUFFLE AVAILABLE PLAYERS BEFORE PAIRING ---
  const shuffledAvailable = shuffleArray(available)

  const paired =
    findBestPairing(
      shuffledAvailable,
      pairHistory
    )

  const pairedList =
    paired.map(
      ([a, b]) => [a, b]
    )

  const matches = []

  for (
    let i = 0;
    i < pairedList.length;
    i += 2
  ) {
    if (pairedList[i + 1]) {
      matches.push(
        makeMatch(
          pairedList[i],
          pairedList[i + 1]
        )
      )
    }
  }

  if (byePlayer) {
    matches.push(
      makeBye([byePlayer])
    )
  }

  // --- SHUFFLE MATCH ORDER ---
  return shuffleArray(matches)
}

// ============================================================
// GENERATE SINGLES ROUNDS
// 1v1
// ============================================================
//
// Uses the standard round-robin circle schedule.
//
// Over a complete cycle, every opponent is met exactly once.
// With an odd number of players, the BYE rotates through
// the schedule.
//

export function generateSinglesRounds(
  players,
  totalRounds
) {
  const rounds = []

  if (
    players.length < 2 ||
    totalRounds <= 0
  ) {
    return rounds
  }

  const roster = [...players]

  const isOdd =
    roster.length % 2 !== 0

  if (isOdd) {
    roster.push({
      id: '__BYE__',
      name: 'BYE',
      isBye: true,
    })
  }

  const n = roster.length

  let rotation = [...roster]

  for (
    let round = 1;
    round <= totalRounds;
    round++
  ) {
    const roundMatches = []

    for (
      let i = 0;
      i < n / 2;
      i++
    ) {
      const a = rotation[i]
      const b =
        rotation[n - 1 - i]

      if (
        a.isBye ||
        b.isBye
      ) {
        const player =
          a.isBye ? b : a

        roundMatches.push(
          makeBye([player])
        )
      } else {
        roundMatches.push(
          makeMatch(
            [a],
            [b]
          )
        )
      }
    }

    // --- SHUFFLE MATCH ORDER ---
    const shuffledMatches = shuffleArray(roundMatches)

    rounds.push({
      round_number: round,
      matches: shuffledMatches,
    })

    // Keep first slot fixed and rotate
    // the remaining circle.
    rotation = [
      rotation[0],
      rotation[n - 1],
      ...rotation.slice(
        1,
        n - 1
      ),
    ]
  }

  return rounds
}

// ============================================================
// GENERATE FIXED PARTNER ROUNDS
// Teams stay together
// ============================================================
//
// Fixed teams use the same round-robin circle
// schedule, but the unit being rotated is the team.
//
// This prevents repeated opponents until the full
// cycle is exhausted and distributes odd-team BYEs.
//

export function generateFixedPartnerRounds(
  teams,
  totalRounds
) {
  const rounds = []

  if (
    teams.length < 2 ||
    totalRounds <= 0
  ) {
    return rounds
  }

  const roster = [...teams]

  const isOdd =
    roster.length % 2 !== 0

  if (isOdd) {
    roster.push({
      id: '__BYE_TEAM__',
      player1: {
        isBye: true,
      },
      player2: {
        isBye: true,
      },
      isBye: true,
    })
  }

  const n = roster.length

  let rotation = [...roster]

  for (
    let round = 1;
    round <= totalRounds;
    round++
  ) {
    const roundMatches = []

    for (
      let i = 0;
      i < n / 2;
      i++
    ) {
      const a = rotation[i]
      const b =
        rotation[n - 1 - i]

      if (
        a.isBye ||
        b.isBye
      ) {
        const team =
          a.isBye ? b : a

        roundMatches.push(
          makeBye([
            team.player1,
            team.player2,
          ])
        )
      } else {
        roundMatches.push(
          makeMatch(
            [
              a.player1,
              a.player2,
            ],
            [
              b.player1,
              b.player2,
            ]
          )
        )
      }
    }

    // --- SHUFFLE MATCH ORDER ---
    const shuffledMatches = shuffleArray(roundMatches)

    rounds.push({
      round_number: round,
      matches: shuffledMatches,
    })

    rotation = [
      rotation[0],
      rotation[n - 1],
      ...rotation.slice(
        1,
        n - 1
      ),
    ]
  }

  return rounds
}

// ============================================================
// CALCULATE TOURNAMENT STANDINGS
// ============================================================

export function calculateTournamentStandings(
  players,
  rounds,
  standingBy,
  tournamentType = null
) {
  const standings = {}

  // ----------------------------------------------------------
  // FIXED PARTNER
  // Standings are per TEAM.
  // ----------------------------------------------------------

  if (
    tournamentType ===
    'fixed_partner'
  ) {
    players.forEach(team => {
      const teamId =
        team.id ||
        `team_${Object.keys(standings).length}`

      standings[teamId] = {
        id: teamId,
        name:
          team.name ||
          `${team.player1?.name || '?'} / ${team.player2?.name || '?'}`,
        player1: team.player1,
        player2: team.player2,
        isTeam: true,
        W: 0,
        L: 0,
        T: 0,
        Pts: 0,
        games_won: 0,
        games_lost: 0,
        matches_played: 0,
      }
    })

    rounds.forEach(round => {
      round.matches.forEach(match => {
        if (
          !match.completed ||
          match.isBye
        ) {
          return
        }

        const team1Players =
          match.team1?.filter(
            player =>
              player &&
              !player.isBye
          ) || []

        const team2Players =
          match.team2?.filter(
            player =>
              player &&
              !player.isBye
          ) || []

        if (
          team1Players.length === 0 ||
          team2Players.length === 0
        ) {
          return
        }

        const team1Ids =
          team1Players
            .map(player => player.id)
            .sort()
            .join('-')

        const team2Ids =
          team2Players
            .map(player => player.id)
            .sort()
            .join('-')

        let team1Key = null
        let team2Key = null

        for (
          const key of Object.keys(standings)
        ) {
          const team =
            standings[key]

          if (!team.isTeam) {
            continue
          }

          const tIds = [
            team.player1?.id,
            team.player2?.id,
          ]
            .filter(Boolean)
            .sort()
            .join('-')

          if (tIds === team1Ids) {
            team1Key = key
          }

          if (tIds === team2Ids) {
            team2Key = key
          }
        }

        if (
          !team1Key ||
          !team2Key
        ) {
          return
        }

        const s1 =
          match.score1 || 0

        const s2 =
          match.score2 || 0

        let result = 'draw'

        if (s1 > s2) {
          result = 'win1'
        } else if (s2 > s1) {
          result = 'win2'
        }

        const updateTeam = (
          key,
          score,
          opponentScore,
          res
        ) => {
          const standing =
            standings[key]

          if (!standing) {
            return
          }

          standing.matches_played += 1
          standing.games_won += score
          standing.games_lost += opponentScore

          if (res === 'win') {
            standing.W += 1

            if (standingBy === 'win') {
              standing.Pts += 3
            } else {
              standing.Pts += score
            }
          } else if (res === 'loss') {
            standing.L += 1

            if (standingBy === 'win') {
              standing.Pts += 0
            } else {
              standing.Pts += score
            }
          } else {
            standing.T += 1

            if (standingBy === 'win') {
              standing.Pts += 1
            } else {
              standing.Pts += score
            }
          }
        }

        updateTeam(
          team1Key,
          s1,
          s2,
          result === 'win1'
            ? 'win'
            : result === 'win2'
              ? 'loss'
              : 'draw'
        )

        updateTeam(
          team2Key,
          s2,
          s1,
          result === 'win2'
            ? 'win'
            : result === 'win1'
              ? 'loss'
              : 'draw'
        )
      })
    })

    const result =
      Object.values(standings).map(
        standing => ({
          ...standing,
          diff:
            standing.games_won -
            standing.games_lost,
        })
      )

    result.sort((a, b) => {
      if (b.Pts !== a.Pts) {
        return b.Pts - a.Pts
      }

      if (b.diff !== a.diff) {
        return b.diff - a.diff
      }

      return b.W - a.W
    })

    return result
  }

  // ----------------------------------------------------------
  // OTHER TOURNAMENT TYPES
  // Standings are per individual player.
  // ----------------------------------------------------------

  players.forEach(player => {
    if (
      player.player1 &&
      player.player2
    ) {
      const player1 =
        player.player1

      const player2 =
        player.player2

      if (
        player1 &&
        !standings[player1.id]
      ) {
        standings[player1.id] = {
          id: player1.id,
          name: player1.name,
          W: 0,
          L: 0,
          T: 0,
          Pts: 0,
          games_won: 0,
          games_lost: 0,
          matches_played: 0,
        }
      }

      if (
        player2 &&
        !standings[player2.id]
      ) {
        standings[player2.id] = {
          id: player2.id,
          name: player2.name,
          W: 0,
          L: 0,
          T: 0,
          Pts: 0,
          games_won: 0,
          games_lost: 0,
          matches_played: 0,
        }
      }
    } else {
      if (!standings[player.id]) {
        standings[player.id] = {
          id: player.id,
          name: player.name,
          W: 0,
          L: 0,
          T: 0,
          Pts: 0,
          games_won: 0,
          games_lost: 0,
          matches_played: 0,
        }
      }
    }
  })

  rounds.forEach(round => {
    round.matches.forEach(match => {
      if (
        !match.completed ||
        match.isBye
      ) {
        return
      }

      const team1Players =
        match.team1?.filter(
          player =>
            player &&
            !player.isBye
        ) || []

      const team2Players =
        match.team2?.filter(
          player =>
            player &&
            !player.isBye
        ) || []

      if (
        team1Players.length === 0 ||
        team2Players.length === 0
      ) {
        return
      }

      const s1 =
        match.score1 || 0

      const s2 =
        match.score2 || 0

      let result = 'draw'

      if (s1 > s2) {
        result = 'win1'
      } else if (s2 > s1) {
        result = 'win2'
      }

      const updatePlayer = (
        player,
        score,
        opponentScore,
        res
      ) => {
        if (
          !player ||
          player.isBye
        ) {
          return
        }

        const standing =
          standings[player.id]

        if (!standing) {
          return
        }

        standing.matches_played += 1
        standing.games_won += score
        standing.games_lost += opponentScore

        if (res === 'win') {
          standing.W += 1

          if (standingBy === 'win') {
            standing.Pts += 3
          } else {
            standing.Pts += score
          }
        } else if (res === 'loss') {
          standing.L += 1

          if (standingBy === 'win') {
            standing.Pts += 0
          } else {
            standing.Pts += score
          }
        } else {
          standing.T += 1

          if (standingBy === 'win') {
            standing.Pts += 1
          } else {
            standing.Pts += score
          }
        }
      }

      team1Players.forEach(player => {
        updatePlayer(
          player,
          s1,
          s2,
          result === 'win1'
            ? 'win'
            : result === 'win2'
              ? 'loss'
              : 'draw'
        )
      })

      team2Players.forEach(player => {
        updatePlayer(
          player,
          s2,
          s1,
          result === 'win2'
            ? 'win'
            : result === 'win1'
              ? 'loss'
              : 'draw'
        )
      })
    })
  })

  const result =
    Object.values(standings).map(
      standing => ({
        ...standing,
        diff:
          standing.games_won -
          standing.games_lost,
      })
    )

  result.sort((a, b) => {
    if (b.Pts !== a.Pts) {
      return b.Pts - a.Pts
    }

    if (b.diff !== a.diff) {
      return b.diff - a.diff
    }

    return b.W - a.W
  })

  return result
}

// ============================================================
// CHECK IF TOURNAMENT COMPLETE
// ============================================================

export function isTournamentComplete(
  rounds,
  totalRounds
) {
  if (
    rounds.length <
    totalRounds
  ) {
    return false
  }

  for (
    let i = 0;
    i < totalRounds;
    i++
  ) {
    const round = rounds[i]

    if (
      !round ||
      round.matches.length === 0
    ) {
      return false
    }

    const allCompleted =
      round.matches.every(
        match =>
          match.completed ||
          match.isBye
      )

    if (!allCompleted) {
      return false
    }
  }

  return true
}

// ============================================================
// CHECK IF ROUND IS COMPLETE
// ============================================================

export function isRoundComplete(
  round
) {
  if (
    !round ||
    !round.matches ||
    round.matches.length === 0
  ) {
    return false
  }

  return round.matches.every(
    match =>
      match.completed ||
      match.isBye
  )
}
