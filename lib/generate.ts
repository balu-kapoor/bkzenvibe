/**
 * File generation utilities
 */
import { generateWebApp as originalGenerateWebApp } from "@/lib/gemini-client";

// Original response processing to ensure proper file structure
export const generateWebApp = async (
  prompt: string,
  imageData?: Blob | string
): Promise<any> => {
  // Convert Blob to string if needed
  let imageDataString: string | undefined;
  
  if (imageData instanceof Blob) {
    // Convert Blob to base64 string
    imageDataString = await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.readAsDataURL(imageData);
    });
  } else {
    imageDataString = imageData;
  }
  
  // Directly call the original function without post-processing for now
  return await originalGenerateWebApp(prompt, imageDataString);
}; 