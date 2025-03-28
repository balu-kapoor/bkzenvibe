import { NextResponse } from 'next/server';

// Add export config for Edge Runtime
export const runtime = 'edge';

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';

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

// Enhanced streaming response handler
function createEnhancedStreamingResponse(
  response: Response,
  ip: string
): Response {
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  
  // Buffer for incomplete chunks
  let buffer = '';
  
  const stream = new TransformStream({
    async transform(chunk, controller) {
      try {
        const text = decoder.decode(chunk);
        
        // Add to buffer and process
        buffer += text;
        
        // Split by SSE format (data: ...\n\n)
        const regex = /(data: (.+?))\r?\n\r?\n/g;
        let match;
        let lastIndex = 0;
        
        // Process complete SSE messages
        while ((match = regex.exec(buffer)) !== null) {
          const data = match[2]; // The actual data part
          lastIndex = match.index + match[0].length;
          
          if (data === '[DONE]') {
            controller.enqueue(encoder.encode('data: [DONE]\n\n'));
            continue;
          }
          
          try {
            // Parse the JSON data
            const parsed = JSON.parse(data);
            
            // Extract content from various response formats
            const content = parsed.choices?.[0]?.delta?.content || 
                          parsed.choices?.[0]?.message?.content || 
                          '';
            
            if (content) {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content })}\n\n`));
            }
          } catch (parseError) {
            console.error('Error parsing JSON:', parseError);
            
            // Advanced JSON repair strategies
            let extractedContent = '';
            let repairSuccessful = false;
            
            // Strategy 1: Extract content field with regex
            const contentRegex = /"content":"((?:\\.|[^"\\])*)"/;
            const contentMatch = contentRegex.exec(data);
            if (contentMatch && contentMatch[1]) {
              extractedContent = contentMatch[1]
                .replace(/\\"/g, '"')
                .replace(/\\\\/g, '\\');
              repairSuccessful = true;
            }
            
            // Strategy 2: Handle code blocks specifically
            if (!repairSuccessful && (data.includes('```') || data.includes('\\n```'))) {
              const codeBlockRegex = /"content":"((?:\\.|[^"])*?)(?:\\n```|```)/;
              const codeMatch = codeBlockRegex.exec(data);
              if (codeMatch && codeMatch[1]) {
                extractedContent = codeMatch[1]
                  .replace(/\\"/g, '"')
                  .replace(/\\\\/g, '\\');
                repairSuccessful = true;
              }
            }
            
            // Strategy 3: Extract any text between quotes after "content":
            if (!repairSuccessful) {
              const simpleExtract = /"content":"([^"]*)/.exec(data);
              if (simpleExtract && simpleExtract[1]) {
                extractedContent = simpleExtract[1];
                repairSuccessful = true;
              }
            }
            
            // Strategy 4: Last resort - extract anything that looks like content
            if (!repairSuccessful) {
              // Look for any text between quotes
              const anyTextMatch = /"([^"]+)"/.exec(data);
              if (anyTextMatch && anyTextMatch[1] && anyTextMatch[1].length > 5) {
                extractedContent = anyTextMatch[1];
                repairSuccessful = true;
              }
            }
            
            // If we extracted anything, send it
            if (repairSuccessful && extractedContent) {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content: extractedContent })}\n\n`));
            } else {
              // If all strategies failed, send a space to keep the stream alive
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content: ' ' })}\n\n`));
            }
          }
        }
        
        // Keep the unprocessed part in the buffer
        if (lastIndex > 0) {
          buffer = buffer.slice(lastIndex);
        }
        
        // If buffer gets too large, truncate it (prevent memory issues)
        if (buffer.length > 10000) {
          buffer = buffer.slice(buffer.length - 5000);
        }
      } catch (error) {
        console.error('Stream processing error:', error);
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: 'Stream processing error' })}\n\n`));
      }
    },
    
    // Process any remaining buffer data when the stream closes
    flush(controller) {
      if (buffer.length > 0) {
        try {
          // Try to extract any remaining content from the buffer
          const contentMatch = /"content":"([^"]*)"/.exec(buffer);
          if (contentMatch && contentMatch[1]) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content: contentMatch[1] })}\n\n`));
          }
        } catch (e) {
          // Ignore errors in flush
        }
      }
      
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
      'Transfer-Encoding': 'chunked'
    },
  });
}

export async function POST(req: Request) {
  const ip = req.headers.get('x-forwarded-for') || 'unknown';
  try {
    checkRateLimit(ip);
    const { messages, fileContent, editIndex } = await req.json();

    // If editing a message, replace it in the messages array
    if (typeof editIndex === 'number' && editIndex >= 0) {
      const editedMessage = messages[editIndex];
      if (editedMessage) {
        messages.splice(editIndex, 1, editedMessage);
      }
    }

    if (!OPENROUTER_API_KEY) {
      throw new LLMError('OpenRouter API key is not configured', 500, false);
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

    // Add timeout and retry logic for Vercel
    let retries = 3;
    let response;
    
    while (retries > 0) {
      try {
        response = await fetch(OPENROUTER_API_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
            'HTTP-Referer': process.env.VERCEL_URL || 'http://localhost:3000',
            'X-Title': 'BK Zen Vibe Chat App',
          },
          body: JSON.stringify({
            model: 'deepseek/deepseek-chat-v3-0324:free',
            messages: processedMessages,
            temperature: 0.7,
            max_tokens: 1000,
            stream: true,
          }),
        });
        
        if (response.ok) break;
        
        // If we get a rate limit error, wait and retry
        if (response.status === 429) {
          await new Promise(resolve => setTimeout(resolve, 1000));
          retries--;
          continue;
        }
        
        // For other errors, throw immediately
        const error = await response.json();
        throw new LLMError(
          error.message || 'Failed to fetch response',
          response.status
        );
      } catch (fetchError) {
        if (retries <= 1) throw fetchError;
        retries--;
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    if (!response || !response.ok) {
      throw new LLMError('Failed to get response after retries', 500);
    }

    return createEnhancedStreamingResponse(response, ip);
  } catch (error) {
    if (error instanceof LLMError) {
      return new Response(
        JSON.stringify({ error: error.message }),
        { 
          status: error.statusCode,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'An unexpected error occurred' }),
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}