# 学習データディレクトリ

このディレクトリには、AIの記事審査結果と人間のフィードバックを記録した学習データを保存します。

## ファイル形式

### feedback-YYYY-MM.jsonl

月次で学習データを蓄積するJSONL形式のファイル。

```jsonl
{"date":"2025-01-04","article_id":"xxx","title":"記事タイトル","domain":"example.com","ai_status":"除外","ai_score":25,"human_interest":true,"human_must_read":false}
```

### フィールド説明

| フィールド | 型 | 説明 |
|-----------|-----|------|
| date | string | 分析日（YYYY-MM-DD） |
| article_id | string | NotionページID |
| title | string | 記事タイトル |
| domain | string | ドメイン |
| ai_status | string | AIの判定（推奨/保留/除外） |
| ai_score | number | AIのスコア（0-100） |
| human_interest | boolean | 人間が「興味」をつけたか |
| human_must_read | boolean | 人間が「必読」をつけたか |

## 分析カテゴリ

### 1. AIが除外 → 人間が興味/必読
- **意味**: AIのフィルタが厳しすぎる
- **アクション**: ドメイン信頼度UP、推奨キーワード追加検討

### 2. AIが推奨 → 人間がスキップ
- **意味**: AIのフィルタが甘すぎる
- **アクション**: 除外パターン追加検討、ドメイン信頼度DOWN

### 3. AIが保留 → 人間が興味/必読
- **意味**: 推奨に昇格させるパターン発見
- **アクション**: 推奨キーワード/ドメイン追加

### 4. AIが保留 → 人間がスキップ
- **意味**: 除外に降格させるパターン発見
- **アクション**: 除外パターン追加

## 使用方法

`/project:learn-from-feedback` コマンドを実行すると、このディレクトリにデータが蓄積されます。
