<script lang="ts">
    import { Button } from "$lib/components/ui/button";
    import Input from "$lib/components/ui/input/input.svelte";
    import {
        SendHorizontal,
        Lightbulb,
        Wrench,
        Check,
        Loader,
    } from "lucide-svelte";
    import { callOpenAI, type ChatMessage } from "$lib/api";
    import {
        AGENT_TOOLS,
        executeTool,
        formatToolResult,
    } from "$lib/agentTools";

    // Chat message types
    interface ToolCall {
        id: string;
        type: "function";
        function: {
            name: string;
            arguments: string;
        };
        status?: "pending" | "completed";
    }

    interface Message {
        role: "user" | "assistant" | "system" | "tool";
        content: string;
        tool_calls?: ToolCall[];
        tool_call_id?: string;
        streaming?: boolean;
        message?: string;
    }

    // Simple markdown to HTML converter
    function renderMarkdown(text: string): string {
        if (!text) return "";

        // Convert markdown to HTML
        let html = text
            // Code blocks
            .replace(/```(\w+)?\n([\s\S]*?)```/g, "<pre><code>$2</code></pre>")
            // Inline code
            .replace(/`([^`]+)`/g, "<code>$1</code>")
            // Bold
            .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
            // Italic
            .replace(/\*(.+?)\*/g, "<em>$1</em>")
            // Line breaks
            .replace(/\n/g, "<br>");

        return html;
    }

    let messages = $state<Message[]>([]);
    let inputValue = $state("");
    let isWaiting = $state(false);
    let chatContainer: HTMLDivElement;

    // Auto-scroll to bottom when messages change
    $effect(() => {
        if (messages.length > 0 && chatContainer) {
            setTimeout(() => {
                chatContainer.scrollTo({
                    top: chatContainer.scrollHeight,
                    behavior: "smooth",
                });
            }, 100);
        }
    });

    // System message for context (not displayed in UI)
    const SYSTEM_MESSAGE: ChatMessage = {
        role: "system",
        content: `You are an AI agent integrated into beanengine, a web-based 3D game development platform. You help users create and modify objects in their game scene by executing tools.

The user typically wants you to take ACTION using the available tools - you are a hands-on game engine assistant. When they ask to create or modify objects, immediately use the appropriate tools rather than just explaining.

Your responses support basic markdown:
- Use **bold** for emphasis
- Use *italic* for subtle emphasis
- Use \`inline code\` for object names, properties, or code
- Use code blocks with \`\`\` for multi-line code
- Line breaks are preserved

Be conversational, concise, and confirm what you've done after executing tools. Always understand the current state of the scene or script before making changes.
Please be consise about your responses. Save token usage in your responses when possible. For example if the user asks for you to look at the scene, don't list them all.

For example, if the user wants to create a map, you could see the current objects in the scene using the List Objects tool, then create the map with the Create Object tool, and finally confirm to the user that the map was created. To change an object's appearance, you can list available materials with 'list_materials', then apply one using 'modify_object' with the 'material' property and the material's ID. To change properties, you can view the object first and then modify it. Same with creating an object, and then viewing it, and then modifying it. You can also reparent objects using 'reparent_object'. To edit a script, first use 'view_script' to get its code, then provide the full modified JSON array to 'update_script'.
You should probably modify objects after creating them. Parts for example don't spawn in with a material, and with no axis locks. Waypoint Navigators need a Waypoint Path. Constraints and Motors need setup.`,
    };

    // Check if we're in initial empty state
    const isInitialState = $derived(messages.length === 0);

    async function handleSendMessage() {
        if (!inputValue.trim() || isWaiting) return;

        // Add user message
        messages.push({
            role: "user",
            content: inputValue.trim(),
        });

        inputValue = "";
        isWaiting = true;

        try {
            await processAssistantResponse();
        } catch (error: any) {
            console.error("Error sending message:", error);
            messages.push({
                role: "assistant",
                content: `Error: ${error.message || "Failed to get response from AI"}`,
            });
            messages = [...messages];
        } finally {
            isWaiting = false;
        }
    }

    async function processAssistantResponse() {
        // Prepare message history for API (include system message)
        const apiMessages: ChatMessage[] = [
            SYSTEM_MESSAGE,
            ...messages.map((msg) => ({
                role: msg.role,
                content: msg.content,
                tool_call_id: msg.tool_call_id,
                tool_calls: msg.tool_calls,
            })),
        ];

        // Call the API with tool support
        const response = await callOpenAI({
            messages: apiMessages,
            temperature: 1.0,
            tools: AGENT_TOOLS,
            tool_choice: "auto",
        });

        const assistantMessage = response.choices[0].message;

        // Handle tool calls if present
        if (
            assistantMessage.tool_calls &&
            assistantMessage.tool_calls.length > 0
        ) {
            // Add assistant message with tool calls to UI
            messages.push({
                role: "assistant",
                content: assistantMessage.content || "",
                tool_calls: assistantMessage.tool_calls.map((tc) => ({
                    ...tc,
                    status: "pending" as const,
                })),
            });
            messages = [...messages];

            // Execute all tool calls and add results to messages
            for (const toolCall of assistantMessage.tool_calls) {
                // Mark as pending in UI
                const msgWithTool = messages[messages.length - 1];
                const toolInMsg = msgWithTool.tool_calls?.find(
                    (tc) => tc.id === toolCall.id
                );
                if (toolInMsg) {
                    toolInMsg.status = "pending";
                }
                messages = [...messages];

                // Add a slight random delay
                await new Promise((resolve) =>
                    setTimeout(resolve, 200 + Math.random() * 400)
                );

                // Execute the tool
                const result = await executeTool(
                    toolCall.function.name,
                    toolCall.function.arguments
                );

                // Mark as completed in UI
                if (toolInMsg) {
                    toolInMsg.status = "completed";
                }
                messages = [...messages];

                // Add tool result to messages array (both UI and API)
                messages.push({
                    role: "tool",
                    content: formatToolResult(result),
                    tool_call_id: toolCall.id,
                    message: result.message || "Tool executed successfully",
                });
            }
            messages = [...messages];

            // Recursively get the follow-up response from AI
            // This allows the AI to continue the conversation or make more tool calls
            await processAssistantResponse();
        } else {
            // No tool calls, just add the response
            messages.push({
                role: "assistant",
                content: assistantMessage.content,
            });
            messages = [...messages];
        }
    }

    function handleKeydown(event: KeyboardEvent) {
        if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();
            handleSendMessage();
        }
    }
</script>

<div class="h-full flex flex-col relative overflow-hidden bg-background">
    <!-- Subtle gradient background -->
    <div
        class="absolute inset-0 bg-gradient-to-br from-primary/3 via-transparent to-accent/2 pointer-events-none"
    ></div>

    {#if isInitialState}
        <!-- Initial Empty State -->
        <div
            class="flex-1 flex flex-col items-center justify-center p-8 relative z-10"
        >
            <div class="text-center space-y-6 max-w-md">
                <!-- Title -->
                <h2 class="text-4xl font-semibold">How can I help?</h2>

                <p class="text-muted-foreground text-base leading-relaxed">
                    Ask me to create objects, modify properties, or help with
                    your game development.
                </p>
            </div>
        </div>

        <!-- Input Area (Centered) -->
        <div class="p-6 relative z-10">
            <div class="relative max-w-2xl mx-auto">
                <Input
                    bind:value={inputValue}
                    onkeydown={handleKeydown}
                    placeholder="Type your message..."
                    class="pr-12 h-14 text-base"
                />
                <Button
                    onclick={handleSendMessage}
                    size="icon"
                    disabled={!inputValue.trim()}
                    class="absolute right-2 top-1/2 -translate-y-1/2 h-10 w-10"
                >
                    <SendHorizontal class="w-4 h-4" />
                </Button>
            </div>
        </div>
    {:else}
        <!-- Chat View -->
        <div
            bind:this={chatContainer}
            class="flex-1 overflow-y-auto p-6 space-y-4 relative z-10 pb-8"
        >
            {#each messages as message}
                {#if message.role === "user"}
                    <!-- User Message -->
                    <div class="flex justify-end">
                        <div
                            class="max-w-[75%] rounded-2xl px-5 py-3 bg-primary text-primary-foreground shadow-sm"
                        >
                            <p
                                class="text-sm leading-relaxed whitespace-pre-wrap"
                            >
                                {message.content}
                            </p>
                        </div>
                    </div>
                {:else if message.role === "assistant"}
                    <!-- Assistant Message -->
                    <div class="flex justify-start">
                        <div class="max-w-[85%] space-y-2">
                            <!-- Tool Calls -->
                            {#if message.tool_calls}
                                {#each message.tool_calls.filter((call) => call.status === "pending") as toolCall}
                                    <!-- Pending Tool Call -->
                                    <div
                                        class="flex items-center gap-3 rounded-xl px-4 py-3 bg-muted/50 border border-border/50"
                                    >
                                        <Loader
                                            class="w-4 h-4 text-muted-foreground flex-shrink-0 animate-spin"
                                        />
                                        <div class="flex-1">
                                            <p
                                                class="text-sm text-foreground leading-relaxed"
                                            >
                                                Running {toolCall.function
                                                    .name}...
                                            </p>
                                        </div>
                                    </div>
                                {/each}
                            {/if}

                            <!-- Content -->
                            {#if message.content}
                                <div
                                    class="prose prose-sm max-w-none text-foreground fade-in-text"
                                >
                                    {#if message.streaming}
                                        <span class="thinking-shimmer">
                                            {@html renderMarkdown(
                                                message.content
                                            )}
                                        </span>
                                    {:else}
                                        {@html renderMarkdown(message.content)}
                                    {/if}
                                </div>
                            {/if}
                        </div>
                    </div>
                {:else if message.role === "tool"}
                    <!-- Tool Result Message -->
                    <div class="flex justify-start">
                        <div
                            class="flex items-center gap-3 rounded-xl px-4 py-3 bg-muted/50 border border-border/50 max-w-[85%]"
                        >
                            <Check
                                class="w-4 h-4 text-green-500 flex-shrink-0"
                            />
                            <div class="flex-1">
                                <p
                                    class="text-sm text-foreground leading-relaxed"
                                >
                                    {message.message}
                                </p>
                            </div>
                        </div>
                    </div>
                {/if}
            {/each}

            {#if isWaiting && messages[messages.length - 1]?.role !== "assistant"}
                <!-- Thinking indicator -->
                <div class="flex justify-start mb-4">
                    <div
                        class="flex items-center gap-3 px-4 py-3 rounded-xl bg-muted/30 border border-border/30"
                    >
                        <Lightbulb
                            class="w-4 h-4 flex-shrink-0 text-amber-500"
                        />
                        <span class="text-sm thinking-shimmer">Thinking...</span
                        >
                    </div>
                </div>
            {/if}
        </div>

        <!-- Input Area (Bottom) -->
        <div class="p-4 border-t border-border relative z-10">
            <div class="relative">
                <Input
                    bind:value={inputValue}
                    onkeydown={handleKeydown}
                    placeholder="Type your message..."
                    class="pr-12 h-12 text-base"
                />
                <Button
                    onclick={handleSendMessage}
                    size="icon"
                    disabled={!inputValue.trim() || isWaiting}
                    class="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8"
                >
                    <SendHorizontal class="w-4 h-4" />
                </Button>
            </div>
        </div>
    {/if}
</div>

<style>
    /* Custom scrollbar styling */
    .flex-1.overflow-y-auto {
        scrollbar-width: thin;
        scrollbar-color: hsl(var(--muted-foreground) / 0.3) transparent;
    }

    .flex-1.overflow-y-auto::-webkit-scrollbar {
        width: 8px;
    }

    .flex-1.overflow-y-auto::-webkit-scrollbar-track {
        background: transparent;
    }

    .flex-1.overflow-y-auto::-webkit-scrollbar-thumb {
        background-color: hsl(var(--muted-foreground) / 0.3);
        border-radius: 4px;
    }

    .flex-1.overflow-y-auto::-webkit-scrollbar-thumb:hover {
        background-color: hsl(var(--muted-foreground) / 0.5);
    }

    .thinking-shimmer {
        background: linear-gradient(
            90deg,
            #94a3b8 35%,
            #64748b 50%,
            #94a3b8 65%
        );
        background-size: 200% 100%;
        background-clip: text;
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        animation: shimmer 2s infinite;
    }

    @keyframes shimmer {
        0% {
            background-position: 200% 0;
        }
        100% {
            background-position: -200% 0;
        }
    }

    @keyframes fadeIn {
        from {
            opacity: 0;
            filter: blur(4px);
        }
        to {
            opacity: 1;
            filter: blur(0);
        }
    }

    .fade-in-text {
        animation: fadeIn 0.8s ease-out forwards;
    }

    /* Markdown styles */
    :global(.prose code) {
        background-color: hsl(var(--muted));
        padding: 0.125rem 0.375rem;
        border-radius: 0.25rem;
        font-size: 0.875em;
        font-family: ui-monospace, monospace;
    }

    :global(.prose pre) {
        background-color: hsl(var(--muted));
        padding: 1rem;
        border-radius: 0.5rem;
        overflow-x: auto;
        margin: 0.5rem 0;
    }

    :global(.prose pre code) {
        background-color: transparent;
        padding: 0;
        border-radius: 0;
    }

    :global(.prose strong) {
        font-weight: 600;
        color: hsl(var(--foreground));
    }

    :global(.prose em) {
        font-style: italic;
    }

    :global(.prose) {
        line-height: 1.7;
    }
</style>
