// src/components/Tournament/TournamentDashboard/AdminPinModal.jsx
export default function AdminPinModal({ isOpen, onClose, pinInput, setPinInput, pinError, checkingPin, onEnterPin }) {
  if (!isOpen) return null

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
            if (e.key === 'Enter') onEnterPin()
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
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            className="btn-primary"
            style={{ flex: 1 }}
            onClick={onEnterPin}
            disabled={pinInput.length !== 4 || checkingPin}
          >
            {checkingPin ? 'Checking...' : 'Unlock'}
          </button>
        </div>
      </div>
    </div>
  )
}
