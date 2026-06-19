# Rùa Dev AI Agent - Rules & Architecture

> [!IMPORTANT]
> **Toàn bộ cấu trúc thư mục và kiến trúc hệ thống tổng quan của dự án Desktop Pet đã được sơ đồ hóa.** 
> 👉 Xem tại: [AI_ARCHITECTURE_GUIDE.md](file:///c:/ProgramLibrary/desktop/desktop-pet/AI_ARCHITECTURE_GUIDE.md)

This document contains critical architectural rules for the Desktop Pet's AI system (AgentManager, GOAP Planner, WorldModel). **Any AI agent working on this project MUST read and strictly adhere to these rules.**

## 1. Clock Scheduler vs AI Planner Priority

**Rule: Time-based reminders (Clock Scheduler) have ABSOLUTE HIGHEST PRIORITY and must pause all other AI decision-making.**

### Background
The pet needs to remind the user to take a break at `HH:00` and stretch at `HH:30`. Because the AI's `tick()` function runs every 5 seconds, if the GOAP planner is allowed to run immediately after a reminder is triggered, it will overwrite the reminder's action (e.g., speech bubbles) with a new planned action (e.g., wandering).

### Implementation Requirements
To prevent reminders from being overwritten or ignored, the following logic MUST be maintained in `src/lib/agent/agent_manager.ts` and related files:

1. **Top-Level Priority:**
   The "Direct Clock Scheduler Triggers" block MUST be placed at the very top of the `tick()` function, **before** any early returns for `isPhysicalState`, `breakVisible`, or other UI elements.
   *Reason:* If the user is dragging the pet (`dangling`) exactly when the hour changes, returning early would cause the `transitionTriggered` flag to be lost in the next tick, breaking the reminder entirely.

2. **Pause GOAP Planner During Reminders:**
   When a reminder is active, the GOAP planner MUST NOT run. 
   - `ActionHourlyBreak` sets `state.breakVisible = true`. The `tick()` function must return early if `state.breakVisible` is true.
   - `ActionStretchRemind` MUST set `petState.currentAction = 'stretch_remind'`. The `tick()` function must include `petState.currentAction === 'stretch_remind'` in its `isPhysicalState` early return check to pause behavior planning.
   - `ActionCelebrateFireworks` also pauses planning.

3. **Timeout Clearing for Stretch Remind:**
   `ActionStretchRemind` must hold the `stretch_remind` state for a sufficient duration (e.g., 8 seconds) so the user can read the speech bubble. After the `speechTimeout` fires, it must cleanly revert `petState.currentAction` to `'idle'` so the GOAP planner can resume.

**DO NOT** modify this prioritization logic. **DO NOT** move the clock scheduler triggers below the physical state checks. **DO NOT** change `ActionStretchRemind` to use `'idle'` state while the speech bubble is still showing.

## 2. Reusable Code & Utilities

When creating new features or behaviors (such as new actions in `src/lib/agent/actions.ts`), **always reuse the following helper functions** instead of writing boilerplate code:

### `GlobalState.showSpeech`
Located in `src/lib/state.svelte.ts`. Use this to display speech bubbles with automatic timeout clearing.
```typescript
// Signature
showSpeech(text: string, durationMs: number = 3000, onComplete?: () => void)

// Example Usage
state.showSpeech('Xin chào bạn!', 4000);
```

### `PetState.setAction`
Located in `src/lib/state.svelte.ts`. Use this to set the pet's core physical state atomically.
```typescript
// Signature
setAction(action: string, mood: string, vx: number = 0, vy: number = 0)

// Example Usage
petState.setAction('wander', 'walking', 1.5, 0);
```

### `Vector` Math Utilities
Use `Vector.add`, `Vector.sub`, `Vector.distance`, etc. in `src/lib/utils.ts` for any 2D math, rather than re-implementing Pythagoras or inline math.

### `hexToRgba`
Located in `src/lib/utils.ts`. Use this whenever you need to add opacity to a hex color from the renderer's palette.
```typescript
// Signature
function hexToRgba(hex: string, alpha: number): string

// Example Usage
const colorWithOpacity = hexToRgba('#2eb886', 0.55); // "rgba(46,184,134,0.55)"
```

Using these utilities keeps the codebase clean, minimizes repetitive code, and standardizes behavior.

## 3. Strict Testing & Verification (TDD Mandate)

**Rule: Any modification to core game logic, AI state machine, or backend commands MUST be covered by automated tests and MUST pass all existing tests.**

### Requirements for AI Agents
1. **Run Tests First:** Before modifying any logic, run `npm run test` (Frontend) and `cargo test` (Backend) to ensure the baseline is stable.
2. **Write Tests for New Features:** If you add a new utility function, a new GOAP Action, or a new Tauri Command, you MUST write corresponding Unit Tests for it.
3. **Do NOT Ignore Test Failures:** If your changes cause an existing test to fail, you must analyze why. If your change is correct, update the test. If your change broke existing behavior, **revert or fix your code**. Do not bypass or comment out failing tests.
4. **Svelte Check & Cargo Check:** No PR or final commit is allowed if `npx svelte-check` or `cargo check` throws errors. Zero warnings/errors is the standard.

## 4. Git Branching Strategy (No Main Commits)

**Rule: AI Agents MUST NEVER push or commit directly to the `main` branch when creating new features or modifying architecture.**

1. **Create Branches:** Always create and switch to a new branch for any non-trivial change. Prefix your branch with `feature/`, `fix/`, or `refactor/` (e.g. `git checkout -b feature/new-pet-action`).
2. **Review via Pull Request:** Once your work is fully tested and verified locally, commit it to your branch. You must then wait for Human review (simulated via Pull Request or direct diff review) before it can be merged into `main`.
