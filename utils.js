/**
 * Shared utility functions for RSS to Notion processing.
 */

import dotenv from 'dotenv';

dotenv.config({ quiet: true });

export const ONE_WEEK_IN_MS = 7 * 24 * 60 * 60 * 1000;
export const ONE_DAY_IN_MS = 24 * 60 * 60 * 1000;

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
  return isWithinDays(dateObj, 7);
}

/**
 * Check if a date is within the last N days.
 */
export function isWithinDays(dateObj, days) {
  if (!dateObj) return false;
  const now = new Date();
  const windowMs = Math.max(0, Number(days)) * ONE_DAY_IN_MS;
  const since = new Date(now.getTime() - windowMs);
  return dateObj >= since;
}

export function getEnvInt(name, defaultValue) {
  const raw = process.env[name];
  if (raw === undefined || raw === '') return defaultValue;
  const value = Number.parseInt(String(raw), 10);
  return Number.isFinite(value) ? value : defaultValue;
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
