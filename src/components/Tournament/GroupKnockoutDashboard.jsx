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

  const rounds = tournamentData.rounds || {}
  const groups = rounds.groups || []
  const knockoutRounds = rounds.knockoutRounds || []
  const advancingPlayers = rounds.advancingPlayers || []
  const advancePerGroup = rounds.advancePerGroup || 2  // ← ADD THIS
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

  const handleMatchClick = (matchIndex) => {
    alert('Enter score coming soon!')
  }

  const handleSaveScore = async () => {
    // Will be implemented later
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
          {groups.map((group, idx) => (
            <div key={idx} style={{ marginBottom: '16px' }}>
              <div style={{
                fontSize: '14px',
                fontWeight: '600',
                color: '#1a2a1a',
                marginBottom: '8px',
              }}>
                {group.groupName}
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
                          marginTop: '4px',
                          padding: '4px',
                          background: 'rgba(74, 222, 128, 0.15)',
                          borderRadius: '4px',
                          fontSize: '11px',
                          color: '#4ade80',
                          textAlign: 'center',
                        }}>
                          ✅ Advances to Knockout
                        </div>
                      )}
                    </div>
                  )
                })}
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
                        if (isReady) handleMatchClick(matchIndex)
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
    </div>
  )
}
