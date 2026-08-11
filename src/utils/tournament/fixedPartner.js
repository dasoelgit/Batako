// src/utils/tournament/fixedPartner.js
import { makeMatch, makeBye, shuffleArray } from './common'

// ============================================================
// GENERATE FIXED PARTNER ROUNDS
// Teams stay together
// ============================================================
//
// Fixed teams use the same round-robin circle schedule,
// but the unit being rotated is the team.
// This prevents repeated opponents until the full cycle is exhausted
// and distributes odd-team BYEs.
//

export function generateFixedPartnerRounds(teams, totalRounds) {
  const rounds = []

  if (teams.length < 2 || totalRounds <= 0) {
    return rounds
  }

  const roster = [...teams]

  const isOdd = roster.length % 2 !== 0

  if (isOdd) {
    roster.push({
      id: '__BYE_TEAM__',
      player1: { isBye: true },
      player2: { isBye: true },
      isBye: true,
    })
  }

  const n = roster.length
  let rotation = [...roster]

  for (let round = 1; round <= totalRounds; round++) {
    const roundMatches = []

    for (let i = 0; i < n / 2; i++) {
      const a = rotation[i]
      const b = rotation[n - 1 - i]

      if (a.isBye || b.isBye) {
        const team = a.isBye ? b : a
        roundMatches.push(makeBye([team.player1, team.player2]))
      } else {
        roundMatches.push(
          makeMatch(
            [a.player1, a.player2],
            [b.player1, b.player2]
          )
        )
      }
    }

    rounds.push({
      round_number: round,
      matches: shuffleArray(roundMatches),
    })

    rotation = [rotation[0], rotation[n - 1], ...rotation.slice(1, n - 1)]
  }

  return rounds
}
