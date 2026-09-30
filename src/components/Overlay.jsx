import './Overlay.css';

export function Overlay({ gameState, countdown, winner, theme, onRematch }) {
  if (gameState === 'PLAYING') return null;

  return (
    <div className="overlay-screen">
      {gameState === 'COUNTDOWN' && (
        <div key={countdown} className="countdown-text">
          {countdown > 0 ? countdown : 'BUMP!'}
        </div>
      )}

      {gameState === 'MATCH_OVER' && (
        <div className="winner-card">
          <div className="winner-title">Match Decided</div>
          <div 
            className="winner-name"
            style={{ 
              color: winner === 'p1' ? theme.p1.color : theme.p2.color,
              textShadow: `0 0 30px ${winner === 'p1' ? theme.p1.glow : theme.p2.glow}`
            }}
          >
            {winner === 'p1' ? 'PLAYER 1 WINS' : 'PLAYER 2 WINS'}
          </div>
          <button className="rematch-btn" onClick={onRematch}>
            Play Again
          </button>
        </div>
      )}
    </div>
  );
}
