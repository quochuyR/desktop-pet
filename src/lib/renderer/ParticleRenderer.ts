import { BaseRenderer } from './BaseRenderer';
import { hexToRgba } from '../utils';
import type { PetState } from '../state.svelte';

export class ParticleRenderer extends BaseRenderer {
  addHeart(x: number, y: number) {

    this.parent.particles.push({
      x: x + (Math.random() - 0.5) * 30,
      y: y - 20,
      vx: 0,
      vy: -1 - Math.random() * 2,
      life: 1.0,
      type: 'heart'
    });
  }

  addStar(x: number, y: number, vx: number, vy: number) {
    this.parent.particles.push({
      x: x, y: y,
      vx: vx, vy: vy,
      life: 1.0,
      type: 'star',
      rot: Math.random() * Math.PI * 2,
      rotSpeed: (Math.random() - 0.5) * 0.5
    });
  }

  addDust(x: number, y: number, vx: number | null = null, vy: number | null = null) {
    this.parent.particles.push({
      x: x + (Math.random() - 0.5) * 15,
      y: y + (Math.random() - 0.5) * 5,
      vx: vx !== null ? vx : (Math.random() - 0.5) * 2,
      vy: vy !== null ? vy : -0.5 - Math.random() * 1.5,
      life: 1.0 + Math.random() * 0.5,
      type: 'dust',
      size: 4 + Math.random() * 6
    });
  }

  addBubble(x: number, y: number) {
    this.parent.particles.push({
      x: x + (Math.random() - 0.5) * 20,
      y: y - 5 + (Math.random() - 0.5) * 10,
      vx: (Math.random() - 0.5) * 0.8,
      vy: -0.5 - Math.random() * 1.5,
      life: 1.0 + Math.random(),
      type: 'bubble',
      size: 3 + Math.random() * 6
    });
  }

  addSweat(x: number, y: number) {
    this.parent.particles.push({
      x: x + (Math.random() - 0.5) * 15,
      y: y + (Math.random() - 0.5) * 10 - 25,
      vx: 0.8 + Math.random() * 1.2,
      vy: -1.5 - Math.random() * 1.5,
      life: 1.0,
      type: 'sweat',
      size: 2.5 + Math.random() * 2
    });
  }

  addTear(x: number, y: number) {
    this.parent.particles.push({
      x: x + (Math.random() - 0.5) * 6,
      y: y + 2,
      vx: (Math.random() > 0.5 ? 1 : -1) * (0.3 + Math.random() * 1.0),
      vy: 1.5 + Math.random() * 2.0, // falls quickly
      life: 1.0,
      type: 'tear',
      size: 3.0 + Math.random() * 2
    });
  }

  addCrumb(x: number, y: number) {
    const colors = ['#eccc68', '#f5cd79', '#cf6a87', '#706fd3', '#4b4b4b'];
    this.parent.particles.push({
      x: x + (Math.random() - 0.5) * 8,
      y: y + (Math.random() - 0.5) * 8,
      vx: (Math.random() - 0.5) * 2.0,
      vy: 0.8 + Math.random() * 2.2, // crumbs fall down
      life: 1.0 + Math.random() * 0.4,
      type: 'crumb',
      color: colors[Math.floor(Math.random() * colors.length)],
      size: 2.0 + Math.random() * 2.5
    });
  }

  addFireworks(x: number, y: number) {
    // Spawn a rocket particle rising upwards!
    this.parent.particles.push({
      x: x,
      y: y - 10,
      vx: (Math.random() - 0.5) * 1.2, // slight horizontal drift
      vy: -7.5 - Math.random() * 2.0, // strong upward velocity
      life: 1.0,
      type: 'rocket'
    });
  }

  explodeFireworks(x: number, y: number) {
    const colors = ['#ff4757', '#2ed573', '#1e90ff', '#ffa502', '#eccc68', '#ff6b81', '#70a1ff', '#7bed9f', '#ff7f50', '#a29bfe', '#fd79a8', '#00cec9', '#55efc4', '#ffeaa7', '#fab1a0', '#ff7675', '#a29bfe'];
    const particleCount = 55 + Math.floor(Math.random() * 25);
    const baseColor = colors[Math.floor(Math.random() * colors.length)];
    const secondaryColor = colors[Math.floor(Math.random() * colors.length)];
    for (let i = 0; i < particleCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1.0 + Math.random() * 6.0;
      this.parent.particles.push({
        x: x,
        y: y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 0.5,
        life: 1.0 + Math.random() * 0.4,
        type: 'firework',
        color: Math.random() > 0.4 ? baseColor : secondaryColor,
        size: 1.5 + Math.random() * 2.5
      });
    }
  }

  drawBlackHole(ctx: CanvasRenderingContext2D, x: number, y: number, progress: number) {
    const open = Math.min(1, progress / 0.28);
    const close = progress > 0.78 ? Math.max(0, 1 - (progress - 0.78) / 0.22) : 1;
    const size = 58 * Math.min(open, close);

    if (size <= 0.5) return;

    ctx.save();
    ctx.translate(x, y);
    ctx.scale(1, 0.34);
    ctx.rotate(this.time * 0.08);

    const glow = ctx.createRadialGradient(0, 0, 8, 0, 0, size * 1.45);
    glow.addColorStop(0, 'rgba(0, 0, 0, 0.98)');
    glow.addColorStop(0.42, 'rgba(28, 11, 55, 0.92)');
    glow.addColorStop(0.68, 'rgba(85, 42, 170, 0.45)');
    glow.addColorStop(1, 'rgba(79, 209, 197, 0)');

    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(0, 0, size * 1.4, 0, Math.PI * 2);
    ctx.fill();

    for (let i = 0; i < 3; i++) {
      ctx.save();
      ctx.rotate(this.time * (0.12 + i * 0.05) + i * 1.2);
      ctx.strokeStyle = i === 1 ? 'rgba(94, 234, 212, 0.78)' : 'rgba(196, 181, 253, 0.72)';
      ctx.lineWidth = 4 - i * 0.8;
      ctx.beginPath();
      ctx.ellipse(0, 0, size * (1.05 + i * 0.22), size * (0.52 + i * 0.1), 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    ctx.fillStyle = '#02010a';
    ctx.beginPath();
    ctx.arc(0, 0, size * 0.72, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.translate(x, y);
    for (let i = 0; i < 10; i++) {
      const angle = this.time * 0.15 + i * 0.63;
      const orbit = size * (0.75 + (i % 4) * 0.16);
      const px = Math.cos(angle) * orbit;
      const py = Math.sin(angle) * orbit * 0.22;
      ctx.fillStyle = i % 2 === 0 ? 'rgba(125, 249, 255, 0.9)' : 'rgba(216, 180, 254, 0.88)';
      ctx.beginPath();
      ctx.arc(px, py, 1.5 + (i % 3) * 0.5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  _renderParticles(ctx: CanvasRenderingContext2D) {
    for (let i = this.parent.particles.length - 1; i >= 0; i--) {
      let p = this.parent.particles[i];
      p.life -= 0.02;
      if (p.life <= 0) {
        this.parent.particles.splice(i, 1);
        continue;
      }
      
      if (p.type === 'heart') {
        p.y += p.vy;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.scale(p.life, p.life);
        ctx.fillStyle = '#ff7675';
        ctx.beginPath();
        ctx.arc(-5, -5, 5, 0, Math.PI, false);
        ctx.arc(5, -5, 5, 0, Math.PI, false);
        ctx.lineTo(0, 5);
        ctx.fill();
        ctx.restore();
      } 
      else if (p.type === 'star') {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.3;
        p.rot += p.rotSpeed;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.scale(p.life, p.life);
        ctx.fillStyle = '#f1c40f';
        ctx.beginPath();
        for (let j = 0; j < 5; j++) {
          ctx.lineTo(Math.cos((18+j*72)/180*Math.PI)*12, -Math.sin((18+j*72)/180*Math.PI)*12);
          ctx.lineTo(Math.cos((54+j*72)/180*Math.PI)*5, -Math.sin((54+j*72)/180*Math.PI)*5);
        }
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }
      else if (p.type === 'dust') {
        p.x += p.vx;
        p.y += p.vy;
        p.size += 0.2;
        ctx.fillStyle = `rgba(200, 200, 200, ${p.life * 0.4})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }
      else if (p.type === 'bubble') {
        p.x += p.vx;
        p.y += p.vy;
        p.x += Math.sin(this.time * 5 + p.life * 10) * 0.5;
        
        ctx.strokeStyle = `rgba(173, 216, 230, ${Math.min(1.0, p.life)})`;
        ctx.fillStyle = `rgba(224, 255, 255, ${Math.min(0.5, p.life * 0.5)})`;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        
        ctx.fillStyle = `rgba(255, 255, 255, ${Math.min(0.8, p.life)})`;
        ctx.beginPath();
        ctx.arc(p.x - p.size*0.3, p.y - p.size*0.3, p.size*0.2, 0, Math.PI * 2);
        ctx.fill();
      }
      else if (p.type === 'sweat') {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.22;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.scale(p.life, p.life);
        ctx.fillStyle = '#74b9ff';
        ctx.strokeStyle = '#0984e3';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(0, 0, p.size, 0, Math.PI);
        ctx.lineTo(0, -p.size * 1.5);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      }
      else if (p.type === 'tear') {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.18;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.scale(p.life, p.life);
        ctx.fillStyle = '#74b9ff';
        ctx.strokeStyle = '#0984e3';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.arc(0, 0, p.size, 0, Math.PI);
        ctx.lineTo(0, -p.size * 1.6);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      }
      else if (p.type === 'crumb') {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.15;
        p.vx *= 0.97;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.scale(p.life, p.life);
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(0, 0, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
      else if (p.type === 'firework') {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.08;
        p.vx *= 0.95;
        p.vy *= 0.95;
        ctx.save();
        ctx.globalAlpha = Math.max(0, p.life);
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * Math.min(1, p.life), 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
      else if (p.type === 'rocket') {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.15;
        p.vx *= 0.98;
        
        // Trail
        if (Math.random() > 0.25) {
          this.addDust(p.x, p.y + 4, (Math.random() - 0.5) * 0.6, 0.8);
        }
        
        // Draw spark
        ctx.save();
        ctx.shadowBlur = 12;
        ctx.shadowColor = '#f1c40f';
        ctx.fillStyle = '#f39c12';
        ctx.beginPath();
        ctx.arc(p.x, p.y, 3.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        
        // Detonate at peak
        if (p.vy >= -1.2 || p.y <= 65) {
          p.life = 0; // kill rocket
          this.explodeFireworks(p.x, p.y);
        }
      }
    }
  }

}
