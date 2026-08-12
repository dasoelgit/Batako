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
import StandingsTable from './TournamentDashboard/StandingsTable'
import RoundTabs from './TournamentDashboard/RoundTabs'
import MatchList from './TournamentDashboard/MatchList'
import AdminPinModal from './TournamentDashboard/AdminPinModal'

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

  const isMexicanoRoundLocked = (round, match) => {
    // Once the next round has actual results in it, that round's pairings
    // were decided by this match's score. Editing it after the fact isn't
    // allowed — the host has to live with what was recorded.
    if (tournament.type !== 'mexicano') return false
    if (!match.completed) return false // first-time entry is always fine
    const nextRound = tournament.rounds.find(r => r.round_number === round.round_number + 1)
    return !!nextRound?.matches?.some(m => m.completed)
  }

  const handleMatchClick = (matchIndex) => {
    const round = tournament.rounds.find(r => r.round_number === selectedRound)
    const match = round.matches[matchIndex]
    
    if (match.isBye) return
    
    if (match.completed && !isAdmin) {
      alert('🔒 Only the tournament admin can edit completed matches.')
      return
    }

    if (isMexicanoRoundLocked(round, match)) {
      alert(`🔒 Round ${round.round_number + 1} has already been played based on this result, so this score is locked and can no longer be edited.`)
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

      if (isMexicanoRoundLocked(updatedRounds[roundIndex], match)) {
        setError(`Round ${selectedRound + 1} has already been played based on this result — this score is locked.`)
        setBusy(false)
        return
      }

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
        const existingNextRound = updatedRounds.find(r => r.round_number === nextRoundNumber)
        // If the next round already has a result in it, someone is editing an
        // earlier round's score after play has moved on — don't clobber it.
        const nextRoundAlreadyStarted = existingNextRound?.matches?.some(m => m.completed)
        
        if (currentRoundComplete && nextRoundNumber <= tournament.total_rounds && !nextRoundAlreadyStarted) {
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
          
          if (existingNextRound) {
            existingNextRound.matches = newPairings
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
        <StandingsTable standings={standings} standingBy={tournament.standing_by} />
      </div>

      {/* Round Tabs */}
      <div style={{ marginBottom: '16px' }}>
        <RoundTabs
          totalRounds={totalRounds}
          selectedRound={selectedRound}
          onSelect={handleRoundChange}
          getRoundStatus={getRoundStatus}
        />
      </div>

      {/* Round Matches */}
      <MatchList
        matches={currentRoundData?.matches || []}
        getMatchLabel={getMatchLabel}
        onMatchClick={handleMatchClick}
        isAdmin={isAdmin}
        selectedRound={selectedRound}
        roundStatus={roundStatus}
      />

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
      <AdminPinModal
        isOpen={showPinModal}
        onClose={() => {
          setShowPinModal(false)
          setPinInput('')
          setPinError('')
        }}
        pinInput={pinInput}
        setPinInput={setPinInput}
        pinError={pinError}
        checkingPin={checkingPin}
        onEnterPin={handleEnterPin}
      />

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
