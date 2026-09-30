import { useEffect, useRef, useState } from 'react';
import './FighterCustomizer.css';

// Bright neon colors that pop on our dark arena
const COLORS = ['#ffffff', '#00e5ff', '#ff4d6d', '#f59e0b', '#10b981'];

export function FighterCustomizer({ onSave, onClose }) {
  const canvasRef = useRef(null);
  const [brushColor, setBrushColor] = useState(COLORS[0]);
  const isDrawing = useRef(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = 180;
    canvas.height = 180;

    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, 180, 180); // Transparent canvas
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  }, []);

  const getPos = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) * (180 / rect.width),
      y: (e.clientY - rect.top) * (180 / rect.height),
    };
  };

  const startDraw = (e) => {
    isDrawing.current = true;
    const ctx = canvasRef.current.getContext('2d');
    const pos = getPos(e);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
  };

  const draw = (e) => {
    if (!isDrawing.current) return;
    const ctx = canvasRef.current.getContext('2d');
    const pos = getPos(e);
    ctx.strokeStyle = brushColor;
    ctx.lineWidth = 12; // Thicker, bolder strokes for awesome game feel
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
  };

  const stopDraw = () => {
    isDrawing.current = false;
  };

  const clearCanvas = () => {
    const ctx = canvasRef.current.getContext('2d');
    ctx.clearRect(0, 0, 180, 180);
  };

  const handleSave = () => {
    const dataUrl = canvasRef.current.toDataURL();
    onSave(dataUrl);
    onClose();
  };

  return (
    <div className="customizer-overlay">
      <div className="customizer-card">
        <div className="customizer-title">Draw Your Fighter</div>
        <p style={{ fontSize: '13px', color: '#94a3b8', margin: '-10px 0 6px' }}>
          Draw a character, creature, or face:
        </p>

        <canvas
          ref={canvasRef}
          className="sketch-canvas"
          onPointerDown={startDraw}
          onPointerMove={draw}
          onPointerUp={stopDraw}
          onPointerCancel={stopDraw}
        />

        <div className="color-palette">
          {COLORS.map((c) => (
            <button
              key={c}
              className={`color-swatch ${brushColor === c ? 'active' : ''}`}
              style={{ background: c }}
              onClick={() => setBrushColor(c)}
            />
          ))}
        </div>

        <div className="customizer-btn-row">
          <button className="lobby-btn" onClick={clearCanvas}>
            Clear
          </button>
          <button className="lobby-btn lobby-btn-primary" onClick={handleSave}>
            Play With This
          </button>
        </div>
      </div>
    </div>
  );
}
