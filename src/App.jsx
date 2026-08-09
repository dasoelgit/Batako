// src/App.jsx
import { Fragment, useEffect, useState, useRef } from 'react'
import { supabase, TENNIS_ADMIN_PIN } from './utils/supabase'
import { teamLabel, formatJakartaTime } from './utils/helpers'
import MatchSetup from './components/MatchSetup'
import LiveConfig from './components/LiveConfig'
import LiveScoreboard from './components/LiveScoreboard'
import LiveScoreboardLandscape from './components/LiveScoreboardLandscape'

// ============================================================
// LEADERBOARD
// ============================================================
function buildStandings(matches) {
  const stats = new Map()
  const ensure = (p) => {
    if (!stats.has(p.id)) stats.set(p.id, { name: p.name, wins: 0, losses: 0, draws: 0, sets_won: 0, sets_lost: 0 })
    return stats.get(p.id)
  }

  for (const m of matches) {
    if (m.status !== 'completed') continue

    const isDraw = m.draw === true

    for (const p of m.team1_players) {
      const s = ensure(p)
      if (!isDraw && m.winner === 1) s.wins += 1
      else if (!isDraw && m.winner === 2) s.losses += 1
      else if (isDraw) s.draws += 1
    }
    for (const p of m.team2_players) {
      const s = ensure(p)
      if (!isDraw && m.winner === 2) s.wins += 1
      else if (!isDraw && m.winner === 1) s.losses += 1
      else if (isDraw) s.draws += 1
    }

    for (const set of m.sets || []) {
      if (set.winner === 1) {
        for (const p of m.team1_players) ensure(p).sets_won += 1
        for (const p of m.team2_players) ensure(p).sets_lost += 1
      } else if (set.winner === 2) {
        for (const p of m.team2_players) ensure(p).sets_won += 1
        for (const p of m.team1_players) ensure(p).sets_lost += 1
      }
    }
  }

  const rows = Array.from(stats.values()).map((s) => ({
    ...s,
    matches: s.wins + s.losses + s.draws,
    points: s.wins * 3 + s.draws * 1,
  }))

  rows.sort((a, b) => b.points - a.points || b.sets_won - b.sets_lost || a.name.localeCompare(b.name))
  return rows
}

function Leaderboard({ refreshKey }) {
  const [rows, setRows] = useState(null)

  useEffect(() => {
    let active = true
    supabase
      .from('tennis_matches')
      .select('winner, draw, team1_players, team2_players, status, sets')
      .eq('status', 'completed')
      .then(({ data }) => {
        if (active && data) setRows(buildStandings(data))
      })
    return () => { active = false }
  }, [refreshKey])

  if (rows === null) return <div className="loading">Loading standings…</div>
  if (rows.length === 0) return <div className="empty-state">No completed matches yet.</div>

  return (
    <div className="card">
      <div style={{
        display: 'grid',
        gridTemplateColumns: '30px 1fr 36px 36px 40px 50px',
        gap: '6px',
        padding: '8px 0',
        borderBottom: '1px solid var(--border)',
        fontSize: '10px',
        color: 'var(--text-muted)',
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
        fontWeight: '600',
      }}>
        <div>#</div>
        <div>Player</div>
        <div style={{ textAlign: 'center' }}>W</div>
        <div style={{ textAlign: 'center' }}>D</div>
        <div style={{ textAlign: 'center' }}>L</div>
        <div style={{ textAlign: 'right' }}>Pts</div>
      </div>

      {rows.map((r, i) => (
        <div key={r.name} style={{
          display: 'grid',
          gridTemplateColumns: '30px 1fr 36px 36px 40px 50px',
          gap: '6px',
          padding: '8px 0',
          borderBottom: '1px solid var(--border-light)',
          alignItems: 'center',
          fontSize: '13px',
        }}>
          <div style={{ textAlign: 'center', fontWeight: '700', color: 'var(--text-muted)' }}>{i + 1}</div>
          <div style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{r.name}</div>
          <div style={{ textAlign: 'center', fontWeight: '600', color: 'var(--accent-dark)' }}>{r.wins}</div>
          <div style={{ textAlign: 'center', fontWeight: '600', color: 'var(--gold)' }}>{r.draws}</div>
          <div style={{ textAlign: 'center', fontWeight: '600', color: 'var(--text-muted)' }}>{r.losses}</div>
          <div style={{ textAlign: 'right', fontWeight: '700', color: 'var(--gold)' }}>
            {r.points}
          </div>
        </div>
      ))}

      <div style={{
        fontSize: '10px',
        color: 'var(--text-muted)',
        textAlign: 'center',
        marginTop: '8px',
        borderTop: '1px solid var(--border-light)',
        paddingTop: '8px',
      }}>
        3 pts Win · 1 pt Draw · 0 pts Loss
      </div>
    </div>
  )
}

// ============================================================
// HISTORY
// ============================================================
function History({ refreshKey }) {
  const [matches, setMatches] = useState(null)

  useEffect(() => {
    let active = true
    supabase
      .from('tennis_matches')
      .select('*')
      .eq('status', 'completed')
      .order('completed_at', { ascending: false })
      .limit(50)
      .then(({ data }) => {
        if (active && data) setMatches(data)
      })
    return () => { active = false }
  }, [refreshKey])

  if (matches === null) return <div className="loading">Loading history…</div>
  if (matches.length === 0) return <div className="empty-state">No matches played yet.</div>

  return (
    <div className="card">
      {matches.map((m) => {
        const isDraw = m.draw === true
        return (
          <div key={m.id} className="history-row">
            <div className="history-teams">
              <span className={!isDraw && m.winner === 1 ? 'history-winner' : ''}>
                {teamLabel(m.team1_players)}
              </span>
              <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>vs</span>
              <span className={!isDraw && m.winner === 2 ? 'history-winner' : ''}>
                {teamLabel(m.team2_players)}
              </span>
            </div>
            <div className="history-games">
              {isDraw ? (
                <span style={{ color: 'var(--gold)', fontWeight: '600' }}>⚖️ DRAW</span>
              ) : (
                <span style={{ color: 'var(--accent-dark)', fontWeight: '600' }}>
                  {m.winner === 1 ? teamLabel(m.team1_players) : teamLabel(m.team2_players)} WINS
                </span>
              )}
              {' · '}
              {m.sets?.map((s, i) => (
                <span key={i}>
                  {i > 0 && ' · '}
                  {s.team1_games}-{s.team2_games}
                  {s.tiebreak && ` (${s.tiebreak})`}
                </span>
              ))}
            </div>
            <div className="history-games" style={{ marginTop: 4 }}>
              {formatJakartaTime(m.completed_at)}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ============================================================
// ADMIN PANEL
// ============================================================
function AdminPlayers({ players, refreshPlayers }) {
  const [newName, setNewName] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const addPlayer = async () => {
    const trimmed = newName.trim()
    if (!trimmed) return
    setBusy(true)
    setError('')
    const { error: insertError } = await supabase.from('tennis_players').insert({ name: trimmed })
    setBusy(false)
    if (insertError) {
      setError(insertError.code === '23505' ? 'That player already exists.' : insertError.message)
      return
    }
    setNewName('')
    refreshPlayers()
  }

  return (
    <div className="card">
      <span className="field-label">Add player</span>
      <div style={{ display: 'flex', gap: 8 }}>
        <input
          type="text"
          placeholder="Player name"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          style={{ marginBottom: 0 }}
        />
        <button
          className="btn-primary"
          style={{ width: 'auto', padding: '0 16px' }}
          disabled={busy || !newName.trim()}
          onClick={addPlayer}
        >
          Add
        </button>
      </div>
      {error && (
        <div style={{
          background: 'rgba(214,67,47,0.12)',
          color: '#c0392b',
          padding: '10px',
          borderRadius: '6px',
          fontSize: '13px',
          marginTop: '12px',
          textAlign: 'center',
        }}>
          {error}
        </div>
      )}
      <div style={{ marginTop: 16 }}>
        <span className="field-label">All players ({players.length})</span>
        {players.map((p) => (
          <div key={p.id} className="leaderboard-row" style={{ gridTemplateColumns: '1fr auto' }}>
            <div className="player-name">{p.name}</div>
            <button
              className="btn-secondary"
              style={{ width: 'auto', padding: '4px 12px' }}
              onClick={() => {
                if (confirm(`Remove ${p.name}?`)) {
                  supabase.from('tennis_players').delete().eq('id', p.id).then(() => refreshPlayers())
                }
              }}
            >
              Remove
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

function AdminPanel({ players, refreshPlayers }) {
  const [authed, setAuthed] = useState(false)
  const [pin, setPin] = useState('')
  const [pinError, setPinError] = useState('')

  if (!authed) {
    return (
      <div className="card">
        <span className="field-label">Admin PIN</span>
        <input
          type="text"
          inputMode="numeric"
          placeholder="Enter PIN"
          value={pin}
          onChange={(e) => setPin(e.target.value.replace(/[^0-9]/g, ''))}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              if (pin === TENNIS_ADMIN_PIN) {
                setAuthed(true)
                setPinError('')
              } else {
                setPinError('Wrong PIN')
              }
            }
          }}
        />
        {pinError && (
          <div style={{
            background: 'rgba(214,67,47,0.12)',
            color: '#c0392b',
            padding: '10px',
            borderRadius: '6px',
            fontSize: '13px',
            marginBottom: '12px',
            textAlign: 'center',
          }}>
            {pinError}
          </div>
        )}
        <button
          className="btn-primary"
          onClick={() => {
            if (pin === TENNIS_ADMIN_PIN) {
              setAuthed(true)
              setPinError('')
            } else {
              setPinError('Wrong PIN')
            }
          }}
        >
          Unlock
        </button>
      </div>
    )
  }

  return <AdminPlayers players={players} refreshPlayers={refreshPlayers} />
}

// ============================================================
// APP
// ============================================================
export default function App() {
  const [tab, setTab] = useState('live')
  const [activeMatch, setActiveMatch] = useState(null)
  const [isLandscape, setIsLandscape] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)
  const [players, setPlayers] = useState([])
  const [showAdmin, setShowAdmin] = useState(false)

  // Tap to reveal admin
  const [tapCount, setTapCount] = useState(0)
  const tapTimer = useRef(null)

  // Live Config state
  const [showLiveConfig, setShowLiveConfig] = useState(false)
  const [liveTeamData, setLiveTeamData] = useState(null)

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

  return (
    <div className="app-shell">
      <div className="brand" onClick={handleTitleTap} style={{ cursor: 'pointer' }}>
        <div className="brand-title">🎾 TENNIS SCORE</div>
      </div>

      <div className="tabs">
        <button
          className={`tab ${tab === 'live' ? 'active' : ''}`}
          onClick={() => setTab('live')}
        >
          Match
        </button>
        <button
          className={`tab ${tab === 'leaderboard' ? 'active' : ''}`}
          onClick={() => setTab('leaderboard')}
        >
          Leaderboard
        </button>
        <button
          className={`tab ${tab === 'history' ? 'active' : ''}`}
          onClick={() => setTab('history')}
        >
          History
        </button>
        {showAdmin && (
          <button
            className={`tab ${tab === 'admin' ? 'active' : ''}`}
            onClick={() => setTab('admin')}
          >
            ⚙️
          </button>
        )}
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

      {tab === 'leaderboard' && <Leaderboard refreshKey={refreshKey} />}
      {tab === 'history' && <History refreshKey={refreshKey} />}
      {tab === 'admin' && <AdminPanel players={players} refreshPlayers={refreshPlayers} />}
    </div>
  )
}
