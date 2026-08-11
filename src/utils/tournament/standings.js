// src/utils/tournament/standings.js

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
  // FIXED PARTNER — Standings are per TEAM
  // ----------------------------------------------------------

  if (tournamentType === 'fixed_partner') {
    players.forEach(team => {
      const teamId = team.id || `team_${Object.keys(standings).length}`

      standings[teamId] = {
        id: teamId,
        name: team.name || `${team.player1?.name || '?'} / ${team.player2?.name || '?'}`,
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
        if (!match.completed || match.isBye) return

        const team1Players = match.team1?.filter(player => player && !player.isBye) || []
        const team2Players = match.team2?.filter(player => player && !player.isBye) || []

        if (team1Players.length === 0 || team2Players.length === 0) return

        const team1Ids = team1Players.map(player => player.id).sort().join('-')
        const team2Ids = team2Players.map(player => player.id).sort().join('-')

        let team1Key = null
        let team2Key = null

        for (const key of Object.keys(standings)) {
          const team = standings[key]
          if (!team.isTeam) continue

          const tIds = [team.player1?.id, team.player2?.id].filter(Boolean).sort().join('-')

          if (tIds === team1Ids) team1Key = key
          if (tIds === team2Ids) team2Key = key
        }

        if (!team1Key || !team2Key) return

        const s1 = match.score1 || 0
        const s2 = match.score2 || 0

        let result = 'draw'
        if (s1 > s2) result = 'win1'
        else if (s2 > s1) result = 'win2'

        const updateTeam = (key, score, opponentScore, res) => {
          const standing = standings[key]
          if (!standing) return

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

        updateTeam(team1Key, s1, s2, result === 'win1' ? 'win' : result === 'win2' ? 'loss' : 'draw')
        updateTeam(team2Key, s2, s1, result === 'win2' ? 'win' : result === 'win1' ? 'loss' : 'draw')
      })
    })

    const result = Object.values(standings).map(standing => ({
      ...standing,
      diff: standing.games_won - standing.games_lost,
    }))

    result.sort((a, b) => {
      if (b.Pts !== a.Pts) return b.Pts - a.Pts
      if (b.diff !== a.diff) return b.diff - a.diff
      return b.W - a.W
    })

    return result
  }

  // ----------------------------------------------------------
  // OTHER TOURNAMENT TYPES — Standings are per individual player
  // ----------------------------------------------------------

  players.forEach(player => {
    if (player.player1 && player.player2) {
      const player1 = player.player1
      const player2 = player.player2

      if (player1 && !standings[player1.id]) {
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

      if (player2 && !standings[player2.id]) {
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
      if (!match.completed || match.isBye) return

      const team1Players = match.team1?.filter(player => player && !player.isBye) || []
      const team2Players = match.team2?.filter(player => player && !player.isBye) || []

      if (team1Players.length === 0 || team2Players.length === 0) return

      const s1 = match.score1 || 0
      const s2 = match.score2 || 0

      let result = 'draw'
      if (s1 > s2) result = 'win1'
      else if (s2 > s1) result = 'win2'

      const updatePlayer = (player, score, opponentScore, res) => {
        if (!player || player.isBye) return

        const standing = standings[player.id]
        if (!standing) return

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
        updatePlayer(player, s1, s2, result === 'win1' ? 'win' : result === 'win2' ? 'loss' : 'draw')
      })

      team2Players.forEach(player => {
        updatePlayer(player, s2, s1, result === 'win2' ? 'win' : result === 'win1' ? 'loss' : 'draw')
      })
    })
  })

  const result = Object.values(standings).map(standing => ({
    ...standing,
    diff: standing.games_won - standing.games_lost,
  }))

  result.sort((a, b) => {
    if (b.Pts !== a.Pts) return b.Pts - a.Pts
    if (b.diff !== a.diff) return b.diff - a.diff
    return b.W - a.W
  })

  return result
}

// ============================================================
// CHECK IF TOURNAMENT COMPLETE
// ============================================================

export function isTournamentComplete(rounds, totalRounds) {
  if (rounds.length < totalRounds) return false

  for (let i = 0; i < totalRounds; i++) {
    const round = rounds[i]
    if (!round || round.matches.length === 0) return false

    const allCompleted = round.matches.every(match => match.completed || match.isBye)
    if (!allCompleted) return false
  }

  return true
}

// ============================================================
// CHECK IF ROUND IS COMPLETE
// ============================================================

export function isRoundComplete(round) {
  if (!round || !round.matches || round.matches.length === 0) return false
  return round.matches.every(match => match.completed || match.isBye)
}
