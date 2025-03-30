// Model selection utilities for BK Zen Vibe

// Daily request tracking
interface DailyRequestCount {
  count: number;
  date: string;
}

// Map to track requests by IP address
const dailyRequestCounts = new Map<string, DailyRequestCount>();

// Maximum number of Gemini 2.5 requests per day
const MAX_GEMINI_25_REQUESTS_PER_DAY = 50;

// Model names
// Using the correct model names for Google Generative AI SDK
export const GEMINI_MODEL = "gemini-2.0-flash";  // Using flash model for better performance

/**
 * Get the appropriate model
 * Uses Gemini Flash for better performance and higher limits
 */
export function getAppropriateModel(): string {
  return GEMINI_MODEL;
}

/**
 * Get the current daily request count for an IP
 */
export function getCurrentDailyCount(ip: string): number {
  const today = new Date().toISOString().split('T')[0];
  const userRequests = dailyRequestCounts.get(ip);
  
  if (!userRequests || userRequests.date !== today) {
    return 0;
  }
  
  return userRequests.count;
}

/**
 * Get the remaining Gemini 2.5 requests for the day
 */
export function getRemainingGemini25Requests(ip: string): number {
  const currentCount = getCurrentDailyCount(ip);
  return Math.max(0, MAX_GEMINI_25_REQUESTS_PER_DAY - currentCount);
}
