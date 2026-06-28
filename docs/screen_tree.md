```mermaid
graph TD
    classDef all fill:#ffffff,stroke:#9ca3af,color:#374151
    classDef person fill:#dbeafe,stroke:#3b82f6,color:#1e3a5f
    classDef collab fill:#dcfce7,stroke:#22c55e,color:#14532d
    classDef shared fill:#fef3c7,stroke:#f59e0b,color:#78350f

    ROOT((soreata))

    ROOT --> LOGIN[ログイン]
    ROOT --> GEST[ゲスト]
    GEST --> AI["AI分析  /\nゲスト：ログインボタンのみ\nログイン済み：保存するボタン"]

    AI --> LOGIN

    LOGIN -->|"初回・招待リンクなし（システム判定）"| TANTO_REG["当人新規登録\nニックネーム入力"]
    LOGIN -->|"2回目以降：DBのアカウント種別で自動振り分け"| T_DASH
    LOGIN -->|"初回・招待リンク経由（システム判定）"| KYORYOKU_REG["協力者新規登録\nニックネーム入力"]

    LOGIN -->|"2回目以降：DBのアカウント種別で自動振り分け"| K_DASH

    TANTO_REG --> T_DASH["当人ダッシュボード  /home/id"]
    KYORYOKU_REG --> K_DASH["協力者ダッシュボード（URL未定）"]

    T_DASH --> T_ACCOUNT["アカウント設定\nニックネーム・メアド"]
    T_DASH --> T_COL["協力者一覧"]
    T_COL --> T_INVITE["協力者招待"]
    T_DASH --> T_AI_REC["AI分析記録（編集不可）"]
    T_DASH --> T_OBS["観察記録"]
    T_DASH --> T_MEET["会議室"]
    T_MEET --> T_MEET_POST["投稿・コメント"]
    T_MEET --> T_MEET_REQ["まとめ依頼\n→ 投稿・コメントをロック"]
    T_MEET_REQ --> T_MEET_WRITE["まとめ記述"]
    T_MEET_WRITE --> T_MEET_APPROVE["承諾\n→ 観察記録へ自動書き込み"]
    T_MEET_WRITE --> T_MEET_REJECT["却下\n→ ロック解除・議論に戻る"]
    T_MEET_REJECT --> T_MEET_POST
    T_DASH --> AI
    T_AI_REC --> T_CONF["能力確認日\n新規入力：全員可・変更：当人のみ"]

    K_DASH --> K_ACCOUNT["アカウント設定\nニックネーム・メアド"]
    K_DASH --> K_COL["当人一覧"]
    K_COL  --> |"同一URL・協力者権限で表示"|T_DASH
    K_DASH --> AI

    class ROOT,LOGIN,GEST,AI,TANTO_REG,KYORYOKU_REG all
    class T_ACCOUNT,T_INVITE person
    class K_DASH,K_ACCOUNT,K_COL collab
    class T_MEET_REQ,T_MEET_APPROVE person
    class T_DASH,T_COL,T_AI_REC,T_OBS,T_MEET,T_CONF,T_MEET_POST,T_MEET_WRITE,T_MEET_REJECT shared
```

### 凡例
| 色 | 対象 |
|---|---|
| 白 | 全員（ゲスト含む） |
| 薄青 | 当人のみ |
| 薄緑 | 協力者のみ |
| 薄黄 | 当人・協力者（ゲスト不可） |

---

### URL構成

**v1（当人のみ）**
- `/`：AI分析（ゲスト含む全員）
- `/home/[id]`：当人ダッシュボード
- `/home/[id]/record/[id]`：AI分析記録詳細

**v2以降**
- `/home/[id]/memo`：観察記録タイムライン
- `/home/[id]/meeting`：会議室（仮）
- `/home/[id]/collaborators`：協力者一覧
- 協力者ダッシュボード：URL未定
