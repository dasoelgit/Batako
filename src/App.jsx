// src/App.jsx
import { Fragment, useEffect, useState, useRef } from 'react'
import { supabase, TENNIS_ADMIN_PIN } from './utils/supabase'
import { teamLabel, formatJakartaTime } from './utils/helpers'

// Match components
import MatchSetup from './components/Match/MatchSetup'
import LiveConfig from './components/Match/LiveConfig'
import LiveScoreboard from './components/Match/LiveScoreboard'
import LiveScoreboardLandscape from './components/Match/LiveScoreboardLandscape'

// Tournament components
import TournamentList from './components/Tournament/TournamentList'
import TournamentSetup from './components/Tournament/TournamentSetup'
import TournamentDashboard from './components/Tournament/TournamentDashboard'

// Stats
import Stats from './components/Stats/Stats'

// History
import History from './components/History/History'

// Admin
import AdminPanel from './components/AdminPanel'

// ============================================================
// APP
// ============================================================
export default function App() {
  const [tab, setTab] = useState('live')
  const [activeMatch, setActiveMatch] = useState(null)
  const [isLandscape, setIsLandscape] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)
  const [players, setPlayers] = useState([])

  // Tap to reveal admin
  const [showAdmin, setShowAdmin] = useState(false)
  const [tapCount, setTapCount] = useState(0)
  const tapTimer = useRef(null)

  // Live Config state
  const [showLiveConfig, setShowLiveConfig] = useState(false)
  const [liveTeamData, setLiveTeamData] = useState(null)

  // Tournament state
  const [tournamentView, setTournamentView] = useState('list')
  const [selectedTournamentId, setSelectedTournamentId] = useState(null)

  const refreshPlayers = async () => {
    const { data } = await supabase.from('tennis_players').select('id, name').order('name')
    if (data) setPlayers(data)
  }

  useEffect(() => {
    refreshPlayers()
  }, [])

  useEffect(() => {
    let active = true
    supabase
      .from('tennis_matches')
      .select('*')
      .eq('status', 'active')
      .maybeSingle()
      .then(({ data }) => {
        if (active) setActiveMatch(data || null)
      })
    return () => { active = false }
  }, [])

  useEffect(() => {
    const channel = supabase
      .channel('tennis-matches-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tennis_matches' }, (payload) => {
        if (payload.eventType === 'DELETE') {
          setActiveMatch((current) => (current && current.id === payload.old.id ? null : current))
          return
        }
        const row = payload.new
        if (row.status === 'active') {
          setActiveMatch(row)
        } else {
          setActiveMatch((current) => (current && current.id === row.id ? null : current))
          setRefreshKey((k) => k + 1)
        }
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  const handleMatchEnded = () => {
    setActiveMatch(null)
    setRefreshKey((k) => k + 1)
  }

  const handleStartLive = (data) => {
    setLiveTeamData(data)
    setShowLiveConfig(true)
  }

  const handleLiveConfigBack = () => {
    setShowLiveConfig(false)
    setLiveTeamData(null)
  }

  const handleLiveMatchCreated = (match) => {
    setShowLiveConfig(false)
    setLiveTeamData(null)
    setActiveMatch(match)
  }

  // ===== TAP TO REVEAL ADMIN =====
  const handleTitleTap = () => {
    setTapCount(prev => prev + 1)

    if (tapTimer.current) clearTimeout(tapTimer.current)
    tapTimer.current = setTimeout(() => {
      setTapCount(0)
    }, 2000)

    if (tapCount + 1 >= 5) {
      setTapCount(0)
      setShowAdmin(true)
    }
  }

  const handleAdminBack = () => {
    setShowAdmin(false)
  }

  // ===== TOURNAMENT HANDLERS =====
  const handleSelectTournament = (id) => {
    setSelectedTournamentId(id)
    setTournamentView('dashboard')
  }

  const handleCreateNewTournament = () => {
    setTournamentView('setup')
  }

  const handleTournamentBack = () => {
    setTournamentView('list')
    setSelectedTournamentId(null)
  }

  const handleTournamentCreated = (tournament) => {
    setSelectedTournamentId(tournament.id)
    setTournamentView('dashboard')
  }

  const handleTournamentComplete = () => {
    setTournamentView('list')
    setSelectedTournamentId(null)
    setRefreshKey(k => k + 1)
  }

  if (isLandscape && activeMatch) {
    return (
      <LiveScoreboardLandscape
        match={activeMatch}
        onMatchEnded={handleMatchEnded}
        onMatchUpdated={(updated) => setActiveMatch(updated)}
        onExit={() => setIsLandscape(false)}
      />
    )
  }

 
// Admin page (overrides everything)
if (showAdmin) {
  return (
    <div className="app-shell">
      <div className="brand">
        <img 
          src="/logo.png" 
          alt="Batako Tennis Club" 
          style={{ 
            height: '50px', 
            width: 'auto',
            maxWidth: '200px',
          }} 
        />
      </div>
      <AdminPanel
        players={players}
        refreshPlayers={refreshPlayers}
        onDataChanged={() => setRefreshKey(k => k + 1)}
        onBack={handleAdminBack}
      />
    </div>
  )
}

// Main app return — EVERYTHING wrapped in one parent
return (
  <div className="app-shell">
    <div className="brand" onClick={handleTitleTap} style={{ cursor: 'pointer' }}>
      <img 
        src="/logo.png" 
        alt="Batako Tennis Club" 
        style={{ 
          height: '50px', 
          width: 'auto',
          maxWidth: '200px',
        }} 
      />
    </div>

    <div className="tabs">
      <button
        className={`tab ${tab === 'live' ? 'active' : ''}`}
        onClick={() => setTab('live')}
      >
        Match
      </button>
      <button
        className={`tab ${tab === 'stats' ? 'active' : ''}`}
        onClick={() => setTab('stats')}
      >
        Stats
      </button>
      <button
        className={`tab ${tab === 'history' ? 'active' : ''}`}
        onClick={() => setTab('history')}
      >
        History
      </button>
      <button
        className={`tab ${tab === 'tournament' ? 'active' : ''}`}
        onClick={() => setTab('tournament')}
      >
        🏆
      </button>
    </div>
    
      {tab === 'live' && (
        showLiveConfig ? (
          <LiveConfig
            team1={liveTeamData.team1}
            team2={liveTeamData.team2}
            matchType={liveTeamData.matchType}
            onBack={handleLiveConfigBack}
            onMatchCreated={handleLiveMatchCreated}
          />
        ) : activeMatch ? (
          <LiveScoreboard
            match={activeMatch}
            onMatchEnded={handleMatchEnded}
            onMatchUpdated={(updated) => setActiveMatch(updated)}
            onEnterLandscape={() => setIsLandscape(true)}
          />
        ) : (
          <MatchSetup
            players={players}
            refreshPlayers={refreshPlayers}
            onMatchCreated={setActiveMatch}
            onStartLive={handleStartLive}
          />
        )
      )}

      {tab === 'stats' && <Stats refreshKey={refreshKey} />}

      {tab === 'history' && <History refreshKey={refreshKey} />}

      {tab === 'tournament' && (
        tournamentView === 'list' ? (
          <TournamentList
            onSelectTournament={handleSelectTournament}
            onCreateNew={handleCreateNewTournament}
          />
        ) : tournamentView === 'setup' ? (
          <TournamentSetup
            players={players}
            onTournamentCreated={handleTournamentCreated}
            onBack={handleTournamentBack}
          />
        ) : tournamentView === 'dashboard' && selectedTournamentId ? (
          <TournamentDashboard
            tournamentId={selectedTournamentId}
            onTournamentComplete={handleTournamentComplete}
            onBack={handleTournamentBack}
          />
        ) : null
      )}
    </div>
  )
}
