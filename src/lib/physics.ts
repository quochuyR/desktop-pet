import { petState, state, CONSTANTS, updateActiveMonitor } from './state.svelte';
import { agentManager } from './agent/agent_manager';

// We'll export a generic way to add particles, so physics doesn't depend on a specific renderer instance
// The renderer will register its methods here.
export const particleSystem = {
  addStar: (x: number, y: number, vx: number, vy: number) => {},
  addDust: (x: number, y: number, vx?: number, vy?: number) => {},
  addBubble: (x: number, y: number) => {},
  addSweat: (x: number, y: number) => {},
  addTear: (x: number, y: number) => {},
  addFireworks: (x: number, y: number) => {},
  addCrumb: (x: number, y: number) => {},
};

function showSpeech(text: string, durationMs: number) {
  state.speechText = text;
  state.speechVisible = true;
  if (state.speechTimeout) clearTimeout(state.speechTimeout);
  state.speechTimeout = setTimeout(() => {
    state.speechVisible = false;
  }, durationMs);
}

function triggerClimbFall(speech: string, vxMultiplier = 1.0, angularVel = 1.0) {
  petState.currentAction = 'falling';
  petState.mood = 'crying';
  petState.actionTimer = 11; // Ensure it transitions to tired/flipped on landing
  petState.vy = 2.0; // initial downward speed
  petState.vx = (Math.random() > 0.5 ? 1 : -1) * (1.0 + Math.random() * 2.0) * vxMultiplier;
  petState.angularVelocity = (Math.random() > 0.5 ? 1 : -1) * (0.08 + Math.random() * 0.15) * angularVel;
  (petState as any).isThrown = true; // Let it spin cute
  showSpeech(speech, 3000);
}

export function updateMovement() {
  updateActiveMonitor(); // keep monitor bounds synced with current turtle globalX/Y
  
  const { W, H } = CONSTANTS;
  let leftWall = petState.monitorX - 185;
  let rightWall = petState.monitorX + petState.screenW - 215;
  let ceilingY = petState.monitorY - 185;
  let groundY = petState.monitorY + petState.screenH - 255; 

  const centerX = petState.monitorX + (petState.screenW - W) / 2;
  const centerY = petState.monitorY + (petState.screenH - H) / 2;

  if (state.statsVisible) {
    leftWall = centerX - 165;
    rightWall = centerX + 165;
    ceilingY = centerY - 165;
    groundY = centerY + 168;
  } 


  // Calculate dynamic active window platform ground
  let currentGroundY = groundY;
  let targetPlatform = null;
  let minPlatformTop = Infinity;

  const petCenterX = petState.globalX + 200;
  const petFootY = petState.globalY + 222; // Actual bottom of turtle's feet is at 222 logical pixels from canvas top
  const PLATFORM_PADDING = 5;

  if (state.platforms && state.platforms.length > 0) {
    for (let i = 0; i < state.platforms.length; i++) {
      const platform = state.platforms[i];
      if (petCenterX >= platform.left && petCenterX <= platform.right) {
        // Check if this platform's top border at petCenterX is covered by any window higher in Z-order (index j < i)
        let isCovered = false;
        for (let j = 0; j < i; j++) {
          const W = state.platforms[j];
          if (petCenterX >= W.left && petCenterX <= W.right &&
              platform.top >= W.top && platform.top <= W.bottom) {
            isCovered = true;
            break;
          }
        }
        if (isCovered) {
          continue;
        }

        // Robust one-way platform landing check:
        // - OR it was the active platform we were already tracking, we're still inside its X bounds, and we haven't fallen below its top
        const isCurrentlyActive = (
          petState.activePlatformId === platform.id && 
          petState.wasOnPlatform &&
          petFootY <= platform.top + 5
        );
        
        const prevPetFootY = petFootY - petState.vy;
        const validLanding = (petState.vy >= 0 && prevPetFootY <= platform.top + 5 && petFootY >= platform.top - 15);
        
        if (isCurrentlyActive || validLanding) {
          if (platform.top < minPlatformTop) {
            minPlatformTop = platform.top;
            targetPlatform = platform;
          }
        }
      }
    }
  }

  if (targetPlatform) {
    currentGroundY = targetPlatform.top - 222;
  }

  if (state.isDragging) {
    // Dangling logic
    petState.currentAction = 'dangling';
    petState.mood = 'scared';
    
    // Calculate drag velocity from position change in physical space
    const active = state.monitors.find(m => {
      const s = m.scale_factor || 1.0;
      return Math.round(m.x / s) === petState.monitorX && Math.round(m.y / s) === petState.monitorY;
    }) || state.monitors[0];
    const scale = active ? (active.scale_factor || 1.0) : 1.0;

    const currentPhysX = petState.globalX * scale;
    const currentPhysY = petState.globalY * scale;

    const lastDragPhysX = (petState as any).lastDragPhysX !== undefined ? (petState as any).lastDragPhysX : currentPhysX;
    const lastDragPhysY = (petState as any).lastDragPhysY !== undefined ? (petState as any).lastDragPhysY : currentPhysY;
    
    const dragVxPhys = currentPhysX - lastDragPhysX;
    const dragVyPhys = currentPhysY - lastDragPhysY;
    
    (petState as any).lastDragPhysX = currentPhysX;
    (petState as any).lastDragPhysY = currentPhysY;

    // Convert smooth physical velocity to logical velocity for the sway/squash logic
    const dragVx = dragVxPhys / scale;
    const dragVy = dragVyPhys / scale;
    
    // Sway rotation based on horizontal drag velocity
    const targetRot = Math.max(-0.6, Math.min(0.6, -dragVx * 0.04));
    petState.rotation += (targetRot - petState.rotation) * 0.12;
    
    // Squash/stretch based on drag speed: stretch vertically (taller/thinner) when dragged
    const dragSpeed = Math.sqrt(dragVx * dragVx + dragVy * dragVy);
    if (dragSpeed > 1) {
      const amount = Math.min(0.12, dragSpeed * 0.006);
      const targetStretch = 1.0 - amount; // thinner horizontally
      const targetSquash = 1.0 + amount;  // taller vertically
      petState.stretch += (targetStretch - petState.stretch) * 0.2;
      petState.squash += (targetSquash - petState.squash) * 0.2;
    } else {
      petState.stretch += (1.0 - petState.stretch) * 0.15;
      petState.squash += (1.0 - petState.squash) * 0.15;
    }
    
    petState.vx = 0;
    petState.vy = 0;
    petState.angularVelocity = 0;
    return;
  }

  if (petState.currentAction === 'celebrate_fireworks') {
    petState.vx = 0;
    petState.vy = 0;
    petState.mood = 'happy';
    petState.actionTimer++;
    
    // Launch a rocket firework periodically (every 90 frames, approx 1.5s)
    if (petState.actionTimer % 90 === 0) {
      particleSystem.addFireworks(petState.x, petState.y);
    }
    
    // Periodically ensure thoughts stay visible
    if (petState.actionTimer % 180 === 0) {
      state.speechVisible = true;
    }
    return;
  }

  petState.squash += (1.0 - petState.squash) * 0.15;
  petState.stretch += (1.0 - petState.stretch) * 0.15;

  const canFall = 
    petState.currentAction !== 'falling' && 
    petState.currentAction !== 'dangling' && 
    petState.currentAction !== 'flipped' && 
    !petState.currentAction.startsWith('climbing') && 
    !petState.currentAction.startsWith('prepare_') && 
    petState.currentAction !== 'hourly_break' && 
    petState.currentAction !== 'hourly_break_exit' &&
    petState.currentAction !== 'stats_dialog' && 
    petState.currentAction !== 'stats_dialog_exit' &&
    petState.currentAction !== 'portal';

  const onPlatform = currentGroundY < groundY;

  if (canFall && petState.globalY < currentGroundY - 2) {
    if (petState.wasOnPlatform) {
      // Platform disappeared or walked off: delay falling (Coyote Time)
      petState.platformLostTimer++;
      if (petState.platformLostTimer > 12) { // 200ms at 60fps
        if (petState.currentAction === 'sleep') {
          state.speechVisible = false;
        }
        petState.currentAction = 'falling';
        petState.vy = 0;
        petState.wasOnPlatform = false;
        petState.platformLostTimer = 0;
      }
    } else {
      // Fall immediately (no previous platform or already in air)
      if (petState.currentAction === 'sleep') {
        state.speechVisible = false;
      }
      petState.currentAction = 'falling';
      petState.vy = 0;
    }
  } else {
    // Reset timer when grounded
    petState.platformLostTimer = 0;
    
    // Force snap to ground to avoid floating point precision issues over time
    if (onPlatform && Math.abs(petState.globalY - currentGroundY) < 5) {
      petState.globalY = currentGroundY;
    }
  }

  petState.wasOnPlatform = onPlatform;
  if (onPlatform && targetPlatform) {
    petState.activePlatformId = targetPlatform.id;
    petState.prevPlatformState = { ...targetPlatform };
  } else {
    petState.activePlatformId = null;
    petState.prevPlatformState = null;
  }

  if (petState.currentAction !== 'falling' && petState.currentAction !== 'dangling' && petState.currentAction !== 'flipped' && !petState.currentAction.startsWith('climbing') && !petState.currentAction.startsWith('prepare_') && petState.currentAction !== 'hourly_break' && petState.currentAction !== 'hourly_break_exit' && petState.currentAction !== 'stats_dialog' && petState.currentAction !== 'stats_dialog_exit') {
     if (Math.abs(petState.rotation) > 0.01) {
       let targetRot = Math.round(petState.rotation / (Math.PI * 2)) * (Math.PI * 2);
       petState.rotation += (targetRot - petState.rotation) * 0.15;
     }
  }

  if (petState.currentAction === 'stats_dialog') {
    petState.actionTimer++;
    petState.vx = 0;
    petState.vy = 0;
    
    const centerX = petState.monitorX + (petState.screenW - W) / 2;
    const centerY = petState.monitorY + (petState.screenH - H) / 2;
    
    if (petState.actionTimer < 150) {
      const t = petState.actionTimer / 150;
      const easeT = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      
      const startX = (petState as any).statsStartX;
      const startY = (petState as any).statsStartY;
      
      const dx = startX - centerX;
      const dy = startY - centerY;
      const R = Math.sqrt(dx * dx + dy * dy);
      const theta0 = Math.atan2(dy, dx);
      
      // Spiral flight path: radius shrinks from R to 0, angle sweeps 1 loop
      const r = R * (1 - easeT);
      const theta = theta0 + easeT * Math.PI * 2;
      petState.globalX = centerX + r * Math.cos(theta);
      petState.globalY = centerY + r * Math.sin(theta);
      petState.x = 200;
      petState.y = 200;
      
      // Flying saucer spin: disc appears flattened (squash), horizontal width oscillates (stretch=cos)
      const spinDir = dx >= 0 ? 1 : -1;
      const angle = t * Math.PI * 6 * spinDir; // 3 full rotations in 2.5s
      petState.rotation = Math.sin(angle * 0.5) * 0.18; // subtle wobble for realism
      petState.stretch = Math.cos(angle);     // horizontal spin (disc width)
      petState.squash = 0.42;                 // always flat = disc shape from above
      petState.mood = 'shell_retreat';
    } else {
      petState.globalX = centerX;
      petState.globalY = centerY;
      petState.x = 200;
      petState.y = 200;
      petState.rotation = 0;
      petState.stretch = 1.0;
      petState.squash = 1.0;
      petState.mood = 'happy'; 
      
      if (state.pendingDialog === 'stats') state.statsVisible = true;
      else if (state.pendingDialog === 'decorate') state.decorateVisible = true;
      else if (state.pendingDialog === 'update') state.updateVisible = true;
      state.pendingDialog = null;
    }
    return;
  }

  if (petState.currentAction === 'stats_dialog_exit') {
    petState.actionTimer++;
    petState.vx = 0;
    petState.vy = 0;
    
    const centerX = petState.monitorX + (petState.screenW - W) / 2;
    const centerY = petState.monitorY + (petState.screenH - H) / 2;
    
    if (petState.actionTimer < 150) {
      const t = petState.actionTimer / 150;
      const easeT = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      
      const endX = (petState as any).statsOrigX;
      const endY = (petState as any).statsOrigY;
      
      const dx = endX - centerX;
      const dy = endY - centerY;
      const R = Math.sqrt(dx * dx + dy * dy);
      const theta0 = Math.atan2(dy, dx);
      
      // Radius grows from 0 to R, angle unwinds 1 time
      const r = R * easeT;
      const theta = theta0 - (1 - easeT) * Math.PI * 2;
      
      petState.globalX = centerX + r * Math.cos(theta);
      petState.globalY = centerY + r * Math.sin(theta);
      
      petState.x = 200;
      petState.y = 200;
      
      // Flying saucer spin reverse on exit
      const spinDir = dx >= 0 ? 1 : -1;
      const angle = (1 - t) * Math.PI * 6 * spinDir;
      petState.rotation = Math.sin(angle * 0.5) * 0.18;
      petState.stretch = Math.cos(angle);
      petState.squash = 0.42;
      petState.mood = 'shell_retreat';
    } else {
      petState.globalX = (petState as any).statsOrigX;
      petState.globalY = (petState as any).statsOrigY;
      // Don't interpolate the window teleport
      petState.prevGlobalX = (petState as any).statsOrigX;
      petState.prevGlobalY = (petState as any).statsOrigY;
      
      petState.x = 200;
      petState.y = 200;
      petState.rotation = 0;
      petState.currentAction = 'wander';
      petState.mood = 'walking';
      petState.actionTimer = 0;
    }
    return;
  }

  if (petState.currentAction === 'hourly_break') {
    petState.actionTimer++;
    petState.vx = 0;
    petState.vy = 0;
    
    const centerX = petState.monitorX + (petState.screenW - W) / 2;
    const centerY = petState.monitorY + (petState.screenH - H) / 2;
    
    if (petState.actionTimer < 150) {
      const t = petState.actionTimer / 150;
      const easeT = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      
      const startX = petState.breakStartX;
      const startY = petState.breakStartY;
      
      const dx = startX - centerX;
      const dy = startY - centerY;
      const R = Math.sqrt(dx * dx + dy * dy);
      const theta0 = Math.atan2(dy, dx);
      
      // Radius shrinks from R to 0, angle spins 1 time
      const r = R * (1 - easeT);
      const theta = theta0 + easeT * Math.PI * 2;
      
      petState.globalX = centerX + r * Math.cos(theta);
      petState.globalY = centerY + r * Math.sin(theta);
      
      petState.x = 200;
      petState.y = 200;
      
      // Flying saucer spin for break
      const spinDir = dx >= 0 ? 1 : -1;
      const angle = t * Math.PI * 6 * spinDir;
      petState.rotation = Math.sin(angle * 0.5) * 0.18;
      petState.stretch = Math.cos(angle);
      petState.squash = 0.42;
      petState.mood = 'shell_retreat';
      state.breakVisible = false;
    } else {
      petState.globalX = centerX;
      petState.globalY = centerY;
      petState.x = 200;
      petState.y = 200;
      petState.rotation = 0;
      petState.mood = 'happy'; 
      
      state.breakVisible = true;
      
      state.breakTimer -= 1 / 60; 
      if (state.breakTimer < 0) state.breakTimer = 0;
      
      if (state.breakTimer <= 0) {
        state.breakVisible = false;
        petState.currentAction = 'hourly_break_exit';
        petState.actionTimer = 0;
        agentManager.registerBreakFeedback(true);
      }
    }
    return;
  }

  if (petState.currentAction === 'hourly_break_exit') {
    petState.actionTimer++;
    petState.vx = 0;
    petState.vy = 0;
    
    const centerX = petState.monitorX + (petState.screenW - W) / 2;
    const centerY = petState.monitorY + (petState.screenH - H) / 2;
    
    if (petState.actionTimer < 150) {
      const t = petState.actionTimer / 150;
      const easeT = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      
      const endX = petState.breakOrigX;
      const endY = petState.breakOrigY;
      
      const dx = endX - centerX;
      const dy = endY - centerY;
      const R = Math.sqrt(dx * dx + dy * dy);
      const theta0 = Math.atan2(dy, dx);
      
      // Radius grows from 0 to R, angle unwinds 1 time
      const r = R * easeT;
      const theta = theta0 - (1 - easeT) * Math.PI * 2;
      
      petState.globalX = centerX + r * Math.cos(theta);
      petState.globalY = centerY + r * Math.sin(theta);
      
      petState.x = 200;
      petState.y = 200;
      
      // Flying saucer spin reverse for break exit
      const spinDir = dx >= 0 ? 1 : -1;
      const angle = (1 - t) * Math.PI * 6 * spinDir;
      petState.rotation = Math.sin(angle * 0.5) * 0.18;
      petState.stretch = Math.cos(angle);
      petState.squash = 0.42;
      petState.mood = 'shell_retreat';
    } else {
      petState.globalX = petState.breakOrigX;
      petState.globalY = petState.breakOrigY;
      // Don't interpolate the window teleport
      petState.prevGlobalX = petState.breakOrigX;
      petState.prevGlobalY = petState.breakOrigY;
      
      petState.x = 200;
      petState.y = 200;
      petState.rotation = 0;
      petState.currentAction = 'wander';
      petState.mood = 'walking';
      petState.actionTimer = 0;
    }
    return;
  }

  if (petState.currentAction === 'flipped') {
    petState.actionTimer--;
    
    petState.rotation = Math.PI + Math.sin(performance.now() * 0.01) * 0.2;

    if (petState.mood === 'crying') {
      // Spawn tears from its eyes when flipped
      if (Math.random() < 0.18) {
        const eyeX = 200 + (petState.facingLeft ? 34 : -34); // flipped X
        const eyeY = 200 + 25; // flipped Y
        particleSystem.addTear(eyeX, eyeY);
      }
      
      // After crying for 70 frames (~1.2s), transition to angry mood!
      if (petState.actionTimer <= 80) {
        petState.mood = 'angry';
        showSpeech("Á à cái đồ bạo lực này! Cho tui lật lại mau! 😡", 3000);
      }
    }
    
    if (petState.actionTimer <= 0) {
       petState.vy = -12; 
       petState.angularVelocity = Math.PI * 0.1; 
       petState.currentAction = 'falling';
       (petState as any).isSelfFlipping = true; 
    }
    return;
  }

  if (petState.reactionTimer > 0 && petState.currentAction !== 'dangling' && petState.currentAction !== 'falling') {
    petState.reactionTimer--;
    petState.mood = petState.reactionMood || petState.mood;
    return;
  }

  const isOffScreen = 
    petState.globalY > petState.monitorY + petState.screenH + 1000 ||
    petState.globalY < petState.monitorY - 1000 ||
    petState.globalX > petState.monitorX + petState.screenW + 1000 ||
    petState.globalX < petState.monitorX - 1000;

  if (isOffScreen && petState.currentAction !== 'portal') {
    petState.currentAction = 'portal';
    petState.actionTimer = 0;
    petState.vx = 0;
    petState.vy = 0;
    petState.globalX = petState.monitorX + (petState.screenW - W) / 2;
    petState.globalY = petState.monitorY + (petState.screenH - H) / 2;
    showSpeech("\u00da \u00f2a! Portal n\u00e8! \ud83c\udf00\ud83d\udc22", 3000);
    return;
  }

  if (petState.currentAction === 'climbing_ground_left') {
    petState.globalX -= petState.climbSpeed || 1.5;
    if (petState.globalX <= leftWall) {
      petState.globalX = leftWall;
      if ((petState as any).climbCycles === 1) {
        petState.currentAction = 'idle';
        petState.actionTimer = 60;
        (petState as any).climbCycles = 0;
        
        // Show success speech!
        const successSpeeches = [
          'Yeah! Đã đi hết một vòng màn hình rồi nè! 😎🐢',
          'Nhiệm vụ tuần tra trần nhà hoàn thành xuất sắc! 🕵️‍♂️🐢',
          'Tôi là Rùa Leo Tường chuyên nghiệp mà lị! 🥇🐢'
        ];
        showSpeech(successSpeeches[Math.floor(Math.random() * successSpeeches.length)], 3500);
      } else {
        petState.currentAction = 'prepare_climb_left';
        petState.actionTimer = 60;
      }
    }
    return;
  }
  if (petState.currentAction === 'climbing_ground_right') {
    petState.globalX += petState.climbSpeed || 1.5;
    if (petState.globalX >= rightWall) {
      petState.globalX = rightWall;
      if ((petState as any).climbCycles === 1) {
        petState.currentAction = 'idle';
        petState.actionTimer = 60;
        (petState as any).climbCycles = 0;
        
        // Show success speech!
        const successSpeeches = [
          'Yeah! Đã đi hết một vòng màn hình rồi nè! 😎🐢',
          'Nhiệm vụ tuần tra trần nhà hoàn thành xuất sắc! 🕵️‍♂️🐢',
          'Tôi là Rùa Leo Tường chuyên nghiệp mà lị! 🥇🐢'
        ];
        showSpeech(successSpeeches[Math.floor(Math.random() * successSpeeches.length)], 3500);
      } else {
        petState.currentAction = 'prepare_climb_right';
        petState.actionTimer = 60;
      }
    }
    return;
  }
  
  if (petState.currentAction === 'prepare_climb_left') {
    petState.actionTimer--;
    petState.rotation = (Math.PI / 2) * (1 - (petState.actionTimer / 60));
    if (petState.actionTimer <= 0) {
      petState.rotation = Math.PI / 2;
      petState.currentAction = 'climbing_left';
    }
    return;
  }
  if (petState.currentAction === 'prepare_climb_right') {
    petState.actionTimer--;
    petState.rotation = (-Math.PI / 2) * (1 - (petState.actionTimer / 60));
    if (petState.actionTimer <= 0) {
      petState.rotation = -Math.PI / 2;
      petState.currentAction = 'climbing_right';
    }
    return;
  }

  if (petState.currentAction === 'climbing_left') {
    petState.rotation = Math.PI / 2;
    petState.globalY -= petState.climbSpeed || 1.5;
    
    // Check for early fall outcome
    const wallHeight = groundY - ceilingY;
    const fallThresholdY = groundY - wallHeight * ((petState as any).climbFallThreshold || 0.35);
    if ((petState as any).climbOutcome === 'fall_early' && petState.globalY <= fallThresholdY) {
      triggerClimbFall('Cứu tui!!! Trơn chân quá té rồi! 😱💥', -1.5, 0.5);
      return;
    }

    if (petState.globalY <= ceilingY) {
      petState.globalY = ceilingY;
      petState.currentAction = 'prepare_ceiling';
      petState.actionTimer = 60;
    }
    return;
  }
  if (petState.currentAction === 'prepare_ceiling') {
    petState.actionTimer--;
    petState.rotation = Math.PI / 2 + (Math.PI / 2) * (1 - (petState.actionTimer / 60));
    if (petState.actionTimer <= 0) {
      petState.rotation = Math.PI;
      petState.currentAction = 'climbing_ceiling';
    }
    return;
  }
  if (petState.currentAction === 'climbing_ceiling') {
    petState.rotation = Math.PI;
    petState.globalX += petState.climbSpeed || 1.5;

    const screenWidth = rightWall - leftWall;
    const fallThresholdX = leftWall + screenWidth * ((petState as any).climbFallThreshold || 0.45);
    
    // Check for stuck outcome
    if ((petState as any).climbOutcome === 'stuck' && petState.globalX >= fallThresholdX) {
      petState.currentAction = 'climbing_ceiling_stuck';
      petState.actionTimer = 0;
      petState.mood = 'scared';
      showSpeech('Cứu tui! Kẹt trên trần nhà rồi, không dám buông tay... 🥺🕸️', 4000);
      return;
    }

    // Check for halfway fall outcome
    if ((petState as any).climbOutcome === 'fall_halfway' && petState.globalX >= fallThresholdX) {
      triggerClimbFall('Trọng lực Trái Đất mạnh quá!!! 😭💥', 0.8, 1.2);
      return;
    }

    if (petState.globalX >= rightWall) {
      petState.globalX = rightWall;
      petState.currentAction = 'prepare_right_down';
      petState.actionTimer = 60;
    }
    return;
  }
  if (petState.currentAction === 'climbing_ceiling_stuck') {
    petState.vx = 0;
    petState.vy = 0;
    petState.rotation = Math.PI;
    petState.mood = 'scared';
    petState.actionTimer++;
    
    // Shiver / wiggle effect
    petState.globalX += (Math.random() - 0.5) * 1.5;
    
    if (petState.actionTimer > 240) { // ~4 seconds
      triggerClimbFall('Á á á hết nổi rồi, buông tay đây!!! 😱💥', 0.5, 1.5);
    }
    return;
  }
  if (petState.currentAction === 'prepare_right_down') {
    petState.actionTimer--;
    petState.rotation = Math.PI + (Math.PI / 2) * (1 - (petState.actionTimer / 60));
    if (petState.actionTimer <= 0) {
      petState.rotation = 1.5 * Math.PI;
      petState.currentAction = 'climbing_right_down';
    }
    return;
  }
  if (petState.currentAction === 'climbing_right_down') {
    petState.rotation = 1.5 * Math.PI;
    petState.globalY += petState.climbSpeed || 1.5;

    // Check for late fall outcome
    const wallHeight = groundY - ceilingY;
    const fallThresholdY = ceilingY + wallHeight * ((petState as any).climbFallThreshold || 0.5);
    if ((petState as any).climbOutcome === 'fall_late' && petState.globalY >= fallThresholdY) {
      triggerClimbFall('Gần xuống tới đất rồi còn hụt chân! Huhu! 😭💥', -1.2, 0.7);
      return;
    }

    if (petState.globalY >= groundY) {
      petState.globalY = groundY;
      petState.currentAction = 'prepare_ground_left';
      petState.actionTimer = 60;
    }
    return;
  }
  if (petState.currentAction === 'prepare_ground_left') {
    petState.actionTimer--;
    petState.rotation = 1.5 * Math.PI + (Math.PI / 2) * (1 - (petState.actionTimer / 60));
    if (petState.actionTimer <= 0) {
      petState.rotation = 0;
      petState.currentAction = 'climbing_ground_left';
      (petState as any).climbCycles = 1;
      petState.actionTimer = 0;
    }
    return;
  }

  if (petState.currentAction === 'climbing_right') {
    petState.rotation = -Math.PI / 2;
    petState.globalY -= petState.climbSpeed || 1.5;

    // Check for early fall outcome
    const wallHeight = groundY - ceilingY;
    const fallThresholdY = groundY - wallHeight * ((petState as any).climbFallThreshold || 0.35);
    if ((petState as any).climbOutcome === 'fall_early' && petState.globalY <= fallThresholdY) {
      triggerClimbFall('Á á á! Không bám chắc được rồi! 😱💥', 1.5, 0.5);
      return;
    }

    if (petState.globalY <= ceilingY) {
      petState.globalY = ceilingY;
      petState.currentAction = 'prepare_ceiling_left';
      petState.actionTimer = 60;
    }
    return;
  }
  if (petState.currentAction === 'prepare_ceiling_left') {
    petState.actionTimer--;
    petState.rotation = -Math.PI / 2 - (Math.PI / 2) * (1 - (petState.actionTimer / 60));
    if (petState.actionTimer <= 0) {
      petState.rotation = -Math.PI;
      petState.currentAction = 'climbing_ceiling_left';
    }
    return;
  }
  if (petState.currentAction === 'climbing_ceiling_left') {
    petState.rotation = -Math.PI;
    petState.globalX -= petState.climbSpeed || 1.5;

    const screenWidth = rightWall - leftWall;
    const fallThresholdX = rightWall - screenWidth * ((petState as any).climbFallThreshold || 0.45);
    
    // Check for stuck outcome
    if ((petState as any).climbOutcome === 'stuck' && petState.globalX <= fallThresholdX) {
      petState.currentAction = 'climbing_ceiling_stuck';
      petState.actionTimer = 0;
      petState.mood = 'scared';
      showSpeech('Cứu tui! Kẹt trên trần nhà rồi, không dám buông tay... 🥺🕸️', 4000);
      return;
    }

    // Check for halfway fall outcome
    if ((petState as any).climbOutcome === 'fall_halfway' && petState.globalX <= fallThresholdX) {
      triggerClimbFall('Á á á! Đang bò trên trần nhà mà rớt nè! 😵‍💫💥', 0.8, 1.2);
      return;
    }

    if (petState.globalX <= leftWall) {
      petState.globalX = leftWall;
      petState.currentAction = 'prepare_left_down';
      petState.actionTimer = 60;
    }
    return;
  }
  if (petState.currentAction === 'prepare_left_down') {
    petState.actionTimer--;
    petState.rotation = -Math.PI - (Math.PI / 2) * (1 - (petState.actionTimer / 60));
    if (petState.actionTimer <= 0) {
      petState.rotation = -1.5 * Math.PI;
      petState.currentAction = 'climbing_left_down';
    }
    return;
  }
  if (petState.currentAction === 'climbing_left_down') {
    petState.rotation = -1.5 * Math.PI;
    petState.globalY += petState.climbSpeed || 1.5;

    // Check for late fall outcome
    const wallHeight = groundY - ceilingY;
    const fallThresholdY = ceilingY + wallHeight * ((petState as any).climbFallThreshold || 0.5);
    if ((petState as any).climbOutcome === 'fall_late' && petState.globalY >= fallThresholdY) {
      triggerClimbFall('Ui da! Sắp xuống đất rồi mà té đau ghê! 🤕💥', 1.2, 0.7);
      return;
    }

    if (petState.globalY >= groundY) {
      petState.globalY = groundY;
      petState.currentAction = 'prepare_ground_right';
      petState.actionTimer = 60;
    }
    return;
  }
  if (petState.currentAction === 'prepare_ground_right') {
    petState.actionTimer--;
    petState.rotation = -1.5 * Math.PI - (Math.PI / 2) * (1 - (petState.actionTimer / 60));
    if (petState.actionTimer <= 0) {
      petState.rotation = 0;
      petState.currentAction = 'climbing_ground_right';
      (petState as any).climbCycles = 1;
      petState.actionTimer = 0;
    }
    return;
  }

  if (petState.currentAction === 'portal') {
    petState.actionTimer++;
    if (petState.actionTimer > 90) { 
      petState.currentAction = 'falling';
      petState.mood = 'surprised';
      petState.actionTimer = 0;
    }
    return;
  }

  if (petState.currentAction === 'dangling') {
    petState.mood = 'scared';
    petState.vx = 0; petState.vy = 0;
    return;
  }
  
  if (petState.currentAction === 'falling') {
    // Crying if thrown or falling from climbing
    const isClimbFall = (petState as any).climbOutcome && (petState as any).climbOutcome !== 'success';
    if ((petState as any).isThrown || isClimbFall) {
      petState.mood = 'crying';
    } else {
      petState.mood = 'scared';
    }
    
    petState.vy += petState.gravity;
    if (petState.vy > 35) petState.vy = 35;
    
    // Track maximum fall velocity to determine impact severity
    (petState as any).fallMaxVy = Math.max((petState as any).fallMaxVy || 0, Math.abs(petState.vy));
    
    petState.globalY += petState.vy;
    petState.globalX += petState.vx;
    
    petState.vx *= 0.98;
    
    const speed = Math.sqrt(petState.vx*petState.vx + petState.vy*petState.vy);
    
    // Cute, natural squash/stretch while flying based on movement direction
    // Limit maximum deformation to 12% to prevent ugly, alien-like distortion
    const devX = Math.abs(petState.vx) * 0.004 - Math.abs(petState.vy) * 0.004;
    petState.stretch = Math.max(0.88, Math.min(1.12, 1.0 + devX)); // horizontal scale
    petState.squash = Math.max(0.88, Math.min(1.12, 1.0 - devX));  // vertical scale
    
    // Increment rotation by angular velocity
    petState.rotation += petState.angularVelocity;
    petState.angularVelocity *= 0.985; 
    
    const isThrown = (petState as any).isThrown;
    if (isThrown) {
      // If it's thrown, we let it spin freely. 
      // Reset isThrown when the spin has slowed to nearly zero, allowing it to align or land.
      if (Math.abs(petState.angularVelocity) < 0.02) {
        (petState as any).isThrown = false;
      }
    } else {
      // Fall normally or align head to direction of movement
      if (speed > 5 && !(petState as any).forceFlip) {
        const targetRot = Math.atan2(petState.vy, petState.vx) - Math.PI/2;
        petState.rotation += (targetRot - petState.rotation) * 0.1;
      }
    }
    
    if ((petState as any).forceFlip) {
       petState.rotation = Math.PI;
       (petState as any).isThrown = false; // Reset thrown flag on forced flip
     }

    // Ceiling bounce check
    if (petState.globalY <= ceilingY) {
      petState.globalY = ceilingY;
      const impact = Math.abs(petState.vy);
      // Reverse velocity to bounce downward
      petState.vy = Math.abs(petState.vy) * 0.75;

      // Ceiling impact: squash vertically (taller width, flatter height)
      const ceilDef = Math.min(0.2, impact * 0.012);
      petState.stretch = 1.0 + ceilDef;
      petState.squash = 1.0 - ceilDef;

      if (impact > 10) {
        for (let i = 0; i < 3; i++) {
          particleSystem.addStar(petState.x, petState.y - 20, (Math.random() - 0.5) * 10, 2 + Math.random() * 5);
        }
      }
    }
    
    if (petState.globalX <= leftWall) {
      petState.globalX = leftWall;
      const impact = Math.abs(petState.vx);
      // Bounce to the right
      petState.vx = Math.abs(petState.vx) * 0.75; 
      
      const slipY = petState.vy + petState.angularVelocity * 30;
      petState.vy -= slipY * 0.35;
      petState.angularVelocity -= (slipY / 30) * 0.35;
      
      // If we gain spin from bounce, keep spinning!
      if (Math.abs(petState.angularVelocity) > 0.05) {
        (petState as any).isThrown = true;
      }
      
      // Wall impact: squash horizontally (narrower width, taller height)
      // Limit deformation to 20% for a cute rubbery bounce
      const wallDef = Math.min(0.2, impact * 0.012);
      petState.stretch = 1.0 - wallDef; // narrower width
      petState.squash = 1.0 + wallDef;  // taller height
      if (impact > 10) {
        for(let i=0; i<3; i++) particleSystem.addStar(petState.x - 20, petState.y, 2 + Math.random()*5, -5 - Math.random()*5);
      }
    } else if (petState.globalX >= rightWall) {
      petState.globalX = rightWall;
      const impact = Math.abs(petState.vx);
      // Bounce to the left
      petState.vx = -Math.abs(petState.vx) * 0.75; 
      
      const slipY = petState.vy - petState.angularVelocity * 30;
      petState.vy -= slipY * 0.35;
      petState.angularVelocity += (slipY / 30) * 0.35;
      
      // If we gain spin from bounce, keep spinning!
      if (Math.abs(petState.angularVelocity) > 0.05) {
        (petState as any).isThrown = true;
      }
      
      // Wall impact: squash horizontally (narrower width, taller height)
      const wallDef = Math.min(0.2, impact * 0.012);
      petState.stretch = 1.0 - wallDef;
      petState.squash = 1.0 + wallDef;
      if (impact > 10) {
        for(let i=0; i<3; i++) particleSystem.addStar(petState.x + 20, petState.y, -2 - Math.random()*5, -5 - Math.random()*5);
      }
    }

    if (petState.globalY >= currentGroundY) {
      petState.globalY = currentGroundY;
      if (Math.abs(petState.vy) > 3.5) {
        const impact = Math.abs(petState.vy);
        petState.vy *= petState.bounce; 
        
        const slip = petState.vx - petState.angularVelocity * 30;
        petState.vx -= slip * 0.45;
        petState.angularVelocity += (slip / 30) * 0.45;
        
        // If we gain spin from bounce, keep spinning!
        if (Math.abs(petState.angularVelocity) > 0.05) {
          (petState as any).isThrown = true;
        }
        
        // Rubbery, cute ground impact squash (limit height compression to 50%, width expansion to 1.35)
        petState.squash = Math.max(0.5, 1.0 - (impact * 0.03));
        petState.stretch = Math.min(1.35, 1.0 + (impact * 0.022));
        
        if (impact > 15) {
           for(let i=0; i<5; i++) particleSystem.addDust(petState.x, petState.y + 20);
        }
        if (impact > 28) { // ~280px fall before landing flipped (gravity=1.2, v=sqrt(2*1.2*280)≈26)
           for(let i=0; i<5; i++) particleSystem.addStar(petState.x, petState.y, (Math.random()-0.5)*12, -6 - Math.random()*6);
           (petState as any).forceFlip = true;
           petState.rotation = Math.PI; 
           petState.angularVelocity = 0;
        }
      } else {
        petState.vy = 0;
        petState.vx = 0;
        petState.angularVelocity = 0;
        
        let r = petState.rotation % (Math.PI * 2);
        if (r < 0) r += Math.PI * 2;
        
        if ((petState as any).isSelfFlipping) {
          (petState as any).isSelfFlipping = false;
          petState.rotation = 0;
          petState.currentAction = 'wander';
          petState.squash = 0.6; 
          petState.stretch = 1.2;
        }
        else if ((petState as any).forceFlip || (r > Math.PI * 0.5 && r < Math.PI * 1.5)) {
          petState.currentAction = 'flipped';
          (petState as any).forceFlip = false;
          if (petState.mood === 'crying') {
            petState.mood = 'crying';
            petState.actionTimer = 150; // Cry for 150 frames (2.5s) before getting angry!
            showSpeech("Huhu lật mai rồi đau quá cứu tui với! 😭💦", 3000);
          } else {
            petState.mood = 'angry'; 
            petState.actionTimer = 80; 
            showSpeech("Á à cái đồ bạo lực này! Cho tui lật lại mau! 😡", 3000);
          }
          petState.squash = 0.8; 
          petState.stretch = 1.1;
        } else {
          petState.rotation = 0;
          
          const maxVy = (petState as any).fallMaxVy || 0;
          (petState as any).fallMaxVy = 0; // reset for next fall
          
          if (petState.mood === 'crying') {
            petState.currentAction = 'crying_ground';
            petState.actionTimer = 0;
            petState.squash = 0.7;
            petState.stretch = 1.15;
            const crySpeeches = [
              'Huhu... Đau quá đi thôi! 😭💦',
              'Chủ nhân ác quá, quăng làm tui đau điếng... 😭😭',
              'Té đau điếng cả mai rùa rồi! Huhu! 🤕💦'
            ];
            showSpeech(crySpeeches[Math.floor(Math.random() * crySpeeches.length)], 3000);
          } else if (maxVy > 28) { // ~280px free fall needed before getting tired
            petState.currentAction = 'tired';
            petState.mood = 'tired';
            petState.actionTimer = 0;
            petState.squash = 0.6; 
            petState.stretch = 1.2;
            showSpeech("Phù... rớt từ trên cao mệt quá! 🥵💦", 3000);
          } else {
            petState.currentAction = 'wander';
            petState.squash = 0.6; 
            petState.stretch = 1.2;
          }
        }
      }
    }
    return;
  }

  if (petState.currentAction === 'crying_ground') {
    petState.mood = 'crying';
    petState.vx = 0;
    petState.vy = 0;
    petState.rotation = 0;
    petState.actionTimer++;

    // Cute crying shiver / scale effect
    petState.squash = 0.78 + Math.sin(performance.now() * 0.02) * 0.05;
    petState.stretch = 1.15 - Math.sin(performance.now() * 0.02) * 0.05;

    // Spawn tears from its eye while crying on the ground
    if (Math.random() < 0.18) {
      const eyeX = 200 + (petState.facingLeft ? -34 : 34);
      const eyeY = 200 - 25;
      particleSystem.addTear(eyeX, eyeY);
    }

    if (petState.actionTimer > 150) { // ~2.5 seconds
      petState.currentAction = 'tired';
      petState.mood = 'tired';
      petState.actionTimer = 0;
      showSpeech("Phù... đỡ đau hơn rồi! 🥵💦", 2500);
    }
    return;
  }

  if (petState.currentAction === 'bathing') {
     petState.vx = 0;
     if (Math.random() < 0.15) {
        particleSystem.addBubble(petState.x, petState.y);
     }
     petState.squash = 0.95 + Math.sin(performance.now() * 0.005) * 0.05;
     petState.stretch = 1.05 - Math.sin(performance.now() * 0.005) * 0.05;
     if (petState.actionTimer >= 0) {
        petState.currentAction = 'idle';
        petState.energy = Math.min(100, petState.energy + 15);
     }
  }
  else if (petState.currentAction === 'eat_snack') {
    petState.vx = 0;
    petState.vy = 0;
    petState.rotation = 0;
    petState.actionTimer++;

    // Chew wiggle scale effect
    petState.squash = 1.0 + Math.sin(performance.now() * 0.02) * 0.06;
    petState.stretch = 1.0 - Math.sin(performance.now() * 0.02) * 0.06;

    // Periodically spawn crumb particles from mouth
    if (petState.actionTimer % 12 === 0) {
      const mouthX = petState.globalX + 200 + (petState.facingLeft ? -42 : 42);
      const mouthY = petState.globalY + 200 + 6;
      particleSystem.addCrumb(mouthX - petState.globalX, mouthY - petState.globalY);
    }

    if (petState.actionTimer > 180) { // ~3 seconds
      petState.energy = Math.min(100, petState.energy + 12);
      petState.hp = Math.min(100, petState.hp + 6);
      petState.currentAction = 'idle';
      petState.actionTimer = 0;
      showSpeech("Ăn xong rồi ngon quá, đầy năng lượng luôn! 😋🐢", 3000);
    }
    return;
  }
  else if (petState.currentAction === 'drink_water') {
    petState.vx = 0;
    petState.vy = 0;
    petState.rotation = 0;
    petState.actionTimer++;

    // Sip wiggle scale effect
    petState.squash = 0.96 + Math.sin(performance.now() * 0.015) * 0.04;
    petState.stretch = 1.04 - Math.sin(performance.now() * 0.015) * 0.04;

    // Periodically spawn bubble/splash particles around the straw/mouth
    if (petState.actionTimer % 15 === 0) {
      const mouthX = petState.globalX + 200 + (petState.facingLeft ? -42 : 42);
      const mouthY = petState.globalY + 200 + 12;
      particleSystem.addBubble(mouthX - petState.globalX, mouthY - petState.globalY);
    }

    if (petState.actionTimer > 180) { // ~3 seconds
      petState.hp = Math.min(100, petState.hp + 15);
      petState.energy = Math.min(100, petState.energy + 5);
      petState.currentAction = 'idle';
      petState.actionTimer = 0;
      showSpeech("Phù, uống nước boba đã ghê! 💦🐢", 3000);
    }
    return;
  }
  else if (petState.currentAction === 'put_on_hat') {
    petState.vx = 0;
    petState.vy = 0;
    petState.rotation = 0;
    petState.actionTimer++;

    // Wiggle head / body during putting on hat
    petState.squash = 1.0 + Math.sin(performance.now() * 0.03) * 0.05;
    petState.stretch = 1.0 - Math.sin(performance.now() * 0.03) * 0.05;

    // Spawn little stars on head
    if (petState.actionTimer % 18 === 0) {
      particleSystem.addStar(petState.x + (petState.facingLeft ? -22 : 22), petState.y - 32, (Math.random() - 0.5) * 1.5, -2.5 - Math.random() * 1.5);
    }

    if (petState.actionTimer > 100) { // ~1.6 seconds
      // Cycle hats
      if (petState.hatType === 'none' || !petState.hatType) {
        petState.hatType = 'coder';
        showSpeech("Đội nón dev ngầu chưa chủ nhân? 😎🧢", 3000);
      } else if (petState.hatType === 'coder') {
        petState.hatType = 'wizard';
        showSpeech("Rùa phù thủy phép thuật hô biến! 🧙‍♂️✨", 3000);
      } else if (petState.hatType === 'wizard') {
        petState.hatType = 'straw';
        showSpeech("Kaizoku ou ni ore wa naru! Nón Luffy rơm! 👒🐢", 3000);
      } else {
        petState.hatType = 'none';
        showSpeech("Cởi nón ra cho nhẹ mát nào! 🐢", 2500);
      }
      petState.currentAction = 'idle';
      petState.actionTimer = 0;
    }
    return;
  }
  else if (petState.currentAction === 'read_book') {
    petState.vx = 0;
    petState.vy = 0;
    petState.rotation = 0;
    petState.actionTimer++;

    // Small breathing bob
    petState.squash = 0.98 + Math.sin(performance.now() * 0.008) * 0.03;
    petState.stretch = 1.02 - Math.sin(performance.now() * 0.008) * 0.03;

    // Spawn ideas/stars from head
    if (petState.actionTimer % 30 === 0) {
      const headX = petState.x + (petState.facingLeft ? -22 : 22);
      const headY = petState.y - 28;
      particleSystem.addStar(headX, headY, (Math.random() - 0.5) * 1.2, -2.0 - Math.random() * 1.0);
    }

    if (petState.actionTimer > 240) { // ~4 seconds
      petState.iq = Math.min(100, petState.iq + 2.5);
      petState.exp = Math.min(100, petState.exp + 6);
      petState.currentAction = 'idle';
      petState.actionTimer = 0;
      showSpeech("Kiến thức dạt dào! Bug chỉ là chuyện nhỏ! 🧠🐢", 3000);
    }
    return;
  }
  else if (petState.currentAction === 'sleep') {
    petState.mood = 'sleeping';
    petState.vx = 0;
    return;
  }
  else if (petState.currentAction === 'tired') {
    petState.mood = 'tired';
    petState.vx = 0;
    petState.vy = 0;
    petState.actionTimer++;
    
    if (Math.random() < 0.15) {
      particleSystem.addSweat(petState.x, petState.y);
    }
    
    petState.squash = 0.95 + Math.sin(performance.now() * 0.012) * 0.05;
    petState.stretch = 1.05 - Math.sin(performance.now() * 0.012) * 0.05;
    
    if (petState.actionTimer > 150) { 
      petState.actionTimer = 0;
      petState.currentAction = Math.random() < 0.6 ? 'wander' : 'idle';
      if (petState.currentAction === 'wander') {
        petState.mood = 'walking';
        petState.vx = (Math.random() > 0.5 ? 1 : -1) * (0.8 + Math.random() * 0.5);
      } else {
        petState.mood = 'happy';
        petState.vx = 0;
      }
    }
    return;
  }

  petState.actionTimer++;

  if (petState.currentAction === 'hyper' && petState.actionTimer > 100 + Math.random() * 60) {
    petState.actionTimer = 0;
    petState.currentAction = 'tired';
    petState.mood = 'tired';
    petState.vx = 0;
    petState.isFastClimb = false;
    
    petState.squash = 0.7;
    petState.stretch = 1.35;
    for (let i = 0; i < 5; i++) {
      particleSystem.addDust(petState.x, petState.y + 20, (Math.random() - 0.5) * 6, -0.4 - Math.random() * 1.2);
    }

    const brakeSpeeches = [
      "Chạy nhanh quá phanh lại bớt thôi! 🛑🐢",
      "Phù... mệt quá! 🥵💨",
      "Hộc hộc... thở không ra hơi! 🐢💦"
    ];
    showSpeech(brakeSpeeches[Math.floor(Math.random() * brakeSpeeches.length)], 3000);
  }

  if (petState.isFastClimb && (petState.currentAction === 'climbing_left' || petState.currentAction === 'climbing_right')) {
    if (petState.actionTimer > 85 + Math.random() * 40) {
      // Chỉ rớt nếu outcome đã là 1 dạng fail — không phá outcome 'success'
      const outcome = (petState as any).climbOutcome;
      if (outcome && outcome !== 'success') {
        const isLeft = petState.currentAction === 'climbing_left';
        petState.currentAction = 'falling';
        petState.mood = 'scared';
        petState.vy = 2.0;
        petState.vx = isLeft ? 3.5 : -3.5;
        petState.angularVelocity = isLeft ? -0.15 : 0.15;
        petState.isFastClimb = false;
        petState.actionTimer = 0;
        showSpeech("Áaaaa... trơn quá rớt rồi! 😭💥", 3000);
        return;
      } else {
        // Outcome là success → chỉ dừng fastClimb, không rớt
        petState.isFastClimb = false;
        petState.climbSpeed = 1.5;
      }
    }
  }

  const isWallOrCeilingClimb = 
    petState.currentAction === 'climbing_left' || 
    petState.currentAction === 'climbing_right' || 
    petState.currentAction === 'climbing_ceiling' || 
    petState.currentAction === 'climbing_ceiling_left' ||
    petState.currentAction === 'climbing_left_down' ||
    petState.currentAction === 'climbing_right_down';

  if (isWallOrCeilingClimb && !petState.isFastClimb && Math.random() < 0.02) {
    petState.isFastClimb = true;
    petState.climbSpeed = 4.2;
    petState.actionTimer = 0; 
    const boostSpeeches = [
      "Úi! Bứt tốc leo tường thôi! 🚀💨",
      "Phải chạy nhanh hơn mới được! 🏃‍♂️💨",
      "Tăng tốc đột ngột! 🏎️💨",
      "Chạy tẹt khói dọc biên luôn! 💨"
    ];
    showSpeech(boostSpeeches[Math.floor(Math.random() * boostSpeeches.length)], 2500);
  }

  if (petState.isFastClimb && petState.currentAction.startsWith('climbing') && Math.random() < 0.75) {
    let dustX = petState.x;
    let dustY = petState.y;
    let smokeVx = 0;
    let smokeVy = 0;
    
    if (petState.currentAction === 'climbing_left' || petState.currentAction === 'climbing_right') {
      dustY = petState.y + 25;
      smokeVy = 2.5 + Math.random() * 1.0;
      smokeVx = (Math.random() - 0.5) * 1.0;
    } else if (petState.currentAction === 'climbing_ceiling') {
      dustX = petState.x - 25;
      smokeVx = -2.5 - Math.random() * 1.0;
      smokeVy = (Math.random() - 0.5) * 1.0;
    } else if (petState.currentAction === 'climbing_ceiling_left') {
      dustX = petState.x + 25;
      smokeVx = 2.5 + Math.random() * 1.0;
      smokeVy = (Math.random() - 0.5) * 1.0;
    } else if (petState.currentAction === 'climbing_right_down' || petState.currentAction === 'climbing_left_down') {
      dustY = petState.y - 25;
      smokeVy = -2.5 - Math.random() * 1.0;
      smokeVx = (Math.random() - 0.5) * 1.0;
    } else if (petState.currentAction === 'climbing_ground_left') {
      dustX = petState.x + 25;
      smokeVx = 2.5 + Math.random() * 1.0;
    } else if (petState.currentAction === 'climbing_ground_right') {
      dustX = petState.x - 25;
      smokeVx = -2.5 - Math.random() * 1.0;
    }
    particleSystem.addDust(dustX, dustY, smokeVx, smokeVy);
  }

  // Removed legacy random action transitions. Decisions are now managed by AgentManager.

  if (petState.currentAction === 'hyper') petState.mood = 'running';
  if (petState.currentAction === 'wander') petState.mood = 'walking';
  if (petState.currentAction === 'bored') petState.mood = 'sad';

  if (petState.vx < -0.1) petState.facingLeft = true;
  if (petState.vx > 0.1) petState.facingLeft = false;

  if (petState.currentAction === 'wander' || petState.currentAction === 'hyper') {
    petState.globalX += petState.vx;
    
    if (petState.currentAction === 'hyper' && Math.random() < 0.75) {
      const dustX = petState.x + (petState.facingLeft ? 25 : -25);
      const dustY = petState.y + 20;
      const smokeVx = (petState.facingLeft ? 2.5 : -2.5) + (Math.random() - 0.5) * 1.0;
      const smokeVy = -0.2 - Math.random() * 0.8;
      particleSystem.addDust(dustX, dustY, smokeVx, smokeVy);
    }

    if (petState.globalX <= leftWall) {
      petState.globalX = leftWall;
      petState.vx *= -1;
      petState.facingLeft = false;
    } else if (petState.globalX >= rightWall) {
      petState.globalX = rightWall;
      petState.vx *= -1;
      petState.facingLeft = true;
    }
  }
}
