import { state, type Platform, CONSTANTS, type PetState } from './state.svelte';

export const collisionSystem = {
  getBounds(petState: PetState, statsVisible: boolean) {
    const { W, H } = CONSTANTS;
    let leftWall = petState.monitorX - 185;
    let rightWall = petState.monitorX + petState.screenW - 215;
    let ceilingY = petState.monitorY - 185;
    let groundY = petState.monitorY + petState.screenH - 255; 

    const centerX = petState.monitorX + (petState.screenW - W) / 2;
    const centerY = petState.monitorY + (petState.screenH - H) / 2;

    if (statsVisible) {
      leftWall = centerX - 165;
      rightWall = centerX + 165;
      ceilingY = centerY - 165;
      groundY = centerY + 168;
    }
    
    return { leftWall, rightWall, ceilingY, groundY, centerX, centerY, W, H };
  },

  getGround(petState: PetState, baseGroundY: number) {
    let targetPlatform: Platform | null = null;
    let minPlatformTop = Infinity;

    const petCenterX = petState.globalX + 200;
    const petFootY = petState.globalY + 222; 

    if (state.platforms && state.platforms.length > 0) {
      for (let i = 0; i < state.platforms.length; i++) {
        const platform = state.platforms[i];
        if (petCenterX >= platform.left && petCenterX <= platform.right) {
          let isCovered = false;
          for (let j = 0; j < i; j++) {
            const W = state.platforms[j];
            if (petCenterX >= W.left && petCenterX <= W.right &&
                platform.top >= W.top && platform.top <= W.bottom) {
              isCovered = true;
              break;
            }
          }
          if (isCovered) continue;

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

    const currentGroundY = targetPlatform ? targetPlatform.top - 222 : baseGroundY;
    return { currentGroundY, targetPlatform };
  }
};
