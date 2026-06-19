<script lang="ts">
  import { petState, state as appState, jsLog } from '../state.svelte';
  import { invoke } from '@tauri-apps/api/core';
  import { getCurrentWindow } from '@tauri-apps/api/window';
  import { LogicalSize } from '@tauri-apps/api/dpi';
  import { TurtleRenderer } from '../renderer/TurtleRenderer';

  type TabId = 'hat' | 'glasses' | 'collar' | 'color' | 'pattern' | 'feet' | 'eyes' | 'head' | 'tail';
  let activeTab: TabId = $state('hat');

  let previewCanvas: HTMLCanvasElement | undefined = $state();
  let renderer: TurtleRenderer | undefined;

  $effect(() => {
    const win = getCurrentWindow();
    if (appState.decorateVisible) {
      win.setSize(new LogicalSize(700, 500)).catch(err => console.error("Resize Error:", err));
    } else {
      win.setSize(new LogicalSize(400, 400)).catch(err => console.error("Resize Error:", err));
    }
  });

  $effect(() => {
    if (previewCanvas && appState.decorateVisible) {
      renderer = new TurtleRenderer(previewCanvas);
      let animationFrameId: number;
      let lastTime = performance.now();

      function loop(time: number) {
        if (!appState.decorateVisible) return;
        animationFrameId = requestAnimationFrame(loop);
        const frameTime = Math.min(time - lastTime, 250);
        lastTime = time;

        if (renderer) {
          // Render preview at the center of the 140x140 canvas
          const proxyState = new Proxy(petState, {
            get(target, prop) {
              if (prop === 'x') return 70;
              if (prop === 'y') return 80;
              if (prop === 'currentAction') return 'idle';
              if (prop === 'rotation') return 0;
              if (prop === 'stretch') return 1;
              if (prop === 'squash') return 1;
              if (prop === 'vx') return 0;
              if (prop === 'vy') return 0;
              return Reflect.get(target, prop);
            }
          });

          // Clear explicitly just in case
          const ctx = previewCanvas!.getContext('2d');
          if (ctx) ctx.clearRect(0, 0, 140, 140);
          
          renderer.render(proxyState, appState, frameTime, true);
        }
      }
      animationFrameId = requestAnimationFrame(loop);
      return () => cancelAnimationFrame(animationFrameId);
    }
  });

  // ── Handlers ──────────────────────────────────────────────────────────────
  async function handleSelectHat(type: typeof petState.hatType) {
    petState.hatType = type; await saveDecorations();
  }
  async function handleSelectGlasses(type: typeof petState.glassesType) {
    petState.glassesType = type; await saveDecorations();
  }
  async function handleSelectCollar(type: typeof petState.clothesType) {
    petState.clothesType = type; await saveDecorations();
  }
  async function handleSelectColor(theme: typeof petState.colorTheme) {
    petState.colorTheme = theme; await saveDecorations();
  }
  async function handleSelectPattern(pat: typeof petState.shellPattern) {
    petState.shellPattern = pat; await saveDecorations();
  }
  async function handleSelectFeet(style: typeof petState.feetStyle) {
    petState.feetStyle = style; await saveDecorations();
  }
  async function handleSelectEyes(style: typeof petState.eyeStyle) {
    petState.eyeStyle = style; await saveDecorations();
  }
  async function handleSelectHead(style: typeof petState.headStyle) {
    petState.headStyle = style; await saveDecorations();
  }
  async function handleSelectTail(style: typeof petState.tailStyle) {
    petState.tailStyle = style; await saveDecorations();
  }

  async function saveDecorations() {
    try {
      const data = {
        hatType: petState.hatType,
        glassesType: petState.glassesType,
        clothesType: petState.clothesType,
        colorTheme: petState.colorTheme,
        shellPattern: petState.shellPattern,
        feetStyle: petState.feetStyle,
        headStyle: petState.headStyle,
        eyeStyle: petState.eyeStyle,
        tailStyle: petState.tailStyle,
      };
      await invoke('db_set_kv', { key: 'decorations', value: JSON.stringify(data) });
      jsLog(`[DecorateHUD] Saved: ${JSON.stringify(data)}`);
    } catch (err) {
      jsLog(`[DecorateHUD] Error: ${err}`);
    }
  }

  function handleClose() {
    appState.decorateVisible = false;
    petState.currentAction = 'stats_dialog_exit';
    petState.actionTimer = 0;
  }

  // ── Item lists ────────────────────────────────────────────────────────────
  const hats = [
    { id: 'none',   label: 'None',   icon: '❌' },
    { id: 'coder',  label: 'Coder',  icon: '💻' },
    { id: 'wizard', label: 'Wizard', icon: '🧙' },
    { id: 'straw',  label: 'Luffy',  icon: '👒' },
    { id: 'crown',  label: 'Crown',  icon: '👑' },
    { id: 'party',  label: 'Party',  icon: '🎉' },
    { id: 'chef',   label: 'Chef',   icon: '🍳' },
  ] as const;

  const glasses = [
    { id: 'none',        label: 'None',    icon: '❌' },
    { id: 'reading',     label: 'Reading', icon: '👓' },
    { id: 'sunglasses',  label: 'Cool',    icon: '🕶️' },
    { id: 'star',        label: 'Star',    icon: '⭐' },
  ] as const;

  const collars = [
    { id: 'none',    label: 'None',   icon: '❌' },
    { id: 'bowtie',  label: 'Bowtie', icon: '🎀' },
    { id: 'scarf',   label: 'Scarf',  icon: '🧣' },
    { id: 'ribbon',  label: 'Ribbon', icon: '🌸' },
  ] as const;

  const colors = [
    { id: 'default',    label: 'Minty',   icon: '🐢' },
    { id: 'strawberry', label: 'Berry',   icon: '🍓' },
    { id: 'ocean',      label: 'Ocean',   icon: '🌊' },
    { id: 'matcha',     label: 'Matcha',  icon: '🍵' },
    { id: 'galaxy',     label: 'Galaxy',  icon: '🌌' },
  ] as const;

  const patterns = [
    { id: 'classic',  label: 'Classic',   icon: '⬡' },
    { id: 'flowers',  label: 'Flowers',   icon: '🌸' },
    { id: 'stars',    label: 'Stars',     icon: '✨' },
    { id: 'hearts',   label: 'Hearts',    icon: '💖' },
    { id: 'bubbles',  label: 'Bubbles',   icon: '🫧' },
    { id: 'clouds',   label: 'Clouds',    icon: '☁️' },
    { id: 'diamonds', label: 'Diamonds',  icon: '💎' },
  ] as const;

  const feetOptions = [
    { id: 'classic', label: 'Classic', icon: '🐢' },
    { id: 'chubby',  label: 'Chubby',  icon: '🐾' },
    { id: 'flipper', label: 'Flipper', icon: '🏊' },
    { id: 'star',    label: 'Star',    icon: '⭐' },
    { id: 'sock',    label: 'Sock',    icon: '🧦' },
  ] as const;

  const eyeOptions = [
    { id: 'classic',  label: 'Classic',  icon: '👁️' },
    { id: 'button',   label: 'Button',   icon: '🔵' },
    { id: 'sparkle',  label: 'Sparkle',  icon: '✨' },
    { id: 'uwu',      label: 'UwU',      icon: '🥺' },
    { id: 'dot',      label: 'Dot',      icon: '⚫' },
  ] as const;

  const headOptions = [
    { id: 'classic', label: 'Classic', icon: '🐢' },
    { id: 'round',   label: 'Round',   icon: '🥚' },
    { id: 'chibi',   label: 'Chibi',   icon: '🍡' },
    { id: 'tiny',    label: 'Tiny',    icon: '🔹' },
  ] as const;

  const tailOptions = [
    { id: 'classic', label: 'Classic', icon: '〰️' },
    { id: 'curly',   label: 'Curly',   icon: '🌀' },
    { id: 'fluffy',  label: 'Fluffy',  icon: '☁️' },
    { id: 'leaf',    label: 'Leaf',    icon: '🍃' },
    { id: 'ribbon',  label: 'Ribbon',  icon: '🎀' },
  ] as const;

  // Tab groups
  const groups = [
    { label: 'Accessories', tabs: [
      { id: 'hat' as TabId,     icon: '🎩', label: 'Hat' },
      { id: 'glasses' as TabId, icon: '👓', label: 'Glasses' },
      { id: 'collar' as TabId,  icon: '👔', label: 'Collar' },
    ]},
    { label: 'Shell', tabs: [
      { id: 'color' as TabId,   icon: '🎨', label: 'Color' },
      { id: 'pattern' as TabId, icon: '🐚', label: 'Pattern' },
    ]},
    { label: 'Body Parts', tabs: [
      { id: 'feet' as TabId,  icon: '🐾', label: 'Feet' },
      { id: 'eyes' as TabId,  icon: '👁️', label: 'Eyes' },
      { id: 'head' as TabId,  icon: '🤍', label: 'Head' },
      { id: 'tail' as TabId,  icon: '🦎', label: 'Tail' },
    ]},
  ];
</script>

{#if appState.decorateVisible}
  <div class="decorate-dialog-overlay">
    <div class="decorate-dialog-card decorate-dialog-card--preview">

      <!-- Close Button -->
      <button class="decorate-close-btn" onclick={handleClose} aria-label="Close settings">×</button>

      <div class="decorate-layout">
        <!-- LEFT: Preview Pane -->
        <div class="decorate-preview-pane">
          <canvas bind:this={previewCanvas} width="140" height="140" class="preview-canvas"></canvas>
          <div class="preview-floor"></div>
        </div>

        <!-- RIGHT: Options Pane -->
        <div class="decorate-options-pane">
          <!-- Header -->
          <div class="decorate-card-header">
            <h3 class="decorate-title">Pet Salon 🎨</h3>
            <span class="decorate-subtitle">Style your cute turtle</span>
          </div>

          <!-- Grouped Tab Navigation -->
          <div class="decorate-tab-groups">
            {#each groups as group}
              <div class="decorate-tab-group">
                <span class="decorate-tab-group-label">{group.label}</span>
                <div class="decorate-tabs">
                  {#each group.tabs as tab}
                    <button
                      class="decorate-tab-btn"
                      class:active={activeTab === tab.id}
                      onclick={() => activeTab = tab.id}
                      title={tab.label}
                    >
                      {tab.icon}
                    </button>
                  {/each}
                </div>
              </div>
            {/each}
          </div>

          <!-- Tab Content -->
          <div class="decorate-content">
            {#if activeTab === 'hat'}
              <div class="decorate-grid">
                {#each hats as item}
                  <button class="decorate-slot" class:selected={petState.hatType === item.id}
                    onclick={() => handleSelectHat(item.id)}>
                    <div class="slot-icon">{item.icon}</div>
                    <div class="slot-label">{item.label}</div>
                  </button>
                {/each}
              </div>

            {:else if activeTab === 'glasses'}
              <div class="decorate-grid">
                {#each glasses as item}
                  <button class="decorate-slot" class:selected={petState.glassesType === item.id}
                    onclick={() => handleSelectGlasses(item.id)}>
                    <div class="slot-icon">{item.icon}</div>
                    <div class="slot-label">{item.label}</div>
                  </button>
                {/each}
              </div>

            {:else if activeTab === 'collar'}
              <div class="decorate-grid">
                {#each collars as item}
                  <button class="decorate-slot" class:selected={petState.clothesType === item.id}
                    onclick={() => handleSelectCollar(item.id)}>
                    <div class="slot-icon">{item.icon}</div>
                    <div class="slot-label">{item.label}</div>
                  </button>
                {/each}
              </div>

            {:else if activeTab === 'color'}
              <div class="decorate-grid">
                {#each colors as item}
                  <button class="decorate-slot" class:selected={petState.colorTheme === item.id}
                    onclick={() => handleSelectColor(item.id)}>
                    <div class="slot-icon">{item.icon}</div>
                    <div class="slot-label">{item.label}</div>
                  </button>
                {/each}
              </div>

            {:else if activeTab === 'pattern'}
              <div class="decorate-grid">
                {#each patterns as item}
                  <button class="decorate-slot" class:selected={petState.shellPattern === item.id}
                    onclick={() => handleSelectPattern(item.id)}>
                    <div class="slot-icon">{item.icon}</div>
                    <div class="slot-label">{item.label}</div>
                  </button>
                {/each}
              </div>

            {:else if activeTab === 'feet'}
              <div class="decorate-grid">
                {#each feetOptions as item}
                  <button class="decorate-slot" class:selected={petState.feetStyle === item.id}
                    onclick={() => handleSelectFeet(item.id)}>
                    <div class="slot-icon">{item.icon}</div>
                    <div class="slot-label">{item.label}</div>
                  </button>
                {/each}
              </div>

            {:else if activeTab === 'eyes'}
              <div class="decorate-grid">
                {#each eyeOptions as item}
                  <button class="decorate-slot" class:selected={petState.eyeStyle === item.id}
                    onclick={() => handleSelectEyes(item.id)}>
                    <div class="slot-icon">{item.icon}</div>
                    <div class="slot-label">{item.label}</div>
                  </button>
                {/each}
              </div>

            {:else if activeTab === 'head'}
              <div class="decorate-grid">
                {#each headOptions as item}
                  <button class="decorate-slot" class:selected={petState.headStyle === item.id}
                    onclick={() => handleSelectHead(item.id)}>
                    <div class="slot-icon">{item.icon}</div>
                    <div class="slot-label">{item.label}</div>
                  </button>
                {/each}
              </div>

            {:else if activeTab === 'tail'}
              <div class="decorate-grid">
                {#each tailOptions as item}
                  <button class="decorate-slot" class:selected={petState.tailStyle === item.id}
                    onclick={() => handleSelectTail(item.id)}>
                    <div class="slot-icon">{item.icon}</div>
                    <div class="slot-label">{item.label}</div>
                  </button>
                {/each}
              </div>
            {/if}
          </div>
        </div>
      </div>
    </div>
  </div>
{/if}
