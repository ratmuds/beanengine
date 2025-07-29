<script lang="ts">
    import { T, useTask, useThrelte } from "@threlte/core";
    import { Grid, OrbitControls } from "@threlte/extras";
    import { onMount } from "svelte";
    import * as THREE from "three";

    let { sceneStore } = $props();

    // Test cube refs for 60fps animation
    const { scene } = useThrelte();
    let testCubeRef: THREE.Mesh;
    let testMaterialRef: THREE.MeshStandardMaterial;

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

            scene.add(mesh);
        }
    });

    // TODO: handle objects having children (local position)
    // TODO: handle objects having children (local position)
    // TODO: handle objects having children (local position)
</script>

<T.PerspectiveCamera makeDefault position={[10, 10, 5]}>
    <OrbitControls />
</T.PerspectiveCamera>

<T.DirectionalLight position={[3, 10, 7]} intensity={Math.PI} castShadow />

<T.AmbientLight intensity={0.3} />

<!-- Test Cube - 60fps animation via useTask -->
<!--<T.Mesh bind:ref={testCubeRef} position={[5, 2, 0]}>
    <T.BoxGeometry args={[1, 1, 1]} />
    <T.MeshStandardMaterial bind:ref={testMaterialRef} />
</T.Mesh>-->

<Grid cellColor="#303030" sectionColor="#00ff00" />
