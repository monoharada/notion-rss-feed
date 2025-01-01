// src/rssToNotion.js
/**
 * RSS フィード取得 & Notion への保存ロジックをまとめたモジュール。
 * テスト時にモックやスタブを注入しやすいように設計。
 */
 
// 一般的には 'dayjs' などのライブラリを使うと柔軟ですが、今回は自作しています
const ONE_WEEK_IN_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * feeder データベースから "Enable" が true のフィードを取得し、
 * { feedUrl, keywords } の配列を返す
 */
export async function getFeeds(notionClient, feederDbId) {
  console.log("[INFO] Start getFeeds() ...");
  try {
    const response = await notionClient.databases.query({
      database_id: feederDbId,
      filter: {
        property: "Enable",
        checkbox: {
          equals: true,
        },
      },
    });

    console.log(`[INFO] getFeeds() response length: ${response.results.length}`);

    const feeds = response.results.map((page) => {
      const feedUrl = page.properties.URL?.url;
      const multiSelect = page.properties.keyword?.multi_select ?? [];
      const keywords = multiSelect.map((x) => x.name);
      return { feedUrl, keywords };
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
 * 直近1週間以内かどうか判定するヘルパー
 */
function isWithinOneWeek(dateObj) {
  if (!dateObj) return false;
  const now = new Date();
  const oneWeekAgo = new Date(now.getTime() - ONE_WEEK_IN_MS);
  return dateObj >= oneWeekAgo;
}

/**
 * description から <img src="..."> を抽出するヘルパー
 */
function extractImageUrlsFromDescription(description) {
  const imgRegex = /<img[^>]+src=["']([^"']+)["']/g;
  const results = [];
  let match;
  while ((match = imgRegex.exec(description)) !== null) {
    results.push(match[1]);
  }
  return results;
}

/**
 * リンク重複チェック
 */
export async function isDuplicatedInReader(notionClient, readerDbId, link) {
  if (!link) return false; // 空文字などは一応 false 扱い
  const response = await notionClient.databases.query({
    database_id: readerDbId,
    filter: {
      property: "Link",
      url: {
        equals: link,
      },
    },
  });
  return response.results.length > 0;
}

/**
 * RSS フィードを取得し、条件を満たす記事だけ Notion に保存
 */
export async function fetchAndStoreFeedArticles({
  notionClient,
  parser,
  feedUrl,
  keywords,
  readerDbId,
}) {
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
    `[INFO] Fetched feed: "${feed.title}". Total items: ${feed.items?.length ?? 0}`
  );

  for (const [index, item] of feed.items.entries()) {
    const title = item.title ?? "No Title";
    const link = item.link ?? "";
    const pubDateString = item.pubDate ?? "";

    const description =
      item.contentSnippet || item.content || item.description || "";

    // enclosure 情報
    const enclosureUrl = item.enclosure?.url ?? "";
    const enclosureType = item.enclosure?.type ?? "";

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

    if (!isWithinOneWeek(pubDate)) {
      console.log(
        `[INFO] [${index + 1}/${feed.items.length}] "${title}" => older than 1 week => SKIP`
      );
      continue;
    }

    // キーワード判定
    let isMatch = true;
    if (keywords.length > 0) {
      const lowerTitle = title.toLowerCase();
      isMatch = keywords.some((kw) => lowerTitle.includes(kw.toLowerCase()));
    }
    if (!isMatch) {
      console.log(
        `[INFO] [${index + 1}/${feed.items.length}] "${title}" => NO MATCH => SKIP`
      );
      continue;
    }

    // 重複チェック
    const duplicated = await isDuplicatedInReader(notionClient, readerDbId, link);
    if (duplicated) {
      console.log(
        `[INFO] [${index + 1}/${feed.items.length}] "${title}" => Already exists => SKIP`
      );
      continue;
    }

    console.log(
      `[INFO] [${index + 1}/${feed.items.length}] Creating page in Notion for "${title}"`
    );

    // OGP 画像の準備
    const ogpFiles = [];

    // enclosure が画像
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

    try {
      await notionClient.pages.create({
        parent: { database_id: readerDbId },
        properties: {
          Title: {
            title: [{ text: { content: title } }],
          },
          Link: {
            url: link,
          },
          PublishedAt: {
            date: { start: isoDate },
          },
          Description: {
            rich_text: [{ text: { content: description } }],
          },
          ...(ogpFiles.length > 0 && {
            OGP: { files: ogpFiles },
          }),
        },
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
