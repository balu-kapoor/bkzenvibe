import { NextResponse } from 'next/server';
import { performGoogleSearch } from '@/lib/google-search';

export async function POST(req: Request) {
  try {
    console.log('Web search request received');
    const { query } = await req.json();
    console.log('Search query:', query);

    if (!query) {
      console.log('Error: No query provided');
      return NextResponse.json(
        { error: 'Search query is required' },
        { status: 400 }
      );
    }

    // Log environment variables (without exposing sensitive values)
    console.log('Checking environment variables:');
    console.log('GOOGLE_SEARCH_API_KEY exists:', !!process.env.GOOGLE_SEARCH_API_KEY);
    console.log('GOOGLE_SEARCH_ENGINE_ID exists:', !!process.env.GOOGLE_SEARCH_ENGINE_ID);

    // Create a TransformStream for streaming the response
    const stream = new TransformStream();
    const writer = stream.writable.getWriter();
    const encoder = new TextEncoder();

    // Start the search process
    (async () => {
      try {
        // Perform web search using our utility function
        console.log('Calling performGoogleSearch...');
        const results = await performGoogleSearch(query);
        console.log('Search results received:', results ? 'Yes' : 'No');

        if (!results || results.length === 0) {
          console.log('No results found');
          await writer.write(encoder.encode('data: ' + JSON.stringify({ results: [] }) + '\n\n'));
          await writer.close();
          return;
        }

        // Format the search results
        console.log('Formatting results...');
        const formattedResults = results.map((item: any) => ({
          title: item.title,
          link: item.link,
          snippet: item.snippet,
          date: item.pagemap?.metatags?.[0]?.['article:published_time'] || 
                item.pagemap?.metatags?.[0]?.['og:updated_time'] ||
                item.pagemap?.metatags?.[0]?.['date'] ||
                null,
        }));
        console.log('Results formatted successfully');

        // Stream each result with a delay for typing effect
        for (let i = 0; i < formattedResults.length; i++) {
          const result = formattedResults[i];
          await writer.write(encoder.encode('data: ' + JSON.stringify({ 
            results: [result],
            isLast: i === formattedResults.length - 1 
          }) + '\n\n'));
          // Add a delay between results for typing effect
          await new Promise(resolve => setTimeout(resolve, 1000));
        }

        await writer.close();
      } catch (error) {
        console.error('Error in search stream:', error);
        await writer.write(encoder.encode('data: ' + JSON.stringify({ 
          error: 'Failed to perform web search' 
        }) + '\n\n'));
        await writer.close();
      }
    })();

    // Return the stream response
    return new Response(stream.readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    console.error('Web search error details:', {
      name: error instanceof Error ? error.name : 'Unknown',
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    return NextResponse.json(
      { error: 'Failed to perform web search' },
      { status: 500 }
    );
  }
}

// Optionally handle GET requests with an error
export async function GET() {
  return NextResponse.json(
    { error: 'Method not allowed. Please use POST.' },
    { status: 405 }
  );
} 