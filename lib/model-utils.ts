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
export const GEMINI_25_MODEL = "gemini-2.0-flash";  // Using flash model for better performance
export const GEMINI_20_MODEL = "gemini-2.0-flash";  // Using flash model for better performance

/**
 * Get the appropriate model based on daily usage
 * Uses Gemini Flash for better stability and rate limits
 */
export function getAppropriateModel(ip: string): string {
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  const userRequests = dailyRequestCounts.get(ip);
  
  // If no requests today or date changed, reset counter
  if (!userRequests || userRequests.date !== today) {
    dailyRequestCounts.set(ip, { count: 1, date: today });
    return GEMINI_25_MODEL;
  }
  
  // Increment request count
  userRequests.count++;
  dailyRequestCounts.set(ip, userRequests);
  
  // Use gemini-2.0-flash for all requests for better stability
  return GEMINI_20_MODEL;
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
