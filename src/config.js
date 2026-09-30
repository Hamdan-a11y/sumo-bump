export const CANVAS_SIZE = 800;

export const THEME = {
  bg: '#0a0d14',
  arena: {
    x: CANVAS_SIZE / 2,
    y: CANVAS_SIZE / 2,
    radius: 320,
    floor: '#131722',
    ring: '#23293a',
    dangerZone: 'rgba(255, 75, 75, 0.08)',
    centerDot: '#1e2433',
    borderWidth: 10,
  },
  p1: {
    name: 'Player 1',
    color: '#ff4d6d',
    glow: 'rgba(255, 77, 109, 0.4)',
    accent: '#ffffff',
  },
  p2: {
    name: 'Player 2',
    color: '#00e5ff',
    glow: 'rgba(0, 229, 255, 0.4)',
    accent: '#ffffff',
  },
};
export const PLAYER = {
  radius: 28,
  acceleration: 1800,
  maxSpeed: 450,
  friction: 0.92,
  restitution: 1.25, // Bounciness factor (1.0 = normal bounce, >1 = explosive sumo bump!)
  minKnockback: 320,  // Base impulse so even a slow touch creates a crisp bump
};
