// src/components/LiveScoreboardLandscape.jsx
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
// SET COMPLETE PROMPT (Landscape)
// ============================================================
function SetCompletePrompt({ setNumber, winner, games1, games2, tiebreak, onContinue }) {
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
      <button 
        className="btn-primary" 
        onClick={onContinue}
        style={{ marginTop: '12px' }}
      >
        Continue →
      </button>
    </div>
  )
}

// ============================================================
// TIEBREAK START PROMPT (Landscape)
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
// LANDSCAPE SCOREBOARD
// ============================================================
export default function LiveScoreboardLandscape({ match, onMatchEnded, onMatchUpdated, onExit }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const undoStack = useRef([])
  const [localMatch, setLocalMatch] = useState(match)
  const [showSetPrompt, setShowSetPrompt] = useState(null)
  const [showTiebreakPrompt, setShowTiebreakPrompt] = useState(false)
  const [showMatchComplete, setShowMatchComplete] = useState(false)
  const [matchResult, setMatchResult] = useState(null)

  useEffect(() => {
    setLocalMatch(match)
  }, [match])

  // Auto-enter fullscreen
  useEffect(() => {
    const enterFullscreen = () => {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen?.() ||
        document.documentElement.webkitRequestFullscreen?.() ||
        document.documentElement.msRequestFullscreen?.()
      }
    }
    const timer = setTimeout(enterFullscreen, 500)
    return () => clearTimeout(timer)
  }, [])

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.()
    } else {
      document.exitFullscreen?.()
    }
  }

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

  // Check states
  const gameWinner = checkGameWinner(team1_points, team2_points, game_scoring, deuce_count)
  const tiebreakWinner = tiebreak_active ? checkTiebreakWinner(tiebreak_score1, tiebreak_score2, tiebreak_format) : null
  const setResult = checkSetResult(team1_games, team2_games, set_type, set_value, tiebreak_enabled, tiebreak_active)
  const matchWinner = checkMatchResult(sets, match_config)
  const isMatchComplete = matchWinner !== null && localMatch.status === 'active'

  // Check display states
  const suddenDeath = isSuddenDeathPoint(team1_points, team2_points, game_scoring, deuce_count)
  const deuce = isDeuce(team1_points, team2_points, game_scoring)
  const advantage = isAdvantage(team1_points, team2_points, game_scoring, deuce_count)

  // Snapshot
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
      setError('Please wait...')
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
      setError('Failed: ' + err.message)
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
      setError('Failed: ' + err.message)
      undoStack.current.push(prev)
    } finally {
      setBusy(false)
    }
  }

  // ============================================================
  // CANCEL MATCH
  // ============================================================
  const cancelMatch = async () => {
    if (!confirm('Cancel this match?')) return

    setError('')
    setBusy(true)

    try {
      document.exitFullscreen?.()
      await supabase
        .from('tennis_matches')
        .delete()
        .eq('id', localMatch.id)
      onExit()
    } catch (err) {
      setError('Failed: ' + err.message)
      setBusy(false)
    }
  }

  // ============================================================
  // HANDLERS
  // ============================================================
  const handleMatchComplete = () => {
    setShowMatchComplete(false)
    if (onMatchEnded) onMatchEnded(localMatch)
    onExit()
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
      <div style={{
        width: '100vw',
        height: '100vh',
        background: 'var(--bg-app)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
      }}>
        <div style={{
          background: '#ffffff',
          borderRadius: '12px',
          padding: '40px',
          maxWidth: '500px',
          width: '100%',
          textAlign: 'center',
          boxShadow: '0 4px 24px rgba(0,0,0,0.15)',
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
            marginBottom: '20px',
          }}>
            {sets.map((s, i) => (
              <div key={i} style={{
                background: 'var(--bg-app)',
                padding: '8px 16px',
                borderRadius: '8px',
                minWidth: '60px',
              }}>
                <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Set {i + 1}</div>
                <div style={{ fontWeight: '700', fontSize: '18px' }}>
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
      </div>
    )
  }

  // ============================================================
  // RENDER — Set Prompt
  // ============================================================
  if (showSetPrompt) {
    return (
      <div style={{
        width: '100vw',
        height: '100vh',
        background: 'var(--bg-app)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
      }}>
        <SetCompletePrompt
          setNumber={showSetPrompt.setNumber}
          winner={showSetPrompt.winner}
          games1={showSetPrompt.games1}
          games2={showSetPrompt.games2}
          tiebreak={showSetPrompt.tiebreak}
          onContinue={handleSetContinue}
        />
      </div>
    )
  }

  // ============================================================
  // RENDER — Tiebreak Prompt
  // ============================================================
  if (showTiebreakPrompt) {
    return (
      <div style={{
        width: '100vw',
        height: '100vh',
        background: 'var(--bg-app)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
      }}>
        <TiebreakPrompt
          onStart={handleTiebreakStart}
          format={tiebreak_format}
        />
      </div>
    )
  }

  // ============================================================
  // RENDER — Main Landscape
  // ============================================================
  const setsWon1 = sets.filter(s => s.winner === 1).length
  const setsWon2 = sets.filter(s => s.winner === 2).length
  const totalSets = match_config === 'single' ? 1 : match_config === 'best_of_3' ? 3 : 5

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

  const team1Name = teamLabel(team1_players).split('/')[0] || 'Team A'
  const team2Name = teamLabel(team2_players).split('/')[0] || 'Team B'

  return (
    <div style={{
      width: '100vw',
      height: '100vh',
      background: 'var(--bg-app)',
      display: 'flex',
      flexDirection: 'column',
      padding: '12px 20px 16px',
      overflow: 'hidden',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      boxSizing: 'border-box',
    }}>
      {/* Top bar */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingBottom: '8px',
        borderBottom: '1px solid var(--border)',
        flexShrink: 0,
        height: '36px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-primary)' }}>
            {match_config === 'single' ? '1 Set' : `Set ${current_set}/${totalSets}`}
            {tiebreak_active && ' 🔥 Tiebreak'}
          </span>
          <span style={{
            padding: '2px 10px',
            borderRadius: '10px',
            background: 'var(--bg-app)',
            color: 'var(--text-muted)',
            fontSize: '10px',
            fontWeight: '600',
            border: '1px solid var(--border)',
          }}>
            {game_scoring === 'no_deuce' ? 'No Deuce' : 
             game_scoring === '1deuce' ? '1 Deuce' :
             game_scoring === '2deuces' ? '2 Deuces' : 'Standard'}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            Sets: {setsWon1} - {setsWon2}
          </span>
          <button
            onClick={toggleFullscreen}
            style={{
              background: 'var(--bg-app)',
              border: '1px solid var(--border)',
              borderRadius: '4px',
              color: 'var(--text-primary)',
              padding: '0px 8px',
              fontSize: '14px',
              cursor: 'pointer',
              lineHeight: '24px',
              height: '24px',
            }}
          >
            ⛶
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div style={{
          fontSize: '13px',
          color: '#c0392b',
          textAlign: 'center',
          padding: '4px 0',
          background: 'rgba(214,67,47,0.08)',
          borderRadius: '4px',
          marginTop: '4px',
        }}>
          {error}
        </div>
      )}

      {/* Games in current set */}
      <div style={{
        textAlign: 'center',
        fontSize: '13px',
        color: 'var(--text-muted)',
        padding: '4px 0',
        flexShrink: 0,
      }}>
        Games: {team1_games} - {team2_games}
        {tiebreak_active && ` · Tiebreak: ${tiebreak_score1}-${tiebreak_score2}`}
      </div>

      {/* Main score area — two huge numbers */}
      <div style={{
        flex: 1,
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        alignItems: 'center',
        minHeight: 0,
        overflow: 'hidden',
        padding: '4px 0',
        gap: '20px',
      }}>
        <button
          onClick={() => addPoint(1)}
          disabled={busy}
          style={{
            fontSize: 'clamp(120px, 40vh, 400px)',
            fontWeight: '900',
            color: 'var(--text-primary)',
            lineHeight: 1,
            textAlign: 'center',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '0',
            width: '100%',
            height: '100%',
            transition: 'transform 0.1s ease',
            opacity: busy ? 0.5 : 1,
            touchAction: 'manipulation',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          onTouchStart={(e) => {
            if (!busy) e.currentTarget.style.transform = 'scale(0.95)'
          }}
          onTouchEnd={(e) => {
            e.currentTarget.style.transform = 'scale(1)'
          }}
        >
          {pointLabel1}
        </button>

        <button
          onClick={() => addPoint(2)}
          disabled={busy}
          style={{
            fontSize: 'clamp(120px, 40vh, 400px)',
            fontWeight: '900',
            color: 'var(--text-primary)',
            lineHeight: 1,
            textAlign: 'center',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '0',
            width: '100%',
            height: '100%',
            transition: 'transform 0.1s ease',
            opacity: busy ? 0.5 : 1,
            touchAction: 'manipulation',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          onTouchStart={(e) => {
            if (!busy) e.currentTarget.style.transform = 'scale(0.95)'
          }}
          onTouchEnd={(e) => {
            e.currentTarget.style.transform = 'scale(1)'
          }}
        >
          {pointLabel2}
        </button>
      </div>

      {/* Middle info */}
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        gap: '16px',
        flexShrink: 0,
        padding: '4px 0',
        fontSize: 'clamp(16px, 2.2vh, 26px)',
        color: 'var(--text-muted)',
      }}>
        <span style={{ fontWeight: '600', color: 'var(--text-primary)' }}>
          {team1Name}
        </span>
        <span style={{ 
          fontWeight: 'bold', 
          color: suddenDeath ? '#c0392b' : 'var(--gold)', 
          fontSize: 'clamp(14px, 2vh, 20px)',
        }}>
          {centerLabel === 'vs' ? `${team1_games} - ${team2_games}` : centerLabel}
        </span>
        <span style={{ fontWeight: '600', color: 'var(--text-primary)' }}>
          {team2Name}
        </span>
        <span style={{
          fontSize: 'clamp(11px, 1.4vh, 16px)',
          color: 'var(--text-muted)',
          padding: '2px 12px',
          background: 'var(--bg-app)',
          borderRadius: '10px',
          border: '1px solid var(--border)',
        }}>
          {getNextServer(team1_games + team2_games + 1) === 1 ? '🔴' : '🔵'} Serve
        </span>
      </div>

      {/* Bottom controls */}
      <div style={{
        display: 'flex',
        gap: '10px',
        flexShrink: 0,
        paddingTop: '8px',
      }}>
        <button
          onClick={undo}
          disabled={undoStack.current.length === 0 || busy}
          style={{
            flex: 1,
            padding: 'clamp(8px, 1vh, 12px) 0',
            borderRadius: '8px',
            border: '1px solid var(--border)',
            background: undoStack.current.length === 0
              ? 'var(--bg-app)'
              : '#ffffff',
            color: undoStack.current.length === 0 ? 'var(--text-muted)' : 'var(--text-primary)',
            fontSize: 'clamp(14px, 1.6vh, 18px)',
            cursor: undoStack.current.length === 0 ? 'not-allowed' : 'pointer',
            fontWeight: '500',
            transition: 'all 0.2s ease',
          }}
        >
          ↩ Undo
        </button>
        <button
          onClick={cancelMatch}
          style={{
            flex: '0 0 auto',
            padding: 'clamp(8px, 1vh, 12px) clamp(20px, 3vw, 40px)',
            borderRadius: '8px',
            border: '1px solid #c0392b',
            background: 'rgba(192, 57, 43, 0.08)',
            color: '#c0392b',
            fontSize: 'clamp(14px, 1.6vh, 18px)',
            fontWeight: '500',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
          }}
        >
          ✕ Cancel
        </button>
      </div>

      {/* Settings summary */}
      <div style={{
        fontSize: '9px',
        color: 'var(--text-muted)',
        textAlign: 'center',
        paddingTop: '6px',
        flexShrink: 0,
        borderTop: '1px solid var(--border-light)',
        marginTop: '6px',
      }}>
        {set_type === 'first_to' ? `First to ${set_value}` : `Best of ${set_value}`}
        {tiebreak_enabled && ` · Tiebreak ${tiebreak_format}`}
      </div>
    </div>
  )
}
