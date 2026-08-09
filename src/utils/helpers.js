// src/utils/helpers.js
import { supabase } from './supabase'

export function teamLabel(team) {
  if (!team || !Array.isArray(team) || team.length === 0) return 'TBD'
  return team.map((p) => p?.name || 'Unknown').join(' / ')
}

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

export async function getOrCreatePlayer(name) {
  const trimmed = name.trim()
  if (!trimmed) throw new Error('Player name is required')

  const { data: existing } = await supabase
    .from('tennis_players')
    .select('id, name')
    .ilike('name', trimmed)
    .maybeSingle()

  if (existing) return existing

  const { data: created, error } = await supabase
    .from('tennis_players')
    .insert({ name: trimmed })
    .select('id, name')
    .single()

  if (error) throw error
  return created
}
