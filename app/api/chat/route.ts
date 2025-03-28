import { NextResponse } from 'next/server';

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';
const MAX_RETRIES = 3;
const TIMEOUT = 30000; // 30 seconds

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

async function fetchWithRetry(url: string, options: RequestInit, retries = MAX_RETRIES): Promise<Response> {
  try {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), TIMEOUT);
    
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    
    clearTimeout(id);
    return response;
  } catch (error) {
    if (retries > 0) {
      console.log(`Retrying request, ${retries} attempts remaining...`);
      await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second before retrying
      return fetchWithRetry(url, options, retries - 1);
    }
    throw error;
  }
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

    const response = await fetchWithRetry(OPENROUTER_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'HTTP-Referer': process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000',
        'X-Title': 'BK Zen Vibe Chat',
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
      console.error('OpenRouter API Error:', error);
      return NextResponse.json(
        { error: error.message || 'Failed to fetch response' },
        { status: response.status }
      );
    }

    return new Response(response.body, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error: any) {
    console.error('Chat API Error:', error);
    const errorMessage = error.code === 'UND_ERR_CONNECT_TIMEOUT' 
      ? 'Connection timeout. Please try again.'
      : 'Internal server error';
    
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}