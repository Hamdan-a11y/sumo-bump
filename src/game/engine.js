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
    powerUp: null,
    hitstop: 0, // Impact freeze duration
    p1: {
      x: THEME.arena.x - 140,
      y: THEME.arena.y,
      vx: 0,
      vy: 0,
      radius: PLAYER.radius,
      color: THEME.p1.color,
      glow: THEME.p1.glow,
      powerTimer: 0,
      isDashing: false,
      dashCooldown: 0,
      squash: 1, // squash & stretch factor
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
      isDashing: false,
      dashCooldown: 0,
      squash: 1,
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
  state.p1.isDashing = false;
  state.p1.dashCooldown = 0;
  state.p1.squash = 1;

  state.p2.x = THEME.arena.x + 140;
  state.p2.y = THEME.arena.y;
  state.p2.vx = 0;
  state.p2.vy = 0;
  state.p2.radius = PLAYER.radius;
  state.p2.powerTimer = 0;
  state.p2.isDashing = false;
  state.p2.dashCooldown = 0;
  state.p2.squash = 1;

  state.roundTime = 0;
  state.arenaRadius = THEME.arena.radius;
  state.powerUp = null;
  state.hitstop = 0;
  state.countdown = 3;
  state.gameState = 'COUNTDOWN';
}

export function updateGameState(state, inputs, dt, onEvent = () => {}) {
  if (state.gameState !== 'PLAYING') return;

  // Hitstop freeze frame
  if (state.hitstop > 0) {
    state.hitstop -= dt;
    return;
  }

  state.roundTime += dt;

  // 1. Sudden-death shrinking arena
  if (state.roundTime > 5.0 && state.arenaRadius > 170) {
    state.arenaRadius -= dt * 18;
  }

  // 2. Power-up spawning
  if (!state.powerUp && state.roundTime > 3.0 && Math.random() < 0.015) {
    const angle = Math.random() * Math.PI * 2;
    const dist = Math.random() * (state.arenaRadius - 80);
    state.powerUp = {
      x: THEME.arena.x + Math.cos(angle) * dist,
      y: THEME.arena.y + Math.sin(angle) * dist,
      type: Math.random() > 0.5 ? 'GIANT' : 'DASH',
    };
  }

  // 3. Process Dash Triggers
  [
    { player: state.p1, input: inputs.p1 },
    { player: state.p2, input: inputs.p2 },
  ].forEach(({ player, input }) => {
    // Cooldown decay
    if (player.dashCooldown > 0) player.dashCooldown -= dt;

    // Trigger dash
    if (input.dash && player.dashCooldown <= 0) {
      player.isDashing = true;
      player.dashCooldown = 1.8; // 1.8s recharge
      const dirX = input.x || (player.vx > 0 ? 1 : -1);
      const dirY = input.y || 0;
      const len = Math.hypot(dirX, dirY) || 1;
      player.vx = (dirX / len) * 850;
      player.vy = (dirY / len) * 850;
      onEvent({ type: 'DASH', x: player.x, y: player.y });
    }

    // Decay dash speed
    if (player.isDashing && Math.hypot(player.vx, player.vy) < 400) {
      player.isDashing = false;
    }

    // Recover squash to normal
    player.squash += (1 - player.squash) * dt * 12;
  });

  // 4. Update Physics
  updatePlayer(state.p1, inputs.p1, dt);
  updatePlayer(state.p2, inputs.p2, dt);

  // 5. Power-up pickups
  [state.p1, state.p2].forEach((player) => {
    if (player.powerTimer > 0) {
      player.powerTimer -= dt;
      if (player.powerTimer <= 0) player.radius = PLAYER.radius;
    }

    if (state.powerUp) {
      const d = Math.hypot(player.x - state.powerUp.x, player.y - state.powerUp.y);
      if (d < player.radius + 18) {
        onEvent({ type: 'POWERUP', x: state.powerUp.x, y: state.powerUp.y });
        if (state.powerUp.type === 'GIANT') {
          player.radius = PLAYER.radius * 1.5;
          player.powerTimer = 6.0;
        } else if (state.powerUp.type === 'DASH') {
          player.dashCooldown = 0;
          player.vx *= 2.0;
          player.vy *= 2.0;
        }
        state.powerUp = null;
      }
    }
  });

  // 6. Collision & Mega Knockback on Dash
  const collided = checkCollision(state.p1, state.p2);
  if (collided) {
    const midX = (state.p1.x + state.p2.x) / 2;
    const midY = (state.p1.y + state.p2.y) / 2;
    
    // Squash both fighters on impact!
    state.p1.squash = 0.55;
    state.p2.squash = 0.55;

    // Trigger Hitstop freeze frame!
    state.hitstop = 0.065; // 65ms visceral hit freeze

    // Extra explosive multiplier if dashing!
    if (state.p1.isDashing || state.p2.isDashing) {
      state.p1.vx *= 1.8;
      state.p1.vy *= 1.8;
      state.p2.vx *= 1.8;
      state.p2.vy *= 1.8;
      state.hitstop = 0.09;
    }

    onEvent({ type: 'BUMP', x: midX, y: midY, isSuper: state.p1.isDashing || state.p2.isDashing });
  }

  // 7. Ring-out checks
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
