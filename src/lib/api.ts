/**
 * API Types for OpenAI and Google AI Studio proxy routes
 */

// OpenAI-compatible message format
export interface ChatMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
  name?: string;
  tool_call_id?: string; // Required when role is 'tool'
  tool_calls?: ToolCall[]; // Present when assistant makes tool calls
}

// Tool/Function calling types for OpenAI
export interface FunctionDefinition {
  name: string;
  description?: string;
  parameters?: {
    type: string;
    properties: Record<string, any>;
    required?: string[];
  };
}

export interface Tool {
  type: "function";
  function: FunctionDefinition;
}

export interface ToolCall {
  id: string;
  type: "function";
  function: {
    name: string;
    arguments: string;
  };
}

// Request types
export interface OpenAIChatRequest {
  messages: ChatMessage[];
  model?: string;
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
  frequency_penalty?: number;
  presence_penalty?: number;
  tools?: Tool[];
  tool_choice?:
    | "none"
    | "auto"
    | { type: "function"; function: { name: string } };
}

export interface GoogleAIChatRequest {
  messages: ChatMessage[];
  model?: string;
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
}

// Response types (OpenAI-compatible format)
export interface ChatChoice {
  index: number;
  message: {
    role: "assistant";
    content: string;
    tool_calls?: ToolCall[];
  };
  finish_reason: string;
}

export interface ChatUsage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
}

export interface ChatCompletionResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: ChatChoice[];
  usage: ChatUsage;
}

// Helper function to call OpenAI proxy
export async function callOpenAI(
  request: OpenAIChatRequest
): Promise<ChatCompletionResponse> {
  const response = await fetch("/api/openai", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "OpenAI API request failed");
  }

  return response.json();
}

// Helper function to call Google AI proxy
export async function callGoogleAI(
  request: GoogleAIChatRequest
): Promise<ChatCompletionResponse> {
  const response = await fetch("/api/google", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Google AI API request failed");
  }

  return response.json();
}
