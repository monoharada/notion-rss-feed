import { Client } from '@notionhq/client';
import Parser from 'rss-parser';

// 環境変数から Notion の認証トークン・DB ID を取得
const notion = new Client({ auth: process.env.NOTION_TOKEN });
const FEEDER_DB_ID = process.env.FEEDER_DB_ID;
const READER_DB_ID = process.env.READER_DB_ID;

const parser = new Parser();

/**
 * feederデータベースから RSS の URL 一覧を取得する
 */
async function getFeedUrls() {
  console.log("[INFO] Start getFeedUrls() ...");
  try {
    const response = await notion.databases.query({
      database_id: FEEDER_DB_ID
    });

    console.log(`[INFO] getFeedUrls() response length: ${response.results.length}`);

    // "URL" プロパティがリッチテキスト型になっている想定
    const feedUrls = response.results
      .map((page) => {
        const richTexts = page.properties.URL?.rich_text;
        if (!richTexts || richTexts.length === 0) {
          console.log("[WARN] Page found but no 'URL' property text. Skipping...");
          return null;
        }
        return richTexts[0].plain_text;
      })
      .filter(Boolean);

    console.log(`[INFO] Extracted feed URLs: ${JSON.stringify(feedUrls)}`);
    return feedUrls;
  } catch (error) {
    console.error("[ERROR] Failed to get feed URLs:", error);
    throw error;
  }
}

/**
 * RSS をパースして Notion の reader データベースに記事を登録
 */
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

  // feed.items の例: { title, link, pubDate, ... }
  for (const [index, item] of feed.items.entries()) {
    const title = item.title ?? "No Title";
    const link = item.link ?? "";
    const pubDate = item.pubDate ?? null;

    // 重複チェックなどを行いたい場合はここで実装
    // 例: link でデータベース内を検索して既に存在していれば skip する、など

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
            // ここでは "URL" プロパティを想定
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

/**
 * メイン処理: feeder DB から RSS URL を取得し、それぞれのフィードを Notion の reader に登録する
 */
async function main() {
  console.log("[INFO] === Start main() ===");
  console.log(`[INFO] FEEDER_DB_ID: ${FEEDER_DB_ID}`);
  console.log(`[INFO] READER_DB_ID: ${READER_DB_ID}`);

  // 環境変数がきちんと取得できているかチェック
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
      console.log("[WARN] No feed URLs found. Exiting...");
      return;
    }

    for (const feedUrl of feedUrls) {
      await fetchAndStoreFeedArticles(feedUrl);
    }

    console.log("[INFO] Done!");
  } catch (error) {
    console.error('[ERROR] main() encountered an error:', error);
    process.exit(1);
  }
}

// スクリプト実行
main();
