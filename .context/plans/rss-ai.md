# RSS記事AIフィルタリング機能 実装計画

## 概要
Notion Readerデータベースの記事をClaude Codeで審査し、シニアレベルに適した質の高い記事のみをユーザーに提示するシステムを構築。

## ユーザー要件
- **除外対象**: 初学者向け、カテゴリ間違い（system design混入）、英語/日本語以外、内容稀拙
- **求める記事**: デザインシステム、UI/UX、アクセシビリティ、Web標準、生成AI先進活用
- **判定ポリシー**: 迷ったら保留 → 人間判断 → 結果を学習

---

## Phase 1: Notion MCP設定

### 作成ファイル
| ファイル | 説明 |
|----------|------|
| `dallas/.mcp.json` | Notion MCP設定 |
| `dallas/.env.example` | 環境変数テンプレート |
| `dallas/.gitignore` (更新) | .env除外追加 |

### .mcp.json内容
```json
{
  "mcpServers": {
    "notion": {
      "command": "npx",
      "args": ["-y", "@notionhq/notion-mcp-server"],
      "env": {
        "NOTION_API_KEY": "${NOTION_TOKEN}"
      }
    }
  }
}
```

---

## Phase 2: 傾向分析

### タスク
1. Notion MCPでReaderデータベースにアクセス
2. 「興味=true」または「必読=true」の記事を取得
3. タイトル、URL、Descriptionを分析
4. 良い記事の特徴と除外すべき記事の特徴を抽出

### 出力
| ファイル | 説明 |
|----------|------|
| `dallas/.context/analysis-results.md` | 分析結果レポート |

---

## Phase 3: 判定ガイドライン作成

### 作成ファイル
| ファイル | 説明 |
|----------|------|
| `dallas/.context/article-review-guidelines.md` | 審査ガイドライン |
| `dallas/CLAUDE.md` (更新) | ガイドライン参照追加 |

### ガイドライン構成
- 対象読者プロファイル（CTO/CDO/シニアレベル）
- 推奨記事の特徴（トピック、信頼ドメイン）
- 除外記事の特徴（キーワード、言語）
- 判定フロー

---

## Phase 4: Readerデータベース スキーマ拡張

### 追加プロパティ
| プロパティ | 型 | 説明 |
|----------|-----|------|
| `AI_Status` | Select | 推奨/保留/除外 |
| `AI_Reason` | Rich text | 判定理由 |
| `AI_Score` | Number | 0-100 |
| `AI_ReviewedAt` | Date | 審査日時 |
| `Human_Reviewed` | Checkbox | 人間確認済み |
| `Human_Verdict` | Select | 承認/却下/未確認 |

### 作成ファイル
| ファイル | 説明 |
|----------|------|
| `dallas/scripts/setup-reader-schema.js` | スキーマ更新スクリプト |
| `dallas/scripts/migrate-existing-articles.js` | 既存記事マイグレーション |

---

## Phase 5: 記事審査コマンド実装

### 作成ファイル
| ファイル | 説明 |
|----------|------|
| `dallas/.claude/commands/review-articles.md` | 審査コマンド定義 |

### コマンド仕様
```bash
/project:review-articles           # 全未審査記事を審査
/project:review-articles --limit 10 # 最大10件
/project:review-articles --dry-run  # プレビューのみ
```

### 処理フロー
1. ガイドライン読み込み
2. Notion MCPで未審査記事取得（AI_Status=空）
3. 各記事を判定（言語→ドメイン→タイトル→内容）
4. Notionに結果反映

---

## Phase 6: 学習ループ実装

### 作成ファイル
| ファイル | 説明 |
|----------|------|
| `dallas/.claude/commands/collect-feedback.md` | フィードバック収集 |
| `dallas/.claude/commands/update-guidelines.md` | ガイドライン更新 |
| `dallas/.context/learning-data/` | 学習データディレクトリ |

### 学習データ形式
- `approved-articles.jsonl` - 承認記事
- `rejected-articles.jsonl` - 却下記事
- `corrections.jsonl` - AI誤判定の修正記録

---

## 今週分の審査（即時タスク）

Phase 2完了後、以下を実施:
1. Notion MCPで今週分の未読記事を取得
2. ガイドラインに基づき手動で不要記事を洗い出し
3. 結果をNotionに反映

---

## 実装後のディレクトリ構造

```
dallas/
├── .mcp.json                          # NEW: Notion MCP設定
├── .env.example                       # NEW: 環境変数テンプレート
├── CLAUDE.md                          # UPDATE: ガイドライン参照
├── .context/
│   ├── article-review-guidelines.md   # NEW: 審査ガイドライン
│   ├── analysis-results.md            # NEW: 分析結果
│   └── learning-data/                 # NEW: 学習データ
├── .claude/
│   └── commands/
│       ├── review-articles.md         # NEW: 審査コマンド
│       ├── collect-feedback.md        # NEW: FB収集
│       └── update-guidelines.md       # NEW: ガイドライン更新
└── scripts/
    ├── setup-reader-schema.js         # NEW: スキーマ更新
    └── migrate-existing-articles.js   # NEW: マイグレーション
```

---

## Critical Files

1. **dallas/rssToNotion.js** - 既存フィルタリングロジック（参照用）
2. **dallas/CLAUDE.md** - プロジェクト指示（更新対象）
3. **dallas/.context/** - 分析結果とガイドライン格納先
4. **~/.claude/skills/sdd-codex-review/SKILL.md** - スキル構造の参考

---

## 実行順序

0. **Phase 0: 計画のドキュメント化** → `.context/implementation-plan.md`に保存
1. Phase 1: MCP設定 → 動作確認
2. Phase 2: 傾向分析（Notion MCPで既存記事を分析）
3. Phase 3: ガイドライン作成
4. **今週分の審査**（手動でMCPを使って実施）
5. Phase 4: スキーマ拡張
6. Phase 5: 審査コマンド実装
7. Phase 6: 学習ループ実装
