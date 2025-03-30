import { JSDOM } from 'jsdom';
import { Readability } from '@mozilla/readability';

export interface ScrapedContent {
  title: string;
  content: string;
  url: string;
  timestamp: string;
  excerpt?: string;
}

export async function scrapeWebPage(url: string): Promise<ScrapedContent> {
  try {
    const response = await fetch(url);
    const html = await response.text();
    const dom = new JSDOM(html);
    const reader = new Readability(dom.window.document);
    const article = reader.parse();

    if (!article) {
      throw new Error('Could not parse article content');
    }

    const excerpt = article.excerpt || article.content.slice(0, 200) + '...';

    return {
      title: article.title || 'Untitled',
      content: article.content,
      url: url,
      timestamp: new Date().toISOString(),
      excerpt: excerpt
    };
  } catch (error) {
    throw new Error(`Failed to scrape webpage: ${error.message}`);
  }
}

export async function searchAndScrape(query: string): Promise<ScrapedContent[]> {
  try {
    // First, get search results using web_search tool
    const searchResults = await fetch('/api/web-search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query }),
    }).then(res => res.json());

    // Take top 3 results and scrape them
    const scrapingPromises = searchResults.slice(0, 3).map(result => 
      scrapeWebPage(result.url)
    );

    const scrapedResults = await Promise.all(scrapingPromises);
    return scrapedResults;
  } catch (error) {
    throw new Error(`Failed to search and scrape: ${error.message}`);
  }
}

export function extractRelevantInfo(scrapedContents: ScrapedContent[], query: string): string {
  // Combine all scraped content and create a summary
  const combinedInfo = scrapedContents
    .map(content => {
      return `Source: ${content.title} (${content.url})\n${content.excerpt}\n\n`;
    })
    .join('');

  return `Here's what I found from recent web sources:\n\n${combinedInfo}`;
} 