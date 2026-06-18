import { invoke } from '@tauri-apps/api/core';

export interface MemoryLog {
  timestamp: number;
  eventType: string; // 'commit' | 'build_success' | 'build_fail' | 'break_taken' | 'break_skipped' | 'tool_active'
  metadata?: any;
}

export class AgentMemory {
  private logs: MemoryLog[] = [];
  private readonly STORAGE_KEY = 'desktop_pet_agent_memory';
  private readonly MAX_LOGS = 250;

  constructor() {
    this.loadFromStorage();
  }

  async addLog(eventType: string, metadata?: any) {
    const log: MemoryLog = {
      timestamp: Date.now(),
      eventType,
      metadata,
    };
    this.logs.push(log);

    // Keep memory bounded to prevent slow storage operations
    if (this.logs.length > this.MAX_LOGS) {
      this.logs.shift();
    }

    await this.saveToStorage();

    // Log the custom event directly to the event_log SQLite table
    try {
      await invoke('db_log_custom_event', {
        eventType,
        details: metadata ? JSON.stringify(metadata) : null,
      });
    } catch (e) {
      console.error('Failed to log custom event in SQLite', e);
    }
  }

  getLogs(): MemoryLog[] {
    return this.logs;
  }

  /**
   * Helper to analyze peak coding hours
   * Returns 'morning', 'afternoon', 'evening', 'night'
   */
  getPeakCodingTime(): string {
    const activeLogs = this.logs.filter(l => l.eventType === 'tool_active' || l.eventType === 'commit');
    if (activeLogs.length === 0) return 'unknown';

    const hourCounts = Array(24).fill(0);
    for (const log of activeLogs) {
      const hour = new Date(log.timestamp).getHours();
      hourCounts[hour]++;
    }

    // Classify into slots: Morning (5-11), Afternoon (12-17), Evening (18-21), Night (22-4)
    let morning = 0, afternoon = 0, evening = 0, night = 0;
    for (let h = 0; h < 24; h++) {
      if (h >= 5 && h < 12) morning += hourCounts[h];
      else if (h >= 12 && h < 18) afternoon += hourCounts[h];
      else if (h >= 18 && h < 22) evening += hourCounts[h];
      else night += hourCounts[h];
    }

    const max = Math.max(morning, afternoon, evening, night);
    if (max === morning) return 'Buổi sáng 🌅';
    if (max === afternoon) return 'Buổi chiều ☀️';
    if (max === evening) return 'Buổi tối 🌆';
    return 'Đêm khuya 🌙';
  }

  /**
   * Return build success rate percentage
   */
  getBuildSuccessRate(): number {
    const builds = this.logs.filter(l => l.eventType === 'build_success' || l.eventType === 'build_fail');
    if (builds.length === 0) return 100;

    const success = builds.filter(l => l.eventType === 'build_success').length;
    return Math.round((success / builds.length) * 100);
  }

  private async loadFromStorage() {
    try {
      const data = await invoke<string | null>('db_get_kv', { key: this.STORAGE_KEY });
      if (data) {
        this.logs = JSON.parse(data);
      }
    } catch (e) {
      console.error('Failed to load agent memory from SQLite', e);
      this.logs = [];
    }
  }

  private async saveToStorage() {
    try {
      await invoke('db_set_kv', { key: this.STORAGE_KEY, value: JSON.stringify(this.logs) });
    } catch (e) {
      console.error('Failed to save agent memory to SQLite', e);
    }
  }
}
