/**
 * フィルタ済み記事をNotionに保存するスクリプト
 * filtered-articles.jsonを読み込み、Readerデータベースに保存
 */

import { createNotionClient } from '../notionClient.js';
import { getISOWeekData, isRetryableNotionError, retryAsync, validateEnvVars, runMain } from '../utils.js';
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
    // ISO週番号を計算（年末年始で週と年が正しく対応）
    const pubDate = new Date(article.publishedAt);
    const { isoYear, isoWeek } = getISOWeekData(pubDate);
    properties.Year = {
      number: isoYear,
    };
    properties.Week = {
      number: isoWeek,
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

  await retryAsync(
    () =>
      notionClient.pages.create({
        parent: { database_id: readerDbId },
        properties,
      }),
    { label: 'Notion: pages.create', shouldRetry: isRetryableNotionError }
  );
}

/**
 * メイン処理
 */
async function main() {
  console.log('[INFO] === Store Filtered Articles to Notion ===');

  const { NOTION_TOKEN, READER_DB_ID } = validateEnvVars(['NOTION_TOKEN', 'READER_DB_ID']);
  const notionClient = createNotionClient(NOTION_TOKEN);

  // filtered-articles.json を読み込み
  const inputPath = path.resolve(process.cwd(), 'filtered-articles.json');

  if (!fs.existsSync(inputPath)) {
    console.log('[WARN] filtered-articles.json not found. Nothing to store.');
    return;
  }

  const content = fs.readFileSync(inputPath, 'utf-8');
  let articles;
  try {
    articles = JSON.parse(content);
  } catch (error) {
    const message = error?.message ?? String(error);
    console.error('[FATAL] filtered-articles.json is not valid JSON.');
    console.error(`[FATAL] ${message}`);
    console.error(
      '[HINT] Repro: node -e "JSON.parse(require(\'fs\').readFileSync(\'filtered-articles.json\',\'utf8\'))"'
    );

    const match = /position\s+(\d+)/i.exec(message);
    if (match) {
      const pos = Number(match[1]);
      if (Number.isFinite(pos)) {
        const start = Math.max(0, pos - 120);
        const end = Math.min(content.length, pos + 120);
        const excerpt = content
          .slice(start, end)
          .replaceAll('\n', '\\n')
          .replaceAll('\r', '\\r')
          .replaceAll('\t', '\\t');
        console.error(`[FATAL] Around position ${pos}: ...${excerpt}...`);
      }
    }

    throw error;
  }

  if (!Array.isArray(articles)) {
    console.error('[FATAL] filtered-articles.json must be a JSON array.');
    console.error(`[FATAL] Actual type: ${typeof articles}`);
    throw new Error('filtered-articles.json is not a JSON array');
  }

  console.log(`[INFO] Found ${articles.length} filtered articles to store`);

  // 各記事をNotionに保存
  let successCount = 0;
  let errorCount = 0;

  for (const [index, article] of articles.entries()) {
    try {
      if (!article || typeof article !== 'object') {
        throw new Error('Article must be an object');
      }
      if (!article.title || typeof article.title !== 'string') {
        throw new Error('Missing or invalid "title"');
      }
      if (!article.link || typeof article.link !== 'string') {
        throw new Error('Missing or invalid "link"');
      }
      console.log(`[INFO] [${index + 1}/${articles.length}] Storing: "${article.title}"`);
      await storeArticleToNotion(notionClient, READER_DB_ID, article);
      successCount++;
    } catch (error) {
      const title = article?.title ? `"${article.title}"` : '(unknown title)';
      console.error(`[ERROR] Failed to store ${title}:`, error?.message ?? String(error));
      errorCount++;
    }
  }

  console.log(`[INFO] === Storage Complete ===`);
  console.log(`[INFO] Success: ${successCount}, Errors: ${errorCount}`);
}

runMain(main);
