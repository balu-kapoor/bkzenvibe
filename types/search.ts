export interface SearchResult {
  title: string;
  link: string;
  snippet: string;
  pagemap?: {
    metatags?: Array<{
      'article:published_time'?: string;
      'og:updated_time'?: string;
      'date'?: string;
    }>;
  };
} 