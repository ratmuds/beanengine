# beanengine

A web-based 3D game development platform designed to bridge the gap between visual block programming (Scratch) and professional game engines.

<img width="1919" height="1029" alt="Screenshot 2025-10-04 142824" src="https://github.com/user-attachments/assets/38c5cb6c-bbf1-4280-8669-4fe12e36259f" />

## What is bean engine?

bean engine is a proof-of-concept game development environment that combines visual scripting with a fully-featured 3D editor. It provides an accessible introduction to game development concepts while using real game engine architecture.

The platform runs entirely in the browser and uses a custom-built visual scripting language, Three.js for 3D rendering, and Rapier for physics simulation.

## Why?

Educational game development tools often sacrifice power for simplicity. bean engine attempts to solve this by:

-   **Custom Visual Scripting**: A from-scratch block-based programming language that feels familiar to Scratch users but compiles to real game logic
-   **Professional Architecture**: Uses actual game engine patterns (GameObject-Component system, scene graphs, physics integration)
-   **Simplified Interface**: Cleaner, more focused UI compared to engines like Unity or Unreal, while maintaining professional workflows
-   **No Installation**: Runs entirely in the browser with cloud project storage

The goal is to provide a stepping stone for learners who have outgrown Scratch but find Unity or Unreal overwhelming.

## Status: Proof of Concept

This is a demonstration project, not production software. It works and showcases the core concepts, but is not intended for actual game development.

## Features

### Visual Scripting System

-   Custom block-based programming language
-   Event-driven logic (object lifecycle, input, collisions)
-   Variable scoping (global and script-local)
-   Chip system for value expressions and calculations
-   Code compilation and runtime interpretation

### 3D Scene Editor

-   Real-time 3D viewport using Three.js
-   Transform controls (move, rotate, scale)
-   Object hierarchy with parent-child relationships

### Asset Management

-   GLTF 3D model importing
-   Texture uploading and management
-   Custom material creation and editing

### Physics System

-   Rapier physics engine integration
-   Rigid body dynamics
-   Collision detection and events
-   Constraints and joints between objects
-   Axis locking for constrained movement

### UI System

-   Built-in UI elements (containers, text, buttons)
-   Percentage-based positioning and sizing

### Player Controller

-   First-person character controller
-   Mouse look with configurable sensitivity
-   WASD movement

### Navigation System

-   Waypoint paths for object movement
-   Navigator component for automated pathing
-   Configurable speed and looping

### AI Assistant

-   Integrated AI agent for object creation and modification
-   Natural language commands for scene editing
-   Tool-based function calling system

### Project Management

-   User authentication
-   Cloud project saving and loading
-   Scene serialization and deserialization

## Technology Stack

-   **Framework**: SvelteKit with Svelte 5 Runes
-   **3D Graphics**: Three.js via @threlte/core
-   **Physics**: Rapier (@dimforge/rapier3d-compat)
-   **UI Components**: Custom component library with bits-ui and Tailwind CSS
-   **Backend**: Supabase (auth, database, storage)
-   **Language**: TypeScript

## Architecture

The engine separates editor data (BObject tree) from runtime execution (GameObject-Component system). The editor manipulates data models stored in Svelte stores, while play mode instantiates a parallel runtime system that executes the game logic.

Key systems:

-   **Data Model** (`types.ts`): BObject hierarchy representing scene structure
-   **State Management**: Svelte stores for scene, assets, materials, runtime state
-   **Game Runtime** (`runtime/`): Component-based execution system
-   **Visual Scripting** (`blockConfig.ts`, `interpreter.ts`): Block definitions and code execution
-   **Editor UI** (`components/editor/`): Svelte components for the interface

See `AGENTS.md` for detailed architecture documentation.

## Getting Started

```bash
# Install dependencies
pnpm install

# Run development server
pnpm dev

# Build for production
pnpm build
```

Create a new Supabase DB, and run the SQL commands in `supabase.sql` to setup the database. Then copy the DB URL and anon key.

Copy the `.env.example` to `.env` and add the Supabase values, and an OpenAI key if you want to use the agent.

Open http://localhost:5173 to access the editor.

## Project Structure

```
src/lib/
├── types.ts              # Core data model (BObject hierarchy)
├── sceneStore.ts         # Scene state management
├── runtimeStore.ts       # Runtime state and event bus
├── blockConfig.ts        # Visual script block definitions
├── interpreter.ts        # Script execution engine
├── components/
│   ├── editor/           # Editor panels (viewport, properties, etc.)
│   ├── code/             # Visual scripting UI
│   └── ui/               # Shared UI components
└── runtime/
    ├── GameObject.ts     # Runtime entity wrapper
    ├── GameObjectManager.ts  # Runtime lifecycle management
    └── *Component.ts     # Runtime component implementations
```

## License

This project is open source for educational and reference purposes.
