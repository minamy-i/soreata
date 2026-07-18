```mermaid
graph TD
    classDef all fill:#ffffff,stroke:#9ca3af,color:#374151
    classDef loggedin fill:#dcfce7,stroke:#22c55e,color:#14532d
    classDef owner fill:#dbeafe,stroke:#3b82f6,color:#1e3a5f
    classDef shared fill:#fef3c7,stroke:#f59e0b,color:#78350f

    ROOT((soreata))

    ROOT --> LOGIN[ログイン\n/login]
    ROOT --> AI["AI提案画面  /\nお試し用（保存ボタンなし）\n?team=[team_id]指定時のみ\n　→対象者確定・保存ボタン"]
    AI -->|"Googleでログイン（未ログイン時のみ表示）"| LOGIN

    LOGIN -->|"ログイン成功（常に/accountへ。元のURLには戻らない）"| A_DASH

    A_DASH["マイページ  /account\nメアド・チーム一覧の表\n（チーム名・自分のニックネーム・relationship）\nチームを作成する（その場で新規行）\n来ている招待＋参加ボタン\n協力者は「脱退」ボタン（即時・確認あり）\n退会ボタン（所属チーム0件のみ）"]
    A_DASH -->|"「移動」リンク（自分のnickname・relationship両方埋まっている行のみ）"| TEAM

    TEAM["チームページ  /home/[team_id]\nチーム名・自分のニックネーム表示（読み取りのみ）\nメンバー一覧・AI提案記録一覧"]
    TEAM -->|"「AI提案へ」  /?team=[team_id]"| AI
    TEAM -->|"記録をクリック"| RECORD["記録詳細  /home/[team_id]/record/[id]\n外部ツールへの投稿ボタン（Webhook設定済みの場合）\n削除ボタン（当人権限者のみ）"]
    RECORD --> CONF["能力確認日\n入力：全員可・変更：当人権限者のみ"]

    TEAM -->|"当人権限者、またはWebhook管理を委譲された協力者のみリンク表示"| T_SET["チーム設定  /home/[team_id]/settings\n当人権限者専用\n（Webhook連携を委譲された協力者は連携設定のみ）"]
    T_SET --> INVITE["協力者を招待する・招待中一覧＋取り消し"]
    T_SET --> TRANSFER["当人権限（owner）移譲の指名（承諾制・検討中）"]
    T_SET --> WEBHOOK["外部ツール連携設定（Slack/Discord）"]
    T_SET --> TEAMEDIT["チーム削除（空チームのみ即削除。\n/accountのチーム一覧表からも同じ操作可）"]

    class ROOT,LOGIN,AI all
    class A_DASH loggedin
    class T_SET,INVITE,TRANSFER,WEBHOOK,TEAMEDIT owner
    class TEAM,RECORD,CONF shared
```

### 凡例
| 色 | 対象 |
|---|---|
| 白 | 全員（ゲスト含む） |
| 緑 | ログイン済みなら誰でも（チーム所属不問。0件のアカウントも含む） |
| 薄青 | 当人権限者のみ（Webhook連携設定は委譲された協力者も可） |
| 薄黄 | 当人権限者・協力者（自分のnickname・relationshipが埋まっている有効なメンバーのみ。ゲスト不可） |

---

### URL構成
- `/`：AI提案画面（ゲスト含む全員がアクセス可。保存はチームホーム発の`/?team=[team_id]`からのみ）
- `/login`：ログイン
- `/account`：マイページ（チーム一覧の表・チーム作成・招待受諾・脱退・退会。ログイン済みなら誰でも）
- `/home/[team_id]`：チームページ（「AI提案へ」で`/?team=[team_id]`へ）
- `/home/[team_id]/record/[id]`：AI提案記録詳細
- `/home/[team_id]/settings`：チーム設定（削除・招待・owner移譲・Webhook連携。チーム名編集は`/account`のチーム一覧表で行う）
