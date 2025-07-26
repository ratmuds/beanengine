<script lang="ts">
    import Input from "$lib/components/ui/input/input.svelte";
    import { Type, Hash, GitBranch } from "lucide-svelte";
</script>

<div
    class="spacemono bg-gray-800 m-2 p-2 rounded-r w-fit border-l-4 border-l-purple-500"
>
    <p class="text-sm text-gray-300">Say</p>
    <div class="flex items-center mt-3 gap-2">
        <Type class="w-8 h-8 p-2 rounded-full outline" />
        <Input class="rounded-full h-8 flex-1/3" />
        <p>For</p>
        <Hash class="w-8 h-8 p-2 rounded-full outline" />
        <Input type="number" class="rounded-full h-8 flex-1" />
    </div>
</div>

<div
    class="spacemono bg-gray-800 m-2 p-2 w-fit rounded-r border-l-4 border-l-blue-500 relative overflow-visible"
>
    <p class="text-sm text-gray-300">If</p>
    <div class="flex items-center mt-3 gap-2">
        <GitBranch class="w-8 h-8 p-2 rounded-full outline" />
        <Input class="rounded-full h-8 flex-1" placeholder="condition" />
        <p>Then</p>
    </div>

    <!-- Black cutout area that creates socket on right side -->
    <div class="h-16 w-[calc(100%+10px)] bg-gray-950 rounded m-2"></div>
</div>
