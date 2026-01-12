# 読了フィードバックに基づくガイドライン更新

## 概要
2025 w52 / 2026 w1 の読了データから、ユーザーの好みを分析し、`article-review-guidelines.md` を更新する。

## ユーザーからの重要なフィードバック

### フィードバック1: CSSプリプロセッサ
> "css variablesは好きです。色々ハイレベルなものはいつでもウェルカム、問題の記事はscssとかいっているからです。scssは一切興味ありません"

**解釈**:
- CSS Variables → 歓迎（ハイレベルなCSS技術は常に歓迎）
- SCSS/Sass → **一切興味なし**（明示的な除外対象に追加）

### フィードバック2: マイナーUIライブラリ
> "Luna UIは覇権を取らないので"

**解釈**:
- Luna UI → 除外（覇権を取らない＝主流にならないマイナーライブラリ）
- 一般化: **マイナーなUIフレームワーク/ライブラリの紹介記事**は興味なし
- 対象読者（CTO/CDO/シニアレベル）は、採用可能性の低いツールには時間を割かない

---

## 変更内容

### 1. `.context/article-review-guidelines.md` の更新

#### 除外キーワードに追加（即除外）
```javascript
// CSSプリプロセッサ（興味なし）
/scss|sass|less(?!on)|stylus/i,
/css.?preprocessor|プリプロセッサ/i,

// マイナーUIライブラリ（採用可能性低い）
/luna.?ui/i,
```

#### 減点要素に追加
| 要素 | 減点 | 理由 |
|------|------|------|
| "vs CSS" 比較記事 | -15 | プリプロセッサ比較の可能性 |
| マイナーUIライブラリ紹介 | -20 | 採用可能性が低い |
| "introducing [ライブラリ名]" | -10 | ライブラリ紹介記事の傾向 |

#### 注意事項セクションに追加
- **CSS Variables vs SCSS変数**: CSS Variablesは歓迎、SCSSは除外
- **UIライブラリ**: 主流（React, Vue, Svelte等）は歓迎、マイナーなものは除外
- **判断基準**: 「覇権を取るか」＝業界標準になる可能性があるか

---

### 2. `scripts/filter-prompt.md` の更新

フィルタリングプロンプトに以下を追加：
```markdown
## 除外対象（即除外）
- SCSS, Sass, Less, Stylus などのCSSプリプロセッサ関連
- "SCSS vs CSS Variables" のような比較記事もSCSSを含むため除外
- Luna UI などマイナーなUIフレームワーク/ライブラリの紹介
- 「覇権を取らない」＝業界標準になる見込みがない技術

## 歓迎する内容
- CSS Variables（CSS Custom Properties）
- モダンCSS機能全般
- 主流フレームワーク（React, Vue, Svelte, Angular）の先進的な使い方
```

---

## 実装手順

1. `.context/article-review-guidelines.md` を編集
   - 除外パターンに SCSS/Sass/プリプロセッサ を追加
   - 除外パターンに Luna UI を追加
   - 減点要素にマイナーUIライブラリ紹介を追加
   - 注意事項にCSS Variables vs SCSS、UIライブラリ判断基準を追記

2. `scripts/filter-prompt.md` を編集
   - SCSS除外ルールを明示
   - マイナーUIライブラリ除外ルールを明示
   - 「覇権を取るか」という判断基準を追加

---

## 対象ファイル

| ファイル | 変更内容 |
|----------|----------|
| `.context/article-review-guidelines.md` | SCSS + Luna UI除外パターン追加、減点要素追加、注意事項更新 |
| `scripts/filter-prompt.md` | SCSS + マイナーUIライブラリ除外ルール明示 |
