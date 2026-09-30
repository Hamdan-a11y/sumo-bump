import { useRef, useState } from 'react';
import './Joystick.css';

export function Joystick({ side = 'left', onMove }) {
  const [knobPos, setKnobPos] = useState({ x: 0, y: 0 });
  const activePointer = useRef(null);
  const maxRadius = 45;

  const handlePointerDown = (e) => {
    activePointer.current = e.pointerId;
    e.target.setPointerCapture(e.pointerId);
    handlePointerMove(e);
  };

  const handlePointerMove = (e) => {
    if (activePointer.current !== e.pointerId) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const dx = e.clientX - centerX;
    const dy = e.clientY - centerY;
    const dist = Math.hypot(dx, dy);

    const clampedDist = Math.min(dist, maxRadius);
    const angle = Math.atan2(dy, dx);

    const x = Math.cos(angle) * clampedDist;
    const y = Math.sin(angle) * clampedDist;

    setKnobPos({ x, y });

    // Output normalized input between -1 and 1
    onMove({
      x: x / maxRadius,
      y: y / maxRadius,
    });
  };

  const handlePointerUp = (e) => {
    if (activePointer.current !== e.pointerId) return;
    activePointer.current = null;
    setKnobPos({ x: 0, y: 0 });
    onMove({ x: 0, y: 0 });
  };

  return (
    <div
      className={`joystick-container joystick-${side}`}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      <div
        className="joystick-knob"
        style={{
          transform: `translate3d(${knobPos.x}px, ${knobPos.y}px, 0)`,
        }}
      />
    </div>
  );
}
