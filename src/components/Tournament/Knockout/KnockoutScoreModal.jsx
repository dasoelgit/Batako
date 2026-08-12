// src/components/Tournament/Knockout/KnockoutScoreModal.jsx
export default function KnockoutScoreModal({
  isOpen,
  onClose,
  match,
  getTeamName,
  roundLabel,
  score1,
  setScore1,
  score2,
  setScore2,
  error,
  busy,
  onSave,
}) {
  if (!isOpen || !match) return null

  return (
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
      onClick={onClose}
    >
      <div
        style={{
          background: '#ffffff',
          borderRadius: '12px',
          padding: '24px',
          maxWidth: '400px',
          width: '100%',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 style={{ margin: '0 0 16px 0', color: '#1a2a1a' }}>
          {roundLabel || 'Match'} Score
        </h3>

        <div style={{
          fontSize: '14px',
          fontWeight: '600',
          color: '#1a2a1a',
          textAlign: 'center',
          marginBottom: '16px',
        }}>
          {getTeamName(match, 1)} vs {getTeamName(match, 2)}
        </div>

        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '12px',
        }}>
          <div style={{ flex: 1, textAlign: 'center' }}>
            <div style={{ fontSize: '12px', color: '#6a7a6a' }}>Team 1</div>
            <div style={{ fontWeight: '600', marginBottom: '8px' }}>{getTeamName(match, 1)}</div>
            <input
              type="text"
              inputMode="numeric"
              placeholder="0"
              value={score1}
              onChange={(e) => setScore1(e.target.value.replace(/[^0-9]/g, ''))}
              style={{
                width: '60px',
                padding: '10px',
                borderRadius: '8px',
                border: '1px solid #d0ddd0',
                background: '#ffffff',
                color: '#1a2a1a',
                fontSize: '20px',
                textAlign: 'center',
                outline: 'none',
              }}
            />
          </div>

          <div style={{ fontSize: '16px', fontWeight: '700', color: '#6a7a6a' }}>vs</div>

          <div style={{ flex: 1, textAlign: 'center' }}>
            <div style={{ fontSize: '12px', color: '#6a7a6a' }}>Team 2</div>
            <div style={{ fontWeight: '600', marginBottom: '8px' }}>{getTeamName(match, 2)}</div>
            <input
              type="text"
              inputMode="numeric"
              placeholder="0"
              value={score2}
              onChange={(e) => setScore2(e.target.value.replace(/[^0-9]/g, ''))}
              style={{
                width: '60px',
                padding: '10px',
                borderRadius: '8px',
                border: '1px solid #d0ddd0',
                background: '#ffffff',
                color: '#1a2a1a',
                fontSize: '20px',
                textAlign: 'center',
                outline: 'none',
              }}
            />
          </div>
        </div>

        {error && (
          <div style={{
            background: 'rgba(214,67,47,0.12)',
            color: '#c0392b',
            padding: '8px',
            borderRadius: '6px',
            fontSize: '13px',
            marginTop: '12px',
            textAlign: 'center',
          }}>
            {error}
          </div>
        )}

        <div style={{
          display: 'flex',
          gap: '8px',
          marginTop: '16px',
        }}>
          <button
            className="btn-secondary"
            style={{ flex: 1 }}
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            className="btn-primary"
            style={{ flex: 1 }}
            onClick={onSave}
            disabled={busy}
          >
            {busy ? 'Saving...' : 'Save Score'}
          </button>
        </div>
      </div>
    </div>
  )
}
