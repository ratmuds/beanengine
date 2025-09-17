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
-   `BPlayerController`: Extends `BPart`. A specialized part that handles player input for movement and camera control. Contains settings for movement speed, mouse sensitivity, and camera clamp angles.
-   `BCamera`: Extends `BNode3D`. Represents a camera in the scene.
-   `BLight`: Extends `BNode3D`. Represents a light source.
-   `BScript`: Extends `BObject`. A container for visual scripting blocks. It is parented to a `BNode3D` to attach logic to an object.
-   `BStorage`: Extends `BObject`. A simple folder-like container for organizing objects in the hierarchy. Similar to Roblox's ReplicatedStorage, it acts as a non-interactive container that cannot be moved, deleted, or have its properties edited in the editor. Objects inside BStorage are not processed by the runtime system.
-   `BAsset`: Represents a file imported by the user (e.g., a `.gltf` model or `.png` texture). Managed by the `assetStore`.
-   `BMaterial`: Represents a material that can be applied to a `BPart`. Managed by the `materialStore`.

---

## 4. State Management (`src/lib/*Store.ts`)

### Supabase Integration (Latest)

Bean Engine now includes full Supabase integration for user authentication and project persistence:

#### Authentication System
- **`authStore.ts`**: Manages user authentication state using Supabase Auth
  - Provides sign-in, sign-up, and sign-out functionality
  - Maintains reactive user session state
  - Automatically initializes auth state on browser load
  - Integrates with Supabase RLS (Row Level Security) for data access control

#### Project Management
- **`supabase.ts`**: Core Supabase client configuration and helper functions
  - Configured with environment variables: `PUBLIC_SUPABASE_URL` and `PUBLIC_SUPABASE_ANON_KEY`
  - Provides CRUD operations for projects table
  - Includes Project interface with id, name, data (JSONB), user_id, timestamps
  - All operations respect RLS policies ensuring users only access their own projects

- **`projectStore.ts`**: Manages project state and integrates with scene serialization
  - Loads user projects from Supabase
  - Creates new projects using current scene data via `sceneStore.serialize()`
  - Saves projects by updating Supabase with serialized scene data
  - Loads projects by deserializing data via `sceneStore.deserialize()`
  - Handles project deletion and renaming
  - Maintains current project state for save/load operations

#### Database Schema
- **Projects Table** (`supabase-schema.sql`):
  - `id` (UUID, primary key)
  - `name` (TEXT, project name)
  - `data` (JSONB, serialized scene data)
  - `user_id` (UUID, foreign key to auth.users)
  - `created_at`, `updated_at` (timestamps)
  - RLS policies ensure users can only access their own projects
  - Automatic `updated_at` trigger for timestamp management

#### UI Integration
- **Login Page** (`/login`): Authentication interface with sign-in/sign-up forms
- **Projects Page** (`/projects`): Project management interface with:
  - Grid view of user projects with creation/update timestamps
  - Create new project functionality (saves current scene)
  - Load project functionality (deserializes into scene)
  - Rename and delete project operations
  - Current project indicator and save current project button
  - Navigation back to editor with loaded project

#### Scene Persistence Flow
1. **Save**: Current scene → `sceneStore.serialize()` → JSON → Supabase projects table
2. **Load**: Supabase projects table → JSON → `sceneStore.deserialize()` → Scene reconstruction
3. **Authentication**: All operations require valid Supabase session with RLS enforcement
4. **Data Isolation**: Each user can only access their own projects via database policies

### Recent Updates

#### Constraint System (Latest)
- **Purpose**: Connect two physics objects with fixed joints for rigid body constraints
- **Implementation**: 
  - `BConstraint` class in `types.ts` stores references to `partA` and `partB` (BPart instances)
  - `ConstraintComponent.ts` creates RAPIER fixed joints between physics bodies
  - Automatically finds GameObjects and their PhysicsComponents at runtime
  - Uses `RAPIER.JointData.fixed()` to create rigid constraints
- **UI Integration**:
  - PropertiesPanel shows constraint-specific UI when BConstraint is selected
  - Part A and Part B dropdowns populated with all BPart objects in scene
  - Visual status indicator shows when constraint is properly configured
  - ObjectExplorer supports creating constraints via Command interface
- **Workflow**: Create constraint → Select parts via Properties Panel → Constraint activates in play mode

#### Player Controller Movement System
- **Issue**: Player movement using `setDirectionalForce()` caused acceleration buildup, making players move faster and faster without stopping
- **Solution**: Implemented velocity-based movement system
  - Added `setVelocity()` and `getVelocity()` methods to <mcfile name="PhysicsComponent.ts" path="src/lib/runtime/PhysicsComponent.ts"></mcfile>
  - Modified <mcfile name="PlayerControllerComponent.ts" path="src/lib/runtime/PlayerControllerComponent.ts"></mcfile> to use direct velocity control instead of forces
  - Movement now:
    - Sets velocity directly for immediate, responsive movement
    - Preserves Y-axis velocity for gravity/jumping
    - Normalizes diagonal movement to prevent speed advantages
    - Stops immediately when input stops
    - Maintains physics collision detection
- **Result**: Smooth, predictable FPS-style player movement without acceleration issues

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
    -   `ConstraintComponent.ts`: Creates RAPIER physics joints between two BPart GameObjects. Automatically resolves partA and partB references to their corresponding GameObjects and PhysicsComponents. Creates fixed joints that rigidly connect the physics bodies.
    -   `PlayerControllerComponent.ts`: Handles player input for `BPlayerController` objects. Processes WASD keys for movement, applies forces through the `PhysicsComponent`, handles mouse look for rotation, and manages camera rotation with vertical clamping if a `BCamera` is parented to the controller.
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

### Visual Scripting: Chip Evaluation Rules and Recent Fixes

### Scene Serialization & Editor Project Loading (New)
- SceneManager in <mcfile name="sceneStore.ts" path="src/lib/sceneStore.ts"></mcfile> now exposes:
  - clearScene(): resets logical scene graph (keeps physics world intact)
  - serialize(): returns a plain JSON payload of objects and variables (no File/URL blobs)
  - deserialize(payload): rebuilds a scene from the JSON payload; creates objects first, then wires parent-child by id; restores transforms and type-specific props (Part, Camera, Light, Script, PlayerController).
- Editor route <mcfile name="+page.svelte" path="src/routes/editor/[id]/+page.svelte"></mcfile> loads project by ID on mount:
  - Reads id from window.location (/editor/[id])
  - Looks up localStorage key: beanengine:project:[id]
  - If found, parses JSON and calls sceneStore.clearScene() then sceneStore.deserialize(payload)
  - Loading overlay text reflects the loading state during initialization.
- Notes:
  - This path intentionally avoids File-based assets for now; asset persistence will be handled separately via assetStore in future work.
  - Physics world is not torn down by clearScene(); reinit occurs separately via existing physics lifecycle.


- RuntimeContext.evaluateChip is the single entry point to evaluate any compiled chip or literal, and must be called recursively by chips when reading their inputs. This returns plain JS primitives or engine types (e.g., Types.BVector3) depending on the chip.
- Important contract: Block handlers (in interpreter.ts) always call context.evaluateChip on their parameters before use. Chips must also call context.evaluateChip on their own field values before computing results.
- Fix (2025-09-16): vector3, add, and mul chips now evaluate inputs asynchronously via context.evaluateChip(compiledField, context) rather than directly reading compiled objects. This resolves instanceof/type issues where nested chips previously leaked raw compiled objects (e.g., position vs vector3). Add/mul now support vector-like operations by detecting objects with x,y,z and returning a new Types.BVector3.
- Impact: Move/MoveTo/DirectionalImpulse blocks now properly accept expressions like Add(Position(self), Vector3(0, 2, 0)). The interpreter’s parseVector3 continues to normalize both plain objects and Types.BVector3.


### Transform System (Roblox Studio Style)

The runtime engine uses a simplified transform system similar to Roblox Studio.

-   **`GameObject.ts`**:
    -   `transform`: Single transform property containing position, rotation, and scale. This is what you modify directly in all components.
    -   `offsetFromParent`: Cached offset when parented (automatically managed by the system).
    -   `worldMatrix`: The final `THREE.Matrix4` representing the world transform for rendering.
    -   `isPhysicsDriven`: A boolean flag. If `true`, the `GameObject`'s transform is controlled by the physics simulation (`PhysicsComponent`).

-   **`GameObjectManager.ts`**:
    -   In its `update` loop, it calls `updateWorldMatrix()` on all `GameObject`s.
    -   `GameObject.updateWorldMatrix()`: This method calculates the world matrix for rendering.
        -   If `isPhysicsDriven` is `true`, it uses the physics-driven transform directly.
        -   If the object has a parent, it applies the cached `offsetFromParent` to the parent's world transform.
        -   Otherwise, it uses the object's own transform as the world transform.

-   **Component Interactions**:
    -   `VisualComponent.ts`: Reads from `gameObject.transform` to position and orient meshes and lights in the scene. It also calls `mesh.updateMatrix()` and `mesh.updateMatrixWorld(true)` after copying transforms.
    -   `PhysicsComponent.ts`:
        -   On initialization, it uses the `gameObject.transform` to create the physics body at the correct initial position and rotation.
        -   It sets `gameObject.isPhysicsDriven = true`.
        -   In its `update` loop, it syncs the `GameObject`'s `transform` from the physics simulation's result.
    -   `PlayerControllerComponent.ts`:
        -   Modifies `gameObject.transform.rotation` for player rotation (yaw).
        -   Modifies the child camera's `transform.rotation` for camera pitch, creating the standard FPS camera behavior.

---

### Runtime Context and Transform Mutation Rules

- RuntimeContext.gameObject is a direct reference to the live runtime GameObject created by GameObjectManager at Play Mode start. Scripts must mutate its transform vectors (THREE.Vector3/Quaternion) in place rather than replacing them to ensure VisualComponent and Three.js see the change.
- Do this: `context.gameObject.transform.position.set(x, y, z)` or `add(...)`; avoid `context.gameObject.transform.position = new Vector3(...)`.
- VisualComponent reads the transform each frame and pushes it to the underlying THREE.Mesh, calling updateMatrix/updateMatrixWorld as needed. If you replace the vector instance, downstream references won’t update.
- PhysicsComponent similarly expects in-place mutation to keep RAPIER bodies in sync.
- The interpreter normalize-and-apply pattern should parse inputs to numbers/vectors and then call `.set(...)` on existing transform vectors. This is now implemented in interpreter executeMove.



### Runtime Transform Source of Truth and Cameras

- Runtime uses GameObjects only; BNode3D (editor types like BPart/BCamera/BPlayerController) are converted at Play start into GameObject instances with Components. Do NOT mutate Types.B* rotations/positions at runtime; those are editor-side and Euler-based.
- Rotation model: editor-side BNode3D.rotation is Euler; at runtime we convert to a Quaternion on GameObject.transform. All runtime rotation changes must set/modify GameObject.transform.rotation (Quaternion). Avoid assigning new Quaternion objects; mutate existing with setFromEuler/set(...) and then normalize.
- Cameras: We now create a GameObject for each BCamera and attach a CameraComponent that owns a THREE.PerspectiveCamera. GameObjectManager.initializeFromScene selects the active camera from the BCamera.isActive flag and returns the CameraComponent's THREE camera to GameRuntime.svelte. VisualComponent draws only a helper mesh for BCamera and no longer creates/owns the THREE camera.
- PlayerController: Mouse look and movement apply to the runtime GameObject(s). Yaw is applied to the PlayerController's GameObject.transform.rotation; pitch is applied to the child Camera GameObject (if present) with clamping. No direct mutation of Types.BCamera or Types.BPlayerController rotations at runtime.

#### Camera Aspect & Render Loop

- GameRuntime computes the aspect from the actual canvas size and propagates it to cameras: it reads `renderer.domElement.getBoundingClientRect()`, computes `width/height`, calls `GameObjectManager.updateCameraAspect(aspect)`, and also applies it to the fallback default camera. It updates this on `window.resize`.
- GameObjectManager exposes `updateCameraAspect(aspect)` which iterates all runtime `GameObject`s, finds `CameraComponent`s, and calls `setAspect(aspect)` so each camera updates its projection matrix.
- CameraComponent owns a `THREE.PerspectiveCamera`, syncs from the GameObject's `worldTransform` each frame, and provides `setAspect(aspect)` to safely update projection.
- The runtime render loop renders with the active camera from `GameObjectManager.getCamera()` if present, otherwise falls back to the default camera created by `GameRuntime`.

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

### Recent Block Implementations (Latest)

### Recent Fixes (Latest)

#### Login Page Error Fixes
Fixed multiple TypeScript and component errors in the login page:

- **AuthStore Access**: Fixed `authState` derivation to use `$authStore` instead of non-existent `authStore.manager` property
- **Input Validation**: Fixed `minlength` attribute type errors by using numbers instead of strings
- **Alert Component**: Fixed Alert component import to use proper namespace import structure (`* as Alert`)

All ESLint errors have been resolved and the login page is now functional.

### Recent Block Implementations

#### Object Lifecycle Blocks
Three new blocks have been added to support dynamic object management during runtime:

- **Clone Block**: Creates a copy of a target object and stores its ID in a variable
  - Configuration: Target field (defaults to self) and variable name field
  - Implementation: Uses `BNode3D.clone()` to create a deep copy, then `GameObjectManager.addGameObject()` to instantiate it in the runtime
  - The cloned object gets a new unique ID and is fully independent from the original
  - Variable storage allows scripts to reference and manipulate the cloned object

- **Destroy Block**: Removes a target object from the scene
  - Configuration: Target field (defaults to self)
  - Implementation: Uses `GameObjectManager.removeGameObject()` to properly clean up the GameObject and all its components
  - Handles physics cleanup, visual component removal, and parent-child relationship updates

- **Parent Block**: Sets or removes parent-child relationships between objects
  - Configuration: Target field (defaults to self) and parent field
  - Implementation: Uses `GameObject.setParent()` to establish relationships
  - Supports unparenting by using "null", empty string, or no parent value
  - Maintains proper transform hierarchy and offset calculations

These blocks enable dynamic scene manipulation during gameplay, supporting patterns like:
- Spawning projectiles or enemies (clone + parent)
- Cleaning up temporary objects (destroy)
- Attaching objects to moving platforms (parent)
- Creating modular, reusable object systems
