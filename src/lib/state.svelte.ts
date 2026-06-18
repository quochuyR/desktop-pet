import { invoke } from '@tauri-apps/api/core';

export const ENABLE_DEBUG_LOGS = false;

export function jsLog(message: string) {
  if (ENABLE_DEBUG_LOGS) {
    console.log(message);
    invoke('log_js', { message }).catch(() => {});
  }
}

export interface MonitorLayout {
  x: number;
  y: number;
  width: number;
  height: number;
  scale_factor: number;
}

export interface Platform {
  id: string;
  left: number;
  right: number;
  top: number;
  bottom: number;
  title: string;
}

export class GlobalState {
  appConfig = $state({ ai_enabled: false, pet_name: 'Rùa Dev' });
  aiEnabled = $state(false);
  codingMinutes = $state(0);
  statsVisible = $state(false);
  decorateVisible = $state(false);
  isDragging = $state(false);
  isHoveringPet = $state(false);
  speechTimeout: any = null;
  typingInterval: any = null;
  petTimer = $state(0);
  platforms = $state<Platform[]>([]);
  lastHour = $state(new Date().getHours());
  
  // Expose speech texts
  speechText = $state("");
  speechVisible = $state(false);
  thinkingVisible = $state(false);

  // Break overlay
  breakVisible = $state(false);
  breakTimer = $state(30.0);
  
  monitors = $state<MonitorLayout[]>([]);
}

export const state = new GlobalState();

export class PetState {
  // Physics (not bound in UI, so no DOM overhead)
  x = 200;
  y = 200;
  vx = 0;
  vy = 0;
  platformLostTimer = 0;
  wasOnPlatform = false;
  activePlatformId: string | null = null;
  prevPlatformState: Platform | null = null;
  gravity = 1.2;        // stronger gravity = snappier feel
  bounce = -0.55;       // more bounce energy retained
  angularVelocity = 0;
  rotation = 0;
  squash = 1.0;
  stretch = 1.0;
  facingLeft = false;

  // AI / Actions
  currentAction = 'wander';
  actionTimer = 0;
  onEdge = false;
  isFastClimb = false;
  climbSpeed = 1.5;
  reactionTimer = 0;
  reactionMood: string | null = null;
  isHovered = false;

  // Window Sync
  monitorX = $state(0);
  monitorY = $state(0);
  screenW = $state(1920);
  screenH = $state(1080);
  globalX = $state(100);
  globalY = $state(100);
  prevGlobalX = 100;
  prevGlobalY = 100;
  prevX = 200;
  prevY = 200;
  prevRotation = 0;
  prevStretch = 1.0;
  prevSquash = 1.0;
  lastSentX = 100;
  lastSentY = 100;
  breakOrigX = 100;
  breakOrigY = 100;
  breakStartX = 100;
  breakStartY = 100;

  // UI Reactive Properties
  mood = $state('walking');
  career = $state('junior');
  hp = $state(100);
  energy = $state(100);
  iq = $state(10);
  exp = $state(0);
  level = $state(1);
  total_commits = $state(0);
  coding_streak_days = $state(0);
  active_tool = $state<string | null>(null);
  consecutive_build_fails = $state(0);
  career_name = $state('Junior Turtle 🐣');
  hatType = $state<'none' | 'coder' | 'wizard' | 'straw' | 'crown' | 'party' | 'chef'>('coder');
  glassesType = $state<'none' | 'reading' | 'sunglasses' | 'star'>('none');
  clothesType = $state<'none' | 'bowtie' | 'scarf' | 'ribbon'>('none');
  colorTheme = $state<'default' | 'strawberry' | 'ocean' | 'matcha' | 'galaxy'>('default');
  shellPattern = $state<'classic' | 'flowers' | 'stars' | 'hearts' | 'bubbles' | 'clouds' | 'diamonds'>('classic');
  feetStyle  = $state<'classic' | 'chubby' | 'flipper' | 'star' | 'sock'>('classic');
  headStyle  = $state<'classic' | 'round' | 'chibi' | 'tiny'>('classic');
  eyeStyle   = $state<'classic' | 'button' | 'sparkle' | 'uwu' | 'dot'>('classic');
  tailStyle  = $state<'classic' | 'curly' | 'fluffy' | 'leaf' | 'ribbon'>('classic');

}

export const petState = new PetState();

export const CONSTANTS = {
  W: 400,
  H: 400,
  CX: 200,
  CY: 200
};

export async function syncMonitorLayout() {
  try {
    const layouts = await invoke('get_all_monitors') as MonitorLayout[];
    if (layouts && layouts.length > 0) {
      state.monitors = layouts;
      updateActiveMonitor();
    }
  } catch (e) {
    jsLog("Failed to sync monitor layout: " + String(e));
  }
}

export function updateActiveMonitor(physX?: number, physY?: number) {
  if (state.monitors.length === 0) {
    jsLog("[updateActiveMonitor] No monitors synced yet");
    return;
  }
  
  let targetPhysX = physX;
  let targetPhysY = physY;
  
  const currentActive = state.monitors.find(m => {
    const scale = m.scale_factor || 1.0;
    return Math.round(m.x / scale) === petState.monitorX && Math.round(m.y / scale) === petState.monitorY;
  }) || state.monitors[0];
  const currentScale = currentActive ? (currentActive.scale_factor || 1.0) : 1.0;

  if (targetPhysX === undefined || targetPhysY === undefined) {
    targetPhysX = petState.globalX * currentScale;
    targetPhysY = petState.globalY * currentScale;
  }

  // Calculate window physical center once based on the active monitor's scale
  const px = targetPhysX + 200 * currentScale;
  const py = targetPhysY + 200 * currentScale;

  let active = currentActive;
  let minDistance = Infinity;
  
  for (const m of state.monitors) {
    if (px >= m.x && px <= m.x + m.width && py >= m.y && py <= m.y + m.height) {
      active = m;
      break;
    }
    
    const centerX = m.x + m.width / 2;
    const centerY = m.y + m.height / 2;
    const dist = Math.hypot(px - centerX, py - centerY);
    if (dist < minDistance) {
      minDistance = dist;
      active = m;
    }
  }
  
  const scale = active.scale_factor || 1.0;
  petState.monitorX = Math.round(active.x / scale);
  petState.monitorY = Math.round(active.y / scale);
  petState.screenW = Math.round(active.width / scale);
  petState.screenH = Math.round(active.height / scale);
  
  petState.globalX = targetPhysX / scale;
  petState.globalY = targetPhysY / scale;
}

