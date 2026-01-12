/**
 * RSS記事収集スクリプト
 * RSSフィードから記事を取得し、articles.jsonに出力
 * Notion保存はしない（後続のstore-to-notion.jsで行う）
 */

import { createNotionClient } from '../notionClient.js';
import { createRssParser } from '../rssParser.js';
import { getFeeds, isDuplicatedInReader } from '../rssToNotion.js';
import {
  isWithinOneWeek,
  extractImageUrlsFromDescription,
  extractDomain,
  validateEnvVars,
  runMain,
} from '../utils.js';
import fs from 'fs';
import path from 'path';

/**
 * 単一フィードから記事を収集
 */
async function collectArticlesFromFeed({
  notionClient,
  parser,
  feedUrl,
  keywords,
  readerDbId,
}) {
  console.log(`[INFO] Collecting from: ${feedUrl}`);
  console.log(`[INFO] Keywords: ${JSON.stringify(keywords)}`);

  let feed;
  try {
    feed = await parser.parseURL(feedUrl);
  } catch (error) {
    console.error(`[ERROR] Failed to parse RSS from URL: ${feedUrl}`, error);
    return [];
  }

  console.log(`[INFO] Feed: "${feed.title}". Total items: ${feed.items?.length ?? 0}`);

  const articles = [];

  for (const [index, item] of feed.items.entries()) {
    const title = item.title ?? 'No Title';
    const link = item.link ?? '';
    const pubDateString = item.pubDate ?? '';

    const description =
      item.contentSnippet || item.content || item.description || '';

    // enclosure 情報
    const enclosureUrl = item.enclosure?.url ?? '';
    const enclosureType = item.enclosure?.type ?? '';

    // description の <img> タグ抽出
    const imagesInDescription = extractImageUrlsFromDescription(description);

    // pubDate
    let isoDate = null;
    let pubDate = null;
    if (pubDateString) {
      const parsed = new Date(pubDateString);
      if (!isNaN(parsed)) {
        pubDate = parsed;
        isoDate = parsed.toISOString();
      }
    }

    // 1週間以内かチェック
    if (!isWithinOneWeek(pubDate)) {
      console.log(`[INFO] [${index + 1}/${feed.items.length}] "${title}" => older than 1 week => SKIP`);
      continue;
    }

    // キーワード判定
    let isMatch = true;
    if (keywords.length > 0) {
      const lowerTitle = title.toLowerCase();
      isMatch = keywords.some((kw) => lowerTitle.includes(kw.toLowerCase()));
    }
    if (!isMatch) {
      console.log(`[INFO] [${index + 1}/${feed.items.length}] "${title}" => NO MATCH => SKIP`);
      continue;
    }

    // 重複チェック
    const duplicated = await isDuplicatedInReader(notionClient, readerDbId, link);
    if (duplicated) {
      console.log(`[INFO] [${index + 1}/${feed.items.length}] "${title}" => Already exists => SKIP`);
      continue;
    }

    console.log(`[INFO] [${index + 1}/${feed.items.length}] Collected: "${title}"`);

    // OGP画像の準備
    const ogpImages = [];
    if (enclosureUrl && enclosureType.startsWith('image')) {
      ogpImages.push(enclosureUrl);
    }
    ogpImages.push(...imagesInDescription);

    articles.push({
      title,
      link,
      publishedAt: isoDate,
      description: description.substring(0, 2000), // Notion制限に備えて切り詰め
      domain: extractDomain(link),
      ogpImages,
    });
  }

  return articles;
}

/**
 * メイン処理
 */
async function main() {
  console.log('[INFO] === RSS Article Collection Started ===');

  const { NOTION_TOKEN, FEEDER_DB_ID, READER_DB_ID } = validateEnvVars([
    'NOTION_TOKEN',
    'FEEDER_DB_ID',
    'READER_DB_ID',
  ]);

  const notionClient = createNotionClient(NOTION_TOKEN);
  const parser = createRssParser();

  // フィード一覧を取得
  const feeds = await getFeeds(notionClient, FEEDER_DB_ID);
  console.log(`[INFO] Found ${feeds.length} enabled feeds`);

  // 全フィードから記事を収集
  const allArticles = [];
  for (const feed of feeds) {
    const articles = await collectArticlesFromFeed({
      notionClient,
      parser,
      feedUrl: feed.feedUrl,
      keywords: feed.keywords,
      readerDbId: READER_DB_ID,
    });
    allArticles.push(...articles);
  }

  console.log(`[INFO] Total articles collected: ${allArticles.length}`);

  // articles.json に出力
  const outputPath = path.resolve(process.cwd(), 'articles.json');
  fs.writeFileSync(outputPath, JSON.stringify(allArticles, null, 2), 'utf-8');
  console.log(`[INFO] Saved to ${outputPath}`);

  console.log('[INFO] === RSS Article Collection Completed ===');
}

runMain(main);
