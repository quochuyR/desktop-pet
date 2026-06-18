import { invoke } from '@tauri-apps/api/core';

export class AgentLearning {
  private qTable: Record<string, number[]> = {};
  private readonly STORAGE_KEY = 'desktop_pet_q_table';
  
  // Q-Learning parameters
  private readonly alpha = 0.25; // learning rate
  private readonly gamma = 0.8;  // discount factor
  private readonly epsilon = 0.15; // exploration rate (epsilon-greedy)

  // Track active action to apply reward later
  private lastState: string | null = null;
  private lastAction: number | null = null;
  private lastTriggerTime = 0;

  constructor() {
    this.loadQTable();
  }

  /**
   * Encodes world state into a discrete state string: "codingTime_interaction"
   * - codingTime: 0 (0-30m), 1 (30-60m), 2 (60m+)
   * - interaction: 0 (low), 1 (high)
   */
  getStateKey(elapsedMinutes: number, interactionLevel: number): string {
    const timeBucket = elapsedMinutes < 30 ? 0 : elapsedMinutes < 60 ? 1 : 2;
    const interactionBucket = interactionLevel < 0.4 ? 0 : 1;
    return `${timeBucket}_${interactionBucket}`;
  }

  /**
   * Decide whether to trigger a break or do nothing
   * Action 0: DoNothing
   * Action 1: TriggerBreak
   */
  chooseAction(stateKey: string): number {
    // Initialize state row if not exists
    if (!this.qTable[stateKey]) {
      this.qTable[stateKey] = [0.0, 0.0]; // [DoNothing, TriggerBreak]
    }

    // Epsilon-greedy exploration
    if (Math.random() < this.epsilon) {
      const randomAction = Math.random() > 0.85 ? 1 : 0; // Bias towards DoNothing to avoid spamming
      console.log(`[RL Learning] Exploring random action: ${randomAction === 1 ? 'TriggerBreak' : 'DoNothing'}`);
      return randomAction;
    }

    // Exploitation: choose action with max Q value
    const qValues = this.qTable[stateKey];
    const bestAction = qValues[1] >= qValues[0] ? 1 : 0;
    console.log(`[RL Learning] Exploiting best action for state ${stateKey}: ${bestAction === 1 ? 'TriggerBreak' : 'DoNothing'} (Q: [${qValues.map(v => v.toFixed(3)).join(', ')}])`);
    return bestAction;
  }

  /**
   * Records that an action was taken, to wait for a reward
   */
  recordAction(stateKey: string, action: number) {
    this.lastState = stateKey;
    this.lastAction = action;
    this.lastTriggerTime = Date.now();
  }

  /**
   * Receives reward and updates the Q-table
   */
  async applyReward(reward: number, nextStateKey: string) {
    if (this.lastState === null || this.lastAction === null) return;

    const s = this.lastState;
    const a = this.lastAction;

    // Initialize next state row if not exists
    if (!this.qTable[nextStateKey]) {
      this.qTable[nextStateKey] = [0.0, 0.0];
    }

    // Max Q value for the next state
    const maxNextQ = Math.max(...this.qTable[nextStateKey]);

    // Current Q value
    const currentQ = this.qTable[s][a];

    // Q-Learning update formula
    const newQ = currentQ + this.alpha * (reward + this.gamma * maxNextQ - currentQ);
    this.qTable[s][a] = newQ;

    console.log(`[RL Learning] Q-Table updated: S(${s}) A(${a}) -> Q-value: ${newQ.toFixed(4)} (Reward: ${reward})`);

    // Reset tracking
    this.lastState = null;
    this.lastAction = null;

    await this.saveQTable();
  }

  /**
   * Returns elapsed time since the last action was recorded
   */
  getSecsSinceLastTrigger(): number {
    if (this.lastTriggerTime === 0) return 9999;
    return (Date.now() - this.lastTriggerTime) / 1000;
  }

  private async loadQTable() {
    try {
      const data = await invoke<string | null>('db_get_kv', { key: this.STORAGE_KEY });
      if (data) {
        this.qTable = JSON.parse(data);
      }
    } catch (e) {
      console.error('Failed to load Q-Table from SQLite', e);
      this.qTable = {};
    }
  }

  private async saveQTable() {
    try {
      await invoke('db_set_kv', { key: this.STORAGE_KEY, value: JSON.stringify(this.qTable) });
    } catch (e) {
      console.error('Failed to save Q-Table to SQLite', e);
    }
  }
}
