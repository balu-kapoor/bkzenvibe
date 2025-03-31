import { NextResponse } from "next/server"

declare global {
  interface Window {
    puter: any
  }
}

export async function POST(req: Request) {
  try {
    const { prompt } = await req.json()

    const systemPrompt = `You are an expert web developer who creates React components using Tailwind CSS.
Generate a single, self-contained React component based on the user's description.
Follow these rules:
1. Use modern React and TypeScript best practices
2. Use Tailwind CSS for styling
3. Make the design beautiful, responsive, and accessible
4. Include any necessary TypeScript types and interfaces
5. Add comments explaining complex logic
6. Return ONLY the code wrapped in markdown code blocks with jsx/tsx language specification
7. The component should be a complete, working implementation
8. Use only Tailwind CSS classes (no custom CSS)
9. Include proper error handling and loading states if needed`

    // Create a ReadableStream for streaming the response
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // @ts-ignore - Puter.js types are not available
          const response = await window.puter.ai.chat(
            [
              { role: "system", content: systemPrompt },
              { role: "user", content: prompt }
            ],
            { model: "claude-3-7-sonnet", stream: true }
          )

          for await (const part of response) {
            const text = part?.text || ""
            controller.enqueue(new TextEncoder().encode(text))
          }
          controller.close()
        } catch (error) {
          controller.error(error)
        }
      }
    })

    return new Response(stream)
  } catch (error) {
    console.error("Error generating web app:", error)
    return NextResponse.json(
      { error: "Failed to generate web app" },
      { status: 500 }
    )
  }
} 