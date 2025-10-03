import { json, error } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { OPENAI_KEY } from "$env/static/private";

export const POST: RequestHandler = async ({ request }) => {
  try {
    // Parse the incoming request body
    const body = await request.json();

    // Validate that we have the necessary data
    if (!body.messages || !Array.isArray(body.messages)) {
      throw error(400, "Messages array is required");
    }

    // Prepare the request to OpenAI
    const openaiRequest: any = {
      model: body.model || "gpt-5-mini",
      messages: body.messages,
    };

    // Add optional parameters if provided
    if (body.temperature !== undefined) {
      openaiRequest.temperature = body.temperature;
    }
    if (body.max_tokens !== undefined) {
      openaiRequest.max_tokens = body.max_tokens;
    }
    if (body.top_p !== undefined) {
      openaiRequest.top_p = body.top_p;
    }
    if (body.frequency_penalty !== undefined) {
      openaiRequest.frequency_penalty = body.frequency_penalty;
    }
    if (body.presence_penalty !== undefined) {
      openaiRequest.presence_penalty = body.presence_penalty;
    }

    // Add tool calling support if tools are provided
    if (body.tools && Array.isArray(body.tools)) {
      openaiRequest.tools = body.tools;
    }
    if (body.tool_choice !== undefined) {
      openaiRequest.tool_choice = body.tool_choice;
    }

    // Make the request to OpenAI
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_KEY}`,
      },
      body: JSON.stringify(openaiRequest),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("OpenAI API error:", errorData);
      throw error(
        response.status,
        errorData.error?.message || "OpenAI API request failed"
      );
    }

    const data = await response.json();

    // Return the response
    return json(data);
  } catch (err: any) {
    console.error("Error in OpenAI proxy:", err);
    if (err.status) {
      throw err;
    }
    throw error(500, err.message || "Internal server error");
  }
};
