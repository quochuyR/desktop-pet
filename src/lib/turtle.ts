import type { PetState } from './state.svelte';
import type { GlobalState } from './state.svelte';

export class TurtleRenderer {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  colors: Record<string, string>;
  particles: any[];
  time: number;
  blinkTimer: number;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
    
    // Cute Pastel Colors
    this.colors = {
      skin: '#a8ffcc',
      shell: '#42d49c',
      shellRim: '#2eb886',
      eye: '#1e3a29',
      blush: 'rgba(255, 105, 180, 0.35)',
      belly: '#fef5d1'
    };
    this.particles = [];
    this.time = 0;
    this.blinkTimer = 0;
  }

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
    // helper to parse hex into rgba
    const hex2rgba = (hex: string, alpha: number) => {
      const r = parseInt(hex.slice(1,3), 16);
      const g = parseInt(hex.slice(3,5), 16);
      const b = parseInt(hex.slice(5,7), 16);
      return `rgba(${r},${g},${b},${alpha})`;
    };
    const col = hex2rgba(pc, 0.55);
    const colLight = hex2rgba(pc, 0.28);

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



  // ─── FEET ────────────────────────────────────────────────────────────────────
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

  // ─── TAIL ────────────────────────────────────────────────────────────────────
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

  // ─── HEAD SHAPE ───────────────────────────────────────────────────────────────
  _drawHeadShape(ctx: CanvasRenderingContext2D, style: string) {
    ctx.fillStyle = this.colors.skin;
    if (style === 'round') {
      // Big perfectly round chubby head
      ctx.beginPath();
      ctx.arc(4, -5, 23, 0, Math.PI * 2);
      ctx.fill();
    } else if (style === 'chibi') {
      // Wide, slightly squished with puffed sides
      ctx.beginPath();
      ctx.roundRect(-13, -4, 30, 22, 9);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(4, -7, 19, Math.PI, 0);
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

  addHeart(x: number, y: number) {

    this.particles.push({
      x: x + (Math.random() - 0.5) * 30,
      y: y - 20,
      vx: 0,
      vy: -1 - Math.random() * 2,
      life: 1.0,
      type: 'heart'
    });
  }

  addStar(x: number, y: number, vx: number, vy: number) {
    this.particles.push({
      x: x, y: y,
      vx: vx, vy: vy,
      life: 1.0,
      type: 'star',
      rot: Math.random() * Math.PI * 2,
      rotSpeed: (Math.random() - 0.5) * 0.5
    });
  }

  addDust(x: number, y: number, vx: number | null = null, vy: number | null = null) {
    this.particles.push({
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
    this.particles.push({
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
    this.particles.push({
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
    this.particles.push({
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
    this.particles.push({
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
    this.particles.push({
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
      this.particles.push({
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

  _renderParticles(ctx: CanvasRenderingContext2D) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      let p = this.particles[i];
      p.life -= 0.02;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
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

  drawRetracted(ctx: CanvasRenderingContext2D, petState: PetState, cx: number, cy: number) {
    const t = this.time;

    ctx.save();
    ctx.translate(cx, cy);

    let rot = petState.rotation || 0;
    if (petState.currentAction === 'celebrate_fireworks') {
      rot += Math.sin(this.time * 1.8) * 0.22;
    }
    const isTumbling = petState.currentAction === 'falling' || petState.currentAction === 'flipped' || petState.currentAction === 'dangling';
    if (rot !== 0) {
      if (isTumbling) {
        ctx.translate(0, -15);
        ctx.rotate(rot);
        ctx.translate(0, 15);
      } else {
        ctx.rotate(rot);
      }
    }

    const sx = petState.stretch || 1.0;
    const sy = petState.squash || 1.0;
    if (sx !== 1.0 || sy !== 1.0) {
      ctx.scale(sx, sy);
    }

    if (petState.facingLeft) ctx.scale(-1, 1);

    const breathe = Math.sin(t * 0.6) * 1.5;

    const glowR = ctx.createRadialGradient(0, -5, 10, 0, -5, 50);
    glowR.addColorStop(0, 'rgba(100, 255, 180, 0.18)');
    glowR.addColorStop(1, 'rgba(100, 255, 180, 0)');
    ctx.fillStyle = glowR;
    ctx.beginPath();
    ctx.arc(0, -5, 50, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = this.colors.shell;
    ctx.beginPath();
    ctx.arc(0, breathe * 0.3, 34, Math.PI, 0);
    ctx.fill();

    ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
    ctx.beginPath();
    ctx.ellipse(-8, -18 + breathe * 0.3, 11, 4.5, -0.25, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(14, -10 + breathe * 0.3, 5, 2.5, 0.2, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = this.colors.shellRim;
    ctx.lineWidth = 1.5;
    ctx.globalAlpha = 0.4;
    ctx.beginPath();
    ctx.moveTo(-20, -8 + breathe * 0.3);
    ctx.quadraticCurveTo(0, -28 + breathe * 0.3, 20, -8 + breathe * 0.3);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-10, 2 + breathe * 0.3);
    ctx.quadraticCurveTo(0, -10 + breathe * 0.3, 10, 2 + breathe * 0.3);
    ctx.stroke();
    ctx.globalAlpha = 1.0;

    ctx.fillStyle = this.colors.shellRim;
    ctx.beginPath();
    ctx.roundRect(-37, -2 + breathe * 0.3, 74, 10, 5);
    ctx.fill();

    const wiggle = Math.sin(t * 3) * 6;
    ctx.fillStyle = this.colors.skin;

    ctx.save();
    ctx.translate(-20, 8 + breathe);
    ctx.rotate((-wiggle * 0.4) * Math.PI / 180);
    ctx.beginPath();
    ctx.roundRect(-7, 0, 14, 10, 7);
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.translate(20, 8 + breathe);
    ctx.rotate((wiggle * 0.4) * Math.PI / 180);
    ctx.beginPath();
    ctx.roundRect(-7, 0, 14, 10, 7);
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.translate(-30, 0);
    ctx.rotate(Math.sin(t * 0.5) * 0.1);
    ctx.beginPath();
    ctx.moveTo(2, -2);
    ctx.quadraticCurveTo(-10, 0, -8, 5);
    ctx.quadraticCurveTo(-4, 8, 2, 6);
    ctx.fillStyle = this.colors.skin;
    ctx.fill();
    ctx.restore();

    const peekY = 4 + breathe;
    const eyeOpenness = Math.max(0, Math.sin(t * 0.3) * 0.5 + 0.5);

    ctx.save();
    ctx.translate(-10, peekY);
    ctx.fillStyle = '#1e3a29';
    ctx.globalAlpha = 0.6 + eyeOpenness * 0.4;
    ctx.beginPath();
    ctx.arc(0, 0, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(0.8, -0.8, 0.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.restore();

    ctx.save();
    ctx.translate(10, peekY);
    ctx.fillStyle = '#1e3a29';
    ctx.globalAlpha = 0.6 + eyeOpenness * 0.4;
    ctx.beginPath();
    ctx.arc(0, 0, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(0.8, -0.8, 0.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.restore();

    ctx.restore();
  }

  drawSpeechBubble(ctx: CanvasRenderingContext2D, uiState: GlobalState, petState: PetState, turtleX: number, turtleY: number) {
    const text = uiState.thinkingVisible ? '...' : uiState.speechText;
    if (!text && !uiState.thinkingVisible) return;

    ctx.save();
    const font = 'bold 13px "Segoe UI", Arial, sans-serif';
    ctx.font = font;

    const maxWidth = 160;
    const padding = 10;
    const lineHeight = 17;
    // Word-wrap the text
    const words = text.split(' ');
    const lines: string[] = [];
    let currentLine = '';
    for (const word of words) {
      const testLine = currentLine ? currentLine + ' ' + word : word;
      const metrics = ctx.measureText(testLine);
      if (metrics.width > maxWidth - padding * 2 && currentLine) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    }
    if (currentLine) lines.push(currentLine);

    if (uiState.thinkingVisible) {
      // Thinking dots animation
      const dotCount = Math.floor(this.time * 0.3) % 4;
      lines.length = 0;
      lines.push('• '.repeat(dotCount + 1).trim() || '•');
    }

    const bubbleW = Math.min(maxWidth, Math.max(...lines.map(l => ctx.measureText(l).width)) + padding * 2);
    const bubbleH = lines.length * lineHeight + padding * 2;
    const tailH = 12;

    // Position bubble ABOVE and slightly RIGHT of turtle head by default
    // Turtle head is at approx (turtleX + 22, turtleY - 18)
    const headX = turtleX + 22;
    const headY = turtleY - 20;

    // We constrain the bubble position to remain visible on the actual screen:
    const minX = Math.max(6, petState.monitorX - petState.globalX + 6);
    const maxX = Math.min(this.canvas.width - 6, petState.monitorX + petState.screenW - petState.globalX - 6);

    let bx = headX - 10;
    bx = Math.max(minX, Math.min(maxX - bubbleW, bx));

    // For vertical bounds:
    // If the bubble is placed above the turtle, check if it goes off-screen at the top:
    const minY = Math.max(6, petState.monitorY - petState.globalY + 6);
    const maxY = Math.min(this.canvas.height - 6, petState.monitorY + petState.screenH - petState.globalY - 6);

    let by = headY - bubbleH - tailH - 4;
    const isBelow = by < minY;

    if (isBelow) {
      // Position the bubble below the turtle's body so it remains fully visible on screen
      by = headY + 40;
      by = Math.max(minY, Math.min(maxY - bubbleH, by));
    } else {
      by = Math.max(minY, Math.min(maxY - bubbleH, by));
    }

    // Draw bubble shadow
    ctx.shadowColor = 'rgba(0,0,0,0.25)';
    ctx.shadowBlur = 8;
    ctx.shadowOffsetY = 3;

    // Bubble body
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.roundRect(bx, by, bubbleW, bubbleH, 10);
    ctx.fill();
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;

    // Border
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.roundRect(bx, by, bubbleW, bubbleH, 10);
    ctx.stroke();

    // Tail (triangle pointing to turtle head)
    const tailX = Math.max(bx + 16, Math.min(bx + bubbleW - 20, headX));
    const tailBaseY = isBelow ? by : by + bubbleH;
    const tailTipY = isBelow ? headY + 20 : headY - 2;

    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(tailX - 9, tailBaseY);
    ctx.lineTo(tailX + 9, tailBaseY);
    ctx.lineTo(headX, tailTipY);
    ctx.closePath();
    ctx.fill();

    // Tail border — draw only the two side lines
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(tailX - 9, tailBaseY);
    ctx.lineTo(headX, tailTipY);
    ctx.moveTo(tailX + 9, tailBaseY);
    ctx.lineTo(headX, tailTipY);
    ctx.stroke();

    // Cover tail base seam with white
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(tailX - 8, tailBaseY - (isBelow ? 0 : 2), 18, 4);

    // Text
    ctx.fillStyle = '#1e293b';
    ctx.font = font;
    ctx.textBaseline = 'top';
    for (let i = 0; i < lines.length; i++) {
      ctx.fillText(lines[i], bx + padding, by + padding + i * lineHeight);
    }
    ctx.restore();
  }

  render(petState: PetState, uiState?: GlobalState, deltaTimeMs: number = 16.67, isPreview: boolean = false) {
    this.time += (deltaTimeMs / 1000) * 6.0;

    // Dynamic Color Themes
    const theme = (petState as any).colorTheme || 'default';
    if (theme === 'strawberry') {
      this.colors.skin = '#ffccd5';
      this.colors.shell = '#ff4d6d';
      this.colors.shellRim = '#c9184a';
      this.colors.belly = '#fff0f3';
    } else if (theme === 'ocean') {
      this.colors.skin = '#c0e4fc';
      this.colors.shell = '#3a86c8';
      this.colors.shellRim = '#215c91';
      this.colors.belly = '#e1f2fe';
    } else if (theme === 'matcha') {
      this.colors.skin = '#e2f0d9';
      this.colors.shell = '#70ad47';
      this.colors.shellRim = '#548235';
      this.colors.belly = '#f2f8ee';
    } else if (theme === 'galaxy') {
      this.colors.skin = '#e8dbfc';
      this.colors.shell = '#6c5ce7';
      this.colors.shellRim = '#4834d4';
      this.colors.belly = '#f5f0ff';
    } else {
      // default Mint / Green
      this.colors.skin = '#a8ffcc';
      this.colors.shell = '#42d49c';
      this.colors.shellRim = '#2eb886';
      this.colors.belly = '#fef5d1';
    }

    if (Math.floor(this.time * 10) % 100 === 0) {
      console.log(`[TurtleRenderer] Active Action: "${petState.currentAction}", Mood: "${petState.mood}"`);
    }
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    let cx = this.canvas.width / 2;
    let cy = this.canvas.height / 2 + (this.canvas.height < 200 ? 15 : 0); // shift down slightly for smaller preview

    if (petState.mood === 'shell_retreat') {
      this._renderParticles(ctx);
      this.drawRetracted(ctx, petState, cx, cy);
      return;
    }

    this._renderParticles(ctx);

    ctx.save();
    
    const isPortal = petState.currentAction === 'portal';
    const portalProgress = isPortal
      ? Math.max(0, Math.min(1, petState.actionTimer / 120))
      : 0;

    if (isPortal) {
      this.drawBlackHole(ctx, cx, cy + 22, portalProgress);
      if (portalProgress < 0.2) {
        ctx.restore();
        return;
      }
    }

    ctx.translate(cx, cy);
    
    const rot = petState.rotation || 0;
    const sx = petState.stretch || 1.0;
    const sy = petState.squash || 1.0;
    
    const isTumbling = petState.currentAction === 'falling' || petState.currentAction === 'flipped' || petState.currentAction === 'dangling';
    if (rot !== 0) {
      if (isTumbling) {
        ctx.translate(0, -15);
        ctx.rotate(rot);
        ctx.translate(0, 15);
      } else {
        ctx.rotate(rot);
      }
    }
    if (sx !== 1.0 || sy !== 1.0) {
      ctx.translate(0, 15);
      ctx.scale(sx, sy);
      ctx.translate(0, -15);
    }

    if (isPortal) {
      const emerge = Math.max(0, Math.min(1, (portalProgress - 0.2) / 0.65));
      const eased = 1 - Math.pow(1 - emerge, 3);
      ctx.globalAlpha = Math.min(1, emerge * 1.35);
      ctx.translate(0, 42 * (1 - eased));
      ctx.scale(0.14 + eased * 0.86, 0.14 + eased * 0.86);
    } else if (petState.facingLeft) {
      ctx.scale(-1, 1);
    }

    let walkBob = 0;
    let legSwing = 0;
    let breath = Math.sin(this.time * 0.5) * 1.5;
    let headBob = 0;

    const isClimbing = petState.currentAction.startsWith('climbing') || petState.currentAction.startsWith('prepare_');
    const isScared = petState.currentAction === 'dangling' || petState.currentAction === 'falling' || petState.mood === 'scared';
    const isRunning = petState.mood === 'running' || petState.currentAction === 'hyper' || petState.isFastClimb;
    const isTired = petState.mood === 'tired' || petState.currentAction === 'tired';
    
    const isCelebrating = petState.currentAction === 'celebrate_fireworks';
    
    if (isCelebrating) {
      walkBob = Math.abs(Math.sin(this.time * 1.8)) * -14;
      legSwing = Math.sin(this.time * 3.0) * 35;
      headBob = Math.sin(this.time * 1.8) * 4;
    } else if (isScared || petState.currentAction === 'flipped') {
      walkBob = -25;
      legSwing = Math.sin(this.time * 6) * 30;
      headBob = 12;
    } else if (isTired) {
      walkBob = 6;
      breath = Math.sin(this.time * 1.5) * 2.5;
      headBob = 9 + breath * 0.4;
      legSwing = Math.sin(this.time * 0.5) * 4;
    } else if (isRunning) {
      walkBob = Math.abs(Math.sin(this.time * 2.5)) * -12;
      headBob = Math.sin(this.time * 2.5) * 3;
    } else if ((Math.abs(petState.vx) > 0.1 || isClimbing) && petState.mood !== 'sleeping') {
      const speed = isClimbing ? 2 : 1;
      walkBob = Math.abs(Math.sin(this.time * speed)) * -8;
      legSwing = Math.sin(this.time * speed) * 20;
    }

    // Spawn tear particles if crying
    if (petState.mood === 'crying' && Math.random() < 0.18) {
      const eyeGX = petState.facingLeft ? (cx - 34) : (cx + 34);
      const eyeGY = cy - 25 + headBob + breath * 0.5;
      this.addTear(eyeGX, eyeGY);
    }

    if (petState.mood === 'sleeping') {
      breath = Math.sin(this.time * 0.5) * 3;
      headBob = 8;
    }

    ctx.translate(0, walkBob);

    ctx.fillStyle = '#7dd6a9'; 
    
    if (isRunning) {
      const spinAngle = this.time * 6.5;
      for (let i = 0; i < 3; i++) {
        ctx.save();
        ctx.translate(-18, 4);
        ctx.rotate(spinAngle + i * (2 * Math.PI / 3));
        ctx.fillStyle = `rgba(125, 214, 169, ${i === 0 ? 0.9 : 0.45})`;
        ctx.beginPath();
        ctx.roundRect(-6, 0, 12, 12, 6);
        ctx.fill();
        ctx.restore();

        ctx.save();
        ctx.translate(12, 4);
        ctx.rotate(spinAngle + i * (2 * Math.PI / 3));
        ctx.fillStyle = `rgba(125, 214, 169, ${i === 0 ? 0.9 : 0.45})`;
        ctx.beginPath();
        ctx.roundRect(-6, 0, 12, 12, 6);
        ctx.fill();
        ctx.restore();
      }
    } else {
      this._drawFoot(ctx, -18, 4, 12, 12, -legSwing * Math.PI / 180, (petState as any).feetStyle || 'classic');
      this._drawFoot(ctx, 12, 4, 12, 12, legSwing * Math.PI / 180, (petState as any).feetStyle || 'classic');
    }

    this._drawTail(ctx, legSwing, breath, (petState as any).tailStyle || 'classic');

    ctx.save();
    ctx.translate(22, -18 + headBob + breath * 0.5);
    if (petState.currentAction === 'dangling') ctx.rotate(0.3);
    
    this._drawHeadShape(ctx, (petState as any).headStyle || 'classic');

    const hStyle = (petState as any).headStyle || 'classic';
    let hatOffset = {x: 5, y: -8};
    let faceOffset = {x: 0, y: 0};
    let faceScale = 1.0;

    if (hStyle === 'round') {
      hatOffset = {x: 4, y: -10};
      faceOffset = {x: 2, y: 2};
    } else if (hStyle === 'chibi') {
      hatOffset = {x: 4, y: -5};
      faceOffset = {x: -2, y: 4};
      faceScale = 0.9;
    } else if (hStyle === 'tiny') {
      hatOffset = {x: 3, y: -4};
      faceOffset = {x: -4, y: 3};
      faceScale = 0.75;
    }

    // Draw hat if petState.hatType is set
    if (petState.hatType && petState.hatType !== 'none') {
      ctx.save();
      ctx.translate(hatOffset.x, hatOffset.y); // head center
      
      if (petState.hatType === 'coder') {
        // --- CODER HAT (CUTE BEAR CAP) ---
        const strokeColor = '#1e293b';
        const mainColor = '#ff6b6b'; // Cute pastel red
        const darkColor = '#e17055'; // Shading red
        const detailColor = '#2d3436'; // Visor / button
        
        ctx.lineWidth = 2;
        ctx.strokeStyle = strokeColor;
        
        // Cap Gradient
        const capGrad = ctx.createLinearGradient(0, -32, 0, -16);
        capGrad.addColorStop(0, mainColor);
        capGrad.addColorStop(1, darkColor);

        // 1. Bear Ears (Draw first so cap dome covers their bases)
        // Left ear
        ctx.fillStyle = darkColor;
        ctx.beginPath();
        ctx.arc(-9, -27, 4.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        
        ctx.fillStyle = '#ff8787'; // Inner ear pink
        ctx.beginPath();
        ctx.arc(-9, -27, 2, 0, Math.PI * 2);
        ctx.fill();

        // Right ear
        ctx.fillStyle = darkColor;
        ctx.beginPath();
        ctx.arc(9, -27, 4.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        
        ctx.fillStyle = '#ff8787'; // Inner ear pink
        ctx.beginPath();
        ctx.arc(9, -27, 2, 0, Math.PI * 2);
        ctx.fill();

        // 2. Cap Dome
        ctx.fillStyle = capGrad;
        ctx.beginPath();
        ctx.arc(0, -16, 14, Math.PI, 0);
        ctx.fill();
        ctx.stroke();

        // 3. Tiny top button
        ctx.fillStyle = detailColor;
        ctx.beginPath();
        ctx.arc(0, -30, 2.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // 4. Backwards visor (left side, curved and stylized)
        ctx.fillStyle = detailColor;
        ctx.beginPath();
        ctx.roundRect(-22, -18, 10, 4, 1.5);
        ctx.fill();
        ctx.stroke();

        // 5. White "<>" logo inside cap dome
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        
        // Draw <
        ctx.beginPath();
        ctx.moveTo(-3, -23);
        ctx.lineTo(-6, -21);
        ctx.lineTo(-3, -19);
        ctx.stroke();
        
        // Draw >
        ctx.beginPath();
        ctx.moveTo(3, -23);
        ctx.lineTo(6, -21);
        ctx.lineTo(3, -19);
        ctx.stroke();

        // 6. Highlight shine (little white bean)
        ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.beginPath();
        ctx.ellipse(5, -25, 2.5, 1.2, -Math.PI / 4, 0, Math.PI * 2);
        ctx.fill();
      }
      else if (petState.hatType === 'wizard') {
        // --- CUTE WIZARD HAT (CONIC & BENT) ---
        const strokeColor = '#1e293b';
        const purpleMain = '#a29bfe'; // soft wizard purple
        const purpleDark = '#6c5ce7'; // dark purple
        const goldColor = '#feca57'; // gold
        
        ctx.lineWidth = 2;
        ctx.strokeStyle = strokeColor;

        // Gradient for cone
        const coneGrad = ctx.createLinearGradient(-10, -42, 10, -16);
        coneGrad.addColorStop(0, purpleMain);
        coneGrad.addColorStop(1, purpleDark);

        // 1. Hat brim (Ellipse first for 3D depth)
        ctx.fillStyle = purpleDark;
        ctx.beginPath();
        ctx.ellipse(0, -16, 21, 5, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // 2. Curved Wizard Cone (leaning back slightly - to the left)
        ctx.fillStyle = coneGrad;
        ctx.beginPath();
        ctx.moveTo(-15, -16);
        ctx.quadraticCurveTo(-14, -30, -9, -42);
        ctx.quadraticCurveTo(-7, -45, -5, -42);
        ctx.quadraticCurveTo(8, -28, 15, -16);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // 3. Gold Hat Band just above brim
        ctx.fillStyle = goldColor;
        ctx.beginPath();
        ctx.moveTo(-14, -17);
        ctx.quadraticCurveTo(0, -19, 14, -17);
        ctx.lineTo(13.5, -20);
        ctx.quadraticCurveTo(0, -22, -13.5, -20);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // 4. Little hanging star on tip of the hat (hanging from a small thread)
        ctx.strokeStyle = '#ffeaa7';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(-7, -43);
        ctx.lineTo(-11, -47);
        ctx.stroke();
        
        const drawMiniStar = (cx: number, cy: number, rOuter: number, rInner: number) => {
          ctx.fillStyle = goldColor;
          ctx.strokeStyle = strokeColor;
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          let rot = Math.PI / 2 * 3;
          let step = Math.PI / 5;
          for (let i = 0; i < 5; i++) {
            let x = cx + Math.cos(rot) * rOuter;
            let y = cy + Math.sin(rot) * rOuter;
            ctx.lineTo(x, y);
            rot += step;
            x = cx + Math.cos(rot) * rInner;
            y = cy + Math.sin(rot) * rInner;
            ctx.lineTo(x, y);
            rot += step;
          }
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
        };
        
        drawMiniStar(-12, -49, 4.5, 2);

        // 5. Draw decorative stars/moon on the hat dome
        ctx.fillStyle = '#ffeaa7';
        ctx.beginPath();
        ctx.arc(3, -28, 3, -Math.PI/2, Math.PI/2);
        ctx.quadraticCurveTo(1.5, -28, 3, -31);
        ctx.fill();

        drawMiniStar(-3, -26, 2.5, 1);
        
        // 6. Highlight shine
        ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
        ctx.beginPath();
        ctx.ellipse(3, -34, 2, 0.8, -Math.PI / 6, 0, Math.PI * 2);
        ctx.fill();
      }
      else if (petState.hatType === 'straw') {
        // --- CUTE STRAW HAT ---
        const strokeColor = '#1e293b';
        const strawLight = '#ffeaa7'; // soft yellow
        const strawDark = '#e1b12c'; // warm straw
        const ribbonRed = '#ff7675'; // soft red ribbon
        const ribbonDark = '#d63031';
        
        ctx.lineWidth = 2;
        ctx.strokeStyle = strokeColor;

        // Gradient for dome
        const domeGrad = ctx.createLinearGradient(0, -28, 0, -15);
        domeGrad.addColorStop(0, strawLight);
        domeGrad.addColorStop(1, strawDark);

        // 1. Straw Brim
        ctx.fillStyle = strawDark;
        ctx.beginPath();
        ctx.ellipse(0, -15, 22, 6, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // 2. Straw Dome
        ctx.fillStyle = domeGrad;
        ctx.beginPath();
        ctx.arc(0, -15, 12, Math.PI, 0);
        ctx.fill();
        ctx.stroke();

        // Straw texture lines (subtle details)
        ctx.strokeStyle = 'rgba(217, 160, 20, 0.4)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(0, -15, 9, Math.PI, 0);
        ctx.stroke();
        
        ctx.beginPath();
        ctx.moveTo(-6, -20); ctx.lineTo(-8, -15);
        ctx.moveTo(0, -22); ctx.lineTo(0, -15);
        ctx.moveTo(6, -20); ctx.lineTo(8, -15);
        ctx.stroke();

        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = 2;

        // 3. Red Ribbon
        const ribbonGrad = ctx.createLinearGradient(0, -19, 0, -15);
        ribbonGrad.addColorStop(0, ribbonRed);
        ribbonGrad.addColorStop(1, ribbonDark);
        
        ctx.fillStyle = ribbonGrad;
        ctx.beginPath();
        ctx.rect(-11.5, -19, 23, 4);
        ctx.fill();
        ctx.stroke();

        // 4. Cute ribbon bow on the side (right side, x > 0)
        ctx.fillStyle = ribbonRed;
        ctx.beginPath();
        ctx.moveTo(9, -17);
        ctx.lineTo(13, -20);
        ctx.lineTo(12, -17);
        ctx.lineTo(13, -14);
        ctx.closePath();
        
        ctx.moveTo(9, -17);
        ctx.lineTo(12, -15);
        ctx.lineTo(14, -13);
        ctx.lineTo(11, -17);
        ctx.lineTo(14, -21);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = ribbonDark;
        ctx.beginPath();
        ctx.arc(9.5, -17, 1.8, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // 5. Highlight shine
        ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.beginPath();
        ctx.ellipse(3, -23, 2.5, 1, -Math.PI / 4, 0, Math.PI * 2);
        ctx.fill();
      }
      else if (petState.hatType === 'crown') {
        // --- CROWN ---
        const strokeColor = '#1e293b';
        const goldColor = '#feca57';
        
        ctx.lineWidth = 2;
        ctx.strokeStyle = strokeColor;
        ctx.fillStyle = goldColor;
        
        // Draw crown base ellipse
        ctx.beginPath();
        ctx.ellipse(0, -16, 10, 3, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        
        // Draw crown peaks
        ctx.beginPath();
        ctx.moveTo(-10, -16);
        ctx.lineTo(-9, -26); // Left peak
        ctx.lineTo(-4, -20);
        ctx.lineTo(0, -29);  // Middle peak (taller)
        ctx.lineTo(4, -20);
        ctx.lineTo(9, -26);  // Right peak
        ctx.lineTo(10, -16);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        
        // Draw gems on peaks
        ctx.fillStyle = '#ff7675'; // Red gem middle
        ctx.beginPath();
        ctx.arc(0, -30, 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        
        ctx.fillStyle = '#0984e3'; // Blue gems sides
        ctx.beginPath();
        ctx.arc(-9, -27, 1.5, 0, Math.PI * 2);
        ctx.arc(9, -27, 1.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
      else if (petState.hatType === 'party') {
        // --- PARTY HAT ---
        const strokeColor = '#1e293b';
        ctx.lineWidth = 2;
        ctx.strokeStyle = strokeColor;
        
        // Cone body
        ctx.fillStyle = '#a29bfe'; // Purple
        ctx.beginPath();
        ctx.moveTo(-9, -15);
        ctx.lineTo(0, -38);
        ctx.lineTo(9, -15);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        
        // Stripes on hat
        ctx.strokeStyle = '#fd79a8'; // Pink stripes
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(-6, -22);
        ctx.lineTo(4, -17);
        ctx.moveTo(-3, -30);
        ctx.lineTo(2, -26);
        ctx.stroke();
        
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = 2;
        
        // Pom pom on top
        ctx.fillStyle = '#ffeaa7'; // Yellow pom pom
        ctx.beginPath();
        ctx.arc(0, -39, 3.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
      else if (petState.hatType === 'chef') {
        // --- CHEF HAT ---
        const strokeColor = '#1e293b';
        ctx.lineWidth = 2;
        ctx.strokeStyle = strokeColor;
        
        // Chef hat white puff
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        // Lower band
        ctx.rect(-9, -19, 18, 5);
        ctx.fill();
        ctx.stroke();
        
        // Puffy top
        ctx.beginPath();
        ctx.arc(-8, -25, 7, 0, Math.PI * 2);
        ctx.arc(8, -25, 7, 0, Math.PI * 2);
        ctx.arc(0, -29, 9, 0, Math.PI * 2);
        ctx.closePath();
        ctx.fill();
        
        // Redraw outline around the whole puff shape
        ctx.beginPath();
        ctx.arc(-8, -25, 7, Math.PI * 0.75, Math.PI * 1.5);
        ctx.arc(0, -29, 9, Math.PI * 1.15, Math.PI * 1.85);
        ctx.arc(8, -25, 7, Math.PI * 1.5, Math.PI * 2.25);
        ctx.stroke();
        
        // Redraw lower band outline
        ctx.beginPath();
        ctx.rect(-9, -19, 18, 5);
        ctx.stroke();
      }
      
      ctx.restore();
    }
    
    ctx.save();
    ctx.translate(faceOffset.x, faceOffset.y);
    ctx.scale(faceScale, faceScale);

    if (petState.mood !== 'sleeping') {
      ctx.fillStyle = this.colors.blush;
      ctx.beginPath();
      ctx.ellipse(15, 2, 7, 3.5, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    
    if (this.blinkTimer > 0) {
      this.blinkTimer--;
    } else if (Math.random() < 0.005) {
      this.blinkTimer = 12;
    }
    const isBlink = this.blinkTimer > 0 || petState.mood === 'sleeping' || isTired;
    const isHappy = (petState.mood === 'happy' || petState.mood === 'excited' || isRunning) && !isTired;
    const isCrying = petState.mood === 'crying';
    this.drawAnimeEye(ctx, 12, -7, isBlink, isHappy, isScared, isCrying, (petState as any).eyeStyle || 'classic');

    // Draw glasses if set (or force reading glasses when reading a book)
    let activeGlasses = (petState as any).glassesType || 'none';
    if (petState.currentAction === 'read_book' && activeGlasses === 'none') {
      activeGlasses = 'reading';
    }

    if (activeGlasses && activeGlasses !== 'none') {
      ctx.save();
      ctx.translate(12, -7); // position of eye
      
      if (activeGlasses === 'reading') {
        ctx.strokeStyle = '#d63031'; // red glasses frames
        ctx.lineWidth = 2.0;
        ctx.beginPath();
        ctx.arc(0, 0, 8, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(-8, 0);
        ctx.lineTo(-20, -1);
        ctx.stroke();
      } else if (activeGlasses === 'sunglasses') {
        ctx.fillStyle = '#1e293b'; // dark shades frame
        ctx.strokeStyle = '#1e293b';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(-10, -5);
        ctx.lineTo(8, -5);
        ctx.lineTo(5, 5);
        ctx.lineTo(-7, 5);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(-7, 0);
        ctx.lineTo(-22, -2);
        ctx.stroke();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(-2, -3);
        ctx.lineTo(2, 3);
        ctx.stroke();
      } else if (activeGlasses === 'star') {
        ctx.strokeStyle = '#feca57'; // gold star glasses
        ctx.lineWidth = 2;
        ctx.fillStyle = 'rgba(254, 202, 87, 0.25)';
        
        const drawStarPath = (cx: number, cy: number, rOuter: number, rInner: number) => {
          ctx.beginPath();
          let rot = Math.PI / 2 * 3;
          let step = Math.PI / 5;
          for (let i = 0; i < 5; i++) {
            let x = cx + Math.cos(rot) * rOuter;
            let y = cy + Math.sin(rot) * rInner;
            ctx.lineTo(x, y);
            rot += step;
            x = cx + Math.cos(rot) * rInner;
            y = cy + Math.sin(rot) * rInner;
            ctx.lineTo(x, y);
            rot += step;
          }
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
        };
        drawStarPath(0, 0, 9, 4);
        
        ctx.strokeStyle = '#feca57';
        ctx.beginPath();
        ctx.moveTo(-9, 0);
        ctx.lineTo(-22, -2);
        ctx.stroke();
      }
      
      ctx.restore();
    }



    // Draw cookie if eating snack
    if (petState.currentAction === 'eat_snack') {
      ctx.save();
      ctx.translate(34, 4); // in front of mouth
      
      // Nibble wiggle animation
      const chew = Math.sin(this.time * 2.5) * 1.5;
      ctx.translate(chew * 0.5, chew);
      
      // Draw cookie circle
      ctx.fillStyle = '#f5cd79'; // warm cookie gold
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 1.5;
      
      ctx.beginPath();
      const isBitten = (petState.actionTimer % 60) > 30;
      if (isBitten) {
        ctx.arc(0, 0, 11, -Math.PI * 0.25, Math.PI * 1.4);
      } else {
        ctx.arc(0, 0, 11, 0, Math.PI * 2);
      }
      ctx.fill();
      ctx.stroke();
      
      // Chocolate chips
      ctx.fillStyle = '#574b90';
      ctx.beginPath();
      ctx.arc(-4, -3, 1.5, 0, Math.PI * 2);
      ctx.arc(3, 2, 1.5, 0, Math.PI * 2);
      ctx.arc(-2, 4, 1.5, 0, Math.PI * 2);
      ctx.fill();
      
      ctx.restore();
    }
    
    // Draw bubble tea cup if drinking water
    if (petState.currentAction === 'drink_water') {
      ctx.save();
      ctx.translate(34, 8); // in front of mouth
      
      // Sip animation: slight tilt/shake
      const tilt = Math.sin(this.time * 2.0) * 0.08;
      ctx.rotate(tilt);
      
      // Draw boba cup body (semi-transparent white glass)
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 1.5;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
      ctx.beginPath();
      ctx.moveTo(-6, -11);
      ctx.lineTo(6, -11);
      ctx.lineTo(4, 11);
      ctx.lineTo(-4, 11);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      
      // Milk tea liquid inside cup
      ctx.fillStyle = '#ffeaa7'; // milk tea orange-brown
      ctx.beginPath();
      ctx.moveTo(-5.5, -4);
      ctx.lineTo(5.5, -4);
      ctx.lineTo(4, 11);
      ctx.lineTo(-4, 11);
      ctx.closePath();
      ctx.fill();
      
      // Boba pearls inside milk tea
      ctx.fillStyle = '#2d3436';
      ctx.beginPath();
      ctx.arc(-2, 7, 1.5, 0, Math.PI * 2);
      ctx.arc(2, 8, 1.5, 0, Math.PI * 2);
      ctx.arc(0, 4, 1.5, 0, Math.PI * 2);
      ctx.arc(-1, 9, 1.5, 0, Math.PI * 2);
      ctx.fill();
      
      // Straw pointing from cup towards mouth
      ctx.strokeStyle = '#ff7675'; // pink straw
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.moveTo(0, 6);
      ctx.lineTo(-8, -15);
      ctx.stroke();
      
      ctx.restore();
    }
    
    ctx.strokeStyle = this.colors.eye;
    ctx.lineWidth = 1.5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    if (isTired) {
      ctx.fillStyle = '#ff7675';
      ctx.beginPath();
      ctx.ellipse(22, 5, 3, 4, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#ff5252';
      ctx.beginPath();
      ctx.arc(22, 8, 2.2, 0, Math.PI);
      ctx.fill();
    } else if (isHappy) {
      ctx.moveTo(20, 3);
      ctx.quadraticCurveTo(24, 8, 28, 3);
    } else if (petState.mood === 'sad') {
      ctx.moveTo(22, 5);
      ctx.quadraticCurveTo(24, 2, 26, 5);
    } else if (isScared) {
      ctx.fillStyle = '#ff7675';
      ctx.beginPath();
      ctx.arc(22, 5, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    } else if (petState.mood === 'sleeping') {
      ctx.moveTo(24, 4);
      ctx.lineTo(25, 4);
    } else {
      ctx.moveTo(22, 3);
      ctx.quadraticCurveTo(24, 6, 26, 3);
    }
    ctx.stroke();

    ctx.restore(); // END face context
    ctx.restore(); // END head context

    // Draw yellow-cream belly (plastron) first so it is underneath the shell
    ctx.save();
    ctx.translate(0, -6 + breath);
    ctx.fillStyle = this.colors.belly;
    ctx.beginPath();
    ctx.ellipse(-2, 8, 30, 9, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Soft horizontal dividers on belly
    ctx.strokeStyle = 'rgba(30, 58, 41, 0.15)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(-22, 6);
    ctx.lineTo(12, 6);
    ctx.moveTo(-18, 9);
    ctx.lineTo(8, 9);
    ctx.stroke();
    ctx.restore();

    ctx.save();
    ctx.translate(0, -12 + breath);
    
    ctx.fillStyle = this.colors.shell;
    ctx.beginPath();
    ctx.arc(0, 5, 30, Math.PI, 0); 
    ctx.fill();
    
    // Draw shell pattern based on petState.shellPattern
    const shellPat = (petState as any).shellPattern || 'classic';
    this._drawShellPattern(ctx, shellPat);
    
    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.beginPath();
    ctx.ellipse(-10, -12, 10, 4, -0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(12, -8, 4, 2, 0.2, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = this.colors.shellRim;
    ctx.beginPath();
    ctx.roundRect(-34, 2, 68, 10, 5);
    ctx.fill();
    ctx.restore();


    // Draw neck accessories/clothes ON TOP of the shell and belly
    const activeClothes = (petState as any).clothesType || 'none';
    if (activeClothes && activeClothes !== 'none') {
      ctx.save();
      // Apply the same head bobbing and breathing translations
      ctx.translate(22, -18 + headBob + breath * 0.5);
      if (petState.currentAction === 'dangling') ctx.rotate(0.3);
      ctx.translate(-8, 12); // Neck position relative to head center
      
      const strokeColor = '#1e293b';
      ctx.lineWidth = 2;
      ctx.strokeStyle = strokeColor;
      
      if (activeClothes === 'bowtie') {
        ctx.fillStyle = '#ff7675'; // Cute red bowtie
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(-8, -5);
        ctx.lineTo(-8, 5);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(8, -5);
        ctx.lineTo(8, 5);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        
        ctx.fillStyle = '#d63031';
        ctx.beginPath();
        ctx.arc(0, 0, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      } else if (activeClothes === 'scarf') {
        ctx.fillStyle = '#ff7675'; // Cozy red scarf
        ctx.beginPath();
        ctx.roundRect(-6, -3, 16, 6, 3);
        ctx.fill();
        ctx.stroke();
        
        ctx.fillStyle = '#d63031';
        ctx.beginPath();
        ctx.moveTo(-2, 2);
        ctx.quadraticCurveTo(-12, 8, -10, 16);
        ctx.lineTo(-15, 14);
        ctx.quadraticCurveTo(-16, 6, -5, 1);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        
        ctx.strokeStyle = '#ffeaa7';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(-11, 11);
        ctx.lineTo(-14, 9);
        ctx.moveTo(-8, 15);
        ctx.lineTo(-12, 13);
        ctx.stroke();
      } else if (activeClothes === 'ribbon') {
        ctx.fillStyle = '#fd79a8'; // Pink ribbon bow
        ctx.beginPath();
        ctx.ellipse(-5, -2, 5, 3, -Math.PI / 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        
        ctx.beginPath();
        ctx.ellipse(5, -2, 5, 3, Math.PI / 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        
        ctx.beginPath();
        ctx.moveTo(-2, 1);
        ctx.lineTo(-6, 9);
        ctx.lineTo(-2, 7);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        
        ctx.beginPath();
        ctx.moveTo(2, 1);
        ctx.lineTo(6, 9);
        ctx.lineTo(2, 7);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        
        ctx.fillStyle = '#e84393';
        ctx.beginPath();
        ctx.arc(0, 0, 2.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
      
      ctx.restore();
    }

    ctx.fillStyle = this.colors.skin;
    
    if (isRunning) {
      const spinAngle = this.time * 6.5;
      for (let i = 0; i < 3; i++) {
        ctx.save();
        ctx.translate(-16, 8 + breath);
        ctx.rotate(spinAngle + i * (2 * Math.PI / 3));
        ctx.fillStyle = `rgba(168, 255, 204, ${i === 0 ? 0.95 : 0.5})`;
        ctx.beginPath();
        ctx.roundRect(-8, 0, 16, 14, 8);
        ctx.fill();
        ctx.restore();

        ctx.save();
        ctx.translate(16, 8 + breath);
        ctx.rotate(spinAngle + i * (2 * Math.PI / 3));
        ctx.fillStyle = `rgba(168, 255, 204, ${i === 0 ? 0.95 : 0.5})`;
        ctx.beginPath();
        ctx.roundRect(-8, 0, 16, 14, 8);
        ctx.fill();
        ctx.restore();
      }
    } else {
      this._drawFoot(ctx, -16, 8 + breath, 16, 14, legSwing * Math.PI / 180, (petState as any).feetStyle || 'classic');
      this._drawFoot(ctx, 16, 8 + breath, 16, 14, -legSwing * Math.PI / 180, (petState as any).feetStyle || 'classic');
    }

    if (petState.currentAction === 'celebrate_fireworks') {
      const wave = Math.sin(this.time * 3.0) * 0.5;
      // Draw left paper fan
      this.drawPaperFan(ctx, -24, 4 + breath, -Math.PI * 0.75 + wave, 18, '#ff7675');
      // Draw right paper fan
      this.drawPaperFan(ctx, 24, 4 + breath, -Math.PI * 0.25 - wave, 18, '#74b9ff');
    }

    if (petState.currentAction === 'read_book') {
      ctx.save();
      // Position book on the ground in front of turtle
      ctx.translate(28, 20);
      
      // Book outline & cover
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 1.5;
      ctx.fillStyle = '#74b9ff'; // sky blue book cover
      ctx.beginPath();
      ctx.roundRect(-18, 0, 36, 10, 2);
      ctx.fill();
      ctx.stroke();
      
      // Left and right pages (white sheets)
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      // Left page
      ctx.moveTo(-16, -2);
      ctx.quadraticCurveTo(-8, -6, 0, -2);
      ctx.lineTo(0, 6);
      ctx.quadraticCurveTo(-8, 2, -16, 6);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      
      ctx.beginPath();
      // Right page
      ctx.moveTo(0, -2);
      ctx.quadraticCurveTo(8, -6, 16, -2);
      ctx.lineTo(16, 6);
      ctx.quadraticCurveTo(8, 2, 0, 6);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      
      // Text lines inside pages
      ctx.strokeStyle = '#b2bec3';
      ctx.lineWidth = 1;
      // Left page text lines
      ctx.beginPath();
      ctx.moveTo(-13, 1); ctx.lineTo(-3, 1);
      ctx.moveTo(-13, 3); ctx.lineTo(-5, 3);
      // Right page text lines
      ctx.moveTo(3, 1); ctx.lineTo(13, 1);
      ctx.moveTo(3, 3); ctx.lineTo(10, 3);
      ctx.stroke();
      
      ctx.restore();
    }

    ctx.restore();

    // Draw speech bubble on top of everything, anchored to turtle position
    if (!isPreview && uiState && (uiState.speechVisible || uiState.thinkingVisible)) {
      this.drawSpeechBubble(ctx, uiState, petState, cx, cy);
    }
  }
}
