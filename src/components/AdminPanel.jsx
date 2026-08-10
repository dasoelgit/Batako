// src/components/AdminPanel.jsx
import { useState, useEffect } from 'react'
import { supabase, TENNIS_ADMIN_PIN } from '../utils/supabase'
import { teamLabel, formatJakartaTime } from '../utils/helpers'

// ============================================================
// ADMIN PLAYERS
// ============================================================
function AdminPlayers({ players, refreshPlayers }) {
  const [newName, setNewName] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const addPlayer = async () => {
    const trimmed = newName.trim()
    if (!trimmed) return
    setBusy(true)
    setError('')
    const { error: insertError } = await supabase.from('tennis_players').insert({ name: trimmed })
    setBusy(false)
    if (insertError) {
      setError(insertError.code === '23505' ? 'That player already exists.' : insertError.message)
      return
    }
    setNewName('')
    refreshPlayers()
  }

  return (
    <div className="card">
      <span className="field-label">Add player</span>
      <div style={{ display: 'flex', gap: 8 }}>
        <input
          type="text"
          placeholder="Player name"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          style={{ marginBottom: 0 }}
        />
        <button
          className="btn-primary"
          style={{ width: 'auto', padding: '0 16px' }}
          disabled={busy || !newName.trim()}
          onClick={addPlayer}
        >
          Add
        </button>
      </div>
      {error && (
        <div style={{
          background: 'rgba(214,67,47,0.12)',
          color: '#c0392b',
          padding: '10px',
          borderRadius: '6px',
          fontSize: '13px',
          marginTop: '12px',
          textAlign: 'center',
        }}>
          {error}
        </div>
      )}
      <div style={{ marginTop: 16 }}>
        <span className="field-label">All players ({players.length})</span>
        {players.map((p) => (
          <div key={p.id} className="leaderboard-row" style={{ gridTemplateColumns: '1fr auto' }}>
            <div className="player-name">{p.name}</div>
            <button
              className="btn-secondary"
              style={{ width: 'auto', padding: '4px 12px' }}
              onClick={() => {
                if (confirm(`Remove ${p.name}?`)) {
                  supabase.from('tennis_players').delete().eq('id', p.id).then(() => refreshPlayers())
                }
              }}
            >
              Remove
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

// ============================================================
// ADMIN MATCHES
// ============================================================
function AdminMatches({ onDataChanged }) {
  const [matches, setMatches] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [editScores, setEditScores] = useState([])
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    loadMatches()
  }, [])

  const loadMatches = async () => {
    setLoading(true)
    setError('')
    try {
      const { data, error } = await supabase
        .from('tennis_matches')
        .select('*')
        .eq('status', 'completed')
        .eq('is_tournament_match', false)
        .order('completed_at', { ascending: false })
        .limit(50)

      if (error) throw error
      setMatches(data || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateStr) => {
    if (!dateStr) return ''
    const d = new Date(dateStr)
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
  }

  const getSetsDisplay = (sets) => {
    if (!sets || sets.length === 0) return 'No sets'
    return sets.map(s => `${s.team1_games}-${s.team2_games}`).join(', ')
  }

  const startEdit = (match) => {
    setEditingId(match.id)
    if (match.sets && match.sets.length > 0) {
      setEditScores(match.sets.map(s => ({
        team1: String(s.team1_games),
        team2: String(s.team2_games),
      })))
    } else {
      setEditScores([{ team1: '', team2: '' }])
    }
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditScores([])
  }

  const updateEditScore = (index, side, value) => {
    const newScores = [...editScores]
    newScores[index] = { ...newScores[index], [side]: value }
    setEditScores(newScores)
  }

  const saveEdit = async (match) => {
    setBusy(true)
    setError('')

    try {
      const parsedSets = editScores.map(s => ({
        team1_games: parseInt(s.team1) || 0,
        team2_games: parseInt(s.team2) || 0,
      }))

      const setsWithWinner = parsedSets.map((s, i) => {
        let winner = null
        if (s.team1_games > s.team2_games) winner = 1
        else if (s.team2_games > s.team1_games) winner = 2
        return {
          set_number: i + 1,
          team1_games: s.team1_games,
          team2_games: s.team2_games,
          winner: winner,
          tiebreak: null,
        }
      })

      const wins1 = setsWithWinner.filter(s => s.winner === 1).length
      const wins2 = setsWithWinner.filter(s => s.winner === 2).length
      let matchWinner = null
      let draw = false
      if (wins1 > wins2) matchWinner = 1
      else if (wins2 > wins1) matchWinner = 2
      else draw = true

      const { error: updateError } = await supabase
        .from('tennis_matches')
        .update({
          sets: setsWithWinner,
          winner: matchWinner,
          draw: draw,
          team1_games: parsedSets.reduce((sum, s) => sum + s.team1_games, 0),
          team2_games: parsedSets.reduce((sum, s) => sum + s.team2_games, 0),
        })
        .eq('id', match.id)

      if (updateError) throw updateError

      setEditingId(null)
      setEditScores([])
      await loadMatches()
      if (onDataChanged) onDataChanged()
    } catch (err) {
      setError('Failed to save: ' + err.message)
    } finally {
      setBusy(false)
    }
  }

  const handleDelete = async (match) => {
    if (!confirm(`Delete match: ${teamLabel(match.team1_players)} vs ${teamLabel(match.team2_players)}?`)) return

    setBusy(true)
    try {
      const { error } = await supabase
        .from('tennis_matches')
        .delete()
        .eq('id', match.id)

      if (error) throw error

      await loadMatches()
      if (onDataChanged) onDataChanged()
    } catch (err) {
      alert('Error deleting match: ' + err.message)
    } finally {
      setBusy(false)
    }
  }

  if (loading) return <div className="loading">Loading matches...</div>

  return (
    <div className="card">
      <span className="field-label">Regular Matches</span>

      {error && (
        <div style={{
          background: 'rgba(214,67,47,0.12)',
          color: '#c0392b',
          padding: '10px',
          borderRadius: '6px',
          fontSize: '13px',
          marginBottom: '12px',
          textAlign: 'center',
        }}>
          ❌ {error}
        </div>
      )}

      {matches.length === 0 ? (
        <div style={{ padding: '20px', textAlign: 'center', color: '#6a7a6a' }}>
          No regular matches found.
        </div>
      ) : (
        matches.map((m) => {
          const isEditing = editingId === m.id
          const matchSets = m.sets || []
          const numSets = matchSets.length

          return (
            <div
              key={m.id}
              style={{
                borderBottom: '1px solid #e8f0e6',
                padding: '12px 0',
              }}
            >
              {!isEditing ? (
                <div>
                  <div style={{ fontWeight: '600', fontSize: '14px' }}>
                    {teamLabel(m.team1_players)} vs {teamLabel(m.team2_players)}
                  </div>
                  <div style={{ fontSize: '13px', color: '#6a7a6a' }}>
                    {getSetsDisplay(matchSets)}
                    {m.draw && <span style={{ marginLeft: '8px', color: '#d4a843' }}>⚖️ DRAW</span>}
                  </div>
                  <div style={{ fontSize: '11px', color: '#6a7a6a' }}>
                    {formatDate(m.completed_at)}
                  </div>
                  <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                    <button
                      className="btn-secondary"
                      style={{ width: 'auto', padding: '4px 12px', fontSize: '11px' }}
                      onClick={() => startEdit(m)}
                    >
                      ✏️ Edit
                    </button>
                    <button
                      className="btn-secondary"
                      style={{ width: 'auto', padding: '4px 12px', fontSize: '11px', color: '#c0392b', borderColor: '#c0392b' }}
                      onClick={() => handleDelete(m)}
                      disabled={busy}
                    >
                      🗑️ Delete
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <div style={{ fontWeight: '600', fontSize: '14px', marginBottom: '8px' }}>
                    ✏️ {teamLabel(m.team1_players)} vs {teamLabel(m.team2_players)}
                  </div>

                  {editScores.map((score, idx) => (
                    <div key={idx} style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '6px' }}>
                      <span style={{ fontSize: '12px', color: '#6a7a6a', minWidth: '40px' }}>
                        Set {idx + 1}
                      </span>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={score.team1}
                        onChange={(e) => updateEditScore(idx, 'team1', e.target.value.replace(/[^0-9]/g, ''))}
                        style={{
                          width: '50px',
                          padding: '4px 8px',
                          borderRadius: '4px',
                          border: '1px solid #d0ddd0',
                          textAlign: 'center',
                          fontSize: '14px',
                        }}
                      />
                      <span style={{ color: '#6a7a6a' }}>vs</span>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={score.team2}
                        onChange={(e) => updateEditScore(idx, 'team2', e.target.value.replace(/[^0-9]/g, ''))}
                        style={{
                          width: '50px',
                          padding: '4px 8px',
                          borderRadius: '4px',
                          border: '1px solid #d0ddd0',
                          textAlign: 'center',
                          fontSize: '14px',
                        }}
                      />
                      {idx === editScores.length - 1 && (
                        <button
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#4ade80',
                            fontSize: '16px',
                            cursor: 'pointer',
                          }}
                          onClick={() => setEditScores([...editScores, { team1: '', team2: '' }])}
                        >
                          +
                        </button>
                      )}
                      {editScores.length > 1 && (
                        <button
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#c0392b',
                            fontSize: '14px',
                            cursor: 'pointer',
                          }}
                          onClick={() => {
                            const newScores = editScores.filter((_, i) => i !== idx)
                            setEditScores(newScores)
                          }}
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  ))}

                  {error && (
                    <div style={{
                      background: 'rgba(214,67,47,0.12)',
                      color: '#c0392b',
                      padding: '6px',
                      borderRadius: '4px',
                      fontSize: '12px',
                      marginBottom: '8px',
                    }}>
                      {error}
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                    <button
                      className="btn-secondary"
                      style={{ width: 'auto', padding: '4px 12px', fontSize: '11px' }}
                      onClick={cancelEdit}
                    >
                      Cancel
                    </button>
                    <button
                      className="btn-primary"
                      style={{ width: 'auto', padding: '4px 12px', fontSize: '11px' }}
                      onClick={() => saveEdit(m)}
                      disabled={busy}
                    >
                      {busy ? 'Saving...' : '💾 Save'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )
        })
      )}
    </div>
  )
}

// ============================================================
// ADMIN TOURNAMENTS
// ============================================================
function AdminTournaments({ onDataChanged }) {
  const [tournaments, setTournaments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [deletingId, setDeletingId] = useState(null)

  useEffect(() => {
    loadTournaments()
  }, [])

  const loadTournaments = async () => {
    setLoading(true)
    setError('')
    try {
      const { data, error } = await supabase
        .from('tennis_tournaments')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setTournaments(data || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateStr) => {
    if (!dateStr) return ''
    const d = new Date(dateStr)
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
  }

  const getTypeLabel = (type) => {
    const labels = {
      americano: 'Americano',
      mexicano: 'Mexicano',
      singles: 'Singles',
      fixed_partner: 'Fixed Partner',
    }
    return labels[type] || type
  }

  const handleDelete = async (id, name) => {
    if (!confirm(`Delete tournament "${name}"? This will delete ALL matches and standings. This cannot be undone.`)) return

    setDeletingId(id)
    try {
      const { data: links, error: linkFetchError } = await supabase
        .from('tennis_tournament_matches')
        .select('match_id')
        .eq('tournament_id', id)

      if (linkFetchError) throw linkFetchError

      if (links && links.length > 0) {
        const matchIds = links.map(l => l.match_id)
        const { error: matchDeleteError } = await supabase
          .from('tennis_matches')
          .delete()
          .in('id', matchIds)

        if (matchDeleteError) throw matchDeleteError
      }

      const { error: linkDeleteError } = await supabase
        .from('tennis_tournament_matches')
        .delete()
        .eq('tournament_id', id)

      if (linkDeleteError) throw linkDeleteError

      const { error: deleteError } = await supabase
        .from('tennis_tournaments')
        .delete()
        .eq('id', id)

      if (deleteError) throw deleteError

      await loadTournaments()
      if (onDataChanged) onDataChanged()
    } catch (err) {
      alert('Error deleting tournament: ' + err.message)
    } finally {
      setDeletingId(null)
    }
  }

  if (loading) return <div className="loading">Loading tournaments...</div>

  return (
    <div className="card">
      <span className="field-label">All Tournaments</span>

      {error && (
        <div style={{
          background: 'rgba(214,67,47,0.12)',
          color: '#c0392b',
          padding: '10px',
          borderRadius: '6px',
          fontSize: '13px',
          marginBottom: '12px',
          textAlign: 'center',
        }}>
          ❌ {error}
        </div>
      )}

      {tournaments.length === 0 ? (
        <div style={{ padding: '20px', textAlign: 'center', color: '#6a7a6a' }}>
          No tournaments created yet.
        </div>
      ) : (
        tournaments.map((t) => (
          <div
            key={t.id}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '10px 4px',
              borderBottom: '1px solid #e8f0e6',
            }}
          >
            <div>
              <div style={{ fontWeight: '600', fontSize: '14px' }}>{t.name}</div>
              <div style={{ fontSize: '12px', color: '#6a7a6a' }}>
                {getTypeLabel(t.type)} · {t.players.length} {t.type === 'fixed_partner' ? 'teams' : 'players'}
                {t.status === 'active'
                  ? ` · Round ${t.current_round} of ${t.total_rounds}`
                  : ' · ✅ Completed'}
              </div>
              <div style={{ fontSize: '11px', color: '#6a7a6a' }}>
                {t.status === 'active' ? 'Started' : 'Completed'}: {formatDate(t.created_at)}
              </div>
            </div>
            <button
              style={{
                background: 'none',
                border: 'none',
                color: '#c0392b',
                fontSize: '18px',
                cursor: 'pointer',
                padding: '4px 8px',
              }}
              onClick={() => handleDelete(t.id, t.name)}
              disabled={deletingId === t.id}
            >
              {deletingId === t.id ? '...' : '✕'}
            </button>
          </div>
        ))
      )}
    </div>
  )
}

// ============================================================
// ADMIN PANEL (MAIN) — WITH PIN CHECK
// ============================================================
export default function AdminPanel({ players, refreshPlayers, onDataChanged, onBack }) {
  const [authed, setAuthed] = useState(false)
  const [pin, setPin] = useState('')
  const [pinError, setPinError] = useState('')
  const [tab, setTab] = useState('players')

  const handleUnlock = () => {
    if (pin === TENNIS_ADMIN_PIN) {
      setAuthed(true)
      setPinError('')
    } else {
      setPinError('Wrong PIN')
    }
  }

  if (!authed) {
    return (
      <div>
        <button
          onClick={onBack}
          style={{
            background: 'none',
            border: 'none',
            color: '#6a7a6a',
            fontSize: '14px',
            cursor: 'pointer',
            padding: '0 0 12px 0',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
          }}
        >
          ← Back
        </button>

        <div className="card">
          <span className="field-label">Admin PIN</span>
          <input
            type="text"
            inputMode="numeric"
            placeholder="Enter PIN"
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/[^0-9]/g, ''))}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleUnlock()
            }}
            style={{ marginBottom: '12px' }}
          />
          {pinError && (
            <div style={{
              background: 'rgba(214,67,47,0.12)',
              color: '#c0392b',
              padding: '10px',
              borderRadius: '6px',
              fontSize: '13px',
              marginBottom: '12px',
              textAlign: 'center',
            }}>
              {pinError}
            </div>
          )}
          <button className="btn-primary" onClick={handleUnlock}>
            Unlock
          </button>
        </div>
      </div>
    )
  }

  // --- Admin content (unlocked) ---
  return (
    <div>
      <button
        onClick={onBack}
        style={{
          background: 'none',
          border: 'none',
          color: '#6a7a6a',
          fontSize: '14px',
          cursor: 'pointer',
          padding: '0 0 12px 0',
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
        }}
      >
        ← Back
      </button>

      <div className="match-type-toggle" style={{ marginBottom: 14 }}>
        <button className={tab === 'players' ? 'active' : ''} onClick={() => setTab('players')}>
          Players
        </button>
        <button className={tab === 'matches' ? 'active' : ''} onClick={() => setTab('matches')}>
          Matches
        </button>
        <button className={tab === 'tournaments' ? 'active' : ''} onClick={() => setTab('tournaments')}>
          Tournaments
        </button>
      </div>

      {tab === 'players' && <AdminPlayers players={players} refreshPlayers={refreshPlayers} />}
      {tab === 'matches' && <AdminMatches onDataChanged={onDataChanged} />}
      {tab === 'tournaments' && <AdminTournaments onDataChanged={onDataChanged} />}
    </div>
  )
}
