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
-   **Styling**: TailwindCSS with a custom component library (`src/lib/components/ui`) based on `bits-ui` and `tailwind-variants`.
-   **Language**: TypeScript
-   **State Management**: Svelte Stores

### High-Level Systems

The engine is divided into several key systems:

-   **Data Model**: Defines the structure of all objects, assets, and materials in the editor.
-   **State Management**: Reactive stores that hold the application state (scene, assets, runtime state, etc.).
-   **Game Runtime**: A GameObject-Component system that executes the game logic during "play mode". This is separate from the editor's data model.
-   **Visual Scripting**: The system for creating, compiling, and interpreting block-based code.
-   **Editor UI**: The Svelte-based user interface for interacting with the engine.

---

## 3. Data Model (`src/lib/types.ts`)

The data model, defined primarily in `src/lib/types.ts`, represents the **source of truth for the editor and for project serialization**. These classes (`BObject`, `BNode3D`, `BPart`, etc.) are essentially structured data containers. They hold the properties you see and edit in the Properties Panel.

**Key Concepts:**

-   **Editor-Centric:** These objects are what the editor UI directly manipulates. When you change an object's name in the Object Explorer or its position in the Properties Panel, you are modifying a `BObject` instance within the `sceneStore`.
-   **Serialization:** When you save a project, it's this tree of `BObject`s that gets serialized to JSON.
-   **NOT Live Game Objects:** These objects are **not** the live entities in the running game. They do not have `update` loops and do not directly interact with the physics or rendering engines. They are the blueprint from which the live game is built.

The class hierarchy is as follows:

-   `BObject`: The base class for everything. Provides `id`, `name`, `type`, and parent/child relationships.
-   `BNode3D`: Extends `BObject`. Adds a 3D transform (`position`, `rotation`, `scale` as `BVector3`). This is the base for all objects that exist in the 3D world.
-   `BPart`: Extends `BNode3D`. A renderable object with a mesh, material, and physical properties. Its mesh can be a primitive (`block`, `sphere`) or a custom model from the asset store.
-   `BPlayerController`: Extends `BPart`. A specialized part that handles player input for movement and camera control. Contains settings for movement speed, mouse sensitivity, and camera clamp angles.
-   `BCamera`: Extends `BNode3D`. Represents a camera in the scene. Has properties like `fieldOfView`, `projectionType` ('perspective' or 'orthographic'), and `isActive`.
-   `BLight`: Extends `BNode3D`. Represents a light source with `color` and `intensity`.
-   `BScript`: Extends `BObject`. A container for visual scripting blocks and triggers. It is parented to a `BNode3D` to attach logic to an object.
-   `BStorage`: Extends `BObject`. A folder-like container for organizing objects. Objects inside `BStorage` are not processed by the runtime system (no visuals, physics, or scripts are run).
-   `BUIStorage`: Extends `BObject`. A special storage container for UI elements. All UI elements must be descendants of a `BUIStorage` to be rendered.
-   `BValue`: Extends `BObject`. A simple container for a single value, which can be accessed and modified by scripts.
-   `BConstraint`: Extends `BObject`. Defines a physics joint between two `BPart` instances (`partA`, `partB`).
-   **Waypoint System**:
    -   `BWaypointPath`: Extends `BObject`. A container for a sequence of waypoints.
    -   `BWaypoint`: Extends `BNode3D`. A single point in a `BWaypointPath`. Its world position is used by the navigator.
    -   `BWaypointNavigator`: Extends `BObject`. When attached to a `BPart`, it moves the part along a specified `BWaypointPath`. Properties include `speed`, `loop`, and `waitTime`.
-   **UI System (`BUI`)**:
    -   `BUI`: Base class for all UI elements. Manages layout (`autoLayout`, `positionPercent`, `positionOffset`, `sizePercent`, `sizeOffset`, anchors), styling (`rotation`, `visible`, `zIndex`, `padding`, `margin`), and transitions.
    -   `BContainerUI`: Extends `BUI`. A container for other UI elements. Adds properties for `backgroundColor`, `borderColor`, `borderSize`, `borderRadius`, and `scroll`.
    -   `BTextUI`: Extends `BContainerUI`. Displays text with properties for `text`, `fontSize`, `fontFamily`, `fontWeight`, `color`, `textAlign`, `textVerticalAlign`, and `overflow`.
    -   `BButtonUI`: Extends `BTextUI`. An interactive button with `hoverColor` and `pressedColor` properties.
-   **Asset & Material System**:
    -   `BAsset`: Represents a user-imported file (e.g., `.gltf` model, `.png` texture). Managed by `assetStore`.
    -   `BMaterial`: Represents a material that can be applied to a `BPart`. Managed by `materialStore`.
    -   `BParticle`: Represents a particle system with properties for lifetime, speed, color, size, etc. Managed by `particleStore`.

---

## 4. State Management (`src/lib/*Store.ts`)

The engine uses Svelte stores to manage global state reactively.

### Data Stores

-   **`sceneStore.ts`**: The most critical store. It manages the `BScene` object, which contains all `BObject`s.
    -   Handles object creation (`createObject`), deletion, and reparenting.
    -   Manages scene serialization (`serialize`) and deserialization (`deserialize`) for project saving/loading.
    -   Manages the Rapier physics world. **Note**: Physics initialization is asynchronous. Use `sceneStore.waitForPhysicsInitialization()` before accessing the physics world.
-   **`assetStore.ts`**: Manages all `BAsset` instances. Handles file uploads to Supabase Storage and provides local object URLs.
-   **`materialStore.ts`**: Manages all `BMaterial` instances. Includes methods for creating and modifying materials and loading their `THREE.Material` representations.
-   **`particleStore.ts`**: Manages all `BParticle` instances.
-   **`projectStore.ts`**: Manages loading, creating, and saving projects to Supabase, using `sceneStore.serialize()` and `deserialize()`.
-   **`authStore.ts`**: Manages user authentication via Supabase Auth.

### Runtime Store

-   **`runtimeStore.ts`**: A central hub for all **runtime-only** state. This store is crucial for communication between different runtime components and scripts.
    -   **Logging**: Collects logs (`info`, `warn`, `error`) from the runtime for display in the DevTools panel.
    -   **Input State**: Tracks mouse buttons, keyboard keys, mouse position, and mouse delta. Manages pointer lock state (`captureMouse`, `isMouseCaptured`).
    -   **Event Bus**: A simple event bus (`on`, `off`, `emit`) for runtime events like `update`, `keydown`, `collisionenter`, etc.
    -   **Property Overrides**: Allows scripts to override properties of `BObject`s at runtime without mutating the original editor objects (e.g., changing a light's color). Components should use `runtimeStore.getPropertyOverride()` before accessing a `BObject` property.
    -   **Variable Management**: Manages global and script-local variables for visual scripting.
    -   **GameObject Management**: Holds a reference to the active `GameObjectManager`.
    -   **Physics Mappings**: Maps Rapier physics body/collider handles back to `GameObject` IDs for collision events.

---

## 5. Game Runtime Engine (`src/lib/runtime/`)

The runtime engine is what brings the game to life. It operates on a completely separate set of objects (`GameObject`s) that are generated from the editor's `BObject` blueprints. This separation is a core architectural concept.

### The Editor vs. Runtime Lifecycle (BObject vs. GameObject)

Understanding this flow is critical for working on the engine:

1.  **In the Editor:** The user interacts with `BObject`s (and its subclasses like `BPart`). All these objects are stored in the `sceneStore`. They are simple data containers.

2.  **Entering Play Mode:** When the user clicks "Play", the `GameRuntime.svelte` component is mounted. It immediately calls `GameObjectManager.initializeFromScene()`.

3.  **The "Great Conversion":** `initializeFromScene` walks the entire `BObject` tree from `sceneStore`. For each `BObject`, it creates a corresponding `GameObject`. This `GameObject` is the **live, runtime entity**.

4.  **GameObject & Components:**

    -   The new `GameObject` is given a runtime transform (using `THREE.Quaternion` for robust rotation).
    -   The `GameObjectManager` then attaches `Component` instances to the `GameObject` based on the original `BObject`'s type. A `BPart` gets a `VisualComponent` and a `PhysicsComponent`. A `BCamera` gets a `CameraComponent`. A `BScript`'s parent `GameObject` gets a `ScriptComponent`.
    -   These **Components are what do the work**. `PhysicsComponent` creates a Rapier rigid body. `VisualComponent` creates a THREE.js mesh. `ScriptComponent` runs the code interpreter.

5.  **During Play Mode:**

    -   The game loop, managed by `GameObjectManager`, calls `update()` on every `GameObject`, which in turn calls `update()` on all its active `Component`s.
    -   Scripts and Components interact with the `GameObject` and its sibling Components (e.g., a `PlayerControllerComponent` gets the `PhysicsComponent` on the same `GameObject` to apply forces).
    -   **State is separate:** Changes made in the editor during play mode **do not** affect the live `GameObject`s. The runtime is a separate world. Likewise, changes made by physics or scripts to a `GameObject`'s position do not write back to the original `BObject` until play mode is stopped (and even then, this is not currently implemented).

6.  **Exiting Play Mode:** The `GameRuntime.svelte` component is unmounted. Its `onDestroy` lifecycle calls `gameObjectManager.destroy()`. This function iterates through all `GameObject`s, calling `destroy()` on each one, which in turn destroys all its `Component`s (removing meshes from the scene, bodies from the physics world, etc.). The original `BObject` tree in `sceneStore` is left untouched, ready for more editing.

This one-way data flow from Editor (`BObject`) to Runtime (`GameObject`) is key to keeping the editor stable and the runtime performant.

-   **`GameObjectManager.ts`**: The core of the runtime.
    -   `initializeFromScene()`: Traverses the `sceneStore`'s `BObject` tree and creates a parallel tree of `GameObject`s.
    -   Adds the appropriate `Component`s to each `GameObject` based on its `BObject` type.
    -   Runs the main game loop, calling `update()` on all `GameObject`s.
    -   Handles dynamic object creation (`addGameObject`) and destruction (`removeGameObject`) during play mode, as triggered by scripts.
-   **`GameObject.ts`**: A wrapper around a `BObject` that holds a collection of `Component`s.
    -   **BObject vs. GameObject**: `BObject` is the editor data model. `GameObject` is the live, in-game entity. Scripts and runtime components should **only** interact with `GameObject`s.
    -   **Transform**: `GameObject.transform` uses a `THREE.Quaternion` for rotation, while `BNode3D.rotation` uses a `BVector3` (Euler angles). This avoids gimbal lock during runtime. `RotationUtils` provides conversion helpers.
    -   **Hierarchy**: Manages a runtime parent/child hierarchy separate from the editor's.
-   **`Component.ts`**: The abstract base class for all runtime logic.

### Core Components

-   `VisualComponent.ts`: Creates and manages the `THREE.Mesh` or `THREE.Light` for a `GameObject`. It does **not** create cameras; it only creates a wireframe helper for `BCamera` objects in the editor.
-   `PhysicsComponent.ts`: Manages the `RAPIER.RigidBody`.
    -   It syncs the `GameObject`'s transform from the physics simulation.
    -   For `BPart`s with an asset mesh, it asynchronously generates a `ConvexHull` collider for more accurate physics. It uses a cache (`runtimeStore.convex_hull_cache`) to avoid regenerating the same hull.
-   `CameraComponent.ts`: Owns and manages a `THREE.PerspectiveCamera` or `THREE.OrthographicCamera`, syncing it with its `GameObject`'s transform. The `GameObjectManager` selects the active camera.
-   `ScriptComponent.ts`: Attaches a `BScript` to a `GameObject` and uses the `CodeInterpreter` to execute its logic based on its defined triggers.
-   `PlayerControllerComponent.ts`: Handles player input for `BPlayerController` objects, using direct velocity control on the `PhysicsComponent` for responsive movement.
-   `ConstraintComponent.ts`: Creates RAPIER physics joints between two `BPart` GameObjects.
-   `WaypointNavigatorComponent.ts`: Moves its parent `GameObject` along a `BWaypointPath`, controlling its position.

> **Runtime note:** Some editor helper objects, such as `BWaypointNavigator`, do **not** get their own runtime `GameObject`. Instead, the parent `GameObject` registers their configuration data via `gameObject.setComponentConfig(...)`, and the runtime component retrieves it with `gameObject.getComponentConfig(...)`. This keeps the runtime hierarchy clean and avoids fragile child lookups. When adding similar helper BObjects, register their configuration on the host `GameObject` rather than searching its children at runtime.

---

## 6. Visual Scripting System

-   **Configuration**:
    -   `src/lib/blockConfig.ts`: Defines "Blocks" (actions like `move`, `if`, `wait`).
    -   `src/lib/chipConfig.ts`: Defines "Chips" (value-producing expressions like `variable`, `vector3`, `raycast`).
-   **Compilation (`src/lib/compiler.ts`)**:
    -   `compileScript` flattens the UI-based script graph into a simple, executable array of objects.
-   **Execution (`src/lib/interpreter.ts`)**:
    -   `CodeInterpreter` executes the compiled script. It uses a `RuntimeContext` to access variables (via `runtimeStore`) and evaluate chips.
    -   **Object Lifecycle Blocks**:
        -   `clone`: Uses `gameObject.clone()` to create a deep copy of a `GameObject` and its components, then adds it to the runtime via `gameObjectManager.addGameObject()`.
        -   `destroy`: Uses `gameObjectManager.removeGameObject()` to safely remove an object and its components from the runtime.
        -   `parent`: Uses `gameObject.setParent()` to manage the runtime hierarchy.

---

## 7. Editor UI

The editor is built with Svelte components in `src/lib/components/` and orchestrated by `src/routes/editor/[id]/+page.svelte`.

-   **Layout**: A `ResizablePaneGroup` contains the main panels.
-   **Key Panels**:
    -   `ObjectExplorer.svelte`: Displays the `BObject` hierarchy from `sceneStore`. Handles selection, creation, and drag-and-drop reparenting.
    -   `PropertiesPanel.svelte`: A context-aware panel that displays properties for the selected `BObject`. It shows different UI sections based on the object's type (e.g., transform for `BNode3D`, mesh/material selectors for `BPart`, constraint properties for `BConstraint`).
    -   `ViewportScene.svelte`: The 3D editor viewport using Threlte. Renders `BObject`s from `sceneStore` and provides `OrbitControls` and `TransformControls`.
    -   `CodeEditor.svelte`: The visual scripting canvas.
    -   `AssetBrowser.svelte`: UI for managing uploaded `BAsset`s.
    -   `MaterialBrowser.svelte`: UI for creating and managing `BMaterial`s.
    -   `ParticleBrowser.svelte`: UI for creating and managing `BParticle` systems.
    -   `DevToolsPanel.svelte`: Displays runtime logs and variables from `runtimeStore`. Only visible in play mode.

---

## 8. Development Guidelines

### Adding a New Object Type

1.  **Define Class**: Create a new class extending an appropriate base class in `src/lib/types.ts`.
2.  **Update Factory**: Add a case for the new type in `sceneStore.ts`'s `createObject` method.
3.  **Add Icon**: Add an icon in `ObjectExplorer.svelte`'s `getObjectIcon` function.
4.  **Add to "Add" Menu**: Add the type to the `Command` component in `ObjectExplorer.svelte`.
5.  **Add Properties UI**: Add a new UI section in `PropertiesPanel.svelte` that shows when the new object type is selected.
6.  **Add Runtime Logic**:
    -   If the object has a visual representation, add a case for it in `VisualComponent.ts`.
    -   If it needs custom runtime logic, create a new `Component` in `src/lib/runtime/` and add logic in `GameObjectManager.ts`'s `addComponentsToGameObject` to attach it.

### Adding a New Visual Scripting Block

1.  **Define Config**: Add an entry to `blockConfig` in `src/lib/blockConfig.ts`.
2.  **Implement Logic**: Add a case for the block's `type` in `interpreter.ts`'s `executeItem` method. Use `context.evaluateChip()` to get input values.

### Adding a New Component

1.  **Create Component**: Create a new file in `src/lib/runtime/` that extends `Component.ts`.
2.  **Implement Logic**: Implement the `update`, `onEnable`, `onDisable`, and `destroy` methods.
3.  **Attach Component**: In `GameObjectManager.ts`, modify `addComponentsToGameObject` to add your new component to the appropriate `GameObject`s based on their `BObject` type or other properties.
4.  **Expose to Scripts**: If scripts need to interact with the component, add methods to it and consider how scripts will get a reference to it (e.g., via `gameObject.getComponent()`).
