import { Client } from '@notionhq/client';
import Parser from 'rss-parser';

const notion = new Client({ auth: process.env.NOTION_TOKEN });
const FEEDER_DB_ID = process.env.FEEDER_DB_ID;
const READER_DB_ID = process.env.READER_DB_ID;
const parser = new Parser();

async function getFeedUrls() {
  console.log('[INFO] Start getFeedUrls() ...');
  try {
    const response = await notion.databases.query({
      database_id: FEEDER_DB_ID
    });

    console.log(`[INFO] getFeedUrls() response length: ${response.results.length}`);

    // 「URL」プロパティが URL 型の場合、page.properties.URL?.url でアクセスできる
    const feedUrls = response.results
      .map((page) => {
        const feedUrl = page.properties.URL?.url;
        if (!feedUrl) {
          console.log("[WARN] Page found but no 'URL' property. Skipping...");
          return null;
        }
        return feedUrl;
      })
      .filter(Boolean);

    console.log(`[INFO] Extracted feed URLs: ${JSON.stringify(feedUrls)}`);
    return feedUrls;
  } catch (error) {
    console.error('[ERROR] Failed to get feed URLs:', error);
    throw error;
  }
}

async function fetchAndStoreFeedArticles(feedUrl) {
  console.log(`[INFO] Fetching feed for URL: ${feedUrl}`);
  let feed;
  try {
    feed = await parser.parseURL(feedUrl);
  } catch (error) {
    console.error(`[ERROR] Failed to parse RSS from URL: ${feedUrl}`, error);
    return;
  }
  console.log(`[INFO] Fetched feed: "${feed.title}". Total items: ${feed.items?.length ?? 0}`);

  for (const [index, item] of feed.items.entries()) {
    const title = item.title ?? 'No Title';
    const link = item.link ?? '';
    const pubDate = item.pubDate ?? null;

    console.log(`[INFO] [${index + 1}/${feed.items.length}] Creating page in Notion for "${title}"`);
    try {
      await notion.pages.create({
        parent: { database_id: READER_DB_ID },
        properties: {
          Title: {
            title: [
              {
                text: { content: title }
              }
            ]
          },
          Link: {
            // 「URL」型プロパティの場合
            url: link
          },
          PublishedAt: {
            date: {
              start: pubDate
            }
          }
        }
      });
      console.log(`[INFO] [${index + 1}/${feed.items.length}] => Stored: "${title}"`);
    } catch (error) {
      console.error(
        `[ERROR] Failed to create page in Notion for "${title}". Skipped.`,
        error
      );
    }
  }
}

async function main() {
  console.log('[INFO] === Start main() ===');
  console.log(`[INFO] FEEDER_DB_ID: ${FEEDER_DB_ID}`);
  console.log(`[INFO] READER_DB_ID: ${READER_DB_ID}`);

  if (!FEEDER_DB_ID) {
    console.error("[ERROR] 'FEEDER_DB_ID' is not set.");
    process.exit(1);
  }
  if (!READER_DB_ID) {
    console.error("[ERROR] 'READER_DB_ID' is not set.");
    process.exit(1);
  }

  try {
    const feedUrls = await getFeedUrls();
    if (!feedUrls || feedUrls.length === 0) {
      console.log('[WARN] No feed URLs found. Exiting...');
      return;
    }

    for (const feedUrl of feedUrls) {
      await fetchAndStoreFeedArticles(feedUrl);
    }

    console.log('[INFO] Done!');
  } catch (error) {
    console.error('[ERROR] main() encountered an error:', error);
    process.exit(1);
  }
}

main();
