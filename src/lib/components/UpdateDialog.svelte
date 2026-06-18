<script lang="ts">
  import { state, petState } from '../state.svelte';
  import { check } from '@tauri-apps/plugin-updater';
  import { writable } from 'svelte/store';
  import { relaunch } from '@tauri-apps/plugin-process';

  const isCheckingUpdate = writable<boolean>(false);
  const updateMessage = writable<string>('');
  const updateAvailable = writable<boolean>(false);
  const downloadProgress = writable<number>(0);
  const updateReady = writable<boolean>(false);
  let updateObj: any = null;

  function handleClose() {
    state.updateVisible = false;
    petState.currentAction = 'stats_dialog_exit';
    petState.actionTimer = 0;
  }

  async function checkForUpdates() {
    isCheckingUpdate.set(true);
    updateMessage.set("Checking for updates...");
    updateAvailable.set(false);
    updateReady.set(false);
    downloadProgress.set(0);
    try {
      updateObj = await check();
      if (updateObj) {
        updateMessage.set(`Found new version: ${updateObj.version}`);
        updateAvailable.set(true);
      } else {
        updateMessage.set('You are on the latest version.');
      }
    } catch (e: any) {
      console.error(e);
      updateMessage.set(`Error: ${e}`);
    } finally {
      isCheckingUpdate.set(false);
    }
  }

  async function installUpdate() {
    if (!updateObj) return;
    updateAvailable.set(false);
    let downloaded = 0;
    let contentLength = 0;
    
    try {
      await updateObj.downloadAndInstall((event: any) => {
        switch (event.event) {
          case 'Started':
            contentLength = event.data.contentLength ?? 0;
            updateMessage.set(`Downloading update: ${updateObj.version}...`);
            break;
          case 'Progress':
            downloaded += event.data.chunkLength;
            if (contentLength) {
              downloadProgress.set(Math.round((downloaded / contentLength) * 100));
              updateMessage.set(`Downloading: ${$downloadProgress}%`);
            }
            break;
          case 'Finished':
            updateMessage.set('Download finished. Ready to install.');
            break;
        }
      });
      updateReady.set(true);
      updateMessage.set('Update installed! Please restart the app.');
    } catch(e) {
      console.error(e);
      updateMessage.set('Failed to install update.');
    }
  }

  async function restartApp() {
    try {
      await relaunch();
    } catch(e) {
      console.error(e);
    }
  }

  // Auto check when opened
  $effect(() => {
    if (state.updateVisible) {
      checkForUpdates();
    }
  });

</script>

{#if state.updateVisible}
  <div class="stats-dialog-overlay" style="z-index: 100;">
    <div class="stats-dialog-card" style="max-width: 300px; text-align: center;">
      
      <!-- Close Button top right inside card -->
      <button class="stats-close-btn" onclick={handleClose} aria-label="Close dialog">×</button>

      <h3 style="margin-top: 0; margin-bottom: 15px; color: #a29bfe; font-size: 16px;">Software Update</h3>

      <div style="background: rgba(0,0,0,0.2); padding: 15px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.05); margin-bottom: 15px;">
        <div style="font-size: 24px; margin-bottom: 10px;">🚀</div>
        <div style="font-size: 13px; color: #dfe6e9; margin-bottom: 10px; min-height: 20px;">
          {$updateMessage}
        </div>

        {#if $downloadProgress > 0 && !$updateReady}
          <div class="stats-progress-track" style="height: 8px; background: rgba(0,0,0,0.3); border-radius: 4px; overflow: hidden; margin-top: 10px;">
            <div style="height: 100%; background: linear-gradient(90deg, #a29bfe, #6c5ce7); border-radius: 4px; width: {$downloadProgress}%; transition: width 0.2s;"></div>
          </div>
        {/if}
      </div>

      <div style="display: flex; gap: 10px; justify-content: center;">
        {#if $updateReady}
          <button 
            onclick={restartApp} 
            style="background: #55efc4; color: #2d3436; border: none; padding: 8px 16px; border-radius: 6px; font-weight: bold; cursor: pointer; transition: 0.2s; flex: 1;"
          >
            Restart Now
          </button>
        {:else if $updateAvailable}
          <button 
            onclick={installUpdate} 
            style="background: #0984e3; color: white; border: none; padding: 8px 16px; border-radius: 6px; font-weight: bold; cursor: pointer; transition: 0.2s; flex: 1;"
          >
            Download & Install
          </button>
        {:else}
          <button 
            onclick={checkForUpdates} 
            disabled={$isCheckingUpdate}
            style="background: rgba(255,255,255,0.1); color: white; border: 1px solid rgba(255,255,255,0.2); padding: 8px 16px; border-radius: 6px; cursor: {$isCheckingUpdate ? 'wait' : 'pointer'}; opacity: {$isCheckingUpdate ? 0.7 : 1}; transition: 0.2s; flex: 1;"
          >
            {$isCheckingUpdate ? 'Checking...' : 'Check Again'}
          </button>
        {/if}
      </div>

    </div>
  </div>
{/if}
