// src/components/PlayerPicker.jsx
export default function PlayerPicker({ label, players, value, isNew, onSelect, onNewValueChange, onCancelNew }) {
  if (isNew) {
    return (
      <div style={{ marginBottom: 12 }}>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            type="text"
            placeholder={`New ${label.toLowerCase()} name`}
            value={value}
            onChange={(e) => onNewValueChange(e.target.value)}
            style={{ marginBottom: 0, flex: 1 }}
            autoFocus
          />
          <button 
            className="btn-secondary" 
            style={{ width: 'auto', padding: '0 14px' }} 
            onClick={onCancelNew}
          >
            ↩
          </button>
        </div>
      </div>
    )
  }

  return (
    <select
      value={value || ''}
      onChange={(e) => onSelect(e.target.value)}
      style={{ 
        width: '100%',
        padding: '12px',
        borderRadius: '8px',
        border: '1px solid #d0ddd0',
        background: '#ffffff',
        color: '#1a2a1a',
        fontSize: '15px',
        marginBottom: 12,
        outline: 'none',
        transition: 'border-color 0.2s ease',
      }}
      onFocus={(e) => e.target.style.borderColor = '#d4e94b'}
      onBlur={(e) => e.target.style.borderColor = '#d0ddd0'}
    >
      <option value="" disabled>
        {label}
      </option>
      {players.map((p) => (
        <option key={p.id} value={p.name}>
          {p.name}
        </option>
      ))}
      <option value="__new__">+ Add new player…</option>
    </select>
  )
}
