import { petState, state } from '../state.svelte';
import { AgentWorldModel } from './world_model';
import { UtilityAI } from './utility';
import { GoapPlanner } from './planner';
import { AgentMemory } from './memory';
import { AgentLearning } from './learning';
import { ACTIONS, type AgentAction } from './actions';
import { invoke } from '@tauri-apps/api/core';

export class AgentManager {
  worldModel: AgentWorldModel;
  utilityAI: UtilityAI;
  planner: GoapPlanner;
  memory: AgentMemory;
  learning: AgentLearning;

  // Personality traits
  friendly = 50;
  helpful = 50;
  funny = 50;

  private tickInterval: any = null;
  private lastActionName = '';

  constructor() {
    this.worldModel = new AgentWorldModel();
    this.utilityAI = new UtilityAI();
    this.planner = new GoapPlanner();
    this.memory = new AgentMemory();
    this.learning = new AgentLearning();
  }

  async start() {
    console.log('🤖 Rùa Dev Agent AI Brain initialized!');
    await this.loadPersonality();
    
    // Run the agent decision tick every 5 seconds
    this.tickInterval = setInterval(() => {
      this.tick();
    }, 5000);
  }

  stop() {
    if (this.tickInterval) {
      clearInterval(this.tickInterval);
    }
  }

  async loadPersonality() {
    try {
      const p = await invoke<[number, number, number]>('db_load_personality');
      if (p) {
        this.friendly = p[0];
        this.helpful = p[1];
        this.funny = p[2];
        console.log(`[Agent Manager] Personality loaded: Friendly=${this.friendly}, Helpful=${this.helpful}, Funny=${this.funny}`);
      }
    } catch (e) {
      console.error('[Agent Manager] Failed to load personality', e);
    }
  }

  async savePersonality() {
    try {
      await invoke('db_save_personality', {
        friendly: this.friendly,
        helpful: this.helpful,
        funny: this.funny,
      });
    } catch (e) {
      console.error('[Agent Manager] Failed to save personality', e);
    }
  }

  /**
   * Main decision tick
   */
  tick() {
    // Sync sensors/world model
    this.worldModel.syncWithState();

    // If break overlay or stats dialog is visible, we pause behavior planning
    if (state.breakVisible || state.statsVisible || petState.currentAction === 'stats_dialog' || petState.currentAction === 'stats_dialog_exit') {
      return;
    }

    // If the pet is dangling, falling, flipped, crying on the ground, or tired, we pause behavior planning
    const isPhysicalState = 
      petState.currentAction === 'dangling' || 
      petState.currentAction === 'falling' || 
      petState.currentAction === 'flipped' || 
      petState.currentAction === 'crying_ground' || 
      petState.currentAction === 'tired';

    if (isPhysicalState) {
      return;
    }

    // If celebration is active, pause planning to let the fireworks run
    if (petState.currentAction === 'celebrate_fireworks' && this.worldModel.beliefs.isCelebrationActive) {
      return;
    }

    // 1. Direct Clock Scheduler Triggers (100% deterministic, not related to RL or AI planning)
    if (this.worldModel.beliefs.userNeedsBreakRemind) {
      console.log('[Agent AI] Clock Scheduler: Triggering ActionHourlyBreak!');
      this.executeDirectAction('ActionHourlyBreak');
      return;
    }

    if (this.worldModel.beliefs.userNeedsStretchRemind) {
      console.log('[Agent AI] Clock Scheduler: Triggering ActionStretchRemind!');
      this.executeDirectAction('ActionStretchRemind');
      return;
    }

    if (this.worldModel.beliefs.isCelebrationActive) {
      if (petState.currentAction !== 'celebrate_fireworks') {
        console.log('[Agent AI] Clock Scheduler: Triggering ActionCelebrateFireworks!');
        this.executeDirectAction('ActionCelebrateFireworks');
        return;
      }
    }

    // 2. Select Goal using Utility AI
    const bestGoal = this.utilityAI.selectBestGoal(this.worldModel);

    // 3. Construct start state representation for GOAP
    const startState: Record<string, any> = {};
    startState[`currentAction:${petState.currentAction}`] = true;
    if (petState.energy > 80) startState['petEnergyHigh'] = true;

    // 4. Generate plan using GOAP A* planner
    // getCost() trên mỗi action được gọi tại đây, phản ánh trạng thái pet hiện tại.
    const plan = this.planner.plan(startState, bestGoal.desiredState, ACTIONS);

    if (plan && plan.length > 0) {
      const nextAction = plan[0];
      
      // Execute only if it is a new action to avoid resetting loop timers
      if (nextAction.name !== this.lastActionName || petState.actionTimer > 300) {
        console.log(`[Agent GOAP] Executing action: ${nextAction.name} to achieve ${bestGoal.name}`);
        this.memory.addLog('action_execute', { action: nextAction.name, goal: bestGoal.name });
        
        nextAction.execute();
        this.lastActionName = nextAction.name;
      }
    } else {
      // If already at goal or no plan found, fallback to idle/wander
      if (petState.currentAction === 'sleep' && petState.energy < 95) {
        // Sleep action is ongoing, let it rest
        return;
      }

      if (Math.random() < 0.15 && petState.currentAction !== 'wander') {
        const wander = ACTIONS.find(a => a.name === 'ActionWander')!;
        wander.execute();
        this.lastActionName = wander.name;
      }
    }
  }

  /**
   * Direct execution of an action bypassing the planning queue
   */
  executeDirectAction(actionName: string) {
    const action = ACTIONS.find(a => a.name === actionName);
    if (action) {
      console.log(`[Agent AI] Direct execution: ${action.name}`);
      action.execute();
      this.lastActionName = action.name;
    }
  }

  /**
   * Feeds user feedback (Break taken or skipped) to the Q-Learning system
   */
  registerBreakFeedback(taken: boolean) {
    const nextStateKey = this.learning.getStateKey(state.codingMinutes, this.worldModel.worldState.userInteractionLevel);
    const reward = taken ? 20 : -12;
    
    this.learning.applyReward(reward, nextStateKey);
    this.memory.addLog(taken ? 'break_taken' : 'break_skipped', { reward });

    if (taken) {
      this.friendly = Math.min(100, this.friendly + 2.0);
      this.helpful = Math.min(100, this.helpful + 1.0);
      console.log('[Agent Manager] User took break. Personality +Friendly, +Helpful');
    } else {
      this.friendly = Math.max(0, this.friendly - 1.0);
      this.helpful = Math.min(100, this.helpful + 3.0);
      console.log('[Agent Manager] User skipped break. Personality -Friendly, +Helpful');
    }
    this.savePersonality();
  }

  /**
   * Track coding event
   */
  registerCodingEvent(tool: string) {
    this.memory.addLog('tool_active', { tool });
  }

  /**
   * Track commit event
   */
  registerCommitEvent(isBugFix: boolean) {
    this.memory.addLog('commit', { isBugFix });
    this.worldModel.recordInteraction();
  }

  /**
   * Track build event
   */
  registerBuildEvent(success: boolean) {
    this.memory.addLog(success ? 'build_success' : 'build_fail');
    this.worldModel.recordInteraction();
  }

  /**
   * Track click event on the pet
   */
  registerClickEvent() {
    this.worldModel.recordInteraction();
    this.friendly = Math.min(100, this.friendly + 1.0);
    this.funny = Math.min(100, this.funny + 1.5);
    console.log('[Agent Manager] User clicked pet. Personality +Friendly, +Funny');
    this.savePersonality();
    this.memory.addLog('pet_clicked');
  }
}

// Global Agent Manager instance
export const agentManager = new AgentManager();
