/**
 * 記事傾向分析スクリプト
 * Readerデータベースから「興味」「必読」がtrueの記事を分析し、
 * 良い記事の傾向を抽出する
 */

import 'dotenv/config';
import { createNotionClient } from '../notionClient.js';
import { extractDomain, validateEnvVars, runMain } from '../utils.js';

const DEFAULT_READER_DB_ID = '16cf2d42d679810f8b7dd16382d5b9b0';

/**
 * データベースから記事を取得
 */
async function fetchArticles(notionClient, readerDbId, filter = null) {
  const results = [];
  let cursor = undefined;

  do {
    const queryParams = {
      database_id: readerDbId,
      start_cursor: cursor,
      page_size: 100,
    };

    // filterが空オブジェクトでない場合のみ追加
    if (filter && Object.keys(filter).length > 0) {
      queryParams.filter = filter;
    }

    const response = await notionClient.databases.query(queryParams);

    results.push(...response.results);
    cursor = response.has_more ? response.next_cursor : undefined;
  } while (cursor);

  return results;
}

/**
 * ページからプロパティを抽出
 */
function extractPageData(page) {
  const props = page.properties;

  const title = props.Title?.title?.[0]?.plain_text || '';
  const link = props.Link?.url || '';
  const description = props.Description?.rich_text?.[0]?.plain_text || '';
  const publishedAt = props.PublishedAt?.date?.start || '';
  const isInteresting = props['興味']?.checkbox || false;
  const isMustRead = props['必読']?.checkbox || false;
  const isRead = props.Read?.checkbox || false;

  return {
    title,
    link,
    domain: extractDomain(link),
    description,
    publishedAt,
    isInteresting,
    isMustRead,
    isRead,
  };
}

/**
 * 分析結果を生成
 */
function analyzeArticles(articles) {
  const analysis = {
    totalCount: articles.length,
    interestingCount: 0,
    mustReadCount: 0,
    domains: {},
    titleKeywords: {},
    languages: { ja: 0, en: 0, other: 0 },
    sampleTitles: [],
  };

  for (const article of articles) {
    if (article.isInteresting) analysis.interestingCount++;
    if (article.isMustRead) analysis.mustReadCount++;

    // ドメイン集計
    if (article.domain) {
      analysis.domains[article.domain] = (analysis.domains[article.domain] || 0) + 1;
    }

    // タイトルからキーワード抽出（簡易）
    const words = article.title.toLowerCase().split(/[\s\-_:|\[\]()]+/);
    for (const word of words) {
      if (word.length > 3) {
        analysis.titleKeywords[word] = (analysis.titleKeywords[word] || 0) + 1;
      }
    }

    // 言語判定（簡易）
    if (/[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/.test(article.title)) {
      analysis.languages.ja++;
    } else if (/^[a-zA-Z0-9\s\-_:|\[\]().,'!?]+$/.test(article.title)) {
      analysis.languages.en++;
    } else {
      analysis.languages.other++;
    }

    // サンプルタイトル（最初の20件）
    if (analysis.sampleTitles.length < 20) {
      analysis.sampleTitles.push({
        title: article.title,
        domain: article.domain,
        isMustRead: article.isMustRead,
        isInteresting: article.isInteresting,
      });
    }
  }

  // ドメインをカウント順にソート
  analysis.topDomains = Object.entries(analysis.domains)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 30);

  // キーワードをカウント順にソート
  analysis.topKeywords = Object.entries(analysis.titleKeywords)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 50);

  return analysis;
}

/**
 * メイン処理
 */
async function main() {
  console.log('[INFO] Starting article analysis...');

  const { NOTION_TOKEN } = validateEnvVars(['NOTION_TOKEN']);
  const readerDbId = process.env.READER_DB_ID || DEFAULT_READER_DB_ID;

  console.log(`[INFO] Database ID: ${readerDbId}`);

  const notionClient = createNotionClient(NOTION_TOKEN);

  // 1. 「興味」または「必読」がtrueの記事を取得
  console.log('\n[INFO] Fetching articles with 興味=true OR 必読=true...');
  const goodArticles = await fetchArticles(notionClient, readerDbId, {
    or: [
      { property: '興味', checkbox: { equals: true } },
      { property: '必読', checkbox: { equals: true } },
    ],
  });
  console.log(`[INFO] Found ${goodArticles.length} good articles`);

  // 2. 読了済みで評価されていない記事を取得（除外候補の分析用）
  console.log('\n[INFO] Fetching read articles without 興味/必読...');
  const neutralArticles = await fetchArticles(notionClient, readerDbId, {
    and: [
      { property: 'Read', checkbox: { equals: true } },
      { property: '興味', checkbox: { equals: false } },
      { property: '必読', checkbox: { equals: false } },
    ],
  });
  console.log(`[INFO] Found ${neutralArticles.length} neutral/rejected articles`);

  // 3. 全記事を取得
  console.log('\n[INFO] Fetching all articles...');
  const allArticles = await fetchArticles(notionClient, readerDbId, {});
  console.log(`[INFO] Found ${allArticles.length} total articles`);

  // データ抽出
  const goodData = goodArticles.map(extractPageData);
  const neutralData = neutralArticles.map(extractPageData);
  const allData = allArticles.map(extractPageData);

  // 分析
  console.log("\n[INFO] Analyzing good articles...");
  const goodAnalysis = analyzeArticles(goodData);

  console.log("\n[INFO] Analyzing neutral/rejected articles...");
  const neutralAnalysis = analyzeArticles(neutralData);

  console.log("\n[INFO] Analyzing all articles...");
  const allAnalysis = analyzeArticles(allData);

  // 結果出力
  const report = {
    summary: {
      totalArticles: allAnalysis.totalCount,
      goodArticles: goodAnalysis.totalCount,
      neutralArticles: neutralAnalysis.totalCount,
      interestingRate: ((goodAnalysis.interestingCount / allAnalysis.totalCount) * 100).toFixed(1) + "%",
      mustReadRate: ((goodAnalysis.mustReadCount / allAnalysis.totalCount) * 100).toFixed(1) + "%",
    },
    goodArticles: {
      topDomains: goodAnalysis.topDomains,
      topKeywords: goodAnalysis.topKeywords,
      languages: goodAnalysis.languages,
      samples: goodAnalysis.sampleTitles,
    },
    neutralArticles: {
      topDomains: neutralAnalysis.topDomains,
      topKeywords: neutralAnalysis.topKeywords,
      languages: neutralAnalysis.languages,
    },
    comparison: {
      // 良い記事に多いドメイン vs 全体
      goodDomainRatio: calculateDomainRatio(goodAnalysis.domains, allAnalysis.domains),
    },
  };

  console.log('\n=== ANALYSIS REPORT ===');
  console.log(JSON.stringify(report, null, 2));

  return report;
}

/**
 * ドメインの良記事率を計算
 */
function calculateDomainRatio(goodDomains, allDomains) {
  const ratios = [];
  for (const [domain, count] of Object.entries(goodDomains)) {
    const totalCount = allDomains[domain] || count;
    const ratio = count / totalCount;
    ratios.push({
      domain,
      goodCount: count,
      totalCount,
      ratio: (ratio * 100).toFixed(1) + '%',
    });
  }
  return ratios.sort((a, b) => b.goodCount - a.goodCount).slice(0, 20);
}

runMain(main);
