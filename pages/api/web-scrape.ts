import { NextApiRequest, NextApiResponse } from 'next';
import { searchAndScrape, extractRelevantInfo } from '@/lib/web-scraper';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { query } = req.body;

    if (!query) {
      return res.status(400).json({ error: 'Query is required' });
    }

    const scrapedContents = await searchAndScrape(query);
    const relevantInfo = extractRelevantInfo(scrapedContents, query);

    return res.status(200).json({ 
      success: true,
      data: relevantInfo,
      sources: scrapedContents.map(content => ({
        title: content.title,
        url: content.url,
        timestamp: content.timestamp
      }))
    });
  } catch (error) {
    console.error('Web scraping error:', error);
    return res.status(500).json({ 
      error: 'Failed to scrape web content',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
} 