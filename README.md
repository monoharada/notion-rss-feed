# RSS to Notion

RSS フィードから記事を収集し、Notion データベース（Reader DB）に保存します。

## 概要

1. **記事収集**: `scripts/collect-articles.js`  
   - Feeder DB（RSS フィード一覧）から対象フィードを取得し、`articles.json` を生成します。
2. **フィルタ/採点**: `scripts/filter-articles-local.js`  
   - ルールベースでスコアリングし、スコア 40 以上だけを `filtered-articles.json` に出力します（AI 非依存）。
3. **Notion へ保存**: `scripts/store-to-notion.js`  
   - `filtered-articles.json` を読み込み、Reader DB へ保存します。

（オプション）GitHub Actions での実行は `.github/workflows/rss-feeder.yml` を利用します。

## 前提条件

- **Node.js 22** 以上  
- Notion API を使うために [Integration](https://www.notion.so/my-integrations) を作成し、**Internal Integration Token**（後述の `NOTION_TOKEN`）を取得  
- RSS フィード情報を保存する **Notion データベース**が 2 つ用意されていること  
  1. **Feeder DB**: RSS フィードの URL やキーワードを管理（Enable = true のものだけ実行対象）  
  2. **Reader DB**: 実際に取得した記事を保存する先

## セットアップ手順

### 1. リポジトリをクローン

ローカルで実行する場合はフォーク不要です。

### 2. Notion データベースと連携する

1. **Notion で 2 つのデータベース**を作成し、下記のようなプロパティを用意してください。

   - **Feeder DB**: 
     - 「Enable」: チェックボックス (Checkbox)  
     - 「URL」: URL  
     - 「keyword」: マルチセレクト (Multi-select) など  
   - **Reader DB**: 
     - 「Title」: タイトル型 (Title)  
     - 「Link」: URL  
     - 「PublishedAt」: 日付 (Date)  
     - 「Description」: リッチテキスト (Rich text)  
     - 「OGP」: ファイル & メディア (Files & media) など

2. **2 つのデータベース ID** を控えておきます。  
   - データベースを開いて URL の  
     ```
     .../app/<workspace_id>/.../<database_id>?...
     ```
     の `<database_id>` が対象になります。

3. **Notion の Integration** を作成し、 **Internal Integration Token** を取得します。  
   - [Notion API My Integrations](https://www.notion.so/my-integrations) から作成できます。

4. **各データベースを Integration に共有**  
   - 作成した Integration を Feeder/Reader DB それぞれに招待し、編集権限を付与してください  
     （データベース右上の「共有 (Share)」から行えます）。

### 3. ローカル実行（推奨）

1. `.env.example` をコピーして `.env` を作成し、値を埋めます。
2. 依存をインストール: `npm install`
3. 実行: `npm run run:local`

`.env` は `dotenv` により自動で読み込まれます（Git 管理対象外）。

### 4. GitHub Actions（オプション）

GitHub Actions で動かす場合は、Secrets に `NOTION_TOKEN` / `FEEDER_DB_ID` / `READER_DB_ID` を登録してください。  
ワークフローは `workflow_dispatch`（手動）でも実行できます。
