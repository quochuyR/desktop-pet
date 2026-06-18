import type { AgentAction } from './actions';

interface PlannerNode {
  state: Record<string, any>;
  parent: PlannerNode | null;
  action: AgentAction | null;
  g: number; // path cost
  h: number; // heuristic (unsatisfied conditions count)
  f: number; // g + h
}

export class GoapPlanner {
  /**
   * Plans a sequence of actions from a start state to a goal state.
   */
  plan(
    startState: Record<string, any>,
    goalState: Record<string, any>,
    availableActions: AgentAction[]
  ): AgentAction[] | null {
    const openSet: PlannerNode[] = [];
    const closedSet: string[] = [];

    // Initialize root node
    const root: PlannerNode = {
      state: { ...startState },
      parent: null,
      action: null,
      g: 0,
      h: this.calculateHeuristic(startState, goalState),
      f: 0,
    };
    root.f = root.g + root.h;
    openSet.push(root);

    let iterations = 0;
    const MAX_ITERATIONS = 1000;

    while (openSet.length > 0) {
      iterations++;
      if (iterations > MAX_ITERATIONS) {
        console.warn('GOAP Planner: Max iterations reached, pathfinding failed.');
        return null;
      }

      // Find node with lowest F score
      openSet.sort((a, b) => a.f - b.f);
      const current = openSet.shift()!;

      // Check if goal conditions are met
      if (this.meetsConditions(current.state, goalState)) {
        return this.reconstructPath(current);
      }

      // Add to closed set
      const stateKey = JSON.stringify(current.state);
      closedSet.push(stateKey);

      // Explore neighbors (available actions)
      for (const action of availableActions) {
        if (this.meetsConditions(current.state, action.preconditions)) {
          const nextState = this.applyEffects(current.state, action.effects);
          const nextStateKey = JSON.stringify(nextState);

          if (closedSet.includes(nextStateKey)) continue;

          const gCost = current.g + action.getCost();
          const hCost = this.calculateHeuristic(nextState, goalState);
          const fCost = gCost + hCost;

          // Check if this state is already in open set with a lower cost
          const existingNode = openSet.find(n => JSON.stringify(n.state) === nextStateKey);
          if (existingNode && existingNode.g <= gCost) continue;

          if (existingNode) {
            existingNode.g = gCost;
            existingNode.f = fCost;
            existingNode.parent = current;
            existingNode.action = action;
          } else {
            openSet.push({
              state: nextState,
              parent: current,
              action: action,
              g: gCost,
              h: hCost,
              f: fCost,
            });
          }
        }
      }
    }

    return null; // No plan found
  }

  private meetsConditions(state: Record<string, any>, conditions: Record<string, any>): boolean {
    for (const key in conditions) {
      if (state[key] !== conditions[key]) {
        return false;
      }
    }
    return true;
  }

  private applyEffects(state: Record<string, any>, effects: Record<string, any>): Record<string, any> {
    const nextState = { ...state };
    for (const key in effects) {
      nextState[key] = effects[key];
    }
    return nextState;
  }

  private calculateHeuristic(state: Record<string, any>, goal: Record<string, any>): number {
    let unsatisfied = 0;
    for (const key in goal) {
      if (state[key] !== goal[key]) {
        unsatisfied++;
      }
    }
    return unsatisfied;
  }

  private reconstructPath(node: PlannerNode): AgentAction[] {
    const path: AgentAction[] = [];
    let curr: PlannerNode | null = node;
    while (curr && curr.action) {
      path.unshift(curr.action);
      curr = curr.parent;
    }
    return path;
  }
}
