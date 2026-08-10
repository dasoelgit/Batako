// src/components/AdminPanel.jsx
import { useState, useEffect } from 'react'
import { supabase } from '../utils/supabase'

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
      americano: '🇺🇸 Americano',
      mexicano: '🇲🇽 Mexicano',
      singles: '🎾 Singles',
      fixed_partner: '👥 Fixed Partner',
    }
    return labels[type] || type
  }

  const handleDelete = async (id, name) => {
    if (!confirm(`Delete tournament "${name}"? This will delete ALL matches and standings. This cannot be undone.`)) return

    setDeletingId(id)
    try {
      // 1. Get all match IDs linked to this tournament
      const { data: links, error: linkFetchError } = await supabase
        .from('tennis_tournament_matches')
        .select('match_id')
        .eq('tournament_id', id)

      if (linkFetchError) throw linkFetchError

      // 2. Delete all matches from tennis_matches
      if (links && links.length > 0) {
        const matchIds = links.map(l => l.match_id)
        const { error: matchDeleteError } = await supabase
          .from('tennis_matches')
          .delete()
          .in('id', matchIds)

        if (matchDeleteError) throw matchDeleteError
      }

      // 3. Delete tournament_matches links
      const { error: linkDeleteError } = await supabase
        .from('tennis_tournament_matches')
        .delete()
        .eq('tournament_id', id)

      if (linkDeleteError) throw linkDeleteError

      // 4. Delete the tournament
      const { error: deleteError } = await supabase
        .from('tennis_tournaments')
        .delete()
        .eq('id', id)

      if (deleteError) throw deleteError

      // 5. Refresh
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
// ADMIN PANEL (MAIN)
// ============================================================
export default function AdminPanel({ players, refreshPlayers, onDataChanged, onBack }) {
  const [tab, setTab] = useState('players')

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
        <button className={tab === 'tournaments' ? 'active' : ''} onClick={() => setTab('tournaments')}>
          Tournaments
        </button>
      </div>

      {tab === 'players' ? (
        <AdminPlayers players={players} refreshPlayers={refreshPlayers} />
      ) : (
        <AdminTournaments onDataChanged={onDataChanged} />
      )}
    </div>
  )
}
