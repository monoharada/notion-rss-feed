// src/index.js
/**
 * メイン実行用のエントリーポイント。CLI や GitHub Actions から直接呼び出す。
 * テストではここを呼ばず、上記のモジュール関数を単体テストする、という使い方が可能。
 */
import { createNotionClient } from "./notionClient.js";
import { createRssParser } from "./rssParser.js";
import {
  getFeeds,
  fetchAndStoreFeedArticles,
} from "./rssToNotion.js";

// 環境変数
const NOTION_TOKEN = process.env.NOTION_TOKEN;
const FEEDER_DB_ID = process.env.FEEDER_DB_ID;
const READER_DB_ID = process.env.READER_DB_ID;

// メイン関数
export async function main() {
  console.log("[INFO] === Start main() ===");
  console.log(`[INFO] FEEDER_DB_ID: ${FEEDER_DB_ID}`);
  console.log(`[INFO] READER_DB_ID: ${READER_DB_ID}`);

  if (!NOTION_TOKEN) {
    console.error("[ERROR] 'NOTION_TOKEN' is not set.");
    process.exit(1);
  }
  if (!FEEDER_DB_ID) {
    console.error("[ERROR] 'FEEDER_DB_ID' is not set.");
    process.exit(1);
  }
  if (!READER_DB_ID) {
    console.error("[ERROR] 'READER_DB_ID' is not set.");
    process.exit(1);
  }

  // 1. インスタンス生成
  const notionClient = createNotionClient(NOTION_TOKEN);
  const parser = createRssParser();

  // 2. feeder DBから Enable=true のフィードを取得
  let feeds;
  try {
    feeds = await getFeeds(notionClient, FEEDER_DB_ID);
  } catch (error) {
    console.error("[ERROR] Failed to get feeds.", error);
    process.exit(1);
  }

  if (!feeds.length) {
    console.log("[WARN] No feeds found (Enable=true). Exiting...");
    return;
  }

  // 3. 各フィードごとに RSS を取得し、条件にマッチした記事だけを reader DB に追加
  for (const feedInfo of feeds) {
    await fetchAndStoreFeedArticles({
      notionClient,
      parser,
      feedUrl: feedInfo.feedUrl,
      keywords: feedInfo.keywords,
      readerDbId: READER_DB_ID,
    });
  }

  console.log("[INFO] Done!");
}

// 直接このファイルが呼び出された場合に main を実行
if (require.main === module) {
  main();
}
