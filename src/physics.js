import { PLAYER } from './config';

export function updatePlayer(player, input, dt) {
  let ix = input.x;
  let iy = input.y;

  // 1. Normalize diagonal input
  const len = Math.hypot(ix, iy);
  if (len > 0) {
    ix /= len;
    iy /= len;
  }

  // 2. Apply Acceleration
  player.vx += ix * PLAYER.acceleration * dt;
  player.vy += iy * PLAYER.acceleration * dt;

  // 3. Apply Friction (frame-rate independent)
  const frictionFactor = Math.pow(PLAYER.friction, dt * 60);
  player.vx *= frictionFactor;
  player.vy *= frictionFactor;

  // 4. Cap Maximum Speed
  const currentSpeed = Math.hypot(player.vx, player.vy);
  if (currentSpeed > PLAYER.maxSpeed) {
    player.vx = (player.vx / currentSpeed) * PLAYER.maxSpeed;
    player.vy = (player.vy / currentSpeed) * PLAYER.maxSpeed;
  }

  // 5. Update Position
  player.x += player.vx * dt;
  player.y += player.vy * dt;
}
export function checkCollision(p1, p2) {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const dist = Math.hypot(dx, dy);
  const minDist = p1.radius + p2.radius;

  // No collision
  if (dist >= minDist || dist === 0) return false;

  // 1. Collision normal vector (direction pointing from P1 to P2)
  const nx = dx / dist;
  const ny = dy / dist;

  // 2. Positional separation (push them apart so they never overlap)
  const overlap = minDist - dist;
  p1.x -= nx * (overlap / 2);
  p1.y -= ny * (overlap / 2);
  p2.x += nx * (overlap / 2);
  p2.y += ny * (overlap / 2);

  // 3. Calculate relative velocity along collision normal
  const rvx = p2.vx - p1.vx;
  const rvy = p2.vy - p1.vy;
  const velAlongNormal = rvx * nx + rvy * ny;

  // If already moving away from each other, don't re-bounce
  if (velAlongNormal > 0) return true;

  // 4. Elastic knockback impulse
  const impulse = Math.max(-velAlongNormal * PLAYER.restitution, PLAYER.minKnockback);

  p1.vx -= nx * impulse;
  p1.vy -= ny * impulse;
  p2.vx += nx * impulse;
  p2.vy += ny * impulse;

  return true; // collision occurred!
}
export function checkRingOut(player, arena) {
  const distFromCenter = Math.hypot(player.x - arena.x, player.y - arena.y);
  return distFromCenter > arena.radius;
}
