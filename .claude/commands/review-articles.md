# 記事審査コマンド

未読のRSS記事を審査し、ガイドラインに基づいて分類します。

## 実行手順

1. **ガイドラインを読み込む**
   `.context/article-review-guidelines.md`を参照してください。

2. **未読記事を取得**
   Notion MCPを使用してReaderデータベース（ID: 16cf2d42d679810f8b7dd16382d5b9b0）から以下の条件で記事を取得:
   - Read = false
   - AI_Status が空（未審査）
   - 過去1週間の記事（PublishedAt）

3. **各記事を審査**
   ガイドラインのルールに従って各記事を評価:

   ### 即除外パターン
   - 言語: 英語/日本語以外
   - キーワード: beginner, 初心者, 入門, introduction, complete guide, system design
   - ドメイン+キーワード組み合わせ（qiita.com + tutorial等）

   ### 推奨パターン
   - Tier 1-2ドメイン: ishadeed.com, adrianroselli.com, webkit.org, smashingmagazine.com等
   - 推奨キーワード: design system, design token, accessibility, wcag, view transition, web component

   ### スコアリング
   - 70-100: 推奨
   - 40-69: 保留
   - 0-39: 除外

4. **Notionを更新**
   各記事のプロパティを更新:
   - AI_Status: 推奨 / 保留 / 除外
   - AI_Score: 0-100
   - AI_Reason: 判定理由（ガイドラインのテンプレートに従う）
   - AI_ReviewedAt: 現在日時

   除外記事はReadもtrueに更新。

5. **レポート作成**
   `.context/review-{日付}.md`にレポートを保存:
   - サマリー（推奨/保留/除外の件数）
   - 推奨記事一覧
   - 保留記事一覧
   - 除外記事一覧

## 引数

- `--limit N`: 審査する最大件数（デフォルト: 100）
- `--dry-run`: Notionを更新せずレポートのみ作成

## 出力例

```
## 審査完了

- 審査対象: 50件
- 推奨: 8件
- 保留: 12件
- 除外: 30件

レポート: .context/review-2025-01-04.md
```
