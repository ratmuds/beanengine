<script lang="ts">
    import { T } from "@threlte/core";
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

    let {
        sceneStore,
        selectedObject = $bindable(-1),
        activeTool = "select",
        transformMode = "translate",
        transformSpace = "local",
    } = $props();

    import { assetStore } from "$lib/assetStore";
    import { materialStore } from "$lib/materialStore";

    interactivity();

    // Store group references for each object
    let groupRefs = $state({});

    // TODO: handle objects having children (local position)
    // TODO: handle objects having children (local position)
    // TODO: handle objects having children (local position)
</script>

<T.PerspectiveCamera makeDefault position={[10, 10, 5]}>
    <OrbitControls />
</T.PerspectiveCamera>

<T.DirectionalLight position={[3, 10, 7]} intensity={Math.PI} castShadow />

<T.AmbientLight intensity={0.3} />

<!-- Scene Rendering -->
{#each $sceneStore
    .getScene()
    .objects.filter((obj) => obj instanceof Types.BNode3D) as object (object.id)}
    {@const position = [
        object.position.x,
        object.position.y,
        object.position.z,
    ]}
    {@const rotation = [
        object.rotation.x,
        object.rotation.y,
        object.rotation.z,
    ]}
    {@const scale = [object.scale.x, object.scale.y, object.scale.z]}
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
                {#if object.meshSource.type === "primitive"}
                    {#if object.meshSource.value === "block"}
                        <T.BoxGeometry args={[1, 1, 1]} />
                    {/if}

                    {#if object.meshSource.value === "sphere"}
                        <T.SphereGeometry args={[1, 32, 32]} />
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
                    {#await useGltf(assetStore.getAsset(object.meshSource.value).url) then gltf}
                        <T is={gltf.scene} />
                    {/await}
                {/if}

                <!-- Material Rendering -->
                {#if $materialStore.getMaterial(object.material)}
                    {@const material = $materialStore.getMaterial(
                        object.material
                    )}
                    {#if material.type === "basic"}
                        <!-- Basic Material -->
                        {#if material.textures.albedo && $assetStore.getAsset(material.textures.albedo)}
                            <T.MeshStandardMaterial
                                color={material.color}
                                map={$assetStore.getAsset(
                                    material.textures.albedo
                                ).url}
                            />
                        {:else}
                            <T.MeshStandardMaterial color={material.color} />
                        {/if}
                    {:else if material.type === "pbr"}
                        <!-- PBR Material -->
                        <T.MeshStandardMaterial
                            color={material.color}
                            map={material.textures.albedo &&
                            $assetStore.getAsset(material.textures.albedo)
                                ? useTexture(
                                      $assetStore.getAsset(
                                          material.textures.albedo
                                      ).url
                                  )
                                : null}
                            normalMap={material.textures.normal &&
                            $assetStore.getAsset(material.textures.normal)
                                ? $assetStore.getAsset(material.textures.normal)
                                      .url
                                : null}
                            metalnessMap={material.textures.metallic &&
                            $assetStore.getAsset(material.textures.metallic)
                                ? $assetStore.getAsset(
                                      material.textures.metallic
                                  ).url
                                : null}
                            roughnessMap={material.textures.roughness &&
                            $assetStore.getAsset(material.textures.roughness)
                                ? $assetStore.getAsset(
                                      material.textures.roughness
                                  ).url
                                : null}
                            aoMap={material.textures.ao &&
                            $assetStore.getAsset(material.textures.ao)
                                ? $assetStore.getAsset(material.textures.ao).url
                                : null}
                            emissiveMap={material.textures.emission &&
                            $assetStore.getAsset(material.textures.emission)
                                ? $assetStore.getAsset(
                                      material.textures.emission
                                  ).url
                                : null}
                        />
                    {/if}
                {:else}
                    <!-- Fallback to object color -->
                    <T.MeshStandardMaterial color={object.color || "#ffffff"} />
                {/if}

                {#if selectedObject === object.id}
                    <Outlines color="#00aaff" />
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

    {#if activeTool !== "select" && selectedObject === object.id}
        <TransformControls
            object={groupRefs[object.id]}
            mode={transformMode}
            space={transformSpace}
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
                }
            }}
        />
    {/if}
{/each}

<Grid cellColor="#303030" sectionColor="#353535" />
