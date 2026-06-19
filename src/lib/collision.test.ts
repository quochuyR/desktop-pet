import { describe, it, expect } from 'vitest';
import { collisionSystem } from './collision';

describe('collisionSystem', () => {
  it('should calculate correct bounds when stats are not visible', () => {
    const petState: any = {
      monitorX: 0,
      monitorY: 0,
      screenW: 1920,
      screenH: 1080
    };
    
    const bounds = collisionSystem.getBounds(petState, false);
    
    expect(bounds.leftWall).toBe(-185);
    expect(bounds.rightWall).toBe(1920 - 215);
    expect(bounds.ceilingY).toBe(-185);
    expect(bounds.groundY).toBe(1080 - 255);
  });

  it('should calculate restricted bounds when stats are visible', () => {
    const petState: any = {
      monitorX: 0,
      monitorY: 0,
      screenW: 1920,
      screenH: 1080
    };
    
    const bounds = collisionSystem.getBounds(petState, true);
    
    // centerX = 1920/2 - W/2 => Wait, W is CONSTANTS.W (400)
    // centerX = 960 - 200 = 760
    expect(bounds.leftWall).toBe(760 - 165);
    expect(bounds.rightWall).toBe(760 + 165);
  });
});
