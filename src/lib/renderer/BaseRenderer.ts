import type { TurtleRenderer } from './TurtleRenderer';
import type { PetState, GlobalState } from '../state.svelte';

export class BaseRenderer {
  constructor(protected parent: TurtleRenderer) {}

  protected get ctx() {
    return this.parent.ctx;
  }

  protected get colors() {
    return this.parent.colors;
  }

  protected get time() {
    return this.parent.time;
  }
}
