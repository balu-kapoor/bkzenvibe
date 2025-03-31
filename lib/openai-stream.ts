import { OpenAIStream as BaseOpenAIStream } from "ai"
import OpenAI from "openai"

// Initialize the OpenAI client with the API key
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function OpenAIStream(params: OpenAI.Chat.ChatCompletionCreateParams) {
  const response = await openai.chat.completions.create({
    ...params,
    stream: true,
  })

  return BaseOpenAIStream(response)
} 