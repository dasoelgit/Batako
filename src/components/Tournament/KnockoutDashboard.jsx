// src/components/Tournament/KnockoutDashboard.jsx
import { useState, useEffect } from 'react'
import { supabase } from '../../utils/supabase'
import { teamLabel } from '../../utils/helpers'
import { updateKnockoutWinner } from '../../utils/tournament'
import { verifyPIN, getPINFromStorage, savePINToStorage, removePINFromStorage } from '../../utils/pinUtils'
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

  // --- Admin PIN State ---
  const [isAdmin, setIsAdmin] = useState(false)
  const [showPinModal, setShowPinModal] = useState(false)
  const [pinInput, setPinInput] = useState('')
  const [pinError, setPinError] = useState('')
  const [checkingPin, setCheckingPin] = useState(false)

  const rounds = tournamentData.rounds || []
  const totalRounds = rounds.length
  const isDoubles = tournamentData.type === 'knockout' && tournamentData.match_type === 'doubles'

  // --- Check saved PIN ---
  useEffect(() => {
    if (tournamentData) {
      const savedPin = getPINFromStorage(tournamentData.id)
      if (savedPin) {
        verifyPIN(savedPin, tournamentData.admin_pin_hash).then(isValid => {
          if (isValid) {
            setIsAdmin(true)
          } else {
            removePINFromStorage(tournamentData.id)
          }
        })
      }
    }
  }, [tournamentData])

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

  // --- Admin PIN Functions ---
  const handleEnterPin = async () => {
    setPinError('')
    setCheckingPin(true)

    try {
      const isValid = await verifyPIN(pinInput, tournamentData.admin_pin_hash)
      if (isValid) {
        setIsAdmin(true)
        savePINToStorage(tournamentData.id, pinInput)
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
    removePINFromStorage(tournamentData.id)
  }

  // ... rest of the functions (getMatchLabel, getTeamName, isMatchReady, handleMatchClick, handleSaveScore, getRoundName) ...

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
        {isAdmin && ' · 🔓 Admin Mode'}
      </div>

      <ChampionDisplay
        champion={champion}
        bronzeWinner={bronzeWinner}
        getMatchLabel={getMatchLabel}
      />

      {/* Bracket — Scrollable container */}
      <div style={{
        overflowX: 'auto',
        WebkitOverflowScrolling: 'touch',
        marginBottom: '16px',
        borderRadius: '8px',
      }}>
        <BracketMatchList
          rounds={rounds}
          getMatchLabel={getMatchLabel}
          getTeamName={getTeamName}
          isMatchReady={isMatchReady}
          onMatchClick={handleMatchClick}
        />
      </div>

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

      {/* Lock/Admin Icon — OUTSIDE the scrollable container */}
      <div style={{
        display: 'flex',
        justifyContent: 'flex-end',
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
    </div>
  )
}
