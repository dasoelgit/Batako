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
import PlayerSelection from './TournamentSetup/PlayerSelection'
import TeamBuilder from './TournamentSetup/TeamBuilder'
import KnockoutSettings from './TournamentSetup/KnockoutSettings'
import RoundsSelector from './TournamentSetup/RoundsSelector'

const TOURNAMENT_TYPES = [
  { id: 'americano', label: 'Americano', desc: 'Rotating partners' },
  { id: 'mexicano', label: 'Mexicano', desc: 'Competitive pairing' },
  { id: 'singles', label: 'Singles', desc: 'Individual matches' },
  { id: 'fixed_partner', label: 'Fixed Partner', desc: 'Partners stay together' },
  { id: 'knockout', label: 'Knockout', desc: 'Single elimination' },
]

const POINTS_DISTRIBUTION_OPTIONS = [
  { id: 'win', label: 'By Win (3-0)' },
  { id: 'point', label: 'By Point (score-based)' },
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
  const [knockoutMatchType, setKnockoutMatchType] = useState('singles')

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

  const moveSelectedPlayer = (index, direction) => {
    setSelectedPlayers(prev => {
      const next = [...prev]
      const target = index + direction
      if (target < 0 || target >= next.length) return prev
      ;[next[index], next[target]] = [next[target], next[index]]
      return next
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
        rounds = generateKnockoutBracket(selectedPlayers, seeding, bronzeMatch, knockoutMatchType)
      }

      const { data, error: insertError } = await supabase
        .from('tennis_tournaments')
        .insert({
          name: finalName,
          type: tournamentType,
          status: 'active',
          standing_by: tournamentType === 'knockout' ? 'win' : standingBy,
          total_rounds: tournamentType === 'knockout' ? rounds.length : numRounds,
          current_round: 1,
          players: playersList,
          rounds: rounds,
          match_type: tournamentType === 'knockout' ? knockoutMatchType : null,
        })
        .select()
        .single()

      if (insertError) throw insertError

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
        <KnockoutSettings
          knockoutMatchType={knockoutMatchType}
          setKnockoutMatchType={setKnockoutMatchType}
          seeding={seeding}
          setSeeding={setSeeding}
          bronzeMatch={bronzeMatch}
          setBronzeMatch={setBronzeMatch}
          selectedPlayers={selectedPlayers}
          moveSelectedPlayer={moveSelectedPlayer}
        />
      )}

      {/* Player Selection */}
      {!isFixedPartner && (
        <PlayerSelection
          players={players}
          selectedPlayers={selectedPlayers}
          togglePlayer={togglePlayer}
          selectAll={selectAll}
          clearAll={clearAll}
          newPlayerName={newPlayerName}
          setNewPlayerName={setNewPlayerName}
          handleAddPlayer={handleAddPlayer}
        />
      )}

      {/* Fixed Partner Team Builder */}
      {isFixedPartner && (
        <TeamBuilder
          players={players}
          selectedPlayers={selectedPlayers}
          fixedTeams={fixedTeams}
          setFixedTeams={setFixedTeams}
          setError={setError}
          togglePlayer={togglePlayer}
        />
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
        <RoundsSelector
          useFullRoundRobin={useFullRoundRobin}
          setUseFullRoundRobin={setUseFullRoundRobin}
          totalRounds={totalRounds}
          setTotalRounds={setTotalRounds}
          maxRounds={maxRounds}
          selectedPlayers={selectedPlayers}
          isFixedPartner={isFixedPartner}
          fixedTeams={fixedTeams}
        />
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
