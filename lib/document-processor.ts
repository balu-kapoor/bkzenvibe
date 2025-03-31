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
    // Enhanced prompt for code generation with best practices
    const enhancedPrompt = prompt.includes('code') ? 
      `${prompt}

      You MUST follow these EXACT rules when generating PHP code:

      1. CRITICAL PHP CODE FORMATTING RULES:
         - NEVER use HTML comments (<!--) or any HTML tags in PHP code
         - ALWAYS format PHP code blocks exactly like this:
           \`\`\`php
           <?php
           declare(strict_types=1);
           
           // Your code here
           \`\`\`
         - ALWAYS use full <?php tag, NEVER use <? or <!--?php
         - ALWAYS add proper spacing and indentation
         - ALWAYS use proper PHP syntax highlighting markers

      2. Required PHP Code Structure:
         - Start with <?php on its own line
         - Add declare(strict_types=1); after the PHP tag
         - Use proper namespaces if applicable
         - Separate logical blocks with blank lines
         - Use PSR-12 coding standards

      3. Security and Best Practices:
         - Use prepared statements for all SQL queries
         - Validate and sanitize all inputs
         - Use proper error handling with try/catch
         - Add logging for errors and important events
         - Use environment variables for sensitive data

      Here's the EXACT format to follow:

      \`\`\`php
      <?php
      declare(strict_types=1);

      // Database connection with error handling
      try {
          $pdo = new PDO(
              "mysql:host={$host};dbname={$database};charset=utf8mb4",
              $username,
              $password,
              [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
          );
      } catch (PDOException $e) {
          error_log("Database connection failed: " . $e->getMessage());
          throw new RuntimeException("Database connection failed");
      }
      \`\`\`

      Remember: NEVER use HTML comments or mix HTML with PHP code.
      ` : prompt;

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
      { text: enhancedPrompt },
      {
        inlineData: {
          mimeType: mimeType,
          data: fileBase64
        }
      }
    ]);

    let text = result.response.text();

    // Post-process the response to fix any remaining PHP formatting issues
    if (prompt.includes('code') && text.includes('php')) {
      text = text
        // Fix any HTML comments that might have slipped through
        .replace(/<!--\?php/g, '<?php')
        .replace(/<!--/g, '')
        .replace(/-->/g, '')
        // Ensure proper PHP tags
        .replace(/<\?(?!php)/g, '<?php')
        // Fix code block formatting
        .replace(/```(\s*)(php)?\s*(?!<\?php)/, '```php\n<?php\ndeclare(strict_types=1);\n\n');
    }

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
