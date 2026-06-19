import type { State, CollisionBounds } from '../State';
import type { PetState, Platform } from '../../state.svelte';
import { PetAction } from '../../types';

export class WanderState implements State {
  public readonly name = PetAction.Wander;

  onEnter(petState: PetState): void {
    petState.mood = 'walking';
  }

  onUpdate(petState: PetState, bounds: CollisionBounds, currentGroundY: number, targetPlatform: Platform | null): void {
    if (petState.vx < -0.1) petState.facingLeft = true;
    if (petState.vx > 0.1) petState.facingLeft = false;

    petState.globalX += petState.vx;
    
    // Bounce off walls
    if (petState.globalX <= bounds.leftWall) {
      petState.globalX = bounds.leftWall;
      petState.vx *= -1;
      petState.facingLeft = false;
    } else if (petState.globalX >= bounds.rightWall) {
      petState.globalX = bounds.rightWall;
      petState.vx *= -1;
      petState.facingLeft = true;
    }
  }

  onExit(petState: PetState): void {
    petState.vx = 0;
  }
}
