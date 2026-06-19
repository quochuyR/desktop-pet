import type { PetState } from '../state.svelte';
import type { GlobalState } from '../state.svelte';
import { hexToRgba } from '../utils';
import { LimbsRenderer } from './LimbsRenderer';
import { ShellRenderer } from './ShellRenderer';
import { FaceRenderer } from './FaceRenderer';
import { AccessoryRenderer } from './AccessoryRenderer';
import { ParticleRenderer } from './ParticleRenderer';

export class TurtleRenderer {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  colors: Record<string, string>;
  particles: any[];
  time: number;
  blinkTimer: number;
  limbsRenderer: LimbsRenderer;
  shellRenderer: ShellRenderer;
  faceRenderer: FaceRenderer;
  accessoryRenderer: AccessoryRenderer;
  particleRenderer: ParticleRenderer;

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
    this.limbsRenderer = new LimbsRenderer(this);
    this.shellRenderer = new ShellRenderer(this);
    this.faceRenderer = new FaceRenderer(this);
    this.accessoryRenderer = new AccessoryRenderer(this);
    this.particleRenderer = new ParticleRenderer(this);
  }






  // ─── FEET ────────────────────────────────────────────────────────────────────

  // ─── TAIL ────────────────────────────────────────────────────────────────────

  // ─── HEAD SHAPE ───────────────────────────────────────────────────────────────






  







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
      this.particleRenderer._renderParticles(ctx);
      this.drawRetracted(ctx, petState, cx, cy);
      return;
    }

    this.particleRenderer._renderParticles(ctx);

    ctx.save();
    
    const isPortal = petState.currentAction === 'portal';
    const portalProgress = isPortal
      ? Math.max(0, Math.min(1, petState.actionTimer / 120))
      : 0;

    if (isPortal) {
      this.particleRenderer.drawBlackHole(ctx, cx, cy + 22, portalProgress);
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
      this.particleRenderer.addTear(eyeGX, eyeGY);
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
      this.limbsRenderer._drawFoot(ctx, -18, 4, 12, 12, -legSwing * Math.PI / 180, (petState as any).feetStyle || 'classic');
      this.limbsRenderer._drawFoot(ctx, 12, 4, 12, 12, legSwing * Math.PI / 180, (petState as any).feetStyle || 'classic');
    }

    this.limbsRenderer._drawTail(ctx, legSwing, breath, (petState as any).tailStyle || 'classic');

    ctx.save();
    ctx.translate(22, -18 + headBob + breath * 0.5);
    if (petState.currentAction === 'dangling') ctx.rotate(0.3);
    
    this.faceRenderer._drawHeadShape(ctx, (petState as any).headStyle || 'classic');

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
    this.faceRenderer.drawAnimeEye(ctx, 12, -7, isBlink, isHappy, isScared, isCrying, (petState as any).eyeStyle || 'classic');

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
    this.shellRenderer._drawShellPattern(ctx, shellPat);
    
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
      this.limbsRenderer._drawFoot(ctx, -16, 8 + breath, 16, 14, legSwing * Math.PI / 180, (petState as any).feetStyle || 'classic');
      this.limbsRenderer._drawFoot(ctx, 16, 8 + breath, 16, 14, -legSwing * Math.PI / 180, (petState as any).feetStyle || 'classic');
    }

    if (petState.currentAction === 'celebrate_fireworks') {
      const wave = Math.sin(this.time * 3.0) * 0.5;
      // Draw left paper fan
      this.accessoryRenderer.drawPaperFan(ctx, -24, 4 + breath, -Math.PI * 0.75 + wave, 18, '#ff7675');
      // Draw right paper fan
      this.accessoryRenderer.drawPaperFan(ctx, 24, 4 + breath, -Math.PI * 0.25 - wave, 18, '#74b9ff');
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
