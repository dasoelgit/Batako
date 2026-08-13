// src/utils/tournament/groupKnockout.js
import {
  generateAmericanoRounds,
  generateMexicanoRounds,
  generateSinglesRounds,
  generateFixedPartnerRounds,
  generateKnockoutBracket,
  calculateTournamentStandings,
} from './index'

// ============================================================
// GENERATE GROUP + KNOCKOUT TOURNAMENT
// ============================================================

export function generateGroupKnockout(
  players,
  groupFormat,      // 'singles' | 'doubles' | 'americano' | 'mexicano' | 'fixed_partner'
  numGroups,        // 1, 2, 3, 4
  advancePerGroup,  // 1, 2, 3, 4
  knockoutMatchType, // 'singles' | 'doubles'
  bronzeMatch = false,
  seeding = 'random'
) {
  // 1. Split players into groups
  const shuffled = [...players].sort(() => Math.random() - 0.5)
  const groups = []
  const groupSize = Math.floor(shuffled.length / numGroups)
  const extra = shuffled.length % numGroups

  let startIndex = 0
  for (let g = 0; g < numGroups; g++) {
    const size = groupSize + (g < extra ? 1 : 0)
    const groupPlayers = shuffled.slice(startIndex, startIndex + size)
    groups.push({
      id: g + 1,
      name: `Group ${String.fromCharCode(65 + g)}`,
      players: groupPlayers,
      rounds: [],
      standings: [],
    })
    startIndex += size
  }

  // 2. Generate group stage rounds
  const groupRounds = groups.map((group, index) => {
    let rounds = []
    const groupPlayers = group.players

    if (groupFormat === 'singles') {
      rounds = generateSinglesRounds(groupPlayers, groupPlayers.length - 1)
    } else if (groupFormat === 'fixed_partner') {
      // For fixed partner, players are actually teams
      const teams = groupPlayers.map((p, i) => ({
        id: `team_${i}`,
        name: p.name || `${p.player1?.name} / ${p.player2?.name}`,
        player1: p.player1,
        player2: p.player2,
        isTeam: true,
      }))
      rounds = generateFixedPartnerRounds(teams, teams.length - 1)
    } else if (groupFormat === 'americano') {
      rounds = generateAmericanoRounds(groupPlayers, groupPlayers.length - 1)
    } else if (groupFormat === 'mexicano') {
      rounds = generateMexicanoRounds(groupPlayers, groupPlayers.length - 1)
    } else {
      // Default to singles
      rounds = generateSinglesRounds(groupPlayers, groupPlayers.length - 1)
    }

    return rounds
  })

  // 3. Calculate standings for each group
  const groupStandings = groups.map((group, index) => {
    const rounds = groupRounds[index]
    // For fixed partner, standings are per team
    const tournamentType = groupFormat === 'fixed_partner' ? 'fixed_partner' : null
    const standings = calculateTournamentStandings(
      group.players,
      rounds,
      'win', // Groups always use win-based standings
      tournamentType
    )
    return {
      groupId: group.id,
      groupName: group.name,
      players: group.players,
      rounds: rounds,
      standings: standings,
    }
  })

  // 4. Extract advancing players
  const advancingPlayers = []
  groupStandings.forEach((gs) => {
    const top = gs.standings.slice(0, advancePerGroup)
    top.forEach((player) => {
      // Find the original player object
      const original = gs.players.find(p => p.id === player.id)
      if (original) {
        advancingPlayers.push(original)
      }
    })
  })

  // 5. Generate knockout bracket
  let knockoutRounds = []
  if (advancingPlayers.length >= 2) {
    knockoutRounds = generateKnockoutBracket(
      advancingPlayers,
      seeding,
      bronzeMatch,
      knockoutMatchType
    )
  }

  return {
    groups: groupStandings,
    advancingPlayers: advancingPlayers,
    knockoutRounds: knockoutRounds,
    totalGroups: numGroups,
    advancePerGroup: advancePerGroup,
    groupFormat: groupFormat,
    knockoutMatchType: knockoutMatchType,
  }
}

// ============================================================
// CHECK IF GROUP STAGE IS COMPLETE
// ============================================================

export function isGroupStageComplete(groups) {
  return groups.every((g) =>
    g.rounds.every((round) =>
      round.matches.every((match) => match.completed || match.isBye)
    )
  )
}

// ============================================================
// CHECK IF KNOCKOUT STAGE IS COMPLETE
// ============================================================

export function isKnockoutComplete(knockoutRounds) {
  if (!knockoutRounds || knockoutRounds.length === 0) return false
  return knockoutRounds.every((round) =>
    round.matches.every((match) => match.completed || match.isBye)
  )
}
