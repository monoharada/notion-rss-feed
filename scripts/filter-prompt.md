# RSS記事フィルタリングタスク

## タスク概要

`articles.json` に含まれるRSS記事を評価し、スコア40点以上の記事のみを `filtered-articles.json` に出力してください。

## 対象読者プロファイル

| 属性 | 詳細 |
|------|------|
| 役職レベル | CTO, CDO, シニアデザイナー, シニアエンジニア, シニアPM |
| 経験年数 | 5年以上 |
| 関心領域 | デザインシステム, UI/UX, アクセシビリティ, Web標準, 生成AI |
| 言語 | 日本語, 英語 |

## 判定カテゴリ

| 判定 | スコア | 説明 | 出力 |
|------|--------|------|------|
| **推奨** | 70-100 | 読む価値が高い | filtered-articles.json に含める |
| **保留** | 40-69 | 判断が難しい | filtered-articles.json に含める |
| **除外** | 0-39 | 読む必要なし | 出力しない（間引き） |

## 信頼ドメインリスト

### Tier 1: 最高信頼（+40点）
```
ishadeed.com, adrianroselli.com, webkit.org
```

### Tier 2: 高信頼（+30点）
```
smashingmagazine.com, uxdesign.cc, developer.chrome.com, web.dev, www.bram.us, www.designsystemscollective.com
```

### Tier 3: 中信頼（+20点）
```
css-tricks.com, nerdy.dev, developer.mozilla.org, blog.jxck.io, frontender-ua.medium.com, feedpress.me
```

### Tier 4: 要精査（+10点）
```
zenn.dev, javascript.plainenglish.io, coliss.com, medium.com, qiita.com
```

## 推奨トピック（高評価キーワード）

| 優先度 | カテゴリ | キーワード | 加点 |
|--------|----------|-----------|------|
| ★★★ | デザインシステム | design system, design token, component library, semantic token | +30 |
| ★★★ | アクセシビリティ | accessibility, a11y, wcag, aria, screen reader | +30 |
| ★★★ | CSS新機能 | view transition, container query, cascade layer, :has(), subgrid | +30 |
| ★★★ | Web標準 | web component, shadow dom, custom element, html specification | +30 |
| ★★ | UI/UX | interaction design, user experience, information architecture | +20 |
| ★★ | 生成AI | claude, gpt, llm, ai agent, prompt engineering（先進的活用のみ） | +20 |

## 即除外パターン

以下のパターンにマッチする記事は **スコア0-30** で除外：

1. **言語**: 英語/日本語以外
2. **初学者向け**: beginner, 初心者, 入門, はじめて, getting started, complete guide, tutorial for beginners
3. **リスト記事**: "10 things every...", "top N tips", "N easy steps"
4. **体験談**: "my journey", "how i learned", "私の経験"
5. **カテゴリ間違い**: system design（design system以外）, backend, infrastructure, devops
6. **CSSプリプロセッサ**: scss, sass, less, stylus, プリプロセッサ（※CSS Variablesは歓迎）
7. **マイナーUIライブラリ**: Luna UI など「覇権を取らない」技術の紹介
8. **HTML Mail**: html mail, html email, メールテンプレート, newsletter design
9. **Claude Code体験談系**: バイブコーディング、vibe coding、「〇日でリリース」「〇週間で開発」、実践検証Day
10. **技術デモ/遊び系**: 「CSSだけで〇〇」「JavaScriptゼロ」「〇〇を作ってみた」「〇〇を作った話」

## ドメイン + キーワード除外組み合わせ

| ドメイン | 除外キーワード |
|----------|---------------|
| qiita.com | tutorial, 入門, 初心者, メモ, 備忘録 |
| medium.com | beginner, introduction, simple guide |
| zenn.dev | 入門, 初心者, やってみた, 試してみた |

## 判定フロー

1. **言語チェック**: 英語/日本語以外 → 除外（スコア: 0）
2. **除外キーワードチェック**: パターンにマッチ → 除外（スコア: 10-30）
3. **ドメイン評価**: Tier 1-4 に応じて +10〜+40
4. **トピック評価**: 推奨キーワードに応じて +10〜+30
5. **減点適用**: "guide", "tutorial" 等で -10〜-20
6. **最終判定**: スコア40以上のみ出力

## 出力形式

`filtered-articles.json` に以下の形式で出力してください：

```json
[
  {
    "title": "記事タイトル",
    "link": "https://...",
    "publishedAt": "2025-01-04T00:00:00.000Z",
    "description": "記事の説明",
    "domain": "example.com",
    "ogpImages": ["https://..."],
    "ai_status": "推奨",
    "ai_score": 75,
    "ai_reason": "[推奨] design systemに関する専門的な内容。シニアレベル向け。"
  }
]
```

## 実行手順

1. `articles.json` を読み込む
2. 各記事を上記ガイドラインに基づいて評価
3. スコア40以上の記事のみを選別
4. `ai_status`, `ai_score`, `ai_reason` を付与
5. `filtered-articles.json` に出力

## 重要な注意事項

- **迷ったら保留（40-69）**: 確信がない場合は保留にして出力に含める
- **過度な除外を避ける**: 「良記事を逃さない」ことも重要
- 各記事の `ai_reason` は日本語で簡潔に記載
- **CSS Variables vs SCSS**: CSS Variables（CSS Custom Properties）は歓迎、SCSS/Sassは除外
- **「覇権を取るか」基準**: 業界標準になる可能性がない技術は除外（採用する価値がない）
- **主流フレームワーク**: React, Vue, Svelte, Angularの先進的な使い方は歓迎
- **HTML Mail**: メールテンプレート関連は除外（モダンWeb開発とは異なる領域）
- **テンプレート配布系**: 再利用可能な成果物（テンプレート、設定ファイル等）の配布は歓迎
- **組織導入・推進**: アクセシビリティなどの組織への導入方法・推進戦略は高評価
- **Claude Code体験談**: 「〇日で作った」「バイブコーディング」等の体験談は除外（成果物なし）

それでは、`articles.json` を読み込んでフィルタリングを実行してください。
