import { SearchResult } from '@/types/search';

// Define a response type for the search function
export interface SearchResponse {
  success: boolean;
  results: SearchResult[];
  error?: string;
}

// Check if the API key and search engine ID are valid (not placeholders or empty)
function isValidGoogleSearchConfig(): boolean {
  const apiKey = process.env.GOOGLE_SEARCH_API_KEY;
  const engineId = process.env.GOOGLE_SEARCH_ENGINE_ID;

  // Check if they exist
  if (!apiKey || !engineId) {
    return false;
  }

  // Check if they're not placeholders
  if (
    apiKey.includes('YOUR_API_KEY') ||
    apiKey.length < 10 ||
    engineId.includes('YOUR_ENGINE_ID') ||
    engineId === '1234567890abcdef' ||
    engineId.length < 10
  ) {
    return false;
  }

  return true;
}

export async function performGoogleSearch(query: string): Promise<SearchResponse> {
  console.log('Starting Google search for query:', query);

  // Validate configuration
  if (!isValidGoogleSearchConfig()) {
    console.error('Invalid Google Search configuration');
    return {
      success: false,
      results: [],
      error: 'Google Search is not properly configured. Please set up valid API credentials.'
    };
  }

  const searchUrl = new URL('https://www.googleapis.com/customsearch/v1');
  searchUrl.searchParams.append('key', process.env.GOOGLE_SEARCH_API_KEY!);
  searchUrl.searchParams.append('cx', process.env.GOOGLE_SEARCH_ENGINE_ID!);
  searchUrl.searchParams.append('q', query);
  searchUrl.searchParams.append('num', '5');

  console.log('Making request to Google Search API...');
  console.log('URL:', searchUrl.toString().replace(process.env.GOOGLE_SEARCH_API_KEY!, '[REDACTED]'));

  try {
    const response = await fetch(searchUrl.toString());
    console.log('Response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Google Search API error:', {
        status: response.status,
        statusText: response.statusText,
        error: errorText
      });

      return {
        success: false,
        results: [],
        error: `Search API request failed: ${response.status} ${response.statusText}`
      };
    }

    const data = await response.json();
    console.log('Received response from Google Search API');

    if (!data.items || data.items.length === 0) {
      console.log('No search results found');
      return {
        success: true,
        results: []
      };
    }

    console.log(`Found ${data.items.length} results`);
    return {
      success: true,
      results: data.items
    };
  } catch (error) {
    console.error('Error in performGoogleSearch:', {
      name: error instanceof Error ? error.name : 'Unknown',
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });

    return {
      success: false,
      results: [],
      error: error instanceof Error ? error.message : 'Failed to fetch search results'
    };
  }
}