import './Scoreboard.css';

export function Scoreboard({ score, theme }) {
  return (
    <div className="scoreboard">
      <div className="score-player" style={{ color: theme.p1.color }}>
        <span className="score-pill" style={{ background: theme.p1.color, boxShadow: `0 0 10px ${theme.p1.glow}` }} />
        <span>P1</span>
        <span className="score-num">{score.p1}</span>
      </div>

      <div className="score-divider">:</div>

      <div className="score-player" style={{ color: theme.p2.color }}>
        <span className="score-num">{score.p2}</span>
        <span>P2</span>
        <span className="score-pill" style={{ background: theme.p2.color, boxShadow: `0 0 10px ${theme.p2.glow}` }} />
      </div>
    </div>
  );
}
