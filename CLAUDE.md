# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Install dependencies
npm install

# Run the RSS feed fetcher (legacy: all articles to Notion)
npm start

# Collect articles only (outputs articles.json)
npm run collect

# Store filtered articles to Notion (reads filtered-articles.json)
npm run store

# Required environment variables
export NOTION_TOKEN=<your-notion-integration-token>
export FEEDER_DB_ID=<feeder-database-id>
export READER_DB_ID=<reader-database-id>

# Note: GitHub Actions では Claude GitHub App 経由で認証
# /install-github-app コマンドで事前にインストール済み
```

## Architecture

This is a Node.js application that fetches RSS feeds and stores articles in Notion databases. It runs on GitHub Actions (weekly schedule or manual trigger).

### Module Structure

- `index.js` - Entry point, imports and calls `main()` from main.js
- `main.js` - Main orchestration: validates env vars, fetches enabled feeds from Feeder DB, processes each feed
- `notionClient.js` - Factory for Notion API client
- `rssParser.js` - Factory for rss-parser instance
- `rssToNotion.js` - Core business logic:
  - `getFeeds()` - Queries Feeder DB for enabled feeds (Enable=true)
  - `fetchAndStoreFeedArticles()` - Parses RSS, filters by date/keywords, checks duplicates, stores to Reader DB
  - `isDuplicatedInReader()` - Checks if article URL already exists

### Data Flow

1. Query Feeder DB for feeds where `Enable=true`
2. For each feed, parse RSS and filter articles:
   - Must be within 1 week
   - Must match keywords (if specified)
   - Must not already exist in Reader DB (duplicate check by Link)
3. Create pages in Reader DB with Title, Link, PublishedAt, Description, OGP images

### Notion Database Schema

**Feeder DB** (input):
- `Enable` (Checkbox) - Whether to process this feed
- `URL` (URL) - RSS feed URL
- `keyword` (Multi-select) - Optional keywords for filtering

**Reader DB** (output):
- `Title` (Title)
- `Link` (URL)
- `PublishedAt` (Date)
- `Description` (Rich text)
- `OGP` (Files & media) - Images from enclosure or description
- `Read` (Checkbox) - Whether the article has been read
- `興味` (Checkbox) - Human feedback: interesting article
- `必読` (Checkbox) - Human feedback: must-read article
- `AI_Status` (Select) - AI review result: 推奨 / 保留 / 除外
- `AI_Score` (Number) - AI score: 0-100
- `AI_Reason` (Rich text) - Reason for AI decision
- `AI_ReviewedAt` (Date) - Date of AI review

## AI Article Review

### 関連ドキュメント
- `.context/article-review-guidelines.md` - 記事審査ガイドライン（判定基準、信頼ドメイン、除外ルール）
- `.context/analysis-results.md` - 傾向分析レポート（良記事の特徴、統計データ）
- `.context/implementation-plan.md` - AIフィルタリング機能の実装計画

### 記事審査の目的
- シニアレベル（CTO/CDO/シニアエンジニア）向けの高品質記事を選別
- 初学者向け、カテゴリ間違い、外国語記事を自動除外
- 判断が難しい記事は「保留」として人間が確認

### 判定カテゴリ
- **推奨** (スコア70-100): 読む価値が高い
- **保留** (スコア40-69): 人間の確認が必要
- **除外** (スコア0-39): 読む必要なし

### Claude Code コマンド

#### `/project:review-articles`
未読記事を審査し、ガイドラインに基づいて分類します。
- 未読記事を取得
- ドメイン/キーワードでスコアリング
- AI_Status, AI_Score, AI_Reason を更新
- 除外記事はReadもtrueに更新
- レポートを`.context/review-{日付}.md`に保存

#### `/project:learn-from-feedback`
人間のフィードバック（興味/必読チェック）からガイドラインを改善します。
- AIが除外したが人間が良いと判断した記事を分析
- ドメイン信頼度の変更を提案
- 新しいキーワードパターンを発見
- 学習データを`.context/learning-data/`に保存

### GitHub Actions ワークフロー（新）

```
┌─────────────────────────────────────────────────────────────┐
│ Step 1: 記事収集 (scripts/collect-articles.js)              │
│    └─ RSSから記事取得 → articles.json に出力                │
├─────────────────────────────────────────────────────────────┤
│ Step 2: AIフィルタリング (anthropics/claude-code-action)    │
│    └─ articles.json を評価 → スコア40以上のみ選別           │
│    └─ filtered-articles.json に出力                         │
├─────────────────────────────────────────────────────────────┤
│ Step 3: Notion保存 (scripts/store-to-notion.js)             │
│    └─ filtered-articles.json → Reader DBに保存              │
└─────────────────────────────────────────────────────────────┘

判定基準:
- 推奨 (70-100点): Notionに保存
- 保留 (40-69点): Notionに保存（人間が確認）
- 除外 (0-39点): 保存しない（間引き）
```

### 学習ループワークフロー

```
┌─────────────────────────────────────────────────────────────┐
│ 1. RSS取得 + AIフィルタリング (GitHub Actions)              │
│    └─ 除外記事を間引き、推奨+保留のみをReader DBに保存       │
├─────────────────────────────────────────────────────────────┤
│ 2. 人間レビュー (Notion上で直接)                            │
│    └─ 記事を読み、興味/必読チェックボックスをON              │
├─────────────────────────────────────────────────────────────┤
│ 3. 学習 (/project:learn-from-feedback)                      │
│    └─ フィードバックを分析 → ガイドライン更新を提案          │
├─────────────────────────────────────────────────────────────┤
│ 4. ガイドライン更新 (人間の承認後)                          │
│    └─ .context/article-review-guidelines.md を更新          │
│    └─ scripts/filter-prompt.md を更新                       │
└─────────────────────────────────────────────────────────────┘
```

### 学習データ形式

`.context/learning-data/feedback-YYYY-MM.jsonl`:
```jsonl
{"date":"2025-01-04","article_id":"xxx","title":"...","domain":"...","ai_status":"除外","ai_score":25,"human_interest":true,"human_must_read":false}
```

詳細は `.context/learning-data/README.md` を参照。
