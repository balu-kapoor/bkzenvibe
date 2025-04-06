import { NextResponse } from 'next/server';
import { performGoogleSearch, SearchResponse } from '@/lib/google-search';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

// Function to get information directly from Gemini when Google Search is unavailable
async function getGeminiDirectResponse(query: string): Promise<string> {
  try {
    if (!process.env.GEMINI_API_KEY) {
      return "I'm unable to search the web right now due to configuration issues.";
    }

    console.log('Using Gemini directly for query:', query);
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    // Create a prompt that asks Gemini to respond as if it had searched the web
    const prompt = `The user is asking: "${query}"

Provide a helpful, informative response as if you had searched the web for this information.
Include relevant facts, figures, and details that would typically be found in search results.
If the query is about current events or time-sensitive information, clearly state that your knowledge has limitations.
Make the response conversational and easy to understand.`;

    const geminiResponse = await model.generateContent(prompt);
    const response = await geminiResponse.response;
    const text = response.text();

    console.log('Received direct Gemini response');
    return text;
  } catch (error) {
    console.error('Error getting direct Gemini response:', error);
    return "I'm unable to search the web right now. Please try again later.";
  }
}

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

    // Perform web search using our improved utility function
    console.log('Calling performGoogleSearch...');
    const searchResponse: SearchResponse = await performGoogleSearch(query);

    // If Google Search failed or returned no results, use Gemini directly
    if (!searchResponse.success || searchResponse.results.length === 0) {
      console.log('Google Search failed or returned no results. Using Gemini directly.');
      console.log('Error:', searchResponse.error || 'No results found');

      const directResponse = await getGeminiDirectResponse(query);

      return NextResponse.json({
        results: [{
          title: "Search Results",
          content: directResponse
        }]
      });
    }

    console.log(`Found ${searchResponse.results.length} search results`);

    // Format the search results for Gemini
    const formattedResults = searchResponse.results.map((item: any) => ({
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

    // Try to get a direct response from Gemini as a last resort
    try {
      const { query } = await req.json();
      const fallbackResponse = await getGeminiDirectResponse(query);

      return NextResponse.json({
        results: [{
          title: "Search Results",
          content: fallbackResponse
        }]
      });
    } catch (fallbackError) {
      // If even the fallback fails, return an error
      return NextResponse.json(
        { error: 'Failed to perform web search' },
        { status: 500 }
      );
    }
  }
}

// Optionally handle GET requests with an error
export async function GET() {
  return NextResponse.json(
    { error: 'Method not allowed. Please use POST.' },
    { status: 405 }
  );
}