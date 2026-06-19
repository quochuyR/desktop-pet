import { BaseRenderer } from './BaseRenderer';
import { hexToRgba } from '../utils';
import type { PetState } from '../state.svelte';

export class FaceRenderer extends BaseRenderer {
  _drawHeadShape(ctx: CanvasRenderingContext2D, style: string) {
    ctx.fillStyle = this.colors.skin;
    if (style === 'round') {
      // Big perfectly round chubby head
      ctx.beginPath();
      ctx.arc(4, -5, 23, 0, Math.PI * 2);
      ctx.fill();
    } else if (style === 'chibi') {
      // Cute, wide, squished cheek face
      ctx.beginPath();
      ctx.ellipse(4, -4, 28, 22, 0, 0, Math.PI * 2);
      ctx.fill();
    } else if (style === 'tiny') {
      // Compact small head
      ctx.beginPath();
      ctx.roundRect(-7, -2, 15, 15, 5);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(3, -4, 16, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // classic
      ctx.beginPath();
      ctx.roundRect(-10, -5, 20, 20, 5);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(5, -8, 22, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  drawAnimeEye(ctx: CanvasRenderingContext2D, x: number, y: number, isBlink: boolean, isHappy: boolean, isScared: boolean, isCrying = false, eyeStyle = 'classic') {
    ctx.save();
    ctx.translate(x, y);
    
    if (isHappy && eyeStyle === 'classic') {
      // White eye base
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.ellipse(0, 0, 7, 10, 0, 0, Math.PI * 2);
      ctx.fill();
      
      // Eye border stroke
      ctx.strokeStyle = this.colors.eye;
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.ellipse(0, 0, 7, 10, 0, 0, Math.PI * 2);
      ctx.stroke();

      // Pupil (dark green)
      ctx.fillStyle = this.colors.eye;
      ctx.beginPath();
      ctx.ellipse(1.5, 0, 4.8, 7.8, 0, 0, Math.PI * 2);
      ctx.fill();

      // Golden sparkle star in the center of the pupil
      ctx.fillStyle = '#ffeaa7'; // soft yellow
      ctx.beginPath();
      const scx = 1.0;
      const scy = -0.5;
      const sr = 4.5;
      ctx.moveTo(scx, scy - sr);
      ctx.quadraticCurveTo(scx, scy, scx + sr, scy);
      ctx.quadraticCurveTo(scx, scy, scx, scy + sr);
      ctx.quadraticCurveTo(scx, scy, scx - sr, scy);
      ctx.quadraticCurveTo(scx, scy, scx, scy - sr);
      ctx.closePath();
      ctx.fill();

      // Tiny white circular reflection
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(3.5, -3.5, 1.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(-1.0, 2.5, 0.7, 0, Math.PI * 2);
      ctx.fill();
    } else if (isBlink) {
      ctx.strokeStyle = this.colors.eye;
      ctx.lineWidth = 3.5;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-6, 1);
      ctx.lineTo(6, 1);
      ctx.stroke();
    } else if (isCrying && eyeStyle === 'classic') {
      // Draw big watery eyes
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.ellipse(0, 0, 7, 10, 0, 0, Math.PI * 2);
      ctx.fill();
      
      // Eye stroke border
      ctx.strokeStyle = this.colors.eye;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.ellipse(0, 0, 7, 10, 0, 0, Math.PI * 2);
      ctx.stroke();

      // Pupil (dark green)
      ctx.fillStyle = this.colors.eye;
      ctx.beginPath();
      ctx.ellipse(1, 0, 4.5, 7.5, 0, 0, Math.PI * 2);
      ctx.fill();

      // Water pool at the bottom (translucent light blue)
      ctx.fillStyle = 'rgba(129, 236, 236, 0.7)';
      ctx.beginPath();
      ctx.ellipse(1, 3.5, 3.5, 3.5, 0, 0, Math.PI);
      ctx.fill();

      // Giant glistening tear highlights (multiple white circles)
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(2.5, -3.5, 2.5, 0, Math.PI * 2); // main highlight
      ctx.fill();
      ctx.beginPath();
      ctx.arc(-1.5, 1.5, 1.5, 0, Math.PI * 2); // secondary highlight
      ctx.fill();
      ctx.beginPath();
      ctx.arc(3.5, 2.0, 1.0, 0, Math.PI * 2); // third highlight
      ctx.fill();
    } else if (isScared && eyeStyle === 'classic') {
      ctx.strokeStyle = this.colors.eye;
      ctx.lineWidth = 2.5;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(-6, -4);
      ctx.lineTo(0, 0);
      ctx.lineTo(-6, 4);
      ctx.stroke();
    } else {
      if (eyeStyle === 'button') {
        // Simple round button eye
        ctx.fillStyle = this.colors.eye;
        ctx.beginPath();
        ctx.arc(1, 0, 5.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(2.8, -2, 1.8, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(0, 2, 0.9, 0, Math.PI * 2);
        ctx.fill();
      } else if (eyeStyle === 'sparkle') {
        // Large glittery anime eye with star highlight
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.ellipse(0, 0, 8, 11.5, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = this.colors.eye;
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.ellipse(0, 0, 8, 11.5, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = this.colors.eye;
        ctx.beginPath();
        ctx.ellipse(1.5, 0, 5.5, 8.5, 0, 0, Math.PI * 2);
        ctx.fill();
        // Big white highlight
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(3.5, -4, 3.2, 0, Math.PI * 2);
        ctx.fill();
        // 4-point gold star sparkle
        ctx.fillStyle = '#ffeaa7';
        ctx.beginPath();
        const sc = [1.5, -1]; const sSize = 2.8;
        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * Math.PI * 2;
          const sr2 = i % 2 === 0 ? sSize : sSize * 0.38;
          i === 0 ? ctx.moveTo(sc[0] + Math.cos(a) * sr2, sc[1] + Math.sin(a) * sr2)
                  : ctx.lineTo(sc[0] + Math.cos(a) * sr2, sc[1] + Math.sin(a) * sr2);
        }
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(-1, 3, 1.1, 0, Math.PI * 2);
        ctx.fill();
      } else if (eyeStyle === 'uwu') {
        // Cute UwU arc eyes with rosy cheek
        ctx.strokeStyle = this.colors.eye;
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.arc(0, 3, 5.5, Math.PI, 0);
        ctx.stroke();
        // Tiny eyelash strokes
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.moveTo(-4.5, 3); ctx.lineTo(-6, 0.5);
        ctx.moveTo(4.5, 3);  ctx.lineTo(6, 0.5);
        ctx.stroke();
        // Rosy cheek flush below eye
        ctx.fillStyle = 'rgba(255, 150, 150, 0.45)';
        ctx.beginPath();
        ctx.ellipse(7, 8, 5.5, 3, 0, 0, Math.PI * 2);
        ctx.fill();
      } else if (eyeStyle === 'dot') {
        // Minimalist tiny shiny dot eye
        ctx.fillStyle = this.colors.eye;
        ctx.beginPath();
        ctx.arc(1, 0, 3.8, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(2.2, -1.2, 1.4, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // classic anime eye
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.ellipse(0, 0, 7, 10, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = this.colors.eye;
        ctx.beginPath();
        ctx.ellipse(2, 0, 4, 7, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(3, -3, 2.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(1, 3, 1, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    
    ctx.restore();
  }

}
