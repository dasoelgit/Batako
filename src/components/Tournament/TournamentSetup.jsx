// src/components/Tournament/TournamentSetup.jsx
import { useState } from 'react'
import { supabase } from '../../utils/supabase'
import { generateAmericanoRounds, generateMexicanoRounds } from '../../utils/tournamentAlgorithms'

const POINTS_DISTRIBUTION_OPTIONS = [
  { id: 'win', label: 'By Win (3-0)' },
  { id: 'point', label: 'By Point (score-based)' },
]

export default function TournamentSetup({ players, onTournamentCreated, onBack }) {
  const [tournamentType, setTournamentType] = useState('americano')
  const [tournamentName, setTournamentName] = useState('')
  const [selectedPlayers, setSelectedPlayers] = useState([])
  const [standingBy, setStandingBy] = useState('win')
  const [totalRounds, setTotalRounds] = useState(0)
  const [useFullRoundRobin, setUseFullRoundRobin] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const togglePlayer = (player) => {
    setSelectedPlayers(prev => {
      const exists = prev.find(p => p.id === player.id)
      if (exists) {
        return prev.filter(p => p.id !== player.id)
      } else {
        return [...prev, player]
      }
    })
  }

  const selectAll = () => {
    setSelectedPlayers([...players])
  }

  const clearAll = () => {
    setSelectedPlayers([])
  }

  const getMaxRounds = () => {
    const n = selectedPlayers.length
    if (n % 2 === 0) return n - 1
    return n
  }

  const getDefaultName = () => {
    const typeLabel = tournamentType === 'americano' ? 'Americano' : 'Mexicano'
    const date = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
    return `${typeLabel} Tournament - ${date}`
  }

  const startTournament = async () => {
    setError('')
    setBusy(true)

    try {
      if (selectedPlayers.length < 3) {
        setError('Need at least 3 players.')
        setBusy(false)
        return
      }

      const finalName = tournamentName.trim() || getDefaultName()
      const numRounds = useFullRoundRobin ? getMaxRounds() : totalRounds
      if (numRounds < 1) {
        setError('Please select number of rounds.')
        setBusy(false)
        return
      }

      let rounds = []
      if (tournamentType === 'americano') {
        rounds = generateAmericanoRounds(selectedPlayers, numRounds)
      } else {
        // Mexicano: generate initial rounds with empty matches
        rounds = generateMexicanoRounds(selectedPlayers, numRounds)
      }

      // For Mexicano, we need to fill round 2+ with actual pairings based on standings
      // This will be handled in the dashboard

      const { data, error: insertError } = await supabase
        .from('tennis_tournaments')
        .insert({
          name: finalName,
          type: tournamentType,
          status: 'active',
          standing_by: standingBy,
          total_rounds: numRounds,
          current_round: 1,
          players: selectedPlayers,
          rounds: rounds,
        })
        .select()
        .single()

      if (insertError) throw insertError

      onTournamentCreated(data)
    } catch (err) {
      setError(err.message || 'Something went wrong')
      setBusy(false)
    }
  }

  const labelStyle = {
    fontSize: '11px',
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    color: '#d4a843',
    fontWeight: '700',
    marginBottom: '6px',
    display: 'block',
  }

  const toggleButtonStyle = (isActive) => ({
    flex: 1,
    padding: '10px',
    borderRadius: '8px',
    border: isActive ? '2px solid #d4e94b' : '1px solid #d0ddd0',
    background: isActive ? '#d4e94b' : '#ffffff',
    color: isActive ? '#1a2a1a' : '#6a7a6a',
    fontWeight: isActive ? '700' : '500',
    cursor: 'pointer',
    fontSize: '13px',
    transition: 'all 0.2s ease',
  })

  return (
    <div style={{
      background: '#ffffff',
      borderRadius: '12px',
      padding: '20px',
      boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
    }}>
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

      <div style={{
        fontSize: '20px',
        fontWeight: '700',
        color: '#d4a843',
        textAlign: 'center',
        marginBottom: '16px',
      }}>
        🏆 Tournament Setup
      </div>

      {/* Tournament Name */}
      <span style={labelStyle}>Tournament Name</span>
      <input
        type="text"
        placeholder={getDefaultName()}
        value={tournamentName}
        onChange={(e) => setTournamentName(e.target.value)}
        style={{
          width: '100%',
          padding: '10px',
          borderRadius: '8px',
          border: '1px solid #d0ddd0',
          background: '#ffffff',
          color: '#1a2a1a',
          fontSize: '14px',
          marginBottom: '16px',
          outline: 'none',
        }}
      />

      {/* Tournament Type */}
      <span style={labelStyle}>Tournament Type</span>
      <div style={{ display: 'flex', gap: '6px', marginBottom: '16px' }}>
        <button
          style={toggleButtonStyle(tournamentType === 'americano')}
          onClick={() => setTournamentType('americano')}
        >
          🇺🇸 Americano
        </button>
        <button
          style={toggleButtonStyle(tournamentType === 'mexicano')}
          onClick={() => setTournamentType('mexicano')}
        >
          🇲🇽 Mexicano
        </button>
      </div>

      {/* Players */}
      <span style={labelStyle}>Select Players ({selectedPlayers.length} selected)</span>
      <div style={{ display: 'flex', gap: '6px', marginBottom: '8px' }}>
        <button
          className="btn-secondary"
          style={{ width: 'auto', padding: '4px 12px', fontSize: '12px' }}
          onClick={selectAll}
        >
          Select All
        </button>
        <button
          className="btn-secondary"
          style={{ width: 'auto', padding: '4px 12px', fontSize: '12px' }}
          onClick={clearAll}
        >
          Clear All
        </button>
      </div>

      <div style={{
        maxHeight: '180px',
        overflowY: 'auto',
        border: '1px solid #d0ddd0',
        borderRadius: '8px',
        padding: '8px',
        marginBottom: '16px',
        background: '#f8faf8',
      }}>
        {players.map((player) => {
          const isSelected = selectedPlayers.find(p => p.id === player.id)
          return (
            <label
              key={player.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '4px 8px',
                borderRadius: '4px',
                cursor: 'pointer',
                background: isSelected ? 'rgba(212, 233, 75, 0.15)' : 'transparent',
              }}
            >
              <input
                type="checkbox"
                checked={!!isSelected}
                onChange={() => togglePlayer(player)}
              />
              <span>{player.name}</span>
            </label>
          )
        })}
        {players.length === 0 && (
          <div style={{ padding: '8px', color: '#6a7a6a', textAlign: 'center' }}>
            No players available. Add players in Admin panel.
          </div>
        )}
      </div>

      {/* Standing By */}
      <span style={labelStyle}>Standings Based On</span>
      <div style={{ display: 'flex', gap: '6px', marginBottom: '16px' }}>
        {POINTS_DISTRIBUTION_OPTIONS.map((opt) => (
          <button
            key={opt.id}
            style={toggleButtonStyle(standingBy === opt.id)}
            onClick={() => setStandingBy(opt.id)}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Rounds */}
      <span style={labelStyle}>Rounds</span>
      <div style={{ marginBottom: '16px' }}>
        <div style={{ display: 'flex', gap: '6px', marginBottom: '8px' }}>
          <button
            style={toggleButtonStyle(useFullRoundRobin)}
            onClick={() => setUseFullRoundRobin(true)}
          >
            Full Round Robin
          </button>
          <button
            style={toggleButtonStyle(!useFullRoundRobin)}
            onClick={() => setUseFullRoundRobin(false)}
          >
            Custom Rounds
          </button>
        </div>

        {!useFullRoundRobin && (
          <div>
            <span style={{ ...labelStyle, color: '#6a7a6a', fontSize: '12px' }}>
              Number of Rounds
            </span>
            <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
              {Array.from({ length: 10 }, (_, i) => i + 1).map((v) => (
                <button
                  key={v}
                  style={{
                    padding: '6px 14px',
                    borderRadius: '6px',
                    border: totalRounds === v ? '2px solid #d4e94b' : '1px solid #d0ddd0',
                    background: totalRounds === v ? '#d4e94b' : '#ffffff',
                    color: totalRounds === v ? '#1a2a1a' : '#6a7a6a',
                    fontWeight: totalRounds === v ? '700' : '400',
                    cursor: 'pointer',
                    fontSize: '14px',
                    transition: 'all 0.2s ease',
                  }}
                  onClick={() => setTotalRounds(v)}
                >
                  {v}
                </button>
              ))}
            </div>
            {selectedPlayers.length > 0 && (
              <div style={{ fontSize: '11px', color: '#6a7a6a', marginTop: '4px' }}>
                Max rounds: {getMaxRounds()}
              </div>
            )}
          </div>
        )}

        {useFullRoundRobin && selectedPlayers.length > 0 && (
          <div style={{ fontSize: '11px', color: '#6a7a6a', marginTop: '4px' }}>
            {getMaxRounds()} rounds · {selectedPlayers.length} players
          </div>
        )}
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

      <button
        style={{
          width: '100%',
          padding: '14px',
          borderRadius: '10px',
          background: '#d4e94b',
          color: '#1a2a1a',
          fontWeight: '800',
          fontSize: '16px',
          border: 'none',
          cursor: 'pointer',
          transition: 'all 0.2s ease',
          opacity: (selectedPlayers.length < 3 || busy) ? 0.5 : 1,
        }}
        disabled={selectedPlayers.length < 3 || busy}
        onClick={startTournament}
        onMouseEnter={(e) => {
          if (!e.target.disabled) {
            e.target.style.background = '#c8d93a'
            e.target.style.transform = 'translateY(-1px)'
          }
        }}
        onMouseLeave={(e) => {
          e.target.style.background = '#d4e94b'
          e.target.style.transform = 'translateY(0)'
        }}
      >
        {busy ? 'Creating...' : '🏆 Start Tournament'}
      </button>
    </div>
  )
}
