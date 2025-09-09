<script lang="ts">
    import { createEventDispatcher } from "svelte";
    import { Switch } from "$lib/components/ui/switch/index.ts";
    import { Lock, Unlock, Move, RotateCcw } from "lucide-svelte";

    export let object;
    
    const dispatch = createEventDispatcher();

    function handlePositionLockChange(value) {
        const updatedObject = object.clone();
        updatedObject.positionLocked = value;
        dispatch('change', { object: updatedObject });
    }

    function handleRotationLockChange(value) {
        const updatedObject = object.clone();
        updatedObject.rotationLocked = value;
        dispatch('change', { object: updatedObject });
    }
</script>

<div class="space-y-4">
    <!-- Position Lock -->
    <div class="bg-card/40 backdrop-blur-sm border border-border/30 rounded-xl p-4 space-y-3">
        <div class="flex items-center justify-between">
            <div class="flex items-center gap-3">
                <div class="p-2 bg-blue-500/10 rounded-lg">
                    <Move class="w-4 h-4 text-blue-400" />
                </div>
                <h4 class="font-medium text-sm text-foreground/90">Position Lock</h4>
            </div>
            
            <div class="flex items-center gap-2">
                {#if object.positionLocked}
                    <Lock class="w-4 h-4 text-blue-400" />
                {:else}
                    <Unlock class="w-4 h-4 text-muted-foreground" />
                {/if}
                <Switch 
                    checked={object.positionLocked}
                    onCheckedChange={handlePositionLockChange}
                    class="data-[state=checked]:bg-blue-500 focus-visible:ring-blue-500/50"
                />
            </div>
        </div>
        
        <p class="text-xs text-muted-foreground">
            {object.positionLocked ? 'Position is locked and cannot be changed by physics' : 'Position can be modified by physics simulation'}
        </p>
    </div>

    <!-- Rotation Lock -->
    <div class="bg-card/40 backdrop-blur-sm border border-border/30 rounded-xl p-4 space-y-3">
        <div class="flex items-center justify-between">
            <div class="flex items-center gap-3">
                <div class="p-2 bg-purple-500/10 rounded-lg">
                    <RotateCcw class="w-4 h-4 text-purple-400" />
                </div>
                <h4 class="font-medium text-sm text-foreground/90">Rotation Lock</h4>
            </div>
            
            <div class="flex items-center gap-2">
                {#if object.rotationLocked}
                    <Lock class="w-4 h-4 text-purple-400" />
                {:else}
                    <Unlock class="w-4 h-4 text-muted-foreground" />
                {/if}
                <Switch 
                    checked={object.rotationLocked}
                    onCheckedChange={handleRotationLockChange}
                    class="data-[state=checked]:bg-purple-500 focus-visible:ring-purple-500/50"
                />
            </div>
        </div>
        
        <p class="text-xs text-muted-foreground">
            {object.rotationLocked ? 'Rotation is locked and cannot be changed by physics' : 'Rotation can be modified by physics simulation'}
        </p>
    </div>
</div>