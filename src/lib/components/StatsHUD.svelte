<script lang="ts">
  import { petState, state } from '../state.svelte';
  import { invoke } from '@tauri-apps/api/core';
  import { writable } from 'svelte/store';
  import { onMount } from 'svelte';
  
  import { enable, disable, isEnabled } from '@tauri-apps/plugin-autostart';

  const activeTab = writable<'rpg' | 'apps' | 'settings'>('rpg');
  const daysFilter = writable<number>(7);
  const appUsage = writable<any[]>([]);
  const totalUsageTime = writable<number>(0);
  const mostUsedApp = writable<string>('');
  const autostartEnabled = writable<boolean>(false);

  function handleClose() {
    state.statsVisible = false;
    petState.currentAction = 'stats_dialog_exit';
    petState.actionTimer = 0;
  }

  async function fetchAppUsage(days: number) {
    try {
      const data: any[] = await invoke('db_get_app_usage_summary', { days });
      appUsage.set(data);
      const total = data.reduce((sum: number, app: any) => sum + app.total_duration_seconds, 0);
      totalUsageTime.set(total);
      mostUsedApp.set(data.length > 0 ? data[0].process_name : 'None');
    } catch (err) {
      console.error("Failed to fetch app usage:", err);
    }
  }

  function onTabChange(tab: 'rpg' | 'apps' | 'settings') {
    activeTab.set(tab);
    if (tab === 'apps') {
      let days: number;
      daysFilter.subscribe(v => { days = v; })();
      fetchAppUsage(days!);
    }
    if (tab === 'settings') {
      checkAutostart();
    }
  }

  async function checkAutostart() {
    try {
      const enabled = await isEnabled();
      autostartEnabled.set(enabled);
    } catch (e) {
      console.error("Autostart check error", e);
    }
  }

  async function toggleAutostart() {
    try {
      let current: boolean = false;
      autostartEnabled.subscribe(v => current = v)();
      if (current) {
        await disable();
        autostartEnabled.set(false);
      } else {
        await enable();
        autostartEnabled.set(true);
      }
    } catch (e) {
      console.error("Autostart toggle error", e);
    }
  }

  function onDaysChange(e: Event) {
    const days = parseInt((e.target as HTMLSelectElement).value);
    daysFilter.set(days);
    fetchAppUsage(days);
  }
  
  function formatTime(seconds: number): string {
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const remMins = minutes % 60;
    return `${hours}h ${remMins}m`;
  }
</script>

{#if state.statsVisible}
  <div class="stats-dialog-overlay">
    <div class="stats-dialog-card">
      
      <!-- Close Button top right inside card -->
      <button class="stats-close-btn" onclick={handleClose} aria-label="Close stats">×</button>

      <!-- Tabs Header -->
      <div style="display: flex; gap: 6px; margin-bottom: 14px; border-bottom: 2px solid rgba(255,255,255,0.1); padding-bottom: 10px; flex-shrink: 0;">
        <button style="flex: 1; background: {$activeTab === 'rpg' ? 'rgba(108,92,231,0.35)' : 'rgba(255,255,255,0.05)'}; border: 1px solid {$activeTab === 'rpg' ? '#6c5ce7' : 'rgba(255,255,255,0.1)'}; color: white; padding: 6px 8px; border-radius: 8px; cursor: pointer; font-weight: bold; font-size: 11px; white-space: nowrap; transition: all 0.2s; font-family: inherit;" onclick={() => onTabChange('rpg')}>🎮 RPG</button>
        <button style="flex: 1; background: {$activeTab === 'apps' ? 'rgba(108,92,231,0.35)' : 'rgba(255,255,255,0.05)'}; border: 1px solid {$activeTab === 'apps' ? '#6c5ce7' : 'rgba(255,255,255,0.1)'}; color: white; padding: 6px 8px; border-radius: 8px; cursor: pointer; font-weight: bold; font-size: 11px; white-space: nowrap; transition: all 0.2s; font-family: inherit;" onclick={() => onTabChange('apps')}>⏱️ Apps</button>
        <button style="flex: 1; background: {$activeTab === 'settings' ? 'rgba(108,92,231,0.35)' : 'rgba(255,255,255,0.05)'}; border: 1px solid {$activeTab === 'settings' ? '#6c5ce7' : 'rgba(255,255,255,0.1)'}; color: white; padding: 6px 8px; border-radius: 8px; cursor: pointer; font-weight: bold; font-size: 11px; white-space: nowrap; transition: all 0.2s; font-family: inherit;" onclick={() => onTabChange('settings')}>⚙️ Settings</button>
      </div>

      {#if $activeTab === 'rpg'}
        <!-- Header section -->
        <div class="stats-card-header">
          <h3 class="stats-career-title">{petState.career_name}</h3>
          <span class="stats-level-badge">LV. {petState.level}</span>
        </div>

        <!-- Stats Grid -->
        <div class="stats-grid">
          <!-- HP -->
          <div class="stats-item">
            <div class="stats-item-info">
              <span class="stats-item-label"><span class="stats-icon">❤️</span> HP</span>
              <span class="stats-item-val">{Math.round(petState.hp)}</span>
            </div>
            <div class="stats-progress-track">
              <div class="stats-progress-fill hp" style="width: {petState.hp}%"></div>
            </div>
          </div>

          <!-- Energy -->
          <div class="stats-item">
            <div class="stats-item-info">
              <span class="stats-item-label"><span class="stats-icon">⚡</span> Energy</span>
              <span class="stats-item-val">{Math.round(petState.energy)}</span>
            </div>
            <div class="stats-progress-track">
              <div class="stats-progress-fill energy" style="width: {petState.energy}%"></div>
            </div>
          </div>

          <!-- IQ -->
          <div class="stats-item">
            <div class="stats-item-info">
              <span class="stats-item-label"><span class="stats-icon">🧠</span> IQ</span>
              <span class="stats-item-val">{Math.round(petState.iq)}</span>
            </div>
            <div class="stats-progress-track">
              <div class="stats-progress-fill iq" style="width: {petState.iq}%"></div>
            </div>
          </div>

          <!-- EXP -->
          <div class="stats-item">
            <div class="stats-item-info">
              <span class="stats-item-label"><span class="stats-icon">✨</span> EXP</span>
              <span class="stats-item-val">{Math.round(petState.exp)}/100</span>
            </div>
            <div class="stats-progress-track">
              <div class="stats-progress-fill exp" style="width: {petState.exp}%">
                <div class="stats-progress-shine"></div>
              </div>
            </div>
          </div>
        </div>

        <!-- Commits & Streak Badges -->
        <div class="stats-badges">
          <div class="stats-badge">
            <span class="badge-icon">📝</span>
            <span class="badge-text">{petState.total_commits} commits</span>
          </div>
          <div class="stats-badge">
            <span class="badge-icon">🔥</span>
            <span class="badge-text">{petState.coding_streak_days} days</span>
          </div>
        </div>
      {:else if $activeTab === 'apps'}
        <!-- App Usage Tab -->
        <div class="app-usage-container" style="display: flex; flex-direction: column; gap: 15px;">
          <div class="usage-header" style="display: flex; justify-content: space-between; align-items: center;">
            <h4 style="margin: 0; color: #a29bfe; font-size: 14px;">Statistics</h4>
            <select value={$daysFilter} onchange={onDaysChange} style="background: rgba(0,0,0,0.3); color: white; border: 1px solid rgba(255,255,255,0.2); padding: 4px 8px; border-radius: 6px; outline: none; font-size: 12px; cursor: pointer;">
              <option value={1}>Today</option>
              <option value={7}>Last 7 Days</option>
              <option value={30}>Last 30 Days</option>
              <option value={9999}>All Time</option>
            </select>
          </div>
          
          <div class="usage-summary" style="display: flex; gap: 10px;">
            <div class="summary-box" style="flex: 1; background: rgba(0,0,0,0.2); border-radius: 8px; padding: 10px; text-align: center; border: 1px solid rgba(255,255,255,0.05);">
              <div style="font-size: 11px; color: #b2bec3; margin-bottom: 4px;">Total Time</div>
              <div style="font-weight: bold; color: #ffeaa7; font-size: 14px;">{formatTime($totalUsageTime)}</div>
            </div>
            <div class="summary-box" style="flex: 1; background: rgba(0,0,0,0.2); border-radius: 8px; padding: 10px; text-align: center; border: 1px solid rgba(255,255,255,0.05);">
              <div style="font-size: 11px; color: #b2bec3; margin-bottom: 4px;">Most Used</div>
              <div style="font-weight: bold; color: #55efc4; font-size: 14px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100px; margin: 0 auto;">
                {$mostUsedApp.replace('.exe', '')}
              </div>
            </div>
          </div>

          <div class="usage-list" style="flex: 1; overflow-y: auto; max-height: 180px; padding-right: 6px; display: flex; flex-direction: column; gap: 10px;">
            {#if $appUsage.length === 0}
              <div style="text-align: center; color: #b2bec3; font-size: 12px; padding: 20px 0;">No usage data found.</div>
            {/if}
            {#each $appUsage as app}
              <div class="usage-list-item" style="background: rgba(255,255,255,0.03); border-radius: 6px; padding: 8px; border: 1px solid rgba(255,255,255,0.05);">
                <div class="usage-item-info" style="display: flex; justify-content: space-between; margin-bottom: 6px; font-size: 12px;">
                  <span class="usage-app-name" style="color: #dfe6e9; font-weight: 500;">{app.process_name.replace('.exe', '')}</span>
                  <span class="usage-app-time" style="color: #b2bec3;">{formatTime(app.total_duration_seconds)}</span>
                </div>
                <div class="stats-progress-track" style="height: 6px; background: rgba(0,0,0,0.3); border-radius: 3px; overflow: hidden;">
                  <div style="height: 100%; background: linear-gradient(90deg, #a29bfe, #6c5ce7); border-radius: 3px; width: {$totalUsageTime > 0 ? Math.min(100, (app.total_duration_seconds / $totalUsageTime) * 100) : 0}%"></div>
                </div>
              </div>
            {/each}
          </div>
        </div>
      {:else if $activeTab === 'settings'}
        <!-- Settings Tab -->
        <div class="settings-container" style="display: flex; flex-direction: column; gap: 15px; padding-top: 10px;">
          <div class="setting-item" style="display: flex; justify-content: space-between; align-items: center; background: rgba(0,0,0,0.2); padding: 12px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.05);">
            <div class="setting-info" style="display: flex; flex-direction: column; gap: 4px;">
              <span style="color: #dfe6e9; font-size: 14px; font-weight: 500;">Start on Boot</span>
              <span style="color: #b2bec3; font-size: 11px;">Automatically launch Desktop Pet when Windows starts</span>
            </div>
            
            <label class="switch" style="position: relative; display: inline-block; width: 40px; height: 20px;">
              <input type="checkbox" checked={$autostartEnabled} onchange={toggleAutostart} style="opacity: 0; width: 0; height: 0;">
              <span class="slider" style="position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: {$autostartEnabled ? '#a29bfe' : 'rgba(255,255,255,0.2)'}; transition: .4s; border-radius: 20px;">
                <span class="slider-dot" style="position: absolute; content: ''; height: 14px; width: 14px; left: 3px; bottom: 3px; background-color: white; transition: .4s; border-radius: 50%; transform: translateX({$autostartEnabled ? '20px' : '0'});"></span>
              </span>
            </label>
          </div>
        </div>
      {/if}
      
    </div>
  </div>
{/if}
