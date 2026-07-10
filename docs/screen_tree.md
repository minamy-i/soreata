```mermaid
graph TD
    classDef all fill:#ffffff,stroke:#9ca3af,color:#374151
    classDef owner fill:#dbeafe,stroke:#3b82f6,color:#1e3a5f
    classDef shared fill:#fef3c7,stroke:#f59e0b,color:#78350f

    ROOT((soreata))

    ROOT --> LOGIN[ログイン\n/login]
    ROOT --> AI["困りごとのAI分解  /\nお試し用（保存ボタンなし）\n？team=[team_id]指定時のみ\n　→保存ボタン"]
    AI --> LOGIN

    LOGIN --> A_DASH

    A_DASH["マイページ  /account\nメアド・チーム一覧の表\n（チーム名・自分のニックネーム・relationship）\n来ている招待・チームを作成する・退会"]
    A_DASH -->|"空セルの無い行を選択"| TEAM

    TEAM["チームページ  /home/[team_id]\nチーム名・自分のニックネーム表示（読み取りのみ）\nメンバー一覧・AI分解記録一覧"]
    TEAM -->|"「AI分解する」  /?team=[team_id]"| AI
    TEAM --> AI_REC["AI分解の記録一覧"]
    AI_REC --> RECORD["記録詳細  /home/[team_id]/record/[id]\n外部ツールへの投稿ボタン（Webhook設定済みの場合）"]
    RECORD --> CONF["能力確認日\n入力：全員可・変更：当人権限者のみ"]

    TEAM --> T_SET["チーム設定  /home/[team_id]/settings\n当人権限者専用\n（Webhook連携を委譲された協力者は連携設定のみ）"]
    T_SET --> INVITE["協力者を招待する・招待中一覧＋取り消し"]
    T_SET --> TRANSFER["当人権限（owner）移譲の指名（承諾制）"]
    T_SET --> WEBHOOK["外部ツール連携設定（Slack/Discord）"]
    T_SET --> TEAMEDIT["チーム削除"]

    class ROOT,LOGIN,AI all
    class T_SET,INVITE,TRANSFER,WEBHOOK,TEAMEDIT owner
    class A_DASH,TEAM,AI_REC,RECORD,CONF shared
```

### 凡例
| 色 | 対象 |
|---|---|
| 白 | 全員（ゲスト含む） |
| 薄青 | 当人権限者のみ（Webhook連携設定は委譲された協力者も可） |
| 薄黄 | 当人権限者・協力者（ゲスト不可） |

---

### URL構成
- `/`：困りごとのAI分解（ゲスト含む全員がアクセス可。保存はチームホーム発の`/?team=[team_id]`からのみ）
- `/login`：ログイン
- `/account`：マイページ（チーム一覧の表・チーム作成・招待受諾）
- `/home/[team_id]`：チームページ（「AI分解する」で`/?team=[team_id]`へ）
- `/home/[team_id]/record/[id]`：AI分解記録詳細
- `/home/[team_id]/settings`：チーム設定（削除・招待・owner移譲・Webhook連携。チーム名編集は`/account`のチーム一覧表で行う）
