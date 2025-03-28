import { NextResponse } from 'next/server';

// Add export config for Edge Runtime
export const runtime = 'edge';

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';

// Function to check if the message is asking about the model
function isAskingAboutModel(message: string): boolean {
  const modelKeywords = [
    'which model', 'what model', 'which llm', 'what llm', 'which ai', 'what ai model',
    'which language model', 'what language model', 'deepseek', 'model are you', 'which version',
    'what version', 'model version', 'which ai are you', 'what are you running on',
    'powered by', 'running on'
  ];
  
  const normalizedMessage = message.toLowerCase();
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
  
  const stream = new TransformStream({
    async transform(chunk, controller) {
      try {
        const text = decoder.decode(chunk);
        const lines = text.split(/\r?\n/).filter(line => line.trim() !== '');
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            
            if (data === '[DONE]') {
              controller.enqueue(encoder.encode('data: [DONE]\n\n'));
              continue;
            }
            
            try {
              // Parse the JSON data
              const parsed = JSON.parse(data);
              
              // Handle both OpenAI-style and OpenRouter-style streaming responses
              const content = parsed.choices?.[0]?.delta?.content || 
                            parsed.choices?.[0]?.message?.content || 
                            '';
              
              if (content) {
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content })}\n\n`));
              }
            } catch (e) {
              console.error('Error parsing chunk:', e);
              
              // Enhanced Error Recovery
              try {
                // Get diagnostic info
                const errorMessage = (e as Error).message;
                const positionMatch = /position (\d+)/.exec(errorMessage);
                const errorPosition = positionMatch ? parseInt(positionMatch[1]) : -1;
                
                // Check for code blocks which often cause issues
                const hasCodeBlock = 
                  data.includes('```') || 
                  data.includes('\\n```') || 
                  data.includes('code fence');
                
                // Apply recovery strategy
                let content = '';
                let recoverySuccessful = false;
                
                // Strategy 1: Handle special cases with code blocks
                if (hasCodeBlock) {
                  const codeMatch = /"content":"(.*?)(?:",|"})/.exec(data);
                  if (codeMatch && codeMatch[1]) {
                    content = codeMatch[1]
                      .replace(/\\"/g, '"')
                      .replace(/\\\\/g, '\\');
                    
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content })}\n\n`));
                    recoverySuccessful = true;
                  }
                }
                
                // Strategy 2: Truncate at the error position
                if (!recoverySuccessful && errorPosition > 0) {
                  try {
                    const truncated = data.substring(0, errorPosition);
                    const lastValidQuotePos = truncated.lastIndexOf('"');
                    
                    if (lastValidQuotePos > 0) {
                      const partialJson = truncated.substring(0, lastValidQuotePos) + '"}';
                      try {
                        const partialParsed = JSON.parse(partialJson);
                        const partialContent = partialParsed.choices?.[0]?.delta?.content || '';
                        
                        if (partialContent) {
                          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content: partialContent })}\n\n`));
                          recoverySuccessful = true;
                        }
                      } catch {
                        // Failed to parse partial JSON
                      }
                    }
                  } catch {
                    // Failed truncation strategy
                  }
                }
                
                // Strategy 3: Direct regex extraction as a last resort
                if (!recoverySuccessful) {
                  const contentMatch = /"(?:content|text)":"([^"]*)/.exec(data);
                  if (contentMatch && contentMatch[1]) {
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content: contentMatch[1] })}\n\n`));
                  } else {
                    // Send a space to keep the stream alive
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content: ' ' })}\n\n`));
                  }
                }
              } catch (finalError) {
                console.error('All recovery strategies failed:', finalError);
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content: ' ' })}\n\n`));
              }
            }
          }
        }
      } catch (error) {
        console.error('Stream processing error:', error);
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: 'Stream processing error' })}\n\n`));
      }
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
      const customResponse = "I'm running on BK Zen Vibe's proprietary AI model, which combines advanced neural networks with specialized knowledge processing. This custom model was developed to provide high-quality responses with a focus on helpful, accurate information.";
      return createCustomStreamingResponse(customResponse);
    }

    // Prepare the messages array with file content if present
    const processedMessages = fileContent 
      ? [
          ...messages,
          {
            role: "system",
            content: `The user has shared a file with the following content:\n\n${fileContent}\n\nPlease analyze and respond to their message in the context of this file content.`
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