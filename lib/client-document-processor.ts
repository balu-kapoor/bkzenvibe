/**
 * Client-side document and image processing utilities
 */

/**
 * Process a document file through the document processing API
 * @param file The file to process
 * @param prompt Optional custom prompt for document analysis
 * @returns The processed document text or error message
 */
export async function processDocumentFile(
  file: File, 
  prompt: string = "Extract and analyze the content of this document."
): Promise<{
  text: string;
  success: boolean;
  error?: string;
}> {
  try {
    // Create form data for the API request
    const formData = new FormData();
    formData.append('file', file);
    formData.append('prompt', prompt);
    
    // Call the document processing API
    const response = await fetch('/api/process-document', {
      method: 'POST',
      body: formData
    });
    
    if (!response.ok) {
      throw new Error(`Failed to process document: ${response.status} ${response.statusText}`);
    }
    
    const result = await response.json();
    
    if (!result.success) {
      throw new Error(result.error || 'Unknown error processing document');
    }
    
    return {
      text: result.text,
      success: true
    };
  } catch (error) {
    console.error('Error processing document:', error);
    return {
      text: '',
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error processing document'
    };
  }
}

/**
 * Process an image file through the image processing API
 * @param file The image file to process
 * @param prompt Optional custom prompt for image analysis
 * @returns The processed image analysis text or error message
 */
export async function processImageFile(
  file: File, 
  prompt: string = "Describe this image in detail."
): Promise<{
  text: string;
  success: boolean;
  error?: string;
}> {
  try {
    // Validate file is an image
    if (!file.type.startsWith('image/')) {
      throw new Error('File is not an image');
    }
    
    // Create form data for the API request
    const formData = new FormData();
    formData.append('file', file);
    formData.append('prompt', prompt);
    
    // Call the image processing API
    const response = await fetch('/api/process-image', {
      method: 'POST',
      body: formData
    });
    
    if (!response.ok) {
      throw new Error(`Failed to process image: ${response.status} ${response.statusText}`);
    }
    
    const result = await response.json();
    
    if (!result.success) {
      throw new Error(result.error || 'Unknown error processing image');
    }
    
    return {
      text: result.text,
      success: true
    };
  } catch (error) {
    console.error('Error processing image:', error);
    return {
      text: '',
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error processing image'
    };
  }
}

/**
 * Format file size in human-readable format
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}
