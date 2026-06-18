<script lang="ts">
  import { petState, state } from '../state.svelte';
  import { agentManager } from '../agent/agent_manager';

  function closeBreak() {
    agentManager.registerBreakFeedback(state.breakTimer <= 0);
    state.breakVisible = false;
    petState.currentAction = 'hourly_break_exit';
    petState.actionTimer = 0;
  }
</script>

{#if state.breakVisible}
  <div class="hourly-break-overlay">
    <!-- CRT scanlines layer -->
    <div class="scanlines-layer"></div>
    <div class="noise-layer"></div>

    <div class="break-card-game">
      <!-- Corner gem diamonds -->
      <div class="corner-gem tl">✦</div>
      <div class="corner-gem tr">✦</div>
      <div class="corner-gem bl">✦</div>
      <div class="corner-gem br">✦</div>

      <!-- Header bar -->
      <div class="game-header-bar">
        <span class="gbar-title">! BREAK TIME !</span>
        <div class="gbar-side"></div>
      </div>

      <!-- Portrait Row -->
      <div class="game-portrait-row">
        <!-- Portrait box -->
        <div class="game-portrait-box">
          <div class="portrait-scanline"></div>
          <span class="portrait-turtle-icon">🐢</span>
        </div>

        <!-- Character info -->
        <div class="game-char-info">
          <h3 class="char-name-game">{petState.career_name}</h3>
          <p class="char-level-game">LEVEL {petState.level}</p>

          <!-- HP Stat -->
          <div class="game-stat-line">
            <span class="gstat-label">HP</span>
            <div class="gstat-track">
              <div class="gstat-fill gstat-hp" style="width: {petState.hp}%"></div>
            </div>
            <span class="gstat-num">{Math.round(petState.hp)}</span>
          </div>

          <!-- EP Stat -->
          <div class="game-stat-line">
            <span class="gstat-label">EP</span>
            <div class="gstat-track">
              <div class="gstat-fill gstat-ep" style="width: {petState.energy}%"></div>
            </div>
            <span class="gstat-num">{Math.round(petState.energy)}</span>
          </div>
        </div>
      </div>

      <!-- Dialogue Box -->
      <div class="game-dialogue-box">
        <p class="game-dialogue-text">
          Hít thở sâu, uống nước, duỗi vai cổ nhé!
        </p>
        <span class="dialogue-cursor-arrow">▼</span>
      </div>

      <!-- Timer Section -->
      <div class="game-timer-section">
        <span class="timer-section-label">RESTING TIME</span>
        <div class="game-timer-track">
          <div class="game-timer-fill" style="width: {(state.breakTimer / 30) * 100}%">
            <div class="timer-fill-shine"></div>
          </div>
        </div>
      </div>

      <!-- Confirm Button -->
      <button class="game-confirm-btn" onclick={closeBreak}>
        <span class="confirm-cursor">&gt;</span>
        <span class="confirm-label">OK, TIẾP TỤC!</span>
        <div class="confirm-flash"></div>
      </button>
    </div>
  </div>
{/if}
