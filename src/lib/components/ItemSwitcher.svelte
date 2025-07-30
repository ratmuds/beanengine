<script lang="ts">
    import * as DropdownMenu from "$lib/components/ui/dropdown-menu/index.js";
    import * as Sidebar from "$lib/components/ui/sidebar/index.js";
    import CheckIcon from "@lucide/svelte/icons/check";
    import ChevronsUpDownIcon from "@lucide/svelte/icons/chevrons-up-down";
    import GalleryVerticalEndIcon from "@lucide/svelte/icons/gallery-vertical-end";
    let {
        name,
        options,
        defaultOption,
        children,
    }: { name: string; options: string[]; defaultOption: string } = $props();
    let selectedOption = $state(defaultOption);
</script>

<Sidebar.Menu>
    <Sidebar.MenuItem>
        <DropdownMenu.Root>
            <DropdownMenu.Trigger>
                {#snippet child({ props })}
                    <Sidebar.MenuButton
                        size="lg"
                        class="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                        {...props}
                    >
                        <div
                            class="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg"
                        >
                            {@render children?.()}
                        </div>
                        <div class="flex flex-col gap-0.5 leading-none">
                            <span class="font-bold">{name}</span>
                            <span class="text-gray-400">{selectedOption}</span>
                        </div>
                        <ChevronsUpDownIcon class="ml-auto" />
                    </Sidebar.MenuButton>
                {/snippet}
            </DropdownMenu.Trigger>
            <DropdownMenu.Content
                class="w-(--bits-dropdown-menu-anchor-width)"
                align="start"
            >
                {#each options as option (option)}
                    <DropdownMenu.Item
                        onSelect={() => (selectedOption = option)}
                    >
                        {option}
                        {#if option === selectedOption}
                            <CheckIcon class="ml-auto" />
                        {/if}
                    </DropdownMenu.Item>
                {/each}
            </DropdownMenu.Content>
        </DropdownMenu.Root>
    </Sidebar.MenuItem>
</Sidebar.Menu>
