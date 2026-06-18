# Desktop Pet 🐢 (Rùa Dev)

![Version](https://img.shields.io/badge/version-0.1.6-blue)
![Tauri](https://img.shields.io/badge/Tauri-v2-orange)
![Svelte](https://img.shields.io/badge/Svelte-v5-ff3e00)
![Three.js](https://img.shields.io/badge/Three.js-v0.184.0-black)

A smart, autonomous desktop pet (Dev Turtle) designed to keep programmers company, remind them to take breaks, and react to their coding sessions. Built with modern web technologies and a powerful local AI architecture.

---

## 🌟 Features

* **Autonomous AI Brain**: Powered by a classic AI architecture entirely running locally (offline, no LLMs required).
  * **BDI (Belief-Desire-Intention)**: The turtle forms beliefs about your state (e.g., "User is frustrated") and chooses desires.
  * **Utility AI**: Dynamically scores goals (e.g., rest, comfort user, remind to break, explore) to choose the best action.
  * **GOAP (Goal-Oriented Action Planning)**: Uses A* pathfinding to plan sequences of actions to achieve its goals.
  * **Reinforcement Learning**: Uses Q-Learning to learn your habits and adapt its break reminders and interactions based on your feedback.
  * **SQLite Cognitive Memory**: Stores sessions, event logs, and adapts its personality (`friendly`, `helpful`, `funny`) based on interactions.
* **Physics & Interactions**: You can drag, throw, and click on the turtle. It reacts with physics-based movements (dangling, falling, bouncing) and expresses different moods.
* **Coding Companion**: Detects your active IDE/tools, tracks your coding streak, and celebrates successful builds or gets angry at errors.
* **Customization**: Decorate your turtle with hats, glasses, clothes, and different shell patterns.
* **Health Reminders**: Hourly break reminders (Break Time) to help you rest your eyes and stretch.
* **Multi-monitor Support**: seamlessly moves across your monitors and interacts with your desktop environment.

## 🛠 Tech Stack

* **Frontend**: [Svelte 5](https://svelte.dev/) + [Vite](https://vitejs.dev/) + [Tailwind CSS v4](https://tailwindcss.com/)
* **Backend & Windowing**: [Tauri v2](https://tauri.app/) (Rust)
* **Graphics & Physics**: Custom 2D/3D Canvas rendering ([Three.js](https://threejs.org/)) + Custom Physics Engine
* **Database**: SQLite (for Cognitive Memory)

## 📂 Project Structure

```text
├── src/                  # Svelte Frontend Source Code
│   ├── lib/
│   │   ├── agent/        # AI Brain (GOAP, Utility AI, Q-Learning)
│   │   ├── components/   # UI Components (HUDs, Overlays)
│   │   ├── physics.ts    # Custom physics engine
│   │   ├── turtle.ts     # Turtle rendering & animation logic
│   │   └── state.svelte.ts # Global state management
│   ├── App.svelte        # Main App entry point
│   └── main.ts
├── src-tauri/            # Tauri Backend (Rust code, configuration)
│   ├── tauri.conf.json   # Tauri application config
│   └── src/              # Rust source code
├── AI_AGENT_PLAN.md      # Detailed documentation of the AI Brain Architecture
├── tailwind.config.js    # Tailwind configuration
├── svelte.config.js      # Svelte configuration
└── vite.config.ts        # Vite bundler configuration
```

## 🚀 Getting Started

### Prerequisites

* [Node.js](https://nodejs.org/) (v18+)
* [Rust](https://www.rust-lang.org/) (latest stable)
* Tauri Prerequisites (e.g., Visual Studio C++ Build Tools on Windows)

### Installation

1. Install dependencies:
   ```bash
   npm install
   ```

2. Run the application in development mode:
   ```bash
   npm run dev
   # or
   npm run tauri dev
   ```

3. Build the application for production:
   ```bash
   npm run build
   # or
   npm run tauri build
   ```

## 🧠 AI Architecture Deep Dive

For a detailed explanation of the Dev Turtle's brain (Beliefs, GOAP, Utility AI, Memory, and RL), please read the [AI_AGENT_PLAN.md](./AI_AGENT_PLAN.md) document.

---

*Made for developers who need a little companion on their screens! 🐢💻*
