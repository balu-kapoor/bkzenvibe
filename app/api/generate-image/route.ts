import { NextRequest, NextResponse } from 'next/server';
import { generateImage } from "@/lib/image-generation";
import { env } from "@/env.mjs";

// Add export config for Edge Runtime
export const runtime = 'edge';

// Initialize API keys
const HUGGINGFACE_API_KEY = process.env.HUGGINGFACE_API_KEY;

// Simple in-memory rate limiting
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute in milliseconds
const requestLog = new Map<string, { count: number; resetTime: number }>();

function checkRateLimit(ip: string, maxRequests: number = parseInt(env.RATE_LIMIT_MAX)) {
  const now = Date.now();
  const userRequests = requestLog.get(ip);

  // Clean up expired entries
  for (const [key, value] of requestLog.entries()) {
    if (now > value.resetTime) {
      requestLog.delete(key);
    }
  }

  if (!userRequests || now > userRequests.resetTime) {
    // First request or window expired
    requestLog.set(ip, {
      count: 1,
      resetTime: now + RATE_LIMIT_WINDOW
    });
    return {
      success: true,
      limit: maxRequests,
      remaining: maxRequests - 1,
      reset: Math.floor((now + RATE_LIMIT_WINDOW) / 1000)
    };
  }

  if (userRequests.count >= maxRequests) {
    // Rate limit exceeded
    return {
      success: false,
      limit: maxRequests,
      remaining: 0,
      reset: Math.floor(userRequests.resetTime / 1000)
    };
  }

  // Increment request count
  userRequests.count += 1;
  return {
    success: true,
    limit: maxRequests,
    remaining: maxRequests - userRequests.count,
    reset: Math.floor(userRequests.resetTime / 1000)
  };
}

// Error handling
class ImageGenerationError extends Error {
  statusCode: number;
  
  constructor(message: string, statusCode: number = 500) {
    super(message);
    this.name = 'ImageGenerationError';
    this.statusCode = statusCode;
    Object.setPrototypeOf(this, ImageGenerationError.prototype);
  }
}

export async function POST(req: NextRequest) {
  try {
    // Check if API key is configured
    if (!HUGGINGFACE_API_KEY) {
      throw new ImageGenerationError('Hugging Face API key is not configured', 500);
    }

    // Parse request body
    const { prompt, negativePrompt } = await req.json();
    
    if (!prompt || typeof prompt !== 'string') {
      throw new ImageGenerationError('A text prompt is required', 400);
    }

    // Rate limit by IP
    const ip = req.headers.get("x-forwarded-for") ?? "127.0.0.1";
    const { success, limit, reset, remaining } = checkRateLimit(ip);

    if (!success) {
      return NextResponse.json(
        {
          error: "Too many requests",
          limit,
          reset,
          remaining,
        },
        {
          status: 429,
          headers: {
            "X-RateLimit-Limit": limit.toString(),
            "X-RateLimit-Remaining": remaining.toString(),
            "X-RateLimit-Reset": reset.toString(),
          },
        }
      );
    }

    try {
      // Generate image using our optimized SDXL Turbo implementation
      const imageBlob = await generateImage({ 
        prompt,
        negativePrompt,
      });

      // Convert blob to base64
      const arrayBuffer = await imageBlob.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const imageData = buffer.toString('base64');
      
      if (!imageData) {
        throw new ImageGenerationError('No image was generated', 500);
      }
      
      // Return the image data and rate limit info
      return NextResponse.json({
        success: true,
        imageData,
        textResponse: 'Image generated successfully',
        limit,
        remaining,
        reset,
      });
      
    } catch (error: any) {
      console.error('Image generation error:', error);
      throw new ImageGenerationError(
        error.message || 'Failed to generate image',
        500
      );
    }
  } catch (error) {
    console.error('Image generation error:', error);
    
    if (error instanceof ImageGenerationError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode }
      );
    }
    
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json(
    { error: "Method not allowed" },
    { status: 405 }
  );
}
