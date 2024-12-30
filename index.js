// ESM 形式で書くサンプル
import { Client } from '@notionhq/client';
import Parser from 'rss-parser';

// 環境変数から Notion の認証トークン・DB ID を取得
const notion = new Client({ auth: process.env.NOTION_TOKEN });
const FEEDER_DB_ID = process.env.FEEDER_DB_ID;
const READER_DB_ID = process.env.READER_DB_ID;

// RSS Parser インスタンス生成
const parser = new Parser();

/**
 * feederデータベースから RSS の URL 一覧を取得する
 */
async function getFeedUrls() {
  const response = await notion.databases.query({
    database_id: FEEDER_DB_ID
  });

  // "URL" プロパティがリッチテキスト型になっている想定
  // ページから URL 文字列を取り出す
  const feedUrls = response.results
    .map((page) => {
      const richTexts = page.properties.URL?.rich_text;
      if (!richTexts || richTexts.length === 0) return null;
      return richTexts[0].plain_text;
    })
    .filter(Boolean);

  return feedUrls;
}

/**
 * RSS をパースして Notion の reader データベースに記事を登録
 */
async function fetchAndStoreFeedArticles(feedUrl) {
  console.log(`Fetching: ${feedUrl}`);
  const feed = await parser.parseURL(feedUrl);

  // feed.items の例: { title, link, pubDate, ... }
  for (const item of feed.items) {
    // 重複チェックなどを行いたい場合は、link や title などをキーに
    // すでに存在するかを検索してスキップするように実装する
    await notion.pages.create({
      parent: { database_id: READER_DB_ID },
      properties: {
        Title: {
          title: [
            {
              text: { content: item.title ?? 'No Title' }
            }
          ]
        },
        Link: {
          // ここでは "URL" プロパティを想定
          url: item.link ?? ''
        },
        PublishedAt: {
          date: {
            // pubDate が正しい形式でない場合は Date.parse 等の処理を追加してください
            start: item.pubDate
          }
        }
      }
    });
    console.log(`  => Stored: ${item.title}`);
  }
}

/**
 * メイン処理: feeder DB から RSS URL を取得し、それぞれのフィードを Notion の reader に登録する
 */
async function main() {
  try {
    const feedUrls = await getFeedUrls();

    for (const feedUrl of feedUrls) {
      await fetchAndStoreFeedArticles(feedUrl);
    }

    console.log('Done!');
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

// スクリプト実行
main();
