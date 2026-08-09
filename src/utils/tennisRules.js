// src/utils/tennisRules.js
// Fully customizable tennis scoring — CORRECT VERSION

export const POINT_NAMES = ['0', '15', '30', '40']

// ============================================================
// GAME WINNER — CORRECT
// ============================================================
export function checkGameWinner(points1, points2, gameScoring, deuceCount) {
  switch (gameScoring) {
    case 'no_deuce':
      // First to 4 points wins. No deuce at all.
      // 4-0, 4-1, 4-2, 4-3 all win
      if (points1 >= 4 && points1 > points2) return 1
      if (points2 >= 4 && points2 > points1) return 2
      return null

    case '1deuce':
      // Normal win by 2, but at 4-4 (deuceCount >= 2) sudden death
      // Winning scores: 5-3 or 5-4
      if (points1 >= 4 && points1 - points2 >= 2) return 1
      if (points2 >= 4 && points2 - points1 >= 2) return 2
      // Sudden death at 4-4
      if (points1 >= 4 && points2 >= 4 && deuceCount >= 2) {
        if (points1 > points2) return 1
        if (points2 > points1) return 2
      }
      return null

    case '2deuces':
      // Normal win by 2, but at 5-5 (deuceCount >= 3) sudden death
      // Winning scores: 6-4 or 6-5
      if (points1 >= 4 && points1 - points2 >= 2) return 1
      if (points2 >= 4 && points2 - points1 >= 2) return 2
      // Sudden death at 5-5
      if (points1 >= 5 && points2 >= 5 && deuceCount >= 3) {
        if (points1 > points2) return 1
        if (points2 > points1) return 2
      }
      return null

    case 'standard':
      // Normal tennis: win by 2, unlimited deuce
      if (points1 >= 4 && points1 - points2 >= 2) return 1
      if (points2 >= 4 && points2 - points1 >= 2) return 2
      return null

    default:
      return null
  }
}

// ============================================================
// CHECK IF SUDDEN DEATH POINT
// ============================================================
export function isSuddenDeathPoint(points1, points2, gameScoring, deuceCount) {
  if (gameScoring === 'no_deuce') {
    // At 3-3, next point wins
    return points1 >= 3 && points2 >= 3 && points1 === points2
  }
  if (gameScoring === '1deuce') {
    // At 4-4, next point wins
    return points1 >= 4 && points2 >= 4 && deuceCount >= 2
  }
  if (gameScoring === '2deuces') {
    // At 5-5, next point wins
    return points1 >= 5 && points2 >= 5 && deuceCount >= 3
  }
  return false
}

// ============================================================
// CHECK IF DEUCE
// ============================================================
export function isDeuce(points1, points2, gameScoring) {
  // No Deuce mode never shows deuce
  if (gameScoring === 'no_deuce') return false
  
  // For 1deuce and 2deuces and standard, deuce at 3-3 and 4-4 etc
  return points1 >= 3 && points2 >= 3 && points1 === points2
}

// ============================================================
// CHECK IF ADVANTAGE
// ============================================================
export function isAdvantage(points1, points2, gameScoring, deuceCount) {
  // No Deuce mode never shows advantage
  if (gameScoring === 'no_deuce') return false
  
  // For 1deuce: advantage at 4-3 (before sudden death at 4-4)
  if (gameScoring === '1deuce') {
    // Advantage only if we haven't reached sudden death yet
    if (points1 >= 4 && points2 >= 4 && deuceCount >= 2) return false
    if (points1 >= 3 && points2 >= 3 && points1 !== points2) {
      return points1 === points2 + 1 || points2 === points1 + 1
    }
    return false
  }
  
  // For 2deuces: advantage at 4-3 and 5-4 (before sudden death at 5-5)
  if (gameScoring === '2deuces') {
    // At 5-5 with deuceCount >= 3, it's sudden death, not advantage
    if (points1 >= 5 && points2 >= 5 && deuceCount >= 3) return false
    if (points1 >= 3 && points2 >= 3 && points1 !== points2) {
      return points1 === points2 + 1 || points2 === points1 + 1
    }
    return false
  }
  
  // Standard: advantage when points are 3-3 or higher and not equal
  if (gameScoring === 'standard') {
    if (points1 >= 3 && points2 >= 3 && points1 !== points2) {
      return points1 === points2 + 1 || points2 === points1 + 1
    }
    return false
  }
  
  return false
}

// ============================================================
// TIEBREAK WINNER
// ============================================================
export function checkTiebreakWinner(score1, score2, tiebreakFormat) {
  if (score1 >= tiebreakFormat && score1 - score2 >= 2) return 1
  if (score2 >= tiebreakFormat && score2 - score1 >= 2) return 2
  return null
}

// ============================================================
// SET RESULT
// ============================================================
export function checkSetResult(games1, games2, setType, setValue, tiebreakEnabled, tiebreakActive) {
  if (setType === 'first_to') {
    if (games1 >= setValue) return { winner: 1, draw: false, tiebreak: false }
    if (games2 >= setValue) return { winner: 2, draw: false, tiebreak: false }

    if (tiebreakEnabled && !tiebreakActive) {
      if (games1 >= setValue - 1 && games2 >= setValue - 1) {
        return { winner: null, draw: false, tiebreak: true }
      }
    }

    return null
  }

  if (setType === 'best_of') {
    const total = games1 + games2
    if (total >= setValue) {
      if (games1 > games2) return { winner: 1, draw: false, tiebreak: false }
      if (games2 > games1) return { winner: 2, draw: false, tiebreak: false }
      return { winner: null, draw: true, tiebreak: false }
    }
    return null
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
    if (totalSets === 0) return null
    const lastSet = sets[sets.length - 1]
    if (lastSet.winner) return { winner: lastSet.winner, draw: false }
    return null
  }

  if (matchConfig === 'best_of_3') {
    if (wins1 >= 2) return { winner: 1, draw: false }
    if (wins2 >= 2) return { winner: 2, draw: false }
    return null
  }

  if (matchConfig === 'best_of_5') {
    if (wins1 >= 3) return { winner: 1, draw: false }
    if (wins2 >= 3) return { winner: 2, draw: false }
    return null
  }

  return null
}

// ============================================================
// POINT DISPLAY
// ============================================================
export function getPointLabel(points) {
  const labels = ['0', '15', '30', '40']
  if (points > 3) return String(points)
  return labels[points] || String(points)
}

// ============================================================
// DISPLAY HELPERS
// ============================================================
export function getGameScoringLabel(mode) {
  switch (mode) {
    case 'standard': return 'Standard'
    case 'no_deuce': return 'No Deuce'
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
