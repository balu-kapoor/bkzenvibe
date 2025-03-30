import { SearchResult } from '@/types/search';

export async function performGoogleSearch(query: string): Promise<SearchResult[]> {
  console.log('Starting Google search for query:', query);
  
  if (!process.env.GOOGLE_SEARCH_API_KEY || !process.env.GOOGLE_SEARCH_ENGINE_ID) {
    console.error('Missing required environment variables:', {
      hasApiKey: !!process.env.GOOGLE_SEARCH_API_KEY,
      hasEngineId: !!process.env.GOOGLE_SEARCH_ENGINE_ID
    });
    throw new Error('Missing required environment variables for Google Search');
  }

  const searchUrl = new URL('https://www.googleapis.com/customsearch/v1');
  searchUrl.searchParams.append('key', process.env.GOOGLE_SEARCH_API_KEY);
  searchUrl.searchParams.append('cx', process.env.GOOGLE_SEARCH_ENGINE_ID);
  searchUrl.searchParams.append('q', query);
  searchUrl.searchParams.append('num', '5');

  console.log('Making request to Google Search API...');
  console.log('URL:', searchUrl.toString().replace(process.env.GOOGLE_SEARCH_API_KEY, '[REDACTED]'));

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
      throw new Error(`Search API request failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    console.log('Received response from Google Search API');

    if (!data.items || data.items.length === 0) {
      console.log('No search results found');
      return [];
    }

    console.log(`Found ${data.items.length} results`);
    return data.items;
  } catch (error) {
    console.error('Error in performGoogleSearch:', {
      name: error instanceof Error ? error.name : 'Unknown',
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    throw new Error('Failed to fetch search results');
  }
} 