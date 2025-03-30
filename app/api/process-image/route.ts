import { NextRequest, NextResponse } from 'next/server';
import { processImageWithGemini } from '@/lib/document-processor';

export async function POST(req: NextRequest) {
  try {
    // Check if the request is a multipart form
    if (!req.headers.get('content-type')?.includes('multipart/form-data')) {
      return NextResponse.json(
        { error: 'Request must be multipart/form-data' },
        { status: 400 }
      );
    }

    // Get the API key from environment variables
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error('GEMINI_API_KEY is not set in environment variables');
      return NextResponse.json(
        { error: 'API key configuration error' },
        { status: 500 }
      );
    }

    // Parse the form data
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const prompt = formData.get('prompt') as string || 'Describe this image in detail.';

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Check if the file is an image
    if (!file.type.startsWith('image/')) {
      return NextResponse.json(
        { error: 'File must be an image' },
        { status: 400 }
      );
    }

    // Convert the file to ArrayBuffer
    const fileBuffer = await file.arrayBuffer();

    // Process the image with Gemini
    const result = await processImageWithGemini(
      fileBuffer,
      file.name,
      file.type,
      prompt,
      apiKey
    );

    // Return the result
    return NextResponse.json({
      success: true,
      text: result,
      filename: file.name,
      mimeType: file.type
    });

  } catch (error) {
    console.error('Error processing image:', error);
    return NextResponse.json(
      { 
        error: 'Failed to process image',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
