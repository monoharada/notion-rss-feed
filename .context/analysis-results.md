# 記事傾向分析レポート

**分析日**: 2025-01-04
**対象データベース**: Reader DB (16cf2d42d679810f8b7dd16382d5b9b0)

---

## エグゼクティブサマリー

| 指標 | 値 |
|------|-----|
| 総記事数 | 4,536件 |
| 良い記事（興味 OR 必読） | 883件 (19.5%) |
| 興味チェック率 | 18.8% |
| 必読チェック率 | 10.1% |
| 中立/除外記事 | 3,500件 (77.1%) |

**結論**: 約80%の記事がユーザーにとって価値が低く、AIフィルタリングの導入で読む負荷を大幅に削減できる可能性あり。

---

## 信頼できるドメイン（Tier分類）

### Tier 1: 最高信頼度（良記事率 70%以上）
| ドメイン | 良記事率 | 良記事数/総数 | 特徴 |
|----------|----------|---------------|------|
| ishadeed.com | 88.9% | 8/9 | CSS/UI専門家Ahmad Shadeed |
| adrianroselli.com | 88.5% | 23/26 | アクセシビリティ専門家 |
| webkit.org | 77.8% | 7/9 | Safari/WebKit公式ブログ |

### Tier 2: 高信頼度（良記事率 50-70%）
| ドメイン | 良記事率 | 良記事数/総数 | 特徴 |
|----------|----------|---------------|------|
| smashingmagazine.com | 66.7% | 12/18 | Web開発マガジン |
| uxdesign.cc | 63.6% | 7/11 | UXデザイン専門 |
| developer.chrome.com | 63.6% | 7/11 | Chrome公式 |
| web.dev | 60.0% | 12/20 | Google Web開発公式 |
| www.bram.us | 58.3% | 21/36 | CSS専門家Bramus |
| www.designsystemscollective.com | 50.0% | 12/24 | デザインシステム専門 |

### Tier 3: 中信頼度（良記事率 30-50%）
| ドメイン | 良記事率 | 良記事数/総数 | 特徴 |
|----------|----------|---------------|------|
| css-tricks.com | 49.2% | 59/120 | CSS専門（量が多い） |
| nerdy.dev | 37.5% | 27/72 | モダンCSS |
| developer.mozilla.org | 36.4% | 4/11 | MDN |
| blog.jxck.io | 35.7% | 15/42 | Web標準・日本語 |
| frontender-ua.medium.com | 34.1% | 31/91 | フロントエンド |
| feedpress.me | 33.3% | 9/27 | ニュースレター |

### Tier 4: 要精査（良記事率 30%未満）
| ドメイン | 良記事率 | 良記事数/総数 | 備考 |
|----------|----------|---------------|------|
| zenn.dev | 20.4% | 304/1487 | 日本語、玉石混交 |
| javascript.plainenglish.io | 16.4% | 10/61 | 初学者向け多い |
| coliss.com | 14.2% | 30/212 | まとめ記事多い |
| medium.com | 13.1% | 198/1511 | 玉石混交 |
| qiita.com | 8.3% | 29/351 | 初学者向け非常に多い |

---

## 良い記事のキーワード特徴

### 高評価トピック（頻出キーワード）
| カテゴリ | キーワード |
|----------|-----------|
| デザインシステム | design, system, systems, components, component, library |
| アクセシビリティ | accessibility, accessible, wcag |
| CSS/スタイリング | view, transitions, scroll, color, style, tailwind |
| HTML/Web標準 | html, baseline, custom, modern |
| ツール | figma, chrome, claude |
| 技術手法 | building, designing, using, code |

### サンプル: 必読記事のタイトルパターン
```
- "Beyond Basic Structure: Your Design Token Architecture Is Your Governance"
- "Experiment: Automatically trigger a View Transition when a JavaScript Property changes"
- "WCAG の概要と構造について（原則・ガイドライン・達成基準・関連文書）"
- "Web Componentsでmarqueeを作る"
- "Times have changed, and now it's time to use the native popover attribute"
```

---

## 除外候補の特徴

### 除外キーワード（中立/除外記事に多い）
| キーワード | 除外理由 |
|-----------|---------|
| guide, tutorial | 初学者向け傾向 |
| mastering, understanding | 基礎解説 |
| journey | 体験談/ポエム |
| interview | 面接対策 |
| every, should, know | リスト記事 |
| beginner, introduction | 明確に初心者向け |
| responsive website | 基本的な内容 |
| full, project | チュートリアル |

### 即除外パターン
1. **言語**: 英語/日本語以外（646件が「その他」言語）
2. **タイトルパターン**:
   - "X things every developer should know"
   - "Complete guide to..."
   - "Beginner's guide to..."
   - "Introduction to..."
   - "My journey with..."
3. **ドメイン + タイトル組み合わせ**:
   - qiita.com + 「入門」「初心者」
   - medium.com + "tutorial"

### カテゴリ間違い検出
- `system design` vs `design system`: タイトルに "system design" が含まれる場合は除外
- `architecture` 単体: システムアーキテクチャの可能性が高い

---

## 言語分布

### 良い記事
| 言語 | 件数 | 割合 |
|------|------|------|
| 日本語 | 380 | 43.0% |
| 英語 | 316 | 35.8% |
| その他 | 187 | 21.2% |

### 中立/除外記事
| 言語 | 件数 | 割合 |
|------|------|------|
| 日本語 | 1,603 | 45.8% |
| 英語 | 1,251 | 35.7% |
| その他 | 646 | 18.5% |

**結論**: 「その他」言語の除外は有効（良記事率が低い傾向）

---

## 推奨フィルタリングルール

### Phase 1: 即除外（自動）
```javascript
// 1. 言語フィルタ
if (!isJapaneseOrEnglish(title)) return "除外";

// 2. 除外キーワード
const excludePatterns = [
  /beginner|初心者|入門/i,
  /complete guide to/i,
  /introduction to/i,
  /my journey/i,
  /\d+ things.*should know/i,
  /system design(?! system)/i,  // design system以外のsystem design
];
if (excludePatterns.some(p => p.test(title))) return "除外";

// 3. 低信頼ドメイン + 除外キーワード
const lowTrustDomains = ["qiita.com", "medium.com"];
const warningKeywords = /tutorial|guide|mastering|understanding/i;
if (lowTrustDomains.includes(domain) && warningKeywords.test(title)) return "除外";
```

### Phase 2: 推奨（自動）
```javascript
// 1. 高信頼ドメイン
const tier1Domains = ["ishadeed.com", "adrianroselli.com", "webkit.org"];
const tier2Domains = ["smashingmagazine.com", "web.dev", "developer.chrome.com"];
if (tier1Domains.includes(domain)) return "推奨";
if (tier2Domains.includes(domain)) return "推奨";

// 2. 高評価キーワード
const premiumKeywords = /design system|design token|accessibility|wcag|view transition|web component/i;
if (premiumKeywords.test(title)) return "推奨";
```

### Phase 3: 保留（人間判断）
```javascript
// 上記に該当しない場合
return "保留";
```

---

## 次のアクション

1. **判定ガイドライン作成**: 上記ルールを`.context/article-review-guidelines.md`に整理
2. **スキーマ拡張**: AI_Status, AI_Reason等のプロパティ追加
3. **今週分の審査**: 未読記事に対してルールを適用
4. **学習ループ**: 人間の判断結果を蓄積し、ルールを改善
