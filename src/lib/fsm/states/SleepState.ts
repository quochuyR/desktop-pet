import type { State, CollisionBounds } from '../State';
import type { PetState, Platform } from '../../state.svelte';
import { PetAction } from '../../types';

export class SleepState implements State {
  public readonly name = PetAction.Sleep;

  onEnter(petState: PetState): void {
    petState.mood = 'sleeping';
    petState.vx = 0;
  }

  onUpdate(petState: PetState, bounds: CollisionBounds, currentGroundY: number, targetPlatform: Platform | null): void {
    // Legacy sleep logic just forces sleeping mood and vx to 0 every frame
    petState.mood = 'sleeping';
    petState.vx = 0;
  }

  onExit(petState: PetState): void {
    // Cleanup if needed
  }
}
