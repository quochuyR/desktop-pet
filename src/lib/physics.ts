import { petState, state, updateActiveMonitor } from './state.svelte';
import { collisionSystem } from './collision';
import { executeLegacyBehaviors } from './behaviors/legacy';

export function updateMovement() {
  updateActiveMonitor(); // keep monitor bounds synced with current turtle globalX/Y
  
  const bounds = collisionSystem.getBounds(petState, state.statsVisible);
  const { currentGroundY, targetPlatform } = collisionSystem.getGround(petState, bounds.groundY);

  executeLegacyBehaviors(bounds, currentGroundY, targetPlatform);
}
