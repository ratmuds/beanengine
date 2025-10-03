<script lang="ts">
    // @ts-nocheck
    import { useTask, useThrelte } from "@threlte/core";
    import { onMount, onDestroy } from "svelte";
    import * as THREE from "three";
    import { RGBELoader } from "three/examples/jsm/loaders/RGBELoader.js";
    import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
    import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
    import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
    import { SSAOPass } from "three/examples/jsm/postprocessing/SSAOPass.js";
    import { SMAAPass } from "three/examples/jsm/postprocessing/SMAAPass.js";
    import { BokehPass } from "three/examples/jsm/postprocessing/BokehPass.js";
    import { AfterimagePass } from "three/examples/jsm/postprocessing/AfterimagePass.js";
    import RAPIER from "@dimforge/rapier3d-compat";
    import { GameObjectManager } from "$lib/runtime";
    import { sceneStore } from "$lib/sceneStore";
    import { runtimeStore } from "$lib/runtimeStore";
    import { materialStore } from "$lib/materialStore";

    const { renderer } = useThrelte();
    let gameScene: THREE.Scene;
    let gameCamera: THREE.Camera;
    let gameObjectManager: GameObjectManager;
    let physicsInitialized = false;
    let canvasElement: HTMLCanvasElement;
    let eventQueue: RAPIER.EventQueue | null = null;
    let composer: EffectComposer | null = null;

    // Compute aspect from canvas and propagate it to cameras
    function updateAspectFromCanvas() {
        if (!canvasElement) return;
        const rect = canvasElement.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
            const aspect = rect.width / rect.height;
            // Update all scene cameras via manager
            gameObjectManager?.updateCameraAspect(aspect);
            // Also update default camera if used
            const persp = gameCamera as THREE.PerspectiveCamera;
            if (gameCamera && (persp as any).isPerspectiveCamera) {
                persp.aspect = aspect;
                persp.updateProjectionMatrix();
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

    // Setup stunning post-processing effects
    function setupPostProcessing() {
        if (!renderer || !gameScene || !gameCamera) {
            runtimeStore.warn(
                "Cannot setup post-processing: missing renderer, scene, or camera",
                "GameRuntime"
            );
            return;
        }

        try {
            // Create effect composer
            composer = new EffectComposer(renderer);
            composer.setSize(window.innerWidth, window.innerHeight);

            // Base render pass
            const renderPass = new RenderPass(gameScene, gameCamera);
            composer.addPass(renderPass);

            // SSAO (Screen Space Ambient Occlusion)
            const ssaoPass = new SSAOPass(
                gameScene,
                gameCamera,
                window.innerWidth,
                window.innerHeight
            );
            // More visible settings for better depth perception
            ssaoPass.kernelRadius = 32; // Larger radius for more prominent shadows
            ssaoPass.minDistance = 0.001; // Tighter minimum distance
            ssaoPass.maxDistance = 0.2; // Wider maximum distance
            ssaoPass.output = SSAOPass.OUTPUT.Default;
            composer.addPass(ssaoPass);

            // Bloom - Beautiful glow for bright areas
            const bloomPass = new UnrealBloomPass(
                new THREE.Vector2(window.innerWidth, window.innerHeight),
                0.1, // strength - nice and subtle now
                0.0, // radius
                0.15 // threshold
            );
            composer.addPass(bloomPass);

            // Motion Blur
            const motionBlurPass = new AfterimagePass(0.6);
            composer.addPass(motionBlurPass);

            // Depth of Field (Bokeh)
            const bokehPass = new BokehPass(gameScene, gameCamera, {
                focus: 15.0, // Focus distance
                aperture: 0.0001, // Blur strength
                maxblur: 0.01, // Maximum blur amount
            });
            composer.addPass(bokehPass);

            // SMAA (Anti-aliasing) - Smooth edges
            const smaaPass = new SMAAPass(
                window.innerWidth,
                window.innerHeight
            );
            composer.addPass(smaaPass);

            // Handle window resize
            const originalResize = updateAspectFromCanvas;
            window.addEventListener("resize", () => {
                if (composer) {
                    composer.setSize(window.innerWidth, window.innerHeight);
                }
            });
        } catch (error) {
            runtimeStore.error(
                `Failed to setup post-processing: ${error}`,
                "GameRuntime"
            );
        }
    }

    onMount(async () => {
        // Reset runtime-only overrides at start of play mode
        runtimeStore.clearAllPropertyOverrides?.();
        // Create a separate scene for game runtime
        runtimeStore.info("Starting ThreeJS scene...", "GameRuntime");
        gameScene = new THREE.Scene();

        // Load HDRI environment map for beautiful reflections and lighting
        const pmremGenerator = new THREE.PMREMGenerator(renderer);
        pmremGenerator.compileEquirectangularShader();

        const hdriLoader = new RGBELoader();
        try {
            // Load a default HDRI
            const hdriTexture = await hdriLoader.loadAsync(
                "https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/1k/kloppenheim_06_puresky_1k.hdr"
            );

            const envMap =
                pmremGenerator.fromEquirectangular(hdriTexture).texture;
            gameScene.environment = envMap;
            gameScene.background = envMap;

            hdriTexture.dispose();
            pmremGenerator.dispose();

            runtimeStore.info(
                "HDRI environment loaded successfully",
                "GameRuntime"
            );
        } catch (error) {
            runtimeStore.warn(`Failed to load HDRI: ${error}`, "GameRuntime");
            // Fallback to gradient background
            gameScene.background = new THREE.Color(0x87ceeb);
        }

        // Configure renderer for better visuals
        if (renderer) {
            console.log("Configuring renderer for better visuals...");

            // Enable ACESFilmic tone mapping for cinematic look
            renderer.toneMapping = THREE.ACESFilmicToneMapping;
            renderer.toneMappingExposure = 1.0;

            // Enable shadows for depth and realism
            //renderer.shadowMap.enabled = true;
            //renderer.shadowMap.type = THREE.PCFSoftShadowMap; // Soft shadows

            // Enable physically correct lighting
            renderer.useLegacyLights = false;

            // Output encoding for proper color representation
            renderer.outputColorSpace = THREE.SRGBColorSpace;

            // Enable HDR rendering
            renderer.toneMapping = THREE.ACESFilmicToneMapping;

            runtimeStore.info(
                "Enhanced renderer with better settings",
                "GameRuntime"
            );
        } else {
            runtimeStore.warn("Renderer not available!", "GameRuntime");
        }

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
            gameCamera = sceneCamera as THREE.Camera;
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

        // Setup post-processing effects for stunning visuals
        runtimeStore.info(
            "Setting up post-processing effects...",
            "GameRuntime"
        );
        setupPostProcessing();

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
                    // Use post-processing composer if available, otherwise fallback to direct render
                    if (composer) {
                        composer.render();
                    } else {
                        renderer.render(gameScene, activeCamera);
                    }
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

        // Clean up post-processing composer
        if (composer) {
            composer = null;
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
