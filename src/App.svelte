<script lang="ts">
  import { onMount } from 'svelte';
  import { petState, state, syncMonitorLayout, updateActiveMonitor, jsLog } from './lib/state.svelte';
  import { listen } from '@tauri-apps/api/event';
  import { invoke } from '@tauri-apps/api/core';
  import { getCurrentWindow } from '@tauri-apps/api/window';
  import { agentManager } from './lib/agent/agent_manager';
  import { particleSystem } from './lib/physics';
  
  import PetCanvas from './lib/components/PetCanvas.svelte';
  import StatsHUD from './lib/components/StatsHUD.svelte';
  import DecorateHUD from './lib/components/DecorateHUD.svelte';
  import BreakOverlay from './lib/components/BreakOverlay.svelte';
  import UpdateDialog from './lib/components/UpdateDialog.svelte';

  const appWindow = getCurrentWindow();

  function openStats() {
    jsLog("[openStats] Triggered");
    if (state.breakVisible || petState.currentAction === 'hourly_break') {
      jsLog("[openStats] Blocked: break or hourly_break is active");
      return;
    }

    if (state.isDragging) {
      state.isDragging = false;
      state.speechVisible = false;
      velHistory = [];
      (petState as any).lastDragPhysX = undefined;
      (petState as any).lastDragPhysY = undefined;
    }

    if (state.decorateVisible) {
      state.decorateVisible = false;
    }

    // Save original position for exit animation
    (petState as any).statsOrigX = petState.globalX;
    (petState as any).statsOrigY = petState.globalY;
    (petState as any).statsStartX = petState.globalX;
    (petState as any).statsStartY = petState.globalY;

    // Hand off to physics — it will move the window and spin the turtle
    state.statsVisible = true;
    petState.currentAction = 'stats_dialog';
    petState.actionTimer = 0;
    jsLog("[openStats] Success: statsVisible=true, currentAction=stats_dialog");
  }

  function closeStats() {
    jsLog("[closeStats] Triggered");
    state.statsVisible = false;
    // Trigger exit spin — physics will animate back to original position
    petState.currentAction = 'stats_dialog_exit';
    petState.actionTimer = 0;
    jsLog("[closeStats] Success: statsVisible=false, currentAction=stats_dialog_exit");
  }

  function openDecorate() {
    jsLog("[openDecorate] Triggered");
    if (state.breakVisible || petState.currentAction === 'hourly_break') {
      jsLog("[openDecorate] Blocked: break or hourly_break is active");
      return;
    }

    if (state.isDragging) {
      state.isDragging = false;
      state.speechVisible = false;
      velHistory = [];
      (petState as any).lastDragPhysX = undefined;
      (petState as any).lastDragPhysY = undefined;
    }

    if (state.statsVisible) {
      state.statsVisible = false;
    }

    // Save original position for exit animation
    (petState as any).statsOrigX = petState.globalX;
    (petState as any).statsOrigY = petState.globalY;
    (petState as any).statsStartX = petState.globalX;
    (petState as any).statsStartY = petState.globalY;

    // Hand off to physics — it will move the window and spin the turtle
    state.decorateVisible = true;
    petState.currentAction = 'stats_dialog';
    petState.actionTimer = 0;
    jsLog("[openDecorate] Success: decorateVisible=true, currentAction=stats_dialog");
  }

  function closeDecorate() {
    jsLog("[closeDecorate] Triggered");
    state.decorateVisible = false;
    // Trigger exit spin — physics will animate back to original position
    petState.currentAction = 'stats_dialog_exit';
    petState.actionTimer = 0;
    jsLog("[closeDecorate] Success: decorateVisible=false, currentAction=stats_dialog_exit");
  }

  function showSpeech(text: string, durationMs: number = 3000) {
    state.speechText = text;
    state.speechVisible = true;
    if (state.speechTimeout) clearTimeout(state.speechTimeout);
    state.speechTimeout = setTimeout(() => {
      state.speechVisible = false;
    }, durationMs);
  }

  function triggerAnimation(action: string) {
    const isPhysicalState = 
      petState.currentAction === 'dangling' || 
      petState.currentAction === 'falling' || 
      petState.currentAction === 'flipped' ||
      petState.currentAction === 'crying_ground' ||
      petState.currentAction === 'tired';

    if (isPhysicalState) {
      if (action === 'celebrate') {
        showSpeech('Build thành công! 🎉', 3000);
        particleSystem.addFireworks(petState.x, petState.y - 30);
      } else if (action === 'error') {
        showSpeech('Lại lỗi rồi! Đập máy! 💥', 3000);
      }
      return;
    }

    if (petState.currentAction === 'sleep' && action !== 'wake_up' && action !== 'bored') return;

    if (action === 'sleep') {
      petState.currentAction = 'sleep';
      petState.mood = 'sleeping';
      petState.vx = 0;
      petState.vy = 0;
      showSpeech('Zzz...', 99999);
    } else if (action === 'wake_up') {
      petState.currentAction = 'wander';
      petState.mood = 'walking';
      state.speechVisible = false;
    } else if (action === 'bored') {
      petState.currentAction = 'bored';
      petState.mood = 'sad';
      petState.vx = 0;
      showSpeech('Chán quá đi... Chơi với tui đi!', 3000);
    } else if (action === 'coding') {
      petState.currentAction = 'wander';
      petState.mood = 'excited';
      if (Math.random() > 0.5) showSpeech('Gõ code bốc lửa! 🔥', 2000);
    } else if (action === 'error') {
      petState.mood = 'angry';
      showSpeech('Lại lỗi rồi! Đập máy! 💥', 3000);
    } else if (action === 'celebrate') {
      petState.mood = 'happy';
      showSpeech('Build thành công! 🎉', 3000);
      particleSystem.addFireworks(petState.x, petState.y - 30);
    }
  }

  // Velocity tracking for physics throw
  const VEL_HISTORY = 6;
  let velHistory: { dx: number; dy: number; t: number }[] = [];

  let dragPhysX = 0;
  let dragPhysY = 0;
  let clickOffsetPhysX = 0;
  let clickOffsetPhysY = 0;
  let dragStartClientX = 0;
  let dragStartClientY = 0;
  let hasDragged = false;

  function handlePointerDown(e: PointerEvent) {
    if (state.breakVisible || petState.currentAction === 'hourly_break' || petState.currentAction === 'hourly_break_exit' || state.statsVisible || state.decorateVisible || petState.currentAction === 'stats_dialog' || petState.currentAction === 'stats_dialog_exit') return;

    // Turtle is always drawn at canvas center (200, 200) inside 400x400 window
    const dx = e.clientX - 200;
    const dy = e.clientY - 200;
    const dist = Math.sqrt(dx * dx + dy * dy);
    
    jsLog(`[pointerdown] clientX/Y: (${e.clientX}, ${e.clientY}), dist to center: ${dist.toFixed(1)}`);

    if (dist < 80) {
      if (petState.currentAction === 'sleep') {
        triggerAnimation('wake_up');
        showSpeech('Oáp... Ai gọi tui đó? 🥱', 3000);
        return;
      }

      state.isDragging = true;
      hasDragged = false;
      dragStartClientX = e.clientX;
      dragStartClientY = e.clientY;
      velHistory = [];
      
      petState.currentAction = 'dangling';
      petState.mood = 'scared';
      petState.wasOnPlatform = false;
      petState.activePlatformId = null;
      petState.prevPlatformState = null;
      petState.vx = 0;
      petState.vy = 0;
      petState.angularVelocity = 0;
      petState.rotation = 0;
      (petState as any).lastDragX = petState.globalX;
      (petState as any).lastDragY = petState.globalY;

      const active = state.monitors.find(m => {
        const scale = m.scale_factor || 1.0;
        return Math.round(m.x / scale) === petState.monitorX && Math.round(m.y / scale) === petState.monitorY;
      }) || state.monitors[0];
      const scale = active ? (active.scale_factor || 1.0) : 1.0;
      dragPhysX = Math.round(petState.globalX * scale);
      dragPhysY = Math.round(petState.globalY * scale);
      clickOffsetPhysX = e.clientX * scale;
      clickOffsetPhysY = e.clientY * scale;
      (petState as any).lastDragPhysX = dragPhysX;
      (petState as any).lastDragPhysY = dragPhysY;
      
      jsLog(`[dragStart] Initial globalX/Y: (${petState.globalX.toFixed(1)}, ${petState.globalY.toFixed(1)}), scale: ${scale}, calculated dragPhysX/Y: (${dragPhysX}, ${dragPhysY}), clickOffsetPhys: (${clickOffsetPhysX.toFixed(1)}, ${clickOffsetPhysY.toFixed(1)})`);

      const speeches = [
        'Thả tui xuống!!! 😱',
        'Cứu với... độ cao làm tui chóng mặt! 😵‍💫',
        'Á á á á á! 😭',
      ];
      showSpeech(speeches[Math.floor(Math.random() * speeches.length)], 99999);
      try { (e.target as Element)?.setPointerCapture(e.pointerId); } catch {}
    }
  }

  let isFetchingCursor = false;

  function handlePointerMove(e: PointerEvent) {
    if (state.isDragging) {
      // Check if mouse actually moved beyond threshold
      const dist = Math.hypot(e.clientX - dragStartClientX, e.clientY - dragStartClientY);
      if (dist > 3) {
        hasDragged = true;
      }

      if (isFetchingCursor) return;
      isFetchingCursor = true;

      invoke('get_physical_cursor_position')
        .then((pos: any) => {
          if (!state.isDragging) return;
          const [cursorPhysX, cursorPhysY] = pos as [number, number];

          // Find the monitor containing the physical cursor position to get its scale factor
          const active = state.monitors.find(m => {
            return cursorPhysX >= m.x && cursorPhysX <= m.x + m.width &&
                   cursorPhysY >= m.y && cursorPhysY <= m.y + m.height;
          }) || state.monitors[0];
          const scale = active ? (active.scale_factor || 1.0) : 1.0;

          // Dynamically calculate click offset in physical pixels based on the monitor's scale factor
          const newDragPhysX = cursorPhysX - dragStartClientX * scale;
          const newDragPhysY = cursorPhysY - dragStartClientY * scale;

          const pdx = newDragPhysX - dragPhysX;
          const pdy = newDragPhysY - dragPhysY;

          dragPhysX = newDragPhysX;
          dragPhysY = newDragPhysY;

          // Track physical movement deltas for throw velocity
          const now = performance.now();
          velHistory.push({ dx: pdx, dy: pdy, t: now });
          if (velHistory.length > VEL_HISTORY) velHistory.shift();

          jsLog(`[dragMove] cursorPhys: (${cursorPhysX.toFixed(1)}, ${cursorPhysY.toFixed(1)}), scale: ${scale}, new dragPhys: (${dragPhysX.toFixed(1)}, ${dragPhysY.toFixed(1)}), hasDragged: ${hasDragged}`);

          // Move window physically
          invoke('move_window', { x: dragPhysX, y: dragPhysY }).catch(() => {});

          // Update active monitor and logical coordinates based on new physical coordinates
          updateActiveMonitor(dragPhysX, dragPhysY);
        })
        .catch((err) => {
          jsLog("Error during drag: " + String(err));
        })
        .finally(() => {
          isFetchingCursor = false;
        });
    } else {
      // Hover logic when not dragging
      const dx = e.clientX - 200;
      const dy = e.clientY - 200;
      const dist = Math.hypot(dx, dy);
      state.isHoveringPet = dist < 80 && petState.currentAction !== 'sleep' && !state.breakVisible;
    }
  }

  async function handlePointerUp() {
    if (state.isDragging) {
      await syncMonitorLayout();
      state.isDragging = false;
      state.speechVisible = false;

      jsLog(`[dragEnd] hasDragged: ${hasDragged}, final globalX/Y: (${petState.globalX.toFixed(1)}, ${petState.globalY.toFixed(1)})`);

      if (!hasDragged) {
        // This was a click, not a drag!
        // Trigger self-care preview animation
        const selfCarePool = ['eat_snack', 'drink_water', 'put_on_hat', 'read_book'] as const;
        const chosen = selfCarePool[Math.floor(Math.random() * selfCarePool.length)];

        petState.currentAction = chosen;
        petState.mood = 'happy';
        petState.vx = 0;
        petState.vy = 0;
        petState.actionTimer = 0;

        const previewSpeeches: Record<string, string> = {
          eat_snack:   'Măm măm! Chủ nhân cho xem tui ăn snack nè! 🍪🐢',
          drink_water: 'Ực ực... Uống nước mát lạnh thật sảng khoái! 💧🐢',
          put_on_hat:  'Hehe! Chủ nhân muốn xem tui đổi nón hả? 🎩🐢',
          read_book:   'Ồ! Xem tui đọc sách nào, kiến thức là sức mạnh! 📖🐢',
        };
        showSpeech(previewSpeeches[chosen], 4000);
        
        jsLog(`[clickReaction] Triggered self-care preview: ${chosen}`);
        
        // Also call the native backend clicked feedback log
        invoke('pet_clicked').then((msg: any) => {
          if (msg && chosen !== 'eat_snack' && chosen !== 'drink_water' && chosen !== 'put_on_hat' && chosen !== 'read_book') {
            showSpeech(msg, 2500);
          }
        }).catch(() => {});
        agentManager.registerClickEvent();
        
        // Return without executing falling physics
        velHistory = [];
        (petState as any).lastDragPhysX = undefined;
        (petState as any).lastDragPhysY = undefined;
        return;
      }

      // It was a real drag! Run falling/throwing physics.
      petState.currentAction = 'falling';
      petState.mood = 'scared';

      // Calculate throw velocity from recent physical drag history
      if (velHistory.length >= 2) {
        // Use only the last 3 samples to capture the exact speed at the moment of release
        const recent = velHistory.slice(-3);
        if (recent.length >= 2) {
          const totalDxPhys = recent.reduce((s, v) => s + v.dx, 0);
          const totalDyPhys = recent.reduce((s, v) => s + v.dy, 0);
          
          const first = recent[0];
          const last = recent[recent.length - 1];
          const dt = last.t - first.t; // time in ms
          
          let vxPhys = 0;
          let vyPhys = 0;
          
          if (dt > 1) {
            // Speed in physical pixels per millisecond
            const vxMs = totalDxPhys / dt;
            const vyMs = totalDyPhys / dt;
            // Target 60 FPS = 16.67ms per frame. Multiply by a tuning factor of 1.25 for a satisfying throw feel.
            vxPhys = vxMs * 16.67 * 1.25;
            vyPhys = vyMs * 16.67 * 1.25;
          } else {
            // Fallback to simple average if time delta is too small/invalid
            vxPhys = (totalDxPhys / recent.length) * 1.5;
            vyPhys = (totalDyPhys / recent.length) * 1.5;
          }

          const active = state.monitors.find(m => {
            const scale = m.scale_factor || 1.0;
            return Math.round(m.x / scale) === petState.monitorX && Math.round(m.y / scale) === petState.monitorY;
          }) || state.monitors[0];
          const scale = active ? (active.scale_factor || 1.0) : 1.0;

          const vx = Math.max(-36, Math.min(36, vxPhys / scale));
          const vy = Math.max(-36, Math.min(36, vyPhys / scale));
          petState.vx = vx;
          petState.vy = vy;

          const throwSpeed = Math.sqrt(vx * vx + vy * vy);
          if (throwSpeed > 3.0) {
            (petState as any).isThrown = true;
            let spinDirection = Math.sign(vx);
            if (spinDirection === 0) spinDirection = Math.random() > 0.5 ? 1 : -1;
            // Stronger, more satisfying spin based on throw velocity
            petState.angularVelocity = spinDirection * (0.05 + throwSpeed * 0.012);
          } else {
            (petState as any).isThrown = false;
            petState.angularVelocity = 0;
          }
        }
      }
      velHistory = [];
      (petState as any).lastDragPhysX = undefined;
      (petState as any).lastDragPhysY = undefined;
    }
  }

  onMount(() => {
    agentManager.start();
    syncMonitorLayout();

    // Load saved decorations from DB
    invoke('db_get_kv', { key: 'decorations' }).then((res: any) => {
      if (res) {
        try {
          const data = JSON.parse(res);
          if (data.hatType) petState.hatType = data.hatType;
          if (data.glassesType) petState.glassesType = data.glassesType;
          if (data.clothesType) petState.clothesType = data.clothesType;
          if (data.colorTheme) petState.colorTheme = data.colorTheme;
          if (data.shellPattern) petState.shellPattern = data.shellPattern;
          if (data.feetStyle)  petState.feetStyle  = data.feetStyle;
          if (data.headStyle)  petState.headStyle  = data.headStyle;
          if (data.eyeStyle)   petState.eyeStyle   = data.eyeStyle;
          if (data.tailStyle)  petState.tailStyle  = data.tailStyle;

          jsLog("[App.svelte] Loaded decorations: " + JSON.stringify(data));
        } catch (e) {
          jsLog("[App.svelte] Error parsing loaded decorations: " + String(e));
        }
      }
    }).catch(err => {
      jsLog("[App.svelte] Error fetching decorations KV: " + String(err));
    });

    window.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);

    // Toggle HUD with 'S' key
    const handleKeydown = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === 's') {
        jsLog("[App.svelte] Keydown 'S' detected");
        if (state.statsVisible) {
          closeStats();
        } else {
          openStats();
        }
      }
    };
    window.addEventListener('keydown', handleKeydown);

    // Tauri event listeners
    listen('pet_stats_update', (e: any) => {
      const d = e.payload;
      petState.hp = d.hp;
      petState.energy = d.energy;
      petState.iq = d.iq;
      petState.exp = d.exp;
      petState.level = d.level;
      petState.total_commits = d.total_commits;
      petState.coding_streak_days = d.coding_streak_days;
      petState.active_tool = d.active_tool;
      petState.consecutive_build_fails = d.consecutive_build_fails;
      
      const careerDisplayMap: Record<string, string> = {
        'JuniorTurtle': 'Junior Turtle 🐣',
        'MidTurtle': 'Mid Turtle 🐢',
        'SeniorTurtle': 'Senior Turtle 🎓',
        'ArchitectTurtle': 'Architect Turtle 🏗️',
        'CtoTurtle': 'CTO Turtle 👑'
      };
      petState.career_name = careerDisplayMap[d.career] || 'Junior Turtle 🐣';

      // Feed stats updates to the agent
      state.codingMinutes = d.coding_minutes_today;
      if (d.active_tool) {
        agentManager.registerCodingEvent(d.active_tool);
      }
    });

    listen('pet_message', (e: any) => {
      showSpeech(e.payload, 3000);
    });

    listen('pet_animate', (e: any) => triggerAnimation(e.payload));

    listen('thinking', (e: any) => {
      state.thinkingVisible = !!e.payload;
    });

    listen('show_stats', () => {
      jsLog("[App.svelte] show_stats event received");
      if (state.statsVisible) {
        closeStats();
      } else {
        openStats();
      }
    });

    listen('show_decorate', () => {
      jsLog("[App.svelte] show_decorate event received");
      if (state.decorateVisible) {
        closeDecorate();
      } else {
        openDecorate();
      }
    });

    listen('show_update', () => {
      jsLog("[App.svelte] show_update event received");
      state.updateVisible = true;
    });

    listen('trigger-break', () => {
      if (state.isDragging) {
        state.isDragging = false;
        state.speechVisible = false;
        velHistory = [];
        (petState as any).lastDragPhysX = undefined;
        (petState as any).lastDragPhysY = undefined;
      }

      petState.currentAction = 'hourly_break';
      petState.actionTimer = 0;
      petState.breakOrigX = petState.globalX;
      petState.breakOrigY = petState.globalY;
      petState.breakStartX = petState.globalX;
      petState.breakStartY = petState.globalY;
      state.breakTimer = 30.0;
    });

    let unlistenPlatforms: any;
    listen('window_platforms_update', (event: any) => {
      // During drag or break overlay, clear platforms entirely so physics won't prematurely land the turtle
      if (state.isDragging || state.breakVisible || petState.currentAction === 'hourly_break' || petState.currentAction === 'hourly_break_exit' || state.statsVisible || state.decorateVisible || petState.currentAction === 'stats_dialog' || petState.currentAction === 'stats_dialog_exit') {
        state.platforms = [];
        return;
      }

      const rawPlatforms = event.payload as { id: string; left: number; top: number; right: number; bottom: number; title: string; class_name: string }[];
      
      const petMonitor = state.monitors.find(m => {
        const scale = m.scale_factor || 1.0;
        return Math.round(m.x / scale) === petState.monitorX &&
               Math.round(m.y / scale) === petState.monitorY;
      }) || state.monitors[0];

      if (!petMonitor) {
        state.platforms = [];
        return;
      }

      const scale = petMonitor.scale_factor || 1.0;
      const filtered: any[] = [];

      for (const w of rawPlatforms) {
        const cx = (w.left + w.right) / 2;
        const cy = (w.top + w.bottom) / 2;

        // Check if window center is inside pet's active monitor
        if (cx >= petMonitor.x && cx <= petMonitor.x + petMonitor.width &&
            cy >= petMonitor.y && cy <= petMonitor.y + petMonitor.height) {
          
          filtered.push({
            id: w.id,
            left: petState.monitorX + (w.left - petMonitor.x) / scale,
            right: petState.monitorX + (w.right - petMonitor.x) / scale,
            top: petState.monitorY + (w.top - petMonitor.y) / scale,
            bottom: petState.monitorY + (w.bottom - petMonitor.y) / scale,
            title: w.title,
          });
        }
      }

      state.platforms = filtered;
    }).then(fn => { unlistenPlatforms = fn; });

    return () => {
      agentManager.stop();
      window.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('keydown', handleKeydown);
      if (unlistenPlatforms) unlistenPlatforms();
    };
  });
</script>

<main 
  class="w-screen h-screen overflow-hidden relative select-none"
  style:cursor={state.isDragging ? 'grabbing' : (state.isHoveringPet ? 'grab' : 'default')}
>
  <div class="absolute inset-0 z-0">
    <PetCanvas />
  </div>

  <div class="relative z-10">
    <StatsHUD />
    <DecorateHUD />
    <UpdateDialog />
  </div>

  <BreakOverlay />
</main>
