declare global {
  interface Window {
    puter: any
  }
}

export async function generateWebApp(prompt: string) {
  const systemPrompt = `You are an expert web developer who creates React applications using TypeScript and Tailwind CSS.
Generate a complete React application split into multiple files based on the user's description.
Follow these rules:
1. Use modern React and TypeScript best practices
2. Use Tailwind CSS for styling
3. Make the design beautiful, responsive, and accessible
4. Split the code into appropriate files and components
5. Format each file with a filename comment at the start of each code block:
   \`\`\`typescript
   // filename: App.tsx
   ... code ...
   \`\`\`
6. Generate these files:
   - App.tsx: Main component
   - types.ts: TypeScript interfaces
   - components/*.tsx: Reusable components
   - styles/globals.css: Global styles
7. Each file should be wrapped in a markdown code block with the appropriate language (typescript/css)
8. Use only Tailwind CSS classes (no custom CSS except in globals.css)
9. Include proper error handling and loading states
10. Make sure each component is properly typed and exported
11. Include comments explaining complex logic`

  try {
    if (typeof window === "undefined") {
      throw new Error("Puter.js can only be used in the browser")
    }

    const response = await window.puter.ai.chat(
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: prompt }
      ],
      { model: "claude-3-7-sonnet", stream: true }
    )

    return response
  } catch (error) {
    console.error("Error generating web app:", error)
    throw error
  }
} 