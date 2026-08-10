// src/components/History/History.jsx
import { useState, useEffect, useRef } from 'react'
import { supabase } from '../../utils/supabase'
import { teamLabel, formatJakartaTime } from '../../utils/helpers'

const ITEMS_PER_PAGE = 20
const DEBOUNCE_DELAY = 300 // ms

export default function History({ refreshKey }) {
  const [matches, setMatches] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalMatches, setTotalMatches] = useState(0)

  // Filters
  const [dateFilter, setDateFilter] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('')

  // Debounce search term
  const debounceTimer = useRef(null)

  useEffect(() => {
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current)
    }
    debounceTimer.current = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm)
    }, DEBOUNCE_DELAY)

    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current)
      }
    }
  }, [searchTerm])

  useEffect(() => {
    loadMatches()
  }, [refreshKey, currentPage, dateFilter, debouncedSearchTerm])

  // Reset to page 1 when filter changes (except page changes)
  useEffect(() => {
    setCurrentPage(1)
  }, [dateFilter, debouncedSearchTerm])

  const loadMatches = async () => {
    setLoading(true)
    setError('')

    try {
      let query = supabase
        .from('tennis_matches')
        .select('*', { count: 'exact' })
        .eq('status', 'completed')
        .order('completed_at', { ascending: false })

      // Date filter
      let cutoffDate = null
      if (dateFilter !== 'all') {
        const now = new Date()
        let cutoff = new Date()
        if (dateFilter === '7days') {
          cutoff.setDate(now.getDate() - 7)
        } else if (dateFilter === '30days') {
          cutoff.setDate(now.getDate() - 30)
        } else if (dateFilter === 'month') {
          cutoff = new Date(now.getFullYear(), now.getMonth(), 1)
        }
        cutoffDate = cutoff
        query = query.gte('completed_at', cutoff.toISOString())
      }

      // Pagination
      const from = (currentPage - 1) * ITEMS_PER_PAGE
      const to = from + ITEMS_PER_PAGE - 1
      query = query.range(from, to)

      const { data, error, count } = await query

      if (error) throw error

      let filteredData = data || []

      // Client-side search filter (using debounced value)
      if (debouncedSearchTerm.trim()) {
        const term = debouncedSearchTerm.trim().toLowerCase()
        filteredData = filteredData.filter(m => {
          const allPlayers = [...(m.team1_players || []), ...(m.team2_players || [])]
          return allPlayers.some(p => p.name.toLowerCase().includes(term))
        })
      }

      // Get total count for pagination
      let totalCount = count || 0
      if (debouncedSearchTerm.trim()) {
        let countQuery = supabase
          .from('tennis_matches')
          .select('*')
          .eq('status', 'completed')
          .order('completed_at', { ascending: false })

        if (cutoffDate) {
          countQuery = countQuery.gte('completed_at', cutoffDate.toISOString())
        }

        const { data: allData } = await countQuery
        const matched = (allData || []).filter(m => {
          const allPlayers = [...(m.team1_players || []), ...(m.team2_players || [])]
          return allPlayers.some(p => p.name.toLowerCase().includes(debouncedSearchTerm.trim().toLowerCase()))
        })
        totalCount = matched.length
        const start = (currentPage - 1) * ITEMS_PER_PAGE
        const end = start + ITEMS_PER_PAGE
        filteredData = matched.slice(start, end)
      }

      setTotalMatches(totalCount)
      setTotalPages(Math.ceil(totalCount / ITEMS_PER_PAGE) || 1)
      setMatches(filteredData)
    } catch (err) {
      setError(err.message)
      console.error('Error loading history:', err)
    } finally {
      setLoading(false)
    }
  }

  const handlePageChange = (page) => {
    if (page < 1 || page > totalPages) return
    setCurrentPage(page)
  }

  if (loading && matches.length === 0) {
    return <div className="loading">Loading history…</div>
  }

  const startItem = totalMatches > 0 ? (currentPage - 1) * ITEMS_PER_PAGE + 1 : 0
  const endItem = Math.min(currentPage * ITEMS_PER_PAGE, totalMatches)

  return (
    <div className="card">
      {/* Filters */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        marginBottom: '16px',
      }}>
        <div style={{
          display: 'flex',
          gap: '8px',
          flexWrap: 'wrap',
        }}>
          <select
            value={dateFilter}
            onChange={(e) => {
              setDateFilter(e.target.value)
            }}
            style={{
              padding: '10px 14px',
              borderRadius: '8px',
              border: '1px solid #d0ddd0',
              background: '#ffffff',
              color: '#1a2a1a',
              fontSize: '14px',
              flex: 1,
              minWidth: '140px',
              outline: 'none',
              appearance: 'auto',
            }}
          >
            <option value="all">📅 All Time</option>
            <option value="7days">📅 Last 7 Days</option>
            <option value="30days">📅 Last 30 Days</option>
            <option value="month">📅 This Month</option>
          </select>

          <input
            type="text"
            placeholder="🔍 Search player name..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value)
            }}
            style={{
              padding: '10px 14px',
              borderRadius: '8px',
              border: '1px solid #d0ddd0',
              background: '#ffffff',
              color: '#1a2a1a',
              fontSize: '14px',
              flex: 2,
              minWidth: '180px',
              outline: 'none',
            }}
          />
        </div>

        {/* Result count */}
        <div style={{
          fontSize: '12px',
          color: '#6a7a6a',
        }}>
          {totalMatches > 0 ? (
            <>Showing {startItem}-{endItem} of {totalMatches} matches</>
          ) : (
            'No matches found'
          )}
        </div>
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

      {matches.length === 0 ? (
        <div className="empty-state">
          {searchTerm ? 'No matches found for that player.' : 'No matches played yet.'}
        </div>
      ) : (
        <>
          {matches.map((m) => {
            const isDraw = m.draw === true
            const isTournament = m.is_tournament_match === true
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
                  {isTournament && (
                    <span style={{
                      fontSize: '10px',
                      marginLeft: '6px',
                      color: '#d4a843',
                      fontWeight: '600',
                    }}>
                      🏆
                    </span>
                  )}
                </div>
                <div className="history-games" style={{ marginTop: 4 }}>
                  {formatJakartaTime(m.completed_at)}
                </div>
              </div>
            )
          })}

          {/* Pagination */}
          {totalPages > 1 && (
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              gap: '6px',
              marginTop: '16px',
              flexWrap: 'wrap',
            }}>
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                style={{
                  padding: '6px 14px',
                  borderRadius: '6px',
                  border: '1px solid #d0ddd0',
                  background: currentPage === 1 ? '#f0f5f0' : '#ffffff',
                  color: currentPage === 1 ? '#b0b0b0' : '#1a2a1a',
                  cursor: currentPage === 1 ? 'default' : 'pointer',
                  fontSize: '13px',
                }}
              >
                Prev
              </button>

              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum
                if (totalPages <= 5) {
                  pageNum = i + 1
                } else if (currentPage <= 3) {
                  pageNum = i + 1
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i
                } else {
                  pageNum = currentPage - 2 + i
                }

                const isActive = pageNum === currentPage

                return (
                  <button
                    key={i}
                    onClick={() => handlePageChange(pageNum)}
                    style={{
                      padding: '6px 14px',
                      borderRadius: '6px',
                      border: isActive ? '2px solid #d4e94b' : '1px solid #d0ddd0',
                      background: isActive ? '#d4e94b' : '#ffffff',
                      color: isActive ? '#1a2a1a' : '#6a7a6a',
                      fontWeight: isActive ? '700' : '400',
                      cursor: 'pointer',
                      fontSize: '13px',
                      minWidth: '36px',
                    }}
                  >
                    {pageNum}
                  </button>
                )
              })}

              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                style={{
                  padding: '6px 14px',
                  borderRadius: '6px',
                  border: '1px solid #d0ddd0',
                  background: currentPage === totalPages ? '#f0f5f0' : '#ffffff',
                  color: currentPage === totalPages ? '#b0b0b0' : '#1a2a1a',
                  cursor: currentPage === totalPages ? 'default' : 'pointer',
                  fontSize: '13px',
                }}
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
