export function drawArena(ctx, arena, currentRadius = arena.radius) {
  // 1. Arena floor
  ctx.beginPath();
  ctx.arc(arena.x, arena.y, currentRadius, 0, Math.PI * 2);
  ctx.fillStyle = arena.floor;
  ctx.fill();

  // 2. Subtle red "danger zone" warning ring
  ctx.beginPath();
  ctx.arc(arena.x, arena.y, Math.max(10, currentRadius - 20), 0, Math.PI * 2);
  ctx.lineWidth = 40;
  ctx.strokeStyle = arena.dangerZone;
  ctx.stroke();

  // 3. Tactile outer rim boundary
  ctx.beginPath();
  ctx.arc(arena.x, arena.y, currentRadius, 0, Math.PI * 2);
  ctx.lineWidth = arena.borderWidth;
  ctx.strokeStyle = arena.ring;
  ctx.stroke();

  // 4. Center ring
  ctx.beginPath();
  ctx.arc(arena.x, arena.y, 40, 0, Math.PI * 2);
  ctx.lineWidth = 3;
  ctx.strokeStyle = arena.centerDot;
  ctx.stroke();
}

export function drawPowerUp(ctx, powerUp) {
  if (!powerUp) return;
  const isGiant = powerUp.type === 'GIANT';
  const color = isGiant ? '#f59e0b' : '#a855f7';

  ctx.save();
  ctx.shadowColor = color;
  ctx.shadowBlur = 18;

  ctx.beginPath();
  ctx.arc(powerUp.x, powerUp.y, 16, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();

  // Inner icon dot
  ctx.beginPath();
  ctx.arc(powerUp.x, powerUp.y, 6, 0, Math.PI * 2);
  ctx.fillStyle = '#ffffff';
  ctx.fill();
  ctx.restore();
}

export function drawPlayer(ctx, player) {
  const speed = Math.hypot(player.vx || 0, player.vy || 0);

  // 1. Soft ground shadow that tracks squash
  ctx.beginPath();
  ctx.ellipse(player.x, player.y + player.radius * 0.7, player.radius * 0.9, player.radius * 0.35, 0, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
  ctx.fill();

  // 2. Dash speed trail
  if (player.isDashing) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(player.x - player.vx * 0.04, player.y - player.vy * 0.04, player.radius * 0.9, 0, Math.PI * 2);
    ctx.fillStyle = player.glow;
    ctx.globalAlpha = 0.5;
    ctx.fill();
    ctx.restore();
  }

  // 3. LIVING CARTOON DOODLE RENDERING
  if (player.faceImage) {
    ctx.save();
    ctx.translate(player.x, player.y);

    // Dynamic running tilt (leans into movement, stays upright!)
    const tilt = (player.vx / 450) * 0.25;
    ctx.rotate(tilt);

    // Running bob stride (wobbles happily when running!)
    const bob = speed > 20 ? Math.sin(Date.now() * 0.02) * 4 : 0;

    // Flip horizontally to face direction of travel!
    const facingLeft = player.vx < -15;
    const squash = player.squash || 1;
    ctx.scale(facingLeft ? -1 : 1, squash);

    // Draw the freeform doodle!
    const size = player.radius * 2.6;
    ctx.drawImage(player.faceImage, -size / 2, -size / 2 + bob, size, size);
    ctx.restore();
  } else {
    // FALLBACK: Default glowing blob with eyes
    ctx.save();
    ctx.shadowColor = player.glow;
    ctx.shadowBlur = player.isDashing ? 30 : 15;
    ctx.beginPath();
    ctx.arc(player.x, player.y, player.radius, 0, Math.PI * 2);
    ctx.fillStyle = player.color;
    ctx.fill();
    ctx.restore();

    // Directional eyes
    const angle = Math.atan2(player.vy || 0, player.vx || 1);
    const eyeOffset = player.radius * 0.45;
    const eyeX = player.x + Math.cos(angle) * eyeOffset;
    const eyeY = player.y + Math.sin(angle) * eyeOffset;

    ctx.beginPath();
    ctx.arc(eyeX, eyeY, 4.5, 0, Math.PI * 2);
    ctx.fillStyle = '#0a0d14';
    ctx.fill();
  }
}
