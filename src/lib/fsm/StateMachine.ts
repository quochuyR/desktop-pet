import type { PetState, Platform } from '../state.svelte';
import type { PetActionType } from '../types';
import type { State, CollisionBounds } from './State';

export class StateMachine {
  private currentState: State | null = null;
  private states: Map<PetActionType, State> = new Map();

  registerState(state: State) {
    this.states.set(state.name, state);
  }

  transitionTo(action: PetActionType, petState: PetState) {
    if (this.currentState && this.currentState.name === action) {
      return; // Already in this state
    }

    const nextState = this.states.get(action);
    if (!nextState) {
      console.warn(`[StateMachine] No state registered for action: ${action}`);
      return;
    }

    if (this.currentState) {
      this.currentState.onExit(petState);
    }

    // Update physical action state so renderer and other systems know
    petState.currentAction = action;
    petState.actionTimer = 0;
    
    this.currentState = nextState;
    this.currentState.onEnter(petState);
  }

  update(petState: PetState, bounds: CollisionBounds, currentGroundY: number, targetPlatform: Platform | null) {
    // Check if petState.currentAction was forcibly changed externally (e.g. by dragging or GOAP planner)
    if (!this.currentState || this.currentState.name !== petState.currentAction) {
      this.transitionTo(petState.currentAction as PetActionType, petState);
    }

    if (this.currentState) {
      this.currentState.onUpdate(petState, bounds, currentGroundY, targetPlatform);
    }
  }

  getCurrentStateName(): PetActionType | null {
    return this.currentState ? this.currentState.name : null;
  }
}

export const stateMachine = new StateMachine();
