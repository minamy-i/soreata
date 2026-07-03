```mermaid
graph TD
    classDef all fill:#ffffff,stroke:#9ca3af,color:#374151
    classDef person fill:#dbeafe,stroke:#3b82f6,color:#1e3a5f
%%  classDef collab fill:#dcfce7,stroke:#22c55e,color:#14532d
    classDef shared fill:#fef3c7,stroke:#f59e0b,color:#78350f

    ROOT((soreata))

    ROOT --> LOGIN[ログイン\n/login]
    ROOT --> AI["困りごとのAI分解\nゲスト・未ログイン\n　→ログインボタン\nログイン済\n　→保存ボタン"]
    AI --> LOGIN

    LOGIN -->|"初回・招待リンク経由"| KYORYOKU_REG["協力者新規登録\nニックネーム入力"]
    LOGIN -->|"初回・招待なし"| TANTO_REG["当人新規登録\nニックネーム入力"]
    LOGIN -->|"2回目以降"| A_DASH

    TANTO_REG --> A_DASH["アカウントダッシュボード  /account\nメアド・ニックネーム\n自分のチーム／担当チーム一覧\nログアウト・退会(v2)"]
    KYORYOKU_REG --> A_DASH

    A_DASH -->|"チームを選択"| TEAM["チームダッシュボード  /home/[person_id]\n当人・協力者が同一URLで入る\n権限で表示・操作を切り替え"]
    A_DASH --> AI

    TEAM --> AI_REC["AI分解の記録"]
    AI_REC --> RECORD["記録詳細  /home/[person_id]/record/[id]"]
    RECORD --> CONF["能力確認日\n入力：全員可\n変更：当人のみ"]

    TEAM --> OBS["観察記録  /home/[person_id]/memo\n投稿：全員・編集：作成者のみ"]

    TEAM --> MEET["会議室  /home/[person_id]/meeting（仮）"]
    MEET --> MEET_POST["投稿・コメント（全員）"]
    MEET_POST --> MEET_REQ["まとめ依頼"]
    MEET_REQ -->|"投稿・コメントロック"|MEET_WRITE["まとめ記述"]
    MEET_WRITE --> MEET_JUD{"判定"}
    MEET_JUD -->|"承認"|MEET_APP["観察記録へ自動書き込み"]
    MEET_JUD -->|"投稿・コメントアンロック\n却下"|MEET_POST

    TEAM --> COL["協力者一覧  /home/[person_id]/collaborators\n閲覧：全員"]
    COL --> INVITE["協力者招待"]

    TEAM --> T_SET["当人情報設定  /home/[person_id]/settings"]

    TEAM --> AI

    class ROOT,LOGIN,AI,TANTO_REG,KYORYOKU_REG all
    class T_SET,INVITE,MEET_REQ,MEET_JUD person
    class A_DASH,TEAM,AI_REC,RECORD,OBS,MEET,COL,CONF,MEET_POST,MEET_WRITE,MEET_APP shared
```

### 凡例
| 色 | 対象 |
|---|---|
| 白 | 全員（ゲスト含む） |
| 薄青 | 当人のみ |
| 薄黄 | 当人・協力者（ゲスト不可） |

---

### URL構成

**v1〜**
- `/`：困りごとのAI分解（ゲスト含む全員）
- `/login`：ログイン
- `/account`：アカウントダッシュボード
- `/home/[person_id]`：チームダッシュボード
- `/home/[person_id]/record/[id]`：AI分解記録詳細
- `/home/[person_id]/settings`：当人情報設定

**v2〜**
- `/home/[person_id]/memo`：観察記録
- `/home/[person_id]/meeting`：会議室（仮）
- `/home/[person_id]/collaborators`：協力者一覧
