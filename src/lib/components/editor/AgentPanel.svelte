<script lang="ts">
  import { Button } from "$lib/components/ui/button";
  import Input from "$lib/components/ui/input/input.svelte";
  import { SendHorizontal, Loader, CheckCircle } from "lucide-svelte";
  import { callOpenAI, type ChatMessage } from "$lib/api";
  import { AGENT_TOOLS, executeTool, formatToolResult } from "$lib/agentTools";

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
  }

  let messages = $state<Message[]>([]);
  let inputValue = $state("");
  let isWaiting = $state(false);

  // System message for context (not displayed in UI)
  const SYSTEM_MESSAGE: ChatMessage = {
    role: "system",
    content: `You are an AI assistant integrated into Bean Engine, a web-based 3D game development platform. You can help users create and modify objects in their game scene.

Available object types:
- BPart: A 3D mesh object (like cubes, spheres, cylinders)
- BCamera: A camera for viewing the scene
- BLight: A light source
- BStorage: A folder for organizing objects

You have access to tools to:
1. create_object - Create new 3D objects
2. modify_object - Change properties of existing objects (position, rotation, scale, name, color)
3. delete_object - Remove objects from the scene
4. list_objects - View all objects in the scene

When users ask to create or modify objects, use the appropriate tools. Be conversational and helpful. Always confirm what you've done after executing tools.`,
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
        // Add message with tool calls
        messages.push({
          role: "assistant",
          content: assistantMessage.content || "",
          tool_calls: assistantMessage.tool_calls.map((tc) => ({
            ...tc,
            status: "pending" as const,
          })),
        });
        messages = [...messages];

        // Execute all tool calls
        const toolResults: ChatMessage[] = [];
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

          // Add tool result to conversation
          toolResults.push({
            role: "tool",
            content: formatToolResult(result),
            tool_call_id: toolCall.id,
          });
        }

        // Add assistant message with tool calls to API history
        apiMessages.push({
          role: "assistant",
          content: assistantMessage.content || "",
          tool_calls: assistantMessage.tool_calls,
        });

        // Add all tool results to API history
        apiMessages.push(...toolResults);

        // Get follow-up response from AI
        const followUpResponse = await callOpenAI({
          messages: apiMessages,
          temperature: 1.0,
          tools: AGENT_TOOLS,
          tool_choice: "auto",
        });

        // Add the follow-up message
        messages.push({
          role: "assistant",
          content: followUpResponse.choices[0].message.content,
        });
      } else {
        // No tool calls, just add the response
        messages.push({
          role: "assistant",
          content: assistantMessage.content,
        });
      }

      messages = [...messages];
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

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleSendMessage();
    }
  }
</script>

<div class="h-full flex flex-col relative overflow-hidden">
  <!-- Subtle gradient accent -->
  <div
    class="absolute inset-0 bg-gradient-to-bl from-purple-500/5 via-transparent to-blue-500/3 pointer-events-none"
  ></div>

  {#if isInitialState}
    <!-- Initial Empty State -->
    <div
      class="flex-1 flex flex-col items-center justify-center p-8 relative z-10"
    >
      <div class="text-center space-y-6 max-w-md">
        <!-- Title -->
        <h2 class="text-3xl font-bold">How can I help?</h2>

        <p class="text-muted-foreground text-sm">
          Ask me to create objects, modify properties, or help with your game
          development.
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
          class="pr-12 h-14 text-base bg-card/60"
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
    <div class="flex-1 overflow-y-auto relative z-10 p-4 space-y-4">
      {#each messages as message}
        {#if message.role === "user"}
          <!-- User Message (with bubble) -->
          <div class="flex justify-end">
            <div class="max-w-[80%] rounded-2xl px-4 py-3 text-white">
              <p class="text-sm">{message.content}</p>
            </div>
          </div>
        {:else if message.role === "assistant"}
          <!-- Assistant Message (no bubble) -->
          <div class="flex justify-start">
            <div class="max-w-[80%] space-y-2">
              <!-- Tool Calls -->
              {#if message.tool_calls}
                {#each message.tool_calls as toolCall}
                  <div
                    class="rounded-lg px-3 py-2 text-xs font-mono {toolCall.status ===
                    'completed'
                      ? 'text-muted-foreground/60'
                      : 'text-muted-foreground'}"
                  >
                    {#if toolCall.status === "pending"}
                      <span class="shimmer-text">
                        <Loader class="w-4 h-4 animate-spin" />
                        {toolCall.function.name}({toolCall.function.arguments})
                      </span>
                    {:else}
                      <span>
                        <CheckCircle class="w-4 h-4" />
                        {toolCall.function.name}({toolCall.function.arguments})
                      </span>
                    {/if}
                  </div>
                {/each}
              {/if}

              <!-- Content -->
              {#if message.content}
                <div class="text-sm text-foreground">
                  {#if message.streaming}
                    <span class="shimmer-text">{message.content}</span>
                  {:else}
                    <p>{message.content}</p>
                  {/if}
                </div>
              {/if}
            </div>
          </div>
        {/if}
      {/each}

      {#if isWaiting && messages[messages.length - 1]?.role !== "assistant"}
        <!-- Waiting indicator -->
        <div class="flex justify-start">
          <div class="text-sm text-muted-foreground shimmer-text">
            Thinking...
          </div>
        </div>
      {/if}
    </div>

    <!-- Input Area (Bottom) -->
    <div class="p-4 border-t border-border/30 relative z-10">
      <div class="relative">
        <Input
          bind:value={inputValue}
          onkeydown={handleKeydown}
          placeholder="Type your message..."
          class="pr-12 h-12 bg-card/60 backdrop-blur-sm border-border/50"
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
  @keyframes shimmer {
    0% {
      opacity: 0.5;
    }
    50% {
      opacity: 1;
    }
    100% {
      opacity: 0.5;
    }
  }

  .shimmer-text {
    animation: shimmer 1.5s ease-in-out infinite;
  }
</style>
