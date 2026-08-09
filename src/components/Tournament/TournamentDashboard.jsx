// src/components/Tournament/TournamentDashboard.jsx
import { useState, useEffect } from 'react'
import { supabase } from '../../utils/supabase'
import {
  calculateTournamentStandings,
  isTournamentComplete,
  isRoundComplete,
  generateMexicanoPairings,
} from '../../utils/tournamentAlgorithms'
import { teamLabel } from '../../utils/helpers'

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
  const [updating, setUpdating] = useState(false)

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
    const round = tournament.rounds.find(r => r.round
