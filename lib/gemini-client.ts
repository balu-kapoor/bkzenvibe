import { GoogleGenerativeAI } from "@google/generative-ai";
import { geminiImagePrompt } from "./prompts";

// Initialize Gemini API
const genAI = new GoogleGenerativeAI(process.env.NEXT_PUBLIC_GEMINI_API_KEY || "");

const systemPrompt = `You are an expert web developer who creates React components using Tailwind CSS.
Generate a single, self-contained React component based on the user's description.
Follow these rules:
1. Use modern React and TypeScript best practices
2. Use Tailwind CSS for styling
3. Make the design beautiful, responsive, and accessible
4. Include any necessary TypeScript types and interfaces
5. Add comments explaining complex logic
6. Return code in the following format:

// filename: App.tsx
\`\`\`typescript
// Your TypeScript code here
\`\`\`

// filename: styles.css
\`\`\`css
/* Your CSS code here */
\`\`\`

7. ALWAYS include both App.tsx and styles.css files
8. Use only Tailwind CSS classes (no custom CSS)
9. Include proper error handling and loading states if needed
10. Make sure each code block has a filename comment before it
11. Use proper code block syntax with language specification`;

/**
 * Generates web app code based on text prompt and optionally an image reference
 * @param prompt The text prompt describing the desired web app
 * @param imageData Optional base64 image data to use as reference for design
 * @returns Generated code as a string
 */
export async function generateWebApp(prompt: string, imageData?: string) {
  try {
    // Get the model - use gemini-2.0-flash which supports both text and images
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    // Prepare content parts array
    const contentParts = [];
    
    // Add system prompt first
    contentParts.push({ text: systemPrompt });
    
    // Add image if available
    if (imageData && imageData.startsWith('data:image')) {
      // Extract MIME type and base64 data
      const matches = imageData.match(/^data:([^;]+);base64,(.+)$/);
      
      if (matches && matches.length === 3) {
        const mimeType = matches[1];
        const base64Data = matches[2];
        
        // Add image as inline data
        contentParts.push({
          inlineData: {
            data: base64Data,
            mimeType: mimeType
          }
        });
        
        // Add text that explains we want to match the image design
        contentParts.push({
          text: geminiImagePrompt
        });
      }
    }
    
    // Add the main prompt
    contentParts.push({ text: prompt });

    // Generate content
    const result = await model.generateContent(contentParts);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error("Error generating with Gemini:", error);
    throw error;
  }
} 