import { json, error } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { GOOGLE_AI_STUDIO_KEY } from "$env/static/private";

export const POST: RequestHandler = async ({ request }) => {
  try {
    // Parse the incoming request body
    const body = await request.json();

    // Validate that we have the necessary data
    if (!body.messages || !Array.isArray(body.messages)) {
      throw error(400, "Messages array is required");
    }

    // Default model for Google AI Studio (Gemini)
    const model = body.model || "gemini-1.5-flash";

    // Convert OpenAI-style messages to Google AI format
    // Google AI uses "contents" instead of "messages"
    // and has a different role naming (user/model instead of user/assistant)
    const contents = body.messages
      .filter((msg: any) => msg.role !== "system") // System messages handled separately
      .map((msg: any) => ({
        role: msg.role === "assistant" ? "model" : "user",
        parts: [{ text: msg.content }],
      }));

    // Extract system instruction if present
    const systemMessage = body.messages.find(
      (msg: any) => msg.role === "system"
    );
    const systemInstruction = systemMessage
      ? {
          parts: [{ text: systemMessage.content }],
        }
      : undefined;

    // Prepare the request to Google AI Studio
    const googleRequest: any = {
      contents,
    };

    // Add system instruction if present
    if (systemInstruction) {
      googleRequest.systemInstruction = systemInstruction;
    }

    // Add generation config if parameters are provided
    const generationConfig: any = {};
    if (body.temperature !== undefined) {
      generationConfig.temperature = body.temperature;
    }
    if (body.max_tokens !== undefined) {
      generationConfig.maxOutputTokens = body.max_tokens;
    }
    if (body.top_p !== undefined) {
      generationConfig.topP = body.top_p;
    }
    if (Object.keys(generationConfig).length > 0) {
      googleRequest.generationConfig = generationConfig;
    }

    // Make the request to Google AI Studio
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GOOGLE_AI_STUDIO_KEY}`;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(googleRequest),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("Google AI API error:", errorData);
      throw error(
        response.status,
        errorData.error?.message || "Google AI API request failed"
      );
    }

    const data = await response.json();

    // Convert Google AI response format to OpenAI-compatible format
    // This makes it easier to use the same interface in the frontend
    const openaiCompatibleResponse = {
      id: `gemini-${Date.now()}`,
      object: "chat.completion",
      created: Math.floor(Date.now() / 1000),
      model: model,
      choices: [
        {
          index: 0,
          message: {
            role: "assistant",
            content: data.candidates?.[0]?.content?.parts?.[0]?.text || "",
          },
          finish_reason:
            data.candidates?.[0]?.finishReason?.toLowerCase() || "stop",
        },
      ],
      usage: {
        prompt_tokens: data.usageMetadata?.promptTokenCount || 0,
        completion_tokens: data.usageMetadata?.candidatesTokenCount || 0,
        total_tokens: data.usageMetadata?.totalTokenCount || 0,
      },
    };

    // Return the response in OpenAI-compatible format
    return json(openaiCompatibleResponse);
  } catch (err: any) {
    console.error("Error in Google AI proxy:", err);
    if (err.status) {
      throw err;
    }
    throw error(500, err.message || "Internal server error");
  }
};
