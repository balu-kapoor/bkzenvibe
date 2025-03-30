import { GoogleGenerativeAI } from "@google/generative-ai";

// Get API key from environment
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const DOC_MODEL_NAME = "gemini-1.5-flash";
const IMAGE_MODEL_NAME = "gemini-1.5-flash"; // Using gemini-1.5-flash for images as well

export interface DocumentProcessingResult {
  text: string;
  filename: string;
  mimeType: string;
  success: boolean;
  error?: string;
}

/**
 * Process an image using Google Gemini API
 * @param fileBuffer The image file buffer
 * @param filename The name of the image file
 * @param mimeType The MIME type of the image
 * @param prompt The prompt to use for processing the image
 * @param apiKey Optional API key to use instead of environment variable
 * @returns Processing result with analysis text
 */
export async function processImageWithGemini(
  fileBuffer: ArrayBuffer,
  filename: string,
  mimeType: string,
  prompt: string = "Describe this image in detail.",
  apiKey?: string
): Promise<string> {
  try {
    // Use provided API key or fall back to environment variable
    const key = apiKey || GEMINI_API_KEY;
    if (!key) {
      throw new Error('Gemini API key is not configured');
    }

    // Convert to Base64
    const fileBase64 = Buffer.from(fileBuffer).toString('base64');

    // Initialize the Google GenAI client
    const genAI = new GoogleGenerativeAI(key);
    const model = genAI.getGenerativeModel({ model: IMAGE_MODEL_NAME });

    // Generate content with the image
    const result = await model.generateContent([
      { text: prompt },
      {
        inlineData: {
          mimeType: mimeType,
          data: fileBase64
        }
      }
    ]);

    const response = result.response;
    const text = response.text();
    return text;
  } catch (error) {
    console.error('Error processing image with Gemini:', error);
    throw error;
  }
}

/**
 * Process a document using Google Gemini API
 * @param file The file to process
 * @param prompt The prompt to use for processing
 * @returns Processing result with extracted text
 */
export async function processDocument(
  fileBuffer: ArrayBuffer,
  filename: string,
  mimeType: string,
  prompt: string = "Extract and analyze the content of this document."
): Promise<DocumentProcessingResult> {
  try {
    // Check if API key is configured
    if (!GEMINI_API_KEY) {
      throw new Error('Gemini API key is not configured');
    }

    // Convert to Base64
    const fileBase64 = Buffer.from(fileBuffer).toString('base64');

    // Initialize the Google GenAI client
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: DOC_MODEL_NAME });

    // Generate content with the document
    const result = await model.generateContent([
      { text: prompt },
      {
        inlineData: {
          mimeType: mimeType,
          data: fileBase64
        }
      }
    ]);

    return {
      text: result.response.text(),
      filename,
      mimeType,
      success: true
    };
    
  } catch (error: unknown) {
    console.error('Document processing error:', error);
    
    let errorMessage = 'An error occurred during document processing';
    
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    
    return {
      text: '',
      filename,
      mimeType,
      success: false,
      error: errorMessage
    };
  }
}

/**
 * Determine MIME type from file extension
 */
export function determineMimeType(filename: string): string {
  const extension = filename.split('.').pop()?.toLowerCase();
  
  switch (extension) {
    case 'pdf':
      return 'application/pdf';
    case 'doc':
    case 'docx':
      return 'application/msword';
    case 'txt':
      return 'text/plain';
    case 'csv':
      return 'text/csv';
    case 'json':
      return 'application/json';
    case 'html':
      return 'text/html';
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg';
    case 'png':
      return 'image/png';
    default:
      return 'application/octet-stream';
  }
}
