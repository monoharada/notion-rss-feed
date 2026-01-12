/**
 * Shared utility functions for RSS to Notion processing.
 */

export const ONE_WEEK_IN_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Calculate ISO week number and week year.
 * Handles year-end correctly where a date in December may belong to week 1 of next year.
 */
export function getISOWeekData(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  return {
    isoYear: d.getUTCFullYear(),
    isoWeek: weekNo,
  };
}

/**
 * Check if a date is within the last week.
 */
export function isWithinOneWeek(dateObj) {
  if (!dateObj) return false;
  const now = new Date();
  const oneWeekAgo = new Date(now.getTime() - ONE_WEEK_IN_MS);
  return dateObj >= oneWeekAgo;
}

/**
 * Extract image URLs from HTML description using img tag parsing.
 */
export function extractImageUrlsFromDescription(description) {
  const imgRegex = /<img[^>]+src=["']([^"']+)["']/g;
  const results = [];
  let match;
  while ((match = imgRegex.exec(description)) !== null) {
    results.push(match[1]);
  }
  return results;
}

/**
 * Extract domain hostname from a URL.
 */
export function extractDomain(url) {
  if (!url) return '';
  try {
    const parsed = new URL(url);
    return parsed.hostname;
  } catch {
    return '';
  }
}

/**
 * Validate required environment variables and exit with error if missing.
 */
export function validateEnvVars(requiredVars) {
  const missing = requiredVars.filter((varName) => !process.env[varName]);
  if (missing.length > 0) {
    console.error(`[ERROR] Missing environment variables: ${missing.join(', ')}`);
    process.exit(1);
  }
  return requiredVars.reduce((acc, varName) => {
    acc[varName] = process.env[varName];
    return acc;
  }, {});
}

/**
 * Run main function with standard error handling.
 */
export function runMain(mainFn) {
  mainFn().catch((error) => {
    console.error('[FATAL]', error);
    process.exit(1);
  });
}
