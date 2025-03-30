import { HfInference } from '@huggingface/inference';
import { env } from '@/env.mjs';

const hf = new HfInference(env.HUGGINGFACE_API_KEY);

export interface GenerateImageParams {
  prompt: string;
  negativePrompt?: string;
  numInferenceSteps?: number;
  seed?: number;
}

// Retry and cooldown configuration
const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY = 2000; // 2 seconds
const COOLDOWN_PERIOD = 3000; // 3 seconds cooldown between requests
let lastRequestTime = 0;

async function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function waitForCooldown() {
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;
  
  if (timeSinceLastRequest < COOLDOWN_PERIOD) {
    const waitTime = COOLDOWN_PERIOD - timeSinceLastRequest;
    console.log(`Waiting ${waitTime}ms for cooldown...`);
    await delay(waitTime);
  }
  
  lastRequestTime = Date.now();
}

async function generateImageWithRetry(
  params: Parameters<typeof hf.textToImage>[0],
  retryCount = 0
): Promise<Blob> {
  try {
    // Wait for cooldown before making a request
    await waitForCooldown();

    const response = await hf.textToImage(params);
    if (!response) {
      throw new Error('No response received from image generation API');
    }
    return response;
  } catch (error: any) {
    console.log(`Request failed (attempt ${retryCount + 1}/${MAX_RETRIES + 1}):`, error.message);

    // If we've used all retries, throw the error
    if (retryCount >= MAX_RETRIES) {
      throw error;
    }

    // Retry on server errors, blob errors, or network issues
    if (
      error.message.includes('Internal Server Error') ||
      error.message.includes('blob') ||
      (error.status && error.status >= 500) ||
      error.message.includes('network') ||
      error.message.includes('timeout')
    ) {
      const delayTime = INITIAL_RETRY_DELAY * Math.pow(2, retryCount);
      console.log(`Retry attempt ${retryCount + 1}/${MAX_RETRIES} after ${delayTime}ms...`);
      await delay(delayTime);
      return generateImageWithRetry(params, retryCount + 1);
    }

    // For other errors, throw immediately
    throw error;
  }
}

export async function generateImage({
  prompt,
  negativePrompt = "ugly, blurry, bad quality, distorted, disfigured",  // SD 2.1 works well with negative prompts
  numInferenceSteps = 30,  // SD 2.1 default steps
  seed = Math.floor(Math.random() * 2147483647),
}: GenerateImageParams): Promise<Blob> {
  try {
    // Validate API key
    if (!env.HUGGINGFACE_API_KEY) {
      throw new Error('HUGGINGFACE_API_KEY is not configured');
    }

    console.log('Starting image generation...', {
      model: "stabilityai/stable-diffusion-2-1",
      prompt,
      numInferenceSteps,
      seed,
    });
    
    const response = await generateImageWithRetry({
      inputs: prompt,
      model: "stabilityai/stable-diffusion-2-1",
      parameters: {
        negative_prompt: negativePrompt,
        num_inference_steps: numInferenceSteps,
        seed: seed,
        guidance_scale: 7.5,  // Default guidance scale for SD 2.1
      }
    });

    // Log successful generation
    console.log('Image generated successfully', {
      size: response.size,
      type: response.type
    });

    return response;
  } catch (error: any) {
    // Enhanced error logging
    console.error('Image generation failed:', {
      error: error.message,
      status: error.status,
      response: error.response?.data,
      stack: error.stack
    });

    // Provide more specific error messages
    if (error.status === 401 || error.status === 403) {
      throw new Error('Invalid or unauthorized API key. Make sure you have accepted the model terms at: https://huggingface.co/stabilityai/stable-diffusion-2-1');
    } else if (error.status === 429) {
      throw new Error('Rate limit exceeded. Please try again later.');
    } else if (error.status >= 500) {
      throw new Error('Hugging Face API service error. Please try again later.');
    }

    throw error;
  }
} 