import { Client } from "@notionhq/client";
import Parser from "rss-parser";

const notion = new Client({ auth: process.env.NOTION_TOKEN });
const FEEDER_DB_ID = process.env.FEEDER_DB_ID;
const READER_DB_ID = process.env.READER_DB_ID;

const parser = new Parser();

/**
 * feeder データベースから "Enable" が true のページを取得し、
 * { feedUrl, keywords } の配列を返す
 */
async function getFeeds() {
  console.log("[INFO] Start getFeeds() ...");
  try {
    const response = await notion.databases.query({
      database_id: FEEDER_DB_ID,
      filter: {
        property: "Enable",
        checkbox: {
          equals: true,
        },
      },
    });

    console.log(
      `[INFO] getFeeds() response length: ${response.results.length}`
    );

    // ページごとに URL プロパティ(フィールド名 "URL")と keyword プロパティを取り出す
    const feeds = response.results.map((page) => {
      const feedUrl = page.properties.URL?.url; // 「URL」は URL型
      const multiSelect = page.properties.keyword?.multi_select ?? []; // 「keyword」はマルチセレクトを想定
      const keywords = multiSelect.map((x) => x.name);

      return {
        feedUrl,
        keywords,
      };
    });

    // feedUrl が無いページは除外
    const validFeeds = feeds.filter((f) => !!f.feedUrl);

    console.log("[INFO] Valid feeds:", validFeeds);
    return validFeeds;
  } catch (error) {
    console.error("[ERROR] Failed to get feeds:", error);
    throw error;
  }
}

/**
 * RSS フィードを取得し、以下の条件を満たす記事だけ Notion に保存
 * - 直近1週間以内の記事
 * - (keyword が空ならすべて) OR (keyword があるならタイトルにいずれかのキーワードが含まれるもの)
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

  console.log(
    `[INFO] Fetched feed: "${feed.title}". Total items: ${
      feed.items?.length ?? 0
    }`
  );

  // 直近1週間の基準日
  const now = new Date();
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  for (const [index, item] of feed.items.entries()) {
    const title = item.title ?? "No Title";
    const link = item.link ?? "";
    const pubDateString = item.pubDate ?? null;

    // RSS の本文や概要
    const description =
      item.contentSnippet || item.content || item.description || "";

    // enclosure 情報があれば取得 (RSS によっては無い場合もある)
    const enclosureUrl = item.enclosure?.url ?? "";
    const enclosureType = item.enclosure?.type ?? "";

    // ◆◆◆ description から <img> タグを正規表現で抽出 ◆◆◆
    // （非常に単純な正規表現なので、必要に応じてカスタマイズしてください）
    const imgRegex = /<img[^>]+src=["']([^"']+)["']/g;
    const imagesInDescription = [];
    let match;
    while ((match = imgRegex.exec(description)) !== null) {
      // match[1] が src の URL
      imagesInDescription.push(match[1]);
    }

    // pubDate を ISO8601 形式に変換
    let isoDate = null;
    let pubDate = null;
    if (pubDateString) {
      const parsed = new Date(pubDateString);
      if (!isNaN(parsed)) {
        pubDate = parsed; // JS Date オブジェクト
        isoDate = parsed.toISOString(); // Notion へ登録する際の文字列
      }
    }

    // 直近1週間以内かチェック
    if (!pubDate || pubDate < oneWeekAgo) {
      console.log(
        `[INFO] [${index + 1}/${
          feed.items.length
        }] "${title}" => older than 1 week => SKIP`
      );
      continue;
    }

    // キーワードが空の場合はすべて登録、それ以外は判定
    let isMatch = true;
    if (keywords.length > 0) {
      const lowerTitle = title.toLowerCase();
      isMatch = keywords.some((kw) => lowerTitle.includes(kw.toLowerCase()));
    }

    if (!isMatch) {
      console.log(
        `[INFO] [${index + 1}/${
          feed.items.length
        }] "${title}" => NO MATCH => SKIP`
      );
      continue;
    }

    // ▼▼▼ 重複チェックを追加 ▼▼▼
    const duplicated = await isDuplicatedInReader(link);
    if (duplicated) {
      console.log(
        `[INFO] [${index + 1}/${
          feed.items.length
        }] "${title}" => Already exists => SKIP`
      );
      continue;
    }

    // Notion 登録準備
    console.log(
      `[INFO] [${index + 1}/${
        feed.items.length
      }] Creating page in Notion for "${title}"`
    );

    try {
      // enclosure が画像なら、Notion の Files & media プロパティで扱う
      const ogpFiles = [];

      // enclosure 画像
      if (enclosureUrl && enclosureType.startsWith("image")) {
        ogpFiles.push({
          type: "external",
          name: "OGP Image (enclosure)",
          external: {
            url: enclosureUrl,
          },
        });
      }

      // description 内の画像
      imagesInDescription.forEach((url, idx) => {
        ogpFiles.push({
          type: "external",
          name: `OGP Image #${idx + 1} (description)`,
          external: {
            url,
          },
        });
      });

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
          Description: {
            rich_text: [
              {
                text: { content: description },
              },
            ],
          },
          // OGP という Files & media プロパティへ複数画像を格納
          ...(ogpFiles.length > 0 && {
            OGP: {
              files: ogpFiles,
            },
          }),
        },
      });
      console.log(
        `[INFO] [${index + 1}/${feed.items.length}] => Stored: "${title}"`
      );
    } catch (error) {
      console.error(
        `[ERROR] Failed to create page in Notion for "${title}". Skipped.`,
        error
      );
    }
  }
}

/**
 * メイン処理
 */
async function main() {
  console.log("[INFO] === Start main() ===");
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
      console.log("[WARN] No feeds found (Enable=true). Exiting...");
      return;
    }

    // 2. 各フィードごとに RSS を取得し、条件にマッチした記事だけを reader DB に追加
    for (const feedInfo of feeds) {
      await fetchAndStoreFeedArticles(feedInfo);
    }

    console.log("[INFO] Done!");
  } catch (error) {
    console.error("[ERROR] main() encountered an error:", error);
    process.exit(1);
  }
}

/**
 * Notion の「reader」DB に、同じリンクのレコードが既に存在するかチェック
 * @param {string} link - 記事のリンク
 * @returns {boolean} - true: 重複あり, false: 重複なし
 */
async function isDuplicatedInReader(link) {
  if (!link) {
    // リンクが無い場合は一応 false として扱う（空文字記事はそもそもスキップでもOK）
    return false;
  }

  const response = await notion.databases.query({
    database_id: READER_DB_ID,
    filter: {
      property: "Link",
      url: {
        equals: link,
      },
    },
  });

  return response.results.length > 0;
}

// 実行
main();
