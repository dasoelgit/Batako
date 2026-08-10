// src/components/MatchSetup.jsx
import { useState } from 'react'
import { supabase } from '../../utils/supabase'
import { getOrCreatePlayer, teamLabel } from '../../utils/helpers'
import PlayerPicker from '../PlayerPicker'

export default function MatchSetup({ players, refreshPlayers, onMatchCreated, onStartLive }) {
  const [matchType, setMatchType] = useState('singles')
  const [scoringMode, setScoringMode] = useState('manual')
  const [names, setNames] = useState({ t1p1: '', t1p2: '', t2p1: '', t2p2: '' })
  const [newEntry, setNewEntry] = useState({ t1p1: false, t1p2: false, t2p1: false, t2p2: false })
  const [numSets, setNumSets] = useState(1)
  const [setScores, setSetScores] = useState([
    { team1: '', team2: '' },
    { team1: '', team2: '' },
    { team1: '', team2: '' },
  ])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const getPlayerLabel = (num) => {
    if (matchType === 'singles') {
      return num === 1 ? 'Player A' : 'Player B'
    }
    return num === 1 ? 'Team A' : 'Team B'
  }

  const selectSlot = (key) => (val) => {
    if (val === '__new__') {
      setNewEntry((n) => ({ ...n, [key]: true }))
      setNames((n) => ({ ...n, [key]: '' }))
    } else {
      setNames((n) => ({ ...n, [key]: val }))
    }
  }

  const cancelNewSlot = (key) => () => {
    setNewEntry((n) => ({ ...n, [key]: false }))
    setNames((n) => ({ ...n, [key]: '' }))
  }

  const setNewSlotValue = (key) => (val) => setNames((n) => ({ ...n, [key]: val }))

  const activeSlotKeys = matchType === 'singles' ? ['t1p1', 't2p1'] : ['t1p1', 't1p2', 't2p1', 't2p2']
  const otherSelectedNames = (key) =>
    activeSlotKeys.filter((k) => k !== key).map((k) => names[k].trim()).filter(Boolean)
  const optionsFor = (key) => players.filter((p) => !otherSelectedNames(key).includes(p.name))

  const chosenNames = activeSlotKeys.map((k) => names[k].trim()).filter(Boolean)
  const hasDuplicatePlayer = new Set(chosenNames).size !== chosenNames.length

  const namesFilled =
    names.t1p1.trim() &&
    names.t2p1.trim() &&
    (matchType === 'singles' || (names.t1p2.trim() && names.t2p2.trim()))

  const buildTeams = async () => {
    const t1p1 = await getOrCreatePlayer(names.t1p1)
    const t2p1 = await getOrCreatePlayer(names.t2p1)
    const team1 = [t1p1]
    const team2 = [t2p1]
    if (matchType === 'doubles') {
      team1.push(await getOrCreatePlayer(names.t1p2))
      team2.push(await getOrCreatePlayer(names.t2p2))
    }
    await refreshPlayers()
    return { team1, team2 }
  }

  const updateSetScore = (index, side) => (e) => {
    const val = e.target.value.replace(/[^0-9]/g, '')
    setSetScores((prev) => prev.map((s, i) => (i === index ? { ...s, [side]: val } : s)))
  }

  const handleSaveResult = async () => {
    setError('')
    setBusy(true)

    try {
      const { team1, team2 } = await buildTeams()

      const requiredSets = setScores.slice(0, numSets)
      const allFilled = requiredSets.every((s) => s.team1 !== '' && s.team2 !== '')
      if (!allFilled) {
        setError('Please fill in all set scores.')
        setBusy(false)
        return
      }

      const setResults = requiredSets.map((s) => {
        const t1 = parseInt(s.team1)
        const t2 = parseInt(s.team2)
        if (t1 > t2) return { winner: 1, team1: t1, team2: t2 }
        if (t2 > t1) return { winner: 2, team1: t1, team2: t2 }
        return { winner: null, team1: t1, team2: t2, draw: true }
      })

      const wins1 = setResults.filter((r) => r.winner === 1).length
      const wins2 = setResults.filter((r) => r.winner === 2).length

      let matchWinner = null
      let matchDraw = false

      if (wins1 > wins2) matchWinner = 1
      else if (wins2 > wins1) matchWinner = 2
      else matchDraw = true

      const setsData = setResults.map((r, i) => ({
        set_number: i + 1,
        team1_games: r.team1,
        team2_games: r.team2,
        winner: r.winner,
        tiebreak: null,
      }))

      const { data, error: insertError } = await supabase
        .from('tennis_matches')
        .insert({
          play_type: matchType,
          team1_players: team1,
          team2_players: team2,
          status: 'completed',
          game_scoring: 'standard',
          set_type: 'best_of',
          set_value: numSets,
          tiebreak_enabled: false,
          tiebreak_format: 7,
          match_config: 'single',
          sets: setsData,
          current_set: numSets,
          team1_games: 0,
          team2_games: 0,
          team1_points: 0,
          team2_points: 0,
          winner: matchWinner,
          draw: matchDraw,
          completed_at: new Date().toISOString(),
        })
        .select()
        .single()

      if (insertError) throw insertError

      setNames({ t1p1: '', t1p2: '', t2p1: '', t2p2: '' })
      setNewEntry({ t1p1: false, t1p2: false, t2p1: false, t2p2: false })
      setSetScores([
        { team1: '', team2: '' },
        { team1: '', team2: '' },
        { team1: '', team2: '' },
      ])
      setNumSets(1)

      onMatchCreated(data)
    } catch (err) {
      setError(err.message || 'Something went wrong')
    } finally {
      setBusy(false)
    }
  }

  const handleStartLive = async () => {
    setError('')
    setBusy(true)

    try {
      const { team1, team2 } = await buildTeams()
      onStartLive({ team1, team2, matchType })
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

  const label1 = getPlayerLabel(1)
  const label2 = getPlayerLabel(2)

  return (
    <div style={{
      background: '#ffffff',
      borderRadius: '12px',
      padding: '20px',
      boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
    }}>
      {/* 🎾 NEW MATCH — REMOVED */}

      {/* ===== PLAY TYPE ===== */}
      <span style={labelStyle}>Match Type</span>
      <div style={{ display: 'flex', gap: '6px', marginBottom: '16px' }}>
        <button
          style={toggleButtonStyle(matchType === 'singles')}
          onClick={() => setMatchType('singles')}
        >
          Singles
        </button>
        <button
          style={toggleButtonStyle(matchType === 'doubles')}
          onClick={() => setMatchType('doubles')}
        >
          Doubles
        </button>
      </div>

      {/* ===== TEAM/PLAYER 1 ===== */}
      <span style={labelStyle}>{label1}</span>
      <PlayerPicker
        label="Select player"
        players={optionsFor('t1p1')}
        value={names.t1p1}
        isNew={newEntry.t1p1}
        onSelect={selectSlot('t1p1')}
        onNewValueChange={setNewSlotValue('t1p1')}
        onCancelNew={cancelNewSlot('t1p1')}
      />
      {matchType === 'doubles' && (
        <PlayerPicker
          label="Select partner"
          players={optionsFor('t1p2')}
          value={names.t1p2}
          isNew={newEntry.t1p2}
          onSelect={selectSlot('t1p2')}
          onNewValueChange={setNewSlotValue('t1p2')}
          onCancelNew={cancelNewSlot('t1p2')}
        />
      )}

      {/* ===== TEAM/PLAYER 2 ===== */}
      <span style={labelStyle}>{label2}</span>
      <PlayerPicker
        label="Select player"
        players={optionsFor('t2p1')}
        value={names.t2p1}
        isNew={newEntry.t2p1}
        onSelect={selectSlot('t2p1')}
        onNewValueChange={setNewSlotValue('t2p1')}
        onCancelNew={cancelNewSlot('t2p1')}
      />
      {matchType === 'doubles' && (
        <PlayerPicker
          label="Select partner"
          players={optionsFor('t2p2')}
          value={names.t2p2}
          isNew={newEntry.t2p2}
          onSelect={selectSlot('t2p2')}
          onNewValueChange={setNewSlotValue('t2p2')}
          onCancelNew={cancelNewSlot('t2p2')}
        />
      )}

      {hasDuplicatePlayer && (
        <div style={{
          background: 'rgba(214,67,47,0.12)',
          color: '#c0392b',
          padding: '10px',
          borderRadius: '6px',
          fontSize: '13px',
          marginBottom: '12px',
          textAlign: 'center',
        }}>
          ⚠️ A player can't be in two positions in the same match.
        </div>
      )}

      {/* ===== SCORING METHOD ===== */}
      <span style={labelStyle}>Scoring Method</span>
      <div style={{ display: 'flex', gap: '6px', marginBottom: '16px' }}>
        <button
          style={toggleButtonStyle(scoringMode === 'manual')}
          onClick={() => setScoringMode('manual')}
        >
          📝 Enter Result
        </button>
        <button
          style={toggleButtonStyle(scoringMode === 'live')}
          onClick={() => setScoringMode('live')}
        >
          ⚡ Live
        </button>
      </div>

      {/* ===== MANUAL MODE ===== */}
      {scoringMode === 'manual' && (
        <>
          <span style={labelStyle}>Number of Sets</span>
          <div style={{ display: 'flex', gap: '6px', marginBottom: '16px' }}>
            {[1, 2, 3].map((n) => (
              <button
                key={n}
                style={toggleButtonStyle(numSets === n)}
                onClick={() => setNumSets(n)}
              >
                {n} {n === 1 ? 'Set' : 'Sets'}
              </button>
            ))}
          </div>

          {Array.from({ length: numSets }, (_, i) => (
            <div key={i} style={{ marginBottom: '12px' }}>
              <span style={{ ...labelStyle, color: '#6a7a6a', fontSize: '12px' }}>
                Set {i + 1}
              </span>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder={label1}
                  value={setScores[i].team1}
                  onChange={updateSetScore(i, 'team1')}
                  style={{
                    flex: 1,
                    padding: '10px',
                    borderRadius: '8px',
                    border: '1px solid #d0ddd0',
                    background: '#ffffff',
                    color: '#1a2a1a',
                    fontSize: '16px',
                    textAlign: 'center',
                    outline: 'none',
                  }}
                />
                <span style={{ color: '#6a7a6a', fontWeight: '600' }}>vs</span>
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder={label2}
                  value={setScores[i].team2}
                  onChange={updateSetScore(i, 'team2')}
                  style={{
                    flex: 1,
                    padding: '10px',
                    borderRadius: '8px',
                    border: '1px solid #d0ddd0',
                    background: '#ffffff',
                    color: '#1a2a1a',
                    fontSize: '16px',
                    textAlign: 'center',
                    outline: 'none',
                  }}
                />
              </div>
            </div>
          ))}

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
              opacity: (!namesFilled || hasDuplicatePlayer || busy) ? 0.5 : 1,
            }}
            disabled={!namesFilled || hasDuplicatePlayer || busy}
            onClick={handleSaveResult}
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
            {busy ? 'Saving...' : '📝 Save Result'}
          </button>
        </>
      )}

      {/* ===== LIVE MODE ===== */}
      {scoringMode === 'live' && (
        <>
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
              opacity: (!namesFilled || hasDuplicatePlayer || busy) ? 0.5 : 1,
            }}
            disabled={!namesFilled || hasDuplicatePlayer || busy}
            onClick={handleStartLive}
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
            {busy ? 'Loading...' : '⚡ Configure Live Match'}
          </button>
        </>
      )}
    </div>
  )
}
