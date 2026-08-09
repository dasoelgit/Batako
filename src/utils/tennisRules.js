// src/utils/tennisRules.js
// Fully customizable tennis scoring

export const POINT_NAMES = ['0', '15', '30', '40']

// ============================================================
// GAME WINNER
// ============================================================
export function checkGameWinner(points1, points2, gameScoring, deuceCount) {
  switch (gameScoring) {
    case 'sudden':
      if (points1 >= 4 && points1 > points2) return 1
      if (points2 >= 4 && points2 > points1) return 2
      return null

    case 'standard':
      if (points1 >= 4 && points1 - points2 >= 2) return 1
      if (points2 >= 4 && points2 - points1 >= 2) return 2
      return null

    case '1deuce':
      if (points1 >= 4 && points1 - points2 >= 2) return 1
      if (points2 >= 4 && points2 - points1 >= 2) return 2
      // At deuce (3-3) → next point wins
      if (points1 >= 3 && points2 >= 3) {
        if (points1 > points2) return 1
        if (points2 > points1) return 2
      }
      return null

    case '2deuces':
      if (points1 >= 4 && points1 - points2 >= 2) return 1
      if (points2 >= 4 && points2 - points1 >= 2) return 2
      // After 2 deuces → next point wins
      if (points1 >= 3 && points2 >= 3 && deuceCount >= 2) {
        if (points1 > points2) return 1
        if (points2 > points1) return 2
      }
      return null

    default:
      return null
  }
}

// ============================================================
// TIEBREAK WINNER
// ============================================================
export function checkTiebreakWinner(score1, score2, tiebreakFormat) {
  // First to tiebreakFormat, win by 2
  if (score1 >= tiebreakFormat && score1 - score2 >= 2) return 1
  if (score2 >= tiebreakFormat && score2 - score1 >= 2) return 2
  return null
}

// ============================================================
// SET RESULT
// ============================================================
export function checkSetResult(games1, games2, setType, setValue, tiebreakEnabled, tiebreakActive) {
  if (setType === 'first_to') {
    // First to X games wins
    if (games1 >= setValue) return { winner: 1, draw: false, tiebreak: false }
    if (games2 >= setValue) return { winner: 2, draw: false, tiebreak: false }

    // Check if tiebreak should start (both at X-1)
    if (tiebreakEnabled && !tiebreakActive) {
      if (games1 >= setValue - 1 && games2 >= setValue - 1) {
        return { winner: null, draw: false, tiebreak: true }
      }
    }

    return null // continue
  }

  if (setType === 'best_of') {
    // Play exactly X games
    const total = games1 + games2
    if (total >= setValue) {
      if (games1 > games2) return { winner: 1, draw: false, tiebreak: false }
      if (games2 > games1) return { winner: 2, draw: false, tiebreak: false }
      return { winner: null, draw: true, tiebreak: false } // DRAW!
    }
    return null // continue
  }

  return null
}

// ============================================================
// MATCH RESULT
// ============================================================
export function checkMatchResult(sets, matchConfig) {
  const wins1 = sets.filter(s => s.winner === 1).length
  const wins2 = sets.filter(s => s.winner === 2).length
  const totalSets = sets.length

  if (matchConfig === 'single') {
    // Single set — winner is set winner
    if (totalSets === 0) return null
    const lastSet = sets[sets.length - 1]
    if (lastSet.winner) return { winner: lastSet.winner, draw: false }
    return null
  }

  if (matchConfig === 'best_of_3') {
    // First to 2 sets wins
    if (wins1 >= 2) return { winner: 1, draw: false }
    if (wins2 >= 2) return { winner: 2, draw: false }
    return null // continue
  }

  if (matchConfig === 'best_of_5') {
    // First to 3 sets wins
    if (wins1 >= 3) return { winner: 1, draw: false }
    if (wins2 >= 3) return { winner: 2, draw: false }
    return null // continue
  }

  return null
}

// ============================================================
// DISPLAY HELPERS
// ============================================================
export function getPointDisplay(points1, points2) {
  if (points1 >= 3 && points2 >= 3) {
    if (points1 === points2) return 'Deuce'
    if (points1 === points2 + 1) return 'Ad'
    if (points2 === points1 + 1) return 'Ad'
  }

  const d1 = points1 > 3 ? String(points1) : POINT_NAMES[points1] || String(points1)
  const d2 = points2 > 3 ? String(points2) : POINT_NAMES[points2] || String(points2)
  return `${d1}-${d2}`
}

export function getGameScoringLabel(mode) {
  switch (mode) {
    case 'standard': return 'Standard'
    case 'sudden': return 'Sudden'
    case '1deuce': return '1 Deuce'
    case '2deuces': return '2 Deuces'
    default: return 'Unknown'
  }
}

export function getSetTypeLabel(type, value) {
  if (type === 'first_to') return `First to ${value} games`
  if (type === 'best_of') return `Best of ${value} games`
  return 'Unknown'
}

export function getMatchConfigLabel(type) {
  switch (type) {
    case 'single': return '1 Set'
    case 'best_of_3': return 'Best of 3 Sets'
    case 'best_of_5': return 'Best of 5 Sets'
    default: return 'Unknown'
  }
}
