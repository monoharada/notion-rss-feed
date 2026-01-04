/**
 * フィルタ済み記事をNotionに保存するスクリプト
 * filtered-articles.jsonを読み込み、Readerデータベースに保存
 */

import { createNotionClient } from '../notionClient.js';
import fs from 'fs';
import path from 'path';

/**
 * 記事をNotionに保存
 */
async function storeArticleToNotion(notionClient, readerDbId, article) {
  // OGP画像の準備
  const ogpFiles = (article.ogpImages || []).map((url, idx) => ({
    type: 'external',
    name: `OGP Image #${idx + 1}`,
    external: { url },
  }));

  const properties = {
    Title: {
      title: [{ text: { content: article.title } }],
    },
    Link: {
      url: article.link,
    },
    Description: {
      rich_text: [{ text: { content: article.description || '' } }],
    },
  };

  // AI審査情報があれば追加
  if (article.ai_status) {
    properties.AI_Status = {
      select: { name: article.ai_status },
    };
  }
  if (typeof article.ai_score === 'number') {
    properties.AI_Score = {
      number: article.ai_score,
    };
  }
  if (article.ai_reason) {
    properties.AI_Reason = {
      rich_text: [{ text: { content: article.ai_reason } }],
    };
  }
  if (article.publishedAt) {
    properties.PublishedAt = {
      date: { start: article.publishedAt },
    };
    // PublishedAtから年を抽出してYearプロパティに設定
    const year = new Date(article.publishedAt).getFullYear();
    properties.Year = {
      number: year,
    };
  }

  // AI審査日時
  properties.AI_ReviewedAt = {
    date: { start: new Date().toISOString() },
  };

  // OGP画像
  if (ogpFiles.length > 0) {
    properties.OGP = { files: ogpFiles };
  }

  await notionClient.pages.create({
    parent: { database_id: readerDbId },
    properties,
  });
}

/**
 * メイン処理
 */
async function main() {
  console.log('[INFO] === Store Filtered Articles to Notion ===');

  // 環境変数チェック
  const notionToken = process.env.NOTION_TOKEN;
  const readerDbId = process.env.READER_DB_ID;

  if (!notionToken || !readerDbId) {
    console.error('[ERROR] Missing environment variables: NOTION_TOKEN, READER_DB_ID');
    process.exit(1);
  }

  const notionClient = createNotionClient(notionToken);

  // filtered-articles.json を読み込み
  const inputPath = path.resolve(process.cwd(), 'filtered-articles.json');

  if (!fs.existsSync(inputPath)) {
    console.log('[WARN] filtered-articles.json not found. Nothing to store.');
    return;
  }

  const content = fs.readFileSync(inputPath, 'utf-8');
  const articles = JSON.parse(content);

  console.log(`[INFO] Found ${articles.length} filtered articles to store`);

  // 各記事をNotionに保存
  let successCount = 0;
  let errorCount = 0;

  for (const [index, article] of articles.entries()) {
    try {
      console.log(`[INFO] [${index + 1}/${articles.length}] Storing: "${article.title}"`);
      await storeArticleToNotion(notionClient, readerDbId, article);
      successCount++;
    } catch (error) {
      console.error(`[ERROR] Failed to store "${article.title}":`, error.message);
      errorCount++;
    }
  }

  console.log(`[INFO] === Storage Complete ===`);
  console.log(`[INFO] Success: ${successCount}, Errors: ${errorCount}`);
}

main().catch((error) => {
  console.error('[FATAL]', error);
  process.exit(1);
});
