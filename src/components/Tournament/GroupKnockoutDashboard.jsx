// src/components/Tournament/GroupKnockoutDashboard.jsx
import { useState, useEffect } from 'react'
import { supabase } from '../../utils/supabase'
import { teamLabel } from '../../utils/helpers'
import { updateKnockoutWinner } from '../../utils/tournament'

export default function GroupKnockoutDashboard({ tournament, onTournamentComplete, onBack }) {
  const [tournamentData, setTournamentData] = useState(tournament)
  const [activeTab, setActiveTab] = useState('group')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [champion, setChampion] = useState(null)
  const [showScoreModal, setShowScoreModal] = useState(false)
  const [selectedMatch, setSelectedMatch] = useState(null)
  const [selectedGroupIndex, setSelectedGroupIndex] = useState(null)
  const [selectedRoundIndex, setSelectedRoundIndex] = useState(null)
  const [selectedMatchIndex, setSelectedMatchIndex] = useState(null)
  const [score1, setScore1] = useState('')
  const [score2, setScore2] = useState('')
  const [busy, setBusy] = useState(false)

  const rounds = tournamentData.rounds || {}
  const groups = rounds.groups || []
  const knockoutRounds = rounds.knockoutRounds || []
  const advancingPlayers = rounds.advancingPlayers || []
  const advancePerGroup = rounds.advancePerGroup || 2
  const isDoubles = tournamentData.match_type === 'doubles'

  // Check if tournament is complete
  useEffect(() => {
    if (knockoutRounds.length > 0) {
      const allCompleted = knockoutRounds.every(round =>
        round.matches.every(m => m.completed || m.isBye)
      )
      if (allCompleted) {
        const finalRound = knockoutRounds[knockoutRounds.length - 1]
        if (finalRound && !finalRound.isBronze) {
          const finalMatch = finalRound.matches[0]
          if (finalMatch && finalMatch.completed && finalMatch.winner) {
            setChampion(finalMatch.winner)
          }
        }
      }
    }
  }, [knockoutRounds])

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

  const isMatchReady = (match) => {
    if (!match) return false
    if (match.completed || match.isBye) return false
    if (!match.team1 || !match.team2) return false
    if (match.team1.length === 0 || match.team2.length === 0) return false
    if (match.team1[0]?.isPlaceholder || match.team2[0]?.isPlaceholder) return false
    return true
  }

  const handleMatchClick = (groupIndex, roundIndex, matchIndex) => {
    const group = groups[groupIndex]
    const round = group.rounds[roundIndex]
    const match = round.matches[matchIndex]

    if (match.completed || match.isBye) return
    if (!match.team1 || !match.team2) return
    if (match.team1.length === 0 || match.team2.length === 0) return
    if (match.team1[0]?.isPlaceholder || match.team2[0]?.isPlaceholder) return

    setSelectedGroupIndex(groupIndex)
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

      // Update the match in the group
      const updatedGroups = [...groups]
      const group = updatedGroups[selectedGroupIndex]
      const round = group.rounds[selectedRoundIndex]
      const match = round.matches[selectedMatchIndex]

      // Determine winner
      let winner = null
      let draw = false
      if (s1 > s2) winner = 1
      else if (s2 > s1) winner = 2
      else draw = true

      match.completed = true
      match.score1 = s1
      match.score2 = s2
      match.winner = winner
      match.draw = draw

      // Save to tennis_matches
      const team1Players = match.team1 || []
      const team2Players = match.team2 || []

      const { data: matchData, error: matchError } = await supabase
        .from('tennis_matches')
        .insert({
          play_type: 'singles',
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
            winner: winner,
            tiebreak: null,
          }],
          current_set: 1,
          team1_games: s1,
          team2_games: s2,
          team1_points: 0,
          team2_points: 0,
          winner: winner,
          draw: draw,
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

      // Update tournament in database
      const updatedRoundsData = {
        ...tournamentData.rounds,
        groups: updatedGroups,
      }

      const { error: updateError } = await supabase
        .from('tennis_tournaments')
        .update({ rounds: updatedRoundsData })
        .eq('id', tournamentData.id)

      if (updateError) throw updateError

      setTournamentData(prev => ({ ...prev, rounds: updatedRoundsData }))
      setShowScoreModal(false)
      setSelectedMatch(null)
      setSelectedGroupIndex(null)
      setSelectedRoundIndex(null)
      setSelectedMatchIndex(null)
      setScore1('')
      setScore2('')
      setBusy(false)

      window.dispatchEvent(new Event('refreshData'))
    } catch (err) {
      setError(err.message || 'Failed to save score')
      setBusy(false)
    }
  }

  const getRoundName = (round) => {
    if (round.isBronze) return '🥉 Bronze Match'
    return round.round_name || `Round ${round.round_number}`
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
        Group + Knockout · {tournamentData.players?.length || 0} players
        {champion && ' · ✅ Complete'}
      </div>

      {/* Tabs */}
      <div style={{
        display: 'flex',
        gap: '6px',
        marginBottom: '16px',
      }}>
        <button
          className={`tab ${activeTab === 'group' ? 'active' : ''}`}
          onClick={() => setActiveTab('group')}
          style={{ flex: 1 }}
        >
          Group Stage
        </button>
        <button
          className={`tab ${activeTab === 'knockout' ? 'active' : ''}`}
          onClick={() => setActiveTab('knockout')}
          style={{ flex: 1 }}
        >
          Knockout
        </button>
      </div>

      {/* Group Stage Tab */}
      {activeTab === 'group' && (
        <div>
          {groups.map((group, groupIdx) => (
            <div key={groupIdx} style={{ marginBottom: '24px' }}>
              <div style={{
                fontSize: '16px',
                fontWeight: '700',
                color: '#d4a843',
                marginBottom: '8px',
              }}>
                {group.groupName}
              </div>

              {/* Standings */}
              <div style={{ marginBottom: '12px' }}>
                <div style={{
                  fontSize: '12px',
                  fontWeight: '600',
                  color: '#6a7a6a',
                  marginBottom: '4px',
                }}>
                  Standings
                </div>
                <div style={{
                  background: '#f8faf8',
                  borderRadius: '8px',
                  padding: '8px 12px',
                }}>
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: '30px 1fr 30px 30px 30px 40px',
                    gap: '4px',
                    padding: '4px 0',
                    borderBottom: '1px solid #d0ddd0',
                    fontSize: '10px',
                    color: '#6a7a6a',
                    textTransform: 'uppercase',
                    fontWeight: '600',
                  }}>
                    <div>#</div>
                    <div>Player</div>
                    <div style={{ textAlign: 'center' }}>W</div>
                    <div style={{ textAlign: 'center' }}>L</div>
                    <div style={{ textAlign: 'center' }}>T</div>
                    <div style={{ textAlign: 'center' }}>Pts</div>
                  </div>
                  {group.standings.map((s, i) => {
                    const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i+1}.`
                    const isAdvancing = i < advancePerGroup
                    return (
                      <div key={s.id} style={{
                        display: 'grid',
                        gridTemplateColumns: '30px 1fr 30px 30px 30px 40px',
                        gap: '4px',
                        padding: '4px 0',
                        borderBottom: i < group.standings.length - 1 ? '1px solid #e8f0e6' : 'none',
                        alignItems: 'center',
                        fontSize: '13px',
                      }}>
                        <div style={{
                          fontWeight: '700',
                          color: i === 0 ? '#d4a843' : i === 1 ? '#a8a8a8' : i === 2 ? '#cd7f32' : '#6a7a6a',
                        }}>
                          {medal}
                        </div>
                        <div style={{ fontWeight: '600' }}>{s.name}</div>
                        <div style={{ textAlign: 'center' }}>{s.W}</div>
                        <div style={{ textAlign: 'center', color: '#6a7a6a' }}>{s.L}</div>
                        <div style={{ textAlign: 'center', color: '#d4a843' }}>{s.T}</div>
                        <div style={{ textAlign: 'center', fontWeight: '700', color: '#d4a843' }}>{s.Pts}</div>
                        {isAdvancing && (
                          <div style={{
                            gridColumn: '1 / -1',
                            marginTop: '2px',
                            padding: '2px',
                            background: 'rgba(74, 222, 128, 0.12)',
                            borderRadius: '4px',
                            fontSize: '10px',
                            color: '#4ade80',
                            textAlign: 'center',
                          }}>
                            ✅ Advances
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Matches */}
              <div>
                <div style={{
                  fontSize: '12px',
                  fontWeight: '600',
                  color: '#6a7a6a',
                  marginBottom: '4px',
                }}>
                  Matches
                </div>
                {group.rounds.map((round, roundIdx) => (
                  <div key={roundIdx} style={{ marginBottom: '8px' }}>
                    <div style={{
                      fontSize: '11px',
                      fontWeight: '500',
                      color: '#6a7a6a',
                      marginBottom: '2px',
                    }}>
                      Round {round.round_number}
                    </div>
                    {round.matches.map((match, matchIdx) => {
                      if (match.isBye) return null
                      const isCompleted = match.completed
                      const isReady = isMatchReady(match)
                      const team1Label = getMatchLabel(match.team1)
                      const team2Label = getMatchLabel(match.team2)

                      return (
                        <div
                          key={matchIdx}
                          onClick={() => {
                            if (isReady) handleMatchClick(groupIdx, roundIdx, matchIdx)
                          }}
                          style={{
                            border: '1px solid #d0ddd0',
                            borderRadius: '6px',
                            padding: '8px 12px',
                            marginBottom: '4px',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            cursor: isReady ? 'pointer' : 'default',
                            background: isCompleted ? 'rgba(74, 222, 128, 0.08)' : '#ffffff',
                            opacity: isCompleted ? 0.85 : 1,
                          }}
                        >
                          <div>
                            <div style={{ fontWeight: '500', fontSize: '13px' }}>
                              {team1Label} vs {team2Label}
                            </div>
                            {isCompleted && (
                              <div style={{ fontSize: '12px', color: '#6a7a6a' }}>
                                {match.score1} - {match.score2}
                              </div>
                            )}
                          </div>
                          <div>
                            {isCompleted ? '✅' : isReady ? '⏳' : '⏸️'}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Knockout Tab */}
      {activeTab === 'knockout' && (
        <div>
          {knockoutRounds.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '20px',
              color: '#6a7a6a',
              background: '#f8faf8',
              borderRadius: '8px',
            }}>
              Group stage must complete before knockout begins.
            </div>
          ) : (
            knockoutRounds.map((round, roundIndex) => (
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
                  const isCompleted = match.completed
                  const isReady = isMatchReady(match)
                  const team1Label = getTeamName(match, 1)
                  const team2Label = getTeamName(match, 2)

                  return (
                    <div
                      key={matchIndex}
                      onClick={() => {
                        if (isReady) handleMatchClick(groupIdx, roundIdx, matchIdx)
                      }}
                      style={{
                        border: '1px solid #d0ddd0',
                        borderRadius: '8px',
                        padding: '12px 16px',
                        marginBottom: '8px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        cursor: isReady ? 'pointer' : 'default',
                        background: isCompleted ? 'rgba(74, 222, 128, 0.08)' : '#ffffff',
                        opacity: isCompleted ? 0.85 : 1,
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: '600', fontSize: '14px' }}>
                          {team1Label} vs {team2Label}
                        </div>
                        {isCompleted && (
                          <div style={{ fontSize: '13px', color: '#6a7a6a' }}>
                            {match.score1} - {match.score2}
                          </div>
                        )}
                      </div>
                      <div>
                        {isCompleted ? '✅' : isReady ? '⏳' : '⏸️'}
                      </div>
                    </div>
                  )
                })}
              </div>
            ))
          )}
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
            setSelectedGroupIndex(null)
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
              Enter Score
            </h3>

            <div style={{
              fontSize: '14px',
              fontWeight: '600',
              color: '#1a2a1a',
              textAlign: 'center',
              marginBottom: '16px',
            }}>
              {getMatchLabel(selectedMatch.team1)} vs {getMatchLabel(selectedMatch.team2)}
            </div>

            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: '12px',
            }}>
              <div style={{ flex: 1, textAlign: 'center' }}>
                <div style={{ fontSize: '12px', color: '#6a7a6a' }}>Team 1</div>
                <div style={{ fontWeight: '600', marginBottom: '8px' }}>{getMatchLabel(selectedMatch.team1)}</div>
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
                <div style={{ fontWeight: '600', marginBottom: '8px' }}>{getMatchLabel(selectedMatch.team2)}</div>
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
                  setSelectedGroupIndex(null)
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
