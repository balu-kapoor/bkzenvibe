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
        'HTTP-Referer': process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000',
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
    let partialData = '';
    
    const stream = new TransformStream({
      async transform(chunk, controller) {
        const text = new TextDecoder().decode(chunk);
        
        // Combine with any leftover partial data
        const fullText = partialData + text;
        partialData = '';
        
        // Split into lines and process each one
        const lines = fullText.split(/\n/);
        
        // Process all lines except the last one (which might be incomplete)
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i].trim();
          if (!line) continue;
          
          // If this is the last line and doesn't end with a newline, save it for later
          if (i === lines.length - 1 && !text.endsWith('\n')) {
            partialData = line;
            continue;
          }
          
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') {
              controller.enqueue('data: [DONE]\n\n');
              continue;
            }
            
            // Handle the data
            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices?.[0]?.delta?.content || 
                            parsed.choices?.[0]?.message?.content || 
                            '';
              
              if (content) {
                // Process content to handle special characters and code blocks
                const processedContent = content
                  .replace(/\\n/g, '\n')
                  .replace(/\\`/g, '`')
                  .replace(/\\\\/g, '\\')
                  .replace(/\\"/g, '"');
                
                controller.enqueue(`data: ${JSON.stringify({ content: processedContent })}\n\n`);
              }
            } catch (e) {
              // If we get a JSON parse error, try to recover the content
              try {
                // First, try to fix common JSON issues
                let fixedData = data;
                
                // 1. Fix unclosed quotes at the end
                if (fixedData.match(/"[^"]*$/)) {
                  fixedData += '"';
                }
                
                // 2. Fix unclosed braces
                const openBraces = (fixedData.match(/{/g) || []).length;
                const closeBraces = (fixedData.match(/}/g) || []).length;
                if (openBraces > closeBraces) {
                  fixedData += '}'.repeat(openBraces - closeBraces);
                }
                
                try {
                  // Try parsing the fixed data
                  const parsed = JSON.parse(fixedData);
                  const content = parsed.choices?.[0]?.delta?.content || 
                                parsed.choices?.[0]?.message?.content || 
                                '';
                  
                  if (content) {
                    controller.enqueue(`data: ${JSON.stringify({ content })}\n\n`);
                  }
                } catch {
                  // If fixing didn't work, try regex extraction
                  const contentMatch = /"content":"((?:[^"\\]|\\.)*)"/.exec(data);
                  if (contentMatch && contentMatch[1]) {
                    const content = contentMatch[1]
                      .replace(/\\n/g, '\n')
                      .replace(/\\`/g, '`')
                      .replace(/\\\\/g, '\\')
                      .replace(/\\"/g, '"');
                    
                    controller.enqueue(`data: ${JSON.stringify({ content })}\n\n`);
                  } else {
                    // Last resort: try to extract any text between content markers
                    const lastResortMatch = /content"?\s*:\s*"([^"]*)"/.exec(data);
                    if (lastResortMatch && lastResortMatch[1]) {
                      controller.enqueue(`data: ${JSON.stringify({ content: lastResortMatch[1] })}\n\n`);
                    }
                  }
                }
              } catch (recoveryError) {
                console.error('Recovery failed:', recoveryError);
                // Keep the stream alive with a space character
                controller.enqueue(`data: ${JSON.stringify({ content: ' ' })}\n\n`);
              }
            }
          }
        }
      },
      flush(controller) {
        // Process any remaining partial data when the stream ends
        if (partialData) {
          try {
            const parsed = JSON.parse(partialData);
            const content = parsed.choices?.[0]?.delta?.content || 
                          parsed.choices?.[0]?.message?.content || 
                          '';
            
            if (content) {
              controller.enqueue(`data: ${JSON.stringify({ content })}\n\n`);
            }
          } catch {
            // Ignore parsing errors in the final flush
          }
        }
      }
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