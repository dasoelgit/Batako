// src/components/Tournament/TournamentSetup.jsx
import { useState } from 'react'
import { supabase } from '../../utils/supabase'
import { getOrCreatePlayer } from '../../utils/helpers'
import {
  generateAmericanoRounds,
  generateMexicanoRounds,
  generateSinglesRounds,
  generateFixedPartnerRounds,
  generateKnockoutBracket,
} from '../../utils/tournament'
import { generatePIN, hashPIN, savePINToStorage } from '../../utils/pinUtils'
import PlayerPicker from '../PlayerPicker'

const TOURNAMENT_TYPES = [
  { id: 'americano', label: 'Americano', desc: 'Rotating partners' },
  { id: 'mexicano', label: 'Mexicano', desc: 'Competitive pairing' },
  { id: 'singles', label: 'Singles', desc: 'Individual matches' },
  { id: 'fixed_partner', label: 'Fixed Partner', desc: 'Partners stay together' },
  { id: 'knockout', label: 'Knockout', desc: 'Single elimination' },
]

const POINTS_DISTRIBUTION_OPTIONS = [
  { id: 'win', label: 'By Win' },
  { id: 'point', label: 'By Point' },
]

export default function TournamentSetup({ players, refreshPlayers, onTournamentCreated, onBack }) {
  const [tournamentType, setTournamentType] = useState('americano')
  const [tournamentName, setTournamentName] = useState('')
  const [selectedPlayers, setSelectedPlayers] = useState([])
  const [fixedTeams, setFixedTeams] = useState([])
  const [standingBy, setStandingBy] = useState('win')
  const [totalRounds, setTotalRounds] = useState(0)
  const [useFullRoundRobin, setUseFullRoundRobin] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [newPlayerName, setNewPlayerName] = useState('')

  // Knockout specific
  const [seeding, setSeeding] = useState('random')
  const [bronzeMatch, setBronzeMatch] = useState(false)

  // ============================================================
  // ADD PLAYER — Uses shared getOrCreatePlayer with similarity check
  // ============================================================
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
    if (tournamentType === 'singles') {
      const n = selectedPlayers.length
      return n > 1 ? n - 1 : 0
    }
    if (tournamentType === 'fixed_partner') {
      const n = fixedTeams.length
      return n > 1 ? n - 1 : 0
    }
    const n = selectedPlayers.length
    if (n % 2 === 0) return n - 1
    return n
  }

  const getDefaultName = () => {
    const typeMap = {
      'americano': 'Americano',
      'mexicano': 'Mexicano',
      'singles': 'Singles',
      'fixed_partner': 'Fixed Partner',
      'knockout': 'Knockout',
    }
    const typeLabel = typeMap[tournamentType] || 'Tournament'
    const date = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
    return `${typeLabel} Tournament - ${date}`
  }

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

  const startTournament = async () => {
    setError('')
    setBusy(true)

    try {
      // Validation
      if (tournamentType === 'singles' && selectedPlayers.length < 2) {
        setError('Need at least 2 players for Singles.')
        setBusy(false)
        return
      }

      if (tournamentType === 'fixed_partner') {
        if (fixedTeams.length < 2) {
          setError('Need at least 2 teams for Fixed Partner.')
          setBusy(false)
          return
        }
      }

      if (tournamentType === 'knockout') {
        if (selectedPlayers.length < 2) {
          setError('Need at least 2 players for Knockout.')
          setBusy(false)
          return
        }
        // For knockout, we don't need max rounds check
      }

      if (tournamentType === 'americano' || tournamentType === 'mexicano') {
        if (selectedPlayers.length < 3) {
          setError('Need at least 3 players.')
          setBusy(false)
          return
        }
      }

      const finalName = tournamentName.trim() || getDefaultName()
      const numRounds = useFullRoundRobin ? getMaxRounds() : totalRounds

      // Skip rounds validation for knockout
      if (tournamentType !== 'knockout' && numRounds < 1) {
        setError('Please select number of rounds.')
        setBusy(false)
        return
      }

      let rounds = []
      let playersList = []

      if (tournamentType === 'singles') {
        playersList = selectedPlayers
        rounds = generateSinglesRounds(selectedPlayers, numRounds)
      } else if (tournamentType === 'fixed_partner') {
        playersList = fixedTeams.map((team, index) => ({
          id: `team_${index}`,
          name: `${team.player1.name} / ${team.player2.name}`,
          player1: team.player1,
          player2: team.player2,
          isTeam: true,
        }))
        rounds = generateFixedPartnerRounds(fixedTeams, numRounds)
      } else if (tournamentType === 'americano') {
        playersList = selectedPlayers
        rounds = generateAmericanoRounds(selectedPlayers, numRounds)
      } else if (tournamentType === 'mexicano') {
        playersList = selectedPlayers
        rounds = generateMexicanoRounds(selectedPlayers, numRounds)
      } else if (tournamentType === 'knockout') {
        playersList = selectedPlayers
        rounds = generateKnockoutBracket(selectedPlayers, seeding, bronzeMatch)
      }

      // Insert tournament
      const { data, error: insertError } = await supabase
        .from('tennis_tournaments')
        .insert({
          name: finalName,
          type: tournamentType,
          status: 'active',
          standing_by: standingBy,
          total_rounds: tournamentType === 'knockout' ? rounds.length : numRounds,
          current_round: 1,
          players: playersList,
          rounds: rounds,
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

  const isFixedPartner = tournamentType === 'fixed_partner'
  const isKnockout = tournamentType === 'knockout'
  const maxRounds = getMaxRounds()

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
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '6px',
        marginBottom: '16px',
      }}>
        {TOURNAMENT_TYPES.map((type) => (
          <button
            key={type.id}
            style={{
              padding: '10px',
              borderRadius: '8px',
              border: tournamentType === type.id ? '2px solid #d4e94b' : '1px solid #d0ddd0',
              background: tournamentType === type.id ? 'rgba(212, 233, 75, 0.15)' : '#ffffff',
              color: tournamentType === type.id ? '#1a2a1a' : '#6a7a6a',
              fontWeight: tournamentType === type.id ? '700' : '400',
              cursor: 'pointer',
              fontSize: '13px',
              transition: 'all 0.2s ease',
              textAlign: 'center',
            }}
            onClick={() => {
              setTournamentType(type.id)
              setFixedTeams([])
              setSelectedPlayers([])
            }}
          >
            <div style={{ fontSize: '18px' }}>{type.label}</div>
            <div style={{ fontSize: '10px', color: '#6a7a6a' }}>{type.desc}</div>
          </button>
        ))}
      </div>

      {/* Knockout Settings */}
      {isKnockout && (
        <>
          <span style={labelStyle}>Seeding</span>
          <div style={{ display: 'flex', gap: '6px', marginBottom: '16px' }}>
            <button
              style={toggleButtonStyle(seeding === 'random')}
              onClick={() => setSeeding('random')}
            >
              Random
            </button>
            <button
              style={toggleButtonStyle(seeding === 'ranked')}
              onClick={() => setSeeding('ranked')}
            >
              Ranked
            </button>
          </div>

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
        </>
      )}

      {/* Player Selection */}
      {!isFixedPartner && (
        <>
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
        </>
      )}

      {/* Fixed Partner Team Builder */}
      {isFixedPartner && (
        <>
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
        </>
      )}

      {/* Standing By (not for knockout) */}
      {!isKnockout && (
        <>
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
        </>
      )}

      {/* Rounds (not for knockout) */}
      {!isKnockout && (
        <>
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
                  {Array.from({ length: maxRounds }, (_, i) => i + 1).map((v) => (
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
                <div style={{ fontSize: '11px', color: '#6a7a6a', marginTop: '4px' }}>
                  Max rounds: {maxRounds}
                </div>

                {selectedPlayers.length % 2 !== 0 && totalRounds < maxRounds && (
                  <div style={{
                    fontSize: '12px',
                    color: '#fbbf24',
                    marginTop: '8px',
                    padding: '8px 12px',
                    background: 'rgba(251, 191, 36, 0.1)',
                    borderRadius: '6px',
                    border: '1px solid rgba(251, 191, 36, 0.2)',
                  }}>
                    ⚠️ With {totalRounds} rounds and {selectedPlayers.length} players, not all players will get the same number of byes.
                    Some players may play fewer matches than others.
                  </div>
                )}
              </div>
            )}

            {useFullRoundRobin && (
              <div style={{ fontSize: '11px', color: '#6a7a6a', marginTop: '4px' }}>
                {maxRounds} rounds · {isFixedPartner ? fixedTeams.length : selectedPlayers.length} {isFixedPartner ? 'teams' : 'players'}
              </div>
            )}
          </div>
        </>
      )}

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
        {busy ? 'Creating...' : '🏆 Start Tournament'}
      </button>
    </div>
  )
}
