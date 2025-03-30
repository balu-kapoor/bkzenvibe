import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

// Add export config for Edge Runtime
export const runtime = 'edge';

// Initialize API keys
const HUGGINGFACE_API_KEY = process.env.HUGGINGFACE_API_KEY;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

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
    const { prompt, size = '1024x1024' } = await req.json();
    
    if (!prompt || typeof prompt !== 'string') {
      throw new ImageGenerationError('A text prompt is required', 400);
    }
    
    // Validate size parameter - Hugging Face supports various sizes
    const validSizes = ['512x512', '768x768', '1024x1024'];
    if (!validSizes.includes(size)) {
      throw new ImageGenerationError(`Invalid size parameter. Must be one of: ${validSizes.join(', ')}`, 400);
    }

    try {
      // Parse the size dimensions
      const [width, height] = size.split('x').map(Number);
      
      // Call the Hugging Face API for image generation using Stable Diffusion
      const response = await axios({
        method: 'post',
        url: 'https://api-inference.huggingface.co/models/stabilityai/stable-diffusion-xl-base-1.0',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${HUGGINGFACE_API_KEY}`,
        },
        data: {
          inputs: prompt,
          parameters: {
            height: height,
            width: width,
            num_inference_steps: 30,
            guidance_scale: 7.5,
            negative_prompt: 'blurry, bad quality, distorted, disfigured',
          },
        },
        responseType: 'arraybuffer',
      });

      // Convert the binary response to base64
      const buffer = Buffer.from(response.data, 'binary');
      const imageData = buffer.toString('base64');
      const textResponse = 'Image generated successfully';
      
      if (!imageData) {
        throw new ImageGenerationError('No image was generated', 500);
      }
      
      // Return the image data, any text response, and the size used
      return NextResponse.json({
        success: true,
        imageData,
        textResponse,
        size
      });
      
    } catch (error: any) {
      console.error('Hugging Face API error:', error);
      throw new ImageGenerationError(
        error.response?.data?.error || error.message || 'Failed to generate image',
        error.response?.status || 500
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
