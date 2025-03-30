import { NextRequest } from "next/server";
import { processDocument, determineMimeType } from "@/lib/document-processor";

export async function POST(req: NextRequest) {
  try {
    // Parse request body
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const prompt = formData.get('prompt') as string || "Analyze this document and summarize its key points.";

    if (!file) {
      return new Response(
        JSON.stringify({ error: 'No file provided' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Read file as ArrayBuffer
    const fileBuffer = await file.arrayBuffer();
    
    // Determine MIME type
    const mimeType = file.type || determineMimeType(file.name);

    // Process the document using our document processor
    const result = await processDocument(fileBuffer, file.name, mimeType, prompt);

    if (!result.success) {
      return new Response(
        JSON.stringify({ error: result.error }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Return the response
    return new Response(
      JSON.stringify(result),
      { 
        status: 200, 
        headers: { 'Content-Type': 'application/json' } 
      }
    );
    
  } catch (error: unknown) {
    console.error('Document processing error:', error);
    
    // Handle different error types
    let errorMessage = 'An error occurred during document processing';
    let statusCode = 500;
    
    if (error instanceof Error) {
      errorMessage = error.message;
      // Check if it's a custom error with additional properties
      const customError = error as any;
      if (customError.status) {
        statusCode = customError.status;
      }
    }
    
    // Return an error response
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: statusCode,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}
