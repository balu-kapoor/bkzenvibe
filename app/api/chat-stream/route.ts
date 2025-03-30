import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextRequest } from "next/server";
import { Readable } from "stream";
import { getAppropriateModel, getRemainingGemini25Requests } from "@/lib/model-utils";
import { smoothChunker, smoothStreamProcessor } from "@/lib/stream-utils";

// Rate limiting
const MAX_REQUESTS_PER_MINUTE = 20;
const requestCounts = new Map<string, { count: number; timestamp: number }>();

// Get API key from environment
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// Check if a message is asking about the model
function isAskingAboutModel(content: string): boolean {
  const lowerContent = content.toLowerCase();
  const modelQuestions = [
    "what model are you",
    "which model are you",
    "what language model",
    "what llm",
    "what ai model",
    "what's your model",
    "what is your model",
    "which ai model",
    "what version are you",
    "are you gpt",
    "are you claude",
    "are you gemini",
    "are you based on"
  ];
  
  return modelQuestions.some(question => lowerContent.includes(question));
}

// Rate limiting function
function checkRateLimit(ip: string) {
  const now = Date.now();
  const userRequests = requestCounts.get(ip) || { count: 0, timestamp: now };
  
  // Reset counter if it's been more than a minute
  if (now - userRequests.timestamp > 60000) {
    userRequests.count = 1;
    userRequests.timestamp = now;
  } else {
    userRequests.count++;
  }
  
  requestCounts.set(ip, userRequests);
  
  if (userRequests.count > MAX_REQUESTS_PER_MINUTE) {
    throw new Error(`Rate limit exceeded. Maximum ${MAX_REQUESTS_PER_MINUTE} requests per minute allowed.`);
  }
}

// Custom response for model questions
function createCustomStreamingResponse(content: string): Response {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content })}\n\n`));
      controller.enqueue(encoder.encode('data: [DONE]\n\n'));
      controller.close();
    }
  });
  
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
    },
  });
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for') || 'unknown-ip';
  
  try {
    // Check rate limit
    checkRateLimit(ip);
    
    // Parse request body
    const { messages, fileContent, editIndex } = await req.json();
    
    // Check if API key is configured
    if (!GEMINI_API_KEY) {
      throw new Error('Gemini API key is not configured');
    }
    
    // Check if the last user message is asking about the model
    const lastUserMessage = messages.findLast((msg: any) => msg.role === 'user');
    if (lastUserMessage && isAskingAboutModel(lastUserMessage.content)) {
      const customResponse = "I'm BK Zen Vibe, a custom AI assistant designed to provide helpful, accurate information. I'm built on proprietary technology developed specifically for conversational AI applications. My capabilities include understanding context, processing natural language, and generating human-like responses. I'm continuously being improved to better assist users with their questions and tasks.";
      return createCustomStreamingResponse(customResponse);
    }
    
    // Select the appropriate model based on daily usage
    const selectedModel = getAppropriateModel(ip);
    const remainingGemini25Requests = getRemainingGemini25Requests(ip);
    
    // Log model selection for debugging
    console.log(`Using model: ${selectedModel} for IP: ${ip} (${remainingGemini25Requests} premium requests remaining today)`);
    
    // Initialize the Google GenAI client with the selected model
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: selectedModel });
    
    // Convert messages to the format expected by the Google GenAI library
    const history = [];
    let pendingSystemContent = '';
    
    for (let i = 0; i < messages.length; i++) {
      const msg = messages[i];
      
      if (msg.role === 'system') {
        pendingSystemContent += (pendingSystemContent ? '\n\n' : '') + msg.content;
        continue;
      }
      
      if (msg.role === 'user') {
        // If we have pending system content, prepend it to this user message
        const userContent = pendingSystemContent 
          ? `[System Instructions: ${pendingSystemContent}]\n\n${msg.content}`
          : msg.content;
        
        history.push({ role: 'user', parts: [{ text: userContent }] });
        pendingSystemContent = '';
      } else if (msg.role === 'assistant') {
        history.push({ role: 'model', parts: [{ text: msg.content }] });
      }
    }
    
    // Add file content if present
    if (fileContent && history.length > 0) {
      const lastUserMessageIndex = history.length - 1;
      for (let i = history.length - 1; i >= 0; i--) {
        if (history[i].role === 'user') {
          history[i].parts[0].text += `\n\nThe user has shared one or more files with the following content. Please analyze and respond to their message in the context of these files:\n\n${fileContent}\n\nImportant: If the files contain code, please analyze it thoroughly. If the user is asking about issues or improvements, provide specific suggestions referencing the relevant parts of the code.`;
          break;
        }
      }
    }
    
    // Create a chat session
    const chat = model.startChat({
      history,
      generationConfig: {
        temperature: 0.7,
        topP: 0.95,
        topK: 40,
        maxOutputTokens: 8192, // Increased from 1000 to allow for longer responses like code examples
      },
    });
    
    // Send the message and get a streaming response
    const result = await chat.sendMessageStream(
      history[history.length - 1].parts[0].text
    );
    
    // Convert the streaming response to a format compatible with SSE
    const encoder = new TextEncoder();
    const transformStream = new TransformStream();
    const writer = transformStream.writable.getWriter();
    
    // Process the streaming response
    (async () => {
      try {
        for await (const chunk of result.stream) {
          const text = chunk.text();
          if (text) {
            writer.write(
              encoder.encode(`data: ${JSON.stringify({ content: text })}\n\n`)
            );
          }
        }
        
        // Send the [DONE] event to signal the end of the stream
        writer.write(encoder.encode('data: [DONE]\n\n'));
      } catch (error) {
        console.error('Streaming error:', error);
        writer.write(
          encoder.encode(`data: ${JSON.stringify({ content: "\n\n[Error: Something went wrong with the streaming response. Please try again.]" })}\n\n`)
        );
        writer.write(encoder.encode('data: [DONE]\n\n'));
      } finally {
        writer.close();
      }
    })();
    
    // Return the streaming response
    return new Response(transformStream.readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no',
      },
    });
    
  } catch (error: unknown) {
    console.error('Chat API error:', error);
    
    // Handle different error types
    let errorMessage = 'An error occurred during the chat request';
    let errorDetails = null;
    let statusCode = 500;
    
    if (error instanceof Error) {
      errorMessage = error.message;
      // Check if it's a custom error with additional properties
      const customError = error as any;
      if (customError.details) {
        errorDetails = customError.details;
      }
      if (customError.status) {
        statusCode = customError.status;
      }
    }
    
    // Return an error response
    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        details: errorDetails
      }),
      { 
        status: statusCode,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}
