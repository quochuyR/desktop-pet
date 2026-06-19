import { petState, state, updateActiveMonitor } from './state.svelte';
import { collisionSystem } from './collision';
import { stateMachine } from './fsm/StateMachine';
import { LegacyState } from './fsm/states/LegacyState';
import { WanderState } from './fsm/states/WanderState';
import { SleepState } from './fsm/states/SleepState';
import { PetAction } from './types';
import { executeGlobalPhysics } from './fsm/GlobalPhysics';

// Register true FSM states
stateMachine.registerState(new WanderState());
stateMachine.registerState(new SleepState());

// Initialize remaining actions as legacy fallback
Object.values(PetAction).forEach(action => {
  if (action !== PetAction.Wander && action !== PetAction.Sleep) {
    stateMachine.registerState(new LegacyState(action));
  }
});

export function updateMovement() {
  updateActiveMonitor(); // keep monitor bounds synced with current turtle globalX/Y
  
  const bounds = collisionSystem.getBounds(petState, state.statsVisible);
  const { currentGroundY, targetPlatform } = collisionSystem.getGround(petState, bounds.groundY);

  const interrupted = executeGlobalPhysics(petState, currentGroundY, bounds.groundY, targetPlatform, bounds.W, bounds.H);
  
  // If dragging or fireworks interrupted the regular logic loop (in old legacy style)
  // Wait, if it's interrupted, we shouldn't skip stateMachine because stateMachine handles dangling state too.
  // Actually, stateMachine SHOULD handle dangling.
  
  stateMachine.update(petState, bounds, currentGroundY, targetPlatform);
}
