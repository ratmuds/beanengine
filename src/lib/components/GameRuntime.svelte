<script lang="ts">
    import { useTask, useThrelte } from "@threlte/core";
    import { onMount, onDestroy } from "svelte";
    import * as THREE from "three";
    import { GameObjectManager } from "$lib/runtime";
    import { sceneStore } from "$lib/sceneStore";
    import { runtimeStore } from "$lib/runtimeStore";

    const { renderer } = useThrelte();
    let gameScene: THREE.Scene;
    let gameCamera: THREE.PerspectiveCamera;
    let gameObjectManager: GameObjectManager;
    let physicsInitialized = false;

    // 60fps animation using useTask
    useTask((delta) => {
        // Check if physics engine working
        if (!physicsInitialized && sceneStore.getPhysicsInitialized()) {
            physicsInitialized = true;
        }

        // Step physics world
        if (physicsInitialized) {
            sceneStore?.getPhysicsWorld()?.step();
        }

        // Update game objects
        if (gameObjectManager) {
            gameObjectManager.update(delta);
        }
    });

    // Script handling is now managed by GameObjectManager and ScriptComponent
    // No need for separate startScript function

    onMount(() => {
        // Create a separate scene for game runtime
        runtimeStore.info("Starting ThreeJS scene...", "GameRuntime");
        gameScene = new THREE.Scene();

        // Create GameObjectManager
        runtimeStore.info("Starting GameObjectManager...", "GameRuntime");
        gameObjectManager = new GameObjectManager(gameScene);

        // Initialize from scene store
        runtimeStore.info("Initializing scene...", "GameRuntime");
        const sceneCamera = gameObjectManager.initializeFromScene(sceneStore);

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

        // Start custom render loop
        runtimeStore.info("Starting custom render loop...", "GameRuntime");
        startRenderLoop();
    });

    // Custom render loop for the game scene
    let animationId: number;

    function startRenderLoop() {
        function render() {
            if (gameScene && renderer && gameCamera) {
                renderer.render(gameScene, gameCamera);
            }
            animationId = requestAnimationFrame(render);
        }
        render();
    }

    onDestroy(() => {
        if (animationId) {
            cancelAnimationFrame(animationId);
        }

        // Clean up GameObjects and their physics components
        if (gameObjectManager) {
            gameObjectManager.destroy();
        }
    });

    // Script execution is now handled by ScriptComponent within GameObjectManager
</script>

<!-- GameRuntime uses a separate Three.js scene with custom render loop -->
<!-- No Threlte components needed here as we render directly -->
