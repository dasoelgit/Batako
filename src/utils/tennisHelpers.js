// src/utils/tennisHelpers.js
// Tennis-specific helpers

// Determine which side to serve from (Deuce or Ad)
export function getServeSide(pointsInGame) {
  return pointsInGame % 2 === 0 ? 'Deuce' : 'Ad'
}

// Get short side label
export function getServeSideShort(pointsInGame) {
  return pointsInGame % 2 === 0 ? 'D' : 'A'
}

// Determine which team serves next game
export function getNextServer(gameNumber) {
  // Team 1 serves odd games, Team 2 serves even games
  return (gameNumber % 2 === 1) ? 1 : 2
}

// Get receiver (opposite of server)
export function getReceiver(serverTeam) {
  return serverTeam === 1 ? 2 : 1
}

// Check if sides should be switched (after odd number of games)
export function shouldSwitchSides(gamesPlayedInSet) {
  return gamesPlayedInSet % 2 === 1
}

// Get tiebreak format label
export function getTiebreakLabel(format) {
  return `First to ${format}, win by 2`
}
