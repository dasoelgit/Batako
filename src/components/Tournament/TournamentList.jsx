// src/components/Tournament/TournamentList.jsx
import { useState, useEffect } from 'react'
import { supabase } from '../../utils/supabase'

export default function TournamentList({ onSelectTournament, onCreateNew }) {
  const [tournaments, setTournaments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

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

  if (loading) return <div className="loading">Loading tournaments...</div>

  const activeTournaments = tournaments.filter(t => t.status === 'active')
  const completedTournaments = tournaments.filter(t => t.status === 'completed')

  return (
    <div style={{
      background: '#ffffff',
      borderRadius: '12px',
      padding: '20px',
      boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '16px',
      }}>
        <div style={{
          fontSize: '20px',
          fontWeight: '700',
          color: '#d4a843',
        }}>
          🏆 Tournaments
        </div>
        <button
          className="btn-primary"
          style={{ width: 'auto', padding: '8px 16px', fontSize: '13px' }}
          onClick={onCreateNew}
        >
          + New
        </button>
      </div>

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

      {activeTournaments.length > 0 && (
        <>
          <div style={{
            fontSize: '12px',
            fontWeight: '600',
            color: '#6a7a6a',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            marginBottom: '8px',
          }}>
            Active
          </div>
          {activeTournaments.map((t) => (
            <div
              key={t.id}
              style={{
                border: '1px solid #d0ddd0',
                borderRadius: '8px',
                padding: '12px 16px',
                marginBottom: '8px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = '#f8faf8'}
              onMouseLeave={(e) => e.currentTarget.style.background = '#ffffff'}
              onClick={() => onSelectTournament(t.id)}
            >
              <div>
                <div style={{ fontWeight: '600' }}>
                  {t.name}
                </div>
                <div style={{ fontSize: '12px', color: '#6a7a6a' }}>
                  {getTypeLabel(t.type)} · {t.players.length} {t.type === 'fixed_partner' ? 'teams' : 'players'} · Round {t.current_round} of {t.total_rounds}
                </div>
                <div style={{ fontSize: '11px', color: '#6a7a6a' }}>
                  Started: {formatDate(t.created_at)}
                </div>
              </div>
              <button
                className="btn-secondary"
                style={{ width: 'auto', padding: '4px 12px', fontSize: '12px' }}
                onClick={(e) => {
                  e.stopPropagation()
                  onSelectTournament(t.id)
                }}
              >
                View →
              </button>
            </div>
          ))}
        </>
      )}

      {completedTournaments.length > 0 && (
        <>
          <div style={{
            fontSize: '12px',
            fontWeight: '600',
            color: '#6a7a6a',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            marginTop: '16px',
            marginBottom: '8px',
          }}>
            Completed
          </div>
          {completedTournaments.map((t) => (
            <div
              key={t.id}
              style={{
                border: '1px solid #d0ddd0',
                borderRadius: '8px',
                padding: '12px 16px',
                marginBottom: '8px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                background: '#f8faf8',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = '#f0f5f0'}
              onMouseLeave={(e) => e.currentTarget.style.background = '#f8faf8'}
              onClick={() => onSelectTournament(t.id)}
            >
              <div>
                <div style={{ fontWeight: '600' }}>
                  {t.name}
                </div>
                <div style={{ fontSize: '12px', color: '#6a7a6a' }}>
                  {getTypeLabel(t.type)} · {t.players.length} {t.type === 'fixed_partner' ? 'teams' : 'players'}
                </div>
                <div style={{ fontSize: '11px', color: '#6a7a6a' }}>
                  Completed: {formatDate(t.completed_at)}
                </div>
              </div>
              <button
                className="btn-secondary"
                style={{ width: 'auto', padding: '4px 12px', fontSize: '12px' }}
                onClick={(e) => {
                  e.stopPropagation()
                  onSelectTournament(t.id)
                }}
              >
                View Results →
              </button>
            </div>
          ))}
        </>
      )}

      {tournaments.length === 0 && (
        <div className="empty-state" style={{ padding: '20px' }}>
          No tournaments yet. Create your first tournament!
        </div>
      )}
    </div>
  )
}
