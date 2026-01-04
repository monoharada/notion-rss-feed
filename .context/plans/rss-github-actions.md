# RSS記事フィルタリングをGitHub Actionsに組み込む

## 概要
Notionに記事を保存する前に、`anthropics/claude-code-action`を使って「除外」判定の記事を間引く。

## 要件
- **推奨（70-100点）+ 保留（40-69点）**: Notionに保存
- **除外（0-39点）**: 保存しない（間引き）
- `anthropics/claude-code-action@v1`を使用

## 現状のフロー
```
RSS取得 → 日付フィルタ → キーワードマッチ → 重複チェック → Notion保存
```

## 新しいフロー
```
RSS取得 → 日付/キーワード/重複フィルタ → Claude評価 → 推奨+保留のみNotion保存
```

---

## 実装計画

### Step 1: 記事収集スクリプトの分離
**ファイル**: `scripts/collect-articles.js`

```javascript
// RSS取得して記事リストをJSONで出力（Notion保存はしない）
// 出力: articles.json
[
  { "title": "...", "link": "...", "description": "...", "domain": "..." },
  ...
]
```

### Step 2: Claude評価スクリプト作成
**ファイル**: `scripts/filter-articles.js`

```javascript
// articles.jsonを読み込み
// Claude CLIを呼び出してバッチ評価
// 出力: filtered-articles.json（スコア40以上のみ）
```

### Step 3: Notion保存スクリプト作成
**ファイル**: `scripts/store-to-notion.js`

```javascript
// filtered-articles.jsonを読み込み
// Notionに保存
```

### Step 4: GitHub Actions ワークフロー更新
**ファイル**: `.github/workflows/rss-feeder.yml`

```yaml
name: RSS to Notion

on:
  schedule:
    - cron: '0 22 * * 0'
  workflow_dispatch:

jobs:
  rss-notion:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 22

      - run: npm install

      # Step 1: RSS記事を収集
      - name: Collect RSS articles
        run: node scripts/collect-articles.js
        env:
          NOTION_TOKEN: ${{ secrets.NOTION_TOKEN }}
          FEEDER_DB_ID: ${{ secrets.FEEDER_DB_ID }}
          READER_DB_ID: ${{ secrets.READER_DB_ID }}

      # Step 2: Claude でフィルタリング
      - name: Filter articles with Claude
        uses: anthropics/claude-code-action@v1
        with:
          prompt_file: scripts/filter-prompt.md
          # articles.jsonを評価してfiltered-articles.jsonを出力

      # Step 3: Notionに保存
      - name: Store filtered articles to Notion
        run: node scripts/store-to-notion.js
        env:
          NOTION_TOKEN: ${{ secrets.NOTION_TOKEN }}
          READER_DB_ID: ${{ secrets.READER_DB_ID }}
```

---

## 変更対象ファイル

| ファイル | 変更内容 |
|----------|----------|
| `scripts/collect-articles.js` | **新規作成** - RSS収集、JSON出力 |
| `scripts/filter-articles.js` | **新規作成** - Claude呼び出し |
| `scripts/store-to-notion.js` | **新規作成** - Notion保存 |
| `scripts/filter-prompt.md` | **新規作成** - ガイドラインをプロンプト化 |
| `.github/workflows/rss-feeder.yml` | **更新** - 3ステップに分離 |
| `rssToNotion.js` | **更新** - 収集/保存機能を分離 |

---

## フィルタリングプロンプト設計

`scripts/filter-prompt.md`:
```markdown
# 記事フィルタリングタスク

以下の記事リスト（articles.json）を評価し、各記事にスコアを付けてください。

## 評価基準
（.context/article-review-guidelines.mdの内容を埋め込み）

## 出力形式
filtered-articles.jsonに以下を出力:
- スコア40以上の記事のみ
- 各記事に ai_score, ai_status, ai_reason を付与

## 入力
（articles.jsonの内容）
```

---

## 代替案: シンプル版（ルールベースのみ）

Claude APIを使わず、Node.jsで正規表現ベースのフィルタリングのみ行う場合：

```javascript
// scripts/rule-based-filter.js
const excludePatterns = [
  /beginner|初心者|入門/i,
  /tutorial for beginners/i,
  // ... ガイドラインの除外パターン
];

function filterArticle(article) {
  // 言語チェック、除外キーワード、ドメインTierでスコアリング
  // スコア40未満は除外
}
```

**メリット**: API不要、高速、無料
**デメリット**: 精度は低め

---

## 推奨アプローチ

**ハイブリッド方式**:
1. ルールベースで明確な除外（言語、除外キーワード）を先に実行
2. 残りの記事をClaudeで精密評価

これにより：
- API呼び出し回数を削減（コスト最適化）
- 明確な除外は高速処理
- 微妙な記事はAIで精密判定
