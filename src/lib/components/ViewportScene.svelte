<script lang="ts">
    import { T } from "@threlte/core";
    import {
        Grid,
        OrbitControls,
        TransformControls,
        interactivity,
        Outlines,
    } from "@threlte/extras";

    let {
        sceneStore,
        activeTool = "select",
        transformMode = "translate",
        transformSpace = "local",
    } = $props();

    let selectedObjectId = $state(null);
    let isDragging = $state(false);
    let sceneObjects = $derived($sceneStore.getScene().objects);

    $effect(() => {
        console.log(sceneObjects);
        console.log($sceneStore);
    });

    interactivity();
</script>

<T.PerspectiveCamera makeDefault position={[10, 10, 5]}>
    <OrbitControls />
</T.PerspectiveCamera>

<T.DirectionalLight position={[3, 10, 7]} intensity={Math.PI} castShadow />

<T.AmbientLight intensity={0.3} />

<!-- Scene Rendering -->
{#each $sceneStore.getScene().objects as object (object.id)}
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
        bind:ref={object.groupRef}
        {position}
        quaternion={rotation}
        {scale}
    >
        <T.Mesh
            castShadow
            receiveShadow
            onclick={() => {
                if (!isDragging) {
                    selectedObjectId = object.id;
                }
            }}
        >
            <T.BoxGeometry args={[1, 1, 1]} />
            <T.MeshStandardMaterial color={object.color || "#ffffff"} />

            {#if selectedObjectId === object.id}
                <Outlines color="#00aaff" />
            {/if}
        </T.Mesh>
    </T.Group>

    {#if activeTool !== "select" && selectedObjectId === object.id}
        <TransformControls
            object={object.groupRef}
            mode={transformMode}
            space={transformSpace}
            translationSnap={0.5}
            rotationSnap={Math.PI / 12}
            scaleSnap={0.1}
            ondragstart={() => {
                isDragging = true;
            }}
            ondragend={() => {
                setTimeout(() => {
                    isDragging = false;
                }, 10);
            }}
            onobjectchange={(e) => {
                const transform = e.target.object;
                object.position.x = transform.position.x;
                object.position.y = transform.position.y;
                object.position.z = transform.position.z;
                object.rotation.x = transform.rotation.x;
                object.rotation.y = transform.rotation.y;
                object.rotation.z = transform.rotation.z;
                object.scale.x = transform.scale.x;
                object.scale.y = transform.scale.y;
                object.scale.z = transform.scale.z;
            }}
        />
    {/if}
{/each}

<Grid cellColor="#303030" sectionColor="#353535" />
