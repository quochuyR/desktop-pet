import { BaseRenderer } from './BaseRenderer';
import { hexToRgba } from '../utils';
import type { PetState } from '../state.svelte';

export class AccessoryRenderer extends BaseRenderer {
  drawPaperFan(ctx: CanvasRenderingContext2D, x: number, y: number, angle: number, size: number, color: string) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    
    // Draw fan sector
    ctx.fillStyle = color;
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, size, -Math.PI * 0.35, Math.PI * 0.35);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Draw fan ribs
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.lineWidth = 1;
    for (let a = -0.3; a <= 0.3; a += 0.15) {
      ctx.save();
      ctx.rotate(a * Math.PI);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(size, 0);
      ctx.stroke();
      ctx.restore();
    }
    
    // Draw red accent dot
    ctx.fillStyle = '#1e293b';
    ctx.beginPath();
    ctx.arc(0, 0, 3, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

}
