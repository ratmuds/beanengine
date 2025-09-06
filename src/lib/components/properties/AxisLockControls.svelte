<script lang="ts">
    import { createEventDispatcher } from "svelte";
    import { Switch } from "$lib/components/ui/switch/index.ts";
    import { Lock, Unlock, Move, RotateCcw } from "lucide-svelte";

    export let object;
    
    const dispatch = createEventDispatcher();

    function handleAxisLockChange(axis, lockType, value) {
        const updatedObject = object.clone();
        const propertyName = `axisLock${lockType === 'position' ? 'Pos' : 'Rot'}${axis.toUpperCase()}`;
        updatedObject[propertyName] = value;
        dispatch('change', { object: updatedObject });
    }
</script>

<div class="space-y-4">
    <!-- Position Locks -->
    <div class="bg-card/40 backdrop-blur-sm border border-border/30 rounded-xl p-4 space-y-3">
        <div class="flex items-center gap-3 mb-3">
            <div class="p-2 bg-blue-500/10 rounded-lg">
                <Move class="w-4 h-4 text-blue-400" />
            </div>
            <h4 class="font-medium text-sm text-foreground/90">Position Locks</h4>
        </div>
        
        <div class="grid grid-cols-3 gap-3">
            <!-- X Position Lock -->
            <div class="flex flex-col items-center gap-2 p-3 bg-red-500/5 border border-red-400/20 rounded-lg hover:bg-red-500/8 transition-all duration-200">
                <div class="flex items-center gap-2">
                    <span class="text-xs font-mono font-bold text-red-400">X</span>
                    {#if object.axisLockPosX}
                        <Lock class="w-3 h-3 text-red-400" />
                    {:else}
                        <Unlock class="w-3 h-3 text-muted-foreground" />
                    {/if}
                </div>
                <Switch 
                    checked={object.axisLockPosX}
                    onCheckedChange={(checked) => handleAxisLockChange('x', 'position', checked)}
                    class="data-[state=checked]:bg-red-500 focus-visible:ring-red-500/50"
                />
            </div>
            
            <!-- Y Position Lock -->
            <div class="flex flex-col items-center gap-2 p-3 bg-green-500/5 border border-green-400/20 rounded-lg hover:bg-green-500/8 transition-all duration-200">
                <div class="flex items-center gap-2">
                    <span class="text-xs font-mono font-bold text-green-400">Y</span>
                    {#if object.axisLockPosY}
                        <Lock class="w-3 h-3 text-green-400" />
                    {:else}
                        <Unlock class="w-3 h-3 text-muted-foreground" />
                    {/if}
                </div>
                <Switch 
                    checked={object.axisLockPosY}
                    onCheckedChange={(checked) => handleAxisLockChange('y', 'position', checked)}
                    class="data-[state=checked]:bg-green-500 focus-visible:ring-green-500/50"
                />
            </div>
            
            <!-- Z Position Lock -->
            <div class="flex flex-col items-center gap-2 p-3 bg-blue-500/5 border border-blue-400/20 rounded-lg hover:bg-blue-500/8 transition-all duration-200">
                <div class="flex items-center gap-2">
                    <span class="text-xs font-mono font-bold text-blue-400">Z</span>
                    {#if object.axisLockPosZ}
                        <Lock class="w-3 h-3 text-blue-400" />
                    {:else}
                        <Unlock class="w-3 h-3 text-muted-foreground" />
                    {/if}
                </div>
                <Switch 
                    checked={object.axisLockPosZ}
                    onCheckedChange={(checked) => handleAxisLockChange('z', 'position', checked)}
                    class="data-[state=checked]:bg-blue-500 focus-visible:ring-blue-500/50"
                />
            </div>
        </div>
    </div>

    <!-- Rotation Locks -->
    <div class="bg-card/40 backdrop-blur-sm border border-border/30 rounded-xl p-4 space-y-3">
        <div class="flex items-center gap-3 mb-3">
            <div class="p-2 bg-purple-500/10 rounded-lg">
                <RotateCcw class="w-4 h-4 text-purple-400" />
            </div>
            <h4 class="font-medium text-sm text-foreground/90">Rotation Locks</h4>
        </div>
        
        <div class="grid grid-cols-3 gap-3">
            <!-- X Rotation Lock -->
            <div class="flex flex-col items-center gap-2 p-3 bg-red-500/5 border border-red-400/20 rounded-lg hover:bg-red-500/8 transition-all duration-200">
                <div class="flex items-center gap-2">
                    <span class="text-xs font-mono font-bold text-red-400">X</span>
                    {#if object.axisLockRotX}
                        <Lock class="w-3 h-3 text-red-400" />
                    {:else}
                        <Unlock class="w-3 h-3 text-muted-foreground" />
                    {/if}
                </div>
                <Switch 
                    checked={object.axisLockRotX}
                    onCheckedChange={(checked) => handleAxisLockChange('x', 'rotation', checked)}
                    class="data-[state=checked]:bg-red-500 focus-visible:ring-red-500/50"
                />
            </div>
            
            <!-- Y Rotation Lock -->
            <div class="flex flex-col items-center gap-2 p-3 bg-green-500/5 border border-green-400/20 rounded-lg hover:bg-green-500/8 transition-all duration-200">
                <div class="flex items-center gap-2">
                    <span class="text-xs font-mono font-bold text-green-400">Y</span>
                    {#if object.axisLockRotY}
                        <Lock class="w-3 h-3 text-green-400" />
                    {:else}
                        <Unlock class="w-3 h-3 text-muted-foreground" />
                    {/if}
                </div>
                <Switch 
                    checked={object.axisLockRotY}
                    onCheckedChange={(checked) => handleAxisLockChange('y', 'rotation', checked)}
                    class="data-[state=checked]:bg-green-500 focus-visible:ring-green-500/50"
                />
            </div>
            
            <!-- Z Rotation Lock -->
            <div class="flex flex-col items-center gap-2 p-3 bg-blue-500/5 border border-blue-400/20 rounded-lg hover:bg-blue-500/8 transition-all duration-200">
                <div class="flex items-center gap-2">
                    <span class="text-xs font-mono font-bold text-blue-400">Z</span>
                    {#if object.axisLockRotZ}
                        <Lock class="w-3 h-3 text-blue-400" />
                    {:else}
                        <Unlock class="w-3 h-3 text-muted-foreground" />
                    {/if}
                </div>
                <Switch 
                    checked={object.axisLockRotZ}
                    onCheckedChange={(checked) => handleAxisLockChange('z', 'rotation', checked)}
                    class="data-[state=checked]:bg-blue-500 focus-visible:ring-blue-500/50"
                />
            </div>
        </div>
    </div>
</div>