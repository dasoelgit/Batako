// src/components/MatchSetup.jsx
import { useState } from 'react'
import { supabase } from '../utils/supabase'
import { getOrCreatePlayer } from '../utils/helpers'
import PlayerPicker from './PlayerPicker'

const GAME_SCORING_OPTIONS = [
  { id: 'standard', label: 'Standard' },
  { id: 'sudden', label: 'Sudden' },
  { id: '1deuce', label: '1 Deuce' },
  { id: '2deuces', label: '2 Deuces' },
]

const TIEBREAK_FORMATS = [5, 7, 10]

export default function MatchSetup({ players, refreshPlayers, onMatchCreated }) {
  const [playType, setPlayType] = useState('singles')
  const [gameScoring, setGameScoring] = useState('standard')
  const [setType, setSetType] = useState('first_to')
  const [setValue, setSetValue] = useState(4)
  const [tiebreakEnabled, setTiebreakEnabled] = useState(false)
  const [tiebreakFormat, setTiebreakFormat] = useState(7)
  const [matchConfig, setMatchConfig] = useState('single')
  const [names, setNames] = useState({ t1p1: '', t1p2: '', t2p1: '', t2p2: '' })
  const [newEntry, setNewEntry] = useState({ t1p1: false, t1p2: false, t2p1: false, t2p2: false })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

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

  const activeSlotKeys = playType === 'singles' ? ['t1p1', 't2p1'] : ['t1p1', 't1p2', 't2p1', 't2p2']
  const otherSelectedNames = (key) =>
    activeSlotKeys.filter((k) => k !== key).map((k) => names[k].trim()).filter(Boolean)
  const optionsFor = (key) => players.filter((p) => !otherSelectedNames(key).includes(p.name))

  const chosenNames = activeSlotKeys.map((k) => names[k].trim()).filter(Boolean)
  const hasDuplicatePlayer = new Set(chosenNames).size !== chosenNames.length

  const namesFilled =
    names.t1p1.trim() &&
    names.t2p1.trim() &&
    (playType === 'singles' || (names.t1p2.trim() && names.t2p2.trim()))

  const buildTeams = async () => {
    const t1p1 = await getOrCreatePlayer(names.t1p1)
    const t2p1 = await getOrCreatePlayer(names.t2p1)
    const team1 = [t1p1]
    const team2 = [t2p1]
    if (playType === 'doubles') {
      team1.push(await getOrCreatePlayer(names.t1p2))
      team2.push(await getOrCreatePlayer(names.t2p2))
    }
    await refreshPlayers()
    return { team1, team2 }
  }

  const startMatch = async () => {
    setError('')
    setBusy(true)

    try {
      const { team1, team2 } = await buildTeams()

      // Validate set value based on set type
      let finalSetValue = setValue
      if (setType === 'first_to' && (setValue < 2 || setValue > 10)) {
        setError('First to X: X must be between 2 and 10')
        setBusy(false)
        return
      }
      if (setType === 'best_of' && (setValue < 3 || setValue > 10)) {
        setError('Best of X: X must be between 3 and 10')
        setBusy(false)
        return
      }

      const { data, error: insertError } = await supabase
        .from('tennis_matches')
        .insert({
          play_type: playType,
          team1_players: team1,
          team2_players: team2,
          status: 'active',
          game_scoring: gameScoring,
          set_type: setType,
          set_value: finalSetValue,
          tiebreak_enabled: tiebreakEnabled,
          tiebreak_format: tiebreakFormat,
          match_config: matchConfig,
          team1_points: 0,
          team2_points: 0,
          deuce_count: 0,
          current_set: 1,
          team1_games: 0,
          team2_games: 0,
          tiebreak_active: false,
          tiebreak_score1: 0,
          tiebreak_score2: 0,
          sets: [],
          winner: null,
          draw: false,
        })
        .select()
        .single()

      if (insertError) throw insertError

      onMatchCreated(data)
    } catch (err) {
      setError(err.message || 'Something went wrong')
    } finally {
      setBusy(false)
    }
  }

  const getSetRange = () => {
    if (setType === 'first_to') {
      return { min: 2, max: 10, label: 'games' }
    } else {
      return { min: 3, max: 10, label: 'games' }
    }
  }

  const range = getSetRange()

  // Styles
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

  const valueButtonStyle = (isActive) => ({
    padding: '6px 14px',
    borderRadius: '6px',
    border: isActive ? '2px solid #d4e94b' : '1px solid #d0ddd0',
    background: isActive ? '#d4e94b' : '#ffffff',
    color: isActive ? '#1a2a1a' : '#6a7a6a',
    fontWeight: isActive ? '700' : '400',
    cursor: 'pointer',
    fontSize: '14px',
    transition: 'all 0.2s ease',
  })

  return (
    <div style={{
      background: '#ffffff',
      borderRadius: '12px',
      padding: '20px',
      boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
    }}>
      <div style={{
        fontSize: '20px',
        fontWeight: '700',
        color: '#d4a843',
        textAlign: 'center',
        marginBottom: '16px',
      }}>
        🎾 NEW MATCH
      </div>

      {/* ===== GAME SCORING ===== */}
      <span style={labelStyle}>Game Scoring</span>
      <div style={{ display: 'flex', gap: '6px', marginBottom: '16px', flexWrap: 'wrap' }}>
        {GAME_SCORING_OPTIONS.map((opt) => (
          <button
            key={opt.id}
            style={toggleButtonStyle(gameScoring === opt.id)}
            onClick={() => setGameScoring(opt.id)}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* ===== SET CONFIGURATION ===== */}
      <span style={labelStyle}>Set Type</span>
      <div style={{ display: 'flex', gap: '6px', marginBottom: '12px' }}>
        <button
          style={toggleButtonStyle(setType === 'first_to')}
          onClick={() => setSetType('first_to')}
        >
          First to X
        </button>
        <button
          style={toggleButtonStyle(setType === 'best_of')}
          onClick={() => setSetType('best_of')}
        >
          Best of X
        </button>
      </div>

      <div style={{ marginBottom: '12px' }}>
        <span style={{ ...labelStyle, color: '#6a7a6a', fontSize: '12px' }}>
          {setType === 'first_to' ? 'First to' : 'Best of'} {setValue} {range.label}
        </span>
        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
          {Array.from({ length: range.max - range.min + 1 }, (_, i) => range.min + i).map((v) => (
            <button
              key={v}
              style={valueButtonStyle(setValue === v)}
              onClick={() => setSetValue(v)}
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      {/* ===== TIEBREAK ===== */}
      {setType === 'first_to' && (
        <div style={{ marginBottom: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ ...labelStyle, marginBottom: 0 }}>Tiebreak</span>
            <div style={{ display: 'flex', gap: '6px', flex: 1 }}>
              <button
                style={toggleButtonStyle(!tiebreakEnabled)}
                onClick={() => setTiebreakEnabled(false)}
              >
                OFF
              </button>
              <button
                style={toggleButtonStyle(tiebreakEnabled)}
                onClick={() => setTiebreakEnabled(true)}
              >
                ON
              </button>
            </div>
          </div>

          {tiebreakEnabled && (
            <div style={{ marginTop: '8px' }}>
              <span style={{ ...labelStyle, color: '#6a7a6a', fontSize: '12px' }}>Tiebreak Format</span>
              <div style={{ display: 'flex', gap: '6px' }}>
                {TIEBREAK_FORMATS.map((f) => (
                  <button
                    key={f}
                    style={toggleButtonStyle(tiebreakFormat === f)}
                    onClick={() => setTiebreakFormat(f)}
                  >
                    First to {f}
                  </button>
                ))}
              </div>
              <div style={{ fontSize: '11px', color: '#6a7a6a', marginTop: '4px' }}>
                ⚡ Tiebreak starts at {setValue - 1}-{setValue - 1}
              </div>
            </div>
          )}
        </div>
      )}

      {setType === 'best_of' && (
        <div style={{
          fontSize: '12px',
          color: '#6a7a6a',
          marginTop: '-4px',
          marginBottom: '12px',
          padding: '8px 12px',
          background: '#e8f0e6',
          borderRadius: '6px',
        }}>
          ℹ️ If tied after {setValue} games, the set ends in a DRAW
        </div>
      )}

      {/* ===== MATCH CONFIGURATION ===== */}
      <span style={labelStyle}>Match Type</span>
      <div style={{ display: 'flex', gap: '6px', marginBottom: '16px' }}>
        <button
          style={toggleButtonStyle(matchConfig === 'single')}
          onClick={() => setMatchConfig('single')}
        >
          1 Set
        </button>
        <button
          style={toggleButtonStyle(matchConfig === 'best_of_3')}
          onClick={() => setMatchConfig('best_of_3')}
        >
          Best of 3
        </button>
        <button
          style={toggleButtonStyle(matchConfig === 'best_of_5')}
          onClick={() => setMatchConfig('best_of_5')}
        >
          Best of 5
        </button>
      </div>

      {/* ===== PLAYERS ===== */}
      <span style={labelStyle}>Play Type</span>
      <div style={{ display: 'flex', gap: '6px', marginBottom: '16px' }}>
        <button
          style={toggleButtonStyle(playType === 'singles')}
          onClick={() => setPlayType('singles')}
        >
          Singles
        </button>
        <button
          style={toggleButtonStyle(playType === 'doubles')}
          onClick={() => setPlayType('doubles')}
        >
          Doubles
        </button>
      </div>

      <span style={labelStyle}>Team 1</span>
      <PlayerPicker
        label="Select player"
        players={optionsFor('t1p1')}
        value={names.t1p1}
        isNew={newEntry.t1p1}
        onSelect={selectSlot('t1p1')}
        onNewValueChange={setNewSlotValue('t1p1')}
        onCancelNew={cancelNewSlot('t1p1')}
      />
      {playType === 'doubles' && (
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

      <span style={labelStyle}>Team 2</span>
      <PlayerPicker
        label="Select player"
        players={optionsFor('t2p1')}
        value={names.t2p1}
        isNew={newEntry.t2p1}
        onSelect={selectSlot('t2p1')}
        onNewValueChange={setNewSlotValue('t2p1')}
        onCancelNew={cancelNewSlot('t2p1')}
      />
      {playType === 'doubles' && (
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
        onClick={startMatch}
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
        {busy ? 'Starting...' : '🎾 Start Match'}
      </button>
    </div>
  )
}
