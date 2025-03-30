import { NextResponse } from 'next/server';
import { performGoogleSearch } from '@/lib/google-search';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

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
    console.log('GEMINI_API_KEY exists:', !!process.env.GEMINI_API_KEY);

    // Perform web search using our utility function
    console.log('Calling performGoogleSearch...');
    const results = await performGoogleSearch(query);
    console.log('Search results received:', results ? 'Yes' : 'No');

    if (!results || results.length === 0) {
      console.log('No results found');
      return NextResponse.json({ results: [] });
    }

    // Format the search results for Gemini
    const formattedResults = results.map((item: any) => ({
      title: item.title,
      link: item.link,
      snippet: item.snippet,
      date: item.pagemap?.metatags?.[0]?.['article:published_time'] || 
            item.pagemap?.metatags?.[0]?.['og:updated_time'] ||
            item.pagemap?.metatags?.[0]?.['date'] ||
            null,
    }));

    // Create a prompt for Gemini
    const prompt = `Based on the following search results for "${query}", provide a comprehensive and well-structured response. Include relevant information from the sources and cite them when appropriate. Make the response conversational and easy to understand.

Search Results:
${formattedResults.map((result, index) => `
${index + 1}. ${result.title}
${result.snippet}
Source: ${result.link}
${result.date ? `Last Updated: ${new Date(result.date).toLocaleString()}` : ''}
`).join('\n')}

Please provide a clear and informative response that synthesizes the information from these sources.`;

    // Get Gemini's response using Gemini 2.0 Flash
    console.log('Getting Gemini response...');
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    const geminiResponse = await model.generateContent(prompt);
    const response = await geminiResponse.response;
    const text = response.text();

    console.log('Gemini response received');
    return NextResponse.json({ 
      results: [{
        title: "Search Results",
        content: text
      }]
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