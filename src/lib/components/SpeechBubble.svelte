<script lang="ts">
  import { state, petState } from '../state.svelte';
</script>

{#if state.speechVisible || state.thinkingVisible}
  {@const isNearRight = petState.globalX > petState.monitorX + petState.screenW - 320}
  {@const isNearTop = petState.globalY < petState.monitorY - 80}
  <div
    class="absolute z-50 pointer-events-none select-none"
    style="
      left: {isNearRight ? '20px' : '220px'};
      top: {isNearTop ? '250px' : '30px'};
      max-width: 160px;
    "
  >
    <!-- Bubble body -->
    <div
      class="bg-white rounded-2xl px-3 py-2 border-[3px] border-slate-800 shadow-lg relative"
      style="filter: drop-shadow(1px 2px 4px rgba(0,0,0,0.4));"
    >
      {#if state.thinkingVisible}
        <div class="flex items-center space-x-1 py-1">
          <span class="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style="animation-delay:0s"></span>
          <span class="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style="animation-delay:0.15s"></span>
          <span class="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style="animation-delay:0.3s"></span>
        </div>
      {:else}
        <p class="text-[11px] font-bold text-slate-800 leading-snug break-words m-0">
          {state.speechText}
        </p>
      {/if}

      <!-- Triangle tail -->
      {#if isNearTop}
        <!-- Tail pointing UP -->
        {#if isNearRight}
          <!-- Tail pointing UP-RIGHT -->
          <div class="absolute -top-[13px] right-[18px] w-0 h-0"
            style="
              border-left: 10px solid transparent;
              border-right: 10px solid transparent;
              border-bottom: 13px solid #1e293b;
            ">
          </div>
          <div class="absolute -top-[9px] right-[19px] w-0 h-0"
            style="
              border-left: 9px solid transparent;
              border-right: 9px solid transparent;
              border-bottom: 11px solid white;
            ">
          </div>
        {:else}
          <!-- Tail pointing UP-LEFT -->
          <div class="absolute -top-[13px] left-[18px] w-0 h-0"
            style="
              border-left: 10px solid transparent;
              border-right: 10px solid transparent;
              border-bottom: 13px solid #1e293b;
            ">
          </div>
          <div class="absolute -top-[9px] left-[19px] w-0 h-0"
            style="
              border-left: 9px solid transparent;
              border-right: 9px solid transparent;
              border-bottom: 11px solid white;
            ">
          </div>
        {/if}
      {:else}
        <!-- Tail pointing DOWN -->
        {#if isNearRight}
          <!-- Tail pointing DOWN-RIGHT -->
          <div class="absolute -bottom-[13px] right-[18px] w-0 h-0"
            style="
              border-left: 10px solid transparent;
              border-right: 10px solid transparent;
              border-top: 13px solid #1e293b;
            ">
          </div>
          <div class="absolute -bottom-[9px] right-[19px] w-0 h-0"
            style="
              border-left: 9px solid transparent;
              border-right: 9px solid transparent;
              border-top: 11px solid white;
            ">
          </div>
        {:else}
          <!-- Tail pointing DOWN-LEFT -->
          <div class="absolute -bottom-[13px] left-[18px] w-0 h-0"
            style="
              border-left: 10px solid transparent;
              border-right: 10px solid transparent;
              border-top: 13px solid #1e293b;
            ">
          </div>
          <div class="absolute -bottom-[9px] left-[19px] w-0 h-0"
            style="
              border-left: 9px solid transparent;
              border-right: 9px solid transparent;
              border-top: 11px solid white;
            ">
          </div>
        {/if}
      {/if}
    </div>
  </div>
{/if}
