import { useState } from 'react';
import './Lobby.css';

export function Lobby({ onCreateRoom, onJoinRoom, onPlayLocal, onOpenCustomizer, waitingRoomId }) {
  const [inputCode, setInputCode] = useState('');
  const [copied, setCopied] = useState(false);

  const copyLink = () => {
    const url = `${window.location.origin}${window.location.pathname}?room=${waitingRoomId}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="lobby-overlay">
      <div className="lobby-card">
        <div className="lobby-title">SUMO BUMP</div>

        {waitingRoomId ? (
          <div className="room-invite-box">
            <span style={{ fontSize: '13px', color: '#94a3b8' }}>Share link or code with a friend:</span>
            <div className="room-code-tag">{waitingRoomId}</div>
            <button className="lobby-btn lobby-btn-primary" onClick={copyLink}>
              {copied ? 'Link Copied! ✓' : 'Copy Invite Link'}
            </button>
            <span style={{ fontSize: '12px', color: '#64748b' }}>Waiting for opponent to connect...</span>
          </div>
        ) : (
          <div className="lobby-actions">
            <button className="lobby-btn lobby-btn-primary" onClick={onCreateRoom}>
              Create Online Room
            </button>

            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="text"
                placeholder="ROOM CODE"
                value={inputCode}
                onChange={(e) => setInputCode(e.target.value.toUpperCase())}
                style={{
                  flex: 1,
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '12px',
                  color: '#fff',
                  padding: '12px',
                  fontWeight: 700,
                  textAlign: 'center',
                  outline: 'none',
                }}
              />
              <button 
                className="lobby-btn" 
                style={{ flex: 1 }}
                onClick={() => inputCode && onJoinRoom(inputCode)}
              >
                Join
              </button>
            </div>

            <div style={{ margin: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.08)' }} />

            <button className="lobby-btn" onClick={onOpenCustomizer}>
              🎨 Draw Your Fighter
            </button>

            <button className="lobby-btn" onClick={onPlayLocal}>
              Play Local (1 Device)
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
