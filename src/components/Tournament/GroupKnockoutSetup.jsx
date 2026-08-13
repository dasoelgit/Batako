// src/components/Tournament/GroupKnockoutSetup.jsx
import { useState } from 'react'
import { supabase } from '../../utils/supabase'
import { getOrCreatePlayer } from '../../utils/helpers'
import { generateGroupKnockout } from '../../utils/tournament/groupKnockout'
import { generatePIN, hashPIN, savePINToStorage } from '../../utils/pinUtils'
import PlayerPicker from '../PlayerPicker'

const GROUP_FORMATS = [
  { id: 'singles', label: 'Singles' },
  { id: 'doubles', label: 'Doubles' },
  { id: 'americano', label: 'Americano' },
  { id: 'mexicano', label: 'Mexicano' },
  { id: 'fixed_partner', label: 'Fixed Partner' },
]

export default function GroupKnockoutSetup({ players, refreshPlayers, onTournamentCreated, onBack }) {
  const [tournamentName, setTournamentName] = useState('')
  const [selectedPlayers, setSelectedPlayers] = useState([])
  const [groupFormat, setGroupFormat] = useState('singles')
  const [numGroups, setNumGroups] = useState(2)
  const [advancePerGroup, setAdvancePerGroup] = useState(2)
  const [knockoutMatchType, setKnockoutMatchType] = useState('singles')
  const [bronzeMatch, setBronzeMatch] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [newPlayerName, setNewPlayerName] = useState('')

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

  const handleAddPlayer = async () => {
    const trimmed = newPlayerName.trim()
    if (!trimmed) return

    try {
      const player = await getOrCreatePlayer(trimmed)
      if (refreshPlayers) refreshPlayers()
      if (!selectedPlayers.find(p => p.id === player.id)) {
        setSelectedPlayers(prev => [...prev, player])
      }
      setNewPlayerName('')
    } catch (err) {
      alert('Error adding player: ' + err.message)
    }
  }

  const getDefaultName = () => {
    const date = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
    return `Group+KO Tournament - ${date}`
  }

  const startTournament = async () => {
    setError('')
    setBusy(true)

    try {
      const finalName = tournamentName.trim() || getDefaultName()

      // Validate
      if (selectedPlayers.length < 4) {
        setError('Need at least 4 players for Group + Knockout.')
        setBusy(false)
        return
      }

      if (selectedPlayers.length < numGroups * 2) {
        setError(`Need at least ${numGroups * 2} players for ${numGroups} groups.`)
        setBusy(false)
        return
      }

      if (advancePerGroup > Math.floor(selectedPlayers.length / numGroups)) {
        setError(`Can't advance ${advancePerGroup} players per group. Max is ${Math.floor(selectedPlayers.length / numGroups)}.`)
        setBusy(false)
        return
      }

      // Generate tournament structure
      const tournamentData = generateGroupKnockout(
        selectedPlayers,
        groupFormat,
        numGroups,
        advancePerGroup,
        knockoutMatchType,
        bronzeMatch
      )

      // Save to database
      const { data, error: insertError } = await supabase
        .from('tennis_tournaments')
        .insert({
          name: finalName,
          type: 'group_knockout',
          status: 'active',
          standing_by: 'win',
          total_rounds: tournamentData.knockoutRounds.length + tournamentData.groups.reduce((sum, g) => sum + g.rounds.length, 0),
          current_round: 1,
          players: selectedPlayers,
          rounds: tournamentData,
          match_type: knockoutMatchType,
        })
        .select()
        .single()

      if (insertError) throw insertError

      // Generate and store admin PIN
      const pin = generatePIN()
      const pinHash = await hashPIN(pin)

      const { error: pinError } = await supabase
        .from('tennis_tournaments')
        .update({ admin_pin_hash: pinHash })
        .eq('id', data.id)

      if (pinError) throw pinError

      savePINToStorage(data.id, pin)

      alert(`🏆 Tournament Created!\n\nTournament: ${finalName}\n\n🔑 Admin PIN: ${pin}\n\nSave this PIN. You'll need it to edit tournament matches.`)

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
        className="btn-secondary"
        onClick={onBack}
        style={{
          width: 'auto',
          padding: '8px 16px',
          fontSize: '13px',
          marginBottom: '12px',
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
        🏆 Group + Knockout Setup
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

      {/* Group Stage Format */}
      <span style={labelStyle}>Group Stage Format</span>
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr 1fr',
        gap: '6px',
        marginBottom: '16px',
      }}>
        {GROUP_FORMATS.map((format) => (
          <button
            key={format.id}
            style={toggleButtonStyle(groupFormat === format.id)}
            onClick={() => setGroupFormat(format.id)}
          >
            {format.label}
          </button>
        ))}
      </div>

      {/* Groups */}
      <span style={labelStyle}>Number of Groups</span>
      <div style={{ display: 'flex', gap: '6px', marginBottom: '16px' }}>
        {[1, 2, 3, 4].map((n) => (
          <button
            key={n}
            style={toggleButtonStyle(numGroups === n)}
            onClick={() => setNumGroups(n)}
          >
            {n}
          </button>
        ))}
      </div>

      {/* Teams Advancing */}
      <span style={labelStyle}>Teams Advancing per Group</span>
      <div style={{ display: 'flex', gap: '6px', marginBottom: '16px' }}>
        {[1, 2, 3, 4].map((n) => (
          <button
            key={n}
            style={toggleButtonStyle(advancePerGroup === n)}
            onClick={() => setAdvancePerGroup(n)}
          >
            {n}
          </button>
        ))}
      </div>

      {/* Knockout Match Type */}
      <span style={labelStyle}>Knockout Match Type</span>
      <div style={{ display: 'flex', gap: '6px', marginBottom: '16px' }}>
        <button
          style={toggleButtonStyle(knockoutMatchType === 'singles')}
          onClick={() => setKnockoutMatchType('singles')}
        >
          Singles
        </button>
        <button
          style={toggleButtonStyle(knockoutMatchType === 'doubles')}
          onClick={() => setKnockoutMatchType('doubles')}
        >
          Doubles
        </button>
      </div>

      {/* Bronze Match */}
      <span style={labelStyle}>Bronze Match</span>
      <div style={{ display: 'flex', gap: '6px', marginBottom: '16px' }}>
        <button
          style={toggleButtonStyle(bronzeMatch === false)}
          onClick={() => setBronzeMatch(false)}
        >
          OFF
        </button>
        <button
          style={toggleButtonStyle(bronzeMatch === true)}
          onClick={() => setBronzeMatch(true)}
        >
          ON
        </button>
      </div>

      {/* Player Selection */}
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
        marginBottom: '8px',
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
            No players available. Add a player below.
          </div>
        )}
      </div>

      {/* Add New Player */}
      <div style={{ display: 'flex', gap: '6px', marginBottom: '16px' }}>
        <input
          type="text"
          placeholder="Add new player..."
          value={newPlayerName}
          onChange={(e) => setNewPlayerName(e.target.value)}
          style={{
            flex: 1,
            padding: '8px 12px',
            borderRadius: '6px',
            border: '1px solid #d0ddd0',
            background: '#ffffff',
            color: '#1a2a1a',
            fontSize: '14px',
            outline: 'none',
            marginBottom: 0,
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleAddPlayer()
          }}
        />
        <button
          className="btn-primary"
          style={{ width: 'auto', padding: '8px 16px', fontSize: '13px' }}
          onClick={handleAddPlayer}
          disabled={!newPlayerName.trim()}
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
          opacity: busy ? 0.5 : 1,
        }}
        disabled={busy}
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
        {busy ? 'Creating...' : '🏆 Start Group + Knockout'}
      </button>
    </div>
  )
}
