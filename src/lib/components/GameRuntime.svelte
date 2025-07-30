<script lang="ts">
    import { T, useTask, useThrelte } from "@threlte/core";
    import { Grid, OrbitControls } from "@threlte/extras";
    import { onMount, onDestroy } from "svelte";
    import * as THREE from "three";

    let { sceneStore, compiledCode = [] } = $props();

    // Test cube refs for 60fps animation
    const { renderer } = useThrelte();
    let gameScene: THREE.Scene;
    let gameCamera: THREE.PerspectiveCamera;
    let testCubeRef: THREE.Mesh;
    let testMaterialRef: THREE.MeshStandardMaterial;

    // --- Game Loop and Execution ---
    let isRunning = $state(false);
    const TICK_DELAY_MS = 50; // Delay between block executions

    // Helper to pause execution
    function sleep(ms: number) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }

    // 60fps animation using useTask
    /*useTask((delta) => {
        if (testCubeRef) {
            // Rotate the test cube
            testCubeRef.rotation.x += delta * 2;
            testCubeRef.rotation.y += delta * 1.5;
        }

        if (testMaterialRef) {
            // Change color over time using HSL
            const time = performance.now() * 0.001; // Convert to seconds
            const hue = (time * 0.5) % 1; // Cycle through hues
            testMaterialRef.color.setHSL(hue, 0.8, 0.6);
        }
    });*/

    onMount(() => {
        // Create a separate scene for game runtime
        gameScene = new THREE.Scene();
        
        // Create a separate camera for game runtime
        gameCamera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        gameCamera.position.set(10, 10, 5);
        
        // Initialize scene objects
        let sceneObjects = $sceneStore.getScene().objects;

        for (let i = 0; i < sceneObjects.length; i++) {
            const obj = sceneObjects[i];
            // Create a mesh for each object
            const mesh = new THREE.Mesh(
                new THREE.BoxGeometry(obj.scale.x, obj.scale.y, obj.scale.z),
                new THREE.MeshStandardMaterial({
                    color: obj.color || "#ffffff",
                })
            );

            mesh.position.copy(obj.position);
            mesh.quaternion.copy(obj.rotation);

            mesh.name = obj.id;
            testCubeRef = mesh; // Bind to testCubeRef for animation

            gameScene.add(mesh);
        }

        // Add lighting to the game scene
        const directionalLight = new THREE.DirectionalLight(0xffffff, Math.PI);
        directionalLight.position.set(3, 10, 7);
        directionalLight.castShadow = true;
        gameScene.add(directionalLight);

        const ambientLight = new THREE.AmbientLight(0xffffff, 0.3);
        gameScene.add(ambientLight);

        // Start custom render loop
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
    });

    // Simple interpreter for compiled visual code
    async function executeBlock(block) {
        switch (block.type) {
            case "say":
                console.log(
                    `SAY: "${block.params.text}" for ${block.params.duration}s`
                );
                // In a real implementation, you'd show a speech bubble here.
                // We'll simulate the duration with a wait.
                if (block.params.duration) {
                    await sleep(parseFloat(block.params.duration) * 1000);
                }
                break;
            case "moveto":
                console.log(`MOVE TO: ${block.params.position}`);

                // Parse position
                const position = block.params.position.split(",").map(Number);
                console.log(`Parsed position: ${position}`);

                if (testCubeRef && position.length === 3) {
                    testCubeRef.position.set(...position);
                }

                break;
            case "wait":
                const duration = parseFloat(block.params.duration) * 1000;
                console.log(`WAIT: ${duration}ms`);
                if (!isNaN(duration)) {
                    await sleep(duration);
                }
                break;
            default:
                console.log(`Unknown block type: ${block.type}`);
        }
    }

    // Asynchronous execution loop
    async function runCompiledCode(blocks) {
        isRunning = true;
        console.log("Starting execution:", blocks);

        for (const block of blocks) {
            if (!isRunning) {
                console.log("Execution stopped prematurely.");
                return; // Exit the function early
            }

            await executeBlock(block);
            await sleep(TICK_DELAY_MS); // Wait for next tick
        }

        if (isRunning) {
            console.log("Execution finished.");
        }
        isRunning = false;
    }

    // Execute compiled code when it changes
    $effect(() => {
        // This effect runs when `compiledCode` changes.
        // It sets up a non-reactive loop to run the code.

        // Stop any previous execution when new code arrives.
        isRunning = false;

        const code = compiledCode;
        if (code && code.length > 0) {
            // Use a timeout to schedule the run after the current reactive cycle.
            // This prevents the effect from re-triggering itself when `isRunning` changes.
            const timerId = setTimeout(() => {
                runCompiledCode(code);
            }, 50); // A small delay to ensure the old loop has time to see `isRunning = false`

            // The effect's cleanup function runs when `compiledCode` changes again, or when the component unmounts.
            return () => {
                clearTimeout(timerId);
                isRunning = false; // This ensures execution stops.
            };
        }
    });

    // TODO: handle objects having children (local position)
    // TODO: handle objects having children (local position)
    // TODO: handle objects having children (local position)
</script>

<!-- GameRuntime uses a separate Three.js scene with custom render loop -->
<!-- No Threlte components needed here as we render directly -->
