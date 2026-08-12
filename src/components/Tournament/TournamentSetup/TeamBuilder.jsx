// src/components/Tournament/TournamentSetup/TeamBuilder.jsx
import { useState } from 'react'

export default function TeamBuilder({ players, selectedPlayers, fixedTeams, setFixedTeams, setError, togglePlayer }) {
  const [newPlayerName, setNewPlayerName] = useState('')

  const autoCreateTeams = () => {
    if (selectedPlayers.length < 2) {
      setError('Need at least 2 players to create teams.')
      return
    }

    if (selectedPlayers.length % 2 !== 0) {
      setError('Need an even number of players for Fixed Partner. (4, 6, 8)')
      return
    }

    const shuffled = [...selectedPlayers].sort(() => Math.random() - 0.5)
    const teams = []
    for (let i = 0; i < shuffled.length; i += 2) {
      if (i + 1 < shuffled.length) {
        teams.push({
          player1: shuffled[i],
          player2: shuffled[i + 1],
        })
      }
    }
    setFixedTeams(teams)
    setError('')
  }

  const removeTeam = (index) => {
    setFixedTeams(fixedTeams.filter((_, i) => i !== index))
  }

  const clearTeams = () => {
    setFixedTeams([])
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

  return (
    <div>
      <span style={labelStyle}>Create Teams ({fixedTeams.length} teams)</span>

      <div style={{
        maxHeight: '120px',
        overflowY: 'auto',
        border: '1px solid #d0ddd0',
        borderRadius: '8px',
        padding: '8px',
        marginBottom: '8px',
        background: '#f8faf8',
      }}>
        {players.map((player) => {
          const inTeam = fixedTeams.some(t => t.player1.id === player.id || t.player2.id === player.id)
          const isSelected = selectedPlayers.find(p => p.id === player.id)
          return (
            <label
              key={player.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '2px 8px',
                borderRadius: '4px',
                cursor: 'pointer',
                background: inTeam ? 'rgba(74, 222, 128, 0.1)' : (isSelected ? 'rgba(212, 233, 75, 0.1)' : 'transparent'),
              }}
            >
              <input
                type="checkbox"
                checked={!!isSelected}
                onChange={() => togglePlayer(player)}
              />
              <span style={{ color: inTeam ? '#4ade80' : '#1a2a1a' }}>
                {player.name} {inTeam ? '✅' : ''}
              </span>
            </label>
          )
        })}
      </div>

      <div style={{ display: 'flex', gap: '6px', marginBottom: '8px', flexWrap: 'wrap' }}>
        <button
          className="btn-primary"
          style={{ width: 'auto', padding: '4px 12px', fontSize: '12px' }}
          onClick={autoCreateTeams}
          disabled={selectedPlayers.length < 2 || selectedPlayers.length % 2 !== 0}
        >
          ⚡ Auto Create Teams
        </button>
        <button
          className="btn-secondary"
          style={{ width: 'auto', padding: '4px 12px', fontSize: '12px' }}
          onClick={clearTeams}
        >
          Clear Teams
        </button>
      </div>

      {selectedPlayers.length > 0 && selectedPlayers.length % 2 !== 0 && (
        <div style={{ fontSize: '12px', color: '#f87171', marginBottom: '8px' }}>
          ⚠️ Need even number of players for Fixed Partner. Currently: {selectedPlayers.length}
        </div>
      )}

      {fixedTeams.length > 0 && (
        <div style={{
          border: '1px solid #d0ddd0',
          borderRadius: '8px',
          padding: '8px',
          background: '#f8faf8',
          marginBottom: '8px',
        }}>
          {fixedTeams.map((team, index) => (
            <div
              key={index}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '4px 8px',
                borderBottom: index < fixedTeams.length - 1 ? '1px solid #e8f0e6' : 'none',
              }}
            >
              <span style={{ fontWeight: '600' }}>
                {team.player1.name} / {team.player2.name}
              </span>
              <button
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#c0392b',
                  cursor: 'pointer',
                  fontSize: '14px',
                }}
                onClick={() => removeTeam(index)}
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      {fixedTeams.length === 0 && (
        <div style={{ fontSize: '12px', color: '#6a7a6a', textAlign: 'center', padding: '8px', marginBottom: '8px' }}>
          Select players above and click "Auto Create Teams" to create teams.
        </div>
      )}

      {fixedTeams.length > 0 && fixedTeams.length < 2 && (
        <div style={{ fontSize: '12px', color: '#fbbf24', marginBottom: '8px' }}>
          ⚠️ Need at least 2 teams to start. Currently: {fixedTeams.length}
        </div>
      )}
    </div>
  )
}
