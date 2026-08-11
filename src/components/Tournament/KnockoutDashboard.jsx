// src/components/Tournament/KnockoutDashboard.jsx
import { useState, useEffect } from 'react'
import { supabase } from '../../utils/supabase'
import { teamLabel } from '../../utils/helpers'
import { updateKnockoutWinner } from '../../utils/tournament'

export default function KnockoutDashboard({ tournament, onTournamentComplete, onBack }) {
  const [tournamentData, setTournamentData] = useState(tournament)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showScoreModal, setShowScoreModal] = useState(false)
  const [selectedMatch, setSelectedMatch] = useState(null)
  const [selectedRoundIndex, setSelectedRoundIndex] = useState(null)
  const [selectedMatchIndex, setSelectedMatchIndex] = useState(null)
  const [score1, setScore1] = useState('')
  const [score2, setScore2] = useState('')
  const [busy, setBusy] = useState(false)
  const [champion, setChampion] = useState(null)
  const [bronzeWinner, setBronzeWinner] = useState(null)

  const rounds = tournamentData.rounds || []
  const totalRounds = rounds.length
  const isDoubles = tournamentData.type === 'knockout' && tournamentData.match_type === 'doubles'

  useEffect(() => {
    // Check if tournament is complete
    const allMatchesCompleted = rounds.every(round =>
      round.matches.every(m => m.completed || m.isBye)
    )
    if (allMatchesCompleted && rounds.length > 0) {
      // Find champion (winner of final round)
      const finalRound = rounds[rounds.length - 1]
      if (finalRound && !finalRound.isBronze) {
        const finalMatch = finalRound.matches[0]
        if (finalMatch && finalMatch.completed && finalMatch.winner) {
          setChampion(finalMatch.winner)
        }
      }
      // Find bronze winner if bronze match exists
      const bronzeRound = rounds.find(r => r.isBronze)
      if (bronzeRound && bronzeRound.matches[0]?.completed) {
        const bronzeMatch = bronzeRound.matches[0]
        if (bronzeMatch.winner) {
          setBronzeWinner(bronzeMatch.winner)
        }
      }
    }
  }, [rounds])

  const getMatchLabel = (team) => {
    if (!team) return 'TBD'
    if (!Array.isArray(team)) return team.name || 'TBD'
    const players = team.filter(p => p && !p.isBye)
    if (players.length === 0) return 'TBD'
    if (players.length === 1) return players[0].name
    return players.map(p => p.name).join(' / ')
  }

  const getTeamName = (match, side) => {
    if (side === 1) {
      if (match.team1Name) return match.team1Name
      return getMatchLabel(match.team1)
    } else {
      if (match.team2Name) return match.team2Name
      return getMatchLabel(match.team2)
    }
  }

  const handleMatchClick = (roundIndex, matchIndex) => {
    const round = rounds[roundIndex]
    const match = round.matches[matchIndex]

    // Skip if match is already completed or is a bye
    if (match.completed || match.isBye) return

    // Skip if match doesn't have two teams (placeholder for future rounds)
    if (!match.team1 || !match.team2) return
    if (match.team1.length === 0 || match.team2.length === 0) return

    // Check if any team is a placeholder
    if (match.team1[0]?.isPlaceholder || match.team2[0]?.isPlaceholder) return

    setSelectedRoundIndex(roundIndex)
    setSelectedMatchIndex(matchIndex)
    setSelectedMatch(match)
    setScore1('')
    setScore2('')
    setShowScoreModal(true)
  }

  const handleSaveScore = async () => {
    setError('')
    setBusy(true)

    try {
      const s1 = parseInt(score1)
      const s2 = parseInt(score2)

      if (isNaN(s1) || isNaN(s2) || s1 < 0 || s2 < 0) {
        setError('Please enter valid scores.')
        setBusy(false)
        return
      }

      const updatedRounds = [...rounds]
      const round = updatedRounds[selectedRoundIndex]
      const match = round.matches[selectedMatchIndex]

      // Determine winner
      let winner = null
      let draw = false
      if (s1 > s2) {
        // Team 1 wins
        if (isDoubles && match.team1.length > 0) {
          winner = {
            id: match.team1.map(p => p.id).join('-'),
            name: match.team1.map(p => p.name).join(' / '),
            players: match.team1,
          }
        } else {
          winner = match.team1[0]
        }
      } else if (s2 > s1) {
        // Team 2 wins
        if (isDoubles && match.team2.length > 0) {
          winner = {
            id: match.team2.map(p => p.id).join('-'),
            name: match.team2.map(p => p.name).join(' / '),
            players: match.team2,
          }
        } else {
          winner = match.team2[0]
        }
      } else {
        draw = true
      }

      if (draw) {
        setError('Knockout matches cannot end in a draw. Please enter a valid score.')
        setBusy(false)
        return
      }

      // Update match
      match.completed = true
      match.score1 = s1
      match.score2 = s2
      match.winner = winner

      // Save to tennis_matches
      const team1Players = match.team1 || []
      const team2Players = match.team2 || []

      const { data: matchData, error: matchError } = await supabase
        .from('tennis_matches')
        .insert({
          play_type: isDoubles ? 'doubles' : 'singles',
          team1_players: team1Players,
          team2_players: team2Players,
          status: 'completed',
          game_scoring: 'standard',
          set_type: 'best_of',
          set_value: 1,
          match_config: 'single',
          sets: [{
            set_number: 1,
            team1_games: s1,
            team2_games: s2,
            winner: s1 > s2 ? 1 : 2,
            tiebreak: null,
          }],
          current_set: 1,
          team1_games: s1,
          team2_games: s2,
          team1_points: 0,
          team2_points: 0,
          winner: s1 > s2 ? 1 : 2,
          draw: false,
          tournament_id: tournamentData.id,
          is_tournament_match: true,
          completed_at: new Date().toISOString(),
        })
        .select()
        .single()

      if (matchError) throw matchError

      // Link to tournament_matches
      const { error: linkError } = await supabase
        .from('tennis_tournament_matches')
        .insert({
          tournament_id: tournamentData.id,
          match_id: matchData.id,
          round_number: selectedRoundIndex + 1,
        })

      if (linkError) throw linkError

      // Update next round with winner (for knockout progression)
      const nextRoundIndex = selectedRoundIndex + 1
      if (nextRoundIndex < updatedRounds.length && !round.isBronze) {
        const nextRound = updatedRounds[nextRoundIndex]
        // Find the placeholder in next round that this winner should fill
        for (const nextMatch of nextRound.matches) {
          if (nextMatch.team1 && nextMatch.team1[0]?.isPlaceholder) {
            const placeholderId = nextMatch.team1[0].id
            if (placeholderId === match.id || placeholderId === `match_${selectedRoundIndex + 1}_${selectedMatchIndex}`) {
              if (isDoubles && winner.players) {
                nextMatch.team1 = winner.players
                nextMatch.team1Name = winner.name
              } else {
                nextMatch.team1 = [winner]
              }
              break
            }
          }
          if (nextMatch.team2 && nextMatch.team2[0]?.isPlaceholder) {
            const placeholderId = nextMatch.team2[0].id
            if (placeholderId === match.id || placeholderId === `match_${selectedRoundIndex + 1}_${selectedMatchIndex}`) {
              if (isDoubles && winner.players) {
                nextMatch.team2 = winner.players
                nextMatch.team2Name = winner.name
              } else {
                nextMatch.team2 = [winner]
              }
              break
            }
          }
        }
      }

      // Update tournament in database
      const { error: updateError } = await supabase
        .from('tennis_tournaments')
        .update({ rounds: updatedRounds })
        .eq('id', tournamentData.id)

      if (updateError) throw updateError

      setTournamentData(prev => ({ ...prev, rounds: updatedRounds }))
      setShowScoreModal(false)
      setSelectedMatch(null)
      setSelectedRoundIndex(null)
      setSelectedMatchIndex(null)
      setScore1('')
      setScore2('')
      setBusy(false)

      // Refresh leaderboard
      window.dispatchEvent(new Event('refreshData'))

      // Check if tournament complete
      const allMatchesCompleted = updatedRounds.every(round =>
        round.matches.every(m => m.completed || m.isBye)
      )

      if (allMatchesCompleted) {
        await supabase
          .from('tennis_tournaments')
          .update({ status: 'completed', completed_at: new Date().toISOString() })
          .eq('id', tournamentData.id)
        onTournamentComplete(tournamentData.id)
      }
    } catch (err) {
      setError(err.message || 'Failed to save score')
      setBusy(false)
    }
  }

  const getRoundName = (round) => {
    if (round.isBronze) return '🥉 Bronze Match'
    return round.round_name || `Round ${round.round_number}`
  }

  const isMatchReady = (match) => {
    if (!match) return false
    if (match.completed || match.isBye) return false
    if (!match.team1 || !match.team2) return false
    if (match.team1.length === 0 || match.team2.length === 0) return false
    // Check if any team has placeholder
    if (match.team1[0]?.isPlaceholder || match.team2[0]?.isPlaceholder) return false
    return true
  }

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
        marginBottom: '4px',
      }}>
        🏆 {tournamentData.name}
      </div>

      <div style={{
        fontSize: '13px',
        color: '#6a7a6a',
        textAlign: 'center',
        marginBottom: '16px',
      }}>
        Knockout Tournament · {tournamentData.players?.length || 0} players
        {isDoubles && ' · Doubles'}
        {champion && ' · ✅ Complete'}
      </div>

      {/* Champion Display */}
      {champion && (
        <div style={{
          textAlign: 'center',
          padding: '12px',
          marginBottom: '16px',
          background: 'rgba(212, 233, 75, 0.15)',
          borderRadius: '8px',
          border: '2px solid #d4e94b',
        }}>
          <div style={{ fontSize: '14px', color: '#6a7a6a' }}>🏆 Champion</div>
          <div style={{ fontSize: '24px', fontWeight: '800', color: '#d4a843' }}>
            {getMatchLabel([champion])}
          </div>
          {bronzeWinner && (
            <div style={{ marginTop: '8px', fontSize: '14px', color: '#6a7a6a' }}>
              🥉 Bronze: {getMatchLabel([bronzeWinner])}
            </div>
          )}
        </div>
      )}

      {/* Bracket */}
      {rounds.map((round, roundIndex) => (
        <div key={roundIndex} style={{ marginBottom: '16px' }}>
          <div style={{
            fontSize: '13px',
            fontWeight: '600',
            color: '#1a2a1a',
            marginBottom: '8px',
          }}>
            {getRoundName(round)}
          </div>

          {round.matches.map((match, matchIndex) => {
            const isReady = isMatchReady(match)
            const team1Label = getTeamName(match, 1)
            const team2Label = getTeamName(match, 2)
            const isCompleted = match.completed
            const isBye = match.isBye

            if (isBye) return null

            return (
              <div
                key={matchIndex}
                onClick={() => handleMatchClick(roundIndex, matchIndex)}
                style={{
                  border: '1px solid #d0ddd0',
                  borderRadius: '8px',
                  padding: '12px 16px',
                  marginBottom: '8px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  cursor: isReady ? 'pointer' : 'default',
                  transition: 'all 0.2s ease',
                  background: isCompleted ? 'rgba(74, 222, 128, 0.08)' : (isReady ? '#ffffff' : '#f5f5f5'),
                  opacity: isCompleted ? 0.85 : (isReady ? 1 : 0.6),
                }}
                onMouseEnter={(e) => {
                  if (isReady) {
                    e.currentTarget.style.background = '#f8faf8'
                  }
                }}
                onMouseLeave={(e) => {
                  if (isReady) {
                    e.currentTarget.style.background = '#ffffff'
                  }
                }}
              >
                <div>
                  <div style={{ fontWeight: '600', fontSize: '14px' }}>
                    {team1Label} vs {team2Label}
                  </div>
                  {isCompleted && (
                    <div style={{ fontSize: '13px', color: '#6a7a6a' }}>
                      {match.score1} - {match.score2}
                      {match.winner && (
                        <span style={{ marginLeft: '8px', color: '#4ade80', fontWeight: '600' }}>
                          ✅ {getMatchLabel([match.winner])} wins
                        </span>
                      )}
                    </div>
                  )}
                  {!isCompleted && !isReady && (
                    <div style={{ fontSize: '12px', color: '#6a7a6a' }}>
                      Waiting for previous round
                    </div>
                  )}
                  {!isCompleted && isReady && (
                    <div style={{ fontSize: '12px', color: '#6a7a6a' }}>
                      Tap to enter score →
                    </div>
                  )}
                </div>
                <div>
                  {isCompleted ? (
                    <span style={{ fontSize: '18px' }}>✅</span>
                  ) : isReady ? (
                    <span style={{ fontSize: '18px', color: '#fbbf24' }}>⏳</span>
                  ) : (
                    <span style={{ fontSize: '18px', color: '#d0ddd0' }}>⏸️</span>
                  )}
                </div>
              </div>
            )
          })}
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

      {/* Score Modal */}
      {showScoreModal && selectedMatch && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.5)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '16px',
          }}
          onClick={() => {
            setShowScoreModal(false)
            setSelectedMatch(null)
            setSelectedRoundIndex(null)
            setSelectedMatchIndex(null)
            setScore1('')
            setScore2('')
            setError('')
          }}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: '12px',
              padding: '24px',
              maxWidth: '400px',
              width: '100%',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ margin: '0 0 16px 0', color: '#1a2a1a' }}>
              {selectedMatch.round ? `Round ${selectedMatch.round}` : 'Match'} Score
            </h3>

            <div style={{
              fontSize: '14px',
              fontWeight: '600',
              color: '#1a2a1a',
              textAlign: 'center',
              marginBottom: '16px',
            }}>
              {getTeamName(selectedMatch, 1)} vs {getTeamName(selectedMatch, 2)}
            </div>

            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: '12px',
            }}>
              <div style={{ flex: 1, textAlign: 'center' }}>
                <div style={{ fontSize: '12px', color: '#6a7a6a' }}>Team 1</div>
                <div style={{ fontWeight: '600', marginBottom: '8px' }}>{getTeamName(selectedMatch, 1)}</div>
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="0"
                  value={score1}
                  onChange={(e) => setScore1(e.target.value.replace(/[^0-9]/g, ''))}
                  style={{
                    width: '60px',
                    padding: '10px',
                    borderRadius: '8px',
                    border: '1px solid #d0ddd0',
                    background: '#ffffff',
                    color: '#1a2a1a',
                    fontSize: '20px',
                    textAlign: 'center',
                    outline: 'none',
                  }}
                />
              </div>

              <div style={{ fontSize: '16px', fontWeight: '700', color: '#6a7a6a' }}>vs</div>

              <div style={{ flex: 1, textAlign: 'center' }}>
                <div style={{ fontSize: '12px', color: '#6a7a6a' }}>Team 2</div>
                <div style={{ fontWeight: '600', marginBottom: '8px' }}>{getTeamName(selectedMatch, 2)}</div>
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="0"
                  value={score2}
                  onChange={(e) => setScore2(e.target.value.replace(/[^0-9]/g, ''))}
                  style={{
                    width: '60px',
                    padding: '10px',
                    borderRadius: '8px',
                    border: '1px solid #d0ddd0',
                    background: '#ffffff',
                    color: '#1a2a1a',
                    fontSize: '20px',
                    textAlign: 'center',
                    outline: 'none',
                  }}
                />
              </div>
            </div>

            {error && (
              <div style={{
                background: 'rgba(214,67,47,0.12)',
                color: '#c0392b',
                padding: '8px',
                borderRadius: '6px',
                fontSize: '13px',
                marginTop: '12px',
                textAlign: 'center',
              }}>
                {error}
              </div>
            )}

            <div style={{
              display: 'flex',
              gap: '8px',
              marginTop: '16px',
            }}>
              <button
                className="btn-secondary"
                style={{ flex: 1 }}
                onClick={() => {
                  setShowScoreModal(false)
                  setSelectedMatch(null)
                  setSelectedRoundIndex(null)
                  setSelectedMatchIndex(null)
                  setScore1('')
                  setScore2('')
                  setError('')
                }}
              >
                Cancel
              </button>
              <button
                className="btn-primary"
                style={{ flex: 1 }}
                onClick={handleSaveScore}
                disabled={busy}
              >
                {busy ? 'Saving...' : 'Save Score'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
