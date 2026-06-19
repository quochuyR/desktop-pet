import type { PetState, Platform } from '../state.svelte';
import type { PetActionType } from '../types';

export interface CollisionBounds {
  leftWall: number;
  rightWall: number;
  ceilingY: number;
  groundY: number;
  centerX: number;
  centerY: number;
  W: number;
  H: number;
}

export interface State {
  readonly name: PetActionType;
  
  /** Called once when entering the state */
  onEnter(petState: PetState): void;
  
  /** Called every frame to process logic and physics */
  onUpdate(petState: PetState, bounds: CollisionBounds, currentGroundY: number, targetPlatform: Platform | null): void;
  
  /** Called once when exiting the state */
  onExit(petState: PetState): void;
}
