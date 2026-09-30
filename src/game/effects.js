export class EffectsManager {
  constructor() {
    this.particles = [];
    this.shakeIntensity = 0;
  }

  triggerShake(intensity = 8) {
    this.shakeIntensity = Math.min(this.shakeIntensity + intensity, 16);
  }

  spawnSparks(x, y, color = '#ffffff') {
    for (let i = 0; i < 14; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 120 + Math.random() * 260;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        radius: 2 + Math.random() * 3,
        color,
        life: 1.0, // fades to 0
        decay: 3.5 + Math.random() * 2.0,
      });
    }
  }

  update(dt) {
    // Decay screen shake
    if (this.shakeIntensity > 0) {
      this.shakeIntensity -= dt * 30;
      if (this.shakeIntensity < 0) this.shakeIntensity = 0;
    }

    // Update particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= p.decay * dt;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }
  }

  draw(ctx) {
    for (const p of this.particles) {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius * p.life, 0, Math.PI * 2);
      ctx.fillStyle = p.color;
      ctx.globalAlpha = Math.max(0, p.life);
      ctx.fill();
    }
    ctx.globalAlpha = 1.0;
  }
}
