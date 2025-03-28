import { NextResponse } from 'next/server';

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

export async function POST(req: Request) {
  try {
    const { messages, fileContent } = await req.json();

    if (!OPENROUTER_API_KEY) {
      return NextResponse.json(
        { error: 'OpenRouter API key is not configured' },
        { status: 500 }
      );
    }

    // Check if the last user message is asking about the model
    const lastUserMessage = messages.findLast((msg: any) => msg.role === 'user');
    if (lastUserMessage && isAskingAboutModel(lastUserMessage.content)) {
      // Provide a custom response about your custom model
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

    const response = await fetch(OPENROUTER_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'HTTP-Referer': 'http://localhost:3000',
        'X-Title': 'DeepSeek Chat App',
      },
      body: JSON.stringify({
        model: 'deepseek/deepseek-chat-v3-0324:free',
        messages: processedMessages,
        temperature: 0.7,
        max_tokens: 1000,
        stream: true,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      return NextResponse.json(
        { error: error.message || 'Failed to fetch response' },
        { status: response.status }
      );
    }

    // Create a TransformStream to process the response
    const stream = new TransformStream({
      async transform(chunk, controller) {
        const text = new TextDecoder().decode(chunk);
        
        // More robust line splitting that can handle different types of newlines
        const lines = text.split(/\r?\n/).filter(line => line.trim() !== '');
        
        // Keep track of any accumulated content that might be split across chunks
        let accumulatedBuffer = '';
        
        for (const line of lines) {
          // Process each line
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') {
              controller.enqueue('data: [DONE]\n\n');
              continue;
            }

            try {
              // Attempt to parse the JSON data
              const parsed = JSON.parse(data);
              
              // Handle both OpenAI-style and OpenRouter-style streaming responses
              const content = parsed.choices?.[0]?.delta?.content || 
                            parsed.choices?.[0]?.message?.content || 
                            '';
              
              if (content) {
                controller.enqueue(`data: ${JSON.stringify({ content })}\n\n`);
              }
            } catch (e) {
              console.error('Error parsing chunk:', e);
              
              // =========================
              // Enhanced Error Recovery
              // =========================
              
              try {
                // 1. Get diagnostic info
                const errorMessage = (e as Error).message;
                const positionMatch = /position (\d+)/.exec(errorMessage);
                const errorPosition = positionMatch ? parseInt(positionMatch[1]) : -1;
                
                // 2. Specific handling for code blocks which often cause issues
                const hasCodeBlock = 
                  data.includes('```') || 
                  data.includes('\\n```') || 
                  data.includes('code fence');
                
                // 3. Apply appropriate recovery strategy
                let content = '';
                let recoverySuccessful = false;
                
                // Strategy 1: Handle special cases with code blocks
                if (hasCodeBlock) {
                  // Look for content field directly, which often works for code blocks
                  const codeMatch = /"content":"(.*?)(?:",|"})/.exec(data);
                  if (codeMatch && codeMatch[1]) {
                    content = codeMatch[1]
                      .replace(/\\"/g, '"')  // Fix escaped quotes in code
                      .replace(/\\\\/g, '\\'); // Fix double escaped backslashes
                    
                    controller.enqueue(`data: ${JSON.stringify({ content })}\n\n`);
                    recoverySuccessful = true;
                  }
                }
                
                // Strategy 2: Truncate at the error position and get partial content
                if (!recoverySuccessful && errorPosition > 0) {
                  try {
                    // If error is at a specific position, we can try to extract content
                    // by truncating at that position to get valid JSON
                    const truncated = data.substring(0, errorPosition);
                    const lastValidQuotePos = truncated.lastIndexOf('"');
                    
                    if (lastValidQuotePos > 0) {
                      const partialJson = truncated.substring(0, lastValidQuotePos) + '"}';
                      try {
                        const partialParsed = JSON.parse(partialJson);
                        const partialContent = partialParsed.choices?.[0]?.delta?.content || '';
                        
                        if (partialContent) {
                          controller.enqueue(`data: ${JSON.stringify({ content: partialContent })}\n\n`);
                          recoverySuccessful = true;
                        }
                      } catch {
                        // Failed to parse partial JSON, continue to next strategy
                      }
                    }
                  } catch {
                    // Failed truncation strategy, continue to next strategy
                  }
                }
                
                // Strategy 3: Fall back to the original sanitization methods
                if (!recoverySuccessful) {
                  // Fix unterminated strings by adding closing quotes and braces
                  let sanitizedData = data;
                  
                  // Balance quotes
                  let quoteCount = 0;
                  let inEscapeSequence = false;
                  for (let i = 0; i < sanitizedData.length; i++) {
                    if (sanitizedData[i] === '\\' && !inEscapeSequence) {
                      inEscapeSequence = true;
                    } else {
                      if (sanitizedData[i] === '"' && !inEscapeSequence) {
                        quoteCount++;
                      }
                      inEscapeSequence = false;
                    }
                  }
                  
                  if (quoteCount % 2 !== 0) {
                    sanitizedData += '"';
                  }
                  
                  // Balance braces
                  let openBraces = 0, closeBraces = 0;
                  for (let i = 0; i < sanitizedData.length; i++) {
                    if (sanitizedData[i] === '{') openBraces++;
                    if (sanitizedData[i] === '}') closeBraces++;
                  }
                  
                  while (openBraces > closeBraces) {
                    sanitizedData += '}';
                    closeBraces++;
                  }
                  
                  try {
                    const sanitizedParsed = JSON.parse(sanitizedData);
                    const sanitizedContent = sanitizedParsed.choices?.[0]?.delta?.content || 
                                          sanitizedParsed.choices?.[0]?.message?.content || 
                                          '';
                    
                    if (sanitizedContent) {
                      controller.enqueue(`data: ${JSON.stringify({ content: sanitizedContent })}\n\n`);
                      recoverySuccessful = true;
                    }
                  } catch {
                    // Sanitizing still didn't work
                  }
                }
                
                // Strategy 4: Direct regex extraction as a last resort
                if (!recoverySuccessful) {
                  const contentMatch = /"(?:content|text)":"([^"]*)/.exec(data);
                  if (contentMatch && contentMatch[1]) {
                    controller.enqueue(`data: ${JSON.stringify({ content: contentMatch[1] })}\n\n`);
                  } else {
                    // We've tried everything, but can't extract meaningful content
                    // Let's just pass a space character to keep the stream alive
                    controller.enqueue(`data: ${JSON.stringify({ content: ' ' })}\n\n`);
                  }
                }
              } catch (finalRecoveryError) {
                console.error('All recovery strategies failed:', finalRecoveryError);
                // Send a space to keep the stream alive even in total failure
                controller.enqueue(`data: ${JSON.stringify({ content: ' ' })}\n\n`);
              }
            }
          }
        }
      },
    });

    return new Response(response.body?.pipeThrough(stream), {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    console.error('Chat API Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 