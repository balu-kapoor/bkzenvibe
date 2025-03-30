import { NextResponse } from 'next/server';
import { getAppropriateModel, getRemainingGemini25Requests } from '@/lib/model-utils';
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from "@google/generative-ai";

// Add export config for Edge Runtime
export const runtime = 'edge';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_API_BASE_URL = 'https://generativelanguage.googleapis.com/v1/models';

// Initialize the Google GenAI client
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY || '');

// Create encoder for streaming
const encoder = new TextEncoder();

// Function to check if the message is asking about the model
function isAskingAboutModel(message: string): boolean {
  const normalizedMessage = message.toLowerCase();
  
  const modelKeywords = [
    'which model', 'what model', 'which llm', 'what llm', 'which ai', 'what ai model',
    'which language model', 'what language model', 'deepseek', 'model are you', 'which version',
    'what version', 'model version', 'which ai are you', 'what are you running on',
    'powered by', 'running on', 'artificial model', 'artificial intelligence model',
    'ai model', 'language model', 'foundation model', 'underlying model', 'based on',
    'built on', 'trained on', 'architecture', 'neural network', 'transformer',
    'gpt', 'llama', 'claude', 'mistral', 'gemini', 'anthropic', 'openai',
    'what kind of ai', 'what type of ai', 'what sort of ai', 'which kind of ai',
    'which type of ai', 'which sort of ai', 'what are you', 'who are you',
    'tell me about yourself', 'your model', 'your architecture', 'your training',
    'your parameters', 'your capabilities', 'how were you made', 'how were you created',
    'how were you trained', 'how were you built', 'how do you work'
  ];
  
  return modelKeywords.some(keyword => normalizedMessage.includes(keyword));
}

// Function to create a streaming response for custom answers
function createCustomStreamingResponse(content: string) {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      // Send content in chunks to simulate streaming
      const chunks = content.match(/.{1,20}/g) || [];
      
      chunks.forEach((chunk, index) => {
        setTimeout(() => {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ content: chunk })}\n\n`)
          );
          
          if (index === chunks.length - 1) {
            controller.enqueue(encoder.encode('data: [DONE]\n\n'));
            controller.close();
          }
        }, index * 50); // Simulate typing delay
      });
    }
  });
  
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}

// Enhanced response validation interface
interface LLMResponse {
  choices?: Array<{
    delta?: { content?: string }
    message?: { content?: string }
  }>
  error?: { message?: string }
}

// Rate limiting configuration
const RATE_LIMIT = {
  maxRequests: 5,
  windowMs: 60 * 1000,
};

// Track rate limits
const requestCounts = new Map<string, number>();

// Enhanced error handling
class LLMError extends Error {
  constructor(
    public message: string,
    public statusCode: number = 500,
    public isRetryable: boolean = true
  ) {
    super(message);
    Object.setPrototypeOf(this, LLMError.prototype);
  }
}

// Validate LLM response
function validateLLMResponse(response: any): LLMResponse {
  if (!response || typeof response !== 'object') {
    throw new LLMError('Invalid response format', 500, false);
  }
  return response;
}

// Check rate limit
function checkRateLimit(ip: string): void {
  const count = requestCounts.get(ip) || 0;
  if (count >= RATE_LIMIT.maxRequests) {
    throw new LLMError(
      'Too many requests. Please try again later.',
      429,
      false
    );
  }
  requestCounts.set(ip, count + 1);
}

// Reset rate limit counts
setInterval(() => {
  requestCounts.clear();
}, RATE_LIMIT.windowMs);

// Enhanced streaming response handler for Gemini API
function createEnhancedStreamingResponse(
  response: Response,
  ip: string
): Response {
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  
  // Buffer for incomplete chunks
  let buffer = '';
  let lastContent = ''; // Track the last content to avoid duplicates
  let streamStartTime = Date.now();
  let lastChunkTime = Date.now();
  const MAX_STREAM_DURATION = 60000; // 60 seconds max stream duration
  const MAX_CHUNK_WAIT = 10000; // 10 seconds max wait between chunks
  
  const stream = new TransformStream({
    async transform(chunk, controller) {
      try {
        // Update last chunk time
        lastChunkTime = Date.now();
        
        const text = decoder.decode(chunk);
        console.log('Raw chunk:', text); // Debug logging
        
        // Add to buffer and process
        buffer += text;
        
        // Check for timeout conditions
        const currentTime = Date.now();
        if (currentTime - streamStartTime > MAX_STREAM_DURATION) {
          console.warn('Stream exceeded maximum duration, closing');
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content: "\n\n[Response exceeded time limit. Please try again with a shorter query.]" })}\n\n`));
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          return;
        }
        
        // Gemini can send data in different formats depending on the configuration
        // Try to handle both SSE format (data: ...) and raw JSON format
        
        // First check if we have SSE format
        if (buffer.includes('data:')) {
          // Split by SSE format (data: ...\n\n)
          const regex = /(data:\s*(.+?))\r?\n\r?\n/g;
          let match;
          let lastIndex = 0;
          
          while ((match = regex.exec(buffer)) !== null) {
            const data = match[2].trim(); // The actual data part
            lastIndex = match.index + match[0].length;
            
            if (data === '[DONE]') {
              controller.enqueue(encoder.encode('data: [DONE]\n\n'));
              continue;
            }
            
            try {
              // Parse the JSON data
              const parsed = JSON.parse(data);
              processGeminiResponse(parsed, controller);
            } catch (parseError) {
              console.error('Error parsing SSE JSON:', parseError, 'Data:', data);
              // Try to recover by sending the raw data if it looks like text
              if (data && !data.startsWith('{') && !data.startsWith('[')) {
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content: data })}\n\n`));
              }
            }
          }
          
          // Keep the unprocessed part
          if (lastIndex > 0) {
            buffer = buffer.substring(lastIndex);
          }
        } else {
          // Try processing as newline-delimited JSON
          const lines = buffer.split('\n');
          buffer = lines.pop() || ''; // Keep the last potentially incomplete line
          
          for (const line of lines) {
            if (!line.trim()) continue; // Skip empty lines
            
            try {
              const parsed = JSON.parse(line);
              processGeminiResponse(parsed, controller);
            } catch (parseError) {
              console.error('Error parsing line JSON:', parseError, 'Line:', line);
              // Try to recover by sending the raw line if it looks like text
              if (line && !line.startsWith('{') && !line.startsWith('[')) {
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content: line })}\n\n`));
              }
            }
          }
        }
        
        // If buffer gets too large, truncate it (prevent memory issues)
        if (buffer.length > 10000) {
          buffer = buffer.slice(buffer.length - 5000);
        }
      } catch (error) {
        console.error('Stream processing error:', error);
        // Send an error message to the client
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content: "\n\n[Error processing response. Please try again.]" })}\n\n`));
      }
      
      // Helper function to process Gemini response and extract content
      function processGeminiResponse(parsed: any, controller: TransformStreamDefaultController) {
        let content = '';
        
        // Check for different Gemini response structures
        if (parsed.candidates && parsed.candidates[0]?.content?.parts) {
          // Standard Gemini response format
          const textParts = parsed.candidates[0].content.parts
            .filter((part: any) => part.text)
            .map((part: any) => part.text);
          
          content = textParts.join('');
        } else if (parsed.text) {
          // Simple text format
          content = parsed.text;
        } else if (parsed.content) {
          // Direct content field
          content = typeof parsed.content === 'string' ? 
            parsed.content : 
            JSON.stringify(parsed.content);
        } else if (parsed.delta?.content) {
          // Handle delta updates (common in streaming)
          content = typeof parsed.delta.content === 'string' ?
            parsed.delta.content :
            JSON.stringify(parsed.delta.content);
        }
        
        // Only send if we have new content and it's not a duplicate
        if (content && content !== lastContent) {
          lastContent = content;
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content })}\n\n`));
        }
      }
    },
    
    async start(controller) {
      // Set up a watchdog timer to detect stalled streams
      const watchdog = setInterval(() => {
        const currentTime = Date.now();
        if (currentTime - lastChunkTime > MAX_CHUNK_WAIT) {
          console.warn('Stream stalled, no chunks received for', (currentTime - lastChunkTime) / 1000, 'seconds');
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content: "\n\n[Response stream stalled. The model may be overloaded. Please try again later.]" })}\n\n`));
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          clearInterval(watchdog);
        }
      }, 5000); // Check every 5 seconds
      
      // Clean up the watchdog when the stream ends
      setTimeout(() => clearInterval(watchdog), MAX_STREAM_DURATION + 1000);
    },
    
    flush(controller) {
      // Handle any remaining data in buffer
      if (buffer.trim()) {
        try {
          // Try to parse as JSON
          const jsonData = buffer.startsWith('data: ') ? buffer.substring(6) : buffer;
          try {
            const parsed = JSON.parse(jsonData);
            let content = '';
            
            // Check for different Gemini response structures
            if (parsed.candidates && parsed.candidates[0]?.content?.parts) {
              const textParts = parsed.candidates[0].content.parts
                .filter((part: any) => part.text)
                .map((part: any) => part.text);
              
              content = textParts.join('');
            } else if (parsed.text) {
              content = parsed.text;
            } else if (parsed.content) {
              content = typeof parsed.content === 'string' ? 
                parsed.content : 
                JSON.stringify(parsed.content);
            } else if (parsed.delta?.content) {
              // Handle delta updates
              content = typeof parsed.delta.content === 'string' ?
                parsed.delta.content :
                JSON.stringify(parsed.delta.content);
            }
            
            if (content) {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content })}\n\n`));
            }
          } catch (e) {
            // If parsing fails, just send the raw content if it looks like text
            const content = buffer.trim();
            if (content.length > 0 && !content.includes('{') && !content.includes('[')) {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content })}\n\n`));
            }
          }
        } catch (error) {
          console.error('Error in flush:', error);
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content: "\n\n[Error processing final response. Please try again.]" })}\n\n`));
        }
      }
      
      // Send a final DONE event
      controller.enqueue(encoder.encode('data: [DONE]\n\n'));
      
      // Clean up
      buffer = '';
      requestCounts.delete(ip);
    }
  });
  
  // Use proper headers for Vercel Edge Runtime
  return new Response(response.body?.pipeThrough(stream), {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
      'Transfer-Encoding': 'chunked',
      'Keep-Alive': 'timeout=120',
      'Access-Control-Allow-Origin': '*',
    },
  });
}

export async function POST(req: Request) {
  const ip = req.headers.get('x-forwarded-for') || 'unknown-ip';
  try {
    const { messages, fileContent, editIndex } = await req.json();
    
    // Select the appropriate model based on daily usage
    const selectedModel = getAppropriateModel(ip);
    const remainingGemini25Requests = getRemainingGemini25Requests(ip);
    
    // Log model selection for debugging
    console.log(`Using model: ${selectedModel} for IP: ${ip} (${remainingGemini25Requests} premium requests remaining today)`);

    if (!GEMINI_API_KEY) {
      throw new Error('Gemini API key is not configured');
    }

    // Check if the last user message is asking about the model
    const lastUserMessage = messages.findLast((msg: any) => msg.role === 'user');
    if (lastUserMessage && isAskingAboutModel(lastUserMessage.content)) {
      const customResponse = "I'm BK Zen Vibe, a custom AI assistant designed to provide helpful, accurate information. I'm built on proprietary technology developed specifically for conversational AI applications. My capabilities include understanding context, processing natural language, and generating human-like responses. I'm continuously being improved to better assist users with their questions and tasks.";
      return createCustomStreamingResponse(customResponse);
    }

    // Prepare the messages array with file content if present
    const processedMessages = fileContent 
      ? [
          ...messages,
          {
            role: "system",
            content: `The user has shared one or more files with the following content. Please analyze and respond to their message in the context of these files:

${fileContent}

Important: If the files contain code, please analyze it thoroughly. If the user is asking about issues or improvements, provide specific suggestions referencing the relevant parts of the code.`
          }
        ]
      : messages;

    // Add timeout and retry logic with exponential backoff
    let retries = 3;
    let delay = 1000; // Start with 1 second delay
    
    while (retries > 0) {
      try {
        // Initialize the model
        const model = genAI.getGenerativeModel({ model: selectedModel });
        
        // Convert messages to Gemini format
        const contents = [];
        let pendingSystemContent = '';
        
        for (let i = 0; i < processedMessages.length; i++) {
          const msg = processedMessages[i];
          
          if (msg.role === 'system') {
            pendingSystemContent += (pendingSystemContent ? '\n\n' : '') + msg.content;
            continue;
          }
          
          if (msg.role === 'user') {
            const userContent = pendingSystemContent 
              ? `[System Instructions: ${pendingSystemContent}]\n\n${msg.content}`
              : msg.content;
            
            contents.push({
              role: 'user',
              parts: [{ text: userContent }]
            });
            
            pendingSystemContent = '';
          } else if (msg.role === 'assistant') {
            contents.push({
              role: 'model',
              parts: [{ text: msg.content }]
            });
          }
        }
        
        if (contents.length === 0 && pendingSystemContent) {
          contents.push({
            role: 'user',
            parts: [{ text: pendingSystemContent }]
          });
        }
        
        if (contents.length === 0) {
          throw new Error('No valid messages to send to Gemini API');
        }
        
        const lastMessage = contents[contents.length - 1];
        if (lastMessage.role !== 'user') {
          throw new Error('Conversation must end with a user message for Gemini API');
        }
        
        // Start the chat with the correct configuration
        const chat = model.startChat({
          history: contents.slice(0, -1),
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 8192,
            topP: 0.95,
            topK: 40
          }
        });

        // Send the last message and get the response stream
        const result = await chat.sendMessageStream(lastMessage.parts[0].text);
        
        // Create a readable stream from the response
        const stream = new ReadableStream({
          async start(controller) {
            try {
              for await (const chunk of result.stream) {
                const text = chunk.text();
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content: text })}\n\n`));
              }
              controller.enqueue(encoder.encode('data: [DONE]\n\n'));
              controller.close();
            } catch (error: unknown) {
              const errorMessage = error instanceof Error ? error.message : 'Unknown streaming error occurred';
              console.error('Stream processing error:', errorMessage);
              controller.error(new Error(errorMessage));
            }
          }
        });

        return new Response(stream, {
          headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache, no-transform',
            'Connection': 'keep-alive',
          },
        });
        
      } catch (error: unknown) {
        console.error('Chat error:', error);
        
        // Check if it's a rate limit error
        if (error instanceof Error && 
            (error.message.includes('429') || 
             error.message.toLowerCase().includes('rate limit') ||
             error.message.toLowerCase().includes('too many requests'))) {
          if (retries > 1) {
            console.log(`Rate limit hit. Retrying in ${delay}ms... (${retries - 1} retries left)`);
            await new Promise(resolve => setTimeout(resolve, delay));
            retries--;
            delay *= 2; // Exponential backoff
            continue;
          }
        }
        
        // For other errors, or if we're out of retries, throw the error
        throw error;
      }
    }

    throw new Error('Failed to get response after retries');
  } catch (error: unknown) {
    console.error('Unexpected error:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
    const statusCode = errorMessage.includes('429') ? 429 : 500;
    
    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        retryAfter: statusCode === 429 ? 5 : undefined // Suggest retry after 5 seconds for rate limits
      }),
      { 
        status: statusCode,
        headers: { 
          'Content-Type': 'application/json',
          ...(statusCode === 429 ? { 'Retry-After': '5' } : {})
        }
      }
    );
  }
}