import type { State, CollisionBounds } from '../State';
import type { PetState, Platform } from '../../state.svelte';
import type { PetActionType } from '../../types';
import { executeLegacyBehaviors } from '../../behaviors/legacy';

export class LegacyState implements State {
  constructor(public readonly name: PetActionType) {}

  onEnter(petState: PetState): void {
    // Legacy logic handles its own enter usually via actionTimer === 0
  }

  onUpdate(petState: PetState, bounds: CollisionBounds, currentGroundY: number, targetPlatform: Platform | null): void {
    // Re-run the legacy giant function
    executeLegacyBehaviors(bounds, currentGroundY, targetPlatform);
  }

  onExit(petState: PetState): void {
    // Cleanup if needed
  }
}
