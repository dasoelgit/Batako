// src/components/Stats/PlayerStatsModal.jsx
import { useState, useEffect } from 'react'
import { calculatePlayerStats } from '../../utils/playerStats'

export default function PlayerStatsModal({ player, dateFilter = 'all', customStart = '', customEnd = '', onClose }) {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showStatsModal, setShowStatsModal] = useState(false)
  const [showH2hModal, setShowH2hModal] = useState(false)

  useEffect(() => {
    loadStats()
  }, [player, dateFilter, customStart, customEnd])

  const loadStats = async () => {
    setLoading(true)
    const result = await calculatePlayerStats(player.id, dateFilter, customStart, customEnd)
    setStats(result)
    setLoading(false)
  }

  if (loading) {
    return (
      <div style={{
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
      }} onClick={onClose}>
        <div style={{
          background: '#ffffff',
          borderRadius: '12px',
          padding: '40px',
          maxWidth: '480px',
          width: '100%',
          textAlign: 'center',
        }} onClick={e => e.stopPropagation()}>
          <div className="loading">Loading player stats...</div>
        </div>
      </div>
    )
  }

  if (!stats) {
    return (
      <div style={{
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
      }} onClick={onClose}>
        <div style={{
          background: '#ffffff',
          borderRadius: '12px',
          padding: '24px',
          maxWidth: '480px',
          width: '100%',
          textAlign: 'center',
        }} onClick={e => e.stopPropagation()}>
          <div>No data available for this player in this period.</div>
          <button className="btn-primary" style={{ marginTop: '16px' }} onClick={onClose}>Close</button>
        </div>
      </div>
    )
  }

  const { singles, doubles, total, h2h, punchingTarget, nightmare, mostCommon, bestPartner } = stats

  const getResultIcon = (wins, losses, draws) => {
    if (wins > losses) return '✅'
    if (losses > wins) return '❌'
    if (draws > 0) return '⚖️'
    return '—'
  }

  const formatWinRate = (matches, wins) => {
    if (matches === 0) return '—'
    return `${Math.round((wins / matches) * 100)}%`
  }

  return (
    <>
      {/* Main Modal */}
      <div style={{
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
      }} onClick={onClose}>
        <div style={{
          background: '#ffffff',
          borderRadius: '12px',
          padding: '24px',
          maxWidth: '480px',
          width: '100%',
          maxHeight: '90vh',
          overflowY: 'auto',
        }} onClick={e => e.stopPropagation()}>
          {/* Header */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '16px',
          }}>
            <div style={{
              fontSize: '20px',
              fontWeight: '700',
              color: '#1a2a1a',
            }}>
              👤 {player.name}
            </div>
            <button
              onClick={onClose}
              style={{
                background: 'none',
                border: 'none',
                fontSize: '24px',
                cursor: 'pointer',
                color: '#6a7a6a',
              }}
            >
              ✕
            </button>
          </div>

          {/* Career Stats Summary */}
          <div style={{
            background: '#f8faf8',
            borderRadius: '8px',
            padding: '12px 16px',
            marginBottom: '12px',
          }}>
            <div style={{ fontWeight: '600', marginBottom: '4px' }}>📊 Career Stats</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px', fontSize: '13px' }}>
              <div>Matches: <strong>{total.matches}</strong></div>
              <div>Win Rate: <strong>{total.winRate}%</strong></div>
              <div>Wins: <strong>{total.wins}</strong></div>
              <div>Losses: <strong>{total.losses}</strong></div>
              <div>Draws: <strong>{total.draws}</strong></div>
              <div>+/-: <strong style={{ color: total.diff >= 0 ? '#4ade80' : '#f87171' }}>
                {total.diff > 0 ? '+' : ''}{total.diff}
              </strong></div>
            </div>
            <button
              className="btn-secondary"
              style={{ width: 'auto', padding: '4px 12px', fontSize: '12px', marginTop: '8px' }}
              onClick={() => setShowStatsModal(true)}
            >
              📊 View Detail
            </button>
          </div>

          {/* Head-to-Head */}
          <div style={{ marginBottom: '12px' }}>
            <div style={{ fontWeight: '600', marginBottom: '4px' }}>📋 Head-to-Head</div>
            <div style={{
              background: '#f8faf8',
              borderRadius: '8px',
              padding: '8px 12px',
            }}>
              {punchingTarget && (
                <div style={{ padding: '2px 0' }}>
                  🎯 Punching Target: <strong>{punchingTarget.name}</strong> ({punchingTarget.wins}-{punchingTarget.losses})
                </div>
              )}
              {nightmare && (
                <div style={{ padding: '2px 0' }}>
                  👻 Nightmare: <strong>{nightmare.name}</strong> ({nightmare.wins}-{nightmare.losses})
                </div>
              )}
              {h2h.length > 0 && (
                <button
                  className="btn-secondary"
                  style={{ width: 'auto', padding: '4px 12px', fontSize: '12px', marginTop: '4px' }}
                  onClick={() => setShowH2hModal(true)}
                >
                  📋 View Detail ({h2h.length} opponents)
                </button>
              )}
            </div>
          </div>

          {/* Doubles */}
          <div>
            <div style={{ fontWeight: '600', marginBottom: '4px' }}>🎾 Doubles</div>
            <div style={{
              background: '#f8faf8',
              borderRadius: '8px',
              padding: '8px 12px',
            }}>
              {bestPartner && (
                <div style={{ padding: '2px 0' }}>
                  🤝 Best Partner: <strong>{bestPartner.name}</strong> ({bestPartner.wins}-{bestPartner.losses} · {formatWinRate(bestPartner.matches, bestPartner.wins)})
                </div>
              )}
              {mostCommon && (
                <div style={{ padding: '2px 0' }}>
                  Most Common Partner: <strong>{mostCommon.name}</strong> ({mostCommon.matches} matches)
                </div>
              )}
              {!bestPartner && !mostCommon && (
                <div style={{ padding: '2px 0', color: '#6a7a6a' }}>
                  No doubles matches played in this period.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Stats Detail Modal */}
      {showStatsModal && (
        <div style={{
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
          zIndex: 1001,
          padding: '16px',
        }} onClick={() => setShowStatsModal(false)}>
          <div style={{
            background: '#ffffff',
            borderRadius: '12px',
            padding: '24px',
            maxWidth: '480px',
            width: '100%',
            maxHeight: '90vh',
            overflowY: 'auto',
          }} onClick={e => e.stopPropagation()}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '16px',
            }}>
              <div style={{
                fontSize: '18px',
                fontWeight: '700',
                color: '#1a2a1a',
              }}>
                📊 Career Stats — {player.name}
              </div>
              <button
                onClick={() => setShowStatsModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '24px',
                  cursor: 'pointer',
                  color: '#6a7a6a',
                }}
              >
                ✕
              </button>
            </div>

            <div style={{
              background: '#f8faf8',
              borderRadius: '8px',
              padding: '12px 16px',
              overflowX: 'auto',
            }}>
              <table style={{
                width: '100%',
                borderCollapse: 'collapse',
                fontSize: '14px',
              }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #d0ddd0' }}>
                    <th style={{ textAlign: 'left', padding: '6px 8px', color: '#6a7a6a', fontWeight: '600' }}></th>
                    <th style={{ textAlign: 'center', padding: '6px 8px', color: '#1a2a1a', fontWeight: '600' }}>Singles</th>
                    <th style={{ textAlign: 'center', padding: '6px 8px', color: '#1a2a1a', fontWeight: '600' }}>Doubles</th>
                    <th style={{ textAlign: 'center', padding: '6px 8px', color: '#d4a843', fontWeight: '700' }}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  <tr style={{ borderBottom: '1px solid #e8f0e6' }}>
                    <td style={{ padding: '6px 8px', fontWeight: '600', color: '#1a2a1a' }}>Matches</td>
                    <td style={{ textAlign: 'center', padding: '6px 8px' }}>{singles.matches}</td>
                    <td style={{ textAlign: 'center', padding: '6px 8px' }}>{doubles.matches}</td>
                    <td style={{ textAlign: 'center', padding: '6px 8px', fontWeight: '700', color: '#d4a843' }}>{total.matches}</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #e8f0e6' }}>
                    <td style={{ padding: '6px 8px', fontWeight: '600', color: '#1a2a1a' }}>Wins</td>
                    <td style={{ textAlign: 'center', padding: '6px 8px', color: '#4ade80' }}>{singles.wins}</td>
                    <td style={{ textAlign: 'center', padding: '6px 8px', color: '#4ade80' }}>{doubles.wins}</td>
                    <td style={{ textAlign: 'center', padding: '6px 8px', fontWeight: '700', color: '#d4a843' }}>{total.wins}</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #e8f0e6' }}>
                    <td style={{ padding: '6px 8px', fontWeight: '600', color: '#1a2a1a' }}>Losses</td>
                    <td style={{ textAlign: 'center', padding: '6px 8px', color: '#f87171' }}>{singles.losses}</td>
                    <td style={{ textAlign: 'center', padding: '6px 8px', color: '#f87171' }}>{doubles.losses}</td>
                    <td style={{ textAlign: 'center', padding: '6px 8px', fontWeight: '700', color: '#d4a843' }}>{total.losses}</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #e8f0e6' }}>
                    <td style={{ padding: '6px 8px', fontWeight: '600', color: '#1a2a1a' }}>Draws</td>
                    <td style={{ textAlign: 'center', padding: '6px 8px', color: '#d4a843' }}>{singles.draws}</td>
                    <td style={{ textAlign: 'center', padding: '6px 8px', color: '#d4a843' }}>{doubles.draws}</td>
                    <td style={{ textAlign: 'center', padding: '6px 8px', fontWeight: '700', color: '#d4a843' }}>{total.draws}</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #e8f0e6' }}>
                    <td style={{ padding: '6px 8px', fontWeight: '600', color: '#1a2a1a' }}>Win Rate</td>
                    <td style={{ textAlign: 'center', padding: '6px 8px' }}>
                      {formatWinRate(singles.matches, singles.wins)}
                    </td>
                    <td style={{ textAlign: 'center', padding: '6px 8px' }}>
                      {formatWinRate(doubles.matches, doubles.wins)}
                    </td>
                    <td style={{ textAlign: 'center', padding: '6px 8px', fontWeight: '700', color: '#d4a843' }}>
                      {total.winRate}%
                    </td>
                  </tr>
                  <tr>
                    <td style={{ padding: '6px 8px', fontWeight: '600', color: '#1a2a1a' }}>+/-</td>
                    <td style={{ textAlign: 'center', padding: '6px 8px', color: singles.pointsFor - singles.pointsAgainst >= 0 ? '#4ade80' : '#f87171' }}>
                      {singles.pointsFor - singles.pointsAgainst > 0 ? '+' : ''}{singles.pointsFor - singles.pointsAgainst}
                    </td>
                    <td style={{ textAlign: 'center', padding: '6px 8px', color: doubles.pointsFor - doubles.pointsAgainst >= 0 ? '#4ade80' : '#f87171' }}>
                      {doubles.pointsFor - doubles.pointsAgainst > 0 ? '+' : ''}{doubles.pointsFor - doubles.pointsAgainst}
                    </td>
                    <td style={{ textAlign: 'center', padding: '6px 8px', fontWeight: '700', color: total.diff >= 0 ? '#4ade80' : '#f87171' }}>
                      {total.diff > 0 ? '+' : ''}{total.diff}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Head-to-Head Detail Modal */}
      {showH2hModal && (
        <div style={{
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
          zIndex: 1001,
          padding: '16px',
        }} onClick={() => setShowH2hModal(false)}>
          <div style={{
            background: '#ffffff',
            borderRadius: '12px',
            padding: '24px',
            maxWidth: '480px',
            width: '100%',
            maxHeight: '90vh',
            overflowY: 'auto',
          }} onClick={e => e.stopPropagation()}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '16px',
            }}>
              <div style={{
                fontSize: '18px',
                fontWeight: '700',
                color: '#1a2a1a',
              }}>
                📋 Head-to-Head — {player.name}
              </div>
              <button
                onClick={() => setShowH2hModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '24px',
                  cursor: 'pointer',
                  color: '#6a7a6a',
                }}
              >
                ✕
              </button>
            </div>

            <div style={{
              background: '#f8faf8',
              borderRadius: '8px',
              padding: '8px 12px',
              maxHeight: '400px',
              overflowY: 'auto',
            }}>
              {h2h.map((op, i) => {
                const icon = getResultIcon(op.wins, op.losses, op.draws)
                return (
                  <div key={i} style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    padding: '6px 0',
                    borderBottom: i < h2h.length - 1 ? '1px solid #e8f0e6' : 'none',
                    fontSize: '13px',
                  }}>
                    <span>vs {op.name}</span>
                    <span>
                      <span style={{ fontWeight: '600' }}>
                        {op.wins}-{op.losses}
                        {op.draws > 0 && `-${op.draws}`}
                      </span>
                      <span style={{ marginLeft: '6px' }}>{icon}</span>
                      <span style={{ marginLeft: '6px', fontSize: '11px', color: '#6a7a6a' }}>
                        ({op.matches} matches)
                      </span>
                    </span>
                  </div>
                )
              })}
              {h2h.length === 0 && (
                <div style={{ padding: '8px', color: '#6a7a6a', textAlign: 'center' }}>
                  No head-to-head matches found in this period.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
