// src/components/Tournament/TournamentDashboard.jsx
import { useState, useEffect } from 'react'
import { supabase } from '../../utils/supabase'
import {
  calculateTournamentStandings,
  isTournamentComplete,
  isRoundComplete,
  generateMexicanoPairings,
} from '../../utils/tournament'
import { teamLabel } from '../../utils/helpers'
import { verifyPIN, getPINFromStorage, savePINToStorage, removePINFromStorage } from '../../utils/pinUtils'
import KnockoutDashboard from './KnockoutDashboard'
import ScoreModal from './ScoreModal'

export default function TournamentDashboard({ tournamentId, onTournamentComplete, onBack }) {
  const [tournament, setTournament] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedRound, setSelectedRound] = useState(1)
  const [showScoreModal, setShowScoreModal] = useState(false)
  const [selectedMatchIndex, setSelectedMatchIndex] = useState(null)
  const [score1, setScore1] = useState('')
  const [score2, setScore2] = useState('')
  const [busy, setBusy] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const [showPinModal, setShowPinModal] = useState(false)
  const [pinInput, setPinInput] = useState('')
  const [pinError, setPinError] = useState('')
  const [checkingPin, setCheckingPin] = useState(false)

  useEffect(() => {
    if (tournament) {
      const savedPin = getPINFromStorage(tournament.id)
      if (savedPin) {
        verifyPIN(savedPin, tournament.admin_pin_hash).then(isValid => {
          if (isValid) {
            setIsAdmin(true)
          } else {
            removePINFromStorage(tournament.id)
          }
        })
      }
    }
  }, [tournament])

  useEffect(() => {
    loadTournament()
  }, [tournamentId])

  const loadTournament = async () => {
    setLoading(true)
    setError('')
    try {
      const { data, error } = await supabase
        .from('tennis_tournaments')
        .select('*')
        .eq('id', tournamentId)
        .single()

      if (error) throw error
      setTournament(data)
      setSelectedRound(data.current_round || 1)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const getRoundStatus = (roundNumber) => {
    if (!tournament) return 'not_started'
    const round = tournament.rounds.find(r => r.round_number === roundNumber)
    if (!round || round.matches.length === 0) return 'not_started'
    
    const allCompleted = round.matches.every(m => m.completed || m.isBye)
    if (allCompleted) return 'complete'
    
    const anyCompleted = round.matches.some(m => m.completed)
    if (anyCompleted) return 'in_progress'
    
    return 'not_started'
  }

  const getMatchLabel = (team) => {
    if (!team) return 'BYE'
    const players = team.filter(p => p && !p.isBye)
    if (players.length === 0) return 'BYE'
    if (players.length === 1) return players[0].name
    return players.map(p => p.name).join(' / ')
  }

  const handleMatchClick = (matchIndex) => {
    const round = tournament.rounds.find(r => r.round_number === selectedRound)
    const match = round.matches[matchIndex]
    
    if (match.isBye) return
    
    if (match.completed && !isAdmin) {
      alert('🔒 Only the tournament admin can edit completed matches.')
      return
    }
    
    setSelectedMatchIndex(matchIndex)
    setScore1(match.completed ? String(match.score1) : '')
    setScore2(match.completed ? String(match.score2) : '')
    setShowScoreModal(true)
  }

  const handleEnterPin = async () => {
    setPinError('')
    setCheckingPin(true)

    try {
      const isValid = await verifyPIN(pinInput, tournament.admin_pin_hash)
      if (isValid) {
        setIsAdmin(true)
        savePINToStorage(tournament.id, pinInput)
        setShowPinModal(false)
        setPinInput('')
      } else {
        setPinError('Wrong PIN')
      }
    } catch (err) {
      setPinError('Error verifying PIN')
    } finally {
      setCheckingPin(false)
    }
  }

  const handleLock = () => {
    setIsAdmin(false)
    removePINFromStorage(tournament.id)
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

      const updatedRounds = [...tournament.rounds]
      const roundIndex = updatedRounds.findIndex(r => r.round_number === selectedRound)
      const match = updatedRounds[roundIndex].matches[selectedMatchIndex]

      let winner = null
      let draw = false
      if (s1 > s2) winner = 1
      else if (s2 > s1) winner = 2
      else draw = true

      let team1Players = []
      let team2Players = []

      if (tournament.type === 'fixed_partner') {
        const t1 = match.team1 || []
        const t2 = match.team2 || []
        
        if (t1.length > 0 && t1[0]?.player1) {
          team1Players = t1.map(p => p.player1).concat(t1.map(p => p.player2)).filter(Boolean)
        } else {
          team1Players = t1.filter(p => p && !p.isBye)
        }
        
        if (t2.length > 0 && t2[0]?.player1) {
          team2Players = t2.map(p => p.player1).concat(t2.map(p => p.player2)).filter(Boolean)
        } else {
          team2Players = t2.filter(p => p && !p.isBye)
        }
      } else {
        team1Players = match.team1?.filter(p => p && !p.isBye) || []
        team2Players = match.team2?.filter(p => p && !p.isBye) || []
      }

      const existingMatchId = match.match_id
      let matchData

      if (existingMatchId) {
        const { data, error: updateError } = await supabase
          .from('tennis_matches')
          .update({
            sets: [{
              set_number: 1,
              team1_games: s1,
              team2_games: s2,
              winner: winner,
              tiebreak: null,
            }],
            team1_games: s1,
            team2_games: s2,
            winner: winner,
            draw: draw,
            completed_at: new Date().toISOString(),
          })
          .eq('id', existingMatchId)
          .select()
          .single()

        if (updateError) throw updateError
        matchData = data
      } else {
        const { data, error: insertError } = await supabase
          .from('tennis_matches')
          .insert({
            play_type: tournament.type === 'singles' ? 'singles' : 'doubles',
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
            tournament_id: tournament.id,
            is_tournament_match: true,
            completed_at: new Date().toISOString(),
          })
          .select()
          .single()

        if (insertError) throw insertError
        matchData = data

        const { error: linkError } = await supabase
          .from('tennis_tournament_matches')
          .insert({
            tournament_id: tournament.id,
            match_id: matchData.id,
            round_number: selectedRound,
          })

        if (linkError) throw linkError
        match.match_id = matchData.id
      }

      match.completed = true
      match.score1 = s1
      match.score2 = s2

      // Mexicano: generate next round pairings
      if (tournament.type === 'mexicano') {
        const currentRoundComplete = isRoundComplete(updatedRounds[roundIndex])
        const nextRoundNumber = selectedRound + 1
        
        if (currentRoundComplete && nextRoundNumber <= tournament.total_rounds) {
          const standings = calculateTournamentStandings(
            tournament.players,
            updatedRounds.slice(0, nextRoundNumber - 1),
            tournament.standing_by
          )
          
          const standingsObj = {}
          standings.forEach(s => {
            standingsObj[s.id] = { points: s.Pts }
          })
          
          const previousPairings = []
          const byeCounts = {}
          for (let r = 0; r < nextRoundNumber - 1; r++) {
            const prevRound = updatedRounds[r]
            if (prevRound) {
              prevRound.matches.forEach(m => {
                if (m.isBye) {
                  const byeId = m.team1?.[0]?.id
                  if (byeId) byeCounts[byeId] = (byeCounts[byeId] || 0) + 1
                  return
                }
                if (!m.isBye && m.team1 && m.team2) {
                  const t1Ids = m.team1.filter(p => p && !p.isBye).map(p => p.id).sort()
                  const t2Ids = m.team2.filter(p => p && !p.isBye).map(p => p.id).sort()
                  if (t1Ids.length > 0 && t2Ids.length > 0) {
                    previousPairings.push([...t1Ids, ...t2Ids])
                  }
                }
              })
            }
          }
          
          const newPairings = generateMexicanoPairings(
            tournament.players,
            standingsObj,
            nextRoundNumber,
            previousPairings,
            byeCounts
          )
          
          let nextRound = updatedRounds.find(r => r.round_number === nextRoundNumber)
          if (nextRound) {
            nextRound.matches = newPairings
          } else {
            updatedRounds.push({
              round_number: nextRoundNumber,
              matches: newPairings,
            })
          }
        }
      }

      const { error: updateError } = await supabase
        .from('tennis_tournaments')
        .update({ rounds: updatedRounds })
        .eq('id', tournament.id)

      if (updateError) throw updateError

      setTournament(prev => ({ ...prev, rounds: updatedRounds }))
      setShowScoreModal(false)
      setSelectedMatchIndex(null)
      setScore1('')
      setScore2('')
      setBusy(false)

      window.dispatchEvent(new Event('refreshData'))

      if (isTournamentComplete(updatedRounds, tournament.total_rounds)) {
        await supabase
          .from('tennis_tournaments')
          .update({ status: 'completed', completed_at: new Date().toISOString() })
          .eq('id', tournament.id)
        onTournamentComplete(tournament.id)
      }
    } catch (err) {
      setError(err.message || 'Failed to save score')
      setBusy(false)
    }
  }

  const handleStartLive = async () => {
    alert('Live Scoreboard coming soon!')
  }

  const handleRoundChange = (roundNumber) => {
    setSelectedRound(roundNumber)
  }

  if (loading) return <div className="loading">Loading tournament...</div>
  if (error) return <div className="empty-state">Error: {error}</div>
  if (!tournament) return <div className="empty-state">Tournament not found</div>

  // --- KNOCKOUT ---
  if (tournament.type === 'knockout') {
    return (
      <KnockoutDashboard
        tournament={tournament}
        onTournamentComplete={onTournamentComplete}
        onBack={onBack}
      />
    )
  }

  const tournamentLabels = {
    americano: 'Americano',
    mexicano: 'Mexicano',
    singles: 'Singles',
    fixed_partner: 'Fixed Partner',
  }

  const standings = calculateTournamentStandings(
    tournament.players,
    tournament.rounds,
    tournament.standing_by,
    tournament.type
  )

  const currentRoundData = tournament.rounds.find(r => r.round_number === selectedRound)
  const roundStatus = getRoundStatus(selectedRound)
  const totalRounds = tournament.total_rounds

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

      {/* Header */}
      <div style={{
        fontSize: '20px',
        fontWeight: '700',
        color: '#d4a843',
        textAlign: 'center',
        marginBottom: '4px',
      }}>
        🏆 {tournament.name}
      </div>

      <div style={{
        fontSize: '13px',
        color: '#6a7a6a',
        textAlign: 'center',
        marginBottom: '16px',
      }}>
        {tournamentLabels[tournament.type] || 'Unknown'} · {tournament.players.length} {tournament.type === 'fixed_partner' ? 'teams' : 'players'} · By {tournament.standing_by === 'win' ? 'Win (3-0)' : 'Point (score-based)'}
        {tournament.status === 'completed' && ' · ✅ Completed'}
        {isAdmin && ' · 🔓 Admin Mode'}
      </div>

      {/* Standings */}
      <div style={{ marginBottom: '16px' }}>
        <span style={{
          fontSize: '13px',
          fontWeight: '600',
          color: '#1a2a1a',
          display: 'block',
          marginBottom: '8px',
        }}>
          📊 Standings
        </span>
        <div style={{
          background: '#f8faf8',
          borderRadius: '8px',
          padding: '8px 12px',
        }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: '30px 1fr 30px 30px 30px 40px 50px',
            gap: '4px',
            padding: '6px 0',
            borderBottom: '1px solid #d0ddd0',
            fontSize: '10px',
            color: '#6a7a6a',
            textTransform: 'uppercase',
            fontWeight: '600',
            letterSpacing: '0.05em',
          }}>
            <div>#</div>
            <div>Player</div>
            <div style={{ textAlign: 'center' }}>W</div>
            <div style={{ textAlign: 'center' }}>L</div>
            <div style={{ textAlign: 'center' }}>T</div>
            <div style={{ textAlign: 'center' }}>Pts</div>
            <div style={{ textAlign: 'right' }}>+/-</div>
          </div>

          {standings.map((s, i) => {
            const diff = s.diff || 0
            const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i+1}.`

            return (
              <div key={s.id} style={{
                display: 'grid',
                gridTemplateColumns: '30px 1fr 30px 30px 30px 40px 50px',
                gap: '4px',
                padding: '6px 0',
                borderBottom: i < standings.length - 1 ? '1px solid #e8f0e6' : 'none',
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
                <div style={{ textAlign: 'center', fontWeight: '600' }}>{s.W}</div>
                <div style={{ textAlign: 'center', color: '#6a7a6a' }}>{s.L}</div>
                <div style={{ textAlign: 'center', color: '#d4a843' }}>{s.T}</div>
                <div style={{ textAlign: 'center', fontWeight: '700', color: '#d4a843' }}>{s.Pts}</div>
                <div style={{
                  textAlign: 'right',
                  fontWeight: '600',
                  color: diff > 0 ? '#4ade80' : diff < 0 ? '#f87171' : '#6a7a6a',
                }}>
                  {diff > 0 ? `+${diff}` : diff}
                </div>
              </div>
            )
          })}
        </div>
        <div style={{
          fontSize: '9px',
          color: '#6a7a6a',
          textAlign: 'center',
          marginTop: '4px',
        }}>
          {tournament.standing_by === 'win'
            ? '3 pts Win · 1 pt Draw · 0 pts Loss'
            : 'Points based on games won'}
        </div>
      </div>

      {/* Round Tabs */}
      <div style={{ marginBottom: '16px' }}>
        <div style={{
          display: 'flex',
          gap: '4px',
          flexWrap: 'wrap',
          justifyContent: 'center',
        }}>
          {Array.from({ length: totalRounds }, (_, i) => i + 1).map((r) => {
            const status = getRoundStatus(r)
            const isActive = selectedRound === r
            const statusIcon = status === 'complete' ? '✅' : status === 'in_progress' ? '⏳' : ''

            return (
              <button
                key={r}
                onClick={() => handleRoundChange(r)}
                style={{
                  padding: '6px 12px',
                  borderRadius: '6px',
                  border: isActive ? '2px solid #d4e94b' : '1px solid #d0ddd0',
                  background: isActive ? '#d4e94b' : status === 'complete' ? '#e8f5e9' : '#ffffff',
                  color: isActive ? '#1a2a1a' : '#6a7a6a',
                  fontWeight: isActive ? '700' : '400',
                  cursor: 'pointer',
                  fontSize: '12px',
                  transition: 'all 0.2s ease',
                }}
              >
                R{r} {statusIcon}
              </button>
            )
          })}
        </div>
      </div>

      {/* Round Matches */}
      {currentRoundData && currentRoundData.matches.length > 0 ? (
        <>
          <div style={{
            fontSize: '13px',
            fontWeight: '600',
            color: '#1a2a1a',
            marginBottom: '8px',
          }}>
            Round {selectedRound}
            {roundStatus === 'complete' && ' ✅ Complete'}
            {roundStatus === 'in_progress' && ' ⏳ In Progress'}
          </div>

          {currentRoundData.matches.map((match, index) => {
            if (match.isBye) return null

            const team1Label = getMatchLabel(match.team1)
            const team2Label = getMatchLabel(match.team2)
            const isCompleted = match.completed

            return (
              <div
                key={index}
                onClick={() => handleMatchClick(index)}
                style={{
                  border: '1px solid #d0ddd0',
                  borderRadius: '8px',
                  padding: '12px 16px',
                  marginBottom: '8px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  background: isCompleted ? 'rgba(74, 222, 128, 0.08)' : '#ffffff',
                  opacity: isCompleted && !isAdmin ? 0.85 : 1,
                }}
                onMouseEnter={(e) => {
                  if (!isCompleted || isAdmin) {
                    e.currentTarget.style.background = isCompleted ? 'rgba(74, 222, 128, 0.15)' : '#f8faf8'
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isCompleted || isAdmin) {
                    e.currentTarget.style.background = isCompleted ? 'rgba(74, 222, 128, 0.08)' : '#ffffff'
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
                      {isAdmin && <span style={{ marginLeft: '8px', fontSize: '11px', color: '#f97316' }}>✏️ Tap to edit</span>}
                    </div>
                  )}
                  {!isCompleted && (
                    <div style={{ fontSize: '12px', color: '#6a7a6a' }}>
                      Tap to enter score →
                    </div>
                  )}
                </div>
                <div>
                  {isCompleted ? (
                    <span style={{ fontSize: '18px' }}>✅</span>
                  ) : (
                    <span style={{ fontSize: '18px', color: '#fbbf24' }}>⏳</span>
                  )}
                </div>
              </div>
            )
          })}
        </>
      ) : (
        <div style={{
          textAlign: 'center',
          padding: '20px',
          color: '#6a7a6a',
          background: '#f8faf8',
          borderRadius: '8px',
        }}>
          {tournament.type === 'mexicano' && selectedRound > 1
            ? 'Matches will be generated when previous round is complete.'
            : 'No matches for this round yet.'}
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

      {/* Lock/Admin Icon */}
      <div style={{
        display: 'flex',
        justifyContent: 'flex-end',
        marginTop: '16px',
        paddingTop: '12px',
        borderTop: '1px solid #e8f0e6',
      }}>
        <button
          onClick={isAdmin ? handleLock : () => setShowPinModal(true)}
          style={{
            background: 'none',
            border: 'none',
            fontSize: '20px',
            cursor: 'pointer',
            padding: '4px 8px',
            color: isAdmin ? '#f97316' : '#6a7a6a',
          }}
          title={isAdmin ? 'Lock admin mode' : 'Enter admin PIN'}
        >
          {isAdmin ? '🔒' : '🔓'}
        </button>
      </div>

      {/* PIN Modal */}
      {showPinModal && (
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
            setShowPinModal(false)
            setPinInput('')
            setPinError('')
          }}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: '12px',
              padding: '24px',
              maxWidth: '360px',
              width: '100%',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ margin: '0 0 8px 0', color: '#1a2a1a' }}>🔐 Enter Admin PIN</h3>
            <p style={{ fontSize: '13px', color: '#6a7a6a', marginBottom: '16px' }}>
              Enter the PIN for this tournament
            </p>

            <input
              type="password"
              inputMode="numeric"
              placeholder="4-digit PIN"
              value={pinInput}
              onChange={(e) => setPinInput(e.target.value.replace(/[^0-9]/g, ''))}
              maxLength={4}
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '8px',
                border: '1px solid #d0ddd0',
                background: '#ffffff',
                color: '#1a2a1a',
                fontSize: '24px',
                textAlign: 'center',
                letterSpacing: '8px',
                outline: 'none',
                marginBottom: '12px',
              }}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleEnterPin()
              }}
            />

            {pinError && (
              <div style={{
                background: 'rgba(214,67,47,0.12)',
                color: '#c0392b',
                padding: '8px',
                borderRadius: '6px',
                fontSize: '13px',
                marginBottom: '12px',
                textAlign: 'center',
              }}>
                {pinError}
              </div>
            )}

            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                className="btn-secondary"
                style={{ flex: 1 }}
                onClick={() => {
                  setShowPinModal(false)
                  setPinInput('')
                  setPinError('')
                }}
              >
                Cancel
              </button>
              <button
                className="btn-primary"
                style={{ flex: 1 }}
                onClick={handleEnterPin}
                disabled={pinInput.length !== 4 || checkingPin}
              >
                {checkingPin ? 'Checking...' : 'Unlock'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Score Modal */}
      {showScoreModal && selectedMatchIndex !== null && currentRoundData && (
        <ScoreModal
          team1Label={getMatchLabel(currentRoundData.matches[selectedMatchIndex].team1)}
          team2Label={getMatchLabel(currentRoundData.matches[selectedMatchIndex].team2)}
          roundLabel={`Round ${selectedRound}`}
          isAdmin={isAdmin}
          isEditing={isAdmin && currentRoundData.matches[selectedMatchIndex]?.completed}
          score1={score1}
          setScore1={setScore1}
          score2={score2}
          setScore2={setScore2}
          error={error}
          busy={busy}
          onSave={handleSaveScore}
          onCancel={() => {
            setShowScoreModal(false)
            setSelectedMatchIndex(null)
            setScore1('')
            setScore2('')
            setError('')
          }}
          onStartLive={handleStartLive}
        />
      )}
    </div>
  )
}
