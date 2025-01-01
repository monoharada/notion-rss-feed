# RSS to Notion

GitHub Actions と Node.js を使って、指定した RSS フィードから記事を取得し、Notion データベースに自動で保存するサンプルです。  
フォーク後、環境変数（Secrets）や Notion 側の設定を行うことで、簡単にスケジューリングして RSS を取り込みできます。

## 概要

1. **Node.js スクリプト (`index.js`)**  
   - 指定した RSS フィードを取得し、**タイトル・リンク・本文・掲載画像など**を Notion データベースへ保存します。  
   - 1 週間以内の新着記事のみ登録。重複チェック機能付きです（同じリンクが既に登録済みかを判定）。

2. **GitHub Actions ワークフロー (`.github/workflows/rss-to-notion.yml`)**  
   - 毎週日曜 22:00 (UTC) に自動実行（`cron: '0 22 * * 0'`）。  
     - 日本時間だと月曜朝 7:00 になるので、適宜ご自分の都合に合わせて変更してください。  
   - 手動トリガー（`workflow_dispatch`）でも実行できます。

## 前提条件

- **Node.js 22** 以上  
- GitHub リポジトリの Actions が有効になっていること  
- Notion API を使うために [Integration](https://www.notion.so/my-integrations) を作成し、**Internal Integration Token**（後述の `NOTION_TOKEN`）を取得  
- RSS フィード情報を保存する **Notion データベース**が 2 つ用意されていること  
  1. **Feeder DB**: RSS フィードの URL やキーワードを管理（Enable = true のものだけ実行対象）  
  2. **Reader DB**: 実際に取得した記事を保存する先

## セットアップ手順

### 1. リポジトリをフォーク

自分の GitHub アカウントに本リポジトリをフォークしてから、以下の設定を行います。

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

### 3. Secrets を設定

1. リポジトリの「Settings」→「Security」→「Secrets and variables」→「Actions」を開き、**New repository secret** をクリック。
2. 以下の Secrets を登録してください。

   - **`NOTION_TOKEN`**: 上記で取得した Notion の Internal Integration Token  
   - **`FEEDER_DB_ID`**: Feeder DB のデータベース ID  
   - **`READER_DB_ID`**: Reader DB のデータベース ID  

### 4. GitHub Actions ワークフローを確認・修正

`.github/workflows/rss-to-notion.yml` には以下のように記載されています:

```yaml
name: RSS to Notion

on:
  schedule:
    - cron: '0 22 * * 0'   # 毎週日曜の22:00(UTC)に実行
  workflow_dispatch:      # 手動トリガーも有効化

jobs:
  rss-notion:
    runs-on: ubuntu-latest
    steps:
      - name: Check out repository
        uses: actions/checkout@v3

      - name: Use Node.js
        uses: actions/setup-node@v3
        with:
          node-version: 18

      - name: Install dependencies
        run: npm install

      - name: Fetch RSS and update Notion
        run: npm start
        env:
          NOTION_TOKEN: ${{ secrets.NOTION_TOKEN }}
          FEEDER_DB_ID: ${{ secrets.FEEDER_DB_ID }}
          READER_DB_ID: ${{ secrets.READER_DB_ID }}
```

- スケジュールの時間は UTC で指定されます。必要に応じて cron: の値を変更してください。
- workflow_dispatch によって、Actions タブから手動実行もできます。テスト時に便利です。

### 5. 動作確認
1. 手動トリガーを実行
   - GitHub の「Actions」タブから該当ワークフロー（RSS to Notion）を選択し、「Run workflow」ボタンで手動実行します。
   - ログを確認し、エラーが出ていないかチェックしてください。
2. Notion 側にレコードが保存されることを確認
   - Feeder DB の Enable=true な RSS フィードを読み込み、Reader DB に記事が作成されれば成功です。
   - description 内に画像がある場合や enclosure が画像の場合、それも OGP プロパティに登録されます。
### 6. スケジュールで実行されるか確認
- 指定した cron の時刻になった際に、自動でワークフローが動くか確認します。
- 新しくワークフローを設定してから 数時間~1日程度経過しないと、スケジュールトリガーが有効にならない場合があります（GitHub Actions の仕様）。気長にお待ちください。