// src/components/Tournament/KnockoutDashboard.jsx
import { useState, useEffect } from 'react'
import { supabase } from '../../utils/supabase'
import { teamLabel } from '../../utils/helpers'
import { updateKnockoutWinner } from '../../utils/tournament'
import BracketMatchList from './Knockout/BracketMatchList'
import ChampionDisplay from './Knockout/ChampionDisplay'
import KnockoutScoreModal from './Knockout/KnockoutScoreModal'

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
    const allMatchesCompleted = rounds.every(round =>
      round.matches.every(m => m.completed || m.isBye)
    )
    if (allMatchesCompleted && rounds.length > 0) {
      const finalRound = rounds[rounds.length - 1]
      if (finalRound && !finalRound.isBronze) {
        const finalMatch = finalRound.matches[0]
        if (finalMatch && finalMatch.completed && finalMatch.winner) {
          setChampion(finalMatch.winner)
        }
      }
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

  const isMatchReady = (match) => {
    if (!match) return false
    if (match.completed || match.isBye) return false
    if (!match.team1 || !match.team2) return false
    if (match.team1.length === 0 || match.team2.length === 0) return false
    if (match.team1[0]?.isPlaceholder || match.team2[0]?.isPlaceholder) return false
    return true
  }

  const handleMatchClick = (roundIndex, matchIndex) => {
    const round = rounds[roundIndex]
    const match = round.matches[matchIndex]

    if (match.completed || match.isBye) return
    if (!match.team1 || !match.team2) return
    if (match.team1.length === 0 || match.team2.length === 0) return
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

      let winner = null
      let draw = false
      if (s1 > s2) {
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

      match.completed = true
      match.score1 = s1
      match.score2 = s2
      match.winner = winner

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

      const { error: linkError } = await supabase
        .from('tennis_tournament_matches')
        .insert({
          tournament_id: tournamentData.id,
          match_id: matchData.id,
          round_number: selectedRoundIndex + 1,
        })

      if (linkError) throw linkError

      const nextRoundIndex = selectedRoundIndex + 1
      if (nextRoundIndex < updatedRounds.length && !round.isBronze) {
        const nextRound = updatedRounds[nextRoundIndex]
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

      window.dispatchEvent(new Event('refreshData'))

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

      <ChampionDisplay
        champion={champion}
        bronzeWinner={bronzeWinner}
        getMatchLabel={getMatchLabel}
      />

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

          <BracketMatchList
            matches={round.matches}
            getMatchLabel={getMatchLabel}
            getTeamName={getTeamName}
            onMatchClick={(matchIndex) => handleMatchClick(roundIndex, matchIndex)}
            isReady={isMatchReady}
          />
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

      <KnockoutScoreModal
        isOpen={showScoreModal}
        onClose={() => {
          setShowScoreModal(false)
          setSelectedMatch(null)
          setSelectedRoundIndex(null)
          setSelectedMatchIndex(null)
          setScore1('')
          setScore2('')
          setError('')
        }}
        match={selectedMatch}
        getTeamName={getTeamName}
        roundLabel={selectedMatch?.round ? `Round ${selectedMatch.round}` : 'Match'}
        score1={score1}
        setScore1={setScore1}
        score2={score2}
        setScore2={setScore2}
        error={error}
        busy={busy}
        onSave={handleSaveScore}
      />
    </div>
  )
}
