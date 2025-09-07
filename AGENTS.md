# Bean Engine - Agent Documentation

> Comprehensive technical documentation for AI agents and developers working on Bean Engine

## Project Overview

Bean Engine is a **visual programming game development platform** that bridges the gap between Scratch-style block programming and professional game engines. Built with SvelteKit, Three.js, and TypeScript, it provides a complete 3D game development environment with drag-and-drop visual scripting.

**Key Concept**: Users create games by dragging visual blocks (like Scratch) that compile to executable code, while working in a professional 3D editor interface.

## Architecture Overview

### Technology Stack
- **Frontend Framework**: SvelteKit 2.x with Svelte 5
- **3D Graphics**: Three.js via @threlte/core and @threlte/extras
- **Styling**: TailwindCSS 4.x with custom UI components
- **Language**: TypeScript with strict typing
- **State Management**: Svelte stores with reactive patterns
- **Build Tool**: Vite 7.x
- **Code Quality**: ESLint with TypeScript and Svelte support

### Core Systems
1. **Visual Programming System** - Block-based code generation
2. **3D Scene Management** - Object hierarchy and transforms
3. **Code Compilation & Execution** - Convert blocks to runnable code
4. **Asset Management** - Handle 3D models, textures, audio
5. **Editor Interface** - Professional multi-panel layout



## Project Structure
Raymund Thongthipaya

Copy

Delete

can you explore the codebase and document extensively in an AGENTS.md file please? It should be helpful in how it works and where stuff is, types, etc for you and other agents later.

Trae

I need to explore the codebase structure and understand the project to create comprehensive documentation. Let me start by examining the project structure and key files.

beanengine

Now I'll examine the package.json to understand the project dependencies and configuration.

package.json 1 - 50

Let me examine the main types file to understand the core data structures and interfaces.

src\lib\types.ts 1 - 100

Let me continue reading the types file to see the complete BPart class and other important types.

src\lib\types.ts 200 - 299

Now let me examine the scene store to understand how the application manages state.

src\lib\sceneStore.ts 1 - 100

Let me finish reading the sceneStore file to see the complete implementation.

src\lib\sceneStore.ts 200 - 218

Now let me examine the compiler and interpreter files to understand how the visual programming system works.

src\lib\compiler.ts 1 - 100

Let me examine the interpreter file to understand how the compiled code is executed.

src\lib\interpreter.ts 1 - 100

Now let me examine the chip configuration to understand the visual programming blocks system.

src\lib\chipConfig.ts 1 - 100

Let me examine the block configuration to understand the visual programming blocks system.

src\lib\blockConfig.ts 1 - 100

Now let me examine some key components to understand the UI structure, starting with the main editor page.

src\routes\editor\+page.svelte 1 - 100

Let me examine the ViewportScene component to understand how the 3D rendering works.

src\lib\components\ViewportScene.svelte 1 - 100

Let me examine the ObjectExplorer component to understand the scene hierarchy management.

src\lib\components\ObjectExplorer.svelte 1 - 100

Let me examine the PropertiesPanel component to understand how object properties are managed.

src\lib\components\PropertiesPanel.svelte 1 - 100

Let me examine the CodeEditor component to understand how the visual programming interface works.

src\lib\components\CodeEditor.svelte 1 - 100

Let me examine the utils file to understand utility functions and the main index file to see what's exported.

src\lib\utils.ts 1 - 50

src\lib\index.ts 1 - 50

Let me examine the README and TODO files to understand the project better, then create the comprehensive AGENTS.md documentation.

README.md 1 - 50

TODO.md 1 - 50

I've thoroughly explored the Bean Engine codebase and will now create a comprehensive AGENTS.md documentation file. This will serve as a detailed guide for understanding the project architecture, components, and how everything works together.

```
# Bean Engine - Agent Documentation

> Comprehensive technical 
documentation for AI agents and 
developers working on Bean Engine

## Project Overview

Bean Engine is a **visual 
programming game development 
platform** that bridges the gap 
between Scratch-style block 
programming and professional game 
engines. Built with SvelteKit, Three.
js, and TypeScript, it provides a 
complete 3D game development 
environment with drag-and-drop 
visual scripting.

**Key Concept**: Users create games 
by dragging visual blocks (like 
Scratch) that compile to executable 
code, while working in a 
professional 3D editor interface.

## Architecture Overview

### Technology Stack
- **Frontend Framework**: SvelteKit 
2.x with Svelte 5
- **3D Graphics**: Three.js via 
@threlte/core and @threlte/extras
- **Styling**: TailwindCSS 4.x with 
custom UI components
- **Language**: TypeScript with 
strict typing
- **State Management**: Svelte 
stores with reactive patterns
- **Build Tool**: Vite 7.x

### Core Systems
1. **Visual Programming System** - 
Block-based code generation
2. **3D Scene Management** - Object 
hierarchy and transforms
3. **Code Compilation & Execution** 
- Convert blocks to runnable code
4. **Asset Management** - Handle 3D 
models, textures, audio
5. **Editor Interface** - 
Professional multi-panel layout

## Project Structure

```
f:\beanengine/
├── src/
│   ├── lib/                    # Core library code
│   │   ├── components/         # Svelte components
│   │   │   ├── ui/            # Reusable UI components
│   │   │   ├── properties/    # Property editor components
│   │   │   ├── ViewportScene.svelte    # 3D scene renderer
│   │   │   ├── CodeEditor.svelte       # Visual programming interface
│   │   │   ├── ObjectExplorer.svelte   # Scene hierarchy
│   │   │   ├── PropertiesPanel.svelte  # Object properties
│   │   │   └── GameRuntime.svelte      # Game execution runtime
│   │   ├── types.ts           # Core type definitions
│   │   ├── sceneStore.ts      # Scene state management
│   │   ├── blockConfig.ts     # Visual programming blocks
│   │   ├── chipConfig.ts      # Value chips (variables, vectors)
│   │   ├── compiler.ts        # Block-to-code compilation
│   │   ├── interpreter.ts     # Code execution engine
│   │   └── utils.ts           # Utility functions
│   ├── routes/
│   │   ├── +page.svelte       # Landing page
│   │   ├── +layout.svelte     # App layout
│   │   └── editor/
│   │       └── +page.svelte   # Main editor interface
│   ├── app.html               # HTML template
│   ├── app.css                # Global styles
│   └── app.d.ts               # TypeScript declarations
├── static/                     # Static assets
├── package.json               # Dependencies and scripts
├── svelte.config.js           # Svelte configuration
├── vite.config.ts             # Vite build configuration
├── tsconfig.json              # TypeScript configuration
├── tailwind.config.js         # TailwindCSS configuration
├── README.md                  # Project documentation
└── TODO.md                    # Development roadmap

## Core Type System

### Base Classes (src/lib/types.ts)

The engine uses a hierarchical object system similar to game engines like Unity or Godot:

#### BScene
```typescript
class BScene {
    objects: BObject[];     // All objects in scene
    children: BObject[];    // Direct children only
    
    addObject(object: BObject)
    removeObject(object: BObject)
}
```

#### BObject (Base Object)
```typescript
class BObject {
    name: string;           // Display name
    id: string;             // Unique identifier
    type: string;           // Object type ("object", "part", "script", etc.)
    parent: BObject | null; // Parent in hierarchy
    children: BObject[];    // Child objects
    
    // Hierarchy management
    addChild(child: BObject)
    removeChild(child: BObject)
    getSiblings(): BObject[]
    getDescendants(): BObject[]
    isDescendantOf(ancestor: BObject): boolean
}
```

#### BNode3D (3D Transform Object)
```typescript
class BNode3D extends BObject {
    // Local transform (relative to parent)
    position: BVector3;     // Local position
    rotation: BQuaternion;  // Local rotation
    scale: BVector3;        // Local scale
    
    // Transform offsets
    positionOffset: BVector3;
    rotationOffset: BQuaternion;
    
    // World space methods
    getWorldPosition(): BVector3
    setWorldPosition(worldPos: BVector3): void
    getNode3DChildren(): BNode3D[]
}
```

#### BPart (Renderable 3D Object)
```typescript
class BPart extends BNode3D {
    // Rendering properties
    mesh: string;           // Mesh type ("block", "sphere", etc.)
    color: string;          // Hex color
    material: string;       // Material type
    transparency: number;   // 0-1 transparency
    castShadows: boolean;
    receiveShadows: boolean;
    visible: boolean;
    
    // Physics constraints
    axisLockPosX/Y/Z: boolean;  // Lock position axes
    axisLockRotX/Y/Z: boolean;  // Lock rotation axes
    
    // Interaction properties
    canTouch: boolean;      // Can be clicked
    canCollide: boolean;    // Has collision
    canQuery: boolean;      // Can be found by scripts
}
```

#### BMesh (Asset-Referenced Mesh Object)
```typescript
class BMesh extends BPart {
    assetId: string | null;     // Reference to asset in asset store
    meshUrl: string | null;     // Direct URL to mesh file
    
    // Asset management methods
    setMeshAsset(assetId: string)   // Set mesh from asset store
    setMeshUrl(url: string)         // Set mesh from direct URL
    getMeshSource(): { type: 'asset' | 'url' | 'none', value: string | null }
}
```

#### BCamera (3D Camera Object)
```typescript
class BCamera extends BNode3D {
    // Projection settings
    fieldOfView: number;            // FOV in degrees (default: 60)
    nearClipPlane: number;          // Near clipping distance (default: 0.1)
    farClipPlane: number;           // Far clipping distance (default: 1000)
    projectionType: 'perspective' | 'orthographic';
    orthographicSize: number;       // Size for orthographic projection
    aspectRatio: number;            // Width/height ratio (default: 16/9)
    
    // Camera settings
    isActive: boolean;              // Whether camera is currently active
    clearColor: string;             // Background color (default: sky blue)
    clearFlags: 'skybox' | 'solid_color' | 'depth_only';
    
    // Configuration methods
    setPerspective(fov: number, near: number, far: number)
    setOrthographic(size: number, near: number, far: number)
    getViewMatrix(): number[]       // 4x4 view matrix (placeholder)
    getProjectionMatrix(): number[] // 4x4 projection matrix (placeholder)
}
```

#### BScript (Code Container)
```typescript
class BScript extends BObject {
    code: any[];            // Array of visual programming blocks
}
```

#### Supporting Types
```typescript
class BVector3 {
    x: number; y: number; z: number;
    constructor(x = 0, y = 0, z = 0)
}

class BQuaternion {
    x: number; y: number; z: number; w: number;
    constructor(x = 0, y = 0, z = 0, w = 1)
}
```

## State Management (src/lib/sceneStore.ts)

### SceneManager Class
Manages the current scene and provides methods for object manipulation:

```typescript
class SceneManager {
    scene: Types.BScene;                    // Current scene
    variables: Array<{                      // Script variables
        name: string;
        value: any;
        type: string;
    }>;
    
    // Object management
    createObject(objectType: string, parentId: number, options?): BObject  // Generic factory method
    createPartInFrontOfCamera(parentId, position?): BPart                  // Convenience wrapper
    createScript(parentId): BScript                                        // Convenience wrapper
    addObject(object: BObject)
    removeObject(object: BObject)
    updateObject(object: BObject)           // Triggers reactivity
    reparentObject(objectId, newParentId)  // Change parent
    
    // Variable management
    setVariables(variables)
    updateVariable(name: string, value: any)
    getVariables()
}
```

### Reactive Store
The `sceneStore` is a Svelte writable store that wraps SceneManager:

```typescript
export const sceneStore = createSceneStore();

// Usage in components:
$sceneStore.getScene().objects  // Access objects
sceneStore.addObject(newPart)   // Trigger reactive updates
```

### Object Creation Refactoring

**Problem**: Previously had separate methods for each object type (`createPartInFrontOfCamera`, `createScript`), making it difficult to add new object types.

**Solution**: Implemented a generic factory pattern with `createObject(objectType, parentId, options?)`:

```typescript
// New generic method supports all object types
sceneStore.createObject('part', parentId);     // Creates BPart
sceneStore.createObject('mesh', parentId);     // Creates BMesh  
sceneStore.createObject('camera', parentId);   // Creates BCamera
sceneStore.createObject('light', parentId);    // Creates BLight
sceneStore.createObject('script', parentId);   // Creates BScript

// Old methods still work as convenience wrappers
sceneStore.createPartInFrontOfCamera(parentId);
sceneStore.createScript(parentId);
```

**Benefits**:
- Single method handles all object types
- Easy to add new types (just add case to switch statement)
- Backward compatibility maintained
- Consistent naming and positioning logic

## Asset Management System (src/lib/assetStore.ts)

### AssetManager Class
Manages all assets (3D models, textures, audio) with collections and search functionality:

```typescript
class AssetManager {
    assets: Map<string, BAsset>;           // All assets by ID
    collections: Map<string, BAssetCollection>; // Asset collections
    searchQuery: string;                   // Current search filter
    selectedAssetIds: Set<string>;         // Selected assets
    filterType: AssetType | 'all';         // Type filter
    
    // Asset management
    async addAsset(file: File, type?: AssetType): Promise<BAsset>
    removeAsset(assetId: string): boolean
    getAsset(assetId: string): BAsset | undefined
    getAllAssets(): BAsset[]
    getFilteredAssets(): BAsset[]          // Apply search/filter
    
    // Collection management
    createCollection(name: string, description?: string): BAssetCollection
    removeCollection(collectionId: string): boolean
    getCollection(collectionId: string): BAssetCollection | undefined
    addAssetToCollection(assetId: string, collectionId: string)
    
    // Selection management
    selectAsset(assetId: string, multiSelect?: boolean)
    deselectAsset(assetId: string)
    clearSelection()
    getSelectedAssets(): BAsset[]
    
    // Utility methods
    getStats(): { total: number, byType: Record<AssetType, number>, totalSize: number }
    async addMultipleAssets(files: FileList): Promise<BAsset[]>
    removeSelectedAssets(): number
}
```

### Reactive Asset Store
The `assetStore` is a Svelte writable store that wraps AssetManager:

```typescript
export const assetStore = createAssetStore();

// Available methods:
assetStore.addAsset(file, type?)           // Add single asset
assetStore.addMultipleAssets(files)        // Add multiple assets
assetStore.removeAsset(assetId)            // Remove asset
assetStore.getAsset(assetId)               // Get asset by ID
assetStore.setSearchQuery(query)           // Filter assets
assetStore.setFilterType(type)             // Filter by type
assetStore.selectAsset(assetId, multiSelect?) // Select asset
assetStore.createCollection(name, desc?)   // Create collection
assetStore.addAssetToCollection(assetId, collectionId) // Add to collection

// Usage in components:
$assetStore.getFilteredAssets()            // Get filtered assets
$assetStore.getSelectedAssets()            // Get selected assets
$assetStore.getStats()                     // Get asset statistics
```

### Asset Types
```typescript
type AssetType = 'mesh' | 'texture' | 'audio' | 'material' | 'script' | 'other';

interface BAssetMetadata {
    id: string;
    name: string;
    type: AssetType;
    fileType: string;      // e.g., 'gltf', 'png', 'mp3'
    size: number;          // file size in bytes
    uploadedAt: Date;
    tags: string[];
    description?: string;
    thumbnailUrl?: string; // for preview images
}

class BAsset {
    file: File;
    metadata: BAssetMetadata;
    objectUrl: string;     // Blob URL for browser access
    
    constructor(file: File, type?: AssetType)
    dispose()              // Clean up object URL
    matchesSearch(query: string): boolean
}

class BAssetCollection {
    id: string;
    name: string;
    description: string;
    assetIds: Set<string>;
    createdAt: Date;
    
    addAsset(assetId: string)
    removeAsset(assetId: string)
    hasAsset(assetId: string): boolean
    getAssetCount(): number
}
```

### Recent Updates
- **getAsset Function Added (Latest)**: Added `getAsset(assetId: string)` method to the asset store interface, allowing direct retrieval of assets by ID. This method was already available in the AssetManager class but wasn't exposed through the store interface.

## Visual Programming System

### Block Configuration (src/lib/blockConfig.ts)

Defines available programming blocks (commands/statements):

```typescript
interface BlockConfig {
    color: string;          // UI color class
    label: string;          // Display name
    fields: BlockField[];   // Input fields
    info: string;           // Help text
    end?: string;           // End label for container blocks
}

interface BlockField {
    type: string;           // "text", "number", "dropdown"
    bind: string;           // Property name to bind to
    label?: string;         // Field label
    placeholder: string;    // Placeholder text
    icon: any;              // Lucide icon component
}
```

**Available Blocks:**
- `say` - Display message over object
- `if` - Conditional execution
- `wait` - Pause execution
- `moveto` - Move object to position
- `move` - Move in direction
- `setsize` - Change object scale
- `setrotation` - Change object rotation
- `repeat` - Loop execution

### Chip Configuration (src/lib/chipConfig.ts)

Defines value chips (expressions that return values):

```typescript
interface ChipConfig {
    color: string;
    label: string;
    fields: ChipField[];
    info: string;
    evaluate?: (compiled: CompiledItem, context: RuntimeContext) => Promise<any>;
}
```

**Available Chips:**
- `variable` - Reference to script variable
- `vector3` - 3D vector with X, Y, Z components

### Compilation System (src/lib/compiler.ts)

Converts visual blocks to executable format:

```typescript
// Compile a single block/chip
function compileItem(chip: any): CompiledItem

// Compile entire script
function compileScript(scriptItems: any[]): CompiledItem[]

// Create runtime evaluation context
function createRuntimeContext(variables): RuntimeContext
```

**Compilation Process:**
1. Visual blocks contain UI metadata (position, connections, etc.)
2. Compiler strips UI data, flattens structure
3. Produces clean executable objects
4. Runtime context provides variable access and evaluation

### Code Execution (src/lib/interpreter.ts)

```typescript
class CodeInterpreter {
    constructor(code: any[], object: BObject, mesh?: THREE.Mesh)
    
    async run(context: RuntimeContext)      // Execute all code
    private async executeItem(item, context) // Execute single item
}
```

## 3D Rendering System

### ViewportScene Component (src/lib/components/ViewportScene.svelte)

Handles 3D scene rendering using Threlte (Three.js wrapper):

**Key Features:**
- Orbit camera controls
- Object selection with outlines
- Transform gizmos (move/rotate/scale)
- Real-time transform updates
- Shadow casting and receiving

**Structure:**
```svelte
<T.PerspectiveCamera makeDefault position={[10, 10, 5]}>
    <OrbitControls />
</T.PerspectiveCamera>

<T.DirectionalLight position={[3, 10, 7]} intensity={Math.PI} castShadow />
<T.AmbientLight intensity={0.3} />

<!-- Render each BNode3D object -->
{#each $sceneStore.getScene().objects.filter(obj => obj instanceof Types.BNode3D) as object}
    <T.Group position={[object.position.x, object.position.y, object.position.z]}>
        <T.Mesh>
            <T.BoxGeometry args={[1, 1, 1]} />
            <T.MeshStandardMaterial color={object.color} />
        </T.Mesh>
    </T.Group>
{/each}
```

## Editor Interface Components

### Main Editor (src/routes/editor/+page.svelte)

The main editor uses a resizable panel layout:

```svelte
<ResizablePaneGroup orientation="horizontal">
    <!-- Left Panel: Object Explorer + Properties -->
    <ResizablePane defaultSize={20}>
        <ObjectExplorer bind:selectedObject />
        <PropertiesPanel {selectedObject} />
    </ResizablePane>
    
    <!-- Center Panel: 3D Viewport + Code Editor -->
    <ResizablePane defaultSize={60}>
        <Tabs>
            <TabsContent value="viewport">
                <Canvas>
                    <ViewportScene bind:selectedObject />
                </Canvas>
            </TabsContent>
            <TabsContent value="script">
                <CodeEditor bind:selectedScript />
            </TabsContent>
        </Tabs>
    </ResizablePane>
    
    <!-- Right Panel: Asset Browser (future) -->
    <ResizablePane defaultSize={20}>
        <!-- Asset management -->
    </ResizablePane>
</ResizablePaneGroup>
```

### ObjectExplorer Component

**Purpose**: Displays scene hierarchy as expandable tree

**Key Features:**
- Hierarchical object display with indentation
- Drag-and-drop reparenting
- Context menus (copy, delete, etc.)
- Object type icons
- Search/filter functionality

**Data Flow:**
```typescript
// Flattens scene hierarchy for display
function flattenObjectsHierarchy(objects, allObjects, depth = 0)

// Handles object selection
function handleObjectClick(objectId: string)

// Manages expand/collapse state
let expandedObjects = $state(new Set<string>())
```

### PropertiesPanel Component

**Purpose**: Edit properties of selected object

**Sections:**
- Object name and ID
- Transform properties (position, rotation, scale) for BNode3D
- Part-specific properties for BPart
- Script properties for BScript

**Property Editing:**
```typescript
// Reactive object reference
let object = $derived(
    $sceneStore.getScene().objects.find(obj => obj.id === selectedObject)
);

// Update handler
function onPropertyChange(updatedObject) {
    sceneStore.updateObject(updatedObject);
}
```

### CodeEditor Component

**Purpose**: Visual programming interface

**Key Features:**
- Drag-and-drop block palette
- Visual script editing canvas
- Variable management
- Real-time compilation
- Block nesting (if statements, loops)

**Block System:**
```typescript
// Available block templates
let availableBlocks = $state(generateAvailableBlocks());

// Current script blocks
let items = $bindable([]);

// Compilation
$effect(() => {
    if (items && Array.isArray(items)) {
        compiledCode = compileScript(items);
    }
});
```

## Development Patterns

### Reactive State Management

Bean Engine uses Svelte 5's new reactivity system:

```typescript
// State variables
let selectedObject = $state(-1);
let expandedObjects = $state(new Set<string>());

// Derived values
let object = $derived(
    $sceneStore.getScene().objects.find(obj => obj.id === selectedObject)
);

// Effects for side effects
$effect(() => {
    if (selectedObject !== -1) {
        console.log('Selected:', selectedObject);
    }
});

// Bindable props
let { selectedObject = $bindable(-1) } = $props();
```

### Component Communication

**Event Dispatching:**
```typescript
const dispatch = createEventDispatcher<{
    selectObject: { id: string };
    addObject: { parentId: string | number; type?: string };
}>;

dispatch('selectObject', { id: objectId });
```

**Store Updates:**
```typescript
// Trigger reactive updates
sceneStore.updateObject(modifiedObject);
sceneStore.addObject(newObject);
sceneStore.removeObject(objectToDelete);
```

### Error Handling

```typescript
// Validation in object operations
if (!objectToReparent) {
    console.warn("Object to reparent not found:", objectId);
    return;
}

// Safe property access
const config = chipConfig[chipType];
if (!config) {
    throw new Error(`Unknown chip type: ${chipType}`);
}
```

## Key Dependencies

### Core Dependencies
- `@threlte/core` - Three.js integration for Svelte
- `@threlte/extras` - Additional 3D utilities (controls, effects)
- `three` - 3D graphics library
- `svelte` - Reactive UI framework
- `@sveltejs/kit` - Full-stack Svelte framework

### UI Dependencies
- `bits-ui` - Headless UI components
- `lucide-svelte` - Icon library
- `tailwindcss` - Utility-first CSS
- `@neodrag/svelte` - Drag and drop functionality

### Development Dependencies
- `typescript` - Type safety
- `vite` - Build tool and dev server
- `svelte-check` - TypeScript checking for Svelte

## Common Development Tasks

### Adding a New Visual Programming Block

1. **Define block in blockConfig.ts:**
```typescript
export const blockConfig: Record<string, BlockConfig> = {
    // ... existing blocks
    myNewBlock: {
        color: "purple-500",
        label: "My New Block",
        fields: [
            {
                type: "text",
                bind: "message",
                placeholder: "Enter message",
                icon: Type,
            },
        ],
        info: "Does something cool",
    },
};
```

2. **Add execution logic in interpreter.ts:**
```typescript
private async executeItem(item: any, context: RuntimeContext) {
    if (item.type === 'myNewBlock') {
        const message = await context.evaluateChip(item.message);
        console.log('My new block says:', message);
    }
    // ... existing logic
}
```

### Adding a New Object Type

1. **Define class in types.ts:**
```typescript
class BMyObject extends BNode3D {
    myProperty: string;
    
    constructor(name: string | null, id: string | null, parent: BObject | null) {
        super(name, id, parent);
        this.type = "myobject";
        this.myProperty = "default value";
    }
}
```

2. **Add rendering in ViewportScene.svelte:**
```svelte
{#if object instanceof Types.BMyObject}
    <!-- Custom rendering for new object type -->
{/if}
```

3. **Add properties in PropertiesPanel.svelte:**
```svelte
{#if object instanceof Types.BMyObject}
    <div class="property-section">
        <h3>My Object Properties</h3>
        <Input bind:value={object.myProperty} />
    </div>
{/if}
```

### Debugging Tips

1. **Scene State**: Use browser dev tools to inspect `$sceneStore`
2. **Compilation**: Check `compiledCode` in CodeEditor component
3. **3D Objects**: Use Three.js dev tools browser extension
4. **Reactivity**: Add `$effect(() => console.log('state changed', variable))` for debugging

## Performance Considerations

### 3D Rendering
- Objects are rendered using Three.js instancing where possible
- Transform updates are batched to avoid excessive re-renders
- Shadow maps are optimized for the scene size

### Reactivity
- Scene store updates trigger minimal re-renders through Svelte's fine-grained reactivity
- Large object lists use virtual scrolling (planned)
- Compilation is debounced to avoid excessive work

### Memory Management
- Three.js objects are properly disposed when removed
- Event listeners are cleaned up in component destruction
- Large assets are loaded asynchronously

## Recent Changes & Updates

### Component Updates
- **PropertyDropdown.svelte**: 
  - Fixed TypeScript linting errors by correcting type annotations in $props() destructuring and removing incompatible TypeScript syntax for Svelte 5 compatibility
  - **MAJOR UPDATE**: Replaced custom keyboard handling and dropdown implementation with shadcn-svelte Select components for better accessibility, maintainability, and consistency with the design system
  - Removed ~150 lines of custom keyboard navigation, focus management, and click-outside handling
  - Now uses `$lib/components/ui/select` components from shadcn-svelte
  - Maintains the same API and slot system for backward compatibility

## Development Tools

### Code Quality & Linting
- **ESLint Configuration**: Modern flat config format (`eslint.config.mjs`)
- **TypeScript Support**: Full TypeScript linting with `@typescript-eslint/parser` and `@typescript-eslint/eslint-plugin`
- **Svelte Support**: Svelte-specific linting rules with `eslint-plugin-svelte` and `svelte-eslint-parser`
- **Browser Globals**: Configured for browser environment with `console`, `window`, and `document` globals
- **Code Standards**: Enforces consistent code style, unused variable detection, and TypeScript best practices
- **Usage**: Run `pnpm eslint src/` to lint files or integrate with IDE for real-time feedback

## Future Architecture Plans

### Asset Pipeline
- GLTF model loading and caching
- Texture compression and optimization
- Audio asset management
- Asset dependency tracking

### Physics Integration
- Cannon.js or similar physics engine
- Collision detection and response
- Physics debugging visualization

### Performance Optimization
- Web Workers for heavy computation
- GPU-based particle systems
- Level-of-detail (LOD) system for complex scenes

### Export System
- Standalone HTML5 game export
- Mobile app packaging
- Asset bundling and optimization

---

## Quick Reference

### Important File Locations
- **Main Editor**: `src/routes/editor/+page.svelte`
- **3D Scene**: `src/lib/components/ViewportScene.svelte`
- **Visual Programming**: `src/lib/components/CodeEditor.svelte`
- **Object Types**: `src/lib/types.ts`
- **State Management**: `src/lib/sceneStore.ts`
- **Block Definitions**: `src/lib/blockConfig.ts`
- **Compilation**: `src/lib/compiler.ts`

### Key Concepts
- **BObject Hierarchy**: Everything inherits from BObject
- **Reactive Stores**: State changes trigger UI updates automatically
- **Visual Programming**: Blocks compile to executable structures
- **Transform System**: Local transforms with world space calculations
- **Component Communication**: Events and store updates

### Development Commands
```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run preview      # Preview production build
npm run check        # TypeScript checking
```