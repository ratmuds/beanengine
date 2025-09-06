<script lang="ts">
    import { T, useTask, useThrelte } from "@threlte/core";
    import { onMount, onDestroy } from "svelte";
    import * as THREE from "three";
    import { CodeInterpreter } from "$lib/interpreter.js";
    import { createRuntimeContext } from "$lib/compiler.js";
    import * as Types from "$lib/types";

    let { sceneStore, compiledCode = [] } = $props();

    const { renderer } = useThrelte();
    let gameScene: THREE.Scene;
    let gameCamera: THREE.PerspectiveCamera;
    let testCubeRef: THREE.Mesh;
    let interpreter: CodeInterpreter;

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

    function startScript(script: Types.BScript) {
        // Get parent, fallback to script itself if no parent
        const targetObject = script.parent;

        if (!targetObject) {
            throw new Error("Script has no parent");
        }

        // Create interpreter
        interpreter = new CodeInterpreter(script.code, targetObject);

        // Create variables map from sceneStore
        const variables = sceneStore.getVariables();
        const variablesMap = variables.reduce((acc, v) => {
            acc[v.name] = { value: v.value, type: v.type };
            return acc;
        }, {});

        // Create full runtime context
        const context = createRuntimeContext(variablesMap);
        context.gameObject = targetObject;
        context.scene = gameScene;

        interpreter.run(context);
    }

    onMount(() => {
        // Create a separate scene for game runtime
        gameScene = new THREE.Scene();

        // Create a separate camera for game runtime
        gameCamera = new THREE.PerspectiveCamera(
            75,
            window.innerWidth / window.innerHeight,
            0.1,
            1000
        );
        gameCamera.position.set(10, 10, 5);

        // Initialize scene objects
        let sceneObjects = $sceneStore.getScene().objects;
        let sceneCamera = null;

        for (let i = 0; i < sceneObjects.length; i++) {
            const obj = sceneObjects[i];

            if (obj instanceof Types.BNode3D) {
                let mesh = null;

                if (obj instanceof Types.BPart) {
                    // Create mesh for BPart objects
                    let geometry;
                    if (obj.meshSource?.type === "primitive") {
                        switch (obj.meshSource.value) {
                            case "block":
                                geometry = new THREE.BoxGeometry(
                                    obj.scale.x,
                                    obj.scale.y,
                                    obj.scale.z
                                );
                                break;
                            case "sphere":
                                geometry = new THREE.SphereGeometry(
                                    Math.max(
                                        obj.scale.x,
                                        obj.scale.y,
                                        obj.scale.z
                                    ) / 2,
                                    32,
                                    32
                                );
                                break;
                            case "cylinder":
                                geometry = new THREE.CylinderGeometry(
                                    obj.scale.x / 2,
                                    obj.scale.x / 2,
                                    obj.scale.y,
                                    32
                                );
                                break;
                            case "cone":
                                geometry = new THREE.ConeGeometry(
                                    obj.scale.x / 2,
                                    obj.scale.y,
                                    32
                                );
                                break;
                            case "plane":
                                geometry = new THREE.PlaneGeometry(
                                    obj.scale.x,
                                    obj.scale.z
                                );
                                break;
                            default:
                                geometry = new THREE.BoxGeometry(
                                    obj.scale.x,
                                    obj.scale.y,
                                    obj.scale.z
                                );
                        }
                    } else {
                        // Default to box for non-primitive meshes
                        geometry = new THREE.BoxGeometry(
                            obj.scale.x,
                            obj.scale.y,
                            obj.scale.z
                        );
                    }

                    mesh = new THREE.Mesh(
                        geometry,
                        new THREE.MeshStandardMaterial({
                            color: obj.color || "#ffffff",
                        })
                    );
                } else if (obj instanceof Types.BCamera) {
                    // Store camera reference for later use
                    if (!sceneCamera) {
                        console.log("Found camera");
                        sceneCamera = obj;
                    } else {
                        console.log(
                            "Found multiple cameras, using first one.",
                            obj
                        );
                    }

                    // Create visual representation for camera (wireframe cone)
                    mesh = new THREE.Mesh(
                        new THREE.ConeGeometry(0.5, 1, 4),
                        new THREE.MeshBasicMaterial({
                            color: "#ffff00",
                            wireframe: true,
                        })
                    );
                } else if (obj instanceof Types.BLight) {
                    // Create visual representation for light (sphere)
                    mesh = new THREE.Mesh(
                        new THREE.SphereGeometry(0.3, 16, 16),
                        new THREE.MeshBasicMaterial({
                            color: obj.color || "#ffffff",
                        })
                    );

                    // Add actual light to scene
                    const light = new THREE.PointLight(
                        obj.color || "#ffffff",
                        1,
                        100
                    );
                    light.position.copy(obj.position);
                    light.name = obj.id + "_light";
                    gameScene.add(light);
                } else {
                    // Default representation for other BNode3D objects
                    mesh = new THREE.Mesh(
                        new THREE.BoxGeometry(0.5, 0.5, 0.5),
                        new THREE.MeshBasicMaterial({
                            color: "#888888",
                            wireframe: true,
                        })
                    );
                }

                if (mesh) {
                    mesh.position.copy(obj.position);
                    mesh.quaternion.copy(obj.rotation);
                    mesh.scale.copy(obj.scale);
                    mesh.name = obj.id;

                    if (!testCubeRef) {
                        testCubeRef = mesh; // Bind first mesh for animation
                    }

                    gameScene.add(mesh);
                }
            }
        }

        // Use scene camera if available, otherwise use default
        if (sceneCamera) {
            console.log("Scene camera found:", sceneCamera);
            console.log("Scene camera position:", sceneCamera.position);
            console.log("Scene camera rotation:", sceneCamera.rotation);
            gameCamera.position.copy(sceneCamera.position);
            gameCamera.quaternion.copy(sceneCamera.rotation);
            gameCamera.fov = sceneCamera.fov || 75;
            gameCamera.updateProjectionMatrix();
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

        // Run scripts
        for (let i = 0; i < sceneObjects.length; i++) {
            const obj = sceneObjects[i];
            if (obj instanceof Types.BScript) {
                startScript(obj);
            }
        }
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

    // Execute compiled code when it changes
    /*$effect(() => {
        if (compiledCode && compiledCode.length > 0 && interpreter) {
            interpreter.setCode(compiledCode);

            // Create variables map
            const variablesMap = variables.reduce((acc, v) => {
                acc[v.name] = { value: v.value, type: v.type };
                return acc;
            }, {});

            // Create full runtime context
            const context = createRuntimeContext(variablesMap);
            context.gameObject = $sceneStore.getScene().objects[0]; // First object
            context.mesh = testCubeRef;
            context.scene = gameScene;

            interpreter.run(context);
        }
    });*/
</script>

<!-- GameRuntime uses a separate Three.js scene with custom render loop -->
<!-- No Threlte components needed here as we render directly -->
