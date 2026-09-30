import { PLAYER, THEME } from '../config';
import { checkCollision, checkRingOut, updatePlayer } from '../physics';

export const WIN_SCORE = 3;

export function createInitialState() {
  return {
    gameState: 'COUNTDOWN',
    countdown: 3,
    winner: null,
    score: { p1: 0, p2: 0 },
    roundTime: 0,
    arenaRadius: THEME.arena.radius,
    powerUp: null, // { x, y, type: 'GIANT' | 'DASH' }
    p1: {
      x: THEME.arena.x - 140,
      y: THEME.arena.y,
      vx: 0,
      vy: 0,
      radius: PLAYER.radius,
      color: THEME.p1.color,
      glow: THEME.p1.glow,
      powerTimer: 0,
    },
    p2: {
      x: THEME.arena.x + 140,
      y: THEME.arena.y,
      vx: 0,
      vy: 0,
      radius: PLAYER.radius,
      color: THEME.p2.color,
      glow: THEME.p2.glow,
      powerTimer: 0,
    },
  };
}

export function resetRoundPositions(state) {
  state.p1.x = THEME.arena.x - 140;
  state.p1.y = THEME.arena.y;
  state.p1.vx = 0;
  state.p1.vy = 0;
  state.p1.radius = PLAYER.radius;
  state.p1.powerTimer = 0;

  state.p2.x = THEME.arena.x + 140;
  state.p2.y = THEME.arena.y;
  state.p2.vx = 0;
  state.p2.vy = 0;
  state.p2.radius = PLAYER.radius;
  state.p2.powerTimer = 0;

  state.roundTime = 0;
  state.arenaRadius = THEME.arena.radius;
  state.powerUp = null;
  state.countdown = 3;
  state.gameState = 'COUNTDOWN';
}

export function updateGameState(state, inputs, dt, onEvent = () => {}) {
  if (state.gameState !== 'PLAYING') return;

  state.roundTime += dt;

  // 1. Sudden-death shrinking arena (starts after 6 seconds)
  if (state.roundTime > 6.0 && state.arenaRadius > 180) {
    state.arenaRadius -= dt * 16;
  }

  // 2. Spawn a Power-Up orb after 4 seconds if none exists
  if (!state.powerUp && state.roundTime > 4.0 && Math.random() < 0.015) {
    const angle = Math.random() * Math.PI * 2;
    const dist = Math.random() * (state.arenaRadius - 80);
    state.powerUp = {
      x: THEME.arena.x + Math.cos(angle) * dist,
      y: THEME.arena.y + Math.sin(angle) * dist,
      type: Math.random() > 0.5 ? 'GIANT' : 'DASH',
    };
  }

  // 3. Update player physics
  updatePlayer(state.p1, inputs.p1, dt);
  updatePlayer(state.p2, inputs.p2, dt);

  // 4. Power-up pickups
  [state.p1, state.p2].forEach((player, idx) => {
    if (player.powerTimer > 0) {
      player.powerTimer -= dt;
      if (player.powerTimer <= 0) {
        player.radius = PLAYER.radius; // revert powerup
      }
    }

    if (state.powerUp) {
      const d = Math.hypot(player.x - state.powerUp.x, player.y - state.powerUp.y);
      if (d < player.radius + 18) {
        onEvent({ type: 'POWERUP', x: state.powerUp.x, y: state.powerUp.y });
        if (state.powerUp.type === 'GIANT') {
          player.radius = PLAYER.radius * 1.5;
          player.powerTimer = 6.0;
        } else if (state.powerUp.type === 'DASH') {
          player.vx *= 2.2;
          player.vy *= 2.2;
        }
        state.powerUp = null;
      }
    }
  });

  // 5. Circle collision bump
  const collided = checkCollision(state.p1, state.p2);
  if (collided) {
    const midX = (state.p1.x + state.p2.x) / 2;
    const midY = (state.p1.y + state.p2.y) / 2;
    onEvent({ type: 'BUMP', x: midX, y: midY });
  }

  // 6. Ring-out scoring check with dynamic arena radius
  const dynamicArena = { ...THEME.arena, radius: state.arenaRadius };
  if (checkRingOut(state.p1, dynamicArena)) {
    onEvent({ type: 'RING_OUT' });
    state.score.p2 += 1;
    if (state.score.p2 >= WIN_SCORE) {
      state.winner = 'p2';
      state.gameState = 'MATCH_OVER';
    } else {
      resetRoundPositions(state);
    }
  } else if (checkRingOut(state.p2, dynamicArena)) {
    onEvent({ type: 'RING_OUT' });
    state.score.p1 += 1;
    if (state.score.p1 >= WIN_SCORE) {
      state.winner = 'p1';
      state.gameState = 'MATCH_OVER';
    } else {
      resetRoundPositions(state);
    }
  }
}
