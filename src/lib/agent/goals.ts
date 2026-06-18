import type { AgentWorldModel } from './world_model';

export interface Goal {
  name: string;
  desiredState: Record<string, any>;
  calculateUtility(worldModel: AgentWorldModel): number;
}

export const GOALS: Goal[] = [
  {
    name: 'GOAL_REST',
    desiredState: { petEnergyHigh: true },
    calculateUtility(worldModel) {
      const energy = worldModel.worldState.petEnergy;
      if (energy < 15) return 98; // Critical need to sleep
      if (energy < 30) return 85; // Strong need to sleep
      if (energy < 50) return 40; // Moderate need
      return 0;
    }
  },
  {
    name: 'GOAL_HEALTHY_USER',
    desiredState: { userTookBreak: true },
    calculateUtility(worldModel) {
      if (worldModel.beliefs.userNeedsBreakRemind) {
        return 95; // Reminding user is extremely important
      }
      return 0;
    }
  },
  {
    name: 'GOAL_CELEBRATE_TIME',
    desiredState: { celebrationFinished: true },
    calculateUtility(worldModel) {
      if (worldModel.beliefs.isCelebrationActive) {
        return 99; // Super high priority celebration!
      }
      return 0;
    }
  },
  {
    name: 'GOAL_STRETCH_ADVICE',
    desiredState: { userStretched: true },
    calculateUtility(worldModel) {
      if (worldModel.beliefs.userNeedsStretchRemind) {
        return 90; // High utility, just slightly below break remind
      }
      return 0;
    }
  },
  {
    name: 'GOAL_COMFORT_USER',
    desiredState: { userCheered: true },
    calculateUtility(worldModel) {
      if (worldModel.beliefs.userIsFrustrated) {
        return 88; // Comfort user if they are frustrated with build errors
      }
      return 0;
    }
  },
  {
    name: 'GOAL_PLAY',
    desiredState: { userInteracted: true },
    calculateUtility(worldModel) {
      const energy = worldModel.worldState.petEnergy;
      const interaction = worldModel.worldState.userInteractionLevel;
      if (energy > 60 && interaction < 0.3) {
        return 55; // High energy + low interaction = urge to play
      }
      return 12; // Base play desire
    }
  },
  {
    name: 'GOAL_EXPLORE',
    desiredState: { screenExplored: true },
    calculateUtility(worldModel) {
      // Default goal, always slightly active as background exploration
      return 18;
    }
  },
  {
    name: 'GOAL_SELF_CARE',
    desiredState: { petSelfCared: true },
    calculateUtility(worldModel) {
      if (!worldModel.beliefs.petNeedsSelfCare) return 0;
      // Utility scales up the longer the pet has been idle:
      // Triggers at score 35, comfortably above GOAL_EXPLORE (18) and GOAL_PLAY (12 base).
      // Will lose to GOAL_REST (<50 energy), GOAL_COMFORT_USER (88), and break/stretch triggers.
      return 35;
    }
  }
];
