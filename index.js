import { Client } from '@notionhq/client';
import Parser from 'rss-parser';

const notion = new Client({ auth: process.env.NOTION_TOKEN });
const FEEDER_DB_ID = process.env.FEEDER_DB_ID;
const READER_DB_ID = process.env.READER_DB_ID;

const parser = new Parser();

/**
 * feederデータベースから "Enable" が true のページを取得し、
 * { feedUrl, keywords } の配列を返す
 */
async function getFeeds() {
  console.log('[INFO] Start getFeeds() ...');
  try {
    const response = await notion.databases.query({
      database_id: FEEDER_DB_ID,
      filter: {
        property: 'Enable',
        checkbox: {
          equals: true,
        },
      },
    });

    console.log(`[INFO] getFeeds() response length: ${response.results.length}`);

    // ページごとに URL プロパティ(フィールド名 "URL")と keyword プロパティを取り出す
    const feeds = response.results.map((page) => {
      // 「URL」は URL型プロパティを想定
      const feedUrl = page.properties.URL?.url;
      // 「keyword」はマルチセレクトを想定
      const multiSelect = page.properties.keyword?.multi_select ?? [];

      // name だけ取り出したキーワード配列
      const keywords = multiSelect.map((x) => x.name);

      return {
        feedUrl,
        keywords,
      };
    });

    // feedUrl が無いページは除外
    const validFeeds = feeds.filter((f) => !!f.feedUrl);

    console.log('[INFO] Valid feeds:', validFeeds);
    return validFeeds;
  } catch (error) {
    console.error('[ERROR] Failed to get feeds:', error);
    throw error;
  }
}

/**
 * RSS フィードを取得し、keyword のいずれかにマッチする記事だけ Notion に保存
 */
async function fetchAndStoreFeedArticles({ feedUrl, keywords }) {
  console.log(`[INFO] Fetching feed for URL: ${feedUrl}`);
  console.log(`[INFO] Keywords: ${JSON.stringify(keywords)}`);

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
    const pubDateString = item.pubDate ?? null;

    // pubDate を ISO8601 形式に変換
    let isoDate = null;
    if (pubDateString) {
      const parsed = new Date(pubDateString);
      if (!isNaN(parsed)) {
        isoDate = parsed.toISOString();
      }
    }

    // キーワード判定（タイトルのみで判定する例）
    const lowerTitle = title.toLowerCase();
    // いずれかの keyword が含まれていれば true
    const isMatch = keywords.some((kw) => lowerTitle.includes(kw.toLowerCase()));

    if (!isMatch) {
      console.log(`[INFO] [${index + 1}/${feed.items.length}] "${title}" => NO MATCH => SKIP`);
      continue;
    }

    console.log(`[INFO] [${index + 1}/${feed.items.length}] Creating page in Notion for "${title}"`);

    try {
      await notion.pages.create({
        parent: { database_id: READER_DB_ID },
        properties: {
          Title: {
            title: [
              {
                text: { content: title },
              },
            ],
          },
          Link: {
            url: link,
          },
          PublishedAt: {
            date: {
              start: isoDate,
            },
          },
        },
      });
      console.log(`[INFO] [${index + 1}/${feed.items.length}] => Stored: "${title}"`);
    } catch (error) {
      console.error(`[ERROR] Failed to create page in Notion for "${title}". Skipped.`, error);
    }
  }
}

/**
 * メイン処理
 */
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
    // 1. feeder DBから Enable=true のフィードを取得
    const feeds = await getFeeds();
    if (!feeds.length) {
      console.log('[WARN] No feeds found (Enable=true). Exiting...');
      return;
    }

    // 2. 各フィードごとに RSS を取得し、キーワードマッチした記事だけを reader DB に追加
    for (const feedInfo of feeds) {
      await fetchAndStoreFeedArticles(feedInfo);
    }

    console.log('[INFO] Done!');
  } catch (error) {
    console.error('[ERROR] main() encountered an error:', error);
    process.exit(1);
  }
}

// 実行
main();
