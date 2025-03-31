import { HfInference } from '@huggingface/inference';
import { env } from '@/env.mjs';

const hf = new HfInference(env.HUGGINGFACE_API_KEY);

// Available models in order of preference
const MODELS = [
  "stabilityai/stable-diffusion-xl-base-1.0",  // Fast and reliable
  "stabilityai/stable-diffusion-2-1",         // Good quality fallback
  "runwayml/stable-diffusion-v1-5"            // Most permissive model as last resort
];

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
  retryCount = 0,
  modelIndex = 0
): Promise<Blob> {
  try {
    // Wait for cooldown before making a request
    await waitForCooldown();

    // Update model to current attempt
    const currentModel = MODELS[modelIndex];
    params.model = currentModel;

    // Log the request parameters
    console.log('Making request to Hugging Face API:', {
      model: currentModel,
      prompt: params.inputs,
      parameters: params.parameters,
      attempt: retryCount + 1,
      maxRetries: MAX_RETRIES + 1,
      modelAttempt: modelIndex + 1,
      totalModels: MODELS.length
    });

    const response = await hf.textToImage(params);
    
    // Validate response
    if (!response || !(response instanceof Blob)) {
      throw new Error('Invalid response format from image generation API');
    }

    // Log successful response
    console.log('Received successful response:', {
      model: currentModel,
      type: response.type,
      size: response.size
    });

    return response;
  } catch (error: any) {
    // Enhanced error logging
    console.error('Image generation attempt failed:', {
      model: params.model,
      attempt: retryCount + 1,
      maxRetries: MAX_RETRIES + 1,
      modelAttempt: modelIndex + 1,
      totalModels: MODELS.length,
      error: {
        message: error.message,
        name: error.name,
        status: error.status,
        response: error.response,
        stack: error.stack
      }
    });

    // Handle JSON parsing errors specifically
    if (error.message.includes('Unexpected token') || error.message.includes('not valid JSON')) {
      console.error('JSON parsing error detected, retrying with next model');
      if (modelIndex < MODELS.length - 1) {
        return generateImageWithRetry(params, 0, modelIndex + 1);
      }
    }

    // Try next model if available
    if ((error.status === 401 || error.status === 403 || error.status === 404) && modelIndex < MODELS.length - 1) {
      console.log(`Trying next model: ${MODELS[modelIndex + 1]}`);
      return generateImageWithRetry(params, 0, modelIndex + 1);
    }

    // If we've used all retries with current model, try next model if available
    if (retryCount >= MAX_RETRIES && modelIndex < MODELS.length - 1) {
      console.log(`Trying next model: ${MODELS[modelIndex + 1]}`);
      return generateImageWithRetry(params, 0, modelIndex + 1);
    }

    // If we've tried all models and retries, throw final error
    if (modelIndex >= MODELS.length - 1 && retryCount >= MAX_RETRIES) {
      throw new Error(`Image generation failed after trying all models: ${error.message}`);
    }

    // Retry current model on server errors, blob errors, or network issues
    if (
      error.message.includes('Internal Server Error') ||
      error.message.includes('blob') ||
      (error.status && error.status >= 500) ||
      error.message.includes('network') ||
      error.message.includes('timeout') ||
      error.message.includes('unknown error')
    ) {
      const delayTime = INITIAL_RETRY_DELAY * Math.pow(2, retryCount);
      console.log(`Retry attempt ${retryCount + 1}/${MAX_RETRIES} with model ${params.model} after ${delayTime}ms...`);
      await delay(delayTime);
      return generateImageWithRetry(params, retryCount + 1, modelIndex);
    }

    // For other errors, throw with detailed information
    throw new Error(`Image generation failed with model ${params.model}: ${error.message} (Status: ${error.status})`);
  }
}

export async function generateImage({
  prompt,
  negativePrompt = "ugly, blurry, bad quality, distorted, disfigured",
  numInferenceSteps = 25, // Reduced for faster generation
  seed = Math.floor(Math.random() * 2147483647),
}: GenerateImageParams): Promise<Blob> {
  try {
    // Validate API key
    if (!env.HUGGINGFACE_API_KEY) {
      throw new Error('HUGGINGFACE_API_KEY is not configured');
    }

    // Log the generation attempt
    console.log('Starting image generation...', {
      initialModel: MODELS[0],
      prompt,
      numInferenceSteps,
      seed,
      apiKeyLength: env.HUGGINGFACE_API_KEY.length
    });
    
    const response = await generateImageWithRetry({
      inputs: prompt,
      model: MODELS[0], // Start with first model
      parameters: {
        negative_prompt: negativePrompt,
        num_inference_steps: numInferenceSteps,
        seed: seed,
        guidance_scale: 7.5,
        width: 1024,
        height: 1024,
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
      stack: error.stack,
      apiKeyPresent: !!env.HUGGINGFACE_API_KEY,
      apiKeyLength: env.HUGGINGFACE_API_KEY?.length
    });

    // Provide more specific error messages
    if (error.status === 401 || error.status === 403) {
      throw new Error('Invalid or unauthorized API key. Please check your access to the models at: https://huggingface.co/models');
    } else if (error.status === 404) {
      throw new Error('All models unavailable. Please try again later.');
    } else if (error.status === 429) {
      throw new Error('Rate limit exceeded. Please try again later.');
    } else if (error.status >= 500) {
      throw new Error('Hugging Face API service error. Please try again later.');
    }

    // If we get here, it's an unknown error
    throw new Error(`Failed to generate image: ${error.message}`);
  }
} 