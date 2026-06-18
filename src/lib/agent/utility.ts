import { GOALS, type Goal } from './goals';
import type { AgentWorldModel } from './world_model';

export class UtilityAI {
  /**
   * Assess all goals and return the highest utility goal.
   * If all goals score 0, falls back to GOAL_EXPLORE.
   */
  selectBestGoal(worldModel: AgentWorldModel): Goal {
    let bestGoal: Goal = GOALS.find(g => g.name === 'GOAL_EXPLORE')!;
    let highestScore = -1;

    console.log('--- Utility AI Assessment ---');
    for (const goal of GOALS) {
      const score = goal.calculateUtility(worldModel);
      console.log(`Goal: ${goal.name} | Utility Score: ${score}`);
      
      if (score > highestScore) {
        highestScore = score;
        bestGoal = goal;
      }
    }
    console.log(`Selected Goal: ${bestGoal.name} (Score: ${highestScore})`);
    console.log('-----------------------------');

    return bestGoal;
  }
}
