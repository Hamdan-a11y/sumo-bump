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
  // 1. Soft ground shadow
  ctx.beginPath();
  ctx.arc(player.x, player.y + 6, player.radius, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
  ctx.fill();

  // 2. Blob body with neon glow
  ctx.save();
  ctx.shadowColor = player.glow;
  ctx.shadowBlur = 15;
  ctx.beginPath();
  ctx.arc(player.x, player.y, player.radius, 0, Math.PI * 2);
  ctx.fillStyle = player.color;
  ctx.fill();
  ctx.restore();

  // 3. Render Custom Face OR default eyes
  const angle = Math.atan2(player.vy || 0, player.vx || 1);

  if (player.faceImage) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(player.x, player.y, player.radius - 2, 0, Math.PI * 2);
    ctx.clip(); // Keep drawing clipped inside the circular blob!

    ctx.translate(player.x, player.y);
    ctx.rotate(angle);
    ctx.drawImage(
      player.faceImage,
      -player.radius,
      -player.radius,
      player.radius * 2,
      player.radius * 2
    );
    ctx.restore();
  } else {
    // Default directional eyes
    const eyeOffset = player.radius * 0.45;
    const eyeX = player.x + Math.cos(angle) * eyeOffset;
    const eyeY = player.y + Math.sin(angle) * eyeOffset;

    ctx.beginPath();
    ctx.arc(eyeX, eyeY, 4.5, 0, Math.PI * 2);
    ctx.fillStyle = '#0a0d14';
    ctx.fill();
  }
}

