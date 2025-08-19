<script lang="ts">
    import { T } from "@threlte/core";
    import {
        Grid,
        OrbitControls,
        TransformControls,
        interactivity,
        Outlines,
    } from "@threlte/extras";
    import * as Types from "$lib/types";

    let {
        sceneStore,
        selectedObject = $bindable(-1),
        activeTool = "select",
        transformMode = "translate",
        transformSpace = "local",
    } = $props();

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
        object.rotation.w,
    ]}
    {@const scale = [object.scale.x, object.scale.y, object.scale.z]}
    <T.Group
        bind:ref={groupRefs[object.id]}
        {position}
        quaternion={rotation}
        {scale}
    >
        <T.Mesh
            castShadow
            receiveShadow
            onclick={() => {
                selectedObject = object.id;
            }}
        >
            <T.BoxGeometry args={[1, 1, 1]} />
            <T.MeshStandardMaterial color={object.color || "#ffffff"} />

            {#if selectedObject === object.id}
                <Outlines color="#00aaff" />
            {/if}
        </T.Mesh>
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
                }
            }}
        />
    {/if}
{/each}

<Grid cellColor="#303030" sectionColor="#353535" />
