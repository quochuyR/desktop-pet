<script lang="ts">
  import { onMount } from 'svelte';
  import { petState, state, syncMonitorLayout } from '../state.svelte';
  import { updateMovement, particleSystem } from '../physics';
  import { TurtleRenderer } from '../turtle';
  import { listen } from '@tauri-apps/api/event';
  import { invoke } from '@tauri-apps/api/core';

  let canvas: HTMLCanvasElement;
  let renderer: TurtleRenderer;

  onMount(() => {
    renderer = new TurtleRenderer(canvas);

    // CRITICAL: Set real screen dimensions before physics runs
    syncMonitorLayout().then(() => {
      // Start rùa ở giữa trên cùng màn hình và sẽ rơi xuống
      if (petState.globalY === 100) {
        petState.globalX = petState.monitorX + (petState.screenW - 400) / 2;
        petState.globalY = petState.monitorY;
        petState.lastSentX = petState.globalX;
        petState.lastSentY = petState.globalY;
        petState.currentAction = 'falling';
        petState.vy = 0;
      }
    });
    
    // Bind particle methods to physics system
    particleSystem.addStar = (x, y, vx, vy) => renderer.addStar(x, y, vx, vy);
    particleSystem.addDust = (x, y, vx, vy) => renderer.addDust(x, y, vx, vy);
    particleSystem.addBubble = (x, y) => renderer.addBubble(x, y);
    particleSystem.addSweat = (x, y) => renderer.addSweat(x, y);
    particleSystem.addTear = (x, y) => renderer.addTear(x, y);
    particleSystem.addFireworks = (x, y) => renderer.addFireworks(x, y);
    particleSystem.addCrumb = (x, y) => renderer.addCrumb(x, y);

    let animationFrameId: number;
    let lastTime = performance.now();
    let isVisible = true;
    const PHYSICS_TICK_MS = 1000 / 60;
    let physicsAccumulator = 0;

    let lastSentPhysX = -9999;
    let lastSentPhysY = -9999;

    function syncWindowPositionIfNeeded(interpolatedX: number, interpolatedY: number) {
      const active = state.monitors.find(m => {
        const scale = m.scale_factor || 1.0;
        return Math.round(m.x / scale) === petState.monitorX && Math.round(m.y / scale) === petState.monitorY;
      }) || state.monitors[0];
      const scale = active ? (active.scale_factor || 1.0) : 1.0;

      const physX = Math.round(interpolatedX * scale);
      const physY = Math.round(interpolatedY * scale);

      if (physX !== lastSentPhysX || physY !== lastSentPhysY) {
        lastSentPhysX = physX;
        lastSentPhysY = physY;
        petState.lastSentX = interpolatedX;
        petState.lastSentY = interpolatedY;

        invoke('move_window', { x: physX, y: physY }).catch(() => {});
      }
    }

    function gameLoop(time: number) {
      animationFrameId = requestAnimationFrame(gameLoop);
      if (!isVisible) {
        return;
      }

      const elapsed = time - lastTime;
      // Prevent massive jumps if tab was inactive
      const frameTime = Math.min(elapsed, 250);
      lastTime = time;
      
      physicsAccumulator += frameTime;

      let steps = 0;
      while (physicsAccumulator >= PHYSICS_TICK_MS) {
        petState.prevGlobalX = petState.globalX;
        petState.prevGlobalY = petState.globalY;
        petState.prevX = petState.x;
        petState.prevY = petState.y;
        petState.prevRotation = petState.rotation;
        petState.prevStretch = petState.stretch;
        petState.prevSquash = petState.squash;

        if (!state.statsVisible) {
          petState.x = 200;
          petState.y = 200;
        }
        updateMovement();

        if (state.statsVisible) {
          const centerX = petState.monitorX + (petState.screenW - 400) / 2;
          const centerY = petState.monitorY + (petState.screenH - 400) / 2;
          petState.x = petState.globalX - centerX + 200;
          petState.y = petState.globalY - centerY + 200;
        }

        physicsAccumulator -= PHYSICS_TICK_MS;
        
        steps++;
        if (steps > 10) {
          physicsAccumulator = 0;
          break;
        }
      }

      // Calculate interpolated position for smooth window movement
      const alpha = PHYSICS_TICK_MS > 0 ? (physicsAccumulator / PHYSICS_TICK_MS) : 1.0;
      const renderX = petState.globalX * alpha + petState.prevGlobalX * (1 - alpha);
      const renderY = petState.globalY * alpha + petState.prevGlobalY * (1 - alpha);

      // Temporarily apply interpolated rendering properties
      const realX = petState.x;
      const realY = petState.y;
      const realRot = petState.rotation;
      const realStretch = petState.stretch;
      const realSquash = petState.squash;
      
      petState.x = petState.x * alpha + petState.prevX * (1 - alpha);
      petState.y = petState.y * alpha + petState.prevY * (1 - alpha);
      petState.rotation = petState.rotation * alpha + petState.prevRotation * (1 - alpha);
      petState.stretch = petState.stretch * alpha + petState.prevStretch * (1 - alpha);
      petState.squash = petState.squash * alpha + petState.prevSquash * (1 - alpha);

      renderer.render(petState, state, frameTime);

      // Restore real physics values
      petState.x = realX;
      petState.y = realY;
      petState.rotation = realRot;
      petState.stretch = realStretch;
      petState.squash = realSquash;

      if (!state.isDragging) {
        if (!state.statsVisible) {
          syncWindowPositionIfNeeded(renderX, renderY);
        } else {
          const centerX = petState.monitorX + (petState.screenW - 400) / 2;
          const centerY = petState.monitorY + (petState.screenH - 400) / 2;
          syncWindowPositionIfNeeded(centerX, centerY);
        }
      }
    }

    animationFrameId = requestAnimationFrame(gameLoop);

    let unlistenVisibility: any;
    listen('window-visibility', (event: any) => {
      isVisible = event.payload as boolean;
      if (isVisible) {
        lastTime = performance.now();
        physicsAccumulator = 0;
      }
    }).then(fn => {
      unlistenVisibility = fn;
    });

    return () => {
      cancelAnimationFrame(animationFrameId);
      if (unlistenVisibility) {
        unlistenVisibility();
      }
    };
  });
</script>

<canvas
  bind:this={canvas}
  width="400"
  height="400"
  class="drop-shadow-xl"
></canvas>

<style>
  canvas {
    filter: drop-shadow(0 15px 15px rgba(0,0,0,0.4));
  }
</style>
