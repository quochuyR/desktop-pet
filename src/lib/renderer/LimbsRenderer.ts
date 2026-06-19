import { BaseRenderer } from './BaseRenderer';
import { hexToRgba } from '../utils';
import type { PetState } from '../state.svelte';

export class LimbsRenderer extends BaseRenderer {
  drawCuteFoot(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, swing: number) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(swing);
    
    ctx.fillStyle = this.colors.skin;
    ctx.beginPath();
    ctx.roundRect(-width / 2, 0, width, height, [width * 0.3, width * 0.3, width * 0.5, width * 0.5]);
    ctx.fill();
    
    // 3 Toenails at the bottom
    ctx.fillStyle = '#ffffff';
    const nailW = width / 3.5;
    for (let i = 0; i < 3; i++) {
      const nx = -width / 2 + nailW * 0.75 + i * nailW * 1.0;
      ctx.beginPath();
      ctx.arc(nx, height - 1.5, nailW / 2.2, Math.PI, 0);
      ctx.fill();
    }
    
    ctx.restore();
  }

  _drawFoot(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, swing: number, style: string) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(swing);

    if (style === 'chubby') {
      // Big oval blob paw + pink toe pads
      ctx.fillStyle = this.colors.skin;
      ctx.beginPath();
      ctx.ellipse(0, height * 0.38, width * 0.65, height * 0.55, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(255, 160, 180, 0.52)';
      ctx.beginPath();
      ctx.ellipse(0, height * 0.53, width * 0.3, height * 0.22, 0, 0, Math.PI * 2);
      ctx.fill();
      for (let i = 0; i < 3; i++) {
        const tx = -width * 0.22 + i * width * 0.22;
        ctx.beginPath();
        ctx.arc(tx, height * 0.2, width * 0.14, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (style === 'flipper') {
      // Smooth teardrop flipper/fin
      ctx.fillStyle = this.colors.skin;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.bezierCurveTo(-width * 0.82, height * 0.14, -width * 0.84, height * 0.82, 0, height);
      ctx.bezierCurveTo(width * 0.84, height * 0.82, width * 0.82, height * 0.14, 0, 0);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.32)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(0, height * 0.12);
      ctx.quadraticCurveTo(width * 0.12, height * 0.5, 0, height * 0.88);
      ctx.stroke();
    } else if (style === 'star') {
      // 5-point star paw
      ctx.fillStyle = this.colors.skin;
      ctx.beginPath();
      const sr = Math.min(width, height) * 0.52;
      const ir = sr * 0.42;
      const cY = height * 0.42;
      for (let i = 0; i < 10; i++) {
        const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
        const r = i % 2 === 0 ? sr : ir;
        i === 0 ? ctx.moveTo(Math.cos(a) * r, cY + Math.sin(a) * r)
                : ctx.lineTo(Math.cos(a) * r, cY + Math.sin(a) * r);
      }
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.48)';
      ctx.beginPath();
      ctx.arc(0, cY, sr * 0.22, 0, Math.PI * 2);
      ctx.fill();
    } else if (style === 'sock') {
      // Rounded foot with cute horizontal stripes like a sock
      ctx.fillStyle = this.colors.skin;
      ctx.beginPath();
      ctx.roundRect(-width / 2, 0, width, height, [width * 0.3, width * 0.3, width * 0.5, width * 0.5]);
      ctx.fill();
      ctx.save();
      ctx.beginPath();
      ctx.roundRect(-width / 2, 0, width, height, [width * 0.3, width * 0.3, width * 0.5, width * 0.5]);
      ctx.clip();
      const stripeH = height * 0.13;
      const sColors = ['rgba(255,120,160,0.44)', 'rgba(255,255,255,0.52)'];
      for (let s = 0; s < 4; s++) {
        ctx.fillStyle = sColors[s % 2];
        ctx.fillRect(-width / 2, s * stripeH, width, stripeH);
      }
      ctx.restore();
    } else {
      // classic — original look with 3 white toenails
      ctx.fillStyle = this.colors.skin;
      ctx.beginPath();
      ctx.roundRect(-width / 2, 0, width, height, [width * 0.3, width * 0.3, width * 0.5, width * 0.5]);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      const nailW = width / 3.5;
      for (let i = 0; i < 3; i++) {
        const nx = -width / 2 + nailW * 0.75 + i * nailW * 1.0;
        ctx.beginPath();
        ctx.arc(nx, height - 1.5, nailW / 2.2, Math.PI, 0);
        ctx.fill();
      }
    }
    ctx.restore();
  }

  _drawTail(ctx: CanvasRenderingContext2D, legSwing: number, breath: number, style: string) {
    ctx.save();
    ctx.translate(-30, 2 + breath * 0.5);
    ctx.rotate((legSwing * 0.3) * Math.PI / 180);
    ctx.fillStyle = this.colors.skin;

    if (style === 'curly') {
      ctx.strokeStyle = this.colors.skin;
      ctx.lineWidth = 4.5;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(2, 1);
      for (let t = 0; t <= 30; t++) {
        const pct = t / 30;
        const angle = pct * Math.PI * 2.8;
        const r = 9 * (1 - pct * 0.55);
        ctx.lineTo(2 - Math.cos(angle) * r * 0.9, 1 - Math.sin(angle) * r * 0.55);
      }
      ctx.stroke();
      // Tiny tip dot
      ctx.fillStyle = this.colors.shellRim;
      ctx.beginPath();
      ctx.arc(2 - Math.cos(Math.PI * 2.8) * 4.2, 1 - Math.sin(Math.PI * 2.8) * 2.5, 2.2, 0, Math.PI * 2);
      ctx.fill();
    } else if (style === 'fluffy') {
      // Pompom multi-blob tail
      const blobs: [number, number, number][] = [[-10, 1, 7.5], [-15, -2, 5.5], [-9, -5, 5], [-16, 4, 4.5]];
      for (const [bx, by, br] of blobs) {
        ctx.beginPath();
        ctx.arc(bx, by, br, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = 'rgba(255,255,255,0.4)';
      ctx.beginPath();
      ctx.arc(-11, -1.5, 3.8, 0, Math.PI * 2);
      ctx.fill();
    } else if (style === 'leaf') {
      // Leaf shape with veins
      ctx.beginPath();
      ctx.moveTo(2, 1);
      ctx.bezierCurveTo(-2, -7, -17, -6, -15, 1);
      ctx.bezierCurveTo(-17, 9, -2, 10, 2, 4);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = this.colors.shellRim;
      ctx.lineWidth = 1.2;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(1, 2.5);
      ctx.quadraticCurveTo(-8, 2, -14, 1);
      ctx.stroke();
      ctx.globalAlpha = 0.55;
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(-4, 2);    ctx.lineTo(-6.5, -3.5);
      ctx.moveTo(-9, 1.8);  ctx.lineTo(-11.5, -3);
      ctx.moveTo(-4, 2.5);  ctx.lineTo(-6.5, 7.5);
      ctx.stroke();
      ctx.globalAlpha = 1;
    } else if (style === 'ribbon') {
      // Wavy S-curve ribbon tail
      ctx.strokeStyle = this.colors.skin;
      ctx.lineWidth = 5;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(2, 1);
      ctx.bezierCurveTo(-3, -6, -10, 8, -17, 0);
      ctx.bezierCurveTo(-23, -7, -21, 5, -19, 7);
      ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,0.42)';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(2, 0);
      ctx.bezierCurveTo(-3, -7, -10, 7, -17, -1);
      ctx.stroke();
      ctx.fillStyle = this.colors.shellRim;
      ctx.beginPath();
      ctx.arc(-19, 7, 2.8, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // classic bezier curve
      ctx.beginPath();
      ctx.moveTo(2, -4);
      ctx.quadraticCurveTo(-15, -2, -12, 4);
      ctx.quadraticCurveTo(-6, 7, 2, 6);
      ctx.fill();
    }
    ctx.restore();
  }

}
