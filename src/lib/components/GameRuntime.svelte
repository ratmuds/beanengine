<script lang="ts">
    import { useTask, useThrelte } from "@threlte/core";
    import { onMount, onDestroy } from "svelte";
    import * as THREE from "three";
    import RAPIER from "@dimforge/rapier3d-compat";
    import { GameObjectManager } from "$lib/runtime";
    import { sceneStore } from "$lib/sceneStore";
    import { runtimeStore } from "$lib/runtimeStore";
    import { materialStore } from "$lib/materialStore";

    const { renderer } = useThrelte();
    let gameScene: THREE.Scene;
    let gameCamera: THREE.PerspectiveCamera;
    let gameObjectManager: GameObjectManager;
    let physicsInitialized = false;
    let canvasElement: HTMLCanvasElement;
    let eventQueue: RAPIER.EventQueue | null = null;

    // Compute aspect from canvas and propagate it to cameras
    function updateAspectFromCanvas() {
        if (!canvasElement) return;
        const rect = canvasElement.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
            const aspect = rect.width / rect.height;
            // Update all scene cameras via manager
            gameObjectManager?.updateCameraAspect(aspect);
            // Also update default camera if used
            if (gameCamera && gameCamera.isPerspectiveCamera) {
                gameCamera.aspect = aspect;
                gameCamera.updateProjectionMatrix();
            }
        }
    }

    // Input handling
    function handleMouseDown(event: MouseEvent) {
        const button =
            event.button === 0
                ? "left"
                : event.button === 1
                  ? "middle"
                  : "right";
        runtimeStore.setMouseButton(button, true);
    }

    function handleMouseUp(event: MouseEvent) {
        const button =
            event.button === 0
                ? "left"
                : event.button === 1
                  ? "middle"
                  : "right";
        runtimeStore.setMouseButton(button, false);
    }

    function handleMouseMove(event: MouseEvent) {
        if (canvasElement) {
            if (runtimeStore.isMouseCaptured()) {
                // Use movementX/Y for captured mouse (pointer lock)
                runtimeStore.setMouseDelta(event.movementX, event.movementY);
            } else {
                // Use regular mouse position for uncaptured mouse
                const rect = canvasElement.getBoundingClientRect();
                const x = event.clientX - rect.left;
                const y = event.clientY - rect.top;
                runtimeStore.setMousePosition(x, y);
            }
        }
    }

    function handleKeyDown(event: KeyboardEvent) {
        runtimeStore.setKey(event.key, true);
    }

    function handleKeyUp(event: KeyboardEvent) {
        runtimeStore.setKey(event.key, false);
    }

    function handleContextMenu(event: MouseEvent) {
        event.preventDefault(); // Prevent right-click context menu
    }

    // 60fps animation using useTask
    useTask((delta) => {
        // Check if physics engine working
        if (!physicsInitialized && sceneStore.getPhysicsInitialized()) {
            physicsInitialized = true;
        }

        // Step physics world
        if (physicsInitialized) {
            const world = sceneStore?.getPhysicsWorld();
            if (world) {
                if (!eventQueue) {
                    eventQueue = new RAPIER.EventQueue(true);
                }
                world.step(eventQueue);
                eventQueue.drainCollisionEvents(
                    (handle1: number, handle2: number, started: boolean) => {
                        runtimeStore.handleCollisionEvent(
                            handle1,
                            handle2,
                            started
                        );
                    }
                );
                runtimeStore.emitCollisionStayFrame();
            }
        }

        // Update game objects
        if (gameObjectManager) {
            gameObjectManager.update(delta);
        }

        // Reset mouse delta after each frame to prevent it from staying high
        runtimeStore.resetMouseDelta();
    });

    onMount(async () => {
        // Reset runtime-only overrides at start of play mode
        runtimeStore.clearAllPropertyOverrides?.();
        // Create a separate scene for game runtime
        runtimeStore.info("Starting ThreeJS scene...", "GameRuntime");
        gameScene = new THREE.Scene();

        // Create GameObjectManager
        runtimeStore.info("Starting GameObjectManager...", "GameRuntime");
        gameObjectManager = new GameObjectManager(gameScene);

        // Register GameObjectManager with runtimeStore for global access
        runtimeStore.setGameObjectManager(gameObjectManager);

        // Initialize from scene store
        runtimeStore.info("Initializing scene...", "GameRuntime");
        const sceneCamera = gameObjectManager.initializeFromScene(sceneStore);
        console.warn("THE SCENE CAMERA:", sceneCamera);

        // Use scene camera if available, otherwise create default
        if (sceneCamera) {
            gameCamera = sceneCamera as THREE.PerspectiveCamera;
            runtimeStore.info("Using scene camera...", "GameRuntime");
            console.log("Using scene camera:", gameCamera.position);
        } else {
            gameCamera = new THREE.PerspectiveCamera(
                75,
                window.innerWidth / window.innerHeight,
                0.1,
                1000
            );
            gameCamera.position.set(10, 10, 5);
            console.log("Using default camera:", gameCamera.position);
        }

        // Setup default lighting
        runtimeStore.info("Setting up default lighting...", "GameRuntime");
        gameObjectManager.setupDefaultLighting();

        // Get the canvas element and attach event listeners
        canvasElement = renderer.domElement;
        canvasElement.tabIndex = 0; // Make canvas focusable for keyboard events

        // Set canvas element in runtime store for mouse capture functionality
        console.log(canvasElement);
        runtimeStore.setCanvasElement(canvasElement);

        // Initialize camera aspect from canvas
        updateAspectFromCanvas();

        // Mouse events
        canvasElement.addEventListener("mousedown", handleMouseDown);
        canvasElement.addEventListener("mouseup", handleMouseUp);
        canvasElement.addEventListener("mousemove", handleMouseMove);
        canvasElement.addEventListener("contextmenu", handleContextMenu);

        // Keyboard events - attach to window for global capture
        window.addEventListener("keydown", handleKeyDown);
        window.addEventListener("keyup", handleKeyUp);

        // Resize event to keep camera aspect in sync with canvas
        window.addEventListener("resize", updateAspectFromCanvas);

        // Focus canvas to ensure it receives events
        canvasElement.focus();

        // Reset input state when starting
        runtimeStore.resetInputState();

        // Start custom render loop
        runtimeStore.info("Starting custom render loop...", "GameRuntime");
        startRenderLoop();
    });

    // Custom render loop for the game scene
    let animationId: number;

    function startRenderLoop() {
        function render() {
            if (gameScene && renderer) {
                const activeCamera =
                    gameObjectManager?.getCamera() ?? gameCamera;
                if (activeCamera) {
                    renderer.render(gameScene, activeCamera);
                }
            }
            animationId = requestAnimationFrame(render);
        }
        render();
    }

    onDestroy(() => {
        // Clear overrides on stop as well
        runtimeStore.clearAllPropertyOverrides?.();
        if (animationId) {
            cancelAnimationFrame(animationId);
        }

        // Clean up event listeners
        if (canvasElement) {
            canvasElement.removeEventListener("mousedown", handleMouseDown);
            canvasElement.removeEventListener("mouseup", handleMouseUp);
            canvasElement.removeEventListener("mousemove", handleMouseMove);
            canvasElement.removeEventListener("contextmenu", handleContextMenu);
        }

        window.removeEventListener("keydown", handleKeyDown);
        window.removeEventListener("keyup", handleKeyUp);
        window.removeEventListener("resize", updateAspectFromCanvas);

        // Clean up canvas element in runtime store
        runtimeStore.setCanvasElement(null);

        // Reset input state when stopping
        runtimeStore.resetInputState();

        // Clean up GameObjects and their physics components
        if (gameObjectManager) {
            gameObjectManager.destroy();
            // Unregister from runtimeStore
            runtimeStore.setGameObjectManager(null);
        }
    });
</script>

<!-- Overlay UI is rendered in the editor page to avoid nesting inside the canvas -->
