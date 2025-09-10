# Bean Engine - Agent Documentation

Use pnpm. Use Svelte 5 Runes.

## 1. Project Overview

Bean Engine is a web-based game development platform designed to bridge the gap between visual block-based programming (like Scratch) and professional 3D game engines. It's built with SvelteKit, Three.js (via Threlte), and TypeScript.

The core concept is a visual, drag-and-drop interface for building game logic, combined with a standard 3D editor layout (viewport, object hierarchy, properties panel).

## 2. Core Architecture

### Tech Stack

-   **Framework**: SvelteKit with Svelte 5
-   **3D Graphics**: Three.js via `@threlte/core` and `@threlte/extras`
-   **Physics**: Rapier (via `@dimforge/rapier3d-compat`)
-   **Styling**: TailwindCSS with a custom component library (`src/lib/components/ui`)
-   **Language**: TypeScript
-   **State Management**: Svelte Stores

### High-Level Systems

The engine is divided into several key systems:

-   **Data Model**: Defines the structure of all objects, assets, and materials.
-   **State Management**: Reactive stores that hold the application state (scene, assets, etc.).
-   **Game Runtime**: A GameObject-Component system that executes the game logic during "play mode".
-   **Visual Scripting**: The system for creating, compiling, and interpreting block-based code.
-   **Editor UI**: The Svelte-based user interface for interacting with the engine.

---

## 3. Data Model (`src/lib/types.ts`)

The entire scene is built upon a hierarchy of classes.

-   `BObject`: The base class for everything in the scene. Provides `id`, `name`, `type`, and parent/child relationships.
-   `BNode3D`: Extends `BObject`. Adds a 3D transform (`position`, `rotation`, `scale`). This is the base for all objects that exist in the 3D world.
-   `BPart`: Extends `BNode3D`. A renderable object with a mesh, material, and physical properties. Its mesh can be a primitive (`block`, `sphere`) or a custom model from the asset store.
-   `BCamera`: Extends `BNode3D`. Represents a camera in the scene.
-   `BLight`: Extends `BNode3D`. Represents a light source.
-   `BScript`: Extends `BObject`. A container for visual scripting blocks. It is parented to a `BNode3D` to attach logic to an object.
-   `BAsset`: Represents a file imported by the user (e.g., a `.gltf` model or `.png` texture). Managed by the `assetStore`.
-   `BMaterial`: Represents a material that can be applied to a `BPart`. Managed by the `materialStore`.

---

## 4. State Management (`src/lib/*Store.ts`)

The engine uses a consistent pattern for state management: a manager class containing the logic, wrapped in a Svelte writable store to provide reactivity to the UI.

-   **`sceneStore.ts`**: The most critical store. It manages the `BScene` object, which contains all `BObject`s.
    -   Handles object creation, deletion, and reparenting. Use the `createObject(type, parentId)` factory method.
    -   Manages global script variables.
    -   Manages the Rapier physics world. **Note**: Physics initialization is asynchronous. Use `sceneStore.waitForPhysicsInitialization()` before accessing the physics world.
    -   **Physics Cleanup**: The `resetPhysicsWorld()` method removes all physics bodies and colliders, called automatically by `GameObjectManager.destroy()` after individual component cleanup to prevent physics state accumulation and avoid double-removal errors.
-   **`assetStore.ts`**: Manages all `BAsset` instances. Handles file uploads and provides access to asset data and URLs.
-   **`materialStore.ts`**: Manages all `BMaterial` instances. Includes methods for creating and modifying materials.

---

## 5. Game Runtime Engine (`src/lib/runtime/`)

When the user enters "play mode", the scene is handed over to the runtime engine, which uses a **GameObject-Component** architecture. This is distinct from the editor's direct rendering.

-   **`GameRuntime.svelte`**: The Svelte component that hosts the play mode canvas and orchestrates the runtime.
-   **`GameObjectManager.ts`**: The core of the runtime.
    -   It initializes itself from the `sceneStore`, converting the `BObject` tree into a runtime-friendly `GameObject` tree.
    -   It runs the main game loop, calling `update()` on all `GameObject`s.
-   **`GameObject.ts`**: A wrapper around a `BNode3D` that holds a collection of `Component`s.
    -   **Rotation System**: Uses a dual-rotation approach - `BNode3D` objects use Euler angles for user-facing interfaces, while `GameObject.transform` uses quaternions for runtime to avoid gimbal lock and work better with physics.
    -   **`RotationUtils`**: Utility class providing conversion methods between Euler angles and quaternions.
    -   **Runtime Separation**: The runtime engine works on a snapshot of the scene taken when Play Mode starts. Changes made in the editor during runtime (e.g., moving objects) will NOT propagate to the live GameObjects; stop and restart Play Mode to see updated transforms.
    -   **Matrix Updates**: THREE.js meshes and lights require explicit matrix updates (`updateMatrix()` and `updateMatrixWorld(true)`) after position/rotation/scale changes to ensure visual rendering matches the transform data.
-   **`Component.ts`**: The abstract base class for all runtime logic.
-   **Core Components**:
    -   `VisualComponent.ts`: Creates and manages the `THREE.Mesh` or `THREE.Light` for a `GameObject`. Uses quaternions for mesh rotation. Creates unit-sized geometries and applies scaling via mesh.scale to avoid double scaling.
    -   `PhysicsComponent.ts`: Manages the `RAPIER.RigidBody` for a `GameObject`, syncing the physics simulation with the object's quaternion-based transform. **Important**: RAPIER's `ColliderDesc.cuboid()` expects half-extents, so scale values are divided by 2. Safely cleans up physics bodies and colliders when destroyed, checking handle validity to prevent double-removal errors.
    -   `ScriptComponent.ts`: Attaches a `BScript` to a `GameObject` and uses the `CodeInterpreter` to execute its logic.

---

## 6. Visual Scripting System

The visual scripting system has three main parts: configuration, compilation, and execution.

-   **Configuration**:
    -   `src/lib/blockConfig.ts`: Defines "Blocks," which are action-oriented statements (e.g., `move`, `if`, `wait`). It specifies their color, label, and input fields.
    -   `src/lib/chipConfig.ts`: Defines "Chips," which are value-producing expressions that can be plugged into Block fields (e.g., `variable`, `vector3`). Chips have an `evaluate` function that resolves their value at runtime.
-   **Compilation (`src/lib/compiler.ts`)**:
    -   The `compileScript` function takes the nested, UI-heavy structure from the `CodeEditor` and flattens it into a simple, executable array of objects. This strips away UI-specific data like node positions.
-   **Execution (`src/lib/interpreter.ts`)**:
    -   The `CodeInterpreter` class takes the compiled script array.
    -   It executes each item in the script, using a `RuntimeContext` to access variables and evaluate any input Chips recursively.
    -   The interpreter is instantiated and run by the `ScriptComponent` in the runtime engine.

---

## 7. Editor UI

The editor is built with Svelte components, orchestrated by `src/routes/editor/+page.svelte`.

-   **Layout**: The main layout is a `ResizablePaneGroup` containing the key panels.
-   **Key Panels**:
    -   `ObjectExplorer.svelte`: Displays the scene hierarchy from `sceneStore`. Handles object selection, creation (via a popover), and drag-and-drop reparenting.
    -   `PropertiesPanel.svelte`: Displays and allows editing of the properties of the currently `selectedObject`. It reactively shows different fields based on the object's type (`BPart`, `BNode3D`, etc.).
    -   `ViewportScene.svelte`: The 3D view for editing. It uses Threlte to render objects from `sceneStore` and provides `OrbitControls` for camera movement and `TransformControls` for manipulating objects.
    -   `CodeEditor.svelte`: The visual scripting canvas. It manages the block/chip palettes, the script graph itself, and the list of variables.
    -   `AssetBrowser.svelte` & `MaterialBrowser.svelte`: Grid-based UIs for viewing and managing assets and materials from their respective stores.
-   **UI Library**: The project uses a custom, consistent set of UI components found in `src/lib/components/ui/`. These are based on `bits-ui` and `tailwind-variants`. When adding new UI, prefer using or extending these components.

---

## 8. Development Guidelines

### Adding a New Object Type

1.  **Define Class**: Create a new class that extends `BNode3D` or another appropriate class in `src/lib/types.ts`.
2.  **Update Factory**: Add a case for your new type in the `createObject` method in `src/lib/sceneStore.ts`.
3.  **Add Icon**: Add an icon for the new type in `getObjectIcon()` in `src/lib/components/ObjectExplorer.svelte`.
4.  **Add to "Add" Menu**: Add the type to the `Command` component in `ObjectExplorer.svelte` so it can be created from the UI.
5.  **Add Properties UI**: Add a new section to `src/lib/components/PropertiesPanel.svelte` that displays when your new object type is selected.
6.  **Add Runtime Visuals**: Add a case for your new type in `createVisualRepresentation()` in `src/lib/runtime/VisualComponent.ts` to define how it looks in play mode.

### Adding a New Visual Scripting Block

1.  **Define Config**: Add a new entry to the `blockConfig` object in `src/lib/blockConfig.ts`. Define its color, label, and input fields.
2.  **Implement Logic**: Add a case for your new block's `type` in the `executeItem` method in `src/lib/interpreter.ts`. Use `context.evaluateChip()` to get the values from any input fields.
