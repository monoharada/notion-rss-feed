# 記事審査ガイドライン

**最終更新**: 2026-01-04
**対象**: RSS記事のAI審査

---

## 対象読者プロファイル

| 属性 | 詳細 |
|------|------|
| 役職レベル | CTO, CDO, シニアデザイナー, シニアエンジニア, シニアPM |
| 経験年数 | 5年以上 |
| 関心領域 | デザインシステム, UI/UX, アクセシビリティ, Web標準, 生成AI |
| 言語 | 日本語, 英語 |

**求める記事の特徴**:
- 実践的で具体的な技術内容
- 先進的なアプローチや新機能の解説
- 業界のベストプラクティス
- 深い洞察や専門的な分析

---

## 判定カテゴリ

| 判定 | スコア | 説明 |
|------|--------|------|
| **推奨** | 70-100 | 読む価値が高い、シニアレベル向け |
| **保留** | 40-69 | 判断が難しい、人間の確認が必要 |
| **除外** | 0-39 | 読む必要なし、基礎的または不適合 |

---

## 信頼ドメインリスト

### Tier 1: 最高信頼（自動推奨候補）
良記事率 70%以上のドメイン

```
ishadeed.com          # Ahmad Shadeed - CSS/UI専門家
adrianroselli.com     # Adrian Roselli - アクセシビリティ専門家
webkit.org            # WebKit公式ブログ
```

### Tier 2: 高信頼（推奨候補）
良記事率 50-70%のドメイン

```
smashingmagazine.com           # Web開発マガジン
uxdesign.cc                    # UXデザイン専門
developer.chrome.com           # Chrome DevRel公式
web.dev                        # Google Web開発公式
www.bram.us                    # Bramus - CSS専門家
www.designsystemscollective.com # デザインシステム専門
```

### Tier 3: 中信頼（内容次第）
良記事率 30-50%のドメイン

```
css-tricks.com          # CSS専門（量が多い）
nerdy.dev               # モダンCSS
developer.mozilla.org   # MDN
blog.jxck.io            # Jxck - Web標準（日本語）
frontender-ua.medium.com # フロントエンド
feedpress.me            # ニュースレター
```

### Tier 4: 要精査（厳しめに判定）
良記事率 30%未満のドメイン

```
zenn.dev                    # 日本語、玉石混交（20.4%）
javascript.plainenglish.io  # 初学者向け多い（16.4%）
coliss.com                  # まとめ記事多い（14.2%）
medium.com                  # 玉石混交（13.1%）
qiita.com                   # 初学者向け非常に多い（8.3%）
```

---

## 推奨トピック（高評価キーワード）

### 必須関心領域
| カテゴリ | キーワード | 優先度 |
|----------|-----------|--------|
| デザインシステム | design system, design token, component library, semantic token | ★★★ |
| アクセシビリティ | accessibility, a11y, wcag, aria, screen reader | ★★★ |
| CSS新機能 | view transition, container query, cascade layer, :has(), subgrid | ★★★ |
| Web標準 | web component, shadow dom, custom element, html specification | ★★★ |
| UI/UX | interaction design, user experience, information architecture | ★★ |
| 生成AI | claude, gpt, llm, ai agent, prompt engineering（先進的活用のみ） | ★★ |
| サービスデザイン | service design, service-dominant logic, customer journey | ★★ |

### 推奨タイトルパターン
```
- "Beyond Basic Structure: Your Design Token Architecture..."
- "Experiment: Automatically trigger a View Transition..."
- "WCAG の概要と構造について..."
- "Web Componentsで[具体的な実装]を作る"
- "[新機能名] is now available in [ブラウザ]"
- "How to become the voice of accessibility in..."（組織導入・推進）
- "〇〇テンプレート配布"（再利用可能な成果物）
```

### 加点要素（高評価に近づく）

| 要素 | 加点 | 理由 |
|------|------|------|
| テンプレート/設定ファイル配布 | +15 | 再利用可能な成果物 |
| 組織導入・推進方法 | +20 | シニアレベル向けの実践的内容 |
| ベストプラクティス集 | +10 | 経験に基づく知見 |
| 公式ブログの新機能発表 | +15 | 一次情報源 |

---

## 除外ルール

### 即除外（自動）

#### 1. 言語フィルタ
- 英語/日本語以外の言語は即除外
- 判定方法: タイトルに日本語文字（ひらがな/カタカナ/漢字）または英語のみ

#### 2. 除外キーワード（タイトルに含まれる場合）
```javascript
const excludePatterns = [
  // 初学者向け
  /beginner|初心者|入門|はじめて|getting started/i,
  /complete guide to|ultimate guide/i,
  /introduction to|イントロダクション/i,
  /tutorial for beginners/i,
  /learn .* in \d+ (minutes|hours|days)/i,
  /\d+ (easy|simple) (steps|ways)/i,

  // リスト記事
  /\d+ things (every|all) .* should know/i,
  /\d+ (tips|tricks|hacks) for/i,
  /top \d+ .* (for|in) 202\d/i,

  // 体験談/ポエム
  /my journey|私の.*(旅|経験)/i,
  /how i (learned|became|built)/i,

  // カテゴリ間違い
  /system design(?!.*system)/i,  // "design system"以外の"system design"
  /backend|infrastructure|devops/i,  // バックエンド系

  // 面接対策
  /interview (questions|preparation)/i,
  /面接|インタビュー対策/i,

  // CSSプリプロセッサ（興味なし）
  /scss|sass|less(?!on)|stylus/i,
  /css.?preprocessor|プリプロセッサ/i,

  // マイナーUIライブラリ（採用可能性低い）
  /luna.?ui/i,

  // HTML Mail（興味なし）
  /html.?(mail|email)|htmlメール|メールテンプレート/i,
  /email.?template|newsletter.?design/i,

  // Claude Code体験談系（興味なし）
  /バイブコーディング|vibe.?coding/i,
  /\d+日で.*リリース|\d+週間で.*開発/i,
  /実践検証.?day/i,

  // 技術デモ/遊び系（興味なし）
  /cssだけで|css.?only|javascript.?ゼロ|js.?ゼロ/i,
  /〇〇を作ってみた|を作った話/i,
];
```

#### 3. ドメイン + キーワード組み合わせ
| ドメイン | 除外キーワード |
|----------|---------------|
| qiita.com | tutorial, 入門, 初心者, メモ, 備忘録 |
| medium.com | beginner, introduction, simple guide |
| zenn.dev | 入門, 初心者, やってみた, 試してみた |

### 減点要素（保留に近づく）

| 要素 | 減点 | 理由 |
|------|------|------|
| Tier 4 ドメイン | -20 | 低信頼ドメイン |
| "guide", "tutorial" | -10 | 初学者向け傾向 |
| "mastering", "understanding" | -10 | 基礎解説傾向 |
| "every developer" | -15 | リスト記事傾向 |
| 短いタイトル（20文字未満） | -5 | 内容不明瞭 |
| マイナーUIライブラリ紹介 | -20 | 採用可能性が低い |
| "introducing [ライブラリ名]" | -10 | ライブラリ紹介記事傾向 |
| "vs CSS" 比較記事 | -15 | プリプロセッサ比較の可能性 |

---

## 判定フロー

```
┌─────────────────────────────────────────────────────────────┐
│ Step 1: 言語チェック                                         │
│   └─ 英語/日本語以外 → 除外（スコア: 0）                      │
├─────────────────────────────────────────────────────────────┤
│ Step 2: 除外キーワードチェック                               │
│   └─ 除外パターンにマッチ → 除外（スコア: 10-30）            │
├─────────────────────────────────────────────────────────────┤
│ Step 3: ドメイン評価                                         │
│   ├─ Tier 1 → +40点                                          │
│   ├─ Tier 2 → +30点                                          │
│   ├─ Tier 3 → +20点                                          │
│   └─ Tier 4 → +10点                                          │
├─────────────────────────────────────────────────────────────┤
│ Step 4: トピック評価                                         │
│   ├─ 推奨キーワード（★★★） → +30点                          │
│   ├─ 推奨キーワード（★★） → +20点                           │
│   └─ 推奨キーワード（★） → +10点                            │
├─────────────────────────────────────────────────────────────┤
│ Step 5: 減点要素の適用                                       │
│   └─ 各減点要素を合計                                        │
├─────────────────────────────────────────────────────────────┤
│ Step 6: 最終判定                                             │
│   ├─ スコア 70-100 → 推奨                                    │
│   ├─ スコア 40-69 → 保留（人間が判断）                       │
│   └─ スコア 0-39 → 除外                                      │
└─────────────────────────────────────────────────────────────┘
```

---

## 判定理由テンプレート

### 推奨の場合
```
[推奨] {ドメイン}は高信頼ドメイン。{トピック}に関する実践的な内容。
[推奨] {キーワード}に関する専門的な記事。シニアレベル向けの深い内容。
```

### 保留の場合
```
[保留] {ドメイン}は玉石混交。内容を確認して判断が必要。
[保留] タイトルからは判断が難しい。Descriptionの確認を推奨。
```

### 除外の場合
```
[除外] 初学者向けの内容（"{キーワード}"を含む）。
[除外] 対象言語外（{言語}）。
[除外] カテゴリ間違い（{理由}）。
[除外] {ドメイン}の低品質記事の傾向にマッチ。
```

---

## 学習データの活用

### フィードバック反映ルール
1. **人間が「興味」をつけた記事**: 類似パターンを推奨候補に追加
2. **人間が「必読」をつけた記事**: ドメイン/キーワードの信頼度を上昇
3. **AI推奨を人間が却下**: 除外パターンに追加検討

### ガイドライン更新頻度
- 月1回: 学習データを分析し、ルールを更新
- 随時: 明確なパターンが見つかった場合は即時更新

---

## 注意事項

1. **迷ったら保留**: 確信がない場合は必ず保留にする
2. **文脈を考慮**: 同じキーワードでも文脈で意味が変わる
3. **新しいトピック**: ガイドラインにないトピックは保留にして学習
4. **過度な除外を避ける**: フィルタリングは「読む量を減らす」が目的、「良記事を逃さない」ことも重要
5. **CSS Variables vs SCSS変数**: CSS Variables（CSS Custom Properties）は歓迎、SCSS/Sassは除外
6. **UIライブラリの判断**: 主流（React, Vue, Svelte, Angular）は歓迎、マイナーなものは除外
7. **「覇権を取るか」基準**: 業界標準になる可能性があるか＝採用する価値があるかで判断
8. **HTML Mail**: HTMLメール/メールテンプレート関連は除外（モダンWeb開発とは異なる領域）
