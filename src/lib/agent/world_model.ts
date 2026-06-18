import { petState, state } from '../state.svelte';

export interface WorldState {
  userCoding: boolean;
  userActiveTool: string | null;
  consecutiveBuildFails: number;
  elapsedTimeSinceCommit: number; // in seconds
  elapsedTimeSinceBreak: number;  // in seconds
  isLateNight: boolean;
  petEnergy: number;
  petHp: number;
  userInteractionLevel: number; // 0.0 to 1.0 based on click frequency
}

export interface Beliefs {
  userIsCoding: boolean;
  userCodingLate: boolean;
  userIsFrustrated: boolean;
  userIsTired: boolean;
  petNeedsRest: boolean;
  petIsHappy: boolean;
  userNeedsBreakRemind: boolean;
  userNeedsStretchRemind: boolean;
  isCelebrationActive: boolean;
  petNeedsSelfCare: boolean; // true khi rùa nhàn rỗi quá lâu mà không tự chăm sóc
}

export class AgentWorldModel {
  worldState: WorldState = {
    userCoding: false,
    userActiveTool: null,
    consecutiveBuildFails: 0,
    elapsedTimeSinceCommit: 0,
    elapsedTimeSinceBreak: 0,
    isLateNight: false,
    petEnergy: 100,
    petHp: 100,
    userInteractionLevel: 0.5,
  };

  beliefs: Beliefs = {
    userIsCoding: false,
    userCodingLate: false,
    userIsFrustrated: false,
    userIsTired: false,
    petNeedsRest: false,
    petIsHappy: false,
    userNeedsBreakRemind: false,
    userNeedsStretchRemind: false,
    isCelebrationActive: false,
    petNeedsSelfCare: false,
  };

  private lastInteractionCheck = Date.now();
  private clickCount = 0;

  // Track self-care idle time: how many consecutive ticks the pet has done
  // nothing but wander/idle without a self-care action.
  private selfCareIdleTicks = 0;
  // In DEV: trigger after 4 idle ticks (~20s). In PROD: after 24 ticks (~2 min).
  private readonly SELF_CARE_THRESHOLD = import.meta.env.DEV ? 4 : 24;

  // Track clock hour and debug trigger intervals
  private lastHour = new Date().getHours();
  private lastDebugTriggerTime = import.meta.env.DEV ? (Date.now() - 1.5 * 60 * 1000) : Date.now();
  private transitionTriggered = false;

  // Track healthy stretch reminders (HH:00 and HH:30 in production, 30s in dev)
  private lastHalfHourKey = '';
  private lastDebugStretchTime = Date.now();
  private stretchTransitionTriggered = false;

  private celebrationActive = false;

  constructor() {
    const hour = new Date().getHours();
    const minutes = new Date().getMinutes();
    this.lastHalfHourKey = `${hour}:${Math.floor(minutes / 30)}`;
    this.syncWithState();
  }

  /**
   * Syncs the world model state with Svelte reactive state from sensors
   */
  syncWithState() {
    this.worldState.userCoding = petState.active_tool !== null;
    this.worldState.userActiveTool = petState.active_tool;
    this.worldState.consecutiveBuildFails = petState.consecutive_build_fails;
    this.worldState.petEnergy = petState.energy;
    this.worldState.petHp = petState.hp;

    // late night check: between 11 PM and 5 AM
    const hour = new Date().getHours();
    this.worldState.isLateNight = hour >= 23 || hour < 5;

    // Decay user interaction level slowly over time
    const now = Date.now();
    const elapsedSec = (now - this.lastInteractionCheck) / 1000;
    if (elapsedSec > 10) {
      // Decay interaction level towards 0
      this.worldState.userInteractionLevel = Math.max(0, this.worldState.userInteractionLevel - elapsedSec * 0.005);
      this.lastInteractionCheck = now;
    }

    // Check transition triggers
    this.transitionTriggered = false;
    this.stretchTransitionTriggered = false;

    if (import.meta.env.DEV) {
      // In development: trigger check every 2 minutes
      if (now - this.lastDebugTriggerTime >= 2 * 60 * 1000) {
        this.transitionTriggered = true;
        this.lastDebugTriggerTime = now;
        console.log('[Agent World Model] Debug trigger: 2 minutes elapsed. Requesting break check.');
      }
      
      // In development: trigger stretch reminder every 30 seconds
      if (now - this.lastDebugStretchTime >= 30 * 1000) {
        this.stretchTransitionTriggered = true;
        this.lastDebugStretchTime = now;
        console.log('[Agent World Model] Debug trigger: 30 seconds elapsed. Requesting stretch check.');
      }
    } else {
      // In production: trigger check when clock hour changes (HH:59 -> HH+1:00)
      if (hour !== this.lastHour) {
        this.transitionTriggered = true;
        this.lastHour = hour;
        console.log(`[Agent World Model] Hour changed from ${this.lastHour} to ${hour}. Requesting break check.`);
      }

      // In production: trigger stretch when clock half-hour changes (HH:00 or HH:30)
      const halfHourKey = `${hour}:${Math.floor(new Date().getMinutes() / 30)}`;
      if (halfHourKey !== this.lastHalfHourKey) {
        this.stretchTransitionTriggered = true;
        this.lastHalfHourKey = halfHourKey;
        console.log(`[Agent World Model] Half-hour changed to ${halfHourKey}. Requesting stretch check.`);
      }
    }

    // Check celebration triggers
    if (import.meta.env.DEV) {
      // In dev: trigger for the first 15 seconds of every 5 minutes
      const dateObj = new Date();
      const minutes = dateObj.getMinutes();
      const seconds = dateObj.getSeconds();
      this.celebrationActive = (minutes % 5 === 0) && (seconds < 15);
    } else {
      const minutes = new Date().getMinutes();
      this.celebrationActive = (hour === 12 || hour === 17) && (minutes === 0 || minutes === 1);
    }

    this.updateBeliefs();
  }

  /**
   * Register a user click/interaction to boost interaction level
   */
  recordInteraction() {
    this.worldState.userInteractionLevel = Math.min(1.0, this.worldState.userInteractionLevel + 0.2);
    this.lastInteractionCheck = Date.now();
    this.updateBeliefs();
  }

  /**
   * Rule engine (Beliefs Engine) that derives high-level beliefs from raw world state
   */
  updateBeliefs() {
    this.beliefs.userIsCoding = this.worldState.userCoding;
    this.beliefs.userCodingLate = this.worldState.isLateNight && this.worldState.userCoding;
    
    // User is frustrated if build fails multiple times in a row
    this.beliefs.userIsFrustrated = this.worldState.consecutiveBuildFails >= 2;

    // Pet needs rest if energy drops below 30
    this.beliefs.petNeedsRest = this.worldState.petEnergy < 30;

    // Pet is happy if health is high and user is interacting
    this.beliefs.petIsHappy = this.worldState.petHp > 80 && this.worldState.userInteractionLevel > 0.4;

    // User is tired if coding time is long without break
    const elapsedMinutes = state.codingMinutes || 0;
    this.beliefs.userIsTired = elapsedMinutes >= 60; // 60 minutes coding

    // User needs break reminder when the clock hour / debug trigger transitions
    this.beliefs.userNeedsBreakRemind = this.transitionTriggered && !state.breakVisible;

    // User needs healthy stretch reminder when the half-hour / debug trigger transitions
    this.beliefs.userNeedsStretchRemind = this.stretchTransitionTriggered && !state.breakVisible;

    this.beliefs.isCelebrationActive = this.celebrationActive;

    // Pet self-care: track how long the pet stays in passive states (idle/wander/bored)
    // without doing a rewarding self-care activity.
    const passiveActions = ['idle', 'wander', 'bored', 'tired'];
    const selfCareActions = ['eat_snack', 'drink_water', 'put_on_hat', 'read_book',
      'sleep', 'bathing', 'celebrate_fireworks', 'hourly_break', 'climbing_left',
      'climbing_right', 'climbing_ceiling', 'climbing_ceiling_left', 'climbing_left_down',
      'climbing_right_down', 'climbing_ground_left', 'climbing_ground_right'];
    const petCurrentAction = petState.currentAction as string;
    if (passiveActions.includes(petCurrentAction)) {
      this.selfCareIdleTicks++;
    } else if (selfCareActions.includes(petCurrentAction)) {
      // Any active self-care or climbing action resets the idle counter
      this.selfCareIdleTicks = 0;
    }

    this.beliefs.petNeedsSelfCare =
      this.selfCareIdleTicks >= this.SELF_CARE_THRESHOLD &&
      !state.breakVisible &&
      !this.beliefs.isCelebrationActive;
  }
}
