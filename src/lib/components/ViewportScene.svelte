<script lang="ts">
    import { T } from "@threlte/core";
    import {
        Grid,
        OrbitControls,
        TransformControls,
        interactivity,
    } from "@threlte/extras";
    import type * as Types from "$lib/types";

    let { scene } = $props();

    interactivity();

    let cameraPosition = { x: 10, y: 10, z: 10 };
</script>

<T.PerspectiveCamera
    makeDefault
    position={[cameraPosition.x, cameraPosition.y, cameraPosition.z]}
>
    <OrbitControls />
</T.PerspectiveCamera>

<T.DirectionalLight position={[3, 10, 7]} intensity={Math.PI} castShadow />

<T.AmbientLight intensity={0.3} />

<!-- Scene Rendering -->
{#each scene.objects as object (object.id)}
    <T.Group
        key={object.id}
        position={[object.position.x, object.position.y, object.position.z]}
        rotation={[object.rotation.x, object.rotation.y, object.rotation.z]}
        scale={[object.scale.x, object.scale.y, object.scale.z]}
    >
        <T.Mesh castShadow receiveShadow>
            <T.BoxGeometry args={[1, 1, 1]} />
            <T.MeshStandardMaterial color={object.color || "#ffffff"} />
        </T.Mesh>
    </T.Group>
{/each}

<T.Group>
    <TransformControls>
        <T.Mesh position.y={1} castShadow receiveShadow>
            <T.SphereGeometry args={[1]} />
            <T.MeshStandardMaterial color="#FE3D00" toneMapped={false} />
        </T.Mesh>
    </TransformControls>
</T.Group>

<Grid cellColor="#303030" sectionColor="#353535" />
