import { processDocumentFile, processImageFile, formatFileSize } from "@/lib/client-document-processor";

/**
 * Process file content for chat messages
 * @param file The file to process
 * @returns A promise with the processed content as a string
 */
export async function processFileForChat(file: File): Promise<string> {
  return new Promise(async (resolve, reject) => {
    try {
      // Process image files
      if (file.type.startsWith("image/")) {
        try {
          // Process image using our image processing API
          const result = await processImageFile(
            file, 
            'Analyze this image and describe what you see in detail.'
          );
          
          if (!result.success) {
            throw new Error(result.error);
          }
          
          const imageContent = `[IMAGE PROCESSED: ${file.name} (${formatFileSize(file.size)})]\n\nImage Analysis:\n${result.text}\n\nYou can ask follow-up questions about this image.`;
          resolve(imageContent);
        } catch (error) {
          console.error('Error processing image:', error);
          // Fallback message if processing fails
          const fallbackMsg = `[IMAGE ATTACHED: ${file.name} (${formatFileSize(file.size)})]\n\nI've attached an image, but there was an error analyzing it automatically.`;
          resolve(fallbackMsg);
        }
        return;
      }

      // Handle PDF files
      if (file.type === "application/pdf") {
        try {
          // Process PDF using our document processing API
          const result = await processDocumentFile(
            file, 
            'Extract and analyze the content of this PDF document.'
          );
          
          if (!result.success) {
            throw new Error(result.error);
          }
          
          const pdfContent = `[PDF PROCESSED: ${file.name} (${formatFileSize(file.size)})]\n\nDocument Analysis:\n${result.text}\n\nYou can ask follow-up questions about this document.`;
          resolve(pdfContent);
        } catch (error) {
          console.error('Error processing PDF:', error);
          // Fallback message if processing fails
          const fallbackMsg = `[PDF ATTACHED: ${file.name} (${formatFileSize(file.size)})]\n\nI've attached a PDF document, but there was an error processing it automatically. Please describe what this PDF contains in your own words.`;
          resolve(fallbackMsg);
        }
        return;
      }
      
      // Handle DOC/DOCX files
      if (file.type === "application/msword" || file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
        try {
          // Process DOC/DOCX using our document processing API
          const result = await processDocumentFile(
            file, 
            'Extract and analyze the content of this document.'
          );
          
          if (!result.success) {
            throw new Error(result.error);
          }
          
          const docContent = `[DOCUMENT PROCESSED: ${file.name} (${formatFileSize(file.size)})]\n\nDocument Analysis:\n${result.text}\n\nYou can ask follow-up questions about this document.`;
          resolve(docContent);
        } catch (error) {
          console.error('Error processing document:', error);
          // Fallback message if processing fails
          const fallbackMsg = `[DOCUMENT ATTACHED: ${file.name} (${formatFileSize(file.size)})]\n\nI've attached a document, but there was an error processing it automatically. Please describe what this document contains in your own words.`;
          resolve(fallbackMsg);
        }
        return;
      }

      // For text files and other formats
      const reader = new FileReader();
      reader.onload = (e) => {
        // For text files, limit the content size to prevent overwhelming the LLM
        const content = e.target?.result as string;
        const maxLength = 5000; // Limit to 5000 characters
        
        if (content.length > maxLength) {
          resolve(`${content.substring(0, maxLength)}... [Content truncated due to length]`);
        } else {
          resolve(content);
        }
      };
      
      reader.onerror = (e) => {
        console.error("Error reading file:", e);
        reject(new Error("Failed to read file content"));
      };
      
      reader.readAsText(file);
    } catch (error) {
      console.error("Error in file processing:", error);
      reject(error);
    }
  });
}
