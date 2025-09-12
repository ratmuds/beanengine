<script lang="ts">
    import { createEventDispatcher } from "svelte";
    import { Button } from "$lib/components/ui/button";
    import Input from "$lib/components/ui/input/input.svelte";
    import { Plus, X, Lightbulb } from "lucide-svelte";

    let { currentClasses, suggestions = [] } = $props();

    const dispatch = createEventDispatcher<{
        addClass: { className: string };
        removeClass: { className: string };
    }>();

    let inputValue = $state("");
    let showDropdown = $state(false);
    let filteredSuggestions: string[] = $state([]);
    let selectedIndex = $state(-1);
    let inputElement: HTMLInputElement;

    $effect(() => {
        if (inputValue.trim()) {
            const query = inputValue.toLowerCase();
            filteredSuggestions = suggestions
                .filter((s) => !currentClasses.includes(s))
                .filter((s) => s.toLowerCase().includes(query))
                .slice(0, 5);

            // Add "Create new" option if exact match doesn't exist
            if (
                inputValue.trim() &&
                !suggestions.includes(inputValue.trim()) &&
                !currentClasses.includes(inputValue.trim())
            ) {
                filteredSuggestions = [
                    ...filteredSuggestions,
                    `Create "${inputValue.trim()}"`,
                ];
            }

            showDropdown = filteredSuggestions.length > 0;
            selectedIndex = -1;
        } else {
            showDropdown = false;
            filteredSuggestions = [];
            selectedIndex = -1;
        }
    });

    function handleKeydown(event: KeyboardEvent) {
        if (!showDropdown) return;

        switch (event.key) {
            case "ArrowDown":
                event.preventDefault();
                selectedIndex =
                    selectedIndex < filteredSuggestions.length - 1
                        ? selectedIndex + 1
                        : 0;
                break;
            case "ArrowUp":
                event.preventDefault();
                selectedIndex =
                    selectedIndex > 0
                        ? selectedIndex - 1
                        : filteredSuggestions.length - 1;
                break;
            case "Enter":
                event.preventDefault();
                if (selectedIndex >= 0) {
                    selectSuggestion(filteredSuggestions[selectedIndex]);
                } else if (inputValue.trim()) {
                    addClass(inputValue.trim());
                }
                break;
            case "Escape":
                event.preventDefault();
                showDropdown = false;
                selectedIndex = -1;
                inputElement?.blur();
                break;
        }
    }

    function selectSuggestion(suggestion: string) {
        const className = suggestion.startsWith('Create "')
            ? suggestion.slice(8, -1)
            : suggestion;
        addClass(className);
    }

    function addClass(className: string) {
        if (className && !currentClasses.includes(className)) {
            dispatch("addClass", { className });
        }
        inputValue = "";
        showDropdown = false;
        selectedIndex = -1;
    }

    function removeClass(className: string) {
        dispatch("removeClass", { className });
    }

    function handleFocus() {
        if (inputValue.trim()) {
            showDropdown = filteredSuggestions.length > 0;
        }
    }

    function handleBlur() {
        // Delay hiding dropdown to allow click events on suggestions
        setTimeout(() => {
            showDropdown = false;
            selectedIndex = -1;
        }, 150);
    }
</script>

<div class="space-y-3">
    <!-- Input with dropdown -->
    <div class="relative">
        <Input
            bind:this={inputElement}
            bind:value={inputValue}
            type="text"
            placeholder="Search or create class..."
            class="bg-gray-800/50 border-gray-700/30 text-gray-200 text-sm pr-10 focus:border-blue-500 focus:outline-none"
            on:keydown={handleKeydown}
            on:focus={handleFocus}
            on:blur={handleBlur}
        />
        <Button
            variant="ghost"
            size="sm"
            class="absolute right-1 top-1 h-6 w-6 p-0 text-gray-400 hover:text-blue-400"
            onclick={() => inputValue.trim() && addClass(inputValue.trim())}
            disabled={!inputValue.trim()}
        >
            <Plus class="w-3 h-3" />
        </Button>

        <!-- Dropdown -->
        {#if showDropdown}
            <div
                class="absolute top-full left-0 right-0 mt-1 bg-gray-800/95 backdrop-blur-sm border border-gray-700/50 rounded-md shadow-lg z-50 max-h-48 overflow-y-auto"
            >
                {#each filteredSuggestions as suggestion, index}
                    {@const isCreateNew = suggestion.startsWith('Create "')}
                    <button
                        class="w-full px-3 py-2 text-left text-sm transition-colors flex items-center gap-2 {selectedIndex ===
                        index
                            ? 'bg-blue-600/20 text-blue-300'
                            : 'text-gray-300 hover:bg-gray-700/60'}"
                        onclick={() => selectSuggestion(suggestion)}
                    >
                        {#if isCreateNew}
                            <Plus class="w-3 h-3 text-green-400" />
                            <span class="text-green-400">{suggestion}</span>
                        {:else}
                            <Lightbulb class="w-3 h-3 text-yellow-400" />
                            <span>{suggestion}</span>
                        {/if}
                    </button>
                {/each}
            </div>
        {/if}
    </div>

    <!-- Current applied classes -->
    {#if currentClasses.length > 0}
        <div>
            <h5 class="text-gray-400 text-xs font-medium mb-2">
                Applied Classes
            </h5>
            <div class="flex flex-wrap gap-1">
                {#each currentClasses as className}
                    <div
                        class="flex items-center gap-1 bg-blue-600/20 text-blue-300 text-xs px-2 py-1 rounded border border-blue-600/30"
                    >
                        <span>{className}</span>
                        <button
                            class="hover:text-red-400 transition-colors"
                            onclick={() => removeClass(className)}
                        >
                            <X class="w-3 h-3" />
                        </button>
                    </div>
                {/each}
            </div>
        </div>
    {/if}

    <!-- Quick suggestions -->
    <div>
        <h5
            class="text-gray-400 text-xs font-medium mb-2 flex items-center gap-1"
        >
            <Lightbulb class="w-3 h-3" />
            Suggestions
        </h5>
        <div class="flex flex-wrap gap-1">
            {#each suggestions
                .filter((s) => !currentClasses.includes(s))
                .slice(0, 4) as suggestion}
                <Button
                    variant="outline"
                    size="sm"
                    class="h-6 px-2 text-xs bg-gray-800/20 border-gray-700/30 text-gray-400 hover:text-gray-200 hover:bg-gray-700/40"
                    onclick={() => addClass(suggestion)}
                >
                    {suggestion}
                </Button>
            {/each}
        </div>
    </div>
</div>
