import { state, type Platform, type PetState } from '../state.svelte';
import { particleSystem } from '../particleSystem';

export function executeGlobalPhysics(petState: PetState, currentGroundY: number, groundY: number, targetPlatform: Platform | null, W: number, H: number) {
  // 1. Dragging Check (Highest Priority Physical Interrupt)
  if (state.isDragging) {
    petState.currentAction = 'dangling';
    petState.mood = 'scared';
    
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

    const dragVx = dragVxPhys / scale;
    const dragVy = dragVyPhys / scale;
    
    const targetRot = Math.max(-0.6, Math.min(0.6, -dragVx * 0.04));
    petState.rotation += (targetRot - petState.rotation) * 0.12;
    
    const dragSpeed = Math.sqrt(dragVx * dragVx + dragVy * dragVy);
    if (dragSpeed > 1) {
      const amount = Math.min(0.12, dragSpeed * 0.006);
      petState.stretch += ((1.0 - amount) - petState.stretch) * 0.2;
      petState.squash += ((1.0 + amount) - petState.squash) * 0.2;
    } else {
      petState.stretch += (1.0 - petState.stretch) * 0.15;
      petState.squash += (1.0 - petState.squash) * 0.15;
    }
    
    petState.vx = 0;
    petState.vy = 0;
    petState.angularVelocity = 0;
    return true; // Interrupted
  }

  // 2. Squash/Stretch Recovery (Elasticity)
  petState.squash += (1.0 - petState.squash) * 0.15;
  petState.stretch += (1.0 - petState.stretch) * 0.15;

  // 3. Falling & Gravity Global Checks
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
      petState.platformLostTimer++;
      if (petState.platformLostTimer > 12) { // 200ms Coyote Time
        if (petState.currentAction === 'sleep') state.speechVisible = false;
        petState.currentAction = 'falling';
        petState.vy = 0;
        petState.wasOnPlatform = false;
        petState.platformLostTimer = 0;
      }
    } else {
      if (petState.currentAction === 'sleep') state.speechVisible = false;
      petState.currentAction = 'falling';
      petState.vy = 0;
    }
  } else {
    petState.platformLostTimer = 0;
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

  // 4. Rotation Smoothing (Stand upright)
  if (canFall) {
     if (Math.abs(petState.rotation) > 0.01) {
       let targetRot = Math.round(petState.rotation / (Math.PI * 2)) * (Math.PI * 2);
       petState.rotation += (targetRot - petState.rotation) * 0.15;
     }
  }

  return false;
}
