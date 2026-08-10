// src/utils/pinUtils.js

// ============================================================
// PIN GENERATION & HASHING
// ============================================================

// Generate a random 4-digit PIN
export function generatePIN() {
  return String(Math.floor(1000 + Math.random() * 9000))
}

// Simple hash function (SHA-256 via SubtleCrypto)
export async function hashPIN(pin) {
  const encoder = new TextEncoder()
  const data = encoder.encode(pin)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
  return hashHex
}

// Verify PIN against stored hash
export async function verifyPIN(pin, hash) {
  if (!pin || !hash) return false
  const hashedInput = await hashPIN(pin)
  return hashedInput === hash
}

// Store PIN in localStorage for session persistence
export function savePINToStorage(tournamentId, pin) {
  try {
    const stored = JSON.parse(localStorage.getItem('tournament_pins') || '{}')
    stored[tournamentId] = pin
    localStorage.setItem('tournament_pins', JSON.stringify(stored))
  } catch (e) {
    console.error('Failed to save PIN to storage:', e)
  }
}

// Get PIN from localStorage
export function getPINFromStorage(tournamentId) {
  try {
    const stored = JSON.parse(localStorage.getItem('tournament_pins') || '{}')
    return stored[tournamentId] || null
  } catch (e) {
    return null
  }
}

// Remove PIN from localStorage
export function removePINFromStorage(tournamentId) {
  try {
    const stored = JSON.parse(localStorage.getItem('tournament_pins') || '{}')
    delete stored[tournamentId]
    localStorage.setItem('tournament_pins', JSON.stringify(stored))
  } catch (e) {
    console.error('Failed to remove PIN from storage:', e)
  }
}
