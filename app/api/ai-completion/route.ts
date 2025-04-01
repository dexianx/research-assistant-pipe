import OpenAI from "openai"

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { messages, model, apiKey, max_tokens, temperature } = body

    if (!apiKey) {
      return Response.json({ error: "API key is required" }, { status: 400 })
    }

    // Format messages for the API
    const formattedMessages = messages.map((message: any) => ({
      role: message.role,
      content: message.content,
    }))

    // Initialize Nebius AI client
    const client = new OpenAI({
      baseURL: "https://api.studio.nebius.ai/v1/",
      apiKey: apiKey,
    })

    // Make the API request
    const completion = await client.chat.completions.create({
      model: model || "meta-llama/Meta-Llama-3.1-70B-Instruct",
      messages: formattedMessages,
      max_tokens: max_tokens || 500,
      temperature: temperature || 0.7,
    })

    return Response.json(completion)
  } catch (error) {
    console.error("Error in AI completion:", error)
    return Response.json({ error: error instanceof Error ? error.message : "Unknown error occurred" }, { status: 500 })
  }
}

