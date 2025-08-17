<script lang="ts">
    import { T, useTask, useThrelte } from "@threlte/core";
    import { Grid, OrbitControls } from "@threlte/extras";
    import { onMount, onDestroy } from "svelte";
    import * as THREE from "three";
    import { chipConfig } from "$lib/chipConfig.js";

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

    // Evaluates a parameter, which can be a literal value or a chip object.
    async function evaluateChip(param, context) {
        // If the parameter is not an object or doesn't have a type, it's a literal value.
        if (typeof param !== 'object' || !param || !param.type) {
            return param;
        }

        // It's a chip, so find its configuration.
        const config = chipConfig[param.type];
        if (!config || !config.evaluate) {
            console.warn(`No evaluate function found for chip type: ${param.type}`);
            return undefined; // Or some other default/error value
        }

        // The context for the chip's evaluate function needs access to the evaluator itself
        // to allow for recursive evaluation.
        const evaluationContext = {
            ...context,
            evaluateChip: (p) => evaluateChip(p, context) // Pass the main context down
        };

        return config.evaluate(param, evaluationContext);
    }

    // Simple interpreter for compiled visual code
    async function executeBlock(block, context) {
        // Resolve all parameters before executing the block
        const params = {};
        for (const key in block.params) {
            params[key] = await evaluateChip(block.params[key], context);
        }

        switch (block.type) {
            case "say":
                console.log(
                    `SAY: "${params.text}" for ${params.duration}s`
                );
                if (params.duration) {
                    await sleep(parseFloat(params.duration) * 1000);
                }
                break;
            case "moveto":
                console.log(`MOVE TO:`, params.position);
                if (testCubeRef && params.position && typeof params.position === 'object') {
                    testCubeRef.position.set(params.position.x, params.position.y, params.position.z);
                }
                break;
            case "wait":
                const duration = parseFloat(params.duration) * 1000;
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

        const context = {
            variables: variables.reduce((acc, v) => {
                acc[v.name] = v;
                return acc;
            }, {})
        };

        for (const block of blocks) {
            if (!isRunning) {
                console.log("Execution stopped prematurely.");
                return; // Exit the function early
            }

            await executeBlock(block, context);
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
