import { NextResponse } from 'next/server';
import { getAppropriateModel } from '@/lib/model-utils';
import { GoogleGenerativeAI } from "@google/generative-ai";

// Add export config for Edge Runtime
export const runtime = 'edge';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

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

export async function POST(req: Request) {
  try {
    const { messages, fileContent } = await req.json();
    
    // Get the appropriate model
    const selectedModel = getAppropriateModel();
    
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
        retryAfter: statusCode === 429 ? 5 : undefined
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