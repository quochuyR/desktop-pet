import { BaseRenderer } from './BaseRenderer';
import { hexToRgba } from '../utils';
import type { PetState } from '../state.svelte';

export class ShellRenderer extends BaseRenderer {
  drawSoftHexagon(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, color: string) {
    ctx.fillStyle = color;
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const angle = (i * Math.PI) / 3;
      const px = x + Math.cos(angle) * r;
      const py = y + Math.sin(angle) * r;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
  }

  _drawShellPattern(ctx: CanvasRenderingContext2D, pattern: string) {
    // Derive a pattern color from the shell rim with consistent opacity
    const pc = this.colors.shellRim; // e.g. "#2eb886"
    const col = hexToRgba(pc, 0.55);
    const colLight = hexToRgba(pc, 0.28);

    if (pattern === 'classic') {
      // 3 soft hexagons — original look
      this.drawSoftHexagon(ctx, 0, -9, 7, col);
      this.drawSoftHexagon(ctx, -14, -2, 6, col);
      this.drawSoftHexagon(ctx, 14, -2, 6, col);

    } else if (pattern === 'flowers') {
      // 5-petal flowers at 3 positions
      const drawFlower = (fx: number, fy: number, pr: number) => {
        for (let i = 0; i < 5; i++) {
          const a = (i / 5) * Math.PI * 2;
          ctx.fillStyle = col;
          ctx.beginPath();
          ctx.ellipse(fx + Math.cos(a) * pr * 0.9, fy + Math.sin(a) * pr * 0.9, pr, pr * 0.55, a, 0, Math.PI * 2);
          ctx.fill();
        }
        // Center
        ctx.fillStyle = 'rgba(255,255,255,0.7)';
        ctx.beginPath();
        ctx.arc(fx, fy, pr * 0.5, 0, Math.PI * 2);
        ctx.fill();
      };
      drawFlower(0, -10, 4.5);
      drawFlower(-14, -1, 3.8);
      drawFlower(14, -1, 3.8);

    } else if (pattern === 'stars') {
      // Sparkle 4-point stars
      const drawStar4 = (sx: number, sy: number, r: number) => {
        ctx.fillStyle = col;
        ctx.beginPath();
        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * Math.PI * 2;
          const rad = i % 2 === 0 ? r : r * 0.38;
          const px = sx + Math.cos(a - Math.PI / 2) * rad;
          const py = sy + Math.sin(a - Math.PI / 2) * rad;
          i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fill();
      };
      drawStar4(0, -11, 7);
      drawStar4(-14, -1, 5.5);
      drawStar4(14, -1, 5.5);
      // tiny twinkle dots
      ctx.fillStyle = colLight;
      ctx.beginPath(); ctx.arc(-6, -6, 2, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(6, -6, 2, 0, Math.PI * 2); ctx.fill();

    } else if (pattern === 'hearts') {
      // Cute pixel-style hearts
      const drawHeart = (hx: number, hy: number, s: number) => {
        ctx.fillStyle = col;
        ctx.save();
        ctx.translate(hx, hy);
        ctx.scale(s, s);
        ctx.beginPath();
        ctx.moveTo(0, 1);
        ctx.bezierCurveTo(-5, -3, -10, 1, -5, 5);
        ctx.lineTo(0, 9);
        ctx.lineTo(5, 5);
        ctx.bezierCurveTo(10, 1, 5, -3, 0, 1);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      };
      drawHeart(0, -17, 0.85);
      drawHeart(-15, -6, 0.7);
      drawHeart(15, -6, 0.7);

    } else if (pattern === 'bubbles') {
      // Overlapping pastel circles with stroke
      const bubblePos = [
        [0, -10, 7.5], [-13, -1, 6], [13, -1, 6],
        [-5, -4, 4], [5, -4, 4]
      ];
      for (const [bx, by, br] of bubblePos) {
        ctx.fillStyle = colLight;
        ctx.strokeStyle = col;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(bx, by, br, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        // tiny shine
        ctx.fillStyle = 'rgba(255,255,255,0.55)';
        ctx.beginPath();
        ctx.arc(bx - br * 0.3, by - br * 0.3, br * 0.25, 0, Math.PI * 2);
        ctx.fill();
      }

    } else if (pattern === 'clouds') {
      // Fluffy cloud puffs
      const drawCloud = (cx2: number, cy2: number, s: number) => {
        ctx.fillStyle = col;
        const puffs = [
          [0, 0, s * 1.1],
          [-s * 0.9, s * 0.3, s * 0.75],
          [s * 0.9, s * 0.3, s * 0.75],
          [-s * 0.45, -s * 0.5, s * 0.7],
          [s * 0.45, -s * 0.5, s * 0.7],
        ];
        for (const [px, py, pr] of puffs) {
          ctx.beginPath();
          ctx.arc(cx2 + px, cy2 + py, pr, 0, Math.PI * 2);
          ctx.fill();
        }
      };
      drawCloud(0, -10, 5.5);
      drawCloud(-14, -1, 4.5);
      drawCloud(14, -1, 4.5);

    } else if (pattern === 'diamonds') {
      // Rhombus / diamond shapes
      const drawDiamond = (dx: number, dy: number, w: number, h: number) => {
        ctx.fillStyle = col;
        ctx.strokeStyle = 'rgba(255,255,255,0.4)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(dx, dy - h);
        ctx.lineTo(dx + w, dy);
        ctx.lineTo(dx, dy + h);
        ctx.lineTo(dx - w, dy);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        // inner shine line
        ctx.strokeStyle = 'rgba(255,255,255,0.6)';
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.moveTo(dx - w * 0.35, dy - h * 0.35);
        ctx.lineTo(dx + w * 0.35, dy - h * 0.35);
        ctx.stroke();
      };
      drawDiamond(0, -10, 6, 9);
      drawDiamond(-14, -1, 5, 7.5);
      drawDiamond(14, -1, 5, 7.5);
    }
  }

}
