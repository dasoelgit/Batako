// src/utils/helpers.js
import { supabase } from './supabase'

// ============================================================
// LEVENSHTEIN DISTANCE — For similar name checking
// ============================================================
function getLevenshteinDistance(a, b) {
  const matrix = []
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i]
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j
  }
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b[i-1] === a[j-1]) {
        matrix[i][j] = matrix[i-1][j-1]
      } else {
        matrix[i][j] = Math.min(
          matrix[i-1][j-1] + 1,
          matrix[i][j-1] + 1,
          matrix[i-1][j] + 1
        )
      }
    }
  }
  return matrix[b.length][a.length]
}

function findSimilarName(newName, existingPlayers, threshold = 2) {
  const trimmed = newName.trim().toLowerCase()
  let bestMatch = null
  let bestDistance = Infinity

  for (const player of existingPlayers) {
    const playerName = player.name.toLowerCase()
    const distance = getLevenshteinDistance(trimmed, playerName)
    if (distance < bestDistance && distance <= threshold) {
      bestDistance = distance
      bestMatch = player
    }
  }

  return bestMatch
}

// ============================================================
// TEAM LABEL
// ============================================================
export function teamLabel(team) {
  if (!team || !Array.isArray(team) || team.length === 0) return 'TBD'
  return team.map((p) => p?.name || 'Unknown').join(' / ')
}

// ============================================================
// FORMAT DATE
// ============================================================
export function formatJakartaTime(iso) {
  if (!iso) return ''
  try {
    const formatted = new Date(iso).toLocaleString('en-GB', {
      timeZone: 'Asia/Jakarta',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    })
    return `${formatted} WIB`
  } catch {
    return iso
  }
}

// ============================================================
// GET OR CREATE PLAYER — WITH SIMILAR NAME CHECK
// ============================================================
export async function getOrCreatePlayer(name) {
  const trimmed = name.trim()
  if (!trimmed) throw new Error('Player name is required')

  // 1. Check if exact match exists (case-insensitive)
  const { data: existing, error: checkError } = await supabase
    .from('tennis_players')
    .select('id, name')
    .ilike('name', trimmed)
    .maybeSingle()

  if (checkError) throw checkError
  if (existing) return existing

  // 2. Check for similar names
  // First, get all players to compare
  const { data: allPlayers, error: allError } = await supabase
    .from('tennis_players')
    .select('id, name')

  if (allError) throw allError

  const similar = findSimilarName(trimmed, allPlayers || [])

  if (similar) {
    // Show confirmation popup
    const userChoice = confirm(
      `⚠️ Similar name found!\n\nYou added: "${trimmed}"\nExisting player: "${similar.name}"\n\nClick "OK" to select "${similar.name}"\nClick "Cancel" to add "${trimmed}" anyway.`
    )

    if (userChoice) {
      return similar
    }
    // User chose to add new anyway — continue
  }

  // 3. Create new player
  const { data: created, error: insertError } = await supabase
    .from('tennis_players')
    .insert({ name: trimmed })
    .select('id, name')
    .single()

  if (insertError) throw insertError
  return created
}
