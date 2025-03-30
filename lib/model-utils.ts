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
// Using the correct model names available in the v1beta API
// For premium tier (first 50 requests), use gemini-1.5-pro which has better capabilities
export const GEMINI_25_MODEL = "gemini-1.5-pro";
// For standard tier (after 50 requests), use gemini-1.0-pro which is more cost-effective
export const GEMINI_20_MODEL = "gemini-pro";

/**
 * Get the appropriate model based on daily usage
 * Uses Gemini 2.5 for the first 50 requests per day, then falls back to Gemini 2.0
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
  
  // Determine which model to use based on daily count
  if (userRequests.count <= MAX_GEMINI_25_REQUESTS_PER_DAY) {
    return GEMINI_25_MODEL;
  } else {
    return GEMINI_20_MODEL;
  }
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
