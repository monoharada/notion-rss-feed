/**
 * 審査結果でNotionページを更新するスクリプト
 * review-results-*.json を読み込み、既存ページのプロパティを更新
 */

import { createNotionClient } from '../notionClient.js';
import fs from 'fs';
import path from 'path';

async function updatePageReview(notionClient, pageId, result) {
  const properties = {
    AI_Status: {
      select: { name: result.status },
    },
    AI_Score: {
      number: result.score,
    },
    AI_Reason: {
      rich_text: [{ text: { content: result.reason } }],
    },
    AI_ReviewedAt: {
      date: { start: new Date().toISOString() },
    },
  };

  // 除外記事はReadもtrueに更新
  if (result.status === '除外') {
    properties.Read = { checkbox: true };
  }

  await notionClient.pages.update({
    page_id: pageId,
    properties,
  });
}

async function main() {
  console.log('[INFO] === Update Review Results to Notion ===');

  const notionToken = process.env.NOTION_TOKEN;
  if (!notionToken) {
    console.error('[ERROR] Missing NOTION_TOKEN environment variable');
    process.exit(1);
  }

  const notionClient = createNotionClient(notionToken);

  // 引数からファイルパスを取得、またはデフォルト
  const inputFile = process.argv[2] || 'review-results-2026-01-05.json';
  const inputPath = path.resolve(process.cwd(), inputFile);

  if (!fs.existsSync(inputPath)) {
    console.error(`[ERROR] File not found: ${inputPath}`);
    process.exit(1);
  }

  const content = fs.readFileSync(inputPath, 'utf-8');
  const results = JSON.parse(content);

  console.log(`[INFO] Found ${results.length} review results to update`);

  let successCount = 0;
  let errorCount = 0;
  const summary = { 推奨: 0, 保留: 0, 除外: 0 };

  for (const [index, result] of results.entries()) {
    try {
      console.log(`[INFO] [${index + 1}/${results.length}] Updating: "${result.title}" → ${result.status}`);
      await updatePageReview(notionClient, result.id, result);
      successCount++;
      summary[result.status] = (summary[result.status] || 0) + 1;
    } catch (error) {
      console.error(`[ERROR] Failed to update "${result.title}":`, error.message);
      errorCount++;
    }
  }

  console.log(`[INFO] === Update Complete ===`);
  console.log(`[INFO] Success: ${successCount}, Errors: ${errorCount}`);
  console.log(`[INFO] Summary: 推奨=${summary.推奨}, 保留=${summary.保留}, 除外=${summary.除外}`);
}

main().catch((error) => {
  console.error('[FATAL]', error);
  process.exit(1);
});
