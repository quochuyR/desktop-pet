import { mount } from 'svelte';
import './app.css';
import './style.css';
import App from './App.svelte';
import { ENABLE_DEBUG_LOGS } from './lib/state.svelte';

if (!ENABLE_DEBUG_LOGS) {
  const noop = () => {};
  console.log = noop;
  console.info = noop;
  console.debug = noop;
}

const app = mount(App, {
  target: document.getElementById('app')!,
});

export default app;
