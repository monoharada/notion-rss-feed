# ガイドライン改善提案

**分析日時**: 2026-01-05
**対象期間**: 2025-01-01 〜 2025-01-13
**分析対象**: 人間がフィードバック（興味/必読）をつけた記事 38件

---

## サマリー

人間のフィードバックを分析した結果、以下のパターンが発見されました。

### 高評価トピック（人間が「必読」マークをつけた記事）

| トピック | 件数 | 代表的な記事 |
|----------|------|-------------|
| Web Components / Shadow DOM | 4 | shadowDOM以下の要素で発生したイベント、toggleカスタムコンポーネント |
| View Transitions | 3 | Experiment: Automatically trigger a View Transition |
| WCAG / アクセシビリティ | 4 | WCAG概要、4つの原則、WAI-ARIAまとめ |
| Design Systems / Token | 3 | Design Token Architecture Is Your Governance |
| CSS新機能・テクニック | 3 | border-radius最適解、popover attribute |
| パフォーマンス | 1 | Fix your website's LCP |

---

## 具体的な改善提案

### 1. zenn.dev の評価基準を緩和

**現状**: Tier 4（良記事率 20.4%、-20点）

**発見**: 人間が「必読」マークをつけた記事の **50%以上が zenn.dev** から

**高評価されたzenn.dev記事の特徴**:
- Web Components実装記事
- WCAG/アクセシビリティ解説
- CSS新機能の深掘り
- 実務的なTips（Google Font対策など）

**提案**:
```
特定キーワードを含むzenn.dev記事は加点:
- "Web Component" / "Custom Element" → +15点
- "WCAG" / "WAI-ARIA" / "アクセシビリティ" → +15点
- "View Transition" / "Container Query" → +15点
- "shadowDOM" / "Custom Property" → +10点
```

---

### 2. 高信頼ドメインの追加

**Tier 2への昇格提案**:

| ドメイン | 理由 |
|----------|------|
| uxdesign.cc | アクセシビリティの深い分析記事が高評価 |
| levelup.gitconnected.com | Design Token/Systems記事が高評価 |

**Tier 3維持だが加点条件追加**:

| ドメイン | 条件 |
|----------|------|
| nerdy.dev | CSS新機能記事は+10点 |
| javascript.plainenglish.io | HTML新機能（popover等）記事は+10点 |

---

### 3. 新しい推奨キーワードの追加

**★★★（最高優先度）に追加**:
```
view transition snippets
promise.withresolvers
popover attribute
custom element
```

**★★に追加**:
```
lcp optimization
core web vitals
border-radius technique
gradient text
```

---

### 4. 除外パターンの見直し

**緩和すべきパターン**:

現在「〜を作ってみた」が除外パターンですが、以下は例外とすべき:
- 「Web Componentで〜を作る」
- 「カスタムコンポーネントを作成」

**理由**: Web Components実装記事は高評価が多い

---

### 5. blog.jxck.io の信頼度向上

**現状**: Tier 3
**提案**: Tier 2への昇格

**理由**:
- 日本語圏でのWeb標準解説の権威
- 人間が「興味」マークをつけている
- 年間まとめ記事も価値が高い

---

## 次のアクション

1. [ ] `.context/article-review-guidelines.md` を更新
2. [ ] `scripts/filter-prompt.md` を更新
3. [ ] 1ヶ月後に再評価して効果を測定

---

## 学習データ保存先

`.context/learning-data/feedback-2025-01.jsonl`

計 24件のフィードバックデータを保存済み
