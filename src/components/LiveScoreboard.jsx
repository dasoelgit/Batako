// src/components/LiveScoreboard.jsx
import { useState, useRef, useEffect } from 'react'
import { supabase } from '../utils/supabase'
import { teamLabel } from '../utils/helpers'
import {
  checkGameWinner,
  checkTiebreakWinner,
  checkSetResult,
  checkMatchResult,
  isSuddenDeathPoint,
  isDeuce,
  isAdvantage,
  getPointLabel,
} from '../utils/tennisRules'
import { getServeSide, getNextServer } from '../utils/tennisHelpers'

// ============================================================
// SET COMPLETE PROMPT
// ============================================================
function SetCompletePrompt({ setNumber, winner, games1, games2, tiebreak, onContinue, onViewSummary }) {
  const winnerName = winner === 1 ? 'Team A' : 'Team B'

  return (
    <div style={{
      background: '#ffffff',
      padding: '24px',
      borderRadius: '12px',
      maxWidth: '400px',
      width: '100%',
      textAlign: 'center',
      boxShadow: '0 4px 24px rgba(0,0,0,0.15)',
      border: '2px solid var(--accent)',
    }}>
      <div style={{ fontSize: '24px', fontWeight: '700', color: 'var(--gold)', marginBottom: '8px' }}>
        🎾 Set {setNumber} Complete!
      </div>
      <div style={{ fontSize: '18px', color: 'var(--text-primary)', marginBottom: '4px' }}>
        {winnerName} wins {games1}-{games2}
        {tiebreak && ` (${tiebreak})`}
      </div>
      <div style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '16px' }}>
        {winner === 1 ? teamLabel(window._team1 || []) : teamLabel(window._team2 || [])} takes the set
      </div>
      <div style={{ display: 'flex', gap: '8px' }}>
        <button 
          className="btn-secondary" 
          onClick={onViewSummary} 
          style={{ flex: 1 }}
        >
          📊 Summary
        </button>
        <button 
          className="btn-primary" 
          onClick={onContinue} 
          style={{ flex: 1 }}
        >
          Continue →
        </button>
      </div>
    </div>
  )
}

// ============================================================
// TIEBREAK START PROMPT
// ============================================================
function TiebreakPrompt({ onStart, format }) {
  return (
    <div style={{
      background: '#ffffff',
      padding: '24px',
      borderRadius: '12px',
      maxWidth: '400px',
      width: '100%',
      textAlign: 'center',
      boxShadow: '0 4px 24px rgba(0,0,0,0.15)',
      border: '2px solid var(--accent)',
    }}>
      <div style={{ fontSize: '28px', marginBottom: '4px' }}>🔥</div>
      <div style={{ fontSize: '22px', fontWeight: '700', color: 'var(--accent-dark)', marginBottom: '4px' }}>
        TIEBREAK!
      </div>
      <div style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '16px' }}>
        First to {format}, win by 2
      </div>
      <button 
        className="btn-primary" 
        onClick={onStart}
      >
        🔥 Start Tiebreak
      </button>
    </div>
  )
}

// ============================================================
// MAIN LIVE SCOREBOARD
// ============================================================
export default function LiveScoreboard({ match, onMatchEnded, onMatchUpdated, onEnterLandscape }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const undoStack = useRef([])
  const [localMatch, setLocalMatch] = useState(match)
  const [showSetPrompt, setShowSetPrompt] = useState(null)
  const [showTiebreakPrompt, setShowTiebreakPrompt] = useState(false)
  const [showMatchComplete, setShowMatchComplete] = useState(false)
  const [matchResult, setMatchResult] = useState(null)

  // Store team labels for prompts
  useEffect(() => {
    if (localMatch) {
      window._team1 = localMatch.team1_players
      window._team2 = localMatch.team2_players
      window._setValue = localMatch.set_value
      window._tiebreakFormat = localMatch.tiebreak_format
    }
  }, [localMatch])

  // Keep local state in sync with prop
  useEffect(() => {
    setLocalMatch(match)
  }, [match])

  const {
    team1_players,
    team2_players,
    game_scoring = 'standard',
    set_type = 'first_to',
    set_value = 4,
    tiebreak_enabled = false,
    tiebreak_format = 7,
    match_config = 'single',
    sets = [],
    current_set = 1,
    team1_points = 0,
    team2_points = 0,
    deuce_count = 0,
    team1_games = 0,
    team2_games = 0,
    tiebreak_active = false,
    tiebreak_score1 = 0,
    tiebreak_score2 = 0,
  } = localMatch

  // ============================================================
  // CHECK STATES
  // ============================================================
  const gameWinner = checkGameWinner(team1_points, team2_points, game_scoring, deuce_count)
  const tiebreakWinner = tiebreak_active ? checkTiebreakWinner(tiebreak_score1, tiebreak_score2, tiebreak_format) : null
  const setResult = checkSetResult(team1_games, team2_games, set_type, set_value, tiebreak_enabled, tiebreak_active)
  const matchWinner = checkMatchResult(sets, match_config)

  // Check if match is complete
  const isMatchComplete = matchWinner !== null && localMatch.status === 'active'

  // Check display states
  const suddenDeath = isSuddenDeathPoint(team1_points, team2_points, game_scoring, deuce_count)
  const deuce = isDeuce(team1_points, team2_points, game_scoring)
  const advantage = isAdvantage(team1_points, team2_points, game_scoring, deuce_count)

  // ============================================================
  // SNAPSHOT & PERSIST
  // ============================================================
  const snapshot = () => ({
    team1_points: localMatch.team1_points,
    team2_points: localMatch.team2_points,
    deuce_count: localMatch.deuce_count,
    team1_games: localMatch.team1_games,
    team2_games: localMatch.team2_games,
    sets: localMatch.sets,
    current_set: localMatch.current_set,
    tiebreak_active: localMatch.tiebreak_active,
    tiebreak_score1: localMatch.tiebreak_score1,
    tiebreak_score2: localMatch.tiebreak_score2,
    status: localMatch.status,
    winner: localMatch.winner,
    draw: localMatch.draw,
  })

  const persist = async (patch) => {
    const { data, error } = await supabase
      .from('tennis_matches')
      .update(patch)
      .eq('id', localMatch.id)
      .select()
      .single()

    if (error) {
      console.error('Persist error:', error)
      throw new Error(error.message)
    }

    if (data) {
      setLocalMatch(data)
      if (onMatchUpdated) onMatchUpdated(data)
    }
    return data
  }

  // ============================================================
  // ADD POINT
  // ============================================================
  const addPoint = async (team) => {
    if (busy) {
      setError('Please wait, saving previous point...')
      return
    }

    if (isMatchComplete || showSetPrompt || showTiebreakPrompt) return

    setError('')
    setBusy(true)

    try {
      undoStack.current.push(snapshot())

      // === TIEBREAK MODE ===
      if (tiebreak_active) {
        let newScore1 = tiebreak_score1 + (team === 1 ? 1 : 0)
        let newScore2 = tiebreak_score2 + (team === 2 ? 1 : 0)

        const winner = checkTiebreakWinner(newScore1, newScore2, tiebreak_format)

        if (winner) {
          await finishSet(winner, team1_games, team2_games, `${newScore1}-${newScore2}`)
          setBusy(false)
          return
        }

        await persist({
          tiebreak_score1: newScore1,
          tiebreak_score2: newScore2,
        })
        setBusy(false)
        return
      }

      // === NORMAL POINT ===
      let newPoints1 = team1_points + (team === 1 ? 1 : 0)
      let newPoints2 = team2_points + (team === 2 ? 1 : 0)
      let newDeuceCount = deuce_count

      // Increment deuce count every time the score becomes tied at 3-3 or later.
      // (A single point always breaks a prior tie, so checking "was also tied"
      // can never be true — that was the bug that froze deuce_count at 0.)
      const isAtDeuce = newPoints1 >= 3 && newPoints2 >= 3 && newPoints1 === newPoints2

      if (isAtDeuce) {
        newDeuceCount += 1
      }

      const gameWinner = checkGameWinner(newPoints1, newPoints2, game_scoring, newDeuceCount)

      if (gameWinner) {
        await finishGame(gameWinner)
        setBusy(false)
        return
      }

      await persist({
        team1_points: newPoints1,
        team2_points: newPoints2,
        deuce_count: newDeuceCount,
      })

      setBusy(false)
    } catch (err) {
      setError('Failed to save point: ' + err.message)
      undoStack.current.pop()
      setBusy(false)
    }
  }

  // ============================================================
  // FINISH GAME
  // ============================================================
  const finishGame = async (gameWinner) => {
    const newGames1 = team1_games + (gameWinner === 1 ? 1 : 0)
    const newGames2 = team2_games + (gameWinner === 2 ? 1 : 0)

    const result = checkSetResult(newGames1, newGames2, set_type, set_value, tiebreak_enabled, false)

    if (result?.tiebreak) {
      await persist({
        team1_points: 0,
        team2_points: 0,
        deuce_count: 0,
        team1_games: newGames1,
        team2_games: newGames2,
        tiebreak_active: true,
        tiebreak_score1: 0,
        tiebreak_score2: 0,
      })
      setShowTiebreakPrompt(true)
      return
    }

    if (result?.winner) {
      await finishSet(result.winner, newGames1, newGames2)
      return
    }

    await persist({
      team1_points: 0,
      team2_points: 0,
      deuce_count: 0,
      team1_games: newGames1,
      team2_games: newGames2,
    })
  }

  // ============================================================
  // FINISH SET
  // ============================================================
  const finishSet = async (setWinner, finalGames1, finalGames2, tiebreak = null) => {
    const newSets = [
      ...sets,
      {
        set_number: current_set,
        team1_games: finalGames1,
        team2_games: finalGames2,
        tiebreak: tiebreak,
        winner: setWinner,
      },
    ]

    const matchResult = checkMatchResult(newSets, match_config)

    if (matchResult) {
      await persist({
        sets: newSets,
        winner: matchResult.winner,
        draw: matchResult.draw || false,
        status: 'completed',
        completed_at: new Date().toISOString(),
      })
      setMatchResult(matchResult)
      setShowMatchComplete(true)
      return
    }

    await persist({
      sets: newSets,
      current_set: current_set + 1,
      team1_games: 0,
      team2_games: 0,
      team1_points: 0,
      team2_points: 0,
      deuce_count: 0,
      tiebreak_active: false,
      tiebreak_score1: 0,
      tiebreak_score2: 0,
    })
  }

  // ============================================================
  // UNDO
  // ============================================================
  const undo = async () => {
    const prev = undoStack.current.pop()
    if (!prev) return

    setError('')
    setBusy(true)

    try {
      await persist(prev)
      setShowTiebreakPrompt(false)
      setShowSetPrompt(null)
    } catch (err) {
      setError('Failed to undo: ' + err.message)
      undoStack.current.push(prev)
    } finally {
      setBusy(false)
    }
  }

  // ============================================================
  // CANCEL MATCH
  // ============================================================
  const cancelMatch = async () => {
    if (!confirm('Cancel this match? No points will be recorded.')) return

    setError('')
    setBusy(true)

    try {
      await supabase
        .from('tennis_matches')
        .delete()
        .eq('id', localMatch.id)

      if (onMatchEnded) onMatchEnded(null)
    } catch (err) {
      setError('Failed to cancel match: ' + err.message)
      setBusy(false)
    }
  }

  // ============================================================
  // HANDLERS
  // ============================================================
  const handleMatchComplete = () => {
    setShowMatchComplete(false)
    if (onMatchEnded) onMatchEnded(localMatch)
  }

  const handleTiebreakStart = async () => {
    setShowTiebreakPrompt(false)
  }

  const handleSetContinue = () => {
    setShowSetPrompt(null)
  }

  // ============================================================
  // RENDER — Match Complete
  // ============================================================
  if (showMatchComplete && matchResult) {
    const isDraw = matchResult.draw
    const winnerName = isDraw ? 'DRAW' : (matchResult.winner === 1 ? teamLabel(team1_players) : teamLabel(team2_players))

    return (
      <div className="card" style={{
        textAlign: 'center',
        border: isDraw ? '2px solid var(--gold)' : '2px solid var(--accent)',
      }}>
        <div style={{ fontSize: '48px', marginBottom: '8px' }}>
          {isDraw ? '⚖️' : '🏆'}
        </div>
        <div style={{
          fontSize: '28px',
          fontWeight: '800',
          color: 'var(--gold)',
          marginBottom: '4px',
        }}>
          {isDraw ? 'MATCH DRAW!' : `${winnerName} WINS!`}
        </div>
        <div style={{ fontSize: '16px', color: 'var(--text-muted)', marginBottom: '16px' }}>
          {isDraw ? 'Both teams tied' : 'Champion of the match'}
        </div>

        <div style={{
          display: 'flex',
          gap: '12px',
          justifyContent: 'center',
          flexWrap: 'wrap',
          marginBottom: '16px',
        }}>
          {sets.map((s, i) => (
            <div key={i} style={{
              background: 'var(--bg-app)',
              padding: '8px 16px',
              borderRadius: '8px',
              minWidth: '60px',
            }}>
              <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Set {i + 1}</div>
              <div style={{ fontWeight: '700', fontSize: '16px' }}>
                {s.team1_games}-{s.team2_games}
                {s.tiebreak && ` (${s.tiebreak})`}
              </div>
            </div>
          ))}
        </div>

        <button
          className="btn-primary"
          onClick={handleMatchComplete}
          style={{ maxWidth: '200px', margin: '0 auto' }}
        >
          Done
        </button>
      </div>
    )
  }

  // ============================================================
  // RENDER — Set Complete Prompt
  // ============================================================
  if (showSetPrompt) {
    return (
      <SetCompletePrompt
        setNumber={showSetPrompt.setNumber}
        winner={showSetPrompt.winner}
        games1={showSetPrompt.games1}
        games2={showSetPrompt.games2}
        tiebreak={showSetPrompt.tiebreak}
        onContinue={handleSetContinue}
        onViewSummary={() => {}}
      />
    )
  }

  // ============================================================
  // RENDER — Tiebreak Prompt
  // ============================================================
  if (showTiebreakPrompt) {
    return (
      <TiebreakPrompt
        onStart={handleTiebreakStart}
        format={tiebreak_format}
      />
    )
  }

  // ============================================================
  // RENDER — Main Scoreboard
  // ============================================================
  const setsWon1 = sets.filter(s => s.winner === 1).length
  const setsWon2 = sets.filter(s => s.winner === 2).length
  const totalSets = match_config === 'single' ? 1 : match_config === 'best_of_3' ? 3 : 5
  const isSingles = localMatch.play_type === 'singles'

  // ============================================================
  // POINT DISPLAY
  // ============================================================
  let pointLabel1 = getPointLabel(team1_points)
  let pointLabel2 = getPointLabel(team2_points)
  let centerLabel = 'vs'

  if (suddenDeath) {
    centerLabel = '🔥 Sudden Death Point!'
  } else if (advantage) {
    centerLabel = 'Ad'
  } else if (deuce) {
    centerLabel = 'Deuce'
  }

  // For No Deuce mode at 3-3, show Sudden Death Point
  // This is handled by suddenDeath check above

  return (
    <div className="card">
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '12px',
      }}>
        <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
          {match_config === 'single' ? '1 Set' : `Set ${current_set} of ${totalSets}`}
          {tiebreak_active && ' 🔥 Tiebreak'}
        </div>
        <button
          onClick={onEnterLandscape}
          style={{
            background: 'var(--bg-app)',
            border: '1px solid var(--border)',
            borderRadius: '6px',
            color: 'var(--text-primary)',
            padding: '4px 10px',
            fontSize: '16px',
            cursor: 'pointer',
            lineHeight: 1,
          }}
          title="Fullscreen"
        >
          ⛶
        </button>
      </div>

      {/* Error */}
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
          {error}
        </div>
      )}

      {/* Set Dots */}
      {match_config !== 'single' && (
        <div className="game-dots">
          {Array.from({ length: totalSets }, (_, i) => {
            const s = sets[i]
            let cls = 'game-dot'
            if (s) cls += s.winner === 1 ? ' done1' : s.winner === 2 ? ' done2' : ''
            return (
              <div key={i} className={cls}>
                {s ? `${s.team1_games}-${s.team2_games}` : i + 1}
              </div>
            )
          })}
        </div>
      )}

      {/* Games in current set */}
      <div style={{
        textAlign: 'center',
        fontSize: '14px',
        color: 'var(--text-muted)',
        marginBottom: '8px',
      }}>
        Games: {team1_games} - {team2_games}
        {tiebreak_active && ` · Tiebreak: ${tiebreak_score1}-${tiebreak_score2}`}
      </div>

      {/* Points Display */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        width: '100%',
        marginBottom: '12px',
        padding: '0 4px',
      }}>
        <div style={{ fontSize: '28px', fontWeight: '700', color: 'var(--text-primary)' }}>
          {pointLabel1}
        </div>
        <div style={{ 
          fontSize: '16px', 
          color: suddenDeath ? '#c0392b' : 'var(--text-muted)', 
          fontWeight: suddenDeath ? '800' : '600',
        }}>
          {centerLabel}
        </div>
        <div style={{ fontSize: '28px', fontWeight: '700', color: 'var(--text-primary)' }}>
          {pointLabel2}
        </div>
      </div>

      {/* Serve Indicator */}
      <div style={{
        textAlign: 'center',
        fontSize: '12px',
        color: 'var(--text-muted)',
        marginBottom: '12px',
        padding: '6px 12px',
        background: 'var(--bg-app)',
        borderRadius: '6px',
      }}>
        Serving: <strong>{getNextServer(team1_games + team2_games + 1) === 1 ? teamLabel(team1_players) : teamLabel(team2_players)}</strong>
        {' · '}
        {getServeSide(team1_points + team2_points)} Court
      </div>

      {/* Doubles indicator */}
      {!isSingles && (
        <div style={{
          textAlign: 'center',
          fontSize: '11px',
          color: 'var(--text-muted)',
          marginBottom: '8px',
          padding: '4px 8px',
          background: 'var(--bg-app)',
          borderRadius: '4px',
        }}>
          🎾 Doubles
        </div>
      )}

      {/* Score Buttons */}
      <div style={{
        display: 'flex',
        gap: '8px',
        width: '100%',
        marginTop: '8px',
      }}>
        <button
          className="score-btn"
          disabled={busy}
          onClick={() => addPoint(1)}
          style={{ flex: 1 }}
        >
          +1 {teamLabel(team1_players).split('/')[0] || 'Team A'}
        </button>
        <button
          className="score-btn"
          disabled={busy}
          onClick={() => addPoint(2)}
          style={{ flex: 1 }}
        >
          +1 {teamLabel(team2_players).split('/')[0] || 'Team B'}
        </button>
      </div>

      {/* Controls */}
      <div className="controls-row" style={{ marginTop: '12px' }}>
        <button
          className="btn-secondary"
          disabled={undoStack.current.length === 0 || busy}
          onClick={undo}
        >
          ↩ Undo
        </button>
        <button
          className="btn-secondary"
          onClick={cancelMatch}
          style={{ color: '#c0392b', borderColor: '#c0392b' }}
        >
          ✕ Cancel
        </button>
      </div>

      {/* Settings summary */}
      <div style={{
        fontSize: '10px',
        color: 'var(--text-muted)',
        textAlign: 'center',
        marginTop: '12px',
        borderTop: '1px solid var(--border-light)',
        paddingTop: '8px',
      }}>
        {game_scoring === 'no_deuce' ? 'No Deuce' : 
         game_scoring === '1deuce' ? '1 Deuce' :
         game_scoring === '2deuces' ? '2 Deuces' : 'Standard'} · 
        {set_type === 'first_to' ? `First to ${set_value}` : `Best of ${set_value}`}
        {tiebreak_enabled && ` · Tiebreak ${tiebreak_format}`}
      </div>
    </div>
  )
}
