<script lang="ts">
    import {
        Grid,
        OrbitControls,
        TransformControls,
        interactivity,
        Outlines,
        useGltf,
        useTexture,
    } from "@threlte/extras";
    import * as Types from "$lib/types";
    import { sceneStore } from "$lib/sceneStore";
    import { T, useTask } from "@threlte/core";
    import { onMount } from "svelte";
    import * as SkeletonUtils from "three/addons/utils/SkeletonUtils.js";

    let {
        selectedObject = $bindable(-1),
        activeTool = "select",
        transformMode = "translate",
        transformSpace = "local",
    } = $props();

    import { assetStore } from "$lib/assetStore";
    import { materialStore } from "$lib/materialStore";

    interactivity();

    // Store group references for each object
    let groupRefs: Record<string, any> = $state({});
    let showTransformControls = $state(true);

    // Load materials
    materialStore.loadAllMaterials();

    // Workaround because Svelte reactivity breaks the transform controls so we have to recreate it everytime
    function resetTransformControlsState() {
        console.log("Resetting transform controls state...");

        showTransformControls = false;

        setTimeout(() => {
            showTransformControls = true;
        }, 10);
    }

    $effect(() => {
        // Reference the store so when it updates we can reset the transform controls state
        const scene = $sceneStore.getScene();

        resetTransformControlsState();
    });

    // TODO: handle objects having children (local position)
    // TODO: handle objects having children (local position)
    console.warn("TODO: handle objects having children (local position)");

    // Initialize particle positions
    /*onMount(() => {
        const positions = new Float32Array(particleCount * 3);
        
        for (let i = 0; i < particleCount; i++) {
            const i3 = i * 3;
            positions[i3] = (Math.random() - 0.5) * 20; // x
            positions[i3 + 1] = (Math.random() - 0.5) * 20; // y
            positions[i3 + 2] = (Math.random() - 0.5) * 20; // z
        }
        
        particlePositions = positions;
    });

    // Animate particles
    useTask((delta) => {
        time += delta;
        
        if (particlePositions.length > 0) {
            for (let i = 0; i < particleCount; i++) {
                const i3 = i * 3;
                // Simple floating animation
                particlePositions[i3 + 1] += Math.sin(time * 2 + i * 0.1) * 0.01;
                
                // Reset particles that fall too low
                if (particlePositions[i3 + 1] < -10) {
                    particlePositions[i3 + 1] = 10;
                }
            }
        }
    });*/
</script>

<T.PerspectiveCamera makeDefault position={[10, 10, 5]}>
    <OrbitControls />
</T.PerspectiveCamera>

<T.DirectionalLight position={[3, 10, 7]} intensity={Math.PI} castShadow />

<T.AmbientLight intensity={0.3} />

<!-- Scene Rendering -->
{#each $sceneStore
    .getScene()
    .objects.filter((obj) => obj instanceof Types.BNode3D)
    .filter((obj) => !obj.isDescendantOfType("storage")) as object (object.id)}
    {@const position = [
        object.position.x,
        object.position.y,
        object.position.z,
    ] as [number, number, number]}
    {@const rotation = [
        object.rotation.x,
        object.rotation.y,
        object.rotation.z,
    ] as [number, number, number]}
    {@const scale = [object.scale.x, object.scale.y, object.scale.z] as [
        number,
        number,
        number,
    ]}
    <T.Group bind:ref={groupRefs[object.id]} {position} {rotation} {scale}>
        {#if object instanceof Types.BPart}
            <!-- Render Parts with meshes -->
            <T.Mesh
                castShadow
                receiveShadow
                onclick={() => {
                    selectedObject = object.id;
                }}
            >
                {#if materialStore.getMaterial(object.material || "")?.threlteTexture}
                    <T.MeshStandardMaterial
                        map={materialStore.getMaterial(object.material || "")
                            ?.threlteTexture}
                    />
                {/if}

                {#if object.meshSource.type === "primitive"}
                    {#if object.meshSource.value === "block"}
                        <T.BoxGeometry args={[1, 1, 1]} />
                    {/if}

                    {#if object.meshSource.value === "sphere"}
                        <T.SphereGeometry args={[0.5, 32, 32]} />
                    {/if}

                    {#if object.meshSource.value === "cylinder"}
                        <T.CylinderGeometry args={[1, 1, 2, 32]} />
                    {/if}

                    {#if object.meshSource.value === "cone"}
                        <T.ConeGeometry args={[1, 2, 32]} />
                    {/if}

                    {#if object.meshSource.value === "plane"}
                        <T.PlaneGeometry args={[2, 2]} />
                    {/if}
                {:else if object.meshSource.value && assetStore.getAsset(object.meshSource.value)?.url}
                    {@const asset = assetStore.getAsset(
                        object.meshSource.value
                    )}
                    {#if asset?.url}
                        {#await useGltf(asset.url) then gltf}
                            {@const clonedScene = SkeletonUtils.clone(
                                gltf.scene
                            )}
                            <T is={clonedScene} />
                        {/await}
                    {/if}
                {/if}

                {#if selectedObject === object.id}
                    {#if object.meshSource.type === "primitive"}
                        <Outlines color="#00aaff" />
                    {/if}
                {/if}
            </T.Mesh>
        {:else if object instanceof Types.BCamera}
            <!-- Render Camera with wireframe representation -->
            <T.Mesh
                rotation={[Math.PI / 2, Math.PI / 4, 0]}
                onclick={() => {
                    selectedObject = object.id;
                }}
            >
                <T.ConeGeometry args={[0.5, 1, 4]} />
                <T.MeshBasicMaterial color="#ffff00" wireframe />

                {#if selectedObject === object.id}
                    <!-- Outlines require BufferGeometry; GLTF scene nodes may lack it -->
                    <Outlines color="#00aaff" />
                {/if}
            </T.Mesh>
        {:else if object instanceof Types.BLight}
            <!-- Render Light with sphere representation -->
            <T.Mesh
                onclick={() => {
                    selectedObject = object.id;
                }}
            >
                <T.SphereGeometry args={[0.3, 16, 16]} />
                <T.MeshBasicMaterial color={object.color || "#ffffff"} />
                {#if selectedObject === object.id}
                    <Outlines color="#00aaff" />
                {/if}
            </T.Mesh>
        {:else}
            <!-- Render other BNode3D objects with a default cube -->
            <T.Mesh
                onclick={() => {
                    selectedObject = object.id;
                }}
            >
                <T.BoxGeometry args={[0.5, 0.5, 0.5]} />
                <T.MeshBasicMaterial color="#888888" wireframe />

                {#if selectedObject === object.id}
                    <Outlines color="#00aaff" />
                {/if}
            </T.Mesh>
        {/if}
    </T.Group>

    {#if activeTool !== "select" && selectedObject === object.id && showTransformControls}
        <TransformControls
            object={groupRefs[object.id]}
            mode={transformMode as "translate" | "rotate" | "scale"}
            space={transformSpace as "local" | "world"}
            translationSnap={0.5}
            rotationSnap={Math.PI / 12}
            scaleSnap={0.1}
            onmouseUp={() => {
                const transform = groupRefs[object.id];
                if (transform) {
                    object.position.x = transform.position.x;
                    object.position.y = transform.position.y;
                    object.position.z = transform.position.z;
                    object.rotation.x = transform.rotation.x;
                    object.rotation.y = transform.rotation.y;
                    object.rotation.z = transform.rotation.z;
                    object.scale.x = transform.scale.x;
                    object.scale.y = transform.scale.y;
                    object.scale.z = transform.scale.z;

                    // Update the object in the store to trigger reactivity
                    sceneStore.updateObject(object);

                    // Reset transform controls state by recreating it due to reactivity breaking it
                    resetTransformControlsState();
                }
            }}
        />
    {/if}
{/each}

<Grid cellColor="#303030" sectionColor="#353535" />
