import { useEffect, useRef } from 'react';

export function useGameLoop(callback) {
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  useEffect(() => {
    let animationFrameId;
    let lastTime = performance.now();

    const loop = (currentTime) => {
      // Calculate delta time in seconds
      let dt = (currentTime - lastTime) / 1000;
      lastTime = currentTime;

      // Cap dt to prevent massive jumps if tab is minimized/switched
      if (dt > 0.1) dt = 0.1;

      // Execute our game update and draw
      callbackRef.current(dt);

      animationFrameId = requestAnimationFrame(loop);
    };

    animationFrameId = requestAnimationFrame(loop);

    return () => cancelAnimationFrame(animationFrameId);
  }, []);
}
